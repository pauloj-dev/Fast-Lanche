export function HomePage() {
  return <main id="top">
    <section className="hero" aria-labelledby="hero-title"><div className="container hero-layout">
      <div className="hero-copy"><p className="section-kicker">Delivery e reservas</p><h1 id="hero-title">Fast Lanche</h1><p>Monte seu pedido, acompanhe o total e reserve uma mesa em uma experiencia simples e rapida.</p><div className="hero-actions"><a className="button button-primary" href="cardapio.html">Ver cardapio</a><a className="button button-secondary" href="reservas.html">Reservar mesa</a></div></div>
      <div className="hero-feature" aria-label="Pedido em destaque"><span className="hero-badge">Pronto em media: 25 min</span><div className="plate-visual" aria-hidden="true"><span/></div><div className="feature-row"><strong>Combo Fast</strong><span>R$ 29,90</span></div></div>
    </div></section>
    <section id="quick-access" className="page-section quick-access-section" aria-labelledby="quick-access-title"><div className="container"><div className="section-heading"><div><p className="section-kicker">Acesso rapido</p><h2 id="quick-access-title">O que voce procura?</h2></div></div><div className="quick-access-grid">
      <a className="quick-access-card" href="cardapio.html"><span className="quick-access-icon">🍔</span><strong>Cardapio</strong><span>Explore nossos lanches, pizzas e mais</span></a>
      <a className="quick-access-card" href="reservas.html"><span className="quick-access-icon">🪑</span><strong>Reservas de Mesas</strong><span>Reserve sua mesa com antecedencia</span></a>
      <a className="quick-access-card" href="feedbacks.html"><span className="quick-access-icon">⭐</span><strong>Feedbacks</strong><span>Veja o que nossos clientes acham</span></a>
      <a className="quick-access-card" href="carrinho.html"><span className="quick-access-icon">🛒</span><strong>Meu Carrinho</strong><span>Revise seu pedido antes de finalizar</span></a>
    </div></div></section>
    <section id="benefits" className="page-section benefits-section" aria-labelledby="benefits-title"><div className="container"><div className="section-heading"><div><p className="section-kicker">Por que escolher</p><h2 id="benefits-title">Nossos diferenciais</h2></div></div><div className="benefits-grid">
      <div className="benefit-card"><span className="benefit-icon">⚡</span><strong>Entrega rapida</strong><span>Seu pedido chega quentinho em media em 25 minutos.</span></div><div className="benefit-card"><span className="benefit-icon">🔒</span><strong>Pagamento seguro</strong><span>Pague com Pix, cartao ou dinheiro com total seguranca.</span></div><div className="benefit-card"><span className="benefit-icon">📅</span><strong>Reservas antecipadas</strong><span>Garanta sua mesa com pagamento adiantado simulado.</span></div><div className="benefit-card"><span className="benefit-icon">💬</span><strong>Avaliacoes de clientes</strong><span>Feedbacks reais de quem ja experimentou.</span></div>
    </div></div></section>
  </main>;
}
