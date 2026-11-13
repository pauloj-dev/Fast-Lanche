import { test, expect, seedStorage, signUp } from './support/fixtures.js';

// Comprovante em PNG na versao classica (Fase 45): o html2canvas (~200 kB) nao e mais baixado em toda pagina; ele so e
// carregado ao clicar em "Baixar PNG", do CDN, com Subresource Integrity e sob a CSP de producao do preview.
const RECEIPT = {
  id: 'REC-FL-E2E-1', orderNumber: 'FL-E2E-1', customerName: 'Cliente Teste', phone: '(11) 98888-7777',
  address: 'Rua das Flores, 100', document: 'Nao informado', email: '', paymentMethod: 'pix', paymentLabel: 'Pix',
  paymentStatus: 'approved', status: 'received', statusLabel: 'Pedido recebido',
  items: [{ name: 'Combo Fast', price: 29.9, quantity: 1, total: 29.9, customization: null }],
  subtotal: 29.9, deliveryFee: 6, total: 35.9, createdAt: '2026-11-12T15:00:00.000Z',
  formattedDate: '12/11/2026', formattedTime: '12:00', isCanceled: false
};

test('Baixar PNG carrega o html2canvas sob demanda (SRI + CSP) e gera o arquivo', async ({ page, pageErrors }) => {
  test.skip(test.info().project.name !== 'chromium', 'Fluxo de download validado no Chromium');
  const cdnRequests = [];
  page.on('request', request => { if (request.url().includes('html2canvas')) cdnRequests.push(request.url()); });

  await signUp(page);
  await seedStorage(page, { fastlanche_receipts: [RECEIPT] });
  await page.goto('/index.html');
  await expect(page.locator('main')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(cdnRequests, 'html2canvas nao deve ser baixado ao abrir a pagina').toEqual([]);

  await page.locator('.profile-avatar-btn, .user-avatar-btn, [aria-label="Menu do usuário"]').first().click();
  await page.getByRole('button', { name: /Meus Comprovantes/i }).click();
  await page.locator('.receipts-list-card').first().click();
  const download = page.waitForEvent('download', { timeout: 20_000 });
  await page.getByRole('button', { name: /Baixar PNG/i }).click();

  expect((await download).suggestedFilename()).toBe('comprovante-FL-E2E-1.png');
  expect(cdnRequests).toHaveLength(1);
  expect(pageErrors).toEqual([]);
});
