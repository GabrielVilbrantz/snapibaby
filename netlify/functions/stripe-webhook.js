// ============================================================
// NETLIFY FUNCTION: stripe-webhook
// URL: /.netlify/functions/stripe-webhook (POST)
//
// CRITICAL: Must return 200 to Stripe within 10 seconds.
// So we only verify the event, update DB, send confirmation email,
// then KICK OFF generation asynchronously via process-order.
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET         = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const RESEND_API_KEY        = process.env.RESEND_API_KEY;
const SITE_URL              = 'https://snapibaby.netlify.app';

const stripe = new Stripe(STRIPE_SECRET);
const db     = createClient(SUPABASE_URL, SUPABASE_SERVICE);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ── 1. Verify Stripe signature ──────────────────────────────
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

  // ── 2. Only handle payment_intent.succeeded ─────────────────
  if (stripeEvent.type !== 'payment_intent.succeeded') {
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  const paymentIntent = stripeEvent.data.object;
  const piId          = paymentIntent.id;
  const meta          = paymentIntent.metadata || {};

  console.log('Payment succeeded:', piId, 'type:', meta.type || 'main');

  // ── UPSELL / DOWNSELL ──────────────────────────────────────
  if (meta.type === 'upsell' || meta.type === 'downsell') {
    const orderId     = meta.order_id;
    const extraThemes = (meta.extra_themes || '').split(',').filter(Boolean);

    if (!orderId || !extraThemes.length) {
      console.warn('Upsell PI missing order_id or extra_themes');
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // Mark upsell in DB
    await db.from('orders').update({
      upsell_themes:  extraThemes,
      upsell_added:   meta.type === 'upsell',
      downsell_added: meta.type === 'downsell',
      generation_status: 'processing'
    }).eq('id', orderId);

    console.log(`Upsell marked for order ${orderId}, themes: ${extraThemes.join(', ')}`);

    // Fire-and-forget: kick off async generation for upsell
    triggerProcessOrder(orderId, 'upsell').catch(e =>
      console.error('Failed to trigger upsell process-order:', e.message)
    );

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  // ── MAIN ORDER ────────────────────────────────────────────
  // Find order in Supabase
  const { data: order, error: fetchErr } = await db
    .from('orders')
    .select('*')
    .eq('stripe_payment_intent', piId)
    .single();

  if (fetchErr || !order) {
    console.error('Order not found for PI:', piId, fetchErr?.message);
    // Still return 200 so Stripe doesn't retry
    return { statusCode: 200, body: 'OK (order not found)' };
  }

  // Update to paid + processing
  await db.from('orders').update({
    payment_status:    'paid',
    generation_status: 'processing'
  }).eq('id', order.id);

  // Send immediate confirmation email (non-fatal)
  sendConfirmationEmail(order).catch(err =>
    console.error('Confirmation email failed:', err.message)
  );

  // Fire-and-forget: kick off photo generation
  triggerProcessOrder(order.id, 'main').catch(e =>
    console.error('Failed to trigger process-order:', e.message)
  );

  console.log(`Order ${order.order_number} marked paid — generation triggered async`);
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

// ============================================================
// Trigger process-order function asynchronously
// Uses a non-blocking fetch with a short timeout (fire-and-forget)
// ============================================================
async function triggerProcessOrder(orderId, type = 'main') {
  const url = `${SITE_URL}/.netlify/functions/process-order`;
  // Fire and don't await — just send the request
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, type })
  }).catch(e => console.error('triggerProcessOrder fetch error:', e.message));
  console.log(`process-order triggered for order ${orderId} (${type})`);
}

// ============================================================
// Confirmation email (immediate, before photos are ready)
// ============================================================
async function sendConfirmationEmail(order) {
  if (!RESEND_API_KEY) return;

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
        You'll receive another email with your photos as soon as they're ready — usually within 15–30 minutes.
      </p>
      <div style="background:#fff8f0;border-radius:12px;padding:20px;margin-bottom:24px;border-left:4px solid #ff4d6d;">
        <p style="margin:0;font-size:14px;color:#7a3800;">
          📦 <strong>Plan:</strong> ${plan}<br>
          🔢 <strong>Order:</strong> ${order.order_number || 'Processing...'}<br>
          ⏱️ <strong>Estimated time:</strong> 15–30 minutes
        </p>
      </div>
      <p style="color:#9ca3af;font-size:13px;line-height:1.5;">
        Check your order status anytime at:<br>
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
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'SnapiBaby <onboarding@resend.dev>',
      to:      [order.customer_email],
      subject: `✅ We got your order, ${name}! Portraits in ~20 min`,
      html
    })
  });

  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
  console.log('Confirmation email sent to:', order.customer_email);
}
