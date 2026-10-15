import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewsService } from '../netlify/functions/news.mjs';
import { CACHE_VERSION, MAX_SNAPSHOT_BYTES, cacheStoreName, createNewsBlobCache, decodeSnapshot, encodeSnapshot } from '../netlify/functions/lib/news-cache.mjs';
import { config as warmConfig } from '../netlify/functions/warm-news.mjs';

const NOW = Date.parse('2026-10-14T18:00:00Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const source = { id: 'test', name: 'Original Publisher', url: 'https://publisher.example/feed', siteUrl: 'https://publisher.example', publisher: 'Original Publisher', kind: 'research', contentType: 'journal', trustReason: 'Peer-reviewed source' };
const article = { id: 'a', title: 'Machine learning improves clinical diagnosis', summary: 'AI research results.', url: 'https://publisher.example/article', image: '/images/clinical.svg', source: source.name, sourceId: source.id, publisherId: source.publisher, category: 'clinical', tags: ['clinical'], publishedAt: new Date(NOW - 6 * HOUR).toISOString() };
const fixture = overrides => ({ articles: [article], coverageArticles: [article], sources: [{ ...source, ok: true, deferred: false, checkedAt: new Date(NOW).toISOString() }], updatedAt: new Date(NOW).toISOString(), expiresAt: NOW + HOUR, sourceSavedAt: { test: NOW }, creatorSignals: [], creatorStatus: null, curatorDispatch: null, ...overrides });

function fakeStore() {
  const entries = new Map();
  let revision = 0;
  const calls = [];
  return {
    entries, calls,
    async getWithMetadata(key, options) { calls.push({ method: 'get', key, options }); const entry = entries.get(key); return entry ? { data: new Response(entry.value).body, etag: entry.etag, metadata: entry.metadata } : null; },
    async set(key, value, options = {}) {
      calls.push({ method: 'set', key, options });
      const previous = entries.get(key);
      if ((options.onlyIfNew && previous) || (options.onlyIfMatch && previous?.etag !== options.onlyIfMatch)) return { modified: false };
      const etag = `"revision-${++revision}"`;
      entries.set(key, { value, etag, metadata: options.metadata });
      return { modified: true, etag };
    },
    async setJSON(key, value, options) { return this.set(key, JSON.stringify(value), options); },
    async delete(key) { entries.delete(key); },
  };
}

test('snapshot schema rejects changed catalogs, corruption, unsafe URLs and impossible dates', () => {
  const snapshot = JSON.parse(encodeSnapshot(fixture(), [source], NOW));
  assert.equal(snapshot.version, CACHE_VERSION);
  assert.equal(decodeSnapshot(snapshot, [source], NOW).articles.length, 1);
  for (const mutate of [s => { s.version++; }, s => { s.catalog = 'other'; }, s => { s.createdAt = NOW + 1; }, s => { s.createdAt = NOW - DAY - 1; }, s => { s.cache.expiresAt = NOW + 2 * HOUR; }, s => { s.cache.updatedAt = new Date(NOW + 1).toISOString(); }, s => { s.cache.articles[0].publishedAt = new Date(NOW + 1).toISOString(); }, s => { s.cache.articles[0].url = 'http://127.0.0.1/private'; }, s => { s.cache.articles[0].category = 'untrusted'; }, s => { s.cache.coverageArticles = Array(17_501).fill(article); }, s => { s.cache.sources[0].checkedAt = new Date(NOW + 1).toISOString(); }]) {
    const poisoned = structuredClone(snapshot); mutate(poisoned);
    assert.equal(decodeSnapshot(poisoned, [source], NOW), null);
  }
  assert.equal(decodeSnapshot(snapshot, [{ ...source, url: 'https://publisher.example/new-feed' }], NOW), null);
  assert.equal(decodeSnapshot(snapshot, [{ ...source, trustReason: 'Updated registry review' }], NOW), null);
});

test('preview and local contexts cannot select the production store', () => {
  const production = cacheStoreName({ deploy: { context: 'production', id: 'prod' } });
  const preview = cacheStoreName({ deploy: { context: 'deploy-preview', id: 'preview' } });
  const branch = cacheStoreName({ deploy: { context: 'branch-deploy', id: 'branch' } });
  assert.notEqual(production, preview);
  assert.notEqual(production, branch);
  assert.notEqual(production, cacheStoreName({ deploy: { context: 'production', id: 'historical', published: false } }));
  assert.ok(production.length <= 64 && preview.length <= 64);
  assert.equal(warmConfig.schedule, '0 * * * *');
});

test('a cold instance serves the shared hourly snapshot without refetching publishers', async () => {
  const store = fakeStore();
  const cache = createNewsBlobCache({ store, log: () => {} });
  assert.equal(await cache.write(fixture(), { sources: [source], now: NOW }), true);
  let fetches = 0;
  const cold = createNewsService({ sources: [source], sharedCache: cache, clock: () => NOW + 30_000, imageEnrichment: false, fetchImpl: async () => { fetches++; throw new Error('should not fetch'); } });
  const response = await cold();
  assert.equal(response.status, 200);
  assert.equal(response.payload.cacheStatus, 'shared');
  assert.equal(response.payload.articles.length, 1);
  assert.equal(response.payload.articles[0].sourceKind, 'research');
  assert.equal(response.payload.articles[0].contentType, 'journal');
  assert.equal(fetches, 0);
  assert.equal(store.calls.filter(call => call.method === 'get').every(call => call.options.consistency === 'strong'), true);
});

test('a historical first request cannot seed published-site memory instead of the warmer snapshot', async () => {
  const production = { deploy: { context: 'production', id: 'same-deploy', published: true } };
  const historical = { deploy: { ...production.deploy, published: false } };
  const stores = new Map();
  const cache = createNewsBlobCache({ getStoreImpl: ({ name }) => {
    if (!stores.has(name)) stores.set(name, fakeStore());
    return stores.get(name);
  }, log: () => {} });
  const oldArticle = { ...article, id: 'historical', title: 'Machine learning results from the historical deployment', url: 'https://publisher.example/historical' };
  await cache.write(fixture(), { sources: [source], now: NOW, context: production });
  await cache.write(fixture({ articles: [oldArticle], coverageArticles: [oldArticle] }), { sources: [source], now: NOW, context: historical });
  let fetches = 0;
  const service = createNewsService({ sources: [source], sharedCache: cache, clock: () => NOW, imageEnrichment: false, fetchImpl: async () => { fetches++; throw new Error('must use the scope-specific shared snapshot'); } });
  assert.equal((await service({ context: historical })).payload.articles[0].id, 'historical');
  const published = await service({ context: production });
  assert.equal(published.payload.articles[0].id, article.id);
  assert.equal(published.payload.cacheStatus, 'shared');
  assert.equal((await service({ context: historical })).payload.articles[0].id, 'historical');
  assert.equal(fetches, 0);
  assert.equal(stores.get(cacheStoreName(production)).calls.filter(call => call.method === 'get').length, 1);
});

test('concurrent different deployment scopes do not coalesce pending reads', async () => {
  const contexts = [
    { deploy: { context: 'production', id: 'deploy', published: false } },
    { deploy: { context: 'production', id: 'deploy', published: true } },
  ];
  const reads = [];
  const sharedCache = { read: ({ context }) => new Promise(resolve => reads.push({ scope: cacheStoreName(context), resolve })) };
  const service = createNewsService({ sources: [source], sharedCache, clock: () => NOW, imageEnrichment: false, fetchImpl: async () => { throw new Error('must not collect'); } });
  const historical = service({ context: contexts[0] });
  const production = service({ context: contexts[1] });
  const sameProduction = service({ context: contexts[1] });
  assert.equal(reads.length, 2);
  assert.notEqual(reads[0].scope, reads[1].scope);
  const historicalArticle = { ...article, id: 'historical', url: 'https://publisher.example/historical' };
  reads[0].resolve(fixture({ articles: [historicalArticle], coverageArticles: [historicalArticle] }));
  reads[1].resolve(fixture());
  const responses = await Promise.all([historical, production, sameProduction]);
  assert.deepEqual(responses.map(response => response.payload.articles[0].id), ['historical', article.id, article.id]);
});

test('deployment-scope warm memory keeps at most four workers and evicts the least recently used', async () => {
  const contexts = Array.from({ length: 5 }, (_, index) => ({ deploy: { context: 'production', id: `historical-${index}`, published: false } }));
  const reads = [];
  const sharedCache = { read: async ({ context }) => { reads.push(cacheStoreName(context)); return fixture(); } };
  const service = createNewsService({ sources: [source], sharedCache, clock: () => NOW, imageEnrichment: false });
  for (const context of contexts.slice(0, 4)) await service({ context });
  await service({ context: contexts[0] });
  await service({ context: contexts[4] });
  await service({ context: contexts[0] });
  assert.equal(reads.length, 5);
  await service({ context: contexts[1] });
  assert.equal(reads.length, 6);
  assert.equal(reads.at(-1), cacheStoreName(contexts[1]));
});

test('shared and warm snapshots still age stories out before the hourly cache expires', async () => {
  const store = fakeStore();
  const cache = createNewsBlobCache({ store, log: () => {} });
  const expiring = { ...article, publishedAt: new Date(NOW - DAY + 30_000).toISOString() };
  await cache.write(fixture({ articles: [expiring], coverageArticles: [expiring] }), { sources: [source], now: NOW });
  let now = NOW;
  const cold = createNewsService({ sources: [source], sharedCache: cache, clock: () => now, fetchImpl: async () => { throw new Error('should not fetch'); } });
  assert.equal((await cold()).payload.articles.length, 1);
  now += 30_001;
  assert.equal((await cold()).payload.articles.length, 0);
  const secondCold = createNewsService({ sources: [source], sharedCache: cache, clock: () => now, fetchImpl: async () => { throw new Error('should not fetch'); } });
  assert.equal((await secondCold()).payload.articles.length, 0);
});

test('an expired shared snapshot restores per-source fallback state across cold instances', async () => {
  const store = fakeStore();
  const cache = createNewsBlobCache({ store, log: () => {} });
  await cache.write(fixture(), { sources: [source], now: NOW });
  const now = NOW + HOUR + 1;
  let fetches = 0;
  const cold = createNewsService({ sources: [source], sharedCache: cache, clock: () => now, imageEnrichment: false, fetchImpl: async () => { fetches++; throw new Error('publisher offline'); } });
  const response = await cold();
  assert.equal(fetches, 1);
  assert.equal(response.status, 200);
  assert.equal(response.payload.stale, true);
  assert.equal(response.payload.articles[0].publishedAt, article.publishedAt);
  const restored = await cache.read({ sources: [source], now });
  assert.equal(restored.sourceSavedAt.test, NOW);
});

test('conditional refresh leases permit one writer and never expose expired stories while another writer works', async () => {
  const store = fakeStore();
  const cache = createNewsBlobCache({ store, log: () => {} });
  const [one, two] = await Promise.all([cache.acquire({ now: NOW }), cache.acquire({ now: NOW })]);
  assert.equal(Number(one.acquired) + Number(two.acquired), 1);
  const blocked = createNewsService({ sources: [source], sharedCache: cache, clock: () => NOW, fetchImpl: async () => { throw new Error('must not fetch under another lease'); } });
  const response = await blocked();
  assert.equal(response.status, 503);
  assert.equal(response.payload.cacheStatus, 'refreshing');
  assert.deepEqual(response.payload.articles, []);
  assert.equal((await cache.acquire({ now: NOW + 55_001 })).acquired, true);
});

test('oversized Blob bodies are cancelled and absent runtime credentials safely fall back to warm fetching', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_SNAPSHOT_BYTES + 1)); }, cancel() { cancelled = true; } });
  const oversized = createNewsBlobCache({ store: { getWithMetadata: async () => ({ data: stream }) }, log: () => {} });
  assert.equal(await oversized.read({ sources: [source], now: NOW }), null);
  assert.equal(cancelled, true);
  const unavailable = createNewsBlobCache({ getStoreImpl: () => { throw new Error('no injected Netlify context'); }, log: () => {} });
  let fetches = 0;
  const local = createNewsService({ sources: [source], sharedCache: unavailable, clock: () => NOW, imageEnrichment: false, fetchImpl: async () => { fetches++; return new Response(`<rss><channel><item><title>Machine learning research is published</title><link>https://publisher.example/new</link><pubDate>${new Date(NOW).toISOString()}</pubDate><description>AI research.</description></item></channel></rss>`); } });
  assert.equal((await local()).status, 200);
  assert.equal((await local()).status, 200);
  assert.equal(fetches, 1);
});
