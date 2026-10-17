import { normalizeArticle } from './feed-model.mjs';

// An archive is deliberately independent from the live feed's expiry and limits.
export function normalizeSavedArchive(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.map(normalizeArticle).filter(article => {
    if (!article || seen.has(article.id)) return false;
    seen.add(article.id);
    return true;
  });
}

export function changeSavedArchive(previous, article, remove = false) {
  return normalizeSavedArchive(remove
    ? previous.filter(item => item.id !== article.id)
    : [article, ...previous]);
}
