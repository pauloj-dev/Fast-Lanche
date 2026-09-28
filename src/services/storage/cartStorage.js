import { normalizeCart } from '../../utils/businessRules.js';

const KEY = 'fastlanche_cart';
let memoryCart = normalizeCart();

export function loadCart() {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored) memoryCart = normalizeCart(JSON.parse(stored)?.items);
  } catch (error) {
    console.warn('LocalStorage indisponivel para o carrinho.', error);
  }
  return memoryCart;
}

export function saveCart(cart) {
  memoryCart = normalizeCart(cart.items);
  try { window.localStorage.setItem(KEY, JSON.stringify(memoryCart)); }
  catch (error) { console.warn('Nao foi possivel salvar o carrinho.', error); }
  return memoryCart;
}
