// Cardapio (Fase 41): catalogo de src/data + alteracoes feitas pelo admin legado (chave `fastlanche_menuItems`).
// Sem dependencia de modulos legados de interface; tudo que vem do armazenamento e revalidado.
import { CUSTOMIZATION_TYPES, MENU_CATALOG } from '../../../data/menuCatalog.js';
import { getProductImagePath } from '../../../data/productImages.js';
import { FIELD_LIMITS, sanitizeDeep, sanitizeText } from '../../../utils/validation.js';
import { readArray, readJSON } from '../../storage/safeStorage.js';
import { MENU_OVERRIDES_KEY, RESTAURANT_STATUS_KEY } from '../../storage/keys.js';

export { getProductImagePath };
const CUSTOMIZATION_VALUES = Object.values(CUSTOMIZATION_TYPES);

// Produto gravado pelo admin: so campos conhecidos, texto sanitizado e numeros limitados. Invalido = ignorado.
export function normalizeMenuItem(input, base = null) {
  if (!input || typeof input !== 'object') return null;
  const id = Number(input.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const merged = { ...(base || {}), ...input };
  const price = Number(merged.price);
  const name = sanitizeText(merged.name, FIELD_LIMITS.productName);
  if (!name || !Number.isFinite(price) || price < 0) return null;
  const customization = merged.customization && typeof merged.customization === 'object' && CUSTOMIZATION_VALUES.includes(merged.customization.type)
    ? sanitizeDeep(merged.customization)
    : null;
  return {
    id,
    name,
    description: sanitizeText(merged.description, 300),
    price: Math.min(price, 10000),
    category: sanitizeText(merged.category, FIELD_LIMITS.category) || 'Outros',
    maxQuantity: Math.min(Math.max(Math.floor(Number(merged.maxQuantity)) || 10, 1), 99),
    active: merged.active !== false,
    customization
  };
}

// Catalogo + edicoes do admin (mesma regra de js/admin.js: atualiza existentes e acrescenta novos).
export function buildMenu(overrides = []) {
  const items = new Map(MENU_CATALOG.map(item => [item.id, normalizeMenuItem(item)]));
  (Array.isArray(overrides) ? overrides : []).forEach(override => {
    const next = normalizeMenuItem(override, items.get(Number(override?.id)));
    if (next) items.set(next.id, next);
  });
  return [...items.values()].filter(Boolean);
}

export async function getMenuItems() { return buildMenu(readArray(MENU_OVERRIDES_KEY)); }
export async function getCategories() { return [...new Set((await getMenuItems()).map(item => item.category))]; }
export async function getMenuItem(id) { return (await getMenuItems()).find(item => item.id === Number(id)) || null; }

// Status de funcionamento gravado pelo admin legado (`"open"`/`"closed"`). Leitura segura: valor invalido = aberto.
export function isRestaurantClosed() { return readJSON(RESTAURANT_STATUS_KEY, 'open', value => typeof value === 'string') === 'closed'; }

export { MENU_OVERRIDES_KEY, RESTAURANT_STATUS_KEY };
