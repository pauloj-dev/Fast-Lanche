import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFILE_KEY,
  SESSION_KEY,
  USERS_KEY,
  getAccount,
  getCurrentProfile,
  getSafeRedirect,
  hashPassword,
  login,
  logout,
  readSession,
  register
} from '../src/services/authService.js';
import { validateLogin, validateSignup } from '../src/utils/businessRules.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

const signup = { name: 'Ana Silva', email: 'Ana@Example.com', password: 'segredo1', confirmPassword: 'segredo1', phone: '(11) 99999-9999' };

test('signup validation reports incomplete, mismatched and invalid fields', () => {
  assert.deepEqual(validateLogin({}), ['Preencha e-mail e senha.']);
  assert.match(validateSignup({ ...signup, name: 'A' })[0], /nome/);
  assert.match(validateSignup({ ...signup, email: 'ana@' })[0], /e-mail/);
  assert.match(validateSignup({ ...signup, password: '123' })[0], /minimo 6/);
  assert.match(validateSignup({ ...signup, confirmPassword: 'outra123' })[0], /nao coincidem/);
  assert.match(validateSignup({ ...signup, phone: '123' })[0], /telefone/);
  assert.deepEqual(validateSignup(signup), []);
});

test('register persists the user, starts a session and never stores the password in it', async () => {
  globalThis.localStorage = createStorage();
  const session = await register(signup);
  assert.equal(session.email, 'ana@example.com');
  const users = JSON.parse(localStorage.getItem(USERS_KEY));
  assert.equal(users.length, 1);
  assert.equal(users[0].passwordHash, hashPassword('segredo1'));
  assert.ok(!JSON.stringify(users).includes('segredo1'));
  for (const key of [SESSION_KEY, PROFILE_KEY]) {
    const stored = localStorage.getItem(key);
    assert.ok(!stored.includes('segredo1') && !stored.includes('passwordHash'), `${key} nao pode ter senha`);
  }
  assert.deepEqual(getAccount(), { loggedIn: true, name: 'Ana Silva', email: 'ana@example.com', avatar: '', initials: 'AS' });
});

test('duplicate e-mail is rejected regardless of casing', async () => {
  globalThis.localStorage = createStorage();
  await register(signup);
  await assert.rejects(() => register({ ...signup, email: ' ANA@example.com ' }), /ja esta cadastrado/);
  assert.equal(JSON.parse(localStorage.getItem(USERS_KEY)).length, 1);
});

test('login works with legacy-created accounts and rejects wrong credentials', async () => {
  globalThis.localStorage = createStorage();
  // Conta criada por js/page-init.js: mesmo hash e campos extras preservados.
  localStorage.setItem(USERS_KEY, JSON.stringify([{ name: 'Bia Souza', email: 'bia@example.com', passwordHash: hashPassword('senha123'), phone: '', avatar: '', legacyField: true }]));
  await assert.rejects(() => login({ email: 'bia@example.com', password: 'errada1' }), /E-mail ou senha incorretos/);
  await assert.rejects(() => login({ email: 'naoexiste@example.com', password: 'senha123' }), /E-mail ou senha incorretos/);
  assert.equal(readSession(), null);
  const session = await login({ email: 'BIA@example.com', password: 'senha123' });
  assert.equal(session.name, 'Bia Souza');
  assert.equal(getCurrentProfile().email, 'bia@example.com');
  await register({ ...signup, email: 'nova@example.com' });
  assert.equal(JSON.parse(localStorage.getItem(USERS_KEY))[0].legacyField, true);
});

test('logout removes only the active session', async () => {
  globalThis.localStorage = createStorage();
  await register(signup);
  localStorage.setItem('fastlanche_cart', '{"items":[]}');
  await logout();
  assert.equal(localStorage.getItem(SESSION_KEY), null);
  assert.ok(localStorage.getItem(USERS_KEY));
  assert.ok(localStorage.getItem('fastlanche_cart'));
  assert.equal(getAccount().loggedIn, false);
  assert.equal(getCurrentProfile(), null);
});

test('stale profile of another account and corrupted session are ignored', () => {
  globalThis.localStorage = createStorage();
  localStorage.setItem(SESSION_KEY, '{corrompido');
  assert.equal(readSession(), null);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email: 'ana@example.com', name: 'Ana', loginAt: new Date().toISOString() }));
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ email: 'outra@example.com', name: 'Outra', address: 'Rua X, 1' }));
  assert.deepEqual(getCurrentProfile(), { name: 'Ana', email: 'ana@example.com' });
});

test('post-login redirect only accepts local shell pages', () => {
  assert.equal(getSafeRedirect('?redirect=checkout.html'), 'checkout.html');
  assert.equal(getSafeRedirect('?redirect=https://evil.example/x.html'), 'index.html');
  assert.equal(getSafeRedirect('?redirect=//evil.example'), 'index.html');
  assert.equal(getSafeRedirect('?redirect=login.html'), 'index.html');
  assert.equal(getSafeRedirect(''), 'index.html');
});
