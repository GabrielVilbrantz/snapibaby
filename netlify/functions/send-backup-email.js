// ============================================================
// NETLIFY FUNCTION: send-backup-email
// URL: /.netlify/functions/send-backup-email  (POST)
//
// Envia email com links individuais de cada foto via Resend
// Requer: RESEND_API_KEY nas env vars do Netlify
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function buildEmailHtml(customerName, orderNumber, photoUrls, plan) {
  const photoCards = photoUrls.map((url, i) => `
    <div style="margin-bottom:12px;text-align:center;">
      <img src="${url}" alt="SnapiBaby photo ${i+1}"
           style="width:100%;max-width:300px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
      <br>
      <a href="${url}" download="snapibaby-photo-${i+1}.jpg"
         style="display:inline-block;margin-top:8px;padding:8px 20px;background:#ff4d6d;color:white;
                border-radius:20px;text-decoration:none;font-size:13px;font-weight:700;">
        ⬇ Save Photo ${i+1}
      </a>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ff4d6d,#ff8fa3);padding:32px 24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">🍼 SnapiBaby</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px;">Your baby's photos are ready!</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;">
      <h2 style="color:#2d3142;margin:0 0 8px;">Hi ${customerName}! 💕</h2>
      <p style="color:#6b7280;margin:0 0 24px;line-height:1.6;">
        Your SnapiBaby portraits are ready. Tap each photo below to view it, then 
        <strong>press and hold (iOS)</strong> or <strong>tap the save button (Android)</strong> to save to your phone.
      </p>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 28px;">Order: <strong>${orderNumber}</strong> · Plan: <strong>${plan}</strong></p>

      <!-- Photos -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${photoCards}
      </div>

      <!-- Footer note -->
      <div style="margin-top:32px;padding:16px;background:#fff8e1;border-radius:12px;border-left:4px solid #f5c518;">
        <p style="margin:0;font-size:13px;color:#7a5800;line-height:1.5;">
          💡 <strong>Tip:</strong> On iPhone, tap the button → tap the share icon → "Save to Photos". 
          On Android, tap the button → it downloads to your Gallery automatically.
        </p>
      </div>

      <div style="margin-top:24px;text-align:center;padding-top:24px;border-top:1px solid #f0f0f0;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          © 2026 SnapiBaby · Made with ❤️ for moms worldwide<br>
          <a href="https://snapibaby.netlify.app" style="color:#ff4d6d;">snapibaby.netlify.app</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { orderId, customerName, customerEmail, orderNumber, photoUrls = [], plan = 'premium' } = body;

  if (!customerEmail) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'customerEmail is required' }) };
  }

  // Save to Supabase email_backups table
  if (orderId) {
    await supabase.from('email_backups').upsert({
      order_id:       orderId,
      customer_name:  customerName,
      customer_email: customerEmail,
      sent_at:        new Date().toISOString(),
      status:         'sent'
    }, { onConflict: 'order_id' });
  }

  // Send email via Resend (if API key configured)
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email not sent, but backup saved to Supabase.');
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ success: true, message: 'Backup saved (email skipped — Resend not configured)' })
    };
  }

  const photosToSend = photoUrls.length > 0 ? photoUrls : ['https://snapibaby.netlify.app'];

  const emailRes = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'SnapiBaby <onboarding@resend.dev>',
      to:      [customerEmail],
      subject: `📸 ${customerName ? customerName + "'s" : 'Your'} SnapiBaby portraits are ready!`,
      html:    buildEmailHtml(customerName || 'there', orderNumber || 'SN-00000', photosToSend, plan)
    })
  });

  if (!emailRes.ok) {
    const errText = await emailRes.text();
    console.error('Resend error:', errText);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true, emailError: errText }) };
  }

  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true }) };
};
