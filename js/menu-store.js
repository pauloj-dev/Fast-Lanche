// menu-store.js - Dados e funções do cardápio (módulo separado para evitar dependência circular)
import { CUSTOMIZATION_TYPES } from './constants.js';
import { formatCurrency } from './ui.js';
import { addUnavailableOverlay } from './ux.js';

// Mapeamento de categorias para imagens SVG animadas
const CATEGORY_IMAGES = {
    'Hambúrgueres': 'assets/products/hamburguer.svg',
    'Pizzas': 'assets/products/pizza.svg',
    'Combos': 'assets/products/combo.svg',
    'Bebidas': 'assets/products/bebida.svg',
    'Sobremesas': 'assets/products/sobremesa.svg',
    'Porções': 'assets/products/porcao.svg'
};

const menuItems = [
    // =========================================================================
    // HAMBÚRGUERES
    // =========================================================================
    {
        id: 1,
        name: 'X-Burger Simples',
        description: 'Hambúrguer artesanal 150g, queijo cheddar, alface e molho especial.',
        price: 16.9,
        category: 'Hambúrgueres',
        maxQuantity: 10,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.REMOVE_INGREDIENTS,
            ingredients: ['Cebola', 'Queijo Cheddar', 'Alface', 'Tomate', 'Molho Especial'],
            extras: [{ name: 'Bacon extra', price: 3.5 }, { name: 'Queijo adicional', price: 2.5 }]
        }
    },
    {
        id: 2,
        name: 'X-Salada',
        description: 'Hambúrguer 180g, queijo prato, salada fresca, maionese da casa.',
        price: 19.9,
        category: 'Hambúrgueres',
        maxQuantity: 10,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.REMOVE_INGREDIENTS,
            ingredients: ['Cebola Roxa', 'Queijo Prato', 'Alface Americana', 'Tomate', 'Maionese'],
            extras: [{ name: 'Ovo', price: 2.0 }, { name: 'Calabresa', price: 3.0 }]
        }
    },
    {
        id: 3,
        name: 'X-Bacon',
        description: 'Hambúrguer 200g, bastante bacon crocante, cheddar e barbecue.',
        price: 24.9,
        category: 'Hambúrgueres',
        maxQuantity: 8,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.REMOVE_INGREDIENTS,
            ingredients: ['Cebola Caramelizada', 'Queijo Cheddar', 'Bacon', 'Molho Barbecue'],
            extras: [{ name: 'Dobro de bacon', price: 5.0 }, { name: 'Hambúrguer extra', price: 7.0 }]
        }
    },
    {
        id: 4,
        name: 'X-Egg',
        description: 'Hambúrguer 150g, ovo frito, queijo mussarela, alface e tomate.',
        price: 18.9,
        category: 'Hambúrgueres',
        maxQuantity: 10,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.REMOVE_INGREDIENTS,
            ingredients: ['Ovo', 'Queijo Mussarela', 'Alface', 'Tomate', 'Maionese'],
            extras: [{ name: 'Bacon', price: 3.5 }, { name: 'Catupiry', price: 2.5 }]
        }
    },
    {
        id: 5,
        name: 'X-Tudo',
        description: 'Hambúrguer 220g, bacon, ovo, calabresa, queijo, salada completa.',
        price: 29.9,
        category: 'Hambúrgueres',
        maxQuantity: 8,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.REMOVE_INGREDIENTS,
            ingredients: ['Cebola', 'Bacon', 'Ovo', 'Calabresa', 'Queijo', 'Alface', 'Tomate', 'Molho'],
            extras: [{ name: 'Hambúrguer duplo', price: 8.0 }, { name: 'Cheddar extra', price: 3.0 }]
        }
    },
    {
        id: 6,
        name: 'X-Frango',
        description: 'Filé de frango empanado 180g, queijo, alface, tomate e maionese.',
        price: 21.9,
        category: 'Hambúrgueres',
        maxQuantity: 10,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.REMOVE_INGREDIENTS,
            ingredients: ['Queijo', 'Alface', 'Tomate', 'Maionese'],
            extras: [{ name: 'Cheddar', price: 2.5 }, { name: 'Bacon', price: 3.5 }]
        }
    },
    {
        id: 7,
        name: 'X-Veggie',
        description: 'Hambúrguer de grão-de-bico 160g, alface, tomate, cebola roxa e molho vegano.',
        price: 22.9,
        category: 'Hambúrgueres',
        maxQuantity: 8,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.REMOVE_INGREDIENTS,
            ingredients: ['Cebola Roxa', 'Alface', 'Tomate', 'Molho Vegano', 'Picles'],
            extras: [{ name: 'Guacamole', price: 4.0 }, { name: 'Queijo vegano', price: 3.0 }]
        }
    },

    // =========================================================================
    // PIZZAS
    // =========================================================================
    {
        id: 8,
        name: 'Pizza Calabresa',
        description: 'Molho de tomate, calabresa fatiada, cebola, azeitona e mussarela.',
        price: 34.9,
        category: 'Pizzas',
        maxQuantity: 5,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.HALF_HALF,
            flavors: [
                { name: 'Calabresa', price: 0 },
                { name: 'Frango com Catupiry', price: 2.0 },
                { name: 'Mussarela', price: 0 },
                { name: 'Portuguesa', price: 3.0 },
                { name: 'Marguerita', price: 2.0 },
                { name: 'Pepperoni', price: 4.0 },
                { name: 'Quatro Queijos', price: 5.0 },
                { name: 'Bacon', price: 3.0 }
            ],
            extras: [{ name: 'Borda recheada', price: 6.0 }, { name: 'Azeitona extra', price: 2.0 }]
        }
    },
    {
        id: 9,
        name: 'Pizza Mussarela',
        description: 'Molho de tomate, mussarela, orégano e azeitona. Clássica e irresistível.',
        price: 29.9,
        category: 'Pizzas',
        maxQuantity: 5,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.HALF_HALF,
            flavors: [
                { name: 'Calabresa', price: 0 },
                { name: 'Frango com Catupiry', price: 2.0 },
                { name: 'Mussarela', price: 0 },
                { name: 'Portuguesa', price: 3.0 },
                { name: 'Marguerita', price: 2.0 },
                { name: 'Pepperoni', price: 4.0 },
                { name: 'Quatro Queijos', price: 5.0 },
                { name: 'Bacon', price: 3.0 }
            ],
            extras: [{ name: 'Borda recheada', price: 6.0 }, { name: 'Catupiry extra', price: 3.0 }]
        }
    },
    {
        id: 10,
        name: 'Pizza Portuguesa',
        description: 'Molho, mussarela, presunto, ovos, cebola, pimentão, ervilha e azeitona.',
        price: 38.9,
        category: 'Pizzas',
        maxQuantity: 5,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.HALF_HALF,
            flavors: [
                { name: 'Calabresa', price: 0 },
                { name: 'Frango com Catupiry', price: 0 },
                { name: 'Mussarela', price: 0 },
                { name: 'Portuguesa', price: 0 },
                { name: 'Marguerita', price: 0 },
                { name: 'Pepperoni', price: 2.0 },
                { name: 'Quatro Queijos', price: 2.0 },
                { name: 'Bacon', price: 2.0 }
            ],
            extras: [{ name: 'Borda recheada', price: 6.0 }, { name: 'Mussarela extra', price: 3.0 }]
        }
    },
    {
        id: 11,
        name: 'Pizza Frango com Catupiry',
        description: 'Molho, frango desfiado, catupiry cremoso, milho e azeitona.',
        price: 36.9,
        category: 'Pizzas',
        maxQuantity: 5,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.HALF_HALF,
            flavors: [
                { name: 'Calabresa', price: 0 },
                { name: 'Frango com Catupiry', price: 0 },
                { name: 'Mussarela', price: 0 },
                { name: 'Portuguesa', price: 3.0 },
                { name: 'Marguerita', price: 0 },
                { name: 'Pepperoni', price: 4.0 },
                { name: 'Quatro Queijos', price: 3.0 },
                { name: 'Bacon', price: 2.0 }
            ],
            extras: [{ name: 'Borda recheada', price: 6.0 }, { name: 'Catupiry extra', price: 4.0 }]
        }
    },
    {
        id: 12,
        name: 'Pizza Pepperoni',
        description: 'Molho, pepperoni fatiado, mussarela e orégano. Sabor marcante.',
        price: 39.9,
        category: 'Pizzas',
        maxQuantity: 5,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.HALF_HALF,
            flavors: [
                { name: 'Calabresa', price: 0 },
                { name: 'Frango com Catupiry', price: 0 },
                { name: 'Mussarela', price: 0 },
                { name: 'Portuguesa', price: 2.0 },
                { name: 'Marguerita', price: 0 },
                { name: 'Pepperoni', price: 0 },
                { name: 'Quatro Queijos', price: 2.0 },
                { name: 'Bacon', price: 0 }
            ],
            extras: [{ name: 'Borda recheada', price: 6.0 }, { name: 'Pepperoni extra', price: 4.0 }]
        }
    },
    {
        id: 13,
        name: 'Pizza Quatro Queijos',
        description: 'Mussarela, provolone, parmesão e catupiry. Para os amantes de queijo.',
        price: 41.9,
        category: 'Pizzas',
        maxQuantity: 5,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.HALF_HALF,
            flavors: [
                { name: 'Calabresa', price: 0 },
                { name: 'Frango com Catupiry', price: 0 },
                { name: 'Mussarela', price: 0 },
                { name: 'Portuguesa', price: 2.0 },
                { name: 'Marguerita', price: 0 },
                { name: 'Pepperoni', price: 2.0 },
                { name: 'Quatro Queijos', price: 0 },
                { name: 'Bacon', price: 0 }
            ],
            extras: [{ name: 'Borda recheada', price: 6.0 }, { name: 'Gorgonzola extra', price: 5.0 }]
        }
    },

    // =========================================================================
    // COMBOS
    // =========================================================================
    {
        id: 14,
        name: 'Combo Fast',
        description: 'X-Burger Simples + Batata Frita Média + Refrigerante Lata.',
        price: 29.9,
        category: 'Combos',
        maxQuantity: 8,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.OBSERVATIONS,
            extras: [{ name: 'Batata grande', price: 3.0 }, { name: 'Milk shake', price: 6.0 }]
        }
    },
    {
        id: 15,
        name: 'Combo Família',
        description: '2 X-Tudo + 2 Batatas Grandes + 2 Refrigerantes + 1 Pizza Calabresa Média.',
        price: 89.9,
        category: 'Combos',
        maxQuantity: 5,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.OBSERVATIONS,
            extras: [{ name: 'Refrigerante 2L', price: 5.0 }, { name: 'Sobremesa extra', price: 7.0 }]
        }
    },
    {
        id: 16,
        name: 'Combo Burguer',
        description: 'X-Bacon + Batata Frita + Onion Rings + Refrigerante Lata.',
        price: 44.9,
        category: 'Combos',
        maxQuantity: 8,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.OBSERVATIONS,
            extras: [{ name: 'Hambúrguer extra', price: 7.0 }, { name: 'Milk shake', price: 6.0 }]
        }
    },
    {
        id: 17,
        name: 'Combo Pizza',
        description: 'Pizza Grande + 2 Refrigerantes + Sobremesa. Ideal para o fim de semana.',
        price: 59.9,
        category: 'Combos',
        maxQuantity: 5,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.OBSERVATIONS,
            extras: [{ name: 'Borda recheada', price: 6.0 }, { name: 'Refrigerante 2L', price: 5.0 }]
        }
    },

    // =========================================================================
    // BEBIDAS
    // =========================================================================
    {
        id: 18,
        name: 'Refrigerante Lata',
        description: 'Coca-Cola, Guaraná, Fanta ou Sprite. Lata 350ml gelada.',
        price: 6.0,
        category: 'Bebidas',
        maxQuantity: 20,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.OBSERVATIONS,
            extras: [
                { name: 'Coca-Cola', price: 0 },
                { name: 'Coca-Cola Zero', price: 0 },
                { name: 'Guaraná Antarctica', price: 0 },
                { name: 'Fanta Laranja', price: 0 },
                { name: 'Fanta Uva', price: 0 },
                { name: 'Sprite', price: 0 },
                { name: 'Pepsi', price: 0 },
                { name: 'Pepsi Twist', price: 0 }
            ]
        }
    },
    {
        id: 19,
        name: 'Refrigerante 2L',
        description: 'Garrafa 2 litros. Coca-Cola, Guaraná, Fanta ou Sprite.',
        price: 12.0,
        category: 'Bebidas',
        maxQuantity: 10,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.OBSERVATIONS,
            extras: [
                { name: 'Coca-Cola', price: 0 },
                { name: 'Coca-Cola Zero', price: 0 },
                { name: 'Guaraná Antarctica', price: 0 },
                { name: 'Fanta Laranja', price: 0 },
                { name: 'Fanta Uva', price: 0 },
                { name: 'Sprite', price: 0 }
            ]
        }
    },
    {
        id: 20,
        name: 'Suco Natural',
        description: 'Laranja, limão, maracujá ou abacaxi. Preparado na hora. 500ml.',
        price: 8.9,
        category: 'Bebidas',
        maxQuantity: 15,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.OBSERVATIONS,
            extras: [{ name: 'Levar açúcar', price: 0 }, { name: 'Com gelo extra', price: 0 }]
        }
    },
    {
        id: 21,
        name: 'Milk Shake',
        description: 'Chocolate, morango ou baunilha. Cremoso e gelado. 400ml.',
        price: 14.9,
        category: 'Bebidas',
        maxQuantity: 10,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.OBSERVATIONS,
            extras: [{ name: 'Calda extra', price: 2.0 }, { name: 'Chantilly', price: 3.0 }]
        }
    },
    {
        id: 22,
        name: 'Água Mineral',
        description: 'Água sem gás 500ml.',
        price: 4.0,
        category: 'Bebidas',
        maxQuantity: 20,
        active: true,
        customization: null
    },
    {
        id: 23,
        name: 'Cerveja Lata',
        description: 'Heineken, Brahma ou Stella. Lata 350ml gelada.',
        price: 7.5,
        category: 'Bebidas',
        maxQuantity: 15,
        active: true,
        customization: null
    },

    // =========================================================================
    // SOBREMESAS
    // =========================================================================
    {
        id: 24,
        name: 'Pudim',
        description: 'Pudim de leite condensado com calda de caramelo. Fatia generosa.',
        price: 11.9,
        category: 'Sobremesas',
        maxQuantity: 8,
        active: true,
        customization: null
    },
    {
        id: 25,
        name: 'Brownie',
        description: 'Brownie de chocolate belga com nozes e calda de chocolate.',
        price: 13.9,
        category: 'Sobremesas',
        maxQuantity: 8,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.OBSERVATIONS,
            extras: [{ name: 'Sorvete de creme', price: 5.0 }, { name: 'Calda extra', price: 2.0 }]
        }
    },
    {
        id: 26,
        name: 'Sorvete Sundae',
        description: 'Sorvete de creme com calda de chocolate, morango ou caramelo.',
        price: 15.9,
        category: 'Sobremesas',
        maxQuantity: 10,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.OBSERVATIONS,
            extras: [{ name: 'Calda dupla', price: 2.0 }, { name: 'Granulado', price: 0 }]
        }
    },
    {
        id: 27,
        name: 'Petit Gateau',
        description: 'Bolinho de chocolate com recheio cremoso, acompanha sorvete de creme.',
        price: 18.9,
        category: 'Sobremesas',
        maxQuantity: 6,
        active: true,
        customization: null
    },

    // =========================================================================
    // PORÇÕES
    // =========================================================================
    {
        id: 28,
        name: 'Batata Frita',
        description: 'Porção de batata crocante 400g com sal na medida e molho especial.',
        price: 14.9,
        category: 'Porções',
        maxQuantity: 10,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.ADD_EXTRAS,
            extras: [{ name: 'Cheddar e bacon', price: 6.0 }, { name: 'Molho extra', price: 2.0 }]
        }
    },
    {
        id: 29,
        name: 'Onion Rings',
        description: 'Anéis de cebola empanados 300g com molho barbecue especial.',
        price: 16.9,
        category: 'Porções',
        maxQuantity: 8,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.ADD_EXTRAS,
            extras: [{ name: 'Molho extra', price: 2.0 }, { name: 'Bacon em cubos', price: 5.0 }]
        }
    },
    {
        id: 30,
        name: 'Frango a Passarinho',
        description: 'Frango temperado e frito na medida certa. Porção 500g.',
        price: 24.9,
        category: 'Porções',
        maxQuantity: 8,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.ADD_EXTRAS,
            extras: [{ name: 'Molho picante', price: 2.0 }, { name: 'Limão extra', price: 0 }]
        }
    },
    {
        id: 31,
        name: 'Calabresa Acebolada',
        description: 'Calabresa fatiada grelhada com cebola. Porção 400g.',
        price: 21.9,
        category: 'Porções',
        maxQuantity: 8,
        active: true,
        customization: {
            type: CUSTOMIZATION_TYPES.ADD_EXTRAS,
            extras: [{ name: 'Queijo coalho', price: 5.0 }, { name: 'Molho barbecue', price: 2.0 }]
        }
    },
    {
        id: 32,
        name: 'Porção de Queijo Coalho',
        description: 'Queijo coalho grelhado com melado de cana. Porção 300g.',
        price: 19.9,
        category: 'Porções',
        maxQuantity: 8,
        active: true,
        customization: null
    },

    // =========================================================================
    // PRODUTOS INATIVOS (exemplo)
    // =========================================================================
    {
        id: 33,
        name: 'Combo Indisponível',
        description: 'Item inativo para validar a regra de exibição.',
        price: 24.9,
        category: 'Combos',
        maxQuantity: 5,
        active: false,
        customization: null
    }
];

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
    img.src = CATEGORY_IMAGES[item.category] || 'assets/products/hamburguer.svg';
    img.alt = `${item.category} - Fast Lanche`;
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
    button.textContent = 'Adicionar ao carrinho';
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
