// Fachada do cardapio (Fase 44): produtos e status do restaurante pelo repositorio (local ou API).
import { getRepository } from './repositories/index.js';

export * from './repositories/local/menuLocal.js';

const menu = () => getRepository('menu');

export const getMenuItems = () => menu().getMenuItems();
export const isRestaurantClosed = () => menu().isRestaurantClosed();
export async function getCategories() { return [...new Set((await getMenuItems()).map(item => item.category))]; }
export async function getMenuItem(id) { return (await getMenuItems()).find(item => item.id === Number(id)) || null; }
