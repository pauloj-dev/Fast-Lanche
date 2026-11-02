import { useEffect, useState } from 'react';
import { AUTH_CHANGE_EVENT, getLoginUrl, readSession } from '../services/authService.js';

// Protecao de pagina (Fase 40). A sessao e lida de forma sincrona no primeiro render: sem sessao valida (ou sem
// permissao em `authorize`, ex.: papel de administrador em uma pagina futura) a pagina recebe null, nao renderiza
// dados privados e e redirecionada para o login. Logout/expiracao em outra aba tambem redireciona.
export function useRequireSession(page, authorize = () => true) {
  const check = () => {
    const session = readSession();
    return session && authorize(session) ? session : null;
  };
  const [session, setSession] = useState(check);

  useEffect(() => {
    const enforce = () => {
      const next = check();
      if (!next) window.location.replace(getLoginUrl(page));
      setSession(next);
    };
    enforce();
    window.addEventListener('storage', enforce);
    window.addEventListener(AUTH_CHANGE_EVENT, enforce);
    return () => { window.removeEventListener('storage', enforce); window.removeEventListener(AUTH_CHANGE_EVENT, enforce); };
    // `authorize` e estavel por pagina; reavaliar a cada render redirecionaria em loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return session;
}
