import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_READ_HISTORY, READ_HISTORY_RETENTION, markArticleRead, normalizeReadHistory, normalizeReadingState, resolveReadingPosition, unmarkArticleRead } from '../src/reading-state.mjs';
import { NEWS_WINDOW, filterArticles, normalizeArticle } from '../src/feed-model.mjs';

const NOW = Date.parse('2026-10-13T18:00:00Z');
const progress = (overrides = {}) => ({ category: 'all', mode: 'spotlight', query: '', articleId: 'b', articleIds: ['a', 'b', 'c', 'd'], offset: 35, scrollTop: 620, updatedAt: NOW, ...overrides });
const articles = ids => ids.map(id => ({ id }));

test('progress preserves eligible category, order, query and exact story identity', () => {
  for (const category of ['all', 'news', 'technical', 'clinical', 'tools', 'geopolitical', 'saved']) {
    for (const mode of ['spotlight', 'latest', 'for-you']) {
      const value = progress({ category, mode, query: 'model benchmark' });
      assert.deepEqual(normalizeReadingState(value), value);
    }
  }
});

test('missing or malformed critical progress fields are rejected without coercion', () => {
  for (const value of [null, undefined, [], 'progress', {}, progress({ category: 'unknown' }), progress({ mode: 'popular' }), progress({ query: {} }), progress({ articleId: null }), progress({ articleId: ' ' }), progress({ offset: '35' }), progress({ offset: Infinity }), progress({ scrollTop: NaN }), progress({ updatedAt: -1 }), progress({ updatedAt: null }), progress({ articleId: '__proto__' })]) {
    assert.equal(normalizeReadingState(value), null);
  }
  const inherited = Object.create(progress());
  assert.equal(normalizeReadingState(inherited), null);
  assert.equal(normalizeReadingState(progress({ articleId: ' '.repeat(1000) + 'not-within-the-limit' })), null);
});

test('progress bounds strings, positions and ordered IDs while dropping malformed duplicate IDs', () => {
  const ids = ['a', 'a', null, 1, '', ' ', '__proto__', 'constructor', 'prototype', ...Array.from({ length: 220 }, (_, i) => `story-${i}`)];
  const value = normalizeReadingState(progress({ query: 'q'.repeat(250), articleId: 'i'.repeat(1100), articleIds: ids, offset: -9999, scrollTop: 99_999_999 }));
  assert.equal(value.query.length, 200);
  assert.equal(value.articleId.length, 1000);
  assert.equal(value.articleIds.length, 200);
  assert.equal(value.articleIds[0], 'a');
  assert.equal(new Set(value.articleIds).size, 200);
  assert.equal(value.offset, -2000);
  assert.equal(value.scrollTop, 10_000_000);
  assert.equal(normalizeReadingState(progress({ offset: 99999, scrollTop: -20 })).offset, 10000);
  assert.equal(normalizeReadingState(progress({ offset: 99999, scrollTop: -20 })).scrollTop, 0);
  assert.deepEqual(normalizeReadingState(progress({ articleIds: 'corrupt' })).articleIds, []);
  assert.equal(normalizeReadingState(progress({ articleId: '' })).articleId, '');
});

test('new headlines and changed ranking do not move a visible saved reading anchor', () => {
  const before = progress();
  const result = resolveReadingPosition(before, articles(['new-1', 'new-2', 'd', 'b', 'a', 'c']));
  assert.deepEqual(result, { articleId: 'b', offset: 35, scrollTop: 620, reason: 'current' });
  assert.deepEqual(before, progress(), 'restoring must not mutate persisted progress');
});

test('an expired or read anchor resumes at the next eligible story in its stored order', () => {
  // b has expired or been marked read; c was also removed. d still exists.
  const result = resolveReadingPosition(progress(), articles(['new-1', 'd', 'a']));
  assert.deepEqual(result, { articleId: 'd', offset: 0, scrollTop: 620, reason: 'next' });
  assert.equal(resolveReadingPosition(progress(), articles(['new-1', 'c', 'a', 'd'])).articleId, 'c');
});

test('restoration never reintroduces absent stories and falls back to bounded scroll position', () => {
  assert.deepEqual(resolveReadingPosition(progress({ scrollTop: 99_999_999 }), articles(['new-1'])), { articleId: null, offset: 0, scrollTop: 10_000_000, reason: 'scroll' });
  assert.deepEqual(resolveReadingPosition(progress(), []), { articleId: null, offset: 0, scrollTop: 620, reason: 'scroll' });
  assert.equal(resolveReadingPosition(null, articles(['b'])), null);
  assert.equal(resolveReadingPosition(progress(), null).articleId, null);
  assert.equal(resolveReadingPosition(progress({ articleId: '', articleIds: ['c'] }), articles(['c'])).articleId, 'c');
});

test('read history uses a strict inclusive 30-day read-time window, including older saved articles', () => {
  const raw = { recent: NOW - 1, boundary: NOW - READ_HISTORY_RETENTION, expired: NOW - READ_HISTORY_RETENTION - 1, future: NOW + 1, invalid: 'now', missing: null };
  const result = normalizeReadHistory(raw, NOW);
  assert.deepEqual(Object.entries(result), [['recent', NOW - 1], ['boundary', NOW - READ_HISTORY_RETENTION]]);
  const savedStoryRead = markArticleRead(result, 'a-story-published-years-ago', NOW);
  assert.equal(savedStoryRead['a-story-published-years-ago'], NOW, 'read history retention depends on read time, not article publication');
  assert.equal(normalizeReadHistory(result, NOW + 1).boundary, undefined);
});

test('read history keeps the newest 1000 reads and exposes no inherited prototype values', () => {
  const raw = Object.fromEntries(Array.from({ length: 1010 }, (_, i) => [`story-${i}`, NOW - i]));
  const result = normalizeReadHistory(raw, NOW);
  assert.equal(MAX_READ_HISTORY, 1000);
  assert.equal(Object.keys(result).length, MAX_READ_HISTORY);
  assert.equal(result['story-0'], NOW);
  assert.equal(result['story-999'], NOW - 999);
  assert.equal(result['story-1000'], undefined);
  assert.equal(Object.getPrototypeOf(result), null);
  assert.equal(result.toString, undefined);
  assert.equal(result.__proto__, undefined);
});

test('prototype poison, accessors and corrupted history cannot create fake read records', () => {
  const poisoned = JSON.parse(`{"__proto__":${NOW},"constructor":${NOW},"prototype":${NOW},"valid":${NOW}}`);
  Object.defineProperty(poisoned, 'getter', { enumerable: true, get() { throw new Error('must not invoke'); } });
  const result = normalizeReadHistory(poisoned, NOW);
  assert.deepEqual(Object.entries(result), [['valid', NOW]]);
  assert.equal(Object.getPrototypeOf(result), null);
  for (const raw of [null, undefined, [], 5, 'corrupt', Object.create({ inherited: NOW })]) assert.equal(Object.keys(normalizeReadHistory(raw, NOW)).length, 0);
  assert.equal(Object.keys(normalizeReadHistory({ valid: NOW }, NaN)).length, 0);
  assert.equal(Object.keys(normalizeReadHistory({ ['x'.repeat(1001)]: NOW }, NOW)).length, 0);
});

test('mark and unmark are immutable, refresh read timestamps and reject unsafe IDs', () => {
  const original = { a: NOW - 100, b: NOW - 50 };
  const marked = markArticleRead(original, 'a', NOW);
  assert.equal(marked.a, NOW);
  assert.equal(marked.b, NOW - 50);
  assert.deepEqual(original, { a: NOW - 100, b: NOW - 50 });
  const unmarked = unmarkArticleRead(marked, 'a', NOW);
  assert.equal(unmarked.a, undefined);
  assert.equal(unmarked.b, NOW - 50);
  assert.equal(marked.a, NOW);
  for (const id of ['', ' ', null, '__proto__', 'constructor', 'prototype']) {
    assert.deepEqual(Object.entries(markArticleRead(original, id, NOW)), [['b', NOW - 50], ['a', NOW - 100]]);
  }
});

test('marking a new story at capacity retains it even when every read has the same timestamp', () => {
  const full = Object.fromEntries(Array.from({ length: MAX_READ_HISTORY }, (_, i) => [String(i), NOW]));
  const marked = markArticleRead(full, '1000', NOW);
  assert.equal(Object.keys(marked).length, MAX_READ_HISTORY);
  assert.equal(marked['1000'], NOW);
  assert.equal(Object.keys(full).length, MAX_READ_HISTORY);
  assert.equal(full['1000'], undefined);
});

test('serialized progress and read history resume at the next unread story, and Undo cannot revive expired news', () => {
  const items = ['a', 'b', 'c', 'd'].map(id => normalizeArticle({ id, title: `AI research record-${id}`, url: `https://publisher.example/${id}`, publishedAt: new Date(NOW - 1000).toISOString(), category: 'technical' }));
  const restoredProgress = normalizeReadingState(JSON.parse(JSON.stringify(progress())));
  const restoredHistory = normalizeReadHistory(JSON.parse(JSON.stringify(markArticleRead({}, 'b', NOW))), NOW);
  const readIds = new Set(Object.keys(restoredHistory));
  for (const mode of ['spotlight', 'latest', 'for-you']) {
    const unread = filterArticles(items, { mode, now: NOW, readIds });
    assert.deepEqual(unread.map(article => article.id), ['a', 'c', 'd']);
    assert.equal(resolveReadingPosition(restoredProgress, unread).articleId, 'c');
  }
  assert.equal(filterArticles(items, { category: 'saved', query: 'record-b', now: NOW, readIds }).length, 1);
  const undone = unmarkArticleRead(restoredHistory, 'b', NOW);
  const visibleAgain = filterArticles(items, { now: NOW, readIds: Object.keys(undone) });
  assert.equal(resolveReadingPosition(restoredProgress, visibleAgain).articleId, 'b');
  const expired = filterArticles(items, { now: NOW + NEWS_WINDOW, readIds: Object.keys(undone) });
  assert.deepEqual(expired, []);
  assert.equal(resolveReadingPosition(restoredProgress, expired).articleId, null);
});
