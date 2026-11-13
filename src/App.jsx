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
import { ReceiptPage } from './pages/ReceiptPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';

const pages = {
  'index.html': HomePage, 'cardapio.html': MenuPage, 'carrinho.html': CartPage,
  'checkout.html': CheckoutPage, 'receipt.html': ReceiptPage, 'reservas.html': BookingPage, 'feedbacks.html': FeedbackPage,
  'login.html': LoginPage, 'perfil.html': ProfilePage
};

export function App() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const Page = pages[page] || HomePage;
  useEffect(() => {
    const titles = { 'index.html': 'Fast Lanche | Lanches, pizzas e reservas', 'cardapio.html': 'Cardápio | Fast Lanche', 'reservas.html': 'Reservas | Fast Lanche', 'feedbacks.html': 'Avaliações | Fast Lanche', 'carrinho.html': 'Carrinho | Fast Lanche', 'checkout.html': 'Checkout | Fast Lanche', 'receipt.html': 'Comprovante | Fast Lanche', 'login.html': 'Entrar | Fast Lanche', 'perfil.html': 'Meu perfil | Fast Lanche' };
    document.title = titles[page] || titles['index.html'];
  }, [page]);
  return <CartProvider><ModalProvider><Header/><Page/><Footer/><ModalHost/></ModalProvider></CartProvider>;
}
