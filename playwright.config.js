import { defineConfig, devices } from '@playwright/test';

// Testes end-to-end contra o build de producao. Cada webServer gera o proprio build antes de subir o preview, entao
// os fluxos sempre rodam sobre o que sera publicado. Cada teste recebe um contexto de navegador novo (localStorage e
// cookies vazios): os testes nao dependem da ordem nem dos dados do navegador do desenvolvedor.
//
// Projetos:
// - chromium: aplicacao no modo local (dados no navegador), como publicada hoje (Fase 43).
// - api-mode: as MESMAS paginas buildadas com VITE_API_BASE_URL apontando para a API mock (tests/mock-api), provando
//   que trocar o adapter local pelo HTTP nao exige mudar as paginas (Fase 44).
const PORT = Number(process.env.E2E_PORT || 4180);
const API_MODE_PORT = Number(process.env.E2E_API_MODE_PORT || 4181);
const MOCK_API_PORT = Number(process.env.MOCK_API_PORT || 4190);
const BASE_URL = `http://localhost:${PORT}`;
const API_MODE_URL = `http://localhost:${API_MODE_PORT}`;
export const MOCK_API_URL = `http://localhost:${MOCK_API_PORT}/api/v1`;

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
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', testIgnore: /api-mode\//, use: { ...devices['Desktop Chrome'], baseURL: BASE_URL } },
    { name: 'api-mode', testMatch: /api-mode\/.*\.spec\.js/, use: { ...devices['Desktop Chrome'], baseURL: API_MODE_URL } }
  ],
  webServer: [
    {
      command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
      url: `${BASE_URL}/react/index.html`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: 'node tests/mock-api/server.mjs',
      url: `http://localhost:${MOCK_API_PORT}/health`,
      env: { MOCK_API_PORT: String(MOCK_API_PORT), MOCK_API_ORIGINS: API_MODE_URL },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    },
    {
      command: `npm run build && npx vite preview --outDir dist-api --port ${API_MODE_PORT} --strictPort`,
      url: `${API_MODE_URL}/react/index.html`,
      env: { VITE_API_BASE_URL: MOCK_API_URL, BUILD_OUT_DIR: 'dist-api' },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
