// product-images.js - Ilustracao de cada produto (compartilhado entre paginas legadas e React)
// Sem dependencias de DOM: pode ser importado por testes e pelo bundle React.

const PRODUCTS_DIR = 'assets/products';

const CATEGORY_IMAGES = {
    'Hambúrgueres': 'hamburguer',
    'Pizzas': 'pizza',
    'Combos': 'combo',
    'Bebidas': 'bebida',
    'Sobremesas': 'sobremesa',
    'Porções': 'porcao'
};

// Regras por categoria: a primeira expressao que casar com o nome do produto define a ilustracao.
const PRODUCT_IMAGE_RULES = {
    'Bebidas': [[/suco/i, 'suco'], [/milk|shake/i, 'milkshake'], [/[áa]gua/i, 'agua'], [/cerveja/i, 'cerveja']],
    'Sobremesas': [[/pudim/i, 'pudim'], [/brownie|petit/i, 'brownie']],
    'Porções': [[/onion/i, 'onion-rings'], [/passarinho|frango/i, 'frango'], [/calabresa/i, 'calabresa'], [/coalho|queijo/i, 'queijo-coalho']]
};

function getProductImageName(item = {}) {
    const name = String(item.name || '');
    const rule = (PRODUCT_IMAGE_RULES[item.category] || []).find(([pattern]) => pattern.test(name));
    return rule ? rule[1] : (CATEGORY_IMAGES[item.category] || 'hamburguer');
}

// Caminho relativo a raiz do projeto (ex.: "assets/products/pizza.svg").
function getProductImagePath(item) {
    return `${PRODUCTS_DIR}/${getProductImageName(item)}.svg`;
}

export { CATEGORY_IMAGES, getProductImageName, getProductImagePath };
