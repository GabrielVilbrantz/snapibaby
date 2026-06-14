// ============================================================
// NETLIFY FUNCTION: poll-preview
// URL: /.netlify/functions/poll-preview  (GET)
//
// Verifica o status de uma task KIE AI pelo taskId.
// O frontend chama esta função repetidamente (polling) até
// a imagem estar pronta — sem risco de timeout.
//
// Query params: ?taskId=XXXX
// Resposta:
//   { status: 'processing' }           — ainda gerando
//   { status: 'done', imageUrl: '...' } — pronto
//   { status: 'failed', error: '...' } — falhou
// ============================================================

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_BASE    = 'https://api.kie.ai/api/v1';

const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'GET')     return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  if (!KIE_API_KEY) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'KIE_API_KEY not configured' }) };

  const taskId = event.queryStringParameters?.taskId;
  if (!taskId) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'taskId is required' }) };
  }

  try {
    const res = await fetch(`${KIE_BASE}/jobs/getTaskDetail?taskId=${encodeURIComponent(taskId)}`, {
      headers: { 'Authorization': `Bearer ${KIE_API_KEY}` }
    });

    if (!res.ok) {
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ status: 'processing', message: `Poll failed: ${res.status}` })
      };
    }

    const json = await res.json();
    if (json.code !== 200) {
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ status: 'processing', message: `Bad code: ${json.code}` })
      };
    }

    const task   = json.data;
    const status = (task?.status || task?.taskStatus || '').toString().toLowerCase();

    // ── Concluído ────────────────────────────────────────────
    if (status === 'success' || status === 'completed' || status === 'done' || status === '2') {
      const imageUrl =
        task.result?.url ||
        task.result?.imageUrl ||
        task.result?.image_url ||
        (Array.isArray(task.result) && task.result[0]?.url) ||
        task.outputUrl ||
        task.output_url ||
        task.imageUrl;

      if (imageUrl) {
        return {
          statusCode: 200,
          headers: HEADERS,
          body: JSON.stringify({ status: 'done', imageUrl })
        };
      }

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ status: 'failed', error: 'Task completed but no image URL found' })
      };
    }

    // ── Falhou ───────────────────────────────────────────────
    if (status === 'failed' || status === 'error' || status === '3') {
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ status: 'failed', error: task.error || task.errorMsg || 'Unknown error' })
      };
    }

    // ── Ainda processando ────────────────────────────────────
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ status: 'processing', kieStatus: status })
    };

  } catch (err) {
    console.error('poll-preview error:', err.message);
    return {
      statusCode: 200, // 200 para o frontend continuar tentando
      headers: HEADERS,
      body: JSON.stringify({ status: 'processing', message: err.message })
    };
  }
};
