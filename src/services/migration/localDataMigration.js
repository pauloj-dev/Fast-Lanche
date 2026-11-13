// Migracao dos dados locais para a conta no servidor (Fase 44). Executada no primeiro login/cadastro em modo HTTP.
// 1. Coleta so o que pertence ao e-mail logado: perfil, pedidos (da conta ou feitos como convidado com o mesmo
//    e-mail), reservas e avaliacoes. Dados de outras contas no mesmo navegador nao sao enviados.
// 2. Envia em um unico POST /me/import, com Idempotency-Key estavel (repetir nao duplica no servidor).
// 3. Remove do navegador apenas os registros importados e marca o e-mail como migrado.
// O carrinho continua local nos dois modos (o servidor recalcula precos no pedido).
import { api } from '../api/apiClient.js';
import { readArray, readObject, writeJSON } from '../storage/safeStorage.js';
import { BOOKING_STORAGE_KEY, FEEDBACK_STORAGE_KEY, MIGRATION_KEY, ORDER_STORAGE_KEY, PROFILE_KEY } from '../storage/keys.js';
import { normalizeEmail } from '../../utils/validation.js';
import { normalizeOrder } from '../repositories/local/orderLocal.js';
import { normalizeBooking } from '../repositories/local/bookingLocal.js';
import { normalizeFeedback } from '../repositories/local/feedbackLocal.js';
import { normalizeProfile } from '../repositories/local/profileLocal.js';
import { reaisToCents } from '../repositories/http/mappers.js';

export const MIGRATION_VERSION = 1;

const belongsTo = (record, email) => normalizeEmail(record?.userProfileId) === email;
const orderBelongsTo = (order, email) => order && (order.userProfileId ? order.userProfileId === email : normalizeEmail(order.customer?.email) === email);

const toOrderDto = order => ({
  orderNumber: order.orderNumber, createdAt: order.createdAt, status: order.status,
  customer: order.customer, payment: { method: order.paymentMethod, status: order.paymentStatus },
  items: order.items.map(item => ({ productId: item.id, name: item.name, unitPriceCents: reaisToCents(item.price), quantity: item.quantity, customization: item.customization ?? null })),
  totalCents: reaisToCents(order.total)
});
const toBookingDto = booking => ({
  bookingNumber: booking.bookingNumber, date: booking.date, time: booking.time, guests: booking.guests, tableId: booking.tableId,
  name: booking.name, phone: booking.phone, occasion: booking.occasion, notes: booking.notes, status: booking.status,
  feeCents: reaisToCents(booking.fee), payment: { method: booking.paymentMethod, status: booking.paymentStatus }, createdAt: booking.createdAt
});
const toReviewDto = review => ({ rating: review.rating, comment: review.comment, createdAt: review.timestamp, items: review.items });

// Monta o payload de importacao a partir do armazenamento local (funcao pura sobre o que esta salvo).
export function collectLocalData(accountEmail) {
  const email = normalizeEmail(accountEmail);
  const storedProfile = readObject(PROFILE_KEY);
  const profile = storedProfile && normalizeEmail(storedProfile.email) === email ? normalizeProfile(storedProfile, email) : null;
  const orders = readArray(ORDER_STORAGE_KEY).map(normalizeOrder).filter(order => orderBelongsTo(order, email));
  const bookings = readArray(BOOKING_STORAGE_KEY).map(normalizeBooking).filter(booking => booking && belongsTo(booking, email));
  const reviews = readArray(FEEDBACK_STORAGE_KEY).map(normalizeFeedback).filter(review => review && belongsTo(review, email));
  return {
    version: MIGRATION_VERSION,
    profile: profile && { name: profile.name, phone: profile.phone, address: profile.address, preferences: profile.preferences },
    orders: orders.map(toOrderDto),
    bookings: bookings.map(toBookingDto),
    reviews: reviews.map(toReviewDto)
  };
}

export const hasDataToMigrate = payload => Boolean(payload.profile || payload.orders.length || payload.bookings.length || payload.reviews.length);

const migratedEmails = () => readArray(MIGRATION_KEY).filter(item => typeof item === 'string');
export const isAlreadyMigrated = email => migratedEmails().includes(normalizeEmail(email));

// Remove do navegador somente os registros enviados (dados de outras contas permanecem).
export function clearMigratedData(accountEmail) {
  const email = normalizeEmail(accountEmail);
  writeJSON(ORDER_STORAGE_KEY, readArray(ORDER_STORAGE_KEY).filter(raw => !orderBelongsTo(normalizeOrder(raw), email)));
  writeJSON(BOOKING_STORAGE_KEY, readArray(BOOKING_STORAGE_KEY).filter(raw => !belongsTo(normalizeBooking(raw), email)));
  writeJSON(FEEDBACK_STORAGE_KEY, readArray(FEEDBACK_STORAGE_KEY).filter(raw => !belongsTo(normalizeFeedback(raw), email)));
  const storedProfile = readObject(PROFILE_KEY);
  if (storedProfile && normalizeEmail(storedProfile.email) === email) writeJSON(PROFILE_KEY, { email, migrated: true });
  writeJSON(MIGRATION_KEY, [...new Set([...migratedEmails(), email])]);
}

export async function migrateLocalDataToAccount(accountEmail, client = api) {
  const email = normalizeEmail(accountEmail);
  if (!email || isAlreadyMigrated(email)) return { migrated: false, reason: 'already_migrated' };
  const payload = collectLocalData(email);
  if (!hasDataToMigrate(payload)) {
    writeJSON(MIGRATION_KEY, [...new Set([...migratedEmails(), email])]);
    return { migrated: false, reason: 'nothing_to_migrate' };
  }
  const result = await client.post('/me/import', payload, { headers: { 'Idempotency-Key': `import-${MIGRATION_VERSION}-${email}` } });
  clearMigratedData(email);
  return { migrated: true, counts: result?.imported || { orders: payload.orders.length, bookings: payload.bookings.length, reviews: payload.reviews.length } };
}
