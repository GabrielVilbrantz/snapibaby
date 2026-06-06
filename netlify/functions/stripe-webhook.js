// ============================================================
// NETLIFY FUNCTION: stripe-webhook
// URL: /.netlify/functions/stripe-webhook
//
// Recebe eventos do Stripe via webhook e:
//  1. Verifica assinatura do Stripe (segurança)
//  2. Atualiza o pedido no Supabase (payment_status = 'paid')
//  3. Dispara geração de imagens no KIE AI
//  4. Salva URLs geradas de volta no Supabase
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// ─── Variáveis de ambiente (configure no Netlify Dashboard → Site settings → Environment variables) ───
const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE      = process.env.SUPABASE_SERVICE_ROLE_KEY; // service_role (não a anon!)
const STRIPE_SECRET         = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const KIE_API_KEY           = process.env.KIE_API_KEY;
const KIE_BASE              = 'https://api.kie.ai/api/v1';

const stripe = new Stripe(STRIPE_SECRET);
const db     = createClient(SUPABASE_URL, SUPABASE_SERVICE);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ── 1. Verificar assinatura do Stripe ──────────────────────
  let stripeEvent;
  try {
    // Netlify pode enviar o body em base64 — precisamos do raw string
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

    // Buscar pedido no Supabase pelo stripe_payment_intent
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

    // ── 3. Gerar imagens no KIE AI ─────────────────────────
    try {
      const generatedUrls = await generateImagesForOrder(order);

      // ── 4. Salvar URLs geradas no Supabase ────────────────
      await db.from('orders').update({
        generated_urls:   generatedUrls,
        generation_status: 'done',
        download_url:     `/gallery/${order.id}` // ou URL do ZIP
      }).eq('id', order.id);

      console.log(`Generated ${generatedUrls.length} images for order ${order.order_number}`);

    } catch (genErr) {
      console.error('Generation failed:', genErr.message);
      await db.from('orders').update({ generation_status: 'failed' }).eq('id', order.id);
    }
  }

  // ── Upsell pago ────────────────────────────────────────────
  if (stripeEvent.type === 'payment_intent.succeeded') {
    // (O mesmo evento pode cobrir upsell se você criar um PI separado)
    // Veja charge-upsell.js para o fluxo específico do upsell
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

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
// Cria task no KIE AI e aguarda o resultado por polling
// ============================================================
async function callKieAi(prompt, faceImageUrl) {
  if (!faceImageUrl) throw new Error('No face image URL provided');

  // Step 1: Create task
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

  // Step 2: Poll for result (max ~5 min)
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
// Retry wrapper para KIE AI — 3 tentativas, backoff exponencial
// ============================================================
async function callKieAiWithRetry(prompt, faceImageUrl, maxRetries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callKieAi(prompt, faceImageUrl);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const delay = attempt * 5000; // 5s, 10s, 15s
        console.warn(`KIE AI attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
