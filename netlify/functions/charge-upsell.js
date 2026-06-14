// ============================================================
// NETLIFY FUNCTION: charge-upsell
// URL: /.netlify/functions/charge-upsell
//
// Cobra o upsell ($17) ou downsell ($7) com 1 clique.
// Marca os temas extras no pedido do Supabase.
// O stripe-webhook detecta o PI de upsell e dispara KIE AI
// para gerar as fotos dos temas holiday extras.
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET    = process.env.STRIPE_SECRET_KEY;

const stripe = new Stripe(STRIPE_SECRET);
const db     = createClient(SUPABASE_URL, SUPABASE_SERVICE);

// Temas de upsell (holiday) e downsell
const UPSELL_THEMES   = ['Christmas', 'Halloween', 'Easter'];
const DOWNSELL_THEMES = ['Christmas'];

const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { payment_method, customer, amount, currency = 'usd', description, order_id } = body;

  if (!payment_method || !customer || !amount) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  // Determine which themes to generate based on amount
  const isUpsell   = amount >= 1700;
  const isDownsell = !isUpsell;
  const extraThemes = isUpsell ? UPSELL_THEMES : DOWNSELL_THEMES;

  try {
    // ── Cobrar com 1 clique ───────────────────────────────────
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer,
      payment_method,
      description,
      confirm:     true,
      off_session: true,
      return_url:  'https://snapibaby.netlify.app/success.html',
      metadata: {
        // Webhook vai usar isso para encontrar o pedido e gerar as fotos extras
        order_id,
        type:         isUpsell ? 'upsell' : 'downsell',
        extra_themes: extraThemes.join(',')
      }
    });

    console.log('Upsell charge succeeded:', paymentIntent.id, `$${amount / 100}`, extraThemes.join(','));

    // ── Marcar no Supabase ────────────────────────────────────
    if (order_id) {
      await db.from('orders').update({
        upsell_added:   isUpsell,
        downsell_added: isDownsell,
        // Adiciona os temas extras ao campo de temas do pedido
        // O webhook vai ler isso e gerar as fotos
        upsell_themes:  extraThemes
      }).eq('id', order_id);
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ success: true, payment_intent_id: paymentIntent.id })
    };

  } catch (err) {
    console.error('Charge failed:', err.message);
    const isCardError = err.type === 'StripeCardError';
    return {
      statusCode: isCardError ? 402 : 500,
      headers: HEADERS,
      body: JSON.stringify({ success: false, error: err.message, code: err.code || null })
    };
  }
};
