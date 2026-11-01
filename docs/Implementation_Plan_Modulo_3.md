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
| 39 | Feedbacks avançados | Parcial | Feedback vinculado a produtos com busca e filtros |
| 40 | Segurança | Parcial | Validação e sanitização compartilhadas nos fluxos React |
| 41 | Otimização e refinamento | Parcial | Serviços, estados de UI e convenções React consistentes |
| 42 | Responsividade | Pendente | Validação visual da aplicação React em todos os breakpoints |
| 43 | Testes | Parcial | Cobertura dos contratos React e dos fluxos críticos |
| 44 | Preparação para backend | Parcial | Contratos de domínio substituíveis por API |
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
- Cardápio: `src/services/menuService.js` e `src/components/ProductCard.jsx`.
- Pedido: `src/services/orderService.js`. A chave `fastlanche_orders` é compartilhada com o legado (admin, fila e acompanhamento): os status persistidos são os rótulos de `js/order-tracking.js` (`Pedido recebido`, `Pagamento confirmado`...) e pedidos de outras páginas são regravados sem alteração.
- Linhas do carrinho: identificadas por `cartItemId` (mesmo contrato de `js/cart.js`), pois o mesmo produto pode ter linhas com personalizações diferentes.
- Reserva: `src/services/bookingService.js` (`getAvailability`, `createBooking`, `getBooking`). A chave `fastlanche_bookings` é compartilhada com `js/booking.js`: reservas legadas (sem mesa) contam na capacidade e são regravadas sem alteração.
- Feedback: `src/services/feedbackService.js`.
- Sessão e contas: `src/services/authService.js` é o único ponto que lê/grava `fastlanche_users`, `fastlanche_session` e `fastlanche_user_profile`; o `Header` usa `getAccount()`.
- Perfil: `src/services/profileService.js` (validação, avatar, preferências, histórico e dados do checkout). Grava pela função `saveAccountProfile` do `authService`.
- Checkout: `src/services/checkoutService.js` (`placeOrder`) concentra validação, pagamento simulado e gravação do pedido.
- API futura: `src/services/api/apiClient.js`.

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

## FASE 39 - FEEDBACKS AVANÇADOS (PARCIAL)

### Já entregue

`src/pages/FeedbackPage.jsx` já permite nota, comentário, média, persistência local e prevenção de repetição idêntica na sessão.

### Trabalho restante

- Expandir o modelo de feedback para incluir `productIds` e nomes dos produtos avaliados.
- Derivar a lista de produtos elegíveis a partir dos pedidos do usuário com status concluído/entregue.
- Exigir ao menos um produto selecionado e impedir nova avaliação do mesmo produto no mesmo pedido.
- Adicionar busca textual, filtro por produto, filtro por nota e ordenação por mais recentes.
- Atualizar a média geral e a média por produto após cada publicação.
- Sanitizar e limitar nome, comentário e metadados antes de persistir.
- Definir o comportamento para usuário não logado (feedback geral ou exigência de login) e aplicá-lo de forma consistente.

### Critérios de aceite

- Um feedback publicado identifica claramente os produtos avaliados.
- Busca e filtros podem ser combinados e não alteram os dados persistidos.
- Somente compras elegíveis podem gerar avaliação de produto.
- A média geral e a média do produto selecionado são determinísticas.

---

## FASE 40 - SEGURANÇA NOS FLUXOS REACT (PARCIAL)

### Trabalho restante

- Criar utilitários React reutilizáveis para sanitização, limites de tamanho e validação de e-mail, telefone, documento, endereço, data e horário.
- Reutilizar regras puras em vez de duplicar validações dentro das páginas.
- Criar helpers de persistência segura para JSON inválido, quota excedida e `localStorage` indisponível.
- Validar novamente dados do carrinho, perfil, pedidos, reservas e feedbacks ao carregá-los; não confiar no conteúdo salvo no navegador.
- Garantir que dados do usuário sejam renderizados como texto, sem `dangerouslySetInnerHTML`.
- Reduzir informações sensíveis nas mensagens, logs e objetos de sessão.
- Aplicar proteção de acesso no Perfil e em qualquer página futura de administração.
- Adicionar uma política de erro consistente: mensagem amigável na UI e detalhe técnico somente no log de desenvolvimento.

### Critérios de aceite

- Entrada com HTML/script é armazenada apenas na forma sanitizada e nunca executada.
- JSON corrompido não derruba a aplicação nem perde o estado padrão válido.
- Páginas protegidas redirecionam sem revelar dados privados.
- Testes cobrem entradas malformadas e limites de todos os formulários React.

---

## FASE 41 - OTIMIZAÇÃO E REFINAMENTO (PARCIAL)

### Trabalho restante

- Remover acoplamentos de páginas React aos módulos globais legados quando houver um contrato equivalente em `src/services`.
- Extrair os dados do cardápio usados por `menuService` para uma fonte de domínio em `src/`, mantendo um adapter de compatibilidade temporário.
- Padronizar estados `loading`, `error`, `empty` e `success` nos formulários e listas.
- Evitar leituras repetidas de `localStorage` durante a mesma renderização e sincronizar alterações entre abas com eventos definidos.
- Consolidar mensagens, formatação monetária, datas e identificadores em utilitários compartilhados.
- Revisar acessibilidade: foco após erro/modal, labels, teclado, `aria-live` e contraste.
- Verificar que os links entre shells React e páginas legadas funcionam tanto no dev server quanto em `dist/`.

### Critérios de aceite

- Não existem regras de negócio duplicadas entre páginas e services.
- Cada operação assíncrona tem feedback visual e recuperação de erro.
- A navegação funciona em `/react/` e no build estático com caminhos relativos.
- A auditoria de acessibilidade não encontra formulário sem label ou ação sem estado perceptível.

---

## FASE 42 - RESPONSIVIDADE DA APLICAÇÃO REACT (PENDENTE)

### Trabalho restante

- Validar os shells React em smartphone pequeno, smartphone grande, tablet e desktop.
- Revisar especificamente header/menu, grids do cardápio, controles do carrinho, resumo do checkout, formulário de reservas, filtros de feedback e os novos Login/Perfil.
- Garantir que formulários usem uma coluna no mobile e que resumo/ações permaneçam alcançáveis sem rolagem horizontal.
- Ajustar áreas de toque, foco, mensagens de erro, modais e estados vazios no `css/styles.css`.
- Testar textos longos, avatar, nomes de produtos, valores e listas sem overflow ou sobreposição.
- Registrar no plano as larguras e navegadores usados na validação.

### Critérios de aceite

- Nenhuma página React cria overflow horizontal nos breakpoints suportados.
- Ações principais permanecem visíveis e utilizáveis por toque e teclado.
- Header, footer, modal e mensagens mantêm hierarquia visual em todas as páginas.

---

## FASE 43 - TESTES DAS NOVAS IMPLEMENTAÇÕES (PARCIAL)

### Já coberto

Os testes em `tests/` cobrem caminhos, regras de negócio, carrinho, Home, Cardápio e segurança legada. `npm test` deve continuar verde.

### Trabalho restante

- Criar testes para `authService`, perfil, pedidos, reservas e feedbacks com armazenamento isolado.
- Testar os componentes de regra pura: checkout, disponibilidade de mesas, elegibilidade de feedback e normalização de modelos.
- Cobrir os casos de recarga, JSON inválido, carrinho vazio, pagamento recusado e sessão expirada.
- Adicionar smoke tests dos shells React após `npm run build` e `npm run preview`.
- Validar os fluxos críticos: Cardápio -> Carrinho -> Checkout -> Comprovante; Login -> Perfil -> Checkout; Reserva -> Pagamento -> Confirmação; Pedido -> Feedback.
- Manter testes independentes da ordem de execução e sem depender dos dados reais do navegador do desenvolvedor.

### Critérios de aceite

- `npm test` passa sem alterar dados persistentes do ambiente.
- Cada fase parcialmente concluída possui ao menos um teste de sucesso e um de falha.
- O build é validado antes dos testes de fluxo em navegador.
- Falhas de integração apontam para a página/service responsável.

---

## FASE 44 - PREPARAÇÃO PARA BACKEND (PARCIAL)

### Já entregue

`src/services/api/apiClient.js` já define um ponto inicial de troca para requisições HTTP, e os domínios principais já possuem services separados.

### Trabalho restante

- Definir interfaces de repositório para menu, autenticação, perfil, pedidos, reservas e feedbacks.
- Separar cada implementação local (`localStorage`/memória) da implementação HTTP, mantendo as páginas dependentes apenas do contrato.
- Padronizar modelos e campos obrigatórios, identificadores, timestamps e estados de pedido/reserva/pagamento.
- Definir endpoints, métodos, payloads e respostas esperados em uma seção de documentação técnica.
- Centralizar autenticação futura por token sem colocar token ou credencial em componentes.
- Padronizar estados de carregamento, erro, retry e respostas `204` no `apiClient`.
- Definir uma estratégia de migração de dados locais e comportamento quando `VITE_API_BASE_URL` estiver ausente.

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
