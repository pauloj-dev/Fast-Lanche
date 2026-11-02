import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addProduct, getCart, persistCart } from '../services/cartService.js';
import { normalizeCart } from '../utils/businessRules.js';
import { CART_STORAGE_KEY } from '../services/storage/cartStorage.js';
import { subscribeToStorage } from '../services/storage/storageEvents.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(getCart);
  // Mantem o carrinho sincronizado com outras abas (React ou paginas legadas).
  useEffect(() => {
    return subscribeToStorage([CART_STORAGE_KEY], () => setCart(getCart()));
  }, []);
  const value = useMemo(() => {
    const update = items => setCart(persistCart(normalizeCart(items)));
    return {
      cart,
      add: product => setCart(persistCart(addProduct(cart, product))),
      increment: lineId => update(cart.items.map(item => item.cartItemId === lineId ? { ...item, quantity: Math.min(item.quantity + 1, item.maxQuantity) } : item)),
      decrement: lineId => update(cart.items.filter(item => item.cartItemId !== lineId || item.quantity > 1).map(item => item.cartItemId === lineId ? { ...item, quantity: item.quantity - 1 } : item)),
      remove: lineId => update(cart.items.filter(item => item.cartItemId !== lineId)),
      clear: () => update([])
    };
  }, [cart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
