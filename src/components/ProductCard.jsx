import { useCart } from '../context/CartContext.jsx';

const images = {
  'Hambúrgueres': 'hamburguer', Pizzas: 'pizza', Combos: 'combo',
  Bebidas: 'bebida', Sobremesas: 'sobremesa', 'Porções': 'porcao'
};

export function ProductCard({ item }) {
  const { add } = useCart();
  return <article className="menu-item" data-category={item.category} data-product-id={item.id}>
    <div className="menu-item-visual" aria-hidden="true"><img className="menu-item-img" src={`assets/products/${images[item.category] || 'hamburguer'}.svg`} alt={`${item.category} - Fast Lanche`} loading="lazy"/></div>
    <p className="section-kicker">{item.category}</p><h3>{item.name}</h3><p>{item.description}</p>
    <div className="menu-item-footer"><span className="price">{item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      <div className="menu-item-actions"><button className="add-to-cart" type="button" onClick={() => add(item)} aria-label={`Adicionar ${item.name} ao carrinho`}>Adicionar ao carrinho</button></div>
    </div>
  </article>;
}
