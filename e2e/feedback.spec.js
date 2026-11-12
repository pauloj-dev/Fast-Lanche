import { test, expect, readStorage, seedStorage, signUp } from './support/fixtures.js';

// Fluxo critico: Pedido entregue -> Avaliacao (FeedbackPage, feedbackService, elegibilidade por pedido entregue).
const deliveredOrder = email => ({
  orderNumber: 'FL-E2E-ENTREGUE', userProfileId: email, status: 'Entregue', paymentMethod: 'pix', paymentStatus: 'approved',
  createdAt: new Date().toISOString(),
  customer: { name: 'Cliente', email, phone: '11999999999', address: 'Rua A, 123 - Centro' },
  items: [{ id: 1, name: 'X-Burger Simples', price: 16.9, quantity: 1 }, { id: 26, name: 'Refrigerante', price: 6, quantity: 1 }]
});

test.describe('Avaliacoes (FeedbackPage / feedbackService)', () => {
  test('visitante pode ler, mas precisa entrar para avaliar', async ({ page }) => {
    await seedStorage(page, { fastlanche_feedbacks: [{ id: 1, name: 'Bia', rating: 5, comment: 'Atendimento excelente e rápido!', timestamp: new Date().toISOString() }] });
    await page.goto('/react/feedbacks.html');
    await expect(page.locator('.review-card')).toHaveCount(1);
    await expect(page.locator('.review-badge.is-general')).toHaveText('Avaliação geral');
    await expect(page.locator('.review-gate h2')).toHaveText('Avalie seus pedidos');
  });

  test('pedido entregue permite avaliar uma vez cada item', async ({ page, pageErrors }) => {
    const email = await signUp(page, { name: 'Diego Avaliador' });
    await seedStorage(page, { fastlanche_orders: [deliveredOrder(email)] });
    await page.goto('/react/feedbacks.html');

    await page.locator('.review-product', { hasText: 'X-Burger Simples' }).click();
    await page.locator('.review-rating-stars label').nth(3).click();
    await expect(page.locator('.review-rating-label')).toHaveText('Muito bom');
    await page.locator('#feedback-comment').fill('Hambúrguer suculento e chegou quentinho.');
    await page.locator('#feedback-form button[type="submit"]').click();

    await expect(page.locator('.review-card').first()).toContainText('Diego Avaliador');
    await expect(page.locator('.review-card').first().locator('.review-badge')).toHaveText('✓ Compra verificada');
    await expect(page.locator('.review-card').first().locator('.review-tags')).toContainText('X-Burger Simples');
    await expect(page.locator('#average-rating')).toHaveText('4,0');

    const reviewed = page.locator('.review-product', { hasText: 'X-Burger Simples' });
    await expect(reviewed).toHaveClass(/is-reviewed/);
    await expect(reviewed.locator('input')).toBeDisabled();
    expect((await readStorage(page, 'fastlanche_feedbacks'))).toHaveLength(1);
    expect(pageErrors).toEqual([]);
  });

  test('sem produto selecionado a avaliacao e barrada com mensagem focada', async ({ page }) => {
    const email = await signUp(page);
    await seedStorage(page, { fastlanche_orders: [deliveredOrder(email)] });
    await page.goto('/react/feedbacks.html');
    await page.locator('.review-rating-stars label').nth(4).click();
    await page.locator('#feedback-comment').fill('Comentário válido, mas sem produto.');
    await page.locator('#feedback-form button[type="submit"]').click();
    const message = page.locator('#feedback-message');
    await expect(message).toContainText('Selecione ao menos um produto');
    await expect(message).toBeFocused();
    expect(await readStorage(page, 'fastlanche_feedbacks')).toBeNull();
  });

  test('busca e filtro por nota combinam sem alterar os dados', async ({ page }) => {
    const now = Date.now();
    await seedStorage(page, {
      fastlanche_feedbacks: [
        { id: 1, name: 'Ana', rating: 5, comment: 'Batata crocante demais!', timestamp: new Date(now).toISOString(), items: [{ orderNumber: 'A', productId: 1, name: 'X-Burger Simples' }] },
        { id: 2, name: 'Bia', rating: 2, comment: 'Demorou bastante para chegar.', timestamp: new Date(now - 1000).toISOString(), items: [{ orderNumber: 'B', productId: 26, name: 'Refrigerante' }] }
      ]
    });
    await page.goto('/react/feedbacks.html');
    await page.locator('#feedback-search').fill('refrigerante');
    await expect(page.locator('.review-card')).toHaveCount(1);
    await page.locator('.review-chips button', { hasText: '5 ★' }).click();
    await expect(page.locator('.review-card')).toHaveCount(0);
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(page.locator('.review-card')).toHaveCount(2);
    expect(await readStorage(page, 'fastlanche_feedbacks')).toHaveLength(2);
  });
});
