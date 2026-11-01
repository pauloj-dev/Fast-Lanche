// feedback.js - avaliacoes da pagina legada (pages-html/feedbacks.html).
// Usa o mesmo service e as mesmas regras da pagina React (src/): elegibilidade por pedido entregue, busca, filtros
// e medias sao identicos nas duas URLs. Todo dado do usuario e renderizado com textContent.
import { showToast } from './ui.js';
import { getFeedbacks, getReviewContext, publishFeedback } from '../src/services/feedbackService.js';
import {
  FEEDBACK_LIMITS, FEEDBACK_SORTS, calculateProductAverages, filterFeedbacks, getInitials, getProductKey, summarizeRatings
} from '../src/utils/businessRules.js';
import { formatDateTime } from '../src/utils/format.js';

const RATING_LABELS = { 1: 'Péssimo', 2: 'Ruim', 3: 'Regular', 4: 'Muito bom', 5: 'Excelente' };
const EMPTY_FILTERS = { query: '', productKey: '', rating: 0, sort: 'recent' };
const state = { list: [], context: { account: null, eligible: [] }, filters: { ...EMPTY_FILTERS }, form: { selected: [], rating: 0, comment: '' }, pending: false };

const formatAverage = value => value.toFixed(1).replace('.', ',');
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(className, text, onClick, pressed) {
  const element = el('button', className, text);
  element.type = 'button';
  element.addEventListener('click', onClick);
  if (pressed !== undefined) element.setAttribute('aria-pressed', String(pressed));
  return element;
}

function fillStars(container, value) {
  const rounded = Math.round(value);
  container.setAttribute('aria-label', `${formatAverage(value)} de 5 estrelas`);
  container.replaceChildren(...[1, 2, 3, 4, 5].map(star => {
    const span = el('span', star <= rounded ? 'is-on' : '', '★');
    span.setAttribute('aria-hidden', 'true');
    return span;
  }));
  return container;
}

function setFilter(patch) {
  Object.assign(state.filters, patch);
  renderAll();
}

function renderOverview() {
  const summary = summarizeRatings(state.list);
  document.getElementById('average-rating').textContent = formatAverage(summary.average);
  fillStars(document.getElementById('average-stars'), summary.average);
  document.getElementById('review-count').textContent = plural(summary.count, 'avaliação', 'avaliações');

  document.getElementById('review-distribution').replaceChildren(...summary.distribution.map(({ stars, count }) => {
    const item = el('li');
    const active = state.filters.rating === stars;
    const control = button(active ? 'is-active' : '', '', () => setFilter({ rating: active ? 0 : stars }), active);
    control.setAttribute('aria-label', `Filtrar ${stars} estrelas: ${plural(count, 'avaliação', 'avaliações')}`);
    const bar = el('span', 'review-bar');
    const fill = el('span');
    fill.style.width = `${summary.count ? (count / summary.count) * 100 : 0}%`;
    bar.appendChild(fill);
    control.append(el('span', '', `${stars} ★`), bar, el('span', '', String(count)));
    item.appendChild(control);
    return item;
  }));

  const products = calculateProductAverages(state.list);
  const top = document.getElementById('review-top-products');
  if (!products.length) top.replaceChildren(el('p', 'booking-hint', 'Os produtos avaliados aparecem aqui.'));
  else {
    const list = el('ul');
    products.slice(0, 4).forEach(product => {
      const active = state.filters.productKey === product.key;
      const control = button(active ? 'is-active' : '', '', () => setFilter({ productKey: active ? '' : product.key }), active);
      control.append(el('span', 'review-top-name', product.name), el('span', 'review-top-score', `★ ${formatAverage(product.average)}`), el('small', '', plural(product.count, 'avaliação', 'avaliações')));
      const item = el('li');
      item.appendChild(control);
      list.appendChild(item);
    });
    top.replaceChildren(list);
  }

  const select = document.getElementById('feedback-product');
  const all = el('option', '', 'Todos os produtos');
  all.value = '';
  select.replaceChildren(all, ...products.map(product => {
    const option = el('option', '', `${product.name} (★ ${formatAverage(product.average)})`);
    option.value = product.key;
    return option;
  }));
  select.value = state.filters.productKey;
}

function renderList() {
  const { filters } = state;
  const visible = filterFeedbacks(state.list, filters);
  const products = calculateProductAverages(state.list);
  const selectedProduct = products.find(product => product.key === filters.productKey);
  const filtered = Boolean(filters.query || filters.productKey || filters.rating);

  document.getElementById('review-chips').replaceChildren(...[0, 5, 4, 3, 2, 1].map(stars => button(
    `booking-chip${filters.rating === stars ? ' is-active' : ''}`, stars ? `${stars} ★` : 'Todas as notas', () => setFilter({ rating: stars }), filters.rating === stars
  )));

  const results = document.getElementById('review-results');
  results.replaceChildren(document.createTextNode(plural(visible.length, 'avaliação encontrada', 'avaliações encontradas')));
  if (selectedProduct) {
    const detail = el('span');
    detail.append(document.createTextNode(' · '), el('strong', '', selectedProduct.name), document.createTextNode(`: média ★ ${formatAverage(selectedProduct.average)} em ${plural(selectedProduct.count, 'avaliação', 'avaliações')}`));
    results.appendChild(detail);
  }
  if (filtered) results.appendChild(button('link-button', 'Limpar filtros', () => {
    document.getElementById('feedback-search').value = '';
    setFilter({ ...EMPTY_FILTERS, sort: filters.sort });
  }));

  const list = document.getElementById('feedback-list');
  if (!visible.length) {
    const empty = el('div', 'review-empty');
    empty.setAttribute('role', 'status');
    const icon = el('span', '', '💬');
    icon.setAttribute('aria-hidden', 'true');
    empty.append(icon, el('strong', '', filtered ? 'Nenhuma avaliação com esses filtros' : 'Nenhuma avaliação ainda'), el('p', '', filtered ? 'Tente outra busca ou limpe os filtros.' : 'Seja o primeiro a contar como foi seu pedido.'));
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(...visible.map(item => {
    const card = el('article', 'review-card');
    const header = el('header');
    const avatar = el('span', 'review-avatar', getInitials(item.name));
    avatar.setAttribute('aria-hidden', 'true');
    const who = el('div');
    who.append(el('strong', '', item.name), el('small', '', formatDateTime(item.timestamp)));
    header.append(avatar, who, el('span', item.verified ? 'review-badge' : 'review-badge is-general', item.verified ? '✓ Compra verificada' : 'Avaliação geral'));
    card.append(header, fillStars(el('span', 'review-stars'), item.rating));
    if (item.items.length) {
      const tags = el('ul', 'review-tags');
      item.items.forEach(product => {
        const tag = el('li');
        tag.appendChild(button('', product.name, () => setFilter({ productKey: getProductKey(product) })));
        tags.appendChild(tag);
      });
      card.appendChild(tags);
    }
    card.appendChild(el('p', '', item.comment));
    return card;
  }));
}

function renderGate(icon, title, text, href, label, variant) {
  const card = el('div', 'review-form-card review-gate');
  const iconEl = el('span', 'review-gate-icon', icon);
  iconEl.setAttribute('aria-hidden', 'true');
  const link = el('a', `button ${variant}`, label);
  link.href = href;
  card.append(iconEl, el('h2', '', title), el('p', '', text), link);
  return card;
}

function renderForm() {
  const aside = document.getElementById('review-aside');
  const { account, eligible } = state.context;
  if (!account) {
    aside.replaceChildren(renderGate('🔒', 'Avalie seus pedidos', 'Para manter as avaliações confiáveis, só quem comprou pode avaliar. Entre na sua conta para avaliar os produtos dos seus pedidos entregues.', 'login.html', 'Entrar para avaliar', 'button-primary'));
    return;
  }
  if (!eligible.some(item => !item.reviewed)) {
    aside.replaceChildren(eligible.length
      ? renderGate('🏆', 'Tudo avaliado!', 'Você já avaliou todos os produtos dos seus pedidos entregues. Obrigado!', 'cardapio.html', 'Ver cardápio', 'button-secondary')
      : renderGate('📦', 'Nada para avaliar ainda', 'Assim que um pedido seu for entregue, os produtos aparecem aqui para avaliação.', 'cardapio.html', 'Ver cardápio', 'button-secondary'));
    return;
  }

  const { form: draft } = state;
  const form = el('form', 'review-form-card');
  form.id = 'feedback-form';
  form.noValidate = true;
  const author = el('p', 'review-form-author', 'Publicando como ');
  author.appendChild(el('strong', '', account.name));
  form.append(el('h2', '', 'Avalie sua compra'), author);

  const productsSet = el('fieldset', 'review-products');
  productsSet.appendChild(el('legend', '', '1. Quais produtos você quer avaliar?'));
  [...new Set(eligible.map(item => item.orderNumber))].forEach(orderNumber => {
    const group = el('div', 'review-order');
    const items = el('div', 'review-order-items');
    eligible.filter(item => item.orderNumber === orderNumber).forEach(item => {
      const label = el('label', `review-product${item.reviewed ? ' is-reviewed' : ''}`);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'products';
      input.value = item.key;
      input.checked = draft.selected.includes(item.key);
      input.disabled = item.reviewed;
      input.addEventListener('change', () => {
        draft.selected = input.checked ? [...draft.selected, item.key] : draft.selected.filter(key => key !== item.key);
      });
      label.append(input, el('span', '', item.name));
      if (item.reviewed) label.appendChild(el('small', '', 'Avaliado'));
      items.appendChild(label);
    });
    group.append(el('small', '', `Pedido ${orderNumber}`), items);
    productsSet.appendChild(group);
  });

  const ratingSet = el('fieldset', 'review-rating-input');
  ratingSet.appendChild(el('legend', '', '2. Sua nota'));
  const stars = el('div', 'review-rating-stars');
  const ratingLabel = el('span', 'review-rating-label', draft.rating ? RATING_LABELS[draft.rating] : 'Toque nas estrelas');
  ratingLabel.setAttribute('aria-live', 'polite');
  const paintStars = () => stars.querySelectorAll('label').forEach((label, index) => label.classList.toggle('is-on', index < draft.rating));
  [1, 2, 3, 4, 5].forEach(star => {
    const label = el('label');
    label.title = RATING_LABELS[star];
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'rating';
    input.value = String(star);
    input.checked = draft.rating === star;
    input.addEventListener('change', () => { draft.rating = star; ratingLabel.textContent = RATING_LABELS[star]; paintStars(); });
    const icon = el('span', '', '★');
    icon.setAttribute('aria-hidden', 'true');
    label.append(input, icon, el('span', 'sr-only', `${star} estrelas, ${RATING_LABELS[star]}`));
    stars.appendChild(label);
  });
  paintStars();
  ratingSet.append(stars, ratingLabel);

  const commentField = el('label', 'field');
  commentField.htmlFor = 'feedback-comment';
  const textarea = document.createElement('textarea');
  textarea.id = 'feedback-comment';
  textarea.name = 'comment';
  textarea.rows = 4;
  textarea.maxLength = FEEDBACK_LIMITS.comment;
  textarea.placeholder = 'O que você mais gostou? Algo poderia melhorar?';
  textarea.value = draft.comment;
  const counter = el('small', 'booking-counter');
  const updateCounter = () => { counter.textContent = `${textarea.value.trim().length}/${FEEDBACK_LIMITS.comment} · mínimo ${FEEDBACK_LIMITS.commentMin}`; };
  textarea.addEventListener('input', () => { draft.comment = textarea.value; updateCounter(); });
  updateCounter();
  commentField.append(el('span', '', '3. Conte como foi'), textarea, counter);

  const submit = el('button', 'button button-primary', 'Publicar avaliação');
  submit.type = 'submit';
  const message = el('p', 'form-feedback');
  message.id = 'feedback-message';
  message.setAttribute('aria-live', 'polite');

  form.append(productsSet, ratingSet, commentField, submit, message);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (state.pending) return;
    state.pending = true;
    submit.disabled = true;
    submit.textContent = 'Publicando...';
    try {
      const published = await publishFeedback({ rating: draft.rating, comment: draft.comment, productKeys: draft.selected });
      state.list = [published, ...state.list];
      state.form = { selected: [], rating: 0, comment: '' };
      state.context = await getReviewContext();
      state.filters = { ...EMPTY_FILTERS };
      document.getElementById('feedback-search').value = '';
      renderAll();
      const success = document.getElementById('feedback-message');
      if (success) { success.textContent = 'Avaliação publicada! Obrigado por compartilhar sua experiência.'; success.dataset.status = 'success'; }
      showToast('Avaliação publicada!', 'success');
    } catch (error) {
      message.textContent = error?.message || 'Não foi possível publicar sua avaliação.';
      message.dataset.status = 'error';
      message.setAttribute('role', 'alert');
      submit.disabled = false;
      submit.textContent = 'Publicar avaliação';
    } finally { state.pending = false; }
  });
  aside.replaceChildren(form);
}

function renderAll() {
  renderOverview();
  renderList();
}

async function load() {
  try {
    [state.list, state.context] = await Promise.all([getFeedbacks(), getReviewContext()]);
  } catch {
    state.list = [];
  }
  renderAll();
  renderForm();
}

function setupFeedback() {
  if (!document.getElementById('feedback-list')) return;
  const sort = document.getElementById('feedback-sort');
  sort.replaceChildren(...FEEDBACK_SORTS.map(([value, label]) => {
    const option = el('option', '', label);
    option.value = value;
    return option;
  }));
  sort.addEventListener('change', () => setFilter({ sort: sort.value }));
  document.getElementById('feedback-product').addEventListener('change', event => setFilter({ productKey: event.target.value }));
  document.getElementById('feedback-search').addEventListener('input', event => setFilter({ query: event.target.value }));
  // Outra aba avaliou, entregou um pedido ou mudou a sessao: recarrega tudo.
  window.addEventListener('storage', load);
  load();
}

export { setupFeedback };
