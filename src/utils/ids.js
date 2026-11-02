// Identificadores (Fase 41): um gerador para pedidos, reservas e linhas do carrinho. Usa crypto quando disponivel.
const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function randomCode(length = 4) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  return [...bytes].map(byte => ALPHABET[byte % ALPHABET.length]).join('');
}

// FL-MVYI69F5-VED0: prefixo do pedido, instante em base 36 e sufixo aleatorio.
export const createOrderNumber = (now = Date.now()) => `FL-${now.toString(36).toUpperCase()}-${randomCode(4)}`;
// RS-20261105-K3F9: data da reserva e sufixo aleatorio.
export const createBookingNumber = date => `RS-${String(date).replace(/-/g, '')}-${randomCode(4)}`;
// 12_mvyi69f5k3: linha do carrinho (mesmo formato aceito por js/cart.js).
export const createCartLineId = (productId, now = Date.now()) => `${productId}_${now.toString(36)}${randomCode(2).toLowerCase()}`;
