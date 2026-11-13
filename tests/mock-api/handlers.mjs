// API mock que implementa docs/api/openapi.yaml (Fase 44). Usada de duas formas:
// - testes de unidade: via fetch simulado (tests/support/mockFetch.mjs);
// - E2E: via servidor HTTP real (tests/mock-api/server.mjs) para rodar as paginas no modo HTTP.
// Reaproveita as regras de negocio de src/ (validacoes, mesas, elegibilidade), como faria o backend real, e aplica o
// que o backend precisa garantir: preco calculado no servidor, idempotencia, sessao em cookie HttpOnly + CSRF,
// acesso ao comprovante so pelo dono ou por link assinado e alocacao de mesa com 409 em conflito.
import { createHash, randomBytes } from 'node:crypto';
import { MENU_CATALOG } from '../../src/data/menuCatalog.js';
import {
  allocateTable, calculateBookingFee, calculateDeliveryFee, calculateSubtotal, getDayAvailability, isValidAvatarDataUrl,
  normalizeEmail, sanitizeText, validateBooking, validateBookingContact, validateCheckout, validateFeedback, validateProfile,
  validateSignup, validateLogin
} from '../../src/utils/businessRules.js';
import { createBookingNumber, createOrderNumber } from '../../src/utils/ids.js';
import { getEligibleProducts, normalizeFeedback } from '../../src/services/repositories/local/feedbackLocal.js';
import { normalizeOrder } from '../../src/services/repositories/local/orderLocal.js';

const json = (status, body, headers = {}) => ({ status, headers: { 'Content-Type': 'application/json', ...headers }, body });
const error = (status, code, message, details = []) => json(status, { error: { code, message, details } });
const noContent = (headers = {}) => ({ status: 204, headers, body: null });
const token = () => randomBytes(18).toString('base64url');
const cents = reais => Math.round(Number(reais) * 100);
const hash = text => createHash('sha256').update(`fast-lanche:${text}`).digest('hex');

function parseCookies(header = '') {
  return Object.fromEntries(String(header).split(';').map(part => part.trim().split('=')).filter(([key]) => key).map(([key, ...rest]) => [key, decodeURIComponent(rest.join('='))]));
}

export function createMockApi({ now = () => new Date(), basePath = '/api/v1' } = {}) {
  const db = { users: new Map(), sessions: new Map(), orders: [], bookings: [], reviews: [], idempotency: new Map(), restaurantOpen: true };

  const userDto = (user, sessionStartedAt) => ({
    name: user.name, email: user.email, phone: user.phone, address: user.address, avatarUrl: user.avatarUrl,
    preferences: user.preferences, createdAt: user.createdAt, updatedAt: user.updatedAt, sessionStartedAt
  });
  const productDto = item => ({ id: item.id, name: item.name, description: item.description, priceCents: cents(item.price), category: item.category, maxQuantity: item.maxQuantity, active: item.active, customization: item.customization });
  // Pedido no formato de dominio (reais) para reutilizar as regras de src/.
  const orderAsDomain = order => normalizeOrder({ ...order, items: order.items.map(item => ({ id: item.productId, name: item.name, price: item.unitPriceCents / 100, quantity: item.quantity })), userProfileId: order.accountEmail });
  const bookingAsDomain = booking => ({ date: booking.date, time: booking.time, guests: booking.guests, tableId: booking.tableId });
  const reviewDto = review => ({ id: review.id, name: review.name, rating: review.rating, comment: review.comment, createdAt: review.createdAt, items: review.items, verified: review.items.length > 0 });

  function sessionCookies(sessionId, csrf) {
    return { 'Set-Cookie': [`fl_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/`, `fl_csrf=${csrf}; SameSite=Lax; Path=/`] };
  }
  function startSession(user) {
    const id = token();
    const csrf = token();
    const startedAt = now().toISOString();
    db.sessions.set(id, { email: user.email, csrf, startedAt });
    return json(200, { user: userDto(user, startedAt) }, sessionCookies(id, csrf));
  }

  function withIdempotency(key, scope, produce) {
    if (!key) return produce();
    const cacheKey = `${scope}:${key}`;
    if (db.idempotency.has(cacheKey)) return db.idempotency.get(cacheKey);
    const response = produce();
    if (response.status < 500) db.idempotency.set(cacheKey, response);
    return response;
  }

  // Dono (conta logada) ou link assinado (convidado).
  function viewerAccess(record, session, accessToken) {
    if (record.accountEmail) {
      if (!session) return error(401, 'unauthenticated', 'Entre com a conta usada na compra para ver este comprovante.');
      if (session.email !== record.accountEmail) return error(403, 'forbidden', 'Este registro pertence a outra conta.');
      return null;
    }
    return accessToken && accessToken === record.accessToken ? null : error(403, 'forbidden', 'Link de acesso inválido.');
  }

  const routes = [
    // ---------------------------------------------------------------- cardapio
    ['GET', /^\/menu$/, () => json(200, { restaurant: { open: db.restaurantOpen }, items: MENU_CATALOG.filter(item => item.active).map(productDto) })],

    // ---------------------------------------------------------------- autenticacao
    ['POST', /^\/auth\/register$/, ({ body }) => {
      const errors = validateSignup({ ...body, confirmPassword: body?.password });
      if (errors.length) return error(422, 'validation', errors[0]);
      const email = normalizeEmail(body.email);
      if (db.users.has(email)) return error(409, 'email_taken', 'Este e-mail ja esta cadastrado. Faca login.');
      const timestamp = now().toISOString();
      const user = { name: sanitizeText(body.name, 80), email, passwordHash: hash(body.password), phone: sanitizeText(body.phone, 20), address: '', avatarUrl: '', preferences: { paymentMethod: '', notifications: true, theme: 'light' }, createdAt: timestamp, updatedAt: timestamp };
      db.users.set(email, user);
      return startSession(user);
    }],
    ['POST', /^\/auth\/login$/, ({ body }) => {
      const errors = validateLogin(body || {});
      if (errors.length) return error(422, 'validation', errors[0]);
      const user = db.users.get(normalizeEmail(body.email));
      if (!user || user.passwordHash !== hash(body.password)) return error(401, 'invalid_credentials', 'E-mail ou senha incorretos.');
      return startSession(user);
    }],
    // Visitante sem login nao e erro: 200 com user null (evita 401 no console de toda pagina publica).
    ['GET', /^\/auth\/session$/, ({ session }) => json(200, { user: session ? userDto(db.users.get(session.email), session.startedAt) : null })],
    ['POST', /^\/auth\/logout$/, ({ sessionId }) => {
      db.sessions.delete(sessionId);
      return noContent({ 'Set-Cookie': ['fl_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0', 'fl_csrf=; SameSite=Lax; Path=/; Max-Age=0'] });
    }],

    // ---------------------------------------------------------------- perfil
    ['PATCH', /^\/me$/, ({ session, body }) => {
      if (!session) return error(401, 'unauthenticated', 'Sessão expirada.');
      const errors = validateProfile({ ...body, paymentMethod: body?.preferences?.paymentMethod ?? '' });
      if (errors.length) return error(422, 'validation', errors[0]);
      const user = db.users.get(session.email);
      Object.assign(user, { name: sanitizeText(body.name, 80), phone: sanitizeText(body.phone, 20), address: sanitizeText(body.address, 200), preferences: { paymentMethod: body.preferences?.paymentMethod || '', notifications: Boolean(body.preferences?.notifications), theme: 'light' }, updatedAt: now().toISOString() });
      return json(200, { user: userDto(user, session.startedAt) });
    }],
    ['PUT', /^\/me\/avatar$/, ({ session, body }) => {
      if (!session) return error(401, 'unauthenticated', 'Sessão expirada.');
      if (!isValidAvatarDataUrl(body?.dataUrl)) return error(422, 'validation', 'Imagem inválida.');
      const user = db.users.get(session.email);
      user.avatarUrl = body.dataUrl;
      return json(200, { user: userDto(user, session.startedAt) });
    }],
    ['DELETE', /^\/me\/avatar$/, ({ session }) => {
      if (!session) return error(401, 'unauthenticated', 'Sessão expirada.');
      const user = db.users.get(session.email);
      user.avatarUrl = '';
      return json(200, { user: userDto(user, session.startedAt) });
    }],
    ['POST', /^\/me\/import$/, ({ session, body, headers }) => {
      if (!session) return error(401, 'unauthenticated', 'Sessão expirada.');
      return withIdempotency(headers['idempotency-key'], `import:${session.email}`, () => {
        const user = db.users.get(session.email);
        if (body?.profile) for (const field of ['phone', 'address']) if (!user[field] && body.profile[field]) user[field] = sanitizeText(body.profile[field], field === 'phone' ? 20 : 200);
        const known = new Set(db.orders.map(order => order.orderNumber));
        const orders = (body?.orders || []).filter(order => order?.orderNumber && !known.has(order.orderNumber));
        orders.forEach(order => db.orders.push({ ...order, accountEmail: session.email, imported: true, items: order.items || [] }));
        const bookings = (body?.bookings || []).filter(booking => booking?.bookingNumber);
        bookings.forEach(booking => db.bookings.push({ ...booking, accountEmail: session.email, imported: true }));
        const reviews = (body?.reviews || []).filter(review => review?.comment);
        reviews.forEach(review => db.reviews.push({ id: db.reviews.length + 1, name: user.name, authorEmail: session.email, rating: review.rating, comment: sanitizeText(review.comment, 1000), createdAt: review.createdAt, items: review.items || [] }));
        return json(200, { imported: { orders: orders.length, bookings: bookings.length, reviews: reviews.length } });
      });
    }],

    // ---------------------------------------------------------------- pedidos
    ['POST', /^\/orders$/, ({ session, body, headers }) => withIdempotency(headers['idempotency-key'], 'order', () => {
      const customer = body?.customer || {};
      const errors = validateCheckout({ ...customer, payment: body?.paymentMethod }, (body?.items || []).length);
      if (errors.length) return error(422, 'validation', errors[0]);
      // Preco SEMPRE do catalogo do servidor; o cliente envia so id e quantidade.
      const items = [];
      for (const item of body.items) {
        const product = MENU_CATALOG.find(candidate => candidate.id === Number(item.productId) && candidate.active);
        if (!product) return error(422, 'validation', 'Produto indisponível no cardápio.', [{ field: 'items', message: `Produto ${item.productId} indisponível` }]);
        const quantity = Math.min(Math.max(Math.floor(Number(item.quantity)) || 1, 1), product.maxQuantity);
        items.push({ productId: product.id, name: product.name, unitPriceCents: cents(product.price), quantity, customization: item.customization ?? null });
      }
      if (body.simulatePaymentFailure) return error(402, 'payment_declined', 'Pagamento recusado. Nenhum pedido foi criado; tente outra forma de pagamento.');
      const subtotal = calculateSubtotal(items.map(item => ({ price: item.unitPriceCents / 100, quantity: item.quantity })));
      const order = {
        orderNumber: createOrderNumber(), status: 'received', createdAt: now().toISOString(),
        accountEmail: session?.email || '', accessToken: session ? '' : token(),
        customer: { name: sanitizeText(customer.name, 80), email: normalizeEmail(customer.email), phone: sanitizeText(customer.phone, 20), address: sanitizeText(customer.address, 200), document: sanitizeText(customer.document, 18) },
        items, subtotalCents: cents(subtotal), deliveryFeeCents: cents(calculateDeliveryFee(subtotal)),
        payment: { method: body.paymentMethod, status: 'approved' }
      };
      order.totalCents = order.subtotalCents + order.deliveryFeeCents;
      db.orders.unshift(order);
      const { accessToken, ...publicOrder } = order;
      return json(201, { order: publicOrder, ...(accessToken ? { accessToken } : {}) });
    })],
    ['GET', /^\/orders$/, ({ session, query }) => {
      if (!session) return error(401, 'unauthenticated', 'Sessão expirada.');
      if (query.get('scope') !== 'mine') return error(403, 'forbidden', 'Somente administradores listam todos os pedidos.');
      const items = db.orders.filter(order => order.accountEmail === session.email).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map(({ accessToken, ...order }) => order);
      return json(200, { items });
    }],
    ['GET', /^\/orders\/([^/]+)$/, ({ session, query, params }) => {
      const order = db.orders.find(candidate => candidate.orderNumber === params[0]);
      if (!order) return error(404, 'not_found', 'Pedido não encontrado.');
      const denied = viewerAccess(order, session, query.get('token'));
      if (denied) return denied;
      const { accessToken, ...publicOrder } = order;
      return json(200, { order: publicOrder });
    }],

    // ---------------------------------------------------------------- reservas
    ['GET', /^\/bookings\/availability$/, ({ query }) => {
      const date = query.get('date');
      const guests = Number(query.get('guests'));
      if (!date || !(guests >= 1)) return error(422, 'validation', 'Informe data e número de pessoas.');
      return json(200, { slots: getDayAvailability(db.bookings.filter(booking => booking.status === 'confirmed').map(bookingAsDomain), date, guests, now()) });
    }],
    ['POST', /^\/bookings$/, ({ session, body, headers }) => withIdempotency(headers['idempotency-key'], 'booking', () => {
      const errors = [...validateBooking(body?.date, body?.time, Number(body?.guests), now()), ...validateBookingContact(body || {})];
      if (errors.length) return error(422, 'validation', errors[0]);
      const request = { date: body.date, time: body.time, guests: Number(body.guests) };
      const table = allocateTable(db.bookings.filter(booking => booking.status === 'confirmed').map(bookingAsDomain), request);
      if (!table) return error(409, 'fully_booked', 'Não há mesas livres para este horário. Escolha outro horário.');
      if (body.simulatePaymentFailure) return error(402, 'payment_declined', 'Pagamento recusado. Nenhuma mesa foi bloqueada; tente outra forma de pagamento.');
      const booking = {
        bookingNumber: createBookingNumber(body.date), ...request, tableId: table.id, tableSeats: table.seats,
        name: sanitizeText(body.name, 80), phone: sanitizeText(body.phone, 20), occasion: body.occasion || '', notes: sanitizeText(body.notes, 200),
        accountEmail: session?.email || '', accessToken: session ? '' : token(), feeCents: cents(calculateBookingFee(request.guests)),
        payment: { method: body.paymentMethod, status: 'approved' }, status: 'confirmed', createdAt: now().toISOString()
      };
      db.bookings.push(booking);
      const { accessToken, ...publicBooking } = booking;
      return json(201, { booking: publicBooking, ...(accessToken ? { accessToken } : {}) });
    })],
    ['GET', /^\/bookings\/([^/]+)$/, ({ session, query, params }) => {
      const booking = db.bookings.find(candidate => candidate.bookingNumber === params[0]);
      if (!booking) return error(404, 'not_found', 'Reserva não encontrada.');
      const denied = viewerAccess(booking, session, query.get('token'));
      if (denied) return denied;
      const { accessToken, ...publicBooking } = booking;
      return json(200, { booking: publicBooking });
    }],

    // ---------------------------------------------------------------- avaliacoes
    ['GET', /^\/reviews$/, () => json(200, { items: [...db.reviews].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map(reviewDto) })],
    ['GET', /^\/reviews\/eligible$/, ({ session }) => {
      if (!session) return error(401, 'unauthenticated', 'Sessão expirada.');
      const reviews = db.reviews.map(review => normalizeFeedback({ ...review, timestamp: review.createdAt, userProfileId: review.authorEmail })).filter(Boolean);
      return json(200, { items: getEligibleProducts(db.orders.map(orderAsDomain).filter(Boolean), reviews, session.email) });
    }],
    ['POST', /^\/reviews$/, ({ session, body }) => {
      if (!session) return error(401, 'unauthenticated', 'Entre na sua conta para avaliar seus pedidos.');
      const user = db.users.get(session.email);
      const errors = validateFeedback({ name: user.name, rating: body?.rating, comment: body?.comment });
      if (errors.length) return error(422, 'validation', errors[0]);
      const reviews = db.reviews.map(review => normalizeFeedback({ ...review, timestamp: review.createdAt, userProfileId: review.authorEmail })).filter(Boolean);
      const eligible = new Map(getEligibleProducts(db.orders.map(orderAsDomain).filter(Boolean), reviews, session.email).map(item => [item.key, item]));
      const keys = [...new Set(body?.productKeys || [])];
      if (!keys.length) return error(422, 'validation', 'Selecione ao menos um produto para avaliar.');
      const selected = keys.map(key => eligible.get(key));
      if (selected.some(item => !item)) return error(422, 'not_eligible', 'Só é possível avaliar produtos de pedidos entregues da sua conta.');
      const repeated = selected.find(item => item.reviewed);
      if (repeated) return error(409, 'already_reviewed', `Você já avaliou ${repeated.name} do pedido ${repeated.orderNumber}.`);
      const review = { id: db.reviews.length + 1, name: user.name, authorEmail: session.email, rating: Number(body.rating), comment: sanitizeText(body.comment, 1000), createdAt: now().toISOString(), items: selected.map(item => ({ orderNumber: item.orderNumber, productId: item.productId, name: item.name })) };
      db.reviews.push(review);
      return json(201, { review: reviewDto(review) });
    }]
  ];

  // Rotas exclusivas do mock (fora do contrato): estado e controle para os testes.
  const mockRoutes = [
    ['POST', /^\/__mock\/reset$/, () => { db.users.clear(); db.sessions.clear(); db.orders = []; db.bookings = []; db.reviews = []; db.idempotency.clear(); db.restaurantOpen = true; return noContent(); }],
    ['GET', /^\/__mock\/state$/, () => json(200, { users: [...db.users.keys()], orders: db.orders, bookings: db.bookings, reviews: db.reviews, sessions: db.sessions.size })],
    ['POST', /^\/__mock\/orders\/([^/]+)\/status$/, ({ params, body }) => {
      const order = db.orders.find(candidate => candidate.orderNumber === params[0]);
      if (!order) return error(404, 'not_found', 'Pedido não encontrado.');
      order.status = body?.status || order.status;
      return json(200, { order });
    }]
  ];

  async function handle({ method = 'GET', url, headers = {}, body = null }) {
    const parsed = new URL(url, 'http://mock.local');
    const lowerHeaders = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
    const cookies = parseCookies(lowerHeaders.cookie);
    const sessionId = cookies.fl_session || '';
    const session = db.sessions.get(sessionId) || null;
    const path = parsed.pathname.startsWith(basePath) ? parsed.pathname.slice(basePath.length) || '/' : parsed.pathname;
    const verb = method.toUpperCase();

    for (const [routeMethod, pattern, handler] of [...mockRoutes, ...routes]) {
      if (routeMethod !== verb) continue;
      const match = pattern.exec(path);
      if (!match) continue;
      // CSRF (double submit): toda alteracao feita com sessao exige X-CSRF-Token igual ao cookie fl_csrf.
      if (session && !['GET', 'HEAD', 'OPTIONS'].includes(verb) && !path.startsWith('/__mock') && lowerHeaders['x-csrf-token'] !== session.csrf) {
        return error(403, 'csrf', 'Requisição bloqueada por segurança. Recarregue a página e tente de novo.');
      }
      try {
        return await handler({ session, sessionId, body, headers: lowerHeaders, query: parsed.searchParams, params: match.slice(1).map(decodeURIComponent) });
      } catch (cause) {
        return error(500, 'server_error', `Erro interno: ${cause.message}`);
      }
    }
    return error(404, 'route_not_found', `Rota ${verb} ${path} não existe.`);
  }

  return { handle, db, basePath };
}
