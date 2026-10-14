import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { EXPECTED_REFRESH_INTERVAL, MAX_METADATA_AGE, NEWS_WINDOW, publicUrl, runHealthCheck, validateNewsPayload, validateUiContent } from '../scripts/health-check.mjs';

const NOW = Date.parse('2026-10-14T18:00:00.000Z');
const date = time => new Date(time).toISOString();
const codes = result => result.errors.map(item => item.code);
function fixture() {
  return {
    refreshInterval: EXPECTED_REFRESH_INTERVAL, windowHours: 24, updatedAt: date(NOW), servedAt: date(NOW), windowStart: date(NOW - NEWS_WINDOW),
    articles: [{ id: 'story-1', title: 'Research lab releases new AI model', summary: 'Public publisher excerpt', url: 'https://publisher.example/ai-model', publishedAt: date(NOW - 1000), category: 'technical', sourceId: 'source-1' }],
    sources: Array.from({ length: 4 }, (_, index) => ({ id: `source-${index + 1}`, name: `Source ${index + 1}`, url: `https://source${index + 1}.example/feed`, ok: true, deferred: false, articleCount: index === 0 ? 1 : 0, checkedAt: date(NOW) })),
    sourceCoverage: { configured: 4, available: 4, checked: 4, deferred: 0, current: 1, unavailable: 0, publishers: 4, includedPublishers: 1 },
    creatorSignals: [], creatorStatus: null, curatorDispatch: null,
  };
}
function setHealthy(payload, healthy) {
  payload.sources.forEach((source, index) => { source.ok = index < healthy; });
  payload.sourceCoverage.available = healthy;
  payload.sourceCoverage.unavailable = payload.sources.length - healthy;
  return payload;
}

test('healthy source-backed payload passes with exact 24-hour boundary', () => {
  const payload = fixture(); payload.articles[0].publishedAt = date(NOW - NEWS_WINDOW);
  assert.deepEqual(codes(validateNewsPayload(payload, { now: NOW })), []);
});

test('a single millisecond outside either date boundary fails', () => {
  for (const [time, expected] of [[NOW - NEWS_WINDOW - 1, 'expired-articles'], [NOW + 1, 'future-articles']]) {
    const payload = fixture(); payload.articles[0].publishedAt = date(time);
    assert.ok(codes(validateNewsPayload(payload, { now: NOW })).includes(expected));
  }
});

test('malformed publication dates and unsafe article links fail', () => {
  const payload = fixture(); payload.articles[0].publishedAt = 'not a date'; payload.articles[0].url = 'javascript:alert(1)';
  const errors = codes(validateNewsPayload(payload, { now: NOW }));
  assert.ok(errors.includes('invalid-publication')); assert.ok(errors.includes('invalid-articles'));
  assert.equal(publicUrl('https://name:password@example.com/feed'), null);
});

test('a partial outage at 25% is a warning; below 25% is severe', () => {
  const payload = setHealthy(fixture(), 1);
  const result = validateNewsPayload(payload, { now: NOW });
  assert.deepEqual(codes(result), []);
  assert.ok(result.warnings.some(item => item.code === 'partial-source-failure'));
  payload.sources.push({ ...payload.sources[3], id: 'source-5', url: 'https://source5.example/feed' });
  payload.sourceCoverage.configured++; payload.sourceCoverage.checked++; payload.sourceCoverage.unavailable++; payload.sourceCoverage.publishers++;
  assert.ok(codes(validateNewsPayload(payload, { now: NOW })).includes('severe-source-outage'));
  assert.ok(codes(validateNewsPayload(setHealthy(fixture(), 0), { now: NOW })).includes('no-healthy-sources'));
});

test('deferred feeds remain honest in configured, checked and unavailable counts', () => {
  const payload = setHealthy(fixture(), 3);
  payload.sources[3].deferred = true; payload.sourceCoverage.deferred = 1; payload.sourceCoverage.checked = 3; payload.sourceCoverage.unavailable = 0;
  assert.deepEqual(codes(validateNewsPayload(payload, { now: NOW })), []);
  payload.sourceCoverage.available = 4;
  assert.ok(codes(validateNewsPayload(payload, { now: NOW })).includes('inconsistent-source-coverage'));
  delete payload.sourceCoverage;
  assert.ok(codes(validateNewsPayload(payload, { now: NOW })).includes('invalid-source-coverage'));
});

test('hourly refresh and metadata age are enforced independently of article freshness', () => {
  const payload = fixture(); payload.refreshInterval = 120_000; payload.updatedAt = date(NOW - MAX_METADATA_AGE - 1);
  const errors = codes(validateNewsPayload(payload, { now: NOW }));
  assert.ok(errors.includes('refresh-interval')); assert.ok(errors.includes('stale-updatedAt'));
  payload.refreshInterval = EXPECTED_REFRESH_INTERVAL; payload.updatedAt = date(NOW - MAX_METADATA_AGE);
  assert.deepEqual(codes(validateNewsPayload(payload, { now: NOW })), []);
  payload.sources[0].checkedAt = date(NOW - MAX_METADATA_AGE - 1);
  assert.ok(codes(validateNewsPayload(payload, { now: NOW })).includes('stale-source-checks'));
});

test('empty fresh feed stays an honest warning when source health is good', () => {
  const payload = fixture(); payload.articles = []; payload.sources[0].articleCount = 0; payload.sourceCoverage.current = 0; payload.sourceCoverage.includedPublishers = 0;
  const result = validateNewsPayload(payload, { now: NOW });
  assert.deepEqual(codes(result), []); assert.ok(result.warnings.some(item => item.code === 'empty-current-feed'));
});

test('removed creator branding and digest integration fail, generic creator news is allowed', () => {
  const payload = fixture(); payload.articles[0].summary = 'AI tools help creators publish a daily digest.';
  assert.deepEqual(codes(validateNewsPayload(payload, { now: NOW })), []);
  payload.articles[0].summary = 'https://www.stayingahead.ai/daily-ai-updates/example';
  assert.ok(codes(validateNewsPayload(payload, { now: NOW })).includes('creator-articles'));
  payload.articles[0].summary = 'Public excerpt'; payload.curatorDispatch = { url: 'https://example.com/brief' };
  assert.ok(codes(validateNewsPayload(payload, { now: NOW })).includes('creator-content'));
  const html = '<title>Dhivi Live AI News</title><div id="root"></div>';
  assert.ok(validateUiContent(html, [{ text: 'Vaibhav Sisinty radar' }]).some(item => item.code === 'creator-ui'));
});

test('duplicate stories and malformed API input cannot silently pass', () => {
  const payload = fixture(); payload.articles.push({ ...payload.articles[0] });
  assert.ok(codes(validateNewsPayload(payload, { now: NOW })).includes('duplicate-articles'));
  for (const input of [null, [], 'html', {}]) assert.ok(validateNewsPayload(input, { now: NOW }).errors.length);
});

const html = '<html><head><title>Dhivi Live AI News</title><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>';
function mockFetch(payload, overrides = {}) {
  return async url => {
    const path = new URL(url).pathname;
    const value = path === '/' ? html : path === '/assets/app.js' ? 'console.log("Dhivi")' : JSON.stringify(payload);
    return new Response(value, { status: overrides[path] ?? 200 });
  };
}

test('HTTP/UI/API check resolves shipped script and emits metadata-only report', async () => {
  const report = await runHealthCheck({ baseUrl: 'https://dhivi.example/', fetchImpl: mockFetch(fixture()), clock: () => NOW });
  assert.equal(report.status, 'pass'); assert.equal(report.http.assets[0].url, 'https://dhivi.example/assets/app.js');
  assert.deepEqual(Object.keys(report.headlines[0]).sort(), ['category', 'id', 'publishedAt', 'sourceId', 'url']);
  assert.equal(JSON.stringify(report).includes('Public publisher excerpt'), false);
  assert.equal(JSON.stringify(report).includes('Research lab releases'), false);
});

test('HTTP 403 and missing compiled UI script fail without saving response bodies', async () => {
  const report = await runHealthCheck({ baseUrl: 'https://dhivi.example/', fetchImpl: mockFetch(fixture(), { '/assets/app.js': 403 }), clock: () => NOW });
  assert.equal(report.status, 'fail'); assert.ok(codes(report).includes('asset-http-status'));
  const blank = await runHealthCheck({ baseUrl: 'https://dhivi.example/', fetchImpl: async () => new Response('<html>maintenance</html>'), clock: () => NOW });
  assert.ok(codes(blank).includes('invalid-homepage')); assert.ok(codes(blank).includes('missing-ui-assets')); assert.ok(codes(blank).includes('invalid-json'));
});

test('a thrown upstream network error is reduced to a controlled report code', async () => {
  const report = await runHealthCheck({ baseUrl: 'https://dhivi.example/', fetchImpl: async () => { throw new Error('Sensitive network internals'); }, clock: () => NOW });
  assert.equal(report.status, 'fail'); assert.ok(codes(report).includes('api-network-error'));
  assert.equal(JSON.stringify(report).includes('Sensitive'), false);
});

test('unbounded streamed API responses are cancelled and reported without body retention', async () => {
  let cancelled = false;
  const fetchImpl = async url => new URL(url).pathname === '/.netlify/functions/news'
    ? new Response(new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(1_000_000)); }, cancel() { cancelled = true; } }))
    : new Response(new URL(url).pathname === '/' ? html : 'console.log("Dhivi")');
  const report = await runHealthCheck({ baseUrl: 'https://dhivi.example/', fetchImpl, clock: () => NOW });
  assert.ok(codes(report).includes('api-response-too-large')); assert.equal(cancelled, true); assert.deepEqual(report.headlines, []);
});

test('SQLite ledger is idempotent and stores no article text or preferences', async t => {
  const python = process.platform === 'win32' ? 'python' : 'python3';
  if (spawnSync(python, ['--version'], { encoding: 'utf8' }).error) { t.skip('Python unavailable'); return; }
  const directory = await mkdtemp(join(tmpdir(), 'dhivi-health-'));
  try {
    const report = await runHealthCheck({ baseUrl: 'https://dhivi.example/', fetchImpl: mockFetch(fixture()), clock: () => NOW });
    report.headlines[0].title = 'Do not store this article text'; report.preferences = { private: 'Do not store reader preferences' };
    const reportPath = join(directory, 'health.json'), dbPath = join(directory, 'health.sqlite');
    await writeFile(reportPath, JSON.stringify(report));
    for (let index = 0; index < 2; index++) {
      const result = spawnSync(python, [resolve('scripts/record_health.py'), '--report', reportPath, '--db', dbPath], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout), { recorded: true, runs: 1, sourceChecks: 4, headlines: 1, database: dbPath });
    }
    const query = 'import sqlite3,sys,json; d=sqlite3.connect(sys.argv[1]); print(json.dumps(list(d.iterdump())))';
    const dumped = spawnSync(python, ['-c', query, dbPath], { encoding: 'utf8' });
    assert.equal(dumped.status, 0, dumped.stderr); assert.equal(dumped.stdout.includes('Do not store'), false);
    assert.ok(dumped.stdout.includes('https://publisher.example/ai-model'));
    report.headlines.push({ id: 'unsafe', url: 'javascript:alert(1)', publishedAt: date(NOW), category: 'technical' });
    await writeFile(reportPath, JSON.stringify(report));
    const safe = spawnSync(python, [resolve('scripts/record_health.py'), '--report', reportPath, '--db', dbPath], { encoding: 'utf8' });
    assert.equal(safe.status, 0, safe.stderr); assert.equal(JSON.parse(safe.stdout).headlines, 1);
    report.runId = 'malformed';
    await writeFile(reportPath, JSON.stringify(report));
    const invalid = spawnSync(python, [resolve('scripts/record_health.py'), '--report', reportPath, '--db', dbPath], { encoding: 'utf8' });
    assert.equal(invalid.status, 1); assert.equal(invalid.stderr.includes('Traceback'), false);
    const unchanged = spawnSync(python, ['-c', 'import sqlite3,sys; print(sqlite3.connect(sys.argv[1]).execute("SELECT COUNT(*) FROM health_runs").fetchone()[0])', dbPath], { encoding: 'utf8' });
    assert.equal(unchanged.stdout.trim(), '1');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
