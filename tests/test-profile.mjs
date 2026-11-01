import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE_KEY, SESSION_KEY, USERS_KEY, getAccount, login, logout, register } from '../src/services/authService.js';
import { getCheckoutDefaults, getOrderHistory, getProfile, prepareAvatarFile, removeAvatar, updateAvatar, updateProfile } from '../src/services/profileService.js';
import { ORDER_STORAGE_KEY } from '../src/services/orderService.js';
import { AVATAR_MAX_DATA_URL_LENGTH, getInitials, sanitizeText, validateAvatarFile, validateProfile } from '../src/utils/businessRules.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

const signup = { name: 'Ana Silva', email: 'ana@example.com', password: 'segredo1', confirmPassword: 'segredo1' };
const AVATAR = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const order = (orderNumber, userProfileId, createdAt, email = 'outro@example.com') => ({
  orderNumber, userProfileId, createdAt, status: 'Entregue',
  customer: { name: 'Cliente', email, phone: '11999999999', address: 'Rua A, 123' },
  items: [{ id: 1, name: 'X-Burger', price: 20, quantity: 2 }]
});

test('profile rules validate fields, avatar files and initials', () => {
  assert.deepEqual(validateProfile({ name: 'Ana Silva', phone: '', address: '', paymentMethod: '' }), []);
  assert.match(validateProfile({ name: '<b>' })[0], /nome/);
  assert.match(validateProfile({ name: 'Ana Silva', phone: '123' })[0], /telefone/);
  assert.match(validateProfile({ name: 'Ana Silva', address: 'Rua' })[0], /endereco/);
  assert.match(validateProfile({ name: 'Ana Silva', paymentMethod: 'bitcoin' })[0], /pagamento/);
  assert.equal(sanitizeText('  <script>alert(1)</script>\n  Ana  ', 80), 'scriptalert(1)/script Ana');
  assert.equal(validateAvatarFile({ type: 'image/png', size: 1024 }), '');
  assert.match(validateAvatarFile({ type: 'application/pdf', size: 1024 }), /Formato/);
  assert.match(validateAvatarFile({ type: 'image/svg+xml', size: 1024 }), /Formato/);
  assert.match(validateAvatarFile({ type: 'image/png', size: 3 * 1024 * 1024 }), /2 MB/);
  assert.match(validateAvatarFile({ type: 'image/png', size: 0 }), /vazio/);
  assert.equal(getInitials('Ana Maria Silva'), 'AS');
  assert.equal(getInitials('', 'bia@example.com'), 'B');
});

test('profile is unavailable without a session', async () => {
  globalThis.localStorage = createStorage();
  assert.equal(getProfile(), null);
  assert.equal(getCheckoutDefaults(), null);
  assert.deepEqual(await getOrderHistory(), []);
  await assert.rejects(() => updateProfile({ name: 'Ana Silva' }), /Sessao expirada/);
  await assert.rejects(() => updateAvatar(AVATAR), /Sessao expirada/);
});

test('updates persist in profile, account and session and are reflected in header and checkout', async () => {
  globalThis.localStorage = createStorage();
  await register(signup);
  const saved = await updateProfile({ name: ' Ana  Souza <x> ', phone: '(11) 98888-7777', address: 'Rua das Flores, 100', preferences: { paymentMethod: 'pix', notifications: false } });
  assert.equal(saved.name, 'Ana Souza x');
  assert.equal(saved.email, 'ana@example.com');
  assert.deepEqual(saved.preferences, { paymentMethod: 'pix', notifications: false, theme: 'light' });
  assert.equal(getAccount().name, 'Ana Souza x');
  assert.equal(getAccount().initials, 'AX');
  assert.equal(JSON.parse(localStorage.getItem(SESSION_KEY)).name, 'Ana Souza x');
  assert.deepEqual(getCheckoutDefaults(), { name: 'Ana Souza x', email: 'ana@example.com', phone: '(11) 98888-7777', address: 'Rua das Flores, 100', payment: 'pix' });
  const user = JSON.parse(localStorage.getItem(USERS_KEY))[0];
  assert.equal(user.address, 'Rua das Flores, 100');
  assert.ok(user.passwordHash, 'hash da senha preservado');
  assert.ok(!localStorage.getItem(PROFILE_KEY).includes('passwordHash'));
  // O login recria o perfil a partir da conta: as alteracoes sobrevivem a logout/login.
  await logout();
  await login({ email: signup.email, password: signup.password });
  assert.equal(getProfile().address, 'Rua das Flores, 100');
  assert.equal(getProfile().preferences.paymentMethod, 'pix');
});

test('invalid profile input is rejected without changing stored data', async () => {
  globalThis.localStorage = createStorage();
  await register(signup);
  const before = localStorage.getItem(PROFILE_KEY);
  await assert.rejects(() => updateProfile({ name: 'An' }), /nome/);
  await assert.rejects(() => updateProfile({ name: 'Ana Silva', phone: '12' }), /telefone/);
  await assert.rejects(() => updateProfile({ name: 'Ana Silva', preferences: { paymentMethod: 'boleto' } }), /pagamento/);
  assert.equal(localStorage.getItem(PROFILE_KEY), before);
});

test('avatar can be saved and removed; invalid avatars are rejected', async () => {
  globalThis.localStorage = createStorage();
  await register(signup);
  assert.equal((await updateAvatar(AVATAR)).avatar, AVATAR);
  assert.equal(getAccount().avatar, AVATAR);
  assert.equal(JSON.parse(localStorage.getItem(USERS_KEY))[0].avatar, AVATAR);
  for (const invalid of ['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PGI+', `data:image/png;base64,${'A'.repeat(AVATAR_MAX_DATA_URL_LENGTH)}`]) {
    await assert.rejects(() => updateAvatar(invalid), /Imagem invalida/);
  }
  assert.equal(getProfile().avatar, AVATAR);
  assert.equal((await removeAvatar()).avatar, '');
  assert.equal(getAccount().avatar, '');
  await assert.rejects(() => prepareAvatarFile({ type: 'text/plain', size: 10 }), /Formato/);
});

test('corrupted stored profile is normalized instead of breaking the page', async () => {
  globalThis.localStorage = createStorage();
  await register(signup);
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ email: 'ana@example.com', name: '<img src=x onerror=alert(1)>Ana', avatar: 'javascript:alert(1)', preferences: { paymentMethod: 'hack', notifications: 'sim' } }));
  const profile = getProfile();
  assert.equal(profile.name, 'img src=x onerror=alert(1)Ana');
  assert.equal(profile.avatar, '');
  assert.deepEqual(profile.preferences, { paymentMethod: '', notifications: true, theme: 'light' });
  localStorage.setItem(PROFILE_KEY, '{nao e json');
  assert.equal(getProfile().name, 'Ana Silva');
});

test('order history only lists orders of the logged account, newest first', async () => {
  globalThis.localStorage = createStorage();
  await register(signup);
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify([
    order('FL-OLD', 'ana@example.com', '2026-01-01T10:00:00.000Z'),
    order('FL-OTHER', 'bia@example.com', '2026-03-01T10:00:00.000Z'),
    // Pedido sem login com o mesmo e-mail digitado: nao prova que e da conta.
    order('FL-GUEST', '', '2026-04-01T10:00:00.000Z', 'ana@example.com'),
    order('FL-NEW', 'ANA@example.com', '2026-02-01T10:00:00.000Z'),
    { lixo: true }
  ]));
  const history = await getOrderHistory();
  assert.deepEqual(history.map(item => item.orderNumber), ['FL-NEW', 'FL-OLD']);
  assert.equal(history[0].total, 46);
  assert.equal(history[0].status, 'Entregue');
  await logout();
  assert.deepEqual(await getOrderHistory(), []);
});

test('a quota error while saving rolls back so account and profile stay consistent', async () => {
  globalThis.localStorage = createStorage();
  await register(signup);
  const before = { users: localStorage.getItem(USERS_KEY), profile: localStorage.getItem(PROFILE_KEY) };
  const realSetItem = localStorage.setItem;
  localStorage.setItem = (key, value) => { if (key === PROFILE_KEY) throw new Error('QuotaExceededError'); realSetItem(key, value); };
  await assert.rejects(() => updateAvatar(AVATAR), /Nao foi possivel salvar o perfil/);
  localStorage.setItem = realSetItem;
  assert.equal(localStorage.getItem(USERS_KEY), before.users);
  assert.equal(localStorage.getItem(PROFILE_KEY), before.profile);
});

test('profile completion and order summary are derived from the profile and history', async () => {
  const { getProfileCompletion, summarizeOrders } = await import('../src/services/profileService.js');
  assert.equal(getProfileCompletion(null).percent, 0);
  const partial = getProfileCompletion({ phone: '11999999999', address: '', avatar: '', preferences: { paymentMethod: 'pix' } });
  assert.equal(partial.percent, 50);
  assert.deepEqual(partial.missing.map(step => step.key), ['avatar', 'address']);
  assert.equal(getProfileCompletion({ phone: '1', address: 'Rua A, 123', avatar: AVATAR, preferences: { paymentMethod: 'cash' } }).percent, 100);
  assert.deepEqual(summarizeOrders([]), { count: 0, totalSpent: 0, lastOrderAt: '' });
  assert.deepEqual(summarizeOrders([{ total: 31, createdAt: '2026-10-31' }, { total: 50.5, createdAt: '2026-09-10' }]), { count: 2, totalSpent: 81.5, lastOrderAt: '2026-10-31' });
});
