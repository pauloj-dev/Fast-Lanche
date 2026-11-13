// Smoke check pos-publicacao (Fase 45): confere, por HTTP, se um site publicado responde como o build verificado.
// Uso: node scripts/smoke-check.mjs <url-base> [--json]
//   ex.: node scripts/smoke-check.mjs https://fastlanche.com.br
//        node scripts/smoke-check.mjs http://localhost:4173        (depois de npm run build && npm run preview)
// Nao abre navegador: complementa o E2E (que roda contra o preview) checando o que so existe no servidor real:
// status HTTP, tipos de conteudo, bundles servidos, robots/sitemap, 404 de verdade e cabecalhos de seguranca.
const [rawBase, ...flags] = process.argv.slice(2);
if (!rawBase) {
  console.error('Uso: node scripts/smoke-check.mjs <url-base> [--json]');
  process.exit(2);
}
const base = rawBase.replace(/\/+$/, '');
const results = [];
const record = (status, check, detail = '') => results.push({ status, check, detail });

async function get(path) {
  const started = performance.now();
  const response = await fetch(`${base}/${path.replace(/^\//, '')}`, { redirect: 'follow', headers: { 'user-agent': 'fast-lanche-smoke-check' } });
  const body = await response.text();
  return { response, body, ms: Math.round(performance.now() - started) };
}

const PAGES = [
  ['react/index.html', true], ['react/cardapio.html', true], ['react/reservas.html', true], ['react/feedbacks.html', true],
  ['react/carrinho.html', false], ['react/checkout.html', false], ['react/receipt.html', false], ['react/login.html', false], ['react/perfil.html', false],
  ['index.html', false], ['pages-html/cardapio.html', false], ['pages-html/reservas.html', false], ['pages-html/feedbacks.html', false],
  ['pages-html/carrinho.html', false], ['pages-html/checkout.html', false], ['pages-html/login.html', false], ['pages-html/perfil.html', false]
];

const assets = new Set();
for (const [path, indexable] of PAGES) {
  try {
    const { response, body, ms } = await get(path);
    const type = response.headers.get('content-type') || '';
    const problems = [];
    if (response.status !== 200) problems.push(`status ${response.status}`);
    if (!type.includes('text/html')) problems.push(`content-type ${type || 'ausente'}`);
    if (!/<title>[^<]{3,}<\/title>/.test(body)) problems.push('sem <title>');
    const robots = /<meta name="robots" content="([^"]+)"/.exec(body)?.[1] || '';
    if (indexable !== robots.startsWith('index')) problems.push(`robots "${robots}"`);
    if (path.startsWith('react/') && !body.includes('<div id="root"></div>')) problems.push('sem #root');
    for (const [, ref] of body.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)) {
      if (!/^https?:/.test(ref)) assets.add(new URL(ref, `${base}/${path}`).href);
    }
    record(problems.length ? 'falha' : 'ok', `GET /${path}`, problems.join(', ') || `${response.status} em ${ms} ms`);
  } catch (error) {
    record('falha', `GET /${path}`, error.message);
  }
}

// Bundles referenciados pelas paginas precisam existir com o tipo certo (erro classico de caminho base no deploy).
for (const url of assets) {
  try {
    const response = await fetch(url);
    const type = response.headers.get('content-type') || '';
    const ok = response.status === 200 && (url.endsWith('.js') ? /javascript/.test(type) : /text\/css/.test(type));
    record(ok ? 'ok' : 'falha', `asset ${new URL(url).pathname}`, ok ? `${response.status} ${type}` : `status ${response.status}, content-type ${type || 'ausente'}`);
  } catch (error) {
    record('falha', `asset ${url}`, error.message);
  }
}

// Raiz do site: precisa abrir uma pagina (index.html ou redirecionamento para react/index.html), nunca 404.
try {
  const { response, body } = await get('');
  const ok = response.status === 200 && /<title>/.test(body);
  record(ok ? 'ok' : 'falha', 'GET / (raiz)', ok ? `${response.status} -> ${new URL(response.url).pathname}` : `status ${response.status}`);
} catch (error) {
  record('falha', 'GET / (raiz)', error.message);
}

// Arquivos de SEO e de compartilhamento.
for (const [path, required, expectType] of [['robots.txt', true, 'text/plain'], ['sitemap.xml', false, 'xml'], ['assets/og/fast-lanche-og.png', true, 'image/png'], ['assets/products/hamburguer.svg', true, 'image/svg']]) {
  try {
    const { response } = await get(path);
    const type = response.headers.get('content-type') || '';
    if (response.status === 200 && type.includes(expectType)) record('ok', `GET /${path}`, type);
    else record(required ? 'falha' : 'aviso', `GET /${path}`, `status ${response.status}${required ? '' : ' (gerado so com SITE_URL no build)'}`);
  } catch (error) {
    record(required ? 'falha' : 'aviso', `GET /${path}`, error.message);
  }
}

// URL inexistente: deve responder 404 com a pagina propria (nao a Home com 200, o "soft 404").
try {
  const { response, body } = await get(`pagina-que-nao-existe-${Date.now()}.html`);
  if (response.status !== 404) record('falha', 'URL inexistente', `status ${response.status} (esperado 404)`);
  else record(body.includes('Página não encontrada') ? 'ok' : 'aviso', 'URL inexistente', body.includes('Página não encontrada') ? '404 com a pagina do Fast Lanche' : '404 generico do servidor (configure 404.html)');
} catch (error) {
  record('falha', 'URL inexistente', error.message);
}

// Cabecalhos de seguranca: dependem do servidor/hospedagem, entao viram aviso (recomendacoes em docs/release/README.md).
try {
  const { response } = await get('react/index.html');
  const isHttps = base.startsWith('https://');
  const wanted = [
    ['content-security-policy', true], ['x-content-type-options', true], ['referrer-policy', true],
    ['permissions-policy', false], ['strict-transport-security', isHttps]
  ];
  for (const [header, important] of wanted) {
    if (header === 'strict-transport-security' && !isHttps) continue;
    const value = response.headers.get(header);
    const shown = value && value.length > 90 ? `${value.slice(0, 87)}...` : value;
    record(value ? 'ok' : 'aviso', `header ${header}`, shown || (important ? 'ausente (recomendado)' : 'ausente (opcional)'));
  }
} catch (error) {
  record('aviso', 'headers', error.message);
}

const failures = results.filter(result => result.status === 'falha');
const warnings = results.filter(result => result.status === 'aviso');
if (flags.includes('--json')) {
  console.log(JSON.stringify({ base, date: new Date().toISOString(), failures: failures.length, warnings: warnings.length, results }, null, 2));
} else {
  const icon = { ok: '✓', aviso: '!', falha: '✗' };
  console.log(`Smoke check: ${base} (${new Date().toISOString()})`);
  for (const result of results) console.log(`  ${icon[result.status]} ${result.check}${result.detail ? ` — ${result.detail}` : ''}`);
  console.log(`\n${results.length - failures.length - warnings.length} ok · ${warnings.length} aviso(s) · ${failures.length} falha(s)`);
}
process.exit(failures.length ? 1 : 0);
