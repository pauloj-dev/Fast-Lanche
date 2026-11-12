import { defineConfig, devices } from '@playwright/test';

// Testes end-to-end (Fase 43) contra o build de producao: o webServer gera `dist/` com `npm run build` antes de
// subir o `vite preview`, entao os fluxos sempre rodam sobre o que sera publicado. Cada teste recebe um contexto de
// navegador novo (localStorage vazio): os testes nao dependem da ordem nem dos dados do navegador do desenvolvedor.
const PORT = Number(process.env.E2E_PORT || 4180);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `${BASE_URL}/react/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
