import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext.jsx';

const links = [
  ['index.html', 'Home'], ['cardapio.html', 'Cardapio'],
  ['reservas.html', 'Reservas'], ['feedbacks.html', 'Feedbacks']
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(() => readAccount());
  const { cart } = useCart();
  const page = location.pathname.split('/').pop() || 'index.html';
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  useEffect(() => {
    const refresh = () => setAccount(readAccount());
    window.addEventListener('storage', refresh);
    window.addEventListener('appstate:update', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('appstate:update', refresh);
    };
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
      <div id="profile-header-container" className="profile-header-container">{account.loggedIn && <a className="profile-avatar-btn" href="perfil.html" aria-label="Meu perfil" title={account.name}>{account.avatar ? <img className="profile-avatar-img" src={account.avatar} alt={account.name || 'Avatar do usuário'}/> : <span className="profile-avatar-initials">{account.initials}</span>}</a>}</div>
      <div className="cart-header-container"><a className="cart-header-link" href="carrinho.html" aria-label="Ver carrinho" title="Carrinho"><span className="cart-header-icon">🛒</span><span className="cart-header-badge" id="cart-header-badge">{count}</span></a></div>
      <div id="login-header-container" className="login-header-container">{!account.loggedIn && <a className="nav-link-btn login-header-btn" href="login.html" aria-label="Fazer login">Entrar</a>}</div>
    </div>
  </header>;
}

function readAccount() {
  try {
    const session = JSON.parse(localStorage.getItem('fastlanche_session') || 'null');
    const profile = JSON.parse(localStorage.getItem('fastlanche_user_profile') || 'null');
    const name = profile?.name || session?.name || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return { loggedIn: Boolean(session?.email), name, avatar: profile?.avatar || '', initials: parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase() : (parts[0]?.[0] || '?').toUpperCase() };
  } catch {
    return { loggedIn: false, name: '', avatar: '', initials: '?' };
  }
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
