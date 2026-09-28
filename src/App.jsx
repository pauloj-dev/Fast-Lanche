import { useEffect } from 'react';
import { CartProvider } from './context/CartContext.jsx';
import { ModalProvider } from './context/ModalContext.jsx';
import { Header, Footer } from './components/Header.jsx';
import { ModalHost } from './components/ModalHost.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { MenuPage } from './pages/MenuPage.jsx';
import { CartPage } from './pages/CartPage.jsx';
import { CheckoutPage } from './pages/CheckoutPage.jsx';
import { BookingPage } from './pages/BookingPage.jsx';
import { FeedbackPage } from './pages/FeedbackPage.jsx';

const pages = {
  'index.html': HomePage, 'cardapio.html': MenuPage, 'carrinho.html': CartPage,
  'checkout.html': CheckoutPage, 'reservas.html': BookingPage, 'feedbacks.html': FeedbackPage
};

export function App() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const Page = pages[page] || HomePage;
  useEffect(() => {
    const titles = { 'index.html': 'Home', 'cardapio.html': 'Cardapio', 'carrinho.html': 'Carrinho', 'checkout.html': 'Checkout', 'reservas.html': 'Reservas', 'feedbacks.html': 'Feedbacks' };
    document.title = `Fast Lanche - ${titles[page] || 'Home'}`;
  }, [page]);
  return <CartProvider><ModalProvider><Header/><Page/><Footer/><ModalHost/></ModalProvider></CartProvider>;
}
