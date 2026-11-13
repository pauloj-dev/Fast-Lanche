import { cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// As paginas legadas montam caminhos de imagem em tempo de execucao (resolveAssetPath('assets/products/...')),
// que o Vite nao consegue rastrear. Copia as pastas de assets para dist/ para esses caminhos continuarem validos.
function copyStaticAssets() {
  let outDir;
  return {
    name: 'fast-lanche-copy-static-assets',
    apply: 'build',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    closeBundle() {
      for (const folder of ['icons', 'logo', 'products']) {
        cpSync(resolve('assets', folder), resolve(outDir, 'assets', folder), { recursive: true });
      }
    }
  };
}

// Paginas legadas: servidas direto por qualquer servidor estatico ou pelo build.
const LEGACY_PAGES = [
  'index.html',
  'pages-html/cardapio.html', 'pages-html/carrinho.html', 'pages-html/checkout.html',
  'pages-html/reservas.html', 'pages-html/feedbacks.html', 'pages-html/login.html',
  'pages-html/perfil.html'
];
// Shells React (executam src/main.jsx): precisam do Vite (npm run dev / build).
const REACT_PAGES = [
  'react/index.html', 'react/cardapio.html', 'react/carrinho.html',
  'react/checkout.html', 'react/receipt.html', 'react/reservas.html', 'react/feedbacks.html',
  'react/login.html', 'react/perfil.html'
];

// O build roda duas vezes (npm run build): `--mode legacy` limpa dist/ e gera as paginas legadas; `--mode react`
// acrescenta os shells React. Os dois lados compartilham modulos de src/; num build unico o Rolldown hospedava o
// runtime compartilhado no chunk do React e as paginas legadas passavam a baixar (e executar) o React inteiro.
// Builds separados mantem cada pagina so com o proprio codigo.
export default defineConfig(({ mode }) => ({
  plugins: [react(), copyStaticAssets()],
  // Caminhos relativos no build: o resultado em dist/ funciona em qualquer
  // servidor estatico (Live Server, abrir via subpasta, etc.).
  base: './',
  build: {
    // BUILD_OUT_DIR permite um segundo build (ex.: dist-api, modo HTTP do E2E) sem apagar o dist/ principal.
    outDir: process.env.BUILD_OUT_DIR || 'dist',
    emptyOutDir: mode !== 'react',
    rollupOptions: {
      input: mode === 'react' ? REACT_PAGES : LEGACY_PAGES
    }
  }
}));
