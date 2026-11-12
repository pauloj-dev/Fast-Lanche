import { test, expect, localDate, readStorage, seedStorage } from './support/fixtures.js';

// Fluxo critico: Reserva -> Pagamento -> Confirmacao (BookingPage, bookingService, regras de mesas em businessRules).
const TOMORROW = localDate(1);

async function chooseTomorrow(page) {
  await page.locator(`.booking-date:has(input[value="${TOMORROW}"])`).click();
  await expect(page.locator('.booking-hint').first()).not.toContainText('consultando');
}

async function fillContact(page) {
  await page.locator('#booking-name').fill('Carla Reserva');
  await page.locator('#booking-phone').fill('(11) 97777-6666');
  await page.locator('.booking-payment-options label.payment-option', { hasText: 'Pix' }).click();
}

test.describe('Reservas (BookingPage / bookingService)', () => {
  test('reserva aprovada aloca mesa e a confirmacao sobrevive ao recarregar', async ({ page, pageErrors }) => {
    await page.goto('/react/reservas.html');
    await chooseTomorrow(page);
    await page.locator('.booking-stepper button[aria-label="Aumentar pessoas"]').click();
    await page.locator('.booking-stepper button[aria-label="Aumentar pessoas"]').click();
    await expect(page.locator('#booking-guests')).toHaveValue('4');
    await page.locator('.booking-slot:has(input[value="20:00"])').click();
    await page.locator('.booking-chip', { hasText: 'Aniversário' }).click();
    await fillContact(page);
    await expect(page.locator('.booking-summary')).toContainText('20:00');

    await page.locator('.booking-summary button[type="submit"]').click();
    await page.waitForURL(/reservas\.html\?reserva=RS-/);
    const number = (await page.locator('.booking-ticket-number strong').textContent()).trim();
    await expect(page.locator('.booking-ticket-grid')).toContainText('M5 · 4 lugares');
    await expect(page.locator('.booking-ticket-grid')).toContainText('Aniversário');

    await page.reload();
    await expect(page.locator('.booking-ticket-number strong')).toHaveText(number);
    expect(pageErrors).toEqual([]);
  });

  test('horario lotado aparece indisponivel e nao pode ser escolhido', async ({ page }) => {
    await seedStorage(page, {
      fastlanche_bookings: [{ id: 1, bookingNumber: 'RS-SEED-0001', date: TOMORROW, time: '20:00', guests: 12, tableId: 'M16', status: 'confirmed', createdAt: new Date().toISOString() }]
    });
    await page.goto('/react/reservas.html');
    await chooseTomorrow(page);
    await page.locator('#booking-guests').fill('12');
    await page.locator('#booking-guests').blur();
    const slot = page.locator('.booking-slot:has(input[value="20:00"])');
    await expect(slot).toHaveClass(/is-full/);
    await expect(slot.locator('input')).toBeDisabled();
    await expect(page.locator('.booking-slot:has(input[value="21:30"])')).toHaveClass(/is-few|is-available/);
  });

  test('pagamento recusado nao cria reserva nem bloqueia mesa', async ({ page }) => {
    await page.goto('/react/reservas.html');
    await chooseTomorrow(page);
    await page.locator('.booking-slot:has(input[value="19:00"])').click();
    await fillContact(page);
    await page.locator('#booking-simulate-failure').check();
    await page.locator('.booking-summary button[type="submit"]').click();

    const feedback = page.locator('#booking-feedback');
    await expect(feedback).toContainText('Pagamento recusado');
    await expect(feedback).toBeFocused();
    expect(await readStorage(page, 'fastlanche_bookings')).toBeNull();
  });

  test('pagina legada de reservas usa o mesmo sistema e confirma a reserva', async ({ page, pageErrors }) => {
    await page.goto('/pages-html/reservas.html');
    await chooseTomorrow(page);
    await page.locator('.booking-slot:has(input[value="12:00"])').click();
    await fillContact(page);
    await page.locator('#booking-submit').click();
    await page.waitForURL(/reservas\.html\?reserva=RS-/);
    await expect(page.locator('.booking-ticket')).toContainText('Sua mesa está garantida!');
    expect(pageErrors).toEqual([]);
  });
});
