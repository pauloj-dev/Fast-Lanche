// Autenticacao simulada no navegador (Fase 36). NAO e autenticacao segura: serve so para o fluxo estatico.
// Os modelos e o hash sao os mesmos de js/page-init.js, entao contas criadas no legado entram pelo React e vice-versa.
import { FIELD_LIMITS, getInitials, normalizeEmail, sanitizeText, validateLogin, validateSignup } from '../utils/businessRules.js';
import { AppError } from '../utils/errors.js';
import { readArray, readObject, removeKey, writeJSON, writeMany } from './storage/safeStorage.js';

export const USERS_KEY = 'fastlanche_users';
export const SESSION_KEY = 'fastlanche_session';
export const PROFILE_KEY = 'fastlanche_user_profile';
// Evento ja escutado pelo Header React e pelo app-state legado.
export const AUTH_CHANGE_EVENT = 'appstate:update';
// Sessao local expira 7 dias apos o login (sessao sem data valida e descartada).
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
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

function readUsers() {
  return readArray(USERS_KEY).filter(user => user && typeof user.email === 'string' && typeof user.passwordHash === 'string');
}

// Sessao e perfil nunca carregam senha nem hash.
function toSession(user) { return { email: user.email, name: sanitizeText(user.name, FIELD_LIMITS.name), loginAt: new Date().toISOString() }; }
function toProfile(user) {
  return {
    name: user.name, email: user.email, phone: user.phone || '', address: user.address || '', avatar: user.avatar || '',
    preferences: user.preferences || { paymentMethod: '', notifications: true, theme: 'light' },
    createdAt: user.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
  };
}

function startSession(user) {
  const session = toSession(user);
  try { writeMany([[SESSION_KEY, session], [PROFILE_KEY, toProfile(user)]]); }
  catch { throw new AppError('Nao foi possivel salvar a sessao. Verifique o armazenamento do navegador.', { code: 'storage' }); }
  notifyAuthChange();
  return session;
}

export function isSessionExpired(session, now = Date.now()) {
  const loginAt = Date.parse(session?.loginAt);
  return !Number.isFinite(loginAt) || loginAt > now + 60000 || now - loginAt > SESSION_TTL_MS;
}

// Sessao valida e nao expirada, ou null. Sessao expirada e removida para nao reaparecer em outras paginas.
export function readSession(now = Date.now()) {
  const session = readObject(SESSION_KEY);
  if (!session || typeof session.email !== 'string' || !session.email) return null;
  if (isSessionExpired(session, now)) {
    try { removeKey(SESSION_KEY); } catch { /* sem armazenamento: a sessao ja e ignorada */ }
    return null;
  }
  return { email: normalizeEmail(session.email), name: sanitizeText(session.name, FIELD_LIMITS.name), loginAt: session.loginAt };
}

export async function getSession() { return readSession(); }

// Perfil do usuario logado; perfis que sobraram de outra conta (ou sem sessao) sao ignorados.
export function getCurrentProfile() {
  const session = readSession();
  if (!session) return null;
  const profile = readObject(PROFILE_KEY);
  if (!profile || normalizeEmail(profile.email) !== session.email) return { name: session.name, email: session.email };
  return profile;
}

// Dados para o Header: unico lugar que traduz sessao/perfil em estado de conta.
export function getAccount() {
  const session = readSession();
  if (!session) return { loggedIn: false, name: '', email: '', avatar: '', initials: '?' };
  const profile = getCurrentProfile() || {};
  const name = String(profile.name || session.name || '').trim();
  const avatar = typeof profile.avatar === 'string' && /^(data:image\/|https?:|\.{0,2}\/)/.test(profile.avatar) ? profile.avatar : '';
  return { loggedIn: true, name, email: session.email, avatar, initials: getInitials(name, session.email) };
}

// Grava o perfil ja validado da conta logada (Fase 37). Atualiza os tres lugares que guardam dados da conta:
// perfil ativo, cadastro do usuario (o login recria o perfil a partir dele) e nome da sessao.
// O e-mail e a identidade da conta e nunca e trocado por aqui.
export function saveAccountProfile(fields) {
  const session = readSession();
  if (!session) throw new AppError('Sessao expirada. Faca login novamente.', { code: 'session_expired' });
  const current = getCurrentProfile() || {};
  const now = new Date().toISOString();
  const profile = { ...current, ...fields, email: session.email, createdAt: current.createdAt || now, updatedAt: now };
  // Usuarios gravados por outras paginas sao regravados exatamente como estavam; senha/hash nao sao tocados.
  const users = readArray(USERS_KEY).map(user => (
    user && normalizeEmail(user.email) === session.email
      ? { ...user, name: profile.name, phone: profile.phone, address: profile.address, avatar: profile.avatar, preferences: profile.preferences, updatedAt: now }
      : user
  ));
  // Cota excedida no meio da gravacao: writeMany restaura o que ja foi escrito (conta e perfil nunca divergem).
  try { writeMany([[USERS_KEY, users], [PROFILE_KEY, profile], [SESSION_KEY, { ...readObject(SESSION_KEY), name: profile.name }]]); }
  catch (error) {
    throw new AppError('Nao foi possivel salvar o perfil. Libere espaco no navegador ou use uma imagem menor.', { code: error?.code || 'storage', cause: error });
  }
  notifyAuthChange();
  return profile;
}

export async function register(input) {
  const errors = validateSignup(input);
  if (errors.length) throw new AppError(errors[0], { code: 'validation' });
  const email = normalizeEmail(input.email);
  if (readUsers().some(user => normalizeEmail(user.email) === email)) throw new AppError('Este e-mail ja esta cadastrado. Faca login.', { code: 'duplicate' });
  const now = new Date().toISOString();
  const user = {
    name: sanitizeText(input.name, FIELD_LIMITS.name), email, passwordHash: hashPassword(input.password),
    phone: sanitizeText(input.phone, FIELD_LIMITS.phone), address: '', avatar: '',
    preferences: { paymentMethod: '', notifications: true, theme: 'light' }, createdAt: now, updatedAt: now
  };
  // Mantem usuarios gravados por outras paginas exatamente como estavam.
  try { writeJSON(USERS_KEY, [...readArray(USERS_KEY), user]); }
  catch { throw new AppError('Nao foi possivel salvar o cadastro. Tente novamente.', { code: 'storage' }); }
  return startSession(user);
}

export async function login(input) {
  const errors = validateLogin(input);
  if (errors.length) throw new AppError(errors[0], { code: 'validation' });
  const email = normalizeEmail(input.email);
  const user = readUsers().find(candidate => normalizeEmail(candidate.email) === email);
  // Mesma mensagem para e-mail inexistente e senha errada: nao revela quais e-mails tem conta.
  if (!user || user.passwordHash !== hashPassword(input.password)) throw new AppError('E-mail ou senha incorretos.', { code: 'credentials' });
  return startSession({ ...user, email });
}

// Remove somente a sessao ativa; usuarios, perfil salvo, pedidos e carrinho permanecem.
export async function logout() {
  try { removeKey(SESSION_KEY); } catch { throw new AppError('Nao foi possivel encerrar a sessao.', { code: 'storage' }); }
  notifyAuthChange();
}

// Login com retorno para a pagina protegida (somente paginas do proprio shell).
export function getLoginUrl(page = '') {
  return /^[a-z0-9-]+\.html$/i.test(page) && page !== 'login.html' ? `login.html?redirect=${encodeURIComponent(page)}` : 'login.html';
}

// Destino pos-login: so aceita paginas do proprio shell (ex.: "checkout.html"), nunca URLs externas.
export function getSafeRedirect(search = '', fallback = 'index.html') {
  try {
    const target = new URLSearchParams(search).get('redirect') || '';
    return /^[a-z0-9-]+\.html$/i.test(target) && target !== 'login.html' ? target : fallback;
  } catch { return fallback; }
}
