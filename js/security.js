// security.js - Seguridad Inicial (Fase 29)
// Módulo de sanitización de entradas y protección contra XSS
// Centraliza la validación y limpieza de datos de formularios

// =========================================================================
// SANITIZACIÓN DE TEXTO
// =========================================================================

/**
 * Escapa caracteres HTML peligrosos para prevenir XSS
 */
function escapeHtml(value) {
    const amp = String.fromCharCode(38);
    const replacements = {
        '&': amp + 'amp;',
        '<': amp + 'lt;',
        '>': amp + 'gt;',
        '"': amp + 'quot;',
        "'": amp + '#039;'
    };
    return String(value || '').replace(/[&<>"']/g, char => replacements[char]);
}

/**
 * Sanitiza texto plano: elimina tags HTML y caracteres de control
 */
function sanitizeText(value, maxLength = 500) {
    let text = String(value || '')
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
        .replace(/<[^>]*>/g, '')          // Elimina tags HTML
        .replace(/[\u0000-\u001F\u007F]/g, '') // Elimina caracteres de control
        .replace(/\s+/g, ' ')              // Normaliza espacios
        .trim();

    if (maxLength > 0 && text.length > maxLength) {
        text = text.substring(0, maxLength);
    }

    return text;
}

/**
 * Sanitiza un nombre (solo letras, números, espacios y acentos)
 */
function sanitizeName(value, maxLength = 80) {
    let name = sanitizeText(value, maxLength);
    // Permite letras Unicode, números, espaços, hífens e apóstrofos.
    name = name.replace(/[^\p{L}0-9\s\-']/gu, '');
    return name.trim();
}

/**
 * Sanitiza un email
 */
function sanitizeEmail(value, maxLength = 120) {
    let email = sanitizeText(value, maxLength);
    email = email.replace(/[^a-zA-Z0-9._%+\-@]/g, '');
    return email.toLowerCase();
}

/**
 * Sanitiza un teléfono (solo dígitos, espacios, paréntesis y guiones)
 */
function sanitizePhone(value, maxLength = 20) {
    let phone = sanitizeText(value, maxLength);
    phone = phone.replace(/[^0-9\s()\-+]/g, '');
    return phone.trim();
}

/**
 * Sanitiza una dirección
 */
function sanitizeAddress(value, maxLength = 200) {
    let address = sanitizeText(value, maxLength);
    address = address.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,#\-/]/g, '');
    return address.trim();
}

/**
 * Sanitiza un documento (CPF/CNPJ) - solo dígitos y puntos
 */
function sanitizeDocument(value, maxLength = 18) {
    let doc = sanitizeText(value, maxLength);
    doc = doc.replace(/[^0-9.\-]/g, '');
    return doc.trim();
}

/**
 * Sanitiza un comentario/observación (permite más caracteres)
 */
function sanitizeComment(value, maxLength = 1000) {
    let comment = sanitizeText(value, maxLength);
    // Preserva emojis, incluindo variation selectors e conectores de sequencias.
    comment = comment.replace(/[^\p{L}\p{N}\p{Extended_Pictographic}\uFE0F\u200D\s.,!?;:'"()\-_@#€$%&*+=/\\[\]{}|~^`<>]/gu, '');
    return comment.trim();
}

// =========================================================================
// VALIDACIÓN DE FORMATOS
// =========================================================================

/**
 * Valida formato de email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(email || '').trim());
}

/**
 * Valida formato de teléfono brasileño (10-11 dígitos)
 */
function isValidPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
}

/**
 * Valida formato de CPF (11 dígitos) o CNPJ (14 dígitos)
 */
function isValidDocument(document) {
    const digits = String(document || '').replace(/\D/g, '');
    return digits.length === 11 || digits.length === 14;
}

/**
 * Valida que un texto tenga longitud mínima
 */
function hasMinLength(value, minLength) {
    return String(value || '').trim().length >= minLength;
}

/**
 * Valida que un número esté dentro de un rango
 */
function isInRange(value, min, max) {
    const num = Number(value);
    return Number.isFinite(num) && num >= min && num <= max;
}

// =========================================================================
// SANITIZACIÓN DE OBJETOS
// =========================================================================

/**
 * Sanitiza los datos del checkout
 */
function sanitizeCheckoutData(data) {
    return {
        name: sanitizeName(data.name, 80),
        phone: sanitizePhone(data.phone, 20),
        address: sanitizeAddress(data.address, 200),
        document: sanitizeDocument(data.document, 18),
        paymentMethod: sanitizeText(data.paymentMethod, 20)
    };
}

/**
 * Sanitiza los datos del perfil de usuario
 */
function sanitizeProfileData(data) {
    return {
        name: sanitizeName(data.name, 80),
        email: sanitizeEmail(data.email, 120),
        phone: sanitizePhone(data.phone, 20),
        address: sanitizeAddress(data.address, 200)
    };
}

/**
 * Sanitiza los datos del admin claim
 */
function sanitizeClaimData(data) {
    return {
        restaurantName: sanitizeName(data.restaurantName, 80),
        address: sanitizeAddress(data.address, 200),
        phone: sanitizePhone(data.phone, 20),
        description: sanitizeComment(data.description, 500),
        openingOpen: sanitizeText(data.openingOpen, 5),
        openingClose: sanitizeText(data.openingClose, 5)
    };
}

/**
 * Sanitiza los datos del feedback
 */
function sanitizeFeedbackData(data) {
    return {
        name: sanitizeName(data.name, 80),
        comment: sanitizeComment(data.comment, 1000),
        rating: Math.min(Math.max(Number(data.rating) || 1, 1), 5)
    };
}

/**
 * Sanitiza los datos de la reserva
 */
function sanitizeBookingData(data) {
    return {
        date: sanitizeText(data.date, 10),
        time: sanitizeText(data.time, 5),
        guests: Math.min(Math.max(Number(data.guests) || 2, 1), 12)
    };
}

// =========================================================================
// PROTECCIÓN DE DATOS EN LOCALSTORAGE
// =========================================================================

/**
 * Lee y parsea datos de localStorage de forma segura
 */
function safeGetItem(key, fallback = null) {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return fallback;
        return JSON.parse(stored);
    } catch {
        return fallback;
    }
}

/**
 * Guarda datos en localStorage de forma segura
 */
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

/**
 * Elimina una clave de localStorage de forma segura
 */
function safeRemoveItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

// =========================================================================
// VALIDACIÓN DE ENTRADA PARA FORMULARIOS
// =========================================================================

/**
 * Valida los datos del checkout y devuelve errores
 */
function validateCheckoutInput(data) {
    const errors = [];
    const sanitized = sanitizeCheckoutData(data);

    if (!hasMinLength(sanitized.name, 3)) {
        errors.push('Informe seu nome completo.');
    }

    if (!isValidPhone(sanitized.phone)) {
        errors.push('Informe um telefone valido.');
    }

    if (!hasMinLength(sanitized.address, 8)) {
        errors.push('Informe um endereco de entrega valido.');
    }

    if (!sanitized.paymentMethod) {
        errors.push('Selecione uma forma de pagamento.');
    }

    if (sanitized.document && !isValidDocument(sanitized.document)) {
        errors.push('CPF/CNPJ deve ter 11 ou 14 digitos.');
    }

    return {
        isValid: errors.length === 0,
        errors,
        sanitized
    };
}

/**
 * Valida los datos del perfil y devuelve errores
 */
function validateProfileInput(data) {
    const errors = [];
    const sanitized = sanitizeProfileData(data);

    if (!hasMinLength(sanitized.name, 3)) {
        errors.push('O nome deve ter pelo menos 3 caracteres.');
    }

    if (sanitized.email && !isValidEmail(sanitized.email)) {
        errors.push('Informe um e-mail valido.');
    }

    if (sanitized.phone && !isValidPhone(sanitized.phone)) {
        errors.push('Informe um telefone valido com DDD.');
    }

    if (sanitized.address && !hasMinLength(sanitized.address, 8)) {
        errors.push('Informe um endereco valido.');
    }

    return {
        isValid: errors.length === 0,
        errors,
        sanitized
    };
}

/**
 * Valida los datos del admin claim y devuelve errores
 */
function validateClaimInput(data) {
    const errors = [];
    const sanitized = sanitizeClaimData(data);

    if (!hasMinLength(sanitized.restaurantName, 3)) {
        errors.push('Nome do restaurante deve ter pelo menos 3 caracteres.');
    }

    if (!hasMinLength(sanitized.address, 10)) {
        errors.push('Endereco deve ter pelo menos 10 caracteres.');
    }

    if (!isValidPhone(sanitized.phone)) {
        errors.push('Telefone deve ter formato valido com DDD.');
    }

    if (!sanitized.openingOpen || !sanitized.openingClose) {
        errors.push('Horario de funcionamento e obrigatorio.');
    } else if (sanitized.openingOpen >= sanitized.openingClose) {
        errors.push('Horario de abertura deve ser anterior ao fechamento.');
    }

    if (!hasMinLength(sanitized.description, 10)) {
        errors.push('Descricao do restaurante e obrigatoria.');
    }

    return {
        isValid: errors.length === 0,
        errors,
        sanitized
    };
}

/**
 * Valida los datos del feedback y devuelve errores
 */
function validateFeedbackInput(data) {
    const errors = [];
    const sanitized = sanitizeFeedbackData(data);

    if (!hasMinLength(sanitized.name, 2)) {
        errors.push('Por favor, insira seu nome.');
    }

    if (!isInRange(sanitized.rating, 1, 5)) {
        errors.push('A nota deve ser entre 1 e 5.');
    }

    if (!hasMinLength(sanitized.comment, 10)) {
        errors.push('O comentario deve conter pelo menos 10 caracteres.');
    }

    return {
        isValid: errors.length === 0,
        errors,
        sanitized
    };
}

// =========================================================================
// EXPORTS
// =========================================================================

export {
    escapeHtml,
    sanitizeText,
    sanitizeName,
    sanitizeEmail,
    sanitizePhone,
    sanitizeAddress,
    sanitizeDocument,
    sanitizeComment,
    isValidEmail,
    isValidPhone,
    isValidDocument,
    hasMinLength,
    isInRange,
    sanitizeCheckoutData,
    sanitizeProfileData,
    sanitizeClaimData,
    sanitizeFeedbackData,
    sanitizeBookingData,
    safeGetItem,
    safeSetItem,
    safeRemoveItem,
    validateCheckoutInput,
    validateProfileInput,
    validateClaimInput,
    validateFeedbackInput
};
