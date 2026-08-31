// ============================================================
// NETLIFY BACKGROUND FUNCTION: process-order-background
// URL: /.netlify/functions/process-order-background  (POST)
//
// Background Functions run up to 15 minutes on Netlify —
// perfect for KIE AI polling which can take several minutes.
//
// Called by stripe-webhook.js after payment confirmed.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const KIE_BASE   = 'https://api.kie.ai/api/v1';
const SITE_URL   = 'https://snapibaby.netlify.app';

// Module-level config — populated at handler start (after env var validation)
let _config = {};

exports.handler = async (event) => {
  // ── Validate env vars FIRST — log clearly if missing ──
  const SUPABASE_URL     = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const KIE_API_KEY      = process.env.KIE_API_KEY;
  const RESEND_API_KEY   = process.env.RESEND_API_KEY;
  const ALERT_EMAIL      = process.env.ALERT_EMAIL || process.env.OWNER_EMAIL || 'viewbrantz@gmail.com';

  console.log('[process-order-background] Function started');
  console.log('[env-check] SUPABASE_URL set:', !!SUPABASE_URL);
  console.log('[env-check] SUPABASE_SERVICE_ROLE_KEY set:', !!SUPABASE_SERVICE);
  console.log('[env-check] KIE_API_KEY set:', !!KIE_API_KEY);
  console.log('[env-check] RESEND_API_KEY set:', !!RESEND_API_KEY);
  console.log('[env-check] ALERT_EMAIL:', ALERT_EMAIL);

  if (!SUPABASE_URL || !SUPABASE_SERVICE) {
    console.error('[FATAL] Missing Supabase env vars — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in Netlify');
    return { statusCode: 500, body: 'Missing Supabase configuration' };
  }

  if (!KIE_API_KEY) {
    console.error('[FATAL] KIE_API_KEY not set in Netlify environment variables');
    return { statusCode: 500, body: 'Missing KIE_API_KEY' };
  }

  // Populate config for all helper functions
  _config = { KIE_API_KEY, RESEND_API_KEY, ALERT_EMAIL };

  // Initialize Supabase client INSIDE handler (safe — env vars confirmed above)
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  const CORS_HEADERS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  // Background functions always return 202 immediately
  // but keep running until handler resolves

  let body;
  try { body = JSON.parse(event.body); }
  catch { console.error('Invalid JSON body'); return { statusCode: 400, headers: CORS_HEADERS, body: 'Invalid JSON' }; }

  const { orderId, type = 'main' } = body;
  if (!orderId) { console.error('orderId required'); return; }

  console.log(`[process-order-background] Starting for order ${orderId}, type=${type}`);

  // Fetch the order
  const { data: order, error: fetchErr } = await db
    .from('orders').select('*').eq('id', orderId).single();

  if (fetchErr || !order) {
    console.error('Order not found:', orderId, fetchErr?.message);
    return;
  }

  console.log(`[process-order-background] Order found: ${order.order_number}, email: ${order.customer_email}`);
  console.log(`[process-order-background] baby_photo_urls: ${JSON.stringify(order.baby_photo_urls)}`);
  console.log(`[process-order-background] themes_selected: ${JSON.stringify(order.themes_selected)}`);

  const faceUrl = (order.baby_photo_urls || [])[0] || null;

  if (!faceUrl) {
    const errMsg = 'No baby photo URL found in order — customer did not upload photo or upload failed';
    console.error(`No baby_photo_urls for order ${order.order_number}`);
    await db.from('orders').update({ generation_status: 'failed' }).eq('id', orderId);
    await sendSupportAlert(order, errMsg);
    await sendFailureApologyEmail(order);
    return;
  }

  try {
    let generatedUrls;

    if (type === 'upsell' || type === 'downsell') {
      const extraThemes = order.upsell_themes || [];
      console.log(`Upsell: generating ${extraThemes.length} holiday themes`);

      const newUrls = [];
      for (const theme of extraThemes) {
        const prompt = HOLIDAY_PROMPTS[theme] || THEME_PROMPTS['default'];
        try {
          const imgUrl = await callKieAiWithRetry(prompt, faceUrl, 2);
          newUrls.push({ theme, url: imgUrl, status: 'ok', source: type });
        } catch (e) {
          console.warn(`KIE failed for holiday theme "${theme}":`, e.message);
          newUrls.push({ theme, url: null, status: 'failed', error: e.message });
        }
      }

      const existing = order.generated_urls || [];
      generatedUrls  = [...existing, ...newUrls];

      await db.from('orders').update({
        generated_urls:    generatedUrls,
        generation_status: 'done'
      }).eq('id', orderId);

      console.log(`Upsell done: added ${newUrls.length} photos`);

    } else {
      // Main order
      const themes = order.themes_selected || [];
      console.log(`Main order: generating ${themes.length} themes for ${order.order_number}`);
      console.log(`Face URL: ${faceUrl}`);

      if (themes.length === 0) {
        console.warn('No themes selected for order', order.order_number);
        // Use default theme if none selected
        themes.push('Princess');
      }

      generatedUrls = await generateImagesForOrder(order, faceUrl, db, orderId);

      await db.from('orders').update({
        generated_urls:    generatedUrls,
        generation_status: 'done',
        download_url:      `${SITE_URL}/dashboard.html?order=${orderId}`
      }).eq('id', orderId);

      console.log(`Generated ${generatedUrls.length} images for order ${order.order_number}`);
    }

    // Send delivery email
    const successCount = generatedUrls.filter(u => u.status === 'ok').length;
    console.log(`Sending delivery email — ${successCount} successful photos`);

    await sendDeliveryEmail(order, generatedUrls);
    console.log(`Delivery email sent to ${order.customer_email}`);

  } catch (genErr) {
    const errMsg = genErr.message || 'Unknown error';
    console.error('Generation failed:', errMsg, genErr.stack);
    await db.from('orders').update({ generation_status: 'failed' }).eq('id', orderId);
    // Alert owner AND notify customer — both fire and forget so one failure can't block the other
    await Promise.allSettled([
      sendSupportAlert(order, errMsg),
      sendFailureApologyEmail(order),
    ]);
  }
};

// ============================================================
// Generate images for all themes — saves each to DB immediately
// ============================================================
async function generateImagesForOrder(order, faceUrl, db, orderId) {
  const themes  = order.themes_selected || [];
  const results = [];

  for (const theme of themes) {
    const themeName = typeof theme === 'string' ? theme : (theme.name || 'default');
    const cleanName = themeName.replace(/[^\w\s]/g, '').trim();
    const prompt    = findPrompt(cleanName);

    console.log(`Generating theme "${themeName}" (prompt key: ${cleanName})`);

    try {
      const imgUrl = await callKieAiWithRetry(prompt, faceUrl, 3);
      results.push({ theme: themeName, url: imgUrl, status: 'ok' });
      console.log(`✓ Theme "${themeName}" done`);

      // 🔑 Save to DB immediately so the success page can show this photo NOW
      await db.from('orders').update({ generated_urls: results }).eq('id', orderId);
      console.log(`💾 Progressive save: ${results.filter(r => r.status === 'ok').length} photos in DB`);

    } catch (err) {
      console.warn(`✗ KIE AI failed for "${themeName}":`, err.message);
      results.push({ theme: themeName, url: null, status: 'failed', error: err.message });
    }
  }

  return results;
}

// ============================================================
// KIE AI — create task and poll for result
// ============================================================
async function callKieAi(prompt, faceImageUrl) {
  const KIE_API_KEY = _config.KIE_API_KEY;
  if (!faceImageUrl) throw new Error('No face image URL provided');
  if (!KIE_API_KEY)  throw new Error('KIE_API_KEY not set');

  console.log(`KIE createTask — URL: ${faceImageUrl.substring(0, 60)}...`);

  const createRes = await fetch(`${KIE_BASE}/jobs/createTask`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-image-2-image-to-image',
      input: {
        prompt,
        input_urls:   [faceImageUrl],
        aspect_ratio: '3:4',
        resolution:   '1K'
      }
    })
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`KIE createTask failed: ${createRes.status} — ${text}`);
  }

  const createJson = await createRes.json();
  console.log('KIE createTask response:', JSON.stringify(createJson).substring(0, 200));

  if (createJson.code !== 200 || !createJson.data?.taskId) {
    throw new Error(`KIE createTask error: ${JSON.stringify(createJson)}`);
  }

  const taskId = createJson.data.taskId;
  console.log(`KIE task created: ${taskId}`);

  // Poll — max 10 min (120 polls × 5s)
  for (let i = 0; i < 120; i++) {
    await sleep(5000);

    const pollRes = await fetch(`${KIE_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: { 'Authorization': `Bearer ${KIE_API_KEY}` }
    });

    if (!pollRes.ok) {
      const errText = await pollRes.text().catch(() => '');
      console.warn(`KIE poll ${i + 1} HTTP error: ${pollRes.status} — ${errText.substring(0, 200)}`);
      continue;
    }

    const pollJson = await pollRes.json();

    // Log full response on first poll to understand structure
    if (i === 0) console.log('KIE poll #1 full response:', JSON.stringify(pollJson).substring(0, 600));

    if (pollJson.code !== 200) {
      console.warn(`KIE poll ${i + 1} code: ${pollJson.code} — ${JSON.stringify(pollJson).substring(0, 200)}`);
      continue;
    }

    const task   = pollJson.data;
    const status = (task?.status || task?.taskStatus || task?.state || '').toString().toLowerCase();

    console.log(`KIE poll ${i + 1}/120: status="${status}"`);

    if (status === 'success' || status === 'completed' || status === 'done' || status === '2' || status === 'finish' || status === 'finished') {
      const resultList = task.resultList || task.result_list || [];
      const url =
        task.result?.url ||
        task.result?.imageUrl ||
        task.result?.image_url ||
        (Array.isArray(task.result) && task.result[0]?.url) ||
        (Array.isArray(task.result) && task.result[0]?.imageUrl) ||
        (resultList.length > 0 && (resultList[0]?.url || resultList[0]?.imageUrl)) ||
        task.outputUrl ||
        task.output_url ||
        task.imageUrl ||
        task.image_url ||
        task.url;

      console.log('KIE full task data:', JSON.stringify(task).substring(0, 600));
      console.log('KIE result URL:', url);
      if (url) return url;
      throw new Error('KIE task completed but no URL found: ' + JSON.stringify(task).substring(0, 400));
    }

    if (status === 'failed' || status === 'error' || status === '3' || status === 'fail') {
      throw new Error('KIE task failed: ' + (task.error || task.errorMsg || task.failReason || JSON.stringify(task)).substring(0, 200));
    }
  }


  throw new Error('KIE AI task timed out after 10 minutes');
}

async function callKieAiWithRetry(prompt, faceImageUrl, maxRetries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callKieAi(prompt, faceImageUrl);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const delay = attempt * 5000;
        console.warn(`KIE attempt ${attempt}/${maxRetries} failed: ${err.message}. Retry in ${delay / 1000}s`);
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

// ============================================================
// Delivery email
// ============================================================
async function sendDeliveryEmail(order, generatedUrls) {
  const RESEND_API_KEY = _config.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — delivery email skipped');
    return;
  }

  const name = order.customer_name || 'there';
  const plan = (order.plan || 'starter').charAt(0).toUpperCase() + (order.plan || 'starter').slice(1);

  const successUrls = generatedUrls
    .filter(item => item.status === 'ok' && item.url)
    .map(item => ({ url: item.url, theme: item.theme }));

  if (successUrls.length === 0) {
    console.warn('Generation completed but 0 successful images — marking failed and alerting');
    await (async () => {
      // Get db from closure — we need to update status
      try {
        const { createClient } = require('@supabase/supabase-js');
        const db2 = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        await db2.from('orders').update({ generation_status: 'failed' }).eq('id', order.id);
      } catch (_) {}
    })();
    await sendSupportAlert(order, 'Generation completed but 0 successful images — all themes failed');
    await sendFailureApologyEmail(order);
    return;
  }

  const photoCards = successUrls.map((item, i) => `
    <div style="margin-bottom:20px;text-align:center;background:#fff8fa;border-radius:14px;padding:16px;border:1px solid #fde8f0;">
      <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:700;">${item.theme}</p>
      <img src="${item.url}" alt="SnapiBaby ${item.theme} portrait"
           style="width:100%;max-width:260px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.12);">
      <br>
      <a href="${item.url}" target="_blank"
         style="display:inline-block;margin-top:10px;padding:10px 24px;background:linear-gradient(135deg,#ff4d6d,#e8003d);color:white;
                border-radius:24px;text-decoration:none;font-size:13px;font-weight:800;letter-spacing:0.3px;">
        ⬇ Save Photo ${i + 1}
      </a>
    </div>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#ff4d6d,#ff8fa3);padding:32px 24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:26px;font-weight:900;">🍼 SnapiBaby</h1>
      <p style="color:rgba(255,255,255,0.92);margin:10px 0 0;font-size:15px;font-weight:600;">Your baby's portraits are ready! 📸</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#2d3142;margin:0 0 12px;font-size:1.4rem;">Hi ${name}! 💕</h2>
      <p style="color:#6b7280;margin:0 0 8px;line-height:1.7;font-size:15px;">
        Your <strong>${successUrls.length} SnapiBaby portrait${successUrls.length > 1 ? 's are' : ' is'}</strong> ready!<br>
        Tap each photo to view full size, then save to your phone.
      </p>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 28px;">
        Order: <strong>${order.order_number}</strong> · Plan: <strong>${plan}</strong>
      </p>

      ${photoCards}

      <div style="margin-top:24px;text-align:center;">
        <a href="${SITE_URL}/dashboard.html?order=${order.id}"
           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#ff4d6d,#ff8fa3);
                  color:white;border-radius:50px;text-decoration:none;font-weight:800;font-size:15px;">
          📂 View My Full Gallery
        </a>
      </div>

      <div style="margin-top:24px;padding:16px;background:#fff8e1;border-radius:12px;border-left:4px solid #f5c518;">
        <p style="margin:0;font-size:13px;color:#7a5800;line-height:1.5;">
          💡 <strong>Tip:</strong> On iPhone: tap the button → share icon → "Save to Photos".<br>
          On Android: tap the button → auto-downloads to your Gallery.
        </p>
      </div>

      <div style="margin-top:24px;text-align:center;padding-top:24px;border-top:1px solid #f0f0f0;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          © 2026 SnapiBaby · Made with ❤️ for moms worldwide<br>
          <a href="${SITE_URL}" style="color:#ff4d6d;">snapibaby.netlify.app</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'SnapiBaby <onboarding@resend.dev>',
      to:      [order.customer_email],
      subject: `📸 Your ${name}'s SnapiBaby portraits are ready!`,
      html
    })
  });

  const resText = await res.text();
  if (!res.ok) throw new Error(`Resend delivery error ${res.status}: ${resText}`);
  console.log(`✓ Delivery email sent to ${order.customer_email}. Resend response: ${resText}`);
}

// ============================================================
// Support alert — sent to OWNER when generation fails
// ============================================================
async function sendSupportAlert(order, errorMsg) {
  const RESEND_API_KEY = _config.RESEND_API_KEY;
  const ALERT_EMAIL    = _config.ALERT_EMAIL || 'viewbrantz@gmail.com';
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — support alert not sent. Error was:', errorMsg);
    return;
  }
  try {
    const tier = order.country ? ` (country: ${order.country})` : '';
    const plan = order.plan || 'unknown';
    const html = `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:20px;background:#fff3cd">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.1)">
          <div style="background:linear-gradient(135deg,#ef4444,#b91c1c);padding:24px;text-align:center">
            <h1 style="color:white;margin:0;font-size:22px">&#x26A0;&#xFE0F; SnapiBaby Generation FAILED</h1>
          </div>
          <div style="padding:28px">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px 0;color:#6b7280;width:140px">Order</td><td><strong>${order.order_number || order.id}</strong></td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Customer</td><td>${order.customer_name || 'N/A'} &lt;${order.customer_email}&gt;</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Plan</td><td>${plan}${tier}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Themes</td><td>${(order.themes_selected || []).join(', ') || 'N/A'}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Photo URL</td><td style="word-break:break-all;font-size:12px">${(order.baby_photo_urls || [])[0] || 'MISSING'}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Error</td><td style="color:#b91c1c"><code>${errorMsg}</code></td></tr>
              <tr><td style="padding:8px 0;color:#6b7280">Time</td><td>${new Date().toISOString()}</td></tr>
            </table>
            <div style="margin-top:20px;padding:14px;background:#fef2f2;border-radius:8px;border-left:4px solid #ef4444">
              <p style="margin:0;font-size:13px;color:#7f1d1d">
                <strong>Action required:</strong> Contact the customer and manually process their order,
                or re-trigger generation from the Supabase dashboard.
              </p>
            </div>
            <div style="margin-top:16px;text-align:center">
              <a href="https://supabase.com/dashboard" style="display:inline-block;padding:10px 24px;background:#ef4444;color:white;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Open Supabase Dashboard</a>
            </div>
          </div>
        </div>
      </body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'SnapiBaby Alerts <onboarding@resend.dev>',
        to:      [ALERT_EMAIL],
        subject: `&#x26A0;&#xFE0F; FALHA na gera&#xE7;&#xE3;o — Order ${order.order_number || order.id} — ${order.customer_email}`,
        html
      })
    });
    if (res.ok) {
      console.log(`Support alert sent to ${ALERT_EMAIL} for order ${order.order_number}`);
    } else {
      console.error('Support alert email failed:', await res.text());
    }
  } catch (e) {
    console.error('sendSupportAlert threw:', e.message);
  }
}

// ============================================================
// Customer apology email — sent when generation fails
// ============================================================
async function sendFailureApologyEmail(order) {
  const RESEND_API_KEY = _config.RESEND_API_KEY;
  if (!RESEND_API_KEY || !order.customer_email) return;
  try {
    const name = order.customer_name || 'there';
    const html = `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f8f9fa;padding:20px;margin:0">
        <div style="max-width:560px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08)">
          <div style="background:linear-gradient(135deg,#ff4d6d,#ff8fa3);padding:32px 24px;text-align:center">
            <h1 style="color:white;margin:0;font-size:24px">&#x1F4F8; SnapiBaby</h1>
            <p style="color:rgba(255,255,255,.9);margin:8px 0 0;font-size:15px">Important update about your order</p>
          </div>
          <div style="padding:32px 24px">
            <h2 style="color:#2d3142;margin:0 0 12px">Hi ${name}! &#x1F49C;</h2>
            <p style="color:#6b7280;line-height:1.7;font-size:15px;margin:0 0 20px">
              We're so sorry — something went wrong while generating your portraits.
              Our team has been automatically notified and <strong>will fix this within a few hours</strong>.
            </p>
            <div style="background:#fff8e1;border-radius:12px;padding:20px;margin-bottom:24px;border-left:4px solid #f5c518">
              <p style="margin:0;font-size:14px;color:#7a5800;line-height:1.6">
                &#x1F4E6; <strong>Order:</strong> ${order.order_number || 'Processing'}<br>
                &#x23F0; <strong>We'll retry generation automatically</strong> and send your photos as soon as they're ready.<br>
                &#x1F4AC; If you don't hear back within 24h, email us at
                <a href="mailto:support@snapibaby.com" style="color:#ff4d6d">support@snapibaby.com</a>.
              </p>
            </div>
            <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0">
              We sincerely apologize for the inconvenience. Your payment is safe and your order will be fulfilled.
            </p>
          </div>
        </div>
      </body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'SnapiBaby <onboarding@resend.dev>',
        to:      [order.customer_email],
        subject: `&#x1F4F8; Update on your SnapiBaby portraits — Order ${order.order_number || ''}`,
        html
      })
    });
    if (res.ok) {
      console.log(`Failure apology email sent to ${order.customer_email}`);
    } else {
      console.error('Apology email failed:', await res.text());
    }
  } catch (e) {
    console.error('sendFailureApologyEmail threw:', e.message);
  }
}


// ============================================================
// BASE STYLE — injected into every prompt for consistency
// ============================================================
const BASE = 'CRITICAL INSTRUCTIONS: (1) Preserve ONLY the baby\'s FACE — eyes, nose, mouth, cheeks, skin tone and face shape from the input photo. (2) COMPLETELY REPLACE the hairstyle — do NOT reproduce the original hair, instead dress the baby with the theme-appropriate headwear described above (bonnet, crown, hat, hood, helmet, ears, etc.) covering the head naturally. (3) Ultra-realistic human skin texture, natural pores, no wax-like or plastic look, no CGI. (4) Professional newborn photography style. Soft studio lighting, shallow depth of field, warm bokeh. Photorealistic 4K, cinematic quality.';

const HOLIDAY_PROMPTS = {
  'Christmas':   `Transform the baby in this photo into a professional newborn portrait: sleeping newborn curled up in a round wooden bowl, wearing a tiny red Santa hat and wrapped in a red knit blanket, surrounded by mini Christmas ornaments, pine branches, fairy lights and snow-dusted props, warm golden holiday lighting. ${BASE}`,
  'Halloween':   `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in a miniature pumpkin-shaped pod prop, wearing a tiny witch hat or skeleton onesie, surrounded by small friendly pumpkins, autumn leaves and cobwebs, moody but cute warm amber studio lighting. ${BASE}`,
  'Easter':      `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a pastel yellow knit blanket, wearing a tiny white bunny ears headband, curled up in a wicker basket lined with faux grass, colorful mini Easter eggs and spring flowers around it, soft pastel pink and green studio lighting. ${BASE}`,
  'St Patricks': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a green knit blanket, wearing a tiny green top hat, curled up in a wooden bowl surrounded by shamrock clovers, a tiny pot of gold and rainbow ribbon, soft green and gold studio tones. ${BASE}`
};

const THEME_PROMPTS = {
  // ── Exact names from app.html ────────────────────────────────────────────
  'Astronaut': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wearing a miniature white NASA astronaut suit with a small rounded helmet, curled up inside a crescent moon prop lined with white fluffy material, surrounded by golden star ornaments, small rocket toys, Earth globe and Saturn planet props in the background, deep space dark blue backdrop with bokeh star lights. ${BASE}`,

  'Cute Cartoon': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wearing a bright red and white polka-dot Minnie Mouse outfit with matching Minnie ears bow headband, curled up in a round wooden bowl lined with pink faux fur, surrounded by pink roses, pearl strings and a Minnie doll prop, soft pink studio background with warm bokeh lights. ${BASE}`,

  'Dinosaur': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wearing a knitted green dinosaur onesie with spiky dorsal fins on the back and a matching dragon tail, curled up in a wooden bowl lined with green moss and earth textures, surrounded by small dinosaur figurines and tropical leaves, warm earthy studio tones. ${BASE}`,

  'Easter Bunny': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a pastel yellow knit, wearing a fluffy white bunny ears bonnet, curled up in a wicker basket filled with faux grass, surrounded by colorful speckled Easter eggs, small spring flowers and a tiny chick figurine, soft pastel pink and green studio lighting. ${BASE}`,

  'Spring Bunny': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a soft lavender knit blanket, wearing delicate white bunny ears, curled up in a wicker basket surrounded by blooming cherry blossoms, white daisies and pastel spring petals, light airy studio with soft natural window light bokeh. ${BASE}`,

  'Fairy Magic': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn with delicate iridescent fairy wings attached to its back, wearing a floral lace bonnet with tiny rosebuds, curled up in a rustic wicker basket lined with moss and wildflowers, in an enchanted forest setting with bokeh fairy lights, green ivy and white wildflowers surrounding the basket. ${BASE}`,

  'Fairy Portrait': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn with shimmering translucent fairy wings, wearing a cream lace bonnet with flower accents, curled up in a wicker basket surrounded by green moss, soft white wildflowers, tiny mushrooms and glowing fairy lights, enchanted woodland atmosphere with golden hour bokeh. ${BASE}`,

  'Floral Basket': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a blush pink knit, curled up in a round wooden bowl lined with cream knit fabric, surrounded by fresh garden roses in soft pink and peach tones, eucalyptus sprigs, peonies and baby's breath flowers, warm soft diffused studio lighting. ${BASE}`,

  'Soft Floral': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a white stretchy knit, wearing a tiny floral crown of white roses and dried wildflowers, curled up on a fluffy cream fur rug, surrounded by soft pink peonies, white ranunculus and blush rose petals artistically placed around, soft romantic window-light studio. ${BASE}`,

  'Minimalist': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a soft cream or ivory knit wrap, curled up on a fluffy off-white textured rug or posing cushion, simple clean neutral background in pale white or beige, no props except the delicate fabric, ultra-clean professional studio lighting with soft shadows. ${BASE}`,

  'Classic Basket': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a natural beige knit blanket, wearing a cream-colored bear-ear knit bonnet, curled up in a round wooden bowl with neutral woven fabric, surrounded by eucalyptus leaves, natural wooden toy rattle and small giraffe figurine, warm neutral earthy studio tones. ${BASE}`,

  'Pirate': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wearing a full tiny pirate costume — red and cream ruffled shirt, dark vest with gold buttons, matching pirate bandana and black eye patch — seated inside an antique wooden treasure chest lined with velvet, surrounded by gold coins, a treasure map scroll, a miniature anchor, a brass telescope and a colorful parrot plush toy, dramatic warm golden studio lighting on aged wood textures. ${BASE}`,

  'Pirate Adventure': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in a pirate captain costume inside a treasure chest, surrounded by scattered gold coins, old maps, a cork-bottled ship, pearl necklace and a compass, moody warm cinematic studio lighting on rustic wood and rope textures. ${BASE}`,

  'Princess': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a dusty rose pink knit blanket, wearing a delicate pearl and gold lace crown, curled up in a round wooden bowl lined with cream chunky knit, surrounded by soft pink roses, eucalyptus sprigs, pearl strings and cream lace fabric draped around, warm soft romantic studio lighting. ${BASE}`,

  'Princess Portrait': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a dusty blush pink knit, wearing a miniature pearl crown on head, curled up in a wooden bowl with lace fabric and floral wreath surrounding, surrounded by dried roses, peonies and eucalyptus, soft warm feminine studio lighting, muted pink and cream tones. ${BASE}`,

  'Safari': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wearing a cream knit bear-ear bonnet, wrapped in an animal-print muslin wrap with safari animals pattern, curled up in a round wooden bowl with natural linen, surrounded by eucalyptus leaves, small wooden giraffe and elephant toys and natural wicker rattle, warm natural earthy safari tones. ${BASE}`,

  'Galaxy Space': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in a tiny astronaut suit with a rounded helmet, sleeping on a cloud-like white fluffy pad inside a crescent moon prop, surrounded by golden hanging star ornaments, a miniature rocket, Saturn planet model and fairy string lights forming constellations, deep navy and gold space atmosphere. ${BASE}`,

  'Starry Night': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a deep navy blue knit with tiny gold star pattern, wearing a small star-shaped headband, curled up in a dark wooden bowl surrounded by golden star ornaments, moon phase decorations and glimmering fairy lights, dreamy midnight blue studio backdrop with bokeh stars. ${BASE}`,

  'Superhero': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wearing a tiny superhero onesie with a miniature red cape, curled up in a round bowl lined with navy and red fabric, surrounded by small superhero mask and shield props, dramatic bold studio lighting with deep blue and red tones, comic book themed background elements blurred in bokeh. ${BASE}`,

  'Cozy Teddy': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a warm mocha brown knit blanket, curled up next to a large plush brown teddy bear, the baby's tiny hand gently resting on the teddy bear's arm, on a soft brown backdrop fabric, warm dim cozy studio lighting, rich chocolate and cream tones. ${BASE}`,

  // ── Fallback aliases ────────────────────────────────────────────────────
  'Fairy':    `Transform the baby in this photo into a professional newborn portrait: sleeping newborn with delicate iridescent fairy wings on its back, wearing a floral bonnet, curled up in a rustic wicker basket surrounded by green moss, wildflowers, bokeh fairy lights and enchanted forest atmosphere. ${BASE}`,
  'Floral':   `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in blush pink knit, curled up in a wooden bowl surrounded by fresh pink roses, eucalyptus, peonies and baby's breath, warm romantic soft studio lighting. ${BASE}`,
  'Cartoon':  `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in a Minnie Mouse red polka-dot outfit with matching bow headband, in a wooden bowl with pink faux fur, surrounded by pink roses and a Minnie doll, soft pink bokeh studio. ${BASE}`,
  'Teddy':    `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in mocha brown knit, curled up next to a plush brown teddy bear, tiny hand resting on the teddy, warm dim cozy studio lighting in chocolate and cream tones. ${BASE}`,
  'Galaxy':   `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in a tiny astronaut suit on a crescent moon prop, surrounded by golden stars, a rocket and planet props, deep navy space atmosphere with bokeh star lights. ${BASE}`,
  'Starry':   `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in navy knit with gold stars, in a wooden bowl surrounded by golden star ornaments and fairy lights, dreamy midnight blue bokeh backdrop. ${BASE}`,
  'Easter':   `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in pastel yellow knit with white bunny ears bonnet, in a wicker basket with Easter eggs, tiny chick and spring flowers, soft pastel studio lighting. ${BASE}`,
  'Christmas': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in red Santa hat and red knit, in a wooden bowl with Christmas ornaments, pine branches and fairy lights, warm golden holiday studio lighting. ${BASE}`,
  'Halloween': `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in tiny witch hat or skeleton onesie in a pumpkin prop, surrounded by small pumpkins and autumn leaves, warm amber moody studio lighting. ${BASE}`,
  'Natural':  `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in natural beige knit with bear-ear bonnet, in a wooden bowl with eucalyptus leaves, wooden toys, safari muslin wrap, warm neutral earthy studio. ${BASE}`,
  'Space':    `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in astronaut suit on a moon prop, golden stars, rocket and planet props around, deep navy and gold space atmosphere with bokeh star lights. ${BASE}`,
  'Pirate':   `Transform the baby in this photo into a professional newborn portrait: sleeping newborn in full pirate costume inside an antique treasure chest with gold coins, map scroll, anchor, telescope and parrot plush, warm dramatic golden studio lighting. ${BASE}`,
  'default':  `Transform the baby in this photo into a professional newborn portrait: sleeping newborn wrapped in a soft cream knit, curled up in a round wooden bowl lined with fluffy fabric, surrounded by delicate fresh flowers and eucalyptus, warm soft studio lighting. ${BASE}`
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function findPrompt(rawThemeName) {
  // 1. Strip emojis and extra whitespace
  const clean = rawThemeName.replace(/[^\w\s]/g, '').trim();
  const lower  = clean.toLowerCase();

  // 2. Exact match first (case-insensitive)
  for (const key of Object.keys(THEME_PROMPTS)) {
    if (key.toLowerCase() === lower) return THEME_PROMPTS[key];
  }

  // 3. Substring match
  for (const key of Object.keys(THEME_PROMPTS)) {
    const kl = key.toLowerCase();
    if (lower.includes(kl) || kl.includes(lower)) return THEME_PROMPTS[key];
  }

  console.warn(`No prompt found for theme "${rawThemeName}" (cleaned: "${clean}") — using default`);
  return THEME_PROMPTS['default'];
}

const HOLIDAY_PROMPTS = {
  'Christmas':   'Transform this newborn baby photo into a professional studio portrait: baby in a cozy Christmas setting with a tiny Santa hat, fairy lights, wrapped gifts and a warm winter backdrop, soft warm studio lighting, ultra-realistic photorealistic portrait',
  'Halloween':   'Transform this newborn baby photo into a professional studio portrait: baby in an adorable Halloween costume surrounded by friendly pumpkins, autumn leaves and candy corn, dramatic but cute studio lighting, photorealistic',
  'Easter':      'Transform this newborn baby photo into a professional studio portrait: baby with cute Easter bunny ears surrounded by colorful Easter eggs and spring flowers, soft pastel studio lighting, photorealistic',
  'St Patricks': 'Transform this newborn baby photo into a professional studio portrait: baby in a tiny green outfit with shamrocks and pot of gold, Irish spring background, studio quality photorealistic'
};

const THEME_PROMPTS = {
  // ── Exact names from app.html ────────────────────────────────────────────
  'Astronaut':          'Transform this newborn baby photo into a professional studio portrait: baby in an astronaut costume floating in outer space surrounded by stars and galaxies, ultra-realistic 4K studio lighting, soft bokeh, baby face clearly visible, photorealistic',
  'Cute Cartoon':       'Transform this newborn baby photo into a professional studio portrait: baby in a colorful cartoon world, pastel illustrated background, studio quality lighting, adorable baby face clearly visible, photorealistic portrait',
  'Dinosaur':           'Transform this newborn baby photo into a professional studio portrait: baby in a cute dinosaur costume, lush prehistoric jungle background, friendly dinosaurs, studio quality 4K lighting, photorealistic',
  'Easter Bunny':       'Transform this newborn baby photo into a professional studio portrait: baby with Easter bunny ears in a spring pastel garden with colorful eggs, soft studio lighting, photorealistic',
  'Spring Bunny':       'Transform this newborn baby photo into a professional studio portrait: baby with cute bunny ears in a magical spring garden with blooming flowers, soft pink and green tones, studio quality, photorealistic',
  'Fairy Magic':        'Transform this newborn baby photo into a professional studio portrait: baby with tiny fairy wings in an enchanted forest with sparkles and flowers, magical golden lighting, photorealistic portrait',
  'Fairy Portrait':     'Transform this newborn baby photo into a professional studio portrait: baby in a fairy princess dress in a fairy tale forest, golden hour lighting with sparkles, ultra-realistic photorealistic',
  'Floral Basket':      'Transform this newborn baby photo into a professional studio portrait: baby in a wicker basket surrounded by fresh roses and peonies, soft diffused studio lighting, photorealistic',
  'Soft Floral':        'Transform this newborn baby photo into a professional studio portrait: baby surrounded by soft fresh flowers, romantic floral arrangement in white and pink tones, studio quality, photorealistic',
  'Minimalist':         'Transform this newborn baby photo into a professional studio portrait: baby in a clean minimalist white studio setting, soft diffused light, simple elegant background, ultra-realistic photorealistic',
  'Classic Basket':     'Transform this newborn baby photo into a professional studio portrait: baby in a woven basket with natural textures and neutral earth tones, warm studio lighting, photorealistic',
  'Pirate':             'Transform this newborn baby photo into a professional studio portrait: baby in a cute tiny pirate hat and costume, ship and ocean background, dramatic studio lighting, photorealistic',
  'Pirate Adventure':   'Transform this newborn baby photo into a professional studio portrait: baby as an adventurous pirate with a treasure map background, warm golden tones, studio quality photorealistic',
  'Princess':           'Transform this newborn baby photo into a professional studio portrait: baby with a royal princess tiny crown against a palace background, pink and gold tones, studio lighting, photorealistic',
  'Princess Portrait':  'Transform this newborn baby photo into a professional studio portrait: baby in a princess dress at a fairy tale castle with magical sparkles, royal studio lighting, ultra-realistic photorealistic',
  'Safari':             'Transform this newborn baby photo into a professional studio portrait: baby surrounded by cute safari animals — giraffe, elephant, lion — in a lush African savanna, studio quality photorealistic',
  'Galaxy Space':       'Transform this newborn baby photo into a professional studio portrait: baby floating in a galaxy with stars, nebulae and planets in the deep space background, ultra-realistic studio quality photorealistic',
  'Starry Night':       'Transform this newborn baby photo into a professional studio portrait: baby under a magical starry night sky with swirling stars, soft dreamy lighting, photorealistic portrait',
  'Superhero':          'Transform this newborn baby photo into a professional studio portrait: baby in a superhero costume with a tiny cape, city skyline background, dramatic studio lighting, photorealistic',
  'Cozy Teddy':         'Transform this newborn baby photo into a professional studio portrait: baby snuggled with teddy bears in a cozy nursery, warm soft lighting, cream and brown tones, photorealistic',
  // ── Fallback aliases ────────────────────────────────────────────────────
  'Fairy':              'Transform this newborn baby photo into a professional studio portrait: baby with tiny fairy wings in an enchanted forest with sparkles and flowers, magical golden lighting, photorealistic portrait',
  'Floral':             'Transform this newborn baby photo into a professional studio portrait: baby in a wicker basket surrounded by fresh roses and peonies, soft diffused studio lighting, photorealistic',
  'Cartoon':            'Transform this newborn baby photo into a professional studio portrait: baby in a colorful cartoon world, pastel illustrated background, studio quality lighting, adorable baby face, photorealistic portrait',
  'Teddy':              'Transform this newborn baby photo into a professional studio portrait: baby snuggled with teddy bears in a cozy nursery, warm soft lighting, cream and brown tones, photorealistic',
  'Galaxy':             'Transform this newborn baby photo into a professional studio portrait: baby floating in a galaxy with stars, nebulae and planets in the deep space background, ultra-realistic studio quality photorealistic',
  'Starry':             'Transform this newborn baby photo into a professional studio portrait: baby under a magical starry night sky, swirling stars, soft dreamy lighting, photorealistic portrait',
  'Easter':             'Transform this newborn baby photo into a professional studio portrait: baby with Easter bunny ears in a spring pastel garden with colorful eggs, soft studio lighting, photorealistic',
  'Christmas':          'Transform this newborn baby photo into a professional studio portrait: baby in a Christmas theme with a Santa hat, fairy lights and cozy winter setting, soft warm studio lighting, photorealistic',
  'Halloween':          'Transform this newborn baby photo into a professional studio portrait: baby in a cute Halloween costume surrounded by pumpkins and friendly ghosts, dramatic studio lighting, photorealistic',
  'Natural':            'Transform this newborn baby photo into a professional studio portrait: baby in a woven basket with natural textures, neutral earth tones, warm studio lighting, photorealistic',
  'Space':              'Transform this newborn baby photo into a professional studio portrait: baby floating in outer space surrounded by stars, planets and nebulae, ultra-realistic studio quality photorealistic',
  'default':            'Transform this newborn baby photo into a professional studio portrait with a magical themed setting, ultra-realistic 4K studio lighting, soft bokeh background, photorealistic'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
