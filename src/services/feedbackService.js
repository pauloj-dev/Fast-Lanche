// Fachada de avaliacoes (Fase 44): leitura, elegibilidade e publicacao pelo repositorio (local ou API).
import { getRepository } from './repositories/index.js';

export * from './repositories/local/feedbackLocal.js';

const feedbacks = () => getRepository('feedbacks');

export const getFeedbacks = () => feedbacks().getFeedbacks();
export const getReviewContext = () => feedbacks().getReviewContext();
export const publishFeedback = input => feedbacks().publishFeedback(input);
