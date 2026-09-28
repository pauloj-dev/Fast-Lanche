import { useEffect, useMemo, useState } from 'react';
import { getMenuItems } from '../services/menuService.js';
import { ProductCard } from '../components/ProductCard.jsx';

export function MenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    getMenuItems().then(setMenuItems);
    const check = () => { try { setClosed(localStorage.getItem('fastlanche_restaurant_status') === '"closed"'); } catch { setClosed(false); } };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);
  const visibleItems = useMemo(() => {
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const term = normalize(searchTerm.trim());
    return menuItems.filter(item => item.active && (activeFilter === 'all' || item.category === activeFilter) && normalize(`${item.name} ${item.description}`).includes(term));
  }, [menuItems, activeFilter, searchTerm]);
  return <main id="top"><section id="menu" className="page-section menu-section" aria-labelledby="menu-title"><div className="container">
    <div className="section-heading"><div><p className="section-kicker">Cardápio online</p><h1 id="menu-title">Escolha seu lanche</h1></div><div className="menu-tools" aria-label="Filtros do cardapio">
      <label className="field field-inline" htmlFor="search-input"><span>Buscar</span><input id="search-input" type="search" placeholder="Nome ou descricao" value={searchTerm} onChange={event => setSearchTerm(event.target.value)}/></label>
      <label className="field field-inline" htmlFor="category-filter"><span>Categoria</span><select id="category-filter" value={activeFilter} onChange={event => setActiveFilter(event.target.value)}><option value="all">Todas</option>{['Hambúrgueres','Pizzas','Combos','Bebidas','Sobremesas','Porções'].map(category => <option key={category}>{category}</option>)}</select></label>
    </div></div>
    <div id="menu-items" className="cards-grid" aria-live="polite">{closed ? <div className="restaurant-closed-banner"><span className="restaurant-closed-icon">🕐</span><div className="restaurant-closed-text"><strong>Restaurante fechado no momento</strong><span>Volte mais tarde para fazer seu pedido.</span></div></div> : visibleItems.length ? visibleItems.map(item => <ProductCard key={item.id} item={item}/>) : <p className="empty-state menu-empty"><span className="empty-state-icon">🍔</span><span className="empty-state-text">Nenhum item ativo encontrado para essa busca.</span></p>}</div>
  </div></section></main>;
}
