import { useEffect, useMemo, useState } from 'react';
import { getMenuItems } from '../services/menuService.js';
import { ProductCard } from '../components/ProductCard.jsx';

const CATEGORIES = [
  ['Hambúrgueres', '🍔'], ['Pizzas', '🍕'], ['Combos', '🍟'],
  ['Bebidas', '🥤'], ['Sobremesas', '🍨'], ['Porções', '🍗']
];
const normalize = value => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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
  const searchMatches = useMemo(() => {
    const term = normalize(searchTerm.trim());
    return menuItems.filter(item => item.active && normalize(`${item.name} ${item.description}`).includes(term));
  }, [menuItems, searchTerm]);
  const visibleItems = activeFilter === 'all' ? searchMatches : searchMatches.filter(item => item.category === activeFilter);
  const countFor = category => searchMatches.filter(item => item.category === category).length;
  return <main id="top"><section id="menu" className="page-section menu-section" aria-labelledby="menu-title"><div className="container">
    <div className="section-heading"><div><p className="section-kicker">Cardápio online</p><h1 id="menu-title">Escolha seu lanche</h1></div><div className="menu-tools" role="search">
      <label className="field field-inline" htmlFor="search-input"><span className="sr-only">Buscar no cardapio</span><input id="search-input" type="search" placeholder="Buscar lanche, pizza, bebida..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)}/></label>
    </div></div>
    <div className="category-chips" role="group" aria-label="Filtrar por categoria">
      <button className="chip" type="button" aria-pressed={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>Todos <span className="chip-count">{searchMatches.length}</span></button>
      {CATEGORIES.map(([category, icon]) => <button key={category} className="chip" type="button" aria-pressed={activeFilter === category} onClick={() => setActiveFilter(category)}><span aria-hidden="true">{icon}</span>{category} <span className="chip-count">{countFor(category)}</span></button>)}
    </div>
    <div id="menu-items" className="cards-grid" aria-live="polite">{closed ? <div className="restaurant-closed-banner"><span className="restaurant-closed-icon">🕐</span><div className="restaurant-closed-text"><strong>Restaurante fechado no momento</strong><span>Volte mais tarde para fazer seu pedido.</span></div></div> : visibleItems.length ? visibleItems.map(item => <ProductCard key={item.id} item={item}/>) : <div className="empty-state menu-empty"><span className="empty-state-icon">🔎</span><span className="empty-state-text">Nenhum item encontrado para essa busca.</span>{(searchTerm || activeFilter !== 'all') && <button className="button button-secondary button-small" type="button" onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}>Limpar filtros</button>}</div>}</div>
  </div></section></main>;
}
