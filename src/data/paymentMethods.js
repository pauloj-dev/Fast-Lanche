// Formas de pagamento (Fase 41): catalogo unico para checkout, reserva, perfil, comprovantes e validacoes.
export const PAYMENT_METHODS = Object.freeze([
  { value: 'pix', icon: '⚡', label: 'Pix', fullLabel: 'Pix', hint: 'Aprovação na hora' },
  { value: 'card', icon: '💳', label: 'Cartão', fullLabel: 'Cartão de crédito/débito', hint: 'Crédito ou débito' },
  { value: 'cash', icon: '💵', label: 'Dinheiro', fullLabel: 'Dinheiro', hint: 'Pague na entrega' }
].map(Object.freeze));

// Onde cada forma vale: dinheiro so na entrega; a taxa de reserva e paga online.
export const CHECKOUT_PAYMENT_METHODS = Object.freeze(['pix', 'card', 'cash']);
export const BOOKING_PAYMENT_METHODS = Object.freeze(['pix', 'card']);
// Preferencia do perfil: '' = decidir no checkout.
export const PROFILE_PAYMENT_METHODS = Object.freeze(['', ...CHECKOUT_PAYMENT_METHODS]);
export const NO_PAYMENT_PREFERENCE = Object.freeze({ value: '', icon: '🤔', label: 'Decidir depois', fullLabel: 'Não definido', hint: 'Escolho no checkout' });

export const getPaymentOptions = values => values.map(value => (value === '' ? NO_PAYMENT_PREFERENCE : PAYMENT_METHODS.find(method => method.value === value)));
export const getPaymentLabel = method => PAYMENT_METHODS.find(item => item.value === method)?.fullLabel || 'Não informado';
