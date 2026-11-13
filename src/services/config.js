// Fonte de dados da aplicacao (Fase 44).
// - 'local' (padrao): dados no navegador (localStorage), modo usado ate o backend existir.
// - 'http': API REST definida em docs/api/openapi.yaml, ativada quando VITE_API_BASE_URL esta configurada no build.
// As paginas nao conhecem o modo: os services delegam aos repositorios escolhidos aqui.

const readEnv = () => {
  try { return import.meta.env || {}; } catch { return {}; }
};

const fromEnv = () => {
  const baseUrl = String(readEnv().VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  return { mode: baseUrl ? 'http' : 'local', baseUrl, timeoutMs: 10_000, retries: 2 };
};

let current = fromEnv();

export const getDataSourceConfig = () => current;
export const isHttpMode = () => current.mode === 'http';

// Testes (e, no futuro, uma tela de diagnostico) podem trocar a fonte sem rebuild.
export function configureDataSource(overrides = {}) {
  const next = { ...current, ...overrides };
  if (overrides.baseUrl !== undefined) next.baseUrl = String(overrides.baseUrl).replace(/\/+$/, '');
  if (overrides.mode === undefined) next.mode = next.baseUrl ? 'http' : 'local';
  if (next.mode === 'http' && !next.baseUrl) throw new Error('Modo http exige baseUrl.');
  current = next;
  return current;
}

export function resetDataSource() { current = fromEnv(); return current; }
