import { createNewsService } from './news.mjs';
import { createNewsBlobCache } from './lib/news-cache.mjs';

// Scheduled Functions have a 30-second limit. Leave room for strong Blob I/O
// and serialization, and use publisher-supplied thumbnails during warming.
const warm = createNewsService({ sharedCache: createNewsBlobCache(), sourceDeadlineMs: 18_000, totalDeadlineMs: 20_000, imageEnrichment: false });

export default async function handler(_request, context) {
  const { payload, status } = await warm({ context, forceRefresh: true });
  console.info(JSON.stringify({ event: 'hourly-news-warm', status, articles: payload.articles.length, available: payload.sourceCoverage.available, deferred: payload.sourceCoverage.deferred, cacheStatus: payload.cacheStatus }));
  return new Response(null, { status: status === 503 ? 503 : 204 });
}

export const config = { schedule: '0 * * * *' };
