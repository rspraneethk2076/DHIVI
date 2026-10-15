import { MAX_ARTICLE_AGE, SOURCES, REFRESH_INTERVAL, WINDOW_HOURS, deduplicateArticles, fetchArticleImage, fetchFeed, isWithinNewsWindow } from './lib/feeds.mjs';
import { annotateSpotlight } from './lib/spotlight.mjs';
import { fetchCuratorDispatch } from './lib/curator.mjs';
import { cacheStoreName, createNewsBlobCache } from './lib/news-cache.mjs';

const MAX_STALE_AGE = MAX_ARTICLE_AGE;

export async function runSourceChecks(sources, task, { concurrency = 16, perHost = 2, deadlineMs = 38_000, rotation = 0 } = {}) {
  const results = new Array(sources.length);
  const pending = sources.map((source, index) => { let host; try { host = new URL(source.url).hostname; } catch { host = `invalid-${index}`; } return { index, host }; });
  // Change the starting point each hour so deadline-deferred feeds are not
  // permanently stuck at the back of a large catalog.
  if (pending.length && rotation) pending.push(...pending.splice(0, Math.abs(rotation * 53) % pending.length));
  const activeHosts = new Map();
  const controllers = new Set();
  const waiting = new Set();
  let expired = false;
  const wake = () => { for (const resolve of waiting) resolve(); waiting.clear(); };
  const timer = setTimeout(() => { expired = true; for (const controller of controllers) controller.abort(); wake(); }, Math.max(1, deadlineMs));
  try {
    await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), sources.length) }, async () => {
      while (pending.length && !expired) {
        const available = pending.findIndex(({ host }) => (activeHosts.get(host) ?? 0) < Math.max(1, perHost));
        if (available < 0) { await new Promise(resolve => waiting.add(resolve)); continue; }
        const { index, host } = pending.splice(available, 1)[0];
        activeHosts.set(host, (activeHosts.get(host) ?? 0) + 1);
        const controller = new AbortController();
        controllers.add(controller);
        let onAbort;
        const aborted = new Promise((_, reject) => { onAbort = () => reject(new Error('Source-check deadline reached')); controller.signal.addEventListener('abort', onAbort, { once: true }); });
        try {
          const value = await Promise.race([Promise.resolve().then(() => task(sources[index], controller.signal)), aborted]);
          results[index] = { status: 'fulfilled', value };
        } catch (reason) {
          results[index] = { status: expired ? 'deferred' : 'rejected', reason, attempted: true };
        } finally {
          controller.signal.removeEventListener('abort', onAbort);
          controllers.delete(controller);
          activeHosts.set(host, activeHosts.get(host) - 1);
          wake();
        }
      }
    }));
  } finally { clearTimeout(timer); }
  return Array.from(results, result => result ?? { status: 'deferred', attempted: false });
}

function annotateBroadSpotlight(articles, coverageArticles, options) {
  const index = new Map();
  const ignored = new Set('artificial intelligence research researcher learning machine neural language introduce release launch openai google microsoft anthropic nvidia claude gemini'.split(' '));
  const tokens = title => [...new Set(String(title).toLowerCase().match(/[\p{L}\p{N}]+(?:[.-][\p{L}\p{N}]+)*/gu)?.map(word => word.length > 5 && word.endsWith('s') ? word.slice(0, -1) : word).filter(word => word.length >= 6 && !ignored.has(word)) ?? [])];
  const titleKey = title => `title:${title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')}`;
  const ordered = [...coverageArticles].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const positions = new Map(ordered.map((article, index) => [article, index]));
  for (const article of ordered) {
    for (const token of [titleKey(article.title), ...tokens(article.title)]) {
      if (!index.has(token)) index.set(token, new Set());
      if (index.get(token).size < 160) index.get(token).add(article);
    }
  }
  return articles.map(article => {
    const candidates = new Set();
    for (const token of [titleKey(article.title), ...tokens(article.title)]) for (const candidate of index.get(token) ?? []) candidates.add(candidate);
    const evidence = [...candidates].sort((a, b) => positions.get(a) - positions.get(b)).slice(0, 160);
    return annotateSpotlight([article], { ...options, coverageArticles: evidence })[0];
  }).filter(Boolean);
}

export function projectNewsResponse(cache, now = Date.now()) {
  const current = article => isWithinNewsWindow(article.publishedAt, now);
  const coverageArticles = cache.coverageArticles.filter(current);
  const creatorSignals = cache.creatorSignals.filter(current);
  const curatorDispatch = cache.curatorDispatch && current(cache.curatorDispatch) ? cache.curatorDispatch : null;
  const articles = annotateBroadSpotlight(cache.articles.filter(current), coverageArticles, { now, creatorSignals, curatorDispatch });
  const sourceCounts = new Map();
  for (const article of coverageArticles) sourceCounts.set(article.sourceId, (sourceCounts.get(article.sourceId) ?? 0) + 1);
  const sources = cache.sources.map(source => {
    const articleCount = sourceCounts.get(source.id) ?? 0;
    return { ...source, articleCount, stale: !source.ok && articleCount > 0 };
  });
  const successful = sources.filter(source => source.ok).length;
  const sourceGroups = new Map();
  for (const source of sources) {
    const kind = source.kind ?? 'other';
    if (!sourceGroups.has(kind)) sourceGroups.set(kind, { kind, configured: 0, available: 0, current: 0, articles: 0 });
    const group = sourceGroups.get(kind);
    group.configured++; group.available += Number(source.ok); group.current += Number(source.articleCount > 0); group.articles += source.articleCount;
  }
  const stale = successful === 0 && articles.length > 0;
  const payload = {
    articles,
    updatedAt: cache.updatedAt,
    servedAt: new Date(now).toISOString(),
    windowHours: WINDOW_HOURS,
    windowStart: new Date(now - MAX_ARTICLE_AGE).toISOString(),
    newestPublishedAt: articles[0]?.publishedAt ?? null,
    refreshInterval: REFRESH_INTERVAL,
    sources,
    sourceCoverage: { configured: sources.length, checked: sources.filter(source => !source.deferred).length, available: successful, current: sources.filter(source => source.articleCount > 0).length, unavailable: sources.filter(source => !source.ok && !source.deferred).length, deferred: sources.filter(source => source.deferred).length, publishers: new Set(sources.map(source => source.publisher ?? source.id)).size, includedPublishers: new Set(articles.map(article => article.publisherId ?? article.sourceId)).size },
    sourceGroups: [...sourceGroups.values()],
    cacheStatus: cache.cacheStatus ?? 'memory',
    partial: successful < sources.length,
    stale,
    counts: { all: articles.length, news: 0, technical: 0, clinical: 0, tools: 0, geopolitical: 0 },
    creatorSignals,
    creatorStatus: cache.creatorStatus ? { ...cache.creatorStatus, freshCount: creatorSignals.length, stale: !cache.creatorStatus.ok && creatorSignals.length > 0 } : null,
    curatorDispatch,
    spotlightMethod: 'Editorial heuristic using recency, concrete impact and conservative headline-topic overlap in a bounded matching sample. No audience or popularity data.',
  };
  for (const article of articles) payload.counts[article.category] += 1;
  if (stale) payload.message = 'Showing available stories from the past 24 hours while sources reconnect.';
  if (!articles.length) payload.message = successful > 0 ? 'No AI news from the past 24 hours is available from the current sources. Checking again automatically.' : 'Sources are temporarily unavailable. Retrying automatically; older stories are excluded.';
  const status = cache.cacheStatus === 'refreshing' && !articles.length ? 503 : articles.length || successful > 0 ? 200 : 503;
  // CDN expiry stops at the first story/signal's 24-hour boundary. No stale CDN
  // response may bypass the rolling window enforced on every warm-cache serve.
  const expiries = [...articles, ...creatorSignals, ...(curatorDispatch ? [curatorDispatch] : [])].map(article => Date.parse(article.publishedAt) + MAX_ARTICLE_AGE);
  const expiresAt = Math.min(cache.expiresAt, ...expiries);
  return { payload, status, expiresAt };
}

// Feed fetches share an hourly warm-instance cache. Responses themselves are
// projected on every request so cached stories/scores age out immediately.
function createScopedNewsService({ sources = SOURCES, creatorSource = null, curatorUrl = null, fetchImpl = fetch, clock = Date.now, timeout = 6_000, imageEnrichment = true, concurrency = 16, perHost = 2, sourceDeadlineMs = 38_000, totalDeadlineMs = 42_000, sharedCache = null } = {}) {
  const sourceCache = new Map();
  const imageCache = new Map();
  let creatorCache;
  let curatorCache;
  let responseCache;
  let pending;

  async function refresh() {
    const startedAt = Date.now();
    const overallDeadline = startedAt + totalDeadlineMs;
    const now = clock();
    const checkedAt = new Date(now).toISOString();
    const curatorTask = curatorUrl ? fetchCuratorDispatch({ fetchImpl, now, url: curatorUrl }).then(dispatch => { curatorCache = dispatch; return dispatch; }).catch(() => curatorCache && isWithinNewsWindow(curatorCache.publishedAt, now) ? curatorCache : null) : Promise.resolve(null);
    const creatorTask = creatorSource ? (async () => {
      try {
        const entries = await fetchFeed(creatorSource, { fetchImpl, now, timeout: Math.min(timeout, 5_000) });
        const signals = entries.map(({ id, title, url, image, publishedAt }) => ({ id, title, url, image, publishedAt, creator: creatorSource.name }));
        creatorCache = { signals, savedAt: now };
        return { signals, status: { name: creatorSource.name, url: creatorSource.siteUrl, ok: true, checkedAt } };
      } catch {
        const signals = creatorCache && now - creatorCache.savedAt < MAX_STALE_AGE ? creatorCache.signals.filter(signal => isWithinNewsWindow(signal.publishedAt, now)) : [];
        return { signals, status: { name: creatorSource.name, url: creatorSource.siteUrl, ok: false, checkedAt } };
      }
    })() : Promise.resolve({ signals: [], status: null });
    const sourcesTask = runSourceChecks(sources, (source, signal) => fetchFeed(source, { fetchImpl, now, timeout, signal }), { concurrency, perHost, deadlineMs: Math.min(sourceDeadlineMs, totalDeadlineMs), rotation: Math.floor(now / REFRESH_INTERVAL) });
    const [checks, creator, curatorDispatch] = await Promise.all([sourcesTask, creatorTask, curatorTask]);
    const results = checks.map((check, index) => {
      const source = sources[index];
      const status = { id: source.id, name: source.name, url: source.url, siteUrl: source.siteUrl, publisher: source.publisher ?? source.name, kind: source.kind ?? 'other', trustReason: source.trustReason ?? null, ok: check.status === 'fulfilled', deferred: check.status === 'deferred', checkedAt };
      if (check.status === 'fulfilled') {
        sourceCache.set(source.id, { articles: check.value, savedAt: now });
        return { articles: check.value, status };
      }
      const cached = sourceCache.get(source.id);
      const articles = cached && now - cached.savedAt < MAX_STALE_AGE ? cached.articles.filter(article => isWithinNewsWindow(article.publishedAt, now)) : [];
      return { articles, status: { ...status, error: status.deferred ? 'Check deferred because the request time limit was reached' : 'Source temporarily unavailable' } };
    });
    const coverageArticles = results.flatMap(result => result.articles);
    const articles = deduplicateArticles(coverageArticles, now).map(article => {
      const cached = imageCache.get(article.id);
      return { ...article, image: cached?.image && now < cached.expiresAt ? cached.image : article.image };
    });
    if (imageEnrichment) {
      const candidates = articles.filter(article => article.image.startsWith('/')).slice(0, 12);
      let cursor = 0;
      await Promise.all(Array.from({ length: Math.min(4, candidates.length) }, async () => {
        while (cursor < candidates.length) {
          if (Date.now() >= overallDeadline) break;
          const article = candidates[cursor++];
          const cached = imageCache.get(article.id);
          if (cached && now < cached.expiresAt) { if (cached.image) article.image = cached.image; continue; }
          let image = null;
          try { image = await fetchArticleImage(article, sources.find(source => source.id === article.sourceId), fetchImpl, { timeout: Math.max(1, Math.min(2_500, overallDeadline - Date.now())) }); } catch { /* Category artwork remains available. */ }
          imageCache.set(article.id, { image, expiresAt: now + (image ? 6 * 60 * 60_000 : 15 * 60_000) });
          if (image) article.image = image;
        }
      }));
      for (const [key, value] of imageCache) if (now >= value.expiresAt) imageCache.delete(key);
    }
    responseCache = {
      articles, coverageArticles, creatorSignals: creator.signals, creatorStatus: creator.status, curatorDispatch,
      sources: results.map(result => result.status), updatedAt: checkedAt,
      expiresAt: clock() + REFRESH_INTERVAL,
      sourceSavedAt: Object.fromEntries([...sourceCache].filter(([, entry]) => isWithinNewsWindow(entry.savedAt, clock())).map(([id, entry]) => [id, entry.savedAt])),
      cacheStatus: 'refreshed',
    };
  }

  async function loadOrRefresh({ context, forceRefresh = false } = {}) {
    const snapshot = sharedCache ? await sharedCache.read({ sources, now: clock(), context }) : null;
    if (snapshot) {
      for (const [id, savedAt] of Object.entries(snapshot.sourceSavedAt)) sourceCache.set(id, { savedAt, articles: snapshot.coverageArticles.filter(article => article.sourceId === id && isWithinNewsWindow(article.publishedAt, clock())) });
      for (const article of snapshot.articles) if (!article.image.startsWith('/')) imageCache.set(article.id, { image: article.image, expiresAt: Math.min(clock() + 6 * REFRESH_INTERVAL, Date.parse(article.publishedAt) + MAX_ARTICLE_AGE) });
      if (snapshot.expiresAt > clock() && !forceRefresh) { responseCache = { ...snapshot, cacheStatus: 'shared' }; return; }
    }
    const lease = sharedCache ? await sharedCache.acquire({ now: clock(), context }) : { acquired: true };
    if (!lease.acquired) {
      const previous = snapshot ?? responseCache;
      responseCache = previous ? { ...previous, cacheStatus: 'refreshing', expiresAt: clock() + 5_000 } : {
        articles: [], coverageArticles: [], creatorSignals: [], creatorStatus: null, curatorDispatch: null,
        sources: sources.map(source => ({ ...source, ok: false, deferred: true, checkedAt: new Date(clock()).toISOString(), error: 'Hourly refresh is already in progress' })),
        updatedAt: new Date(clock()).toISOString(), expiresAt: clock() + 5_000, sourceSavedAt: {}, cacheStatus: 'refreshing',
      };
      return;
    }
    await refresh();
    if (sharedCache) await sharedCache.write(responseCache, { sources, now: clock(), context });
    // The short lease expires naturally. Keeping its key avoids extra delete/
    // read operations and cannot delay reads of a completed fresh snapshot.
  }

  return async function getNews(options = {}) {
    if (!responseCache || responseCache.expiresAt <= clock() || options.forceRefresh) {
      if (!pending) pending = loadOrRefresh(options).finally(() => { pending = undefined; });
      await pending;
    }
    return projectNewsResponse(responseCache, clock());
  };
}

export function createNewsService(options = {}) {
  const workers = new Map();
  return function getNews(requestOptions = {}) {
    // An instance may first handle a pre-publication request, then serve the
    // published site. Memory and pending work must follow the same scope as
    // durable storage, including source fallbacks and enriched thumbnails.
    const scope = cacheStoreName(requestOptions.context);
    const worker = workers.get(scope) ?? createScopedNewsService(options);
    workers.delete(scope);
    workers.set(scope, worker);
    // Keep only the four most recently used scopes. Eviction does not cancel
    // an in-flight request; its independent worker finishes for its callers.
    if (workers.size > 4) workers.delete(workers.keys().next().value);
    return worker(requestOptions);
  };
}

const getNews = createNewsService({ sharedCache: createNewsBlobCache() });

export function cacheSecondsForResponse(expiresAt, now = Date.now()) {
  return Math.max(0, Math.min(REFRESH_INTERVAL / 1_000, Math.floor((expiresAt - now) / 1_000)));
}

export default async function handler(request, context) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } });
  }
  const { payload, status, expiresAt } = await getNews({ context });
  const cacheSeconds = cacheSecondsForResponse(expiresAt);
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 503 ? 'no-store' : 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': status === 503 || cacheSeconds === 0 ? 'no-store' : `public, s-maxage=${cacheSeconds}, must-revalidate`,
      'X-Content-Type-Options': 'nosniff',
      ...(status === 503 && payload.cacheStatus === 'refreshing' ? { 'Retry-After': '5' } : {}),
    },
  });
}
