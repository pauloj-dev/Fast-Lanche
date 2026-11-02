import { normalizeCart } from '../../utils/businessRules.js';
import { reportError } from '../../utils/errors.js';
import { readObject, writeJSON } from './safeStorage.js';

const KEY = 'fastlanche_cart';

// Carrinho salvo e revalidado a cada leitura; JSON invalido ou formato estranho viram carrinho vazio.
export function loadCart() {
  return normalizeCart(readObject(KEY)?.items);
}

// Falha ao gravar (cota/armazenamento) nao trava a compra: o carrinho segue valido na memoria da pagina.
export function saveCart(cart) {
  const normalized = normalizeCart(cart.items);
  try { writeJSON(KEY, normalized); } catch (error) { reportError('gravacao do carrinho', error); }
  return normalized;
}
