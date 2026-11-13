// Servidor HTTP da API mock (Fase 44), usado pelo projeto "api-mode" do Playwright.
// Uso: node tests/mock-api/server.mjs  (MOCK_API_PORT, padrao 4190; MOCK_API_ORIGINS, padrao http://localhost:4181)
import { createServer } from 'node:http';
import { createMockApi } from './handlers.mjs';

const PORT = Number(process.env.MOCK_API_PORT || 4190);
const ORIGINS = new Set(String(process.env.MOCK_API_ORIGINS || 'http://localhost:4181').split(',').map(origin => origin.trim()).filter(Boolean));
const api = createMockApi();

function corsHeaders(origin) {
  if (!ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-CSRF-Token, Idempotency-Key, Authorization',
    Vary: 'Origin'
  };
}

const readBody = request => new Promise((resolve, reject) => {
  const chunks = [];
  request.on('data', chunk => chunks.push(chunk));
  request.on('end', () => {
    const text = Buffer.concat(chunks).toString('utf-8');
    if (!text) return resolve(null);
    try { resolve(JSON.parse(text)); } catch { reject(new Error('JSON invalido')); }
  });
  request.on('error', reject);
});

createServer(async (request, response) => {
  const cors = corsHeaders(request.headers.origin);
  if (request.method === 'OPTIONS') { response.writeHead(204, cors); response.end(); return; }
  if (request.url === '/health') { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end('{"status":"ok"}'); return; }
  let result;
  try {
    result = await api.handle({ method: request.method, url: request.url, headers: request.headers, body: await readBody(request) });
  } catch (cause) {
    result = { status: 400, headers: { 'Content-Type': 'application/json' }, body: { error: { code: 'bad_request', message: cause.message, details: [] } } };
  }
  response.writeHead(result.status, { ...cors, ...result.headers });
  response.end(result.body === null ? undefined : JSON.stringify(result.body));
}).listen(PORT, () => console.log(`API mock em http://localhost:${PORT}${api.basePath}`));
