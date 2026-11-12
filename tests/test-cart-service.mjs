import test from 'node:test';
import assert from 'node:assert/strict';
import { addProduct } from '../src/services/cartService.js';
import { CART_STORAGE_KEY, loadCart, saveCart } from '../src/services/storage/cartStorage.js';
import { simulatePayment } from '../src/services/checkoutService.js';
import { normalizeCart } from '../src/utils/businessRules.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

const burger = { id: 1, name: 'X-Burger Simples', price: 16.9, maxQuantity: 2, category: 'Hambúrgueres' };

test('addProduct cria linha nova e soma na mesma linha sem personalizacao, respeitando o maximo', () => {
  let cart = addProduct(normalizeCart([]), burger);
  assert.equal(cart.items.length, 1);
  assert.match(cart.items[0].cartItemId, /^1_[a-z0-9]+$/);
  cart = addProduct(cart, burger);
  cart = addProduct(cart, burger);
  assert.equal(cart.items.length, 1);
  assert.equal(cart.items[0].quantity, 2, 'nao passa do maxQuantity');
  assert.equal(cart.subtotal, 33.8);
});

test('produto com personalizacao nao e somado na linha simples', () => {
  const customized = normalizeCart([{ id: 1, cartItemId: '1_custom', name: 'X-Burger', price: 20, quantity: 1, _customization: { observation: 'sem cebola' } }]);
  const cart = addProduct(customized, burger);
  assert.equal(cart.items.length, 2);
});

test('carrinho salvo e recarregado pelo mesmo contrato; falha de gravacao nao trava a compra', () => {
  globalThis.localStorage = createStorage();
  const saved = saveCart(addProduct(normalizeCart([]), burger));
  assert.deepEqual(loadCart(), saved);
  localStorage.setItem = () => { throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); };
  assert.doesNotThrow(() => saveCart(addProduct(saved, burger)));
  assert.equal(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)).items[0].quantity, 1, 'valor anterior preservado');
});

test('pagamento simulado aprova por padrao e recusa quando a demonstracao pede', async () => {
  assert.deepEqual(await simulatePayment({ method: 'pix' }, 0), { status: 'approved', method: 'pix' });
  assert.deepEqual(await simulatePayment({ method: 'card', simulateFailure: true }, 0), { status: 'declined', method: 'card' });
});
