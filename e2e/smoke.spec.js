import { test, expect } from './support/fixtures.js';

// Smoke test (Fase 43): cada pagina publicada carrega sem erro de JavaScript e sem tela em branco.
const REACT_SHELLS = ['index', 'cardapio', 'carrinho', 'checkout', 'receipt', 'login', 'reservas', 'feedbacks'];
const LEGACY_PAGES = ['index.html', 'pages-html/cardapio.html', 'pages-html/carrinho.html', 'pages-html/checkout.html',
  'pages-html/reservas.html', 'pages-html/feedbacks.html', 'pages-html/login.html', 'pages-html/perfil.html'];

for (const shell of REACT_SHELLS) {
  test(`shell React react/${shell}.html renderiza sem erros`, async ({ page, pageErrors }) => {
    await page.goto(`/react/${shell}.html`);
    await expect(page.locator('#root > *').first(), `react/${shell}.html ficou em branco`).toBeVisible();
    await expect(page.locator('header.site-header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer.site-footer')).toBeVisible();
    expect(pageErrors, `erros em react/${shell}.html`).toEqual([]);
  });
}

test('shell React react/perfil.html protegido redireciona para o login sem erros', async ({ page, pageErrors }) => {
  await page.goto('/react/perfil.html');
  await page.waitForURL('**/react/login.html?redirect=perfil.html');
  await expect(page.locator('#login-page-title')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

for (const path of LEGACY_PAGES) {
  test(`pagina legada ${path} carrega sem erros e sem React`, async ({ page, pageErrors }) => {
    const reactRequests = [];
    page.on('request', request => { if (/assets\/main-.*\.js$/.test(request.url())) reactRequests.push(request.url()); });
    await page.goto(`/${path}`);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.site-header, header').first(), `header ausente em ${path}`).toBeVisible();
    expect(reactRequests, `${path} nao deve baixar o bundle React`).toEqual([]);
    expect(pageErrors, `erros em ${path}`).toEqual([]);
  });
}
