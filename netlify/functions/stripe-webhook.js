// ============================================================
// NETLIFY FUNCTION: stripe-webhook
// URL: /.netlify/functions/stripe-webhook
//
// Recebe eventos do Stripe via webhook e:
//  1. Verifica assinatura do Stripe (segurança)
//  2. Atualiza o pedido no Supabase (payment_status = 'paid')
//  3. Envia email de confirmação imediata ao cliente
//  4. Dispara geração de imagens no KIE AI
//  5. Salva URLs geradas de volta no Supabase
//  6. Envia email de entrega com todas as fotos geradas
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// ─── Variáveis de ambiente ────────────────────────────────────
const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET         = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const KIE_API_KEY           = process.env.KIE_API_KEY;
const RESEND_API_KEY        = process.env.RESEND_API_KEY;
const KIE_BASE              = 'https://api.kie.ai/api/v1';
const SITE_URL              = 'https://snapibaby.netlify.app';

const stripe = new Stripe(STRIPE_SECRET);
const db     = createClient(SUPABASE_URL, SUPABASE_SERVICE);

// ============================================================
// Handler principal
// ============================================================
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ── 1. Verificar assinatura do Stripe ──────────────────────
  let stripeEvent;
  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;

    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      event.headers['stripe-signature'],
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // ── 2. Processar evento de pagamento confirmado ────────────
  if (stripeEvent.type === 'payment_intent.succeeded') {
    const paymentIntent = stripeEvent.data.object;
    const piId = paymentIntent.id;

    console.log('Payment succeeded:', piId);

    // Buscar pedido no Supabase
    const { data: order, error: fetchErr } = await db
      .from('orders')
      .select('*')
      .eq('stripe_payment_intent', piId)
      .single();

    if (fetchErr || !order) {
      console.error('Order not found for PI:', piId, fetchErr?.message);
      return { statusCode: 200, body: 'OK (order not found, skipped)' };
    }

    // Atualizar status para 'paid' e 'processing'
    await db.from('orders').update({
      payment_status:    'paid',
      generation_status: 'processing'
    }).eq('id', order.id);

    // ── 3. Email de confirmação imediata ──────────────────────
    // Enviado enquanto as fotos ainda estão sendo geradas
    await sendConfirmationEmail(order).catch(err =>
      console.error('Confirmation email failed (non-fatal):', err.message)
    );

    // ── 4. Gerar imagens no KIE AI ─────────────────────────
    try {
      const generatedUrls = await generateImagesForOrder(order);

      // ── 5. Salvar URLs geradas no Supabase ────────────────
      await db.from('orders').update({
        generated_urls:    generatedUrls,
        generation_status: 'done',
        download_url:      `${SITE_URL}/dashboard.html?order=${order.id}`
      }).eq('id', order.id);

      console.log(`Generated ${generatedUrls.length} images for order ${order.order_number}`);

      // ── 6. Email de entrega das fotos ─────────────────────
      await sendDeliveryEmail(order, generatedUrls).catch(err =>
        console.error('Delivery email failed (non-fatal):', err.message)
      );

    } catch (genErr) {
      console.error('Generation failed:', genErr.message);
      await db.from('orders').update({ generation_status: 'failed' }).eq('id', order.id);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

// ============================================================
// Email #1 — Confirmação imediata pós-pagamento
// ============================================================
async function sendConfirmationEmail(order) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — confirmation email skipped');
    return;
  }

  const name = order.customer_name || 'there';
  const plan = (order.plan || 'starter').charAt(0).toUpperCase() + (order.plan || 'starter').slice(1);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#ff4d6d,#ff8fa3);padding:32px 24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">🍼 SnapiBaby</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px;">Payment confirmed — we're creating your portraits!</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#2d3142;margin:0 0 12px;">Hi ${name}! 🎉</h2>
      <p style="color:#6b7280;margin:0 0 20px;line-height:1.6;">
        We received your payment and our AI is already working on <strong>${name}'s portraits</strong>.
        You'll receive another email with your photos as soon as they're ready — usually within 15 minutes.
      </p>
      <div style="background:#fff8f0;border-radius:12px;padding:20px;margin-bottom:24px;border-left:4px solid #ff4d6d;">
        <p style="margin:0;font-size:14px;color:#7a3800;">
          📦 <strong>Plan:</strong> ${plan}<br>
          🔢 <strong>Order:</strong> ${order.order_number || 'Processing...'}<br>
          ⏱️ <strong>Estimated time:</strong> ~15 minutes
        </p>
      </div>
      <p style="color:#9ca3af;font-size:13px;line-height:1.5;">
        You can also check your order status anytime at:<br>
        <a href="${SITE_URL}/dashboard.html?order=${order.id}" style="color:#ff4d6d;">
          ${SITE_URL}/dashboard.html
        </a>
      </p>
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
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      from:    'SnapiBaby <onboarding@resend.dev>',
      to:      [order.customer_email],
      subject: `✅ We got your order, ${name}! Portraits in ~15 min`,
      html
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend confirmation error: ${err}`);
  }

  console.log('Confirmation email sent to:', order.customer_email);
}

// ============================================================
// Email #2 — Entrega das fotos geradas
// ============================================================
async function sendDeliveryEmail(order, generatedUrls) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — delivery email skipped');
    return;
  }

  const name = order.customer_name || 'there';
  const plan = (order.plan || 'starter').charAt(0).toUpperCase() + (order.plan || 'starter').slice(1);

  // Filtrar apenas as fotos com sucesso
  const successUrls = generatedUrls
    .filter(item => item.status === 'ok' && item.url)
    .map(item => ({ url: item.url, theme: item.theme }));

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
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      from:    'SnapiBaby <onboarding@resend.dev>',
      to:      [order.customer_email],
      subject: `📸 ${name}'s SnapiBaby portraits are ready!`,
      html
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend delivery error: ${err}`);
  }

  console.log(`Delivery email sent to ${order.customer_email} with ${successUrls.length} photos`);
}

// ============================================================
// Gera imagens para todos os temas do pedido via KIE AI
// ============================================================
const THEME_PROMPTS = {
  'Astronaut':        'Transform this newborn baby photo into a professional studio portrait: baby in an astronaut costume floating in outer space surrounded by stars and galaxies, ultra-realistic 4K studio lighting, soft bokeh, baby face clearly visible, photorealistic',
  'Christmas':        'Transform this newborn baby photo into a professional studio portrait: baby in a Christmas theme with a Santa hat, fairy lights and cozy winter setting, soft warm studio lighting, photorealistic',
  'Halloween':        'Transform this newborn baby photo into a professional studio portrait: baby in a cute Halloween costume surrounded by pumpkins and friendly ghosts, dramatic studio lighting, photorealistic',
  'Easter':           'Transform this newborn baby photo into a professional studio portrait: baby with Easter bunny ears in a spring pastel garden with colorful eggs, soft studio lighting, photorealistic',
  'Princess':         'Transform this newborn baby photo into a professional studio portrait: baby with a royal princess tiny crown against a palace background, pink and gold tones, studio lighting, photorealistic',
  'Safari':           'Transform this newborn baby photo into a professional studio portrait: baby surrounded by cute safari animals — giraffe, elephant, lion — in a lush African savanna, studio quality photorealistic',
  'Fairy Magic':      'Transform this newborn baby photo into a professional studio portrait: baby with tiny fairy wings in an enchanted forest with sparkles and flowers, magical golden lighting, photorealistic portrait',
  'Floral Basket':    'Transform this newborn baby photo into a professional studio portrait: baby in a wicker basket surrounded by fresh roses and peonies, soft diffused studio lighting, photorealistic',
  'Galaxy Space':     'Transform this newborn baby photo into a professional studio portrait: baby floating in a galaxy with stars, nebulae and planets in the deep space background, ultra-realistic studio quality photorealistic',
  'Cozy Teddy':       'Transform this newborn baby photo into a professional studio portrait: baby snuggled with teddy bears in a cozy nursery, warm soft lighting, cream and brown tones, photorealistic',
  'default':          'Transform this newborn baby photo into a professional studio portrait with a magical themed setting, ultra-realistic 4K studio lighting, soft bokeh background, photorealistic'
};

async function generateImagesForOrder(order) {
  const themes   = order.themes_selected || [];
  const faceUrls = order.baby_photo_urls || [];
  const faceUrl  = faceUrls[0] || null;
  const results  = [];

  for (const theme of themes) {
    const themeName = typeof theme === 'string' ? theme : theme.name || 'default';
    const prompt = THEME_PROMPTS[themeName] || THEME_PROMPTS['default'];

    try {
      const imgUrl = await callKieAiWithRetry(prompt, faceUrl);
      results.push({ theme: themeName, url: imgUrl, status: 'ok' });
    } catch (err) {
      console.warn(`KIE AI failed for theme "${themeName}" after all retries:`, err.message);
      results.push({ theme: themeName, url: null, status: 'failed', error: err.message });
    }
  }

  return results;
}

// ============================================================
// KIE AI — cria task e aguarda resultado por polling
// ============================================================
async function callKieAi(prompt, faceImageUrl) {
  if (!faceImageUrl) throw new Error('No face image URL provided');

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

  // Poll for result (max ~5 min)
  for (let i = 0; i < 60; i++) {
    await sleep(5000);

    const pollRes = await fetch(`${KIE_BASE}/jobs/getTaskDetail?taskId=${encodeURIComponent(taskId)}`, {
      headers: { 'Authorization': `Bearer ${KIE_API_KEY}` }
    });

    if (!pollRes.ok) {
      console.warn(`KIE poll ${i + 1} failed: ${pollRes.status}`);
      continue;
    }

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

  throw new Error('KIE AI task timed out');
}

// ============================================================
// Retry wrapper — 3 tentativas, backoff exponencial
// ============================================================
async function callKieAiWithRetry(prompt, faceImageUrl, maxRetries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callKieAi(prompt, faceImageUrl);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const delay = attempt * 5000;
        console.warn(`KIE AI attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
