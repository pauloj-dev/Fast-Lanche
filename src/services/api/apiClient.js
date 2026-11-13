// Cliente HTTP da API (Fase 44). Contrato em docs/api/openapi.yaml.
// - Sessao por cookie HttpOnly (`credentials: 'include'`); Bearer opcional vindo do sessionStore, nunca de componentes.
// - CSRF: em requisicoes que alteram dados envia `X-CSRF-Token` lido do cookie `fl_csrf` (double submit).
// - Timeout por AbortController e nova tentativa com backoff so quando e seguro repetir: metodos idempotentes ou
//   requisicoes com `Idempotency-Key`, em falha de rede, timeout, 429 ou 502/503/504.
// - Respostas de erro viram AppError com codigo estavel; detalhes tecnicos nunca chegam a interface.
import { getDataSourceConfig } from '../config.js';
import { AppError, reportError } from '../../utils/errors.js';
import { getAccessToken } from './sessionStore.js';

const IDEMPOTENT = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const STATUS_MESSAGES = {
  400: ['validation', 'Confira os dados informados.'],
  401: ['unauthenticated', 'Sua sessão expirou. Entre novamente.'],
  403: ['forbidden', 'Você não tem permissão para esta ação.'],
  404: ['not_found', 'Não encontramos o que você procura.'],
  409: ['conflict', 'Esta ação conflita com uma alteração recente. Atualize e tente de novo.'],
  422: ['validation', 'Confira os dados informados.'],
  429: ['rate_limited', 'Muitas tentativas. Aguarde um pouco e tente novamente.']
};
const SERVER_ERROR = ['server_error', 'O serviço está indisponível no momento. Tente novamente em instantes.'];
const NETWORK_ERROR = ['network', 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'];

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
export const backoffDelay = (attempt, base = 300) => base * 2 ** attempt + Math.floor(Math.random() * base);

function readCookie(name) {
  try {
    const match = globalThis.document?.cookie?.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
  } catch { return ''; }
}

async function parseBody(response) {
  if (response.status === 204 || response.status === 205) return null;
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

// Erro padrao da API: { "error": { "code": "...", "message": "...", "details": [{ "field": "...", "message": "..." }] } }
export function toApiError(status, body) {
  const [code, fallback] = STATUS_MESSAGES[status] || (status >= 500 ? SERVER_ERROR : ['http_error', SERVER_ERROR[1]]);
  const apiError = body && typeof body === 'object' ? body.error : null;
  // Mensagens 4xx do contrato sao escritas para o usuario; 5xx nunca expoem detalhe do servidor.
  const message = status < 500 && typeof apiError?.message === 'string' && apiError.message.trim() ? apiError.message.trim().slice(0, 300) : fallback;
  const error = new AppError(message, { code: typeof apiError?.code === 'string' ? apiError.code : code });
  error.status = status;
  error.details = Array.isArray(apiError?.details) ? apiError.details.slice(0, 20) : [];
  return error;
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, timeoutMs, retries, signal, fetchImpl } = {}) {
  const config = getDataSourceConfig();
  if (!config.baseUrl) throw new AppError('A API não está configurada.', { code: 'api_not_configured' });
  const verb = method.toUpperCase();
  const requestHeaders = { Accept: 'application/json', ...headers };
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (!IDEMPOTENT.has(verb)) {
    const csrf = readCookie('fl_csrf');
    if (csrf) requestHeaders['X-CSRF-Token'] = csrf;
  }
  const token = getAccessToken();
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  const canRetry = IDEMPOTENT.has(verb) || Boolean(requestHeaders['Idempotency-Key']);
  const maxRetries = canRetry ? (retries ?? config.retries) : 0;
  const doFetch = fetchImpl || globalThis.fetch;

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, timeoutMs ?? config.timeoutMs);
    try {
      const response = await doFetch(`${config.baseUrl}${path}`, {
        method: verb,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'include',
        signal: controller.signal
      });
      const payload = await parseBody(response);
      if (response.ok) return payload;
      if (attempt < maxRetries && RETRYABLE_STATUS.has(response.status)) {
        const retryAfter = Number(response.headers?.get?.('Retry-After'));
        await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : backoffDelay(attempt));
        continue;
      }
      throw toApiError(response.status, payload);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (signal?.aborted) throw new AppError('Operação cancelada.', { code: 'aborted' });
      if (attempt < maxRetries) { await wait(backoffDelay(attempt)); continue; }
      reportError(`requisicao ${verb} ${path}`, error);
      const [code, message] = NETWORK_ERROR;
      throw new AppError(message, { code, cause: error });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' })
};
