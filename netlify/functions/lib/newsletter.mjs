import { normalizeArticle, isFreshArticle, safeLink, LABELS } from '../../../src/feed-model.mjs';

export const APP_URL = 'https://dhivi-live-ai-news.netlify.app';
export const NEWSLETTER_TIMEZONE = 'America/Chicago';
export const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[A-Z0-9][A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/iu.test(value);
export const escapeHtml = value => String(value).replace(/[&<>"']/gu, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

export function selectDigest(values, now = Date.now()) {
  const seen = new Set(), publishers = new Map();
  const eligible = (Array.isArray(values) ? values : []).map(normalizeArticle).filter(article => article && isFreshArticle(article, now))
    .sort((a,b) => b.spotlight.score - a.spotlight.score || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const selected = [];
  const add = article => {
    const key = article.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (seen.has(key) || selected.some(item => item.url === article.url) || (publishers.get(article.source) || 0) >= 2) return;
    selected.push(article); seen.add(key); publishers.set(article.source, (publishers.get(article.source) || 0) + 1);
  };
  // Give each populated desk a place, then fill with strongest remaining stories.
  for (const category of ['news','technical','clinical','tools','geopolitical']) {
    const candidate = eligible.find(article => article.category === category);
    if (candidate) add(candidate);
  }
  for (const article of eligible) { if (selected.length >= 10) break; add(article); }
  return selected;
}

export function buildDigest(values, now = Date.now()) {
  const articles = selectDigest(values, now);
  const date = new Intl.DateTimeFormat('en-CA', {timeZone: NEWSLETTER_TIMEZONE, year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const subject = `Dhivi Morning Signal · ${date}`;
  const intro = 'Your morning AI briefing. Original publisher headlines and excerpts from the preceding 24 hours.';
  const text = `${subject}\n\n${intro}\n\n${articles.map(article => `${LABELS[article.category]} · ${article.source}\n${article.title}\n${article.summary}\n${article.url}`).join('\n\n')}\n\nRead Dhivi: ${APP_URL}\nUnsubscribe: {{UNSUBSCRIBE_URL}}`;
  const html = `<div style="font-family:Arial,sans-serif;background:#0b100d;color:#eef3e8;padding:30px;max-width:620px;margin:auto"><p style="color:#c3f56b;letter-spacing:2px">DHIVI / THE MORNING SIGNAL</p><h1>Your AI briefing.</h1><p>${escapeHtml(intro)}</p><p>${date} · America/Chicago</p>${articles.map(article => `<div style="border-top:1px solid #34402f;padding:20px 0"><p style="color:#c3f56b">${escapeHtml(LABELS[article.category])} · ${escapeHtml(article.source)}</p><h2 style="font-size:21px"><a style="color:#eef3e8" href="${escapeHtml(safeLink(article.url))}">${escapeHtml(article.title)}</a></h2><p style="line-height:1.6;color:#bdc7b7">${escapeHtml(article.summary)}</p><small>Published ${escapeHtml(article.publishedAt)}</small></div>`).join('')}<p><a style="color:#c3f56b" href="${APP_URL}">Open the live reader →</a></p><p style="font-size:12px;color:#bdc7b7">By sai praneeth renduchinthala · You confirmed this daily email subscription.<br/><a style="color:#c3f56b" href="{{UNSUBSCRIBE_URL}}">Unsubscribe</a></p></div>`;
  return { date, subject, html, text, articles: articles.map(({title,url,publishedAt,category,source}) => ({title,url,publishedAt,category,source})) };
}

export function createNewsletterHandler({ env = process.env, fetcher = fetch } = {}) {
  const json = (body, status = 200) => Response.json(body, {status, headers: {'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  const configured = () => /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/u.test(env.NEWSLETTER_GOOGLE_SCRIPT_URL || '') && (env.NEWSLETTER_BRIDGE_SECRET || '').length >= 32;
  async function bridge(payload) {
    const response = await fetcher(env.NEWSLETTER_GOOGLE_SCRIPT_URL, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,secret:env.NEWSLETTER_BRIDGE_SECRET}),signal:AbortSignal.timeout(20_000)});
    if (!response.ok) throw new Error('bridge-unavailable');
    const result = await response.json();
    if (!result || typeof result.ok !== 'boolean') throw new Error('bridge-invalid');
    return result;
  }
  return async (request, context) => {
    if (!['GET','POST'].includes(request.method)) return json({message:'Method not allowed.'},405);
    const preview = context?.deploy?.published === false || ['deploy-preview','branch-deploy','dev'].includes(env.CONTEXT);
    if (!configured() || preview) return json({enabled:false,message:'Email delivery is awaiting the sender connection.'},request.method === 'GET' ? 200 : 503);
    try {
      if (request.method === 'GET') {
        const state = await bridge({action:'status'});
        return json({enabled:state.ok && state.ready === true, schedule:'08:00',timezone:NEWSLETTER_TIMEZONE});
      }
      if (request.headers.get('origin') !== APP_URL && !(!context && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/u.test(request.headers.get('origin') || ''))) return json({message:'Please subscribe from the Dhivi app.'},403);
      if (!(request.headers.get('content-type') || '').startsWith('application/json')) return json({message:'Use JSON.'},415);
      const raw = await request.text();
      if (raw.length > 2048) return json({message:'Request too large.'},413);
      let body;
      try { body = JSON.parse(raw); } catch { return json({message:'Invalid request.'},400); }
      if (!body || typeof body !== 'object') return json({message:'Invalid request.'},400);
      const action = body.action;
      if (!['subscribe','confirm','unsubscribe'].includes(action)) return json({message:'Invalid action.'},400);
      if (action === 'subscribe' && (!validEmail(body.email) || body.consent !== true)) return json({message:'Enter a valid email and agree to receive the daily briefing.'},400);
      if (action !== 'subscribe' && !/^[a-f0-9]{64}$/u.test(body.token || '')) return json({message:'Invalid email link. Please request a new one.'},400);
      const result = await bridge(action === 'subscribe' ? {action,email:body.email.trim().toLowerCase()} : {action,token:body.token});
      if (!result.ok) return json({message:result.code === 'invalid-link' ? 'This email link expired or was already used. Please subscribe again.' : 'Email delivery is temporarily unavailable. Please try again later.'},result.code === 'invalid-link' ? 400 : 503);
      return json({message: action === 'subscribe' ? 'Check your inbox to confirm your subscription. You’re not subscribed until you confirm.' : action === 'confirm' ? 'You’re subscribed. Your briefing arrives around 8:00 AM America/Chicago.' : 'You’re unsubscribed from the morning briefing.'});
    } catch { return json({enabled:false,message:'Email delivery is temporarily unavailable. Please try again later.'},request.method === 'GET' ? 200 : 503); }
  };
}
