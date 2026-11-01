import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOKING_STORAGE_KEY, LAST_BOOKING_REFERENCE_KEY, createBooking, getAvailability, getBooking, getBookings, simulateBookingPayment
} from '../src/services/bookingService.js';
import {
  BOOKING_FEE, BOOKING_TABLES, BOOKING_TOTAL_SEATS, allocateTable, bookingsOverlap, getBookingSlots,
  getDayAvailability, validateBooking, validateBookingContact
} from '../src/utils/businessRules.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

// Relogio fixo: 1 de marco de 2026, 15:10.
const NOW = new Date(2026, 2, 1, 15, 10);
const DATE = '2026-03-05';
const approve = async ({ method }) => ({ status: 'approved', method });
const decline = async ({ method }) => ({ status: 'declined', method });
const request = (overrides = {}) => ({ date: DATE, time: '20:00', guests: 4, name: 'Ana Silva', phone: '(11) 98888-7777', paymentMethod: 'pix', ...overrides });
const book = (overrides = {}, processPayment = approve) => createBooking(request(overrides), { processPayment, now: NOW });

test('tables, slots and fee rules are consistent', () => {
  assert.equal(BOOKING_TABLES.length, 16);
  assert.equal(BOOKING_TOTAL_SEATS, 78);
  const slots = getBookingSlots();
  assert.equal(slots[0], '11:00');
  assert.equal(slots.at(-1), '22:00');
  assert.equal(slots.length, 23);
  assert.equal(BOOKING_FEE, 20);
});

test('booking validation rejects past dates, closed hours, past times and oversized groups', () => {
  assert.deepEqual(validateBooking(DATE, '20:00', 4, NOW), []);
  assert.match(validateBooking('2026-02-28', '20:00', 4, NOW)[0], /passado/);
  assert.match(validateBooking(DATE, '10:30', 4, NOW)[0], /11:00 e 22:00/);
  assert.match(validateBooking(DATE, '22:30', 4, NOW)[0], /11:00 e 22:00/);
  assert.match(validateBooking(DATE, '20:15', 4, NOW)[0], /30 minutos/);
  assert.match(validateBooking('2026-03-01', '15:00', 4, NOW)[0], /já passou/);
  assert.deepEqual(validateBooking('2026-03-01', '15:30', 4, NOW), []);
  assert.match(validateBooking(DATE, '20:00', 13, NOW)[0], /1 a 12/);
  assert.match(validateBooking('2026-06-01', '20:00', 2, NOW)[0], /60 dias/);
  assert.match(validateBookingContact({ name: 'An', phone: '11988887777', paymentMethod: 'pix' })[0], /nome/);
  assert.match(validateBookingContact({ name: 'Ana', phone: '123', paymentMethod: 'pix' })[0], /telefone/);
  assert.match(validateBookingContact({ name: 'Ana', phone: '11988887777', paymentMethod: 'cash' })[0], /taxa/);
});

test('allocation picks the smallest free table and respects the 90 minute window', () => {
  assert.equal(allocateTable([], { date: DATE, time: '20:00', guests: 3 }).id, 'M5');
  assert.equal(allocateTable([], { date: DATE, time: '20:00', guests: 12 }).id, 'M16');
  const taken = [{ date: DATE, time: '19:00', guests: 10, tableId: 'M16' }];
  assert.equal(allocateTable(taken, { date: DATE, time: '20:00', guests: 12 }), null);
  assert.equal(allocateTable(taken, { date: DATE, time: '20:30', guests: 12 }).id, 'M16');
  assert.equal(bookingsOverlap({ date: DATE, time: '19:00' }, { date: DATE, time: '20:00' }), true);
  assert.equal(bookingsOverlap({ date: DATE, time: '19:00' }, { date: DATE, time: '20:30' }), false);
  assert.equal(bookingsOverlap({ date: DATE, time: '19:00' }, { date: '2026-03-06', time: '19:00' }), false);
  // Reserva legada sem mesa ainda ocupa a menor mesa que a comporta.
  const legacy = [{ date: DATE, time: '20:00', guests: 11 }];
  assert.equal(allocateTable(legacy, { date: DATE, time: '20:00', guests: 9 }), null);
});

test('day availability marks full, few and past slots', () => {
  const bookings = [{ date: DATE, time: '20:00', guests: 12, tableId: 'M16' }];
  const slots = getDayAvailability(bookings, DATE, 12, NOW);
  assert.equal(slots.find(slot => slot.time === '20:00').status, 'full');
  assert.equal(slots.find(slot => slot.time === '21:00').status, 'full');
  assert.equal(slots.find(slot => slot.time === '21:30').status, 'few');
  const today = getDayAvailability([], '2026-03-01', 2, NOW);
  assert.equal(today.find(slot => slot.time === '15:00').status, 'past');
  assert.equal(today.find(slot => slot.time === '15:30').status, 'available');
});

test('approved booking persists with table, fee, payment and stable number', async () => {
  globalThis.localStorage = createStorage();
  const booking = await book({ accountEmail: 'Ana@Example.com' });
  assert.match(booking.bookingNumber, /^RS-20260305-[A-Z0-9]{4}$/);
  assert.equal(booking.tableId, 'M5');
  assert.equal(booking.tableSeats, 4);
  assert.equal(booking.fee, BOOKING_FEE);
  assert.equal(booking.paymentMethod, 'pix');
  assert.equal(booking.paymentStatus, 'approved');
  assert.equal(booking.status, 'confirmed');
  assert.equal(booking.userProfileId, 'ana@example.com');
  assert.equal(localStorage.getItem(LAST_BOOKING_REFERENCE_KEY), booking.bookingNumber);
  // Consultavel depois de "recarregar": mesmo contrato lido do armazenamento.
  assert.deepEqual(await getBooking(booking.bookingNumber), booking);
  assert.equal((await book()).tableId, 'M6');
});

test('declined payment and invalid input create nothing and block no table', async () => {
  globalThis.localStorage = createStorage();
  await assert.rejects(() => book({}, decline), /Pagamento recusado/);
  await assert.rejects(() => book({ simulateFailure: true }, args => simulateBookingPayment(args, 0)), /Pagamento recusado/);
  await assert.rejects(() => book({ guests: 20 }), /1 a 12/);
  await assert.rejects(() => book({ time: '23:00' }), /11:00 e 22:00/);
  assert.deepEqual(await getBookings(), []);
  assert.equal(localStorage.getItem(BOOKING_STORAGE_KEY), null);
});

test('full slots cannot be booked and appear unavailable', async () => {
  globalThis.localStorage = createStorage();
  await book({ guests: 12 });
  await assert.rejects(() => book({ guests: 12, time: '20:30' }), /Não há mesas livres/);
  const slots = await getAvailability(DATE, 12, NOW);
  assert.equal(slots.find(slot => slot.time === '20:30').status, 'full');
  assert.equal(slots.find(slot => slot.time === '21:30').status, 'few');
});

test('a booking made in another tab during payment is detected before confirming', async () => {
  globalThis.localStorage = createStorage();
  await book({ guests: 10, time: '20:00' });
  // Enquanto o pagamento acontece, outra aba ocupa as duas mesas de 8 lugares (a de 12 ja esta ocupada).
  const paymentWhileOtherTabBooks = async ({ method }) => {
    const stored = JSON.parse(localStorage.getItem(BOOKING_STORAGE_KEY));
    stored.push({ id: 1, date: DATE, time: '20:00', guests: 8, tableId: 'M14' }, { id: 2, date: DATE, time: '20:00', guests: 7 });
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(stored));
    return { status: 'approved', method };
  };
  await assert.rejects(() => book({ guests: 8, time: '20:00' }, paymentWhileOtherTabBooks), /lotou enquanto o pagamento/);
  assert.equal((await getBookings()).length, 3);
});

test('legacy bookings are preserved and corrupted storage does not break the flow', async () => {
  globalThis.localStorage = createStorage();
  localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify([{ id: 99, date: DATE, time: '20:00', guests: '2', createdAt: 'x', legacyField: true }, { lixo: true }, null]));
  const booking = await book({ guests: 2 });
  assert.equal(booking.tableId, 'M2', 'mesa M1 fica com a reserva legada');
  const raw = JSON.parse(localStorage.getItem(BOOKING_STORAGE_KEY));
  assert.equal(raw[0].legacyField, true);
  assert.equal(raw.length, 4);
  localStorage.setItem(BOOKING_STORAGE_KEY, '{nao e json');
  assert.deepEqual(await getBookings(), []);
  assert.equal((await book({ guests: 2 })).tableId, 'M1');
});

test('occasion and notes are validated, sanitized and persisted', async () => {
  const { getUpcomingBookingDates } = await import('../src/utils/businessRules.js');
  const days = getUpcomingBookingDates(NOW, 7);
  assert.equal(days.length, 7);
  assert.deepEqual([days[0].date, days[0].label, days[1].label, days[6].date], ['2026-03-01', 'Hoje', 'Amanhã', '2026-03-07']);
  assert.match(validateBookingContact({ name: 'Ana', phone: '11988887777', paymentMethod: 'pix', occasion: 'festa' })[0], /Ocasião/);
  assert.match(validateBookingContact({ name: 'Ana', phone: '11988887777', paymentMethod: 'pix', notes: 'x'.repeat(201) })[0], /200/);
  globalThis.localStorage = createStorage();
  const booking = await book({ occasion: 'aniversario', notes: '  <b>Bolo</b> às 21h  ' });
  assert.equal(booking.occasion, 'aniversario');
  assert.equal(booking.notes, 'bBolo/b às 21h');
  assert.equal((await getBooking(booking.bookingNumber)).notes, 'bBolo/b às 21h');
});
