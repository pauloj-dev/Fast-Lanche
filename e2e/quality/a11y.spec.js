import AxeBuilder from '@axe-core/playwright';
import { test, expect, signUp, addFirstProductToCart } from '../support/fixtures.js';

// Auditoria automatica de acessibilidade (Fase 45) com axe-core, regras WCAG 2.0/2.1/2.2 A e AA. Falha em violacoes
// "serious" ou "critical"; as "moderate"/"minor" sao anexadas ao relatorio para acompanhamento. Auditoria automatica
// encontra so parte dos problemas: navegacao por teclado e leitor de tela continuam no checklist manual de release.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function audit(page, testInfo, label) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = violations => violations.map(v => `${v.impact} · ${v.id}: ${v.help}\n${v.nodes.slice(0, 5).map(n => `    ${n.target.join(' ')}`).join('\n')}`).join('\n');
  const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  const advisory = results.violations.filter(v => !blocking.includes(v));
  if (advisory.length) await testInfo.attach(`axe-${label}-avisos`, { body: summary(advisory), contentType: 'text/plain' });
  expect(blocking.map(v => v.id), `${label}: violacoes graves de acessibilidade\n${summary(blocking)}`).toEqual([]);
}

const PUBLIC_PAGES = [
  ['react/index.html', '#root main'], ['react/cardapio.html', '.menu-item'], ['react/reservas.html', '#root main'],
  ['react/feedbacks.html', '#root main'], ['react/login.html', '#login-page-title'], ['react/carrinho.html', '#root main'],
  ['react/checkout.html', '#root main'], ['index.html', 'main'], ['pages-html/cardapio.html', 'main'],
  ['pages-html/reservas.html', 'main'], ['pages-html/feedbacks.html', 'main'], ['pages-html/login.html', 'main'], ['404.html', 'main']
];

for (const [path, ready] of PUBLIC_PAGES) {
  test(`a11y: ${path}`, async ({ page }, testInfo) => {
    await page.goto(`/${path}`);
    await expect(page.locator(ready).first()).toBeVisible();
    await audit(page, testInfo, path);
  });
}

test('a11y: fluxo logado (carrinho com item, checkout e perfil)', async ({ page }, testInfo) => {
  await signUp(page);
  await addFirstProductToCart(page);
  await page.goto('/react/carrinho.html');
  await expect(page.locator('#root main')).toBeVisible();
  await audit(page, testInfo, 'carrinho-com-item');
  await page.goto('/react/checkout.html');
  await expect(page.locator('#checkout-form')).toBeVisible();
  await audit(page, testInfo, 'checkout-logado');
  await page.goto('/react/perfil.html');
  await expect(page.locator('#root main')).toBeVisible();
  await audit(page, testInfo, 'perfil');
});
