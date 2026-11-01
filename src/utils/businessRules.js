export const DELIVERY_FEE = 6;
export const FREE_DELIVERY_MINIMUM = 50;
export const MAX_GUESTS = 12;
export const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = value => String(value || '').trim().toLowerCase();
export const isValidEmail = value => EMAIL_PATTERN.test(normalizeEmail(value));

export const calculateSubtotal = items => items.reduce(
  (sum, item) => sum + Math.max(Number(item.price) || 0, 0) * Math.max(Number(item.quantity) || 0, 0), 0
);

export const calculateDeliveryFee = subtotal => (
  subtotal > 0 && subtotal < FREE_DELIVERY_MINIMUM ? DELIVERY_FEE : 0
);

export const calculateTotal = (subtotal, deliveryFee) => Math.max(subtotal + deliveryFee, 0);

// Cada linha do carrinho e identificada por `cartItemId` (mesmo contrato do js/cart.js legado):
// o mesmo produto pode aparecer em linhas diferentes quando tem personalizacoes distintas.
export function normalizeCart(items = []) {
  const usedLineIds = new Set();
  const safeItems = (Array.isArray(items) ? items : []).filter(item => item && Number.isFinite(Number(item.id)) && Number.isFinite(Number(item.price)))
    .map((item, index) => {
      let cartItemId = typeof item.cartItemId === 'string' && item.cartItemId ? item.cartItemId : String(Number(item.id));
      if (usedLineIds.has(cartItemId)) cartItemId = `${cartItemId}_${index}`;
      usedLineIds.add(cartItemId);
      const maxQuantity = Math.max(Math.floor(Number(item.maxQuantity)) || 99, 1);
      return {
        ...item,
        cartItemId,
        id: Number(item.id),
        price: Math.max(Number(item.price), 0),
        quantity: Math.min(Math.max(Math.floor(Number(item.quantity)) || 1, 1), maxQuantity),
        maxQuantity
      };
    });
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
  if (!isValidEmail(data.email)) errors.push('Informe um e-mail valido.');
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

export function validateLogin({ email, password } = {}) {
  if (!String(email || '').trim() || !password) return ['Preencha e-mail e senha.'];
  const errors = [];
  if (!isValidEmail(email)) errors.push('Informe um e-mail valido.');
  if (String(password).length < MIN_PASSWORD_LENGTH) errors.push(`A senha deve ter no minimo ${MIN_PASSWORD_LENGTH} caracteres.`);
  return errors;
}

export function validateSignup({ name, email, password, confirmPassword, phone } = {}) {
  const errors = [];
  if (String(name || '').trim().length < 3) errors.push('O nome deve ter pelo menos 3 caracteres.');
  if (!isValidEmail(email)) errors.push('Informe um e-mail valido.');
  if (String(password || '').length < MIN_PASSWORD_LENGTH) errors.push(`A senha deve ter no minimo ${MIN_PASSWORD_LENGTH} caracteres.`);
  else if (password !== confirmPassword) errors.push('As senhas nao coincidem.');
  const phoneDigits = String(phone || '').replace(/\D/g, '');
  if (String(phone || '').trim() && (phoneDigits.length < 10 || phoneDigits.length > 11)) errors.push('Informe um telefone valido com DDD.');
  return errors;
}

// Perfil (Fase 37). Os limites seguem js/security.js (sanitizeProfileData) para os dois fluxos aceitarem os mesmos dados.
export const PROFILE_LIMITS = Object.freeze({ name: 80, phone: 20, address: 200 });
export const PROFILE_PAYMENT_METHODS = Object.freeze(['', 'pix', 'card', 'cash']);
export const AVATAR_ACCEPTED_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
export const AVATAR_MAX_FILE_BYTES = 2 * 1024 * 1024;
// Avatar ja reduzido, guardado como data URL no perfil e na conta: precisa caber com folga na cota do localStorage.
export const AVATAR_MAX_DATA_URL_LENGTH = 300 * 1024;
const AVATAR_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/]+=*$/i;

// Texto livre de formulario: sem tags, sem caracteres de controle, espacos colapsados e tamanho limitado.
export const sanitizeText = (value, maxLength) => String(value ?? '')
  .replace(/[<>]/g, '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

export function getInitials(name, fallback = '?') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return String(fallback || '?').charAt(0).toUpperCase() || '?';
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}` : parts[0][0]).toUpperCase();
}

export function validateProfile({ name, phone, address, paymentMethod } = {}) {
  const errors = [];
  if (sanitizeText(name, PROFILE_LIMITS.name).length < 3) errors.push('O nome deve ter pelo menos 3 caracteres.');
  const phoneDigits = String(phone || '').replace(/\D/g, '');
  if (String(phone || '').trim() && (phoneDigits.length < 10 || phoneDigits.length > 11)) errors.push('Informe um telefone valido com DDD.');
  const cleanAddress = sanitizeText(address, PROFILE_LIMITS.address);
  if (cleanAddress && cleanAddress.length < 8) errors.push('Informe um endereco valido (minimo 8 caracteres).');
  if (!PROFILE_PAYMENT_METHODS.includes(paymentMethod ?? '')) errors.push('Forma de pagamento preferida invalida.');
  return errors;
}

// Valida o arquivo escolhido antes de le-lo. Retorna a mensagem de erro ou '' quando aceito.
export function validateAvatarFile(file) {
  if (!file || typeof file !== 'object') return 'Selecione uma imagem.';
  if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) return 'Formato nao suportado. Use PNG, JPG, WEBP ou GIF.';
  if (!(Number(file.size) > 0)) return 'O arquivo esta vazio.';
  if (Number(file.size) > AVATAR_MAX_FILE_BYTES) return 'A imagem deve ter no maximo 2 MB.';
  return '';
}

// Avatares enviados pela pagina legada (ate 2 MB sem redimensionar) continuam aceitos ao carregar, para nao perder a foto.
export const LEGACY_AVATAR_MAX_DATA_URL_LENGTH = Math.ceil(AVATAR_MAX_FILE_BYTES * 4 / 3) + 64;

export const isValidAvatarDataUrl = (value, maxLength = AVATAR_MAX_DATA_URL_LENGTH) => typeof value === 'string'
  && value.length <= maxLength
  && AVATAR_DATA_URL_PATTERN.test(value);
