// Persistencia segura (Fase 40): unico ponto de acesso ao localStorage dos services React.
// - localStorage indisponivel (modo privado, bloqueado): usa memoria durante a sessao; o app continua funcionando.
// - JSON invalido: devolve o valor padrao, sem lancar e sem apagar o dado (paginas legadas podem ler a mesma chave).
// - Cota excedida: AppError com codigo 'quota' e mensagem amigavel; o valor anterior permanece intacto.
import { AppError, reportError } from '../../utils/errors.js';
import { notifyStorageChange } from './storageEvents.js';

const memory = new Map();
const memoryStorage = {
  getItem: key => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => { memory.set(key, String(value)); },
  removeItem: key => { memory.delete(key); }
};

function resolveStorage() {
  try {
    const storage = globalThis.localStorage;
    if (storage && typeof storage.getItem === 'function') return storage;
  } catch (error) { reportError('localStorage indisponivel', error); }
  return null;
}

export function getStorage() { return resolveStorage() || memoryStorage; }
export const isPersistentStorage = () => Boolean(resolveStorage());

const isQuotaError = error => error?.name === 'QuotaExceededError' || error?.code === 22 || error?.code === 1014 || /quota/i.test(String(error?.message));

export function readText(key, fallback = '') {
  try { return getStorage().getItem(key) ?? fallback; }
  catch (error) { reportError(`leitura de ${key}`, error); return fallback; }
}

// Cache de parse por chave: varias leituras da mesma chave na mesma renderizacao (ex.: sessao lida pelo Header,
// pelo perfil e pelo checkout) reaproveitam o JSON ja interpretado enquanto o texto salvo for identico.
// Os valores devolvidos sao compartilhados: quem le nao deve muta-los (os services sempre criam copias).
const parseCache = new Map();

function parseCached(key, raw) {
  const cached = parseCache.get(key);
  if (cached && cached.raw === raw) return cached.value;
  const value = JSON.parse(raw);
  parseCache.set(key, { raw, value });
  return value;
}

// Le e valida JSON. `validate` recebe o valor parseado e decide se ele e aceitavel.
export function readJSON(key, fallback, validate = () => true) {
  const raw = readText(key, null);
  if (raw === null || raw === '') return fallback;
  try {
    const parsed = parseCached(key, raw);
    return parsed !== null && validate(parsed) ? parsed : fallback;
  } catch (error) {
    reportError(`JSON invalido em ${key}`, error);
    return fallback;
  }
}

export const readArray = key => readJSON(key, [], Array.isArray);
export const readObject = key => readJSON(key, null, value => typeof value === 'object' && !Array.isArray(value));

export function writeText(key, value) {
  try {
    getStorage().setItem(key, String(value));
    notifyStorageChange(key);
  } catch (error) {
    reportError(`gravacao de ${key}`, error);
    throw new AppError(
      isQuotaError(error) ? 'O armazenamento do navegador está cheio. Libere espaço e tente novamente.' : 'Não foi possível salvar os dados neste navegador.',
      { code: isQuotaError(error) ? 'quota' : 'storage_unavailable', cause: error }
    );
  }
}

export function writeJSON(key, value) {
  let serialized;
  try { serialized = JSON.stringify(value); }
  catch (error) { reportError(`serializacao de ${key}`, error); throw new AppError('Não foi possível salvar os dados.', { code: 'serialize', cause: error }); }
  writeText(key, serialized);
}

export function removeKey(key) {
  try {
    getStorage().removeItem(key);
    notifyStorageChange(key);
  } catch (error) { reportError(`remocao de ${key}`, error); throw new AppError('Não foi possível atualizar os dados neste navegador.', { code: 'storage_unavailable', cause: error }); }
}

// Grava varias chaves de uma vez; se alguma falhar, restaura as anteriores (sem estado parcial).
export function writeMany(entries) {
  const previous = entries.map(([key]) => [key, readText(key, null)]);
  try { entries.forEach(([key, value]) => writeJSON(key, value)); }
  catch (error) {
    previous.forEach(([key, value]) => { try { value === null ? getStorage().removeItem(key) : getStorage().setItem(key, value); } catch { /* melhor esforco */ } });
    throw error;
  }
}

// Apenas para testes: limpa o fallback em memoria.
export function resetMemoryStorage() { memory.clear(); parseCache.clear(); }
