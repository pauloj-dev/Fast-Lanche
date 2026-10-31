import { calculateDeliveryFee, calculateSubtotal, calculateTotal } from '../utils/businessRules.js';

export const ORDER_STORAGE_KEY = 'fastlanche_orders';
export const LAST_ORDER_REFERENCE_KEY = 'fastlanche_last_order';
// Os valores persistidos sao os mesmos de js/order-tracking.js, js/order-queue.js e do admin legado,
// que leem a mesma chave `fastlanche_orders`. Nao trocar por slugs sem migrar essas paginas.
export const ORDER_STATUS = Object.freeze({ RECEIVED: 'Pedido recebido', PAYMENT_CONFIRMED: 'Pagamento confirmado', PREPARING: 'Preparando pedido', OUT_FOR_DELIVERY: 'Saiu para entrega', DELIVERED: 'Entregue' });
const LEGACY_STATUS_SLUGS = Object.freeze({ received: ORDER_STATUS.RECEIVED, 'payment-confirmed': ORDER_STATUS.PAYMENT_CONFIRMED, preparing: ORDER_STATUS.PREPARING, 'out-for-delivery': ORDER_STATUS.OUT_FOR_DELIVERY, delivered: ORDER_STATUS.DELIVERED });
const ORDER_STATUS_CLASSES = Object.freeze({ [ORDER_STATUS.RECEIVED]: 'received', [ORDER_STATUS.PAYMENT_CONFIRMED]: 'payment', [ORDER_STATUS.PREPARING]: 'preparing', [ORDER_STATUS.OUT_FOR_DELIVERY]: 'out', [ORDER_STATUS.DELIVERED]: 'delivered' });
export const PAYMENT_LABELS = Object.freeze({ pix: 'Pix', card: 'Cartao de credito/debito', cash: 'Dinheiro' });

function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  } catch { return null; }
  return null;
}
function safeText(value, fallback = '') { return typeof value === 'string' ? value.trim() : fallback; }
function safeNumber(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? Math.max(number, 0) : fallback; }
function createOrderNumber() { return `FL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }

export function normalizeOrder(input) {
  if (!input || typeof input !== 'object') return null;
  const sourceCustomer = input.customer && typeof input.customer === 'object' ? input.customer : {};
  const customer = { name: safeText(sourceCustomer.name || input.customerName), email: safeText(sourceCustomer.email || input.email || input.userEmail), phone: safeText(sourceCustomer.phone || input.phone), address: safeText(sourceCustomer.address || input.address), document: safeText(sourceCustomer.document || input.document) };
  const items = Array.isArray(input.items) ? input.items.map(item => {
    if (!item || typeof item !== 'object') return null;
    const price = safeNumber(item.price);
    const quantity = Math.max(1, Math.floor(safeNumber(item.quantity, 1)));
    const customization = item._customization ?? item.customization ?? null;
    return { id: Number.isFinite(Number(item.id)) ? Number(item.id) : null, name: safeText(item.name, 'Item do pedido'), price, quantity, total: price * quantity, customization, _customization: customization };
  }).filter(Boolean) : [];
  // Valores sempre recalculados a partir dos itens: o que vem do formulario/localStorage nao e confiavel.
  const subtotal = calculateSubtotal(items);
  const deliveryFee = calculateDeliveryFee(subtotal);
  const status = normalizeStatus(input.status);
  const paymentMethod = safeText(input.paymentMethod || input.payment?.method);
  const paymentStatus = safeText(input.paymentStatus || input.payment?.status, 'pending');
  const orderNumber = safeText(input.orderNumber || input.id);
  if (!orderNumber) return null;
  // userProfileId: conta logada que fez o pedido (mesmo campo do js/checkout.js legado), base do historico do Perfil.
  const userProfileId = safeText(input.userProfileId).toLowerCase();
  return { id: orderNumber, orderNumber, customer, customerName: customer.name, email: customer.email, userEmail: userProfileId || customer.email, userProfileId, phone: customer.phone, address: customer.address, document: customer.document, items, subtotal, deliveryFee, total: calculateTotal(subtotal, deliveryFee), paymentMethod, paymentStatus, status, createdAt: safeText(input.createdAt, new Date().toISOString()) };
}

export function buildOrder(input = {}) {
  const normalized = normalizeOrder({ ...input, orderNumber: input.orderNumber || createOrderNumber() });
  if (!normalized || !normalized.customer.name || !normalized.customer.email || !normalized.customer.phone || !normalized.customer.address || !normalized.items.length) throw new Error('Pedido invalido: cliente, endereco e itens sao obrigatorios.');
  return normalized;
}
function normalizeStatus(status) {
  if (Object.values(ORDER_STATUS).includes(status)) return status;
  return LEGACY_STATUS_SLUGS[status] || ORDER_STATUS.RECEIVED;
}
function readRawOrders(storage) {
  try { const parsed = JSON.parse(storage.getItem(ORDER_STORAGE_KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}
function readOrders(storage) { return readRawOrders(storage).map(normalizeOrder).filter(Boolean); }
export async function getOrders() { const storage = getStorage(); return storage ? readOrders(storage) : []; }
export async function createOrder(input) {
  const order = buildOrder(input);
  const storage = getStorage();
  if (!storage) throw new Error('Nao foi possivel persistir o pedido.');
  const existing = readOrders(storage).find(saved => saved.orderNumber === order.orderNumber);
  if (existing) return existing;
  // Os demais pedidos sao regravados como estavam: paginas legadas guardam campos extras
  // (userProfileId, historico de status etc.) que o modelo React nao conhece.
  try { storage.setItem(ORDER_STORAGE_KEY, JSON.stringify([order, ...readRawOrders(storage)])); }
  catch { throw new Error('Nao foi possivel persistir o pedido.'); }
  return order;
}
export async function getOrder(orderNumber) {
  const reference = safeText(orderNumber);
  if (!reference) return null;
  const storage = getStorage();
  return storage ? readOrders(storage).find(order => order.orderNumber === reference) || null : null;
}
export function setLastOrderReference(orderNumber) {
  const reference = safeText(orderNumber); if (!reference) throw new Error('Referencia de pedido invalida.');
  const storage = getStorage(); if (!storage) throw new Error('Nao foi possivel guardar a referencia do pedido.');
  try { storage.setItem(LAST_ORDER_REFERENCE_KEY, reference); } catch { throw new Error('Nao foi possivel guardar a referencia do pedido.'); }
  return reference;
}
export function getLastOrderReference() { const storage = getStorage(); if (!storage) return ''; try { return safeText(storage.getItem(LAST_ORDER_REFERENCE_KEY)); } catch { return ''; } }
export function getPaymentLabel(method) { return PAYMENT_LABELS[method] || safeText(method, 'Nao informado'); }
export function getOrderStatusLabel(status) { return normalizeStatus(status); }
export function getOrderStatusClass(status) { return ORDER_STATUS_CLASSES[normalizeStatus(status)]; }
