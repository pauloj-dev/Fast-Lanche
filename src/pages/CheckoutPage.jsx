import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { getCurrentProfile, readSession } from '../services/authService.js';
import { getReceiptUrl, placeOrder } from '../services/checkoutService.js';

const currency = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const profileToFields = profile => ({ name: profile.name || '', email: profile.email || '', phone: profile.phone || '', address: profile.address || '', payment: profile.preferences?.paymentMethod || profile.paymentMethod || '' });
const EMPTY_FIELDS = profileToFields({});

export function CheckoutPage() {
  const { cart, clear } = useCart();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', status: '' });
  // Pre-preenchimento so com o perfil da conta logada.
  const [profile] = useState(() => getCurrentProfile());
  const [useProfile, setUseProfile] = useState(Boolean(profile));
  const [profileFields, setProfileFields] = useState(() => profile ? profileToFields(profile) : EMPTY_FIELDS);
  function handleProfileToggle(event) {
    const enabled = event.target.checked;
    setUseProfile(enabled);
    if (enabled && profile) setProfileFields(profileToFields(profile));
  }
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setFeedback({ text: 'Pagamento simulado em processamento...', status: 'info' });
    try {
      const order = await placeOrder({ data, cart, accountEmail: readSession()?.email || '' });
      clear();
      window.location.href = getReceiptUrl(order.orderNumber);
    } catch (error) {
      setFeedback({ text: error?.message || 'Nao foi possivel finalizar o pedido. Tente novamente.', status: 'error' });
      setPending(false);
    }
  }
  const hasItems = cart.items.length > 0;
  return <main id="top"><section id="checkout-page" className="page-section checkout-page-section" aria-labelledby="checkout-page-title"><div className="container">
    <div className="section-heading"><div><p className="section-kicker">Pagamento direto</p><h1 id="checkout-page-title">Checkout</h1></div><span className="secure-pill">Ambiente simulado</span></div>
    {!hasItems && <div className="empty-state checkout-empty-state" role="status"><span className="empty-state-icon">🛒</span><span className="empty-state-text">Seu carrinho esta vazio.</span><a className="button button-primary" href="cardapio.html">Escolher itens</a></div>}
    <div className="checkout-page-layout"><div className="checkout-page-form">
      <form id="checkout-form" className="form-grid" onSubmit={submit} aria-busy={pending}>
        <label className="field" htmlFor="checkout-name"><span>Nome completo</span><input id="checkout-name" name="name" type="text" autoComplete="name" minLength="3" value={profileFields.name} onChange={event => setProfileFields({ ...profileFields, name: event.target.value })} required /></label>
        <label className="field" htmlFor="checkout-email"><span>Email</span><input id="checkout-email" name="email" type="email" autoComplete="email" value={profileFields.email} onChange={event => setProfileFields({ ...profileFields, email: event.target.value })} required /></label>
        <label className="field" htmlFor="checkout-phone"><span>Telefone</span><input id="checkout-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" minLength="10" maxLength="15" placeholder="(00) 00000-0000" value={profileFields.phone} onChange={event => setProfileFields({ ...profileFields, phone: event.target.value })} required /></label>
        <label className="field field-full" htmlFor="checkout-address"><span>Endereco de entrega</span><input id="checkout-address" name="address" type="text" autoComplete="street-address" minLength="8" value={profileFields.address} onChange={event => setProfileFields({ ...profileFields, address: event.target.value })} required /></label>
        <label className="field" htmlFor="checkout-payment"><span>Pagamento</span><select id="checkout-payment" name="payment" value={profileFields.payment} onChange={event => setProfileFields({ ...profileFields, payment: event.target.value })} required><option value="">Selecione</option><option value="pix">Pix</option><option value="card">Cartao</option><option value="cash">Dinheiro</option></select></label>
        <label className="field" htmlFor="checkout-document"><span>CPF/CNPJ opcional</span><input id="checkout-document" name="document" type="text" inputMode="numeric" minLength="11" maxLength="18" /></label>
        {profile ? <label className="field field-full field-checkbox" htmlFor="checkout-use-profile"><input id="checkout-use-profile" name="use-profile" type="checkbox" checked={useProfile} onChange={handleProfileToggle} /><span>Usar dados do perfil</span></label> : <p className="field-full form-hint"><a href="login.html?redirect=checkout.html">Entre na sua conta</a> para preencher seus dados automaticamente.</p>}
        <div className="field-full form-actions"><button className="button button-primary" type="submit" disabled={pending || !hasItems}>{pending ? 'Processando...' : 'Finalizar pedido'}</button><p id="checkout-feedback" className="form-feedback" data-status={feedback.status} aria-live="polite">{feedback.text}</p></div>
      </form>
    </div><aside className="checkout-page-summary"><div className="section-heading compact-heading"><div><p className="section-kicker">Resumo</p><h2>Seu pedido</h2></div></div><ul id="checkout-items" className="checkout-items-list">{cart.items.map(item => <li className="checkout-item" key={item.cartItemId}><span className="checkout-item-name">{item.name} x{item.quantity}</span><span className="checkout-item-price">{currency(item.price * item.quantity)}</span></li>)}</ul><dl className="cart-summary"><div><dt>Subtotal</dt><dd id="checkout-subtotal">{currency(cart.subtotal)}</dd></div><div><dt>Entrega</dt><dd id="checkout-fee">{currency(cart.deliveryFee)}</dd></div><div className="summary-total"><dt>Total</dt><dd id="checkout-total">{currency(cart.total)}</dd></div></dl></aside></div>
  </div></section></main>;
}
