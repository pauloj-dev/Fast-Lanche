// Testes da Fase 34: carrinho, limites e totais.
import * as cartModule from '../js/cart.js';

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

console.log('=== TESTE DO CARRINHO (FASE 34) ===');

cartModule.clearCart();
const item = {
  id: 9001,
  name: 'Item de teste',
  price: 20,
  maxQuantity: 2,
  image: 'assets/products/hamburguer.svg',
  active: true,
  _customization: { observation: 'Sem cebola' }
};

cartModule.addToCart(item);
assert(cartModule.cart.items.length === 1, 'Adiciona um item ao carrinho');
assert(cartModule.cart.items[0].image === item.image, 'Preserva a imagem do produto');
assert(cartModule.cart.items[0]._customization.observation === 'Sem cebola', 'Preserva a personalização');
assert(cartModule.cart.items[0].quantity === 1, 'Quantidade inicial é 1');

cartModule.incrementItem(item.id);
assert(cartModule.cart.items[0].quantity === 2, 'Incrementa a quantidade');
cartModule.incrementItem(item.id);
assert(cartModule.cart.items[0].quantity === 2, 'Respeita maxQuantity');

let totals = cartModule.calculateCartTotals();
assert(totals.subtotal === 40, 'Calcula subtotal corretamente');
assert(totals.deliveryFee === cartModule.DELIVERY_FEE, 'Aplica taxa abaixo do mínimo de frete grátis');
assert(totals.total === 46, 'Calcula total com entrega sem valores negativos');

cartModule.decrementItem(item.id);
assert(cartModule.cart.items[0].quantity === 1, 'Decrementa sem remover antes do mínimo');
cartModule.decrementItem(item.id);
assert(cartModule.cart.items.length === 0, 'Remove o item ao decrementar a quantidade mínima');

cartModule.addToCart({ ...item, price: 50 });
totals = cartModule.calculateCartTotals();
assert(totals.deliveryFee === 0, 'Isenta entrega no valor mínimo');
cartModule.clearCart();
cartModule.addToCart({ id: 9002, name: 'Combo', category: 'Combos', price: 10, active: true });
assert(cartModule.cart.items[0].image === 'assets/products/combo.svg', 'Deriva imagem para itens do cardápio');
cartModule.clearCart();
assert(cartModule.cart.total === 0 && cartModule.cart.items.length === 0, 'Limpa itens e totais');

console.log(`\n=== RESULTADO: ${passed} passaram, ${failed} falharam ===`);
process.exit(failed > 0 ? 1 : 0);
