export const REFRESH_INTERVAL = 3_600_000;
export const NEWS_WINDOW = 24 * 60 * 60 * 1000;
export const CREATOR_URL = "https://www.youtube.com/@vaibhavsisinty";
export const CATEGORIES = [
  "news",
  "technical",
  "clinical",
  "tools",
  "geopolitical",
];
export const LABELS = {
  all: "All AI news",
  news: "AI news",
  technical: "Technical",
  clinical: "AI clinical",
  tools: "New AI tools",
  geopolitical: "AI geopolitical",
  saved: "Saved for later",
};

export function isFreshArticle(article, now = Date.now()) {
  const timestamp = Date.parse(article.publishedAt);
  return (
    Number.isFinite(timestamp) &&
    timestamp <= now &&
    timestamp >= now - NEWS_WINDOW
  );
}

export function safeLink(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export function normalizeArticle(article) {
  if (
    !article ||
    typeof article.title !== "string" ||
    !article.title.trim() ||
    !safeLink(article.url) ||
    typeof article.publishedAt !== "string"
  )
    return null;
  const timestamp = Date.parse(article.publishedAt);
  if (!Number.isFinite(timestamp)) return null;
  const category = CATEGORIES.includes(article.category)
    ? article.category
    : "news";
  return {
    id: (typeof article.id === "string" && article.id
      ? article.id
      : article.url
    ).slice(0, 1000),
    title: article.title.slice(0, 400),
    summary: (typeof article.summary === "string" ? article.summary : "").slice(
      0,
      1200,
    ),
    url: safeLink(article.url),
    image: safeLink(article.image) || `/images/${category}.svg`,
    source: (typeof article.source === "string" && article.source
      ? article.source
      : new URL(article.url).hostname
    ).slice(0, 120),
    publishedAt: new Date(timestamp).toISOString(),
    category,
    sourceKind: ["publisher","official","research"].includes(article.sourceKind) ? article.sourceKind : "publisher",
    contentType: article.contentType === "journal" ? "journal" : null,
    tags: Array.isArray(article.tags)
      ? article.tags.filter((t) => typeof t === "string").slice(0, 10)
      : [],
    hasPublisherImage: Boolean(safeLink(article.image)),
    spotlight: {
      score:
        typeof article.spotlight?.score === "number" &&
        Number.isFinite(article.spotlight.score)
          ? Math.max(0, Math.min(200, article.spotlight.score))
          : 0,
      reasons: Array.isArray(article.spotlight?.reasons)
        ? article.spotlight.reasons
            .filter((reason) => typeof reason === "string")
            .slice(0, 4)
            .map((reason) => reason.slice(0, 120))
        : [],
      corroboration: {
        sourceCount:
          typeof article.spotlight?.corroboration?.sourceCount === "number"
            ? Math.max(
                1,
                Math.min(
                  100,
                  Math.floor(article.spotlight.corroboration.sourceCount) || 1,
                ),
              )
            : 1,
        sources: Array.isArray(article.spotlight?.corroboration?.sources)
          ? article.spotlight.corroboration.sources
              .filter((source) => typeof source === "string")
              .slice(0, 8)
              .map((source) => source.slice(0, 120))
          : [],
      },
    },
  };
}

export function normalizeCachedFeed(value, now = Date.now()) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(0, 400).map(normalizeArticle).filter(article => {
    if (!article || !isFreshArticle(article, now) || seen.has(article.id)) return false;
    seen.add(article.id);
    return true;
  });
}

export function normalizeCreatorSignal(signal) {
  if (
    !signal ||
    typeof signal.title !== "string" ||
    !signal.title.trim() ||
    typeof signal.publishedAt !== "string"
  )
    return null;
  const url = safeLink(signal.url);
  const timestamp = Date.parse(signal.publishedAt);
  if (!url || !Number.isFinite(timestamp)) return null;
  const hostname = new URL(url).hostname;
  if (!["youtube.com", "www.youtube.com", "youtu.be"].includes(hostname))
    return null;
  return {
    id: typeof signal.id === "string" ? signal.id.slice(0, 100) : url,
    title: signal.title.slice(0, 300),
    url,
    image: safeLink(signal.image),
    publishedAt: new Date(timestamp).toISOString(),
    creator: "Vaibhav Sisinty",
  };
}

export function normalizeCuratorDispatch(dispatch) {
  if (
    !dispatch ||
    typeof dispatch.title !== "string" ||
    !dispatch.title.trim() ||
    typeof dispatch.publishedAt !== "string"
  )
    return null;
  const url = safeLink(dispatch.url);
  if (!url || !Number.isFinite(Date.parse(dispatch.publishedAt))) return null;
  const parsed = new URL(url);
  if (
    parsed.hostname !== "www.stayingahead.ai" ||
    !parsed.pathname.startsWith("/daily-ai-updates/")
  )
    return null;
  return {
    title: dispatch.title.slice(0, 200),
    url,
    publishedAt: new Date(dispatch.publishedAt).toISOString(),
  };
}

export function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(`dhivi:${key}`)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(`dhivi:${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function filterArticles(
  articles,
  {
    category = "all",
    query = "",
    mode = "spotlight",
    interests = {},
    now = Date.now(),
    readIds = [],
  } = {},
) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const readSet =
    readIds instanceof Set
      ? readIds
      : new Set(Array.isArray(readIds) ? readIds : []);
  const filtered = articles.filter(
    (a) =>
      (category === "saved" || !readSet.has(a.id)) &&
      (category === "saved"
        ? Date.parse(a.publishedAt) <= now
        : isFreshArticle(a, now)) &&
      (category === "all" || category === "saved" || a.category === category) &&
      words.every((word) =>
        `${a.title} ${a.summary} ${a.source} ${a.tags.join(" ")}`
          .toLowerCase()
          .includes(word),
      ),
  );
  const score = (a) => {
    const hours = Math.max(0, (now - Date.parse(a.publishedAt)) / 3_600_000);
    if (mode === "spotlight") return a.spotlight?.score || 0;
    return (
      100 / (1 + hours / 12) +
      (mode === "for-you"
        ? Math.min(25, Number(interests[a.category]) || 0) * 2
        : 0)
    );
  };
  return [...filtered].sort(
    (a, b) => score(b) - score(a) || b.publishedAt.localeCompare(a.publishedAt),
  );
}

// Ranking metadata can come from yesterday's device cache. Its collection-time
// recency reason must not be presented as the article's age at reading time.
export function spotlightRecencyReason(iso, now = Date.now()) {
  const age = now - Date.parse(iso);
  if (!Number.isFinite(age) || age < 0 || age > NEWS_WINDOW) return "";
  return age <= 3 * 3_600_000
    ? "Published within 3 hours"
    : age <= 12 * 3_600_000
      ? "Published within 12 hours"
      : "Published within 24 hours";
}

export function relativeTime(iso, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
