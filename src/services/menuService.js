// Adapter temporario do catalogo legado; a interface depende apenas deste service.
import { menuItems } from '../../js/menu-store.js';
import { getProductImagePath } from '../../js/product-images.js';
import { readJSON } from './storage/safeStorage.js';

export { getProductImagePath };
export async function getMenuItems() { return menuItems; }
export async function getCategories() { return [...new Set(menuItems.map(item => item.category))]; }
export async function getMenuItem(id) { return menuItems.find(item => item.id === Number(id)) || null; }

// Status de funcionamento gravado pelo admin legado (`"open"`/`"closed"`). Leitura segura: valor invalido = aberto.
export const RESTAURANT_STATUS_KEY = 'fastlanche_restaurant_status';
export function isRestaurantClosed() { return readJSON(RESTAURANT_STATUS_KEY, 'open', value => typeof value === 'string') === 'closed'; }
