export const DELIVERY_FEE = 6;
export const FREE_DELIVERY_MINIMUM = 50;
export const MAX_GUESTS = 12;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;
import {
  FIELD_LIMITS, checkTextLength, isValidAddress, isValidDateString, isValidDocument, isValidEmail, isValidPhone,
  normalizeEmail, sanitizeDeep, sanitizeText
} from './validation.js';

// Reexportados: regras e services continuam importando daqui.
export { FIELD_LIMITS, isValidEmail, normalizeEmail, sanitizeDeep, sanitizeText };

export const calculateSubtotal = items => items.reduce(
  (sum, item) => sum + Math.max(Number(item.price) || 0, 0) * Math.max(Number(item.quantity) || 0, 0), 0
);

export const calculateDeliveryFee = subtotal => (
  subtotal > 0 && subtotal < FREE_DELIVERY_MINIMUM ? DELIVERY_FEE : 0
);

export const calculateTotal = (subtotal, deliveryFee) => Math.max(subtotal + deliveryFee, 0);

// Cada linha do carrinho e identificada por `cartItemId` (mesmo contrato do js/cart.js legado):
// o mesmo produto pode aparecer em linhas diferentes quando tem personalizacoes distintas.
const MAX_CART_LINES = 50;
const MAX_ITEM_PRICE = 10000;
const PRODUCT_IMAGE_PATTERN = /^(\.\.\/)?assets\/products\/[\w-]+\.(png|jpe?g|webp|svg)$/;

// Carrinho vindo do localStorage (React ou js/cart.js): somente os campos conhecidos, com texto sanitizado e
// numeros limitados. Campos desconhecidos sao descartados.
export function normalizeCart(items = []) {
  const usedLineIds = new Set();
  const safeItems = (Array.isArray(items) ? items : []).slice(0, MAX_CART_LINES)
    .filter(item => item && typeof item === 'object' && item.id !== null && item.id !== '' && Number.isFinite(Number(item.id)) && Number.isFinite(Number(item.price)))
    .map((item, index) => {
      let cartItemId = typeof item.cartItemId === 'string' && /^[\w-]{1,60}$/.test(item.cartItemId) ? item.cartItemId : String(Number(item.id));
      if (usedLineIds.has(cartItemId)) cartItemId = `${cartItemId}_${index}`;
      usedLineIds.add(cartItemId);
      const maxQuantity = Math.min(Math.max(Math.floor(Number(item.maxQuantity)) || 99, 1), 99);
      const line = {
        cartItemId,
        id: Number(item.id),
        name: sanitizeText(item.name, FIELD_LIMITS.productName) || 'Item',
        price: Math.min(Math.max(Number(item.price), 0), MAX_ITEM_PRICE),
        quantity: Math.min(Math.max(Math.floor(Number(item.quantity)) || 1, 1), maxQuantity),
        maxQuantity
      };
      if (item.unitPrice !== undefined && Number.isFinite(Number(item.unitPrice))) line.unitPrice = Math.min(Math.max(Number(item.unitPrice), 0), MAX_ITEM_PRICE);
      if (typeof item.category === 'string') line.category = sanitizeText(item.category, FIELD_LIMITS.category);
      if (typeof item.image === 'string' && PRODUCT_IMAGE_PATTERN.test(item.image)) line.image = item.image;
      if ('_customization' in item) line._customization = item._customization && typeof item._customization === 'object' ? sanitizeDeep(item._customization) : null;
      return line;
    });
  const subtotal = calculateSubtotal(safeItems);
  const deliveryFee = calculateDeliveryFee(subtotal);
  return { items: safeItems, subtotal, deliveryFee, total: calculateTotal(subtotal, deliveryFee) };
}

export function validateCheckout(data, itemCount) {
  const errors = [];
  if (!itemCount) errors.push('Adicione pelo menos um item ao carrinho.');
  const name = checkTextLength(data.name, { min: 3, max: FIELD_LIMITS.name });
  if (name) errors.push(name === 'too_long' ? `O nome pode ter até ${FIELD_LIMITS.name} caracteres.` : 'Informe seu nome completo.');
  if (!isValidPhone(data.phone)) errors.push('Informe um telefone valido com DDD.');
  if (!isValidEmail(data.email)) errors.push('Informe um e-mail valido.');
  if (!isValidAddress(data.address)) errors.push('Informe um endereco de entrega valido (rua, numero e bairro).');
  if (!['pix', 'card', 'cash'].includes(data.payment)) errors.push('Selecione uma forma de pagamento.');
  if (String(data.document || '').trim() && !isValidDocument(data.document)) errors.push('CPF/CNPJ invalido. Confira os numeros digitados.');
  return errors;
}

export function validateFeedback({ name, rating, comment }) {
  const errors = [];
  if (sanitizeText(name, FEEDBACK_LIMITS.name).length < 2) errors.push('Por favor, insira seu nome.');
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) errors.push('Escolha uma nota de 1 a 5 estrelas.');
  const commentLength = String(comment || '').trim().length;
  if (commentLength < FEEDBACK_LIMITS.commentMin) errors.push(`O comentário deve ter pelo menos ${FEEDBACK_LIMITS.commentMin} caracteres.`);
  else if (commentLength > FEEDBACK_LIMITS.comment) errors.push(`O comentário pode ter até ${FEEDBACK_LIMITS.comment} caracteres.`);
  return errors;
}

export const calculateAverageRating = feedbacks => feedbacks.length
  ? feedbacks.reduce((sum, feedback) => sum + Number(feedback.rating || 0), 0) / feedbacks.length
  : 0;

export function validateLogin({ email, password } = {}) {
  if (!String(email || '').trim() || !password) return ['Preencha e-mail e senha.'];
  const errors = [];
  if (String(password).length > MAX_PASSWORD_LENGTH) return ['E-mail ou senha incorretos.'];
  if (!isValidEmail(email)) errors.push('Informe um e-mail valido.');
  if (String(password).length < MIN_PASSWORD_LENGTH) errors.push(`A senha deve ter no minimo ${MIN_PASSWORD_LENGTH} caracteres.`);
  return errors;
}

export function validateSignup({ name, email, password, confirmPassword, phone } = {}) {
  const errors = [];
  const nameCheck = checkTextLength(name, { min: 3, max: FIELD_LIMITS.name });
  if (nameCheck) errors.push(nameCheck === 'too_long' ? `O nome pode ter até ${FIELD_LIMITS.name} caracteres.` : 'O nome deve ter pelo menos 3 caracteres.');
  if (!isValidEmail(email)) errors.push('Informe um e-mail valido.');
  if (String(password || '').length < MIN_PASSWORD_LENGTH) errors.push(`A senha deve ter no minimo ${MIN_PASSWORD_LENGTH} caracteres.`);
  else if (String(password).length > MAX_PASSWORD_LENGTH) errors.push(`A senha pode ter até ${MAX_PASSWORD_LENGTH} caracteres.`);
  else if (password !== confirmPassword) errors.push('As senhas nao coincidem.');
  if (String(phone || '').trim() && !isValidPhone(phone)) errors.push('Informe um telefone valido com DDD.');
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


export function getInitials(name, fallback = '?') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return String(fallback || '?').charAt(0).toUpperCase() || '?';
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}` : parts[0][0]).toUpperCase();
}

export function validateProfile({ name, phone, address, paymentMethod } = {}) {
  const errors = [];
  if (sanitizeText(name, PROFILE_LIMITS.name).length < 3) errors.push('O nome deve ter pelo menos 3 caracteres.');
  if (String(name || '').trim().length > PROFILE_LIMITS.name) errors.push(`O nome pode ter até ${PROFILE_LIMITS.name} caracteres.`);
  if (String(phone || '').trim() && !isValidPhone(phone)) errors.push('Informe um telefone valido com DDD.');
  if (String(address || '').trim() && !isValidAddress(address)) errors.push('Informe um endereco valido (minimo 8 caracteres, com rua e numero).');
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

// Reservas (Fase 38). Salao fixo: cada reserva ocupa uma mesa inteira durante BOOKING_DURATION_MINUTES.
export const BOOKING_TABLES = Object.freeze([
  { id: 'M1', seats: 2 }, { id: 'M2', seats: 2 }, { id: 'M3', seats: 2 }, { id: 'M4', seats: 2 },
  { id: 'M5', seats: 4 }, { id: 'M6', seats: 4 }, { id: 'M7', seats: 4 }, { id: 'M8', seats: 4 }, { id: 'M9', seats: 4 }, { id: 'M10', seats: 4 },
  { id: 'M11', seats: 6 }, { id: 'M12', seats: 6 }, { id: 'M13', seats: 6 },
  { id: 'M14', seats: 8 }, { id: 'M15', seats: 8 },
  { id: 'M16', seats: 12 }
].map(Object.freeze));
export const BOOKING_TOTAL_SEATS = BOOKING_TABLES.reduce((sum, table) => sum + table.seats, 0);
export const BOOKING_OPENING = '11:00';
export const BOOKING_CLOSING = '23:00';
// Ultima entrada as 22:00: a mesa precisa ficar livre antes do fechamento.
export const BOOKING_LAST_SLOT = '22:00';
export const BOOKING_SLOT_MINUTES = 30;
export const BOOKING_DURATION_MINUTES = 90;
export const BOOKING_MAX_DAYS_AHEAD = 60;
// Taxa fixa por reserva, abatida da conta no dia.
export const BOOKING_FEE = 20;
export const BOOKING_PAYMENT_METHODS = Object.freeze(['pix', 'card']);
export const BOOKING_OCCASIONS = Object.freeze([
  ['', 'Sem ocasião', '🍽️'], ['aniversario', 'Aniversário', '🎂'], ['romantico', 'Jantar a dois', '💛'],
  ['negocios', 'Negócios', '💼'], ['familia', 'Família', '👨‍👩‍👧'], ['amigos', 'Amigos', '🍻']
].map(Object.freeze));
export const BOOKING_NOTES_MAX = 200;

const toMinutes = time => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
};
const toTime = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export const toLocalDateString = (date = new Date()) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export function getBookingSlots() {
  const slots = [];
  for (let minutes = toMinutes(BOOKING_OPENING); minutes <= toMinutes(BOOKING_LAST_SLOT); minutes += BOOKING_SLOT_MINUTES) slots.push(toTime(minutes));
  return slots;
}

export const calculateBookingFee = () => BOOKING_FEE;

export function validateBooking(date, time, guests, today = new Date()) {
  const errors = [];
  const currentDate = toLocalDateString(today);
  if (!date || !isValidDateString(date)) errors.push('Selecione uma data válida para a reserva.');
  else if (date < currentDate) errors.push('A data da reserva não pode ser no passado.');
  else if (date > toLocalDateString(addDays(today, BOOKING_MAX_DAYS_AHEAD))) errors.push(`Reservas podem ser feitas com até ${BOOKING_MAX_DAYS_AHEAD} dias de antecedência.`);
  if (!time) errors.push('Selecione um horário para a reserva.');
  else if (!getBookingSlots().includes(time)) errors.push(`Escolha um horário entre ${BOOKING_OPENING} e ${BOOKING_LAST_SLOT}, a cada ${BOOKING_SLOT_MINUTES} minutos.`);
  else if (date === currentDate && toMinutes(time) <= today.getHours() * 60 + today.getMinutes()) errors.push('Este horário já passou. Escolha um horário futuro.');
  if (!Number.isInteger(Number(guests)) || Number(guests) < 1 || Number(guests) > MAX_GUESTS) errors.push(`O número de pessoas deve ser de 1 a ${MAX_GUESTS}.`);
  return errors;
}

export function validateBookingContact({ name, phone, paymentMethod, occasion = '', notes = '' } = {}) {
  const errors = [];
  if (!BOOKING_OCCASIONS.some(([value]) => value === occasion)) errors.push('Ocasião inválida.');
  if (String(notes || '').trim().length > BOOKING_NOTES_MAX) errors.push(`As observações podem ter até ${BOOKING_NOTES_MAX} caracteres.`);
  if (sanitizeText(name, PROFILE_LIMITS.name).length < 3) errors.push('Informe o nome de quem fará a reserva.');
  if (String(name || '').trim().length > PROFILE_LIMITS.name) errors.push(`O nome pode ter até ${PROFILE_LIMITS.name} caracteres.`);
  if (!isValidPhone(phone)) errors.push('Informe um telefone válido com DDD.');
  if (!BOOKING_PAYMENT_METHODS.includes(paymentMethod)) errors.push('Selecione como pagar a taxa de reserva.');
  return errors;
}

// Reservas que disputam a mesma mesa: mesmo dia e janelas de BOOKING_DURATION_MINUTES sobrepostas.
export function bookingsOverlap(a, b) {
  if (a.date !== b.date) return false;
  const start = toMinutes(a.time);
  const other = toMinutes(b.time);
  return Number.isFinite(start) && Number.isFinite(other) && Math.abs(start - other) < BOOKING_DURATION_MINUTES;
}

// Mesas ocupadas no horario. Reservas sem mesa (gravadas pelo legado) recebem a menor mesa livre que as comporte,
// para continuarem contando na capacidade.
export function getOccupiedTables(bookings, date, time, tables = BOOKING_TABLES) {
  const overlapping = bookings.filter(booking => bookingsOverlap(booking, { date, time }));
  const occupied = new Set(overlapping.map(booking => booking.tableId).filter(id => tables.some(table => table.id === id)));
  overlapping
    .filter(booking => !occupied.has(booking.tableId))
    .sort((a, b) => b.guests - a.guests)
    .forEach(booking => {
      const table = tables.filter(candidate => !occupied.has(candidate.id) && candidate.seats >= booking.guests).sort((a, b) => a.seats - b.seats)[0];
      if (table) occupied.add(table.id);
    });
  return occupied;
}

// Menor mesa livre que comporte o grupo, ou null quando o horario esta lotado para esse tamanho.
export function allocateTable(bookings, { date, time, guests }, tables = BOOKING_TABLES) {
  const occupied = getOccupiedTables(bookings, date, time, tables);
  return tables.filter(table => !occupied.has(table.id) && table.seats >= Number(guests)).sort((a, b) => a.seats - b.seats)[0] || null;
}

// Situacao de cada horario do dia para o tamanho do grupo: livre, poucas mesas, lotado ou ja passou.
export function getDayAvailability(bookings, date, guests, now = new Date(), tables = BOOKING_TABLES) {
  const isToday = date === toLocalDateString(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return getBookingSlots().map(time => {
    if (isToday && toMinutes(time) <= nowMinutes) return { time, status: 'past', freeTables: 0 };
    const occupied = getOccupiedTables(bookings, date, time, tables);
    const freeTables = tables.filter(table => !occupied.has(table.id) && table.seats >= Number(guests)).length;
    return { time, status: freeTables === 0 ? 'full' : freeTables <= 2 ? 'few' : 'available', freeTables };
  });
}

// Proximos dias para a faixa de escolha rapida de data.
export function getUpcomingBookingDates(now = new Date(), count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(now, index);
    return {
      date: toLocalDateString(date),
      label: index === 0 ? 'Hoje' : index === 1 ? 'Amanhã' : date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      day: String(date.getDate()).padStart(2, '0'),
      month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    };
  });
}

// Feedbacks (Fase 39). Limites aplicados na validacao e de novo ao carregar do armazenamento.
export const FEEDBACK_LIMITS = Object.freeze({ name: 80, comment: 1000, commentMin: 10, productName: 80, products: 10 });
export const FEEDBACK_SORTS = Object.freeze([['recent', 'Mais recentes'], ['best', 'Melhor nota'], ['worst', 'Pior nota']]);

// Chave do produto avaliado: id do cardapio quando existe, senao o nome normalizado (itens antigos sem id).
export function getProductKey(item) {
  const rawId = item?.productId ?? item?.id;
  const hasId = rawId !== null && rawId !== undefined && rawId !== '' && Number.isFinite(Number(rawId));
  return hasId ? `p${Number(rawId)}` : `n:${sanitizeText(item?.name, FEEDBACK_LIMITS.productName).toLowerCase()}`;
}

const roundAverage = value => Math.round(value * 10) / 10;

// Media geral, contagem e distribuicao por estrela (5 a 1).
export function summarizeRatings(feedbacks) {
  const distribution = [5, 4, 3, 2, 1].map(stars => ({ stars, count: feedbacks.filter(item => Number(item.rating) === stars).length }));
  return { average: roundAverage(calculateAverageRating(feedbacks)), count: feedbacks.length, distribution };
}

// Media por produto avaliado, da maior para a menor quantidade de avaliacoes.
export function calculateProductAverages(feedbacks) {
  const products = new Map();
  feedbacks.forEach(feedback => (feedback.items || []).forEach(item => {
    const key = getProductKey(item);
    const entry = products.get(key) || { key, name: item.name, total: 0, count: 0 };
    entry.total += Number(feedback.rating) || 0;
    entry.count += 1;
    products.set(key, entry);
  }));
  return [...products.values()]
    .map(({ total, ...entry }) => ({ ...entry, average: roundAverage(total / entry.count) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
}

// Busca e filtros combinaveis. Retorna uma nova lista: os dados persistidos nao sao alterados.
export function filterFeedbacks(feedbacks, { query = '', productKey = '', rating = 0, sort = 'recent' } = {}) {
  const terms = sanitizeText(query, 80).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ').filter(Boolean);
  const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const time = item => Date.parse(item.timestamp) || 0;
  const sorters = {
    recent: (a, b) => time(b) - time(a),
    best: (a, b) => b.rating - a.rating || time(b) - time(a),
    worst: (a, b) => a.rating - b.rating || time(b) - time(a)
  };
  return feedbacks
    .filter(item => !rating || Number(item.rating) === Number(rating))
    .filter(item => !productKey || (item.items || []).some(product => getProductKey(product) === productKey))
    .filter(item => {
      if (!terms.length) return true;
      const haystack = normalize([item.name, item.comment, ...(item.items || []).map(product => product.name)].join(' '));
      return terms.every(term => haystack.includes(term));
    })
    .sort(sorters[sort] || sorters.recent);
}
