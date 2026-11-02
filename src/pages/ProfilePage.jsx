import { useEffect, useRef, useState } from 'react';
import { PROFILE_KEY, getLoginUrl, logout } from '../services/authService.js';
import { subscribeToStorage } from '../services/storage/storageEvents.js';
import { getPaymentOptions } from '../data/paymentMethods.js';
import { useRequireSession } from '../hooks/useRequireSession.js';
import { toUserMessage } from '../utils/errors.js';
import { getOrderHistory, getProfile, getProfileCompletion, prepareAvatarFile, removeAvatar, summarizeOrders, updateAvatar, updateProfile } from '../services/profileService.js';
import { ORDER_STORAGE_KEY, getOrderStatusClass, getOrderStatusLabel } from '../services/orderService.js';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { ErrorState } from '../components/AsyncState.jsx';
import { getReceiptUrl } from '../services/checkoutService.js';
import { AVATAR_ACCEPTED_TYPES, getInitials } from '../utils/businessRules.js';
import { formatCurrency as currency, formatDateTime, formatDayMonth, formatMonthYear } from '../utils/format.js';

export const PROFILE_LOGIN_URL = getLoginUrl('perfil.html');
const PAYMENT_PREFERENCES = getPaymentOptions(['pix', 'card', 'cash', '']).map(method => [method.value, method.icon, method.label, method.hint]);
const RECENT_ORDERS_LIMIT = 4;
const toFields = profile => ({ name: profile.name, phone: profile.phone, address: profile.address, paymentMethod: profile.preferences.paymentMethod, notifications: profile.preferences.notifications });
const sameFields = (a, b) => Object.keys(a).every(key => a[key] === b[key]);

function itemsSummary(items) {
  const text = items.map(item => `${item.quantity}× ${item.name}`).join(', ');
  return text.length > 70 ? `${text.slice(0, 67)}...` : text;
}

function Avatar({ profile, pending, onPick, onDropFile }) {
  const [dragging, setDragging] = useState(false);
  const stop = event => { event.preventDefault(); event.stopPropagation(); };
  return <div className={`account-avatar${dragging ? ' is-dragging' : ''}${pending ? ' is-pending' : ''}`}
    onDragEnter={event => { stop(event); setDragging(true); }} onDragOver={stop}
    onDragLeave={event => { stop(event); setDragging(false); }}
    onDrop={event => { stop(event); setDragging(false); const file = event.dataTransfer.files?.[0]; if (file) onDropFile(file); }}>
    {profile.avatar ? <img src={profile.avatar} alt={`Foto de ${profile.name}`}/> : <span className="account-avatar-initials" aria-label={`Iniciais de ${profile.name}`}>{getInitials(profile.name, profile.email)}</span>}
    <button className="account-avatar-edit" type="button" onClick={onPick} disabled={pending} aria-label={profile.avatar ? 'Alterar foto' : 'Adicionar foto'} title={profile.avatar ? 'Alterar foto' : 'Adicionar foto'}>{pending ? '…' : '📷'}</button>
  </div>;
}

function CompletionCard({ completion }) {
  if (completion.percent === 100) return <div className="account-card account-completion is-complete"><span className="account-completion-badge" aria-hidden="true">🏆</span><div><strong>Perfil completo!</strong><p>Seu checkout já sai preenchido em poucos segundos.</p></div></div>;
  return <div className="account-card account-completion">
    <div className="account-completion-head"><strong>Complete seu perfil</strong><span>{completion.percent}%</span></div>
    <div className="account-progress" role="progressbar" aria-label="Perfil preenchido" aria-valuemin="0" aria-valuemax="100" aria-valuenow={completion.percent}><span style={{ width: `${completion.percent}%` }}/></div>
    <ul className="account-checklist">{completion.steps.map(step => <li key={step.key} className={step.done ? 'is-done' : undefined}><span aria-hidden="true">{step.done ? '✓' : ''}</span>{step.label}<span className="sr-only">{step.done ? ' (preenchido)' : ' (pendente)'}</span></li>)}</ul>
  </div>;
}

function OrderHistory({ history }) {
  const [showAll, setShowAll] = useState(false);
  if (history.status === 'loading') return <div className="account-orders-skeleton" role="status" aria-label="Carregando pedidos"><span/><span/><span/></div>;
  if (history.status === 'error') return <ErrorState text="Não foi possível carregar seus pedidos." onRetry={history.reload}/>;
  const state = { orders: history.data };
  if (!state.orders.length) return <div className="account-empty" role="status"><span aria-hidden="true">🍔</span><strong>Nenhum pedido ainda</strong><p>Quando você pedir com esta conta, o histórico aparece aqui.</p><a className="button button-primary button-small" href="cardapio.html">Fazer meu primeiro pedido</a></div>;
  const visible = showAll ? state.orders : state.orders.slice(0, RECENT_ORDERS_LIMIT);
  return <>
    <ul id="profile-orders-list" className="account-orders">{visible.map(order => <li key={order.orderNumber}>
      <a className="account-order" href={getReceiptUrl(order.orderNumber)} aria-label={`Pedido ${order.orderNumber}, ${getOrderStatusLabel(order.status)}, total ${currency(order.total)}. Ver comprovante`}>
        <span className="account-order-top"><strong>{order.orderNumber}</strong><span className={`account-status status-${getOrderStatusClass(order.status)}`}>{getOrderStatusLabel(order.status)}</span></span>
        <span className="account-order-items">{itemsSummary(order.items)}</span>
        <span className="account-order-bottom"><time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time><span className="account-order-total">{currency(order.total)}</span></span>
      </a>
    </li>)}</ul>
    {state.orders.length > RECENT_ORDERS_LIMIT && <button className="link-button account-orders-toggle" type="button" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>{showAll ? 'Mostrar menos' : `Ver todos os ${state.orders.length} pedidos`}</button>}
  </>;
}

export function ProfilePage() {
  // Leitura sincrona: sem sessao nada privado chega a ser renderizado antes do redirecionamento.
  const [profile, setProfile] = useState(getProfile);
  const [fields, setFields] = useState(() => profile && toFields(profile));
  const [feedback, setFeedback] = useState({ text: '', status: '' });
  const [avatarFeedback, setAvatarFeedback] = useState({ text: '', status: '' });
  const [pending, setPending] = useState(false);
  const [avatarPending, setAvatarPending] = useState(false);
  const fileInput = useRef(null);
  const nameInput = useRef(null);
  // Protecao da pagina: sem sessao valida (inclusive logout/expiracao em outra aba) volta para o login.
  const session = useRequireSession('perfil.html');
  const loggedIn = Boolean(session && profile);

  // Perfil alterado em outra aba (ou no modal legado) e recarregado.
  useEffect(() => {
    if (!session) return undefined;
    return subscribeToStorage([PROFILE_KEY], () => { const next = getProfile(); if (next) setProfile(next); });
  }, [session]);

  // Historico acompanha mudancas nos pedidos (novo pedido, status atualizado em outra aba).
  const history = useAsyncData(() => (loggedIn ? getOrderHistory() : []), [loggedIn], [ORDER_STORAGE_KEY]);
  const orders = { loading: history.status === 'loading', orders: history.data || [] };

  if (!loggedIn) return <main id="top" className="page-section"><div className="container"><div className="empty-state" role="status"><span className="empty-state-icon">🔒</span><span className="empty-state-text">Faça login para acessar seu perfil. Redirecionando...</span><a className="button button-primary" href={PROFILE_LOGIN_URL}>Ir para o login</a></div></div></main>;

  const dirty = !sameFields(fields, toFields(profile));
  const completion = getProfileCompletion(profile);
  const summary = summarizeOrders(orders.orders);
  const since = formatMonthYear(profile.createdAt);
  const setField = name => event => {
    setFields({ ...fields, [name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
    if (feedback.status === 'success') setFeedback({ text: '', status: '' });
  };

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const saved = await updateProfile({ name: fields.name, phone: fields.phone, address: fields.address, preferences: { paymentMethod: fields.paymentMethod, notifications: fields.notifications } });
      setProfile(saved);
      setFields(toFields(saved));
      setFeedback({ text: 'Perfil salvo! Seus dados já aparecem no checkout.', status: 'success' });
    } catch (error) {
      setFeedback({ text: toUserMessage(error, 'Não foi possível salvar o perfil.'), status: 'error' });
      nameInput.current?.focus();
    } finally { setPending(false); }
  }

  function discard() {
    setFields(toFields(profile));
    setFeedback({ text: '', status: '' });
  }

  async function applyAvatarFile(file) {
    if (!file || avatarPending) return;
    setAvatarPending(true);
    setAvatarFeedback({ text: 'Processando imagem...', status: 'info' });
    try {
      setProfile(await updateAvatar(await prepareAvatarFile(file)));
      setAvatarFeedback({ text: 'Foto atualizada.', status: 'success' });
    } catch (error) {
      setAvatarFeedback({ text: toUserMessage(error, 'Não foi possível usar esta imagem.'), status: 'error' });
    } finally { setAvatarPending(false); }
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    applyAvatarFile(file);
  }

  async function handleAvatarRemove() {
    try {
      setProfile(await removeAvatar());
      setAvatarFeedback({ text: 'Foto removida.', status: 'success' });
    } catch (error) { setAvatarFeedback({ text: toUserMessage(error, 'Não foi possível remover a foto.'), status: 'error' }); }
  }

  return <main id="top"><section id="profile-page" className="page-section account-page" aria-labelledby="profile-page-title"><div className="container account-container">
    <header className="account-hero">
      <Avatar profile={profile} pending={avatarPending} onPick={() => fileInput.current?.click()} onDropFile={applyAvatarFile}/>
      <input ref={fileInput} id="profile-avatar-upload" className="sr-only" type="file" accept={AVATAR_ACCEPTED_TYPES.join(',')} onChange={handleAvatarChange} tabIndex={-1} aria-hidden="true"/>
      <div className="account-hero-info">
        <p className="section-kicker">Minha conta</p>
        <h1 id="profile-page-title">Olá, {profile.name.split(' ')[0]}!</h1>
        <p className="account-hero-meta"><span>{profile.email}</span>{since && <span>Cliente desde {since}</span>}</p>
        <div className="account-hero-actions">
          <button className="button button-secondary button-small" type="button" onClick={() => fileInput.current?.click()} disabled={avatarPending}>{profile.avatar ? 'Trocar foto' : 'Adicionar foto'}</button>
          {profile.avatar && <button className="button button-ghost button-small" id="profile-avatar-remove" type="button" onClick={handleAvatarRemove} disabled={avatarPending}>Remover foto</button>}
        </div>
        <p id="profile-avatar-feedback" className="form-feedback account-avatar-feedback" data-status={avatarFeedback.status} role={avatarFeedback.status === 'error' ? 'alert' : undefined} aria-live="polite">{avatarFeedback.text || 'PNG, JPG, WEBP ou GIF até 2 MB — clique ou arraste para a foto.'}</p>
      </div>
      <dl className="account-stats">
        <div><dt>Pedidos</dt><dd>{orders.loading ? '—' : summary.count}</dd></div>
        <div><dt>Total gasto</dt><dd>{orders.loading ? '—' : currency(summary.totalSpent)}</dd></div>
        <div><dt>Último pedido</dt><dd>{summary.lastOrderAt ? formatDayMonth(summary.lastOrderAt) : '—'}</dd></div>
      </dl>
    </header>

    <div className="account-layout">
      <form id="profile-form" className="account-card account-form" onSubmit={submit} aria-busy={pending} noValidate>
        <section className="account-form-section" aria-labelledby="profile-personal-title">
          <h2 id="profile-personal-title" className="form-section-title"><span aria-hidden="true">1</span>Dados pessoais</h2>
          <div className="account-fields">
            <label className="field field-full" htmlFor="profile-name"><span>Nome completo</span><input ref={nameInput} id="profile-name" name="name" type="text" autoComplete="name" minLength="3" maxLength="80" required value={fields.name} onChange={setField('name')}/></label>
            <label className="field" htmlFor="profile-email"><span>E-mail da conta 🔒</span><input id="profile-email" name="email" type="email" value={profile.email} readOnly aria-describedby="profile-email-hint"/><small id="profile-email-hint" className="field-hint">Identifica sua conta e não pode ser alterado.</small></label>
            <label className="field" htmlFor="profile-phone"><span>Telefone</span><input id="profile-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength="15" placeholder="(00) 00000-0000" value={fields.phone} onChange={setField('phone')}/><small className="field-hint">Usado para contato sobre a entrega.</small></label>
          </div>
        </section>
        <section className="account-form-section" aria-labelledby="profile-address-title">
          <h2 id="profile-address-title" className="form-section-title"><span aria-hidden="true">2</span>Endereço padrão</h2>
          <label className="field field-full" htmlFor="profile-address"><span>Endereço de entrega</span><input id="profile-address" name="address" type="text" autoComplete="street-address" maxLength="200" placeholder="Rua, número, bairro" value={fields.address} onChange={setField('address')}/></label>
        </section>
        <section className="account-form-section" aria-labelledby="profile-prefs-title">
          <h2 id="profile-prefs-title" className="form-section-title"><span aria-hidden="true">3</span>Preferências</h2>
          <fieldset className="payment-options account-payment-options"><legend>Pagamento preferido</legend>{PAYMENT_PREFERENCES.map(([value, icon, label, hint]) => <label key={value || 'none'} className="payment-option"><input type="radio" name="paymentMethod" value={value} checked={fields.paymentMethod === value} onChange={setField('paymentMethod')}/><span className="payment-option-icon" aria-hidden="true">{icon}</span><span>{label}</span><small>{hint}</small></label>)}</fieldset>
          <label className="account-switch" htmlFor="profile-notifications">
            <span className="account-switch-text"><strong>Notificações de pedidos</strong><small>Avisos quando o status do pedido mudar.</small></span>
            <input id="profile-notifications" name="notifications" type="checkbox" role="switch" checked={fields.notifications} onChange={setField('notifications')}/>
            <span className="account-switch-track" aria-hidden="true"/>
          </label>
        </section>
        <div className={`account-savebar${dirty ? ' is-dirty' : ''}`}>
          <p id="profile-feedback" className="form-feedback" data-status={feedback.status || (dirty ? 'info' : '')} role={feedback.status === 'error' ? 'alert' : undefined} aria-live="polite">{feedback.text || (dirty ? 'Você tem alterações não salvas.' : 'Tudo salvo.')}</p>
          <div className="account-savebar-actions">
            {dirty && <button className="button button-ghost button-small" type="button" onClick={discard} disabled={pending}>Descartar</button>}
            <button className="button button-primary" id="profile-save-btn" type="submit" disabled={pending || !dirty}>{pending ? 'Salvando...' : 'Salvar alterações'}</button>
          </div>
        </div>
      </form>

      <aside className="account-sidebar" aria-label="Resumo da conta">
        <CompletionCard completion={completion}/>
        <section className="account-card" aria-labelledby="profile-orders-title">
          <div className="account-card-head"><h2 id="profile-orders-title">Meus pedidos</h2>{summary.count > 0 && <span className="account-count">{summary.count}</span>}</div>
          <OrderHistory history={history}/>
        </section>
        <nav className="account-card account-shortcuts" aria-label="Atalhos">
          <a href="cardapio.html"><span aria-hidden="true">🍔</span>Novo pedido</a>
          <a href="reservas.html"><span aria-hidden="true">🪑</span>Reservar mesa</a>
          <a href="feedbacks.html"><span aria-hidden="true">⭐</span>Avaliar</a>
          <button type="button" onClick={() => logout().catch(() => {})}><span aria-hidden="true">🚪</span>Sair</button>
        </nav>
      </aside>
    </div>
  </div></section></main>;
}
