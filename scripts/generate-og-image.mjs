// Gera assets/og/fast-lanche-og.png (1200x630), a imagem de compartilhamento (Open Graph/Twitter).
// Redes sociais nao aceitam SVG nem data URI, entao a arte e renderizada em PNG com o Chromium do Playwright.
// Uso: node scripts/generate-og-image.mjs (so precisa rodar de novo quando a arte mudar).
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; font-family: Inter, "Segoe UI", Roboto, Arial, sans-serif; color: #fff;
    background: radial-gradient(circle at 85% 15%, rgba(255, 199, 0, .35), transparent 45%),
                radial-gradient(circle at 10% 100%, rgba(204, 41, 54, .55), transparent 50%), #161616;
    display: flex; flex-direction: column; justify-content: center; padding: 0 96px; }
  .brand { font-size: 104px; font-weight: 800; letter-spacing: -2px; }
  .brand span:first-child { color: #FFC700; }
  p { margin-top: 24px; font-size: 40px; color: #F3E9DC; max-width: 900px; line-height: 1.3; }
  .tags { margin-top: 48px; display: flex; gap: 16px; }
  .tags span { padding: 12px 28px; border-radius: 999px; background: #CC2936; font-size: 28px; font-weight: 700; }
</style></head><body>
  <div class="brand"><span>Fast</span> <span>Lanche</span></div>
  <p>Hambúrgueres, pizzas e combos com entrega rápida e reserva de mesa.</p>
  <div class="tags"><span>Cardápio</span><span>Delivery</span><span>Reservas</span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
mkdirSync('assets/og', { recursive: true });
await page.screenshot({ path: 'assets/og/fast-lanche-og.png' });
await browser.close();
console.log('assets/og/fast-lanche-og.png gerado');
