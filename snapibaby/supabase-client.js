// ============================================================
// SNAPIBABY — Supabase Configuration
// Cole sua anon key abaixo (Settings → API no Supabase)
// ============================================================

const SUPABASE_URL  = 'https://ellkwqmnidcimosllccv.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsbGt3cW1uaWRjaW1vc2xsY2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTgyMTUsImV4cCI6MjA5MzA3NDIxNX0.9TAoP7h3KdrHYhU_ujEAAG1eu_plCLgAOJZu3uLci24';

// ============================================================
// Inicializa o cliente Supabase (usa CDN no HTML)
// Inclua no HTML antes deste script:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// ============================================================
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// Salva pedido no Supabase após pagamento confirmado
// Chame esta função logo após stripe.confirmPayment() ter sucesso
// ============================================================
async function saveOrderToSupabase({
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
}) {
  const { data, error } = await db
    .from('orders')
    .insert({
      customer_name:          customerName,
      customer_email:         customerEmail,
      plan:                   plan,
      base_price:             basePrice,
      bump_added:             bumpAdded,
      total_paid:             totalPaid,
      stripe_payment_intent:  stripePaymentIntent,
      stripe_customer_id:     stripeCustomerId,
      stripe_payment_method:  stripePaymentMethod,
      payment_status:         'paid',
      themes_selected:        themesSelected,
      baby_photo_urls:        babyPhotoUrls,
      generation_status:      'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error.message);
    return null;
  }

  // Save order ID to localStorage for success page
  localStorage.setItem('snapi_order_id',     data.id);
  localStorage.setItem('snapi_order_number', data.order_number);

  return data;
}

// ============================================================
// Atualiza status do upsell/downsell no pedido
// ============================================================
async function updateOrderUpsell(orderId, { upsellAdded, downsellAdded, extraPaid }) {
  const { error } = await db
    .from('orders')
    .update({
      upsell_added:   upsellAdded   ?? false,
      downsell_added: downsellAdded ?? false,
      total_paid:     db.rpc('increment', { row_id: orderId, amount: extraPaid })
    })
    .eq('id', orderId);

  if (error) console.error('Supabase upsell update error:', error.message);
}

// ============================================================
// Salva backup de email
// ============================================================
async function saveEmailBackup({ orderId, customerName, customerEmail }) {
  const { error } = await db
    .from('email_backups')
    .insert({
      order_id:       orderId,
      customer_name:  customerName,
      customer_email: customerEmail,
      status:         'pending'
    });

  if (error) console.error('Supabase email backup error:', error.message);
}

// ============================================================
// Busca status do pedido (para polling na success page)
// ============================================================
async function getOrderStatus(orderId) {
  const { data, error } = await db
    .from('orders')
    .select('generation_status, download_url, order_number')
    .eq('id', orderId)
    .single();

  if (error) return null;
  return data;
}
