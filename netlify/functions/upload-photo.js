// ============================================================
// NETLIFY FUNCTION: upload-photo
// URL: /.netlify/functions/upload-photo  (POST)
//
// Aceita base64 da foto do bebê, faz upload para Supabase Storage
// e retorna a URL pública para usar no KIE AI
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET           = 'baby-photos'; // crie este bucket no Supabase Storage (public)

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

  const { photoBase64, mimeType = 'image/jpeg', filename } = body;

  if (!photoBase64) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'photoBase64 is required' }) };
  }

  try {
    // Convert base64 to Buffer
    const buffer = Buffer.from(photoBase64, 'base64');
    const ext    = mimeType === 'image/png' ? 'png' : 'jpg';
    const path   = `orders/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) throw new Error('Storage upload failed: ' + uploadError.message);

    // Get public URL
    const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) throw new Error('Could not get public URL');

    console.log('Photo uploaded:', publicUrl);

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ url: publicUrl, path })
    };

  } catch (err) {
    console.error('upload-photo error:', err.message);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
