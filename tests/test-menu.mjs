// Testes da Página de Cardápio (Fase 33)
import * as menu from '../js/menu-store.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  ✓ ${message}`);
    } else {
        failed++;
        console.error(`  ✗ ${message}`);
    }
}

console.log('=== TESTE DA PÁGINA DE CARDÁPIO (FASE 33) ===');

const originalItems = menu.menuItems.map(item => ({ ...item }));
try {
    assert(menu.menuItems.length >= 30, 'Cardápio completo possui produtos cadastrados');
    assert(menu.menuItems.every(item => item.name && item.description && item.category),
        'Todos os produtos possuem nome, descrição e categoria');

    menu.menuItems.forEach(item => { item.active = false; });
    menu.menuItems[0].active = true;
    menu.menuItems[0].name = 'Lanche Teste';
    menu.menuItems[0].description = 'Hambúrguer artesanal';
    menu.menuItems[0].category = 'Hambúrgueres';

    menu.setSearchTerm('artesanal');
    assert(menu.getFilteredMenuItems().length === 1, 'Busca encontra nome ou descrição em tempo real');

    menu.setSearchTerm('inexistente');
    assert(menu.getFilteredMenuItems().length === 0, 'Busca sem resultados retorna lista vazia');

    menu.setSearchTerm('');
    menu.setActiveFilter('Hambúrgueres');
    assert(menu.getFilteredMenuItems().length === 1, 'Filtro por categoria funciona');

    menu.setSearchTerm('artesanal');
    assert(menu.getFilteredMenuItems().length === 1, 'Busca e categoria são combinadas');
} finally {
    menu.menuItems.forEach((item, index) => Object.assign(item, originalItems[index]));
    menu.setSearchTerm('');
    menu.setActiveFilter('all');
}

console.log(`\n=== RESULTADO: ${passed} passaram, ${failed} falharam ===`);
process.exit(failed > 0 ? 1 : 0);
