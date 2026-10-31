import { useEffect, useRef, useState } from 'react';
import { ProductImage } from '../components/ProductImage.jsx';
import { AUTH_CHANGE_EVENT, getAccount, getSafeRedirect, login, logout, register } from '../services/authService.js';

const REDIRECT_DELAY_MS = 600;

function LoginAside() {
  return <aside className="login-aside" aria-hidden="true">
    <div><p className="section-kicker">Fast Lanche</p><h2>Seu lanche favorito a um clique.</h2></div>
    <ProductImage item={{ category: 'Combos' }} loading="eager"/>
    <ul className="login-perks"><li>⚡ Checkout preenchido automaticamente</li><li>📦 Histórico dos seus pedidos</li><li>🪑 Reservas mais rápidas</li></ul>
  </aside>;
}

export function LoginPage() {
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'login');
  const [account, setAccount] = useState(getAccount);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', status: '' });
  const firstField = useRef(null);
  const redirect = getSafeRedirect(window.location.search);
  useEffect(() => { setFeedback({ text: '', status: '' }); }, [mode]);
  // Login/logout feito no Header ou em outra aba atualiza esta tela.
  useEffect(() => {
    const refresh = () => setAccount(getAccount());
    window.addEventListener('storage', refresh);
    window.addEventListener(AUTH_CHANGE_EVENT, refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener(AUTH_CHANGE_EVENT, refresh); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    try {
      const session = mode === 'signup'
        ? await register({ name: data.name, email: data.email, password: data.password, confirmPassword: data['confirm-password'], phone: data.phone })
        : await login({ email: data.email, password: data.password });
      setFeedback({ text: `${mode === 'signup' ? 'Conta criada' : 'Login realizado'}! Ola, ${session.name.split(' ')[0]}. Redirecionando...`, status: 'success' });
      window.setTimeout(() => { window.location.href = redirect; }, REDIRECT_DELAY_MS);
    } catch (error) {
      setFeedback({ text: error?.message || 'Nao foi possivel concluir. Tente novamente.', status: 'error' });
      setPending(false);
      firstField.current?.focus();
    }
  }

  async function handleLogout() {
    try { await logout(); } catch (error) { setFeedback({ text: error.message, status: 'error' }); }
  }

  if (account.loggedIn && !pending) {
    return <main id="top"><section id="login-page" className="page-section login-page-section" aria-labelledby="login-page-title"><div className="container login-page-container"><div className="login-page-card"><LoginAside/><div className="login-main">
      <div className="login-page-header"><p className="section-kicker">Conta ativa</p><h1 id="login-page-title">Você já está conectado</h1><p>Sessão de <strong>{account.name || account.email}</strong> ({account.email}).</p></div>
      <div className="form-actions login-session-actions"><a className="button button-primary" href={redirect}>Continuar</a><button className="button button-secondary" type="button" onClick={handleLogout}>Sair da conta</button></div>
    </div></div></div></section></main>;
  }

  const isSignup = mode === 'signup';
  return <main id="top"><section id="login-page" className="page-section login-page-section" aria-labelledby="login-page-title"><div className="container login-page-container"><div className="login-page-card"><LoginAside/><div className="login-main">
    <div className="login-page-header"><p className="section-kicker">Bem-vindo de volta</p><h1 id="login-page-title">{isSignup ? 'Crie sua conta' : 'Acesse sua conta'}</h1></div>
    <div className="login-tabs" role="tablist" aria-label="Login ou cadastro">
      <button className={`login-tab${!isSignup ? ' active' : ''}`} id="show-login" type="button" role="tab" aria-selected={!isSignup} aria-controls="login-panel" onClick={() => setMode('login')} disabled={pending}>Login</button>
      <button className={`login-tab${isSignup ? ' active' : ''}`} id="show-signup" type="button" role="tab" aria-selected={isSignup} aria-controls="login-panel" onClick={() => setMode('signup')} disabled={pending}>Cadastro</button>
    </div>
    <div className="login-panels"><div className="login-panel active" id="login-panel" role="tabpanel" aria-labelledby={isSignup ? 'show-signup' : 'show-login'}>
      {/* key: troca de aba remonta o formulario e limpa os campos (inclusive senhas). */}
      <form key={mode} id={isSignup ? 'signup-form' : 'login-form'} className="form-grid" onSubmit={submit} aria-busy={pending} noValidate>
        {isSignup && <label className="field" htmlFor="signup-name"><span>Nome completo</span><input ref={firstField} id="signup-name" name="name" type="text" autoComplete="name" minLength="3" maxLength="80" required placeholder="Seu nome"/></label>}
        <label className="field" htmlFor="auth-email"><span>E-mail</span><input ref={isSignup ? undefined : firstField} id="auth-email" name="email" type="email" autoComplete="email" maxLength="120" required placeholder="seu@email.com"/></label>
        <label className="field" htmlFor="auth-password"><span>Senha</span><input id="auth-password" name="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength="6" required placeholder="Mínimo 6 caracteres"/></label>
        {isSignup && <label className="field" htmlFor="signup-confirm-password"><span>Confirmar senha</span><input id="signup-confirm-password" name="confirm-password" type="password" autoComplete="new-password" minLength="6" required placeholder="Repita a senha"/></label>}
        {isSignup && <label className="field" htmlFor="signup-phone"><span>Telefone (opcional)</span><input id="signup-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength="15" placeholder="(00) 00000-0000"/></label>}
        <div className="field-full form-actions"><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Aguarde...' : isSignup ? 'Criar conta' : 'Entrar'}</button><p id="auth-feedback" className="form-feedback" data-status={feedback.status} role={feedback.status === 'error' ? 'alert' : undefined} aria-live="polite">{feedback.text}</p></div>
      </form>
      <p className="login-switch">{isSignup ? 'Já tem conta? ' : 'Ainda não tem conta? '}<button className="link-button" type="button" onClick={() => setMode(isSignup ? 'login' : 'signup')} disabled={pending}>{isSignup ? 'Fazer login' : 'Cadastre-se'}</button></p>
      <p className="form-hint">Ambiente de demonstração: os dados ficam somente neste navegador. Não use uma senha real.</p>
    </div></div>
  </div></div></div></section></main>;
}
