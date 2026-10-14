import { isWithinNewsWindow, plainText, safeUrl } from './feeds.mjs';

export const CURATOR_URL = 'https://payloadcms.stayingahead.ai/api/dispatches?depth=0&limit=1&page=1&sort=-publishedDate&where%5B_status%5D%5Bequals%5D=published';
export const MAX_CURATOR_BYTES = 750_000;

export function parseCuratorDispatch(data, now = Date.now()) {
  const dispatch = data?.docs?.[0];
  if (!dispatch || dispatch._status !== 'published' || !isWithinNewsWindow(dispatch.publishedDate, now) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dispatch.slug ?? '') || typeof dispatch.body !== 'string') return null;
  const title = plainText(dispatch.title, 220);
  if (!title) return null;
  const topics = [];
  const seen = new Set();
  // Only actual h3 topic anchors are read. No prose, embeds, base64 images, or
  // arbitrary newsletter HTML is sent to the client or made into news articles.
  for (const heading of dispatch.body.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3\s*>/gi)) {
    const anchor = heading[1].match(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a\s*>/i);
    if (!anchor) continue;
    const url = safeUrl(anchor[1] ?? anchor[2]);
    const topicTitle = plainText(anchor[3], 220).replace(/^\d+[.)]\s*/, '');
    if (!url || !topicTitle || topicTitle.length < 8 || seen.has(url) || new URL(url).hostname.endsWith('stayingahead.ai')) continue;
    seen.add(url); topics.push({ title: topicTitle, url });
    if (topics.length >= 8) break;
  }
  if (!topics.length) return null;
  return { title, url: `https://www.stayingahead.ai/daily-ai-updates/${dispatch.slug}`, publishedAt: new Date(dispatch.publishedDate).toISOString(), topics };
}

export async function fetchCuratorDispatch({ fetchImpl = fetch, now = Date.now(), url = CURATOR_URL } = {}) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(3_000), headers: { Accept: 'application/json' }, redirect: 'error' });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json') || !response.body) throw new Error('Curator temporarily unavailable');
  if (Number(response.headers.get('content-length')) > MAX_CURATOR_BYTES) throw new Error('Curator response too large');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_CURATOR_BYTES) { await reader.cancel(); throw new Error('Curator response too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return parseCuratorDispatch(JSON.parse(Buffer.concat(chunks).toString('utf8')), now);
}
