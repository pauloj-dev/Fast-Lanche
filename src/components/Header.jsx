import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { PROFILE_KEY, SESSION_KEY, getAccount, logout } from '../services/authService.js';
import { subscribeToStorage } from '../services/storage/storageEvents.js';

const links = [
  ['index.html', 'Home'], ['cardapio.html', 'Cardapio'],
  ['reservas.html', 'Reservas'], ['feedbacks.html', 'Feedbacks']
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(getAccount);
  const { cart } = useCart();
  const page = location.pathname.split('/').pop() || 'index.html';
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  useEffect(() => {
    return subscribeToStorage([SESSION_KEY, PROFILE_KEY], () => setAccount(getAccount()));
  }, []);
  return <header className="site-header">
    <div className="container header-layout">
      <div className="header-row">
        <a className="brand" href="index.html" aria-label="Fast Lanche - inicio">Fast Lanche</a>
        <button className={`nav-toggle${open ? ' active' : ''}`} id="nav-toggle" type="button" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="nav-toggle-bar"/><span className="nav-toggle-bar"/><span className="nav-toggle-bar"/>
        </button>
      </div>
      <nav className={`main-nav${open ? ' open' : ''}`} id="main-nav" aria-label="Navegacao principal">
        {links.map(([href, label]) => <a key={href} href={href} className={page === href ? 'active' : undefined} aria-current={page === href ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</a>)}
      </nav>
      <div id="profile-header-container" className="profile-header-container">{account.loggedIn && <a className="profile-avatar-btn" href="perfil.html" aria-current={page === 'perfil.html' ? 'page' : undefined} title={account.name}>{account.avatar ? <img className="profile-avatar-img" src={account.avatar} alt={account.name || 'Avatar do usuário'}/> : <span className="profile-avatar-initials" aria-hidden="true">{account.initials}</span>}<span className="sr-only">Meu perfil</span></a>}</div>
      <div className="cart-header-container"><a className="cart-header-link" href="carrinho.html" title="Carrinho"><span className="cart-header-icon" aria-hidden="true">🛒</span><span className="sr-only">Carrinho, itens: </span><span className="cart-header-badge" id="cart-header-badge">{count}</span></a></div>
      <div id="login-header-container" className="login-header-container">{account.loggedIn ? <button className="nav-link-btn login-header-btn" type="button" onClick={() => logout().catch(() => {})} aria-label={`Sair da conta de ${account.name || account.email}`}>Sair</button> : <a className="nav-link-btn login-header-btn" href={page === 'login.html' ? 'login.html' : `login.html?redirect=${encodeURIComponent(page)}`}>Entrar</a>}</div>
    </div>
  </header>;
}

export function Footer() {
  return <footer className="site-footer"><div className="container footer-layout">
    <div className="footer-brand-info"><strong>Fast Lanche</strong><small>Delivery fast e reservas.</small></div>
    <nav className="footer-nav" aria-label="Links do rodape">{links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav>
    <div className="footer-hours"><small className="footer-hours-title">Horario de funcionamento</small><span>Seg a Dom: 11:00 - 23:00</span></div>
    <div className="footer-social"><small>Redes sociais</small><div className="footer-social-links"><a href="#" className="footer-social-link" aria-label="Instagram" title="Instagram">📷</a><a href="#" className="footer-social-link" aria-label="Facebook" title="Facebook">📘</a><a href="#" className="footer-social-link" aria-label="WhatsApp" title="WhatsApp">💬</a></div></div>
    <small className="footer-copyright">© 2026 Fast Lanche. Todos os direitos reservados.</small>
  </div></footer>;
}
