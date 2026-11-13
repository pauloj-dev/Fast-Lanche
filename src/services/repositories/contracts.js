// Contratos de repositorio (Fase 44). Cada dominio tem uma implementacao local (localStorage) e uma HTTP
// (docs/api/openapi.yaml) com os mesmos metodos e o mesmo formato de retorno: os services e as paginas so dependem
// destes contratos. Metodos sincronos devolvem o estado ja conhecido (sessao/perfil/status do restaurante); os
// assincronos podem ir a rede.

/**
 * @typedef {object} MenuRepository
 * @property {() => Promise<object[]>} getMenuItems            Produtos normalizados (preco em reais).
 * @property {() => boolean} isRestaurantClosed                Status conhecido apos getMenuItems.
 */

/**
 * @typedef {object} AuthRepository
 * @property {() => Promise<object|null>} restoreSession       Recarrega a sessao (no HTTP: GET /auth/session).
 * @property {() => object|null} readSession                   { email, name, loginAt } ou null.
 * @property {() => object|null} getCurrentProfile             Perfil bruto da conta logada.
 * @property {(input: object) => Promise<object>} register
 * @property {(input: object) => Promise<object>} login
 * @property {() => Promise<void>} logout
 */

/**
 * @typedef {object} ProfileRepository
 * @property {(input: object) => Promise<object>} updateProfile
 * @property {(dataUrl: string) => Promise<object>} updateAvatar
 * @property {() => Promise<object>} removeAvatar
 * @property {() => Promise<object[]>} getOrderHistory         Pedidos da conta, mais recentes primeiro.
 */

/**
 * @typedef {object} OrderRepository
 * @property {(input: { data: object, cart: object, accountEmail?: string, processPayment?: Function }) => Promise<object>} placeOrder
 * @property {(orderNumber: string) => Promise<{ access: string, order: object|null }>} getOrderForViewer
 * @property {(orderNumber: string) => string} getReceiptUrl
 */

/**
 * @typedef {object} BookingRepository
 * @property {(date: string, guests: number, now?: Date) => Promise<object[]>} getAvailability
 * @property {(input: object, options?: object) => Promise<object>} createBooking
 * @property {(bookingNumber: string) => Promise<{ access: string, booking: object|null }>} getBookingForViewer
 * @property {(bookingNumber: string) => string} getBookingConfirmationUrl
 */

/**
 * @typedef {object} FeedbackRepository
 * @property {() => Promise<object[]>} getFeedbacks
 * @property {() => Promise<{ account: object|null, eligible: object[] }>} getReviewContext
 * @property {(input: object) => Promise<object>} publishFeedback
 */

export const REPOSITORY_CONTRACTS = Object.freeze({
  menu: ['getMenuItems', 'isRestaurantClosed'],
  auth: ['restoreSession', 'readSession', 'getCurrentProfile', 'register', 'login', 'logout'],
  profile: ['updateProfile', 'updateAvatar', 'removeAvatar', 'getOrderHistory'],
  orders: ['placeOrder', 'getOrderForViewer', 'getReceiptUrl'],
  bookings: ['getAvailability', 'createBooking', 'getBookingForViewer', 'getBookingConfirmationUrl'],
  feedbacks: ['getFeedbacks', 'getReviewContext', 'publishFeedback']
});

// Garante que uma implementacao cumpre o contrato (falha cedo, com o metodo que falta).
export function assertRepository(name, implementation) {
  const methods = REPOSITORY_CONTRACTS[name];
  if (!methods) throw new Error(`Contrato desconhecido: ${name}`);
  const missing = methods.filter(method => typeof implementation?.[method] !== 'function');
  if (missing.length) throw new Error(`Repositorio "${name}" nao implementa: ${missing.join(', ')}`);
  return implementation;
}
