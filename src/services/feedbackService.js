import { loadFeedbacks, saveFeedbacks } from './storage/feedbackStorage.js';

export const getFeedbacks = loadFeedbacks;
export function createFeedback(feedback) {
  const feedbacks = loadFeedbacks();
  const record = { ...feedback, id: Date.now(), timestamp: new Date().toISOString() };
  saveFeedbacks([record, ...feedbacks]);
  return record;
}
