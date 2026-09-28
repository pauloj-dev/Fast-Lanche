import { useState } from 'react';
import { createBooking } from '../services/bookingService.js';
import { validateBooking } from '../utils/businessRules.js';
import { useModal } from '../context/ModalContext.jsx';

export function BookingPage() {
  const { open } = useModal();
  const [feedback, setFeedback] = useState({ text: '', status: '' });
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const errors = validateBooking(data.date, data.time, data.guests);
    if (errors.length) { setFeedback({ text: errors[0], status: 'error' }); return; }
    try {
      const booking = await createBooking({ date: data.date, time: data.time, guests: Number(data.guests) });
      const formattedDate = booking.date.split('-').reverse().join('/');
      const people = booking.guests === 1 ? 'pessoa' : 'pessoas';
      setFeedback({ text: `Reserva confirmada! Mesa para ${booking.guests} ${people} em ${formattedDate} às ${booking.time}.`, status: 'success' });
      open({ title: 'Reserva Confirmada!', content: <div style={{ display: 'grid', gap: '.4rem' }}><p><strong>Data:</strong> {formattedDate}</p><p><strong>Horário:</strong> {booking.time}</p><p><strong>{booking.guests} {people}</strong></p><p style={{ color: 'var(--verde)', fontWeight: 700, paddingTop: '.5rem', borderTop: '1px solid var(--cinza-200)' }}>Sua reserva foi confirmada! Aguardamos sua visita.</p></div> });
      form.reset();
    } catch { setFeedback({ text: 'Erro interno ao realizar reserva. Tente novamente.', status: 'error' }); }
  }
  return <main id="top"><section id="booking-page" className="page-section booking-page-section" aria-labelledby="booking-page-title"><div className="container split-layout"><div className="section-copy"><p className="section-kicker">Agendamento</p><h1 id="booking-page-title">Reserve uma mesa</h1><p>Escolha data, horario e quantidade de pessoas para organizar sua visita com antecedencia.</p></div>
    <form id="booking-form" className="panel-form" onSubmit={submit}><label className="field" htmlFor="booking-date"><span>Data</span><input id="booking-date" name="date" type="date" min={minDate} required/></label><label className="field" htmlFor="booking-time"><span>Horario</span><input id="booking-time" name="time" type="time" min="11:00" max="23:00" required/></label><label className="field" htmlFor="booking-guests"><span>Pessoas</span><input id="booking-guests" name="guests" type="number" min="1" max="12" defaultValue="2" required/></label><button className="button button-primary" type="submit">Confirmar reserva</button><p id="booking-feedback" className="form-feedback" data-status={feedback.status} aria-live="polite">{feedback.text}</p></form>
  </div></section></main>;
}
