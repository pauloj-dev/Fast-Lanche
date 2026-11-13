// Acesso de convidado (Fase 44): pedido ou reserva feitos sem login sao consultados por link assinado.
// O servidor devolve `accessToken` na criacao; ele vai so na URL da confirmacao (?token=), que o cliente pode
// guardar como comprovante. Fica em memoria ate o redirecionamento e nunca e gravado no armazenamento local.
const pending = new Map();

export const rememberGuestToken = (reference, token) => { if (reference && token) pending.set(reference, token); };
export const takeGuestToken = reference => pending.get(reference) || '';

export function withGuestToken(url, reference) {
  const token = takeGuestToken(reference);
  return token ? `${url}&token=${encodeURIComponent(token)}` : url;
}

export function readTokenFromUrl() {
  try { return new URLSearchParams(globalThis.location?.search || '').get('token')?.trim() || ''; } catch { return ''; }
}

// Converte a resposta de acesso da API (200/401/403/404) no formato { access } usado pelas telas.
export function accessFromError(error) {
  if (error?.status === 401) return 'login_required';
  if (error?.status === 403) return 'forbidden';
  if (error?.status === 404) return 'not_found';
  throw error;
}
