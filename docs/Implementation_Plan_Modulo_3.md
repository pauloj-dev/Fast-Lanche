# IMPLEMENTATION PLAN 3 - FAST LANCHE

## Backlog restante após a migração inicial para React

Este documento continua o Implementation Plan 2 a partir das fases 30 em diante. O plano foi ajustado ao estado atual do projeto em React e separa explicitamente o que já foi entregue do que ainda precisa ser produzido.

> Escopo deste documento: executar somente as fases pendentes ou parciais. As fases concluídas ficam registradas como referência e não devem ser reabertas sem uma nova decisão de produto.

---

# 1. ESTADO ATUAL

## Fases concluídas

As fases 30 a 34 estão concluídas conforme o plano anterior:

- análise da aplicação e definição dos domínios;
- arquitetura multi-páginas;
- Home;
- Cardápio;
- carrinho persistente com página dedicada.

A migração inicial para React também entregou a base das páginas de Home, Cardápio, Carrinho, Checkout, Reservas e Feedbacks. Essa base não significa que todas as fases correspondentes estejam completas: Checkout, Reservas e Feedbacks ainda têm itens do escopo original pendentes.

## Backlog por fase

| Fase | Tema | Estado | Próximo resultado esperado |
| --- | --- | --- | --- |
| 35 | Checkout | Concluída | Comprovante React, fluxo de conclusão e modelo de pedido completo |
| 36 | Login / Sign In | Concluída | Autenticação estática integrada ao shell React |
| 37 | Perfil avançado | Concluída | Perfil React protegido, preferências e histórico |
| 38 | Reservas avançadas | Concluída | Disponibilidade, pagamento simulado e confirmação |
| 39 | Feedbacks avançados | Concluída | Feedback vinculado a produtos com busca e filtros |
| 40 | Segurança | Concluída | Validação e sanitização compartilhadas nos fluxos React |
| 41 | Otimização e refinamento | Concluída | Serviços, estados de UI e convenções React consistentes |
| 42 | Responsividade | Concluída | Validação visual da aplicação React em todos os breakpoints |
| 43 | Testes | Concluída | Cobertura dos contratos React e dos fluxos críticos |
| 44 | Preparação para backend | Concluída | Contratos de domínio substituíveis por API |
| 45 | Produção final | Pendente | Build, documentação e checklist de publicação aprovados |

---

# 2. ARQUITETURA DE REFERÊNCIA

## Entrypoints e páginas

O projeto usa Vite para transpilar JSX. Cada arquivo em `react/` é um shell HTML independente com `<div id="root"></div>` e `src/main.jsx`. O `src/App.jsx` escolhe a página usando o nome do arquivo na URL; não há roteador SPA.

```text
/
├── react/                         # shells React executados pelo Vite
│   ├── index.html                 # Home
│   ├── cardapio.html              # Cardápio
│   ├── carrinho.html              # Carrinho
│   ├── checkout.html              # Checkout
│   ├── receipt.html               # Comprovante do pedido
│   ├── login.html                 # Login e cadastro
│   ├── perfil.html                # Perfil protegido e histórico de pedidos
│   ├── reservas.html              # Reservas (?reserva=RS-... mostra a confirmação)
│   └── feedbacks.html             # Feedbacks
├── src/
│   ├── main.jsx                   # entrypoint React
│   ├── App.jsx                    # seleção da página e composição global
│   ├── components/
│   │   ├── Header.jsx             # header, navegação, conta e carrinho
│   │   ├── ProductCard.jsx        # produto do cardápio
│   │   └── ModalHost.jsx          # modal global
│   ├── context/
│   │   ├── CartContext.jsx        # estado compartilhado do carrinho
│   │   └── ModalContext.jsx       # estado compartilhado de modais
│   ├── pages/                     # telas e eventos de formulário
│   ├── services/                  # contratos de domínio
│   │   ├── api/apiClient.js       # cliente para futura API
│   │   └── storage/               # adapters de persistência local
│   └── utils/businessRules.js     # cálculos e validações puras
├── pages-html/                   # páginas legadas ainda não migradas
├── css/styles.css                 # estilos compartilhados
├── assets/                        # logo, ícones e produtos
├── tests/                         # testes Node existentes
└── vite.config.js                 # entradas do build legado + React
```

## Regras de implementação

- A interface nova deve ser criada em `src/` e exposta por um shell em `react/`.
- Componentes não devem acessar `localStorage` diretamente quando existir um service ou adapter para o domínio.
- Cálculos e validações sem efeitos colaterais ficam em `src/utils/` para serem testáveis.
- Persistência local é um adapter temporário; a interface usada pelas páginas deve permanecer compatível com uma API futura.
- O CSS existente em `css/styles.css` continua sendo a fonte visual compartilhada entre páginas legadas e React.
- Links entre páginas React devem apontar para os shells em `react/` quando o fluxo estiver migrado. Links para páginas ainda legadas devem permanecer explícitos até a migração da respectiva fase.
- Dados vindos de formulários, URL ou `localStorage` são não confiáveis, mesmo em uma aplicação estática.

## Contratos atuais a preservar

- Carrinho: `src/context/CartContext.jsx` e `src/services/cartService.js`.
- Cardápio: `src/data/menuCatalog.js` (fonte única do catálogo), `src/services/menuService.js` (catálogo + edições do admin legado) e `src/components/ProductCard.jsx`. `js/menu-store.js`, `js/constants.js` e `js/product-images.js` são adapters que importam de `src/data/`.
- Pedido: `src/services/orderService.js`. A chave `fastlanche_orders` é compartilhada com o legado (admin, fila e acompanhamento): os status persistidos são os rótulos de `js/order-tracking.js` (`Pedido recebido`, `Pagamento confirmado`...) e pedidos de outras páginas são regravados sem alteração.
- Linhas do carrinho: identificadas por `cartItemId` (mesmo contrato de `js/cart.js`), pois o mesmo produto pode ter linhas com personalizações diferentes.
- Reserva: `src/services/bookingService.js` (`getAvailability`, `createBooking`, `getBooking`). A chave `fastlanche_bookings` é compartilhada com `js/booking.js`: reservas legadas (sem mesa) contam na capacidade e são regravadas sem alteração.
- Feedback: `src/services/feedbackService.js` (`getFeedbacks`, `getReviewContext`, `publishFeedback`, `getEligibleProducts`). A chave `fastlanche_feedbacks` é compartilhada com o legado: avaliações antigas sem produtos aparecem como "avaliação geral" e são regravadas sem alteração.
- Sessão e contas: `src/services/authService.js` é o único ponto que lê/grava `fastlanche_users`, `fastlanche_session` e `fastlanche_user_profile`; o `Header` usa `getAccount()`.
- Perfil: `src/services/profileService.js` (validação, avatar, preferências, histórico e dados do checkout). Grava pela função `saveAccountProfile` do `authService`.
- Checkout: `src/services/checkoutService.js` (`placeOrder`) concentra validação, pagamento simulado e gravação do pedido.
- API futura: `src/services/api/apiClient.js`.
- Convenções (Fase 41): formatação em `src/utils/format.js`, identificadores em `src/utils/ids.js`, formas de pagamento em `src/data/paymentMethods.js`, sincronização por `subscribeToStorage` (`src/services/storage/storageEvents.js`), estados assíncronos com `useAsyncData` + `AsyncState`, mensagens de formulário com `FormFeedback`.
- Build: `npm run build` executa `vite build --mode legacy` (limpa `dist/`) e `vite build --mode react` (acrescenta os shells). Os dois grafos ficam separados de propósito; ver Fase 41.
- Segurança (Fase 40): `src/utils/validation.js` (validação e sanitização), `src/services/storage/safeStorage.js` (único acesso ao `localStorage`), `src/utils/errors.js` (`AppError`, `toUserMessage`), `src/hooks/useRequireSession.js` (proteção de página) e `canViewOrder`/`canViewBooking` (acesso a comprovantes).

---

# 3. IMPLEMENTAÇÃO PENDENTE

## FASE 35 - CHECKOUT E COMPROVANTE (CONCLUÍDA)

### Já entregue

`src/pages/CheckoutPage.jsx` já exibe o resumo, pré-preenche dados disponíveis do perfil, valida o formulário, simula o pagamento, registra o pedido em `orderService` e limpa o carrinho.

### Entregue nesta fase

- Criado `src/pages/ReceiptPage.jsx` e o shell `react/receipt.html`.
- Shell registrado no `vite.config.js` e pagina adicionada ao mapa de `src/App.jsx`.
- Após um pedido aprovado, persiste apenas a referência necessária e redireciona para o comprovante.
- O comprovante exibe número do pedido, data, cliente, itens, personalizações, subtotal, entrega, total, pagamento e status.
- `src/services/orderService.js` define o contrato único de pedido, incluindo identificador, cliente, itens e status inicial.
- O endereço de entrega usa o mesmo campo de texto no formulário, na validação e no pedido salvo.
- Carrinho vazio, falha de persistência e reenvio do formulário possuem estados de carregamento e erro.
- O fluxo checkout -> pedido -> comprovante possui testes de contrato e persistência.
- O fluxo foi extraído para `src/services/checkoutService.js` (`placeOrder`): validação -> pagamento -> pedido -> referência. Pagamento recusado não cria pedido.
- O pedido guarda `userProfileId` (e-mail da conta logada), base do histórico da Fase 37.

### Evidência

- `tests/test-order-flow.mjs` e `tests/test-checkout-flow.mjs`: envio inválido e pagamento recusado não criam pedido; aprovado cria exatamente um pedido, recarregável pelo mesmo contrato.
- Validado no navegador (`npm run build` + `npm run preview`): Cardápio -> Carrinho -> Checkout -> Comprovante, inclusive recarregando o comprovante.

### Critérios de aceite

- O envio inválido não cria pedido.
- O pagamento simulado aprovado cria exatamente um pedido e limpa o carrinho.
- O usuário chega a `react/receipt.html` e consegue consultar o comprovante após recarregar a página.
- O comprovante usa o mesmo modelo de dados persistido pelo service.

---

## FASE 36 - LOGIN E SIGN IN ESTÁTICOS (CONCLUÍDA)

### Escopo entregue

- Criar `src/pages/LoginPage.jsx` com alternância entre login e cadastro.
- Criar `react/login.html`, registrá-lo no `vite.config.js` e incluí-lo no mapa de `src/App.jsx`.
- Evoluir `src/services/authService.js` para expor cadastro, login, leitura de sessão e logout.
- Definir as chaves e os modelos locais (`fastlanche_users` e `fastlanche_session`) sem salvar senha na sessão.
- Validar e-mail, tamanho de senha, confirmação e duplicidade de e-mail antes de persistir.
- Atualizar o `Header` para refletir login, logout e links de conta sem duplicar regras de sessão.
- Preservar compatibilidade com as páginas legadas até o fluxo de Perfil também ser migrado.

### Critérios de aceite

- Cadastro e login válidos persistem uma sessão entre páginas React.
- Credenciais inválidas, e-mail duplicado e campos incompletos geram mensagens úteis.
- Logout remove somente a sessão ativa e atualiza o header.
- Nenhuma senha é exibida no header, no pedido ou no comprovante.

### Entregue nesta fase

- `src/pages/LoginPage.jsx` + `react/login.html`: abas Login/Cadastro, estados de carregamento e erro, foco no campo após erro, tela de "já conectado" com Continuar/Sair e redirecionamento seguro por `?redirect=` (somente páginas do próprio shell).
- `src/services/authService.js`: `register`, `login`, `logout`, `readSession`/`getSession`, `getCurrentProfile`, `getAccount`. Usa o mesmo hash e modelo de usuário de `js/page-init.js`: contas criadas no legado entram pelo React e vice-versa.
- Validações puras em `src/utils/businessRules.js` (`validateLogin`, `validateSignup`, `normalizeEmail`). E-mail é comparado sem diferenciar maiúsculas; login inválido usa a mesma mensagem para e-mail inexistente e senha errada.
- Sessão e perfil nunca contêm senha nem hash. Logout remove somente `fastlanche_session`.
- `Header`: botão Entrar leva ao login com retorno para a página atual; logado mostra avatar/iniciais (link para `react/perfil.html` desde a Fase 37) e botão Sair.
- Checkout só pré-preenche com o perfil da conta logada (perfil de outra conta é ignorado) e oferece o login para preencher.
- Legado: o logout de `js/user-navigation.js` passou a remover também a sessão (antes o usuário continuava logado).

### Evidência

- `tests/test-auth.mjs`: validações, cadastro, e-mail duplicado, login com conta legada, credenciais inválidas, logout, sessão corrompida, perfil de outra conta e redirecionamento seguro.
- Validado no navegador: cadastro com erro de confirmação -> cadastro válido -> retorno ao cardápio logado -> checkout pré-preenchido -> logout pelo header -> login com senha errada/certa -> login na página legada com a conta criada no React. Tela de login sem overflow em 375px.

> A autenticação continua sendo apenas uma simulação local. Não tratar o armazenamento no navegador como autenticação segura de produção.

---

## FASE 37 - PERFIL AVANÇADO (CONCLUÍDA)

### Escopo

- Criar `src/pages/ProfilePage.jsx` e `react/perfil.html`.
- Adicionar proteção de página: usuário sem sessão deve ser direcionado ao shell de Login.
- Criar um service/adapter de perfil para nome, e-mail, telefone, endereço, avatar e preferências.
- Permitir upload com `FileReader`, pré-visualização, remoção e limite de tipo/tamanho para avatar.
- Exibir iniciais quando não houver avatar.
- Implementar preferências de pagamento e notificações sem acoplar a página ao `localStorage`.
- Buscar pedidos do usuário em `orderService` e exibir histórico com número, data, status e total.
- Integrar os dados do perfil ao pré-preenchimento do Checkout e ao `Header`.

### Entregue nesta fase

- `src/pages/ProfilePage.jsx` + `react/perfil.html`, registrados no `vite.config.js` e no mapa de `src/App.jsx`.
- Proteção: a sessão é lida de forma síncrona antes do primeiro render; sem sessão nada privado é renderizado e a página faz `location.replace('login.html?redirect=perfil.html')`. Logout no header ou em outra aba (`storage`/`appstate:update`) também redireciona.
- `src/services/profileService.js`: `getProfile`, `updateProfile`, `updateAvatar`, `removeAvatar`, `getOrderHistory`, `getCheckoutDefaults`, `prepareAvatarFile` e `normalizeProfile`. A página não acessa `localStorage`.
- `authService.saveAccountProfile`: grava perfil ativo, cadastro do usuário em `fastlanche_users` (o login recria o perfil a partir dele, então as alterações sobrevivem a logout/login) e nome da sessão. Se a cota estourar no meio da gravação, as três chaves são restauradas. Senha/hash nunca são tocados e o e-mail (identidade da conta) não é editável.
- Regras puras em `src/utils/businessRules.js`: `validateProfile`, `validateAvatarFile`, `isValidAvatarDataUrl`, `sanitizeText`, `getInitials` (reutilizado pelo `getAccount`), com os mesmos limites de `js/security.js`.
- Avatar: aceita PNG/JPG/WEBP/GIF de até 2 MB; o arquivo é lido com `FileReader`, decodificado (arquivo com tipo falso é rejeitado) e reduzido para no máximo 256 px em JPEG antes de gravar (alguns KB, cabe na cota do `localStorage`). SVG e qualquer URL que não seja `data:image/...;base64` são recusados. Avatares grandes enviados pela página legada continuam aceitos ao carregar.
- Dados lidos do armazenamento são normalizados (texto sanitizado, preferências e avatar inválidos voltam ao padrão); JSON corrompido não quebra a página.
- Histórico: somente pedidos com `userProfileId` igual ao e-mail da sessão, do mais recente ao mais antigo, com número, data, status, total e link para o comprovante. Pedidos feitos sem login com o mesmo e-mail digitado não entram, pois o formulário não prova a identidade.
- Layout próprio (classes `account-*` em `css/styles.css`, sem afetar a página legada que usa `profile-*`):
  - **Hero com avatar:** botão de câmera para trocar a foto e arrastar-e-soltar sobre o avatar.
  - **Estatísticas:** pedidos, total gasto e último pedido (`summarizeOrders`).
  - **Formulário em seções numeradas:** pagamento preferido em cartões e notificações em switch.
  - **Barra de salvar:** aparece com "alterações não salvas" e opção Descartar.
  - **Progresso do perfil:** barra e checklist (`getProfileCompletion`).
  - **Pedidos:** status coloridos, resumo de itens e "ver todos".
  - **Atalhos:** novo pedido, reserva, avaliação e sair.
- Checkout usa `getCheckoutDefaults()` (nome, e-mail, telefone, endereço e pagamento preferido do perfil). O avatar do `Header` aponta para `perfil.html` (React).

### Evidência

- `tests/test-profile.mjs` (8 testes): regras e limites, acesso sem sessão, persistência refletida em header/checkout e após novo login, entrada inválida sem alterar dados, avatar válido/inválido/remoção, perfil corrompido, histórico filtrado e ordenado, rollback em quota excedida. `npm test`: 38/38.
- Validado no navegador (`npm run build` + `npm run preview`): perfil deslogado -> login -> cadastro -> retorno ao perfil; telefone inválido rejeitado; salvamento válido refletido no header (iniciais) e no checkout (inclusive pagamento preferido); avatar PDF, PNG falso e arquivo de 3 MB rejeitados, PNG 800x600 salvo como JPEG 256x192 (~3 KB) e exibido no header; histórico mostrou só os pedidos da conta e incluiu o pedido feito no checkout; logout pelo header redirecionou ao login. Sem overflow horizontal em 375 px e sem erros no console.

### Critérios de aceite

- Perfil não abre para usuário deslogado.
- Alterações persistem e são refletidas no header e no checkout.
- Avatar inválido é rejeitado sem quebrar a página.
- O histórico mostra apenas pedidos associados ao usuário atual.

> A página legada `pages-html/perfil.html` continua existindo para o fluxo legado; as duas gravam no mesmo modelo de perfil.

---

## FASE 38 - RESERVAS AVANÇADAS (CONCLUÍDA)

### Escopo

- Definir em `src/utils/businessRules.js` a capacidade total de mesas, capacidade por mesa, horários e taxa de reserva.
- Evoluir `bookingService` para consultar reservas persistidas por data e horário e calcular mesas disponíveis.
- Bloquear horários sem capacidade antes de iniciar o pagamento.
- Adicionar seleção de forma de pagamento e simulação de aprovação/falha.
- Só persistir a reserva quando o pagamento for aprovado.
- Gerar número de reserva estável e exibir confirmação com mesa alocada, pessoas, valor, pagamento e status.
- Tratar concorrência entre abas por recarga dos dados antes de confirmar.

### Entregue nesta fase

- **Regras** (`businessRules.js`):
  - `BOOKING_TABLES`: 16 mesas e 78 lugares (4×2, 6×4, 3×6, 2×8 e 1×12).
  - Horários a cada 30 min, das 11:00 às 22:00 (última entrada, pois o restaurante fecha às 23:00), com até 60 dias de antecedência.
  - Cada reserva ocupa uma mesa por 90 min.
  - Taxa fixa de R$ 20,00, abatida da conta.
  - Funções puras: `validateBooking` (também rejeita horário que já passou no dia), `validateBookingContact`, `bookingsOverlap`, `getOccupiedTables`, `allocateTable` (menor mesa livre que comporta o grupo) e `getDayAvailability` (livre, últimas mesas, lotado ou encerrado).
- **Reservas legadas:** registros sem mesa, gravados por `js/booking.js`, recebem virtualmente a menor mesa que os comporta, então continuam ocupando capacidade.
- **Service** (`bookingService.js`): o fluxo é validar → conferir mesa → pagamento simulado (`simulateBookingPayment`) → recarregar e conferir de novo → gravar.
  - Pagamento recusado, horário lotado ou entrada inválida não gravam nada.
  - Se outra aba lotar o horário durante o pagamento, a reserva é recusada com estorno simulado.
  - Número estável no formato `RS-AAAAMMDD-XXXX`.
  - A reserva guarda mesa, taxa, pagamento, status `confirmed` e `userProfileId`.
  - Os dados lidos do armazenamento são normalizados, e JSON corrompido não quebra o fluxo.
- **Página** (`BookingPage.jsx`):
  - Passos: data e seletor de pessoas → grade de horários com disponibilidade → dados de contato (pré-preenchidos pelo perfil) → taxa (Pix ou cartão), com uma opção de demonstração para simular recusa.
  - Resumo lateral com mesas livres e o valor da taxa.
  - Os horários são recalculados ao trocar data ou pessoas e quando outra aba grava uma reserva (evento `storage`). Um horário selecionado que lota é desmarcado.
  - A confirmação usa `reservas.html?reserva=RS-...`, com número, data, horário, pessoas, mesa, nome, status, forma de pagamento e taxa, e pode ser recarregada.

### Evidência

- **Testes:** `tests/test-booking.mjs` tem 9 testes. Eles cobrem mesas, horários e taxa; data passada, horário fora do expediente ou já passado, grupo acima de 12 e limite de antecedência; alocação e janela de 90 min; disponibilidade lotada, com poucas mesas e encerrada; reserva aprovada recarregável; recusa e entrada inválida sem gravação; horário lotado; lotação por outra aba durante o pagamento; reservas legadas preservadas; JSON corrompido. `npm test`: 48/48.
- **Navegador** (`npm run build` + `npm run preview`):
  - Os horários já passados no dia aparecem como encerrados.
  - Uma reserva para 12 pessoas com Pix gerou a confirmação com a mesa M16, que continuou disponível após recarregar.
  - Para outro grupo de 12, as 19:00–21:00 ficaram lotadas e desabilitadas.
  - O envio sem forma de pagamento e o pagamento recusado não gravaram reserva.
  - Uma reserva feita numa segunda aba marcou o horário como lotado na primeira, sem recarregar.
  - Sem overflow em 375 px e sem erros no console.

### Critérios de aceite

- Data passada, horário fora do expediente e grupo acima da capacidade são rejeitados.
- Horários lotados aparecem indisponíveis e não podem ser confirmados.
- Pagamento recusado não bloqueia mesa nem cria reserva.
- Reserva aprovada persiste e pode ser consultada após recarregar.

### Refinamento visual (após a fase)

- Topo com destaques (`getBookingHighlights`), faixa com os próximos 7 dias (`getUpcomingBookingDates`) além do calendário, ocasião especial (`BOOKING_OCCASIONS`) e observações de até 200 caracteres, que são sanitizadas e aparecem no comprovante.
- `pages-html/reservas.html` passou a usar o mesmo sistema: `js/booking.js` importa `bookingService`, `profileService` e as regras de `src/` (módulos JS puros, que funcionam com ou sem Vite) e monta a página com `textContent`. As duas URLs têm o mesmo fluxo, layout e dados; uma reserva feita numa aparece na outra.
- Testado no navegador: reserva pela página legada (6 pessoas, aniversário, observação com HTML guardada como texto) consultada também pela página React.

---

## FASE 39 - FEEDBACKS AVANÇADOS (CONCLUÍDA)

### Escopo

- Expandir o modelo de feedback para incluir `productIds` e nomes dos produtos avaliados.
- Derivar a lista de produtos elegíveis a partir dos pedidos do usuário com status concluído/entregue.
- Exigir ao menos um produto selecionado e impedir nova avaliação do mesmo produto no mesmo pedido.
- Adicionar busca textual, filtro por produto, filtro por nota e ordenação por mais recentes.
- Atualizar a média geral e a média por produto após cada publicação.
- Sanitizar e limitar nome, comentário e metadados antes de persistir.
- Definir o comportamento para usuário não logado (feedback geral ou exigência de login) e aplicá-lo de forma consistente.

### Decisão: usuário não logado

- **Ler é livre:** lista, busca, filtros e médias ficam disponíveis para todos.
- **Publicar exige login e pelo menos um produto de pedido entregue da conta.**
- **O nome publicado vem da conta**, e não de um campo livre, o que evita alguém se passar por outra pessoa.
- **Sem login**, o formulário vira um convite "Entrar para avaliar".
- **Avaliações antigas sem produto** continuam visíveis com o selo "Avaliação geral".

### Entregue nesta fase

- **Modelo:** `items` (pedido, produto e nome), `productIds`, `productNames`, `userProfileId` e `verified`. `normalizeFeedback` revalida nota (inteiro de 1 a 5), data e textos ao carregar, com limites de 80 caracteres para o nome, 1000 para o comentário e 10 produtos.
- **Elegibilidade** (`getEligibleProducts`): considera só os itens de pedidos com status `Entregue` e `userProfileId` da conta. Cada par (pedido, produto) só pode ser avaliado uma vez. Antes de gravar, `publishFeedback` relê pedidos e avaliações, para pegar uma avaliação feita em outra aba.
- **Regras puras** (`businessRules.js`): `getProductKey`, `summarizeRatings` (média e distribuição por estrela), `calculateProductAverages` e `filterFeedbacks` (busca sem acento por nome, comentário e produto, combinável com filtro de produto e de nota, e ordenação por mais recentes, melhor ou pior nota, sem alterar a lista original).
- **Página** (`FeedbackPage.jsx`):
  - Painel com a média geral, a distribuição clicável por estrela e os produtos mais avaliados com suas médias.
  - Barra de busca com filtros de produto, nota e ordenação, mais a média do produto filtrado.
  - Cards com selo "Compra verificada" e tags de produto clicáveis.
  - Formulário com os produtos elegíveis agrupados por pedido, nota em estrelas e contador de caracteres.
  - Recarrega quando outra aba grava.
- **Página legada:** `pages-html/feedbacks.html` e `js/feedback.js` usam o mesmo service e as mesmas regras (renderização com `textContent`). As duas URLs mostram os mesmos dados e a mesma interface.
- **Limpeza:** o adapter `src/services/storage/feedbackStorage.js` foi removido; a persistência ficou no service, como em reservas.

### Evidência

- **Testes:** `tests/test-feedback.mjs` tem 7 testes. Eles cobrem validação e limites, sanitização de registros antigos, elegibilidade só de pedidos entregues da conta, publicação sem login, sem produto ou com produto de outra conta, bloqueio da segunda avaliação do mesmo item, preservação de avaliações antigas, JSON corrompido, filtros e busca combinados sem alterar os dados, e médias geral e por produto determinísticas. `npm test`: 56/56.
- **Navegador** (`npm run build` + `npm run preview`):
  - O envio sem nota foi bloqueado; a avaliação válida com HTML no comentário foi guardada como texto.
  - O formulário passou para "Tudo avaliado!" e a média foi de 4,0 para 4,3.
  - Filtros de nota, busca, produto e ordenação combinados funcionaram.
  - A página legada mostrou os mesmos dados e filtros.
  - Deslogado, as duas páginas mostram o convite para entrar.
  - Sem overflow em 375 px e sem erros no console.

### Critérios de aceite

- Um feedback publicado identifica claramente os produtos avaliados.
- Busca e filtros podem ser combinados e não alteram os dados persistidos.
- Somente compras elegíveis podem gerar avaliação de produto.
- A média geral e a média do produto selecionado são determinísticas.

---

## FASE 40 - SEGURANÇA NOS FLUXOS REACT (CONCLUÍDA)

### Escopo

- Criar utilitários React reutilizáveis para sanitização, limites de tamanho e validação de e-mail, telefone, documento, endereço, data e horário.
- Reutilizar regras puras em vez de duplicar validações dentro das páginas.
- Criar helpers de persistência segura para JSON inválido, quota excedida e `localStorage` indisponível.
- Validar novamente dados do carrinho, perfil, pedidos, reservas e feedbacks ao carregá-los; não confiar no conteúdo salvo no navegador.
- Garantir que dados do usuário sejam renderizados como texto, sem `dangerouslySetInnerHTML`.
- Reduzir informações sensíveis nas mensagens, logs e objetos de sessão.
- Aplicar proteção de acesso no Perfil e em qualquer página futura de administração.
- Adicionar uma política de erro consistente: mensagem amigável na UI e detalhe técnico somente no log de desenvolvimento.

### Problemas encontrados na auditoria (e corrigidos)

- **Comprovante e confirmação de reserva abertos a qualquer pessoa** com o número em mãos, expondo nome, e-mail, telefone e endereço.
- **Pedidos e cadastro gravavam HTML cru** (só `trim`), e o carrinho aceitava qualquer campo vindo do `localStorage`.
- **CPF/CNPJ** só tinha checagem de tamanho, e as regras de telefone estavam repetidas em quatro lugares.
- **`getStorage`/`JSON.parse` duplicados em cada service**, com acesso direto ao `localStorage` no carrinho e no cardápio, e nada funcionava sem `localStorage`.
- **Mensagens técnicas na interface:** as páginas exibiam `error.message`, e havia `console.warn` em produção.
- **Sessão sem expiração** e item sem id virando id `0` (`Number(null)`).

### Entregue nesta fase

- **`src/utils/validation.js`:**
  - `FIELD_LIMITS` com limites únicos por campo.
  - `sanitizeText` e `sanitizeDeep` (este último descarta `__proto__`/`constructor` e limita profundidade e itens).
  - Validadores: `isValidEmail`, `isValidPhone` (DDD 11–99 e celular começando com 9), `isValidCPF`/`isValidCNPJ` com dígitos verificadores, `isValidAddress`, `isValidDateString` (data real), `isValidTimeString` e `checkTextLength`.
  - `businessRules.js` passou a usar esses validadores: checkout, cadastro (senha de 6 a 128 caracteres), login, perfil, reserva e avaliação validam formato e tamanho máximo.
- **`src/services/storage/safeStorage.js`:**
  - Único ponto de acesso ao `localStorage` em `src/`.
  - JSON inválido retorna o valor padrão, sem apagar o dado (as páginas legadas leem as mesmas chaves).
  - Com o `localStorage` indisponível, os dados ficam em memória durante a sessão.
  - Cota excedida gera `AppError` com código `quota` e preserva o valor anterior.
  - `writeMany` desfaz gravações parciais.
  - Todos os services (auth, pedidos, checkout, perfil, reservas, avaliações, carrinho e status do restaurante) foram migrados.
- **Revalidação ao carregar:**
  - Pedidos: texto sanitizado e limitado, preço até R$ 10.000, quantidade até 99, forma e status de pagamento de lista fechada, personalização com `sanitizeDeep`.
  - Carrinho: só campos conhecidos, imagem só de `assets/products`, 50 linhas no máximo.
  - Sessão: nome sanitizado.
  - Perfil, reservas e avaliações já eram normalizados nas fases 37 a 39.
- **Política de erro** (`src/utils/errors.js`): erros esperados são `AppError` e sua mensagem vai para a interface. Qualquer outro erro vira um texto genérico via `toUserMessage`. O detalhe técnico só aparece em `console.error` com o Vite em modo DEV, e não há mais `console.warn` em produção.
- **Sessão:** expira 7 dias após o login. Sessão sem `loginAt` válido, ou com data no futuro, é descartada e removida. A sessão continua sem senha nem hash.
- **Proteção de acesso:**
  - `useRequireSession(page, authorize)` serve ao Perfil e a futuras páginas de administração (o `authorize` pode exigir um papel). Sem sessão, nada privado é renderizado e a página redireciona para `getLoginUrl(page)`.
  - Comprovante (`getOrderForViewer`) e confirmação de reserva (`getBookingForViewer`, React e legado) só aparecem para a conta dona ou, em pedido sem conta, para o navegador que o fez. A recusa explica o motivo sem nenhum dado.

### Evidência

- **Testes:** `tests/test-react-security.mjs` tem 9 testes. Eles cobrem os validadores; a sanitização (inclusive a tentativa de poluir o protótipo); entradas malformadas e acima do limite em todos os formulários React; HTML gravado só sanitizado em cadastro, pedido e perfil; JSON corrompido em todas as chaves; dados com tipos errados; `localStorage` indisponível; cota excedida; a política de erro; sessão expirada; o acesso a comprovantes e reservas; e uma varredura estática de `src/` (sem `dangerouslySetInnerHTML`/`innerHTML`/`eval` e sem `localStorage` fora do adapter). `npm test`: 65/65.
- **Navegador** (`npm run build` + `npm run preview`):
  - Nome com HTML no cadastro e no endereço do checkout foi gravado sem tags.
  - CPF inválido foi barrado.
  - O comprovante abriu para o dono; sem login e com outra conta, mostrou o motivo sem nenhum dado pessoal.
  - Com a sessão expirada, o Perfil redirecionou para o login e a sessão foi removida.
  - Com todas as chaves corrompidas, Cardápio, Carrinho, Reservas e Feedbacks abriram vazios.
  - Console sem erros.

### Critérios de aceite

- Entrada com HTML/script é armazenada apenas na forma sanitizada e nunca executada.
- JSON corrompido não derruba a aplicação nem perde o estado padrão válido.
- Páginas protegidas redirecionam sem revelar dados privados.
- Testes cobrem entradas malformadas e limites de todos os formulários React.

> Limites conhecidos: o armazenamento continua no navegador e pode ser editado pelo próprio usuário. As regras acima tornam os dados seguros para exibir e consistentes, mas não substituem a validação de um backend, que deve recalcular preços e checar a identidade (Fase 44). Os módulos legados que não usam `src/` (admin, fila de pedidos, modal de perfil) mantêm `js/security.js`.

---

## FASE 41 - OTIMIZAÇÃO E REFINAMENTO (CONCLUÍDA)

### Escopo

- Remover acoplamentos de páginas React aos módulos globais legados quando houver um contrato equivalente em `src/services`.
- Extrair os dados do cardápio usados por `menuService` para uma fonte de domínio em `src/`, mantendo um adapter de compatibilidade temporário.
- Padronizar estados `loading`, `error`, `empty` e `success` nos formulários e listas.
- Evitar leituras repetidas de `localStorage` durante a mesma renderização e sincronizar alterações entre abas com eventos definidos.
- Consolidar mensagens, formatação monetária, datas e identificadores em utilitários compartilhados.
- Revisar acessibilidade: foco após erro/modal, labels, teclado, `aria-live` e contraste.
- Verificar que os links entre shells React e páginas legadas funcionam tanto no dev server quanto em `dist/`.

### Entregue nesta fase

- **Desacoplamento do legado:** `src/` não importa mais nada de `js/`.
  - O catálogo foi para `src/data/menuCatalog.js` (com `CUSTOMIZATION_TYPES`) e as ilustrações para `src/data/productImages.js`.
  - `js/menu-store.js` trabalha sobre uma cópia mutável (`cloneMenuCatalog`), e `js/constants.js` e `js/product-images.js` viraram adapters de reexportação.
  - O `menuService` passou a aplicar as edições do admin legado (`fastlanche_menuItems`), validadas campo a campo; antes o cardápio React as ignorava. O estoque legado (`fastlanche_inventory`) continua fora do React.
- **Utilitários compartilhados:**
  - `format.js`: moeda, data e hora, data longa e curta, dia e mês, mês e ano, plural, pessoas e média.
  - `ids.js`: números de pedido e de reserva e id de linha do carrinho, com `crypto.getRandomValues`.
  - `paymentMethods.js`: catálogo único de formas de pagamento por fluxo.
  - `businessRules.js` passou a concentrar `RATING_LABELS` e `BOOKING_SLOT_LABELS`.
  - Páginas React e módulos legados de reservas e avaliações deixaram de ter cópias próprias desses rótulos e helpers.
- **Sincronização:**
  - `safeStorage` dispara `fastlanche:storage` a cada gravação ou remoção, e `subscribeToStorage(keys, cb)` une esse evento (mesma aba) ao evento `storage` (outras abas), filtrando pelas chaves.
  - Header, carrinho, proteção de sessão, login, perfil, cardápio, reservas e avaliações (React e legado) escutam só as chaves de que dependem. Exemplo: salvar o nome no perfil atualiza o header na mesma aba.
  - Cache de parse por chave no `safeStorage`: leituras repetidas do mesmo texto reaproveitam o JSON já interpretado.
- **Estados padronizados:**
  - `useAsyncData` (carregando, sucesso ou erro, recarga em segundo plano quando as chaves observadas mudam, `reload`) e `LoadingState`, `ErrorState` (com "Tentar novamente") e `EmptyState`.
  - Aplicados a Cardápio (que antes mostrava "nenhum item encontrado" durante o carregamento), Comprovante, histórico do Perfil, horários e confirmação de Reservas, e lista e formulário de Feedbacks. Nenhuma falha de carregamento é mais silenciosa.
- **Acessibilidade:**
  - `FormFeedback`: em erro, a mensagem vira `role="alert"` e recebe foco; nos demais estados é anunciada por `aria-live`. Usado em login/cadastro, checkout, reservas e avaliações.
  - Modal global: foco entra no diálogo, Tab fica preso, Esc fecha e o foco volta para quem abriu. Nenhuma página React abre o modal hoje, então esse comportamento ficou pronto mas não pôde ser exercitado pela interface.
  - Contraste: o vermelho da marca foi de `#E63946` (3,9 a 4,2:1 com branco e creme) para `#CC2936` (de 4,56 a 5,33:1), com hover em `#AE1F2B`. Horários indisponíveis e produtos já avaliados passaram a usar o cinza do sistema.
- **Build e links:**
  - A verificação de links revelou uma regressão: ao compartilhar `src/` com o legado, o Rolldown hospedou o runtime no chunk do React. As páginas legadas passaram a baixar e executar o React e quebravam (header ausente, React error #299).
  - O build agora roda em duas passagens (`--mode legacy` e `--mode react`), com grafos separados. O `main.jsx` só monta o React se existir `#root`.
  - O último commit foi comparado em uma worktree temporária para confirmar a origem da regressão.

### Evidência

- **Testes:** `tests/test-refinement.mjs` tem 8 testes. Eles cobrem formatação; identificadores; catálogo de pagamentos; catálogo em `src/` com adapters legados; edições do admin validadas no `menuService`; status do restaurante; cache de leitura; eventos de sincronização na mesma aba, em outra aba e com storage limpo; uma varredura estática de `src/` (sem imports de `js/`, sem formatação própria e sem `storage` direto em páginas e componentes); e a separação do build. `npm test`: 73/73.
- **Auditoria de acessibilidade no navegador:** script próprio em todas as páginas React e nas páginas legadas de reservas e avaliações. Resultado: nenhum campo sem rótulo, ação sem nome, imagem sem `alt` ou id duplicado, e nenhum texto abaixo de 4,5:1 (só o emoji 🛒 aparece, falso positivo). O erro do cadastro recebeu foco como alerta.
- **Links:** todos os links de 17 páginas foram verificados no `dist/` (17 links únicos) e no dev server (23), comparando com a resposta de fallback do servidor. Nenhum link quebrado e nenhum erro de script.
- **Navegador:** as páginas legadas carregam sem nenhum chunk React e sem erros no console. Checkout, Perfil (header sincronizado na mesma aba) e Reservas renderizam com o catálogo de pagamentos compartilhado.

### Critérios de aceite

- Não existem regras de negócio duplicadas entre páginas e services.
- Cada operação assíncrona tem feedback visual e recuperação de erro.
- A navegação funciona em `/react/` e no build estático com caminhos relativos.
- A auditoria de acessibilidade não encontra formulário sem label ou ação sem estado perceptível.

---

## FASE 42 - RESPONSIVIDADE DA APLICAÇÃO REACT (CONCLUÍDA)

### Escopo

- Validar os shells React em smartphone pequeno, smartphone grande, tablet e desktop.
- Revisar especificamente header/menu, grids do cardápio, controles do carrinho, resumo do checkout, formulário de reservas, filtros de feedback e os novos Login/Perfil.
- Garantir que formulários usem uma coluna no mobile e que resumo/ações permaneçam alcançáveis sem rolagem horizontal.
- Ajustar áreas de toque, foco, mensagens de erro, modais e estados vazios no `css/styles.css`.
- Testar textos longos, avatar, nomes de produtos, valores e listas sem overflow ou sobreposição.
- Registrar no plano as larguras e navegadores usados na validação.

### Como foi validado

- **Ferramenta:** `tests/browser/responsive-audit.js`. Cada página é carregada num `iframe` com a largura exata, então as media queries valem para aquela largura independentemente da janela. Uso: `npm run dev`, abrir um shell e rodar no console `(await import('/tests/browser/responsive-audit.js')).runResponsiveAudit()`. Ela verifica:
  - overflow horizontal da página e elementos passando da borda (fora de contêineres com rolagem intencional);
  - alvos de toque menores que 24 px (falha, WCAG 2.5.8) e menores que 40 px no celular (aviso);
  - formulários com mais de uma coluna até 480 px;
  - texto cortado sem reticências;
  - elementos espremidos (texto quebrando letra a letra);
  - conteúdo vazando da própria caixa.
- **Larguras:** 320, 360, 375, 414 (smartphones), 768, 1024 (tablet) e 1440 px (desktop).
- **Telas:** os 9 shells React mais a confirmação de reserva (`?reserva=`) e as páginas legadas de reservas e avaliações, que usam a mesma interface. São 12 telas e 84 combinações.
- **Estados:** usuário logado com avatar de iniciais e carrinho com 101 itens, além de dados extremos:
  - nome de produto com 80 caracteres e uma palavra de 50 letras sem espaço;
  - preço de R$ 9.999,99 × 99;
  - nome e endereço no tamanho máximo;
  - comentário de 1000 caracteres;
  - observações longas;
  - comprovante e reserva com esses dados.
- **Navegador:** Chromium (painel de navegador do Claude desktop). Os iframes têm barra de rolagem de ~15 px, então a largura útil fica menor que a de um celular real, uma margem de segurança. As capturas usaram a emulação de 375×812 com agente móvel. **Firefox e Safari/iOS não foram testados.**

### Problemas encontrados e corrigidos

- **Palavra longa sem espaço:** nome de produto, endereço ou observação definiam a largura mínima de itens de grid e flex. Cardápio, checkout e comprovante passavam de 320 px de tela para até 559 px de página. Correção: `main { overflow-wrap: anywhere }`, `min-width: 0` em itens que recebem texto livre e `white-space: nowrap` nos valores em dinheiro.
- **Efeito colateral da correção acima:** botões encolhiam até quebrar letra por letra ("Salvar alterações" com 56×371 px na barra do perfil). Botões, chips, campos e rótulos voltaram a `overflow-wrap: normal`. A auditoria ganhou a checagem de "espremido" para pegar esse tipo de caso.
- **Reservas (React e legado):** o card ficava com 600 px porque `fieldset` tem `min-width: min-content` por padrão. Correção: `fieldset { min-width: 0 }`.
- **Filtros dos Feedbacks:** um `select` com opção longa (nome do produto e média) alargava a barra para 458 px. Correção: colunas `minmax(0, 1fr)` e `select` com 100% de largura.
- **Header logado entre 351 e 400 px:** marca, avatar, carrinho, "Sair" e menu não cabiam. Correção: nesse caso o texto da marca dá lugar ao avatar; o ícone e o `aria-label` continuam (`:has(.profile-avatar-btn)`).
- **Perfil:** a grade de campos tinha 2 colunas no celular (visualmente uma), e "Total gasto" (R$ 990.011,01) vazava do card de estatística. Correção: grade de 1 coluna, e "Total gasto" ocupa a linha inteira até 480 px.
- **Card de avaliação:** com nome longo, o selo "Compra verificada" espremia o nome em 54 px de largura. Correção: o selo desce de linha.
- **Áreas de toque:**
  - checkboxes de 18–20 px passaram para 24 px, incluindo uma regra por id no checkout que fixava 20 px;
  - no celular, links do rodapé, marca, botões −/+ do carrinho, chips, estrelas da nota, barras de distribuição e produtos a avaliar passaram para cerca de 44 px;
  - os alvos com menos de 40 px caíram de 24 para 8 por página, todos acima de 24 px.

### Evidência

- **Auditoria:** as 84 combinações passaram sem overflow, sem alvo abaixo de 24 px, sem formulário de várias colunas no celular, sem texto cortado ou espremido e sem conteúdo vazando da caixa. A ferramenta foi testada importando-a pelo dev server.
- **Falso positivo aceito:** o card de destaque da Home é inclinado 1,2° de propósito e ultrapassa sua caixa em 6 px no desktop, sem cortar nada nem criar rolagem. A ferramenta ignora filhos com `transform`.
- **Checagem da própria auditoria:** ao reverter a correção das estatísticas dentro de um iframe, ela acusou o vazamento, e com a correção não acusou.
- **Menu aberto em 360 px:** links de 48 px e sem overflow.
- **Testes:** `tests/test-responsive.mjs` (3 testes) protege as regras de CSS que corrigiram cada estouro e o anel de foco, e confere a cobertura de larguras e shells da ferramenta. `npm test`: 76/76.

### Critérios de aceite

- Nenhuma página React cria overflow horizontal nos breakpoints suportados.
- Ações principais permanecem visíveis e utilizáveis por toque e teclado.
- Header, footer, modal e mensagens mantêm hierarquia visual em todas as páginas.

- **Foco de teclado** (verificado com Tab e Shift+Tab reais): o link "Home" do rodapé recebia foco sem nenhum indicador. Treze regras antigas zeravam o `outline` e dependiam só de troca de cor ou fundo, e um contorno só amarelo some nos fundos amarelos. Correção: anel de foco único, preto por dentro e amarelo por fora, para links, botões, selects e elementos com `tabindex`. Agora os links do header e do rodapé mostram o anel ao receber foco pelo teclado.

> Pendência fora do escopo: validar em Firefox e Safari/iOS reais (Fase 45, checklist de publicação).

---

## FASE 43 - TESTES DAS NOVAS IMPLEMENTAÇÕES (CONCLUÍDA)

Issue: #1.

### Entregue nesta fase

- **Playwright** (`playwright.config.js`, `e2e/`). O `webServer` roda `npm run build` e sobe o `vite preview`, então os fluxos sempre testam o build de produção e o build é validado antes deles. Cada teste usa um contexto limpo (sem `localStorage` herdado) e roda em paralelo.
- **Fixture** (`e2e/support/fixtures.js`): captura `pageerror` e erros de console com a URL e anexa ao relatório. Os títulos dos testes nomeiam a página ou service, para a falha apontar o responsável. Há helpers de cadastro, carrinho, checkout e semeadura de `localStorage`.
- **Smoke test** (`smoke.spec.js`, 17 testes): todos os shells React e as páginas legadas carregam sem erro e sem tela em branco. As legadas não podem baixar o bundle do React (protege contra a regressão da Fase 41). O perfil sem login redireciona.
- **Fluxos críticos:**
  - `checkout.spec.js`: pedido aprovado com comprovante recarregável; pagamento recusado sem pedido e com o carrinho mantido; dados inválidos; carrinho vazio.
  - `account.spec.js`: cadastro, perfil refletido no header e checkout pré-preenchido; perfil inválido; senha errada; logout.
  - `booking.spec.js`: reserva aprovada com mesa alocada e confirmação recarregável; horário lotado; pagamento recusado; página legada.
  - `feedback.spec.js`: leitura sem login; avaliação de pedido entregue e bloqueio da segunda; produto obrigatório; busca e filtros.
- **Casos de borda** (`edge-cases.spec.js`): `localStorage` corrompido em todas as chaves, sessão expirada e comprovante de outra conta sem dados pessoais.
- **Auditoria responsiva no E2E** (`responsive.spec.js`): o módulo `tests/browser/responsive-audit.js` é injetado e roda 7 larguras em todas as telas, com usuário logado e carrinho cheio. O teste falha em qualquer problema.
- **Cobertura:** `npm run test:coverage` com limites mínimos (90% das linhas, 80% dos ramos, 85% das funções). Novo `tests/test-cart-service.mjs` cobre o `cartService` e a recusa do pagamento simulado.
- **Ajustes encontrados pelos testes:**
  - O checkout ganhou a opção de demonstração "Simular pagamento recusado", igual à da reserva, porque antes não havia como exercitar a recusa pela interface.
  - O formulário do checkout passou a usar `noValidate`. A validação nativa do navegador escondia a mensagem acessível do app; agora ele se comporta como os demais formulários.

### Evidência

- `npm test`: 80/80. `npm run test:coverage`: 97,9% das linhas, 85,9% dos ramos, 93,4% das funções.
- `npm run test:e2e`: 41/41 no Chromium em cerca de 2 minutos, incluindo 77 combinações de tela e largura na auditoria responsiva.

### Critérios de aceite

- `npm test` passa sem alterar dados persistentes do ambiente.
- Cada fase parcialmente concluída possui ao menos um teste de sucesso e um de falha.
- O build é validado antes dos testes de fluxo em navegador.
- Falhas de integração apontam para a página/service responsável.

---

## FASE 44 - PREPARAÇÃO PARA BACKEND (CONCLUÍDA)

Issue: #2. Documentação técnica: [`docs/api/README.md`](api/README.md) e contrato em [`docs/api/openapi.yaml`](api/openapi.yaml).

### Entregue nesta fase

- **Repositórios por domínio** (`src/services/repositories/`):
  - `contracts.js` define as interfaces de `menu`, `auth`, `profile`, `orders`, `bookings` e `feedbacks`, com `assertRepository` como verificação.
  - A implementação anterior foi movida (com histórico, via `git mv`) para `local/*Local.js`; `http/` traz os adapters equivalentes.
  - `index.js` escolhe a implementação por `src/services/config.js`: `VITE_API_BASE_URL` presente ativa o modo HTTP; ausente, mantém o local.
- **Services como fachadas:** `authService`, `profileService`, `orderService`, `checkoutService`, `bookingService`, `feedbackService` e `menuService` mantêm a mesma API pública e delegam ao repositório. Nenhuma página foi alterada.
- **`apiClient`:**
  - timeout (`AbortController`) e nova tentativa com backoff exponencial e jitter, só para métodos idempotentes ou com `Idempotency-Key` (rede, timeout, 429 com `Retry-After`, 502/503/504);
  - tratamento de `204`, cookie de sessão (`credentials: 'include'`) e `X-CSRF-Token` (double submit);
  - mapeamento de 400/401/402/403/404/409/422/429/5xx e rede para `AppError` com código estável, sem detalhe técnico de 5xx na interface.
- **Sessão centralizada** (`src/services/api/sessionStore.js`): no modo HTTP, só dados de exibição ficam em memória; a autenticação fica no cookie HttpOnly. O Bearer opcional também fica em memória e é usado só pelo `apiClient`. As páginas recuperam a sessão no boot (`initializeDataSource`, também nos módulos legados de reservas e avaliações).
- **Modelos padronizados:** a API usa centavos, ISO 8601 UTC, slugs de status e identificadores gerados pelo servidor. Os mappers (`http/mappers.js`) convertem para o modelo da interface com os mesmos normalizadores do modo local. As chaves de armazenamento foram centralizadas em `storage/keys.js`.
- **Contrato OpenAPI 3** com todos os endpoints, payloads, respostas de sucesso, validação, autenticação, pagamento recusado, conflito, limite e erro; formato único de erro; acesso de convidado por link assinado (`accessToken` só na URL).
- **Migração dos dados locais** (`src/services/migration/localDataMigration.js`): no primeiro login em modo HTTP, perfil, pedidos, reservas e avaliações da conta vão para `POST /me/import` com chave de idempotência estável. Só os registros importados saem do navegador e a conta fica marcada; dados de outras contas permanecem.
- **API mock** (`tests/mock-api/`): implementa o contrato reutilizando as regras de `src/`, incluindo preço do catálogo, idempotência, cookie HttpOnly + CSRF, acesso por dono ou link e 409 na mesa. Roda como `fetch` simulado nos testes de unidade e como servidor HTTP no E2E (no lugar do MSW, sem dependência extra).

### Evidência

- **Testes de unidade:**
  - `tests/test-http-adapters.mjs` (8): contratos das duas implementações; `apiClient` com 204, retry seguro, timeout, CSRF e mapeamento de erros; conta e perfil no servidor sem dados pessoais no `localStorage`; sessão recuperada pelo cookie; pedido com preço recalculado pelo servidor apesar de carrinho adulterado; recusa sem pedido; comprovante por dono ou link; reservas com 409; avaliações; migração.
  - `tests/test-api-contract.mjs` (4): conformidade nos dois sentidos entre as 18 operações do OpenAPI e a API mock, formato de erro e visitante sem 401.
  - `npm test`: 92/92; cobertura de 97,9% das linhas.
- **E2E, projeto `api-mode`** (14 testes): as mesmas páginas, buildadas com `VITE_API_BASE_URL`, contra a API mock. Cobrem smoke dos shells; cadastro com sessão entre páginas e nada pessoal no navegador; checkout logado e de convidado (link assinado); recusa; reserva; avaliação; migração.
- `npm run test:e2e`: 55/55, sendo 41 no modo local e 14 no modo HTTP.

### Critérios de aceite

- É possível trocar o adapter local por um mock HTTP sem alterar as páginas.
- Os contratos documentam sucesso, validação, autenticação e erro.
- O modo local continua funcionando quando a variável de API não está configurada.
- Nenhuma credencial ou token é persistido em logs ou modelos de domínio.

---

## FASE 45 - PREPARAÇÃO PARA PRODUÇÃO FINAL (PENDENTE)

### Trabalho restante

- Executar `npm test`, `npm run build` e `npm run preview` como parte do checklist de release.
- Confirmar que `dist/` contém os shells React, as páginas legadas ainda necessárias, CSS, assets e caminhos relativos válidos.
- Definir quais URLs permanecem legadas e quais passam a ser React; remover duplicações somente após a migração correspondente.
- Revisar metadados, favicon, títulos, `robots`, links e mensagens de fallback dos shells.
- Fazer revisão final de segurança, responsividade, acessibilidade e persistência.
- Atualizar `README.md` e `docs/React_Migration.md` quando o fluxo de Login, Perfil e Comprovante for migrado.
- Documentar variáveis de ambiente, comando de build, comando de preview e limitações da autenticação/pagamento simulados.
- Criar uma lista de smoke checks para a publicação e registrar o resultado.

### Critérios de aceite

- Build e testes passam em uma checkout limpa com as dependências instaladas.
- Os fluxos críticos são navegáveis a partir dos URLs publicados.
- Não há shell React em branco quando executado sem Vite: o fallback ou o build informa corretamente o modo de execução.
- As limitações de dados locais, autenticação estática e pagamento simulado estão documentadas.

---

# 4. ORDEM DE EXECUÇÃO DO BACKLOG

```text
FASE 35  Checkout e comprovante
   ↓
FASE 36  Login / Sign In
   ↓
FASE 37  Perfil avançado
   ↓
FASE 38  Reservas avançadas ─┐
FASE 39  Feedbacks avançados ─┼─ podem avançar em paralelo após os contratos de usuário/pedido
FASE 40  Segurança ─────────┘
   ↓
FASE 41  Otimização e refinamento
   ↓
FASE 42  Responsividade
   ↓
FASE 43  Testes de integração
   ↓
FASE 44  Preparação para backend
   ↓
FASE 45  Preparação para produção
```

Dependências importantes:

- Fase 35 precisa estabilizar o modelo de pedido antes do histórico do Perfil e da elegibilidade de Feedbacks.
- Fases 36 e 37 precisam definir sessão e identidade antes de proteger páginas e vincular dados ao usuário.
- Fase 40 deve acompanhar as demais fases; não deve ser deixada somente para o final.
- Fase 43 valida o comportamento final e não substitui os testes unitários adicionados durante cada fase.
- Fase 45 só pode ser concluída após o build conter todos os shells migrados que o produto decidir publicar.

---

# 5. DEFINITION OF DONE DO MÓDULO 3

O Módulo 3 será considerado concluído quando:

- as fases 35 a 45 estiverem marcadas como concluídas com evidência de teste;
- Checkout, Login, Perfil, Reservas, Feedbacks e Comprovante estiverem disponíveis pela arquitetura React definida;
- os services permitirem substituir adapters locais por API sem reescrever as páginas;
- os dados persistidos forem validados, sanitizados e tratados como não confiáveis;
- os fluxos críticos forem aprovados em desktop e mobile;
- `npm test`, `npm run build` e `npm run preview` funcionarem conforme documentado;
- o `README.md` e a documentação de migração refletirem os URLs e limitações atuais.
