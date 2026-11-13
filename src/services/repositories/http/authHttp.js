// Autenticacao via API (Fase 44). A sessao vive no cookie HttpOnly do servidor; aqui ficam so os dados de exibicao
// (sessionStore, em memoria). Validacao local antes da rede para resposta imediata; o servidor valida de novo.
import { api } from '../../api/apiClient.js';
import { clearSessionState, getStoredProfile, getStoredSession, setSessionState } from '../../api/sessionStore.js';
import { AppError, reportError } from '../../../utils/errors.js';
import { validateLogin, validateSignup } from '../../../utils/businessRules.js';
import { fromApiUser } from './mappers.js';
import { migrateLocalDataToAccount } from '../../migration/localDataMigration.js';

function startSession(payload) {
  const { session, profile } = fromApiUser(payload?.user);
  if (!session) throw new AppError('Resposta inesperada do servidor.', { code: 'bad_response' });
  setSessionState({ session, profile, accessToken: payload?.accessToken || '' });
  return session;
}

// Estrategia de migracao: no primeiro login, os pedidos/reservas/avaliacoes/perfil que estavam so neste navegador
// sao enviados para a conta. Falha na importacao nao impede o login (tenta de novo no proximo).
async function importLocalData(session) {
  try { await migrateLocalDataToAccount(session.email); }
  catch (error) { reportError('importacao dos dados locais', error); }
}

export const authHttp = {
  // 200 { user } para quem esta logado e 200 { user: null } para visitante (401 so para sessao invalida/expirada).
  async restoreSession() {
    try {
      const payload = await api.get('/auth/session', { retries: 1 });
      if (!payload?.user) { clearSessionState(); return null; }
      return startSession(payload);
    } catch (error) {
      if (error?.status === 401) { clearSessionState(); return null; }
      throw error;
    }
  },
  readSession: () => getStoredSession(),
  getCurrentProfile: () => getStoredProfile(),
  async register(input) {
    const errors = validateSignup(input);
    if (errors.length) throw new AppError(errors[0], { code: 'validation' });
    const payload = await api.post('/auth/register', { name: input.name, email: input.email, password: input.password, phone: input.phone || '' });
    const session = startSession(payload);
    await importLocalData(session);
    return session;
  },
  async login(input) {
    const errors = validateLogin(input);
    if (errors.length) throw new AppError(errors[0], { code: 'validation' });
    const payload = await api.post('/auth/login', { email: input.email, password: input.password });
    const session = startSession(payload);
    await importLocalData(session);
    return session;
  },
  async logout() {
    try { await api.post('/auth/logout'); }
    finally { clearSessionState(); }
  }
};
