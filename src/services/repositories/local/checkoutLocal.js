import { ORDER_STATUS, buildOrder, createOrder, setLastOrderReference } from './orderLocal.js';
import { validateCheckout } from '../../../utils/businessRules.js';
import { AppError, reportError } from '../../../utils/errors.js';

export const PAYMENT_DELAY_MS = 400;

// Pagamento simulado: aprova, exceto quando `simulateFailure` pede a recusa (opcao de demonstracao da pagina,
// igual a da reserva). Substituivel por um gateway real mantendo o mesmo retorno.
export async function simulatePayment({ method, simulateFailure = false }, delay = PAYMENT_DELAY_MS) {
  await new Promise(resolve => setTimeout(resolve, delay));
  return { status: simulateFailure ? 'declined' : 'approved', method };
}

export function getReceiptUrl(orderNumber) { return `receipt.html?order=${encodeURIComponent(orderNumber)}`; }

// Fluxo completo do checkout: valida -> paga -> grava o pedido -> guarda a referencia.
// So cria pedido quando a validacao passa e o pagamento e aprovado; a pagina limpa o carrinho com o retorno.
export async function placeOrder({ data, cart, accountEmail = '', processPayment = simulatePayment }) {
  const errors = validateCheckout(data, cart.items.length);
  if (errors.length) throw new AppError(errors[0]);
  const payment = await processPayment({ method: data.payment, total: cart.total, simulateFailure: data['simulate-failure'] === 'on' });
  if (payment?.status !== 'approved') throw new AppError('Pagamento recusado. Nenhum pedido foi criado; tente outra forma de pagamento.');
  const order = await createOrder(buildOrder({
    customer: { name: data.name, email: data.email, phone: data.phone, address: data.address, document: data.document || '' },
    items: cart.items,
    userProfileId: accountEmail,
    paymentMethod: data.payment,
    paymentStatus: payment.status,
    status: ORDER_STATUS.RECEIVED,
    createdAt: new Date().toISOString()
  }));
  // O pedido ja foi gravado: a falha ao guardar a referencia nao pode gerar um segundo pedido no reenvio,
  // e o comprovante recebe o numero pela URL de qualquer forma.
  try { setLastOrderReference(order.orderNumber); } catch (error) { reportError('referencia do ultimo pedido', error); }
  return order;
}
