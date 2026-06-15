// ============================================================
// NETLIFY FUNCTION: process-order
// URL: /.netlify/functions/process-order  (POST, internal)
//
// This function is called asynchronously by stripe-webhook.
// It handles KIE AI image generation with polling (can run
// up to 26 seconds on Netlify free, but we use background
// invocation style so it won't block the webhook).
//
// For main orders: generates all selected themes
// For upsell/downsell: generates holiday themes and appends
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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { orderId, type = 'main' } = body;
  if (!orderId) return { statusCode: 400, body: 'orderId required' };

  // Fetch the order
  const { data: order, error: fetchErr } = await db
    .from('orders').select('*').eq('id', orderId).single();

  if (fetchErr || !order) {
    console.error('process-order: order not found:', orderId);
    return { statusCode: 404, body: 'Order not found' };
  }

  const faceUrl = (order.baby_photo_urls || [])[0] || null;

  if (!faceUrl) {
    console.error(`process-order: no baby_photo_urls for order ${order.order_number}`);
    await db.from('orders').update({ generation_status: 'failed' }).eq('id', orderId);
    return { statusCode: 200, body: 'No photo URL — generation skipped' };
  }

  try {
    let generatedUrls;

    if (type === 'upsell' || type === 'downsell') {
      // Generate extra holiday themes
      const extraThemes = order.upsell_themes || [];
      console.log(`process-order: upsell — generating ${extraThemes.length} holiday themes for order ${order.order_number}`);

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

      console.log(`Upsell: added ${newUrls.length} photos to order ${order.order_number}`);

    } else {
      // Main order: generate all selected themes
      const themes = order.themes_selected || [];
      console.log(`process-order: main — generating ${themes.length} themes for order ${order.order_number}`);
      console.log(`process-order: face URL = ${faceUrl}`);

      generatedUrls = await generateImagesForOrder(order, faceUrl);

      await db.from('orders').update({
        generated_urls:    generatedUrls,
        generation_status: 'done',
        download_url:      `${SITE_URL}/dashboard.html?order=${orderId}`
      }).eq('id', orderId);

      console.log(`Generated ${generatedUrls.length} images for order ${order.order_number}`);
    }

    // Send delivery email
    await sendDeliveryEmail(order, generatedUrls).catch(err =>
      console.error('Delivery email failed:', err.message)
    );

  } catch (genErr) {
    console.error('process-order generation failed:', genErr.message);
    await db.from('orders').update({ generation_status: 'failed' }).eq('id', orderId);
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};

// ============================================================
// Generate images for all themes of a main order
// ============================================================
async function generateImagesForOrder(order, faceUrl) {
  const themes  = order.themes_selected || [];
  const results = [];

  for (const theme of themes) {
    const themeName = typeof theme === 'string' ? theme : (theme.name || 'default');
    // Clean emoji from theme name for prompt lookup
    const cleanName = themeName.replace(/[^\w\s]/g, '').trim();
    const prompt    = findPrompt(cleanName);

    try {
      const imgUrl = await callKieAiWithRetry(prompt, faceUrl, 2);
      results.push({ theme: themeName, url: imgUrl, status: 'ok' });
    } catch (err) {
      console.warn(`KIE AI failed for theme "${themeName}":`, err.message);
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
  if (createJson.code !== 200 || !createJson.data?.taskId) {
    throw new Error(`KIE createTask error: ${JSON.stringify(createJson)}`);
  }

  const taskId = createJson.data.taskId;
  console.log(`KIE task created: ${taskId}`);

  // Poll — max 5 min (60 polls × 5s)
  for (let i = 0; i < 60; i++) {
    await sleep(5000);

    const pollRes = await fetch(`${KIE_BASE}/jobs/getTaskDetail?taskId=${encodeURIComponent(taskId)}`, {
      headers: { 'Authorization': `Bearer ${KIE_API_KEY}` }
    });

    if (!pollRes.ok) { console.warn(`KIE poll ${i + 1} failed: ${pollRes.status}`); continue; }

    const pollJson = await pollRes.json();
    if (pollJson.code !== 200) continue;

    const task   = pollJson.data;
    const status = (task?.status || task?.taskStatus || '').toString().toLowerCase();

    if (status === 'success' || status === 'completed' || status === 'done' || status === '2') {
      const url =
        task.result?.url ||
        task.result?.imageUrl ||
        task.result?.image_url ||
        (Array.isArray(task.result) && task.result[0]?.url) ||
        task.outputUrl ||
        task.output_url ||
        task.imageUrl;

      if (url) return url;
      throw new Error('KIE task completed but no URL found: ' + JSON.stringify(task));
    }

    if (status === 'failed' || status === 'error' || status === '3') {
      throw new Error('KIE task failed: ' + (task.error || task.errorMsg || JSON.stringify(task)));
    }

    console.log(`KIE poll ${i + 1}/60: status=${status}`);
  }

  throw new Error('KIE AI task timed out after 5 minutes');
}

async function callKieAiWithRetry(prompt, faceImageUrl, maxRetries = 2) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callKieAi(prompt, faceImageUrl);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const delay = attempt * 3000;
        console.warn(`KIE attempt ${attempt}/${maxRetries} failed: ${err.message}. Retry in ${delay / 1000}s`);
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

// ============================================================
// Delivery email — sent when photos are ready
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
    console.warn('No successful photos to deliver for order', order.order_number);
    return;
  }

  const photoCards = successUrls.map((item, i) => `
    <div style="margin-bottom:16px;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">${item.theme}</p>
      <img src="${item.url}" alt="SnapiBaby ${item.theme} portrait"
           style="width:100%;max-width:280px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.12);">
      <br>
      <a href="${item.url}" target="_blank"
         style="display:inline-block;margin-top:8px;padding:8px 20px;background:#ff4d6d;color:white;
                border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;">
        ⬇ Save Photo ${i + 1}
      </a>
    </div>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#ff4d6d,#ff8fa3);padding:32px 24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">🍼 SnapiBaby</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px;">Your baby's portraits are ready! 📸</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#2d3142;margin:0 0 8px;">Hi ${name}! 💕</h2>
      <p style="color:#6b7280;margin:0 0 8px;line-height:1.6;">
        Your SnapiBaby portraits are ready — <strong>${successUrls.length} photos</strong> created just for you!
        Tap each photo to view it full size, then save it to your phone.
      </p>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 28px;">
        Order: <strong>${order.order_number}</strong> · Plan: <strong>${plan}</strong>
      </p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        ${photoCards}
      </div>

      <div style="margin-top:24px;text-align:center;">
        <a href="${SITE_URL}/dashboard.html?order=${order.id}"
           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#ff4d6d,#ff8fa3);
                  color:white;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;">
          📂 View My Full Gallery
        </a>
      </div>

      <div style="margin-top:24px;padding:16px;background:#fff8e1;border-radius:12px;border-left:4px solid #f5c518;">
        <p style="margin:0;font-size:13px;color:#7a5800;line-height:1.5;">
          💡 <strong>Tip:</strong> On iPhone, tap the button → tap the share icon → "Save to Photos".
          On Android, tap the button → it downloads to your Gallery automatically.
        </p>
      </div>

      <div style="margin-top:28px;padding:20px;background:linear-gradient(135deg,#fff0f3,#fff8e1);border-radius:14px;border:1.5px solid #ffd6e0;text-align:center;">
        <p style="margin:0 0 8px;font-size:1rem;font-weight:800;color:#2d3142;">❤️ Know another mom who'd love this?</p>
        <p style="margin:0 0 14px;font-size:0.88rem;color:#64748b;line-height:1.5;">
          Share SnapiBaby with a friend and <strong>both of you get 10% OFF</strong> your next order!<br>
          Use code <strong style="color:#ff4d6d;">SNAPIFRIEND10</strong> to redeem.
        </p>
        <a href="https://api.whatsapp.com/send?text=I+just+got+the+most+beautiful+baby+portraits+with+SnapiBaby!+%F0%9F%8D%BC+Use+code+SNAPIFRIEND10+for+10%25+off+%E2%86%92+https%3A%2F%2Fsnapibaby.netlify.app"
           target="_blank"
           style="display:inline-block;padding:10px 24px;background:#25D366;color:white;border-radius:30px;text-decoration:none;font-weight:700;font-size:0.88rem;">
          Share on WhatsApp
        </a>
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
      subject: `📸 ${name}'s SnapiBaby portraits are ready!`,
      html
    })
  });

  if (!res.ok) throw new Error(`Resend delivery error: ${await res.text()}`);
  console.log(`Delivery email sent to ${order.customer_email} with ${successUrls.length} photos`);
}

// ============================================================
// Prompt lookup
// ============================================================
function findPrompt(cleanThemeName) {
  const lower = cleanThemeName.toLowerCase();
  for (const key of Object.keys(THEME_PROMPTS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return THEME_PROMPTS[key];
    }
  }
  return THEME_PROMPTS['default'];
}

const HOLIDAY_PROMPTS = {
  'Christmas':   'Transform this newborn baby photo into a professional studio portrait: baby in a cozy Christmas setting with a tiny Santa hat, fairy lights, wrapped gifts and a warm winter backdrop, soft warm studio lighting, ultra-realistic photorealistic portrait',
  'Halloween':   'Transform this newborn baby photo into a professional studio portrait: baby in an adorable Halloween costume surrounded by friendly pumpkins, autumn leaves and candy corn, dramatic but cute studio lighting, photorealistic',
  'Easter':      'Transform this newborn baby photo into a professional studio portrait: baby with cute Easter bunny ears surrounded by colorful Easter eggs and spring flowers, soft pastel studio lighting, photorealistic',
  'St Patricks': 'Transform this newborn baby photo into a professional studio portrait: baby in a tiny green outfit with shamrocks and pot of gold, Irish spring background, studio quality photorealistic'
};

const THEME_PROMPTS = {
  'Astronaut':       'Transform this newborn baby photo into a professional studio portrait: baby in an astronaut costume floating in outer space surrounded by stars and galaxies, ultra-realistic 4K studio lighting, soft bokeh, baby face clearly visible, photorealistic',
  'Christmas':       'Transform this newborn baby photo into a professional studio portrait: baby in a Christmas theme with a Santa hat, fairy lights and cozy winter setting, soft warm studio lighting, photorealistic',
  'Halloween':       'Transform this newborn baby photo into a professional studio portrait: baby in a cute Halloween costume surrounded by pumpkins and friendly ghosts, dramatic studio lighting, photorealistic',
  'Easter':          'Transform this newborn baby photo into a professional studio portrait: baby with Easter bunny ears in a spring pastel garden with colorful eggs, soft studio lighting, photorealistic',
  'Princess':        'Transform this newborn baby photo into a professional studio portrait: baby with a royal princess tiny crown against a palace background, pink and gold tones, studio lighting, photorealistic',
  'Safari':          'Transform this newborn baby photo into a professional studio portrait: baby surrounded by cute safari animals — giraffe, elephant, lion — in a lush African savanna, studio quality photorealistic',
  'Fairy':           'Transform this newborn baby photo into a professional studio portrait: baby with tiny fairy wings in an enchanted forest with sparkles and flowers, magical golden lighting, photorealistic portrait',
  'Floral':          'Transform this newborn baby photo into a professional studio portrait: baby in a wicker basket surrounded by fresh roses and peonies, soft diffused studio lighting, photorealistic',
  'Galaxy':          'Transform this newborn baby photo into a professional studio portrait: baby floating in a galaxy with stars, nebulae and planets in the deep space background, ultra-realistic studio quality photorealistic',
  'Teddy':           'Transform this newborn baby photo into a professional studio portrait: baby snuggled with teddy bears in a cozy nursery, warm soft lighting, cream and brown tones, photorealistic',
  'Pirate':          'Transform this newborn baby photo into a professional studio portrait: baby in a cute tiny pirate hat and costume, ship and ocean background, dramatic studio lighting, photorealistic',
  'Superhero':       'Transform this newborn baby photo into a professional studio portrait: baby in a superhero costume with a tiny cape, city skyline background, dramatic studio lighting, photorealistic',
  'Minimalist':      'Transform this newborn baby photo into a professional studio portrait: baby in a clean minimalist white studio setting, soft diffused light, simple elegant background, ultra-realistic photorealistic',
  'Cartoon':         'Transform this newborn baby photo into a professional studio portrait: baby in a colorful cartoon world, pastel illustrated background, studio quality lighting, adorable baby face, photorealistic portrait',
  'Dinosaur':        'Transform this newborn baby photo into a professional studio portrait: baby in a cute dinosaur costume, lush prehistoric jungle background, friendly dinosaurs, studio quality 4K lighting, photorealistic',
  'Starry':          'Transform this newborn baby photo into a professional studio portrait: baby under a magical starry night sky, swirling stars, soft dreamy lighting, photorealistic portrait',
  'Natural':         'Transform this newborn baby photo into a professional studio portrait: baby in a woven basket with natural textures, neutral earth tones, warm studio lighting, photorealistic',
  'default':         'Transform this newborn baby photo into a professional studio portrait with a magical themed setting, ultra-realistic 4K studio lighting, soft bokeh background, photorealistic'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
