// Fachada de pedidos (Fase 44): consulta do comprovante pelo repositorio; modelo, status e rotulos valem nos dois
// modos. Leituras diretas (getOrders, createOrder) seguem disponiveis para o modo local e para os testes.
import { getRepository } from './repositories/index.js';

export * from './repositories/local/orderLocal.js';

export const getOrderForViewer = orderNumber => getRepository('orders').getOrderForViewer(orderNumber);
