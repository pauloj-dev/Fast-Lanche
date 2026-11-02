// Sincronizacao de dados (Fase 41): um unico contrato para "esta chave mudou".
// - Outra aba: evento nativo `storage` (filtrado pelas chaves de interesse; key null = storage limpo).
// - Mesma aba: `fastlanche:storage`, disparado pelo safeStorage a cada gravacao/remocao.
export const STORAGE_CHANGE_EVENT = 'fastlanche:storage';

const hasWindow = () => typeof window !== 'undefined' && typeof window.addEventListener === 'function';

export function notifyStorageChange(key) {
  if (!hasWindow() || typeof CustomEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
}

// Chama `callback(key)` quando alguma das chaves muda, nesta ou em outra aba. Retorna a funcao de cancelamento.
export function subscribeToStorage(keys, callback) {
  if (!hasWindow()) return () => {};
  const watched = new Set(keys);
  const fromOtherTab = event => { if (event.key === null || watched.has(event.key)) callback(event.key); };
  const fromThisTab = event => { if (watched.has(event.detail?.key)) callback(event.detail.key); };
  window.addEventListener('storage', fromOtherTab);
  window.addEventListener(STORAGE_CHANGE_EVENT, fromThisTab);
  return () => {
    window.removeEventListener('storage', fromOtherTab);
    window.removeEventListener(STORAGE_CHANGE_EVENT, fromThisTab);
  };
}
