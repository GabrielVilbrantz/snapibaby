// ============================================================
// NETLIFY FUNCTION: stripe-webhook
// URL: /.netlify/functions/stripe-webhook
//
// Recebe eventos do Stripe via webhook e:
//  1. Verifica assinatura do Stripe (segurança)
//  2. Atualiza o pedido no Supabase (payment_status = 'paid')
//  3. Dispara geração de imagens no Fal.ai
//  4. Salva URLs geradas de volta no Supabase
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// ─── Variáveis de ambiente (configure no Netlify Dashboard → Site settings → Environment variables) ───
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_SERVICE  = process.env.SUPABASE_SERVICE_ROLE_KEY; // service_role (não a anon!)
const STRIPE_SECRET     = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FAL_API_KEY       = process.env.FAL_API_KEY;

const stripe = new Stripe(STRIPE_SECRET);
const db     = createClient(SUPABASE_URL, SUPABASE_SERVICE);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ── 1. Verificar assinatura do Stripe ──────────────────────
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
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

    // ── 3. Gerar imagens no Fal.ai ─────────────────────────
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
// Gera imagens para todos os temas do pedido via Fal.ai
// ============================================================
async function generateImagesForOrder(order) {
  const themes     = order.themes_selected || [];
  const faceUrls   = order.baby_photo_urls || [];
  const faceUrl    = faceUrls[0] || null;
  const results    = [];

  const THEME_PROMPTS = {
    'Astronaut':    'professional studio newborn portrait baby astronaut costume, outer space background',
    'Christmas':    'professional studio newborn portrait baby Christmas theme, Santa hat, fairy lights, cozy',
    'Halloween':    'professional studio newborn portrait baby Halloween cute costume, pumpkins backdrop',
    'Easter':       'professional studio newborn portrait baby Easter bunny ears, spring pastel garden',
    'Princess':     'professional studio newborn portrait baby princess tiny crown, palace background',
    'Safari':       'professional studio newborn portrait baby safari animals giraffe elephant background',
    'Fairy Magic':  'professional studio newborn portrait baby fairy wings, enchanted forest sparkles',
    'Floral Basket':'professional studio newborn portrait baby in wicker basket roses peonies',
    'Galaxy Space': 'professional studio newborn portrait baby floating in galaxy stars nebulae',
    'Cozy Teddy':   'professional studio newborn portrait baby snuggled teddy bears cozy nursery',
    // fallback
    'default':      'professional studio newborn portrait baby magical themed setting, 4K studio lighting'
  };

  for (const theme of themes) {
    const themeName = typeof theme === 'string' ? theme : theme.name || 'default';
    const prompt = THEME_PROMPTS[themeName] || THEME_PROMPTS['default'];

    try {
      const imgUrl = await callFalAi(prompt, faceUrl);
      results.push({ theme: themeName, url: imgUrl, status: 'ok' });
    } catch (err) {
      console.warn(`Fal.ai failed for theme "${themeName}":`, err.message);
      results.push({ theme: themeName, url: null, status: 'failed', error: err.message });
    }
  }

  return results;
}

// ============================================================
// Chama fal-ai/ip-adapter-face-id e aguarda o resultado
// ============================================================
async function callFalAi(prompt, faceImageUrl) {
  const ENDPOINT = 'fal-ai/ip-adapter-face-id';

  // Submit job
  const submitRes = await fetch(`https://queue.fal.run/${ENDPOINT}`, {
    method:  'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      prompt,
      face_image_url:    faceImageUrl,
      negative_prompt:   'blurry, low quality, distorted face, ugly',
      num_inference_steps: 30,
      guidance_scale:    7.5,
      face_id_strength:  0.8,
      image_size:        'portrait_4_3'
    })
  });

  if (!submitRes.ok) throw new Error(`Fal submit failed: ${submitRes.status}`);
  const { request_id } = await submitRes.json();

  // Poll result (max ~3 min)
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const pollRes = await fetch(`https://queue.fal.run/${ENDPOINT}/requests/${request_id}`, {
      headers: { 'Authorization': `Key ${FAL_API_KEY}` }
    });
    if (!pollRes.ok) continue;
    const data = await pollRes.json();
    if (data.status === 'COMPLETED') {
      const images = data.images || data.output?.images || [];
      if (images.length > 0) return images[0].url || images[0];
      throw new Error('No images in response');
    }
    if (data.status === 'FAILED') throw new Error('Fal job failed: ' + (data.error || 'unknown'));
  }
  throw new Error('Fal.ai timeout');
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
