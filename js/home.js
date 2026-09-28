// home.js - Modulo da Pagina Inicio (Fase 32 - Pagina Home)
// Apresentacao breve do restaurante, produto em destaque e redirecionamentos.
import { formatCurrency } from './ui.js';
import { resolveAssetPath, resolvePagePath } from './base-path.js';

// =========================================================================
// CONSTANTES
// =========================================================================
export const FEATURED_PRODUCT_ID = 14; // 'Combo Fast' - produto destaque da casa
export const HERO_FEATURE_SELECTOR = '.hero-feature';

const CATEGORY_IMAGES = {
    'Hambúrgueres': 'assets/products/hamburguer.svg',
    'Pizzas': 'assets/products/pizza.svg',
    'Combos': 'assets/products/combo.svg',
    'Bebidas': 'assets/products/bebida.svg',
    'Sobremesas': 'assets/products/sobremesa.svg',
    'Porções': 'assets/products/porcao.svg'
};

function getCategoryImage(category) {
    return CATEGORY_IMAGES[category] || 'assets/products/hamburguer.svg';
}

// =========================================================================
// REGRAS DE NEGOCIO (funcoes puras, testaveis sem DOM)
// =========================================================================

/**
 * Verifica se um item pode ser exibido como produto em destaque.
 * Regras: deve existir, estar ativo e ter estoque disponivel.
 *
 * @param {object} item Produto do cardapio.
 * @param {(id:number)=>boolean} [isAvailable] Callback de disponibilidade de estoque.
 * @returns {boolean}
 */
export function isFeaturedItem(item, isAvailable) {
    if (!item || typeof item !== 'object') return false;
    if (item.active === false) return false;
    if (typeof isAvailable === 'function' && isAvailable(Number(item.id)) === false) return false;
    return true;
}

/**
 * Seleciona o produto em destaque seguindo as regras de negocio:
 * 1) Usa o produto preferencial (id padrao Combo Fast) se ativo e disponivel;
 * 2) Caso contrario, seleciona o primeiro item ativo e disponivel;
 * 3) Se nao houver nenhum, retorna null (a secao deve ser ocultada).
 *
 * @param {Array<object>} items         - Lista de produtos do cardapio.
 * @param {(id:number)=>boolean} isAvailable - Disponibilidade de estoque.
 * @param {number} preferredId            - Id do produto preferido.
 * @returns {object|null}
 */
export function selectFeaturedFeature(items = [], isAvailable, preferredId = FEATURED_PRODUCT_ID) {
    if (!Array.isArray(items)) return null;

    const preferred = items.find(item => Number(item.id) === Number(preferredId));
    if (isFeaturedItem(preferred, isAvailable)) return preferred;

    const fallback = items.find(item => isFeaturedItem(item, isAvailable));
    return fallback || null;
}

// =========================================================================
// RENDERIZACAO (DOM - usado somente no navegador)
// =========================================================================

function createHeroFeatureContent(product, openCustomizationModal) {
    const badge = document.createElement('span');
    badge.className = 'hero-badge';
    badge.textContent = 'Destaque da casa';

    const visual = document.createElement('div');
    visual.className = 'hero-feature-visual';
    visual.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.className = 'hero-feature-img';
    img.src = resolveAssetPath(getCategoryImage(product.category));
    img.alt = `${product.name} - Fast Lanche`;
    img.loading = 'lazy';
    visual.appendChild(img);

    const kicker = document.createElement('p');
    kicker.className = 'section-kicker';
    kicker.textContent = product.category;

    const title = document.createElement('h3');
    title.className = 'hero-feature-title';
    title.textContent = product.name;

    const description = document.createElement('p');
    description.className = 'featured-product-description';
    description.textContent = product.description;

    const priceRow = document.createElement('div');
    priceRow.className = 'feature-row';
    priceRow.style.alignSelf = 'stretch';

    const price = document.createElement('strong');
    price.textContent = formatCurrency(product.price);
    priceRow.appendChild(price);

    const actions = document.createElement('div');
    actions.className = 'featured-product-actions';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'button button-primary featured-add-btn';
    addBtn.dataset.id = String(product.id);
    addBtn.textContent = 'Adicionar ao carrinho';
    if (typeof openCustomizationModal === 'function') {
        addBtn.addEventListener('click', () => openCustomizationModal(product));
    }

    const detailLink = document.createElement('a');
    detailLink.className = 'button button-secondary featured-detail-link';
    detailLink.href = resolvePagePath('cardapio.html');
    detailLink.textContent = 'Ver detalhes';

    actions.append(addBtn, detailLink);

    return [badge, visual, kicker, title, description, priceRow, actions];
}
// =========================================================================
// SETUP (carrega dependencias sob demanda para evitar ciclos e DOM em Node)
// =========================================================================

function loadFeaturedDependencies() {
    return Promise.all([
        import('./menu-store.js'),
        import('./inventory.js'),
        import('./product-customization.js')
    ]).then(([menuStore, inventory, customization]) => ({
        menuItems: menuStore.menuItems,
        isOutOfStock: inventory.isOutOfStock,
        openCustomizationModal: customization.openCustomizationModal
    }));
}

/**
 * Renderiza o produto em destaque no container lateral do hero e aplica as
 * regras de negocio:
 * - Se o produto preferido estiver indisponivel, mostra outro;
 * - Se nenhum item estiver disponivel, oculta o container.
 */
export async function setupFeatured() {
    const heroFeature = document.querySelector(HERO_FEATURE_SELECTOR);
    if (!heroFeature) return;

    let deps;
    try {
        deps = await loadFeaturedDependencies();
    } catch (error) {
        console.warn('Falha ao carregar modulos da Home.', error);
        return;
    }

    const { menuItems, isOutOfStock, openCustomizationModal } = deps;
    const isAvailable = id => !isOutOfStock(id);

    const product = selectFeaturedFeature(menuItems, isAvailable, FEATURED_PRODUCT_ID);

    if (!product) {
        heroFeature.style.display = 'none';
        heroFeature.replaceChildren();
        return;
    }

    heroFeature.style.display = '';
    heroFeature.replaceChildren(...createHeroFeatureContent(product, openCustomizationModal));
}

/**
 * Inicializa a Pagina Home (Fase 32).
 */
export function setupHome() {
    setupFeatured();

    // Re-renderiza o destaque quando o restaurante abre/fecha.
    document.addEventListener('restaurant:status-change', () => {
        setupFeatured();
    });
}

// =========================================================================
// EXPORTS
// =========================================================================
export {
    createHeroFeatureContent,
    getCategoryImage
};