import { loadCart, saveCart } from './storage/cartStorage.js';
import { normalizeCart } from '../utils/businessRules.js';

export const getCart = loadCart;
export const persistCart = saveCart;
export function addProduct(cart, product) {
  const items = [...cart.items];
  const existing = items.find(item => item.id === product.id);
  if (existing) existing.quantity = Math.min(existing.quantity + 1, existing.maxQuantity || product.maxQuantity || 99);
  else items.push({ id: product.id, name: product.name, price: product.price, quantity: 1, maxQuantity: product.maxQuantity || 99, category: product.category });
  return normalizeCart(items);
}
