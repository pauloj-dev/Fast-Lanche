export const DELIVERY_FEE = 6;
export const FREE_DELIVERY_MINIMUM = 50;
export const MAX_GUESTS = 12;

export const calculateSubtotal = items => items.reduce(
  (sum, item) => sum + Math.max(Number(item.price) || 0, 0) * Math.max(Number(item.quantity) || 0, 0), 0
);

export const calculateDeliveryFee = subtotal => (
  subtotal > 0 && subtotal < FREE_DELIVERY_MINIMUM ? DELIVERY_FEE : 0
);

export const calculateTotal = (subtotal, deliveryFee) => Math.max(subtotal + deliveryFee, 0);

export function normalizeCart(items = []) {
  const safeItems = items.filter(item => item && Number.isFinite(Number(item.id)) && Number.isFinite(Number(item.price)))
    .map(item => ({
      ...item,
      id: Number(item.id),
      price: Math.max(Number(item.price), 0),
      quantity: Math.min(Math.max(Number(item.quantity) || 1, 1), Number(item.maxQuantity) || 99),
      maxQuantity: Number(item.maxQuantity) || 99
    }));
  const subtotal = calculateSubtotal(safeItems);
  const deliveryFee = calculateDeliveryFee(subtotal);
  return { items: safeItems, subtotal, deliveryFee, total: calculateTotal(subtotal, deliveryFee) };
}

export function validateCheckout(data, itemCount) {
  const errors = [];
  const digits = String(data.phone || '').replace(/\D/g, '');
  if (!itemCount) errors.push('Adicione pelo menos um item ao carrinho.');
  if (String(data.name || '').trim().length < 3) errors.push('Informe seu nome completo.');
  if (digits.length < 10 || digits.length > 11) errors.push('Informe um telefone valido.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email || '').trim())) errors.push('Informe um e-mail valido.');
  if (String(data.address || '').trim().length < 8) errors.push('Informe um endereco de entrega valido.');
  if (!data.payment) errors.push('Selecione uma forma de pagamento.');
  const documentDigits = String(data.document || '').replace(/\D/g, '');
  if (data.document && ![11, 14].includes(documentDigits.length)) errors.push('CPF/CNPJ deve ter 11 ou 14 digitos.');
  return errors;
}

export function validateBooking(date, time, guests, today = new Date()) {
  const errors = [];
  const currentDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  if (!date) errors.push('Selecione uma data para a reserva.');
  else if (date < currentDate) errors.push('A data da reserva não pode ser no passado.');
  if (!time) errors.push('Selecione um horário para a reserva.');
  else if (time < '11:00' || time > '23:00') errors.push('O horário deve estar entre 11:00 e 23:00.');
  if (!Number.isInteger(Number(guests)) || Number(guests) < 1 || Number(guests) > MAX_GUESTS) errors.push('O número de pessoas deve ser de 1 a 12.');
  return errors;
}

export function validateFeedback({ name, rating, comment }) {
  const errors = [];
  if (String(name || '').trim().length < 2) errors.push('Por favor, insira seu nome.');
  if (!Number.isFinite(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) errors.push('A nota deve ser entre 1 e 5.');
  if (String(comment || '').trim().length < 10) errors.push('O comentario deve conter pelo menos 10 caracteres.');
  return errors;
}

export const calculateAverageRating = feedbacks => feedbacks.length
  ? feedbacks.reduce((sum, feedback) => sum + Number(feedback.rating || 0), 0) / feedbacks.length
  : 0;
