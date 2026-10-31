import { useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { ProductImage } from './ProductImage.jsx';
import { formatCurrency } from '../utils/format.js';

const ADDED_FEEDBACK_MS = 1200;

export function ProductCard({ item }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  function handleAdd() {
    add(item);
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), ADDED_FEEDBACK_MS);
  }
  return <article className="menu-item" data-category={item.category} data-product-id={item.id}>
    <div className="menu-item-visual" aria-hidden="true"><ProductImage item={item} className="menu-item-img"/></div>
    <p className="section-kicker">{item.category}</p><h3>{item.name}</h3><p>{item.description}</p>
    <div className="menu-item-footer"><span className="price">{formatCurrency(item.price)}</span>
      <div className="menu-item-actions"><button className={`add-to-cart${added ? ' is-added' : ''}`} type="button" onClick={handleAdd} aria-label={`Adicionar ${item.name} ao carrinho`}>{added ? 'Adicionado' : 'Adicionar'}</button></div>
    </div>
  </article>;
}
