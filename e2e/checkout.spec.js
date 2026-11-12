import { test, expect, addFirstProductToCart, fillCheckout, readStorage } from './support/fixtures.js';

// Fluxo critico: Cardapio -> Carrinho -> Checkout -> Comprovante (CheckoutPage, checkoutService, orderService, ReceiptPage).
test.describe('Checkout (CheckoutPage / checkoutService)', () => {
  test('pedido aprovado gera comprovante que continua acessivel apos recarregar', async ({ page, pageErrors }) => {
    const product = await addFirstProductToCart(page);

    await page.goto('/react/carrinho.html');
    await expect(page.locator('.cart-item strong')).toHaveText(product);
    await page.getByRole('link', { name: /finalizar pedido/i }).click();
    await page.waitForURL('**/react/checkout.html');

    await fillCheckout(page);
    await page.locator('#checkout-form button[type="submit"]').click();
    await page.waitForURL(/receipt\.html\?order=FL-/);

    const orderNumber = (await page.locator('.receipt-id-value').textContent()).trim();
    await expect(page.locator('.receipt-item-name')).toContainText(product);
    await expect(page.locator('.receipt-page-card')).toContainText('Ana Cliente');
    expect((await readStorage(page, 'fastlanche_cart'))?.items ?? []).toHaveLength(0);

    await page.reload();
    await expect(page.locator('.receipt-id-value'), 'comprovante deve sobreviver ao recarregar').toHaveText(orderNumber);
    expect(pageErrors).toEqual([]);
  });

  test('pagamento recusado nao cria pedido e mantem o carrinho', async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto('/react/checkout.html');
    await fillCheckout(page);
    await page.locator('#checkout-simulate-failure').check();
    await page.locator('#checkout-form button[type="submit"]').click();

    const feedback = page.locator('#checkout-feedback');
    await expect(feedback).toContainText('Pagamento recusado');
    await expect(feedback).toBeFocused();
    await expect(page).toHaveURL(/checkout\.html$/);
    expect(await readStorage(page, 'fastlanche_orders')).toBeNull();
    expect((await readStorage(page, 'fastlanche_cart')).items).toHaveLength(1);
  });

  test('dados invalidos sao barrados antes do pagamento', async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto('/react/checkout.html');
    await fillCheckout(page, { phone: '123' });
    await page.locator('#checkout-form button[type="submit"]').click();
    await expect(page.locator('#checkout-feedback')).toContainText(/telefone/i);
    expect(await readStorage(page, 'fastlanche_orders')).toBeNull();
  });

  test('carrinho vazio mostra estado vazio em vez do formulario', async ({ page }) => {
    await page.goto('/react/checkout.html');
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible();
    await expect(page.locator('#checkout-form')).toHaveCount(0);
  });
});
