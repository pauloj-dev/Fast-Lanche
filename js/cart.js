// cart.js - logica do carrinho
import { isOutOfStock, getAvailableQuantity } from './inventory.js';
import { createEnhancedCartEmptyState, createFreeDeliveryBar } from './ux.js';

// O módulo também é consumido por testes e ferramentas sem DOM.
const dom = typeof document !== 'undefined' ? document : null;
const cartItemsContainer = dom?.getElementById('cart-items') || null;
const cartCount = dom?.getElementById('cart-count') || null;
const cartSubtotal = dom?.getElementById('cart-subtotal') || null;
const cartFee = dom?.getElementById('cart-fee') || null;
const cartTotal = dom?.getElementById('cart-total') || null;

const DELIVERY_FEE = 6;
const FREE_DELIVERY_MINIMUM = 50;
const CART_STORAGE_KEY = 'fastlanche_cart';
const CATEGORY_IMAGES = {
  'Hambúrgueres': 'assets/products/hamburguer.svg',
  'Pizzas': 'assets/products/pizza.svg',
  'Combos': 'assets/products/combo.svg',
  'Bebidas': 'assets/products/bebida.svg',
  'Sobremesas': 'assets/products/sobremesa.svg',
  'Porções': 'assets/products/porcao.svg'
};

const cart = {
  items: [],
  subtotal: 0,
  deliveryFee: 0,
  total: 0
};

const formatCurrency = value => (
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
);

function normalizeQuantity(quantity, maxQuantity) {
  const safeMax = Number.isFinite(maxQuantity) && maxQuantity > 0 ? maxQuantity : 99;
  const safeQuantity = Number.isFinite(quantity) ? quantity : 1;
  return Math.min(Math.max(safeQuantity, 1), safeMax);
}

function calculateCartTotals() {
  cart.subtotal = cart.items.reduce((sum, item) => (
    sum + Math.max(Number(item.price) || 0, 0) * Math.max(Number(item.quantity) || 0, 0)
  ), 0);

  cart.deliveryFee = cart.subtotal > 0 && cart.subtotal < FREE_DELIVERY_MINIMUM
    ? DELIVERY_FEE
    : 0;

  cart.total = Math.max(cart.subtotal + cart.deliveryFee, 0);

  return {
    subtotal: cart.subtotal,
    deliveryFee: cart.deliveryFee,
    total: cart.total
  };
}

function isStorageAvailable() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch (error) {
    console.warn('LocalStorage indisponivel para o carrinho.', error);
    return false;
  }
}

function getSerializableCart() {
  return {
    items: cart.items.map(item => ({
      cartItemId: item.cartItemId || `${item.id}_${Math.random().toString(36).substring(2, 9)}`,
      id: item.id,
      name: item.name,
      price: item.price,
      unitPrice: item.unitPrice || item.price,
      quantity: item.quantity,
      maxQuantity: item.maxQuantity,
      category: item.category || null,
      image: item.image || (CATEGORY_IMAGES[item.category] || null),
      _customization: item._customization || null
    })),
    subtotal: cart.subtotal,
    deliveryFee: cart.deliveryFee,
    total: cart.total
  };
}

function saveCart() {
  if (!isStorageAvailable()) return false;

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(getSerializableCart()));
    return true;
  } catch (error) {
    console.warn('Nao foi possivel salvar o carrinho.', error);
    return false;
  }
}

function isValidStoredItem(item) {
  return (
    item &&
    Number.isFinite(Number(item.id)) &&
    typeof item.name === 'string' &&
    Number.isFinite(Number(item.price)) &&
    Number.isFinite(Number(item.quantity))
  );
}

function normalizeStoredItem(item) {
  const maxQuantity = Number(item.maxQuantity) || 99;

  return {
    cartItemId: item.cartItemId || `${item.id}_${Math.random().toString(36).substring(2, 9)}`,
    id: Number(item.id),
    name: item.name,
    price: Math.max(Number(item.price) || 0, 0),
    unitPrice: Math.max(Number(item.unitPrice) || Number(item.price) || 0, 0),
    quantity: normalizeQuantity(Number(item.quantity), maxQuantity),
    maxQuantity,
    category: typeof item.category === 'string' ? item.category : null,
    image: typeof item.image === 'string' ? item.image : (CATEGORY_IMAGES[item.category] || null),
    _customization: item._customization || null
  };
}

function loadCart() {
  if (!isStorageAvailable()) {
    calculateCartTotals();
    renderCart();
    return cart;
  }

  try {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!storedCart) {
      calculateCartTotals();
      renderCart();
      return cart;
    }

    const parsedCart = JSON.parse(storedCart);
    const storedItems = Array.isArray(parsedCart?.items) ? parsedCart.items : [];

    cart.items = storedItems
      .filter(isValidStoredItem)
      .map(normalizeStoredItem);

    calculateCartTotals();
    renderCart();
    return cart;
  } catch (error) {
    console.warn('Nao foi possivel carregar o carrinho.', error);
    cart.items = [];
    calculateCartTotals();
    renderCart();
    return cart;
  }
}

function getCartItem(identifier) {
  if (!identifier) return null;
  return cart.items.find(item => item.cartItemId === String(identifier) || item.id === Number(identifier));
}

function isSameCustomization(cust1, cust2) {
  if (!cust1 && !cust2) return true;
  if (!cust1 || !cust2) return false;
  return JSON.stringify(cust1) === JSON.stringify(cust2);
}

function addToCart(item) {
  if (!item || item.active === false) return cart;

  const itemCust = item._customization || null;
  const existing = cart.items.find(i => i.id === Number(item.id) && isSameCustomization(i._customization, itemCust));

  if (existing) {
    existing.quantity = normalizeQuantity(existing.quantity + 1, existing.maxQuantity);
  } else {
    const cartItemId = `${item.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    cart.items.push({
      cartItemId,
      id: Number(item.id),
      name: item.name,
      price: Math.max(Number(item.price) || 0, 0),
      unitPrice: Math.max(Number(item.unitPrice) || Number(item.price) || 0, 0),
      quantity: 1,
      maxQuantity: item.maxQuantity || 99,
      category: item.category || null,
      image: typeof item.image === 'string' ? item.image : (CATEGORY_IMAGES[item.category] || null),
      _customization: itemCust
    });
  }

  calculateCartTotals();
  saveCart();
  renderCart();
  return cart;
}

function incrementItem(identifier) {
  const item = getCartItem(identifier);
  if (!item) return cart;

  item.quantity = normalizeQuantity(item.quantity + 1, item.maxQuantity);
  calculateCartTotals();
  saveCart();
  renderCart();
  return cart;
}

function decrementItem(identifier) {
  const item = getCartItem(identifier);
  if (!item) return cart;

  if (item.quantity <= 1) {
    removeItem(identifier);
    return cart;
  }

  item.quantity = normalizeQuantity(item.quantity - 1, item.maxQuantity);
  calculateCartTotals();
  saveCart();
  renderCart();
  return cart;
}

function removeItem(identifier) {
  const index = cart.items.findIndex(item => item.cartItemId === String(identifier) || item.id === Number(identifier));
  if (index === -1) return cart;

  cart.items.splice(index, 1);
  calculateCartTotals();
  saveCart();
  renderCart();
  return cart;
}

function clearCart() {
  cart.items = [];
  calculateCartTotals();
  saveCart();
  renderCart();
  return cart;
}

function getSubtotal() {
  return cart.subtotal;
}

function renderEmptyCart() {
  if (!cartItemsContainer) return;
  cartItemsContainer.appendChild(createEnhancedCartEmptyState());
}

function createCustomizationSummary(item) {
  if (!item._customization) return null;

  const summary = document.createElement('div');
  summary.className = 'cart-item-customization';

  const cust = item._customization;

  if (cust.type === 'half_half') {
    const parts = [];
    parts.push(`Meio ${cust.flavor1}`);
    if (cust.flavor2) parts.push(`Meio ${cust.flavor2}`);
    const p = document.createElement('span');
    p.textContent = parts.join(' + ');
    summary.appendChild(p);
  }

  if (cust.type === 'remove_ingredients' && cust.removedIngredients && cust.removedIngredients.length > 0) {
    const removed = document.createElement('span');
    removed.textContent = `Sem: ${cust.removedIngredients.join(', ')}`;
    summary.appendChild(removed);
  }

  if (cust.extras && cust.extras.length > 0) {
    const extrasText = document.createElement('span');
    const extrasList = cust.extras.map(e => {
      const priceText = e.price > 0 ? ` (+${formatCurrency(e.price)})` : '';
      return `${e.name}${priceText}`;
    });
    extrasText.textContent = `Adicionais: ${extrasList.join(', ')}`;
    summary.appendChild(extrasText);

    // Valor total dos adicionais
    const extrasTotal = cust.extras.reduce((sum, e) => sum + (e.price || 0), 0);
    if (extrasTotal > 0) {
      const extrasValue = document.createElement('span');
      extrasValue.className = 'cart-item-extras-total';
      extrasValue.textContent = `Total adicionais: ${formatCurrency(extrasTotal)}`;
      summary.appendChild(extrasValue);
    }
  }

  if (cust.observation) {
    const obs = document.createElement('span');
    obs.textContent = `Obs: ${cust.observation}`;
    summary.appendChild(obs);
  }

  return summary;
}

function createCartItemElement(item) {
  const listItem = document.createElement('li');
  listItem.className = 'cart-item';

  const info = document.createElement('div');
  info.className = 'cart-item-info';

  const name = document.createElement('strong');
  name.textContent = item.name;

  const priceRow = document.createElement('div');
  priceRow.className = 'cart-item-prices';

  const unitPrice = document.createElement('span');
  unitPrice.className = 'cart-item-unit-price';
  unitPrice.textContent = `${formatCurrency(item.unitPrice || item.price)} cada`;

  const totalPrice = document.createElement('span');
  totalPrice.className = 'cart-item-total-price';
  totalPrice.textContent = `Total: ${formatCurrency(item.price * item.quantity)}`;

  priceRow.append(unitPrice, totalPrice);
  info.append(name, priceRow);

  if (item.image) {
    const image = document.createElement('img');
    image.className = 'cart-item-image';
    image.src = item.image;
    image.alt = item.name;
    image.loading = 'lazy';
    listItem.prepend(image);
  }

  // Resumo da personalizacao
  const customizationSummary = createCustomizationSummary(item);
  if (customizationSummary) {
    info.appendChild(customizationSummary);
  }

  const controls = document.createElement('div');
  controls.className = 'cart-item-controls';

  const cartItemIdVal = item.cartItemId || String(item.id);

  const decrementButton = document.createElement('button');
  decrementButton.type = 'button';
  decrementButton.className = 'cart-control';
  decrementButton.dataset.cartAction = 'decrement';
  decrementButton.dataset.cartItemId = cartItemIdVal;
  decrementButton.dataset.id = String(item.id);
  decrementButton.textContent = '-';
  decrementButton.setAttribute('aria-label', `Diminuir quantidade de ${item.name}`);

  const quantity = document.createElement('span');
  quantity.className = 'cart-quantity';
  quantity.textContent = String(item.quantity);

  const incrementButton = document.createElement('button');
  incrementButton.type = 'button';
  incrementButton.className = 'cart-control';
  incrementButton.dataset.cartAction = 'increment';
  incrementButton.dataset.cartItemId = cartItemIdVal;
  incrementButton.dataset.id = String(item.id);
  incrementButton.textContent = '+';
  incrementButton.disabled = item.quantity >= item.maxQuantity;
  incrementButton.setAttribute('aria-label', `Aumentar quantidade de ${item.name}`);

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'cart-remove';
  removeButton.dataset.cartAction = 'remove';
  removeButton.dataset.cartItemId = cartItemIdVal;
  removeButton.dataset.id = String(item.id);
  removeButton.textContent = 'Remover';

  controls.append(decrementButton, quantity, incrementButton, removeButton);
  listItem.append(info, controls);

  return listItem;
}

function renderCart() {
  if (cartItemsContainer) {
    cartItemsContainer.replaceChildren();

    if (cart.items.length) {
      cart.items.forEach(item => {
        cartItemsContainer.appendChild(createCartItemElement(item));
      });
    } else {
      renderEmptyCart();
    }
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  if (cartCount) cartCount.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`;
  if (cartSubtotal) cartSubtotal.textContent = formatCurrency(cart.subtotal);
  if (cartFee) cartFee.textContent = formatCurrency(cart.deliveryFee);
  if (cartTotal) cartTotal.textContent = formatCurrency(cart.total);

  // Renderizar barra de frete grátis
  renderFreeDeliveryBar();

  // Disparar evento de atualização do carrinho
  dispatchCartUpdate();
}

function renderFreeDeliveryBar() {
  if (!dom) return;
  const cartPanel = dom.querySelector('.cart-panel, .cart-page-summary');
  if (!cartPanel) return;

  // Remover barra existente
  const existingBar = cartPanel.querySelector('.free-delivery-bar');
  if (existingBar) existingBar.remove();

  // Remover botão de ir para checkout se existir
  const existingBtn = dom.getElementById('go-to-checkout-btn');
  if (existingBtn) existingBtn.remove();

  // Adicionar barra de frete grátis após o cart-summary
  const cartSummary = dom.querySelector('.cart-summary');
  if (cartSummary && cart.items.length) {
    const freeDeliveryBar = createFreeDeliveryBar(cart.subtotal);
    cartSummary.after(freeDeliveryBar);
  }
}

function dispatchCartUpdate() {
  if (!dom) return;
  dom.dispatchEvent(new CustomEvent('cart:update', {
    detail: { items: cart.items.length, subtotal: cart.subtotal }
  }));
}

function setupCartControls() {
  if (!cartItemsContainer) return;

  cartItemsContainer.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.dataset.cartAction;
    const identifier = target.dataset.cartItemId || target.dataset.id;

    if (action === 'increment') incrementItem(identifier);
    if (action === 'decrement') decrementItem(identifier);
    if (action === 'remove') removeItem(identifier);
  });
}

export {
  addToCart,
  calculateCartTotals,
  cart,
  clearCart,
  decrementItem,
  getSubtotal,
  incrementItem,
  loadCart,
  removeItem,
  renderCart,
  saveCart,
  setupCartControls,
  normalizeQuantity,
  DELIVERY_FEE,
  FREE_DELIVERY_MINIMUM
};
