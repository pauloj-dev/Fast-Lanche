// Adapters HTTP de cardapio, perfil, pedidos, reservas e avaliacoes (Fase 44). Contrato: docs/api/openapi.yaml.
// Depois de cada alteracao notificam a mesma chave que o modo local, para as telas recarregarem igual.
import { api } from '../../api/apiClient.js';
import { getStoredProfile, getStoredSession, updateStoredProfile } from '../../api/sessionStore.js';
import { notifyStorageChange } from '../../storage/storageEvents.js';
import { BOOKING_STORAGE_KEY, FEEDBACK_STORAGE_KEY, ORDER_STORAGE_KEY } from '../../storage/keys.js';
import { AppError } from '../../../utils/errors.js';
import { randomCode } from '../../../utils/ids.js';
import { validateBooking, validateBookingContact, validateCheckout, validateFeedback, validateProfile, isValidAvatarDataUrl } from '../../../utils/businessRules.js';
import { getReceiptUrl as localReceiptUrl } from '../local/checkoutLocal.js';
import { getBookingConfirmationUrl as localConfirmationUrl } from '../local/bookingLocal.js';
import { accessFromError, readTokenFromUrl, rememberGuestToken, withGuestToken } from './guestAccess.js';
import { fromApiBooking, fromApiOrder, fromApiProduct, fromApiReview, fromApiUser, toApiOrderItems } from './mappers.js';

const idempotencyKey = prefix => `${prefix}-${Date.now().toString(36)}-${randomCode(10)}`;
const requireSession = () => {
  const session = getStoredSession();
  if (!session) throw new AppError('Sessao expirada. Faca login novamente.', { code: 'session_expired' });
  return session;
};
const query = params => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== '')).toString();

// ------------------------------------------------------------------ cardapio
let restaurantClosed = false;
export const menuHttp = {
  async getMenuItems() {
    const payload = await api.get('/menu');
    restaurantClosed = payload?.restaurant?.open === false;
    return (payload?.items || []).map(fromApiProduct).filter(Boolean);
  },
  isRestaurantClosed: () => restaurantClosed
};

// ------------------------------------------------------------------ perfil
function applyUser(payload) {
  const { profile } = fromApiUser(payload?.user);
  if (profile) updateStoredProfile(profile);
  return profile;
}

export const profileHttp = {
  async updateProfile(input = {}) {
    requireSession();
    const preferences = { ...(getStoredProfile()?.preferences || {}), ...(input.preferences || {}) };
    const errors = validateProfile({ ...input, paymentMethod: preferences.paymentMethod ?? '' });
    if (errors.length) throw new AppError(errors[0], { code: 'validation' });
    return applyUser(await api.patch('/me', { name: input.name, phone: input.phone || '', address: input.address || '', preferences: { paymentMethod: preferences.paymentMethod || '', notifications: Boolean(preferences.notifications) } }));
  },
  async updateAvatar(dataUrl) {
    requireSession();
    if (!isValidAvatarDataUrl(dataUrl)) throw new AppError('Imagem invalida ou grande demais para o perfil.', { code: 'validation' });
    return applyUser(await api.put('/me/avatar', { dataUrl }));
  },
  async removeAvatar() {
    requireSession();
    return applyUser(await api.delete('/me/avatar'));
  },
  async getOrderHistory() {
    if (!getStoredSession()) return [];
    const payload = await api.get('/orders?scope=mine');
    return (payload?.items || []).map(fromApiOrder).filter(Boolean);
  }
};

// ------------------------------------------------------------------ pedidos
export const orderHttp = {
  async placeOrder({ data, cart }) {
    const errors = validateCheckout(data, cart.items.length);
    if (errors.length) throw new AppError(errors[0], { code: 'validation' });
    // O servidor recalcula precos, taxa e total a partir dos ids: o carrinho local nao define valores.
    const payload = await api.post('/orders', {
      customer: { name: data.name, email: data.email, phone: data.phone, address: data.address, document: data.document || '' },
      items: toApiOrderItems(cart),
      paymentMethod: data.payment,
      simulatePaymentFailure: data['simulate-failure'] === 'on'
    }, { headers: { 'Idempotency-Key': idempotencyKey('order') } });
    const order = fromApiOrder(payload?.order);
    if (!order) throw new AppError('Resposta inesperada do servidor.', { code: 'bad_response' });
    rememberGuestToken(order.orderNumber, payload?.accessToken);
    notifyStorageChange(ORDER_STORAGE_KEY);
    return order;
  },
  async getOrderForViewer(orderNumber) {
    try {
      const payload = await api.get(`/orders/${encodeURIComponent(orderNumber)}?${query({ token: readTokenFromUrl() })}`);
      return { access: 'ok', order: fromApiOrder(payload?.order) };
    } catch (error) { return { access: accessFromError(error), order: null }; }
  },
  getReceiptUrl: orderNumber => withGuestToken(localReceiptUrl(orderNumber), orderNumber)
};

// ------------------------------------------------------------------ reservas
export const bookingHttp = {
  async getAvailability(date, guests) {
    const payload = await api.get(`/bookings/availability?${query({ date, guests })}`);
    return payload?.slots || [];
  },
  async createBooking(input) {
    const errors = [...validateBooking(input.date, input.time, Number(input.guests)), ...validateBookingContact(input)];
    if (errors.length) throw new AppError(errors[0], { code: 'validation' });
    const payload = await api.post('/bookings', {
      date: input.date, time: input.time, guests: Number(input.guests), name: input.name, phone: input.phone,
      occasion: input.occasion || '', notes: input.notes || '', paymentMethod: input.paymentMethod,
      simulatePaymentFailure: Boolean(input.simulateFailure)
    }, { headers: { 'Idempotency-Key': idempotencyKey('booking') } });
    const booking = fromApiBooking(payload?.booking);
    if (!booking) throw new AppError('Resposta inesperada do servidor.', { code: 'bad_response' });
    rememberGuestToken(booking.bookingNumber, payload?.accessToken);
    notifyStorageChange(BOOKING_STORAGE_KEY);
    return booking;
  },
  async getBookingForViewer(bookingNumber) {
    try {
      const payload = await api.get(`/bookings/${encodeURIComponent(bookingNumber)}?${query({ token: readTokenFromUrl() })}`);
      return { access: 'ok', booking: fromApiBooking(payload?.booking) };
    } catch (error) { return { access: accessFromError(error), booking: null }; }
  },
  getBookingConfirmationUrl: bookingNumber => withGuestToken(localConfirmationUrl(bookingNumber), bookingNumber)
};

// ------------------------------------------------------------------ avaliacoes
export const feedbackHttp = {
  async getFeedbacks() {
    const payload = await api.get('/reviews');
    return (payload?.items || []).map(fromApiReview).filter(Boolean);
  },
  async getReviewContext() {
    const session = getStoredSession();
    if (!session) return { account: null, eligible: [] };
    const payload = await api.get('/reviews/eligible');
    return { account: { email: session.email, name: getStoredProfile()?.name || session.name }, eligible: payload?.items || [] };
  },
  async publishFeedback({ rating, comment, productKeys = [] } = {}) {
    const session = requireSession();
    const errors = validateFeedback({ name: getStoredProfile()?.name || session.name, rating, comment });
    if (errors.length) throw new AppError(errors[0], { code: 'validation' });
    if (!productKeys.length) throw new AppError('Selecione ao menos um produto para avaliar.', { code: 'validation' });
    const payload = await api.post('/reviews', { rating: Number(rating), comment, productKeys });
    notifyStorageChange(FEEDBACK_STORAGE_KEY);
    return fromApiReview(payload?.review);
  }
};
