// ux.js - Melhorias de Experiência do Usuário (UX)
// Fase 26 - Estados de sistema, feedback visual, navegação clara e animações
import { showToast } from './ui.js';

// =========================================================================
// SCROLL SUAVE PARA SEÇÕES
// =========================================================================

function smoothScrollTo(target, duration = 400) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) return;

    const startY = window.scrollY;
    const targetY = element.getBoundingClientRect().top + startY;
    const startTime = performance.now();

    function easeInOut(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        window.scrollTo({
            top: startY + (targetY - startY) * easeInOut(progress),
            behavior: 'auto'
        });

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}

// =========================================================================
// ANIMAÇÃO DE DESTAQUE PARA ELEMENTOS IMPORTANTES
// =========================================================================

function addPopAnimation(element) {
    if (!element) return;

    element.classList.remove('pop-animation');
    // Força reflow para reiniciar animação
    void element.offsetWidth;
    element.classList.add('pop-animation');

    setTimeout(() => {
        element.classList.remove('pop-animation');
    }, 400);
}

function highlightElement(element, highlightClass = 'element-highlight') {
    if (!element) return;

    element.classList.remove(highlightClass);
    void element.offsetWidth;
    element.classList.add(highlightClass);

    setTimeout(() => {
        element.classList.remove(highlightClass);
    }, 1200);
}

// =========================================================================
// ESTADO VAZIO APRIMORADO DO CARRINHO
// =========================================================================

function createEnhancedCartEmptyState() {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-state empty-state-cart';

    const emoji = document.createElement('span');
    emoji.className = 'empty-state-icon';
    emoji.textContent = '🛒';

    const text = document.createElement('div');
    text.className = 'empty-state-cart-text';

    const title = document.createElement('strong');
    title.textContent = 'Seu carrinho está vazio';

    const subtitle = document.createElement('span');
    subtitle.textContent = 'Explore nosso cardápio e adicione itens deliciosos!';

    text.append(title, subtitle);

    const browseBtn = document.createElement('button');
    browseBtn.className = 'button button-primary empty-state-btn';
    browseBtn.type = 'button';
    browseBtn.textContent = 'Ver cardápio';
    browseBtn.addEventListener('click', () => {
        smoothScrollTo('#menu');
        // Feedback visual no cardápio
        const menuSection = document.getElementById('menu');
        if (menuSection) highlightElement(menuSection, 'section-highlight');
    });

    emptyItem.append(emoji, text, browseBtn);

    return emptyItem;
}

// =========================================================================
// BARRA DE PROGRESSO DO FRETE GRÁTIS
// =========================================================================

const FREE_DELIVERY_MINIMUM = 50;

function createFreeDeliveryBar(subtotal) {
    const container = document.createElement('div');
    container.className = 'free-delivery-bar';

    if (subtotal <= 0) {
        const label = document.createElement('span');
        label.className = 'free-delivery-label';
        label.textContent = `Frete grátis acima de ${formatCurrencyBRL(FREE_DELIVERY_MINIMUM)}`;
        container.appendChild(label);
        return container;
    }

    if (subtotal < FREE_DELIVERY_MINIMUM) {
        const remaining = FREE_DELIVERY_MINIMUM - subtotal;

        const label = document.createElement('span');
        label.className = 'free-delivery-label';
        label.textContent = `Faltam ${formatCurrencyBRL(remaining)} para frete grátis!`;

        const progress = document.createElement('div');
        progress.className = 'free-delivery-progress';

        const bar = document.createElement('div');
        bar.className = 'free-delivery-progress-bar';
        const percentage = Math.min((subtotal / FREE_DELIVERY_MINIMUM) * 100, 100);
        bar.style.width = `${percentage}%`;

        progress.appendChild(bar);
        container.append(label, progress);
    } else {
        const label = document.createElement('span');
        label.className = 'free-delivery-label free-delivery-success';
        label.textContent = '🎉 Você ganhou frete grátis!';

        container.appendChild(label);
    }

    return container;
}

function formatCurrencyBRL(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// =========================================================================
// BADGE DE PRODUTO INDISPONÍVEL
// =========================================================================

function createUnavailableBadge() {
    const badge = document.createElement('span');
    badge.className = 'product-unavailable-badge';
    badge.textContent = 'Temporariamente indisponível';
    return badge;
}

function addUnavailableOverlay(card) {
    if (!card) return;

    card.classList.add('menu-item-unavailable');

    // Badge sobre o visual
    const visual = card.querySelector('.menu-item-visual');
    if (visual) {
        visual.appendChild(createUnavailableBadge());
    }

    // Desabilitar botão
    const addBtn = card.querySelector('.add-to-cart');
    if (addBtn) {
        addBtn.disabled = true;
        addBtn.textContent = 'Indisponível';
        addBtn.classList.add('button-disabled');
    }

}

// =========================================================================
// FEEDBACK DE AÇÕES
// =========================================================================

function showActionFeedback(message, type = 'success') {
    showToast(message, type);
}

function createProcessingOrderState(orderNumber, currentStatus, nextSteps) {
    const container = document.createElement('div');
    container.className = 'order-processing-state';

    const statusIcon = document.createElement('div');
    statusIcon.className = 'order-processing-icon';
    statusIcon.textContent = getStatusIcon(currentStatus);

    const statusText = document.createElement('div');
    statusText.className = 'order-processing-text';

    const current = document.createElement('strong');
    current.textContent = currentStatus;

    const description = document.createElement('span');
    description.textContent = getStatusDescription(currentStatus);

    statusText.append(current, description);

    container.append(statusIcon, statusText);

    if (nextSteps && nextSteps.length) {
        const nextStepsList = document.createElement('ul');
        nextStepsList.className = 'order-next-steps';

        const nextTitle = document.createElement('li');
        nextTitle.className = 'order-next-steps-title';
        nextTitle.textContent = 'Próximas etapas:';

        nextStepsList.appendChild(nextTitle);

        nextSteps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            nextStepsList.appendChild(li);
        });

        container.appendChild(nextStepsList);
    }

    return container;
}

function getStatusIcon(status) {
    const icons = {
        'Pedido recebido': '📥',
        'Pagamento confirmado': '💳',
        'Preparando pedido': '👨‍🍳',
        'Saiu para entrega': '🚚',
        'Entregue': '✅'
    };
    return icons[status] || '📦';
}

function getStatusDescription(status) {
    const descriptions = {
        'Pedido recebido': 'Restaurante recebeu a solicitação e está analisando.',
        'Pagamento confirmado': 'Pagamento aprovado. Seu pedido entrará na fila de preparo.',
        'Preparando pedido': 'Nossa cozinha está preparando seu pedido com todo cuidado.',
        'Saiu para entrega': 'Seu pedido está a caminho. Fique atento!',
        'Entregue': 'Pedido entregue. Bom apetite!'
    };
    return descriptions[status] || 'Acompanhe o status do seu pedido.';
}

// =========================================================================
// NAVEGAÇÃO ENTRE ETAPAS
// =========================================================================

function setupCheckoutNavigation() {
    const checkoutForm = document.getElementById('checkout-form');
    const cartPanel = document.querySelector('.cart-panel');

    if (!checkoutForm) return;

    // Ao adicionar ao carrinho, highlight no painel do carrinho
    document.addEventListener('cart:update', () => {
        if (cartPanel) highlightElement(cartPanel, 'panel-highlight');
        // Recriar botão de checkout quando o carrinho mudar
        createGoToCheckoutButton();
    });

    // Criar botão inicial
    createGoToCheckoutButton();
}

function createGoToCheckoutButton() {
    const cartPanel = document.querySelector('.cart-panel');
    if (!cartPanel) return;

    // Remover botão existente
    const existingBtn = document.getElementById('go-to-checkout-btn');
    if (existingBtn) existingBtn.remove();

    // Verificar se há itens no carrinho
    const cartCount = document.getElementById('cart-count');
    const isCartEmpty = cartCount && cartCount.textContent.trim().startsWith('0');
    if (isCartEmpty) return;

    const goToCheckoutBtn = document.createElement('button');
    goToCheckoutBtn.id = 'go-to-checkout-btn';
    goToCheckoutBtn.className = 'button button-primary go-to-checkout-btn';
    goToCheckoutBtn.type = 'button';
    goToCheckoutBtn.textContent = 'Ir para o checkout →';

    goToCheckoutBtn.addEventListener('click', () => {
        smoothScrollTo('#checkout');
        const checkoutSection = document.getElementById('checkout');
        if (checkoutSection) highlightElement(checkoutSection, 'section-highlight');
    });

    cartPanel.appendChild(goToCheckoutBtn);
}

// =========================================================================
// GESTÃO DE FOCO E ACESSIBILIDADE
// =========================================================================

function setupFocusManagement() {
    // Foco no primeiro campo inválido ao submeter formulário
    document.addEventListener('submit', event => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;

        const invalidField = form.querySelector(':invalid');
        if (invalidField) {
            setTimeout(() => {
                invalidField.focus();
                invalidField.classList.add('field-invalid-shake');
                setTimeout(() => invalidField.classList.remove('field-invalid-shake'), 500);
            }, 100);
        }
    }, true);
}

// =========================================================================
// ANIMAÇÕES DE ENTRADA EM MASSA
// =========================================================================

function setupEntranceAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('entrance-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.page-section, .order-area').forEach(section => {
        section.classList.add('entrance-animate');
        observer.observe(section);
    });
}

// =========================================================================
// SETUP
// =========================================================================

function setupUX() {
    setupCheckoutNavigation();
    setupFocusManagement();
    setupEntranceAnimations();
}

export {
    setupUX,
    smoothScrollTo,
    addPopAnimation,
    highlightElement,
    createEnhancedCartEmptyState,
    createFreeDeliveryBar,
    createUnavailableBadge,
    addUnavailableOverlay,
    showActionFeedback,
    createProcessingOrderState,
    FREE_DELIVERY_MINIMUM
};
