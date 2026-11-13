import test from 'node:test';
import assert from 'node:assert/strict';
import { configureDataSource, getDataSourceConfig, resetDataSource } from '../src/services/config.js';
import { apiRequest, backoffDelay, toApiError } from '../src/services/api/apiClient.js';
import { clearSessionState } from '../src/services/api/sessionStore.js';
import { REPOSITORY_CONTRACTS, assertRepository } from '../src/services/repositories/contracts.js';
import { getRepository, resetRepositories } from '../src/services/repositories/index.js';
import { getAccount, login, logout, readSession, register, initializeDataSource } from '../src/services/authService.js';
import { getCheckoutDefaults, getOrderHistory, getProfile, updateProfile } from '../src/services/profileService.js';
import { getMenuItems, isRestaurantClosed } from '../src/services/menuService.js';
import { getReceiptUrl, placeOrder } from '../src/services/checkoutService.js';
import { getOrderForViewer } from '../src/services/orderService.js';
import { createBooking, getAvailability, getBookingForViewer } from '../src/services/bookingService.js';
import { getFeedbacks, getReviewContext, publishFeedback } from '../src/services/feedbackService.js';
import { collectLocalData, isAlreadyMigrated } from '../src/services/migration/localDataMigration.js';
import { normalizeCart } from '../src/utils/businessRules.js';
import { AppError } from '../src/utils/errors.js';
import { createMockFetch } from './support/mockFetch.mjs';

const BASE = 'http://mock.local/api/v1';
const ACCOUNT = { name: 'Helena Http', email: 'helena@example.test', password: 'senha123', confirmPassword: 'senha123' };
const CHECKOUT = { name: 'Helena Http', email: 'helena@example.test', phone: '(11) 98888-7777', address: 'Rua das Flores, 100 - Centro', payment: 'pix', document: '' };

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    keys: () => [...values.keys()]
  };
}

// Liga o modo HTTP sobre a API mock; cada teste comeca com navegador e servidor limpos.
function httpMode() {
  globalThis.localStorage = createStorage();
  globalThis.location = { search: '' };
  const mock = createMockFetch();
  globalThis.fetch = mock.fetch;
  resetRepositories();
  clearSessionState();
  configureDataSource({ baseUrl: BASE, retries: 0 });
  return mock;
}

test.after(() => { resetDataSource(); resetRepositories(); delete globalThis.fetch; });

test('modo local e o padrao sem VITE_API_BASE_URL e as duas implementacoes cumprem os contratos', () => {
  resetDataSource();
  assert.equal(getDataSourceConfig().mode, 'local');
  resetRepositories();
  for (const name of Object.keys(REPOSITORY_CONTRACTS)) assert.doesNotThrow(() => getRepository(name), `local ${name}`);
  configureDataSource({ baseUrl: BASE });
  resetRepositories();
  for (const name of Object.keys(REPOSITORY_CONTRACTS)) assert.doesNotThrow(() => getRepository(name), `http ${name}`);
  assert.throws(() => assertRepository('orders', { placeOrder() {} }), /getOrderForViewer/);
  assert.throws(() => configureDataSource({ mode: 'http', baseUrl: '' }), /baseUrl/);
  resetDataSource();
});

test('apiClient: 204, retry com backoff so quando e seguro, timeout e CSRF', async () => {
  configureDataSource({ baseUrl: BASE, retries: 2, timeoutMs: 50 });
  const calls = [];
  const flaky = statuses => async (url, init) => { calls.push(init); const status = statuses.shift() ?? 200; return new Response(status === 204 ? null : '{"ok":true}', { status }); };

  calls.length = 0;
  assert.equal(await apiRequest('/x', { method: 'DELETE', fetchImpl: flaky([204]) }), null);
  calls.length = 0;
  assert.deepEqual(await apiRequest('/x', { fetchImpl: flaky([503, 502, 200]) }), { ok: true });
  assert.equal(calls.length, 3, 'GET repete em 503/502');
  calls.length = 0;
  await assert.rejects(() => apiRequest('/x', { method: 'POST', body: {}, fetchImpl: flaky([503, 200]) }), error => error.status === 503 && error.code === 'server_error');
  assert.equal(calls.length, 1, 'POST sem Idempotency-Key nao repete');
  calls.length = 0;
  await apiRequest('/x', { method: 'POST', body: {}, headers: { 'Idempotency-Key': 'k1' }, fetchImpl: flaky([503, 200]) });
  assert.equal(calls.length, 2, 'POST com Idempotency-Key repete');

  const hang = (url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  await assert.rejects(() => apiRequest('/lento', { fetchImpl: hang, retries: 0 }), error => error instanceof AppError && error.code === 'network');

  globalThis.document = { cookie: 'fl_csrf=abc123; outro=1' };
  calls.length = 0;
  await apiRequest('/x', { method: 'PATCH', body: {}, fetchImpl: flaky([200]) });
  assert.equal(calls[0].headers['X-CSRF-Token'], 'abc123');
  assert.equal(calls[0].credentials, 'include');
  calls.length = 0;
  await apiRequest('/x', { fetchImpl: flaky([200]) });
  assert.equal(calls[0].headers['X-CSRF-Token'], undefined, 'GET nao envia CSRF');
  assert.ok(backoffDelay(2, 100) >= 400 && backoffDelay(2, 100) < 500);
  resetDataSource();
});

test('apiClient: erros HTTP viram AppError com codigo estavel e sem detalhe tecnico de 5xx', () => {
  assert.equal(toApiError(401, null).code, 'unauthenticated');
  assert.equal(toApiError(403, null).code, 'forbidden');
  assert.equal(toApiError(404, null).code, 'not_found');
  assert.equal(toApiError(409, null).code, 'conflict');
  assert.equal(toApiError(429, null).code, 'rate_limited');
  const validation = toApiError(422, { error: { code: 'validation', message: 'Informe um telefone valido.', details: [{ field: 'phone', message: 'invalido' }] } });
  assert.equal(validation.message, 'Informe um telefone valido.');
  assert.deepEqual(validation.details, [{ field: 'phone', message: 'invalido' }]);
  const server = toApiError(500, { error: { code: 'server_error', message: 'TypeError: cannot read x at db.js:42' } });
  assert.doesNotMatch(server.message, /TypeError|db\.js/);
  assert.ok(server instanceof AppError);
});

test('modo HTTP: conta e perfil ficam no servidor e nada pessoal vai para o localStorage', async () => {
  const mock = httpMode();
  await register(ACCOUNT);
  assert.equal(readSession().email, ACCOUNT.email);
  assert.deepEqual(getAccount(), { loggedIn: true, name: 'Helena Http', email: ACCOUNT.email, avatar: '', initials: 'HH' });
  assert.ok(mock.jar.get('fl_session').httpOnly, 'sessao em cookie HttpOnly');
  assert.ok(!globalThis.document.cookie.includes('fl_session'), 'JavaScript nao enxerga o cookie de sessao');

  await updateProfile({ name: 'Helena Souza', phone: '(11) 97777-6666', address: 'Avenida Paulista, 1000', preferences: { paymentMethod: 'card', notifications: true } });
  assert.equal(getProfile().address, 'Avenida Paulista, 1000');
  assert.deepEqual(getCheckoutDefaults(), { name: 'Helena Souza', email: ACCOUNT.email, phone: '(11) 97777-6666', address: 'Avenida Paulista, 1000', payment: 'card' });
  const stored = globalThis.localStorage.keys();
  for (const key of ['fastlanche_session', 'fastlanche_user_profile', 'fastlanche_users']) assert.ok(!stored.includes(key), `${key} nao deve existir no modo HTTP`);

  // Nova "pagina": a sessao e recuperada do servidor pelo cookie.
  clearSessionState();
  resetRepositories();
  assert.equal(readSession(), null);
  await initializeDataSource();
  assert.equal(readSession().name, 'Helena Souza');

  await logout();
  assert.equal(readSession(), null);
  await assert.rejects(() => login({ email: ACCOUNT.email, password: 'errada1' }), /E-mail ou senha incorretos/);
  await login({ email: ACCOUNT.email, password: ACCOUNT.password });
  assert.equal(readSession().email, ACCOUNT.email);
});

test('modo HTTP: o servidor recalcula o pedido e protege o comprovante (dono ou link assinado)', async () => {
  const mock = httpMode();
  const menu = await getMenuItems();
  assert.equal(isRestaurantClosed(), false);
  const burger = menu.find(item => item.id === 1);
  assert.equal(burger.price, 16.9, 'preco convertido de centavos para reais');

  await register(ACCOUNT);
  const tamperedCart = normalizeCart([{ id: 1, name: 'X-Burger Simples', price: 0.01, quantity: 2 }]);
  const order = await placeOrder({ data: CHECKOUT, cart: tamperedCart });
  assert.equal(order.subtotal, 33.8, 'preco do catalogo do servidor, nao do carrinho');
  assert.equal(order.total, 39.8);
  assert.equal((await getOrderForViewer(order.orderNumber)).access, 'ok');
  assert.equal((await getOrderHistory())[0].orderNumber, order.orderNumber);
  const call = mock.calls.find(entry => entry.method === 'POST' && entry.url.endsWith('/orders'));
  assert.match(call.headers['Idempotency-Key'], /^order-/);
  assert.equal(call.body.items[0].price, undefined, 'cliente nao envia preco');

  await assert.rejects(() => placeOrder({ data: { ...CHECKOUT, 'simulate-failure': 'on' }, cart: tamperedCart }), /Pagamento recusado/);
  assert.equal(mock.api.db.orders.length, 1, 'pagamento recusado nao cria pedido');

  await logout();
  assert.equal((await getOrderForViewer(order.orderNumber)).access, 'login_required');

  const guest = await placeOrder({ data: CHECKOUT, cart: tamperedCart });
  const url = getReceiptUrl(guest.orderNumber);
  assert.match(url, /^receipt\.html\?order=FL-.+&token=.+/);
  assert.equal((await getOrderForViewer(guest.orderNumber)).access, 'forbidden', 'sem o link assinado');
  globalThis.location = { search: url.slice(url.indexOf('?')) };
  assert.equal((await getOrderForViewer(guest.orderNumber)).access, 'ok', 'com o link assinado');
});

test('modo HTTP: reservas com disponibilidade do servidor, 409 quando lota e recusa sem bloquear mesa', async () => {
  const mock = httpMode();
  const tomorrow = new Date(Date.now() + 86400000);
  const date = [tomorrow.getFullYear(), String(tomorrow.getMonth() + 1).padStart(2, '0'), String(tomorrow.getDate()).padStart(2, '0')].join('-');
  const contact = { name: 'Helena', phone: '(11) 97777-6666', paymentMethod: 'pix' };
  const booking = await createBooking({ date, time: '20:00', guests: 12, ...contact });
  assert.equal(booking.tableId, 'M16');
  assert.equal(booking.fee, 20);
  assert.equal((await getAvailability(date, 12)).find(slot => slot.time === '20:00').status, 'full');
  await assert.rejects(() => createBooking({ date, time: '20:30', guests: 12, ...contact }), error => error.status === 409 && /Não há mesas livres/.test(error.message));
  await assert.rejects(() => createBooking({ date, time: '12:00', guests: 2, ...contact, simulateFailure: true }), /Pagamento recusado/);
  assert.equal(mock.api.db.bookings.length, 1);
  assert.equal((await getBookingForViewer(booking.bookingNumber)).access, 'forbidden', 'reserva de convidado exige o link');
});

test('modo HTTP: avaliacao so de item entregue, uma vez, com nome vindo da conta', async () => {
  const mock = httpMode();
  await register(ACCOUNT);
  const order = await placeOrder({ data: CHECKOUT, cart: normalizeCart([{ id: 1, name: 'X', price: 1, quantity: 1 }]) });
  assert.deepEqual((await getReviewContext()).eligible, [], 'pedido ainda nao entregue');
  await mock.api.handle({ method: 'POST', url: `/api/v1/__mock/orders/${order.orderNumber}/status`, body: { status: 'delivered' } });
  const { eligible } = await getReviewContext();
  assert.equal(eligible.length, 1);
  const review = await publishFeedback({ rating: 5, comment: 'Chegou quentinho e muito bom!', productKeys: [eligible[0].key] });
  assert.equal(review.name, 'Helena Http');
  assert.equal(review.verified, true);
  assert.equal((await getFeedbacks()).length, 1);
  await assert.rejects(() => publishFeedback({ rating: 4, comment: 'Segunda avaliação do item.', productKeys: [eligible[0].key] }), /já avaliou/);
});

test('migracao: no primeiro login os dados locais da conta vao para o servidor e saem do navegador', async () => {
  const mock = httpMode();
  await mock.api.handle({ method: 'POST', url: '/api/v1/auth/register', body: { name: ACCOUNT.name, email: ACCOUNT.email, password: ACCOUNT.password } });
  const localOrder = (number, email, account = email) => ({ orderNumber: number, userProfileId: account, status: 'Entregue', createdAt: '2026-10-01T12:00:00.000Z', customer: { name: 'Helena', email, phone: '11999999999', address: 'Rua A, 123 - Centro' }, items: [{ id: 1, name: 'X-Burger Simples', price: 16.9, quantity: 1 }] });
  globalThis.localStorage.setItem('fastlanche_orders', JSON.stringify([
    localOrder('FL-LOCAL-1', ACCOUNT.email),
    localOrder('FL-CONVIDADO', ACCOUNT.email, ''),
    localOrder('FL-OUTRA', 'outra@example.test')
  ]));
  globalThis.localStorage.setItem('fastlanche_feedbacks', JSON.stringify([{ id: 1, name: 'Helena', rating: 5, comment: 'Avaliação feita offline.', timestamp: '2026-10-02T12:00:00.000Z', userProfileId: ACCOUNT.email, items: [] }]));
  const payload = collectLocalData(ACCOUNT.email);
  assert.deepEqual(payload.orders.map(order => order.orderNumber), ['FL-LOCAL-1', 'FL-CONVIDADO']);
  assert.equal(payload.orders[0].items[0].unitPriceCents, 1690);

  await login({ email: ACCOUNT.email, password: ACCOUNT.password });
  assert.deepEqual(mock.api.db.orders.map(order => order.orderNumber).sort(), ['FL-CONVIDADO', 'FL-LOCAL-1']);
  assert.equal(mock.api.db.reviews.length, 1);
  assert.deepEqual(JSON.parse(globalThis.localStorage.getItem('fastlanche_orders')).map(order => order.orderNumber), ['FL-OUTRA'], 'pedido de outra conta permanece');
  assert.ok(isAlreadyMigrated(ACCOUNT.email));
  const importCall = mock.calls.find(entry => entry.url.endsWith('/me/import'));
  assert.equal(importCall.headers['Idempotency-Key'], `import-1-${ACCOUNT.email}`);

  await logout();
  await login({ email: ACCOUNT.email, password: ACCOUNT.password });
  assert.equal(mock.calls.filter(entry => entry.url.endsWith('/me/import')).length, 1, 'nao importa de novo');
});
