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

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KIE_API_KEY      = process.env.KIE_API_KEY;
const RESEND_API_KEY   = process.env.RESEND_API_KEY;
const KIE_BASE         = 'https://api.kie.ai/api/v1';
const SITE_URL         = 'https://snapibaby.netlify.app';

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE);

exports.handler = async (event) => {
  // Background functions always return 202 immediately
  // but keep running until handler resolves

  let body;
  try { body = JSON.parse(event.body); }
  catch { console.error('Invalid JSON body'); return; }

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
    console.error(`No baby_photo_urls for order ${order.order_number}`);
    await db.from('orders').update({ generation_status: 'failed_no_photo' }).eq('id', orderId);
    // Still send an email notifying support
    await sendSupportAlert(order, 'No baby photo URL found in order');
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

      generatedUrls = await generateImagesForOrder(order, faceUrl);

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
    console.error('Generation failed:', genErr.message, genErr.stack);
    await db.from('orders').update({ generation_status: 'failed' }).eq('id', orderId);
    // Try to send a support alert
    await sendSupportAlert(order, genErr.message).catch(() => {});
  }
};

// ============================================================
// Generate images for all themes
// ============================================================
async function generateImagesForOrder(order, faceUrl) {
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

    const pollRes = await fetch(`${KIE_BASE}/jobs/getTaskDetail?taskId=${encodeURIComponent(taskId)}`, {
      headers: { 'Authorization': `Bearer ${KIE_API_KEY}` }
    });

    if (!pollRes.ok) { console.warn(`KIE poll ${i + 1} HTTP error: ${pollRes.status}`); continue; }

    const pollJson = await pollRes.json();
    if (pollJson.code !== 200) { console.warn(`KIE poll ${i + 1} code: ${pollJson.code}`); continue; }

    const task   = pollJson.data;
    const status = (task?.status || task?.taskStatus || '').toString().toLowerCase();

    console.log(`KIE poll ${i + 1}/120: status="${status}"`);

    if (status === 'success' || status === 'completed' || status === 'done' || status === '2') {
      const url =
        task.result?.url ||
        task.result?.imageUrl ||
        task.result?.image_url ||
        (Array.isArray(task.result) && task.result[0]?.url) ||
        task.outputUrl ||
        task.output_url ||
        task.imageUrl;

      console.log('KIE result URL:', url);
      if (url) return url;
      throw new Error('KIE task completed but no URL found: ' + JSON.stringify(task).substring(0, 300));
    }

    if (status === 'failed' || status === 'error' || status === '3') {
      throw new Error('KIE task failed: ' + (task.error || task.errorMsg || JSON.stringify(task)).substring(0, 200));
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
    console.warn('No successful photos to deliver — sending support alert');
    await sendSupportAlert(order, 'Generation completed but 0 successful images');
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
// Support alert — sent when something goes wrong
// ============================================================
async function sendSupportAlert(order, errorMsg) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'SnapiBaby <onboarding@resend.dev>',
        to:      ['gabriel@snapibaby.com'], // troca pelo teu email
        subject: `⚠️ SnapiBaby generation failed — Order ${order.order_number}`,
        html: `<p>Order: <strong>${order.order_number}</strong><br>Customer: ${order.customer_email}<br>Error: <code>${errorMsg}</code></p>`
      })
    });
  } catch (e) {
    console.error('Support alert failed:', e.message);
  }
}

// ============================================================
// Prompt lookup
// ============================================================
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
