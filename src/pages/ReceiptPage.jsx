import { useEffect, useState } from 'react';
import { getLastOrderReference, getOrder, getOrderStatusClass, getOrderStatusLabel, getPaymentLabel } from '../services/orderService.js';

const currency = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data indisponivel' : date.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
};

export function getReceiptReference(search = '', fallback = getLastOrderReference()) {
  try { return new URLSearchParams(search).get('order')?.trim() || fallback; } catch { return fallback; }
}

function customizationText(customization) {
  if (!customization) return '';
  if (typeof customization === 'string') return customization;
  const details = [];
  if (customization.type === 'half_half') details.push(`Meio ${customization.flavor1 || ''}${customization.flavor2 ? ` + Meio ${customization.flavor2}` : ''}`);
  if (customization.removedIngredients?.length) details.push(`Sem: ${customization.removedIngredients.join(', ')}`);
  if (customization.extras?.length) details.push(`Adicionais: ${customization.extras.map(extra => typeof extra === 'string' ? extra : extra.name).filter(Boolean).join(', ')}`);
  if (customization.observation) details.push(`Obs: ${customization.observation}`);
  return details.join(' | ');
}

export function ReceiptPage() {
  const [state, setState] = useState({ loading: true, order: null, error: '' });
  useEffect(() => {
    let active = true;
    const reference = getReceiptReference(window.location.search);
    if (!reference) { setState({ loading: false, order: null, error: 'Nenhum pedido recente foi encontrado.' }); return () => { active = false; }; }
    getOrder(reference).then(order => {
      if (active) setState({ loading: false, order, error: order ? '' : 'Nao foi possivel encontrar este pedido.' });
    }).catch(() => { if (active) setState({ loading: false, order: null, error: 'Nao foi possivel carregar o comprovante.' }); });
    return () => { active = false; };
  }, []);
  if (state.loading) return <main className="page-section"><div className="container"><div className="empty-state" role="status">Carregando comprovante...</div></div></main>;
  if (state.error || !state.order) return <main className="page-section"><div className="container receipt-empty"><div className="empty-state" role="alert"><span className="empty-state-icon">🧾</span><span className="empty-state-text">{state.error}</span><a className="button button-primary" href="cardapio.html">Voltar ao cardapio</a></div></div></main>;
  const { order } = state;
  const paymentApproved = order.paymentStatus === 'approved';
  return <main id="top"><section className="page-section receipt-page-section" aria-labelledby="receipt-page-title"><div className="container receipt-page-container">
    <div className="section-heading"><div><p className="section-kicker">Pedido confirmado</p><h1 id="receipt-page-title">Comprovante</h1></div><span className={`receipt-status-badge status-${getOrderStatusClass(order.status)}`}>{getOrderStatusLabel(order.status)}</span></div>
    <article className="receipt-page-card">
      <header className="receipt-header"><div className="receipt-title-group"><strong className="receipt-brand">Fast Lanche</strong><span className="receipt-type">COMPROVANTE DIGITAL</span></div><div className="receipt-id-group"><span className="receipt-id-label">Numero do pedido</span><strong className="receipt-id-value">{order.orderNumber}</strong></div></header>
      <section className="receipt-section"><h2 className="receipt-section-title">Informacoes do pedido</h2><div className="receipt-info-grid"><Info label="Data" value={dateTime(order.createdAt)} /><Info label="Cliente" value={order.customer.name} /><Info label="E-mail" value={order.customer.email} /><Info label="Telefone" value={order.customer.phone} /><Info label="Endereco" value={order.customer.address} /><Info label="Pagamento" value={`${getPaymentLabel(order.paymentMethod)} (${paymentApproved ? 'aprovado' : order.paymentStatus})`} /></div></section>
      <section className="receipt-section"><h2 className="receipt-section-title">Itens</h2><div className="receipt-items-table">{order.items.map((item, index) => <div className="receipt-item-row" key={`${item.id || item.name}-${index}`}><div className="receipt-item-info"><span className="receipt-item-name">{item.quantity}x {item.name}</span>{customizationText(item.customization) && <span className="receipt-item-cust">{customizationText(item.customization)}</span>}</div><strong className="receipt-item-total">{currency(item.total || item.price * item.quantity)}</strong></div>)}</div></section>
      <section className="receipt-section receipt-values"><div className="receipt-values-divider"><div className="receipt-value-row"><span>Subtotal</span><span>{currency(order.subtotal)}</span></div><div className="receipt-value-row"><span>Entrega</span><span>{currency(order.deliveryFee)}</span></div><div className="receipt-total-row"><span>Total</span><strong>{currency(order.total)}</strong></div></div></section>
      <footer className="receipt-footer"><p>{paymentApproved ? 'Pagamento simulado aprovado.' : 'Pagamento simulado pendente.'}</p><span>Guarde o numero do pedido para consulta.</span></footer>
    </article>
    <div className="receipt-page-actions"><a className="button button-secondary" href="cardapio.html">Continuar comprando</a><button className="button button-primary" type="button" onClick={() => window.print()}>Imprimir comprovante</button></div>
  </div></section></main>;
}

function Info({ label, value }) { return <div className="receipt-info-row"><span className="receipt-info-label">{label}</span><span className="receipt-info-value">{value || 'Nao informado'}</span></div>; }
