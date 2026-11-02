import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  FIELD_LIMITS, checkTextLength, isValidAddress, isValidCNPJ, isValidCPF, isValidDateString, isValidDocument, isValidEmail,
  isValidPhone, isValidTimeString, sanitizeDeep, sanitizeText
} from '../src/utils/validation.js';
import {
  normalizeCart, validateBooking, validateBookingContact, validateCheckout, validateFeedback, validateLogin, validateProfile, validateSignup
} from '../src/utils/businessRules.js';
import { AppError, toUserMessage } from '../src/utils/errors.js';
import { readArray, readJSON, resetMemoryStorage, writeJSON } from '../src/services/storage/safeStorage.js';
import { PROFILE_KEY, SESSION_KEY, SESSION_TTL_MS, USERS_KEY, getLoginUrl, readSession, register } from '../src/services/authService.js';
import { ORDER_STORAGE_KEY, canViewOrder, getOrderForViewer, getOrders, normalizeOrder } from '../src/services/orderService.js';
import { placeOrder } from '../src/services/checkoutService.js';
import { canViewBooking } from '../src/services/bookingService.js';
import { loadCart } from '../src/services/storage/cartStorage.js';
import { getProfile, updateProfile } from '../src/services/profileService.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

const XSS = '<script>alert(1)</script><img src=x onerror=alert(1)>';
const ACCOUNT = { name: 'Ana Silva', email: 'ana@example.com', password: 'segredo1', confirmPassword: 'segredo1' };
const CHECKOUT = { name: 'Ana Silva', email: 'ana@example.com', phone: '(11) 98888-7777', address: 'Rua das Flores, 100', payment: 'pix', document: '' };
const approve = async ({ method }) => ({ status: 'approved', method });

test('shared validators: phone, CPF/CNPJ, address, date, time and e-mail', () => {
  assert.equal(isValidPhone('(11) 98888-7777'), true);
  assert.equal(isValidPhone('(11) 3333-4444'), true);
  assert.equal(isValidPhone('(11) 88888-7777'), false, 'celular com 11 digitos comeca com 9');
  assert.equal(isValidPhone('(01) 3333-4444'), false, 'DDD invalido');
  assert.equal(isValidPhone('123'), false);
  assert.equal(isValidPhone(`11988887777${' '.repeat(30)}x`), false);
  assert.equal(isValidCPF('529.982.247-25'), true);
  assert.equal(isValidCPF('529.982.247-24'), false);
  assert.equal(isValidCPF('111.111.111-11'), false);
  assert.equal(isValidCNPJ('11.222.333/0001-81'), true);
  assert.equal(isValidCNPJ('11.222.333/0001-80'), false);
  assert.equal(isValidDocument('12345678901'), false);
  assert.equal(isValidAddress('Rua das Flores, 100'), true);
  assert.equal(isValidAddress('12345678'), false);
  assert.equal(isValidAddress('<<<>>>>>>>'), false);
  assert.equal(isValidAddress('R'.repeat(FIELD_LIMITS.address + 1)), false);
  assert.equal(isValidDateString('2026-02-28'), true);
  assert.equal(isValidDateString('2026-02-30'), false);
  assert.equal(isValidDateString('28/02/2026'), false);
  assert.equal(isValidTimeString('23:59'), true);
  assert.equal(isValidTimeString('24:00'), false);
  assert.equal(isValidEmail('ana@example.com'), true);
  assert.equal(isValidEmail('ana@example'), false);
  assert.equal(isValidEmail('<ana>@example.com'), false);
  assert.equal(isValidEmail(`${'a'.repeat(120)}@example.com`), false);
  assert.equal(checkTextLength('  ab  ', { min: 3, max: 10 }), 'too_short');
  assert.equal(checkTextLength('x'.repeat(11), { min: 3, max: 10 }), 'too_long');
});

test('sanitization removes markup, control characters and dangerous keys', () => {
  assert.equal(sanitizeText(`  Ana ${XSS}\n\u0000 Silva  `, 200), 'Ana scriptalert(1)/scriptimg src=x onerror=alert(1) Silva');
  assert.equal(sanitizeText('x'.repeat(500), 80).length, 80);
  const deep = sanitizeDeep(JSON.parse('{"observation":"<b>sem</b> cebola","__proto__":{"polluted":true},"extras":[{"name":"<i>bacon</i>","price":4}],"fn":"ok"}'));
  assert.deepEqual(deep, { observation: 'bsem/b cebola', extras: [{ name: 'ibacon/i', price: 4 }], fn: 'ok' });
  assert.equal({}.polluted, undefined);
});

test('every React form rejects malformed input and oversized fields', () => {
  // Login / cadastro
  assert.match(validateLogin({ email: 'ana@example.com', password: 'x'.repeat(200) })[0], /incorretos/);
  assert.match(validateSignup({ ...ACCOUNT, name: 'A'.repeat(81) })[0], /80/);
  assert.match(validateSignup({ ...ACCOUNT, name: '<>' })[0], /3 caracteres/);
  assert.match(validateSignup({ ...ACCOUNT, password: 'x'.repeat(129), confirmPassword: 'x'.repeat(129) })[0], /128/);
  assert.match(validateSignup({ ...ACCOUNT, phone: '(00) 00000-0000' })[0], /telefone/);
  // Checkout
  assert.deepEqual(validateCheckout(CHECKOUT, 1), []);
  assert.match(validateCheckout({ ...CHECKOUT, document: '123.456.789-00' }, 1)[0], /CPF\/CNPJ/);
  assert.deepEqual(validateCheckout({ ...CHECKOUT, document: '529.982.247-25' }, 1), []);
  assert.match(validateCheckout({ ...CHECKOUT, address: '99999999' }, 1)[0], /endereco/);
  assert.match(validateCheckout({ ...CHECKOUT, name: 'N'.repeat(81) }, 1)[0], /80/);
  assert.match(validateCheckout({ ...CHECKOUT, payment: 'bitcoin' }, 1)[0], /pagamento/);
  // Perfil
  assert.match(validateProfile({ name: 'Ana Silva', address: 'A'.repeat(201) })[0], /endereco/);
  assert.match(validateProfile({ name: 'N'.repeat(81) })[0], /80/);
  // Reserva
  assert.match(validateBooking('2026-02-30', '20:00', 2, new Date(2026, 0, 1))[0], /data válida/);
  assert.match(validateBookingContact({ name: 'Ana', phone: '11 1234', paymentMethod: 'pix' })[0], /telefone/);
  assert.match(validateBookingContact({ name: 'N'.repeat(81), phone: '11988887777', paymentMethod: 'pix' })[0], /80/);
  // Avaliacao
  assert.match(validateFeedback({ name: 'Ana', rating: '5<script>', comment: 'Comentario valido aqui' })[0], /nota/);
});

test('HTML/script input is stored only in sanitized form', async () => {
  globalThis.localStorage = createStorage();
  await register({ ...ACCOUNT, name: `Ana ${XSS}` });
  assert.ok(!localStorage.getItem(USERS_KEY).includes('<'), 'cadastro sem tags');
  assert.ok(!localStorage.getItem(SESSION_KEY).includes('<'), 'sessao sem tags');
  const cart = normalizeCart([{ id: 1, name: `X-Burger ${XSS}`, price: 20, quantity: 1, _customization: { observation: XSS } }]);
  const order = await placeOrder({ data: { ...CHECKOUT, name: `Ana ${XSS}`, address: `Rua das Flores, 100 ${XSS}` }, cart, accountEmail: ACCOUNT.email, processPayment: approve });
  const stored = localStorage.getItem(ORDER_STORAGE_KEY);
  assert.ok(!stored.includes('<') && !stored.includes('>'), 'pedido gravado sem < >');
  assert.equal(order.customer.name.includes('script'), true, 'texto preservado sem tags');
  await updateProfile({ name: `Ana ${XSS}`, phone: '', address: '', preferences: {} });
  assert.ok(!localStorage.getItem(PROFILE_KEY).includes('<'));
});

test('corrupted JSON never crashes and falls back to valid defaults', async () => {
  globalThis.localStorage = createStorage();
  for (const key of ['fastlanche_cart', SESSION_KEY, PROFILE_KEY, USERS_KEY, ORDER_STORAGE_KEY, 'fastlanche_bookings', 'fastlanche_feedbacks']) localStorage.setItem(key, '{corrompido');
  assert.deepEqual(loadCart(), { items: [], subtotal: 0, deliveryFee: 0, total: 0 });
  assert.equal(readSession(), null);
  assert.equal(getProfile(), null);
  assert.deepEqual(await getOrders(), []);
  assert.deepEqual(readArray('fastlanche_bookings'), []);
  assert.equal(readJSON('fastlanche_feedbacks', 'padrao'), 'padrao');
  // Formato inesperado (objeto no lugar de lista, campos com tipos errados) tambem vira padrao/registro limpo.
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify({ not: 'a list' }));
  assert.deepEqual(await getOrders(), []);
  localStorage.setItem('fastlanche_cart', JSON.stringify({ items: [{ id: '1', name: { evil: true }, price: 'abc' }, { id: 2, name: 'Ok', price: 1e9, quantity: 1e6, extra: '<b>' }] }));
  const cart = loadCart();
  assert.equal(cart.items.length, 1);
  assert.deepEqual(Object.keys(cart.items[0]).sort(), ['cartItemId', 'id', 'maxQuantity', 'name', 'price', 'quantity']);
  assert.equal(cart.items[0].price, 10000);
  assert.equal(cart.items[0].quantity, 99);
});

test('unavailable localStorage falls back to memory and quota errors keep the previous value', async () => {
  resetMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError: acesso negado'); } });
  await register(ACCOUNT);
  assert.equal(readSession().email, 'ana@example.com', 'sessao funciona em memoria');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: createStorage() });

  localStorage.setItem('chave', '"antigo"');
  const realSetItem = localStorage.setItem;
  localStorage.setItem = () => { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; };
  assert.throws(() => writeJSON('chave', 'novo'), error => error instanceof AppError && error.code === 'quota' && /cheio/.test(error.message));
  localStorage.setItem = realSetItem;
  assert.equal(readJSON('chave', ''), 'antigo');
});

test('error policy: only expected errors reach the UI', () => {
  assert.equal(toUserMessage(new AppError('Mensagem para o usuario.')), 'Mensagem para o usuario.');
  assert.equal(toUserMessage(new TypeError("Cannot read properties of undefined (reading 'x')"), 'Tente novamente.'), 'Tente novamente.');
  assert.equal(toUserMessage(undefined, 'Tente novamente.'), 'Tente novamente.');
});

test('sessions expire and protected receipts/bookings never expose data to other viewers', async () => {
  globalThis.localStorage = createStorage();
  const now = Date.now();
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email: 'ana@example.com', name: 'Ana', loginAt: new Date(now - SESSION_TTL_MS - 1000).toISOString() }));
  assert.equal(readSession(), null);
  assert.equal(localStorage.getItem(SESSION_KEY), null, 'sessao expirada e removida');
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email: 'ana@example.com', name: 'Ana', loginAt: new Date(now + 86400000).toISOString() }));
  assert.equal(readSession(), null, 'data de login no futuro e invalida');

  const accountOrder = normalizeOrder({ orderNumber: 'FL-1', userProfileId: 'ana@example.com', customer: { name: 'Ana', phone: '11988887777', address: 'Rua A, 123' }, items: [{ id: 1, name: 'X', price: 1, quantity: 1 }] });
  const guestOrder = { ...accountOrder, orderNumber: 'FL-2', userProfileId: '' };
  assert.equal(canViewOrder(accountOrder, { email: 'ana@example.com' }, ''), 'ok');
  assert.equal(canViewOrder(accountOrder, { email: 'bia@example.com' }, 'FL-1'), 'forbidden');
  assert.equal(canViewOrder(accountOrder, null, 'FL-1'), 'login_required');
  assert.equal(canViewOrder(guestOrder, null, 'FL-2'), 'ok');
  assert.equal(canViewOrder(guestOrder, { email: 'ana@example.com' }, 'FL-9'), 'forbidden');
  assert.equal(canViewOrder(null, null, ''), 'not_found');
  assert.equal(canViewBooking({ bookingNumber: 'RS-1', userProfileId: 'ana@example.com' }, { email: 'bia@example.com' }, 'RS-1'), 'forbidden');
  assert.equal(canViewBooking({ bookingNumber: 'RS-2', userProfileId: '' }, null, 'RS-2'), 'ok');

  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([accountOrder]));
  assert.deepEqual(await getOrderForViewer('FL-1'), { access: 'login_required', order: null }, 'nenhum dado sem login');
  assert.equal(getLoginUrl('perfil.html'), 'login.html?redirect=perfil.html');
  assert.equal(getLoginUrl('https://evil.example/x.html'), 'login.html');
});

test('React sources never inject HTML or touch localStorage outside the storage adapter', () => {
  const files = [];
  const walk = dir => readdirSync(dir).forEach(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(jsx?|mjs)$/.test(name)) files.push(path);
  });
  walk('src');
  for (const file of files) {
    const code = readFileSync(file, 'utf-8').replace(/\/\/.*$/gm, '');
    assert.ok(!/dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(/.test(code), `${file} injeta HTML ou executa codigo`);
    if (!file.endsWith('safeStorage.js')) assert.ok(!/\blocalStorage\.(getItem|setItem|removeItem)/.test(code), `${file} acessa localStorage diretamente`);
  }
});
