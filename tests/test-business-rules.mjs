import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAverageRating,
  calculateDeliveryFee,
  calculateSubtotal,
  calculateTotal,
  normalizeCart,
  validateBooking,
  validateCheckout,
  validateFeedback
} from '../src/utils/businessRules.js';

test('cart totals preserve the existing delivery threshold', () => {
  const subtotal = calculateSubtotal([{ price: 16.9, quantity: 2 }]);
  assert.equal(subtotal, 33.8);
  assert.equal(calculateDeliveryFee(subtotal), 6);
  assert.equal(calculateTotal(subtotal, 6), 39.8);
  assert.equal(calculateDeliveryFee(50), 0);
  assert.equal(calculateTotal(-10, 0), 0);
});

test('stored cart is normalized and quantity respects item maximum', () => {
  assert.deepEqual(normalizeCart([{ id: 1, name: 'Item', price: -2, quantity: 20, maxQuantity: 4 }]), {
    items: [{ id: 1, name: 'Item', price: 0, quantity: 4, maxQuantity: 4 }],
    subtotal: 0,
    deliveryFee: 0,
    total: 0
  });
});

test('checkout and booking validations reject invalid input', () => {
  assert.ok(validateCheckout({ name: '', email: 'invalido', phone: '123', address: '', payment: '' }, 0).length >= 5);
  assert.ok(validateBooking('2020-01-01', '10:00', 13, new Date(2024, 0, 1)).length >= 3);
  assert.deepEqual(validateBooking('2024-01-02', '12:00', 2, new Date(2024, 0, 1)), []);
});

test('feedback validation and average rating are deterministic', () => {
  assert.ok(validateFeedback({ name: 'A', rating: 5, comment: 'curto' }).length > 0);
  assert.deepEqual(validateFeedback({ name: 'Ana', rating: 5, comment: 'Muito bom mesmo' }), []);
  assert.equal(calculateAverageRating([{ rating: 5 }, { rating: 3 }]), 4);
  assert.equal(calculateAverageRating([]), 0);
});
