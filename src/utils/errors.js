// Politica de erros (Fase 40): a interface so mostra mensagens pensadas para o usuario; detalhe tecnico vai apenas
// para o console em desenvolvimento (Vite DEV). Em producao e nos testes nada tecnico e exibido ou registrado.

// Erro esperado (validacao, regra de negocio, armazenamento cheio...): a mensagem pode ir direto para a UI.
export class AppError extends Error {
  constructor(message, { code = 'app_error', cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AppError';
    this.code = code;
  }
}

const isDev = () => {
  try { return Boolean(import.meta.env?.DEV); } catch { return false; }
};

export function reportError(context, error) {
  if (isDev()) console.error(`[Fast Lanche] ${context}`, error);
}

// Mensagem segura para a interface: AppError mostra sua mensagem; qualquer outro erro vira o texto generico.
export function toUserMessage(error, fallback = 'Algo deu errado. Tente novamente.') {
  if (error instanceof AppError) return error.message;
  reportError('erro inesperado', error);
  return fallback;
}
