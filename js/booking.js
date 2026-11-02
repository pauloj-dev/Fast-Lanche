// booking.js - reservas da pagina legada (pages-html/reservas.html).
// Usa os mesmos services e regras da pagina React (src/): mesas, disponibilidade, taxa, pagamento simulado e
// confirmacao sao identicos nas duas URLs. Todo dado do usuario e renderizado com textContent.
import { showToast } from './ui.js';
import { readSession } from '../src/services/authService.js';
import { getCheckoutDefaults } from '../src/services/profileService.js';
import {
  BOOKING_STORAGE_KEY, createBooking, getAvailability, getBookingForViewer, getBookingConfirmationUrl, getBookingHighlights,
  getBookingOccasionLabel, getBookingPaymentLabel, getBookingStatusLabel
} from '../src/services/bookingService.js';
import {
  BOOKING_DURATION_MINUTES, BOOKING_SLOT_LABELS, BOOKING_FEE, BOOKING_LAST_SLOT, BOOKING_MAX_DAYS_AHEAD, BOOKING_NOTES_MAX,
  BOOKING_OCCASIONS, BOOKING_OPENING, MAX_GUESTS, getUpcomingBookingDates, toLocalDateString
} from '../src/utils/businessRules.js';
import { formatCurrency, formatPeople as people, formatShortDate, formatWeekdayDate as formatLongDate } from '../src/utils/format.js';
import { subscribeToStorage } from '../src/services/storage/storageEvents.js';
import { getAccessMessage } from '../src/utils/access.js';
import { toUserMessage } from '../src/utils/errors.js';

const SLOT_HINTS = BOOKING_SLOT_LABELS;
const state = { date: toLocalDateString(), guests: 2, time: '', occasion: '', slots: [], pending: false };


function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function radioCard(className, name, value, checked, onChange, children) {
  const label = el('label', className);
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.checked = checked;
  input.addEventListener('change', onChange);
  label.append(input, ...children);
  return { label, input };
}

function setFeedback(message, status = '') {
  const feedback = document.getElementById('booking-feedback');
  feedback.textContent = message;
  feedback.dataset.status = status;
  feedback.setAttribute('role', status === 'error' ? 'alert' : 'status');
}

function renderHighlights() {
  const list = document.getElementById('booking-highlights');
  list.replaceChildren(...getBookingHighlights().map(([icon, title, text]) => {
    const item = el('li');
    const span = el('span', '', icon);
    span.setAttribute('aria-hidden', 'true');
    const body = el('div');
    body.append(el('strong', '', title), el('small', '', text));
    item.append(span, body);
    return item;
  }));
}

function renderDates() {
  const group = document.getElementById('booking-dates');
  const legend = group.querySelector('legend');
  const days = getUpcomingBookingDates(new Date(), 7);
  group.replaceChildren(legend, ...days.map(day => radioCard('booking-date', 'quick-date', day.date, state.date === day.date,
    () => selectDate(day.date), [el('small', '', day.label), el('strong', '', day.day), el('small', '', day.month)]).label));
  const otherDate = document.getElementById('booking-date');
  otherDate.value = state.date;
  otherDate.closest('.booking-other-date').classList.toggle('is-active', !days.some(day => day.date === state.date));
}

function renderOccasions() {
  const group = document.getElementById('booking-occasions');
  const legend = group.querySelector('legend');
  group.replaceChildren(legend, ...BOOKING_OCCASIONS.map(([value, label, icon]) => {
    const iconEl = el('span', '', icon);
    iconEl.setAttribute('aria-hidden', 'true');
    return radioCard('booking-chip', 'occasion', value, state.occasion === value, () => { state.occasion = value; renderSummary(); }, [iconEl, document.createTextNode(label)]).label;
  }));
}

function renderSlots() {
  const group = document.getElementById('booking-slots');
  const legend = group.querySelector('legend');
  // Horario selecionado que lotou (outra aba, troca de data/pessoas) e desmarcado.
  const selected = state.slots.find(slot => slot.time === state.time);
  if (state.time && selected && !['available', 'few'].includes(selected.status)) state.time = '';
  group.replaceChildren(legend, ...state.slots.map(slot => {
    const children = [el('strong', '', slot.time)];
    if (SLOT_HINTS[slot.status]) children.push(el('small', '', SLOT_HINTS[slot.status]));
    const { label, input } = radioCard(`booking-slot is-${slot.status}`, 'time', slot.time, state.time === slot.time, () => { state.time = slot.time; renderSummary(); }, children);
    input.disabled = slot.status === 'full' || slot.status === 'past';
    return label;
  }));
  const open = state.slots.filter(slot => slot.status === 'available' || slot.status === 'few').length;
  const hint = `${formatLongDate(state.date)} · ${people(state.guests)} · ${open ? `${open} ${open === 1 ? 'horário' : 'horários'} com mesa livre` : 'nenhum horário livre neste dia'}`;
  document.getElementById('booking-slot-hint').textContent = hint.charAt(0).toUpperCase() + hint.slice(1);
  renderSummary();
}

function renderSummary() {
  const selected = state.slots.find(slot => slot.time === state.time);
  const rows = [
    ['Data', formatShortDate(state.date)],
    ['Horário', state.time || 'Escolha um horário'],
    ['Pessoas', people(state.guests)],
    ...(state.occasion ? [['Ocasião', getBookingOccasionLabel(state.occasion)]] : []),
    ['Mesas livres', selected ? String(selected.freeTables) : '—'],
    ['Taxa de reserva', formatCurrency(BOOKING_FEE), 'booking-summary-total']
  ];
  document.getElementById('booking-summary-list').replaceChildren(...rows.map(([term, value, className]) => {
    const row = el('div', className);
    row.append(el('dt', '', term), el('dd', '', value));
    return row;
  }));
}

async function refreshSlots() {
  try { state.slots = await getAvailability(state.date, state.guests); }
  catch { state.slots = []; }
  renderSlots();
}

function selectDate(date) {
  state.date = date;
  state.time = '';
  renderDates();
  refreshSlots();
}

function setGuests(value) {
  state.guests = Math.min(MAX_GUESTS, Math.max(1, Math.floor(Number(value)) || 1));
  const input = document.getElementById('booking-guests');
  input.value = state.guests;
  const [minus, plus] = document.querySelectorAll('.booking-stepper button');
  minus.disabled = state.guests <= 1;
  plus.disabled = state.guests >= MAX_GUESTS;
  refreshSlots();
}

async function handleSubmit(event) {
  event.preventDefault();
  if (state.pending) return;
  const form = event.currentTarget;
  const submit = document.getElementById('booking-submit');
  state.pending = true;
  submit.disabled = true;
  submit.textContent = 'Processando...';
  form.setAttribute('aria-busy', 'true');
  setFeedback('Processando pagamento da taxa...', 'info');
  try {
    const booking = await createBooking({
      date: state.date, time: state.time, guests: state.guests, occasion: state.occasion,
      name: form.elements.name.value, phone: form.elements.phone.value, notes: form.elements.notes.value,
      paymentMethod: form.querySelector('input[name="paymentMethod"]:checked')?.value || '',
      simulateFailure: document.getElementById('booking-simulate-failure').checked,
      accountEmail: readSession()?.email || ''
    });
    window.location.href = getBookingConfirmationUrl(booking.bookingNumber);
  } catch (error) {
    const message = toUserMessage(error, 'Não foi possível concluir a reserva.');
    setFeedback(message, 'error');
    showToast(message, 'error');
    state.pending = false;
    submit.disabled = false;
    submit.textContent = `Pagar ${formatCurrency(BOOKING_FEE)} e reservar`;
    form.removeAttribute('aria-busy');
    refreshSlots();
  }
}

async function renderConfirmation(reference) {
  const container = document.getElementById('booking-confirmation');
  document.getElementById('booking-root').hidden = true;
  container.hidden = false;
  container.replaceChildren(el('div', 'empty-state', 'Carregando reserva...'));
  // Confirmacao tem dados pessoais: so a conta (ou o navegador) que reservou pode ve-la.
  const { access, booking } = await getBookingForViewer(reference).catch(() => ({ access: 'not_found', booking: null }));
  if (!booking) {
    const empty = el('div', 'empty-state');
    empty.setAttribute('role', 'alert');
    const needsLogin = access === 'login_required' || access === 'forbidden';
    const link = el('a', 'button button-primary', needsLogin ? 'Entrar na conta' : 'Fazer uma reserva');
    link.href = needsLogin ? 'login.html' : 'reservas.html';
    empty.append(el('span', 'empty-state-icon', '🪑'), el('span', 'empty-state-text', getAccessMessage(access, 'booking')), link);
    container.replaceChildren(empty);
    return;
  }

  const ticket = el('article', 'booking-ticket');
  const head = el('header', 'booking-ticket-head');
  const check = el('span', 'booking-ticket-check', '✓');
  check.setAttribute('aria-hidden', 'true');
  const titles = el('div');
  titles.append(el('p', 'section-kicker', `Reserva ${getBookingStatusLabel(booking.status).toLowerCase()}`), el('h1', '', 'Sua mesa está garantida!'));
  head.append(check, titles);

  const number = el('div', 'booking-ticket-number');
  number.append(el('span', '', 'Número da reserva'), el('strong', '', booking.bookingNumber));

  const grid = el('dl', 'booking-ticket-grid');
  const status = el('span', 'booking-status', getBookingStatusLabel(booking.status));
  [
    ['Data', formatLongDate(booking.date)],
    ['Horário', booking.time],
    ['Pessoas', people(booking.guests)],
    ['Mesa', booking.tableId ? `${booking.tableId} · ${booking.tableSeats} lugares` : 'Definida na chegada'],
    ['Em nome de', booking.name || '—'],
    ['Status', status],
    ...(booking.occasion ? [['Ocasião', getBookingOccasionLabel(booking.occasion)]] : []),
    ...(booking.notes ? [['Observações', booking.notes, 'booking-ticket-wide']] : [])
  ].forEach(([term, value, className]) => {
    const row = el('div', className);
    const dd = el('dd');
    if (typeof value === 'string') dd.textContent = value; else dd.appendChild(value);
    row.append(el('dt', '', term), dd);
    grid.appendChild(row);
  });

  const payment = el('div', 'booking-ticket-payment');
  payment.append(el('span', '', `Taxa de reserva · ${getBookingPaymentLabel(booking.paymentMethod)}${booking.paymentStatus === 'approved' ? ' · aprovado' : ''}`), el('strong', '', formatCurrency(booking.fee)));

  const note = el('p', 'booking-ticket-note', `O valor da taxa é abatido da sua conta no dia. A mesa fica reservada por ${BOOKING_DURATION_MINUTES} minutos a partir do horário marcado; chegue com até 15 minutos de tolerância.`);

  const actions = el('div', 'booking-ticket-actions');
  const menu = el('a', 'button button-primary', 'Ver cardápio');
  menu.href = 'cardapio.html';
  const again = el('a', 'button button-secondary', 'Fazer outra reserva');
  again.href = 'reservas.html';
  actions.append(menu, again);

  ticket.append(head, number, grid, payment, note, actions);
  container.replaceChildren(ticket);
}

function setupBooking() {
  const form = document.getElementById('booking-form');
  if (!form) return;

  const reference = new URLSearchParams(window.location.search).get('reserva')?.trim();
  if (reference) { renderConfirmation(reference); return; }

  const defaults = getCheckoutDefaults() || {};
  form.elements.name.value = defaults.name || '';
  form.elements.phone.value = defaults.phone || '';
  if (['pix', 'card'].includes(defaults.payment)) form.querySelector(`input[name="paymentMethod"][value="${defaults.payment}"]`).checked = true;
  document.getElementById('booking-login-hint').hidden = Boolean(defaults.name);

  const dateInput = document.getElementById('booking-date');
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + BOOKING_MAX_DAYS_AHEAD);
  dateInput.min = toLocalDateString();
  dateInput.max = toLocalDateString(maxDate);
  dateInput.addEventListener('change', () => { if (dateInput.value) selectDate(dateInput.value); });

  const guestsInput = document.getElementById('booking-guests');
  guestsInput.max = String(MAX_GUESTS);
  guestsInput.addEventListener('change', () => setGuests(guestsInput.value));
  document.querySelectorAll('.booking-stepper button').forEach(button => {
    button.addEventListener('click', () => setGuests(state.guests + Number(button.dataset.step)));
  });

  const notes = document.getElementById('booking-notes');
  const counter = document.getElementById('booking-notes-counter');
  notes.maxLength = BOOKING_NOTES_MAX;
  notes.addEventListener('input', () => { counter.textContent = `${notes.value.length}/${BOOKING_NOTES_MAX}`; });

  document.getElementById('booking-hours').textContent = `Entradas de ${BOOKING_OPENING} às ${BOOKING_LAST_SLOT}`;
  document.getElementById('booking-submit').textContent = `Pagar ${formatCurrency(BOOKING_FEE)} e reservar`;
  form.addEventListener('submit', handleSubmit);
  form.addEventListener('input', event => { if (event.target.matches('input, textarea') && form.querySelector('#booking-feedback').dataset.status === 'error') setFeedback(''); });
  // Reserva feita em outra aba: recalcula a disponibilidade.
  subscribeToStorage([BOOKING_STORAGE_KEY], refreshSlots);

  renderHighlights();
  renderDates();
  renderOccasions();
  setGuests(state.guests);
}

export { setupBooking };
