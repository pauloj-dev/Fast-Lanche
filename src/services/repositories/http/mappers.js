// Conversao entre o contrato da API (docs/api/openapi.yaml) e os modelos usados pela interface (Fase 44).
// Na API: valores monetarios em centavos (inteiros), datas ISO 8601 em UTC, status em slug ("payment-confirmed").
// Na interface: reais e os mesmos normalizadores do modo local, entao as paginas recebem exatamente o mesmo formato.
import { normalizeMenuItem } from '../local/menuLocal.js';
import { normalizeOrder } from '../local/orderLocal.js';
import { normalizeBooking } from '../local/bookingLocal.js';
import { normalizeFeedback } from '../local/feedbackLocal.js';
import { normalizeProfile } from '../local/profileLocal.js';

export const centsToReais = cents => Math.round(Number(cents) || 0) / 100;
export const reaisToCents = reais => Math.round((Number(reais) || 0) * 100);

export const fromApiProduct = dto => normalizeMenuItem({ ...dto, price: centsToReais(dto?.priceCents) });

export function fromApiUser(dto) {
  if (!dto?.email) return { session: null, profile: null };
  const email = String(dto.email).toLowerCase();
  const session = { email, name: dto.name || '', loginAt: dto.sessionStartedAt || new Date().toISOString() };
  const profile = normalizeProfile({ ...dto, avatar: dto.avatarUrl || '' }, email);
  return { session, profile };
}

export function fromApiOrder(dto) {
  if (!dto) return null;
  return normalizeOrder({
    ...dto,
    items: (dto.items || []).map(item => ({ id: item.productId, name: item.name, price: centsToReais(item.unitPriceCents), quantity: item.quantity, customization: item.customization ?? null })),
    paymentMethod: dto.payment?.method,
    paymentStatus: dto.payment?.status,
    userProfileId: dto.accountEmail || ''
  });
}

export const fromApiBooking = dto => (dto ? normalizeBooking({ ...dto, fee: centsToReais(dto.feeCents), paymentMethod: dto.payment?.method, paymentStatus: dto.payment?.status, userProfileId: dto.accountEmail || '' }) : null);

export const fromApiReview = dto => normalizeFeedback({ ...dto, timestamp: dto?.createdAt, userProfileId: dto?.authorEmail || '' });

export const toApiOrderItems = cart => cart.items.map(item => ({ productId: item.id, quantity: item.quantity, customization: item._customization ?? null }));
