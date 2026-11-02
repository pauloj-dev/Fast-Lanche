// Estados de interface padronizados (Fase 41). Todos usam `.empty-state` e sao anunciados por leitores de tela:
// carregando e vazio como `status`, erro como `alert` com acao de tentar de novo.
export function LoadingState({ text = 'Carregando...', className = '' }) {
  return <div className={`empty-state is-loading ${className}`.trim()} role="status" aria-live="polite">
    <span className="state-spinner" aria-hidden="true"/><span className="empty-state-text">{text}</span>
  </div>;
}

export function ErrorState({ text = 'Não foi possível carregar.', onRetry, className = '' }) {
  return <div className={`empty-state is-error ${className}`.trim()} role="alert">
    <span className="empty-state-icon" aria-hidden="true">⚠️</span><span className="empty-state-text">{text}</span>
    {onRetry && <button className="button button-secondary button-small" type="button" onClick={onRetry}>Tentar novamente</button>}
  </div>;
}

export function EmptyState({ icon = '📭', text, children, className = '' }) {
  return <div className={`empty-state ${className}`.trim()} role="status">
    <span className="empty-state-icon" aria-hidden="true">{icon}</span><span className="empty-state-text">{text}</span>{children}
  </div>;
}
