import news from './news.mjs';
import { buildDigest } from './lib/newsletter.mjs';

export default async function handler(request, context) {
  if (request.method !== 'GET') return new Response(null,{status:405});
  const response = await news(request, context);
  if (!response.ok) return Response.json({message:'Fresh news is unavailable.'},{status:503});
  const payload = await response.json();
  // A past snapshot never becomes an email just because it can still be served.
  if (!Number.isFinite(Date.parse(payload.updatedAt)) || Date.now() - Date.parse(payload.updatedAt) > 75 * 60_000) return Response.json({message:'Fresh news is unavailable.'},{status:503});
  return Response.json(buildDigest(payload.articles),{headers:{'Cache-Control':'no-store'}});
}
