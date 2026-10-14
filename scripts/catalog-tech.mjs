import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { parseFeed, MAX_FEED_BYTES, canonicalUrl, decodeEntities, plainText } from '../netlify/functions/lib/feeds.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'data/source-candidates-tech.json');
const REPORT = resolve(ROOT, 'docs/source-research-tech.md');
const AGENT = 'DhiviSourceCatalog/1.0';
const TIMEOUT = 8_000;
const CONCURRENCY = 8;
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false, processEntities: false });
const array = value => value == null ? [] : Array.isArray(value) ? value : [value];

// These are publisher-owned discovery pages, not guessed feed URLs. Every feed
// candidate is extracted from an actual alternate/feed link on the cited page.
const PUBLISHERS = [
  ['Ars Technica', 'https://arstechnica.com/rss-feeds/', 'directory'],
  ['WIRED', 'https://www.wired.com/about/rss-feeds/', 'directory'],
  ['TechRadar', 'https://www.techradar.com/how-to/techradar-rss', 'directory'],
  ['TechCrunch', 'https://techcrunch.com/'],
  ['TechCrunch AI', 'https://techcrunch.com/category/artificial-intelligence/'],
  ['The Verge', 'https://www.theverge.com/'],
  ['The Verge AI', 'https://www.theverge.com/ai-artificial-intelligence'],
  ['VentureBeat', 'https://venturebeat.com/'],
  ['VentureBeat RSS', 'https://venturebeat.com/rss/', 'directory'],
  ['Engadget', 'https://www.engadget.com/'],
  ['Tom’s Hardware', 'https://www.tomshardware.com/'],
  ['Tom’s Guide', 'https://www.tomsguide.com/'],
  ['PCWorld', 'https://www.pcworld.com/'],
  ['Computerworld', 'https://www.computerworld.com/'],
  ['InfoWorld', 'https://www.infoworld.com/'],
  ['The Register', 'https://www.theregister.com/'],
  ['The Register AI', 'https://www.theregister.com/software/ai_ml/'],
  ['The Next Web', 'https://thenextweb.com/'],
  ['SiliconANGLE', 'https://siliconangle.com/'],
  ['The New Stack', 'https://thenewstack.io/'],
  ['InfoQ', 'https://www.infoq.com/'],
  ['SD Times', 'https://sdtimes.com/'],
  ['DevClass', 'https://devclass.com/'],
  ['Data Center Dynamics', 'https://www.datacenterdynamics.com/en/'],
  ['Datanami', 'https://www.datanami.com/'],
  ['Analytics India Magazine', 'https://analyticsindiamag.com/'],
  ['Unite.AI', 'https://www.unite.ai/'],
  ['AI News', 'https://www.artificialintelligence-news.com/'],
  ['MarkTechPost', 'https://www.marktechpost.com/'],
  ['Machine Learning Mastery', 'https://machinelearningmastery.com/'],
  ['IEEE Spectrum', 'https://spectrum.ieee.org/'],
  ['TechSpot', 'https://www.techspot.com/'],
  ['CNET', 'https://www.cnet.com/'],
  ['Fast Company AI', 'https://www.fastcompany.com/section/artificial-intelligence'],
  ['MIT Technology Review', 'https://www.technologyreview.com/'],
];

const OFFICIAL = [
  ['OpenAI', 'https://openai.com/news/', true],
  ['Anthropic', 'https://www.anthropic.com/news', true],
  ['Google', 'https://blog.google/'],
  ['Google AI', 'https://blog.google/technology/ai/', true],
  ['Google Developers', 'https://developers.googleblog.com/'],
  ['Google Cloud', 'https://cloud.google.com/blog/'],
  ['Google Workspace', 'https://workspace.google.com/blog/'],
  ['Google DeepMind', 'https://deepmind.google/discover/blog/', true],
  ['Microsoft', 'https://blogs.microsoft.com/'],
  ['Microsoft AI', 'https://blogs.microsoft.com/ai/', true],
  ['Microsoft Azure', 'https://azure.microsoft.com/en-us/blog/'],
  ['Microsoft 365', 'https://www.microsoft.com/en-us/microsoft-365/blog/'],
  ['Microsoft Developer Blogs', 'https://devblogs.microsoft.com/'],
  ['Microsoft Semantic Kernel', 'https://devblogs.microsoft.com/semantic-kernel/', true],
  ['Microsoft Foundry', 'https://devblogs.microsoft.com/foundry/', true],
  ['Microsoft .NET', 'https://devblogs.microsoft.com/dotnet/'],
  ['Visual Studio', 'https://devblogs.microsoft.com/visualstudio/'],
  ['Visual Studio Code', 'https://code.visualstudio.com/blogs/'],
  ['Windows Developer', 'https://blogs.windows.com/windowsdeveloper/'],
  ['AWS News', 'https://aws.amazon.com/blogs/aws/'],
  ['AWS AI', 'https://aws.amazon.com/blogs/machine-learning/', true],
  ['AWS Big Data', 'https://aws.amazon.com/blogs/big-data/'],
  ['AWS Compute', 'https://aws.amazon.com/blogs/compute/'],
  ['AWS Architecture', 'https://aws.amazon.com/blogs/architecture/'],
  ['AWS Startups', 'https://aws.amazon.com/blogs/startups/'],
  ['AWS Open Source', 'https://aws.amazon.com/blogs/opensource/'],
  ['NVIDIA', 'https://blogs.nvidia.com/'],
  ['NVIDIA Generative AI', 'https://blogs.nvidia.com/blog/category/generative-ai/', true],
  ['NVIDIA Developer', 'https://developer.nvidia.com/blog/'],
  ['Hugging Face', 'https://huggingface.co/blog', true],
  ['IBM Think', 'https://www.ibm.com/think/'],
  ['Meta AI', 'https://ai.meta.com/blog/', true],
  ['Meta Engineering', 'https://engineering.fb.com/'],
  ['Oracle AI', 'https://blogs.oracle.com/ai-and-datascience/', true],
  ['Cohere', 'https://cohere.com/blog', true],
  ['Mistral AI', 'https://mistral.ai/news', true],
  ['AI21 Labs', 'https://www.ai21.com/blog', true],
  ['Stability AI', 'https://stability.ai/news', true],
  ['Perplexity', 'https://www.perplexity.ai/hub/blog', true],
  ['Runway', 'https://runwayml.com/research', true],
  ['ElevenLabs', 'https://elevenlabs.io/blog', true],
  ['xAI', 'https://x.ai/news', true],
  ['LangChain', 'https://blog.langchain.com/', true],
  ['LlamaIndex', 'https://www.llamaindex.ai/blog', true],
  ['Ollama', 'https://ollama.com/blog', true],
  ['vLLM', 'https://blog.vllm.ai/', true],
  ['Modal', 'https://modal.com/blog'],
  ['Replicate', 'https://replicate.com/blog', true],
  ['Together AI', 'https://www.together.ai/blog', true],
  ['Fireworks AI', 'https://fireworks.ai/blog', true],
  ['Groq', 'https://groq.com/blog/', true],
  ['Baseten', 'https://www.baseten.co/blog/', true],
  ['Cerebras', 'https://www.cerebras.ai/blog', true],
  ['SambaNova', 'https://sambanova.ai/blog', true],
  ['Weights & Biases', 'https://wandb.ai/fully-connected', true],
  ['Lightning AI', 'https://lightning.ai/blog/', true],
  ['H2O.ai', 'https://h2o.ai/blog/', true],
  ['Anaconda', 'https://www.anaconda.com/blog'],
  ['Dataiku', 'https://blog.dataiku.com/'],
  ['DataRobot', 'https://www.datarobot.com/blog/', true],
  ['ClearML', 'https://clear.ml/blog/', true],
  ['BentoML', 'https://www.bentoml.com/blog', true],
  ['MLflow', 'https://mlflow.org/blog', true],
  ['Neptune.ai', 'https://neptune.ai/blog', true],
  ['Evidently AI', 'https://www.evidentlyai.com/blog', true],
  ['Arize AI', 'https://arize.com/blog/', true],
  ['Pinecone', 'https://www.pinecone.io/blog/', true],
  ['Weaviate', 'https://weaviate.io/blog', true],
  ['Qdrant', 'https://qdrant.tech/blog/', true],
  ['Chroma', 'https://www.trychroma.com/blog', true],
  ['Milvus', 'https://milvus.io/blog'],
  ['Zilliz', 'https://zilliz.com/blog'],
  ['Databricks', 'https://www.databricks.com/blog'],
  ['Snowflake', 'https://www.snowflake.com/en/blog/'],
  ['Confluent', 'https://www.confluent.io/blog/'],
  ['Redis', 'https://redis.io/blog/'],
  ['GitHub', 'https://github.blog/'],
  ['GitLab', 'https://about.gitlab.com/blog/'],
  ['Docker', 'https://www.docker.com/blog/'],
  ['Kubernetes', 'https://kubernetes.io/blog/'],
  ['Cloudflare', 'https://blog.cloudflare.com/'],
  ['Vercel', 'https://vercel.com/blog'],
  ['Netlify', 'https://www.netlify.com/blog/'],
  ['Replit', 'https://blog.replit.com/', true],
  ['Cursor', 'https://cursor.com/blog', true],
  ['Windsurf', 'https://windsurf.com/blog', true],
  ['Sourcegraph', 'https://sourcegraph.com/blog'],
  ['Continue', 'https://blog.continue.dev/', true],
  ['Tabnine', 'https://www.tabnine.com/blog/', true],
];

const RESEARCH = [
  ['Google Research', 'https://research.google/blog/'],
  ['Microsoft Research', 'https://www.microsoft.com/en-us/research/blog/'],
  ['Apple Machine Learning Research', 'https://machinelearning.apple.com/'],
  ['Amazon Science', 'https://www.amazon.science/blog'],
  ['Salesforce AI Research', 'https://www.salesforce.com/blog/category/ai-research/'],
  ['Berkeley AI Research', 'https://bair.berkeley.edu/blog/'],
  ['Stanford AI Lab', 'https://ai.stanford.edu/blog/'],
  ['Stanford CRFM', 'https://crfm.stanford.edu/blog.html'],
  ['CMU Machine Learning', 'https://blog.ml.cmu.edu/'],
  ['MIT CSAIL', 'https://www.csail.mit.edu/news'],
  ['MIT AI News', 'https://news.mit.edu/topic/artificial-intelligence2'],
  ['Allen Institute for AI', 'https://allenai.org/blog'],
  ['EleutherAI', 'https://www.eleuther.ai/blog'],
  ['LAION', 'https://laion.ai/blog/'],
  ['Oxford Machine Learning', 'https://www.robots.ox.ac.uk/~parg/'],
];

const seeds = [
  ...PUBLISHERS.map(([name, url, directory]) => ({ name, publisher: name.replace(/ (AI|RSS)$/, ''), url, directory: Boolean(directory), kind: 'publisher', trustReason: 'Established technology publisher; feed discovered on its own public website.' })),
  ...OFFICIAL.map(([name, url, aiOnly]) => ({ name, publisher: name.replace(/ (AI|Generative AI|Developer|News|Big Data|Compute|Architecture|Startups|Open Source)$/, ''), url, kind: 'official', ...(aiOnly ? { aiOnly } : {}), trustReason: 'First-party company or project website; authoritative for its own announcements, not independent endorsement.' })),
  ...RESEARCH.map(([name, url]) => ({ name, publisher: name, url, kind: 'research', category: 'technical', aiOnly: /AI|Machine Learning|Berkeley|CRFM|Eleuther|LAION/.test(name), trustReason: 'First-party research organization or university laboratory website; technical claims remain attributed.' })),
];

const robotsCache = new Map();
const fetchCache = new Map();
const originQueues = new Map();
const discoveryEvidence = [];
let previousDiscoverySection = '';

function publisherIdentity(seed) {
  if (/^Google/.test(seed.name)) return 'Google';
  if (/^(?:Microsoft|Visual Studio|Windows Developer)/.test(seed.name)) return 'Microsoft';
  if (/^(?:AWS|Amazon )/.test(seed.name)) return 'Amazon';
  if (/^NVIDIA/.test(seed.name)) return 'NVIDIA';
  if (/^Meta/.test(seed.name)) return 'Meta';
  if (/^Salesforce/.test(seed.name)) return 'Salesforce';
  if (/^MIT/.test(seed.name)) return 'MIT';
  if (/^Stanford/.test(seed.name)) return 'Stanford University';
  return seed.publisher;
}

function aiOnlyEndpoint(seed, endpoint) {
  if (!seed.aiOnly || seed.name === 'Replit') return false;
  if (['Google AI', 'Microsoft AI', 'NVIDIA Generative AI', 'Oracle AI', 'Salesforce AI Research', 'MIT AI News'].includes(seed.name)) {
    // Category HTML often advertises a broader sitewide feed alongside its own.
    return /(?:^|[\/_-])(?:ai|generative-ai|machine-learning|ai-research)(?:[\/_-]|$)|artificial[-_]?intelligence/i.test(new URL(endpoint).pathname);
  }
  return true;
}

async function forOrigin(url, task) {
  const origin = new URL(url).origin;
  const previous = originQueues.get(origin) || Promise.resolve();
  let release;
  const completion = new Promise(resolveDone => { release = resolveDone; });
  originQueues.set(origin, previous.catch(() => {}).then(() => completion));
  await previous.catch(() => {});
  try { return await task(); } finally { release(); }
}

function parseRobots(body) {
  const groups = [];
  let current = { agents: [], rules: [] };
  for (const line of body.split(/\r?\n/)) {
    const match = line.replace(/#.*/, '').trim().match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase(), value = match[2].trim();
    if (key === 'user-agent') {
      if (current.rules.length) { groups.push(current); current = { agents: [], rules: [] }; }
      current.agents.push(value.toLowerCase());
    } else if (['allow', 'disallow'].includes(key) && current.agents.length && value) current.rules.push({ allow: key === 'allow', path: value });
  }
  groups.push(current);
  const specific = groups.filter(group => group.agents.some(agent => agent !== '*' && AGENT.toLowerCase().startsWith(agent)));
  return (specific.length ? specific : groups.filter(group => group.agents.includes('*'))).flatMap(group => group.rules);
}

async function robotsAllowed(url) {
  const parsed = new URL(url);
  if (!robotsCache.has(parsed.origin)) robotsCache.set(parsed.origin, (async () => {
    try {
      const response = await fetch(`${parsed.origin}/robots.txt`, { signal: AbortSignal.timeout(TIMEOUT), headers: { 'User-Agent': AGENT } });
      if (response.status === 404 || response.status === 410) return { rules: [] };
      if (!response.ok) return { error: `robots.txt unavailable (${response.status}); not bypassed` };
      return { rules: parseRobots((await response.text()).slice(0, 500_000)) };
    } catch (error) { return { error: `robots.txt unavailable (${error.name}); not bypassed` }; }
  })());
  const robots = await robotsCache.get(parsed.origin);
  if (robots.error) return robots;
  const target = parsed.pathname + parsed.search;
  const rules = robots.rules.filter(rule => {
    const escaped = rule.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$');
    try { return new RegExp(`^${escaped}`).test(target); } catch { return false; }
  }).sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return rules[0]?.allow === false ? { error: 'robots.txt disallows this path; not bypassed' } : {};
}

async function download(url) {
  if (fetchCache.has(url)) return fetchCache.get(url);
  const pending = forOrigin(url, async () => {
    const allowed = await robotsAllowed(url);
    if (allowed.error) return { status: null, finalUrl: url, error: allowed.error };
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { 'User-Agent': AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8' }, redirect: 'follow' });
      const result = { status: response.status, finalUrl: response.url, contentType: response.headers.get('content-type') || '' };
      if (!response.ok) { await response.body?.cancel(); return { ...result, error: `HTTP ${response.status}` }; }
      const html = /text\/html/i.test(result.contentType);
      if (!html && Number(response.headers.get('content-length')) > MAX_FEED_BYTES) { await response.body?.cancel(); return { ...result, error: `Response exceeds ${MAX_FEED_BYTES} bytes` }; }
      const chunks = [];
      let total = 0;
      const reader = response.body?.getReader();
      if (!reader) return { ...result, error: 'Empty response' };
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > MAX_FEED_BYTES) {
            await reader.cancel();
            const prefix = html ? Buffer.concat([...chunks, value]).subarray(0, MAX_FEED_BYTES).toString('utf8') : undefined;
            return { ...result, bytes: total, ...(prefix ? { body: prefix, truncated: true } : {}), error: `Response exceeds ${MAX_FEED_BYTES} bytes` };
          }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      return { ...result, bytes: total, body: Buffer.concat(chunks).toString('utf8') };
    } catch (error) { return { status: null, finalUrl: url, error: `${error.name}: ${error.message}` }; }
  });
  fetchCache.set(url, pending);
  return pending;
}

function attributes(tag) {
  const output = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) output[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  return output;
}

function publicUrl(value, base) {
  try {
    const url = new URL(value, base);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function looksLikeFeed(url) {
  const parsed = new URL(url);
  if (/^(?:www\.)?(?:feedly\.com|inoreader\.com|atom\.io)$/.test(parsed.hostname)) return false;
  return (/(?:\/feed(?:[/.?]|$)|\/rss(?:[/.?]|$)|\/atom(?:[/.?]|$)|\.(?:rss|atom)(?:[?#]|$)|(?:rss|atom)\.xml(?:[?#]|$))/i.test(parsed.pathname + parsed.search) || /^(?:feeds?|rss)\./i.test(parsed.hostname))
    && !/comments?|podcasts?|itunes|feedproxy|feeds\.feedburner\.com\/~|\/author\/|[?&]replytocom=/i.test(url);
}

function discoverFeeds(body, base, directory) {
  const found = new Map();
  for (const tag of body.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(tag[0]);
    const url = publicUrl(attrs.href, base);
    if (url && /alternate/i.test(attrs.rel || '') && /(?:rss|atom)/i.test(attrs.type || '') && !/comments?|podcasts?|itunes|\/author\//i.test(url)) found.set(url, { url, title: attrs.title || '', method: 'html-alternate' });
  }
  for (const anchor of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = attributes(anchor[1]);
    const url = publicUrl(attrs.href, base);
    if (!url || !looksLikeFeed(url)) continue;
    const title = plainText(anchor[2], 100);
    if (/gaming|opposable|cardboard|entertainment|culture|television|audio|cinema|cameras|health.*fitness|deals|buying guides|cars|staff blogs|phones/i.test(title)) continue;
    if (!found.has(url)) found.set(url, { url, title, method: directory ? 'publisher-rss-directory' : 'publisher-feed-link' });
  }
  return [...found.values()].slice(0, directory ? 12 : 2);
}

function candidate(seed, endpoint, extra = {}) {
  return {
    id: `tech-${createHash('sha256').update(endpoint).digest('hex').slice(0, 12)}`,
    name: seed.name,
    url: endpoint,
    siteUrl: seed.url,
    publisher: publisherIdentity(seed),
    kind: seed.kind,
    ...(seed.category ? { category: seed.category } : {}),
    ...(aiOnlyEndpoint(seed, endpoint) ? { aiOnly: true } : {}),
    trustReason: seed.trustReason,
    discoveryUrl: seed.url,
    ...extra,
  };
}

async function discover(seed) {
  const response = await download(seed.url);
  const feeds = response.body ? discoverFeeds(response.body, response.finalUrl, seed.directory) : [];
  discoveryEvidence.push({ name: seed.name, url: seed.url, status: response.status, feeds: feeds.length, error: response.error || (!feeds.length ? 'No advertised feed found on this public page' : null) });
  if (!feeds.length) return [candidate(seed, seed.url, { endpointType: 'page', discoveryMethod: 'official-page-no-advertised-feed' })];
  return feeds.map(feed => candidate(seed, feed.url, { endpointType: 'feed', discoveryMethod: feed.method, ...(feed.title && !/^RSS|^Atom|^Feed$/i.test(feed.title) ? { name: `${seed.name} — ${feed.title}` } : {}) }));
}

function entryDate(item) {
  const raw = item.pubDate ?? item.published ?? item['dc:date'] ?? item['prism:publicationDate'] ?? item.updated;
  const value = typeof raw === 'object' ? raw['#text'] : raw;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function validate(source, now) {
  const seed = seeds.find(item => item.url === source.discoveryUrl);
  if (seed) {
    source = { ...source, publisher: publisherIdentity(seed) };
    delete source.aiOnly;
    if (aiOnlyEndpoint(seed, source.url)) source.aiOnly = true;
  }
  const response = await download(source.url);
  const validation = { checkedAt: new Date().toISOString(), status: response.status, finalUrl: response.finalUrl, contentType: response.contentType || null, bytes: response.bytes || null, validFeed: false, entries: 0, latestPublication: null, freshAIcount: 0 };
  if (response.error) return { ...source, validation: { ...validation, error: response.error } };
  const body = response.body || '';
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(body)) return { ...source, validation: { ...validation, error: 'DTD/HTML response rejected; not an approved feed' } };
  if (XMLValidator.validate(body) !== true) return { ...source, validation: { ...validation, error: 'Response is not well-formed XML' } };
  try {
    const doc = parser.parse(body);
    const root = doc.rss?.channel ?? doc.feed ?? doc['rdf:RDF'] ?? doc.RDF;
    if (!root) return { ...source, validation: { ...validation, error: 'XML response is not RSS, Atom or RDF' } };
    const entries = array(doc.rss?.channel?.item ?? doc.feed?.entry ?? doc['rdf:RDF']?.item ?? doc.RDF?.item);
    const dates = entries.map(entryDate).filter(value => value !== null);
    const fresh = parseFeed(body, source, now);
    const entryUrls = entries.map(item => {
      for (const link of array(item.link)) {
        if (typeof link === 'object' && link['@_rel'] && link['@_rel'] !== 'alternate') continue;
        const href = publicUrl(typeof link === 'object' ? link['@_href'] ?? link['#text'] : link, source.url);
        if (href) return canonicalUrl(href);
      }
      return publicUrl(item['prism:url'] ?? item['@_rdf:about'], source.url);
    }).filter(Boolean).sort();
    const fingerprint = entryUrls.length ? createHash('sha256').update(entryUrls.join('\n')).digest('hex') : null;
    return { ...source, validation: { ...validation, validFeed: true, entries: entries.length, latestPublication: dates.length ? new Date(Math.max(...dates)).toISOString() : null, freshAIcount: fresh.length, feedTitle: plainText(root.title || '', 150), contentFingerprint: fingerprint } };
  } catch (error) { return { ...source, validation: { ...validation, error: `${error.name}: ${error.message}` } }; }
}

async function pool(items, fn) {
  const result = new Array(items.length);
  let cursor = 0, done = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await fn(items[index], index);
      done++;
      if (done % 20 === 0 || done === items.length) console.log(`${done}/${items.length} completed`);
    }
  }));
  return result;
}

function markdownReport(results, checkedAt) {
  const valid = results.filter(source => source.validation.validFeed);
  const withFresh = valid.filter(source => source.validation.freshAIcount > 0);
  const publisherCount = new Set(valid.map(source => source.publisher)).size;
  const aliases = valid.filter(source => source.validation.duplicateOf);
  const rows = results.map(source => `| ${source.name.replace(/\|/g, '/')} | ${source.kind} | [endpoint](${source.url}) | ${source.validation.status ?? '—'} | ${source.validation.validFeed ? 'yes' : 'no'} | ${source.validation.entries} | ${source.validation.latestPublication || '—'} | ${source.validation.freshAIcount} | ${(source.validation.error || '').replace(/\|/g, '/')} |`).join('\n');
  return `# Tech, official vendor, and research source catalog\n\nChecked ${checkedAt}. Run \`node scripts/catalog-tech.mjs\` to repeat discovery and validation, or \`node scripts/catalog-tech.mjs --skip-discovery\` to recheck the saved candidates.\n\n- ${seeds.length} publisher-owned discovery pages configured; ${discoveryEvidence.length} checked in this run.\n- ${results.length} distinct candidate feed/page endpoints GET-tested or excluded by their robots policy.\n- ${valid.length} parseable public feeds across ${publisherCount} publisher/project identities; ${results.length - valid.length} failures/pages retained as evidence. These are endpoint counts, not claims of independent editorial sources.\n- ${aliases.length} valid endpoints are marked \`validation.duplicateOf\` because they redirect to the same endpoint or currently contain the same complete article URL set within a publisher. Retain evidence but avoid activating redundant aliases; ${valid.length - aliases.length} nonredundant validated feeds remain.\n- ${withFresh.length} feeds currently yield qualifying AI articles in the strict preceding 24-hour window. AI filtering uses the app parser; \`aiOnly\` is set only for explicitly AI-focused organizations/pages and is disabled for broader sitewide feeds advertised on AI category pages. No timestamps are replaced.\n\n## Method and limits\n\nCandidates come from actual RSS/Atom alternate links or feed links on the publisher's own discovery page. No guessed feed route is accepted. A page with no advertised feed remains a failed page candidate, rather than becoming a fabricated feed. Feed validation checks HTTP response, rejects DTD/custom entities, parses RSS/Atom/RDF, counts unfiltered XML entries, and records latest publisher publication plus the app's fresh AI count. HTTP 200 alone is insufficient. Requests use an 8-second timeout, global concurrency 8, per-origin serialization, and a 2 MB response cap. Robots rules for the catalog user agent or wildcard are honored; unavailable robots responses are skipped conservatively. ZDNet was excluded after the web research tool reported a nonretryable robots block. No cookies, logins, private APIs, paywall workarounds, or generated RSS proxies were used.\n\nFirst-party feeds are authoritative for announcements about their own products; they are not independent validation of vendor claims. Broad tech feeds require article-level AI filtering. University/research feeds can be slow-moving and can have zero fresh stories even when valid. Feed aliases and overlapping category feeds should be deduplicated by canonical article URL before production use. Discovery failures may reflect transient availability or publisher HTML changes; they are not proof that the publisher has no feed anywhere.\n\n## Primary discovery references\n\n- [Ars Technica feed directory](https://arstechnica.com/rss-feeds/)\n- [WIRED feed directory](https://www.wired.com/about/rss-feeds/)\n- [TechRadar RSS guide](https://www.techradar.com/how-to/techradar-rss)\n- Every candidate retains its exact \`discoveryUrl\` and method in the JSON catalog.\n\n## Candidate results\n\n| Name | Kind | URL | HTTP | Valid feed | Entries | Latest publication UTC | Fresh AI | Error / exclusion |\n|---|---|---|---:|---|---:|---|---:|---|\n${rows}\n\n## Discovery page evidence\n\n| Page | HTTP | Feed links found | Error / note |\n|---|---:|---:|---|\n${discoveryEvidence.map(row => `| [${row.name}](${row.url}) | ${row.status ?? '—'} | ${row.feeds} | ${(row.error || '').replace(/\|/g, '/')} |`).join('\n')}\n`;
}

async function main() {
  const now = Date.now();
  try {
    const previousReport = await readFile(REPORT, 'utf8');
    const start = previousReport.indexOf('## Discovery page evidence');
    if (start !== -1) previousDiscoverySection = previousReport.slice(start);
  } catch { /* First report. */ }
  const selectedIds = process.argv.find(argument => argument.startsWith('--ids='))?.slice(6).split(',');
  let candidates;
  if (process.argv.includes('--skip-discovery') || selectedIds) candidates = JSON.parse(await readFile(OUTPUT, 'utf8'));
  else {
    console.log(`Discovering feeds from ${seeds.length} official publisher pages (concurrency ${CONCURRENCY}, timeout ${TIMEOUT} ms)`);
    const discoveries = (await pool(seeds, discover)).flat();
    // Preserve previously screened failures even when discovery HTML changes.
    let previous = [];
    try { previous = JSON.parse(await readFile(OUTPUT, 'utf8')); } catch { /* First run. */ }
    candidates = [...new Map([...previous, ...discoveries].map(source => [source.url, source])).values()];
  }
  const selected = selectedIds ? candidates.filter(source => selectedIds.includes(source.id)) : candidates;
  console.log(`Validating ${selected.length} distinct candidates`);
  const checked = await pool(selected, source => validate(source, now));
  const checkedById = new Map(checked.map(source => [source.id, source]));
  const results = candidates.map(source => checkedById.get(source.id) || source);
  const seenFinal = new Map(), seenContent = new Map();
  for (const source of results) {
    delete source.validation.duplicateOf;
    if (!source.validation.validFeed) continue;
    const final = canonicalUrl(source.validation.finalUrl);
    const content = source.validation.contentFingerprint ? `${source.publisher}:${source.validation.contentFingerprint}` : null;
    const duplicate = seenFinal.get(final) || (content ? seenContent.get(content) : null);
    if (duplicate) source.validation.duplicateOf = duplicate;
    else { seenFinal.set(final, source.id); if (content) seenContent.set(content, source.id); }
  }
  await mkdir(dirname(OUTPUT), { recursive: true });
  await mkdir(dirname(REPORT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(results, null, 2) + '\n');
  let report = markdownReport(results, new Date(now).toISOString());
  if (!discoveryEvidence.length && previousDiscoverySection) report = report.slice(0, report.indexOf('## Discovery page evidence')) + previousDiscoverySection;
  await writeFile(REPORT, report);
  console.log(JSON.stringify({ candidates: results.length, validFeeds: results.filter(source => source.validation.validFeed).length, withFreshAI: results.filter(source => source.validation.freshAIcount > 0).length, output: OUTPUT, report: REPORT }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
