import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = 8000;
const CONCURRENCY = 8;
const USER_AGENT = 'DhiviSourceAudit/1.0 (public RSS discovery; no article scraping)';
const NOW = Date.now();
const DAY = 86400000;
const AI = /artificial intelligence|machine learning|deep learning|neural network|large language model|generative (?:ai|model)|\b(?:GPT[- ]?\d?|ChatGPT|LLMs?|OpenAI|Anthropic|DeepMind)\b|\bAI[- ](?:models?|agents?|systems?|tools?|safety|governance|policy|regulation|research|assisted|powered)\b|\b(?:responsible|trustworthy|agentic|clinical|medical|generative) AI\b/i;
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: true, parseTagValue: false, processEntities: true });
const candidates = [];
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function add(name, url, publisher, kind, category, discoveryUrl, extras = {}) {
  if (candidates.some(candidate => candidate.url === url)) return;
  candidates.push({ id: `cp-${slug(name)}`, name, url, siteUrl: extras.siteUrl || new URL(discoveryUrl).origin, publisher, kind, category, aiOnly: false,
    trustReason: kind === 'official' ? 'First-party public institution or government publication; describes its own announcements and policy.' : kind === 'research' ? 'University or research institute publishes its own research news; findings require source-level interpretation.' : 'Established scholarly, health-technology news, or policy publisher; provenance is preserved and mixed content must pass AI filtering.',
    discoveryUrl, discoveryMethod: 'publisher-published RSS route or RSS directory link', ...extras });
}

// Nature Portfolio journal homepages publish RSS links using these journal codes.
// They are discovery candidates, not assumptions of current accessibility.
const nature = [
  ['nature','Nature','news'],['nm','Nature Medicine','clinical'],['nbt','Nature Biotechnology','clinical'],['nmeth','Nature Methods','technical'],['neuro','Nature Neuroscience','clinical'],
  ['nrg','Nature Reviews Genetics','clinical'],['ng','Nature Genetics','clinical'],['nrd','Nature Reviews Drug Discovery','clinical'],['nrclinonc','Nature Reviews Clinical Oncology','clinical'],
  ['ncomms','Nature Communications','technical'],['srep','Scientific Reports','technical'],['npjdigitalmed','npj Digital Medicine','clinical'],['natmachintell','Nature Machine Intelligence','technical'],
  ['natbiomedeng','Nature Biomedical Engineering','clinical'],['natcomputsci','Nature Computational Science','technical'],['nathumbehav','Nature Human Behaviour','news'],['natmentalhealth','Nature Mental Health','clinical'],
  ['natcancer','Nature Cancer','clinical'],['npjprecisiononcology','npj Precision Oncology','clinical'],['npjgenmed','npj Genomic Medicine','clinical'],
];
for (const [code, name, category] of nature) add(name, `https://www.nature.com/${code}.rss`, 'Springer Nature', 'publisher', category, `https://www.nature.com/${code}/`, { siteUrl: `https://www.nature.com/${code}/`, aiOnly: code === 'natmachintell' });
for (const [topic, category] of [['artificial-intelligence','technical'],['machine-learning','technical'],['medical-imaging','clinical'],['biomedical-engineering','clinical'],['drug-discovery','clinical'],['computational-biology-and-bioinformatics','clinical']]) add(`Nature subject ${topic.replaceAll('-',' ')}`, `https://www.nature.com/subjects/${topic}.rss`, 'Springer Nature', 'publisher', category, `https://www.nature.com/subjects/${topic}`, { aiOnly: ['artificial-intelligence','machine-learning'].includes(topic) });

// BMJ describes Current Issue and Online First RSS on each journal RSS page.
const bmj = [
  ['bmjopen','BMJ Open'],['informatics','BMJ Health and Care Informatics'],['bmjdigitalhealth','BMJ Digital Health and AI'],['innovations','BMJ Innovations'],['gh','BMJ Global Health'],['qualitysafety','BMJ Quality and Safety'],
  ['gut','Gut'],['heart','Heart'],['jnnp','Journal of Neurology Neurosurgery and Psychiatry'],['bjo','British Journal of Ophthalmology'],['thorax','Thorax'],
  ['ard','Annals of the Rheumatic Diseases'],['adc','Archives of Disease in Childhood'],['emj','Emergency Medicine Journal'],['jcp','Journal of Clinical Pathology'],['jmg','Journal of Medical Genetics'],
  ['jme','Journal of Medical Ethics'],['jech','Journal of Epidemiology and Community Health'],['bmjopenrespres','BMJ Open Respiratory Research'],['drc','BMJ Open Diabetes Research and Care'],
  ['openheart','Open Heart'],['bmjopengastro','BMJ Open Gastroenterology'],['neurologyopen','BMJ Neurology Open'],['mentalhealth','BMJ Mental Health'],['tsaco','Trauma Surgery and Acute Care Open'],
];
for (const [sub, name] of bmj) add(name, `https://${sub}.bmj.com/rss/current.xml`, 'BMJ Group', 'publisher', 'clinical', `https://${sub}.bmj.com/pages/rss-feeds`, { siteUrl: `https://${sub}.bmj.com/` });
add('The BMJ latest articles', 'https://www.bmj.com/rss/recent.xml', 'BMJ Group', 'publisher', 'clinical', 'https://www.bmj.com/about-bmj/resources-readers');

// Exact ids from https://jamanetwork.com/pages/rss/ (not guessed journal ids).
const jama = [
  ['JAMA',3,67],['JAMA Cardiology',192,184],['JAMA Dermatology',12,68],['JAMA Internal Medicine',15,71],['JAMA Neurology',16,72],['JAMA Oncology',159,174],
  ['JAMA Ophthalmology',17,73],['JAMA Otolaryngology Head and Neck Surgery',18,74],['JAMA Pediatrics',19,75],['JAMA Psychiatry',14,70],['JAMA Surgery',20,76],
];
for (const [name, site, journal] of jama) {
  add(`${name} Online First`, `https://jamanetwork.com/rss/site_${site}/onlineFirst_${journal}.xml`, 'American Medical Association', 'publisher', 'clinical', 'https://jamanetwork.com/pages/rss/');
  add(`${name} Current Issue`, `https://jamanetwork.com/rss/site_${site}/${journal}.xml`, 'American Medical Association', 'publisher', 'clinical', 'https://jamanetwork.com/pages/rss/');
}
add('JAMA Network Open', 'https://jamanetwork.com/rss/site_214/187.xml', 'American Medical Association', 'publisher', 'clinical', 'https://jamanetwork.com/pages/rss/');
add('JAMA Health Forum', 'https://jamanetwork.com/rss/site_193/185.xml', 'American Medical Association', 'publisher', 'geopolitical', 'https://jamanetwork.com/pages/rss/');

const plos = [['plosone','PLOS One','technical'],['plosmedicine','PLOS Medicine','clinical'],['ploscompbiol','PLOS Computational Biology','clinical'],['plosbiology','PLOS Biology','clinical'],['plosgenetics','PLOS Genetics','clinical'],['digitalhealth','PLOS Digital Health','clinical'],['globalpublichealth','PLOS Global Public Health','clinical']];
for (const [code,name,category] of plos) add(name, `https://journals.plos.org/${code}/feed/atom`, 'PLOS', 'publisher', category, `https://journals.plos.org/${code}/`, { siteUrl: `https://journals.plos.org/${code}/`, discoveryMethod: 'PLOS journal homepage RSS; documented by PLOS find-and-read-articles guidance' });

const jmir = [['www','Journal of Medical Internet Research'],['ai','JMIR AI'],['medinform','JMIR Medical Informatics'],['mhealth','JMIR mHealth and uHealth'],['humanfactors','JMIR Human Factors'],['mental','JMIR Mental Health'],['formative','JMIR Formative Research'],['cancer','JMIR Cancer'],['aging','JMIR Aging'],['publichealth','JMIR Public Health and Surveillance']];
for (const [sub,name] of jmir) add(name, `https://${sub}.jmir.org/feed/atom`, 'JMIR Publications', 'publisher', 'clinical', `https://${sub}.jmir.org/`, { siteUrl:`https://${sub}.jmir.org/`, aiOnly: sub === 'ai' });

for (const [name,path,category] of [
  ['NIST News','news-events/news/rss.xml','geopolitical'],['NIST Health','news-events/health/rss.xml','clinical'],['NIST Information Technology','news-events/information%20technology/rss.xml','geopolitical'],
  ['NIST Cybersecurity','news-events/cybersecurity/rss.xml','geopolitical'],['NIST Standards','news-events/standards/rss.xml','geopolitical'],['NIST Cybersecurity Insights','blogs/cybersecurity-insights/rss.xml','geopolitical'],
]) add(name, `https://www.nist.gov/${path}`, 'US National Institute of Standards and Technology', 'official', category, 'https://www.nist.gov/coo/nist-rss-feeds');
for (const [org,name] of [
  ['department-for-science-innovation-and-technology','UK Department for Science Innovation and Technology'],['competition-and-markets-authority','UK Competition and Markets Authority'],
  ['medicines-and-healthcare-products-regulatory-agency','UK Medicines and Healthcare products Regulatory Agency'],['department-of-health-and-social-care','UK Department of Health and Social Care'],
  ['foreign-commonwealth-development-office','UK Foreign Commonwealth and Development Office'],['department-for-business-and-trade','UK Department for Business and Trade'],
]) add(name, `https://www.gov.uk/government/organisations/${org}.atom`, 'UK Government', 'official', org.includes('health') || org.includes('medicines') ? 'clinical' : 'geopolitical', `https://www.gov.uk/government/organisations/${org}`, { discoveryMethod: 'GOV.UK organization published Atom link' });

const explicit = [
  ['FDA Press Releases','https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml','US Food and Drug Administration','official','clinical','https://www.fda.gov/about-fda/contact-fda/subscribe-podcasts-and-news-feeds'],
  ['FDA MedWatch Medical Product Safety','https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml','US Food and Drug Administration','official','clinical','https://www.fda.gov/about-fda/contact-fda/subscribe-podcasts-and-news-feeds'],
  ['NIH Technology Transfer','https://techtransfer.nih.gov/rss','US National Institutes of Health','official','clinical','https://www.techtransfer.nih.gov/nih-ott-open-data-initiative'],
  ['Healthcare IT News','https://www.healthcareitnews.com/home/feed','HIMSS Media','publisher','clinical','https://www.healthcareitnews.com/'],
  ['MobiHealthNews','https://www.mobihealthnews.com/home/feed','HIMSS Media','publisher','clinical','https://www.mobihealthnews.com/'],
  ['Healthcare Dive','https://www.healthcaredive.com/feeds/news/','Informa TechTarget','publisher','clinical','https://www.healthcaredive.com/'],
  ['MedTech Dive','https://www.medtechdive.com/feeds/news/','Informa TechTarget','publisher','clinical','https://www.medtechdive.com/'],
  ['Fierce Healthcare','https://www.fiercehealthcare.com/rss/xml','Questex','publisher','clinical','https://www.fiercehealthcare.com/fiercehealthcarecom/rss-feeds'],
  ['MedCity News','https://medcitynews.com/feed/','MedCity News','publisher','clinical','https://medcitynews.com/'],
  ['STAT Health and Medicine','https://www.statnews.com/feed/','STAT News','publisher','clinical','https://www.statnews.com/'],
  ['STAT Artificial Intelligence','https://www.statnews.com/tag/artificial-intelligence/feed/','STAT News','publisher','clinical','https://www.statnews.com/tag/artificial-intelligence/'],
  ['HIT Consultant','https://hitconsultant.net/feed/','HIT Consultant Media','publisher','clinical','https://hitconsultant.net/'],
  ['HealthTech Magazine','https://healthtechmagazine.net/rss.xml','CDW HealthTech','publisher','clinical','https://healthtechmagazine.net/'],
  ['NIH News Releases','https://www.nih.gov/news-events/news-releases/rss.xml','US National Institutes of Health','official','clinical','https://www.nih.gov/news-events/rss-feeds'],
  ['NIH Directors Blog','https://directorsblog.nih.gov/feed/','US National Institutes of Health','official','clinical','https://directorsblog.nih.gov/'],
  ['ASTP ONC Health IT Buzz','https://www.healthit.gov/buzz-blog/feed/','US Department of Health and Human Services','official','clinical','https://www.healthit.gov/buzz-blog/'],
  ['FTC Press Releases','https://www.ftc.gov/feeds/press-release.xml','US Federal Trade Commission','official','geopolitical','https://www.ftc.gov/news-events/stay-connected'],
  ['WHO News','https://www.who.int/rss-feeds/news-english.xml','World Health Organization','official','clinical','https://www.who.int/rss-feeds'],
  ['UN News','https://news.un.org/feed/subscribe/en/news/all/rss.xml','United Nations','official','geopolitical','https://news.un.org/en/rss'],
  ['European Parliament Top Stories','https://www.europarl.europa.eu/rss/doc/top-stories/en.xml','European Parliament','official','geopolitical','https://www.europarl.europa.eu/news/en/rss'],
  ['European Parliament Press Room','https://www.europarl.europa.eu/rss/doc/press-releases/en.xml','European Parliament','official','geopolitical','https://www.europarl.europa.eu/news/en/rss'],
  ['Brookings','https://www.brookings.edu/feed/','Brookings Institution','publisher','geopolitical','https://www.brookings.edu/'],
  ['Georgetown CSET','https://cset.georgetown.edu/feed/','Georgetown University Center for Security and Emerging Technology','research','geopolitical','https://cset.georgetown.edu/'],
  ['Lawfare','https://www.lawfaremedia.org/feed','Lawfare Institute','publisher','geopolitical','https://www.lawfaremedia.org/'],
  ['MIT Research News','https://news.mit.edu/rss/research','Massachusetts Institute of Technology','research','technical','https://news.mit.edu/rss'],
  ['MIT Health Sciences and Technology','https://news.mit.edu/rss/topic/health-sciences-and-technology','Massachusetts Institute of Technology','research','clinical','https://news.mit.edu/rss'],
  ['MIT Neuroscience','https://news.mit.edu/rss/topic/neuroscience-neurology-and-cognitive-sciences','Massachusetts Institute of Technology','research','clinical','https://news.mit.edu/rss'],
  ['MIT Robotics','https://news.mit.edu/topic/mitrobotics-rss.xml','Massachusetts Institute of Technology','research','technical','https://news.mit.edu/rss'],
  ['MIT Artificial Intelligence','https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml','Massachusetts Institute of Technology','research','technical','https://news.mit.edu/rss'],
  ['MIT Political Science','https://news.mit.edu/rss/topic/political-science','Massachusetts Institute of Technology','research','geopolitical','https://news.mit.edu/rss'],
  ['Berkeley AI Research Blog','https://bair.berkeley.edu/blog/feed.xml','University of California Berkeley','research','technical','https://bair.berkeley.edu/blog/'],
  ['Carnegie Mellon Machine Learning Blog','https://blog.ml.cmu.edu/feed/','Carnegie Mellon University','research','technical','https://blog.ml.cmu.edu/'],
  ['Stanford Medicine Scope','https://scopeblog.stanford.edu/feed/','Stanford University','research','clinical','https://scopeblog.stanford.edu/'],
  ['Harvard Gazette Science and Technology','https://news.harvard.edu/gazette/section/science-technology/feed/','Harvard University','research','technical','https://news.harvard.edu/gazette/section/science-technology/'],
  ['Cambridge Research News','https://www.cam.ac.uk/news-feed-generator.rss','University of Cambridge','research','technical','https://www.cam.ac.uk/news-feed-generator'],
  ['Oxford News','https://www.ox.ac.uk/news-listing/feed','University of Oxford','research','technical','https://www.ox.ac.uk/news'],
  ['UCL News','https://www.ucl.ac.uk/news/news.xml','University College London','research','technical','https://www.ucl.ac.uk/news'],
];
for (const entry of explicit) add(...entry, { aiOnly: ['MIT Artificial Intelligence','Berkeley AI Research Blog','Carnegie Mellon Machine Learning Blog'].includes(entry[0]) });

// Independently verified supplements: each URL is explicitly linked on the
// publisher homepage or RSS directory. Keep this list reproducible on re-audit.
const supplements = [
  ['Tech Policy Press','https://techpolicy.press/rss/feed.xml','Tech Policy Press','geopolitical','https://www.techpolicy.press/'],
  ['Access Now','https://www.accessnow.org/feed/','Access Now','geopolitical','https://www.accessnow.org/'],
  ['Center for Data Innovation','https://datainnovation.org/feed/','Information Technology and Innovation Foundation','geopolitical','https://datainnovation.org/'],
  ['MedTech Intelligence','https://www.medtechintelligence.com/feed/','Innovative Publishing','clinical','https://medtechintelligence.com/'],
  ['Healthcare Innovation','https://www.hcinnovationgroup.com/__rss/website-scheduled-content.xml?input=%7B%22sectionAlias%22%3A%22home%22%7D','Endeavor B2B','clinical','https://www.hcinnovationgroup.com/'],
  ['EFF Deeplinks','https://www.eff.org/rss/updates.xml','Electronic Frontier Foundation','geopolitical','https://www.eff.org/rss'],
  ['War on the Rocks','https://warontherocks.com/feed/','War on the Rocks','geopolitical','https://warontherocks.com/'],
  ['Just Security','https://www.justsecurity.org/feed/','Just Security','geopolitical','https://www.justsecurity.org/'],
  ['StateScoop','https://statescoop.com/feed/','Scoop News Group','geopolitical','https://statescoop.com/'],
  ['Government Technology','https://www.govtech.com/index.rss','e.Republic','geopolitical','https://www.govtech.com/'],
  ['Nextgov FCW','https://www.nextgov.com/rss/all/','GovExec','geopolitical','https://www.nextgov.com/'],
  ['FedScoop','https://fedscoop.com/feed/','Scoop News Group','geopolitical','https://fedscoop.com/'],
  ['Atlantic Council','https://www.atlanticcouncil.org/feed/','Atlantic Council','geopolitical','https://www.atlanticcouncil.org/'],
  ['Science Media Centre','https://www.sciencemediacentre.org/feed/','Science Media Centre','news','https://www.sciencemediacentre.org/'],
  ['European Medical Journal','https://www.emjreviews.com/feed/','EMJ','clinical','https://www.emjreviews.com/'],
];
for (const [name,url,publisher,category,discoveryUrl] of supplements) {
  add(name,url,publisher,'publisher',category,discoveryUrl, {
    aiOnly: false, supplemental: true, contentType: name === 'European Medical Journal' ? 'mixed' : 'news',
    discoveryMethod: 'Official publisher homepage or RSS directory explicitly links this feed',
    trustReason: name === 'Science Media Centre'
      ? 'Established UK science communication institution publishing attributed expert reactions; mixed topics require AI filtering.'
      : category === 'clinical'
        ? 'Established health technology or medical publisher; mixed topics require AI filtering and publisher statements remain attributed.'
        : 'Established technology-policy, digital-rights or international-affairs publisher; analysis and advocacy positions remain attributed and mixed topics require AI filtering.',
  });
}

// These pages are discovery only: no guessed URL is saved if no RSS link exists.
const discoveryPages = [
  ['European Digital Strategy','https://digital-strategy.ec.europa.eu/en/news','European Commission','official','geopolitical'],
  ['Council of the European Union','https://www.consilium.europa.eu/en/press/press-releases/','Council of the European Union','official','geopolitical'],
  ['European Data Protection Supervisor','https://www.edps.europa.eu/press-publications/press-news_en','European Data Protection Supervisor','official','geopolitical'],
  ['US National Science Foundation','https://www.nsf.gov/news/','US National Science Foundation','official','technical'],
  ['CSIS Analysis','https://www.csis.org/analysis','Center for Strategic and International Studies','publisher','geopolitical'],
  ['RAND Artificial Intelligence','https://www.rand.org/topics/artificial-intelligence.html','RAND Corporation','research','geopolitical'],
  ['Yale News','https://news.yale.edu/','Yale University','research','technical'],
  ['University of Pennsylvania AI','https://ai.upenn.edu/news/','University of Pennsylvania','research','technical'],
  ['Johns Hopkins Hub','https://hub.jhu.edu/','Johns Hopkins University','research','clinical'],
  ['UC Berkeley News','https://news.berkeley.edu/','University of California Berkeley','research','technical'],
  ['UC San Diego Today','https://today.ucsd.edu/','University of California San Diego','research','technical'],
  ['Imperial College News','https://www.imperial.ac.uk/news/','Imperial College London','research','clinical'],
  ['ETH Zurich News','https://ethz.ch/en/news-and-events/eth-news.html','ETH Zurich','research','technical'],
  ['EPFL News','https://actu.epfl.ch/','Ecole Polytechnique Federale de Lausanne','research','technical'],
  ['University of Toronto News','https://www.utoronto.ca/news','University of Toronto','research','technical'],
];

const pageCache = new Map();
const robotsCache = new Map();
async function responseText(response) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  let size = 0;
  const pieces = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2000000) { await reader.cancel(); throw new Error('response exceeds 2 MB audit limit'); }
    pieces.push(value);
  }
  return Buffer.concat(pieces).toString('utf8');
}
async function request(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow', headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.5, text/plain;q=0.4' } });
  return { status: response.status, finalUrl: response.url, contentType: response.headers.get('content-type') || '', text: await responseText(response) };
}
function robotsDecision(text, pathname) {
  const groups = [];
  let agents = [], rules = [];
  const save = () => { if (agents.length) groups.push({ agents, rules }); agents = []; rules = []; };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase(), value = match[2].trim();
    if (key === 'user-agent') { if (rules.length) save(); agents.push(value.toLowerCase()); }
    else if ((key === 'allow' || key === 'disallow') && agents.length && value) rules.push({ allow: key === 'allow', path: value });
  }
  save();
  const named = groups.filter(group => group.agents.some(agent => agent !== '*' && USER_AGENT.toLowerCase().includes(agent)));
  const selected = named.length ? named : groups.filter(group => group.agents.includes('*'));
  const matching = selected.flatMap(group => group.rules).filter(rule => {
    const pattern = rule.path.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\$$/, '$');
    try { return new RegExp(`^${pattern}`).test(pathname); } catch { return pathname.startsWith(rule.path); }
  }).sort((a,b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return matching[0] ? { allowed: matching[0].allow, matchingRule: matching[0].path } : { allowed: true, matchingRule: null };
}
async function robotsFor(url) {
  const parsed = new URL(url);
  if (!robotsCache.has(parsed.origin)) robotsCache.set(parsed.origin, request(`${parsed.origin}/robots.txt`).catch(error => ({ status: null, text: '', error: error.message })));
  const robots = await robotsCache.get(parsed.origin);
  return { status: robots.status, error: robots.error || null, ...robotsDecision(robots.status === 200 ? robots.text : '', parsed.pathname + parsed.search) };
}
async function getPage(url) {
  if (!pageCache.has(url)) pageCache.set(url, (async () => {
    const robots = await robotsFor(url);
    if (!robots.allowed) return { status: null, error: `robots disallows ${robots.matchingRule}`, text: '' };
    try { return await request(url); } catch (error) { return { status: null, error: error.message, text: '' }; }
  })());
  return pageCache.get(url);
}
function feedLinks(text, base) {
  const found = [];
  for (const tag of text.match(/<(?:link|a)\b[^>]*>/gi) || []) {
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1]?.replaceAll('&amp;', '&');
    if (!href || /comments|podcast|itunes|\.opml|rss-feeds|\/rss\.html|\/utils\/rss/i.test(href)) continue;
    if (!/(?:rss|atom|feed)(?:\b|\/|\.)|type\s*=\s*["']application\/(?:rss|atom)\+xml/i.test(tag)) continue;
    try { const url = new URL(href, base); if (['https:','http:'].includes(url.protocol) && !/\/rss\/?$/.test(url.pathname)) found.push(url.href); } catch {}
  }
  return [...new Set(found)];
}
async function pool(values, task) {
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, values.length) }, async () => {
    while (cursor < values.length) { const index = cursor++; results[index] = await task(values[index], index); }
  }));
  return results;
}
const asArray = value => value == null ? [] : Array.isArray(value) ? value : [value];
function textOf(value) { if (typeof value === 'string') return value; if (typeof value === 'object' && value) return textOf(value['#text'] ?? value['__cdata'] ?? ''); return ''; }
function dateOf(entry) { for (const key of ['pubDate','published','dc:date','date','updated']) { const value = Date.parse(textOf(entry[key])); if (Number.isFinite(value)) return value; } return null; }
function entriesOf(xml) {
  if (XMLValidator.validate(xml) !== true) throw new Error('response is not well-formed XML');
  const parsed = parser.parse(xml);
  if (parsed.rss?.channel) return { format: 'rss', title: textOf(parsed.rss.channel.title), entries: asArray(parsed.rss.channel.item) };
  if (parsed.feed) return { format: 'atom', title: textOf(parsed.feed.title), entries: asArray(parsed.feed.entry) };
  if (parsed['rdf:RDF'] || parsed.RDF) { const root = parsed['rdf:RDF'] || parsed.RDF; return { format: 'rdf', title: textOf(root.channel?.title), entries: asArray(root.item) }; }
  throw new Error('XML root is not RSS, Atom, or RDF');
}
async function audit(candidate, index) {
  const started = Date.now();
  const result = { checkedAt: new Date().toISOString(), httpStatus: null, finalUrl: candidate.url, contentType: '', robots: null, format: null, feedTitle: null, parseableEntries: 0, aiCount: 0, freshAICount: 0, latestPublication: null, errors: [] };
  try {
    result.robots = await robotsFor(candidate.url);
    if (!result.robots.allowed) throw new Error(`robots disallows ${result.robots.matchingRule}; feed not requested`);
    const response = await request(candidate.url);
    result.httpStatus = response.status; result.finalUrl = response.finalUrl; result.contentType = response.contentType;
    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
    const feed = entriesOf(response.text);
    result.format = feed.format; result.feedTitle = feed.title;
    const entries = feed.entries.filter(entry => entry && textOf(entry.title).trim());
    result.parseableEntries = entries.length;
    if (!entries.length) throw new Error('feed contains no titled entries');
    const dates = entries.map(dateOf).filter(value => value !== null);
    result.latestPublication = dates.length ? new Date(Math.max(...dates)).toISOString() : null;
    const aiEntries = entries.filter(entry => candidate.aiOnly || AI.test([entry.title,entry.description,entry.summary,entry['content:encoded'],entry.content].map(textOf).join(' ')));
    result.aiCount = aiEntries.length;
    result.freshAICount = aiEntries.filter(entry => { const published = dateOf(entry); return published !== null && published <= NOW && published >= NOW - DAY; }).length;
  } catch (error) { result.errors.push(error.name === 'TimeoutError' || error.name === 'AbortError' ? '8 second request timeout' : error.message); }
  const discovery = await getPage(candidate.discoveryUrl);
  result.discoveryHttpStatus = discovery.status;
  result.discoveryError = discovery.error || null;
  result.feedLinkedOnDiscoveryPage = feedLinks(discovery.text, candidate.discoveryUrl).some(url => url === candidate.url || url === result.finalUrl);
  result.durationMs = Date.now() - started;
  if ((index + 1) % 10 === 0) console.log(`Clinical/policy audit ${index + 1}/${candidates.length}`);
  return { ...candidate, requiresAIFilter: !candidate.aiOnly, enabled: result.errors.length === 0, validation: result };
}

async function main() {
  const inspectIndex = process.argv.indexOf('--inspect');
  if (inspectIndex >= 0) { const url = process.argv[inspectIndex + 1]; const page = await getPage(url); console.log(JSON.stringify({ url, status:page.status, error:page.error, links:feedLinks(page.text,url) },null,2)); return; }
  if (process.argv.includes('--list')) { console.log(JSON.stringify({ seeds: candidates.length, discoveryPages: discoveryPages.length, candidates }, null, 2)); return; }
  const discoveryResults = await pool(discoveryPages, async ([name,url,publisher,kind,category]) => {
    const page = await getPage(url);
    const links = feedLinks(page.text,url).filter(link => !/feedburner|facebook|youtube|twitter|events|jobs|calendar/i.test(link)).slice(0,2);
    for (const [i,link] of links.entries()) add(`${name}${i ? ' alternate' : ''}`, link, publisher, kind, category, url, { siteUrl: url, discoveryMethod: 'RSS or Atom link extracted from official HTML' });
    return { name, url, httpStatus: page.status, links, error: page.error || (page.status >= 400 ? `HTTP ${page.status}` : null) };
  });
  console.log(`Testing ${candidates.length} distinct clinical/policy/research feed candidates (concurrency ${CONCURRENCY}, timeout ${TIMEOUT_MS}ms)`);
  const audited = await pool(candidates,audit);
  const summary = { tested: audited.length, enabled: audited.filter(value => value.enabled).length, disabled: audited.filter(value => !value.enabled).length, withAIEntries: audited.filter(value => value.validation.aiCount > 0).length, withFreshAI: audited.filter(value => value.validation.freshAICount > 0).length, totalFreshAIEntriesBeforeDeduplication: audited.reduce((sum,value) => sum + value.validation.freshAICount,0), distinctPublishers: new Set(audited.map(value => value.publisher)).size, distinctFeedHosts: new Set(audited.map(value => new URL(value.url).hostname)).size };
  const output = { generatedAt: new Date().toISOString(), scope: 'Clinical journals, public institutions, AI governance/geopolitics, university research news; independent discovery candidates rather than deployment claims.', validation: { timeoutMs: TIMEOUT_MS, concurrency: CONCURRENCY, freshnessHours: 24, freshnessReference: new Date(NOW).toISOString(), maxResponseBytes: 2000000, aiDetection: 'Conservative title/excerpt keyword screen, not an AI classifier or clinical quality judgment.', robotsPolicy: 'robots.txt checked by origin; matching disallows respected; missing/unavailable robots recorded; access failures never bypassed.' }, summary, discoveryResults, candidates: audited };
  await mkdir(resolve(ROOT,'data'),{recursive:true}); await mkdir(resolve(ROOT,'docs'),{recursive:true});
  await writeFile(resolve(ROOT,'data/source-candidates-clinical-policy.json'), JSON.stringify(output,null,2)+'\n');
  const rows = audited.map(value => `| ${value.name.replaceAll('|','/')} | ${value.enabled ? 'Feed parsed' : 'Disabled'} | ${value.validation.httpStatus ?? '—'} | ${value.validation.parseableEntries} | ${value.validation.aiCount} | ${value.validation.freshAICount} | ${value.validation.latestPublication || '—'} | ${value.validation.errors.join('; ') || '—'} |`);
  const report = `# Clinical, policy and university source research\n\nGenerated ${output.generatedAt}.\n\n${summary.tested} distinct endpoints tested: ${summary.enabled} returned a usable titled RSS/Atom/RDF feed; ${summary.disabled} retained disabled with failure evidence. ${summary.withAIEntries} feeds contained an AI keyword match and ${summary.withFreshAI} contained one within the strict preceding 24 hours. This is a source-health inventory, not a claim that every feed has fresh AI news. Mixed feeds require AI filtering; journal studies are not medical advice. No preprint servers are included.\n\n## Discovery and trust\n\nOfficial publisher directories and journal homepages are the discovery authority. [JAMA's RSS directory](https://jamanetwork.com/pages/rss/) supplies exact journal ids and both Current Issue and Online First routes. [BMJ's reader guidance](https://www.bmj.com/about-bmj/resources-readers) and [BMJ's feed documentation](https://stg-blogs.bmj.com/bmj-journals-development-blog/category/rss-feeds/) describe journal RSS pages, feed types and their [published OPML](https://group.bmj.com/group/subscriptions-and-sales/institutional-support-services/bmjrssfeeds.opml). [Nature Medicine's RSS guidance](https://www.nature.com/nm/web-feeds) and journal homepages expose current publisher feed routes. [PLOS's official reading guidance](https://journals.plos.org/plosone/s/find-and-read-articles) documents journal-homepage RSS discovery. [NIST's official directory](https://www.nist.gov/coo/nist-rss-feeds) and [MIT's official directory](https://news.mit.edu/rss) supply topic-specific links. GOV.UK organization pages publish Atom routes. Additional institutions were checked through their published RSS routes and official HTML; discovery-page linkage is recorded independently for every candidate. Each candidate records its discoveryUrl, publisher, kind and trustReason.\n\nCurrent Issue feeds can reissue previously online articles with a new issue or ingestion date. The separate data/source-quality-overrides.json disables 11 JAMA Current Issue and 14 issue-batched BMJ feeds because those timestamps do not establish original publication; raw screening results remain unchanged. Online First and continuous-publication feeds are retained with canonical article deduplication. Subject feeds may overlap journal feeds. Publisher identity is not a guarantee of an individual study's quality. Government and policy feeds are first-party statements and may convey institutional positions.\n\n## Method and limits\n\nThe reproducible command is node scripts/catalog-clinical-policy.mjs. It performs public GET requests with an honest audit user agent, at most eight workers, an eight-second timeout per request and a two-megabyte body limit. It checks robots directives, respects matching Disallow rules, and does not log in, evade blocks or scrape subscriber articles. HTTP status, content type, redirects, XML validity, titled entries, publication timestamps, AI keyword matches and strict 24-hour AI counts are retained in the JSON. Future and missing dates do not qualify as fresh. The keyword screen is deliberately conservative and differs from final editorial filtering. The audit measures this execution host and time; an HTTP failure can be temporary or environment-specific.\n\nAn enabled candidate means its feed parsed at audit time. It does not mean it was deployed, polled in production, or contained fresh AI stories. Failed endpoints are not silently replaced. Official discovery-page linkage is recorded separately; an inaccessible directory is not treated as proof that a documented feed route has disappeared. Re-test before activation and poll feeds with a staggered cached backend, not all on every client refresh.\n\n## Results\n\n| Feed | Audit outcome | HTTP | Titled entries | AI matches | Fresh AI (24h) | Latest publication | Error |\n|---|---|---:|---:|---:|---:|---|---|\n${rows.join('\n')}\n\n## Discovery pages without a selected feed\n\n${discoveryResults.filter(value => !value.links.length).map(value => `- [${value.name}](${value.url}): ${value.error || 'No eligible public RSS/Atom link found; no URL invented.'}`).join('\n')}\n`;
  await writeFile(resolve(ROOT,'docs/source-research-clinical-policy.md'), report);
  console.log(JSON.stringify(summary,null,2));
}
await main();
