import { test, expect, addFirstProductToCart, signUp } from './support/fixtures.js';

// Fluxo critico: Login -> Perfil -> Checkout (LoginPage/authService, ProfilePage/profileService, CheckoutPage).
test.describe('Conta (LoginPage / ProfilePage / authService)', () => {
  test('cadastro, edicao do perfil refletida no header e checkout pre-preenchido', async ({ page, pageErrors }) => {
    const email = await signUp(page, { name: 'Bruna Costa', redirect: 'perfil.html' });
    await expect(page.locator('#profile-page-title')).toHaveText('Olá, Bruna!');
    await expect(page.locator('.profile-avatar-initials')).toHaveText('BC');

    await page.locator('#profile-name').fill('Bruna Almeida Costa');
    await page.locator('#profile-phone').fill('(21) 99876-5432');
    await page.locator('#profile-address').fill('Avenida Atlântica, 500 - Copacabana');
    await page.locator('label.payment-option', { hasText: 'Cartão' }).click();
    await page.locator('#profile-save-btn').click();
    await expect(page.locator('#profile-feedback')).toContainText('Perfil salvo');
    await expect(page.locator('.profile-avatar-initials'), 'header atualiza na mesma aba').toHaveText('BC');
    await expect(page.locator('#profile-page-title')).toHaveText('Olá, Bruna!');

    await addFirstProductToCart(page);
    await page.goto('/react/checkout.html');
    await expect(page.locator('#checkout-use-profile')).toBeChecked();
    await expect(page.locator('#checkout-name')).toHaveValue('Bruna Almeida Costa');
    await expect(page.locator('#checkout-email')).toHaveValue(email);
    await expect(page.locator('#checkout-phone')).toHaveValue('(21) 99876-5432');
    await expect(page.locator('#checkout-address')).toHaveValue('Avenida Atlântica, 500 - Copacabana');
    await expect(page.locator('input[name="payment"][value="card"]')).toBeChecked();
    expect(pageErrors).toEqual([]);
  });

  test('perfil invalido nao e salvo e mostra o motivo', async ({ page }) => {
    await signUp(page, { redirect: 'perfil.html' });
    await page.locator('#profile-phone').fill('123');
    await page.locator('#profile-save-btn').click();
    await expect(page.locator('#profile-feedback')).toContainText(/telefone/i);
  });

  test('senha errada nao autentica e logout encerra a sessao', async ({ page }) => {
    const email = await signUp(page);
    await page.getByRole('button', { name: /sair da conta/i }).click();
    await expect(page.locator('.login-header-btn').getByText('Entrar', { exact: true })).toBeVisible();

    await page.goto('/react/login.html');
    await page.locator('#auth-email').fill(email);
    await page.locator('#auth-password').fill('senha-errada');
    await page.locator('#login-form button[type="submit"]').click();
    const feedback = page.locator('#auth-feedback');
    await expect(feedback).toHaveText('E-mail ou senha incorretos.');
    await expect(feedback).toBeFocused();

    await page.locator('#auth-password').fill('senha123');
    await page.locator('#login-form button[type="submit"]').click();
    await page.waitForURL('**/react/index.html');
    await expect(page.locator('.profile-avatar-btn')).toBeVisible();
  });
});
