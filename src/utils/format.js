export const formatCurrency = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatDateTime = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponivel' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};
