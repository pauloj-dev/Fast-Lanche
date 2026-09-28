# Migração React do Fast Lanche

As páginas de Home, Cardápio, Carrinho, Checkout, Reservas e Feedbacks agora são montadas por React através do entrypoint `src/main.jsx`. Os documentos HTML continuam como pontos de entrada independentes para preservar os URLs públicos e o CSS existente.

## Camadas

```text
React components
  -> context/hooks
  -> services (domínio)
  -> storage adapters ou API client
```

- `src/components/` contém layout, cards de produto e hosts visuais.
- `src/pages/` contém as telas e os eventos de formulário.
- `src/context/CartContext.jsx` centraliza o estado do carrinho.
- `src/utils/businessRules.js` contém cálculos, limites e validações puras.
- `src/services/storage/` mantém `fastlanche_cart` e `fastlanche_feedbacks` fora dos componentes.
- `src/services/api/apiClient.js` é o ponto de troca para uma futura API REST.
- `src/services/menuService.js`, `cartService.js`, `orderService.js`, `bookingService.js`, `feedbackService.js` e `authService.js` representam os contratos de domínio.

## Compatibilidade visual

Os componentes React mantêm os IDs, classes, textos, assets e variáveis de `css/styles.css` usados pela versão anterior. Não foi introduzida uma biblioteca visual nem uma nova paleta. As páginas de login, perfil e administração continuam utilizando seus módulos legados enquanto seus fluxos específicos não fazem parte da migração inicial.

## Persistência e API

O adapter local normaliza dados carregados antes de recalcular subtotal, taxa e total. Quando o backend estiver disponível, os componentes devem continuar chamando os services; basta substituir a implementação local por chamadas ao `apiClient`.

## Verificação

Os testes legados podem ser executados com `node --test tests/*.mjs`. O build de produção usa `pnpm run build` quando as dependências do Vite estão instaladas.

## Como executar os arquivos .jsx

Navegador e Node não executam JSX diretamente (é preciso transpilar). Os shells em `react/` existem para isso: cada um tem apenas `<div id="root"></div>` e o `src/main.jsx`, e o `App.jsx` escolhe a página pelo nome do arquivo na URL.

- **Dev server (transpila em tempo real):** `npm run dev` e abra
  `http://localhost:5173/react/index.html`, `/react/cardapio.html`, `/react/carrinho.html`, `/react/checkout.html`, `/react/reservas.html`, `/react/feedbacks.html`.
  As páginas legadas continuam disponíveis em `http://localhost:5173/index.html` (não precisam do Vite).
- **Build estático:** `npm run build` gera `dist/` (páginas legadas + `dist/react/*.html`) com caminhos relativos; funciona em qualquer servidor estático, inclusive Live Server (`base: './'`), e com `npm run preview`.
- **Sem dev server (transpilação avulsa):**
  `npx esbuild src/main.jsx --bundle --outfile=react-bundle.js --jsx=automatic --loader:.jsx=jsx --define:process.env.NODE_ENV='production'`
  gera `react-bundle.js` + `react-bundle.css`; use um HTML com `<div id="root"></div>` e `<script src="react-bundle.js"></script>`.

Os shells `react/*.html` têm um aviso em tempo de execução: se forem abertos sem transpilação (ex.: Live Server sobre a pasta `react/`), exibem instruções em vez de deixar a tela em branco.
