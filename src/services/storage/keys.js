// Chaves do armazenamento local (compartilhadas com as paginas legadas). Tambem servem como nome dos eventos de
// sincronizacao (subscribeToStorage): no modo HTTP os adapters notificam a mesma chave apos cada mudanca, entao as
// telas reagem igual nos dois modos.
export const USERS_KEY = 'fastlanche_users';
export const SESSION_KEY = 'fastlanche_session';
export const PROFILE_KEY = 'fastlanche_user_profile';
export const CART_STORAGE_KEY = 'fastlanche_cart';
export const ORDER_STORAGE_KEY = 'fastlanche_orders';
export const LAST_ORDER_REFERENCE_KEY = 'fastlanche_last_order';
export const BOOKING_STORAGE_KEY = 'fastlanche_bookings';
export const LAST_BOOKING_REFERENCE_KEY = 'fastlanche_last_booking';
export const FEEDBACK_STORAGE_KEY = 'fastlanche_feedbacks';
export const MENU_OVERRIDES_KEY = 'fastlanche_menuItems';
export const RESTAURANT_STATUS_KEY = 'fastlanche_restaurant_status';
// Marca a importacao dos dados locais para a conta no servidor (estrategia de migracao, Fase 44).
export const MIGRATION_KEY = 'fastlanche_migrated_to_account';
