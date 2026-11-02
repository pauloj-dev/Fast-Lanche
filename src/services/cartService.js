import { loadCart, saveCart } from './storage/cartStorage.js';
import { normalizeCart } from '../utils/businessRules.js';
import { createCartLineId } from '../utils/ids.js';

export const getCart = loadCart;
export const persistCart = saveCart;
export function addProduct(cart, product) {
  // Produtos adicionados pelo React nao tem personalizacao: somam na linha sem `_customization`.
  const existing = cart.items.find(item => item.id === product.id && !item._customization);
  const items = existing
    ? cart.items.map(item => item === existing ? { ...item, quantity: Math.min(item.quantity + 1, item.maxQuantity || product.maxQuantity || 99) } : item)
    : [...cart.items, { cartItemId: createCartLineId(product.id), id: product.id, name: product.name, price: product.price, unitPrice: product.price, quantity: 1, maxQuantity: product.maxQuantity || 99, category: product.category, _customization: null }];
  return normalizeCart(items);
}
