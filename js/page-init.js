// page-init.js - Inicialização por página (Fase 31 - Arquitetura Multi-Páginas)
// Cada página HTML importa este módulo e chama a função de inicialização correspondente
import { setupLayout } from './layout.js';
import { setupAppState } from './app-state.js';
import { setupUX } from './ux.js';

// =========================================================================
// UTILITÁRIOS
// =========================================================================
function getCurrentPage() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    return path;
}

function setupCommon() {
    // Layout global (header + footer)
    setupLayout();

    // Estado global
    setupAppState();

    // UX global
    setupUX();
}

// =========================================================================
// PÁGINA HOME (index.html)
// =========================================================================
async function initHome() {
    setupCommon();

    // Importar módulos específicos da Home
    const [{ renderMenu, updateVisibleItems, setupRestaurantStatusListener },
        { loadCart, setupCartControls },
        { setupUserProfile },
        { setupUserNavigation },
        { setupAdminClaim },
        { setupInventory },
        { setupOrderTracking },
        { setupReceipt },
        { setupAdmin }] = await Promise.all([
            import('./menu-store.js'),
            import('./cart.js'),
            import('./user-profile.js'),
            import('./user-navigation.js'),
            import('./admin-claim.js'),
            import('./inventory.js'),
            import('./order-tracking.js'),
            import('./receipt.js'),
            import('./admin.js')
        ]);

    // Inicializar módulos
    setupInventory();
    setupUserProfile();
    setupAdminClaim();
    setupUserNavigation();
    setupOrderTracking();
    setupReceipt();
    setupAdmin();
    setupRestaurantStatusListener();

    // Renderizar cardápio
    loadCart();
    setupCartControls();
    updateVisibleItems();

    // Setup de interações demo (adicionar ao carrinho)
    setupMenuInteractions();

    // Fase 32 - Página Home: produto em destaque e hero dinâmico
    import('./home.js').then(({ setupHome }) => setupHome()).catch(err => {
        console.warn('Falha ao inicializar a Home.', err);
    });
}

function setupMenuInteractions() {
    document.body.addEventListener('click', event => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const actionButton = target.closest('.add-to-cart');
        if (actionButton && !actionButton.disabled) {
            const itemId = Number(actionButton.dataset.id);
            import('./menu-store.js').then(({ menuItems }) => {
                const selectedItem = menuItems.find(item => item.id === itemId);
                if (selectedItem) {
                    import('./product-customization.js').then(({ openCustomizationModal }) => {
                        openCustomizationModal(selectedItem);
                    });
                }
            });
        }
    });
}

// =========================================================================
// PÁGINA CARDÁPIO (cardapio.html)
// =========================================================================
async function initCardapio() {
    setupCommon();

    const [{ renderMenu, updateVisibleItems, setSearchTerm, setActiveFilter, setupRestaurantStatusListener },
        { loadCart, setupCartControls },
        { setupUserProfile },
        { setupUserNavigation },
        { setupAdminClaim },
        { setupInventory },
        { setupOrderTracking },
        { setupReceipt },
        { setupAdmin }] = await Promise.all([
            import('./menu-store.js'),
            import('./cart.js'),
            import('./user-profile.js'),
            import('./user-navigation.js'),
            import('./admin-claim.js'),
            import('./inventory.js'),
            import('./order-tracking.js'),
            import('./receipt.js'),
            import('./admin.js')
        ]);

    setupInventory();
    setupUserProfile();
    setupAdminClaim();
    setupUserNavigation();
    setupOrderTracking();
    setupReceipt();
    setupAdmin();
    setupRestaurantStatusListener();

    loadCart();
    setupCartControls();
    updateVisibleItems();

    // Setup de busca e filtros
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');

    if (searchInput) {
        searchInput.addEventListener('input', event => {
            setSearchTerm(event.target.value);
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', event => {
            setActiveFilter(event.target.value);
        });
    }

    // Setup de interações demo
    setupMenuInteractions();
}

// =========================================================================
// PÁGINA CARRINHO (carrinho.html)
// =========================================================================
async function initCarrinho() {
    setupCommon();

    const [{ loadCart, setupCartControls, renderCart, clearCart, cart },
        { setupUserProfile },
        { setupUserNavigation },
        { setupAdminClaim },
        { setupInventory },
        { setupOrderTracking },
        { setupReceipt },
        { setupAdmin }] = await Promise.all([
            import('./cart.js'),
            import('./user-profile.js'),
            import('./user-navigation.js'),
            import('./admin-claim.js'),
            import('./inventory.js'),
            import('./order-tracking.js'),
            import('./receipt.js'),
            import('./admin.js')
        ]);

    setupInventory();
    setupUserProfile();
    setupAdminClaim();
    setupUserNavigation();
    setupOrderTracking();
    setupReceipt();
    setupAdmin();

    loadCart();
    setupCartControls();
    renderCart();

    // Botão limpar carrinho
    const clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            import('./ui.js').then(({ openModal, closeModal, showToast }) => {
                const bodyContent = document.createElement('div');
                bodyContent.style.cssText = 'display:grid;gap:1rem;text-align:center;';

                const icon = document.createElement('div');
                icon.style.cssText = 'font-size:2.5rem;line-height:1;';
                icon.textContent = '🗑️';

                const text = document.createElement('p');
                text.textContent = 'Deseja realmente limpar todo o carrinho?';

                bodyContent.append(icon, text);

                openModal({
                    title: 'Limpar carrinho',
                    bodyContent,
                    actions: [
                        {
                            label: 'Cancelar',
                            variant: 'button-secondary',
                            onClick: closeModal
                        },
                        {
                            label: 'Limpar',
                            variant: 'button-primary',
                            onClick: () => {
                                clearCart();
                                closeModal();
                                showToast('Carrinho limpo.', 'info');
                            }
                        }
                    ]
                });
            });
        });
    }

    const checkoutLink = document.querySelector('a[href="checkout.html"]');
    if (checkoutLink) {
        const syncCheckoutAvailability = () => {
            const hasItems = cart.items.length > 0;
            checkoutLink.toggleAttribute('aria-disabled', !hasItems);
            checkoutLink.classList.toggle('is-disabled', !hasItems);
            checkoutLink.tabIndex = hasItems ? 0 : -1;
        };
        checkoutLink.addEventListener('click', event => {
            if (!cart.items.length) {
                event.preventDefault();
                import('./ui.js').then(({ showToast }) => showToast('Adicione um item antes de finalizar o pedido.', 'info'));
            }
        });
        document.addEventListener('cart:update', syncCheckoutAvailability);
        syncCheckoutAvailability();
    }
}
// =========================================================================
// PÁGINA CHECKOUT (checkout.html)
// =========================================================================
async function initCheckout() {
    setupCommon();

    const [{ loadCart, setupCartControls, renderCart },
        { setupCheckout },
        { setupUserProfile },
        { setupUserNavigation },
        { setupAdminClaim },
        { setupInventory },
        { setupOrderTracking },
        { setupReceipt },
        { setupAdmin }] = await Promise.all([
            import('./cart.js'),
            import('./checkout.js'),
            import('./user-profile.js'),
            import('./user-navigation.js'),
            import('./admin-claim.js'),
            import('./inventory.js'),
            import('./order-tracking.js'),
            import('./receipt.js'),
            import('./admin.js')
        ]);

    setupInventory();
    setupUserProfile();
    setupAdminClaim();
    setupUserNavigation();
    setupOrderTracking();
    setupReceipt();
    setupAdmin();

    loadCart();
    setupCartControls();
    renderCart();
    setupCheckout();

    // Renderizar resumo do pedido no checkout
    renderCheckoutSummary();
}

function renderCheckoutSummary() {
    const itemsList = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const feeEl = document.getElementById('checkout-fee');
    const totalEl = document.getElementById('checkout-total');

    if (!itemsList) return;

    const render = () => {
        try {
            const stored = localStorage.getItem('fastlanche_cart');
            const cart = stored ? JSON.parse(stored) : { items: [] };
            const items = Array.isArray(cart?.items) ? cart.items : [];

            itemsList.replaceChildren();

            if (!items.length) {
                const empty = document.createElement('li');
                empty.className = 'empty-state';
                empty.innerHTML = '<span class="empty-state-icon">🛒</span><span class="empty-state-text">Seu carrinho está vazio.</span>';
                itemsList.appendChild(empty);
            } else {
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'checkout-item';

                    const name = document.createElement('span');
                    name.className = 'checkout-item-name';
                    name.textContent = `${item.quantity}x ${item.name}`;

                    const price = document.createElement('span');
                    price.className = 'checkout-item-price';
                    price.textContent = (item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                    li.append(name, price);
                    itemsList.appendChild(li);
                });
            }

            const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const deliveryFee = subtotal > 0 && subtotal < 50 ? 6 : 0;
            const total = subtotal + deliveryFee;

            if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            if (feeEl) feeEl.textContent = deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            if (totalEl) totalEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        } catch {
            // Silencioso
        }
    };

    render();

    // Atualizar quando o carrinho mudar
    document.addEventListener('cart:update', render);
    window.addEventListener('storage', (event) => {
        if (event.key === 'fastlanche_cart') render();
    });
}

// =========================================================================
// PÁGINA LOGIN (login.html)
// =========================================================================
async function initLogin() {
    setupCommon();

    const [{ setupUserProfile },
        { setupUserNavigation },
        { setupAdminClaim },
        { setupInventory },
        { setupOrderTracking },
        { setupReceipt },
        { setupAdmin }] = await Promise.all([
            import('./user-profile.js'),
            import('./user-navigation.js'),
            import('./admin-claim.js'),
            import('./inventory.js'),
            import('./order-tracking.js'),
            import('./receipt.js'),
            import('./admin.js')
        ]);

    setupInventory();
    setupUserProfile();
    setupAdminClaim();
    setupUserNavigation();
    setupOrderTracking();
    setupReceipt();
    setupAdmin();

    // Setup do formulário de login
    setupLoginForm();
}

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginFeedback = document.getElementById('login-feedback');
    const signupFeedback = document.getElementById('signup-feedback');

    // Alternar entre login e cadastro
    const showLoginBtn = document.getElementById('show-login');
    const showSignupBtn = document.getElementById('show-signup');
    const loginPanel = document.getElementById('login-panel');
    const signupPanel = document.getElementById('signup-panel');

    if (showLoginBtn && showSignupBtn && loginPanel && signupPanel) {
        showLoginBtn.addEventListener('click', () => {
            loginPanel.classList.add('active');
            signupPanel.classList.remove('active');
            showLoginBtn.classList.add('active');
            showSignupBtn.classList.remove('active');
        });

        showSignupBtn.addEventListener('click', () => {
            signupPanel.classList.add('active');
            loginPanel.classList.remove('active');
            showSignupBtn.classList.add('active');
            showLoginBtn.classList.remove('active');
        });
    }

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', event => {
            event.preventDefault();

            const formData = new FormData(loginForm);
            const email = (formData.get('email') || '').trim().toLowerCase();
            const password = formData.get('password') || '';

            if (!email || !password) {
                setFeedback(loginFeedback, 'Preencha todos os campos.', 'error');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setFeedback(loginFeedback, 'Informe um e-mail válido.', 'error');
                return;
            }

            if (password.length < 6) {
                setFeedback(loginFeedback, 'A senha deve ter no mínimo 6 caracteres.', 'error');
                return;
            }

            // Buscar usuário no localStorage
            const users = getUsersFromStorage();
            const user = users.find(u => u.email === email);

            if (!user) {
                setFeedback(loginFeedback, 'Usuário não encontrado. Verifique o e-mail ou cadastre-se.', 'error');
                return;
            }

            // Verificar senha (hash simples simulado)
            const hashedPassword = simpleHash(password);
            if (user.passwordHash !== hashedPassword) {
                setFeedback(loginFeedback, 'Senha incorreta. Tente novamente.', 'error');
                return;
            }

            // Criar sessão
            const session = {
                email: user.email,
                name: user.name,
                loginAt: new Date().toISOString()
            };

            try {
                localStorage.setItem('fastlanche_session', JSON.stringify(session));

                // Sincronizar perfil com dados do usuário
                const profile = {
                    name: user.name,
                    email: user.email,
                    phone: user.phone || '',
                    address: user.address || '',
                    avatar: user.avatar || '',
                    preferences: user.preferences || {
                        paymentMethod: '',
                        notifications: true,
                        theme: 'light'
                    },
                    createdAt: user.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('fastlanche_user_profile', JSON.stringify(profile));

                setFeedback(loginFeedback, 'Login realizado com sucesso! Redirecionando...', 'success');

                // Atualizar estado global
                import('./app-state.js').then(({ refreshAppState, dispatchAppStateUpdate }) => {
                    refreshAppState();
                    dispatchAppStateUpdate();
                });

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 800);
            } catch (error) {
                setFeedback(loginFeedback, 'Erro ao salvar sessão. Tente novamente.', 'error');
            }
        });
    }

    // Cadastro
    if (signupForm) {
        signupForm.addEventListener('submit', event => {
            event.preventDefault();

            const formData = new FormData(signupForm);
            const name = (formData.get('name') || '').trim();
            const email = (formData.get('email') || '').trim().toLowerCase();
            const password = formData.get('password') || '';
            const confirmPassword = formData.get('confirm-password') || '';
            const phone = (formData.get('phone') || '').trim();

            // Validações
            if (name.length < 3) {
                setFeedback(signupFeedback, 'O nome deve ter pelo menos 3 caracteres.', 'error');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setFeedback(signupFeedback, 'Informe um e-mail válido.', 'error');
                return;
            }

            if (password.length < 6) {
                setFeedback(signupFeedback, 'A senha deve ter no mínimo 6 caracteres.', 'error');
                return;
            }

            if (password !== confirmPassword) {
                setFeedback(signupFeedback, 'As senhas não coincidem.', 'error');
                return;
            }

            if (phone && !/^[\d\s()\-+]{10,15}$/.test(phone)) {
                setFeedback(signupFeedback, 'Informe um telefone válido.', 'error');
                return;
            }

            // Verificar se e-mail já existe
            const users = getUsersFromStorage();
            if (users.some(u => u.email === email)) {
                setFeedback(signupFeedback, 'Este e-mail já está cadastrado. Faça login.', 'error');
                return;
            }

            // Criar novo usuário
            const newUser = {
                name,
                email,
                passwordHash: simpleHash(password),
                phone,
                address: '',
                avatar: '',
                preferences: {
                    paymentMethod: '',
                    notifications: true,
                    theme: 'light'
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            users.push(newUser);

            try {
                localStorage.setItem('fastlanche_users', JSON.stringify(users));

                // Criar sessão automaticamente
                const session = {
                    email: newUser.email,
                    name: newUser.name,
                    loginAt: new Date().toISOString()
                };
                localStorage.setItem('fastlanche_session', JSON.stringify(session));

                // Criar perfil
                const profile = {
                    name: newUser.name,
                    email: newUser.email,
                    phone: newUser.phone,
                    address: '',
                    avatar: '',
                    preferences: newUser.preferences,
                    createdAt: newUser.createdAt,
                    updatedAt: newUser.updatedAt
                };
                localStorage.setItem('fastlanche_user_profile', JSON.stringify(profile));

                setFeedback(signupFeedback, 'Cadastro realizado com sucesso! Redirecionando...', 'success');

                // Atualizar estado global
                import('./app-state.js').then(({ refreshAppState, dispatchAppStateUpdate }) => {
                    refreshAppState();
                    dispatchAppStateUpdate();
                });

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 800);
            } catch (error) {
                setFeedback(signupFeedback, 'Erro ao salvar cadastro. Tente novamente.', 'error');
            }
        });
    }
}

function getUsersFromStorage() {
    try {
        const stored = localStorage.getItem('fastlanche_users');
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function simpleHash(text) {
    // Hash simples simulado (não é criptografia real, apenas para demonstração)
    let hash = 0;
    const str = String(text || '');
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'h_' + Math.abs(hash).toString(36);
}

function setFeedback(element, message, status = 'info') {
    if (!element) return;
    element.textContent = message;
    element.dataset.status = status;
}

// =========================================================================
// PÁGINA PERFIL (perfil.html)
// =========================================================================
async function initPerfil() {
    setupCommon();

    // Verificar se usuário está logado
    const { isUserLoggedIn } = await import('./layout.js');
    if (!isUserLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const [{ setupUserProfile, getProfile, updateProfile, updateAvatar, removeAvatar, getInitials },
        { setupUserNavigation },
        { setupAdminClaim },
        { setupInventory },
        { setupOrderTracking },
        { setupReceipt },
        { setupAdmin }] = await Promise.all([
            import('./user-profile.js'),
            import('./user-navigation.js'),
            import('./admin-claim.js'),
            import('./inventory.js'),
            import('./order-tracking.js'),
            import('./receipt.js'),
            import('./admin.js')
        ]);

    setupInventory();
    setupUserProfile();
    setupAdminClaim();
    setupUserNavigation();
    setupOrderTracking();
    setupReceipt();
    setupAdmin();

    // Renderizar perfil
    renderProfilePage();
}

function renderProfilePage() {
    const profile = getProfileFromStorage();

    // Preencher dados pessoais
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const phoneInput = document.getElementById('profile-phone');
    const addressInput = document.getElementById('profile-address');

    if (nameInput) nameInput.value = profile?.name || '';
    if (emailInput) emailInput.value = profile?.email || '';
    if (phoneInput) phoneInput.value = profile?.phone || '';
    if (addressInput) addressInput.value = profile?.address || '';

    // Avatar
    const avatarPreview = document.getElementById('profile-avatar-preview');
    const avatarInitials = document.getElementById('profile-avatar-initials');
    const avatarImg = document.getElementById('profile-avatar-img');

    if (avatarPreview && avatarInitials && avatarImg) {
        if (profile?.avatar) {
            avatarImg.src = profile.avatar;
            avatarImg.style.display = 'block';
            avatarInitials.style.display = 'none';
        } else {
            avatarInitials.textContent = getInitials(profile?.name || '');
            avatarImg.style.display = 'none';
            avatarInitials.style.display = 'flex';
        }
    }

    // Upload de avatar
    const avatarUpload = document.getElementById('profile-avatar-upload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', event => {
            const file = event.target.files?.[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                import('./ui.js').then(({ showToast }) => {
                    showToast('A imagem deve ter no máximo 2MB.', 'error');
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result;
                if (typeof base64 === 'string') {
                    import('./user-profile.js').then(({ updateAvatar }) => {
                        updateAvatar(base64);
                        if (avatarImg) {
                            avatarImg.src = base64;
                            avatarImg.style.display = 'block';
                            avatarInitials.style.display = 'none';
                        }
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Remover avatar
    const avatarRemove = document.getElementById('profile-avatar-remove');
    if (avatarRemove) {
        avatarRemove.addEventListener('click', () => {
            import('./user-profile.js').then(({ removeAvatar, getProfileName, getInitials }) => {
                removeAvatar();
                if (avatarImg) {
                    avatarImg.style.display = 'none';
                    avatarInitials.style.display = 'flex';
                    avatarInitials.textContent = getInitials(getProfileName());
                }
            });
        });
    }

    // Salvar perfil
    const saveBtn = document.getElementById('profile-save-btn');
    const feedback = document.getElementById('profile-feedback');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const name = nameInput?.value.trim() || '';
            const email = emailInput?.value.trim() || '';
            const phone = phoneInput?.value.trim() || '';
            const address = addressInput?.value.trim() || '';

            if (name.length < 3) {
                setFeedback(feedback, 'O nome deve ter pelo menos 3 caracteres.', 'error');
                return;
            }

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setFeedback(feedback, 'Informe um e-mail válido.', 'error');
                return;
            }

            if (phone && !/^[\d\s()\-+]{10,15}$/.test(phone)) {
                setFeedback(feedback, 'Informe um telefone válido.', 'error');
                return;
            }

            import('./user-profile.js').then(({ updateProfile }) => {
                updateProfile({
                    name,
                    email,
                    phone,
                    address,
                    preferences: {
                        paymentMethod: document.getElementById('profile-payment')?.value || '',
                        notifications: document.getElementById('profile-notifications')?.checked ?? true,
                        theme: 'light'
                    }
                });

                setFeedback(feedback, 'Perfil salvo com sucesso!', 'success');

                import('./ui.js').then(({ showToast }) => {
                    showToast('Perfil salvo com sucesso!', 'success');
                });

                // Atualizar avatar no header
                import('./layout.js').then(({ updateProfileAvatar }) => {
                    updateProfileAvatar();
                });
            });
        });
    }

    // Histórico de pedidos
    renderOrderHistory();
}

function getProfileFromStorage() {
    try {
        const stored = localStorage.getItem('fastlanche_user_profile');
        if (!stored) return null;
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

function renderOrderHistory() {
    const container = document.getElementById('profile-orders-list');
    if (!container) return;

    try {
        const stored = localStorage.getItem('fastlanche_orders');
        const orders = stored ? JSON.parse(stored) : [];
        const profile = getProfileFromStorage();

        // Filtrar pedidos do usuário
        let userOrders = orders;
        if (profile?.name) {
            const profileName = profile.name.toLowerCase();
            const linkedOrders = orders.filter(order =>
                (order.customerName || '').toLowerCase() === profileName ||
                order.userEmail === profile.email
            );
            if (linkedOrders.length) userOrders = linkedOrders;
        }

        container.replaceChildren();

        if (!userOrders.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<span class="empty-state-icon">📦</span><span class="empty-state-text">Nenhum pedido encontrado.</span>';
            container.appendChild(empty);
            return;
        }

        userOrders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'profile-order-card';

            const header = document.createElement('div');
            header.className = 'profile-order-header';

            const orderNumber = document.createElement('strong');
            orderNumber.textContent = order.orderNumber;

            const status = document.createElement('span');
            status.className = 'profile-order-status';
            status.textContent = order.status || 'Pedido recebido';

            header.append(orderNumber, status);

            const meta = document.createElement('div');
            meta.className = 'profile-order-meta';

            const date = document.createElement('span');
            try {
                date.textContent = new Date(order.createdAt).toLocaleString('pt-BR');
            } catch {
                date.textContent = order.createdAt;
            }

            const total = document.createElement('span');
            total.className = 'profile-order-total';
            total.textContent = (order.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            meta.append(date, total);

            card.append(header, meta);
            container.appendChild(card);
        });
    } catch {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = '<span class="empty-state-icon">📦</span><span class="empty-state-text">Nenhum pedido encontrado.</span>';
        container.appendChild(empty);
    }
}

// =========================================================================
// PÁGINA RESERVAS (reservas.html)
// =========================================================================
async function initReservas() {
    setupCommon();

    const [{ setupBooking },
        { setupUserProfile },
        { setupUserNavigation },
        { setupAdminClaim },
        { setupInventory },
        { setupOrderTracking },
        { setupReceipt },
        { setupAdmin }] = await Promise.all([
            import('./booking.js'),
            import('./user-profile.js'),
            import('./user-navigation.js'),
            import('./admin-claim.js'),
            import('./inventory.js'),
            import('./order-tracking.js'),
            import('./receipt.js'),
            import('./admin.js')
        ]);

    setupInventory();
    setupUserProfile();
    setupAdminClaim();
    setupUserNavigation();
    setupOrderTracking();
    setupReceipt();
    setupAdmin();
    setupBooking();
}

// =========================================================================
// PÁGINA FEEDBACKS (feedbacks.html)
// =========================================================================
async function initFeedbacks() {
    setupCommon();

    const [{ setupFeedback },
        { setupUserProfile },
        { setupUserNavigation },
        { setupAdminClaim },
        { setupInventory },
        { setupOrderTracking },
        { setupReceipt },
        { setupAdmin }] = await Promise.all([
            import('./feedback.js'),
            import('./user-profile.js'),
            import('./user-navigation.js'),
            import('./admin-claim.js'),
            import('./inventory.js'),
            import('./order-tracking.js'),
            import('./receipt.js'),
            import('./admin.js')
        ]);

    setupInventory();
    setupUserProfile();
    setupAdminClaim();
    setupUserNavigation();
    setupOrderTracking();
    setupReceipt();
    setupAdmin();
    setupFeedback();
}

// =========================================================================
// DISPATCHER
// =========================================================================
function initPage() {
    const page = getCurrentPage();

    switch (page) {
        case 'index.html':
            initHome();
            break;
        case 'cardapio.html':
            initCardapio();
            break;
        case 'carrinho.html':
            initCarrinho();
            break;
        case 'checkout.html':
            initCheckout();
            break;
        case 'login.html':
            initLogin();
            break;
        case 'perfil.html':
            initPerfil();
            break;
        case 'reservas.html':
            initReservas();
            break;
        case 'feedbacks.html':
            initFeedbacks();
            break;
        default:
            initHome();
    }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}

export { initPage };
