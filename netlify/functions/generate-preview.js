// ============================================================
// NETLIFY FUNCTION: generate-preview
// URL: /.netlify/functions/generate-preview
//
// Recebe a foto do bebê (base64) + nome do tema
// Converte para Data URL e gera a imagem via KIE AI
// (GPT Image 2 - Image to Image)
// Retorna a URL da imagem gerada
// ============================================================

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_BASE    = 'https://api.kie.ai/api/v1';

const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// ── Theme prompts ────────────────────────────────────────────
const THEME_PROMPTS = {
  'Astronaut':        'Transform this newborn baby photo into a professional studio portrait: baby in an astronaut costume floating in outer space surrounded by stars and galaxies, ultra-realistic 4K studio lighting, soft bokeh, baby face clearly visible, photorealistic',
  'Cute Cartoon':     'Transform this newborn baby photo into a professional studio portrait: baby in a colorful cartoon world, pastel illustrated background, studio quality lighting, adorable baby face clearly visible, photorealistic portrait',
  'Dinosaur':         'Transform this newborn baby photo into a professional studio portrait: baby in a cute dinosaur costume in a lush prehistoric jungle, friendly dinosaurs around, studio quality 4K lighting, photorealistic',
  'Easter Bunny':     'Transform this newborn baby photo into a professional studio portrait: baby in an Easter setting with colorful eggs and bunny ears, spring garden background, pastel colors, studio quality lighting, photorealistic',
  'Spring Bunny':     'Transform this newborn baby photo into a professional studio portrait: baby with bunny ears in a magical spring garden with blooming flowers, soft pink and green tones, studio quality, photorealistic',
  'Fairy Magic':      'Transform this newborn baby photo into a professional studio portrait: baby with tiny fairy wings in an enchanted forest with sparkles and flowers, magical golden lighting, photorealistic portrait',
  'Fairy Portrait':   'Transform this newborn baby photo into a professional studio portrait: baby in a fairy princess dress in a fairy tale forest, golden hour lighting with sparkles, ultra-realistic photorealistic',
  'Floral Basket':    'Transform this newborn baby photo into a professional studio portrait: baby in a wicker basket surrounded by fresh roses and peonies, soft diffused studio lighting, photorealistic',
  'Soft Floral':      'Transform this newborn baby photo into a professional studio portrait: baby surrounded by soft fresh flowers, romantic floral arrangement in white and pink tones, studio quality, photorealistic',
  'Minimalist':       'Transform this newborn baby photo into a professional studio portrait: baby in a clean minimalist white studio setting with soft diffused light, simple elegant background, ultra-realistic photorealistic',
  'Classic Basket':   'Transform this newborn baby photo into a professional studio portrait: baby in a woven basket with natural textures, neutral earth tones, warm studio lighting, photorealistic',
  'Pirate':           'Transform this newborn baby photo into a professional studio portrait: baby with a cute tiny pirate hat and costume against a ship and ocean background, dramatic studio lighting, photorealistic',
  'Pirate Adventure': 'Transform this newborn baby photo into a professional studio portrait: baby as an adventurous pirate with a treasure map background, warm golden tones, studio quality photorealistic',
  'Princess':         'Transform this newborn baby photo into a professional studio portrait: baby with a royal princess tiny crown against a palace background, pink and gold tones, studio lighting, photorealistic',
  'Princess Portrait':'Transform this newborn baby photo into a professional studio portrait: baby in a princess dress at a fairy tale castle with magical sparkles, royal studio lighting, ultra-realistic photorealistic',
  'Safari':           'Transform this newborn baby photo into a professional studio portrait: baby surrounded by cute safari animals — giraffe, elephant, lion — in a lush African savanna, studio quality photorealistic',
  'Galaxy Space':     'Transform this newborn baby photo into a professional studio portrait: baby floating in a galaxy with stars, nebulae and planets in the deep space background, ultra-realistic studio quality photorealistic',
  'Starry Night':     'Transform this newborn baby photo into a professional studio portrait: baby under a magical starry night sky with swirling stars, soft dreamy lighting, photorealistic portrait',
  'Superhero':        'Transform this newborn baby photo into a professional studio portrait: baby in a superhero costume with a tiny cape against a city skyline background, dramatic studio lighting, photorealistic',
  'Cozy Teddy':       'Transform this newborn baby photo into a professional studio portrait: baby snuggled with teddy bears in a cozy nursery, warm soft lighting, cream and brown tones, photorealistic'
};

function getPrompt(themeName) {
  const clean = themeName.replace(/[^\w\s]/g, '').trim();
  for (const key of Object.keys(THEME_PROMPTS)) {
    if (clean.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(clean.toLowerCase())) {
      return THEME_PROMPTS[key];
    }
  }
  return 'Transform this newborn baby photo into a professional studio portrait with a magical themed setting, ultra-realistic 4K studio lighting, soft bokeh background, photorealistic';
}

// ── Convert base64 to Data URL (KIE AI accepts Data URLs as input_urls) ──────
function toDataUrl(base64Data, mimeType = 'image/jpeg') {
  return `data:${mimeType};base64,${base64Data}`;
}

// ── Create KIE AI task ───────────────────────────────────────
async function createKieTask(dataUrl, prompt) {
  const res = await fetch(`${KIE_BASE}/jobs/createTask`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-image-2-image-to-image',
      input: {
        prompt,
        input_urls:   [dataUrl],
        aspect_ratio: '3:4',
        resolution:   '1K'
      }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KIE createTask failed: ${res.status} — ${text}`);
  }

  const json = await res.json();
  if (json.code !== 200 || !json.data?.taskId) {
    throw new Error(`KIE createTask error: ${JSON.stringify(json)}`);
  }

  return json.data.taskId;
}

// ── Poll KIE AI task until done ──────────────────────────────
async function pollKieTask(taskId, maxAttempts = 60, intervalMs = 5000) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));

    const res = await fetch(`${KIE_BASE}/jobs/getTaskDetail?taskId=${encodeURIComponent(taskId)}`, {
      headers: { 'Authorization': `Bearer ${KIE_API_KEY}` }
    });

    if (!res.ok) {
      console.warn(`Poll attempt ${i + 1} failed: ${res.status}`);
      continue;
    }

    const json = await res.json();
    if (json.code !== 200) {
      console.warn(`Poll attempt ${i + 1} bad code: ${json.code}`);
      continue;
    }

    const task = json.data;
    const status = (task?.status || task?.taskStatus || '').toString().toLowerCase();

    // Completed states
    if (status === 'success' || status === 'completed' || status === 'done' || status === '2') {
      // Result URL may be at different paths depending on KIE AI version
      const url =
        task.result?.url ||
        task.result?.imageUrl ||
        task.result?.image_url ||
        (Array.isArray(task.result) && task.result[0]?.url) ||
        task.outputUrl ||
        task.output_url ||
        task.imageUrl;

      if (url) return url;
      throw new Error('KIE task completed but no image URL found in response: ' + JSON.stringify(task));
    }

    // Failed states
    if (status === 'failed' || status === 'error' || status === '3') {
      throw new Error('KIE task failed: ' + (task.error || task.errorMsg || JSON.stringify(task)));
    }

    // Still processing — continue polling
    console.log(`Poll ${i + 1}/${maxAttempts}: status=${status}`);
  }

  throw new Error('KIE AI task timed out after ' + (maxAttempts * intervalMs / 1000) + 's');
}

// ── Handler ──────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  if (!KIE_API_KEY) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'KIE_API_KEY not configured' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { photoBase64, mimeType = 'image/jpeg', themeName } = body;
  if (!photoBase64 || !themeName) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'photoBase64 and themeName are required' }) };
  }

  try {
    const dataUrl  = toDataUrl(photoBase64, mimeType);
    const prompt   = getPrompt(themeName);
    const taskId   = await createKieTask(dataUrl, prompt);
    console.log(`KIE task created: ${taskId} for theme "${themeName}"`);
    const imageUrl = await pollKieTask(taskId);

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ imageUrl, theme: themeName, taskId }) };
  } catch (err) {
    console.error('generate-preview error:', err.message);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
