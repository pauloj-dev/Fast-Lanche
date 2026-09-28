import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { createOrder } from '../services/orderService.js';
import { validateCheckout } from '../utils/businessRules.js';
import { useModal } from '../context/ModalContext.jsx';

const currency = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CheckoutPage() {
  const { open } = useModal();
  const { cart, clear } = useCart();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', status: '' });
  const [profile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fastlanche_user_profile') || 'null') || {}; }
    catch { return {}; }
  });
  const [useProfile, setUseProfile] = useState(true);
  const [profileFields, setProfileFields] = useState(() => ({ name: profile.name || '', email: profile.email || '', phone: profile.phone || '', address: profile.address || '', payment: profile.paymentMethod || '' }));
  function handleProfileToggle(event) {
    const enabled = event.target.checked;
    setUseProfile(enabled);
    if (enabled) setProfileFields({ name: profile.name || '', email: profile.email || '', phone: profile.phone || '', address: profile.address || '', payment: profile.paymentMethod || '' });
  }
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const errors = validateCheckout(data, cart.items.length);
    if (errors.length) { setFeedback({ text: errors[0], status: 'error' }); return; }
    setPending(true); setFeedback({ text: 'Pagamento simulado em processamento...', status: 'info' });
    try {
      await new Promise(resolve => window.setTimeout(resolve, 800));
      const order = { orderNumber: `FL-${Date.now().toString(36).toUpperCase()}`, customerName: String(data.name).trim(), email: String(data.email).trim(), phone: String(data.phone).trim(), address: String(data.address).trim(), document: String(data.document || '').trim(), paymentMethod: data.payment, paymentStatus: 'approved', status: 'received', items: cart.items, subtotal: cart.subtotal, deliveryFee: cart.deliveryFee, total: cart.total, createdAt: new Date().toISOString() };
      await createOrder(order);
      clear(); form.reset();
      setFeedback({ text: `Pedido ${order.orderNumber} registrado. Total ${currency(order.total)}.`, status: 'success' });
      open({ title: 'Pedido confirmado!', content: <div style={{ display: 'grid', gap: '.5rem' }}><p><strong>Pedido:</strong> {order.orderNumber}</p><p><strong>Total:</strong> {currency(order.total)}</p><p>Pagamento simulado aprovado.</p></div> });
    } catch { setFeedback({ text: 'Nao foi possivel finalizar o pedido. Tente novamente.', status: 'error' }); }
    finally { setPending(false); }
  }
  return <main id="top"><section id="checkout-page" className="page-section checkout-page-section" aria-labelledby="checkout-page-title"><div className="container">
    <div className="section-heading"><div><p className="section-kicker">Pagamento direto</p><h1 id="checkout-page-title">Checkout</h1></div><span className="secure-pill">Ambiente simulado</span></div><div className="checkout-page-layout"><div className="checkout-page-form">
      <form id="checkout-form" className="form-grid" onSubmit={submit}><label className="field" htmlFor="checkout-name"><span>Nome completo</span><input id="checkout-name" name="name" type="text" autoComplete="name" minLength="3" value={profileFields.name} onChange={event => setProfileFields({ ...profileFields, name: event.target.value })} required/></label><label className="field" htmlFor="checkout-email"><span>Email</span><input id="checkout-email" name="email" type="email" autoComplete="email" value={profileFields.email} onChange={event => setProfileFields({ ...profileFields, email: event.target.value })} required/></label><label className="field" htmlFor="checkout-phone"><span>Telefone</span><input id="checkout-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" minLength="10" maxLength="15" placeholder="(00) 00000-0000" value={profileFields.phone} onChange={event => setProfileFields({ ...profileFields, phone: event.target.value })} required/></label><label className="field field-full" htmlFor="checkout-address"><span>Endereco de entrega</span><input id="checkout-address" name="address" type="text" autoComplete="street-address" minLength="8" value={profileFields.address} onChange={event => setProfileFields({ ...profileFields, address: event.target.value })} required/></label><label className="field" htmlFor="checkout-payment"><span>Pagamento</span><select id="checkout-payment" name="payment" value={profileFields.payment} onChange={event => setProfileFields({ ...profileFields, payment: event.target.value })} required><option value="">Selecione</option><option value="pix">Pix</option><option value="card">Cartao</option><option value="cash">Dinheiro</option></select></label><label className="field" htmlFor="checkout-document"><span>CPF/CNPJ opcional</span><input id="checkout-document" name="document" type="text" inputMode="numeric" minLength="11" maxLength="18"/></label><label className="field field-full field-checkbox" htmlFor="checkout-use-profile"><input id="checkout-use-profile" name="use-profile" type="checkbox" checked={useProfile} onChange={handleProfileToggle}/><span>Usar dados do perfil</span></label><div className="field-full form-actions"><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Processando...' : 'Finalizar pedido'}</button><p id="checkout-feedback" className="form-feedback" data-status={feedback.status} aria-live="polite">{feedback.text}</p></div></form>
    </div><aside className="checkout-page-summary"><div className="section-heading compact-heading"><div><p className="section-kicker">Resumo</p><h2>Seu pedido</h2></div></div><ul id="checkout-items" className="checkout-items-list">{cart.items.map(item => <li className="checkout-item" key={item.id}><span className="checkout-item-name">{item.name} x{item.quantity}</span><span className="checkout-item-price">{currency(item.price * item.quantity)}</span></li>)}</ul><dl className="cart-summary"><div><dt>Subtotal</dt><dd id="checkout-subtotal">{currency(cart.subtotal)}</dd></div><div><dt>Entrega</dt><dd id="checkout-fee">{currency(cart.deliveryFee)}</dd></div><div className="summary-total"><dt>Total</dt><dd id="checkout-total">{currency(cart.total)}</dd></div></dl></aside></div>
  </div></section></main>;
}
