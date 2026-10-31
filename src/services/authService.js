// Autenticacao simulada no navegador (Fase 36). NAO e autenticacao segura: serve so para o fluxo estatico.
// Os modelos e o hash sao os mesmos de js/page-init.js, entao contas criadas no legado entram pelo React e vice-versa.
import { normalizeEmail, validateLogin, validateSignup } from '../utils/businessRules.js';

export const USERS_KEY = 'fastlanche_users';
export const SESSION_KEY = 'fastlanche_session';
export const PROFILE_KEY = 'fastlanche_user_profile';
// Evento ja escutado pelo Header React e pelo app-state legado.
export const AUTH_CHANGE_EVENT = 'appstate:update';

function getStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}
function readJson(storage, key, fallback) {
  try { return JSON.parse(storage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function notifyAuthChange() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

// Hash simples identico ao `simpleHash` legado. Nao e criptografia; apenas evita senha em texto puro no storage.
export function hashPassword(text) {
  let hash = 0;
  const str = String(text || '');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

function readUsers(storage) {
  const users = readJson(storage, USERS_KEY, []);
  return Array.isArray(users) ? users.filter(user => user && typeof user.email === 'string' && typeof user.passwordHash === 'string') : [];
}

// Sessao e perfil nunca carregam senha nem hash.
function toSession(user) { return { email: user.email, name: user.name, loginAt: new Date().toISOString() }; }
function toProfile(user) {
  return {
    name: user.name, email: user.email, phone: user.phone || '', address: user.address || '', avatar: user.avatar || '',
    preferences: user.preferences || { paymentMethod: '', notifications: true, theme: 'light' },
    createdAt: user.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
  };
}

function startSession(storage, user) {
  const session = toSession(user);
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session));
    storage.setItem(PROFILE_KEY, JSON.stringify(toProfile(user)));
  } catch { throw new Error('Nao foi possivel salvar a sessao. Verifique o armazenamento do navegador.'); }
  notifyAuthChange();
  return session;
}

export function readSession() {
  const storage = getStorage();
  if (!storage) return null;
  const session = readJson(storage, SESSION_KEY, null);
  if (!session || typeof session.email !== 'string' || !session.email) return null;
  return { email: normalizeEmail(session.email), name: typeof session.name === 'string' ? session.name : '', loginAt: typeof session.loginAt === 'string' ? session.loginAt : '' };
}

export async function getSession() { return readSession(); }

// Perfil do usuario logado; perfis que sobraram de outra conta (ou sem sessao) sao ignorados.
export function getCurrentProfile() {
  const session = readSession();
  const storage = getStorage();
  if (!session || !storage) return null;
  const profile = readJson(storage, PROFILE_KEY, null);
  if (!profile || typeof profile !== 'object' || normalizeEmail(profile.email) !== session.email) return { name: session.name, email: session.email };
  return profile;
}

// Dados para o Header: unico lugar que traduz sessao/perfil em estado de conta.
export function getAccount() {
  const session = readSession();
  if (!session) return { loggedIn: false, name: '', email: '', avatar: '', initials: '?' };
  const profile = getCurrentProfile() || {};
  const name = String(profile.name || session.name || '').trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}` : (parts[0]?.[0] || session.email[0] || '?');
  const avatar = typeof profile.avatar === 'string' && /^(data:image\/|https?:|\.{0,2}\/)/.test(profile.avatar) ? profile.avatar : '';
  return { loggedIn: true, name, email: session.email, avatar, initials: initials.toUpperCase() };
}

export async function register(input) {
  const errors = validateSignup(input);
  if (errors.length) throw new Error(errors[0]);
  const storage = getStorage();
  if (!storage) throw new Error('Armazenamento do navegador indisponivel.');
  const email = normalizeEmail(input.email);
  const users = readUsers(storage);
  if (users.some(user => normalizeEmail(user.email) === email)) throw new Error('Este e-mail ja esta cadastrado. Faca login.');
  const now = new Date().toISOString();
  const user = {
    name: String(input.name).trim().slice(0, 80), email, passwordHash: hashPassword(input.password),
    phone: String(input.phone || '').trim(), address: '', avatar: '',
    preferences: { paymentMethod: '', notifications: true, theme: 'light' }, createdAt: now, updatedAt: now
  };
  // Mantem usuarios gravados por outras paginas exatamente como estavam.
  const rawUsers = readJson(storage, USERS_KEY, []);
  try { storage.setItem(USERS_KEY, JSON.stringify([...(Array.isArray(rawUsers) ? rawUsers : []), user])); }
  catch { throw new Error('Nao foi possivel salvar o cadastro. Tente novamente.'); }
  return startSession(storage, user);
}

export async function login(input) {
  const errors = validateLogin(input);
  if (errors.length) throw new Error(errors[0]);
  const storage = getStorage();
  if (!storage) throw new Error('Armazenamento do navegador indisponivel.');
  const email = normalizeEmail(input.email);
  const user = readUsers(storage).find(candidate => normalizeEmail(candidate.email) === email);
  // Mesma mensagem para e-mail inexistente e senha errada: nao revela quais e-mails tem conta.
  if (!user || user.passwordHash !== hashPassword(input.password)) throw new Error('E-mail ou senha incorretos.');
  return startSession(storage, { ...user, email });
}

// Remove somente a sessao ativa; usuarios, perfil salvo, pedidos e carrinho permanecem.
export async function logout() {
  const storage = getStorage();
  try { storage?.removeItem(SESSION_KEY); } catch { throw new Error('Nao foi possivel encerrar a sessao.'); }
  notifyAuthChange();
}

// Destino pos-login: so aceita paginas do proprio shell (ex.: "checkout.html"), nunca URLs externas.
export function getSafeRedirect(search = '', fallback = 'index.html') {
  try {
    const target = new URLSearchParams(search).get('redirect') || '';
    return /^[a-z0-9-]+\.html$/i.test(target) && target !== 'login.html' ? target : fallback;
  } catch { return fallback; }
}
