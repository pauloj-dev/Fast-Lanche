import { useMemo, useState } from 'react';
import { FormFeedback } from '../components/FormFeedback.jsx';
import { toUserMessage } from '../utils/errors.js';
import { getFeedbacks, getReviewContext, publishFeedback } from '../services/feedbackService.js';
import {
  FEEDBACK_LIMITS, FEEDBACK_SORTS, RATING_LABELS, calculateProductAverages, filterFeedbacks, getInitials, getProductKey, summarizeRatings
} from '../utils/businessRules.js';
import { formatAverage, formatDateTime, plural } from '../utils/format.js';
import { FEEDBACK_STORAGE_KEY } from '../services/feedbackService.js';
import { ORDER_STORAGE_KEY } from '../services/orderService.js';
import { SESSION_KEY } from '../services/authService.js';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { ErrorState } from '../components/AsyncState.jsx';

const EMPTY_LIST = [];
const NO_CONTEXT = { account: null, eligible: [] };

const EMPTY_FILTERS = { query: '', productKey: '', rating: 0, sort: 'recent' };

export function Stars({ value, size = '' }) {
  const rounded = Math.round(value);
  return <span className={`review-stars${size ? ` is-${size}` : ''}`} role="img" aria-label={`${formatAverage(value)} de 5 estrelas`}>
    {[1, 2, 3, 4, 5].map(star => <span key={star} className={star <= rounded ? 'is-on' : undefined} aria-hidden="true">★</span>)}
  </span>;
}

function ReviewForm({ context, onPublished }) {
  const [selected, setSelected] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', status: '' });
  const pendingProducts = context.eligible.filter(item => !item.reviewed);

  if (!context.account) return <div className="review-form-card review-gate">
    <span className="review-gate-icon" aria-hidden="true">🔒</span>
    <h2>Avalie seus pedidos</h2>
    <p>Para manter as avaliações confiáveis, só quem comprou pode avaliar. Entre na sua conta para avaliar os produtos dos seus pedidos entregues.</p>
    <a className="button button-primary" href="login.html?redirect=feedbacks.html">Entrar para avaliar</a>
  </div>;

  if (!pendingProducts.length) return <div className="review-form-card review-gate">
    <span className="review-gate-icon" aria-hidden="true">{context.eligible.length ? '🏆' : '📦'}</span>
    <h2>{context.eligible.length ? 'Tudo avaliado!' : 'Nada para avaliar ainda'}</h2>
    <p>{context.eligible.length ? 'Você já avaliou todos os produtos dos seus pedidos entregues. Obrigado!' : 'Assim que um pedido seu for entregue, os produtos aparecem aqui para avaliação.'}</p>
    <a className="button button-secondary" href="cardapio.html">Ver cardápio</a>
  </div>;

  const orders = [...new Set(context.eligible.map(item => item.orderNumber))];
  const toggle = key => setSelected(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const published = await publishFeedback({ rating, comment, productKeys: selected });
      setSelected([]); setRating(0); setComment('');
      setFeedback({ text: 'Avaliação publicada! Obrigado por compartilhar sua experiência.', status: 'success' });
      onPublished(published);
    } catch (error) {
      setFeedback({ text: toUserMessage(error, 'Não foi possível publicar sua avaliação.'), status: 'error' });
    } finally { setPending(false); }
  }

  return <form id="feedback-form" className="review-form-card" onSubmit={submit} aria-busy={pending} noValidate>
    <h2>Avalie sua compra</h2>
    <p className="review-form-author">Publicando como <strong>{context.account.name}</strong></p>
    <fieldset className="review-products"><legend>1. Quais produtos você quer avaliar?</legend>
      {orders.map(orderNumber => <div key={orderNumber} className="review-order">
        <small>Pedido {orderNumber}</small>
        <div className="review-order-items">{context.eligible.filter(item => item.orderNumber === orderNumber).map(item => <label key={item.key} className={`review-product${item.reviewed ? ' is-reviewed' : ''}`}>
          <input type="checkbox" name="products" value={item.key} checked={selected.includes(item.key)} disabled={item.reviewed} onChange={() => toggle(item.key)}/>
          <span>{item.name}</span>{item.reviewed && <small>Avaliado</small>}
        </label>)}</div>
      </div>)}
    </fieldset>
    <fieldset className="review-rating-input"><legend>2. Sua nota</legend>
      <div className="review-rating-stars">{[1, 2, 3, 4, 5].map(star => <label key={star} className={star <= rating ? 'is-on' : undefined} title={RATING_LABELS[star]}>
        <input type="radio" name="rating" value={star} checked={rating === star} onChange={() => setRating(star)}/><span aria-hidden="true">★</span><span className="sr-only">{star} estrelas, {RATING_LABELS[star]}</span>
      </label>)}</div>
      <span className="review-rating-label" aria-live="polite">{rating ? RATING_LABELS[rating] : 'Toque nas estrelas'}</span>
    </fieldset>
    <label className="field" htmlFor="feedback-comment"><span>3. Conte como foi</span>
      <textarea id="feedback-comment" name="comment" rows="4" maxLength={FEEDBACK_LIMITS.comment} placeholder="O que você mais gostou? Algo poderia melhorar?" value={comment} onChange={event => setComment(event.target.value)}/>
      <small className="booking-counter">{comment.trim().length}/{FEEDBACK_LIMITS.comment} · mínimo {FEEDBACK_LIMITS.commentMin}</small>
    </label>
    <button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Publicando...' : 'Publicar avaliação'}</button>
    <FormFeedback id="feedback-message" feedback={feedback}/>
  </form>;
}

export function FeedbackPage() {
  // Avaliacoes e elegibilidade acompanham novas avaliacoes, pedidos entregues e login (nesta ou em outra aba).
  const reviews = useAsyncData(getFeedbacks, [], [FEEDBACK_STORAGE_KEY]);
  const reviewContext = useAsyncData(getReviewContext, [], [FEEDBACK_STORAGE_KEY, ORDER_STORAGE_KEY, SESSION_KEY]);
  const feedbacks = { loading: reviews.status === 'loading', list: reviews.data || EMPTY_LIST };
  const context = reviewContext.data || NO_CONTEXT;
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const summary = useMemo(() => summarizeRatings(feedbacks.list), [feedbacks.list]);
  const products = useMemo(() => calculateProductAverages(feedbacks.list), [feedbacks.list]);
  const visible = useMemo(() => filterFeedbacks(feedbacks.list, filters), [feedbacks.list, filters]);
  const selectedProduct = products.find(product => product.key === filters.productKey);
  const filtered = filters.query || filters.productKey || filters.rating;
  const setFilter = patch => setFilters(current => ({ ...current, ...patch }));

  // A gravacao dispara a recarga da lista e do formulario; aqui so limpa os filtros para mostrar a nova avaliacao.
  function handlePublished() {
    setFilters(EMPTY_FILTERS);
  }

  return <main id="top"><section id="feedback-page" className="page-section review-page" aria-labelledby="feedback-page-title"><div className="container">
    <header className="booking-hero"><div><p className="section-kicker">Opiniões</p><h1 id="feedback-page-title">O que dizem nossos clientes</h1><p className="booking-intro">Avaliações de quem pediu e recebeu. Busque por um produto, filtre pela nota e veja a média de cada item.</p></div></header>

    <div className="review-overview">
      <div className="review-score">
        <strong id="average-rating">{formatAverage(summary.average)}</strong>
        <Stars value={summary.average} size="lg"/>
        <span>{plural(summary.count, 'avaliação', 'avaliações')}</span>
      </div>
      <ul className="review-distribution" aria-label="Distribuição das notas">{summary.distribution.map(({ stars, count }) => <li key={stars}>
        <button type="button" className={filters.rating === stars ? 'is-active' : undefined} onClick={() => setFilter({ rating: filters.rating === stars ? 0 : stars })} aria-pressed={filters.rating === stars}>
          <span className="sr-only">Filtrar </span><span>{stars} <span aria-hidden="true">★</span></span><span className="sr-only"> estrelas: </span><span className="review-bar" aria-hidden="true"><span style={{ width: `${summary.count ? (count / summary.count) * 100 : 0}%` }}/></span><span>{count}</span><span className="sr-only"> {count === 1 ? 'avaliação' : 'avaliações'}</span>
        </button>
      </li>)}</ul>
      <div className="review-top-products">
        <h2>Mais avaliados</h2>
        {products.length ? <ul>{products.slice(0, 4).map(product => <li key={product.key}><button type="button" className={filters.productKey === product.key ? 'is-active' : undefined} onClick={() => setFilter({ productKey: filters.productKey === product.key ? '' : product.key })} aria-pressed={filters.productKey === product.key}>
          <span className="review-top-name">{product.name}</span><span className="review-top-score">★ {formatAverage(product.average)}</span><small>{plural(product.count, 'avaliação', 'avaliações')}</small>
        </button></li>)}</ul> : <p className="booking-hint">Os produtos avaliados aparecem aqui.</p>}
      </div>
    </div>

    <div className="review-layout">
      <div className="review-main">
        <div className="review-toolbar" role="search">
          <label className="review-search" htmlFor="feedback-search"><span className="sr-only">Buscar avaliações</span><span aria-hidden="true">🔎</span><input id="feedback-search" type="search" placeholder="Buscar por produto, nome ou comentário" maxLength="80" value={filters.query} onChange={event => setFilter({ query: event.target.value })}/></label>
          <label className="field" htmlFor="feedback-product"><span className="sr-only">Produto</span><select id="feedback-product" value={filters.productKey} onChange={event => setFilter({ productKey: event.target.value })}><option value="">Todos os produtos</option>{products.map(product => <option key={product.key} value={product.key}>{product.name} (★ {formatAverage(product.average)})</option>)}</select></label>
          <label className="field" htmlFor="feedback-sort"><span className="sr-only">Ordenar</span><select id="feedback-sort" value={filters.sort} onChange={event => setFilter({ sort: event.target.value })}>{FEEDBACK_SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="review-chips" role="group" aria-label="Filtrar por nota">{[0, 5, 4, 3, 2, 1].map(stars => <button key={stars} type="button" className={`booking-chip${filters.rating === stars ? ' is-active' : ''}`} aria-pressed={filters.rating === stars} onClick={() => setFilter({ rating: stars })}>{stars ? `${stars} ★` : 'Todas as notas'}</button>)}</div>

        <p className="review-results" aria-live="polite">
          {feedbacks.loading ? 'Carregando avaliações...' : `${plural(visible.length, 'avaliação encontrada', 'avaliações encontradas')}`}
          {selectedProduct && <span> · <strong>{selectedProduct.name}</strong>: média ★ {formatAverage(selectedProduct.average)} em {plural(selectedProduct.count, 'avaliação', 'avaliações')}</span>}
          {filtered ? <button type="button" className="link-button" onClick={() => setFilters(current => ({ ...EMPTY_FILTERS, sort: current.sort }))}>Limpar filtros</button> : null}
        </p>

        <div id="feedback-list" className="review-list" aria-busy={feedbacks.loading}>{reviews.status === 'error' && <ErrorState text="Não foi possível carregar as avaliações." onRetry={reviews.reload}/>}{visible.length ? visible.map(item => <article className="review-card" key={`${item.id}-${item.timestamp}`}>
          <header>
            <span className="review-avatar" aria-hidden="true">{getInitials(item.name)}</span>
            <div><strong>{item.name}</strong><small>{formatDateTime(item.timestamp)}</small></div>
            {item.verified ? <span className="review-badge">✓ Compra verificada</span> : <span className="review-badge is-general">Avaliação geral</span>}
          </header>
          <Stars value={item.rating}/>
          {item.items.length > 0 && <ul className="review-tags">{item.items.map(product => <li key={`${product.orderNumber}-${product.name}`}><button type="button" onClick={() => setFilter({ productKey: getProductKey(product) })}>{product.name}</button></li>)}</ul>}
          <p>{item.comment}</p>
        </article>) : !feedbacks.loading && <div className="review-empty" role="status"><span aria-hidden="true">💬</span><strong>{filtered ? 'Nenhuma avaliação com esses filtros' : 'Nenhuma avaliação ainda'}</strong><p>{filtered ? 'Tente outra busca ou limpe os filtros.' : 'Seja o primeiro a contar como foi seu pedido.'}</p></div>}</div>
      </div>
      <aside className="review-aside"><ReviewForm context={context} onPublished={handlePublished}/></aside>
    </div>
  </div></section></main>;
}
