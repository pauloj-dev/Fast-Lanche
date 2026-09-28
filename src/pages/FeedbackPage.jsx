import { useMemo, useState } from 'react';
import { createFeedback, getFeedbacks } from '../services/feedbackService.js';
import { calculateAverageRating, validateFeedback } from '../utils/businessRules.js';
import { useModal } from '../context/ModalContext.jsx';

export function FeedbackPage() {
  const { open } = useModal();
  const [feedbacks, setFeedbacks] = useState(getFeedbacks);
  const [rating, setRating] = useState('5');
  const [message, setMessage] = useState({ text: '', status: '' });
  const [sessionKeys] = useState(() => new Set());
  const average = useMemo(() => calculateAverageRating(feedbacks), [feedbacks]);
  function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const errors = validateFeedback(data);
    if (errors.length) { setMessage({ text: errors[0], status: 'error' }); return; }
    const clean = { name: String(data.name).trim().slice(0, 80), rating: Number(data.rating), comment: String(data.comment).trim().slice(0, 1000) };
    const key = `${clean.name.toLowerCase()}-${clean.rating}-${clean.comment.toLowerCase()}`;
    if (sessionKeys.has(key)) { setMessage({ text: 'Você já enviou este feedback nesta sessão.', status: 'error' }); return; }
    sessionKeys.add(key);
    const next = [createFeedback(clean), ...feedbacks];
    setFeedbacks(next);
    setMessage({ text: 'Feedback enviado com sucesso!', status: 'success' });
    open({ title: 'Feedback Enviado!', content: <div style={{ display: 'grid', gap: '.4rem' }}><p><strong>{clean.name}</strong></p><p style={{ fontSize: '1.3rem' }}>{'★'.repeat(clean.rating)}{'☆'.repeat(5 - clean.rating)}</p><p>{clean.comment}</p><p style={{ color: 'var(--verde)', fontWeight: 700, paddingTop: '.5rem', borderTop: '1px solid var(--cinza-200)' }}>Obrigado pelo seu feedback! Sua opinião é muito importante.</p></div> });
    form.reset(); setRating('5');
  }
  const sorted = [...feedbacks].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return <main id="top"><section id="feedback-page" className="page-section feedback-page-section" aria-labelledby="feedback-page-title"><div className="container">
    <div className="section-heading"><div><p className="section-kicker">Opiniões</p><h1 id="feedback-page-title">Feedbacks</h1></div></div><div className="feedback-layout"><div><div className="rating-summary"><strong id="average-rating">{average.toFixed(1).replace('.', ',')}</strong><span>media das avaliações</span></div>
      <div id="feedback-list" className="feedback-list">{sorted.length ? sorted.map(item => <article className="feedback-item" key={`${item.id}-${item.timestamp}`}><strong>{item.name} — {'★'.repeat(Number(item.rating))}{'☆'.repeat(5 - Number(item.rating))}</strong><p>{item.comment}</p><small style={{ display: 'block', color: 'var(--cinza-500)', marginTop: '.25rem' }}>{new Date(item.timestamp).toLocaleString('pt-BR')}</small></article>) : <article className="feedback-item empty-state"><span className="empty-state-icon">💬</span><span className="empty-state-text">Nenhum feedback cadastrado ainda. Seja o primeiro a avaliar!</span></article>}</div>
    </div><form id="feedback-form" className="panel-form" onSubmit={submit}><label className="field" htmlFor="feedback-name"><span>Nome</span><input id="feedback-name" name="name" type="text" required/></label><label className="field" htmlFor="feedback-rating"><span>Nota: <strong id="rating-value">{rating}</strong>/5</span><input id="feedback-rating" name="rating" type="range" min="1" max="5" value={rating} onChange={event => setRating(event.target.value)}/></label><label className="field" htmlFor="feedback-comment"><span>Comentario</span><textarea id="feedback-comment" name="comment" rows="4" minLength="10" required/></label><button className="button button-primary" type="submit">Enviar feedback</button><p id="feedback-message" className="form-feedback" data-status={message.status} aria-live="polite">{message.text}</p></form></div>
  </div></section></main>;
}
