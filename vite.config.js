import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
        'react/checkout.html', 'react/reservas.html', 'react/feedbacks.html'
      ]
    }
  }
});
