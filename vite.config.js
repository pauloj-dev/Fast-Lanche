import { createHash } from 'node:crypto';
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Cabecalhos de seguranca (Fase 45). Gerados no build em dist/_headers (formato do Netlify e do Cloudflare Pages;
// docs/release/README.md mostra o equivalente para outros servidores) e aplicados tambem pelo `vite preview`, entao
// o E2E roda com a mesma politica que vai para producao: qualquer violacao de CSP quebra os testes.
// A CSP so libera a propria origem, os hashes dos scripts inline (o aviso de fallback dos shells React), o CDN do
// html2canvas (carregado sob demanda, com SRI), as fontes do Google e a API quando VITE_API_BASE_URL esta definida.
// 'unsafe-inline' fica so em style-src: o React aplica estilos por atributo (larguras de barras, por exemplo).
function walkHtml(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'assets' ? [] : walkHtml(path);
    return path.endsWith('.html') ? [path] : [];
  });
}

function buildSecurityHeaders(outDir, apiBaseUrl) {
  const hashes = new Set();
  for (const file of walkHtml(outDir)) {
    for (const [, code] of readFileSync(file, 'utf-8').matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      // O parser HTML normaliza CRLF para LF antes de o navegador calcular o hash: calcular sobre o texto normalizado.
      const normalized = code.replace(/\r\n?/g, '\n');
      hashes.add(`'sha256-${createHash('sha256').update(normalized).digest('base64')}'`);
    }
  }
  const apiOrigin = apiBaseUrl ? new URL(apiBaseUrl).origin : '';
  const csp = [
    "default-src 'self'",
    `script-src 'self' https://cdnjs.cloudflare.com ${[...hashes].sort().join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // 'self' (e nao 'none'): a auditoria responsiva carrega as paginas em iframes da mesma origem.
    "frame-ancestors 'self'"
  ].join('; ');
  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'X-Frame-Options': 'SAMEORIGIN',
    'Cross-Origin-Opener-Policy': 'same-origin'
  };
}

function readHeadersFile(outDir) {
  const file = resolve(outDir, '_headers');
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf-8').split('\n')
    .map(line => /^\s+([A-Za-z-]+):\s*(.+)$/.exec(line)).filter(Boolean).map(([, name, value]) => [name, value.trim()]));
}

function securityHeaders(mode) {
  let outDir;
  let apiBaseUrl;
  return {
    name: 'fast-lanche-security-headers',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      apiBaseUrl = process.env.VITE_API_BASE_URL || loadEnv(config.mode, config.root, 'VITE_').VITE_API_BASE_URL || '';
    },
    // Ultima passagem do build (--mode react): o dist ja tem todas as paginas para calcular os hashes.
    closeBundle() {
      if (mode !== 'react') return;
      const headers = buildSecurityHeaders(outDir, apiBaseUrl);
      const lines = ['# Gerado pelo build (vite.config.js). Formato Netlify/Cloudflare Pages; ver docs/release/README.md.', '/*',
        ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`), ''];
      writeFileSync(resolve(outDir, '_headers'), lines.join('\n'));
    },
    // Preview = producao local: mesmos cabecalhos e 404.html para URLs inexistentes (como Netlify, Pages, Vercel...).
    configurePreviewServer(server) {
      const headers = readHeadersFile(outDir);
      server.middlewares.use((req, res, next) => {
        for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
        next();
      });
      return () => {
        server.middlewares.use((req, res, next) => {
          if (req.method !== 'GET') return next();
          // Diretorio (ex.: "/" ou "/react/") abre o index.html dele, como fazem as hospedagens estaticas.
          const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
          const directoryIndex = resolve(outDir, `.${pathname}`, 'index.html');
          if (pathname.endsWith('/') && directoryIndex.startsWith(outDir) && existsSync(directoryIndex)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.end(readFileSync(directoryIndex));
          }
          // O htmlFallback do Vite ja reescreveu "/" para "/index.html": arquivo existente segue para o indexHtmlMiddleware.
          const target = resolve(outDir, `.${pathname}`);
          if (target.startsWith(outDir) && existsSync(target) && statSync(target).isFile()) return next();
          const notFound = resolve(outDir, '404.html');
          if (!existsSync(notFound)) return next();
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(readFileSync(notFound));
        });
      };
    }
  };
}

// As paginas legadas montam caminhos de imagem em tempo de execucao (resolveAssetPath('assets/products/...')),
// que o Vite nao consegue rastrear. Copia as pastas de assets para dist/ para esses caminhos continuarem validos.
function copyStaticAssets() {
  let outDir;
  return {
    name: 'fast-lanche-copy-static-assets',
    apply: 'build',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    closeBundle() {
      for (const folder of ['icons', 'logo', 'og', 'products']) {
        cpSync(resolve('assets', folder), resolve(outDir, 'assets', folder), { recursive: true });
      }
    }
  };
}

// URL publica do site (ex.: https://fastlanche.com.br ou https://usuario.github.io/Fast-Lanche). Opcional: sem ela o
// build continua portavel (caminhos relativos), so nao gera sitemap nem URLs absolutas de Open Graph.
const SITE_URL = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
const INDEXABLE_PAGES = ['index', 'cardapio', 'reservas', 'feedbacks'];
const PRIVATE_PAGES = ['carrinho', 'checkout', 'receipt', 'login', 'perfil'];

// SEO e erro de navegacao (Fase 45): robots.txt, sitemap.xml (com SITE_URL) e 404.html autossuficiente.
// A 404 e copiada sem passar pelo Vite: ela e servida em qualquer URL inexistente, entao usa caminhos a partir da raiz
// do site (prefixados com o caminho de SITE_URL quando o site fica numa subpasta).
function seoFiles() {
  let outDir;
  return {
    name: 'fast-lanche-seo-files',
    apply: 'build',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    closeBundle() {
      const basePath = SITE_URL ? new URL(SITE_URL).pathname.replace(/\/+$/, '') : '';
      const disallow = PRIVATE_PAGES.flatMap(page => [`Disallow: ${basePath}/react/${page}.html`, `Disallow: ${basePath}/pages-html/${page}.html`]);
      const robots = ['User-agent: *', 'Allow: /', ...disallow];
      if (SITE_URL) robots.push('', `Sitemap: ${SITE_URL}/sitemap.xml`);
      writeFileSync(resolve(outDir, 'robots.txt'), `${robots.join('\n')}\n`);

      if (SITE_URL) {
        const today = new Date().toISOString().slice(0, 10);
        const urls = INDEXABLE_PAGES.map(page => `  <url>\n    <loc>${SITE_URL}/react/${page}.html</loc>\n    <lastmod>${today}</lastmod>\n  </url>`);
        writeFileSync(resolve(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
      }

      const notFound = readFileSync(resolve('404.html'), 'utf-8').replace(/(href|src)="\/(?!\/)/g, `$1="${basePath}/`);
      writeFileSync(resolve(outDir, '404.html'), notFound);
    }
  };
}

// canonical, og:url, og:image e twitter:card sao injetados DEPOIS do processamento de HTML do Vite ('post'): se
// estivessem no fonte, o Vite trataria o href do canonical como asset (copiando a pagina para assets/) e embutiria o
// og:image como data URI, que nenhuma rede social aceita. Toda pagina aponta para o shell React equivalente (a URL
// oficial); a versao classica fica com robots noindex. Com SITE_URL as URLs sao absolutas, como pedem buscadores e
// redes sociais; sem ela, o canonical e relativo e og:image/og:url sao omitidos (exigem URL absoluta).
function seoHead() {
  return {
    name: 'fast-lanche-seo-head',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const page = context.path.split('/').pop() || 'index.html';
        const depth = context.path.split('/').length - 2; // '/index.html' -> 0, '/react/x.html' -> 1
        const relativeCanonical = context.path.startsWith('/react/') ? page : `${'../'.repeat(depth)}react/${page}`;
        const tags = [
          `<link rel="canonical" href="${SITE_URL ? `${SITE_URL}/react/${page}` : relativeCanonical}" />`,
          '<meta name="twitter:card" content="summary_large_image" />'
        ];
        if (SITE_URL) {
          tags.push(`<meta property="og:url" content="${SITE_URL}/react/${page}" />`,
            `<meta property="og:image" content="${SITE_URL}/assets/og/fast-lanche-og.png" />`,
            '<meta property="og:image:width" content="1200" />', '<meta property="og:image:height" content="630" />',
            '<meta property="og:image:alt" content="Fast Lanche: hambúrgueres, pizzas e combos com entrega e reserva de mesa" />');
        }
        return html.replace('</head>', `  ${tags.join('\n  ')}\n</head>`);
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
  plugins: [react(), copyStaticAssets(), seoHead(), securityHeaders(mode), ...(mode === 'react' ? [] : [seoFiles()])],
  // Caminhos relativos no build: o resultado em dist/ funciona em qualquer
  // servidor estatico (Live Server, abrir via subpasta, etc.).
  base: './',
  // Site multipagina: URL inexistente responde 404 (e o preview serve dist/404.html), em vez do fallback de SPA que
  // devolvia a Home com status 200 ("soft 404", ruim para buscadores e confuso para o usuario).
  appType: 'mpa',
  build: {
    // BUILD_OUT_DIR permite um segundo build (ex.: dist-api, modo HTTP do E2E) sem apagar o dist/ principal.
    outDir: process.env.BUILD_OUT_DIR || 'dist',
    emptyOutDir: mode !== 'react',
    rollupOptions: {
      input: mode === 'react' ? REACT_PAGES : LEGACY_PAGES
    }
  }
}));
