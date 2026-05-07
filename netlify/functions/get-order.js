// ============================================================
// NETLIFY FUNCTION: get-order
// URL: /.netlify/functions/get-order?order_id=xxx
//
// Busca os dados do pedido no Supabase (usando service_role)
// e retorna as URLs das fotos geradas pelo Fal.ai
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  const orderId = event.queryStringParameters?.order_id;
  if (!orderId) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'order_id is required' }) };
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_email, plan, generated_urls, generation_status, total_paid, upsell_added')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    if (!data)  return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Order not found' }) };

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) };

  } catch (err) {
    console.error('get-order error:', err.message);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
