// ============================================================
// NETLIFY FUNCTION: create-order
// URL: /.netlify/functions/create-order  (POST)
//
// Creates an order in Supabase using the SERVICE ROLE KEY,
// which bypasses RLS and can SELECT the inserted row.
// The browser anon key can INSERT but cannot SELECT → use this instead.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE);

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

  const {
    customerName,
    customerEmail,
    plan,
    basePrice,
    bumpAdded,
    totalPaid,
    stripePaymentIntent,
    stripeCustomerId,
    stripePaymentMethod,
    themesSelected,
    babyPhotoUrls
  } = body;

  if (!customerEmail || !plan || !stripePaymentIntent) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  console.log(`create-order: ${customerEmail}, plan=${plan}, pi=${stripePaymentIntent}`);
  console.log(`create-order: themes=${JSON.stringify(themesSelected)}, photos=${JSON.stringify(babyPhotoUrls)}`);

  try {
    const { data, error } = await db
      .from('orders')
      .insert({
        customer_name:         customerName   || '',
        customer_email:        customerEmail,
        plan,
        base_price:            basePrice      || 0,
        bump_added:            bumpAdded      || false,
        total_paid:            totalPaid      || 0,
        stripe_payment_intent: stripePaymentIntent,
        stripe_customer_id:    stripeCustomerId   || null,
        stripe_payment_method: stripePaymentMethod || null,
        payment_status:        'paid',
        themes_selected:       themesSelected || [],
        baby_photo_urls:       babyPhotoUrls  || [],
        generation_status:     'pending'
      })
      .select('id, order_number')
      .single();

    if (error) {
      console.error('Supabase insert error:', error.message, error.details);
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: error.message }) };
    }

    console.log(`Order created: ${data.order_number} (${data.id})`);
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ id: data.id, order_number: data.order_number })
    };

  } catch (err) {
    console.error('create-order error:', err.message);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
