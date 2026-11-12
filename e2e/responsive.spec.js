import { readFileSync } from 'node:fs';
import { test, expect, addFirstProductToCart, signUp } from './support/fixtures.js';

// Auditoria responsiva (Fase 42) executada no E2E: o mesmo modulo usado no console do dev server
// (tests/browser/responsive-audit.js) e injetado na pagina e roda todas as larguras em todas as telas.
const AUDIT_SOURCE = readFileSync(new URL('../tests/browser/responsive-audit.js', import.meta.url), 'utf-8');

test('nenhuma tela tem overflow, alvo pequeno ou texto espremido em 320–1440px', async ({ page }) => {
  test.setTimeout(240_000);
  // Estado mais exigente: usuario logado (avatar no header) e carrinho com itens.
  await signUp(page, { name: 'Auditoria Responsiva' });
  await addFirstProductToCart(page);
  await page.goto('/react/index.html');
  await page.addScriptTag({ type: 'module', content: `${AUDIT_SOURCE}\nwindow.__responsiveAudit = { runResponsiveAudit };` });
  await page.waitForFunction(() => Boolean(window.__responsiveAudit));

  const report = await page.evaluate(() => window.__responsiveAudit.runResponsiveAudit());
  expect(report.checked, 'todas as combinacoes de tela e largura foram auditadas').toBeGreaterThanOrEqual(70);
  expect(report.issues, JSON.stringify(report.issues, null, 2)).toEqual([]);
});
