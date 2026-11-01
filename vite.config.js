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

export default defineConfig({
  plugins: [react(), copyStaticAssets()],
  // Caminhos relativos no build: o resultado em dist/ funciona em qualquer
  // servidor estatico (Live Server, abrir via subpasta, etc.).
  base: './',
  build: {
    rollupOptions: {
      input: [
        'index.html',
        'pages-html/cardapio.html', 'pages-html/carrinho.html', 'pages-html/checkout.html',
        'pages-html/reservas.html', 'pages-html/feedbacks.html', 'pages-html/login.html',
        'pages-html/perfil.html',
        // Shells React (executam src/main.jsx): precisam do Vite (npm run dev / build).
        // Os HTMLs legados acima continuam sendo servidos direto por qualquer servidor estatico.
        'react/index.html', 'react/cardapio.html', 'react/carrinho.html',
        'react/checkout.html', 'react/receipt.html', 'react/reservas.html', 'react/feedbacks.html',
        'react/login.html', 'react/perfil.html'
      ]
    }
  }
});
