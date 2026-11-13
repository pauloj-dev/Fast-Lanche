# Release do frontend — Fast Lanche

Guia de publicação do frontend (Fase 45, issue #3): o que verificar antes de publicar, como publicar, quais URLs são oficiais, quais cabeçalhos de segurança o servidor deve enviar e como conferir o site depois de publicado. Os resultados de cada release ficam registrados nesta pasta ([release de 2026-11-12](2026-11-12-fase-45.md)).

> **Escopo:** este frontend publica uma **demonstração**. Os dados ficam no navegador, e autenticação e pagamento são simulados (veja [Limitações](../../README.md#limitações-atuais)). A publicação com backend, contas reais e LGPD é o Módulo 4.

## 1. Checklist de release

Em um checkout limpo (clone novo, sem `node_modules` nem `dist`):

| # | Passo | Comando | Esperado |
| --- | --- | --- | --- |
| 1 | Instalar exatamente o lockfile | `corepack enable && pnpm install --frozen-lockfile` | Instala sem alterar `pnpm-lock.yaml`. É o equivalente ao `npm ci`. |
| 2 | Dependências sem vulnerabilidade conhecida | `pnpm audit` | `No known vulnerabilities found`. |
| 3 | Testes de unidade e contrato | `pnpm test` | Todos passam. |
| 4 | Cobertura mínima | `pnpm run test:coverage` | ≥ 90% linhas, ≥ 80% ramos, ≥ 85% funções. |
| 5 | Build | `pnpm run build` (com `SITE_URL` do domínio final) | Duas passagens sem erro nem aviso. |
| 6 | Verificação do `dist/` | `pnpm run verify:dist` | `✓ build pronto para publicar`. |
| 7 | E2E completo | `pnpm exec playwright install chromium firefox webkit && pnpm run test:e2e` | Todos os projetos passam: Chromium, Firefox, WebKit, mobile, modo API, a11y e desempenho. |
| 8 | Preview manual | `pnpm run preview` → `http://localhost:4173/react/index.html` | Fluxos navegáveis; URL inexistente mostra a página 404. |
| 9 | Smoke check no preview | `node scripts/smoke-check.mjs http://localhost:4173` | 0 falhas. |
| 10 | Publicar `dist/` | ver seção 3 | — |
| 11 | Smoke check na URL publicada | `node scripts/smoke-check.mjs https://<domínio>` | 0 falhas e cabeçalhos de segurança presentes. |
| 12 | Verificação manual em aparelhos | seção 6 | Registrar o resultado no arquivo da release. |

Os passos 3 a 7 rodam juntos em `pnpm run release:check` e, a cada push ou PR para a `main`, no CI ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)).

## 2. O que o `verify:dist` garante

- **Páginas:** as páginas clássicas, os 9 shells React, `404.html` e `robots.txt` existem. Nenhuma página foi copiada por engano para `assets/`.
- **Metadados de cada HTML:** `lang="pt-BR"`, `<title>`, `description`, `viewport`, favicon, `robots` coerente com a página (indexável ou não) e `canonical`.
- **Referências:** todo `src`/`href` local aponta para um arquivo que existe. Os caminhos são relativos, então o site funciona em subpasta.
- **Isolamento:** páginas clássicas não referenciam o bundle React; os shells React têm `#root` e o bundle.
- **Assets:** imagens de produto montadas em tempo de execução e a imagem Open Graph estão no `dist/`.
- **SEO:** `robots.txt` bloqueia carrinho, checkout, comprovante, login e perfil. O `sitemap.xml` (gerado com `SITE_URL`) lista só as 4 páginas indexáveis.
- **Segurança:** `_headers` com CSP sem `unsafe-inline`/`unsafe-eval` em scripts e um hash por script inline, além de `nosniff`, `Referrer-Policy` e `X-Frame-Options`.
- **Orçamento de tamanho:** bundle React, maior chunk clássico, JS total e maior CSS dentro do limite (cerca de 20% acima do build atual). Um salto indica dependência pesada nova ou React vazando para as páginas clássicas.

## 3. Publicação

O `dist/` é estático e funciona em qualquer hospedagem (Netlify, Cloudflare Pages, Vercel, GitHub Pages, S3 + CloudFront, nginx):

```bash
SITE_URL=https://fastlanche.com.br pnpm run build
pnpm run verify:dist
# publicar o conteúdo de dist/
```

- **`SITE_URL`** é necessário para o `sitemap.xml`, para `canonical`/`og:url`/`og:image` absolutos (redes sociais não aceitam URL relativa) e para os links da `404.html` quando o site fica numa subpasta (ex.: `https://usuario.github.io/Fast-Lanche`).
- **`VITE_API_BASE_URL`** fica vazia nesta release (modo local). Ela é embutida no bundle; nunca coloque segredo nela.
- **Página 404:** Netlify, Cloudflare Pages, Vercel e GitHub Pages servem `404.html` automaticamente. No nginx, use `error_page 404 /404.html;`. O `pnpm run preview` faz o mesmo. Uma URL inexistente deve responder **404**, nunca a Home com 200 ("soft 404").
- **Entrada do site:** aponte a raiz (`/`) para `/react/index.html` com um redirecionamento 301 (Netlify: `/  /react/index.html  301` em `_redirects`). Sem isso, a raiz abre a Home clássica, que é `noindex` e tem `canonical` para a React, então continua correta, só menos direta.

## 4. URLs oficiais e páginas clássicas

| Tipo | URLs | Indexação | Motivo |
| --- | --- | --- | --- |
| **Oficiais (React)** | `/react/index.html`, `/react/cardapio.html`, `/react/reservas.html`, `/react/feedbacks.html` | `index, follow` + sitemap | Conteúdo público. |
| Fluxos privados (React) | `/react/carrinho.html`, `/react/checkout.html`, `/react/receipt.html`, `/react/login.html`, `/react/perfil.html` | `noindex, nofollow` + `Disallow` | Dados pessoais e estado do usuário. |
| Clássicas | `/index.html`, `/pages-html/*.html` | `noindex, follow`, com `canonical` para a equivalente React | Links antigos e painel administrativo. |

**Decisão:** as páginas clássicas **não** são redirecionadas nem removidas nesta release. O painel administrativo ainda não foi migrado e é aberto pela Home clássica. Quando o admin for migrado:

1. Trocar as páginas clássicas por redirecionamentos 301 para a URL React equivalente (mesma tabela de `canonical`).
2. Depois de um ciclo de indexação, remover `index.html` e `pages-html/` do build (`LEGACY_PAGES` em `vite.config.js`) e o `copyStaticAssets` que só elas usam.

## 5. Cabeçalhos de segurança

O build gera `dist/_headers` (formato Netlify/Cloudflare Pages, aplicado automaticamente por eles), com uma política calculada a partir do próprio build. O `pnpm run preview` aplica os mesmos cabeçalhos, então o E2E inteiro roda sob a CSP de produção.

| Cabeçalho | Valor | Para quê |
| --- | --- | --- |
| `Content-Security-Policy` | `default-src 'self'`; scripts só da origem, do CDN do html2canvas e dos hashes dos avisos de fallback; fontes do Google; `connect-src` com a origem da API quando houver; `object-src 'none'`; `frame-ancestors 'self'` | Bloqueia script injetado (XSS), exfiltração para outros domínios e clickjacking. |
| `X-Content-Type-Options` | `nosniff` | Impede interpretar arquivo com o tipo errado. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Não vaza caminho e query string (ex.: links de comprovante) para outros sites. |
| `Permissions-Policy` | câmera, microfone, geolocalização, pagamento e USB desativados | O site não usa essas APIs. |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking em navegadores antigos. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isola a janela de popups de outras origens. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | **Configurar no servidor HTTPS** (não vai no `_headers` para não quebrar `http://localhost`). |

Em outros servidores, copie os valores de `dist/_headers` depois do build. A CSP muda quando os scripts inline mudam, por isso ela é gerada a cada build:

- **Vercel:** em `vercel.json`, `"headers": [{ "source": "/(.*)", "headers": [{ "key": "...", "value": "..." }] }]`.
- **nginx:** `add_header Content-Security-Policy "..." always;` (um `add_header` por cabeçalho).
- **GitHub Pages:** não permite cabeçalhos próprios. A CSP pode ir numa `<meta http-equiv>`, mas `frame-ancestors` não funciona por meta. Prefira Netlify ou Cloudflare Pages para produção.

O `scripts/smoke-check.mjs` avisa quando algum desses cabeçalhos está ausente na URL publicada.

## 6. Verificação manual em aparelhos

A automação cobre Chromium, Firefox (Gecko) e WebKit, além de Pixel 7 e iPhone 14 emulados. O WebKit do Playwright é o motor do Safari, mas **não** é o Safari do iOS: rolagem, teclado virtual, `position: sticky`, zoom em campos e o seletor de data nativo só se confirmam num aparelho. A cada release, num iPhone real (Safari) e num Android real (Chrome), na URL publicada:

- [ ] Home → Cardápio → adicionar produto → Carrinho → Checkout → comprovante.
- [ ] Cadastro → Perfil (editar dados e avatar) → Checkout pré-preenchido.
- [ ] Reserva: escolher data, horário e pessoas → pagamento simulado → confirmação.
- [ ] Avaliação de um pedido entregue.
- [ ] Teclado virtual não cobre campo focado; sem zoom involuntário ao focar campos.
- [ ] Menu do header abre e fecha; nada transborda na horizontal.
- [ ] Lighthouse (Chrome DevTools ou PageSpeed Insights) na URL publicada: Performance, Acessibilidade, Boas práticas e SEO ≥ 90.

## 7. Smoke checks pós-publicação

```bash
node scripts/smoke-check.mjs https://<domínio>          # legível
node scripts/smoke-check.mjs https://<domínio> --json   # para anexar ao registro da release
```

O script confere:

- todas as páginas (status 200, `text/html`, título, `robots` correto, `#root` nos shells);
- os bundles JS/CSS referenciados (status e tipo de conteúdo; pega caminho base errado no deploy);
- `robots.txt`, `sitemap.xml`, imagem Open Graph e imagens de produto;
- 404 de verdade para URL inexistente;
- os cabeçalhos de segurança.

Termina com código 1 se houver falha. Registre a saída no arquivo da release.
