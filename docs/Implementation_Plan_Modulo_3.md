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
| 35 | Checkout | Parcial | Comprovante React, fluxo de conclusão e modelo de pedido completo |
| 36 | Login / Sign In | Pendente | Autenticação estática integrada ao shell React |
| 37 | Perfil avançado | Pendente | Perfil React protegido, preferências e histórico |
| 38 | Reservas avançadas | Parcial | Disponibilidade, pagamento simulado e confirmação |
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
│   ├── reservas.html              # Reservas
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
- Pedido: `src/services/orderService.js`.
- Reserva: `src/services/bookingService.js`.
- Feedback: `src/services/feedbackService.js`.
- Sessão: chave `fastlanche_session`, atualmente lida por `src/services/authService.js` e pelo `Header`.
- API futura: `src/services/api/apiClient.js`.

---

# 3. IMPLEMENTAÇÃO PENDENTE

## FASE 35 - CHECKOUT E COMPROVANTE (PARCIAL)

### Já entregue

`src/pages/CheckoutPage.jsx` já exibe o resumo, pré-preenche dados disponíveis do perfil, valida o formulário, simula o pagamento, registra o pedido em `orderService` e limpa o carrinho.

### Trabalho restante

- Criar `src/pages/ReceiptPage.jsx` e o shell `react/receipt.html`.
- Adicionar o shell ao `vite.config.js` e a página ao mapa de `src/App.jsx`.
- Após um pedido aprovado, persistir apenas a referência necessária e redirecionar para o comprovante, em vez de depender somente de um modal.
- Exibir no comprovante número do pedido, data, cliente, itens, personalizações, subtotal, entrega, total, pagamento e status.
- Definir um contrato único de pedido em `src/services/orderService.js`, incluindo identificador, cliente, itens e status inicial.
- Completar o endereço de entrega ou documentar o contrato reduzido atual; não misturar campos incompatíveis entre o formulário, a validação e o pedido salvo.
- Tratar carrinho vazio, falha de persistência e reenvio do formulário com estados de carregamento e erro.
- Cobrir o fluxo checkout -> pedido -> comprovante com testes.

### Critérios de aceite

- O envio inválido não cria pedido.
- O pagamento simulado aprovado cria exatamente um pedido e limpa o carrinho.
- O usuário chega a `react/receipt.html` e consegue consultar o comprovante após recarregar a página.
- O comprovante usa o mesmo modelo de dados persistido pelo service.

---

## FASE 36 - LOGIN E SIGN IN ESTÁTICOS (PENDENTE)

### Trabalho restante

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

> A autenticação continua sendo apenas uma simulação local. Não tratar o armazenamento no navegador como autenticação segura de produção.

---

## FASE 37 - PERFIL AVANÇADO (PENDENTE)

### Trabalho restante

- Criar `src/pages/ProfilePage.jsx` e `react/perfil.html`.
- Adicionar proteção de página: usuário sem sessão deve ser direcionado ao shell de Login.
- Criar um service/adapter de perfil para nome, e-mail, telefone, endereço, avatar e preferências.
- Permitir upload com `FileReader`, pré-visualização, remoção e limite de tipo/tamanho para avatar.
- Exibir iniciais quando não houver avatar.
- Implementar preferências de pagamento e notificações sem acoplar a página ao `localStorage`.
- Buscar pedidos do usuário em `orderService` e exibir histórico com número, data, status e total.
- Integrar os dados do perfil ao pré-preenchimento do Checkout e ao `Header`.

### Critérios de aceite

- Perfil não abre para usuário deslogado.
- Alterações persistem e são refletidas no header e no checkout.
- Avatar inválido é rejeitado sem quebrar a página.
- O histórico mostra apenas pedidos associados ao usuário atual.

---

## FASE 38 - RESERVAS AVANÇADAS (PARCIAL)

### Já entregue

`src/pages/BookingPage.jsx` valida data, horário e número de pessoas e persiste uma reserva por `bookingService`.

### Trabalho restante

- Definir em `src/utils/businessRules.js` a capacidade total de mesas, capacidade por mesa, horários e taxa de reserva.
- Evoluir `bookingService` para consultar reservas persistidas por data e horário e calcular mesas disponíveis.
- Bloquear horários sem capacidade antes de iniciar o pagamento.
- Adicionar seleção de forma de pagamento e simulação de aprovação/falha.
- Só persistir a reserva quando o pagamento for aprovado.
- Gerar número de reserva estável e exibir confirmação com mesa alocada, pessoas, valor, pagamento e status.
- Tratar concorrência entre abas por recarga dos dados antes de confirmar.

### Critérios de aceite

- Data passada, horário fora do expediente e grupo acima da capacidade são rejeitados.
- Horários lotados aparecem indisponíveis e não podem ser confirmados.
- Pagamento recusado não bloqueia mesa nem cria reserva.
- Reserva aprovada persiste e pode ser consultada após recarregar.

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
