# 🍔 Fast Lanche

> Plataforma web de delivery nativa para restaurante — cardápio online, carrinho, checkout, agendamento de mesas, acompanhamento de pedidos e painel administrativo.

O **Fast Lanche** é uma plataforma de delivery com cardápio, carrinho, checkout, reservas de mesa, avaliações, acompanhamento de pedidos e painel administrativo. A interface principal é em **React** (Módulo 3). A versão clássica, em **HTML, CSS e JavaScript ES6+**, continua disponível durante a migração. Os dados ficam no navegador por enquanto; a camada de serviços já está pronta para trocar o armazenamento local por uma API REST (Fase 44).

> **Limitações atuais (frontend sem backend):** dados salvos no `localStorage` do navegador, autenticação **simulada** (contas e senhas locais, sem servidor) e pagamento **simulado** (nenhuma cobrança real). Detalhes em [Limitações](#limitações-atuais). O backend real, a privacidade/LGPD e a publicação definitiva são o Módulo 4.

---

## Visão Geral

| Item | Descrição |
| --- | --- |
| **Nome do Produto** | Fast Lanche |
| **Tipo** | Plataforma web de delivery (restaurante) |
| **Público-Alvo** | Clientes (mobile e desktop) e proprietários do restaurante |
| **Stack** | React 19 + Vite 8 (interface principal); HTML5, CSS3 e JavaScript ES6+ (versão clássica e admin) |
| **Execução** | `pnpm install` e `pnpm run dev` (desenvolvimento) · `pnpm run build` gera `dist/` estático para qualquer servidor |
| **Dados** | `localStorage` (padrão) ou API REST com `VITE_API_BASE_URL` ([contrato OpenAPI](docs/api/openapi.yaml)) |
| **Qualidade** | Testes de unidade com cobertura mínima, E2E em Chromium, Firefox, WebKit e celulares, axe e orçamento de desempenho |

---

## Funcionalidades Implementadas

### Cardápio Online
- 6 categorias: **Hambúrgueres, Pizzas, Combos, Bebidas, Sobremesas e Porções**.
- Busca em tempo real por nome ou descrição.
- Filtro por categoria combinado com a busca.
- Exibição apenas de produtos **ativos**.
- Imagens SVG animadas por categoria.

### Carrinho de Compras
- Adicionar, incrementar, decrementar e remover itens.
- Quantidade mínima de **1** e máxima por item (`maxQuantity`).
- Subtotal, **taxa de entrega fixa (R$ 6,00)** e **frete grátis acima de R$ 50,00**.
- Exibição das personalizações de cada item.

### Produtos Personalizáveis
- **Pizza meio a meio**: escolha de dois sabores.
- **Hambúrguer**: remoção de ingredientes e observações.
- **Adicionais/extras** com impacto no preço.

### Checkout e Pagamento Simulado
- Validação HTML5 + JavaScript dos campos obrigatórios.
- Simulação de pagamento (sucesso/falha).
- Registro do pedido e limpeza automática do carrinho.
- Pré-preenchimento automático com os dados do perfil do usuário.

### Agendamento de Mesas
- Validação de data (não pode ser no passado).
- Validação de horário dentro do período de atendimento.
- Limite de pessoas por reserva.

### Feedbacks
- Avaliação com estrelas (mínimo 1) e comentário (mínimo 10 caracteres).
- Cálculo da nota média atualizado a cada avaliação.
- Prevenção de envio duplicado e persistência local.

### Acompanhamento de Pedido
- Fluxo de status: **Pedido recebido → Pagamento confirmado → Preparando pedido → Saiu para entrega → Entregue**.
- Consulta por número do pedido e confirmação de recebimento.
- **Fila de pedidos**: o cliente vê sua posição e quantos pedidos estão à frente.

### Comprovante Digital
- Geração automática após o pagamento aprovado.
- Código único do pedido, dados do cliente, itens, personalizações e valores.
- Persistência para consulta futura.

### Painel Administrativo
- Gestão de produtos: criar, editar, remover (lógica) e ativar/desativar.
- Gestão de categorias.
- Visualização e atualização de status dos pedidos.
- **Controle de estoque e disponibilidade** (bloqueio de venda, alerta de estoque baixo).
- Status do restaurante (aberto/fechado) refletido no cardápio.

### Perfil de Usuário
- Edição de nome, e-mail, telefone e endereço.
- Avatar com foto (upload via `FileReader`, armazenada em Base64) ou iniciais.
- Preferências de pagamento e notificações.
- Pré-preenchimento do checkout e vínculo com pedidos.

### Reconhecimento de Administrador (Admin Claim)
- Dois papéis: **customer** e **admin**.
- Solicitação de admin com validação dos dados do restaurante.
- Fluxo de aprovação simulado (`none → pending → approved/rejected`).
- Controle de acesso: botão "Admin" só aparece para admins aprovados.

### Experiência do Usuário
- Toasts, modais, animações e skeleton loading.
- Estados vazios (ex.: carrinho vazio) e feedback visual de ações.
- Navegação fluida entre **Cardápio → Carrinho → Checkout → Pedido**.

---

## Stack Tecnológico

| Camada | Tecnologia |
| --- | --- |
| **Interface** | React 19 (`src/`) montado por shells HTML em `react/`; páginas clássicas em `index.html` e `pages-html/` |
| **Build** | Vite 8 (Rolldown), em duas passagens (`--mode legacy` e `--mode react`) para bundles independentes |
| **Estilo** | CSS3 — CSS Variables, Grid e Flexbox (`css/styles.css`, compartilhado pelas duas versões) |
| **Domínio** | Services em `src/services/` com repositórios `local` e `http` intercambiáveis |
| **Dados** | `localStorage` com tratamento de erros, ou API REST (`VITE_API_BASE_URL`) |
| **Testes** | Node test runner (unidade/contrato), Playwright (E2E multi-navegador), axe-core (acessibilidade) |
| **Imagens** | SVG (logo, ícones e produtos) e PNG 1200×630 para compartilhamento (Open Graph) |

---

## Estrutura de Pastas

```text
Fast-Lanche/
├── react/                     # Shells HTML das páginas React (index, cardapio, carrinho, checkout,
│                              #   receipt, login, perfil, reservas, feedbacks)
├── src/                       # Aplicação React: pages/, components/, context/, hooks/, services/, utils/
├── index.html                 # Home clássica (raiz do projeto)
├── 404.html                   # Página de erro autossuficiente (copiada para dist/)
├── pages-html/                # Demais páginas clássicas
│   ├── cardapio.html          # Cardápio completo
│   ├── carrinho.html          # Carrinho de compras
│   ├── checkout.html          # Checkout e pagamento simulado
│   ├── reservas.html          # Agendamento de mesas
│   ├── feedbacks.html         # Avaliações dos clientes
│   ├── login.html             # Login e cadastro
│   └── perfil.html            # Perfil do usuário
├── css/
│   └── styles.css             # Layout, componentes, responsividade e identidade visual
├── js/                        # Módulos ES6 (separação de responsabilidades)
│   ├── app.js                 # Inicialização e comunicação entre módulos
│   ├── menu-store.js          # Dados e lógica do cardápio
│   ├── cart.js                # Carrinho, quantidades e valores
│   ├── checkout.js            # Finalização e pagamento simulado
│   ├── booking.js             # Agendamento de mesas
│   ├── feedback.js            # Avaliações e nota média
│   ├── product-customization.js # Personalização de produtos
│   ├── order-tracking.js      # Acompanhamento de pedidos
│   ├── order-queue.js         # Fila de pedidos
│   ├── receipt.js             # Comprovante digital
│   ├── inventory.js           # Estoque e disponibilidade
│   ├── admin.js               # Painel administrativo
│   ├── user-profile.js        # Perfil do usuário
│   ├── admin-claim.js         # Sistema de reconhecimento de admin
│   ├── user-navigation.js     # Navegação do usuário (dropdown de perfil)
│   ├── app-state.js           # Estado global compartilhado
│   ├── ux.js                  # Estados visuais e UX
│   ├── ui.js                  # Helpers de UI (toasts, modais)
│   ├── security.js            # Seguridad: sanitización y validación (Fase 29)
│   ├── constants.js           # Constantes compartilhadas
│   └── base-path.js           # Caminhos relativos (raiz x pages-html)
├── assets/
│   ├── icons/                 # Ícones da interface (SVG)
│   ├── logo/                  # Logotipo (SVG)
│   ├── og/                    # Imagem de compartilhamento (PNG 1200×630)
│   └── products/              # Imagens dos produtos (SVG)
├── scripts/                   # verify-dist, smoke-check e geração da imagem Open Graph
├── tests/                     # Unidade, contrato e API mock (Node test runner)
├── e2e/                       # Playwright: fluxos, modo API, acessibilidade e desempenho
├── docs/                      # PRD, planos, migração React, API e release
└── .github/workflows/ci.yml   # CI: testes, build, verificação do dist e E2E
```

---

## Identidade Visual

Paleta de cores definida em variáveis CSS no `:root`:

```css
:root {
  --amarelo: #FFC700;   /* Destaques / ações */
  --vermelho: #E63946;  /* Identidade / alerta */
  --branco:  #FFFFFF;   /* Fundos / textos invertidos */
  --preto:   #161616;   /* Textos principais / fundos escuros */
}
```

---

## Persistência de Dados

O estado da aplicação é salvo no `localStorage` do navegador:

| Chave | Conteúdo |
| --- | --- |
| `fastlanche_cart` | Carrinho (itens, subtotal, taxa, total) |
| `fastlanche_feedbacks` | Avaliações enviadas |
| `fastlanche_orders` | Pedidos registrados |
| `fastlanche_receipts` | Comprovantes digitais |
| `fastlanche_inventory` | Estoque e disponibilidade |
| `fastlanche_user_profile` | Perfil do usuário |
| `fastlanche_admin_claim` | Dados e status de admin |

Todas as operações utilizam `try/catch`; se o `localStorage` estiver indisponível, o sistema mantém o estado apenas em memória e avisa no console, sem bloquear a navegação.

---

## Como Executar

Requisitos: **Node.js 20.19+** (o CI usa 24) e **pnpm** (via `corepack enable`; a versão está fixada em `packageManager`). Os scripts também rodam com `npm run`.

```bash
corepack enable
pnpm install
```

| Comando | Para quê |
| --- | --- |
| `pnpm run dev` | Dev server com recarga em `http://localhost:5173/react/index.html` (versão clássica em `/index.html`). |
| `pnpm run build` | Gera `dist/`: páginas clássicas, shells React, assets, `404.html`, `robots.txt` e, com `SITE_URL`, `sitemap.xml`. Sempre use este script: ele roda `vite build --mode legacy` e depois `--mode react` (um `vite build` sozinho gera só as páginas clássicas). |
| `pnpm run preview` | Serve o `dist/` como em produção (`http://localhost:4173/react/index.html`), com 404 de verdade para URLs inexistentes. |
| `pnpm run verify:dist` | Confere o `dist/`: páginas, metadados, referências locais, isolamento entre bundles, robots/sitemap e orçamento de tamanho. |
| `pnpm run release:check` | Portão de release completo: cobertura, build, `verify:dist` e E2E (o mesmo que o CI roda). |

O `dist/` usa caminhos relativos e funciona em qualquer servidor estático, inclusive numa subpasta. Abrir os shells `react/*.html` sem build ou dev server mostra uma mensagem explicando como executar em vez de uma tela em branco. A versão clássica ainda pode ser servida direto da raiz, sem build (`python -m http.server 8000`). Como usa módulos ES6, sirva por HTTP, e não por `file://`.

### Variáveis de ambiente (build)

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `VITE_API_BASE_URL` | vazia | Vazia: dados no navegador (modo local). Definida (ex.: `https://api.exemplo.com/api/v1`): os services usam a API REST do [contrato OpenAPI](docs/api/openapi.yaml). Fica embutida no bundle, então não deve conter segredo. |
| `SITE_URL` | vazia | URL pública (ex.: `https://fastlanche.com.br` ou `https://usuario.github.io/Fast-Lanche`). Gera `sitemap.xml` e a linha `Sitemap:` do `robots.txt`; deixa absolutos `canonical`, `og:url` e `og:image`; ajusta os links da `404.html` para a subpasta. |
| `BUILD_OUT_DIR` | `dist` | Pasta de saída. Usada pelo E2E para um segundo build (`dist-api`) sem apagar o principal. |

### URLs oficiais

As páginas **React** (`/react/*.html`) são as URLs oficiais: indexáveis (Home, Cardápio, Reservas e Avaliações) e com `canonical` próprio. As páginas **clássicas** (`/index.html` e `/pages-html/*.html`) continuam publicadas para quem já tem o link e para o painel administrativo, que ainda é clássico. Elas ficam com `noindex, follow` e `canonical` apontando para a página React equivalente, então os buscadores consolidam tudo nas URLs React.

Redirecionar ou remover as páginas clássicas só depois de migrar o admin (a Home clássica abre o painel). Checkout, carrinho, comprovante, login e perfil ficam fora dos buscadores (`noindex` e `Disallow` no `robots.txt`). Detalhes e checklist de publicação em [`docs/release/README.md`](docs/release/README.md).

## Testes

| Comando | O que roda |
| --- | --- |
| `pnpm test` | Testes unitários e de contrato dos services e regras (Node test runner, `tests/*.mjs`), com armazenamento isolado. |
| `pnpm run test:coverage` | Os mesmos testes com cobertura de `src/`; falha abaixo de 90% das linhas, 80% dos ramos ou 85% das funções. |
| `pnpm run test:e2e` | Playwright (`e2e/`): gera os builds, sobe os previews e a API mock e roda todos os projetos abaixo. |
| `pnpm run test:a11y` | Só a auditoria de acessibilidade (axe-core, WCAG 2.2 A/AA) no Chromium. |
| `pnpm run test:perf` | Só o orçamento de desempenho (LCP, CLS e JS por página), sem rodar os outros projetos. |
| `pnpm run test:all` | Unitários e E2E em sequência. |

Na primeira execução do E2E, instale os navegadores: `pnpm exec playwright install chromium firefox webkit`.

| Projeto Playwright | Cobertura |
| --- | --- |
| `chromium` | Todos os fluxos, auditoria responsiva (320–1440 px), acessibilidade e download do comprovante em PNG. |
| `firefox` e `webkit` | Os mesmos fluxos e a auditoria responsiva nos motores do Firefox e do Safari. |
| `mobile-chrome` e `mobile-safari` | Smoke de todas as páginas, compra, reserva e avaliação em Pixel 7 e iPhone 14 emulados. |
| `api-mode` | As mesmas páginas buildadas com `VITE_API_BASE_URL`, contra a API mock (`tests/mock-api`). |
| `performance` | Orçamento de desempenho, executado depois dos demais projetos para medir sem disputa de CPU. |

A suíte cobre:
- **Smoke test:** todos os shells React e páginas clássicas, sem erro de JavaScript nem tela em branco.
- **Fluxos críticos:** Cardápio → Carrinho → Checkout → Comprovante; Login → Perfil → Checkout; Reserva → Pagamento → Confirmação; Pedido entregue → Avaliação. Cada um tem caminhos de sucesso e de falha.
- **Casos de borda:** `localStorage` corrompido, carrinho vazio, sessão expirada e comprovante de outra conta.
- **Qualidade:** nenhuma violação grave de acessibilidade (axe). LCP < 2,5 s, CLS < 0,1 e JS dentro do orçamento com rede 4G e CPU 4× mais lenta.

O WebKit do Playwright aproxima o Safari, mas não substitui um iPhone real; essa verificação está no [checklist de release](docs/release/README.md). Cada teste roda num contexto de navegador limpo. Erros de página são anexados ao relatório com a URL de origem.

## Modo API (preparação para o backend)

Por padrão os dados ficam no navegador. Com `VITE_API_BASE_URL` definida no build, os mesmos services passam a usar a API REST descrita em [`docs/api/openapi.yaml`](docs/api/openapi.yaml), sem nenhuma mudança nas páginas. Para experimentar com a API mock:

```bash
node tests/mock-api/server.mjs
```

Em outro terminal, aponte o build ou o dev server para ela, definindo `VITE_API_BASE_URL=http://localhost:4190/api/v1`. Arquitetura, convenções, erros, sessão e estratégia de migração dos dados locais estão em [`docs/api/README.md`](docs/api/README.md).

---

## Limitações Atuais

Este frontend é publicável como demonstração, mas ainda **não** é um sistema de produção com dados reais:

- **Dados no navegador:** pedidos, reservas, avaliações, contas e perfil ficam no `localStorage` de cada navegador. Não sincronizam entre aparelhos e somem ao limpar os dados do site. Outros usuários não veem as avaliações de quem está em outro navegador.
- **Autenticação simulada:** contas e senhas são verificadas no próprio navegador, sem servidor. Isso serve para navegação e testes, não como proteção real. Não use senhas reais.
- **Pagamento simulado:** Pix e cartão apenas simulam aprovação ou recusa. Nenhum dado de pagamento é enviado ou cobrado.
- **Painel administrativo** ainda na versão clássica, protegido só no navegador.

A camada de serviços já fala HTTP quando `VITE_API_BASE_URL` está definida ([`docs/api/README.md`](docs/api/README.md)). Backend, autenticação real, pagamentos, privacidade/LGPD e publicação definitiva estão planejados no Módulo 4.

---

## Progresso do Desenvolvimento

### Módulo 1 — MVP (Fases 0 a 12) — Concluído
Estrutura base, interface, camada de dados, cardápio, carrinho, persistência, checkout, agendamento, feedbacks, integração, UX, responsividade e testes dos critérios de aceite do PRD.

### Módulo 2 — Evolução e Produção Avançada (Fases 13 a 27) — Concluído
- **13** — Análise geral do projeto
- **14** — Evolução e organização do cardápio
- **15** — Sistema de produtos personalizáveis
- **16** — Implementação de imagens e assets
- **17** — Carrinho avançado
- **18** — Sistema de acompanhamento de pedido
- **19** — Início do backend administrativo
- **20** — Sistema de fila de pedidos
- **21** — Comprovante digital do pedido
- **22** — Controle de estoque e disponibilidade
- **23** — Sistema de perfil de usuário
- **24** — Sistema de reconhecimento de admin (Admin Claim)
- **25** — Integração de perfil e admin no sistema
- **26** — Melhorias de experiência do usuário (UX)
- **27** — Testes completos

### Módulo 3 — Migração para React e preparação para produção (Fases 28 a 45) — Concluído
Interface em React, perfil, reservas, avaliações, segurança, responsividade, testes E2E (Fase 43), camada de dados pronta para API (Fase 44) e preparação para produção do frontend (Fase 45). Detalhes em [`docs/Implementation_Plan_Modulo_3.md`](docs/Implementation_Plan_Modulo_3.md).

### Módulo 4 — Backend, privacidade e produção (planejado)
- **Escopo:**
  - Backend completo (API e banco de dados).
  - Sistema de autenticação e controle de permissões.
  - Pagamentos reais.
  - Aplicativo mobile.
  - Integração com entregadores.
  - Notificações em tempo real.

---

## Documentação Complementar

- [`docs/PRD.md`](docs/PRD.md) — Documento de Requisitos do Produto.
- [`docs/Implementation_Plan.md`](docs/Implementation_Plan.md) — Plano de implementação do Módulo 1 (MVP).
- [`docs/Implementation_Plan_Modulo_2.md`](docs/Implementation_Plan_Modulo_2.md) — Plano de implementação do Módulo 2 (Evolução e Produção Avançada).
- [`docs/Implementation_Plan_Modulo_3.md`](docs/Implementation_Plan_Modulo_3.md) — Plano do Módulo 3 (React e preparação para produção).
- [`docs/React_Migration.md`](docs/React_Migration.md) — Arquitetura da interface React e fluxos migrados.
- [`docs/api/README.md`](docs/api/README.md) — Camada de dados, contrato da API e migração dos dados locais.
- [`docs/release/README.md`](docs/release/README.md) — Checklist de release, publicação, cabeçalhos de segurança e smoke checks.

---

## Autoria

Projeto desenvolvido como estudo de uma plataforma de delivery profissional. Começou em **HTML, CSS e JavaScript puro (ES6+)** e evoluiu para **React + Vite**, com arquitetura modular, testes automatizados e foco em separação de responsabilidades, validação, acessibilidade e experiência do usuário.

