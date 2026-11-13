// Feedbacks (Fase 39): avaliacoes vinculadas a produtos de pedidos entregues da conta logada.
// Leitura e livre; publicar exige login e ao menos um produto elegivel. A chave `fastlanche_feedbacks` vem do
// legado: avaliacoes antigas (sem produtos) continuam visiveis como "avaliacao geral" e sao regravadas como estavam.
import { getCurrentProfile, readSession } from './authLocal.js';
import { ORDER_STATUS, getOrders } from './orderLocal.js';
import { FEEDBACK_LIMITS, getProductKey, normalizeEmail, sanitizeText, validateFeedback } from '../../../utils/businessRules.js';
import { readArray, writeJSON } from '../../storage/safeStorage.js';
import { AppError } from '../../../utils/errors.js';
import { FEEDBACK_STORAGE_KEY } from '../../storage/keys.js';


function readRawFeedbacks() { return readArray(FEEDBACK_STORAGE_KEY); }

// O que vem do localStorage nao e confiavel: tudo e revalidado, sanitizado e limitado ao carregar.
export function normalizeFeedback(input) {
  if (!input || typeof input !== 'object') return null;
  const rating = Math.round(Number(input.rating));
  const comment = sanitizeText(input.comment, FEEDBACK_LIMITS.comment);
  const timestamp = typeof input.timestamp === 'string' && !Number.isNaN(Date.parse(input.timestamp)) ? input.timestamp : '';
  if (!(rating >= 1 && rating <= 5) || !comment || !timestamp) return null;
  const items = (Array.isArray(input.items) ? input.items : [])
    .filter(item => item && typeof item === 'object' && sanitizeText(item.name, FEEDBACK_LIMITS.productName))
    .slice(0, FEEDBACK_LIMITS.products)
    .map(item => ({
      orderNumber: sanitizeText(item.orderNumber, 40),
      productId: Number.isFinite(Number(item.productId)) && item.productId !== null && item.productId !== '' ? Number(item.productId) : null,
      name: sanitizeText(item.name, FEEDBACK_LIMITS.productName)
    }));
  return {
    id: Number.isFinite(Number(input.id)) ? Number(input.id) : Date.parse(timestamp),
    name: sanitizeText(input.name, FEEDBACK_LIMITS.name) || 'Cliente',
    rating, comment, timestamp,
    userProfileId: normalizeEmail(input.userProfileId),
    items,
    verified: items.length > 0
  };
}

function readFeedbacks() { return readRawFeedbacks().map(normalizeFeedback).filter(Boolean); }

export async function getFeedbacks() {
  return readFeedbacks();
}

// Produtos que a conta pode avaliar: itens de pedidos entregues dela. Cada (pedido, produto) e avaliado uma unica vez.
export function getEligibleProducts(orders, feedbacks, email) {
  const account = normalizeEmail(email);
  if (!account) return [];
  const reviewed = new Set(feedbacks
    .filter(feedback => feedback.userProfileId === account)
    .flatMap(feedback => feedback.items.map(item => `${item.orderNumber}|${getProductKey(item)}`)));
  const eligible = new Map();
  orders
    .filter(order => order.userProfileId === account && order.status === ORDER_STATUS.DELIVERED)
    .forEach(order => order.items.forEach(item => {
      const key = `${order.orderNumber}|${getProductKey(item)}`;
      if (!eligible.has(key)) eligible.set(key, { key, orderNumber: order.orderNumber, productId: item.id, name: item.name, orderedAt: order.createdAt, reviewed: reviewed.has(key) });
    }));
  return [...eligible.values()].sort((a, b) => (Date.parse(b.orderedAt) || 0) - (Date.parse(a.orderedAt) || 0));
}

// Contexto do formulario: conta logada (ou null) e produtos elegiveis.
export async function getReviewContext() {
  const session = readSession();
  if (!session) return { account: null, eligible: [] };
  const eligible = getEligibleProducts(await getOrders(), readFeedbacks(), session.email);
  const profile = getCurrentProfile() || {};
  return { account: { email: session.email, name: sanitizeText(profile.name || session.name, FEEDBACK_LIMITS.name) }, eligible };
}

export async function publishFeedback({ rating, comment, productKeys = [] } = {}) {
  const session = readSession();
  if (!session) throw new AppError('Entre na sua conta para avaliar seus pedidos.');
  const profile = getCurrentProfile() || {};
  const name = sanitizeText(profile.name || session.name, FEEDBACK_LIMITS.name);
  const errors = validateFeedback({ name, rating, comment });
  if (errors.length) throw new AppError(errors[0]);
  const keys = [...new Set((Array.isArray(productKeys) ? productKeys : []).map(String))];
  if (!keys.length) throw new AppError('Selecione ao menos um produto para avaliar.');
  if (keys.length > FEEDBACK_LIMITS.products) throw new AppError(`Avalie até ${FEEDBACK_LIMITS.products} produtos por vez.`);

  // Recarrega pedidos e avaliacoes: outra aba pode ter avaliado o mesmo produto.
  const eligible = new Map(getEligibleProducts(await getOrders(), readFeedbacks(), session.email).map(item => [item.key, item]));
  const selected = keys.map(key => eligible.get(key));
  if (selected.some(item => !item)) throw new AppError('Só é possível avaliar produtos de pedidos entregues da sua conta.');
  const repeated = selected.find(item => item.reviewed);
  if (repeated) throw new AppError(`Você já avaliou ${repeated.name} do pedido ${repeated.orderNumber}.`);

  const record = {
    id: Date.now(),
    name,
    rating: Number(rating),
    comment: sanitizeText(comment, FEEDBACK_LIMITS.comment),
    timestamp: new Date().toISOString(),
    userProfileId: session.email,
    items: selected.map(item => ({ orderNumber: item.orderNumber, productId: item.productId, name: sanitizeText(item.name, FEEDBACK_LIMITS.productName) })),
    // Campos planos para consultas simples (e futura API).
    productIds: selected.map(item => item.productId).filter(id => id !== null),
    productNames: selected.map(item => sanitizeText(item.name, FEEDBACK_LIMITS.productName))
  };
  try { writeJSON(FEEDBACK_STORAGE_KEY, [record, ...readRawFeedbacks()]); }
  catch (error) { throw new AppError('Não foi possível salvar sua avaliação. Tente novamente.', { cause: error }); }
  return normalizeFeedback(record);
}

export { FEEDBACK_STORAGE_KEY };
