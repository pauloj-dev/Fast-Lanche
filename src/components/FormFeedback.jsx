import { useEffect, useRef } from 'react';

// Mensagem de formulario padronizada (Fase 41): status 'info' | 'success' | 'error'.
// Erro e anunciado como alerta e recebe o foco (o usuario de teclado/leitor de tela chega direto ao problema);
// os demais estados sao anunciados de forma educada pelo aria-live.
export function FormFeedback({ id, feedback, className = '' }) {
  const element = useRef(null);
  const isError = feedback.status === 'error';
  useEffect(() => {
    if (isError && feedback.text) element.current?.focus();
  }, [isError, feedback.text]);
  return <p ref={element} id={id} className={`form-feedback ${className}`.trim()} data-status={feedback.status} role={isError ? 'alert' : 'status'} aria-live={isError ? 'assertive' : 'polite'} tabIndex={-1}>{feedback.text}</p>;
}
