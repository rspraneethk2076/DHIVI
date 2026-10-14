import { createHash } from 'node:crypto';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PRODUCTION_URL = 'https://dhivi-live-ai-news.netlify.app/';
export const EXPECTED_REFRESH_INTERVAL = 3_600_000;
export const NEWS_WINDOW = 24 * 60 * 60 * 1000;
export const MAX_METADATA_AGE = EXPECTED_REFRESH_INTERVAL + 15 * 60 * 1000;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REMOVED_BRANDING = /vaibhav\s+sisinty|vaibhavsisinty|\bsisinty\b|stayingahead\.(?:ai|com|club)|UClXAalunTPaX1YV185DWUeg|\bStaying Ahead\b/iu;
const CATEGORIES = new Set(['news', 'technical', 'clinical', 'tools', 'geopolitical']);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const timestamp = value => typeof value === 'string' && value.trim() ? Date.parse(value) : NaN;
const nonnegativeInteger = value => Number.isInteger(value) && value >= 0;
const issue = (code, message) => ({ code, message });

export function publicUrl(value, base) {
  try {
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

/** Validate the API independently of HTTP, without persisting article text. */
export function validateNewsPayload(payload, { now = Date.now() } = {}) {
  const errors = [], warnings = [];
  const metrics = { articleCount: 0, configuredSources: 0, healthySources: 0, healthyRatio: 0, checkedSources: 0, deferredSources: 0 };
  if (!isRecord(payload)) return { errors: [issue('invalid-payload', 'News API must return an object.')], warnings, metrics };
  if (payload.refreshInterval !== EXPECTED_REFRESH_INTERVAL) errors.push(issue('refresh-interval', 'News refresh interval must be one hour.'));
  if (payload.windowHours !== 24) errors.push(issue('news-window', 'News API must declare a 24-hour window.'));
  for (const field of ['updatedAt', 'servedAt']) {
    const value = timestamp(payload[field]);
    if (!Number.isFinite(value)) errors.push(issue(`invalid-${field}`, `${field} must be a valid timestamp.`));
    else {
      metrics[`${field}AgeSeconds`] = Math.round((now - value) / 1000);
      if (value > now + 60_000) errors.push(issue(`future-${field}`, `${field} is ahead of the monitor clock.`));
      if (now - value > MAX_METADATA_AGE) errors.push(issue(`stale-${field}`, `${field} is older than 75 minutes.`));
    }
  }
  const servedAt = timestamp(payload.servedAt), windowStart = timestamp(payload.windowStart);
  if (!Number.isFinite(windowStart) || !Number.isFinite(servedAt) || Math.abs(servedAt - NEWS_WINDOW - windowStart) > 1000) {
    errors.push(issue('window-start', 'windowStart must describe the rolling 24 hours at servedAt.'));
  }
  if (payload.stale === true) errors.push(issue('stale-api', 'The API reports that all sources failed.'));
  if ((Array.isArray(payload.creatorSignals) && payload.creatorSignals.length) || payload.curatorDispatch != null || payload.creatorStatus != null) {
    errors.push(issue('creator-content', 'Removed creator or digest integration is still present.'));
  }

  const articles = Array.isArray(payload.articles) ? payload.articles : [];
  if (!Array.isArray(payload.articles)) errors.push(issue('missing-articles', 'News API must contain an articles array.'));
  metrics.articleCount = articles.length;
  if (!articles.length && Array.isArray(payload.articles)) warnings.push(issue('empty-current-feed', 'No eligible AI articles are currently available; no placeholder stories were added.'));
  const articleIds = new Set(), articleUrls = new Set();
  let invalidDates = 0, oldDates = 0, futureDates = 0, invalidArticles = 0, duplicates = 0, branding = 0;
  for (const article of articles) {
    if (!isRecord(article)) { invalidArticles++; continue; }
    const date = timestamp(article.publishedAt), url = publicUrl(article.url);
    if (!Number.isFinite(date)) invalidDates++;
    else if (date > now) futureDates++;
    else if (now - date > NEWS_WINDOW) oldDates++;
    if (typeof article.id !== 'string' || !article.id || typeof article.title !== 'string' || !article.title.trim() || !url || !CATEGORIES.has(article.category)) invalidArticles++;
    if (articleIds.has(article.id) || (url && articleUrls.has(url))) duplicates++;
    articleIds.add(article.id); if (url) articleUrls.add(url);
    if (REMOVED_BRANDING.test(JSON.stringify(article))) branding++;
  }
  for (const [count, code, message] of [
    [invalidDates, 'invalid-publication', 'articles have invalid publication dates'],
    [oldDates, 'expired-articles', 'articles are older than 24 hours'],
    [futureDates, 'future-articles', 'articles have future publication dates'],
    [invalidArticles, 'invalid-articles', 'articles have invalid required fields or links'],
    [duplicates, 'duplicate-articles', 'articles repeat an ID or canonical URL'],
    [branding, 'creator-articles', 'articles contain removed creator or digest branding'],
  ]) if (count) errors.push(issue(code, `${count} ${message}.`));

  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  const coverage = payload.sourceCoverage;
  metrics.configuredSources = sources.length;
  metrics.healthySources = sources.filter(source => isRecord(source) && source.ok === true).length;
  metrics.deferredSources = sources.filter(source => isRecord(source) && source.deferred === true).length;
  metrics.checkedSources = sources.length - metrics.deferredSources;
  metrics.healthyRatio = sources.length ? metrics.healthySources / sources.length : 0;
  if (!sources.length) errors.push(issue('missing-sources', 'The API must list configured sources.'));
  if (!isRecord(coverage) || !['configured', 'available', 'checked', 'deferred', 'current', 'unavailable', 'publishers', 'includedPublishers'].every(key => nonnegativeInteger(coverage[key]))) {
    errors.push(issue('invalid-source-coverage', 'Source coverage must contain nonnegative integer counts.'));
  } else {
    const expected = { configured: sources.length, available: metrics.healthySources, checked: metrics.checkedSources, deferred: metrics.deferredSources, current: sources.filter(source => source?.articleCount > 0).length, unavailable: sources.filter(source => source?.ok !== true && source?.deferred !== true).length };
    if (Object.entries(expected).some(([key, value]) => coverage[key] !== value) || coverage.publishers > sources.length || coverage.includedPublishers > articles.length) {
      errors.push(issue('inconsistent-source-coverage', 'Source coverage does not match the listed source checks.'));
    }
  }
  if (!metrics.healthySources) errors.push(issue('no-healthy-sources', 'No configured source is currently healthy.'));
  else if (metrics.healthyRatio < 0.25) errors.push(issue('severe-source-outage', 'Fewer than 25% of configured sources are healthy.'));
  if (metrics.healthySources < sources.length && sources.length) warnings.push(issue('partial-source-failure', `${sources.length - metrics.healthySources} sources are unavailable or deferred; individual publisher failures are not fatal.`));
  const sourceIds = new Set();
  let invalidSources = 0, staleChecks = 0;
  for (const source of sources) {
    if (!isRecord(source) || typeof source.id !== 'string' || !source.id || sourceIds.has(source.id) || !publicUrl(source.url) || typeof source.ok !== 'boolean' || !nonnegativeInteger(source.articleCount)) { invalidSources++; continue; }
    sourceIds.add(source.id);
    if (source.ok && (!Number.isFinite(timestamp(source.checkedAt)) || now - timestamp(source.checkedAt) > MAX_METADATA_AGE || timestamp(source.checkedAt) > now + 60_000)) staleChecks++;
  }
  if (invalidSources) errors.push(issue('invalid-source-checks', `${invalidSources} source checks are malformed or duplicated.`));
  if (staleChecks) errors.push(issue('stale-source-checks', `${staleChecks} healthy source checks have missing or stale timestamps.`));
  return { errors, warnings, metrics };
}

export function validateUiContent(html, assets = []) {
  const errors = [];
  if (!/<title>[^<]*Dhivi[^<]*<\/title>/iu.test(html) || !/\bid=["']root["']/u.test(html)) errors.push(issue('invalid-homepage', 'Homepage is missing the Dhivi application shell.'));
  if (!assets.length) errors.push(issue('missing-ui-assets', 'Homepage did not reference an application script.'));
  if (REMOVED_BRANDING.test(html) || assets.some(asset => REMOVED_BRANDING.test(asset.text ?? ''))) errors.push(issue('creator-ui', 'Shipped UI contains removed creator or digest branding.'));
  return errors;
}

function scriptUrls(html, baseUrl) {
  const urls = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/giu)].map(match => publicUrl(match[1].replaceAll('&amp;', '&'), baseUrl)).filter(Boolean);
  return [...new Set(urls)].filter(url => new URL(url).origin === new URL(baseUrl).origin).slice(0, 8);
}

async function requestText(url, fetchImpl, timeoutMs, maxBytes) {
  const started = performance.now();
  try {
    const response = await fetchImpl(url, { headers: { Accept: 'application/json,text/html,application/javascript;q=0.9', 'User-Agent': 'DhiviHealthMonitor/1.0' }, signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
    const metadata = { status: response.status, durationMs: Math.round(performance.now() - started) };
    if (response.status !== 200) { await response.body?.cancel(); return { ...metadata, text: '', error: 'http-status' }; }
    if (Number(response.headers.get('content-length')) > maxBytes) { await response.body?.cancel(); return { ...metadata, text: '', error: 'response-too-large' }; }
    const reader = response.body?.getReader();
    if (!reader) return { ...metadata, text: '', error: 'empty-response' };
    const chunks = []; let bytes = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); return { ...metadata, text: '', error: 'response-too-large' }; }
      chunks.push(value);
    }
    return { ...metadata, durationMs: Math.round(performance.now() - started), text: Buffer.concat(chunks).toString('utf8') };
  } catch (error) {
    return { status: null, durationMs: Math.round(performance.now() - started), text: '', error: ['TimeoutError', 'AbortError'].includes(error?.name) ? 'timeout' : 'network-error' };
  }
}

/** Runs without credentials. The report intentionally contains no headline text. */
export async function runHealthCheck({ baseUrl = PRODUCTION_URL, fetchImpl = fetch, clock = Date.now } = {}) {
  const validUrl = publicUrl(baseUrl);
  if (!validUrl) throw new Error('base-url must be a public HTTP(S) URL without credentials');
  const site = new URL(validUrl); site.pathname = site.pathname.replace(/\/?$/u, '/'); site.search = ''; site.hash = '';
  const apiUrl = new URL('/.netlify/functions/news', site).href;
  const [home, api] = await Promise.all([requestText(site.href, fetchImpl, 15_000, 2_000_000), requestText(apiUrl, fetchImpl, 65_000, 8_000_000)]);
  const assetResults = home.error ? [] : await Promise.all(scriptUrls(home.text, site.href).map(async url => ({ url, ...await requestText(url, fetchImpl, 15_000, 2_000_000) })));
  const now = clock(), checkedAt = new Date(now).toISOString();
  const errors = [], warnings = [];
  for (const [name, response] of [['home', home], ['api', api]]) if (response.error) errors.push(issue(`${name}-${response.error}`, `${name === 'home' ? 'Homepage' : 'News API'} did not return a usable HTTP 200 response.`));
  for (const asset of assetResults) if (asset.error) errors.push(issue(`asset-${asset.error}`, 'A shipped application script could not be loaded.'));
  if (!home.error) errors.push(...validateUiContent(home.text, assetResults));
  let payload = null;
  if (!api.error) { try { payload = JSON.parse(api.text); } catch { errors.push(issue('invalid-json', 'News API did not return valid JSON.')); } }
  const validation = payload === null ? { errors: [], warnings: [], metrics: {} } : validateNewsPayload(payload, { now });
  errors.push(...validation.errors); warnings.push(...validation.warnings);
  const sources = Array.isArray(payload?.sources) ? payload.sources.filter(isRecord).map(source => ({
    id: typeof source.id === 'string' ? source.id.slice(0, 200) : '',
    name: typeof source.name === 'string' ? source.name.slice(0, 200) : '',
    url: publicUrl(source.url), kind: ['publisher', 'official', 'research', 'policy', 'clinical'].includes(source.kind) ? source.kind : 'other',
    ok: source.ok === true, deferred: source.deferred === true,
    articleCount: nonnegativeInteger(source.articleCount) ? source.articleCount : 0,
    checkedAt: Number.isFinite(timestamp(source.checkedAt)) ? new Date(timestamp(source.checkedAt)).toISOString() : null,
  })) : [];
  const headlines = Array.isArray(payload?.articles) ? payload.articles.filter(isRecord).map(article => ({
    id: typeof article.id === 'string' ? article.id.slice(0, 1000) : '', url: publicUrl(article.url),
    publishedAt: Number.isFinite(timestamp(article.publishedAt)) ? new Date(timestamp(article.publishedAt)).toISOString() : null,
    category: CATEGORIES.has(article.category) ? article.category : null,
    sourceId: typeof article.sourceId === 'string' ? article.sourceId.slice(0, 200) : null,
  })) : [];
  const http = { home: { status: home.status, durationMs: home.durationMs }, api: { status: api.status, durationMs: api.durationMs }, assets: assetResults.map(({ url, status, durationMs }) => ({ url, status, durationMs })) };
  const status = errors.length ? 'fail' : 'pass';
  const runId = createHash('sha256').update(JSON.stringify([checkedAt, site.href, status, validation.metrics, headlines])).digest('hex');
  return { schemaVersion: 1, runId, checkedAt, baseUrl: site.href, status, errors, warnings, metrics: validation.metrics, http, sources, headlines };
}

async function main() {
  const args = process.argv.slice(2);
  let baseUrl = process.env.DHIVI_BASE_URL || PRODUCTION_URL, output = resolve(ROOT, '.local/latest-health.json');
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--base-url' && args[index + 1]) baseUrl = args[++index];
    else if (args[index] === '--output' && args[index + 1]) output = resolve(args[++index]);
    else throw new Error('Usage: node scripts/health-check.mjs [--base-url URL] [--output PATH]');
  }
  const report = await runHealthCheck({ baseUrl });
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report)}\n`, 'utf8');
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [`### Dhivi production health: ${report.status.toUpperCase()}`, '', `Checked: ${report.checkedAt}`, `Articles: ${report.metrics.articleCount ?? 'unknown'} · Healthy sources: ${report.metrics.healthySources ?? 'unknown'}/${report.metrics.configuredSources ?? 'unknown'}`, '', ...report.errors.map(item => `- **${item.code}**: ${item.message}`), ...report.warnings.map(item => `- ${item.code}: ${item.message}`), ''].join('\n');
    await appendFile(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8');
  }
  console.log(JSON.stringify({ status: report.status, checkedAt: report.checkedAt, metrics: report.metrics, errors: report.errors.map(item => item.code), warnings: report.warnings.map(item => item.code), report: output }));
  process.exitCode = report.status === 'pass' ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Health check could not run. Check arguments and output-directory permissions.'); process.exitCode = 1; });
