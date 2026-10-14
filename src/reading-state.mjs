export const MAX_READ_HISTORY = 1000;
export const READ_HISTORY_RETENTION = 30 * 24 * 60 * 60 * 1000;

const CATEGORIES = new Set(['all', 'news', 'technical', 'clinical', 'tools', 'geopolitical', 'saved']);
const MODES = new Set(['spotlight', 'latest', 'for-you']);
const UNSAFE_IDS = new Set(['__proto__', 'constructor', 'prototype']);
const finiteNumber = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const plainRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function validId(value, allowEmpty = false) {
  if (typeof value !== 'string' || UNSAFE_IDS.has(value)) return null;
  const bounded = value.slice(0, 1000);
  if (!bounded.trim()) return allowEmpty && value === '' ? '' : null;
  return bounded;
}

/** Validate persisted progress without reading storage or touching the page. */
export function normalizeReadingState(raw) {
  if (!plainRecord(raw) || !CATEGORIES.has(raw.category) || !MODES.has(raw.mode)
    || typeof raw.query !== 'string' || !finiteNumber(raw.offset) || !finiteNumber(raw.scrollTop)
    || !finiteNumber(raw.updatedAt) || raw.updatedAt < 0) return null;
  const articleId = validId(raw.articleId, true);
  if (articleId === null) return null;
  const articleIds = [];
  const seen = new Set();
  if (Array.isArray(raw.articleIds)) {
    for (const value of raw.articleIds) {
      const id = validId(value);
      if (id !== null && !seen.has(id)) { articleIds.push(id); seen.add(id); }
      if (articleIds.length === 200) break;
    }
  }
  return {
    category: raw.category,
    mode: raw.mode,
    query: raw.query.slice(0, 200),
    articleId,
    articleIds,
    offset: clamp(raw.offset, -2000, 10000),
    scrollTop: clamp(raw.scrollTop, 0, 10_000_000),
    updatedAt: raw.updatedAt,
  };
}

/**
 * The caller supplies its eligible visible list (including its freshness/read
 * filters). Stored IDs never reintroduce stories that are absent from that list.
 */
export function resolveReadingPosition(progress, visibleArticles) {
  const normalized = normalizeReadingState(progress);
  if (!normalized) return null;
  const visibleIds = new Set((Array.isArray(visibleArticles) ? visibleArticles : [])
    .map(article => validId(article?.id)).filter(id => id !== null));
  if (normalized.articleId && visibleIds.has(normalized.articleId)) {
    return { articleId: normalized.articleId, offset: normalized.offset, scrollTop: normalized.scrollTop, reason: 'current' };
  }
  const currentIndex = normalized.articleIds.indexOf(normalized.articleId);
  const nextId = normalized.articleIds.slice(currentIndex + 1).find(id => visibleIds.has(id));
  if (nextId) return { articleId: nextId, offset: 0, scrollTop: normalized.scrollTop, reason: 'next' };
  return { articleId: null, offset: 0, scrollTop: normalized.scrollTop, reason: 'scroll' };
}

/** Keep at most 1000 recent reads, rejecting inherited keys and future dates. */
export function normalizeReadHistory(raw, now = Date.now()) {
  const result = Object.create(null);
  if (!plainRecord(raw) || !finiteNumber(now) || now < 0) return result;
  const entries = Object.entries(Object.getOwnPropertyDescriptors(raw))
    .filter(([id, descriptor]) => id.length <= 1000 && validId(id) !== null && 'value' in descriptor
      && finiteNumber(descriptor.value) && descriptor.value >= 0
      && descriptor.value <= now && descriptor.value >= now - READ_HISTORY_RETENTION)
    .map(([id, descriptor]) => [id, descriptor.value])
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_READ_HISTORY);
  for (const [id, readAt] of entries) result[id] = readAt;
  return result;
}

export function markArticleRead(history, id, now = Date.now()) {
  const normalized = normalizeReadHistory(history, now);
  const articleId = validId(id);
  if (articleId === null || !finiteNumber(now) || now < 0) return normalized;
  const result = Object.create(null);
  result[articleId] = now;
  let count = 1;
  // Reserve the new read's slot even when all existing timestamps are tied.
  for (const [key, readAt] of Object.entries(normalized)) {
    if (key === articleId) continue;
    if (count === MAX_READ_HISTORY) break;
    result[key] = readAt;
    count++;
  }
  return result;
}

export function unmarkArticleRead(history, id, now = Date.now()) {
  const result = normalizeReadHistory(history, now);
  const articleId = validId(id);
  if (articleId !== null) delete result[articleId];
  return result;
}
