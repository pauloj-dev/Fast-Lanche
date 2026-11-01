import { useEffect, useMemo, useState } from 'react';
import { readSession } from '../services/authService.js';
import { getCheckoutDefaults } from '../services/profileService.js';
import {
  createBooking, getAvailability, getBooking, getBookingHighlights, getBookingConfirmationUrl, getBookingOccasionLabel, getBookingPaymentLabel, getBookingStatusLabel
} from '../services/bookingService.js';
import {
  BOOKING_DURATION_MINUTES, BOOKING_FEE, BOOKING_LAST_SLOT, BOOKING_MAX_DAYS_AHEAD, BOOKING_NOTES_MAX, BOOKING_OCCASIONS, BOOKING_OPENING,
  MAX_GUESTS, getUpcomingBookingDates, toLocalDateString
} from '../utils/businessRules.js';
import { formatCurrency as currency } from '../utils/format.js';

const PAYMENT_OPTIONS = [['pix', '⚡', 'Pix', 'Aprovação na hora'], ['card', '💳', 'Cartão', 'Crédito ou débito']];
const SLOT_HINTS = { available: '', few: 'Últimas mesas', full: 'Lotado', past: 'Encerrado' };

function formatLongDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  return Number.isNaN(value.getTime()) ? date : value.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}
const formatShortDate = date => date.split('-').reverse().join('/');
const people = count => `${count} ${count === 1 ? 'pessoa' : 'pessoas'}`;
export function BookingHighlights() {
  return <ul className="booking-highlights">{getBookingHighlights().map(([icon, title, text]) => <li key={title}><span aria-hidden="true">{icon}</span><div><strong>{title}</strong><small>{text}</small></div></li>)}</ul>;
}

function BookingConfirmation({ reference }) {
  const [state, setState] = useState({ loading: true, booking: null });
  useEffect(() => {
    let active = true;
    getBooking(reference).then(booking => { if (active) setState({ loading: false, booking }); }).catch(() => { if (active) setState({ loading: false, booking: null }); });
    return () => { active = false; };
  }, [reference]);
  if (state.loading) return <div className="empty-state" role="status">Carregando reserva...</div>;
  if (!state.booking) return <div className="empty-state" role="alert"><span className="empty-state-icon">🪑</span><span className="empty-state-text">Não encontramos esta reserva.</span><a className="button button-primary" href="reservas.html">Fazer uma reserva</a></div>;
  const { booking } = state;
  return <article className="booking-ticket" aria-labelledby="booking-ticket-title">
    <header className="booking-ticket-head">
      <span className="booking-ticket-check" aria-hidden="true">✓</span>
      <div><p className="section-kicker">Reserva {getBookingStatusLabel(booking.status).toLowerCase()}</p><h1 id="booking-ticket-title">Sua mesa está garantida!</h1></div>
    </header>
    <div className="booking-ticket-number"><span>Número da reserva</span><strong>{booking.bookingNumber}</strong></div>
    <dl className="booking-ticket-grid">
      <div><dt>Data</dt><dd>{formatLongDate(booking.date)}</dd></div>
      <div><dt>Horário</dt><dd>{booking.time}</dd></div>
      <div><dt>Pessoas</dt><dd>{people(booking.guests)}</dd></div>
      <div><dt>Mesa</dt><dd>{booking.tableId ? `${booking.tableId} · ${booking.tableSeats} lugares` : 'Definida na chegada'}</dd></div>
      <div><dt>Em nome de</dt><dd>{booking.name || '—'}</dd></div>
      {booking.occasion && <div><dt>Ocasião</dt><dd>{getBookingOccasionLabel(booking.occasion)}</dd></div>}
      {booking.notes && <div className="booking-ticket-wide"><dt>Observações</dt><dd>{booking.notes}</dd></div>}
      <div><dt>Status</dt><dd><span className="booking-status">{getBookingStatusLabel(booking.status)}</span></dd></div>
    </dl>
    <div className="booking-ticket-payment">
      <span>Taxa de reserva · {getBookingPaymentLabel(booking.paymentMethod)}{booking.paymentStatus === 'approved' ? ' · aprovado' : ''}</span>
      <strong>{currency(booking.fee)}</strong>
    </div>
    <p className="booking-ticket-note">O valor da taxa é abatido da sua conta no dia. A mesa fica reservada por {BOOKING_DURATION_MINUTES} minutos a partir do horário marcado; chegue com até 15 minutos de tolerância.</p>
    <div className="booking-ticket-actions"><a className="button button-primary" href="cardapio.html">Ver cardápio</a><a className="button button-secondary" href="reservas.html">Fazer outra reserva</a></div>
  </article>;
}

export function BookingPage() {
  const reference = new URLSearchParams(window.location.search).get('reserva')?.trim() || '';
  const today = toLocalDateString();
  const maxDate = useMemo(() => { const date = new Date(); date.setDate(date.getDate() + BOOKING_MAX_DAYS_AHEAD); return toLocalDateString(date); }, []);
  const [defaults] = useState(() => getCheckoutDefaults() || {});
  const [form, setForm] = useState({ date: today, guests: 2, time: '', name: defaults.name || '', phone: defaults.phone || '', paymentMethod: ['pix', 'card'].includes(defaults.payment) ? defaults.payment : '', occasion: '', notes: '', simulateFailure: false });
  const quickDates = useMemo(() => getUpcomingBookingDates(new Date(), 7), []);
  const isQuickDate = quickDates.some(day => day.date === form.date);
  const [slots, setSlots] = useState({ loading: true, list: [] });
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', status: '' });

  // Disponibilidade recalculada ao trocar data/pessoas e quando outra aba grava uma reserva.
  useEffect(() => {
    if (reference) return undefined;
    let active = true;
    const load = () => getAvailability(form.date, form.guests)
      .then(list => { if (active) setSlots({ loading: false, list }); })
      .catch(() => { if (active) setSlots({ loading: false, list: [] }); });
    load();
    window.addEventListener('storage', load);
    return () => { active = false; window.removeEventListener('storage', load); };
  }, [reference, form.date, form.guests]);

  // Horario escolhido que deixou de estar disponivel (outra aba, troca de data/pessoas) e desmarcado.
  useEffect(() => {
    const selected = slots.list.find(slot => slot.time === form.time);
    if (form.time && selected && !['available', 'few'].includes(selected.status)) setForm(current => ({ ...current, time: '' }));
  }, [slots.list, form.time]);

  if (reference) return <main id="top"><section id="booking-page" className="page-section booking-page-section booking-confirmation-section"><div className="container booking-confirmation-container"><BookingConfirmation reference={reference}/></div></section></main>;

  const update = patch => { setForm(current => ({ ...current, ...patch })); if (feedback.status === 'error') setFeedback({ text: '', status: '' }); };
  const setGuests = value => update({ guests: Math.min(MAX_GUESTS, Math.max(1, value)) });
  const selectedSlot = slots.list.find(slot => slot.time === form.time);
  const openSlots = slots.list.filter(slot => slot.status === 'available' || slot.status === 'few').length;

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFeedback({ text: 'Processando pagamento da taxa...', status: 'info' });
    try {
      const booking = await createBooking({ ...form, accountEmail: readSession()?.email || '' });
      window.location.href = getBookingConfirmationUrl(booking.bookingNumber);
    } catch (error) {
      setFeedback({ text: error?.message || 'Não foi possível concluir a reserva.', status: 'error' });
      setPending(false);
      // Recarrega os horarios: o erro pode ter sido lotacao.
      getAvailability(form.date, form.guests).then(list => setSlots({ loading: false, list })).catch(() => {});
    }
  }

  return <main id="top"><section id="booking-page" className="page-section booking-page-section" aria-labelledby="booking-page-title"><div className="container">
    <header className="booking-hero">
      <div><p className="section-kicker">Agendamento</p><h1 id="booking-page-title">Reserve sua mesa</h1><p className="booking-intro">Escolha o dia, o tamanho do grupo e um horário livre. A mesa é confirmada na hora, após o pagamento da taxa.</p></div>
      <span className="secure-pill">🔒 Pagamento simulado</span>
    </header>
    <BookingHighlights/>
    <form id="booking-form" className="booking-layout" onSubmit={submit} aria-busy={pending} noValidate>
      <div className="booking-main">
        <section className="booking-card" aria-labelledby="booking-step-when">
          <h2 id="booking-step-when" className="form-section-title"><span aria-hidden="true">1</span>Quando e quantas pessoas?</h2>
          <fieldset className="booking-dates"><legend>Data</legend>{quickDates.map(day => <label key={day.date} className="booking-date">
            <input type="radio" name="quick-date" value={day.date} checked={form.date === day.date} onChange={() => update({ date: day.date, time: '' })}/>
            <small>{day.label}</small><strong>{day.day}</strong><small>{day.month}</small>
          </label>)}</fieldset>
          <div className="booking-when">
            <label className={`field booking-other-date${isQuickDate ? '' : ' is-active'}`} htmlFor="booking-date"><span>Outra data</span><input id="booking-date" name="date" type="date" min={today} max={maxDate} value={form.date} onChange={event => update({ date: event.target.value, time: '' })} required/></label>
            <div className="field"><span id="booking-guests-label">Pessoas</span>
              <div className="booking-stepper" role="group" aria-labelledby="booking-guests-label">
                <button type="button" onClick={() => setGuests(form.guests - 1)} disabled={form.guests <= 1} aria-label="Diminuir pessoas">−</button>
                <input id="booking-guests" name="guests" type="number" min="1" max={MAX_GUESTS} value={form.guests} onChange={event => setGuests(Number(event.target.value) || 1)} aria-labelledby="booking-guests-label"/>
                <button type="button" onClick={() => setGuests(form.guests + 1)} disabled={form.guests >= MAX_GUESTS} aria-label="Aumentar pessoas">+</button>
              </div>
            </div>
          </div>
        </section>

        <section className="booking-card" aria-labelledby="booking-step-time">
          <h2 id="booking-step-time" className="form-section-title"><span aria-hidden="true">2</span>Escolha o horário</h2>
          <p className="booking-hint">{formatLongDate(form.date)} · {people(form.guests)} · {slots.loading ? 'consultando mesas...' : openSlots ? `${openSlots} ${openSlots === 1 ? 'horário' : 'horários'} com mesa livre` : 'nenhum horário livre neste dia'}</p>
          {slots.loading ? <div className="booking-slots-skeleton" role="status" aria-label="Carregando horários"/> :
            <fieldset className="booking-slots"><legend className="sr-only">Horário</legend>{slots.list.map(slot => {
              const disabled = slot.status === 'full' || slot.status === 'past';
              return <label key={slot.time} className={`booking-slot is-${slot.status}`}>
                <input type="radio" name="time" value={slot.time} checked={form.time === slot.time} disabled={disabled} onChange={() => update({ time: slot.time })}/>
                <strong>{slot.time}</strong>{SLOT_HINTS[slot.status] && <small>{SLOT_HINTS[slot.status]}</small>}
              </label>;
            })}</fieldset>}
          <p className="booking-legend"><span className="is-available">Livre</span><span className="is-few">Últimas mesas</span><span className="is-full">Lotado</span><span className="booking-legend-hours">Entradas de {BOOKING_OPENING} às {BOOKING_LAST_SLOT}</span></p>
        </section>

        <section className="booking-card" aria-labelledby="booking-step-contact">
          <h2 id="booking-step-contact" className="form-section-title"><span aria-hidden="true">3</span>Seus dados</h2>
          {!defaults.name && <p className="booking-hint"><a href="login.html?redirect=reservas.html">Entre na sua conta</a> para preencher automaticamente.</p>}
          <div className="booking-contact">
            <label className="field" htmlFor="booking-name"><span>Nome para a reserva</span><input id="booking-name" name="name" type="text" autoComplete="name" maxLength="80" value={form.name} onChange={event => update({ name: event.target.value })} required/></label>
            <label className="field" htmlFor="booking-phone"><span>Telefone</span><input id="booking-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength="15" placeholder="(00) 00000-0000" value={form.phone} onChange={event => update({ phone: event.target.value })} required/></label>
          </div>
          <fieldset className="booking-occasions"><legend>Ocasião especial <small>(opcional)</small></legend>{BOOKING_OCCASIONS.map(([value, label, icon]) => <label key={value || 'none'} className="booking-chip">
            <input type="radio" name="occasion" value={value} checked={form.occasion === value} onChange={() => update({ occasion: value })}/><span aria-hidden="true">{icon}</span>{label}
          </label>)}</fieldset>
          <label className="field" htmlFor="booking-notes"><span>Observações <small>(opcional)</small></span><textarea id="booking-notes" name="notes" rows="3" maxLength={BOOKING_NOTES_MAX} placeholder="Ex.: cadeira de bebê, mesa perto da janela, bolo de aniversário..." value={form.notes} onChange={event => update({ notes: event.target.value })}/><small className="booking-counter">{form.notes.length}/{BOOKING_NOTES_MAX}</small></label>
        </section>

        <section className="booking-card" aria-labelledby="booking-step-payment">
          <h2 id="booking-step-payment" className="form-section-title"><span aria-hidden="true">4</span>Taxa de reserva</h2>
          <fieldset className="payment-options booking-payment-options"><legend className="sr-only">Forma de pagamento da taxa</legend>{PAYMENT_OPTIONS.map(([value, icon, label, hint]) => <label key={value} className="payment-option"><input type="radio" name="paymentMethod" value={value} checked={form.paymentMethod === value} onChange={() => update({ paymentMethod: value })}/><span className="payment-option-icon" aria-hidden="true">{icon}</span><span>{label}</span><small>{hint}</small></label>)}</fieldset>
          <label className="booking-demo" htmlFor="booking-simulate-failure"><input id="booking-simulate-failure" type="checkbox" checked={form.simulateFailure} onChange={event => update({ simulateFailure: event.target.checked })}/><span><strong>Simular pagamento recusado</strong><small>Ambiente de demonstração: testa o fluxo de recusa sem bloquear mesa.</small></span></label>
        </section>
      </div>

      <aside className="booking-summary" aria-label="Resumo da reserva">
        <h2>Resumo</h2>
        <dl>
          <div><dt>Data</dt><dd>{formatShortDate(form.date)}</dd></div>
          <div><dt>Horário</dt><dd>{form.time || 'Escolha um horário'}</dd></div>
          <div><dt>Pessoas</dt><dd>{people(form.guests)}</dd></div>
          {form.occasion && <div><dt>Ocasião</dt><dd>{getBookingOccasionLabel(form.occasion)}</dd></div>}
          <div><dt>Mesas livres</dt><dd>{selectedSlot ? selectedSlot.freeTables : '—'}</dd></div>
          <div className="booking-summary-total"><dt>Taxa de reserva</dt><dd>{currency(BOOKING_FEE)}</dd></div>
        </dl>
        <p className="booking-summary-note">Abatida da conta no dia da visita.</p>
        <button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Processando...' : `Pagar ${currency(BOOKING_FEE)} e reservar`}</button>
        <p id="booking-feedback" className="form-feedback" data-status={feedback.status} role={feedback.status === 'error' ? 'alert' : undefined} aria-live="polite">{feedback.text}</p>
      </aside>
    </form>
  </div></section></main>;
}
