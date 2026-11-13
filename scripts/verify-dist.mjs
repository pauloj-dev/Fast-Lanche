// Verificacao estatica do build (Fase 45): roda depois de `npm run build` e falha (exit 1) se o dist/ nao estiver
// pronto para publicar. Uso: node scripts/verify-dist.mjs [pasta] (padrao: dist).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] || 'dist');
const failures = [];
const notes = [];
const fail = message => failures.push(message);

// Orcamento de tamanho (bytes, sem compressao). Folga de ~20% sobre o build atual: um salto acima disso indica
// dependencia nova pesada ou import acidental do React numa pagina legada.
const BUDGET = { reactEntryJs: 480_000, largestLegacyJs: 80_000, totalJs: 750_000, largestCss: 170_000 };

const LEGACY = ['index.html', ...['cardapio', 'carrinho', 'checkout', 'reservas', 'feedbacks', 'login', 'perfil'].map(p => `pages-html/${p}.html`)];
const REACT = ['index', 'cardapio', 'carrinho', 'checkout', 'receipt', 'reservas', 'feedbacks', 'login', 'perfil'].map(p => `react/${p}.html`);
const INDEXABLE = ['react/index.html', 'react/cardapio.html', 'react/reservas.html', 'react/feedbacks.html'];
const PRODUCT_ASSETS = ['hamburguer.svg', 'pizza.svg', 'bebida.svg', 'combo.svg'];

if (!existsSync(root)) {
  console.error(`verify-dist: ${root} nao existe. Rode npm run build antes.`);
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(root);
const rel = path => relative(root, path).replaceAll('\\', '/');

// 1. Paginas esperadas.
for (const page of [...LEGACY, ...REACT, '404.html', 'robots.txt']) {
  if (!existsSync(join(root, page))) fail(`arquivo ausente: ${page}`);
}
// Nenhum HTML deve parar dentro de assets/ (sinal de um href de pagina tratado como asset pelo Vite).
for (const file of files.filter(f => rel(f).startsWith('assets/') && f.endsWith('.html'))) {
  fail(`pagina copiada como asset: ${rel(file)}`);
}

// 2. Cada HTML: metadados, referencias locais resolvem e isolamento legado/React.
const attr = (tag, name) => new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag)?.[1];
for (const page of [...LEGACY, ...REACT, '404.html'].filter(p => existsSync(join(root, p)))) {
  const html = readFileSync(join(root, page), 'utf-8');
  const head = html.slice(0, html.indexOf('</head>'));
  if (!/<html[^>]*\blang="pt-BR"/i.test(html)) fail(`${page}: <html lang="pt-BR"> ausente`);
  if (!/<title>[^<]{3,}<\/title>/i.test(head)) fail(`${page}: <title> ausente`);
  if (!/<meta name="viewport"[^>]*width=device-width/i.test(head)) fail(`${page}: meta viewport ausente`);
  if (!/<meta\s+name="description"\s+content="[^"]{20,}"/i.test(head)) fail(`${page}: meta description ausente ou curta`);
  if (!/<link rel="icon"/i.test(head)) fail(`${page}: favicon ausente`);

  const robots = /<meta name="robots" content="([^"]+)"/i.exec(head)?.[1] || '';
  if (!robots) fail(`${page}: meta robots ausente`);
  else if (INDEXABLE.includes(page) !== robots.startsWith('index')) fail(`${page}: robots "${robots}" inesperado`);
  if (page !== '404.html' && !/<link rel="canonical" href="[^"]+"/i.test(head)) fail(`${page}: canonical ausente`);

  const refs = [...html.matchAll(/<(?:script|link|img|source)\b[^>]*>/gi)]
    .map(([tag]) => (/^<link/i.test(tag) && /rel="canonical"/i.test(tag)) ? null : attr(tag, 'src') || attr(tag, 'href'))
    .filter(Boolean);
  for (const ref of refs) {
    if (/^(https?:|data:|mailto:|tel:|#)/i.test(ref)) continue;
    const clean = ref.split(/[?#]/)[0];
    // A 404 usa caminhos a partir da raiz do site (e servida em qualquer URL).
    const target = clean.startsWith('/') ? join(root, clean) : resolve(dirname(join(root, page)), clean);
    if (!existsSync(target)) fail(`${page}: referencia quebrada ${ref}`);
  }

  if (page.startsWith('react/')) {
    if (!html.includes('<div id="root"></div>')) fail(`${page}: #root ausente`);
    if (!/assets\/main-[\w-]+\.js/.test(html)) fail(`${page}: bundle React (main-*.js) nao referenciado`);
  } else if (/assets\/main-[\w-]+\.js/.test(html) || /react(-dom)?[.-][\w-]*\.js/.test(html)) {
    fail(`${page}: pagina sem React referencia o bundle React`);
  }
}

// 3. Assets copiados (caminhos montados em tempo de execucao pelas paginas legadas) e imagem de compartilhamento.
for (const asset of PRODUCT_ASSETS) {
  if (!existsSync(join(root, 'assets/products', asset))) fail(`asset de produto ausente: assets/products/${asset}`);
}
if (!existsSync(join(root, 'assets/og/fast-lanche-og.png'))) fail('imagem Open Graph ausente: assets/og/fast-lanche-og.png');

// 4. robots.txt bloqueia fluxos privados; sitemap (quando houver) so lista paginas indexaveis.
const robotsTxt = existsSync(join(root, 'robots.txt')) ? readFileSync(join(root, 'robots.txt'), 'utf-8') : '';
for (const page of ['carrinho', 'checkout', 'receipt', 'login', 'perfil']) {
  if (!new RegExp(`Disallow: \\S*/react/${page}\\.html`).test(robotsTxt)) fail(`robots.txt nao bloqueia react/${page}.html`);
}
if (existsSync(join(root, 'sitemap.xml'))) {
  const locs = [...readFileSync(join(root, 'sitemap.xml'), 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  if (locs.length !== INDEXABLE.length || !locs.every(loc => INDEXABLE.some(page => loc.endsWith(`/${page}`)))) {
    fail(`sitemap.xml deveria listar exatamente ${INDEXABLE.join(', ')}`);
  }
  notes.push(`sitemap.xml com ${locs.length} URLs`);
} else {
  notes.push('sitemap.xml nao gerado (defina SITE_URL no build para gera-lo)');
}

// 4b. Cabecalhos de seguranca gerados no build: CSP com um hash para cada script inline (sem 'unsafe-inline' em scripts).
const headersFile = join(root, '_headers');
if (!existsSync(headersFile)) fail('_headers ausente (cabecalhos de seguranca)');
else {
  const headers = readFileSync(headersFile, 'utf-8');
  const csp = /Content-Security-Policy:\s*(.+)/.exec(headers)?.[1] || '';
  const scriptSrc = /script-src ([^;]+)/.exec(csp)?.[1] || '';
  if (!csp) fail('_headers sem Content-Security-Policy');
  if (/unsafe-inline|unsafe-eval/.test(scriptSrc)) fail('script-src da CSP permite unsafe-inline/unsafe-eval');
  const inlineScripts = REACT.filter(page => existsSync(join(root, page))).reduce((total, page) => total + (readFileSync(join(root, page), 'utf-8').match(/<script>/g) || []).length, 0);
  const hashes = (scriptSrc.match(/'sha256-/g) || []).length;
  if (inlineScripts && !hashes) fail('ha scripts inline mas a CSP nao lista nenhum hash');
  for (const header of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options']) {
    if (!headers.includes(`${header}:`)) fail(`_headers sem ${header}`);
  }
  notes.push(`_headers com CSP (${hashes} hash(es) de script inline)`);
}

// 5. Orcamento de bundle.
const js = files.filter(f => f.endsWith('.js'));
const css = files.filter(f => f.endsWith('.css'));
const size = list => list.reduce((total, file) => total + statSync(file).size, 0);
const reactEntry = js.filter(f => /assets[\\/]main-[\w-]+\.js$/.test(f));
const legacyJs = js.filter(f => !reactEntry.includes(f));
const largestLegacy = legacyJs.reduce((max, f) => Math.max(max, statSync(f).size), 0);
const checks = [
  ['bundle React (main-*.js)', size(reactEntry), BUDGET.reactEntryJs],
  ['maior chunk legado', largestLegacy, BUDGET.largestLegacyJs],
  ['JS total', size(js), BUDGET.totalJs],
  // Os dois builds geram o mesmo CSS com nomes diferentes; o que importa e o que cada pagina baixa.
  ['maior CSS', css.reduce((max, f) => Math.max(max, statSync(f).size), 0), BUDGET.largestCss]
];
const kb = bytes => `${(bytes / 1024).toFixed(1)} kB`;
for (const [label, actual, budget] of checks) {
  notes.push(`${label}: ${kb(actual)} (orcamento ${kb(budget)})`);
  if (actual > budget) fail(`${label} acima do orcamento: ${kb(actual)} > ${kb(budget)}`);
}

console.log(`verify-dist: ${rel(root) || root} — ${files.length} arquivos`);
for (const note of notes) console.log(`  · ${note}`);
if (failures.length) {
  console.error(`\n${failures.length} problema(s):`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log('  ✓ build pronto para publicar');
