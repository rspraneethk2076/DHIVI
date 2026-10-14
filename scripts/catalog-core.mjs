import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { SOURCES, fetchFeed, canonicalUrl, MAX_FEED_BYTES } from '../netlify/functions/lib/feeds.mjs';
import { runSourceChecks } from '../netlify/functions/news.mjs';
const file = new URL('../data/source-candidates-core.json', import.meta.url);
let previous;
try { previous = JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
const seeds = previous || SOURCES.map(source => ({ ...source,
  publisher: ({'google-ai':'Google','google-research':'Google','nature':'Springer Nature','mit':'Massachusetts Institute of Technology'})[source.id] || source.name,
  kind: source.id === 'nature' || source.id === 'mit' || source.id === 'google-research' ? 'research' : ['techcrunch','marktechpost'].includes(source.id) ? 'publisher' : 'official',
  contentType: source.id === 'nature' ? 'journal' : undefined,
  trustReason: source.id === 'nature' ? 'Publisher-operated digital-medicine journal feed.' : 'Original publisher-operated feed used by the Dhivi application.',
  discoveryUrl: source.siteUrl,
}));
const checkedAt = new Date().toISOString();
const checks = await runSourceChecks(seeds, async (source, signal) => {
  let metadata;
  const articles = await fetchFeed(source, { signal, timeout:8000, fetchImpl: async (...args) => {
    const response = await fetch(...args);
    metadata = {status:response.status, finalUrl:response.url};
    if(response.ok) {
      const chunks=[];let bytes=0;
      for await(const chunk of response.clone().body) {
        bytes+=chunk.length;
        if(bytes>MAX_FEED_BYTES) throw new Error('Feed too large');
        chunks.push(chunk);
      }
      const doc=new XMLParser({ignoreAttributes:false,processEntities:false,parseTagValue:false}).parse(Buffer.concat(chunks).toString('utf8'));
      const feed=doc.rss?.channel||doc.feed||doc['rdf:RDF'];
      const raw=feed?.item||feed?.entry||[];
      const entries=Array.isArray(raw)?raw:[raw];
      const urls=entries.map(item=>{
        const links=Array.isArray(item.link)?item.link:[item.link];
        const link=links.find(link=>typeof link==='string'||!link?.['@_rel']||link['@_rel']==='alternate');
        const value=typeof link==='string'?link:link?.['@_href']||item['prism:url']||item['@_rdf:about'];
        try{return canonicalUrl(new URL(value,source.url).href);}catch{return null;}
      }).filter(Boolean).sort();
      metadata.entries=entries.length;
      metadata.contentFingerprint=urls.length?createHash('sha256').update(urls.join('\n')).digest('hex'):null;
    }
    return response;
  }});
  return {...metadata, validFeed:true, freshAIcount:articles.length};
}, {concurrency:6,perHost:2,deadlineMs:25000});
const candidates = seeds.map((source,index) => {
  const {validation:prior,...metadata}=source;
  const check=checks[index];
  return {...metadata,validation:{checkedAt,...(check.status==='fulfilled'?check.value:{validFeed:false,error:check.reason?.message||'Check deferred'})}};
});
await fs.mkdir(new URL('../data/',import.meta.url),{recursive:true});
await fs.writeFile(file,JSON.stringify(candidates,null,2)+'\n');
console.log(JSON.stringify({screened:candidates.length,working:candidates.filter(source=>source.validation.validFeed).length}));
