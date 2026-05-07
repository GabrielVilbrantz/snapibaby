// ============================================================
// NETLIFY FUNCTION: generate-preview
// URL: /.netlify/functions/generate-preview
//
// Recebe a foto do bebê (base64) + nome do tema
// Faz upload para fal.storage e gera a imagem via Fal.ai
// Retorna a URL da imagem gerada
// ============================================================

const FAL_API_KEY = process.env.FAL_API_KEY;

const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// ── Theme prompts ────────────────────────────────────────────
const THEME_PROMPTS = {
  'Astronaut':       'professional studio newborn portrait baby astronaut costume, outer space background with stars and galaxies, ultra-realistic 4K studio lighting, soft bokeh, baby face clearly visible, photorealistic',
  'Cute Cartoon':    'professional studio newborn portrait baby in colorful cartoon world, pastel illustrated background, studio quality lighting, adorable baby face, photorealistic portrait',
  'Dinosaur':        'professional studio newborn portrait baby cute dinosaur costume, lush prehistoric jungle background, friendly dinosaurs, studio quality 4K lighting, photorealistic',
  'Easter Bunny':    'professional studio newborn portrait baby Easter setting, colorful eggs, bunny ears, spring garden background, pastel colors, studio quality lighting, photorealistic',
  'Spring Bunny':    'professional studio newborn portrait baby bunny ears, magical spring garden, blooming flowers, soft pink and green tones, studio quality, photorealistic',
  'Fairy Magic':     'professional studio newborn portrait baby tiny fairy wings, enchanted forest with sparkles and flowers, magical golden lighting, photorealistic portrait',
  'Fairy Portrait':  'professional studio newborn portrait baby fairy princess dress, fairy tale forest background, golden hour lighting, sparkles, ultra-realistic photorealistic',
  'Floral Basket':   'professional studio newborn portrait baby in wicker basket surrounded by fresh roses and peonies, soft diffused studio lighting, photorealistic',
  'Soft Floral':     'professional studio newborn portrait baby surrounded by soft fresh flowers, romantic floral arrangement, white and pink tones, studio quality, photorealistic',
  'Minimalist':      'professional studio newborn portrait baby clean minimalist white studio setting, soft diffused light, simple elegant background, ultra-realistic photorealistic',
  'Classic Basket':  'professional studio newborn portrait baby woven basket natural textures, neutral earth tones, warm studio lighting, photorealistic',
  'Pirate':          'professional studio newborn portrait baby cute tiny pirate hat and costume, ship and ocean background, dramatic studio lighting, photorealistic',
  'Pirate Adventure':'professional studio newborn portrait baby adventurous pirate treasure map background, warm golden tones, studio quality photorealistic',
  'Princess':        'professional studio newborn portrait baby royal princess tiny crown, palace background, pink and gold tones, studio lighting, photorealistic',
  'Princess Portrait':'professional studio newborn portrait baby princess dress fairy tale castle, magical sparkles, royal studio lighting, ultra-realistic photorealistic',
  'Safari':          'professional studio newborn portrait baby surrounded by cute safari animals giraffe elephant lion, lush African savanna background, studio quality photorealistic',
  'Galaxy Space':    'professional studio newborn portrait baby floating in galaxy, stars nebulae planets deep space background, ultra-realistic studio quality photorealistic',
  'Starry Night':    'professional studio newborn portrait baby under magical starry night sky, swirling stars, soft dreamy lighting, photorealistic portrait',
  'Superhero':       'professional studio newborn portrait baby superhero costume tiny cape, city skyline background, dramatic studio lighting, photorealistic',
  'Cozy Teddy':      'professional studio newborn portrait baby snuggled with teddy bears cozy nursery, warm soft lighting, cream and brown tones, photorealistic'
};

function getPrompt(themeName) {
  const clean = themeName.replace(/[^\w\s]/g, '').trim();
  for (const key of Object.keys(THEME_PROMPTS)) {
    if (clean.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(clean.toLowerCase())) {
      return THEME_PROMPTS[key];
    }
  }
  return 'professional studio newborn portrait baby magical themed setting, ultra-realistic 4K studio lighting, soft bokeh background, photorealistic';
}

// ── Upload base64 photo to fal.storage ──────────────────────
async function uploadToFalStorage(base64Data, mimeType = 'image/jpeg') {
  const buffer = Buffer.from(base64Data, 'base64');
  const ext    = mimeType.split('/')[1] || 'jpg';

  // Step 1: initiate upload
  const initRes = await fetch('https://rest.fal.run/fal-ai/storage/upload/initiate', {
    method:  'POST',
    headers: { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ file_name: `baby.${ext}`, content_type: mimeType })
  });
  if (!initRes.ok) throw new Error(`Storage initiate failed: ${initRes.status}`);
  const { upload_url, file_url } = await initRes.json();

  // Step 2: upload file
  await fetch(upload_url, {
    method:  'PUT',
    headers: { 'Content-Type': mimeType },
    body:    buffer
  });

  return file_url;
}

// ── Call fal-ai ip-adapter-face-id ──────────────────────────
async function generateWithFal(faceImageUrl, prompt) {
  const ENDPOINT = 'fal-ai/ip-adapter-face-id';

  const submitRes = await fetch(`https://queue.fal.run/${ENDPOINT}`, {
    method:  'POST',
    headers: { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      face_image_url:       faceImageUrl,
      negative_prompt:      'blurry, low quality, distorted face, ugly, bad anatomy, deformed',
      num_inference_steps:  30,
      guidance_scale:       7.5,
      face_id_strength:     0.8,
      image_size:           'portrait_4_3'
    })
  });
  if (!submitRes.ok) throw new Error(`Fal submit failed: ${submitRes.status}`);
  const { request_id } = await submitRes.json();

  // Poll for result (max 3 minutes)
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://queue.fal.run/${ENDPOINT}/requests/${request_id}`, {
      headers: { 'Authorization': `Key ${FAL_API_KEY}` }
    });
    if (!pollRes.ok) continue;
    const data = await pollRes.json();
    if (data.status === 'COMPLETED') {
      const images = data.images || (data.output && data.output.images) || [];
      if (images.length > 0) return images[0].url || images[0];
      throw new Error('No images in completed response');
    }
    if (data.status === 'FAILED') throw new Error('Generation failed: ' + (data.error || 'unknown'));
  }
  throw new Error('Timeout waiting for generation');
}

// ── Handler ──────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  if (!FAL_API_KEY) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'FAL_API_KEY not configured' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { photoBase64, mimeType = 'image/jpeg', themeName } = body;
  if (!photoBase64 || !themeName) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'photoBase64 and themeName are required' }) };
  }

  try {
    const faceUrl   = await uploadToFalStorage(photoBase64, mimeType);
    const prompt    = getPrompt(themeName);
    const imageUrl  = await generateWithFal(faceUrl, prompt);

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ imageUrl, theme: themeName }) };
  } catch (err) {
    console.error('generate-preview error:', err.message);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
