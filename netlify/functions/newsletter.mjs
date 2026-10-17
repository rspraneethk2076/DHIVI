import { createNewsletterHandler } from './lib/newsletter.mjs';
export default createNewsletterHandler();
export const config = { rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ['ip','domain'] } };
