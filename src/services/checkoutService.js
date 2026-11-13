// Fachada do checkout (Fase 44): o fluxo valida -> paga -> cria o pedido no repositorio (local ou API).
import { getRepository } from './repositories/index.js';

export * from './repositories/local/checkoutLocal.js';

export const placeOrder = input => getRepository('orders').placeOrder(input);
export const getReceiptUrl = orderNumber => getRepository('orders').getReceiptUrl(orderNumber);
