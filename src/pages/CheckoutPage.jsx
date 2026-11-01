import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { readSession } from '../services/authService.js';
import { getCheckoutDefaults } from '../services/profileService.js';
import { getReceiptUrl, placeOrder } from '../services/checkoutService.js';
import { getProductImageUrl } from '../components/ProductImage.jsx';
import { FreeDeliveryBar } from './CartPage.jsx';
import { formatCurrency as currency } from '../utils/format.js';

const PAYMENT_OPTIONS = [['pix', '⚡', 'Pix', 'Aprovação na hora'], ['card', '💳', 'Cartão', 'Crédito ou débito'], ['cash', '💵', 'Dinheiro', 'Pague na entrega']];
const EMPTY_FIELDS = { name: '', email: '', phone: '', address: '', payment: '' };

export function CheckoutPage() {
  const { cart, clear } = useCart();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', status: '' });
  // Pre-preenchimento so com o perfil da conta logada (editado em perfil.html).
  const [profile] = useState(getCheckoutDefaults);
  const [useProfile, setUseProfile] = useState(Boolean(profile));
  const [profileFields, setProfileFields] = useState(() => profile || EMPTY_FIELDS);
  function handleProfileToggle(event) {
    const enabled = event.target.checked;
    setUseProfile(enabled);
    if (enabled && profile) setProfileFields(profile);
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
  const setField = name => event => setProfileFields({ ...profileFields, [name]: event.target.value });
  return <main id="top"><section id="checkout-page" className="page-section checkout-page-section" aria-labelledby="checkout-page-title"><div className="container">
    <div className="section-heading"><div><p className="section-kicker">Pagamento direto</p><h1 id="checkout-page-title">Checkout</h1></div><span className="secure-pill">🔒 Ambiente simulado</span></div>
    {!hasItems ? <div className="empty-state checkout-empty-state" role="status"><span className="empty-state-icon">🛒</span><span className="empty-state-text">Seu carrinho está vazio. Escolha seus itens para finalizar o pedido.</span><a className="button button-primary" href="cardapio.html">Escolher itens</a></div> :
    <div className="checkout-page-layout"><div className="checkout-page-form">
      <form id="checkout-form" className="form-grid" onSubmit={submit} aria-busy={pending}>
        <h2 className="form-section-title"><span aria-hidden="true">1</span>Seus dados</h2>
        {profile ? <label className="field field-full field-checkbox" htmlFor="checkout-use-profile"><input id="checkout-use-profile" name="use-profile" type="checkbox" checked={useProfile} onChange={handleProfileToggle} /><span>Usar dados do perfil</span></label> : <p className="field-full form-hint"><a href="login.html?redirect=checkout.html">Entre na sua conta</a> para preencher seus dados automaticamente.</p>}
        <label className="field" htmlFor="checkout-name"><span>Nome completo</span><input id="checkout-name" name="name" type="text" autoComplete="name" minLength="3" value={profileFields.name} onChange={setField('name')} required /></label>
        <label className="field" htmlFor="checkout-email"><span>E-mail</span><input id="checkout-email" name="email" type="email" autoComplete="email" value={profileFields.email} onChange={setField('email')} required /></label>
        <label className="field" htmlFor="checkout-phone"><span>Telefone</span><input id="checkout-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" minLength="10" maxLength="15" placeholder="(00) 00000-0000" value={profileFields.phone} onChange={setField('phone')} required /></label>
        <label className="field" htmlFor="checkout-document"><span>CPF/CNPJ (opcional)</span><input id="checkout-document" name="document" type="text" inputMode="numeric" minLength="11" maxLength="18" /></label>
        <h2 className="form-section-title"><span aria-hidden="true">2</span>Entrega</h2>
        <label className="field field-full" htmlFor="checkout-address"><span>Endereço de entrega</span><input id="checkout-address" name="address" type="text" autoComplete="street-address" minLength="8" placeholder="Rua, número, bairro" value={profileFields.address} onChange={setField('address')} required /></label>
        <h2 className="form-section-title"><span aria-hidden="true">3</span>Pagamento</h2>
        <fieldset className="payment-options"><legend className="sr-only">Forma de pagamento</legend>{PAYMENT_OPTIONS.map(([value, icon, label, hint]) => <label key={value} className="payment-option"><input type="radio" name="payment" value={value} checked={profileFields.payment === value} onChange={setField('payment')} required/><span className="payment-option-icon" aria-hidden="true">{icon}</span><span>{label}</span><small>{hint}</small></label>)}</fieldset>
        <div className="field-full form-actions"><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Processando pagamento...' : `Pagar ${currency(cart.total)}`}</button><p id="checkout-feedback" className="form-feedback" data-status={feedback.status} aria-live="polite">{feedback.text}</p></div>
      </form>
    </div><aside className="checkout-page-summary" aria-label="Resumo do pedido"><h2 className="form-section-title">Seu pedido</h2><ul id="checkout-items" className="checkout-items-list">{cart.items.map(item => <li className="checkout-item" key={item.cartItemId} data-category={item.category}><img className="checkout-item-thumb" src={getProductImageUrl(item)} alt=""/><span className="checkout-item-name">{item.quantity}× {item.name}</span><span className="checkout-item-price">{currency(item.price * item.quantity)}</span></li>)}</ul><FreeDeliveryBar subtotal={cart.subtotal}/><dl className="cart-summary"><div><dt>Subtotal</dt><dd id="checkout-subtotal">{currency(cart.subtotal)}</dd></div><div><dt>Entrega</dt><dd id="checkout-fee">{cart.deliveryFee ? currency(cart.deliveryFee) : 'Grátis'}</dd></div><div className="summary-total"><dt>Total</dt><dd id="checkout-total">{currency(cart.total)}</dd></div></dl><a className="button button-secondary button-small" href="carrinho.html">Editar carrinho</a></aside></div>}
  </div></section></main>;
}
