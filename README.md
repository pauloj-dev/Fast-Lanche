# 🍔 Fast Lanche

> Plataforma web de delivery nativa para restaurante — cardápio online, carrinho, checkout, agendamento de mesas, acompanhamento de pedidos e painel administrativo.

O **Fast Lanche** é um sistema de delivery construído apenas com **HTML, CSS e JavaScript ES6+**, sem frameworks ou bibliotecas externas. A proposta é oferecer uma experiência completa de compra: visualizar o cardápio, personalizar produtos, finalizar o pagamento (simulado), acompanhar a entrega e reservar mesas — tudo com uma interface simples, responsiva e visualmente profissional.

---

## Visão Geral

| Item | Descrição |
| --- | --- |
| **Nome do Produto** | Fast Lanche |
| **Tipo** | Plataforma web de delivery (restaurante) |
| **Público-Alvo** | Clientes (mobile e desktop) e proprietários do restaurante |
| **Stack** | HTML5, CSS3 e JavaScript ES6+ (100% vanilla) |
| **Execução** | Navegador — não requer build nem dependências |
| **Dados** | Persistência local via `localStorage` |

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
| **Marca** | HTML5 semântico |
| **Estilo** | CSS3 — CSS Variables, CSS Grid e Flexbox |
| **Lógica** | JavaScript ES6+ — módulos (`import`/`export`), arrow functions, `const`/`let` |
| **Dados** | `localStorage` com tratamento de erros (`try/catch`) |
| **Imagens** | SVG (logo, ícones e produtos) |

> **Restrições respeitadas:** sem frameworks, sem bibliotecas externas, sem `innerHTML` inseguro (uso de `createElement`/`textContent`/`appendChild`), separação clara de responsabilidades por módulo.

---

## Estrutura de Pastas

```text
Fast-Lanche/
├── index.html                 # Página Home (raiz do projeto)
├── pages-html/                # Demais páginas da aplicação
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
└── assets/
    ├── icons/                 # Ícones da interface (SVG)
    ├── logo/                  # Logotipo (SVG)
    └── products/              # Imagens dos produtos (SVG)
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

A aplicação principal (HTML, CSS e JS puro) não possui dependências nem build: basta servir a pasta raiz em um servidor estático e abrir a `index.html`.

**Local (recomendado com servidor estático):**

```bash
# Com Python
python -m http.server 8000

# Ou com Node.js
npx serve .
```

Depois acesse `http://localhost:8000` (Home). As demais páginas ficam em `pages-html/`, por exemplo `http://localhost:8000/pages-html/cardapio.html`.

> A pasta `react/` contém shells que dependem do Vite (`npm run dev` / `npm run build`) durante a migração para React. O build gera todas as páginas (legadas e shells) em `dist/`, incluindo `dist/pages-html/`.

> **Observação:** como o projeto usa módulos ES6 (`import`/`export`), recomendamos servir via HTTP local em vez de abrir o arquivo diretamente (`file://`), para garantir o carregamento correto dos módulos.

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

### Implementações Futuras
- **Fase 28** — Segunda rodada de responsividade (validação em smartphones, tablets e desktop).
- **Fase 29** — Preparação para produção (revisão visual, otimização de assets, segurança inicial e documentação final).
- **Escopo futuro (Plataforma evolutiva):**
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

---

## Autoria

Projeto desenvolvido como estudo de uma plataforma de delivery profissional em **HTML, CSS e JavaScript puro (ES6+)**, com arquitetura modular e foco em boas práticas de separação de responsabilidades, validação e experiência do usuário.

