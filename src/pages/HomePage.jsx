import { useEffect, useState } from 'react';
import { getMenuItem } from '../services/menuService.js';
import { useCart } from '../context/CartContext.jsx';
import { ProductImage } from '../components/ProductImage.jsx';
import { formatCurrency } from '../utils/format.js';
import { FREE_DELIVERY_MINIMUM } from '../utils/businessRules.js';

// Mesmo destaque da home legada (js/home.js: FEATURED_PRODUCT_ID).
const FEATURED_PRODUCT_ID = 14;

export function HomePage() {
  const [featured, setFeatured] = useState(null);
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  useEffect(() => { getMenuItem(FEATURED_PRODUCT_ID).then(setFeatured); }, []);
  function addFeatured() {
    add(featured);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }
  return <main id="top">
    <section className="hero" aria-labelledby="hero-title"><div className="container hero-layout">
      <div className="hero-copy"><p className="section-kicker">Delivery e reservas</p><h1 id="hero-title">Fome de <em>lanche bom?</em></h1><p>Hambúrgueres artesanais, pizzas e porções feitos na hora. Monte seu pedido em poucos cliques ou reserve sua mesa no Fast Lanche.</p>
        <div className="hero-actions"><a className="button button-primary" href="cardapio.html">Ver cardápio</a><a className="button button-secondary" href="reservas.html">Reservar mesa</a></div>
        <ul className="hero-stats" aria-label="Destaques do restaurante"><li><strong>25 min</strong><span>tempo médio de preparo</span></li><li><strong>4,8 ★</strong><span>avaliação dos clientes</span></li><li><strong>Grátis</strong><span>entrega acima de {formatCurrency(FREE_DELIVERY_MINIMUM)}</span></li></ul>
      </div>
      <div className="hero-feature" aria-label="Pedido em destaque" data-category={featured?.category}>
        <span className="hero-badge">🔥 Destaque da casa</span>
        <div className="hero-feature-visual" aria-hidden="true">{featured && <ProductImage item={featured} className="hero-feature-img" loading="eager"/>}</div>
        {featured ? <>
          <p className="section-kicker">{featured.category}</p><h2 className="hero-feature-title">{featured.name}</h2><p className="featured-product-description">{featured.description}</p>
          <div className="feature-row"><span>A partir de</span><strong>{formatCurrency(featured.price)}</strong></div>
          <div className="featured-product-actions"><button className="button button-primary featured-add-btn" type="button" onClick={addFeatured}>{added ? '✓ Adicionado' : 'Adicionar ao carrinho'}</button><a className="button button-secondary" href="carrinho.html">Ver carrinho</a></div>
        </> : <div className="feature-row"><strong>Combo Fast</strong></div>}
      </div>
    </div></section>
    <section id="quick-access" className="page-section quick-access-section" aria-labelledby="quick-access-title"><div className="container"><div className="section-heading"><div><p className="section-kicker">Acesso rápido</p><h2 id="quick-access-title">O que você procura?</h2></div></div><div className="quick-access-grid">
      <a className="quick-access-card" href="cardapio.html"><span className="quick-access-icon" aria-hidden="true">🍔</span><strong>Cardápio</strong><span>Explore nossos lanches, pizzas e mais</span></a>
      <a className="quick-access-card" href="reservas.html"><span className="quick-access-icon" aria-hidden="true">🪑</span><strong>Reservas de mesas</strong><span>Reserve sua mesa com antecedência</span></a>
      <a className="quick-access-card" href="feedbacks.html"><span className="quick-access-icon" aria-hidden="true">⭐</span><strong>Feedbacks</strong><span>Veja o que nossos clientes acham</span></a>
      <a className="quick-access-card" href="carrinho.html"><span className="quick-access-icon" aria-hidden="true">🛒</span><strong>Meu carrinho</strong><span>Revise seu pedido antes de finalizar</span></a>
    </div></div></section>
    <section id="benefits" className="page-section benefits-section" aria-labelledby="benefits-title"><div className="container"><div className="section-heading"><div><p className="section-kicker">Por que escolher</p><h2 id="benefits-title">Nossos diferenciais</h2></div></div><div className="benefits-grid">
      <div className="benefit-card"><span className="benefit-icon" aria-hidden="true">⚡</span><strong>Entrega rápida</strong><span>Seu pedido chega quentinho em média em 25 minutos.</span></div>
      <div className="benefit-card"><span className="benefit-icon" aria-hidden="true">🔒</span><strong>Pagamento seguro</strong><span>Pague com Pix, cartão ou dinheiro com total segurança.</span></div>
      <div className="benefit-card"><span className="benefit-icon" aria-hidden="true">📅</span><strong>Reservas antecipadas</strong><span>Garanta sua mesa com pagamento adiantado simulado.</span></div>
      <div className="benefit-card"><span className="benefit-icon" aria-hidden="true">💬</span><strong>Avaliações reais</strong><span>Feedbacks de quem já experimentou.</span></div>
    </div></div></section>
  </main>;
}
