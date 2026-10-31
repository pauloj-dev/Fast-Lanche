import test from 'node:test';
import assert from 'node:assert/strict';
import { getReceiptUrl, placeOrder } from '../src/services/checkoutService.js';
import { ORDER_STORAGE_KEY, getLastOrderReference, getOrder, getOrders } from '../src/services/orderService.js';
import { normalizeCart } from '../src/utils/businessRules.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

const approve = async () => ({ status: 'approved' });
const decline = async () => ({ status: 'declined' });
const cart = normalizeCart([{ id: 1, name: 'X-Burger', price: 16.9, quantity: 2, maxQuantity: 10 }]);
const validData = { name: 'Ana Silva', email: 'ana@example.com', phone: '(11) 99999-9999', address: 'Rua das Flores, 10', payment: 'pix', document: '' };

test('invalid checkout does not create an order', async () => {
  globalThis.localStorage = createStorage();
  await assert.rejects(() => placeOrder({ data: { ...validData, address: 'curto' }, cart, processPayment: approve }), /endereco/);
  await assert.rejects(() => placeOrder({ data: validData, cart: normalizeCart([]), processPayment: approve }), /pelo menos um item/);
  assert.equal(globalThis.localStorage.getItem(ORDER_STORAGE_KEY), null);
});

test('declined payment does not create an order', async () => {
  globalThis.localStorage = createStorage();
  await assert.rejects(() => placeOrder({ data: validData, cart, processPayment: decline }), /Pagamento recusado/);
  assert.equal((await getOrders()).length, 0);
});

test('approved payment creates exactly one order that the receipt can reload', async () => {
  globalThis.localStorage = createStorage();
  const order = await placeOrder({ data: validData, cart, accountEmail: 'Ana@Example.com', processPayment: approve });
  assert.equal((await getOrders()).length, 1);
  assert.equal(order.total, 39.8);
  assert.equal(order.paymentStatus, 'approved');
  assert.equal(order.userProfileId, 'ana@example.com');
  assert.equal(getLastOrderReference(), order.orderNumber);
  assert.equal(getReceiptUrl(order.orderNumber), `receipt.html?order=${order.orderNumber}`);
  // "Recarregar" o comprovante: le de novo do storage pelo mesmo contrato.
  assert.deepEqual(await getOrder(order.orderNumber), order);
});
