// Fachada de perfil (Fase 44). O perfil exibido e derivado da sessao/perfil do authService (local ou HTTP);
// gravacoes e historico vao para o repositorio. Regras puras (completude, resumo, avatar) valem nos dois modos.
import { getRepository } from './repositories/index.js';
import { getCurrentProfile, readSession } from './authService.js';
import { normalizeProfile } from './repositories/local/profileLocal.js';

export * from './repositories/local/profileLocal.js';

const profile = () => getRepository('profile');

// Perfil da conta logada ou null sem sessao (a pagina usa o null para proteger o acesso).
export function getProfile() {
  const session = readSession();
  if (!session) return null;
  const stored = getCurrentProfile() || {};
  return normalizeProfile({ ...stored, name: stored.name || session.name }, session.email);
}

// Dados para o checkout: mesmo formato que a pagina ja usava a partir do perfil.
export function getCheckoutDefaults() {
  const current = getProfile();
  return current && { name: current.name, email: current.email, phone: current.phone, address: current.address, payment: current.preferences.paymentMethod };
}

export const updateProfile = input => profile().updateProfile(input);
export const updateAvatar = dataUrl => profile().updateAvatar(dataUrl);
export const removeAvatar = () => profile().removeAvatar();
export const getOrderHistory = () => profile().getOrderHistory();
