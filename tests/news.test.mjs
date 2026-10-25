import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ARTICLE_AGE, MAX_ARTICLES_PER_FEED, MAX_FEED_BYTES, REFRESH_INTERVAL, SOURCES, canonicalUrl, classifyArticle, deduplicateArticles, fetchArticleImage, fetchFeed, isWithinNewsWindow, parseFeed, parseOpenGraphImage, plainText, safeUrl } from '../netlify/functions/lib/feeds.mjs';
import { annotateSpotlight, rankSpotlight, relatedHeadlines } from '../netlify/functions/lib/spotlight.mjs';
import { MAX_CURATOR_BYTES, fetchCuratorDispatch, parseCuratorDispatch } from '../netlify/functions/lib/curator.mjs';
import handler, { cacheSecondsForResponse, createNewsService, projectNewsResponse, runSourceChecks } from '../netlify/functions/news.mjs';

const NOW = Date.parse('2026-10-12T18:00:00Z');
const source = { id: 'test', name: 'Test Research', url: 'https://publisher.example/feed', siteUrl: 'https://publisher.example', aiOnly: true };
const rss = (items) => `<rss version="2.0"><channel>${items}</channel></rss>`;
const item = ({ title = 'New AI research improves reasoning', url = 'https://publisher.example/article', date = 'Mon, 12 Oct 2026 12:00:00 GMT', extra = '', description = 'Researchers publish an AI benchmark.' } = {}) => `<item><title>${title}</title><link>${url}</link>${date ? `<pubDate>${date}</pubDate>` : ''}<description><![CDATA[${description}]]></description>${extra}</item>`;

test('RSS parsing preserves publisher dates, extracts media, and returns only plain text', () => {
  const articles = parseFeed(rss(item({ extra: '<media:thumbnail xmlns:media="http://search.yahoo.com/mrss/" url="https://images.example/robot.jpg"/>', description: '<script>bad()</script><p>AI &amp; researchers &lt;3</p>' })), source, NOW);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].publishedAt, '2026-10-12T12:00:00.000Z');
  assert.equal(articles[0].image, 'https://images.example/robot.jpg');
  assert.equal(articles[0].summary, 'AI & researchers <3');
  assert.equal(articles[0].category, 'technical');
  assert.equal(articles[0].id.length, 24);
});

test('Atom and RDF feeds retain real links and published dates', () => {
  const atom = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>New AI model benchmark</title><link rel="self" href="https://publisher.example/feed/entry"/><link rel="alternate" href="https://publisher.example/atom"/><published>2026-10-12T08:00:00Z</published><summary>Machine learning research</summary></entry></feed>';
  assert.equal(parseFeed(atom, source, NOW)[0].url, 'https://publisher.example/atom');
  const rdf = '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><item rdf:about="https://publisher.example/clinical"><title>AI helps clinical diagnosis</title><dc:date>2026-10-12</dc:date></item></rdf:RDF>';
  const article = parseFeed(rdf, { ...source, aiOnly: false }, NOW)[0];
  assert.equal(article.category, 'clinical');
  assert.equal(article.image, '/images/clinical.svg');
});

test('HTML images resolve relative links; non-images and pixel trackers are skipped', () => {
  const articles = parseFeed(rss(item({ description: '<p>AI research</p><img width="1" height="1" src="https://tracker.example/pixel.png"><img src="/photos/research.webp">' })), source, NOW);
  assert.equal(articles[0].image, 'https://publisher.example/photos/research.webp');
  assert.equal(parseFeed(rss(item()), source, NOW)[0].image, '/images/technical.svg');
});

test('DTD, oversized XML, malformed XML and non-feeds are rejected', () => {
  assert.throws(() => parseFeed('<!DOCTYPE rss [<!ENTITY boom "boom">]><rss><channel/></rss>', source, NOW), /DTD/);
  assert.throws(() => parseFeed('x'.repeat(MAX_FEED_BYTES + 1), source, NOW), /large/);
  assert.throws(() => parseFeed('<rss><item></rss>', source, NOW), /XML/);
  assert.throws(() => parseFeed('<html><body>not a feed</body></html>', source, NOW), /RSS/);
  const harmless = rss(`<!-- Literal example: <!DOCTYPE html> -->${item({ description: '<!doctype html><html><body><p>Artificial intelligence research article.</p></body></html>' })}`);
  const articles = parseFeed(harmless, source, NOW);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].summary, 'Artificial intelligence research article.');
  assert.throws(() => parseFeed('<!DOCTYPE rss [<!ENTITY external SYSTEM "file:///secret">]>' + harmless, source, NOW), /DTD/);
});

test('unsafe links, undated, old, future and non-AI articles are excluded', () => {
  const xml = rss([
    item({ url: 'javascript:alert(1)' }), item({ url: 'https://localhost/private' }), item({ date: '' }),
    item({ date: '2020-01-01' }), item({ date: '2030-01-01' }), item({ title: 'Hospital upgrades its parking lot', description: 'A new parking area opens.' }),
    item({ title: 'Clinical AI finds a new signal', url: 'https://publisher.example/good' }),
  ].join(''));
  const articles = parseFeed(xml, { ...source, aiOnly: false }, NOW);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].url, 'https://publisher.example/good');
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,x', 'file:///secret', 'http://127.0.0.1', 'http://10.0.0.1', 'http://172.18.0.1', 'http://192.168.1.1', 'http://[::1]/', 'https://user:pass@example.com']) assert.equal(safeUrl(url), null);
  assert.equal(safeUrl(undefined, source.url), null);
  assert.equal(safeUrl('/article', source.url), 'https://publisher.example/article');
});

test('mixed AI topic feeds exclude unrelated stories while retaining named AI products', () => {
  const xml = rss([
    item({ title: 'MIT spinout turns plastic waste into resilient building materials', description: 'A new manufacturing process transforms plastic waste.', url: 'https://publisher.example/plastics' }),
    item({ title: 'NotebookLM adds a new workspace', description: 'A research assistant that helps organize documents.', url: 'https://publisher.example/notebooklm' }),
    item({ title: 'Gemma improves coding benchmarks', description: 'The latest open model scores higher.', url: 'https://publisher.example/gemma' }),
  ].join(''));
  for (const id of ['mit', 'google-ai']) {
    const articles = parseFeed(xml, SOURCES.find(source => source.id === id), NOW);
    assert.equal(articles.length, 2);
    assert.equal(articles.some(article => article.url.endsWith('/plastics')), false);
  }
});

test('classification prioritizes clinical, explicit research subjects, then tool launches', () => {
  assert.equal(classifyArticle('New AI clinical assistant launches for doctors', 'A research model'), 'clinical');
  assert.equal(classifyArticle('Introducing a new AI coding tool', 'A research model'), 'tools');
  assert.equal(classifyArticle('Top 12 AI live translation tools in 2026'), 'tools');
  assert.equal(classifyArticle('Introducing a new browser agent tool', 'An assistant that books travel and completes tasks.'), 'tools');
  assert.equal(classifyArticle('Alibaba Qwen Introduces QwenGyre: Elastic Reinforcement Learning RL for XLong-Horizon Agents', 'A framework for agent training.'), 'technical');
  assert.equal(classifyArticle('Introducing a new model training framework for agents'), 'technical');
  assert.equal(classifyArticle('New benchmarks evaluate coding agents'), 'technical');
  assert.equal(classifyArticle('A new clinical reinforcement learning benchmark'), 'clinical');
  assert.equal(classifyArticle('Researchers improve inference for language models'), 'technical');
  assert.equal(classifyArticle('AI investment reaches a record high'), 'news');
  assert.equal(classifyArticle('AI documentation releases', '', 'clinical'), 'clinical');
});

test('deduplication removes tracking variants and duplicate titles without losing order', () => {
  const articles = parseFeed(rss(item({ url: 'https://publisher.example/article?utm_source=feed' }) + item({ url: 'https://publisher.example/article?fbclid=123' }) + item({ url: 'https://other.example/syndicated' })), source, NOW);
  assert.equal(deduplicateArticles(articles, NOW).length, 1);
  assert.equal(canonicalUrl('https://example.com/a?utm_source=rss&b=2&a=1#top'), 'https://example.com/a?a=1&b=2');
  assert.equal(plainText('&lt;b&gt;AI news&lt;/b&gt;'), 'AI news');
});

test('feed body limits are enforced even without a content-length header', async () => {
  await assert.rejects(fetchFeed(source, { fetchImpl: async () => new Response('x'.repeat(MAX_FEED_BYTES + 1)), now: NOW }), /large/);
});

test('Open Graph thumbnails handle attribute order, escaping and unsafe destinations', async () => {
  assert.equal(parseOpenGraphImage('<meta content="https://images.example/a.jpg?x=1&amp;y=2" property="og:image">', source.url), 'https://images.example/a.jpg?x=1&y=2');
  assert.equal(parseOpenGraphImage('<meta name="twitter:image" content="/photo.webp">', source.url), 'https://publisher.example/photo.webp');
  assert.equal(parseOpenGraphImage('<meta property="og:image" content="javascript:alert(1)">', source.url), null);
  let calls = 0;
  const fetchImpl = async () => { calls++; return new Response('<html><head><meta property="og:image" content="/image.jpg"></head></html>', { headers: { 'content-type': 'text/html' } }); };
  assert.equal(await fetchArticleImage({ url: 'https://unknown.example/article' }, source, fetchImpl), null);
  assert.equal(calls, 0);
  assert.equal(await fetchArticleImage({ url: 'https://publisher.example/article' }, source, fetchImpl), 'https://publisher.example/image.jpg');
  assert.equal(calls, 1);
});

test('service coalesces concurrent requests, caches for exactly one hour and keeps qualifying stale articles', async () => {
  let now = NOW;
  let calls = 0;
  let fail = false;
  const service = createNewsService({ sources: [source], creatorSource: null, curatorUrl: null, clock: () => now, imageEnrichment: false, fetchImpl: async () => { calls++; if (fail) throw new Error('offline'); return new Response(rss(item())); } });
  const [first, second] = await Promise.all([service(), service()]);
  assert.equal(calls, 1);
  assert.deepEqual(first, second);
  assert.equal(first.payload.partial, false);
  assert.equal(first.payload.counts.technical, 1);
  assert.equal(first.payload.refreshInterval, 3_600_000);
  assert.equal(first.expiresAt, NOW + 3_600_000);
  await service(); assert.equal(calls, 1);
  now = NOW + 3_600_000 - 1;
  const beforeHour = await service();
  assert.equal(calls, 1);
  assert.equal(beforeHour.payload.updatedAt, first.payload.updatedAt);
  now += 1; fail = true;
  const stale = await service();
  assert.equal(calls, 2);
  assert.equal(stale.status, 200);
  assert.equal(stale.payload.stale, true);
  assert.equal(stale.payload.sources[0].ok, false);
  assert.equal(stale.payload.articles.length, 1);
  now += 24 * 60 * 60 * 1_000;
  const expired = await service();
  assert.equal(expired.status, 503);
  assert.equal(expired.payload.articles.length, 0);
});

test('cold failure returns an honest empty 503 with automatic retry metadata', async () => {
  const service = createNewsService({ sources: [source], creatorSource: null, curatorUrl: null, clock: () => NOW, fetchImpl: async () => { throw new Error('offline'); } });
  const response = await service();
  assert.equal(response.status, 503);
  assert.deepEqual(response.payload.articles, []);
  assert.equal(response.payload.refreshInterval, 3_600_000);
  assert.equal(response.payload.partial, true);
});

test('endpoint restricts methods without fetching remote sources', async () => {
  const response = await handler(new Request('https://example.com/.netlify/functions/news', { method: 'POST' }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET, HEAD');
});

test('the strict 24-hour window includes its exact boundaries and rejects every future timestamp', () => {
  assert.equal(MAX_ARTICLE_AGE, 86_400_000);
  assert.equal(isWithinNewsWindow(NOW, NOW), true);
  assert.equal(isWithinNewsWindow(NOW - MAX_ARTICLE_AGE, NOW), true);
  assert.equal(isWithinNewsWindow(NOW - MAX_ARTICLE_AGE - 1, NOW), false);
  assert.equal(isWithinNewsWindow(NOW + 1, NOW), false);
  assert.equal(isWithinNewsWindow('invalid', NOW), false);
  const dates = [NOW, NOW - MAX_ARTICLE_AGE, NOW - MAX_ARTICLE_AGE - 1, NOW + 1];
  const articles = parseFeed(rss(dates.map((date, index) => item({ title: `AI research story number ${index}`, date: new Date(date).toISOString(), url: `https://publisher.example/${index}` })).join('')), source, NOW);
  assert.deepEqual(articles.map(a => a.url), ['https://publisher.example/0', 'https://publisher.example/1']);
  assert.equal(deduplicateArticles([...articles, { ...articles[0], id: 'future', publishedAt: new Date(NOW + 1).toISOString() }], NOW).length, 2);
});

test('geopolitical classification recognizes meaningful policy and security stories without generic policy boilerplate', () => {
  for (const title of ['US tightens export controls on AI chips', 'Microsoft says UK should drive AI regulation', 'New law governs clinical AI tools in hospitals', 'France launches sovereign AI infrastructure', 'WindBorne wins an Air Force contract using AI', 'China and US compete in AI', 'AI diplomacy shapes national security']) assert.equal(classifyArticle(title), 'geopolitical', title);
  assert.equal(classifyArticle('New AI clinical assistant launches', 'A tool for doctors. We comply with applicable regulations.'), 'clinical');
  assert.equal(classifyArticle('A new reinforcement learning policy improves agents'), 'technical');
  assert.equal(classifyArticle('Researchers improve inference on new AI chips'), 'technical');
  const nonAI = parseFeed(rss(item({ title: 'Government approves a healthcare parking law', description: 'New rules on parking take effect.' })), { ...source, aiOnly: false }, NOW);
  assert.equal(nonAI.length, 0);
});

test('AI agency investigations and US military branches are geopolitical without acronym or color false positives', () => {
  for (const title of [
    'FTC subpoenas OpenAI and Anthropic following safety failures',
    'Report: FTC probes Anthropic, OpenAI after Trump dismissed AI fears as a hoax',
    'Federal Trade Commission investigates AI companies',
    "US Navy could see first VTOL X-BAT UAV as Shield AI funding reaches $200 million",
    'U.S. Navy tests AI navigation',
  ]) assert.equal(classifyArticle(title), 'geopolitical', title);
  assert.equal(classifyArticle('AI researchers benchmark an FTC method', '', 'technical'), 'technical');
  assert.equal(classifyArticle('AI creates navy blue product images', '', 'technical'), 'technical');
  assert.equal(classifyArticle('FDA approves an AI diagnostic tool for cancer'), 'clinical');
});

test('software incident diagnosis remains a tool or technical topic while medical diagnosis stays clinical', () => {
  const title = 'Introducing Devin Oncall';
  const description = 'Devin Oncall is now generally available. Devin automatically investigates alerts and bug reports and helps your team diagnose and resolve production incidents.';
  const [article] = parseFeed(rss(item({ title, description })), source, NOW);
  assert.equal(article.category, 'tools');
  assert.equal(article.tags.includes('Healthcare'), false);
  for (const summary of ['AI diagnoses software errors.', 'AI diagnostics for database outages.', 'AI helps diagnose server crashes.']) {
    const [technical] = parseFeed(rss(item({ title: 'AI incident investigation benchmark', description: summary })), source, NOW);
    assert.equal(technical.category, 'technical');
    assert.equal(technical.tags.includes('Healthcare'), false);
  }
  assert.equal(classifyArticle('AI diagnoses pneumonia earlier'), 'clinical');
  assert.equal(classifyArticle('AI diagnostic benchmark for patients'), 'clinical');
  assert.equal(classifyArticle('AI assistants help doctors', description), 'clinical');
});

test('leaked health information alone does not turn agent safety reporting into clinical news', () => {
  const title = 'AI agents go rogue chasing a £350 train refund — six personal assistant models spam politicians, fabricate lies, and leak private medical data after missing a 28-day claim deadline';
  const description = 'Six AI assistants chasing a £350 train refund spammed officials, invented excuses, and leaked private health details, though each model was tested only once.';
  const [article] = parseFeed(rss(item({ title, description })), source, NOW);
  assert.equal(article.category, 'technical');
  assert.equal(article.tags.includes('Healthcare'), false);
  const [ranked] = annotateSpotlight([article], { now: NOW });
  assert.equal(ranked.spotlight.reasons.includes('Clinical AI research or healthcare impact'), false);
  for (const phrase of ['leaks medical information', 'exposes sensitive health records', 'exposing personal medical details']) {
    assert.equal(classifyArticle('AI agent safety benchmark', phrase), 'technical', phrase);
    assert.equal(classifyArticle('AI agent safety benchmark', phrase, 'clinical'), 'clinical', phrase);
  }
  assert.equal(classifyArticle('AI hospital assistant leaked private medical data'), 'clinical');
  assert.equal(classifyArticle('AI improves diagnosis using medical data'), 'clinical');
  assert.equal(classifyArticle('AI agents exposed sensitive health records', 'Researchers study patient safety.'), 'clinical');
});

test('biological regulation is not government policy while actual AI regulation remains geopolitical', () => {
  const title = 'Spatiotemporal AI-based modeling of gene regulation and variant effects in the developing human brain using Seal';
  const journal = { ...source, kind: 'research', contentType: 'journal', category: 'clinical', aiOnly: false };
  const description = 'Nature Neuroscience, Published online: 15 October 2026; doi:10.1038/s41593-026-02470-2 Seal is an artificial intelligence framework that predicts the effects of regulatory variants in 802 brain cell states, revealing spatiotemporal gene regulation and pinpointing cell types and developmental stages associated with neuropsychiatric conditions.';
  const [article] = parseFeed(rss(item({ title, description })), journal, NOW);
  assert.equal(article.category, 'clinical');
  assert.equal(article.tags.includes('Policy'), false);
  const [annotated] = annotateSpotlight([article], { now: NOW });
  assert.equal(annotated.spotlight.reasons.some(reason => /policy|national.security|international competition/i.test(reason)), false);
  const [technicalSourceArticle] = parseFeed(rss(item({ title, description })), { ...journal, category: 'technical' }, NOW);
  assert.equal(technicalSourceArticle.category, 'clinical');
  assert.equal(technicalSourceArticle.tags.includes('Healthcare'), true);
  assert.equal(technicalSourceArticle.tags.includes('Policy'), false);
  const [titleOnlyArticle] = parseFeed(rss(item({ title, description: '' })), { ...journal, category: 'technical' }, NOW);
  assert.equal(titleOnlyArticle.summary, '');
  assert.equal(titleOnlyArticle.category, 'clinical');
  assert.equal(titleOnlyArticle.tags.includes('Healthcare'), true);
  assert.equal(titleOnlyArticle.tags.includes('Policy'), false);
  assert.equal(classifyArticle('AI predicts psychiatric conditions', 'A machine learning study.', 'technical'), 'clinical');
  assert.equal(classifyArticle('AI models imitate brain activity', 'A neural architecture benchmark.', 'technical'), 'technical');
  assert.equal(classifyArticle('AI architectures inspired by the human brain', '', 'technical'), 'technical');
  assert.equal(classifyArticle('AI models predict gene regulation in plants', '', 'technical'), 'technical');
  assert.equal(classifyArticle('AI models investigate transcriptional regulation', 'A machine learning study of regulation of gene expression.'), 'technical');
  for (const title of ['Government announces AI regulation for gene editing tools', 'Gene regulation researchers debate new AI regulation', 'US tightens export controls on AI chips']) {
    assert.equal(classifyArticle(title), 'geopolitical', title);
    const [policy] = parseFeed(rss(item({ title, description: 'Government regulations and AI policy are changing.' })), { ...source, aiOnly: false }, NOW);
    assert.equal(policy.tags.includes('Policy'), true, title);
  }
});

test('AI depression research and caregiver mental-health studies are clinical across mixed journals', () => {
  const journal = { ...source, kind: 'research', contentType: 'journal', category: 'technical', aiOnly: false };
  const articles = parseFeed(rss([
    item({ title: 'Using valence and arousal scoring in speech to detect depressive symptoms: A study on family caregivers', description: 'These features were predictors in nine machine learning models evaluated under nested cross-validation.', url: 'https://publisher.example/depressive' }),
    item({ title: 'Machine learning predicts depression risk', description: 'An evaluation of screening performance.', url: 'https://publisher.example/depression' }),
    item({ title: 'AI supports family caregivers', description: 'A mental health intervention.', url: 'https://publisher.example/caregiver' }),
  ].join('')), journal, NOW);
  assert.equal(articles.length, 3);
  assert.equal(articles.every(article => article.category === 'clinical' && article.tags.includes('Healthcare')), true);
  const nonAI = parseFeed(rss(item({ title: 'Family caregivers report depressive symptoms', description: 'A qualitative interview study.' })), journal, NOW);
  assert.equal(nonAI.length, 0);
});

const articleFixture = (id, overrides = {}) => ({ id, title: 'AI company reports a business update', summary: '', url: `https://publisher.example/${id}`, image: '/images/news.svg', source: 'Publisher One', sourceId: 'one', publishedAt: new Date(NOW - 3_600_000).toISOString(), category: 'news', tags: [], ...overrides });

test('spotlight counts distinct publishers before deduplication and labels related coverage honestly', () => {
  const a = articleFixture('a', { title: 'QwenGyre elastic reinforcement learning framework for coding agents', sourceId: 'google-ai', source: 'Google AI', category: 'technical' });
  const b = { ...a, id: 'b', url: 'https://research.google/b', sourceId: 'google-research', source: 'Google Research' };
  const c = { ...a, id: 'c', url: 'https://second.example/c', sourceId: 'second', source: 'Publisher Two' };
  const old = { ...c, id: 'old', sourceId: 'third', publishedAt: new Date(NOW - MAX_ARTICLE_AGE - 1).toISOString() };
  const future = { ...c, id: 'future', sourceId: 'fourth', publishedAt: new Date(NOW + 1).toISOString() };
  const [annotated] = annotateSpotlight([a], { now: NOW, coverageArticles: [a, b, c, old, future] });
  assert.equal(annotated.spotlight.corroboration.sourceCount, 2);
  assert.equal(annotated.spotlight.corroboration.otherSourceCount, 1);
  assert.deepEqual(annotated.spotlight.corroboration.sources, ['Google', 'Publisher Two']);
  assert.match(annotated.spotlight.corroboration.note, /not independent verification/);
  assert.equal(annotated.spotlight.reasons.some(reason => /popular|trending/i.test(reason)), false);
  assert.equal(relatedHeadlines('OpenAI introduces an AI tool', 'OpenAI releases another AI model'), false);
});

test('spotlight explains impact, respects recency, and only uses specific fresh creator topics', () => {
  const model = articleFixture('model', { title: 'Meta releases frontier model Muse Wonder', category: 'technical', publishedAt: new Date(NOW - 3 * 3_600_000).toISOString() });
  const news = articleFixture('news');
  const ranked = rankSpotlight(annotateSpotlight([news, model], { now: NOW }));
  assert.equal(ranked[0].id, 'model');
  assert.ok(ranked[0].spotlight.reasons.includes('Concrete AI model or weights release'));
  const signal = { id: 'signal', title: 'Meta releases frontier model Muse Wonder', url: 'https://youtube.com/watch?v=example', creator: 'Vaibhav Sisinty', publishedAt: new Date(NOW).toISOString() };
  const [boosted] = annotateSpotlight([model], { now: NOW, creatorSignals: [signal] });
  assert.equal(boosted.spotlight.score, ranked[0].spotlight.score + 8);
  assert.equal(boosted.spotlight.creatorSignal.creator, 'Vaibhav Sisinty');
  const [weak] = annotateSpotlight([model], { now: NOW, creatorSignals: [{ ...signal, title: 'Meta and OpenAI show new AI tools' }] });
  assert.equal(weak.spotlight.creatorSignal, undefined);
  const [expired] = annotateSpotlight([model], { now: NOW, creatorSignals: [{ ...signal, publishedAt: new Date(NOW - MAX_ARTICLE_AGE - 1).toISOString() }] });
  assert.equal(expired.spotlight.creatorSignal, undefined);
});

test('cached responses age out stories at serve time without refetch and cap CDN expiry', async () => {
  let now = NOW;
  let calls = 0;
  const date = new Date(NOW - MAX_ARTICLE_AGE + 30_000).toISOString();
  const service = createNewsService({ sources: [source], creatorSource: null, curatorUrl: null, clock: () => now, imageEnrichment: false, fetchImpl: async () => { calls++; return new Response(rss(item({ date }))); } });
  const first = await service();
  assert.equal(first.payload.articles.length, 1);
  assert.equal(first.expiresAt, NOW + 30_000);
  assert.equal(first.payload.windowHours, 24);
  now += 30_001;
  const aged = await service();
  assert.equal(calls, 1);
  assert.equal(aged.payload.articles.length, 0);
  assert.equal(aged.payload.counts.all, 0);
  assert.equal(aged.payload.sources[0].articleCount, 0);
  assert.equal(aged.payload.windowStart, new Date(now - MAX_ARTICLE_AGE).toISOString());
});

test('creator updates stay separate, ignore promotional descriptions, and fail without failing news', async () => {
  const creator = { id: 'creator', name: 'Vaibhav Sisinty', url: 'https://youtube.example/feed', siteUrl: 'https://youtube.example/channel', aiOnly: true };
  let now = NOW, failCreator = false;
  const atom = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Specific frontier model release explained</title><link rel="alternate" href="https://youtube.example/watch?v=example"/><published>2026-10-12T17:59:30Z</published><media:group xmlns:media="http://search.yahoo.com/mrss/"><media:thumbnail url="https://images.example/creator.jpg"/><media:description>BUY MY COURSE; not factual news</media:description></media:group></entry></feed>';
  const service = createNewsService({ sources: [source], creatorSource: creator, curatorUrl: null, clock: () => now, imageEnrichment: false, fetchImpl: async url => { if (url === creator.url) { if (failCreator) throw new Error('offline'); return new Response(atom); } return new Response(rss(item())); } });
  const fresh = await service();
  assert.equal(fresh.payload.articles.length, 1);
  assert.equal(fresh.payload.sources.length, 1);
  assert.equal(fresh.payload.creatorSignals.length, 1);
  assert.equal(fresh.payload.creatorSignals[0].image, 'https://images.example/creator.jpg');
  assert.equal(JSON.stringify(fresh.payload).includes('BUY MY COURSE'), false);
  assert.equal(fresh.payload.creatorStatus.freshCount, 1);
  failCreator = true; now += REFRESH_INTERVAL;
  const degraded = await service();
  assert.equal(degraded.status, 200);
  assert.equal(degraded.payload.partial, false);
  assert.equal(degraded.payload.creatorStatus.ok, false);
  assert.equal(degraded.payload.creatorSignals.length, 1);
  now += MAX_ARTICLE_AGE;
  const expired = await service();
  assert.equal(expired.payload.creatorSignals.length, 0);
});

const dispatchFixture = overrides => ({ docs: [{ _status: 'published', title: 'Daily AI updates', slug: 'daily-ai-updates', publishedDate: new Date(NOW).toISOString(), body: '<h3><a href="https://publisher.example/model?utm_source=digest">1. Meta releases frontier model Muse Wonder</a><span>Publisher</span></h3><p>Private prose must not be included</p><img src="data:image/png;base64,xyz">', ...overrides }] });

test('curator dispatch extracts only real external topic anchors with strict publication checks', async () => {
  const dispatch = parseCuratorDispatch(dispatchFixture(), NOW);
  assert.equal(dispatch.topics.length, 1);
  assert.equal(dispatch.topics[0].title, 'Meta releases frontier model Muse Wonder');
  assert.equal(dispatch.url, 'https://www.stayingahead.ai/daily-ai-updates/daily-ai-updates');
  assert.equal(JSON.stringify(dispatch).includes('Private prose'), false);
  assert.equal(JSON.stringify(dispatch).includes('data:image'), false);
  assert.equal(parseCuratorDispatch(dispatchFixture({ publishedDate: new Date(NOW + 1).toISOString() }), NOW), null);
  assert.equal(parseCuratorDispatch(dispatchFixture({ publishedDate: new Date(NOW - MAX_ARTICLE_AGE - 1).toISOString() }), NOW), null);
  assert.equal(parseCuratorDispatch(dispatchFixture({ slug: '../unsafe' }), NOW), null);
  assert.equal(parseCuratorDispatch(dispatchFixture({ _status: 'draft' }), NOW), null);
  assert.equal(parseCuratorDispatch(dispatchFixture({ body: '<h3><a href="javascript:alert(1)">Unsafe headline</a></h3>' }), NOW), null);
  await assert.rejects(fetchCuratorDispatch({ now: NOW, fetchImpl: async () => new Response('x'.repeat(MAX_CURATOR_BYTES + 1), { headers: { 'content-type': 'application/json' } }) }), /large/);
});

test('a fresh digest only boosts already fresh articles and never changes publisher dates', () => {
  const dispatch = parseCuratorDispatch(dispatchFixture(), NOW);
  const fresh = articleFixture('model', { title: 'Meta releases frontier model Muse Wonder', category: 'technical' });
  const old = articleFixture('old', { ...fresh, id: 'old', publishedAt: new Date(NOW - MAX_ARTICLE_AGE - 1).toISOString() });
  const ranked = annotateSpotlight([fresh, old], { now: NOW, curatorDispatch: dispatch });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].publishedAt, fresh.publishedAt);
  assert.ok(ranked[0].spotlight.reasons.includes('In today’s Staying Ahead briefing'));
  const cache = { articles: [old], coverageArticles: [old], creatorSignals: [], creatorStatus: null, curatorDispatch: dispatch, sources: [{ ...source, ok: true }], updatedAt: new Date(NOW).toISOString(), expiresAt: NOW + REFRESH_INTERVAL };
  assert.equal(projectNewsResponse(cache, NOW).payload.articles.length, 0);
});

test('cached creator and curator metadata expire at their own exact 24-hour boundaries', () => {
  const date = new Date(NOW - MAX_ARTICLE_AGE + 500).toISOString();
  const signal = { id: 'signal', title: 'A specific public creator topic', url: 'https://youtube.example/watch?v=signal', image: '/images/news.svg', publishedAt: date, creator: 'Vaibhav Sisinty' };
  const dispatch = parseCuratorDispatch(dispatchFixture({ publishedDate: date }), NOW);
  const cache = { articles: [articleFixture('fresh')], coverageArticles: [articleFixture('fresh')], creatorSignals: [signal], creatorStatus: { name: 'Vaibhav Sisinty', ok: true }, curatorDispatch: dispatch, sources: [{ ...source, ok: true }], updatedAt: new Date(NOW).toISOString(), expiresAt: NOW + REFRESH_INTERVAL };
  const fresh = projectNewsResponse(cache, NOW);
  assert.equal(fresh.expiresAt, NOW + 500);
  const aged = projectNewsResponse(cache, NOW + 501);
  assert.equal(aged.payload.creatorSignals.length, 0);
  assert.equal(aged.payload.creatorStatus.freshCount, 0);
  assert.equal(aged.payload.curatorDispatch, null);
  assert.equal(aged.payload.articles.length, 1);
});

test('an optional curator failure leaves healthy news and creator status independent', async () => {
  const service = createNewsService({ sources: [source], creatorSource: null, curatorUrl: 'https://curator.example/dispatches', imageEnrichment: false, clock: () => NOW, fetchImpl: async url => { if (url.includes('curator.example')) throw new Error('offline'); return new Response(rss(item())); } });
  const response = await service();
  assert.equal(response.status, 200);
  assert.equal(response.payload.partial, false);
  assert.equal(response.payload.curatorDispatch, null);
  assert.equal(response.payload.creatorStatus, null);
});

test('hourly CDN lifetime rounds down, never exceeds one hour and stops at subsecond content expiry', () => {
  assert.equal(REFRESH_INTERVAL, 3_600_000);
  assert.equal(cacheSecondsForResponse(NOW + REFRESH_INTERVAL, NOW), 3_600);
  assert.equal(cacheSecondsForResponse(NOW + 2 * REFRESH_INTERVAL, NOW), 3_600);
  assert.equal(cacheSecondsForResponse(NOW + 30_999, NOW), 30);
  assert.equal(cacheSecondsForResponse(NOW + 999, NOW), 0);
  assert.equal(cacheSecondsForResponse(NOW - 1, NOW), 0);
  const article = articleFixture('expiring', { publishedAt: new Date(NOW - MAX_ARTICLE_AGE + 900).toISOString() });
  const cache = { articles: [article], coverageArticles: [article], creatorSignals: [], creatorStatus: null, curatorDispatch: null, sources: [{ ...source, ok: true }], updatedAt: new Date(NOW).toISOString(), expiresAt: NOW + REFRESH_INTERVAL };
  const response = projectNewsResponse(cache, NOW);
  assert.equal(response.expiresAt, NOW + 900);
  assert.equal(cacheSecondsForResponse(response.expiresAt, NOW), 0);
  assert.equal(projectNewsResponse(cache, NOW + 901).payload.articles.length, 0);
});

test('an unavailable source also respects the hourly fetch cadence', async () => {
  let now = NOW;
  let calls = 0;
  const service = createNewsService({ sources: [source], creatorSource: null, curatorUrl: null, clock: () => now, fetchImpl: async () => { calls++; throw new Error('offline'); } });
  assert.equal((await service()).status, 503);
  now += REFRESH_INTERVAL - 1;
  assert.equal((await service()).status, 503);
  assert.equal(calls, 1);
  now += 1;
  assert.equal((await service()).status, 503);
  assert.equal(calls, 2);
});

test('200 source checks stay within global and per-host concurrency caps', async () => {
  const sources = Array.from({ length: 200 }, (_, index) => ({ id: String(index), url: `https://host${Math.floor(index / 10)}.example/feed/${index}` }));
  let active = 0, peak = 0;
  const hosts = new Map();
  let hostPeak = 0;
  const checks = await runSourceChecks(sources, async source => {
    const host = new URL(source.url).hostname;
    active++; peak = Math.max(peak, active);
    hosts.set(host, (hosts.get(host) ?? 0) + 1); hostPeak = Math.max(hostPeak, hosts.get(host));
    await new Promise(resolve => setTimeout(resolve, 3));
    hosts.set(host, hosts.get(host) - 1); active--;
    return source.id;
  }, { concurrency: 16, perHost: 2, deadlineMs: 2_000 });
  assert.equal(checks.length, 200);
  assert.equal(checks.every(check => check.status === 'fulfilled'), true);
  assert.deepEqual(checks.map(check => check.value), sources.map(source => source.id));
  assert.equal(peak, 16);
  assert.equal(hostPeak, 2);
});

test('the global deadline aborts active checks and reports untouched feeds as deferred', async () => {
  const sources = Array.from({ length: 60 }, (_, index) => ({ id: String(index), url: `https://host${index % 2}.example/${index}` }));
  let started = 0, aborted = 0;
  const start = Date.now();
  const checks = await runSourceChecks(sources, (_, signal) => { started++; return new Promise((_, reject) => signal.addEventListener('abort', () => { aborted++; reject(new Error('cancelled')); }, { once: true })); }, { concurrency: 16, perHost: 2, deadlineMs: 35 });
  assert.ok(Date.now() - start < 500);
  assert.equal(started, 4);
  assert.equal(aborted, 4);
  assert.equal(checks.length, 60);
  assert.equal(checks.every(check => check.status === 'deferred'), true);
  assert.equal(checks.filter(check => check.attempted).length, 4);
});

test('large news caps retain smaller publishers and keep final ordering chronological', () => {
  const articles = Array.from({ length: 500 }, (_, index) => articleFixture(`large-${index}`, { title: `AI discovery distinct topic ${index}`, publisherId: 'large', publishedAt: new Date(NOW - index * 1000).toISOString() }));
  articles.push(articleFixture('small-a', { title: 'Small publisher unique AI story alpha', publisherId: 'small-a', publishedAt: new Date(NOW - 20_000_000).toISOString() }), articleFixture('small-b', { title: 'Small publisher unique AI story beta', publisherId: 'small-b', publishedAt: new Date(NOW - 30_000_000).toISOString() }));
  const balanced = deduplicateArticles(articles, NOW, { limit: 10 });
  assert.equal(balanced.length, 10);
  assert.ok(balanced.some(article => article.id === 'small-a'));
  assert.ok(balanced.some(article => article.id === 'small-b'));
  assert.equal(balanced.every((article, index) => !index || article.publishedAt <= balanced[index - 1].publishedAt), true);
  assert.ok(deduplicateArticles(articles, NOW).length <= 400);
});

test('feed item caps keep the newest 50 even when a feed lists oldest first', () => {
  const xml = rss(Array.from({ length: 70 }, (_, index) => item({ title: `AI research number ${index} in this feed`, date: new Date(NOW - (70 - index) * 60_000).toISOString(), url: `https://publisher.example/article/${index}` })).join(''));
  const articles = parseFeed(xml, source, NOW);
  assert.equal(articles.length, MAX_ARTICLES_PER_FEED);
  assert.equal(articles[0].url, 'https://publisher.example/article/69');
  assert.equal(articles.at(-1).url, 'https://publisher.example/article/20');
});

test('mixed journals reject weak ambiguous terms and updated-only entries cannot masquerade as fresh publications', () => {
  const journal = { ...source, kind: 'journal', aiOnly: true };
  const xml = rss(item({ title: 'Electrical transformer fault diagnosis', description: 'A transformer in a power grid is tested.', url: 'https://publisher.example/electrical' }) + item({ title: 'Machine learning improves clinical diagnosis', description: 'A neural network study.', url: 'https://publisher.example/ai' }));
  assert.deepEqual(parseFeed(xml, journal, NOW).map(article => article.url), ['https://publisher.example/ai']);
  for (const fields of [{ kind: 'research' }, { kind: 'publisher', contentType: 'journal' }, { kind: 'publisher', category: 'clinical' }]) assert.deepEqual(parseFeed(xml, { ...source, aiOnly: true, ...fields }, NOW).map(article => article.url), ['https://publisher.example/ai']);
  const updatedOnly = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>AI research modified today</title><link href="https://publisher.example/modified"/><updated>2026-10-12T12:00:00Z</updated></entry></feed>';
  assert.equal(parseFeed(updatedOnly, source, NOW).length, 0);
  const government = parseFeed(rss(item({ title: 'Government releases artificial intelligence safety guidance' })), { ...source, aiOnly: false, category: 'geopolitical' }, NOW);
  assert.equal(government[0].category, 'geopolitical');
});

test('mixed feeds cannot qualify generic stories through AI boilerplate beyond the displayed excerpt', () => {
  const genericLead = 'Scope workloads and share resilience policies across cloud accounts. '.repeat(12);
  const xml = rss([
    item({ title: 'Cloud resilience policy sharing is now available', url: 'https://publisher.example/generic', description: `${genericLead} Footer: Read our artificial intelligence and machine learning blog.` }),
    item({ title: 'AI dependency insights improve cloud resilience', url: 'https://publisher.example/title-ai', description: genericLead }),
    item({ title: 'New dependency insights improve cloud resilience', url: 'https://publisher.example/lead-ai', description: `Generative AI-powered Dependency Insights identify system relationships. ${genericLead}` }),
  ].join(''));
  for (const kind of ['official', 'publisher', 'research']) {
    const articles = parseFeed(xml, { ...source, kind, aiOnly: false }, NOW);
    assert.deepEqual(articles.map(article => article.url), ['https://publisher.example/title-ai', 'https://publisher.example/lead-ai']);
    assert.equal(articles.every(article => /\bAI\b|artificial intelligence|machine learning/i.test(`${article.title} ${article.summary}`)), true);
  }
});

test('mixed publisher feeds distinguish electrical transformers from actual machine learning', () => {
  const xml = rss([
    item({ title: 'Transformer Steel Becomes a Trade Flashpoint in Europe', description: 'Grid transformers remain in short supply.', url: 'https://publisher.example/steel' }),
    item({ title: 'Transformer architecture improves inference', description: 'A machine learning model improves neural network performance.', url: 'https://publisher.example/ml-transformer' }),
  ].join(''));
  assert.deepEqual(parseFeed(xml, { ...source, kind: 'publisher', aiOnly: false }, NOW).map(article => article.url), ['https://publisher.example/ml-transformer']);
});

test('mixed publisher evergreen guides, retail reviews and promotions stay out while business deals and policy reviews remain', () => {
  const discarded = ['Best AI laptops 2026: Top picks for work and school', 'An AI tools buying guide for beginners', 'Pixel smartphones review: AI features tested', 'Save 40% on AI subscriptions this Prime Day', 'AI summit tickets on sale: Save $100'];
  const retained = ['OpenAI signs a $100 million cloud deal with an enterprise partner', 'Government conducts an AI policy review: New rules considered', 'AI startup acquires a developer platform in a $100 million deal', 'AI business deals review: Leading enterprise contracts'];
  const xml = rss([...discarded, ...retained].map((title, index) => item({ title, url: `https://publisher.example/news/${index}`, description: 'Artificial intelligence technology and its applications.' })).join(''));
  const articles = parseFeed(xml, { ...source, kind: 'publisher', aiOnly: false }, NOW);
  assert.deepEqual(articles.map(article => article.title), retained);
  const scholarly = parseFeed(rss(item({ title: 'A review: AI tools in clinical diagnosis', description: 'A systematic review of machine learning evidence.' })), { ...source, kind: 'research', contentType: 'journal' }, NOW);
  assert.equal(scholarly.length, 1);
});

test('visible event pass sales are excluded without removing real conference AI launch news', () => {
  const xml = rss([
    item({ title: 'TechCrunch Disrupt 2026: Day 2', description: 'Day 2 features themes across AI, roundtables, and side events. Register to save 50% on your pass.', url: 'https://publisher.example/event-sales' }),
    item({ title: 'AI Summit 2026: Session schedule', description: 'AI speakers join the conference. Early bird tickets are on sale.', url: 'https://publisher.example/ai-sales' }),
    item({ title: 'New AI summit 2026: Early bird passes', description: 'AI speakers join the summit. Register to save 50% on your pass.', url: 'https://publisher.example/new-ai-sales' }),
    item({ title: 'Meet us at the AI conference for the best offers', description: 'AI speakers join the conference. Register to save 50% on your pass.', url: 'https://publisher.example/meet-ai-sales' }),
    item({ title: 'AI summit announces discounted registration passes', description: 'AI speakers join the summit. Register to save 50% on your pass.', url: 'https://publisher.example/announced-passes' }),
    item({ title: 'OpenAI launches a new AI model at DevDay', description: 'The new model improves reasoning. Register to save 50% on your conference pass.', url: 'https://publisher.example/model-launch' }),
    item({ title: 'OpenAI releases GPT-6 at DevDay', description: 'The model improves inference. Register to save 50% on your conference pass.', url: 'https://publisher.example/conference-release' }),
    item({ title: 'AI Summit presents new clinical research findings', description: 'Researchers report machine learning results for diagnosis.', url: 'https://publisher.example/research-news' }),
    item({ title: 'AI Conference announces its next technical program', description: `Researchers report new machine learning results. ${'The program includes technical sessions. '.repeat(12)} Register to save 50% on your pass.`, url: 'https://publisher.example/hidden-footer' }),
  ].join(''));
  for (const aiOnly of [false, true]) {
    const articles = parseFeed(xml, { ...source, kind: 'publisher', aiOnly }, NOW);
    assert.deepEqual(articles.map(article => article.url), ['https://publisher.example/model-launch', 'https://publisher.example/conference-release', 'https://publisher.example/research-news', 'https://publisher.example/hidden-footer']);
  }
});

test('explicit journals show a real bounded abstract evidence sentence instead of dropping buried ML methods', () => {
  const background = 'The prospective cohort measured chronic physiological stress and disease incidence. '.repeat(13);
  const methods = 'We evaluated nine machine learning models with nested cross-validation to assess clinical prediction performance.';
  const description = `by Maya Stone, Wei Wang and other authors. ${background}${methods} The final analysis reported associations with symptoms.`;
  assert.ok(description.indexOf('machine learning') > 923);
  const title = 'Allostatic load and lung cancer risk in a prospective cohort';
  const xml = rss(item({ title, description }));
  const journal = { ...source, kind: 'research', contentType: 'journal', category: 'clinical', aiOnly: false };
  const articles = parseFeed(xml, journal, NOW);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].summary, methods);
  assert.equal(articles[0].category, 'clinical');
  assert.equal(parseFeed(xml, { ...source, kind: 'publisher', aiOnly: false }, NOW).length, 0);
  assert.equal(parseFeed(xml, { ...source, kind: 'research', aiOnly: false }, NOW).length, 0);
  const authorNameOnly = rss(item({ title, description: `by Gemma Stone. ${background}` }));
  assert.equal(parseFeed(authorNameOnly, journal, NOW).length, 0);
  const beyondBound = rss(item({ title, description: `${background.repeat(5)}${methods}` }));
  assert.equal(parseFeed(beyondBound, journal, NOW).length, 0);
});

test('source coverage distinguishes available, current and deadline-deferred checks and preserves trust metadata', async () => {
  const sources = [
    { ...source, id: 'fresh', publisher: 'One Publisher', kind: 'primary', trustReason: 'Official publisher feed', url: 'https://fresh.example/feed' },
    { ...source, id: 'quiet', publisher: 'Two Publisher', kind: 'journal', trustReason: 'Peer-reviewed journal', url: 'https://quiet.example/feed' },
    { ...source, id: 'slow', publisher: 'Three Publisher', kind: 'policy', trustReason: 'Government source', url: 'https://slow.example/feed' },
  ];
  const requests = [];
  const service = createNewsService({ sources, clock: () => NOW, sourceDeadlineMs: 35, imageEnrichment: false, fetchImpl: async (url, options) => {
    requests.push(url);
    if (url.includes('slow.example')) return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('deadline')), { once: true }));
    return new Response(rss(url.includes('quiet.example') ? '' : item()));
  } });
  const response = await service();
  assert.equal(response.status, 200);
  assert.deepEqual(response.payload.sourceCoverage, { configured: 3, checked: 2, available: 2, current: 1, unavailable: 0, deferred: 1, publishers: 3, includedPublishers: 1 });
  assert.equal(response.payload.sources.find(source => source.id === 'fresh').trustReason, 'Official publisher feed');
  assert.equal(response.payload.sourceGroups.find(group => group.kind === 'journal').current, 0);
  assert.equal(response.payload.creatorStatus, null);
  assert.deepEqual(response.payload.creatorSignals, []);
  assert.equal(response.payload.curatorDispatch, null);
  assert.equal(requests.some(url => /youtube|stayingahead/.test(url)), false);
  await service();
  assert.equal(requests.length, 3);
});
