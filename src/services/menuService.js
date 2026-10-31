// Adapter temporario do catalogo legado; a interface depende apenas deste service.
import { menuItems } from '../../js/menu-store.js';
import { getProductImagePath } from '../../js/product-images.js';

export { getProductImagePath };
export async function getMenuItems() { return menuItems; }
export async function getCategories() { return [...new Set(menuItems.map(item => item.category))]; }
export async function getMenuItem(id) { return menuItems.find(item => item.id === Number(id)) || null; }
