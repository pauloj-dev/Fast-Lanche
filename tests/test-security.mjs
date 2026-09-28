// Test de verificación del módulo de seguridad (Fase 29)
import * as sec from '../js/security.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log('  ✓ ' + message);
    } else {
        failed++;
        console.error('  ✗ ' + message);
    }
}

console.log('=== TESTE DO MÓDULO DE SEGURANÇA ===');

// Test sanitizeName
console.log('\n--- sanitizeName ---');
assert(sec.sanitizeName('João<script>alert(1)</script>') === 'João', 'Remove tags HTML');
assert(sec.sanitizeName('  Maria  Silva  ') === 'Maria Silva', 'Normaliza espaços');
assert(sec.sanitizeName('') === '', 'Retorna vazio para entrada vazia');

// Test sanitizeEmail
console.log('\n--- sanitizeEmail ---');
assert(sec.sanitizeEmail('USER@Example.COM') === 'user@example.com', 'Converte para minúsculas');
assert(sec.sanitizeEmail('user<script>@email.com') === 'user@email.com', 'Remove tags HTML');

// Test sanitizePhone
console.log('\n--- sanitizePhone ---');
assert(sec.sanitizePhone('(11) 99999-9999') === '(11) 99999-9999', 'Mantém formato válido');
assert(sec.sanitizePhone('abc123') === '123', 'Remove letras');

// Test sanitizeAddress
console.log('\n--- sanitizeAddress ---');
assert(sec.sanitizeAddress('Rua <b>Teste</b>, 123') === 'Rua Teste, 123', 'Remove tags HTML');

// Test sanitizeComment
console.log('\n--- sanitizeComment ---');
assert(sec.sanitizeComment('Ótimo lanche! 😋') === 'Ótimo lanche! 😋', 'Mantém acentos e emojis');

// Test validators
console.log('\n--- Validação de formatos ---');
assert(sec.isValidEmail('user@email.com') === true, 'Email válido');
assert(sec.isValidEmail('invalid-email') === false, 'Email inválido');
assert(sec.isValidPhone('11999999999') === true, 'Telefone válido (11 dígitos)');
assert(sec.isValidPhone('123') === false, 'Telefone inválido');
assert(sec.isValidDocument('12345678901') === true, 'CPF válido (11 dígitos)');
assert(sec.isValidDocument('12345678901234') === true, 'CNPJ válido (14 dígitos)');
assert(sec.isValidDocument('123') === false, 'Documento inválido');

// Test validateCheckoutInput
console.log('\n--- validateCheckoutInput ---');
const validCheckout = sec.validateCheckoutInput({
    name: 'João Silva',
    phone: '(11) 99999-9999',
    address: 'Rua Teste, 123',
    document: '12345678901',
    paymentMethod: 'pix'
});
assert(validCheckout.isValid === true, 'Checkout válido');
assert(validCheckout.sanitized.name === 'João Silva', 'Nome sanitizado');

const invalidCheckout = sec.validateCheckoutInput({
    name: 'Jo',
    phone: '123',
    address: 'Rua',
    document: '123',
    paymentMethod: ''
});
assert(invalidCheckout.isValid === false, 'Checkout inválido');
assert(invalidCheckout.errors.length > 0, 'Erros retornados');

// Test validateProfileInput
console.log('\n--- validateProfileInput ---');
const validProfile = sec.validateProfileInput({
    name: 'Maria Silva',
    email: 'maria@email.com',
    phone: '11999999999',
    address: 'Rua das Flores, 456'
});
assert(validProfile.isValid === true, 'Perfil válido');

// Test validateClaimInput
console.log('\n--- validateClaimInput ---');
const validClaim = sec.validateClaimInput({
    restaurantName: 'Fast Lanche',
    address: 'Rua Principal, 100 - Centro, São Paulo, SP, 01000-000',
    phone: '11999999999',
    openingOpen: '11:00',
    openingClose: '23:00',
    description: 'Restaurante de lanches e pizzas artesanais.'
});
assert(validClaim.isValid === true, 'Claim válido');

// Test validateFeedbackInput
console.log('\n--- validateFeedbackInput ---');
const validFeedback = sec.validateFeedbackInput({
    name: 'Cliente',
    rating: 5,
    comment: 'Ótimo atendimento e comida deliciosa!'
});
assert(validFeedback.isValid === true, 'Feedback válido');

// Test safe localStorage helpers
console.log('\n--- safe localStorage helpers ---');
assert(typeof sec.safeGetItem === 'function', 'safeGetItem existe');
assert(typeof sec.safeSetItem === 'function', 'safeSetItem existe');
assert(typeof sec.safeRemoveItem === 'function', 'safeRemoveItem existe');

// Test escapeHtml
console.log('\n--- escapeHtml ---');
const escaped = sec.escapeHtml('<script>alert("x")</script>');
assert(escaped.includes('&lt;script&gt;') && escaped.includes('&lt;/script&gt;'), 'Escapa tags HTML');
assert(escaped.includes('&quot;x&quot;'), 'Escapa aspas');

console.log('\n=== RESULTADO: ' + passed + ' passaram, ' + failed + ' falharam ===');
process.exit(failed > 0 ? 1 : 0);
