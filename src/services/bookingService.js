// Reservas (Fase 38): disponibilidade por mesa, pagamento simulado da taxa e confirmacao.
// A chave `fastlanche_bookings` e compartilhada com js/booking.js: reservas legadas (sem mesa) contam na capacidade
// e sao regravadas exatamente como estavam.
import {
  BOOKING_FEE, BOOKING_LAST_SLOT, BOOKING_NOTES_MAX, BOOKING_OCCASIONS, BOOKING_OPENING, BOOKING_TABLES, MAX_GUESTS, allocateTable, calculateBookingFee, getDayAvailability, normalizeEmail,
  sanitizeText, validateBooking, validateBookingContact
} from '../utils/businessRules.js';

export const BOOKING_STORAGE_KEY = 'fastlanche_bookings';
export const LAST_BOOKING_REFERENCE_KEY = 'fastlanche_last_booking';
export const BOOKING_STATUS = Object.freeze({ CONFIRMED: 'confirmed' });
export const BOOKING_STATUS_LABELS = Object.freeze({ [BOOKING_STATUS.CONFIRMED]: 'Confirmada' });
export const BOOKING_PAYMENT_LABELS = Object.freeze({ pix: 'Pix', card: 'Cartão de crédito/débito' });
export const PAYMENT_DELAY_MS = 500;

function getStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}
function readRawBookings(storage) {
  try { const parsed = JSON.parse(storage.getItem(BOOKING_STORAGE_KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

// O que vem do localStorage nao e confiavel: registro sem data/horario/pessoas validos e ignorado.
export function normalizeBooking(input) {
  if (!input || typeof input !== 'object') return null;
  const date = typeof input.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : '';
  const time = typeof input.time === 'string' && /^\d{2}:\d{2}$/.test(input.time) ? input.time : '';
  const guests = Math.floor(Number(input.guests));
  if (!date || !time || !(guests >= 1)) return null;
  const table = BOOKING_TABLES.find(candidate => candidate.id === input.tableId) || null;
  return {
    bookingNumber: sanitizeText(input.bookingNumber || (input.id ? `RS-${input.id}` : ''), 40),
    date, time, guests,
    tableId: table?.id || '',
    tableSeats: table?.seats || 0,
    name: sanitizeText(input.name, 80),
    phone: sanitizeText(input.phone, 20),
    occasion: BOOKING_OCCASIONS.some(([value]) => value === input.occasion) ? input.occasion : '',
    notes: sanitizeText(input.notes, BOOKING_NOTES_MAX),
    userProfileId: normalizeEmail(input.userProfileId),
    fee: Number.isFinite(Number(input.fee)) ? Math.max(Number(input.fee), 0) : 0,
    paymentMethod: typeof input.paymentMethod === 'string' ? input.paymentMethod : '',
    paymentStatus: typeof input.paymentStatus === 'string' ? input.paymentStatus : '',
    status: BOOKING_STATUS_LABELS[input.status] ? input.status : BOOKING_STATUS.CONFIRMED,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : ''
  };
}

function readBookings(storage) { return readRawBookings(storage).map(normalizeBooking).filter(Boolean); }

export async function getBookings() { const storage = getStorage(); return storage ? readBookings(storage) : []; }

// Situacao de todos os horarios do dia para o tamanho do grupo. Sempre le o armazenamento de novo,
// entao reservas feitas em outra aba aparecem na proxima consulta.
export async function getAvailability(date, guests, now = new Date()) {
  const storage = getStorage();
  return getDayAvailability(storage ? readBookings(storage) : [], date, guests, now);
}

// Numero estavel e legivel: data da reserva + sufixo aleatorio (ex.: RS-20261105-K3F9).
function createBookingNumber(date) {
  return `RS-${date.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0')}`;
}

// Pagamento simulado da taxa. `simulateFailure` existe para demonstrar o fluxo de recusa.
export async function simulateBookingPayment({ method, simulateFailure = false }, delay = PAYMENT_DELAY_MS) {
  await new Promise(resolve => setTimeout(resolve, delay));
  return { status: simulateFailure ? 'declined' : 'approved', method };
}

// Fluxo: valida -> confere mesa -> paga -> recarrega e confere de novo -> grava.
// Pagamento recusado ou horario lotado nao grava nada e nao bloqueia mesa.
export async function createBooking(input, { processPayment = simulateBookingPayment, now = new Date() } = {}) {
  const guests = Number(input.guests);
  const errors = [...validateBooking(input.date, input.time, guests, now), ...validateBookingContact(input)];
  if (errors.length) throw new Error(errors[0]);
  const storage = getStorage();
  if (!storage) throw new Error('Armazenamento do navegador indisponível.');
  const request = { date: input.date, time: input.time, guests };
  if (!allocateTable(readBookings(storage), request)) throw new Error('Não há mesas livres para este horário. Escolha outro horário.');

  const fee = calculateBookingFee(guests);
  const payment = await processPayment({ method: input.paymentMethod, total: fee, simulateFailure: Boolean(input.simulateFailure) });
  if (payment?.status !== 'approved') throw new Error('Pagamento recusado. Nenhuma mesa foi bloqueada; tente outra forma de pagamento.');

  // Outra aba pode ter reservado durante o pagamento: recarrega antes de confirmar.
  const table = allocateTable(readBookings(storage), request);
  if (!table) throw new Error('Este horário lotou enquanto o pagamento era processado. O valor foi estornado (simulado); escolha outro horário.');

  const booking = {
    id: Date.now(),
    bookingNumber: createBookingNumber(input.date),
    date: input.date, time: input.time, guests,
    tableId: table.id, tableSeats: table.seats,
    name: sanitizeText(input.name, 80), phone: sanitizeText(input.phone, 20),
    occasion: input.occasion || '', notes: sanitizeText(input.notes, BOOKING_NOTES_MAX),
    userProfileId: normalizeEmail(input.accountEmail),
    fee, paymentMethod: input.paymentMethod, paymentStatus: payment.status,
    status: BOOKING_STATUS.CONFIRMED,
    createdAt: new Date().toISOString()
  };
  try {
    storage.setItem(BOOKING_STORAGE_KEY, JSON.stringify([...readRawBookings(storage), booking]));
  } catch { throw new Error('Não foi possível salvar a reserva. O valor foi estornado (simulado); tente novamente.'); }
  try { storage.setItem(LAST_BOOKING_REFERENCE_KEY, booking.bookingNumber); } catch { /* a URL da confirmacao ja carrega a referencia */ }
  return normalizeBooking(booking);
}

export async function getBooking(bookingNumber) {
  const reference = sanitizeText(bookingNumber, 40);
  if (!reference) return null;
  const storage = getStorage();
  return storage ? readBookings(storage).find(booking => booking.bookingNumber === reference) || null : null;
}

export function getLastBookingReference() {
  try { return sanitizeText(getStorage()?.getItem(LAST_BOOKING_REFERENCE_KEY), 40); } catch { return ''; }
}

export function getBookingConfirmationUrl(bookingNumber) { return `reservas.html?reserva=${encodeURIComponent(bookingNumber)}`; }
export const getBookingStatusLabel = status => BOOKING_STATUS_LABELS[status] || BOOKING_STATUS_LABELS[BOOKING_STATUS.CONFIRMED];
export const getBookingOccasionLabel = occasion => BOOKING_OCCASIONS.find(([value]) => value === occasion)?.[1] || '';
export const getBookingPaymentLabel = method => BOOKING_PAYMENT_LABELS[method] || 'Não informado';

// Destaques exibidos no topo das paginas de reserva (React e legado).
export function getBookingHighlights() {
  const fee = BOOKING_FEE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return [
    ['⚡', 'Confirmação imediata', 'Mesa garantida após o pagamento'],
    ['🪑', `${BOOKING_TABLES.length} mesas`, `Grupos de 1 a ${MAX_GUESTS} pessoas`],
    ['🕚', `${BOOKING_OPENING} às ${BOOKING_LAST_SLOT}`, 'Todos os dias da semana'],
    ['💳', `${fee} de taxa`, 'Abatidos da sua conta']
  ];
}
