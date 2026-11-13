// Fachada de reservas (Fase 44): disponibilidade, criacao e confirmacao pelo repositorio (local ou API);
// rotulos, destaques e normalizacao valem nos dois modos.
import { getRepository } from './repositories/index.js';

export * from './repositories/local/bookingLocal.js';

const bookings = () => getRepository('bookings');

export const getAvailability = (...args) => bookings().getAvailability(...args);
export const createBooking = (...args) => bookings().createBooking(...args);
export const getBookingForViewer = bookingNumber => bookings().getBookingForViewer(bookingNumber);
export const getBookingConfirmationUrl = bookingNumber => bookings().getBookingConfirmationUrl(bookingNumber);
