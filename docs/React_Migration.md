# Migração React do Fast Lanche

A interface principal do Fast Lanche é React 19, montada por `src/main.jsx`. Cada página tem um shell HTML próprio em `react/`, que preserva URLs independentes, metadados por página e o CSS existente (`css/styles.css`). O `App.jsx` escolhe a página pelo nome do arquivo na URL.

## Fluxos migrados

| Fluxo | Página React | Componente | Versão clássica | Indexável |
| --- | --- | --- | --- | --- |
| Home | `react/index.html` | `pages/HomePage.jsx` | `index.html` | sim |
| Cardápio | `react/cardapio.html` | `pages/MenuPage.jsx` | `pages-html/cardapio.html` | sim |
| Carrinho | `react/carrinho.html` | `pages/CartPage.jsx` | `pages-html/carrinho.html` | não |
| Checkout e pagamento simulado | `react/checkout.html` | `pages/CheckoutPage.jsx` | `pages-html/checkout.html` | não |
| Comprovante | `react/receipt.html` | `pages/ReceiptPage.jsx` | (modal no clássico) | não |
| Login e cadastro | `react/login.html` | `pages/LoginPage.jsx` | `pages-html/login.html` | não |
| Perfil (Fase 37) | `react/perfil.html` | `pages/ProfilePage.jsx` | `pages-html/perfil.html` | não |
| Reservas (Fase 38) | `react/reservas.html` | `pages/BookingPage.jsx` | `pages-html/reservas.html` | sim |
| Avaliações (Fase 39) | `react/feedbacks.html` | `pages/FeedbackPage.jsx` | `pages-html/feedbacks.html` | sim |
| Painel administrativo | — | — | módulos de `js/admin*.js` na Home clássica | — |

As páginas React são as URLs oficiais: têm `canonical` próprio e as públicas são indexáveis. As clássicas continuam publicadas com `noindex, follow` e `canonical` para a equivalente React. O painel administrativo é o único fluxo ainda não migrado. Por isso as páginas clássicas não são redirecionadas nem removidas; a decisão está registrada em [`release/README.md`](release/README.md#urls-oficiais-e-páginas-clássicas).

## Camadas

```text
páginas e componentes React (src/pages, src/components)
  -> contextos e hooks (CartContext, ModalContext, useAsyncData, useRequireSession)
  -> services de domínio (fachadas estáveis: authService, menuService, orderService, ...)
  -> repositórios: local (localStorage) ou http (apiClient), escolhidos por VITE_API_BASE_URL
```

- `src/components/`: layout (`Header.jsx` com header e rodapé), cards e imagem de produto, estados assíncronos, feedback de formulário e host de modais.
- `src/pages/`: as telas e seus eventos de formulário.
- `src/context/`: estado do carrinho (`CartContext.jsx`) e modais (`ModalContext.jsx`).
- `src/hooks/`: `useAsyncData` (carregamento com recarga quando outra aba altera o armazenamento) e `useRequireSession` (rotas protegidas).
- `src/utils/`: regras de negócio puras (`businessRules.js`), validação, formatação, erros de domínio e controle de acesso.
- `src/services/`: fachadas com a API pública que as páginas usam. Delegam para `repositories/local/*` (navegador) ou `repositories/http/*` (API REST).
  - Os contratos dos repositórios estão em `repositories/contracts.js`.
  - O cliente HTTP (`api/apiClient.js`) cuida de timeout, nova tentativa segura, CSRF e mapeamento de erros.
  - Detalhes em [`api/README.md`](api/README.md).
- `src/services/storage/`: acesso seguro ao `localStorage` (`safeStorage.js`), chaves centralizadas (`keys.js`), carrinho (`cartStorage.js`) e eventos entre abas (`storageEvents.js`).

As páginas clássicas (`js/*.js`) reutilizam os mesmos services de `src/` (por exemplo, reservas e avaliações), então regras e dados são idênticos nas duas versões.

## Compatibilidade visual

Os componentes React mantêm os IDs, classes, textos, assets e variáveis de `css/styles.css` da versão anterior. Não foi introduzida biblioteca visual nem nova paleta. As fontes (Inter e Bricolage Grotesque) são carregadas no `<head>` de cada página, com `preconnect`. Um fallback com métricas ajustadas (`Inter Fallback`) evita que o texto salte quando a fonte chega.

## Build

`pnpm run build` roda duas passagens do Vite:

1. `--mode legacy` limpa o `dist/` e gera as páginas clássicas, a `404.html`, o `robots.txt` e o `sitemap.xml` (quando há `SITE_URL`).
2. `--mode react` acrescenta os shells React.

Builds separados impedem que o runtime do React vá parar nos chunks das páginas clássicas, que continuam sem baixar React. O `pnpm run verify:dist` confere esse isolamento depois do build.

Os metadados `canonical`, `og:url`, `og:image` e `twitter:card` são injetados depois do processamento de HTML do Vite (plugin `seoHead` em `vite.config.js`). Se estivessem no HTML-fonte, o Vite copiaria a página do `canonical` como asset e embutiria o `og:image` como data URI.

## Como executar os arquivos .jsx

Navegador e Node não executam JSX diretamente. Os shells em `react/` têm apenas `<div id="root"></div>` e o `src/main.jsx`.

- **Dev server:** `pnpm run dev` e abra `http://localhost:5173/react/index.html` (ou `/react/cardapio.html`, `/react/perfil.html` etc.). A versão clássica fica em `http://localhost:5173/index.html`.
- **Build estático:** `pnpm run build` gera `dist/` com caminhos relativos; funciona em qualquer servidor estático e com `pnpm run preview`.
- **Sem build:** abrir um shell sem Vite mostra, depois de 2,5 s, uma mensagem com as instruções acima e um link para a versão clássica. Sem JavaScript, o `<noscript>` explica o mesmo.

## Verificação

- `pnpm test` e `pnpm run test:coverage`: services, regras e adapters (Node test runner).
- `pnpm run test:e2e`: fluxos completos em Chromium, Firefox, WebKit, celulares emulados e modo API, além de acessibilidade (axe) e orçamento de desempenho.
- `pnpm run release:check`: o portão completo usado pelo CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).
