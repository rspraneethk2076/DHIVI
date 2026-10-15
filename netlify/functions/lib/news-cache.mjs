import { createHash, randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { MAX_ARTICLE_AGE, REFRESH_INTERVAL, isWithinNewsWindow, safeUrl } from './feeds.mjs';

export const CACHE_VERSION = 4;
export const MAX_SNAPSHOT_BYTES = 24_000_000;
const CATEGORIES = new Set(['news', 'technical', 'clinical', 'tools', 'geopolitical']);
const SNAPSHOT_KEY = 'hourly-snapshot';
const LEASE_KEY = 'refresh-lease';
const LEASE_MS = 55_000;
const bounded = (value, length) => typeof value === 'string' && value.length > 0 && value.length <= length;

export function catalogFingerprint(sources) {
  return createHash('sha256').update(JSON.stringify(sources.map(({ id, name, url, siteUrl, aiOnly, category, publisher, kind, contentType, trustReason }) => ({ id, name, url, siteUrl, aiOnly, category, publisher, kind, contentType, trustReason })).sort((a, b) => a.id.localeCompare(b.id)))).digest('hex');
}

export function cacheStoreName(context) {
  const deployContext = context?.deploy?.context ?? globalThis.Netlify?.env?.get?.('CONTEXT') ?? process.env.CONTEXT;
  if (deployContext === 'production' && context?.deploy?.published !== false) return 'dhivi-news-hourly-production-v1';
  // A preview can never overwrite the site-wide production snapshot.
  const scope = context?.deploy?.id ?? process.env.DEPLOY_ID ?? 'local';
  return `dhivi-news-hourly-isolated-${createHash('sha256').update(`${deployContext ?? 'local'}:${scope}`).digest('hex').slice(0, 16)}`;
}

function normalizeCachedArticle(article, sourceMap, createdAt) {
  const source = sourceMap.get(article?.sourceId);
  const timestamp = Date.parse(article?.publishedAt);
  if (!source || !bounded(article.id, 128) || !bounded(article.title, 400) || typeof article.summary !== 'string' || article.summary.length > 1200 || !safeUrl(article.url) || !CATEGORIES.has(article.category) || !isWithinNewsWindow(timestamp, createdAt)) return null;
  if (!Array.isArray(article.tags) || article.tags.length > 10 || article.tags.some(tag => !bounded(tag, 100))) return null;
  const image = safeUrl(article.image) ?? (/^\/images\/(?:news|technical|clinical|tools|geopolitical)\.svg$/.test(article.image ?? '') ? article.image : null);
  if (!image) return null;
  return { id: article.id, title: article.title, summary: article.summary, url: article.url, image, source: source.name, sourceId: source.id, publisherId: source.publisher ?? source.id, sourceKind: source.kind ?? 'publisher', contentType: source.contentType ?? null, publishedAt: new Date(timestamp).toISOString(), category: article.category, tags: article.tags };
}

export function decodeSnapshot(snapshot, sources, now = Date.now()) {
  if (!snapshot || snapshot.version !== CACHE_VERSION || snapshot.catalog !== catalogFingerprint(sources) || !Number.isFinite(snapshot.createdAt) || snapshot.createdAt > now || snapshot.createdAt < now - MAX_ARTICLE_AGE) return null;
  const cache = snapshot.cache;
  if (!cache || !Number.isFinite(cache.expiresAt) || cache.expiresAt <= snapshot.createdAt || cache.expiresAt > snapshot.createdAt + REFRESH_INTERVAL || !isWithinNewsWindow(cache.updatedAt, snapshot.createdAt)) return null;
  if (!Array.isArray(cache.articles) || cache.articles.length > 400 || !Array.isArray(cache.coverageArticles) || cache.coverageArticles.length > 17_500 || !Array.isArray(cache.sources) || cache.sources.length !== sources.length || sources.length > 350) return null;
  const sourceMap = new Map(sources.map(source => [source.id, source]));
  const seen = new Set();
  const statuses = [];
  for (const status of cache.sources) {
    const source = sourceMap.get(status.id);
    if (!source || seen.has(status.id) || typeof status.ok !== 'boolean' || typeof status.deferred !== 'boolean' || !isWithinNewsWindow(status.checkedAt, snapshot.createdAt)) return null;
    seen.add(status.id);
    statuses.push({ id: source.id, name: source.name, url: source.url, siteUrl: source.siteUrl, publisher: source.publisher ?? source.name, kind: source.kind ?? 'other', contentType: source.contentType ?? null, trustReason: source.trustReason ?? null, ok: status.ok, deferred: status.deferred, checkedAt: status.checkedAt, ...(!status.ok ? { error: status.deferred ? 'Check deferred because the request time limit was reached' : 'Source temporarily unavailable' } : {}) });
  }
  const articles = cache.articles.map(article => normalizeCachedArticle(article, sourceMap, snapshot.createdAt));
  const coverageArticles = cache.coverageArticles.map(article => normalizeCachedArticle(article, sourceMap, snapshot.createdAt));
  if (articles.some(article => !article) || coverageArticles.some(article => !article)) return null;
  const sourceSavedAt = {};
  if (cache.sourceSavedAt == null || typeof cache.sourceSavedAt !== 'object' || Array.isArray(cache.sourceSavedAt) || Object.keys(cache.sourceSavedAt).length > 350) return null;
  for (const [id, savedAt] of Object.entries(cache.sourceSavedAt)) {
    if (!sourceMap.has(id) || !isWithinNewsWindow(savedAt, snapshot.createdAt)) return null;
    sourceSavedAt[id] = savedAt;
  }
  // Age filtering happens again in projectNewsResponse. A valid historical
  // snapshot may contain articles which have aged out since it was written.
  return { articles, coverageArticles, sources: statuses, updatedAt: cache.updatedAt, expiresAt: cache.expiresAt, sourceSavedAt, creatorSignals: [], creatorStatus: null, curatorDispatch: null };
}

export function encodeSnapshot(cache, sources, now = Date.now()) {
  const current = article => isWithinNewsWindow(article.publishedAt, now);
  const snapshot = { version: CACHE_VERSION, catalog: catalogFingerprint(sources), createdAt: now, cache: { articles: cache.articles.filter(current), coverageArticles: cache.coverageArticles.filter(current), sources: cache.sources, updatedAt: cache.updatedAt, expiresAt: Math.min(cache.expiresAt, now + REFRESH_INTERVAL), sourceSavedAt: Object.fromEntries(Object.entries(cache.sourceSavedAt ?? {}).filter(([, value]) => isWithinNewsWindow(value, now))) } };
  if (!decodeSnapshot(snapshot, sources, now)) throw new Error('Invalid news snapshot');
  const serialized = JSON.stringify(snapshot);
  if (Buffer.byteLength(serialized) > MAX_SNAPSHOT_BYTES) throw new Error('News snapshot exceeds size limit');
  return serialized;
}

async function readJSON(store, key, limit) {
  const entry = await store.getWithMetadata(key, { type: 'stream', consistency: 'strong' });
  if (!entry) return null;
  const reader = entry.data.getReader();
  const chunks = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new Error('Cache object exceeds size limit'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return { data: JSON.parse(Buffer.concat(chunks).toString('utf8')), etag: entry.etag };
}

async function limitedOperation(operation) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([Promise.resolve().then(() => operation(controller.signal)), new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Shared cache operation timed out')); }, 2_000); })]);
  } finally { clearTimeout(timer); }
}

export function createNewsBlobCache({ store, getStoreImpl = getStore, log = (stage, error) => console.warn(`News shared cache ${stage}: ${error.name}`) } = {}) {
  const open = (context, signal) => store ?? getStoreImpl({ name: cacheStoreName(context), consistency: 'strong', fetch: (url, options = {}) => fetch(url, { ...options, signal: options.signal ? AbortSignal.any([options.signal, signal]) : signal }) });
  return {
    async read({ sources, now, context }) {
      try { return await limitedOperation(async signal => { const entry = await readJSON(open(context, signal), SNAPSHOT_KEY, MAX_SNAPSHOT_BYTES); return entry ? decodeSnapshot(entry.data, sources, now) : null; }); }
      catch (error) { log('read unavailable', error); return null; }
    },
    async acquire({ now, context }) {
      try {
        return await limitedOperation(async signal => {
        const target = open(context, signal);
        const existing = await readJSON(target, LEASE_KEY, 2_000);
        if (existing && Number.isFinite(existing.data.expiresAt) && existing.data.expiresAt > now && existing.data.expiresAt <= now + LEASE_MS) return { acquired: false, available: true };
        const owner = randomUUID();
        const result = await target.setJSON(LEASE_KEY, { owner, expiresAt: now + LEASE_MS }, existing?.etag ? { onlyIfMatch: existing.etag } : { onlyIfNew: true });
        return { acquired: result.modified, available: true, owner, context };
        });
      } catch (error) { log('lease unavailable', error); return { acquired: true, available: false }; }
    },
    async write(cache, { sources, now, context }) {
      try { return await limitedOperation(async signal => { await open(context, signal).set(SNAPSHOT_KEY, encodeSnapshot(cache, sources, now), { metadata: { version: CACHE_VERSION, createdAt: now, expiresAt: cache.expiresAt } }); return true; }); }
      catch (error) { log('write unavailable', error); return false; }
    },
    async release(lease) {
      if (!lease?.available || !lease.acquired) return;
      try { await limitedOperation(async signal => { const target = open(lease.context, signal); const current = await readJSON(target, LEASE_KEY, 2_000); if (current?.data.owner === lease.owner) await target.delete(LEASE_KEY); }); }
      catch (error) { log('lease release unavailable', error); }
    },
  };
}
