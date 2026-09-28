import { useModal } from '../context/ModalContext.jsx';

export function ModalHost() {
  const { modal, close } = useModal();
  return <><div id="modal-overlay" className={`modal-overlay${modal ? ' active' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-hidden={!modal} onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="modal"><div className="modal-header"><h3 id="modal-title">{modal?.title}</h3><button className="modal-close" id="modal-close" type="button" aria-label="Fechar modal" onClick={close}>&times;</button></div><div className="modal-body" id="modal-body">{modal?.content}</div><div className="modal-actions" id="modal-actions"><button className="button button-primary" type="button" onClick={close}>Fechar</button></div></div>
  </div><div id="toast-container" aria-live="polite" aria-atomic="true"/></>;
}
