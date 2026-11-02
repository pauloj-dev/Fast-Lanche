// Formatacao compartilhada (Fase 41): moeda, datas, plurais e notas. Usada pelas paginas React e pelos modulos
// legados que importam de src/. Valor invalido nunca lanca: vira um texto neutro.
const LOCALE = 'pt-BR';
const INVALID_DATE = 'Data indisponivel';

export const formatCurrency = value => (Number(value) || 0).toLocaleString(LOCALE, { style: 'currency', currency: 'BRL' });

const toDate = value => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
// Data de calendario "AAAA-MM-DD" interpretada no fuso local (new Date('2026-11-05') seria UTC e mudaria o dia).
const fromDateString = value => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};
const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);

// 05/11/2026, 20:43
export const formatDateTime = value => toDate(value)?.toLocaleString(LOCALE, { dateStyle: 'short', timeStyle: 'short' }) ?? INVALID_DATE;
// 5 de novembro de 2026 às 20:43
export const formatLongDateTime = value => toDate(value)?.toLocaleString(LOCALE, { dateStyle: 'long', timeStyle: 'short' }) ?? INVALID_DATE;
// Quinta-feira, 05 de novembro (a partir de "AAAA-MM-DD")
export const formatWeekdayDate = value => {
  const date = fromDateString(value);
  return date ? capitalize(date.toLocaleDateString(LOCALE, { weekday: 'long', day: '2-digit', month: 'long' })) : String(value ?? '');
};
// 05/11/2026 (a partir de "AAAA-MM-DD")
export const formatShortDate = value => (fromDateString(value) ? String(value).split('-').reverse().join('/') : String(value ?? ''));
// 05 de nov.
export const formatDayMonth = value => toDate(value)?.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' }) ?? '—';
// novembro de 2026
export const formatMonthYear = value => toDate(value)?.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' }) ?? '';

export const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
export const formatPeople = count => plural(count, 'pessoa', 'pessoas');
// 4,3
export const formatAverage = value => (Number(value) || 0).toFixed(1).replace('.', ',');
