// Testes do módulo de caminhos relativos (organização das páginas)
// As páginas internas ficam em pages-html/ e a home (index.html) na raiz.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAGES_DIR,
  isInternalPage,
  getBasePrefix,
  resolveAssetPath,
  resolvePagePath
} from '../js/base-path.js';

function withPathname(pathname, callback) {
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const previousWindow = globalThis.window;
  globalThis.window = { location: { pathname } };
  try {
    callback();
  } finally {
    if (hadWindow) {
      globalThis.window = previousWindow;
    } else {
      delete globalThis.window;
    }
  }
}

test('paginas em pages-html sobem um nivel para links e assets', () => {
  withPathname('/pages-html/cardapio.html', () => {
    assert.equal(PAGES_DIR, 'pages-html');
    assert.equal(isInternalPage(), true);
    assert.equal(getBasePrefix(), '../');
    assert.equal(resolvePagePath('index.html'), '../index.html');
    assert.equal(resolvePagePath('checkout.html'), 'checkout.html');
    assert.equal(resolveAssetPath('assets/products/combo.svg'), '../assets/products/combo.svg');
    assert.equal(resolveAssetPath('css/styles.css'), '../css/styles.css');
  });
});

test('home na raiz aponta para a pasta pages-html', () => {
  withPathname('/index.html', () => {
    assert.equal(isInternalPage(), false);
    assert.equal(getBasePrefix(), '');
    assert.equal(resolvePagePath('cardapio.html'), 'pages-html/cardapio.html');
    assert.equal(resolvePagePath('index.html'), 'index.html');
    assert.equal(resolveAssetPath('assets/products/combo.svg'), 'assets/products/combo.svg');
  });
});

test('funciona servido a partir de subpasta do servidor', () => {
  withPathname('/fast-lanche/pages-html/perfil.html', () => {
    assert.equal(resolvePagePath('login.html'), 'login.html');
    assert.equal(resolvePagePath('index.html'), '../index.html');
    assert.equal(resolveAssetPath('assets/icons/favicon.svg'), '../assets/icons/favicon.svg');
  });
});

test('caminhos ja resolvidos, externos, data URIs e ancoras sao preservados', () => {
  withPathname('/pages-html/carrinho.html', () => {
    assert.equal(resolvePagePath('../index.html'), '../index.html');
    assert.equal(resolvePagePath('react/index.html'), 'react/index.html');
    assert.equal(resolvePagePath(''), '');
    assert.equal(resolveAssetPath('https://cdn.example.com/html2canvas.min.js'), 'https://cdn.example.com/html2canvas.min.js');
    assert.equal(resolveAssetPath('data:image/png;base64,AAA'), 'data:image/png;base64,AAA');
    assert.equal(resolveAssetPath('/absoluto/logo.svg'), '/absoluto/logo.svg');
    assert.equal(resolveAssetPath('#top'), '#top');
    assert.equal(resolveAssetPath(''), '');
  });
});

test('sem window (Node) os assets ficam com o caminho original', () => {
  assert.equal(isInternalPage(), false);
  assert.equal(getBasePrefix(), '');
  assert.equal(resolveAssetPath('assets/products/pizza.svg'), 'assets/products/pizza.svg');
  assert.equal(resolvePagePath('cardapio.html'), 'pages-html/cardapio.html');
});
