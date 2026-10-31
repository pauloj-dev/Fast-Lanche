import { useCart } from '../context/CartContext.jsx';
import { getProductImageUrl } from '../components/ProductImage.jsx';
import { formatCurrency as currency } from '../utils/format.js';
import { FREE_DELIVERY_MINIMUM } from '../utils/businessRules.js';

export function FreeDeliveryBar({ subtotal }) {
  if (subtotal <= 0) return null;
  const missing = Math.max(FREE_DELIVERY_MINIMUM - subtotal, 0);
  const progress = Math.min(subtotal / FREE_DELIVERY_MINIMUM, 1) * 100;
  return <div className={`free-delivery-bar${missing ? '' : ' is-free'}`} role="status">
    <span>{missing ? <>Faltam <strong>{currency(missing)}</strong> para a entrega grátis</> : '🎉 Você ganhou entrega grátis!'}</span>
    <div className="free-delivery-track" aria-hidden="true"><div className="free-delivery-fill" style={{ width: `${progress}%` }}/></div>
  </div>;
}

export function CartPage() {
  const { cart, increment, decrement, remove, clear } = useCart();
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return <main id="top"><section id="cart-page" className="page-section cart-page-section" aria-labelledby="cart-page-title"><div className="container">
    <div className="section-heading"><div><p className="section-kicker">Seu pedido</p><h1 id="cart-page-title">Carrinho</h1></div><span className="cart-count" id="cart-count">{count} {count === 1 ? 'item' : 'itens'}</span></div>
    {!cart.items.length ? <div className="empty-state" role="status"><span className="empty-state-icon">🛒</span><span className="empty-state-text">Seu carrinho está vazio. Que tal um lanche caprichado?</span><a className="button button-primary" href="cardapio.html">Ver cardápio</a></div> :
    <div className="cart-page-layout"><div className="cart-page-items"><ul id="cart-items" className="cart-items">{cart.items.map(item => <li key={item.cartItemId} className="cart-item" data-category={item.category}><img className="cart-item-image" src={getProductImageUrl(item)} alt="" loading="lazy"/><div className="cart-item-info"><strong>{item.name}</strong><div className="cart-item-prices"><span className="cart-item-unit-price">{currency(item.price)} cada</span><span className="cart-item-total-price">{currency(item.price * item.quantity)}</span></div></div><div className="cart-item-controls"><button className="cart-control" type="button" onClick={() => decrement(item.cartItemId)} aria-label={`Diminuir quantidade de ${item.name}`}>−</button><span className="cart-quantity" aria-label={`Quantidade: ${item.quantity}`}>{item.quantity}</span><button className="cart-control" type="button" onClick={() => increment(item.cartItemId)} disabled={item.quantity >= item.maxQuantity} aria-label={`Aumentar quantidade de ${item.name}`}>+</button><button className="cart-remove" type="button" onClick={() => remove(item.cartItemId)} aria-label={`Remover ${item.name}`}>Remover</button></div></li>)}</ul></div>
      <aside className="cart-page-summary" aria-label="Resumo do pedido"><h2 className="form-section-title">Resumo</h2><FreeDeliveryBar subtotal={cart.subtotal}/><dl className="cart-summary"><div><dt>Subtotal</dt><dd id="cart-subtotal">{currency(cart.subtotal)}</dd></div><div><dt>Entrega</dt><dd id="cart-fee">{cart.deliveryFee ? currency(cart.deliveryFee) : 'Grátis'}</dd></div><div className="summary-total"><dt>Total</dt><dd id="cart-total">{currency(cart.total)}</dd></div></dl>
        <div className="cart-page-actions"><a className="button button-primary" href="checkout.html">Finalizar pedido</a><a className="button button-secondary" href="cardapio.html">Continuar comprando</a><button className="button button-secondary cart-clear-btn" id="clear-cart-btn" type="button" onClick={clear}>Limpar carrinho</button></div>
      </aside></div>}
  </div></section></main>;
}
