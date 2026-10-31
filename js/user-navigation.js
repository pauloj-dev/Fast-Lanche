// user-navigation.js - Navegação integrada de usuário
// Fase 25 - Dropdown de perfil, meus pedidos, painel admin, status de solicitação

import { showToast, closeModal } from './ui.js';
import { getAppState } from './app-state.js';

// ============================================
// CONSTANTES
// ============================================

const ORDERS_STORAGE_KEY = 'fastlanche_orders';
const RECEIPTS_STORAGE_KEY = 'fastlanche_receipts';
const PROFILE_STORAGE_KEY = 'fastlanche_user_profile';
const SESSION_STORAGE_KEY = 'fastlanche_session';
const CLAIM_STORAGE_KEY = 'fastlanche_admin_claim';

// ============================================
// UTILITÁRIOS
// ============================================

function isStorageAvailable() {
    try {
        return typeof window !== 'undefined' && Boolean(window.localStorage);
    } catch {
        return false;
    }
}

function normalizeText(value) {
    return String(value || '').trim();
}

function getInitials(name) {
    if (!name || !normalizeText(name)) return '?';
    const parts = normalizeText(name).split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getProfileFromStorage() {
    if (!isStorageAvailable()) return null;
    try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

function getClaimFromStorage() {
    if (!isStorageAvailable()) return null;
    try {
        const stored = localStorage.getItem(CLAIM_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

function loadOrders() {
    if (!isStorageAvailable()) return [];
    try {
        const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function loadReceipts() {
    if (!isStorageAvailable()) return [];
    try {
        const stored = localStorage.getItem(RECEIPTS_STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

// ============================================
// DROPDOWN DE PERFIL
// ============================================

let dropdownCleanup = null;

function createProfileDropdown(anchor) {
    // Remove dropdown anterior se existir
    if (dropdownCleanup) {
        dropdownCleanup();
        dropdownCleanup = null;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'profile-dropdown';

    // Header do dropdown
    const profile = getProfileFromStorage();
    const claim = getClaimFromStorage();
    const state = getAppState();

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
        avatarSmall.textContent = getInitials(profile?.name || '');
    }

    const nameInfo = document.createElement('div');
    nameInfo.className = 'profile-dropdown-name-info';

    const nameEl = document.createElement('strong');
    nameEl.textContent = profile?.name || 'Visitante';

    const roleEl = document.createElement('span');
    roleEl.className = 'profile-dropdown-role';
    roleEl.textContent = state.isAdminApproved
        ? 'Administrador do restaurante'
        : state.claimStatus === 'pending'
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
        import('./user-profile.js').then(({ openProfileModal }) => {
            openProfileModal();
        });
    });
    list.appendChild(profileItem);

    // Meus Pedidos
    const ordersItem = createDropdownItem('Meus Pedidos', '📦', () => {
        closeDropdown();
        openMyOrdersModal();
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

    // Status da Solicitação (se pendente ou rejeitada)
    if (state.claimStatus === 'pending') {
        const statusItem = createDropdownItem('Status da Solicitação', '⏳', () => {
            closeDropdown();
            openClaimStatusModal();
        });
        list.appendChild(statusItem);
    } else if (state.claimStatus === 'rejected') {
        const statusItem = createDropdownItem('Reenviar Solicitação', '📝', () => {
            closeDropdown();
            import('./admin-claim.js').then(({ openClaimFormModal }) => {
                openClaimFormModal();
            });
        });
        list.appendChild(statusItem);
    }

    // Painel Admin (se admin aprovado)
    if (state.isAdminApproved) {
        const adminItem = createDropdownItem('Painel Admin', '🛠️', () => {
            closeDropdown();
            import('./admin.js').then(({ openAdminPanel }) => {
                openAdminPanel();
            });
        });
        list.appendChild(adminItem);
    }

    // Solicitar Admin (se nenhuma solicitação)
    if (state.claimStatus === 'none') {
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

    // Fechar com ESC
    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            closeDropdown();
        }
    };

    // Fechar ao scroll ou redimensionar
    const handleScroll = () => closeDropdown();
    const handleResize = () => closeDropdown();

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Cleanup
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
        // Simular logout: limpar perfil e admin claim
        try {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem(PROFILE_STORAGE_KEY);
            localStorage.removeItem(CLAIM_STORAGE_KEY);
        } catch (error) {
            console.warn('Erro ao limpar dados de sessão.', error);
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
    cancelBtn.addEventListener('click', closeModal);
    modalActions.append(confirmBtn, cancelBtn);

    modalOverlay.classList.remove('closing');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const modalClose = document.getElementById('modal-close');
    modalClose.onclick = closeModal;
    modalOverlay.onclick = (event) => {
        if (event.target === modalOverlay) closeModal();
    };
}

// ============================================
// MEUS PEDIDOS
// ============================================

function openMyOrdersModal() {
    const state = getAppState();
    const profile = getProfileFromStorage();

    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalActions = document.getElementById('modal-actions');

    if (!modalOverlay || !modalTitle || !modalBody || !modalActions) return;

    const orders = loadOrders();
    const receipts = loadReceipts();

    // Determinar pedidos do usuário: por nome do perfil ou pedidos sem vínculo específico
    let userOrders = orders;
    if (profile?.name) {
        const profileName = normalizeText(profile.name).toLowerCase();
        const linkedOrders = orders.filter(order =>
            normalizeText(order.customerName || '').toLowerCase() === profileName ||
            order.userEmail === profile.email
        );
        if (linkedOrders.length) {
            userOrders = linkedOrders;
        }
    }

    const content = document.createElement('div');
    content.className = 'my-orders-content';

    if (!userOrders.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = '<span class="empty-state-icon">📦</span><span class="empty-state-text">Nenhum pedido encontrado.</span>';
        content.appendChild(empty);
    } else {
        const list = document.createElement('div');
        list.className = 'my-orders-list';

        userOrders.forEach(order => {
            const card = document.createElement('button');
            card.className = 'my-order-card';
            card.type = 'button';

            const cardHeader = document.createElement('div');
            cardHeader.className = 'my-order-card-header';

            const orderNumber = document.createElement('strong');
            orderNumber.textContent = order.orderNumber;

            const status = document.createElement('span');
            status.className = `my-order-status my-order-status--${getStatusClass(order.status)}`;
            status.textContent = order.status;

            cardHeader.append(orderNumber, status);

            const cardMeta = document.createElement('div');
            cardMeta.className = 'my-order-card-meta';

            const date = document.createElement('span');
            date.textContent = new Date(order.createdAt).toLocaleString('pt-BR');

            const total = document.createElement('span');
            total.className = 'my-order-card-total';
            total.textContent = order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            cardMeta.append(date, total);
            card.append(cardHeader, cardMeta);

            card.addEventListener('click', () => {
                import('./order-tracking.js').then(({ openTrackingModal }) => {
                    closeModal();
                    setTimeout(() => openTrackingModal(order), 300);
                });
            });

            list.appendChild(card);
        });

        content.appendChild(list);
    }

    modalTitle.textContent = 'Meus Pedidos';
    modalBody.replaceChildren(content);
    modalActions.replaceChildren();

    const closeBtn = document.createElement('button');
    closeBtn.className = 'button button-primary';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Fechar';
    closeBtn.addEventListener('click', closeModal);
    modalActions.appendChild(closeBtn);

    modalOverlay.classList.remove('closing');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const modalClose = document.getElementById('modal-close');
    modalClose.onclick = closeModal;
    modalOverlay.onclick = (event) => {
        if (event.target === modalOverlay) closeModal();
    };
}

function getStatusClass(status) {
    if (status === 'Entregue') return 'delivered';
    if (status === 'Saiu para entrega') return 'out';
    if (status === 'Preparando pedido') return 'preparing';
    if (status === 'Pagamento confirmado') return 'payment';
    return 'received';
}

// ============================================
// STATUS DA SOLICITAÇÃO
// ============================================

function openClaimStatusModal() {
    const state = getAppState();
    const claim = getClaimFromStorage();

    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalActions = document.getElementById('modal-actions');

    if (!modalOverlay || !modalTitle || !modalBody || !modalActions) return;

    const content = document.createElement('div');
    content.className = 'claim-status-content';

    const statusBadge = document.createElement('div');
    statusBadge.className = `claim-status-badge claim-status-badge--${state.claimStatus}`;
    statusBadge.textContent = state.claimStatus === 'pending'
        ? '⏳ Aguardando aprovação'
        : state.claimStatus === 'approved'
            ? '✅ Aprovado'
            : '❌ Rejeitado';

    content.appendChild(statusBadge);

    const description = document.createElement('p');
    description.className = 'claim-status-description';
    if (state.claimStatus === 'pending') {
        description.textContent = 'Sua solicitação de administrador está em análise. Assim que for aprovada, você terá acesso ao painel administrativo.';
    } else if (state.claimStatus === 'rejected') {
        description.textContent = claim?.rejectedReason || 'Sua solicitação foi rejeitada. Corrija os dados e reenvie.';
    }
    content.appendChild(description);

    // Dados do restaurante
    if (claim?.adminData) {
        const dataCard = document.createElement('div');
        dataCard.className = 'claim-status-data-card';

        const dataTitle = document.createElement('h4');
        dataTitle.className = 'claim-status-data-title';
        dataTitle.textContent = 'Dados da solicitação';
        dataCard.appendChild(dataTitle);

        const dataList = document.createElement('dl');
        dataList.className = 'claim-status-data-list';

        addDataRow(dataList, 'Restaurante', claim.adminData.restaurantName || '-');
        addDataRow(dataList, 'Endereço', claim.adminData.address || '-');
        addDataRow(dataList, 'Telefone', claim.adminData.phone || '-');
        addDataRow(dataList, 'Horário', claim.adminData.openingHours
            ? `${claim.adminData.openingHours.open || '-'} às ${claim.adminData.openingHours.close || '-'}`
            : '-');

        dataCard.appendChild(dataList);
        content.appendChild(dataCard);
    }

    if (state.claimStatus === 'pending') {
        const note = document.createElement('p');
        note.className = 'claim-status-note';
        note.textContent = 'O botão "Admin" no menu ficará habilitado após a aprovação.';
        content.appendChild(note);
    }

    modalTitle.textContent = 'Status da Solicitação';
    modalBody.replaceChildren(content);
    modalActions.replaceChildren();

    const closeBtn = document.createElement('button');
    closeBtn.className = 'button button-primary';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Fechar';
    closeBtn.addEventListener('click', closeModal);
    modalActions.appendChild(closeBtn);

    modalOverlay.classList.remove('closing');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const modalClose = document.getElementById('modal-close');
    modalClose.onclick = closeModal;
    modalOverlay.onclick = (event) => {
        if (event.target === modalOverlay) closeModal();
    };
}

function addDataRow(container, label, value) {
    const row = document.createElement('div');
    row.className = 'claim-status-data-row';
    row.innerHTML = `<dt>${label}</dt><dd>${value}</dd>`;
    container.appendChild(row);
}

// ============================================
// SETUP
// ============================================

function setupUserNavigation() {
    // Importar app-state para garantir sincronização
    import('./app-state.js').then(({ setupAppState, refreshAppState, dispatchAppStateUpdate }) => {
        setupAppState();
    });

    // Ouvir atualizações do estado global para reintegrar o header
    document.addEventListener('appstate:update', () => {
        updateHeaderForUserState();
    });

    // Atualizar header no setup
    updateHeaderForUserState();
}

/**
 * Atualiza o header conforme o estado do usuário.
 * - Cliente: avatar + dropdown
 * - Admin: avatar + dropdown com Painel Admin
 * - Pendente: avatar + dropdown com Status da Solicitação
 */
function updateHeaderForUserState() {
    const container = document.getElementById('profile-header-container');
    if (!container) return;

    const state = getAppState();
    const profile = getProfileFromStorage();

    // Limpar container
    container.replaceChildren();

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

    // Tooltip com nome
    if (profile?.name) {
        avatarBtn.setAttribute('title', profile.name);
    }

    // Badge de admin (indicador visual)
    if (state.isAdminApproved) {
        const adminBadge = document.createElement('span');
        adminBadge.className = 'profile-admin-badge';
        adminBadge.textContent = 'ADM';
        adminBadge.setAttribute('aria-label', 'Administrador');
        container.appendChild(adminBadge);
        container.classList.add('has-admin');
    } else {
        container.classList.remove('has-admin');
    }

    // Abrir dropdown ao clicar
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

export {
    setupUserNavigation,
    updateHeaderForUserState,
    closeDropdown,
    openMyOrdersModal,
    openClaimStatusModal,
    handleLogout
};