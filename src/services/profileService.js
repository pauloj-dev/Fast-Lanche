// Perfil da conta logada (Fase 37). A pagina depende so deste contrato; a persistencia fica em authService
// (unico dono das chaves de conta) e os pedidos em orderService, o que permite trocar ambos por API depois.
import { getCurrentProfile, readSession, saveAccountProfile } from './authService.js';
import { getOrders } from './orderService.js';
import {
  AVATAR_MAX_DATA_URL_LENGTH, LEGACY_AVATAR_MAX_DATA_URL_LENGTH, PROFILE_LIMITS, PROFILE_PAYMENT_METHODS,
  isValidAvatarDataUrl, sanitizeText, validateAvatarFile, validateProfile
} from '../utils/businessRules.js';

export const DEFAULT_PREFERENCES = Object.freeze({ paymentMethod: '', notifications: true, theme: 'light' });
// Lado maximo do avatar gravado: suficiente para o header e o perfil, e pequeno para o localStorage.
export const AVATAR_SIZE = 256;

// O que vem do localStorage nao e confiavel: todo campo e revalidado ao carregar.
export function normalizeProfile(input, email) {
  const source = input && typeof input === 'object' ? input : {};
  const preferences = source.preferences && typeof source.preferences === 'object' ? source.preferences : {};
  return {
    name: sanitizeText(source.name, PROFILE_LIMITS.name),
    email,
    phone: sanitizeText(source.phone, PROFILE_LIMITS.phone),
    address: sanitizeText(source.address, PROFILE_LIMITS.address),
    avatar: isValidAvatarDataUrl(source.avatar, LEGACY_AVATAR_MAX_DATA_URL_LENGTH) ? source.avatar : '',
    preferences: {
      paymentMethod: PROFILE_PAYMENT_METHODS.includes(preferences.paymentMethod) ? preferences.paymentMethod : DEFAULT_PREFERENCES.paymentMethod,
      notifications: typeof preferences.notifications === 'boolean' ? preferences.notifications : DEFAULT_PREFERENCES.notifications,
      theme: DEFAULT_PREFERENCES.theme
    },
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : '',
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : ''
  };
}

// Perfil da conta logada ou null sem sessao (a pagina usa o null para proteger o acesso).
export function getProfile() {
  const session = readSession();
  if (!session) return null;
  const profile = getCurrentProfile() || {};
  return normalizeProfile({ ...profile, name: profile.name || session.name }, session.email);
}

export async function updateProfile(input = {}) {
  const current = getProfile();
  if (!current) throw new Error('Sessao expirada. Faca login novamente.');
  const preferences = { ...current.preferences, ...(input.preferences || {}) };
  const errors = validateProfile({ ...input, paymentMethod: preferences.paymentMethod });
  if (errors.length) throw new Error(errors[0]);
  const next = normalizeProfile({
    ...current,
    name: input.name,
    phone: input.phone,
    address: input.address,
    preferences: { ...preferences, notifications: Boolean(preferences.notifications) }
  }, current.email);
  return normalizeProfile(saveAccountProfile(next), current.email);
}

export async function updateAvatar(dataUrl) {
  const current = getProfile();
  if (!current) throw new Error('Sessao expirada. Faca login novamente.');
  if (!isValidAvatarDataUrl(dataUrl)) throw new Error('Imagem invalida ou grande demais para o perfil.');
  return normalizeProfile(saveAccountProfile({ ...current, avatar: dataUrl }), current.email);
}

export async function removeAvatar() {
  const current = getProfile();
  if (!current) throw new Error('Sessao expirada. Faca login novamente.');
  return normalizeProfile(saveAccountProfile({ ...current, avatar: '' }), current.email);
}

// Historico: so pedidos gravados com a conta logada (userProfileId), mais recentes primeiro.
// Pedidos feitos sem login, mesmo com o mesmo e-mail digitado, nao entram: o e-mail do formulario nao prova a identidade.
export async function getOrderHistory() {
  const session = readSession();
  if (!session) return [];
  const orders = await getOrders();
  return orders
    .filter(order => order.userProfileId === session.email)
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

// Dados para o checkout: mesmo formato que a pagina ja usava a partir do perfil.
export function getCheckoutDefaults() {
  const profile = getProfile();
  return profile && { name: profile.name, email: profile.email, phone: profile.phone, address: profile.address, payment: profile.preferences.paymentMethod };
}

// Le o arquivo com FileReader, confirma que e uma imagem decodificavel e reduz para AVATAR_SIZE.
// A decodificacao tambem rejeita arquivos com extensao/tipo falsos. Somente navegador.
export function prepareAvatarFile(file) {
  const error = validateAvatarFile(file);
  if (error) return Promise.reject(new Error(error));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('O arquivo nao e uma imagem valida.'));
      image.onload = () => {
        try {
          const scale = Math.min(1, AVATAR_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext('2d');
          // JPEG nao tem transparencia: fundo branco evita PNG transparente virar preto.
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          if (!isValidAvatarDataUrl(dataUrl, AVATAR_MAX_DATA_URL_LENGTH)) reject(new Error('Nao foi possivel processar esta imagem.'));
          else resolve(dataUrl);
        } catch { reject(new Error('Nao foi possivel processar esta imagem.')); }
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// Itens que contam para o perfil completo: o que acelera o checkout.
const COMPLETION_STEPS = [
  ['avatar', 'Foto de perfil', profile => Boolean(profile.avatar)],
  ['phone', 'Telefone', profile => Boolean(profile.phone)],
  ['address', 'Endereço de entrega', profile => Boolean(profile.address)],
  ['paymentMethod', 'Pagamento preferido', profile => Boolean(profile.preferences?.paymentMethod)]
];

export function getProfileCompletion(profile) {
  const steps = COMPLETION_STEPS.map(([key, label, isDone]) => ({ key, label, done: Boolean(profile && isDone(profile)) }));
  const done = steps.filter(step => step.done).length;
  return { percent: Math.round((done / steps.length) * 100), steps, missing: steps.filter(step => !step.done) };
}

export function summarizeOrders(orders = []) {
  const totalSpent = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  return { count: orders.length, totalSpent, lastOrderAt: orders[0]?.createdAt || '' };
}
