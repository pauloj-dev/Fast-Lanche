import { useEffect, useRef } from 'react';
import { useModal } from '../context/ModalContext.jsx';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modal acessivel (Fase 41): foco vai para dentro ao abrir, Tab fica preso no dialogo, Esc fecha e o foco volta
// para o elemento que abriu o modal.
export function ModalHost() {
  const { modal, close } = useModal();
  const dialog = useRef(null);
  const closeButton = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    if (!modal) return undefined;
    opener.current = document.activeElement;
    closeButton.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab' || !dialog.current) return;
      const items = [...dialog.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener.current instanceof HTMLElement && document.contains(opener.current)) opener.current.focus();
    };
  }, [modal, close]);

  return <><div id="modal-overlay" className={`modal-overlay${modal ? ' active' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-hidden={!modal} onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="modal" ref={dialog}><div className="modal-header"><h3 id="modal-title">{modal?.title}</h3><button ref={closeButton} className="modal-close" id="modal-close" type="button" aria-label="Fechar modal" onClick={close}>&times;</button></div><div className="modal-body" id="modal-body">{modal?.content}</div><div className="modal-actions" id="modal-actions"><button className="button button-primary" type="button" onClick={close}>Fechar</button></div></div>
  </div><div id="toast-container" aria-live="polite" aria-atomic="true"/></>;
}
