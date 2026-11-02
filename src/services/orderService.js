import { FIELD_LIMITS, calculateDeliveryFee, calculateSubtotal, calculateTotal, normalizeEmail, sanitizeDeep, sanitizeText } from '../utils/businessRules.js';
import { AppError } from '../utils/errors.js';
import { readSession } from './authService.js';
import { readArray, readText, writeJSON, writeText } from './storage/safeStorage.js';

export const ORDER_STORAGE_KEY = 'fastlanche_orders';
export const LAST_ORDER_REFERENCE_KEY = 'fastlanche_last_order';
// Os valores persistidos sao os mesmos de js/order-tracking.js, js/order-queue.js e do admin legado,
// que leem a mesma chave `fastlanche_orders`. Nao trocar por slugs sem migrar essas paginas.
export const ORDER_STATUS = Object.freeze({ RECEIVED: 'Pedido recebido', PAYMENT_CONFIRMED: 'Pagamento confirmado', PREPARING: 'Preparando pedido', OUT_FOR_DELIVERY: 'Saiu para entrega', DELIVERED: 'Entregue' });
const LEGACY_STATUS_SLUGS = Object.freeze({ received: ORDER_STATUS.RECEIVED, 'payment-confirmed': ORDER_STATUS.PAYMENT_CONFIRMED, preparing: ORDER_STATUS.PREPARING, 'out-for-delivery': ORDER_STATUS.OUT_FOR_DELIVERY, delivered: ORDER_STATUS.DELIVERED });
const ORDER_STATUS_CLASSES = Object.freeze({ [ORDER_STATUS.RECEIVED]: 'received', [ORDER_STATUS.PAYMENT_CONFIRMED]: 'payment', [ORDER_STATUS.PREPARING]: 'preparing', [ORDER_STATUS.OUT_FOR_DELIVERY]: 'out', [ORDER_STATUS.DELIVERED]: 'delivered' });
export const PAYMENT_LABELS = Object.freeze({ pix: 'Pix', card: 'Cartao de credito/debito', cash: 'Dinheiro' });

// Texto vindo do formulario ou do localStorage: sanitizado e limitado (numeros de pedidos legados viram texto).
function safeText(value, fallback = '', maxLength = FIELD_LIMITS.address) {
  const text = typeof value === 'string' || typeof value === 'number' ? sanitizeText(value, maxLength) : '';
  return text || fallback;
}
const MAX_ITEM_PRICE = 10000;
const MAX_ITEM_QUANTITY = 99;
const PAYMENT_METHODS = Object.keys({ pix: 1, card: 1, cash: 1 });
function safeNumber(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? Math.max(number, 0) : fallback; }
function createOrderNumber() { return `FL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }

export function normalizeOrder(input) {
  if (!input || typeof input !== 'object') return null;
  const sourceCustomer = input.customer && typeof input.customer === 'object' ? input.customer : {};
  const customer = {
    name: safeText(sourceCustomer.name || input.customerName, '', FIELD_LIMITS.name),
    email: normalizeEmail(safeText(sourceCustomer.email || input.email || input.userEmail, '', FIELD_LIMITS.email)),
    phone: safeText(sourceCustomer.phone || input.phone, '', FIELD_LIMITS.phone),
    address: safeText(sourceCustomer.address || input.address, '', FIELD_LIMITS.address),
    document: safeText(sourceCustomer.document || input.document, '', FIELD_LIMITS.document)
  };
  const items = Array.isArray(input.items) ? input.items.slice(0, 100).map(item => {
    if (!item || typeof item !== 'object') return null;
    const price = Math.min(safeNumber(item.price), MAX_ITEM_PRICE);
    const quantity = Math.min(Math.max(1, Math.floor(safeNumber(item.quantity, 1))), MAX_ITEM_QUANTITY);
    const rawCustomization = item._customization ?? item.customization ?? null;
    const customization = rawCustomization === null ? null : sanitizeDeep(rawCustomization);
    const hasId = item.id !== null && item.id !== undefined && item.id !== '' && Number.isFinite(Number(item.id));
    return { id: hasId ? Number(item.id) : null, name: safeText(item.name, 'Item do pedido', FIELD_LIMITS.productName), price, quantity, total: price * quantity, customization, _customization: customization };
  }).filter(Boolean) : [];
  // Valores sempre recalculados a partir dos itens: o que vem do formulario/localStorage nao e confiavel.
  const subtotal = calculateSubtotal(items);
  const deliveryFee = calculateDeliveryFee(subtotal);
  const status = normalizeStatus(input.status);
  const rawPaymentMethod = safeText(input.paymentMethod || input.payment?.method, '', 20);
  const paymentMethod = PAYMENT_METHODS.includes(rawPaymentMethod) ? rawPaymentMethod : '';
  const paymentStatus = ['approved', 'pending', 'declined'].includes(input.paymentStatus || input.payment?.status) ? (input.paymentStatus || input.payment?.status) : 'pending';
  const orderNumber = safeText(input.orderNumber || input.id, '', FIELD_LIMITS.reference);
  if (!orderNumber) return null;
  // userProfileId: conta logada que fez o pedido (mesmo campo do js/checkout.js legado), base do historico do Perfil.
  const userProfileId = normalizeEmail(safeText(input.userProfileId, '', FIELD_LIMITS.email));
  return { id: orderNumber, orderNumber, customer, customerName: customer.name, email: customer.email, userEmail: userProfileId || customer.email, userProfileId, phone: customer.phone, address: customer.address, document: customer.document, items, subtotal, deliveryFee, total: calculateTotal(subtotal, deliveryFee), paymentMethod, paymentStatus, status, createdAt: !Number.isNaN(Date.parse(input.createdAt)) ? String(input.createdAt) : new Date().toISOString() };
}

export function buildOrder(input = {}) {
  const normalized = normalizeOrder({ ...input, orderNumber: input.orderNumber || createOrderNumber() });
  if (!normalized || !normalized.customer.name || !normalized.customer.email || !normalized.customer.phone || !normalized.customer.address || !normalized.items.length) throw new AppError('Pedido invalido: cliente, endereco e itens sao obrigatorios.', { code: 'validation' });
  return normalized;
}
function normalizeStatus(status) {
  if (Object.values(ORDER_STATUS).includes(status)) return status;
  return LEGACY_STATUS_SLUGS[status] || ORDER_STATUS.RECEIVED;
}
function readRawOrders() { return readArray(ORDER_STORAGE_KEY); }
function readOrders() { return readRawOrders().map(normalizeOrder).filter(Boolean); }
export async function getOrders() { return readOrders(); }
export async function createOrder(input) {
  const order = buildOrder(input);
  const existing = readOrders().find(saved => saved.orderNumber === order.orderNumber);
  if (existing) return existing;
  // Os demais pedidos sao regravados como estavam: paginas legadas guardam campos extras
  // (userProfileId, historico de status etc.) que o modelo React nao conhece.
  try { writeJSON(ORDER_STORAGE_KEY, [order, ...readRawOrders()]); }
  catch (error) { throw new AppError('Nao foi possivel persistir o pedido.', { code: error?.code || 'storage', cause: error }); }
  return order;
}
export async function getOrder(orderNumber) {
  const reference = safeText(orderNumber, '', FIELD_LIMITS.reference);
  if (!reference) return null;
  return readOrders().find(order => order.orderNumber === reference) || null;
}

// Quem pode ver um pedido (comprovante com nome, telefone e endereco):
// - pedido de conta: somente a propria conta logada;
// - pedido sem conta: somente o navegador que o fez (referencia do ultimo pedido guardada no checkout).
// Retorna o motivo da recusa sem expor nenhum dado do pedido.
export function canViewOrder(order, session = readSession(), lastReference = getLastOrderReference()) {
  if (!order) return 'not_found';
  if (order.userProfileId) {
    if (!session) return 'login_required';
    return session.email === order.userProfileId ? 'ok' : 'forbidden';
  }
  return order.orderNumber === lastReference ? 'ok' : 'forbidden';
}
export async function getOrderForViewer(orderNumber) {
  const order = await getOrder(orderNumber);
  const access = canViewOrder(order);
  return { access, order: access === 'ok' ? order : null };
}

export function setLastOrderReference(orderNumber) {
  const reference = safeText(orderNumber, '', FIELD_LIMITS.reference);
  if (!reference) throw new AppError('Referencia de pedido invalida.', { code: 'validation' });
  try { writeText(LAST_ORDER_REFERENCE_KEY, reference); }
  catch (error) { throw new AppError('Nao foi possivel guardar a referencia do pedido.', { code: error?.code || 'storage', cause: error }); }
  return reference;
}
export function getLastOrderReference() { return safeText(readText(LAST_ORDER_REFERENCE_KEY, ''), '', FIELD_LIMITS.reference); }
export function getPaymentLabel(method) { return PAYMENT_LABELS[method] || 'Nao informado'; }
export function getOrderStatusLabel(status) { return normalizeStatus(status); }
export function getOrderStatusClass(status) { return ORDER_STATUS_CLASSES[normalizeStatus(status)]; }
