import { gzipSync } from 'node:zlib';
import { test, expect } from '../support/fixtures.js';

// Orcamento de desempenho (Fase 45) medido no navegador com PerformanceObserver: LCP (maior elemento pintado) e CLS
// (deslocamento acumulado de layout) nos limites "bons" do Core Web Vitals, alem do peso de JS baixado por pagina.
// Roda contra o preview local, sem latencia de rede real: serve como alarme de regressao (bundle inchado, imagem
// sem dimensao, fonte bloqueante), nao como medida de campo. A medida real fica no checklist de release (Lighthouse
// / PageSpeed na URL publicada). Rede e CPU sao limitadas via CDP para aproximar um celular intermediario.
const BUDGET = { lcpMs: 2500, cls: 0.1, jsKb: { react: 150, legacy: 75 } };
const PAGES = [
  { path: 'react/index.html', kind: 'react' }, { path: 'react/cardapio.html', kind: 'react' },
  { path: 'react/reservas.html', kind: 'react' }, { path: 'react/feedbacks.html', kind: 'react' },
  { path: 'index.html', kind: 'legacy' }, { path: 'pages-html/cardapio.html', kind: 'legacy' }, { path: 'pages-html/reservas.html', kind: 'legacy' }
];

test.describe.configure({ mode: 'serial' }); // medicoes isoladas: sem disputa de CPU entre workers

for (const { path, kind } of PAGES) {
  test(`desempenho: ${path}`, async ({ page }, testInfo) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    // ~4G: 9 Mbps, 40 ms; CPU 4x mais lenta.
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 9_000_000 / 8, uploadThroughput: 3_000_000 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.addInitScript(() => {
      window.__vitals = { lcp: 0, cls: 0 };
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__vitals.lcp = entry.startTime; })
        .observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__vitals.cls += entry.value; })
        .observe({ type: 'layout-shift', buffered: true });
    });

    const jsBytes = [];
    page.on('response', async response => {
      if (new URL(response.url()).pathname.endsWith('.js')) jsBytes.push(gzipSync(await response.body().catch(() => Buffer.alloc(0))).length);
    });

    await page.goto(`/${path}`, { waitUntil: 'load' });
    await expect(page.locator('main').first()).toBeVisible();
    await page.waitForTimeout(1500); // deixa terminar renderizacoes tardias que poderiam deslocar o layout
    const vitals = await page.evaluate(() => window.__vitals);
    // O preview do Vite nao comprime; o orcamento usa o tamanho gzip de cada script (o que um servidor real transfere).
    const jsKbGzip = jsBytes.reduce((total, size) => total + size, 0) / 1024;

    const report = `LCP ${vitals.lcp.toFixed(0)} ms (limite ${BUDGET.lcpMs}) · CLS ${vitals.cls.toFixed(3)} (limite ${BUDGET.cls}) · JS ${jsKbGzip.toFixed(0)} kB gzip (limite ${BUDGET.jsKb[kind]})`;
    await testInfo.attach(`vitals-${path}`, { body: report, contentType: 'text/plain' });
    console.log(`  ${path}: ${report}`);

    expect(vitals.lcp, `LCP de ${path}`).toBeGreaterThan(0);
    expect(vitals.lcp, `LCP de ${path}`).toBeLessThan(BUDGET.lcpMs);
    expect(vitals.cls, `CLS de ${path}`).toBeLessThan(BUDGET.cls);
    expect(jsKbGzip, `JS de ${path}`).toBeLessThan(BUDGET.jsKb[kind]);
  });
}
