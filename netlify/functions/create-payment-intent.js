// ============================================================
// NETLIFY FUNCTION: create-payment-intent
// URL: /.netlify/functions/create-payment-intent
//
// Cria um PaymentIntent no Stripe e retorna o clientSecret
// para o frontend confirmar o pagamento com Stripe.js
// ============================================================

const Stripe = require('stripe');

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(STRIPE_SECRET);

// ⚠️ TESTE — R$1,00 — trocar para produção quando funcionar
const PLAN_PRICES = { starter: 100, classic: 100, premium: 100 };

const BUMP_PRICE = 100; // R$1,00

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { plan = 'premium', hasBump = true, customerEmail, customerName } = body;

  const planAmount = PLAN_PRICES[plan] ?? PLAN_PRICES.premium;
  const totalAmount = planAmount + (hasBump ? BUMP_PRICE : 0);

  try {
    // Criar (ou recuperar) cliente no Stripe para poder cobrar off-session no upsell
    let customer;
    if (customerEmail) {
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existing.data.length > 0) {
        customer = existing.data[0];
      } else {
        customer = await stripe.customers.create({
          email: customerEmail,
          name:  customerName || '',
          metadata: { plan, hasBump: String(hasBump) }
        });
      }
    }

    // Criar PaymentIntent com setup_future_usage para salvar o método de pagamento
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   totalAmount,
      currency: 'brl',
      customer: customer?.id,
      setup_future_usage: 'off_session', // ← permite upsell 1 clique depois
      metadata: {
        plan,
        hasBump:       String(hasBump),
        customerEmail: customerEmail || '',
        customerName:  customerName  || ''
      },
      description: `SnapiBaby – ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan${hasBump ? ' + Frames' : ''}`
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        customerId:   customer?.id   || null,
        intentId:     paymentIntent.id
      })
    };

  } catch (err) {
    console.error('create-payment-intent error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
