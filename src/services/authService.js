const KEY = 'fastlanche_session';

export async function getSession() {
  try { return JSON.parse(window.localStorage.getItem(KEY) || 'null'); }
  catch { return null; }
}
