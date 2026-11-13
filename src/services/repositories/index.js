// Seletor de repositorios (Fase 44): devolve a implementacao local ou HTTP de cada dominio conforme
// src/services/config.js. Os adapters sao montados sob demanda (evita ciclos de import entre os modulos locais).
import { isHttpMode } from '../config.js';
import { assertRepository } from './contracts.js';
import * as authLocal from './local/authLocal.js';
import * as bookingLocal from './local/bookingLocal.js';
import * as checkoutLocal from './local/checkoutLocal.js';
import * as feedbackLocal from './local/feedbackLocal.js';
import * as menuLocal from './local/menuLocal.js';
import * as orderLocal from './local/orderLocal.js';
import * as profileLocal from './local/profileLocal.js';
import { authHttp } from './http/authHttp.js';
import { bookingHttp, feedbackHttp, menuHttp, orderHttp, profileHttp } from './http/domainHttp.js';

const localFactories = {
  menu: () => ({ getMenuItems: menuLocal.getMenuItems, isRestaurantClosed: menuLocal.isRestaurantClosed }),
  auth: () => ({
    restoreSession: async () => authLocal.readSession(),
    readSession: authLocal.readSession,
    getCurrentProfile: authLocal.getCurrentProfile,
    register: authLocal.register,
    login: authLocal.login,
    logout: authLocal.logout
  }),
  profile: () => ({
    updateProfile: profileLocal.updateProfile,
    updateAvatar: profileLocal.updateAvatar,
    removeAvatar: profileLocal.removeAvatar,
    getOrderHistory: profileLocal.getOrderHistory
  }),
  orders: () => ({ placeOrder: checkoutLocal.placeOrder, getOrderForViewer: orderLocal.getOrderForViewer, getReceiptUrl: checkoutLocal.getReceiptUrl }),
  bookings: () => ({
    getAvailability: bookingLocal.getAvailability,
    createBooking: bookingLocal.createBooking,
    getBookingForViewer: bookingLocal.getBookingForViewer,
    getBookingConfirmationUrl: bookingLocal.getBookingConfirmationUrl
  }),
  feedbacks: () => ({ getFeedbacks: feedbackLocal.getFeedbacks, getReviewContext: feedbackLocal.getReviewContext, publishFeedback: feedbackLocal.publishFeedback })
};

const httpRepositories = { menu: menuHttp, auth: authHttp, profile: profileHttp, orders: orderHttp, bookings: bookingHttp, feedbacks: feedbackHttp };

const cache = { local: {}, http: {} };

export function getRepository(name) {
  const mode = isHttpMode() ? 'http' : 'local';
  if (!cache[mode][name]) {
    const implementation = mode === 'http' ? httpRepositories[name] : localFactories[name]?.();
    cache[mode][name] = assertRepository(name, implementation);
  }
  return cache[mode][name];
}

// Boot: no modo HTTP cada pagina recupera a sessao (cookie) antes de renderizar; no local nao ha rede.
let initialization = null;
export function initializeDataSource() {
  if (!initialization) initialization = getRepository('auth').restoreSession().catch(() => null);
  return initialization;
}

export function resetRepositories() { cache.local = {}; cache.http = {}; initialization = null; }
