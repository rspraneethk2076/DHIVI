import { createHash } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { SOURCE_REGISTRY } from './source-registry.mjs';

export const REFRESH_INTERVAL = 3_600_000;
export const WINDOW_HOURS = 24;
export const MAX_ARTICLE_AGE = WINDOW_HOURS * 60 * 60 * 1_000;
export const MAX_FEED_BYTES = 2_000_000;
export const MAX_ARTICLES_PER_FEED = 50;
export const MAX_ARTICLES = 400;
export const SOURCES = SOURCE_REGISTRY;

export const CREATOR_SOURCE = {
  id: 'vaibhav-sisinty', name: 'Vaibhav Sisinty',
  url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UClXAalunTPaX1YV185DWUeg',
  siteUrl: 'https://www.youtube.com/channel/UClXAalunTPaX1YV185DWUeg',
  aiOnly: true,
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: false,
  trimValues: true,
});

const AI = /\b(?:AI|A\.?I\.?|artificial intelligence|machine learning|deep learning|neural networks?|LLMs?|large language models?|frontier models?|generative AI|generative models?|generative adversarial networks?|ChatGPT|GPT[-\s]?\d|Gemini|Claude|Copilot|Codex|Qwen|Llama|DeepSeek|Mistral|Gemma|Veo|Imagen|AlphaFold|NotebookLM|DALL[- ]?E|Stable Diffusion|reinforcement learning|computer vision)\b/i;
const JOURNAL_AI = /\b(?:AI|A\.?I\.?|artificial intelligence|machine learning|deep learning|neural networks?|LLMs?|large language models?|language models?|foundation models?|ChatGPT|GPT[-\s]?\d|NotebookLM|Gemma|Qwen|DeepSeek|reinforcement learning|computer vision|generative AI)\b/i;
const SCIENTIFIC_AI = /\b(?:artificial intelligence|machine learning|deep learning|neural networks?|LLMs?|large language models?|language models?|foundation models?|ChatGPT|GPT[-\s]?\d|NotebookLM|reinforcement learning|computer vision|generative AI|AI[- ](?:based|assisted|powered|models?|systems?|algorithms?))\b/i;
const CLINICAL = /\b(?:clinical|clinicians?|medical|medicine|health(?:care)?|hospitals?|patients?|physicians?|doctors?|diagnos(?:is|tic|tics|e|es)|radiology|oncology|cancer|drug discovery|biomedical|therapeutic|EHR|surgery|surgical|mental health|pathology)\b/i;
const TOOL = /\b(?:tools?|apps?|applications?|assistants?|agents?|ChatGPT|Copilot|Gemini|Claude|Codex|platform|APIs?|SDK|workspace|studio|browser|plugins?)\b/i;
const LAUNCH = /\b(?:launch(?:es|ed|ing)?|introduc(?:e[sd]?|ing)|unveil(?:s|ed|ing)?|releas(?:e[sd]?|ing)|new|now available|roll(?:s|ed|ing)? out|build with|try|preview|offers?|meet|top \d+|best)\b/i;
const TECHNICAL = /\b(?:research|researchers?|papers?|benchmarks?|architectures?|models?|training|inference|reasoning|datasets?|weights|open[- ]source|transformers?|neural|diffusion|reinforcement|embeddings?|GPUs?|CUDA|fine[- ]tun(?:e|es|ing)|quantization|evaluation|coding|algorithms?)\b/i;
const RESEARCH_FOCUS = /\b(?:reinforcement learning|(?:pre[- ]?|post[- ]?|agent |model |distributed |neural network )training|(?:model|neural|transformer|attention) architectures?|benchmarks?|(?:research|training) frameworks?|quantization|mixture[- ]of[- ]experts|gradient descent)\b/i;
const GEOPOLITICAL = /\b(?:geopolitic(?:s|al)?|export controls?|export restrictions?|chip bans?|national security|AI sovereignty|sovereign AI|defen[cs]e|military|Pentagon|Air Force|diploma(?:cy|tic)|sanctions?|AI Act|AI (?:arms )?race|chip wars?|technology cold war)\b/i;
const REGULATION = /\b(?:regulat(?:ion|ions|ory|e|es|ed|ing)|legislat(?:ion|ive|ors?)|lawmakers?|AI laws?|AI bills?|AI governance|AI polic(?:y|ies))\b/i;
const POLICY_ACTION = /\b(?:sign(?:s|ed)?|approv(?:e[sd]?|al)|enact(?:s|ed)?|pass(?:es|ed)?|ban(?:s|ned)?|restrict(?:s|ed|ion)?|impos(?:e[sd]?|ing)|govern(?:s|ed)?|governments?|Congress|Senate|minister|contract|procure(?:ment)?|investigat(?:e[sd]?|ion)|compliance deadline)\b/i;

export function isWithinNewsWindow(publishedAt, now = Date.now()) {
  const timestamp = typeof publishedAt === 'number' ? publishedAt : Date.parse(publishedAt);
  return Number.isFinite(timestamp) && timestamp <= now && timestamp >= now - MAX_ARTICLE_AGE;
}

export function hasGeopoliticalFocus(title, summary = '') {
  if (GEOPOLITICAL.test(title) || REGULATION.test(title)) return true;
  if (AI.test(`${title} ${summary}`) && /\b(?:laws?|bills?|Congress|Senate|Parliament|White House)\b/i.test(title) && /\b(?:govern|regulat|approv|sign|pass|ban|restrict|propos|draft|debat)\w*\b/i.test(title) && !/\b(?:scaling|power|physical|moore'?s)\b/i.test(title)) return true;
  const sentences = summary.split(/[.!?](?:\s|$)/);
  if (sentences.some(sentence => (GEOPOLITICAL.test(sentence) || REGULATION.test(sentence)) && POLICY_ACTION.test(sentence))) return true;
  const content = `${title} ${summary}`;
  const country = /\b(?:US|U\.S\.|United States|China|Chinese|Europe|European|UK|India|Russia|Japan|Taiwan)\b/i;
  if (country.test(content) && /\b(?:AI competition|AI dominance|AI leadership|AI rivalry|compete in AI)\b/i.test(content)) return true;
  return /\b(?:chips?|semiconductors?)\b/i.test(title) && /\b(?:export|sanctions?|embargo|trade restrictions?|trade wars?)\b/i.test(title);
}

const array = value => value == null ? [] : Array.isArray(value) ? value : [value];
const text = value => typeof value === 'string' ? value : typeof value === 'number' ? String(value) : value && typeof value === 'object' ? text(value['#text'] ?? value['__cdata'] ?? '') : '';

function explicitJournal(source) {
  return source.contentType === 'journal' || /\bjournal\b/i.test(source.kind ?? '');
}

export function isEvergreenPromotion(title, source = {}) {
  if (source.aiOnly || source.kind === 'research' || explicitJournal(source)) return false;
  const consumer = /\b(?:laptops?|chromebooks?|headphones?|earbuds?|smartphones?|phones?|tablets?|monitors?|printers?|keyboards?|mice|webcams?|smartwatches?|TVs?|VPNs?|antivirus|AI tools?|AI apps?|AI subscriptions?)\b/i;
  if (/\b(?:buying guides?|buyer['’]?s guides?|which .{0,50} should you buy)\b/i.test(title)) return true;
  if (/\bbest\b/i.test(title) && consumer.test(title) && /\b(?:20\d{2}|top picks|our picks|for work|for school|for gaming|for students)\b/i.test(title)) return true;
  if (/\breview\s*[:–—-]/i.test(title) && consumer.test(title)) return true;
  const retail = /\b(?:discounts?|coupons?|on sale|price drops?|prime day|black friday|cyber monday|save)\b/i.test(title);
  const price = /(?:[$£€]\s*\d|\d+\s*%|\bfor just\b|\bpercent off\b)/i.test(title);
  const business = /\b(?:acquisitions?|acquires?|mergers?|funding|financing|investments?|investors?|raises?|valuations?|contracts?|export controls?|regulations?|policy)\b/i.test(title);
  if (retail && price && !business) return true;
  return /\b(?:tickets?|registration|register)\b/i.test(title) && /\b(?:save|discount|sale|early bird|last chance)\b/i.test(title);
}

export function feedSummary(description, title, source) {
  const lead = plainText(description, 360);
  if (!explicitJournal(source) || SCIENTIFIC_AI.test(`${title} ${lead}`) || /\bAI\b/i.test(title)) return lead;
  // Trusted scholarly feeds often put author lists and background before the
  // methods. Extract real evidence from a bounded abstract, never unseen footer
  // text from a mixed publisher/vendor feed or an invented research summary.
  const abstract = plainText(description, 4_000);
  const sentence = abstract.match(/[^.!?]+(?:[.!?]+(?:\s|$)|$)/g)?.find(value => SCIENTIFIC_AI.test(value));
  if (!sentence) return lead;
  const evidence = sentence.trim();
  if (evidence.length <= 360) return evidence;
  const position = evidence.search(SCIENTIFIC_AI);
  let start = Math.max(0, position - 100);
  if (start) { const nextSpace = evidence.indexOf(' ', start); if (nextSpace >= 0 && nextSpace < position) start = nextSpace + 1; }
  return `${start ? '…' : ''}${plainText(evidence.slice(start), start ? 359 : 360)}`;
}

export function decodeEntities(input) {
  return String(input ?? '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|ndash|mdash|rsquo|lsquo|rdquo|ldquo|hellip);/gi, (match, entity) => {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };
    if (entity[0] !== '#') return named[entity.toLowerCase()] ?? match;
    const value = entity[1]?.toLowerCase() === 'x' ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
    return Number.isInteger(value) && value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff) ? String.fromCodePoint(value) : '';
  });
}

export function plainText(input, maxLength = 360) {
  let result = decodeEntities(text(input));
  result = result.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?[a-z][^>]*>/gi, ' ').replace(/\s+/g, ' ').trim();
  // Decoding after stripping also handles double-escaped feed text. This is text only,
  // and the client must render it as text rather than injecting HTML.
  result = decodeEntities(result).replace(/\s+/g, ' ').trim();
  return result.length > maxLength ? `${result.slice(0, maxLength - 1).trimEnd()}…` : result;
}

export function safeUrl(value, base) {
  try {
    const raw = decodeEntities(text(value)).trim();
    if (!raw) return null;
    const parsed = new URL(raw, base);
    const hostname = parsed.hostname.toLowerCase();
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    // Feed links are displayed to users; local/private destinations never qualify.
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname === '[::1]' || hostname.includes(':') ||
      /^(?:127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(hostname)) return null;
    return parsed.href;
  } catch { return null; }
}

export function canonicalUrl(value) {
  const parsed = new URL(value);
  parsed.hash = '';
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(?:utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) parsed.searchParams.delete(key);
  }
  parsed.searchParams.sort();
  return parsed.href.replace(/\/$/, '');
}

export function classifyArticle(title, summary = '', sourceCategory) {
  const content = `${title} ${summary}`;
  if (sourceCategory === 'geopolitical' || hasGeopoliticalFocus(title, summary)) return 'geopolitical';
  if (sourceCategory === 'clinical' || CLINICAL.test(content)) return 'clinical';
  // A research launch can mention agents without being an end-user agent tool.
  // Explicit technical subjects in the headline take priority over launch verbs.
  if (RESEARCH_FOCUS.test(title)) return 'technical';
  if (TOOL.test(content) && LAUNCH.test(title)) return 'tools';
  if (TECHNICAL.test(content) || sourceCategory === 'technical') return 'technical';
  return 'news';
}

function tagsFor(content, category) {
  const patterns = [
    ['OpenAI', /\b(?:OpenAI|ChatGPT|GPT[-\s]?\d|Codex)\b/i],
    ['Google', /\b(?:Google|Gemini|DeepMind)\b/i],
    ['Anthropic', /\b(?:Anthropic|Claude)\b/i],
    ['NVIDIA', /\b(?:NVIDIA|CUDA|Blackwell)\b/i],
    ['Open source', /\b(?:open[- ]source|open weights|Hugging Face)\b/i],
    ['Agents', /\bagents?\b/i],
    ['Research', /\b(?:research|paper|study|benchmark)\b/i],
    ['Healthcare', CLINICAL],
    ['Coding', /\b(?:coding|code|developer|programming)\b/i],
    ['Robotics', /\brobot(?:s|ics)?\b/i],
    ['Safety', /\b(?:safety|security|alignment|privacy|risk)\b/i],
    ['Policy', /\b(?:regulat(?:ion|ions|ory)|legislation|AI Act|export controls?|sovereign|geopolitic(?:s|al)?)\b/i],
    ['Multimodal', /\b(?:multimodal|vision|image|video|audio|speech)\b/i],
  ];
  return [category, ...patterns.filter(([, pattern]) => pattern.test(content)).map(([label]) => label)].slice(0, 5);
}

function itemLink(item, base) {
  for (const link of array(item.link)) {
    const url = typeof link === 'object' ? link['@_href'] : text(link);
    if (typeof link === 'object' && link['@_rel'] && link['@_rel'] !== 'alternate') continue;
    const safe = safeUrl(url, base);
    if (safe) return safe;
  }
  return safeUrl(item['prism:url'] ?? item['@_rdf:about'], base);
}

function itemImage(item, base) {
  const media = [...array(item['media:thumbnail']), ...array(item['media:content']), ...array(item['media:group']?.['media:thumbnail']), ...array(item['media:group']?.['media:content'])];
  for (const candidate of media) {
    if (candidate?.['@_medium'] && candidate['@_medium'] !== 'image') continue;
    if (candidate?.['@_type'] && !candidate['@_type'].startsWith('image/')) continue;
    const safe = safeUrl(candidate?.['@_url'], base);
    if (safe) return safe.replace(/^http:/, 'https:');
  }
  for (const candidate of [...array(item.enclosure), ...array(item.link).filter(link => link?.['@_rel'] === 'enclosure')]) {
    const url = candidate?.['@_url'] ?? candidate?.['@_href'];
    if (!candidate?.['@_type']?.startsWith('image/') && !/\.(?:jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(url ?? '')) continue;
    const safe = safeUrl(url, base);
    if (safe) return safe.replace(/^http:/, 'https:');
  }
  const html = decodeEntities(text(item['content:encoded'] ?? item.content ?? item.description ?? item.summary));
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (/\b(?:width|height)\s*=\s*["']?[0-9](?:["'\s>])/.test(match[0])) continue;
    const src = match[0].match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const safe = safeUrl(src?.[1] ?? src?.[2] ?? src?.[3], base);
    if (safe) return safe.replace(/^http:/, 'https:');
  }
  return null;
}

export function parseFeed(xml, source, now = Date.now()) {
  if (typeof xml !== 'string' || Buffer.byteLength(xml) > MAX_FEED_BYTES) throw new Error('Feed too large');
  // No DTD or custom entities. External entities and expansion bombs are rejected
  // before parsing, with entity processing disabled as a second boundary.
  const declarations = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->/g, '');
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(declarations)) throw new Error('DTD is not allowed');
  if (XMLValidator.validate(xml) !== true) throw new Error('Invalid XML');
  const document = parser.parse(xml);
  const entries = document.rss?.channel?.item ?? document.feed?.entry ?? document['rdf:RDF']?.item ?? document.RDF?.item;
  if (!document.rss && !document.feed && !document['rdf:RDF'] && !document.RDF) throw new Error('Not an RSS or Atom feed');
  const articles = [];
  for (const item of array(entries).slice(0, 160)) {
    const title = plainText(item.title ?? item['dc:title'], 220);
    const description = item.description ?? item.summary ?? item['content:encoded'] ?? item.content;
    const summary = feedSummary(description, title, source);
    const url = itemLink(item, source.url);
    // An Atom modification timestamp is not evidence of original publication.
    const dateValue = text(item.pubDate ?? item.published ?? item['dc:date'] ?? item['prism:publicationDate']);
    const timestamp = Date.parse(dateValue);
    if (!title || title.length < 8 || !url || !isWithinNewsWindow(timestamp, now)) continue;
    if (isEvergreenPromotion(title, source)) continue;
    // Mixed feeds must justify inclusion in what the reader can actually see.
    // A later sidebar, footer or boilerplate AI mention cannot qualify a story.
    const relevance = `${title} ${summary}`;
    const journal = source.contentType === 'journal' || source.category === 'clinical' || source.kind === 'research' || /journal|medical|clinical|academic/i.test(source.kind ?? '');
    if (explicitJournal(source) ? !SCIENTIFIC_AI.test(relevance) && !/\bAI\b/i.test(title) : journal ? !JOURNAL_AI.test(relevance) : !source.aiOnly && !AI.test(relevance)) continue;
    const category = classifyArticle(title, summary, source.category);
    articles.push({
      id: createHash('sha256').update(canonicalUrl(url)).digest('hex').slice(0, 24),
      title, summary, url,
      image: itemImage(item, url) ?? `/images/${category}.svg`,
      source: source.name,
      sourceId: source.id,
      publisherId: source.publisher ?? source.id,
      sourceKind: source.kind ?? 'publisher',
      contentType: source.contentType ?? null,
      publishedAt: new Date(timestamp).toISOString(),
      category,
      tags: tagsFor(`${title} ${summary}`, category),
    });
  }
  return articles.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, MAX_ARTICLES_PER_FEED);
}

export function deduplicateArticles(articles, now = Date.now(), { limit = MAX_ARTICLES } = {}) {
  const urls = new Set();
  const titles = new Set();
  const unique = articles.filter(article => isWithinNewsWindow(article.publishedAt, now))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter(article => {
      const url = canonicalUrl(article.url);
      const title = article.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      if (urls.has(url) || titles.has(title)) return false;
      urls.add(url); titles.add(title); return true;
    });
  // Round-robin across publishers before applying the cap. A busy feed cannot
  // crowd every smaller publisher out merely by publishing more often.
  const groups = new Map();
  for (const article of unique) {
    const publisher = article.publisherId ?? article.sourceId ?? article.source;
    if (!groups.has(publisher)) groups.set(publisher, []);
    groups.get(publisher).push(article);
  }
  const selected = [];
  const queues = [...groups.values()];
  const publisherCap = Math.max(40, Math.ceil(limit / Math.max(1, queues.length)));
  for (let round = 0; round < publisherCap && selected.length < limit; round++) {
    for (const queue of queues) {
      if (queue[round]) selected.push(queue[round]);
      if (selected.length >= limit) break;
    }
  }
  return selected.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export async function fetchFeed(source, { fetchImpl = fetch, now = Date.now(), timeout = 6_000, signal } = {}) {
  if (!safeUrl(source.url)) throw new Error('Invalid feed URL');
  const response = await fetchImpl(source.url, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout),
    headers: { 'User-Agent': 'DhiviLiveAINews/1.0 (+https://netlify.app)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Feed returned ${response.status}`);
  if (Number(response.headers.get('content-length')) > MAX_FEED_BYTES) throw new Error('Feed too large');
  if (!response.body) throw new Error('Empty feed');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FEED_BYTES) { await reader.cancel(); throw new Error('Feed too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return parseFeed(Buffer.concat(chunks).toString('utf8'), source, now);
}

export function parseOpenGraphImage(html, base) {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = {};
    for (const match of tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[match[1].toLowerCase()] = match[2] ?? match[3];
    if (!/^(?:og:image(?::secure_url)?|twitter:image(?::src)?)$/i.test(attrs.property ?? attrs.name ?? '')) continue;
    const url = safeUrl(attrs.content, base);
    if (url) return url.replace(/^http:/, 'https:');
  }
  return null;
}

// Only known publisher hosts may be requested. No arbitrary client-supplied URL
// reaches this function; redirects are disabled and we read only the HTML head.
export async function fetchArticleImage(article, source, fetchImpl = fetch, { timeout = 2_500 } = {}) {
  const url = safeUrl(article.url);
  if (!url || !source?.siteUrl) return null;
  const host = new URL(url).hostname;
  const allowed = new URL(source.siteUrl).hostname;
  if (host !== allowed && !host.endsWith(`.${allowed}`)) return null;
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeout), redirect: 'error', headers: { Accept: 'text/html', 'User-Agent': 'DhiviLiveAINews/1.0' } });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html') || !response.body) return null;
  const reader = response.body.getReader();
  const chunks = [];
  const maxBytes = 350_000;
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const portion = value.subarray(0, maxBytes - total);
      chunks.push(portion); total += portion.byteLength;
      if (/<\/head\s*>/i.test(Buffer.concat(chunks).toString('utf8'))) break;
    }
    await reader.cancel();
  } finally { reader.releaseLock(); }
  return parseOpenGraphImage(Buffer.concat(chunks).toString('utf8'), url);
}
