// Sessao no modo HTTP (Fase 44): unico lugar que guarda a identidade do usuario logado no frontend.
// - A autenticacao real fica no cookie HttpOnly emitido pelo servidor: o JavaScript nunca le nem grava esse token.
// - Aqui ficam so os dados de exibicao (e-mail, nome, perfil), em memoria; cada pagina os recarrega no boot
//   via GET /auth/session. Nada e gravado no localStorage.
// - `accessToken` existe apenas para backends que optarem por Bearer token: fica em memoria e so o apiClient o usa.
import { PROFILE_KEY, SESSION_KEY } from '../storage/keys.js';
import { notifyStorageChange } from '../storage/storageEvents.js';

let state = { session: null, profile: null, accessToken: '' };

export const getStoredSession = () => state.session;
export const getStoredProfile = () => state.profile;
export const getAccessToken = () => state.accessToken;

export function setSessionState({ session = null, profile = null, accessToken } = {}) {
  state = { session, profile, accessToken: accessToken === undefined ? state.accessToken : accessToken };
  notifyStorageChange(SESSION_KEY);
  notifyStorageChange(PROFILE_KEY);
}

export function updateStoredProfile(profile) {
  state = { ...state, profile, session: state.session && profile ? { ...state.session, name: profile.name } : state.session };
  notifyStorageChange(PROFILE_KEY);
  notifyStorageChange(SESSION_KEY);
}

export function clearSessionState() {
  setSessionState({ session: null, profile: null, accessToken: '' });
}
