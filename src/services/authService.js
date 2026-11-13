// Fachada de autenticacao (Fase 44). As paginas importam daqui; a fonte (localStorage ou API) e decidida pelo
// repositorio. Constantes, regras puras e utilitarios de URL vem do modulo local e valem nos dois modos.
import { getRepository } from './repositories/index.js';
import { buildAccount } from './repositories/local/authLocal.js';

export * from './repositories/local/authLocal.js';
export { initializeDataSource } from './repositories/index.js';

const auth = () => getRepository('auth');

export const readSession = (...args) => auth().readSession(...args);
export const getCurrentProfile = () => auth().getCurrentProfile();
export const getAccount = () => buildAccount(readSession(), getCurrentProfile());
export const getSession = async () => readSession();
export const register = input => auth().register(input);
export const login = input => auth().login(input);
export const logout = () => auth().logout();
