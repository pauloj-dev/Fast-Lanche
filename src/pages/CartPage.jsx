import { useCart } from '../context/CartContext.jsx';

const currency = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CartPage() {
  const { cart, increment, decrement, remove, clear } = useCart();
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return <main id="top"><section id="cart-page" className="page-section cart-page-section" aria-labelledby="cart-page-title"><div className="container">
    <div className="section-heading"><div><p className="section-kicker">Seu pedido</p><h1 id="cart-page-title">Carrinho</h1></div><span className="cart-count" id="cart-count">{count} {count === 1 ? 'item' : 'itens'}</span></div>
    <div className="cart-page-layout"><div className="cart-page-items"><ul id="cart-items" className="cart-items">{cart.items.length ? cart.items.map(item => <li key={item.id} className="cart-item"><div className="cart-item-info"><strong>{item.name}</strong><div className="cart-item-prices"><span className="cart-item-unit-price">{currency(item.price)} cada</span><span className="cart-item-total-price">Total: {currency(item.price * item.quantity)}</span></div></div><div className="cart-item-controls"><button className="cart-control" type="button" onClick={() => decrement(item.id)} aria-label={`Diminuir quantidade de ${item.name}`}>-</button><span className="cart-quantity">{item.quantity}</span><button className="cart-control" type="button" onClick={() => increment(item.id)} disabled={item.quantity >= item.maxQuantity} aria-label={`Aumentar quantidade de ${item.name}`}>+</button><button className="cart-remove" type="button" onClick={() => remove(item.id)}>Remover</button></div></li>) : <li className="empty-state">Seu carrinho esta vazio.</li>}</ul></div>
      <aside className="cart-page-summary"><dl className="cart-summary"><div><dt>Subtotal</dt><dd id="cart-subtotal">{currency(cart.subtotal)}</dd></div><div><dt>Entrega</dt><dd id="cart-fee">{currency(cart.deliveryFee)}</dd></div><div className="summary-total"><dt>Total</dt><dd id="cart-total">{currency(cart.total)}</dd></div></dl>
        <div className="cart-page-actions"><a className="button button-secondary" href="cardapio.html">Continuar comprando</a><a className={`button button-primary${!count ? ' is-disabled' : ''}`} aria-disabled={!count} href={count ? 'checkout.html' : undefined} onClick={event => { if (!count) event.preventDefault(); }}>Finalizar pedido</a>{cart.items.length > 0 && <button className="button button-secondary cart-clear-btn" id="clear-cart-btn" type="button" onClick={clear}>Limpar carrinho</button>}</div>
      </aside></div>
  </div></section></main>;
}
