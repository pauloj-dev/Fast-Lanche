# Contrato da API e camada de dados do frontend

Documentação técnica da **Fase 44** do Módulo 3. O contrato formal está em [`openapi.yaml`](openapi.yaml) (OpenAPI 3.0). Este guia explica as convenções e como o frontend troca o armazenamento local pela API sem alterar as páginas.

## Arquitetura

```text
Páginas React / módulos legados (js/booking.js, js/feedback.js)
        │  importam sempre os mesmos services
        ▼
src/services/*Service.js        fachadas: mesma API pública, regras puras e rótulos
        │  getRepository('<domínio>')
        ▼
src/services/repositories/index.js   escolhe a implementação conforme src/services/config.js
        ├── local/*Local.js     localStorage (via safeStorage), modo atual
        └── http/*Http.js       API REST (via apiClient), mapeando DTO -> modelo da interface
```

- **Contratos:** `src/services/repositories/contracts.js` lista os métodos de cada domínio (`menu`, `auth`, `profile`, `orders`, `bookings`, `feedbacks`). As duas implementações devolvem o **mesmo formato** de modelo (os adapters HTTP reutilizam os normalizadores locais).
- **Modo de dados:** `VITE_API_BASE_URL` definida no build ativa o modo HTTP. Sem ela, o modo local continua funcionando. Os testes trocam o modo com `configureDataSource({ baseUrl })`.
- **Boot:** no modo HTTP, cada página chama `initializeDataSource()` (`GET /auth/session`) antes de renderizar. Leituras síncronas, como sessão, perfil e status do restaurante, usam o estado já carregado.
- **Reatividade:** depois de cada alteração, os adapters HTTP disparam o mesmo evento de chave que o modo local (`subscribeToStorage`). As telas recarregam igual nos dois modos.

## Convenções do contrato

| Assunto | Regra |
| --- | --- |
| Base | `/api/v1`, JSON UTF-8 |
| Dinheiro | Inteiros em centavos, campos `...Cents` (ex.: `priceCents: 1690`). O frontend converte para reais nos mappers. |
| Datas | ISO 8601 UTC (`2026-11-05T23:00:00.000Z`); datas de calendário `AAAA-MM-DD`; horários `HH:MM` |
| Identificadores | Pedido `FL-<base36>-<4>`; reserva `RS-AAAAMMDD-<4>`; gerados pelo servidor |
| Status de pedido | `received`, `payment-confirmed`, `preparing`, `out-for-delivery`, `delivered`, `cancelled` |
| Status de pagamento | `pending`, `approved`, `declined`, `refunded` |
| Status de reserva | `pending`, `confirmed`, `cancelled` |
| Preço do pedido | Calculado **só no servidor**: o cliente envia ids e quantidades, nunca valores |

## Autenticação e sessão

- **Sessão:** cookie `fl_session` (`HttpOnly`, `SameSite=Lax`, `Secure` em produção). O JavaScript nunca lê nem grava o token.
- **Dados da conta:** e-mail, nome e perfil ficam em memória (`src/services/api/sessionStore.js`) e são recarregados a cada página. Nada pessoal vai para o `localStorage` no modo HTTP.
- **Bearer opcional:** se um backend preferir Bearer token, ele fica no `sessionStore` (memória) e só o `apiClient` o envia. Nenhum componente acessa token ou credencial.
- **CSRF:** alterações feitas com sessão enviam `X-CSRF-Token` com o valor do cookie `fl_csrf` (double submit).
- **Visitante:** `GET /auth/session` devolve `200 { "user": null }`, porque visitante não é erro.

## Erros

Formato único:

```json
{ "error": { "code": "validation", "message": "Informe um telefone válido com DDD.", "details": [{ "field": "phone", "message": "inválido" }] } }
```

O `apiClient` converte o status HTTP em `AppError` com código estável. Mensagens de 4xx do contrato são escritas para o usuário e exibidas como vêm. Mensagens de 5xx nunca chegam à interface; no lugar entra um texto genérico.

| Status | Código padrão | Uso |
| --- | --- | --- |
| 400 / 422 | `validation` | Dados inválidos (`details` aponta os campos) |
| 401 | `unauthenticated` | Sem sessão ou sessão expirada |
| 402 | `payment_declined` | Pagamento recusado; nada foi criado |
| 403 | `forbidden` / `csrf` | Recurso de outra conta, link inválido ou CSRF ausente |
| 404 | `not_found` | Recurso inexistente |
| 409 | `conflict` (`email_taken`, `fully_booked`, `already_reviewed`) | Conflito de estado |
| 429 | `rate_limited` | Muitas tentativas (`Retry-After`) |
| 5xx | `server_error` | Mensagem genérica |
| sem resposta | `network` | Falha de rede ou timeout (10 s) |

## Confiabilidade

- **Timeout:** 10 s por requisição (`AbortController`).
- **Nova tentativa:** até 2 vezes, com backoff exponencial e jitter (300 ms × 2ⁿ), em falha de rede, timeout, 429 (respeitando `Retry-After`) ou 502/503/504. Só vale para métodos idempotentes ou requisições com `Idempotency-Key`.
- **Idempotência:** criação de pedido, de reserva e importação enviam `Idempotency-Key`. O servidor devolve a mesma resposta para a mesma chave.
- **204:** respostas sem corpo viram `null`.

## Acesso de convidado

Pedido ou reserva feitos sem login recebem `accessToken` na criação. O frontend coloca o token **só na URL** da confirmação (`receipt.html?order=...&token=...`) e não o grava no navegador. Quem tem o link vê o comprovante. Sem o link, a API responde 403 e a tela explica o motivo sem mostrar dados.

## Estratégia de migração dos dados locais

Executada no primeiro login ou cadastro em modo HTTP (`src/services/migration/localDataMigration.js`):

1. **Coleta** só o que pertence ao e-mail logado: perfil, pedidos da conta ou feitos como convidado com o mesmo e-mail, reservas e avaliações. Dados de outras contas no mesmo navegador ficam de fora.
2. **Envia** tudo num único `POST /me/import`, com `Idempotency-Key: import-1-<email>`. Repetir não duplica nada no servidor.
3. **Limpa** do navegador apenas os registros importados e marca o e-mail em `fastlanche_migrated_to_account`, para não importar de novo.
4. **Mantém** o carrinho no navegador nos dois modos, porque o servidor recalcula os preços no pedido.

Uma falha na importação não impede o login: ela é registrada e tentada de novo no próximo login.

## Como testar

| Comando | O que valida |
| --- | --- |
| `npm test` | Contratos dos repositórios, `apiClient` (timeout, retry, 204, CSRF, erros), fluxos HTTP sobre a API mock com `fetch` simulado, migração e conformidade entre OpenAPI e API mock (`tests/test-http-adapters.mjs`, `tests/test-api-contract.mjs`) |
| `npm run test:e2e` | Projeto `api-mode`: as mesmas páginas, buildadas com `VITE_API_BASE_URL`, rodando contra `tests/mock-api/server.mjs` (`e2e/api-mode/`) |
| `node tests/mock-api/server.mjs` | Sobe a API mock em `http://localhost:4190/api/v1`, para desenvolvimento manual com `VITE_API_BASE_URL=http://localhost:4190/api/v1 npm run dev` |

A API mock (`tests/mock-api/handlers.mjs`) implementa este contrato e reutiliza as regras de negócio de `src/`: preço do catálogo, mesas, elegibilidade de avaliações, validações. Ela serve de referência executável para o backend do Módulo 4. As rotas `/__mock/*` existem só para os testes.
