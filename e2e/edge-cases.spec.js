import { test, expect, seedStorage, signUp } from './support/fixtures.js';

// Casos de borda (Fase 43): dados corrompidos, sessao expirada e protecao de dados pessoais.
const CORRUPTED = Object.fromEntries(['fastlanche_cart', 'fastlanche_session', 'fastlanche_user_profile', 'fastlanche_users',
  'fastlanche_orders', 'fastlanche_bookings', 'fastlanche_feedbacks', 'fastlanche_menuItems'].map(key => [key, '{corrompido']));

test.describe('Robustez (safeStorage / services)', () => {
  for (const shell of ['cardapio', 'carrinho', 'checkout', 'reservas', 'feedbacks']) {
    test(`react/${shell}.html abre com o localStorage corrompido`, async ({ page, pageErrors }) => {
      await seedStorage(page, CORRUPTED);
      await page.goto(`/react/${shell}.html`);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('.is-error'), `react/${shell}.html nao deve cair em estado de erro`).toHaveCount(0);
      expect(pageErrors).toEqual([]);
    });
  }

  test('cardapio com dados corrompidos ainda lista os produtos do catalogo', async ({ page }) => {
    await seedStorage(page, CORRUPTED);
    await page.goto('/react/cardapio.html');
    await expect(page.locator('.menu-item').first()).toBeVisible();
  });
});

test.describe('Protecao de acesso (useRequireSession / canViewOrder)', () => {
  test('sessao expirada redireciona o perfil para o login e remove a sessao', async ({ page }) => {
    await signUp(page);
    await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('fastlanche_session'));
      session.loginAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('fastlanche_session', JSON.stringify(session));
    });
    await page.goto('/react/perfil.html');
    await page.waitForURL('**/react/login.html?redirect=perfil.html');
    expect(await page.evaluate(() => localStorage.getItem('fastlanche_session'))).toBeNull();
  });

  test('comprovante de outra conta nao exibe dados pessoais', async ({ page }) => {
    await seedStorage(page, {
      fastlanche_orders: [{
        orderNumber: 'FL-OUTRA-CONTA', userProfileId: 'dono@example.test', status: 'Pedido recebido', paymentMethod: 'pix', paymentStatus: 'approved',
        createdAt: new Date().toISOString(), customer: { name: 'Dono do Pedido', email: 'dono@example.test', phone: '(11) 91234-5678', address: 'Rua Secreta, 42 - Centro' },
        items: [{ id: 1, name: 'X-Burger Simples', price: 16.9, quantity: 1 }]
      }]
    });
    await page.goto('/react/receipt.html?order=FL-OUTRA-CONTA');
    await expect(page.getByText('Entre com a conta usada na compra')).toBeVisible();
    const content = await page.locator('main').innerText();
    for (const secret of ['Dono do Pedido', 'Rua Secreta', '91234-5678']) expect(content).not.toContain(secret);

    await signUp(page, { email: 'intruso@example.test' });
    await page.goto('/react/receipt.html?order=FL-OUTRA-CONTA');
    await expect(page.getByText('Por segurança, este comprovante')).toBeVisible();
    expect(await page.locator('main').innerText()).not.toContain('Rua Secreta');
  });
});
