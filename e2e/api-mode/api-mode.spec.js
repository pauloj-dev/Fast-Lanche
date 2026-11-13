import { test, expect, addFirstProductToCart, fillCheckout, localDate, seedStorage, signUp } from '../support/fixtures.js';

// Modo HTTP (Fase 44): as mesmas paginas, buildadas com VITE_API_BASE_URL apontando para a API mock.
// Prova que os adapters HTTP substituem o armazenamento local sem alterar as paginas.
const API = `http://localhost:${process.env.MOCK_API_PORT || 4190}/api/v1`;
const PERSONAL_KEYS = ['fastlanche_session', 'fastlanche_user_profile', 'fastlanche_users'];

const mockState = async request => (await request.get(`${API}/__mock/state`)).json();
const localKeys = page => page.evaluate(() => Object.keys(localStorage));

// Todos os testes deste arquivo compartilham uma unica API mock (estado em memoria) e cada um a zera no inicio:
// rodam em sequencia para nao apagar o estado de um teste em andamento. Os outros projetos seguem em paralelo.
test.describe.configure({ mode: 'default' });

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/__mock/reset`);
});

test.describe('Paginas no modo HTTP (adapters HTTP + API mock)', () => {
  for (const shell of ['index', 'cardapio', 'carrinho', 'checkout', 'login', 'reservas', 'feedbacks']) {
    test(`react/${shell}.html renderiza sem erros no modo HTTP`, async ({ page, pageErrors }) => {
      await page.goto(`/react/${shell}.html`);
      await expect(page.locator('#root > *').first()).toBeVisible();
      expect(pageErrors).toEqual([]);
    });
  }

  test('cadastro cria a conta no servidor, a sessao segue entre paginas pelo cookie e nada pessoal fica no navegador', async ({ page, request }) => {
    const email = await signUp(page, { name: 'Iara Api', redirect: 'perfil.html' });
    await expect(page.locator('#profile-page-title')).toHaveText('Olá, Iara!');
    await page.goto('/react/cardapio.html');
    await expect(page.locator('.profile-avatar-initials'), 'sessao recuperada do servidor em nova pagina').toHaveText('IA');
    expect((await mockState(request)).users).toContain(email);
    const keys = await localKeys(page);
    for (const key of PERSONAL_KEYS) expect(keys, `${key} nao deve existir no modo HTTP`).not.toContain(key);
    const cookies = await page.context().cookies();
    expect(cookies.find(cookie => cookie.name === 'fl_session')?.httpOnly).toBe(true);
  });

  test('checkout logado: pedido criado no servidor com preco do catalogo e comprovante recarregavel', async ({ page, request }) => {
    await signUp(page);
    const product = await addFirstProductToCart(page);
    await page.goto('/react/checkout.html');
    await fillCheckout(page);
    await page.locator('#checkout-form button[type="submit"]').click();
    await page.waitForURL(/receipt\.html\?order=FL-/);
    await expect(page.locator('.receipt-item-name')).toContainText(product);
    const number = (await page.locator('.receipt-id-value').textContent()).trim();
    await page.reload();
    await expect(page.locator('.receipt-id-value')).toHaveText(number);

    const [order] = (await mockState(request)).orders;
    expect(order.orderNumber).toBe(number);
    expect(order.items[0].unitPriceCents).toBe(1690);
  });

  test('checkout de convidado: comprovante so com o link assinado', async ({ page, browser }) => {
    await addFirstProductToCart(page);
    await page.goto('/react/checkout.html');
    await fillCheckout(page);
    await page.locator('#checkout-form button[type="submit"]').click();
    await page.waitForURL(/receipt\.html\?order=FL-.+&token=/);
    await expect(page.locator('.receipt-page-card')).toContainText('Ana Cliente');

    const withoutToken = page.url().replace(/&token=[^&]+/, '');
    const stranger = await browser.newPage();
    await stranger.goto(withoutToken);
    await expect(stranger.getByText('Por segurança, este comprovante')).toBeVisible();
    expect(await stranger.locator('main').innerText()).not.toContain('Ana Cliente');
    await stranger.close();
  });

  test('pagamento recusado devolvido pela API nao cria pedido', async ({ page, request }) => {
    await addFirstProductToCart(page);
    await page.goto('/react/checkout.html');
    await fillCheckout(page);
    await page.locator('#checkout-simulate-failure').check();
    await page.locator('#checkout-form button[type="submit"]').click();
    await expect(page.locator('#checkout-feedback')).toContainText('Pagamento recusado');
    expect((await mockState(request)).orders).toHaveLength(0);
  });

  test('reserva usa a disponibilidade do servidor e confirma pela API', async ({ page, request }) => {
    await signUp(page);
    await page.goto('/react/reservas.html');
    await page.locator(`.booking-date:has(input[value="${localDate(1)}"])`).click();
    await page.locator('.booking-slot:has(input[value="19:30"])').click();
    await page.locator('#booking-phone').fill('(11) 97777-6666');
    await page.locator('.booking-payment-options label.payment-option', { hasText: 'Cartão' }).click();
    await page.locator('.booking-summary button[type="submit"]').click();
    await page.waitForURL(/reservas\.html\?reserva=RS-/);
    await expect(page.locator('.booking-ticket')).toContainText('Sua mesa está garantida!');
    const [booking] = (await mockState(request)).bookings;
    expect(booking.time).toBe('19:30');
    expect(booking.feeCents).toBe(2000);
  });

  test('avaliacao de pedido entregue publicada na API', async ({ page, request }) => {
    await signUp(page, { name: 'Joana Avalia' });
    await addFirstProductToCart(page);
    await page.goto('/react/checkout.html');
    await page.locator('label.payment-option', { hasText: 'Pix' }).click();
    await page.locator('#checkout-phone').fill('(11) 98888-7777');
    await page.locator('#checkout-address').fill('Rua das Flores, 100 - Centro');
    await page.locator('#checkout-form button[type="submit"]').click();
    await page.waitForURL(/receipt\.html/);
    const number = (await page.locator('.receipt-id-value').textContent()).trim();
    await request.post(`${API}/__mock/orders/${number}/status`, { data: { status: 'delivered' } });

    await page.goto('/react/feedbacks.html');
    await page.locator('.review-product').first().click();
    await page.locator('.review-rating-stars label').nth(4).click();
    await page.locator('#feedback-comment').fill('Pedido perfeito, chegou rapidinho!');
    await page.locator('#feedback-form button[type="submit"]').click();
    await expect(page.locator('.review-card').first()).toContainText('Joana Avalia');
    expect((await mockState(request)).reviews).toHaveLength(1);
  });

  test('migracao: pedidos locais da conta vao para o servidor no primeiro login', async ({ page, request }) => {
    const email = `migracao.${Date.now()}@example.test`;
    await seedStorage(page, {
      fastlanche_orders: [
        { orderNumber: 'FL-OFFLINE-1', userProfileId: '', status: 'Entregue', createdAt: '2026-10-01T12:00:00.000Z', customer: { name: 'Lia', email, phone: '11999999999', address: 'Rua A, 123 - Centro' }, items: [{ id: 1, name: 'X-Burger Simples', price: 16.9, quantity: 1 }] },
        { orderNumber: 'FL-DE-OUTRA', userProfileId: 'outra@example.test', status: 'Entregue', createdAt: '2026-10-01T12:00:00.000Z', customer: { name: 'Outra', email: 'outra@example.test', phone: '11999999999', address: 'Rua B, 456 - Centro' }, items: [{ id: 1, name: 'X-Burger Simples', price: 16.9, quantity: 1 }] }
      ]
    });
    await signUp(page, { email, redirect: 'perfil.html' });
    await expect(page.locator('.account-order', { hasText: 'FL-OFFLINE-1' })).toBeVisible();
    expect((await mockState(request)).orders.map(order => order.orderNumber)).toEqual(['FL-OFFLINE-1']);
    const remaining = await page.evaluate(() => JSON.parse(localStorage.getItem('fastlanche_orders')).map(order => order.orderNumber));
    expect(remaining).toEqual(['FL-DE-OUTRA']);
  });
});
