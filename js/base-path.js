// base-path.js - Caminhos relativos a partir da pasta da pagina atual
// As paginas internas ficam em pages-html/ e a home (index.html) na raiz.
// Este modulo centraliza o calculo do prefixo para que links entre paginas,
// assets e imagens continuem funcionando em qualquer nivel de pasta.

const PAGES_DIR = 'pages-html';
const ROOT_PAGES = ['index.html'];

function getCurrentPathname() {
    if (typeof window === 'undefined' || !window.location) return '';
    return window.location.pathname || '';
}

// Pagina aberta dentro de pages-html/ (precisa subir um nivel para achar a raiz)
function isInternalPage() {
    return new RegExp(`/${PAGES_DIR}/`, 'i').test(getCurrentPathname());
}

// Prefixo necessario para chegar da pagina atual ate a raiz do projeto
function getBasePrefix() {
    return isInternalPage() ? '../' : '';
}

function isExternalOrAbsolute(url) {
    return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('/') || url.startsWith('#') || url.startsWith('?');
}

// Resolve caminhos de assets (imagens, css, etc.) a partir da raiz do projeto
function resolveAssetPath(path) {
    const value = String(path ?? '');
    if (!value) return value;
    if (isExternalOrAbsolute(value) || value.startsWith('../')) return value;
    return getBasePrefix() + value;
}

// Resolve o caminho de outra pagina HTML a partir da pagina atual
// Ex.: de pages-html/carrinho.html -> 'checkout.html' vira 'checkout.html'
//      de index.html               -> 'cardapio.html' vira 'pages-html/cardapio.html'
function resolvePagePath(pageFile) {
    const file = String(pageFile ?? '').trim();
    if (!file) return file;
    if (isExternalOrAbsolute(file) || file.startsWith('../') || file.includes('/')) return file;

    if (isInternalPage()) {
        return ROOT_PAGES.includes(file) ? `../${file}` : file;
    }

    return ROOT_PAGES.includes(file) ? file : `${PAGES_DIR}/${file}`;
}

export {
    PAGES_DIR,
    ROOT_PAGES,
    isInternalPage,
    getBasePrefix,
    resolveAssetPath,
    resolvePagePath
};
