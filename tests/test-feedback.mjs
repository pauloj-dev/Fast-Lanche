import test from 'node:test';
import assert from 'node:assert/strict';
import { register, logout } from '../src/services/authService.js';
import { ORDER_STORAGE_KEY } from '../src/services/orderService.js';
import {
  FEEDBACK_STORAGE_KEY, getEligibleProducts, getFeedbacks, getReviewContext, normalizeFeedback, publishFeedback
} from '../src/services/feedbackService.js';
import { calculateProductAverages, filterFeedbacks, getProductKey, summarizeRatings, validateFeedback } from '../src/utils/businessRules.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

const ACCOUNT = { name: 'Ana Silva', email: 'ana@example.com', password: 'segredo1', confirmPassword: 'segredo1' };
const COMMENT = 'Chegou quente e muito saboroso!';
const order = (orderNumber, userProfileId, status, items, createdAt = '2026-03-01T12:00:00.000Z') => ({
  orderNumber, userProfileId, status, createdAt,
  customer: { name: 'Ana', email: 'ana@example.com', phone: '11999999999', address: 'Rua A, 123' },
  items
});
const burger = { id: 1, name: 'X-Burger', price: 20, quantity: 1 };
const soda = { id: 7, name: 'Refrigerante', price: 6, quantity: 2 };

async function setup(orders) {
  globalThis.localStorage = createStorage();
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
  await register(ACCOUNT);
}

test('validation, sanitization and limits', () => {
  assert.deepEqual(validateFeedback({ name: 'Ana', rating: 5, comment: COMMENT }), []);
  assert.match(validateFeedback({ name: 'Ana', rating: 0, comment: COMMENT })[0], /1 a 5/);
  assert.match(validateFeedback({ name: 'Ana', rating: 4.5, comment: COMMENT })[0], /1 a 5/);
  assert.match(validateFeedback({ name: 'Ana', rating: 5, comment: 'curto' })[0], /10/);
  assert.match(validateFeedback({ name: 'Ana', rating: 5, comment: 'x'.repeat(1001) })[0], /1000/);
  const normalized = normalizeFeedback({ id: 1, name: '<b>Bia</b>', rating: '9', comment: 'ok', timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(normalized, null, 'nota fora de 1..5 e descartada');
  const legacy = normalizeFeedback({ id: 2, name: '<script>x</script>Bia', rating: '4', comment: '  Muito bom <img src=x>  ', timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(legacy.name, 'scriptx/scriptBia');
  assert.equal(legacy.comment, 'Muito bom img src=x');
  assert.equal(legacy.verified, false);
  assert.deepEqual(legacy.items, []);
});

test('eligible products come only from delivered orders of the account', () => {
  const orders = [
    order('FL-1', 'ana@example.com', 'Entregue', [burger, soda, { ...burger, quantity: 2 }]),
    order('FL-2', 'ana@example.com', 'Preparando pedido', [burger]),
    order('FL-3', 'bia@example.com', 'Entregue', [burger]),
    order('FL-4', '', 'Entregue', [burger])
  ];
  const eligible = getEligibleProducts(orders, [], 'ANA@example.com');
  assert.deepEqual(eligible.map(item => item.key), ['FL-1|p1', 'FL-1|p7']);
  assert.deepEqual(getEligibleProducts(orders, [], ''), []);
  const reviewed = [{ userProfileId: 'ana@example.com', items: [{ orderNumber: 'FL-1', productId: 1, name: 'X-Burger' }] }];
  assert.deepEqual(getEligibleProducts(orders, reviewed, 'ana@example.com').map(item => item.reviewed), [true, false]);
});

test('publishing requires login, a product and an eligible purchase', async () => {
  await setup([order('FL-1', 'ana@example.com', 'Entregue', [burger, soda]), order('FL-3', 'bia@example.com', 'Entregue', [burger])]);
  await assert.rejects(() => publishFeedback({ rating: 5, comment: COMMENT, productKeys: [] }), /ao menos um produto/);
  await assert.rejects(() => publishFeedback({ rating: 5, comment: COMMENT, productKeys: ['FL-3|p1'] }), /pedidos entregues da sua conta/);
  await assert.rejects(() => publishFeedback({ rating: 5, comment: 'curto', productKeys: ['FL-1|p1'] }), /10/);
  await logout();
  await assert.rejects(() => publishFeedback({ rating: 5, comment: COMMENT, productKeys: ['FL-1|p1'] }), /Entre na sua conta/);
  assert.equal(localStorage.getItem(FEEDBACK_STORAGE_KEY), null);
  assert.deepEqual(await getReviewContext(), { account: null, eligible: [] });
});

test('published feedback identifies the products and blocks a second review of the same order item', async () => {
  await setup([order('FL-1', 'ana@example.com', 'Entregue', [burger, soda])]);
  const published = await publishFeedback({ rating: 4, comment: `  ${COMMENT} <b>top</b> `, productKeys: ['FL-1|p1', 'FL-1|p1'] });
  assert.equal(published.name, 'Ana Silva', 'nome vem da conta, nao do formulario');
  assert.equal(published.comment, `${COMMENT} btop/b`);
  assert.deepEqual(published.items, [{ orderNumber: 'FL-1', productId: 1, name: 'X-Burger' }]);
  assert.equal(published.verified, true);
  const raw = JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY))[0];
  assert.deepEqual(raw.productIds, [1]);
  assert.deepEqual(raw.productNames, ['X-Burger']);
  assert.equal(raw.userProfileId, 'ana@example.com');
  await assert.rejects(() => publishFeedback({ rating: 5, comment: COMMENT, productKeys: ['FL-1|p1'] }), /já avaliou X-Burger do pedido FL-1/);
  const context = await getReviewContext();
  assert.deepEqual(context.eligible.map(item => [item.key, item.reviewed]), [['FL-1|p1', true], ['FL-1|p7', false]]);
  assert.equal((await publishFeedback({ rating: 2, comment: COMMENT, productKeys: ['FL-1|p7'] })).rating, 2);
  assert.equal((await getFeedbacks()).length, 2);
});

test('legacy feedbacks stay visible and are preserved when a new one is published', async () => {
  await setup([order('FL-1', 'ana@example.com', 'Entregue', [burger])]);
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify([{ id: 5, name: 'Bia', rating: 5, comment: 'Atendimento excelente!', timestamp: '2026-01-01T10:00:00.000Z', legacyField: true }, { lixo: true }]));
  await publishFeedback({ rating: 3, comment: COMMENT, productKeys: ['FL-1|p1'] });
  const raw = JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY));
  assert.equal(raw.length, 3);
  assert.equal(raw[1].legacyField, true);
  assert.equal((await getFeedbacks()).length, 2);
  localStorage.setItem(FEEDBACK_STORAGE_KEY, '{nao e json');
  assert.deepEqual(await getFeedbacks(), []);
});

test('search, filters and sorting combine without changing the source list', () => {
  const list = [
    { name: 'Ana', rating: 5, comment: 'Batata crocante', timestamp: '2026-03-03T10:00:00Z', items: [{ productId: 1, name: 'X-Burger' }] },
    { name: 'Bia', rating: 2, comment: 'Demorou bastante', timestamp: '2026-03-04T10:00:00Z', items: [{ productId: 7, name: 'Refrigerante' }] },
    { name: 'Caio', rating: 4, comment: 'Ótimo lanche', timestamp: '2026-03-01T10:00:00Z', items: [{ productId: 1, name: 'X-Burger' }, { productId: 7, name: 'Refrigerante' }] },
    { name: 'Dani', rating: 5, comment: 'Atendimento nota dez', timestamp: '2026-03-02T10:00:00Z', items: [] }
  ];
  const snapshot = JSON.stringify(list);
  const names = result => result.map(item => item.name);
  assert.deepEqual(names(filterFeedbacks(list)), ['Bia', 'Ana', 'Dani', 'Caio']);
  assert.deepEqual(names(filterFeedbacks(list, { sort: 'best' })), ['Ana', 'Dani', 'Caio', 'Bia']);
  assert.deepEqual(names(filterFeedbacks(list, { sort: 'worst' })), ['Bia', 'Caio', 'Ana', 'Dani']);
  assert.deepEqual(names(filterFeedbacks(list, { productKey: 'p1' })), ['Ana', 'Caio']);
  assert.deepEqual(names(filterFeedbacks(list, { productKey: 'p1', rating: 4 })), ['Caio']);
  assert.deepEqual(names(filterFeedbacks(list, { query: 'otimo' })), ['Caio'], 'busca ignora acentos');
  assert.deepEqual(names(filterFeedbacks(list, { query: 'refrigerante', rating: 2 })), ['Bia']);
  assert.deepEqual(names(filterFeedbacks(list, { query: 'pizza' })), []);
  assert.equal(JSON.stringify(list), snapshot);
});

test('overall and per-product averages are deterministic', () => {
  const list = [
    { rating: 5, items: [{ productId: 1, name: 'X-Burger' }] },
    { rating: 4, items: [{ productId: 1, name: 'X-Burger' }, { productId: 7, name: 'Refrigerante' }] },
    { rating: 2, items: [{ productId: 7, name: 'Refrigerante' }] },
    { rating: 4, items: [] }
  ];
  const summary = summarizeRatings(list);
  assert.equal(summary.average, 3.8);
  assert.equal(summary.count, 4);
  assert.deepEqual(summary.distribution.map(item => item.count), [1, 2, 0, 1, 0]);
  assert.deepEqual(calculateProductAverages(list), [
    { key: 'p7', name: 'Refrigerante', count: 2, average: 3 },
    { key: 'p1', name: 'X-Burger', count: 2, average: 4.5 }
  ].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR')));
  assert.deepEqual(summarizeRatings([]), { average: 0, count: 0, distribution: [5, 4, 3, 2, 1].map(stars => ({ stars, count: 0 })) });
  assert.equal(getProductKey({ name: 'Item Antigo' }), 'n:item antigo');
});
