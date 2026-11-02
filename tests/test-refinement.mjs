import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatAverage, formatCurrency, formatDateTime, formatDayMonth, formatMonthYear, formatPeople, formatShortDate, formatWeekdayDate, plural
} from '../src/utils/format.js';
import { createBookingNumber, createCartLineId, createOrderNumber, randomCode } from '../src/utils/ids.js';
import { BOOKING_PAYMENT_METHODS, CHECKOUT_PAYMENT_METHODS, PROFILE_PAYMENT_METHODS, getPaymentLabel, getPaymentOptions } from '../src/data/paymentMethods.js';
import { CUSTOMIZATION_TYPES, MENU_CATALOG, cloneMenuCatalog } from '../src/data/menuCatalog.js';
import { MENU_OVERRIDES_KEY, buildMenu, getMenuItems, isRestaurantClosed, normalizeMenuItem } from '../src/services/menuService.js';
import { readJSON, writeJSON } from '../src/services/storage/safeStorage.js';
import { STORAGE_CHANGE_EVENT, subscribeToStorage } from '../src/services/storage/storageEvents.js';
import { normalizeCart } from '../src/utils/businessRules.js';
import * as legacyConstants from '../js/constants.js';
import * as legacyImages from '../js/product-images.js';

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

test('shared formatting never throws and is consistent', () => {
  assert.equal(formatCurrency(16.9).replace(/\s/g, ' '), 'R$ 16,90');
  assert.equal(formatCurrency('abc').replace(/\s/g, ' '), 'R$ 0,00');
  assert.equal(formatDateTime('nao e data'), 'Data indisponivel');
  assert.equal(formatWeekdayDate('2026-11-05'), 'Quinta-feira, 05 de novembro');
  assert.equal(formatWeekdayDate('lixo'), 'lixo');
  assert.equal(formatShortDate('2026-11-05'), '05/11/2026');
  assert.equal(formatMonthYear('2026-10-31T12:00:00Z'), 'outubro de 2026');
  assert.match(formatDayMonth('2026-10-31T12:00:00'), /31 de out/);
  assert.equal(formatDayMonth(''), '—');
  assert.equal(plural(1, 'avaliação', 'avaliações'), '1 avaliação');
  assert.equal(formatPeople(2), '2 pessoas');
  assert.equal(formatAverage(4.333), '4,3');
});

test('identifiers keep their formats and are unique', () => {
  assert.match(createOrderNumber(), /^FL-[A-Z0-9]+-[0-9A-Z]{4}$/);
  assert.match(createBookingNumber('2026-11-05'), /^RS-20261105-[0-9A-Z]{4}$/);
  const lineId = createCartLineId(12);
  assert.match(lineId, /^12_[a-z0-9]+$/);
  assert.equal(normalizeCart([{ id: 12, cartItemId: lineId, name: 'X', price: 1 }]).items[0].cartItemId, lineId, 'aceito pelo carrinho');
  const codes = new Set(Array.from({ length: 500 }, () => randomCode(6)));
  assert.equal(codes.size, 500);
});

test('payment catalog is the single source for every flow', () => {
  assert.deepEqual(CHECKOUT_PAYMENT_METHODS, ['pix', 'card', 'cash']);
  assert.deepEqual(BOOKING_PAYMENT_METHODS, ['pix', 'card']);
  assert.deepEqual(PROFILE_PAYMENT_METHODS, ['', 'pix', 'card', 'cash']);
  assert.equal(getPaymentLabel('card'), 'Cartão de crédito/débito');
  assert.equal(getPaymentLabel('bitcoin'), 'Não informado');
  assert.deepEqual(getPaymentOptions(['', 'pix']).map(option => option.label), ['Decidir depois', 'Pix']);
});

test('menu catalog lives in src and legacy modules re-export it', () => {
  assert.equal(MENU_CATALOG.length, 33);
  assert.ok(Object.isFrozen(MENU_CATALOG));
  const copy = cloneMenuCatalog();
  copy[0].name = 'Alterado';
  copy[0].customization.extras.push({ name: 'X', price: 1 });
  assert.notEqual(MENU_CATALOG[0].name, 'Alterado', 'copia legada e independente');
  assert.equal(MENU_CATALOG[0].customization.extras.length, 2);
  assert.equal(legacyConstants.CUSTOMIZATION_TYPES, CUSTOMIZATION_TYPES);
  assert.equal(legacyImages.getProductImagePath({ category: 'Pizzas', name: 'Calabresa' }), 'assets/products/pizza.svg');
});

test('menu service applies validated admin edits and restaurant status', async () => {
  globalThis.localStorage = createStorage();
  assert.equal((await getMenuItems()).length, 33);
  localStorage.setItem(MENU_OVERRIDES_KEY, JSON.stringify([
    { id: 1, price: 18.5, name: 'X-Burger <b>Novo</b>' },
    { id: 99, name: 'Produto Novo', price: 10, category: 'Combos', maxQuantity: 5 },
    { id: 2, active: false },
    { id: 'x', name: 'Invalido', price: 1 },
    { id: 100, name: '', price: 5 },
    { id: 3, price: -1 }
  ]));
  const menu = await getMenuItems();
  const byId = id => menu.find(item => item.id === id);
  assert.equal(byId(1).price, 18.5);
  assert.equal(byId(1).name, 'X-Burger bNovo/b');
  assert.equal(byId(1).customization.type, CUSTOMIZATION_TYPES.REMOVE_INGREDIENTS, 'campos nao editados permanecem');
  assert.equal(byId(99).name, 'Produto Novo');
  assert.equal(byId(2).active, false);
  assert.equal(byId(100), undefined);
  assert.equal(byId(3).price, MENU_CATALOG.find(item => item.id === 3).price, 'edicao invalida e ignorada');
  assert.equal(menu.length, 34);
  assert.equal(normalizeMenuItem({ id: 5, name: 'Ok', price: 1, customization: { type: 'hack' } }).customization, null);
  assert.equal(buildMenu('nao e lista').length, 33);
  assert.equal(isRestaurantClosed(), false);
  localStorage.setItem('fastlanche_restaurant_status', '"closed"');
  assert.equal(isRestaurantClosed(), true);
  localStorage.setItem('fastlanche_restaurant_status', '{quebrado');
  assert.equal(isRestaurantClosed(), false);
});

test('storage reads reuse the parsed value and writes notify subscribers', () => {
  globalThis.localStorage = createStorage();
  const events = new EventTarget();
  globalThis.window = { addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events) };
  try {
    localStorage.setItem('chave', JSON.stringify({ a: 1 }));
    assert.equal(readJSON('chave', null), readJSON('chave', null), 'mesmo texto = mesmo objeto (sem novo parse)');
    localStorage.setItem('chave', JSON.stringify({ a: 2 }));
    assert.equal(readJSON('chave', null).a, 2, 'texto diferente = novo parse');

    const seen = [];
    const stop = subscribeToStorage(['fastlanche_cart'], key => seen.push(key));
    writeJSON('fastlanche_cart', { items: [] });
    writeJSON('outra_chave', 1);
    const otherTab = new Event('storage');
    otherTab.key = 'fastlanche_cart';
    events.dispatchEvent(otherTab);
    const cleared = new Event('storage');
    cleared.key = null;
    events.dispatchEvent(cleared);
    stop();
    writeJSON('fastlanche_cart', { items: [] });
    assert.deepEqual(seen, ['fastlanche_cart', 'fastlanche_cart', null]);
    assert.equal(STORAGE_CHANGE_EVENT, 'fastlanche:storage');
  } finally {
    delete globalThis.window;
  }
});

test('React sources: no legacy imports and no duplicated formatting/storage listeners in pages', () => {
  const files = [];
  const walk = dir => readdirSync(dir).forEach(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(jsx?|mjs)$/.test(name)) files.push(path);
  });
  walk('src');
  for (const file of files) {
    const code = readFileSync(file, 'utf-8').replace(/\/\/.*$/gm, '');
    assert.ok(!/from ['"](\.\.\/)+js\//.test(code), `${file} importa modulo legado`);
    if (/[\\/](pages|components)[\\/]/.test(file)) {
      assert.ok(!/toLocale(Date)?String\(/.test(code), `${file} formata data/moeda por conta propria`);
      assert.ok(!/addEventListener\('storage'/.test(code), `${file} escuta storage direto (use subscribeToStorage)`);
    }
  }
});

test('build keeps legacy pages and React shells in separate graphs', () => {
  const config = readFileSync('vite.config.js', 'utf-8');
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  assert.match(pkg.scripts.build, /--mode legacy && vite build --mode react/);
  assert.match(config, /emptyOutDir: mode !== 'react'/);
  assert.match(config, /input: mode === 'react' \? REACT_PAGES : LEGACY_PAGES/);
});
