// layout.js - Header e Footer globais compartilhados entre todas as páginas
// Fase 31 - Arquitetura Multi-Páginas
import { showToast } from './ui.js';
import { resolvePagePath } from './base-path.js';

// =========================================================================
// CONSTANTES
// =========================================================================
const CART_STORAGE_KEY = 'fastlanche_cart';
const PROFILE_STORAGE_KEY = 'fastlanche_user_profile';
const CLAIM_STORAGE_KEY = 'fastlanche_admin_claim';
const SESSION_STORAGE_KEY = 'fastlanche_session';

// =========================================================================
// UTILITÁRIOS
// =========================================================================
function isStorageAvailable() {
    try {
        return typeof window !== 'undefined' && Boolean(window.localStorage);
    } catch {
        return false;
    }
}

function safeParse(json, fallback) {
    try {
        const parsed = JSON.parse(json);
        return parsed || fallback;
    } catch {
        return fallback;
    }
}

function getCurrentPage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    return path;
}

function getInitials(name) {
    if (!name || !String(name).trim()) return '?';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getCartFromStorage() {
    if (!isStorageAvailable()) return { items: [] };
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return { items: [] };
    const parsed = safeParse(stored, { items: [] });
    return Array.isArray(parsed?.items) ? parsed : { items: [] };
}

function getProfileFromStorage() {
    if (!isStorageAvailable()) return null;
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!stored) return null;
    return safeParse(stored, null);
}

function getClaimFromStorage() {
    if (!isStorageAvailable()) return null;
    const stored = localStorage.getItem(CLAIM_STORAGE_KEY);
    if (!stored) return null;
    return safeParse(stored, null);
}

function getSessionFromStorage() {
    if (!isStorageAvailable()) return null;
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    return safeParse(stored, null);
}

function getCartItemCount() {
    const cart = getCartFromStorage();
    return cart.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

function isUserLoggedIn() {
    const session = getSessionFromStorage();
    return Boolean(session?.email);
}

function isUserAdmin() {
    const claim = getClaimFromStorage();
    return claim?.isAdmin === true && claim?.claimStatus === 'approved';
}

// =========================================================================
// HEADER GLOBAL
// =========================================================================
function createHeader() {
    const header = document.createElement('header');
    header.className = 'site-header';

    const container = document.createElement('div');
    container.className = 'container header-layout';

    // Row principal (logo + toggle)
    const headerRow = document.createElement('div');
    headerRow.className = 'header-row';

    const brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = resolvePagePath('index.html');
    brand.setAttribute('aria-label', 'Fast Lanche - inicio');
    brand.textContent = 'Fast Lanche';

    const navToggle = document.createElement('button');
    navToggle.className = 'nav-toggle';
    navToggle.id = 'nav-toggle';
    navToggle.type = 'button';
    navToggle.setAttribute('aria-label', 'Abrir menu');
    navToggle.setAttribute('aria-expanded', 'false');

    for (let i = 0; i < 3; i++) {
        const bar = document.createElement('span');
        bar.className = 'nav-toggle-bar';
        navToggle.appendChild(bar);
    }

    headerRow.append(brand, navToggle);

    // Navegação principal
    const nav = document.createElement('nav');
    nav.className = 'main-nav';
    nav.id = 'main-nav';
    nav.setAttribute('aria-label', 'Navegacao principal');

    const navLinks = [
        { href: 'index.html', label: 'Home', page: 'index.html' },
        { href: 'cardapio.html', label: 'Cardapio', page: 'cardapio.html' },
        { href: 'reservas.html', label: 'Reservas', page: 'reservas.html' },
        { href: 'feedbacks.html', label: 'Feedbacks', page: 'feedbacks.html' }
    ];

    const currentPage = getCurrentPage();

    navLinks.forEach(link => {
        const a = document.createElement('a');
        a.href = resolvePagePath(link.href);
        a.textContent = link.label;
        if (link.page === currentPage) {
            a.classList.add('active');
            a.setAttribute('aria-current', 'page');
        }
        nav.appendChild(a);
    });

    // Container do perfil (avatar + dropdown)
    const profileContainer = document.createElement('div');
    profileContainer.id = 'profile-header-container';
    profileContainer.className = 'profile-header-container';

    // Container do carrinho
    const cartContainer = document.createElement('div');
    cartContainer.className = 'cart-header-container';

    const cartLink = document.createElement('a');
    cartLink.className = 'cart-header-link';
    cartLink.href = resolvePagePath('carrinho.html');
    cartLink.setAttribute('aria-label', 'Ver carrinho');
    cartLink.setAttribute('title', 'Carrinho');

    const cartIcon = document.createElement('span');
    cartIcon.className = 'cart-header-icon';
    cartIcon.textContent = '🛒';

    const cartBadge = document.createElement('span');
    cartBadge.className = 'cart-header-badge';
    cartBadge.id = 'cart-header-badge';
    cartBadge.textContent = '0';

    cartLink.append(cartIcon, cartBadge);
    cartContainer.appendChild(cartLink);

    // Botão de login (quando deslogado)
    const loginContainer = document.createElement('div');
    loginContainer.id = 'login-header-container';
    loginContainer.className = 'login-header-container';

    container.append(headerRow, nav, profileContainer, cartContainer, loginContainer);

    header.appendChild(container);
    return header;
}

// =========================================================================
// FOOTER GLOBAL
// =========================================================================
function createFooter() {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';

    const container = document.createElement('div');
    container.className = 'container footer-layout';

    const brandInfo = document.createElement('div');
    brandInfo.className = 'footer-brand-info';

    const brand = document.createElement('strong');
    brand.textContent = 'Fast Lanche';

    const tagline = document.createElement('small');
    tagline.textContent = 'Delivery fast e reservas.';

    brandInfo.append(brand, tagline);

    // Links de navegação
    const navLinks = document.createElement('nav');
    navLinks.className = 'footer-nav';
    navLinks.setAttribute('aria-label', 'Links do rodape');

    const links = [
        { href: 'index.html', label: 'Home' },
        { href: 'cardapio.html', label: 'Cardapio' },
        { href: 'reservas.html', label: 'Reservas' },
        { href: 'feedbacks.html', label: 'Feedbacks' }
    ];

    links.forEach(link => {
        const a = document.createElement('a');
        a.href = resolvePagePath(link.href);
        a.textContent = link.label;
        navLinks.appendChild(a);
    });

    // Horário de funcionamento
    const hours = document.createElement('div');
    hours.className = 'footer-hours';

    const hoursTitle = document.createElement('small');
    hoursTitle.className = 'footer-hours-title';
    hoursTitle.textContent = 'Horario de funcionamento';

    const hoursText = document.createElement('span');
    hoursText.textContent = 'Seg a Dom: 11:00 - 23:00';

    hours.append(hoursTitle, hoursText);

    // Redes sociais (placeholder)
    const social = document.createElement('div');
    social.className = 'footer-social';

    const socialTitle = document.createElement('small');
    socialTitle.textContent = 'Redes sociais';

    const socialLinks = document.createElement('div');
    socialLinks.className = 'footer-social-links';

    const socialItems = [
        { label: 'Instagram', icon: '📷', href: '#' },
        { label: 'Facebook', icon: '📘', href: '#' },
        { label: 'WhatsApp', icon: '💬', href: '#' }
    ];

    socialItems.forEach(item => {
        const a = document.createElement('a');
        a.href = item.href;
        a.className = 'footer-social-link';
        a.setAttribute('aria-label', item.label);
        a.setAttribute('title', item.label);
        a.textContent = item.icon;
        socialLinks.appendChild(a);
    });

    social.append(socialTitle, socialLinks);

    const copyright = document.createElement('small');
    copyright.className = 'footer-copyright';
    copyright.textContent = '© 2026 Fast Lanche. Todos os direitos reservados.';

    container.append(brandInfo, navLinks, hours, social, copyright);
    footer.appendChild(container);
    return footer;
}

// =========================================================================
// ATUALIZAÇÃO DO HEADER
// =========================================================================
function updateCartBadge() {
    const badge = document.getElementById('cart-header-badge');
    if (!badge) return;

    const count = getCartItemCount();
    badge.textContent = String(count);
    badge.classList.toggle('has-items', count > 0);
}

function updateLoginButton() {
    const container = document.getElementById('login-header-container');
    if (!container) return;

    container.replaceChildren();

    if (isUserLoggedIn()) return; // Logado: avatar é exibido no profile container

    const loginBtn = document.createElement('a');
    loginBtn.className = 'nav-link-btn login-header-btn';
    loginBtn.href = resolvePagePath('login.html');
    loginBtn.textContent = 'Entrar';
    loginBtn.setAttribute('aria-label', 'Fazer login');
    container.appendChild(loginBtn);
}

// =========================================================================
// DROPDOWN DE PERFIL
// =========================================================================
let dropdownCleanup = null;

function createProfileDropdown(anchor) {
    if (dropdownCleanup) {
        dropdownCleanup();
        dropdownCleanup = null;
    }

    const profile = getProfileFromStorage();
    const claim = getClaimFromStorage();
    const session = getSessionFromStorage();
    const isAdmin = isUserAdmin();

    const dropdown = document.createElement('div');
    dropdown.className = 'profile-dropdown';

    // Header do dropdown
    const header = document.createElement('div');
    header.className = 'profile-dropdown-header';

    const avatarSmall = document.createElement('div');
    avatarSmall.className = 'profile-dropdown-avatar';

    if (profile?.avatar) {
        const img = document.createElement('img');
        img.src = profile.avatar;
        img.alt = profile.name || 'Avatar';
        avatarSmall.appendChild(img);
    } else {
        avatarSmall.textContent = getInitials(profile?.name || session?.name || '');
    }

    const nameInfo = document.createElement('div');
    nameInfo.className = 'profile-dropdown-name-info';

    const nameEl = document.createElement('strong');
    nameEl.textContent = profile?.name || session?.name || 'Visitante';

    const roleEl = document.createElement('span');
    roleEl.className = 'profile-dropdown-role';
    roleEl.textContent = isAdmin
        ? 'Administrador do restaurante'
        : claim?.claimStatus === 'pending'
            ? 'Admin (solicitação pendente)'
            : 'Cliente';

    nameInfo.append(nameEl, roleEl);
    header.append(avatarSmall, nameInfo);
    dropdown.appendChild(header);

    // Lista de opções
    const list = document.createElement('div');
    list.className = 'profile-dropdown-list';

    // Meu Perfil
    const profileItem = createDropdownItem('Meu Perfil', '👤', () => {
        closeDropdown();
        window.location.href = resolvePagePath('perfil.html');
    });
    list.appendChild(profileItem);

    // Meus Pedidos
    const ordersItem = createDropdownItem('Meus Pedidos', '📦', () => {
        closeDropdown();
        import('./user-navigation.js').then(({ openMyOrdersModal }) => {
            openMyOrdersModal();
        });
    });
    list.appendChild(ordersItem);

    // Acompanhar Pedido
    const trackItem = createDropdownItem('Acompanhar Pedido', '🚚', () => {
        closeDropdown();
        import('./order-tracking.js').then(({ openTrackSearchModal }) => {
            openTrackSearchModal();
        });
    });
    list.appendChild(trackItem);

    // Meus Comprovantes
    const receiptsItem = createDropdownItem('Meus Comprovantes', '🧾', () => {
        closeDropdown();
        import('./receipt.js').then(({ openReceiptsListModal }) => {
            openReceiptsListModal();
        });
    });
    list.appendChild(receiptsItem);

    // Status da Solicitação (se pendente)
    if (claim?.claimStatus === 'pending') {
        const statusItem = createDropdownItem('Status da Solicitação', '⏳', () => {
            closeDropdown();
            import('./user-navigation.js').then(({ openClaimStatusModal }) => {
                openClaimStatusModal();
            });
        });
        list.appendChild(statusItem);
    } else if (claim?.claimStatus === 'rejected') {
        const statusItem = createDropdownItem('Reenviar Solicitação', '📝', () => {
            closeDropdown();
            import('./admin-claim.js').then(({ openClaimFormModal }) => {
                openClaimFormModal();
            });
        });
        list.appendChild(statusItem);
    }

    // Painel Admin (se admin aprovado)
    if (isAdmin) {
        const adminItem = createDropdownItem('Painel Admin', '🛠️', () => {
            closeDropdown();
            import('./admin.js').then(({ openAdminPanel }) => {
                openAdminPanel();
            });
        });
        list.appendChild(adminItem);
    }

    // Solicitar Admin (se nenhuma solicitação)
    if (!claim || claim.claimStatus === 'none') {
        const claimItem = createDropdownItem('Solicitar Admin', '🏪', () => {
            closeDropdown();
            import('./admin-claim.js').then(({ openClaimFormModal }) => {
                openClaimFormModal();
            });
        });
        list.appendChild(claimItem);
    }

    // Separador
    const separator = document.createElement('div');
    separator.className = 'profile-dropdown-separator';
    list.appendChild(separator);

    // Sair
    const logoutItem = createDropdownItem('Sair', '🚪', () => {
        closeDropdown();
        handleLogout();
    });
    list.appendChild(logoutItem);

    dropdown.appendChild(list);

    // Posicionar dropdown
    document.body.appendChild(dropdown);
    const rect = anchor.getBoundingClientRect();
    const dropdownWidth = 260;
    const viewportPadding = 12;

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - dropdownWidth - viewportPadding;
    }
    left = Math.max(viewportPadding, left);

    dropdown.style.top = `${rect.bottom + 8}px`;
    dropdown.style.left = `${left}px`;

    // Animação de entrada
    requestAnimationFrame(() => {
        dropdown.classList.add('open');
    });

    // Fechar ao clicar fora
    const handleClickOutside = (event) => {
        if (!dropdown.contains(event.target) && !anchor.contains(event.target)) {
            closeDropdown();
        }
    };

    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            closeDropdown();
        }
    };

    const handleScroll = () => closeDropdown();
    const handleResize = () => closeDropdown();

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    dropdownCleanup = () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEsc);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        dropdown.remove();
        dropdownCleanup = null;
    };

    return dropdown;
}

function createDropdownItem(label, icon, onClick) {
    const item = document.createElement('button');
    item.className = 'profile-dropdown-item';
    item.type = 'button';

    const iconEl = document.createElement('span');
    iconEl.className = 'profile-dropdown-item-icon';
    iconEl.textContent = icon;

    const labelEl = document.createElement('span');
    labelEl.className = 'profile-dropdown-item-label';
    labelEl.textContent = label;

    item.append(iconEl, labelEl);
    item.addEventListener('click', onClick);
    return item;
}

function closeDropdown() {
    if (dropdownCleanup) {
        dropdownCleanup();
        dropdownCleanup = null;
    }
}

function handleLogout() {
    if (!isStorageAvailable()) return;

    // Confirmar logout
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalActions = document.getElementById('modal-actions');

    if (!modalOverlay || !modalTitle || !modalBody || !modalActions) return;

    const content = document.createElement('div');
    content.className = 'logout-modal-content';

    const icon = document.createElement('div');
    icon.className = 'logout-modal-icon';
    icon.textContent = '👋';

    const text = document.createElement('p');
    text.className = 'logout-modal-text';
    text.textContent = 'Deseja realmente sair da sua conta? Seus dados de perfil serão mantidos, mas você será deslogado.';

    content.append(icon, text);

    modalTitle.textContent = 'Sair da conta';
    modalBody.replaceChildren(content);
    modalActions.replaceChildren();

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'button button-primary';
    confirmBtn.type = 'button';
    confirmBtn.textContent = 'Sair';
    confirmBtn.addEventListener('click', () => {
        try {
            localStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (error) {
            console.warn('Erro ao limpar sessão.', error);
        }

        // Atualizar estado global
        import('./app-state.js').then(({ refreshAppState, dispatchAppStateUpdate }) => {
            refreshAppState();
            dispatchAppStateUpdate();
        });

        modalOverlay.classList.remove('active');
        modalOverlay.classList.add('closing');
        document.body.style.overflow = '';
        setTimeout(() => modalOverlay.classList.remove('closing'), 300);

        showToast('Você saiu da sua conta.', 'info');

        // Recarregar página para resetar todos os estados
        setTimeout(() => window.location.reload(), 600);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'button button-secondary';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
        modalOverlay.classList.add('closing');
        document.body.style.overflow = '';
        setTimeout(() => modalOverlay.classList.remove('closing'), 300);
    });
    modalActions.append(confirmBtn, cancelBtn);

    modalOverlay.classList.remove('closing');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const modalClose = document.getElementById('modal-close');
    modalClose.onclick = () => {
        modalOverlay.classList.remove('active');
        modalOverlay.classList.add('closing');
        document.body.style.overflow = '';
        setTimeout(() => modalOverlay.classList.remove('closing'), 300);
    };
    modalOverlay.onclick = (event) => {
        if (event.target === modalOverlay) {
            modalOverlay.classList.remove('active');
            modalOverlay.classList.add('closing');
            document.body.style.overflow = '';
            setTimeout(() => modalOverlay.classList.remove('closing'), 300);
        }
    };
}

// =========================================================================
// ATUALIZAÇÃO DO AVATAR NO HEADER
// =========================================================================
function updateProfileAvatar() {
    const container = document.getElementById('profile-header-container');
    if (!container) return;

    container.replaceChildren();

    if (!isUserLoggedIn()) return;

    const profile = getProfileFromStorage();
    const isAdmin = isUserAdmin();

    // Badge de admin
    if (isAdmin) {
        const adminBadge = document.createElement('span');
        adminBadge.className = 'profile-admin-badge';
        adminBadge.textContent = 'ADM';
        adminBadge.setAttribute('aria-label', 'Administrador');
        container.appendChild(adminBadge);
        container.classList.add('has-admin');
    } else {
        container.classList.remove('has-admin');
    }

    // Botão avatar
    const avatarBtn = document.createElement('button');
    avatarBtn.className = 'profile-avatar-btn';
    avatarBtn.type = 'button';
    avatarBtn.setAttribute('aria-label', 'Menu do usuário');
    avatarBtn.setAttribute('aria-haspopup', 'true');
    avatarBtn.setAttribute('aria-expanded', 'false');

    if (profile?.avatar) {
        const img = document.createElement('img');
        img.className = 'profile-avatar-img';
        img.src = profile.avatar;
        img.alt = profile.name || 'Avatar do usuário';
        avatarBtn.appendChild(img);
    } else {
        const initials = document.createElement('span');
        initials.className = 'profile-avatar-initials';
        initials.textContent = getInitials(profile?.name || '');
        avatarBtn.appendChild(initials);
    }

    if (profile?.name) {
        avatarBtn.setAttribute('title', profile.name);
    }

    avatarBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = dropdownCleanup !== null;
        if (isOpen) {
            closeDropdown();
        } else {
            createProfileDropdown(avatarBtn);
            avatarBtn.setAttribute('aria-expanded', 'true');
        }
    });

    container.appendChild(avatarBtn);
}

// =========================================================================
// NAVEGAÇÃO MOBILE
// =========================================================================
function setupNavToggle() {
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('main-nav');

    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('open');
        toggle.classList.toggle('active');
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    });

    const closeNav = () => {
        nav.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menu');
    };

    nav.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && nav.classList.contains('open')) {
            closeNav();
        }
    });
}

// =========================================================================
// SETUP DO LAYOUT
// =========================================================================
function setupLayout() {
    // Inserir header no início do body
    const header = createHeader();
    document.body.insertBefore(header, document.body.firstChild);

    // Inserir footer no final do body (antes dos scripts)
    const footer = createFooter();
    document.body.appendChild(footer);

    // Configurar navegação mobile
    setupNavToggle();

    // Atualizar contador do carrinho
    updateCartBadge();

    // Atualizar botão de login
    updateLoginButton();

    // Atualizar avatar do perfil
    updateProfileAvatar();

    // Escutar atualizações do carrinho
    document.addEventListener('cart:update', () => {
        updateCartBadge();
    });

    // Escutar atualizações do estado global
    document.addEventListener('appstate:update', () => {
        updateProfileAvatar();
        updateLoginButton();
    });

    // Escutar mudanças no localStorage (entre abas/páginas)
    window.addEventListener('storage', (event) => {
        if (event.key === CART_STORAGE_KEY) {
            updateCartBadge();
        }
        if (event.key === PROFILE_STORAGE_KEY || event.key === SESSION_STORAGE_KEY || event.key === CLAIM_STORAGE_KEY) {
            updateProfileAvatar();
            updateLoginButton();
        }
    });
}

// =========================================================================
// EXPORTS
// =========================================================================
export {
    setupLayout,
    updateCartBadge,
    updateProfileAvatar,
    updateLoginButton,
    getCartItemCount,
    isUserLoggedIn,
    isUserAdmin,
    getCurrentPage,
    closeDropdown
};