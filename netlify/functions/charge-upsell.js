// ============================================================
// NETLIFY FUNCTION: charge-upsell
// URL: /.netlify/functions/charge-upsell
//
// Cobra o upsell ($17) ou downsell ($7) com 1 clique
// usando o payment_method já salvo do checkout principal.
// Não precisa de novo formulário.
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET    = process.env.STRIPE_SECRET_KEY;

const stripe = new Stripe(STRIPE_SECRET);
const db     = createClient(SUPABASE_URL, SUPABASE_SERVICE);

exports.handler = async (event) => {
  // CORS para o site estático
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { payment_method, customer, amount, currency = 'usd', description, order_id } = body;

  // Validações básicas
  if (!payment_method || !customer || !amount) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing required fields: payment_method, customer, amount' })
    };
  }

  try {
    // ── Cobrar o cliente com o payment_method já salvo ────────
    // off_session: true = sem interação do usuário (1 clique)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer,
      payment_method,
      description,
      confirm:          true,
      off_session:      true,
      return_url:       'https://snapibaby.com/success.html' // ajuste para seu domínio
    });

    console.log('Upsell charge succeeded:', paymentIntent.id, `$${amount / 100}`);

    // ── Atualizar pedido no Supabase ──────────────────────────
    if (order_id) {
      const isUpsell    = amount === 1700;
      const isDownsell  = amount === 700;

      await db.from('orders').update({
        upsell_added:   isUpsell,
        downsell_added: isDownsell,
        total_paid:     db.rpc('increment_total', { row_id: order_id, amount_cents: amount / 100 })
      }).eq('id', order_id);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        payment_intent_id: paymentIntent.id
      })
    };

  } catch (err) {
    console.error('Charge failed:', err.message);

    // Stripe error codes for card issues
    const isCardError = err.type === 'StripeCardError';

    return {
      statusCode: isCardError ? 402 : 500,
      headers,
      body: JSON.stringify({
        success: false,
        error:   err.message,
        code:    err.code || null
      })
    };
  }
};
