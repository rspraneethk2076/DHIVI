import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, NEWS_WINDOW, REFRESH_INTERVAL, filterArticles, isFreshArticle, normalizeArticle, normalizeCachedFeed, normalizeCreatorSignal, normalizeCuratorDispatch, readStorage, relativeTime, safeLink, writeStorage } from '../src/feed-model.mjs';

const NOW = Date.parse('2026-10-12T18:00:00Z');
const article = (overrides = {}) => ({
  id: 'research-1',
  title: 'Open source AI model improves reasoning',
  summary: 'A technical benchmark from a research team.',
  url: 'https://publisher.example/research',
  image: 'https://images.example/research.jpg',
  source: 'Research Wire',
  publishedAt: new Date(NOW - 3_600_000).toISOString(),
  category: 'technical',
  tags: ['AI', 'open source'],
  ...overrides,
});
const ids = (values) => values.map(value => value.id);

test('instant cached feed never restores expired, future, duplicate or malformed stories', () => {
  const values = [article(), article(), article({id:'expired',publishedAt:new Date(NOW-NEWS_WINDOW-1).toISOString()}), article({id:'future',publishedAt:new Date(NOW+1).toISOString()}), null, {title:'broken'}, article({id:'boundary',publishedAt:new Date(NOW-NEWS_WINDOW).toISOString()})];
  assert.deepEqual(ids(normalizeCachedFeed(JSON.parse(JSON.stringify(values)), NOW)), ['research-1','boundary']);
  assert.deepEqual(ids(normalizeCachedFeed(values, NOW+NEWS_WINDOW+2)), []);
  assert.deepEqual(normalizeCachedFeed({articles:values}, NOW), []);
  const many = Array.from({length:500}, (_,i) => article({id:`story-${i}`}));
  assert.equal(normalizeCachedFeed(many, NOW).length, 400);
});

test('marked-read IDs stay hidden across live modes, search, and saved views', () => {
  const values = [article(), article({ id: 'unread', title: 'AI unread story' })];
  for (const mode of ['spotlight', 'latest', 'for-you']) {
    assert.deepEqual(ids(filterArticles(values, { now: NOW, mode, query: 'AI', readIds: new Set(['research-1']) })), ['unread']);
  }
  assert.deepEqual(ids(filterArticles(values, { now: NOW, category: 'saved', readIds: ['research-1'] })), ['unread']);
  assert.equal(REFRESH_INTERVAL, 3_600_000);
});

test('article and image links allow web URLs and reject active protocols and embedded credentials', () => {
  assert.equal(safeLink('https://publisher.example/a?topic=AI#read'), 'https://publisher.example/a?topic=AI#read');
  assert.equal(safeLink('http://publisher.example/a'), 'http://publisher.example/a');
  for (const unsafe of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///C:/secret.txt', 'mailto:person@example.com', '/relative/path', 'https://user:password@publisher.example/a', 'not a URL', undefined, null]) {
    assert.equal(safeLink(unsafe), '', String(unsafe));
  }
});

test('normalization preserves the backend article schema and publisher dates', () => {
  const normalized = normalizeArticle(article());
  assert.equal(normalized.id, 'research-1');
  assert.equal(normalized.title, 'Open source AI model improves reasoning');
  assert.equal(normalized.publishedAt, '2026-10-12T17:00:00.000Z');
  assert.equal(normalized.category, 'technical');
  assert.equal(normalized.image, 'https://images.example/research.jpg');
  assert.equal(normalized.hasPublisherImage, true);
  assert.deepEqual(normalized.tags, ['AI', 'open source']);
  assert.equal(REFRESH_INTERVAL, 3_600_000);
});

test('saved articles with invalid required fields are discarded individually', () => {
  const invalid = [null, {}, article({ title: '   ' }), article({ title: 42 }), article({ url: 'javascript:alert(1)' }), article({ publishedAt: 'not-a-date' })];
  assert.deepEqual(invalid.map(normalizeArticle), invalid.map(() => null));
  const restored = [...invalid, article()].map(normalizeArticle).filter(Boolean);
  assert.deepEqual(ids(restored), ['research-1']);
});

test('saved JSON with malformed coercion fields cannot crash restoration', () => {
  for (const overrides of [
    { publishedAt: { toString: 1 } },
    { summary: { toString: 1 } },
    { source: { toString: 1 } },
    { id: { toString: 1 } },
  ]) {
    const savedEntry = JSON.parse(JSON.stringify(article(overrides)));
    assert.doesNotThrow(() => normalizeArticle(savedEntry));
  }
  assert.equal(normalizeArticle(article({ publishedAt: { toString: 1 } })), null);
  assert.equal(normalizeArticle(article({ summary: { toString: 1 } })).summary, '');
  assert.equal(normalizeArticle(article({ source: { toString: 1 } })).source, 'publisher.example');
  assert.equal(normalizeArticle(article({ id: { toString: 1 } })).id, 'https://publisher.example/research');
});

test('category artwork is retained as a fallback and unknown categories are normalized', () => {
  for (const category of CATEGORIES) {
    const normalized = normalizeArticle(article({ category, image: `/images/${category}.svg` }));
    assert.equal(normalized.image, `/images/${category}.svg`);
    assert.equal(normalized.hasPublisherImage, false);
  }
  const normalized = normalizeArticle(article({ category: '../../evil', image: 'javascript:alert(1)', source: '', tags: ['good', null, 3, 'valid'] }));
  assert.equal(normalized.category, 'news');
  assert.equal(normalized.image, '/images/news.svg');
  assert.equal(normalized.source, 'publisher.example');
  assert.deepEqual(normalized.tags, ['good', 'valid']);
});

test('normalization bounds saved text and tag collections', () => {
  const normalized = normalizeArticle(article({ id: 'i'.repeat(1200), title: 't'.repeat(500), summary: 's'.repeat(1500), source: 'p'.repeat(150), tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`) }));
  assert.equal(normalized.id.length, 1000);
  assert.equal(normalized.title.length, 400);
  assert.equal(normalized.summary.length, 1200);
  assert.equal(normalized.source.length, 120);
  assert.equal(normalized.tags.length, 10);
});

test('search matches every word across title, summary, publisher and tags, ignoring case', () => {
  const values = [article(), article({ id: 'other', title: 'New AI clinical tool', summary: 'Hospital rollout', source: 'Clinical News', category: 'clinical', tags: ['diagnosis'] })];
  assert.deepEqual(ids(filterArticles(values, { query: '  OPEN\nWIRE  benchmark ', now: NOW })), ['research-1']);
  assert.deepEqual(ids(filterArticles(values, { query: 'clinical diagnosis', now: NOW })), ['other']);
  assert.deepEqual(filterArticles(values, { query: 'open missingword', now: NOW }), []);
});

test('category filters remain active during search; saved lists retain all saved categories', () => {
  const values = [article(), article({ id: 'clinical', title: 'AI clinical diagnosis', category: 'clinical' }), article({ id: 'tool', title: 'New AI coding tool', category: 'tools' })];
  assert.deepEqual(ids(filterArticles(values, { category: 'clinical', query: 'AI', now: NOW })), ['clinical']);
  assert.deepEqual(ids(filterArticles(values, { category: 'saved', now: NOW })), ids(filterArticles(values, { category: 'all', now: NOW })));
  assert.deepEqual(filterArticles(values, { category: 'clinical', query: 'coding', now: NOW }), []);
});

test('latest ordering ignores interests and does not mutate the original array', () => {
  const older = article({ id: 'older', publishedAt: new Date(NOW - 12 * 3_600_000).toISOString() });
  const newer = article({ id: 'newer', category: 'news', publishedAt: new Date(NOW - 60_000).toISOString() });
  const values = [older, newer];
  assert.deepEqual(ids(filterArticles(values, { mode: 'latest', interests: { technical: 25 }, now: NOW })), ['newer', 'older']);
  assert.deepEqual(ids(values), ['older', 'newer']);
});

test('For you boosts read categories, caps personalization, and still respects filters', () => {
  const technical = article({ id: 'technical', publishedAt: new Date(NOW - 12 * 3_600_000).toISOString() });
  const recent = article({ id: 'recent', category: 'news', publishedAt: new Date(NOW - 60_000).toISOString() });
  const values = [recent, technical];
  assert.deepEqual(ids(filterArticles(values, { mode: 'for-you', interests: { technical: 25 }, now: NOW })), ['technical', 'recent']);
  const stillFresh = article({ id: 'still-fresh', publishedAt: new Date(NOW - 23 * 3_600_000).toISOString() });
  assert.deepEqual(ids(filterArticles([stillFresh, recent], { mode: 'for-you', interests: { technical: 999 }, now: NOW })), ['recent', 'still-fresh']);
  const veryOld = article({ id: 'very-old', publishedAt: new Date(NOW - 240 * 3_600_000).toISOString() });
  assert.deepEqual(ids(filterArticles([veryOld, recent], { mode: 'for-you', interests: { technical: 999 }, now: NOW })), ['recent']);
  assert.deepEqual(ids(filterArticles(values, { category: 'news', mode: 'for-you', interests: { technical: 25 }, now: NOW })), ['recent']);
});

test('the live window includes exactly 24 hours and rejects even slightly future stories', () => {
  assert.equal(NEWS_WINDOW, 86_400_000);
  const at = milliseconds => article({ publishedAt: new Date(milliseconds).toISOString() });
  assert.equal(isFreshArticle(at(NOW), NOW), true);
  assert.equal(isFreshArticle(at(NOW - NEWS_WINDOW), NOW), true);
  assert.equal(isFreshArticle(at(NOW - NEWS_WINDOW - 1), NOW), false);
  assert.equal(isFreshArticle(at(NOW + 1), NOW), false);
  assert.equal(isFreshArticle(article({ publishedAt: 'invalid' }), NOW), false);
});

test('all live ordering modes keep old and future stories out even when they score highly', () => {
  const values = [
    article({ id: 'boundary', publishedAt: new Date(NOW - NEWS_WINDOW).toISOString() }),
    article({ id: 'too-old', publishedAt: new Date(NOW - NEWS_WINDOW - 1).toISOString(), spotlight: { score: 200 } }),
    article({ id: 'future', publishedAt: new Date(NOW + 1).toISOString(), spotlight: { score: 200 } }),
  ];
  for (const mode of ['spotlight', 'latest', 'for-you']) {
    assert.deepEqual(ids(filterArticles(values, { mode, interests: { technical: 25 }, now: NOW })), ['boundary']);
  }
});

test('a story ages out as the supplied clock advances without requiring a new server payload', () => {
  const values = [article({ id: 'aging', publishedAt: new Date(NOW - NEWS_WINDOW + 1).toISOString() })];
  assert.deepEqual(ids(filterArticles(values, { now: NOW })), ['aging']);
  assert.deepEqual(ids(filterArticles(values, { now: NOW + 1 })), ['aging']);
  assert.deepEqual(filterArticles(values, { now: NOW + 2 }), []);
});

test('Saved intentionally preserves an older reading archive while rejecting future dates', () => {
  const old = normalizeArticle(article({ id: 'archived', category: 'clinical', publishedAt: new Date(NOW - 30 * NEWS_WINDOW).toISOString() }));
  const future = normalizeArticle(article({ id: 'future', publishedAt: new Date(NOW + 1).toISOString() }));
  assert.ok(old, 'normalization must not delete a valid saved article simply because it is old');
  assert.deepEqual(filterArticles([old], { category: 'all', now: NOW }), []);
  assert.deepEqual(ids(filterArticles([old, future], { category: 'saved', query: 'Research Wire', now: NOW })), ['archived']);
  assert.deepEqual(filterArticles([old], { category: 'saved', query: 'missingword', now: NOW }), []);
});

test('AI geopolitical is a distinct searchable category with safe local artwork', () => {
  assert.ok(CATEGORIES.includes('geopolitical'));
  const policy = normalizeArticle(article({ id: 'policy', title: 'New AI export-control policy', category: 'geopolitical', image: '' }));
  assert.equal(policy.category, 'geopolitical');
  assert.equal(policy.image, '/images/geopolitical.svg');
  assert.deepEqual(ids(filterArticles([article(), policy], { category: 'geopolitical', query: 'policy', now: NOW })), ['policy']);
  assert.equal(filterArticles([policy], { category: 'technical', now: NOW }).length, 0);
});

test('spotlight ordering promotes explained impact while latest remains chronological', () => {
  const important = normalizeArticle(article({ id: 'important', publishedAt: new Date(NOW - 12 * 3_600_000).toISOString(), spotlight: { score: 80, reasons: ['Research impact', 'Independent coverage'], corroboration: { sourceCount: 3, sources: ['Research Wire', 'AI Journal'] } } }));
  const recent = normalizeArticle(article({ id: 'recent', publishedAt: new Date(NOW - 60_000).toISOString(), spotlight: { score: 5, reasons: ['Recent update'] } }));
  assert.deepEqual(ids(filterArticles([recent, important], { mode: 'spotlight', now: NOW })), ['important', 'recent']);
  assert.deepEqual(ids(filterArticles([recent, important], { now: NOW })), ['important', 'recent']);
  assert.deepEqual(ids(filterArticles([important, recent], { mode: 'latest', now: NOW })), ['recent', 'important']);
  assert.deepEqual(important.spotlight.reasons, ['Research impact', 'Independent coverage']);
  assert.equal(important.spotlight.corroboration.sourceCount, 3);
});

test('untrusted spotlight metadata is bounded and invalid scores cannot create infinite priority', () => {
  const normalized = normalizeArticle(article({ spotlight: { score: 999, reasons: ['r'.repeat(150), null, 5, 'Second', 'Third', 'Fourth', 'Fifth'], corroboration: { sourceCount: 500.5, sources: Array.from({ length: 10 }, () => 's'.repeat(150)) } } }));
  assert.equal(normalized.spotlight.score, 200);
  assert.equal(normalized.spotlight.reasons.length, 4);
  assert.equal(normalized.spotlight.reasons[0].length, 120);
  assert.equal(normalized.spotlight.corroboration.sourceCount, 100);
  assert.equal(normalized.spotlight.corroboration.sources.length, 8);
  assert.equal(normalized.spotlight.corroboration.sources[0].length, 120);
  for (const score of [Infinity, NaN, '999', null, {}]) assert.equal(normalizeArticle(article({ spotlight: { score } })).spotlight.score, 0);
  assert.equal(normalizeArticle(article({ spotlight: { score: -1, corroboration: { sourceCount: -10 } } })).spotlight.score, 0);
  assert.equal(normalizeArticle(article({ spotlight: { corroboration: { sourceCount: -10 } } })).spotlight.corroboration.sourceCount, 1);
  assert.deepEqual(normalizeArticle(article()).spotlight.reasons, []);
});

const creatorSignal = (overrides = {}) => ({ id: 'public-video', title: 'An AI workflow explained', url: 'https://www.youtube.com/watch?v=K0GTRWwz38E', image: 'https://i4.ytimg.com/vi/K0GTRWwz38E/hqdefault.jpg', publishedAt: new Date(NOW - 60_000).toISOString(), ...overrides });

test('creator signals retain real public title, date, link and image without inventing replacements', () => {
  const signal = normalizeCreatorSignal(creatorSignal());
  assert.equal(signal.title, 'An AI workflow explained');
  assert.equal(signal.publishedAt, '2026-10-12T17:59:00.000Z');
  assert.equal(signal.url, 'https://www.youtube.com/watch?v=K0GTRWwz38E');
  assert.equal(signal.image, 'https://i4.ytimg.com/vi/K0GTRWwz38E/hqdefault.jpg');
  assert.equal(signal.creator, 'Vaibhav Sisinty');
  for (const invalid of [null, {}, creatorSignal({ title: ' ' }), creatorSignal({ title: 5 }), creatorSignal({ publishedAt: 'invalid' }), creatorSignal({ publishedAt: null }), creatorSignal({ publishedAt: { toString: 1 } }), creatorSignal({ url: '' })]) {
    assert.equal(normalizeCreatorSignal(invalid), null);
  }
  assert.equal(normalizeCreatorSignal(creatorSignal({ image: 'javascript:alert(1)' })).image, '');
});

test('creator links use an exact YouTube hostname allowlist and reject deceptive or active URLs', () => {
  for (const url of ['https://youtube.com/watch?v=K0GTRWwz38E', 'https://www.youtube.com/shorts/OR1cvD8JqEk', 'https://youtu.be/K0GTRWwz38E']) {
    assert.ok(normalizeCreatorSignal(creatorSignal({ url })), url);
  }
  for (const url of ['https://youtube.com.evil.example/watch?v=K0GTRWwz38E', 'https://evil.example/youtube.com', 'https://www.youtube.com@evil.example/watch', 'https://user:password@www.youtube.com/watch?v=K0GTRWwz38E', 'javascript:alert(1)', 'data:text/html,YouTube']) {
    assert.equal(normalizeCreatorSignal(creatorSignal({ url })), null, url);
  }
});

test('creator signals use the same strict publication window and never fabricate a fallback card', () => {
  const entries = [
    creatorSignal({ id: 'boundary', publishedAt: new Date(NOW - NEWS_WINDOW).toISOString() }),
    creatorSignal({ id: 'old', publishedAt: new Date(NOW - NEWS_WINDOW - 1).toISOString() }),
    creatorSignal({ id: 'future', publishedAt: new Date(NOW + 1).toISOString() }),
    null,
  ];
  const fresh = entries.map(normalizeCreatorSignal).filter(Boolean).filter(signal => isFreshArticle(signal, NOW));
  assert.deepEqual(ids(fresh), ['boundary']);
  assert.deepEqual(entries.map(normalizeCreatorSignal).filter(Boolean).filter(signal => isFreshArticle(signal, NOW + NEWS_WINDOW + 2)), []);
  assert.deepEqual([].map(normalizeCreatorSignal).filter(Boolean), []);
});

const curatorDispatch = (overrides = {}) => ({ title: 'Daily AI updates 12 October', url: 'https://www.stayingahead.ai/daily-ai-updates/daily-ai-updates-12-october', publishedAt: new Date(NOW - 60_000).toISOString(), ...overrides });

test('curator dispatch metadata validates the official archive destination and real publication date', () => {
  const dispatch = normalizeCuratorDispatch(curatorDispatch());
  assert.deepEqual(dispatch, curatorDispatch());
  assert.equal(normalizeCuratorDispatch(curatorDispatch({ title: 'x'.repeat(250) })).title.length, 200);
  for (const invalid of [null, {}, curatorDispatch({ title: ' ' }), curatorDispatch({ title: 42 }), curatorDispatch({ publishedAt: 'invalid' }), curatorDispatch({ publishedAt: null }), curatorDispatch({ publishedAt: { toString: 1 } }), curatorDispatch({ url: '' })]) {
    assert.equal(normalizeCuratorDispatch(invalid), null);
  }
  for (const url of ['https://www.stayingahead.ai.evil.example/daily-ai-updates/item', 'https://evil.example/daily-ai-updates/item', 'https://www.stayingahead.ai@evil.example/daily-ai-updates/item', 'https://user:pass@www.stayingahead.ai/daily-ai-updates/item', 'https://www.stayingahead.ai/newsletter/item', 'https://www.stayingahead.ai/daily-ai-updates/../account', 'javascript:alert(1)', '/daily-ai-updates/item']) {
    assert.equal(normalizeCuratorDispatch(curatorDispatch({ url })), null, url);
  }
});

test('a fresh curator digest cannot turn an older linked news article into fresh news', () => {
  const dispatch = normalizeCuratorDispatch(curatorDispatch());
  const originalPublication = new Date(NOW - 6 * NEWS_WINDOW).toISOString();
  const linkedNews = normalizeArticle(article({ publishedAt: originalPublication, curatorPublishedAt: dispatch.publishedAt, spotlight: { score: 200, reasons: ['Mentioned in a recent curator digest'] } }));
  assert.equal(isFreshArticle(dispatch, NOW), true);
  assert.equal(linkedNews.publishedAt, originalPublication);
  assert.deepEqual(filterArticles([linkedNews], { mode: 'spotlight', now: NOW }), []);
  assert.deepEqual(ids(filterArticles([linkedNews], { category: 'saved', now: NOW })), ['research-1']);
  assert.equal(isFreshArticle(dispatch, NOW + NEWS_WINDOW), false);
});

test('storage corruption and blocked storage return fallbacks without crashing', (t) => {
  const values = new Map();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  t.after(() => { if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage; });
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }, configurable: true });
  assert.deepEqual(readStorage('saved:v1', []), []);
  assert.equal(writeStorage('saved:v1', [article()]), true);
  assert.deepEqual(readStorage('saved:v1', []), [article()]);
  assert.ok(values.has('dhivi:saved:v1'));
  values.set('dhivi:saved:v1', '{broken');
  assert.deepEqual(readStorage('saved:v1', []), []);
  values.set('dhivi:saved:v1', 'null');
  assert.deepEqual(readStorage('saved:v1', []), []);
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }, configurable: true });
  assert.deepEqual(readStorage('saved:v1', []), []);
  assert.equal(writeStorage('saved:v1', []), false);
});

test('relative timestamps distinguish fresh, minute, hour and day boundaries', () => {
  const ago = minutes => new Date(NOW - minutes * 60_000).toISOString();
  assert.equal(relativeTime(ago(0), NOW), 'Just now');
  assert.equal(relativeTime(ago(1), NOW), '1m ago');
  assert.equal(relativeTime(ago(59), NOW), '59m ago');
  assert.equal(relativeTime(ago(60), NOW), '1h ago');
  assert.equal(relativeTime(ago(1440), NOW), '1d ago');
  assert.equal(relativeTime(ago(-1), NOW), 'Just now');
});
