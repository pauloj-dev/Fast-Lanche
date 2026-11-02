import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_PAGES, DEFAULT_WIDTHS, auditPage, runResponsiveAudit } from './browser/responsive-audit.js';

// A auditoria visual roda no navegador (tests/browser/responsive-audit.js). Aqui garantimos que as regras de CSS que
// a deixaram verde continuem existindo: cada uma corrige um estouro real encontrado na Fase 42.
const css = readFileSync('css/styles.css', 'utf-8');
const has = (pattern, message) => assert.match(css, pattern, message);

test('responsive guards found by the Fase 42 audit stay in the stylesheet', () => {
  has(/main \{\s*overflow-wrap: anywhere;/, 'palavras longas quebram em vez de alargar grids/flex');
  has(/main button,\s*main \.button,[\s\S]*?\{\s*overflow-wrap: normal;/, 'botoes nao quebram letra a letra');
  has(/fieldset \{\s*min-width: 0;/, 'fieldset nao cresce com a faixa de datas/chips');
  has(/\.review-toolbar select \{\s*min-width: 0;\s*width: 100%;/, 'select com opcao longa nao alarga os filtros');
  has(/\.account-stats div:nth-child\(2\) \{\s*grid-column: 1 \/ -1;/, 'total gasto ocupa a linha inteira no celular');
  has(/\.header-layout:has\(\.profile-avatar-btn\) \.brand \{\s*font-size: 0;/, 'header logado cabe em telas estreitas');
  has(/\.review-card header > div \{\s*flex: 1 1 10rem;/, 'nome do avaliador nao e espremido pelo selo');
  has(/\.field-checkbox input\[type="checkbox"\],[\s\S]*?min-height: 1\.5rem;/, 'checkbox com area minima de 24px');
  has(/#checkout-use-profile \{\s*width: 1\.5rem;\s*height: 1\.5rem;/, 'checkbox do checkout com 24px');
  has(/\.cart-control \{\s*min-width: 2\.75rem;\s*min-height: 2\.75rem;/, 'controles do carrinho com ~44px no celular');
  has(/a:focus-visible,\s*button:focus-visible,[\s\S]*?outline: 3px solid var\(--amarelo\) !important;[\s\S]*?box-shadow: 0 0 0 2px var\(--preto\) !important;/, 'anel de foco de teclado visivel em qualquer fundo');
});

test('price values never break in the middle of the number', () => {
  const block = css.slice(css.indexOf('/* Valores nunca quebram no meio do numero. */'));
  for (const selector of ['.price', '.checkout-item-price', '.receipt-item-total', '.account-order-total', '.booking-summary dd']) {
    assert.ok(block.slice(0, 600).includes(selector), `${selector} deveria ter white-space: nowrap`);
  }
});

test('browser audit covers phone, tablet and desktop widths and every React shell', () => {
  assert.ok(DEFAULT_WIDTHS.some(width => width <= 320), 'smartphone pequeno');
  assert.ok(DEFAULT_WIDTHS.some(width => width >= 400 && width < 600), 'smartphone grande');
  assert.ok(DEFAULT_WIDTHS.some(width => width >= 768 && width < 1100), 'tablet');
  assert.ok(DEFAULT_WIDTHS.some(width => width >= 1280), 'desktop');
  for (const shell of ['index', 'cardapio', 'carrinho', 'checkout', 'receipt', 'login', 'perfil', 'reservas', 'feedbacks']) {
    assert.ok(DEFAULT_PAGES.includes(`react/${shell}.html`), `react/${shell}.html na auditoria`);
  }
  assert.equal(typeof auditPage, 'function');
  assert.equal(typeof runResponsiveAudit, 'function');
});
