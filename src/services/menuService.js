// Adapter temporario do catalogo legado; a interface depende apenas deste service.
import { menuItems } from '../../js/menu-store.js';

export async function getMenuItems() { return menuItems; }
export async function getCategories() { return [...new Set(menuItems.map(item => item.category))]; }
