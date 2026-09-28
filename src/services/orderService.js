const KEY = 'fastlanche_orders';
let memoryOrders = [];

export async function createOrder(order) {
  memoryOrders.unshift(order);
  try {
    const stored = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    const orders = Array.isArray(stored) ? stored : [];
    orders.unshift(order);
    window.localStorage.setItem(KEY, JSON.stringify(orders));
  } catch (error) {
    console.warn('Nao foi possivel persistir o pedido; mantido em memoria.', error);
  }
  return order;
}

export async function getOrder(orderNumber) {
  try {
    const orders = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return (Array.isArray(orders) ? orders : []).find(order => order.orderNumber === orderNumber) || memoryOrders.find(order => order.orderNumber === orderNumber) || null;
  } catch {
    return memoryOrders.find(order => order.orderNumber === orderNumber) || null;
  }
}
