import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAST_ORDER_REFERENCE_KEY,
  ORDER_STATUS,
  ORDER_STORAGE_KEY,
  createOrder,
  getLastOrderReference,
  getOrder,
  getOrderStatusClass,
  getOrders,
  normalizeOrder,
  setLastOrderReference
} from '../src/services/orderService.js';

function createStorage({ failSet = false } = {}) {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { if (failSet) throw new Error('storage unavailable'); values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

const baseOrder = {
  orderNumber: 'FL-TEST-35',
  customerName: 'Ana Silva',
  email: 'ana@example.com',
  phone: '11999999999',
  address: 'Rua das Flores, 10',
  paymentMethod: 'pix',
  paymentStatus: 'approved',
  items: [{ id: 1, name: 'Combo', price: 20, quantity: 2, _customization: { observation: 'Sem cebola' } }],
  subtotal: 40,
  deliveryFee: 6
};

test('normalizes the single order contract and preserves customization', () => {
  const order = normalizeOrder(baseOrder);
  assert.equal(order.id, 'FL-TEST-35');
  assert.equal(order.customer.name, 'Ana Silva');
  assert.equal(order.customer.address, 'Rua das Flores, 10');
  assert.equal(order.items[0].customization.observation, 'Sem cebola');
  assert.equal(order.status, ORDER_STATUS.RECEIVED);
  assert.equal(order.total, 46);
});

test('approved order persists once and can be loaded after the flow', async () => {
  globalThis.localStorage = createStorage();
  const first = await createOrder(baseOrder);
  const duplicate = await createOrder(baseOrder);
  assert.equal(first.orderNumber, duplicate.orderNumber);
  assert.equal((await getOrders()).length, 1);
  assert.equal((await getOrder('FL-TEST-35')).customer.email, 'ana@example.com');
  setLastOrderReference(first.orderNumber);
  assert.equal(getLastOrderReference(), 'FL-TEST-35');
  assert.equal(globalThis.localStorage.getItem(LAST_ORDER_REFERENCE_KEY), 'FL-TEST-35');
  assert.ok(globalThis.localStorage.getItem(ORDER_STORAGE_KEY));
});

test('invalid order and persistence failure are reported', async () => {
  globalThis.localStorage = createStorage();
  await assert.rejects(() => createOrder({ items: [] }), /Pedido invalido/);
  globalThis.localStorage = createStorage({ failSet: true });
  await assert.rejects(() => createOrder(baseOrder), /Nao foi possivel persistir/);
});

test('totals are recalculated from items instead of trusting the input', () => {
  const order = normalizeOrder({ ...baseOrder, subtotal: 1, deliveryFee: 0, items: [{ id: 1, name: 'Combo', price: 20, quantity: 2, total: 1 }] });
  assert.equal(order.subtotal, 40);
  assert.equal(order.deliveryFee, 6);
  assert.equal(order.total, 46);
  assert.equal(order.items[0].total, 40);
});

test('status is stored with the legacy labels and old slugs are migrated on read', () => {
  assert.equal(normalizeOrder({ ...baseOrder, status: 'Saiu para entrega' }).status, ORDER_STATUS.OUT_FOR_DELIVERY);
  assert.equal(normalizeOrder({ ...baseOrder, status: 'out-for-delivery' }).status, ORDER_STATUS.OUT_FOR_DELIVERY);
  assert.equal(getOrderStatusClass('Saiu para entrega'), 'out');
});

test('creating an order keeps legacy orders untouched', async () => {
  const legacy = { orderNumber: 'FL-LEGACY', customerName: 'Bia', status: 'Preparando pedido', userProfileId: 'bia@example.com', statusHistory: [{ status: 'Pedido recebido' }], items: [] };
  globalThis.localStorage = createStorage();
  globalThis.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([legacy]));
  await createOrder(baseOrder);
  const stored = JSON.parse(globalThis.localStorage.getItem(ORDER_STORAGE_KEY));
  assert.equal(stored.length, 2);
  assert.equal(stored[0].status, ORDER_STATUS.RECEIVED);
  assert.deepEqual(stored[1], legacy);
});
