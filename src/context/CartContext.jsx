import { createContext, useContext, useMemo, useState } from 'react';
import { addProduct, getCart, persistCart } from '../services/cartService.js';
import { normalizeCart } from '../utils/businessRules.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(getCart);
  const update = items => setCart(persistCart(normalizeCart(items)));
  const value = useMemo(() => ({
    cart,
    add: product => setCart(persistCart(addProduct(cart, product))),
    increment: id => update(cart.items.map(item => item.id === id ? { ...item, quantity: Math.min(item.quantity + 1, item.maxQuantity) } : item)),
    decrement: id => update(cart.items.filter(item => item.id !== id || item.quantity > 1).map(item => item.id === id ? { ...item, quantity: item.quantity - 1 } : item)),
    remove: id => update(cart.items.filter(item => item.id !== id)),
    clear: () => update([])
  }), [cart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
