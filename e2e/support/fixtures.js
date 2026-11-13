import { test as base, expect } from '@playwright/test';

// Fixture comum: registra erros de JavaScript e de console de cada pagina visitada. Se algum teste terminar com
// erros, eles sao anexados ao relatorio com a URL de origem, apontando a pagina/service responsavel pela falha.
export const test = base.extend({
  pageErrors: async ({ page }, use, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(`[pageerror] ${page.url()} :: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error' && !isNavigationNoise(message.text())) errors.push(`[console] ${page.url()} :: ${message.text()}`);
    });
    await use(errors);
    if (errors.length) await testInfo.attach('erros-de-pagina', { body: errors.join('\n'), contentType: 'text/plain' });
  }
});

export { expect };

// O Firefox registra como erro de console o download de fonte cancelado quando a pagina redireciona antes de ele
// terminar (NS_BINDING_ABORTED = 2152398850). Nao e falha da aplicacao; qualquer outro erro continua contando.
function isNavigationNoise(text) {
  return /downloadable font: download failed .*status=2152398850/.test(text);
}

// Data local "AAAA-MM-DD" com deslocamento em dias (mesmo fuso do navegador do teste).
export function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

// Grava chaves no localStorage da origem e recarrega a pagina atual (ou abre `path`).
export async function seedStorage(page, entries, path = '/react/index.html') {
  if (!page.url().startsWith('http')) await page.goto(path);
  await page.evaluate(values => {
    for (const [key, value] of Object.entries(values)) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  }, entries);
}

export const readStorage = (page, key) => page.evaluate(name => {
  const raw = localStorage.getItem(name);
  try { return raw === null ? null : JSON.parse(raw); } catch { return raw; }
}, key);

// Cadastro pela interface (fluxo real de Login/Cadastro). Retorna o e-mail usado.
export async function signUp(page, { name = 'Cliente Teste', email = `cliente.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`, password = 'senha123', redirect = 'index.html' } = {}) {
  await page.goto(`/react/login.html?mode=signup&redirect=${redirect}`);
  await page.locator('#signup-name').fill(name);
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.locator('#signup-confirm-password').fill(password);
  await page.locator('#signup-form button[type="submit"]').click();
  await page.waitForURL(`**/react/${redirect}`);
  return email;
}

// Adiciona o primeiro produto disponivel do cardapio ao carrinho.
export async function addFirstProductToCart(page) {
  await page.goto('/react/cardapio.html');
  const card = page.locator('.menu-item').first();
  await expect(card).toBeVisible();
  const name = (await card.locator('h3').textContent()).trim();
  await card.getByRole('button', { name: /adicionar/i }).click();
  await expect(page.locator('#cart-header-badge')).toHaveText('1');
  return name;
}

export async function fillCheckout(page, { name = 'Ana Cliente', email = 'ana.cliente@example.test', phone = '(11) 98888-7777', address = 'Rua das Flores, 100 - Centro', payment = 'Pix' } = {}) {
  await page.locator('#checkout-name').fill(name);
  await page.locator('#checkout-email').fill(email);
  await page.locator('#checkout-phone').fill(phone);
  await page.locator('#checkout-address').fill(address);
  await page.locator('label.payment-option', { hasText: payment }).click();
}
