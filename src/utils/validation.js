// Validacao e sanitizacao compartilhadas (Fase 40). Funcoes puras, sem DOM nem armazenamento: usadas pelas regras de
// negocio, pelos services (ao gravar e ao carregar) e pelas paginas React e legadas que importam de src/.

// Limites unicos dos campos de texto. Os mesmos de js/security.js (sanitizeProfileData) onde existiam.
export const FIELD_LIMITS = Object.freeze({
  name: 80, email: 120, phone: 20, document: 18, address: 200,
  productName: 80, category: 40, customization: 200, comment: 1000, notes: 200, search: 80, reference: 40
});

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

// Texto livre: sem tags (< e > removidos), sem caracteres de controle, espacos colapsados e tamanho limitado.
// React ja renderiza como texto; sanitizar antes de gravar garante que nenhum consumidor (legado, futura API) receba HTML.
export const sanitizeText = (value, maxLength = FIELD_LIMITS.comment) => String(value ?? '')
  .replace(/[<>]/g, '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

// Sanitiza recursivamente strings de um objeto simples (ex.: personalizacao de item). Profundidade e itens limitados.
export function sanitizeDeep(value, maxLength = FIELD_LIMITS.customization, depth = 0) {
  if (typeof value === 'string') return sanitizeText(value, maxLength);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean' || value === null) return value;
  if (depth >= 4) return null;
  if (Array.isArray(value)) return value.slice(0, 30).map(item => sanitizeDeep(item, maxLength, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 30)
      .filter(([key]) => /^[\w-]{1,40}$/.test(key) && !['__proto__', 'constructor', 'prototype'].includes(key))
      .map(([key, item]) => [key, sanitizeDeep(item, maxLength, depth + 1)]));
  }
  return null;
}

export const normalizeEmail = value => String(value || '').trim().toLowerCase();
export const isValidEmail = value => {
  const email = normalizeEmail(value);
  return email.length <= FIELD_LIMITS.email && EMAIL_PATTERN.test(email);
};

export const onlyDigits = value => String(value ?? '').replace(/\D/g, '');

// Telefone brasileiro com DDD: 10 (fixo) ou 11 (celular, comecando com 9) digitos e DDD de 11 a 99.
export function isValidPhone(value) {
  const digits = onlyDigits(value);
  if (String(value ?? '').trim().length > FIELD_LIMITS.phone) return false;
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (Number(digits.slice(0, 2)) < 11) return false;
  return digits.length === 10 || digits[2] === '9';
}

function hasRepeatedDigits(digits) { return /^(\d)\1+$/.test(digits); }

export function isValidCPF(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || hasRepeatedDigits(digits)) return false;
  const check = length => {
    const sum = [...digits.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

export function isValidCNPJ(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || hasRepeatedDigits(digits)) return false;
  const check = length => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}

export const isValidDocument = value => isValidCPF(value) || isValidCNPJ(value);

// Endereco: entre 8 e 200 caracteres uteis e ao menos uma letra (rejeita "12345678" ou so simbolos).
export function isValidAddress(value) {
  const raw = String(value ?? '').trim();
  const clean = sanitizeText(raw, FIELD_LIMITS.address);
  return raw.length <= FIELD_LIMITS.address && clean.length >= 8 && /\p{L}/u.test(clean);
}

// Data de calendario real no formato AAAA-MM-DD (rejeita 2026-02-30).
export function isValidDateString(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export const isValidTimeString = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value ?? ''));

// Texto livre obrigatorio: tamanho minimo depois de sanitizado e maximo antes (nao corta em silencio o que foi digitado).
export function checkTextLength(value, { min = 0, max }) {
  const raw = String(value ?? '').trim();
  if (raw.length > max) return 'too_long';
  if (sanitizeText(raw, max).length < min) return 'too_short';
  return '';
}
