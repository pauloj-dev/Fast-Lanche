import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMockApi } from './mock-api/handlers.mjs';

// Conformidade entre o contrato (docs/api/openapi.yaml) e a API mock que os adapters HTTP usam nos testes (Fase 44).
const spec = readFileSync('docs/api/openapi.yaml', 'utf-8');

// Parser minimo do bloco `paths` (2 espacos = caminho, 4 espacos = metodo).
function openApiOperations() {
  const block = spec.slice(spec.indexOf('\npaths:'), spec.indexOf('\ncomponents:'));
  const operations = [];
  let current = null;
  for (const line of block.split('\n')) {
    const path = /^ {2}(\/\S*):\s*$/.exec(line);
    if (path) { current = path[1]; continue; }
    const method = /^ {4}(get|post|put|patch|delete):\s*$/.exec(line);
    if (method && current) operations.push({ method: method[1].toUpperCase(), path: current });
  }
  return operations;
}

const operations = openApiOperations();
const concrete = path => path.replace(/\{[^}]+\}/g, 'EXEMPLO-1');

test('o contrato descreve todos os dominios usados pelo frontend', () => {
  const described = operations.map(operation => `${operation.method} ${operation.path}`);
  for (const expected of ['GET /menu', 'POST /auth/register', 'POST /auth/login', 'GET /auth/session', 'POST /auth/logout', 'PATCH /me',
    'PUT /me/avatar', 'DELETE /me/avatar', 'POST /me/import', 'POST /orders', 'GET /orders', 'GET /orders/{orderNumber}',
    'GET /bookings/availability', 'POST /bookings', 'GET /bookings/{bookingNumber}', 'GET /reviews', 'POST /reviews', 'GET /reviews/eligible']) {
    assert.ok(described.includes(expected), `${expected} ausente no openapi.yaml`);
  }
});

test('toda operacao do contrato existe na API mock e vice-versa', async () => {
  const api = createMockApi();
  for (const { method, path } of operations) {
    const response = await api.handle({ method, url: `/api/v1${concrete(path)}`, body: {} });
    assert.notEqual(response.body?.error?.code, 'route_not_found', `mock nao implementa ${method} ${path}`);
  }
  // Rotas da mock fora do contrato (exceto /__mock) indicariam contrato desatualizado.
  const source = readFileSync('tests/mock-api/handlers.mjs', 'utf-8');
  const routes = [...source.matchAll(/\['(GET|POST|PUT|PATCH|DELETE)', \/\^(.+?)\$\//g)].map(([, method, pattern]) => ({ method, pattern: new RegExp(`^${pattern}$`) }));
  for (const route of routes.filter(item => !item.pattern.source.includes('__mock'))) {
    const covered = operations.some(operation => operation.method === route.method && route.pattern.test(concrete(operation.path)));
    assert.ok(covered, `rota da mock ${route.method} ${route.pattern} nao esta no contrato`);
  }
});

test('erros seguem o formato unico { error: { code, message, details } }', async () => {
  const api = createMockApi();
  const samples = [
    await api.handle({ method: 'POST', url: '/api/v1/auth/register', body: { name: 'A', email: 'x', password: '1' } }),
    await api.handle({ method: 'PATCH', url: '/api/v1/me', body: {} }),
    await api.handle({ method: 'GET', url: '/api/v1/orders/FL-NAO-EXISTE' }),
    await api.handle({ method: 'GET', url: '/api/v1/rota-inexistente' })
  ];
  assert.deepEqual(samples.map(sample => sample.status), [422, 401, 404, 404]);
  for (const sample of samples) {
    assert.equal(typeof sample.body.error.code, 'string');
    assert.equal(typeof sample.body.error.message, 'string');
    assert.ok(Array.isArray(sample.body.error.details));
  }
});

test('visitante recebe 200 com user null e avaliacoes publicas nao expõem e-mail', async () => {
  const api = createMockApi();
  const session = await api.handle({ method: 'GET', url: '/api/v1/auth/session' });
  assert.equal(session.status, 200);
  assert.equal(session.body.user, null);
  const reviews = await api.handle({ method: 'GET', url: '/api/v1/reviews' });
  assert.ok(!JSON.stringify(reviews.body).includes('authorEmail'));
});
