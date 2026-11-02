// menu-store.js - Dados e funções do cardápio (módulo separado para evitar dependência circular)
import { cloneMenuCatalog } from '../src/data/menuCatalog.js';
import { formatCurrency } from './ui.js';
import { addUnavailableOverlay } from './ux.js';
import { resolveAssetPath } from './base-path.js';
import { getProductImagePath } from './product-images.js';


// Copia mutavel do catalogo de src/: o admin legado altera/adiciona produtos nesta lista.
const menuItems = cloneMenuCatalog();

const menuContainer = typeof document !== 'undefined'
    ? document.getElementById('menu-items')
    : null;

let visibleItems = menuItems.filter(item => item.active);
let activeFilter = 'all';
let searchTerm = '';
let restaurantClosed = false;

// ============================================
// STATUS DO RESTAURANTE (ABERTO/FECHADO)
// ============================================

function getRestaurantStatusFromStorage() {
    try {
        const stored = localStorage.getItem('fastlanche_restaurant_status');
        if (!stored) return 'open';
        const parsed = JSON.parse(stored);
        return parsed === 'open' || parsed === 'closed' ? parsed : 'open';
    } catch {
        return 'open';
    }
}

function isRestaurantClosed() {
    return getRestaurantStatusFromStorage() === 'closed';
}

function renderRestaurantClosedMessage() {
    if (!menuContainer) return;

    const message = document.createElement('div');
    message.className = 'restaurant-closed-banner';

    const icon = document.createElement('span');
    icon.className = 'restaurant-closed-icon';
    icon.textContent = '🕐';

    const text = document.createElement('div');
    text.className = 'restaurant-closed-text';

    const title = document.createElement('strong');
    title.textContent = 'Restaurante fechado no momento';

    const subtitle = document.createElement('span');
    subtitle.textContent = 'Volte mais tarde para fazer seu pedido.';

    text.append(title, subtitle);
    message.append(icon, text);

    menuContainer.replaceChildren(message);
}

const normalizeText = value => (
    value
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
);

function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    return element;
}

function createMenuVisual(item) {
    const visual = document.createElement('div');
    visual.className = 'menu-item-visual';
    visual.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.className = 'menu-item-img';
    img.src = resolveAssetPath(getProductImagePath(item));
    img.alt = '';
    img.loading = 'lazy';

    visual.appendChild(img);
    return visual;
}

function createMenuCard(item) {
    const card = document.createElement('article');
    card.className = 'menu-item';
    card.dataset.category = item.category;
    card.dataset.productId = String(item.id);

    const visual = createMenuVisual(item);
    const category = createTextElement('p', 'section-kicker', item.category);
    const title = createTextElement('h3', '', item.name);
    const description = createTextElement('p', '', item.description);

    const footer = document.createElement('div');
    footer.className = 'menu-item-footer';

    const price = createTextElement('span', 'price', formatCurrency(item.price));

    const actions = document.createElement('div');
    actions.className = 'menu-item-actions';

    const button = document.createElement('button');
    button.className = 'add-to-cart';
    button.type = 'button';
    button.dataset.id = String(item.id);
    button.textContent = 'Adicionar';
    button.setAttribute('aria-label', `Adicionar ${item.name} ao carrinho`);

    actions.appendChild(button);

    footer.append(price, actions);
    card.append(visual, category, title, description, footer);

    // Verificar se o produto está sem estoque e aplicar overlay
    const inventoryAPI = window.__inventoryAPI || {};
    if (typeof inventoryAPI.isOutOfStock === 'function' && inventoryAPI.isOutOfStock(item.id)) {
        addUnavailableOverlay(card);
    }

    return card;
}

function renderEmptyMenu() {
    if (!menuContainer) return;

    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-state menu-empty';

    const icon = document.createElement('span');
    icon.className = 'empty-state-icon';
    icon.textContent = '🍔';

    const text = document.createElement('span');
    text.className = 'empty-state-text';
    text.textContent = 'Nenhum item ativo encontrado para essa busca.';

    emptyMessage.append(icon, text);
    menuContainer.appendChild(emptyMessage);
}

function renderMenu(items = visibleItems) {
    if (!menuContainer) return;

    menuContainer.replaceChildren();

    const activeItems = items.filter(item => item.active);

    if (!activeItems.length) {
        renderEmptyMenu();
        return;
    }

    activeItems.forEach(item => {
        menuContainer.appendChild(createMenuCard(item));
    });
}

function getFilteredMenuItems() {
    const normalizedSearch = normalizeText(searchTerm);

    return menuItems.filter(item => {
        const isActive = item.active;
        const matchesCategory = activeFilter === 'all' || item.category === activeFilter;
        const searchableContent = normalizeText(`${item.name} ${item.description}`);
        const matchesSearch = !normalizedSearch || searchableContent.includes(normalizedSearch);

        return isActive && matchesCategory && matchesSearch;
    });
}

function updateVisibleItems() {
    if (isRestaurantClosed()) {
        visibleItems = [];
        renderRestaurantClosedMessage();
        return;
    }

    visibleItems = getFilteredMenuItems();
    renderMenu(visibleItems);
}

function setSearchTerm(value) {
    searchTerm = value;
    updateVisibleItems();
}

function setActiveFilter(value) {
    activeFilter = value || 'all';
    updateVisibleItems();
}

// ============================================
// SETUP - STATUS DO RESTAURANTE
// ============================================

function setupRestaurantStatusListener() {
    document.addEventListener('restaurant:status-change', () => {
        updateVisibleItems();
    });

    // Verificar status inicial
    if (isRestaurantClosed()) {
        updateVisibleItems();
    }
}

export {
    activeFilter,
    getFilteredMenuItems,
    menuItems,
    renderMenu,
    searchTerm,
    setActiveFilter,
    setSearchTerm,
    updateVisibleItems,
    visibleItems,
    isRestaurantClosed,
    getRestaurantStatusFromStorage,
    setupRestaurantStatusListener
};
