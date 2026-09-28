const KEY = 'fastlanche_bookings';
let memoryBookings = [];

export async function createBooking(booking) {
  const record = { ...booking, id: Date.now(), createdAt: new Date().toISOString() };
  memoryBookings.push(record);
  try {
    const stored = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    const bookings = Array.isArray(stored) ? stored : [];
    bookings.push(record);
    window.localStorage.setItem(KEY, JSON.stringify(bookings));
  } catch (error) {
    console.warn('Nao foi possivel persistir a reserva; mantida em memoria.', error);
  }
  return record;
}
