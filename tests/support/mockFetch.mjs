// fetch simulado sobre a API mock (Fase 44): permite testar os adapters HTTP sem rede. Mantem um pote de cookies
// como o navegador: cookies HttpOnly so voltam no cabecalho Cookie; os demais aparecem em document.cookie (CSRF).
import { createMockApi } from '../mock-api/handlers.mjs';

export function createMockFetch(options = {}) {
  const api = createMockApi(options);
  const jar = new Map();
  const calls = [];
  const syncDocumentCookie = () => {
    const visible = [...jar.values()].filter(cookie => !cookie.httpOnly).map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    globalThis.document = { ...(globalThis.document || {}), cookie: visible };
  };

  function storeCookies(setCookie = []) {
    for (const header of [].concat(setCookie)) {
      const [pair, ...attributes] = header.split(';').map(part => part.trim());
      const [name, ...rest] = pair.split('=');
      const value = rest.join('=');
      const expired = attributes.some(attribute => /^max-age=0$/i.test(attribute));
      if (expired || !value) jar.delete(name);
      else jar.set(name, { name, value, httpOnly: attributes.some(attribute => /^httponly$/i.test(attribute)) });
    }
    syncDocumentCookie();
  }

  async function fetch(url, init = {}) {
    const headers = { ...(init.headers || {}) };
    const cookie = [...jar.values()].map(item => `${item.name}=${item.value}`).join('; ');
    if (cookie && init.credentials === 'include') headers.Cookie = cookie;
    calls.push({ url, method: init.method || 'GET', headers, body: init.body ? JSON.parse(init.body) : null });
    const result = await api.handle({ method: init.method, url, headers, body: init.body ? JSON.parse(init.body) : null });
    storeCookies(result.headers?.['Set-Cookie']);
    const { 'Set-Cookie': ignored, ...responseHeaders } = result.headers || {};
    return new Response(result.body === null ? null : JSON.stringify(result.body), { status: result.status, headers: responseHeaders });
  }

  syncDocumentCookie();
  return { fetch, api, jar, calls };
}
