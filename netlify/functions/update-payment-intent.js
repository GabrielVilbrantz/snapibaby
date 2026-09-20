// ============================================================
// NETLIFY FUNCTION: update-payment-intent
// URL: /.netlify/functions/update-payment-intent (POST)
//
// Atualiza o amount de um PaymentIntent já criado — necessário quando
// a cliente adiciona o order bump ou usa o exit-intent discount.
// O frontend chama elements.fetchUpdates() após receber a resposta.
// ============================================================

const Stripe = require('stripe');

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(STRIPE_SECRET);

// Tabela de preços — idêntica ao create-payment-intent.js
const ZERO_DECIMAL = new Set(['jpy','krw','vnd','clp','bif','gnf','mga','pyg','rwf','ugx','xaf','xof']);

const PRICING = {
  // TIER A
  US: { currency:'usd', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  CA: { currency:'cad', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  AU: { currency:'aud', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  NZ: { currency:'nzd', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  AE: { currency:'usd', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  QA: { currency:'usd', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  KW: { currency:'usd', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  BH: { currency:'usd', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  OM: { currency:'usd', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  FR: { currency:'eur', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  DE: { currency:'eur', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  NL: { currency:'eur', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  BE: { currency:'eur', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  AT: { currency:'eur', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  IE: { currency:'eur', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  FI: { currency:'eur', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  LU: { currency:'eur', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  CH: { currency:'chf', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
  NO: { currency:'nok', plans:{ starter:29700, classic:39700, premium:49700 }, bump:4700 },
  DK: { currency:'dkk', plans:{ starter:19700, classic:29700, premium:39700 }, bump:2700 },
  SE: { currency:'sek', plans:{ starter:29700, classic:39700, premium:49700 }, bump:4700 },
  JP: { currency:'jpy', plans:{ starter:3997, classic:5997, premium:7497 }, bump:597 },
  SG: { currency:'sgd', plans:{ starter:3700, classic:4700, premium:6700 }, bump:700 },
  IL: { currency:'ils', plans:{ starter:9700, classic:13700, premium:17700 }, bump:1700 },
  // TIER B
  GB: { currency:'gbp', plans:{ starter:1700, classic:2700, premium:3700 }, bump:700 },
  ES: { currency:'eur', plans:{ starter:1700, classic:2700, premium:3700 }, bump:700 },
  IT: { currency:'eur', plans:{ starter:1700, classic:2700, premium:3700 }, bump:700 },
  PT: { currency:'eur', plans:{ starter:1700, classic:2700, premium:3700 }, bump:700 },
  GR: { currency:'eur', plans:{ starter:1700, classic:2700, premium:3700 }, bump:700 },
  SK: { currency:'eur', plans:{ starter:1700, classic:2700, premium:3700 }, bump:700 },
  SI: { currency:'eur', plans:{ starter:1700, classic:2700, premium:3700 }, bump:700 },
  EE: { currency:'eur', plans:{ starter:1700, classic:2700, premium:3700 }, bump:700 },
  LV: { currency:'eur', plans:{ starter:1700, classic:2700, premium:3700 }, bump:700 },
  LT: { currency:'eur', plans:{ starter:1700, classic:2700, premium:3700 }, bump:700 },
  PL: { currency:'pln', plans:{ starter:6700, classic:10700, premium:14700 }, bump:1700 },
  CZ: { currency:'czk', plans:{ starter:39700, classic:62700, premium:85700 }, bump:8700 },
  KR: { currency:'krw', plans:{ starter:23997, classic:36997, premium:50997 }, bump:3997 },
  SA: { currency:'sar', plans:{ starter:6700, classic:9700, premium:13700 }, bump:1700 },
  HU: { currency:'huf', plans:{ starter:649700, classic:999700, premium:1329700 }, bump:99700 },
  // Dedicated
  MX: { currency:'usd', plans:{ starter:700, classic:1700, premium:2700 }, bump:300 },
  BR: { currency:'brl', plans:{ starter:1500, classic:1500, premium:1500 }, bump:500 },
  AR: { currency:'ars', plans:{ starter:1799700, classic:1999700, premium:2399700 }, bump:399700 },
  CO: { currency:'cop', plans:{ starter:6199700, classic:6999700, premium:8399700 }, bump:1799700 },
  PE: { currency:'pen', plans:{ starter:5700, classic:6700, premium:7700 }, bump:1700 },
  CL: { currency:'clp', plans:{ starter:14997, classic:16997, premium:19997 }, bump:3997 },
  UY: { currency:'uyu', plans:{ starter:64700, classic:74700, premium:89700 }, bump:19700 },
  ZA: { currency:'zar', plans:{ starter:28700, classic:32700, premium:39700 }, bump:6700 },
  // TIER C
  IN: { currency:'inr', plans:{ starter:59700, classic:139700, premium:229700 }, bump:9700 },
  PH: { currency:'php', plans:{ starter:39700, classic:94700, premium:149700 }, bump:6700 },
  NG: { currency:'ngn', plans:{ starter:1099700, classic:2699700, premium:4299700 }, bump:199700 },
  ID: { currency:'idr', plans:{ starter:10999700, classic:26999700, premium:42999700 }, bump:1799700 },
  VN: { currency:'vnd', plans:{ starter:174997, classic:424997, premium:674997 }, bump:49997 },
  EG: { currency:'egp', plans:{ starter:34700, classic:83700, premium:132700 }, bump:5700 },
  KE: { currency:'kes', plans:{ starter:89700, classic:219700, premium:349700 }, bump:14700 },
  PK: { currency:'usd', plans:{ starter:700, classic:1700, premium:2700 }, bump:300 },
  BD: { currency:'usd', plans:{ starter:700, classic:1700, premium:2700 }, bump:300 },
  MA: { currency:'usd', plans:{ starter:700, classic:1700, premium:2700 }, bump:300 },
  DEFAULT: { currency:'usd', plans:{ starter:2700, classic:3700, premium:4700 }, bump:700 },
};

const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const {
    intentId,
    plan        = 'premium',
    hasBump     = false,
    exitDiscount = false,
    country: bodyCountry,
  } = body;

  if (!intentId) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'intentId is required' }) };
  }

  // Country: Netlify header takes priority (tamper-proof)
  const country = (event.headers['x-country'] || bodyCountry || 'US').toUpperCase();
  const pricing  = PRICING[country] || PRICING.DEFAULT;
  const cur      = pricing.currency;
  const isZero   = ZERO_DECIMAL.has(cur);
  const toDisplay = (v) => isZero ? v : v / 100;

  const planAmount = pricing.plans[plan] ?? pricing.plans.premium;
  const bumpAmount = pricing.bump;
  let   total      = planAmount + (hasBump ? bumpAmount : 0);

  if (exitDiscount === true) {
    total = Math.round(total * 0.9);
  }

  try {
    const updated = await stripe.paymentIntents.update(intentId, {
      amount: total,
      metadata: {
        plan,
        country,
        hasBump:      String(hasBump),
        exitDiscount: String(exitDiscount),
      },
    });

    console.log(`update-payment-intent: ${intentId} → ${toDisplay(total)} ${cur} (bump=${hasBump}, exit=${exitDiscount})`);

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        amount:       total,
        planAmount,
        bumpAmount,
        totalDisplay: toDisplay(total),
        bumpDisplay:  toDisplay(bumpAmount),
        currency:     cur,
        symbol:       pricing.symbol,
      }),
    };

  } catch (err) {
    console.error('update-payment-intent error:', err.message);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
