import { canonicalUrl, isWithinNewsWindow } from './feeds.mjs';

// Deliberately conservative headline similarity. Generic AI/vendor names cannot
// alone create a topic match, corroboration count, or creator-signal boost.
const STOP_WORDS = new Set('the a an and or of in on to for with from by at is are was were be been being this that these those it its their our your new latest first next more most how what why when now today meet introduces introducing introduce launches launch launched releases release released unveils unveiled announce announces announced says said offers offer using use used helps help ai artificial intelligence model models tool tools agent agents research researchers paper papers study studies openai google anthropic nvidia meta microsoft llm llms gemini claude gpt chatgpt'.split(' '));

function headlineTokens(title) {
  return new Set(String(title).toLowerCase().match(/[\p{L}\p{N}]+(?:[.-][\p{L}\p{N}]+)*/gu)?.map(word => word.length > 5 && word.endsWith('s') ? word.slice(0, -1) : word).filter(word => word.length >= 3 && !STOP_WORDS.has(word)) ?? []);
}

function normalizedTitle(title) {
  return String(title).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function relatedHeadlines(first, second, { strong = false } = {}) {
  if (normalizedTitle(first) === normalizedTitle(second)) return normalizedTitle(first).length > 15;
  const a = headlineTokens(first), b = headlineTokens(second);
  const shared = [...a].filter(token => b.has(token));
  if (shared.length < (strong ? 3 : 2) || !shared.some(token => token.length >= 6)) return false;
  const union = new Set([...a, ...b]).size;
  const overlap = shared.length / Math.max(1, union);
  return overlap >= (strong ? 0.5 : 0.4) || (shared.length >= 3 && shared.length / Math.max(1, Math.min(a.size, b.size)) >= (strong ? 0.85 : 0.75));
}

function publisher(article) {
  const id = article.publisherId ?? article.sourceId ?? article.source;
  // Google's corporate and research feeds represent one publisher, not two
  // independent confirmations. An article count is never a publisher count.
  if (/^google(?:-|$)/i.test(id)) return { id: 'google', name: 'Google' };
  return { id, name: article.source };
}

function impactReason(article) {
  const title = article.title;
  if (article.category === 'geopolitical') return { points: 26, reason: 'AI policy, international competition or national-security impact' };
  if (article.category === 'clinical') return { points: 20, reason: 'Clinical AI research or healthcare impact' };
  const release = /\b(?:launch(?:es|ed)?|introduc(?:e[sd]?|ing)|releas(?:e[sd]?|ing)|unveil(?:s|ed)?|available)\b/i;
  if (release.test(title) && /\b(?:models?|GPT[-\s]?\d|Gemma|Qwen|DeepSeek|Llama|weights)\b/i.test(title) && !/\b(?:framework|training|benchmark|reinforcement learning|architecture)\b/i.test(title)) return { points: 24, reason: 'Concrete AI model or weights release' };
  if (article.category === 'tools') return { points: 18, reason: 'New tool or practical AI capability' };
  if (article.category === 'technical' && /\b(?:benchmark|training|research|architecture|framework|inference|quantization)\b/i.test(title)) return { points: 16, reason: 'Concrete technical research or infrastructure development' };
  return { points: 0 };
}

export function annotateSpotlight(articles, { now = Date.now(), coverageArticles = articles, creatorSignals = [], curatorDispatch = null } = {}) {
  const evidence = coverageArticles.filter(article => isWithinNewsWindow(article.publishedAt, now));
  const signals = creatorSignals.filter(signal => isWithinNewsWindow(signal.publishedAt, now));
  return articles.filter(article => isWithinNewsWindow(article.publishedAt, now)).map(article => {
    const hours = (now - Date.parse(article.publishedAt)) / 3_600_000;
    let score = Math.max(0, Math.round(40 * (1 - hours / 24)));
    const reasons = [hours <= 3 ? 'Published within 3 hours' : hours <= 12 ? 'Published within 12 hours' : 'Published within 24 hours'];
    const related = evidence.filter(candidate => relatedHeadlines(article.title, candidate.title));
    const publishers = new Map([publisher(article), ...related.map(publisher)].map(value => [value.id, value.name]));
    const otherSourceCount = Math.max(0, publishers.size - 1);
    if (otherSourceCount) {
      score += Math.min(30, otherSourceCount * 10);
      reasons.push(`Related topic coverage across ${publishers.size} publishers`);
    }
    const impact = impactReason(article);
    score += impact.points;
    if (impact.reason) reasons.push(impact.reason);
    const creatorSignal = signals.find(signal => relatedHeadlines(article.title, signal.title, { strong: true }));
    if (creatorSignal) {
      score += 8;
      reasons.push(`Specific topic also appears in ${creatorSignal.creator}'s fresh public headline`);
    }
    const curatorTopic = curatorDispatch && isWithinNewsWindow(curatorDispatch.publishedAt, now) ? curatorDispatch.topics.find(topic => {
      if (topic.url && canonicalUrl(topic.url) === canonicalUrl(article.url)) return true;
      let identifiers = '';
      try { identifiers = new URL(topic.url).pathname.replace(/[-_/]/g, ' '); } catch { /* Title-only matching remains available. */ }
      return relatedHeadlines(article.title, `${topic.title} ${identifiers}`, { strong: true });
    }) : null;
    if (curatorTopic) { score += 8; reasons.push('In today’s Staying Ahead briefing'); }
    const spotlight = {
      score: Math.min(100, score), reasons,
      corroboration: {
        sourceCount: publishers.size, otherSourceCount,
        sources: [...publishers.values()],
        relatedArticleIds: [...new Set(related.filter(candidate => candidate.id !== article.id).map(candidate => candidate.id))],
        kind: 'related-topic-coverage',
        note: 'Headline similarity across publishers, not independent verification of facts.',
      },
    };
    if (creatorSignal) spotlight.creatorSignal = { id: creatorSignal.id, creator: creatorSignal.creator, title: creatorSignal.title, url: creatorSignal.url };
    if (curatorTopic) spotlight.curatorSignal = { title: curatorDispatch.title, url: curatorDispatch.url, publishedAt: curatorDispatch.publishedAt, topicTitle: curatorTopic.title, topicUrl: curatorTopic.url };
    return { ...article, spotlight };
  });
}

export function rankSpotlight(articles) {
  return [...articles].sort((a, b) => (b.spotlight?.score ?? 0) - (a.spotlight?.score ?? 0) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
