const KEY = 'fastlanche_feedbacks';
let memoryFeedbacks = [];

export function loadFeedbacks() {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    memoryFeedbacks = Array.isArray(value) ? value.filter(item => item && typeof item.name === 'string' && typeof item.comment === 'string' && Number.isFinite(Number(item.rating))) : [];
  } catch (error) {
    console.warn('LocalStorage indisponivel para feedbacks.', error);
  }
  return memoryFeedbacks;
}

export function saveFeedbacks(feedbacks) {
  memoryFeedbacks = feedbacks;
  try { window.localStorage.setItem(KEY, JSON.stringify(feedbacks)); }
  catch (error) { console.warn('Nao foi possivel salvar os feedbacks.', error); }
  return memoryFeedbacks;
}
