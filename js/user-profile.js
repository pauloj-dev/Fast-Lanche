// user-profile.js - Sistema de Perfil de Usuário
// Fase 23 - Gerencia dados pessoais, avatar e preferências do usuário
import { validateProfileInput, sanitizeProfileData } from './security.js';

const STORAGE_KEY = 'fastlanche_user_profile';

const DEFAULT_PROFILE = {
    name: '',
    email: '',
    phone: '',
    address: '',
    avatar: '', // Base64 da imagem
    preferences: {
        paymentMethod: '',
        notifications: true,
        theme: 'light'
    },
    createdAt: null,
    updatedAt: null
};

let currentProfile = { ...DEFAULT_PROFILE };

// ============================================
// UTILITÁRIOS
// ============================================

function isStorageAvailable() {
    try {
        return typeof window !== 'undefined' && Boolean(window.localStorage);
    } catch (error) {
        console.warn('localStorage indisponivel para perfil.', error);
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

// ============================================
// PERSISTÊNCIA
// ============================================

function saveProfile() {
    if (!isStorageAvailable()) return false;
    try {
        currentProfile.updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentProfile));
        syncUserRecord();
        return true;
    } catch (error) {
        console.warn('Nao foi possivel salvar o perfil.', error);
        return false;
    }
}

// O login (legado e React) recria o perfil a partir de fastlanche_users: sem esta copia as alteracoes
// feitas aqui sumiriam no proximo login. Senha/hash e campos extras do cadastro sao preservados.
function syncUserRecord() {
    const email = normalizeText(currentProfile.email).toLowerCase();
    if (!email) return;
    const users = JSON.parse(localStorage.getItem('fastlanche_users') || '[]');
    if (!Array.isArray(users)) return;
    const updated = users.map(user => (user && normalizeText(user.email).toLowerCase() === email
        ? { ...user, name: currentProfile.name, phone: currentProfile.phone, address: currentProfile.address, avatar: currentProfile.avatar, preferences: currentProfile.preferences, updatedAt: currentProfile.updatedAt }
        : user));
    localStorage.setItem('fastlanche_users', JSON.stringify(updated));
}

function loadProfile() {
    if (!isStorageAvailable()) return false;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return false;

        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== 'object') return false;

        // Merge com dados default para garantir estrutura completa
        currentProfile = {
            ...DEFAULT_PROFILE,
            ...parsed,
            preferences: {
                ...DEFAULT_PROFILE.preferences,
                ...(parsed.preferences || {})
            }
        };
        return true;
    } catch (error) {
        console.warn('Nao foi possivel carregar o perfil.', error);
        currentProfile = { ...DEFAULT_PROFILE };
        return false;
    }
}

// ============================================
// GETTERS / SETTERS
// ============================================

function getProfile() {
    return { ...currentProfile };
}

function getProfileName() {
    return currentProfile.name || '';
}

function getProfileAvatar() {
    return currentProfile.avatar || '';
}

function isProfileComplete() {
    return Boolean(
        normalizeText(currentProfile.name) &&
        normalizeText(currentProfile.phone) &&
        normalizeText(currentProfile.address)
    );
}

function dispatchAppStateSync() {
    const event = new CustomEvent('appstate:update', {
        detail: { profile: getProfile() }
    });
    document.dispatchEvent(event);
}

function updateProfile(data) {
    // Sanitizar datos con el módulo de seguridad
    const sanitized = sanitizeProfileData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || ''
    });

    currentProfile.name = sanitized.name;
    currentProfile.email = sanitized.email;
    currentProfile.phone = sanitized.phone;
    currentProfile.address = sanitized.address;

    if (data.preferences) {
        currentProfile.preferences = {
            ...currentProfile.preferences,
            ...data.preferences
        };
    }

    if (!currentProfile.createdAt) {
        currentProfile.createdAt = new Date().toISOString();
    }

    saveProfile();
    dispatchProfileUpdate();
    dispatchAppStateSync();
    return getProfile();
}

function updateAvatar(avatarBase64) {
    currentProfile.avatar = avatarBase64 || '';
    saveProfile();
    dispatchProfileUpdate();
    dispatchAppStateSync();
}

function removeAvatar() {
    currentProfile.avatar = '';
    saveProfile();
    dispatchProfileUpdate();
    dispatchAppStateSync();
}

// ============================================
// EVENTO PERSONALIZADO
// ============================================

function dispatchProfileUpdate() {
    const event = new CustomEvent('profile:update', {
        detail: { profile: getProfile() }
    });
    document.dispatchEvent(event);
}

// ============================================
// HEADER AVATAR
// ============================================

function createHeaderAvatar() {
    const avatar = document.createElement('button');
    avatar.className = 'profile-avatar-btn';
    avatar.type = 'button';
    avatar.setAttribute('aria-label', 'Meu Perfil');
    avatar.setAttribute('title', 'Meu Perfil');
    return avatar;
}

function updateHeaderAvatar() {
    // O header (avatar + dropdown) é renderizado pelo user-navigation.js
    // para integrar perfil e admin claim. Esta função apenas dispara
    // o evento de atualização do estado global para que a navegação
    // atualize o avatar com os dados mais recentes.
    const event = new CustomEvent('profile:update', {
        detail: { profile: getProfile() }
    });
    document.dispatchEvent(event);
}

// ============================================
// MODAL DE PERFIL
// ============================================

const PAYMENT_PREFERENCES = [
    { value: 'pix', icon: '⚡', label: 'Pix', hint: 'Na hora' },
    { value: 'card', icon: '💳', label: 'Cartão', hint: 'Crédito/débito' },
    { value: 'cash', icon: '💵', label: 'Dinheiro', hint: 'Na entrega' },
    { value: '', icon: '🤔', label: 'Depois', hint: 'No checkout' }
];

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function createField({ id, label, type = 'text', value = '', full = false, hint = '', attrs = {} }) {
    const field = createElement('label', `field${full ? ' field-full' : ''}`);
    field.htmlFor = id;
    field.appendChild(createElement('span', '', label));
    const input = document.createElement('input');
    input.id = id;
    input.type = type;
    input.value = value || '';
    Object.entries(attrs).forEach(([key, attrValue]) => input.setAttribute(key, attrValue));
    field.appendChild(input);
    if (hint) field.appendChild(createElement('small', 'profile-modal-hint', hint));
    return { field, input };
}

function createModalSection(icon, title) {
    const section = createElement('section', 'profile-modal-section');
    const heading = createElement('h4', 'profile-modal-section-title');
    heading.appendChild(createElement('span', 'profile-modal-section-icon', icon));
    heading.appendChild(document.createTextNode(title));
    section.appendChild(heading);
    return section;
}

function createProfileModalContent() {
    const profile = getProfile();

    const wrapper = createElement('div', 'profile-modal-content');

    // --- Topo: avatar, nome e acoes da foto ---
    const hero = createElement('div', 'profile-modal-hero');

    const avatarPreview = createElement('div', 'profile-avatar-preview profile-modal-avatar');
    avatarPreview.id = 'profile-avatar-preview';

    const initials = createElement('span', 'profile-avatar-initials-large', getInitials(profile.name));
    initials.id = 'profile-avatar-initials';

    const avatarImg = createElement('img', 'profile-avatar-img-large');
    avatarImg.id = 'profile-avatar-img';
    avatarImg.alt = 'Foto do perfil';

    // Botao de camera sobre o avatar: o proprio label abre o seletor de arquivo.
    const cameraLabel = createElement('label', 'profile-modal-camera');
    cameraLabel.title = 'Alterar foto';
    cameraLabel.setAttribute('aria-label', 'Alterar foto');
    cameraLabel.appendChild(createElement('span', '', '📷'));
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/webp,image/gif';
    fileInput.className = 'sr-only';
    cameraLabel.appendChild(fileInput);

    avatarPreview.append(avatarImg, initials, cameraLabel);

    const identity = createElement('div', 'profile-modal-identity');
    const heroName = createElement('strong', 'profile-modal-name', profile.name || 'Seu perfil');
    const heroEmail = createElement('span', 'profile-modal-email', profile.email || '');
    identity.append(heroName, heroEmail);

    const avatarActions = createElement('div', 'profile-avatar-actions profile-modal-avatar-actions');
    const uploadLabel = createElement('label', 'profile-modal-pill');
    uploadLabel.textContent = profile.avatar ? 'Trocar foto' : 'Adicionar foto';
    uploadLabel.htmlFor = 'profile-avatar-file';
    const pillInput = fileInput.cloneNode();
    pillInput.id = 'profile-avatar-file';
    uploadLabel.appendChild(pillInput);

    const removeBtn = createElement('button', 'profile-modal-pill profile-modal-pill-ghost', 'Remover');
    removeBtn.type = 'button';

    avatarActions.append(uploadLabel, removeBtn);

    const showAvatar = (src) => {
        const hasAvatar = Boolean(src);
        avatarImg.src = hasAvatar ? src : '';
        avatarImg.style.display = hasAvatar ? 'block' : 'none';
        initials.style.display = hasAvatar ? 'none' : 'flex';
        removeBtn.hidden = !hasAvatar;
        uploadLabel.firstChild.textContent = hasAvatar ? 'Trocar foto' : 'Adicionar foto';
    };
    showAvatar(profile.avatar);

    const handleFile = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
            import('./ui.js').then(({ showToast }) => showToast('Use uma imagem PNG, JPG, WEBP ou GIF.', 'error'));
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            import('./ui.js').then(({ showToast }) => showToast('A imagem deve ter no maximo 2MB.', 'error'));
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result;
            if (typeof base64 === 'string') {
                updateAvatar(base64);
                showAvatar(base64);
            }
        };
        reader.readAsDataURL(file);
    };
    fileInput.addEventListener('change', handleFile);
    pillInput.addEventListener('change', handleFile);

    removeBtn.addEventListener('click', () => {
        removeAvatar();
        initials.textContent = getInitials(getProfileName());
        showAvatar('');
    });

    hero.append(avatarPreview, identity, avatarActions);
    wrapper.appendChild(hero);

    // --- Informações pessoais ---
    const infoSection = createModalSection('👤', 'Informações pessoais');
    const fields = createElement('div', 'profile-fields');

    const { field: nameField, input: nameInput } = createField({
        id: 'profile-name', label: 'Nome completo', value: profile.name, full: true,
        attrs: { autocomplete: 'name', minlength: '3', maxlength: '80', required: '' }
    });
    nameInput.addEventListener('input', () => {
        heroName.textContent = nameInput.value.trim() || 'Seu perfil';
        initials.textContent = getInitials(nameInput.value);
    });

    // O e-mail identifica a conta (sessao e cadastro): nao e editavel por aqui.
    const { field: emailField, input: emailInput } = createField({
        id: 'profile-email', label: 'E-mail da conta 🔒', type: 'email', value: profile.email,
        hint: 'Identifica sua conta.', attrs: { readonly: '' }
    });

    const { field: phoneField, input: phoneInput } = createField({
        id: 'profile-phone', label: 'Telefone', type: 'tel', value: profile.phone,
        attrs: { autocomplete: 'tel', inputmode: 'tel', maxlength: '15', placeholder: '(00) 00000-0000' }
    });

    fields.append(nameField, emailField, phoneField);
    infoSection.appendChild(fields);
    wrapper.appendChild(infoSection);

    // --- Endereço ---
    const addressSection = createModalSection('📍', 'Endereço padrão');
    const { field: addressField, input: addressInput } = createField({
        id: 'profile-address', label: 'Endereço de entrega', value: profile.address, full: true,
        attrs: { autocomplete: 'street-address', maxlength: '200', placeholder: 'Rua, número, bairro' }
    });
    addressSection.appendChild(addressField);
    wrapper.appendChild(addressSection);

    // --- Preferências ---
    const prefsSection = createModalSection('⚙️', 'Preferências');

    const paymentGroup = createElement('fieldset', 'payment-options profile-modal-payments');
    paymentGroup.appendChild(createElement('legend', '', 'Pagamento preferido'));
    PAYMENT_PREFERENCES.forEach(opt => {
        const option = createElement('label', 'payment-option');
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'profile-payment';
        radio.value = opt.value;
        radio.checked = (profile.preferences.paymentMethod || '') === opt.value;
        option.append(radio, createElement('span', 'payment-option-icon', opt.icon), createElement('span', '', opt.label), createElement('small', '', opt.hint));
        paymentGroup.appendChild(option);
    });
    // Mantem a mesma interface (paymentSelect.value) usada no salvamento.
    const paymentSelect = {
        get value() { return paymentGroup.querySelector('input:checked')?.value || ''; }
    };
    prefsSection.appendChild(paymentGroup);

    const notifField = createElement('label', 'account-switch');
    notifField.htmlFor = 'profile-notifications';
    const notifText = createElement('span', 'account-switch-text');
    notifText.append(createElement('strong', '', 'Notificações de pedidos'), createElement('small', '', 'Avisos quando o status mudar.'));
    const notifInput = document.createElement('input');
    notifInput.type = 'checkbox';
    notifInput.id = 'profile-notifications';
    notifInput.setAttribute('role', 'switch');
    notifInput.checked = profile.preferences.notifications !== false;
    notifField.append(notifText, notifInput, createElement('span', 'account-switch-track'));
    prefsSection.appendChild(notifField);
    wrapper.appendChild(prefsSection);

    // --- Feedback ---
    const feedback = createElement('p', 'form-feedback');
    feedback.id = 'profile-feedback';
    feedback.setAttribute('aria-live', 'polite');
    wrapper.appendChild(feedback);

    return { wrapper, nameInput, emailInput, phoneInput, addressInput, paymentSelect, notifInput, feedback };
}

function openProfileModal() {
    // Usar o modal global já existente
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalActions = document.getElementById('modal-actions');
    const modalClose = document.getElementById('modal-close');

    if (!modalOverlay || !modalTitle || !modalBody || !modalActions) return;

    // Salvar referência para fechar
    const closeHandler = () => {
        modalOverlay.classList.remove('active');
        modalOverlay.classList.add('closing');
        document.body.style.overflow = '';
        setTimeout(() => modalOverlay.classList.remove('closing'), 300);
    };

    // Criar conteúdo
    const { wrapper, nameInput, emailInput, phoneInput, addressInput, paymentSelect, notifInput, feedback } = createProfileModalContent();

    modalTitle.textContent = 'Meu Perfil';
    modalBody.replaceChildren(wrapper);
    modalActions.replaceChildren();

    // Botão salvar
    const saveBtn = document.createElement('button');
    saveBtn.className = 'button button-primary';
    saveBtn.textContent = 'Salvar alterações';
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (name.length < 3) {
            feedback.textContent = 'O nome deve ter pelo menos 3 caracteres.';
            feedback.dataset.status = 'error';
            return;
        }

        const phone = phoneInput.value.trim();
        const phoneDigits = phone.replace(/\D/g, '');
        if (phone && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
            feedback.textContent = 'Informe um telefone valido com DDD.';
            feedback.dataset.status = 'error';
            return;
        }

        const address = addressInput.value.trim();
        if (address && address.length < 8) {
            feedback.textContent = 'Informe um endereco valido.';
            feedback.dataset.status = 'error';
            return;
        }

        updateProfile({
            name,
            email: emailInput.value.trim(),
            phone,
            address,
            preferences: {
                paymentMethod: paymentSelect.value,
                notifications: notifInput.checked,
                theme: 'light'
            }
        });

        feedback.textContent = 'Perfil salvo com sucesso!';
        feedback.dataset.status = 'success';

        // Atualizar iniciais se mudou nome
        const initialsEl = document.getElementById('profile-avatar-initials');
        const avatarImg = document.getElementById('profile-avatar-img');
        if (initialsEl && avatarImg) {
            initialsEl.textContent = getInitials(name);
            if (!getProfileAvatar()) {
                avatarImg.style.display = 'none';
                initialsEl.style.display = 'flex';
            }
        }

        // Importar showToast dinamicamente
        import('./ui.js').then(({ showToast }) => {
            showToast('Perfil salvo com sucesso!', 'success');
        });

        setTimeout(closeHandler, 800);
    });

    modalActions.appendChild(saveBtn);

    // Botão cancelar
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'button button-secondary';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', closeHandler);
    modalActions.appendChild(cancelBtn);

    // Abrir modal
    modalOverlay.classList.remove('closing');
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Fechar ao clicar no X
    modalClose.onclick = closeHandler;

    // Fechar ao clicar fora
    modalOverlay.onclick = (event) => {
        if (event.target === modalOverlay) closeHandler();
    };

    // Fechar com ESC
    const escHandler = (event) => {
        if (event.key === 'Escape') {
            closeHandler();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// ============================================
// SETUP
// ============================================

function setupUserProfile() {
    // Carregar perfil salvo
    loadProfile();

    // O header (avatar + dropdown) é renderizado pelo user-navigation.js
    // para integrar perfil e admin claim. Esta função apenas garante que
    // o container exista no DOM.
    const headerLayout = document.querySelector('.header-layout');
    if (!headerLayout) return;

    let container = document.getElementById('profile-header-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'profile-header-container';
        container.className = 'profile-header-container';
        // Inserir antes da nav ou depois do header-row
        const nav = document.getElementById('main-nav');
        if (nav) {
            headerLayout.insertBefore(container, nav);
        } else {
            headerLayout.appendChild(container);
        }
    }
}

// ============================================
// API PÚBLICA PARA CHECKOUT
// ============================================

function getProfileDataForCheckout() {
    const profile = getProfile();
    return {
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        paymentMethod: profile.preferences.paymentMethod
    };
}

export {
    setupUserProfile,
    getProfile,
    getProfileName,
    getProfileAvatar,
    getProfileDataForCheckout,
    isProfileComplete,
    updateProfile,
    updateAvatar,
    removeAvatar,
    openProfileModal,
    getInitials
};