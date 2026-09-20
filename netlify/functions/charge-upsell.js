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

  const { payment_method, customer, order_id, type } = body;

  if (!payment_method || !customer || !order_id) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  // ── Look up the order to get country + currency (never trust frontend amount) ──
  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('country, plan')
    .eq('id', order_id)
    .single();

  if (orderErr || !order) {
    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Order not found' }) };
  }

  // ── Calculate amount server-side from pricing table ──────────────────────
  const ZERO_DECIMAL = new Set(['jpy','krw','vnd','clp','bif','gnf','mga','pyg','rwf','ugx','xaf','xof']);
  const UPSELL_PRICES = {
    US:'usd', CA:'cad', AU:'aud', NZ:'nzd', AE:'usd', QA:'usd', KW:'usd', BH:'usd', OM:'usd',
    FR:'eur', DE:'eur', NL:'eur', BE:'eur', AT:'eur', IE:'eur', FI:'eur', LU:'eur',
    CH:'chf', GB:'gbp',
    ES:'eur', IT:'eur', PT:'eur', GR:'eur', SK:'eur', SI:'eur', EE:'eur', LV:'eur', LT:'eur',
  };
  const UPSELL_AMOUNTS = {
    usd:1700, cad:1700, aud:1700, nzd:1700, eur:1700, gbp:1700, chf:1700,
    nok:19700, dkk:12700, sek:19700, jpy:1997, sgd:1700, ils:6700,
    pln:6700, czk:39700, krw:12997, sar:6700, huf:449700,
    brl:1500, ars:999700, cop:3499700, pen:2700, clp:9997, uyu:29700, zar:14700,
    inr:69700, php:19700, ngn:499700, idr:5999700, vnd:89997, egp:16700, kes:39700,
    default_usd:1700,
  };
  const DOWNSELL_AMOUNTS = {
    usd:700, cad:700, aud:700, nzd:700, eur:700, gbp:700, chf:700,
    nok:7700, dkk:4700, sek:7700, jpy:797, sgd:700, ils:2700,
    pln:2700, czk:15700, krw:4997, sar:2700, huf:149700,
    brl:700, ars:399700, cop:1399700, pen:900, clp:3997, uyu:9700, zar:5700,
    inr:29700, php:7700, ngn:199700, idr:1799700, vnd:29997, egp:5700, kes:12700,
    default_usd:700,
  };

  const country = (order.country || 'US').toUpperCase();
  const cur = UPSELL_PRICES[country] || 'usd';
  const isUpsell   = type !== 'downsell';
  const isDownsell = type === 'downsell';
  const priceMap   = isUpsell ? UPSELL_AMOUNTS : DOWNSELL_AMOUNTS;
  const amount     = priceMap[cur] ?? priceMap['default_usd'];
  const currency   = cur;

  // Determine which themes to generate based on type
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

    console.log('Upsell charge succeeded:', paymentIntent.id, `${amount} ${currency.toUpperCase()}`, extraThemes.join(','));

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
