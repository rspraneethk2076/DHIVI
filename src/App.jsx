import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  Cross,
  Globe2,
  Newspaper,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  X,
  Box,
  WifiOff,
  Volume2,
  Square,
  CheckCheck,
  Mail,
} from "lucide-react";
import {
  LABELS,
  REFRESH_INTERVAL,
  filterArticles,
  isFreshArticle,
  normalizeCachedFeed,
  readStorage,
  relativeTime,
  writeStorage,
} from "./feed-model.mjs";
import {
  normalizeReadingState,
  normalizeReadHistory,
  markArticleRead,
  unmarkArticleRead,
} from "./reading-state.mjs";
import { useReadingProgress } from "./use-reading-progress.jsx";
import { createSpeechReader } from "./speech-reader.mjs";
import { createContinuousReader } from "./continuous-reader.mjs";
import { normalizeSavedArchive, changeSavedArchive } from "./saved-archive.mjs";
import SourceCoverage from "./SourceCoverage.jsx";
import Newsletter from "./Newsletter.jsx";

const NAV = [
  { id: "all", icon: Newspaper },
  { id: "technical", icon: Code2 },
  { id: "clinical", icon: Cross },
  { id: "tools", icon: Box },
  { id: "geopolitical", icon: Globe2 },
];
const MOBILE_LABELS = {
  all: "All",
  technical: "Technical",
  clinical: "Clinical",
  tools: "Tools",
  geopolitical: "Geo",
};
const TOPICS = [
  { label: "AI agents", query: "agent" },
  { label: "Foundation models", query: "model" },
  { label: "AI geopolitics", category: "geopolitical" },
  { label: "Open source", query: "open source" },
];

function initialSaved() {
  return normalizeSavedArchive(readStorage("saved:v1", []));
}

const ArticleCard = React.memo(function ArticleCard({
  article,
  saved,
  onSave,
  onRead,
  priority,
  spotlight,
  readoutMode,
  onReadoutMode,
  onReadout,
  onMarkRead,
  listening,
  speechSupported,
  read,
}) {
  const [failed, setFailed] = useState(false);
  const fallback = failed || !article.hasPublisherImage;
  const spotlightReason =
    article.spotlight.reasons.find(
      (reason) => !reason.startsWith("Published within "),
    ) || article.spotlight.reasons[0];
  return (
    <article
      className={`story story-${article.category} ${listening ? "is-listening" : ""}`}
      data-article-id={article.id}
    >
      <a
        className="story-image-link"
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onRead(article)}
        aria-label={`Read ${article.title} at ${article.source}`}
        tabIndex={-1}
      >
        <img
          className="story-image"
          src={fallback ? `/images/${article.category}.svg` : article.image}
          alt={
            fallback
              ? `${LABELS[article.category]} topic illustration`
              : `Image from ${article.source}`
          }
          onError={() => setFailed(true)}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
        <div className="image-topline">
          <span>
            <Radio size={12} /> {article.source}
          </span>
          <span className="image-type">
            {fallback ? "TOPIC ILLUSTRATION" : "PUBLISHER IMAGE"}
          </span>
        </div>
      </a>
      <div className="story-content">
        <div className="story-meta">
          <span className={`category-label ${article.category}`}>
            {LABELS[article.category]}
          </span>
          <span>·</span>
          <time
            dateTime={article.publishedAt}
            title={new Date(article.publishedAt).toLocaleString()}
          >
            {relativeTime(article.publishedAt)}
          </time>
          <span>·</span>
          <span>
            {new Date(article.publishedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <button
          className={`save-button icon-button ${saved ? "is-saved" : ""}`}
          aria-label={
            saved
              ? `Unsave ${article.title}`
              : `Save ${article.title} for later`
          }
          aria-pressed={saved}
          onClick={() => onSave(article)}
          title={saved ? "Remove from saved" : "Save for later"}
        >
          <Bookmark size={21} fill={saved ? "currentColor" : "none"} />
        </button>
        <h2>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onRead(article)}
          >
            {article.title}
          </a>
        </h2>
        {article.sourceKind !== "publisher" && (
          <span className="story-provenance">
            {article.contentType === "journal" ? "Journal research" : article.sourceKind === "official" ? "Official announcement" : "Research update"}
          </span>
        )}
        {article.summary && <p className="story-summary">{article.summary}</p>}
        {spotlight && article.spotlight.reasons.length > 0 && (
          <details className="story-spotlight">
            <summary>
              <Sparkles size={12} />
              <strong>Spotlight</strong>
              <span>{spotlightReason}</span>
              <ChevronRight size={12} />
            </summary>
            <p>{article.spotlight.reasons.join(" · ")}</p>
            {article.spotlight.corroboration.sourceCount > 1 && (
              <p>
                Related coverage:{" "}
                {article.spotlight.corroboration.sources.join(", ")}
              </p>
            )}
          </details>
        )}
        <a
          className="source-link"
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onRead(article)}
        >
          Read at {article.source} <ArrowUpRight size={15} />
        </a>
        <div className="story-actions">
          <button
            className={`listen-button ${listening ? "active" : ""}`}
            onClick={() => onReadout(article)}
            disabled={!speechSupported}
            aria-label={
              listening
                ? `Stop readout for ${article.title}`
                : `Listen to ${readoutMode === "headline" ? "headline" : "headline and summary"}: ${article.title}`
            }
            aria-pressed={listening}
            title={
              speechSupported
                ? "Read this story aloud"
                : "Readout is unavailable in this browser"
            }
          >
            {listening ? (
              <Square size={13} fill="currentColor" />
            ) : (
              <Volume2 size={15} />
            )}
            {listening ? "Stop" : "Listen"}
          </button>
          <select
            className="readout-mode"
            value={readoutMode}
            onChange={(event) => onReadoutMode(event.target.value)}
            aria-label={`Readout content for ${article.title}`}
          >
            <option value="summary">Summary</option>
            <option value="headline">Headline</option>
          </select>
          <button
            className="mark-read-button"
            onClick={() => onMarkRead(article)}
            aria-label={read ? `Read: ${article.title}` : `Mark as read: ${article.title}`}
            disabled={read}
          >
            <CheckCheck size={15} />
            {read ? "Read · kept in archive" : "Mark as read"}
          </button>
        </div>
      </div>
    </article>
  );
});

export default function App() {
  const [initialProgress] = useState(() =>
    normalizeReadingState(readStorage("reading:v1", null)),
  );
  const [articles, setArticles] = useState(() => normalizeCachedFeed(readStorage("feed:v2", [])));
  const [saved, setSaved] = useState(initialSaved);
  const [category, setCategory] = useState(initialProgress?.category || "all");
  const [query, setQuery] = useState(initialProgress?.query || "");
  const [mode, setMode] = useState(initialProgress?.mode || "spotlight");
  const [readHistory, setReadHistory] = useState(() =>
    normalizeReadHistory(readStorage("read:v1", {})),
  );
  const [undoRead, setUndoRead] = useState(null);
  const [readoutMode, setReadoutMode] = useState(() =>
    readStorage("readout-mode:v1", "summary") === "headline"
      ? "headline"
      : "summary",
  );
  const [speechState, setSpeechState] = useState({
    articleId: null,
    mode: null,
    status: "idle",
  });
  const [speechSupported, setSpeechSupported] = useState(false);
  const [continuousState, setContinuousState] = useState({ enabled: false, phase: 'idle', number: 0 });
  const [audioGap, setAudioGap] = useState(() => [1, 3, 5, 10, 15].includes(readStorage('audio-gap:v1', 3)) ? readStorage('audio-gap:v1', 3) : 3);
  const [voiceRate, setVoiceRate] = useState(() => [0.75, 1, 1.25, 1.5].includes(readStorage('voice-rate:v1', 1)) ? readStorage('voice-rate:v1', 1) : 1);
  const [audioOpen, setAudioOpen] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [interests, setInterests] = useState(() => {
    const value = readStorage("interests:v1", {});
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  });
  const [playing, setPlaying] = useState(() => {
    const preference = readStorage("autoscroll:v1", null);
    return typeof preference === "boolean"
      ? preference
      : !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [speed, setSpeed] = useState(() => {
    const value = Number(readStorage("speed:v1", 1));
    return Number.isFinite(value) && value >= 0.5 && value <= 2 ? value : 1;
  });
  const [interactionPause, setInteractionPause] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [feedInfo, setFeedInfo] = useState(null);
  const [lastAttempt, setLastAttempt] = useState(null);
  const [retryAt, setRetryAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [pending, setPending] = useState(null);
  const [toast, setToast] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [newsletterOpen, setNewsletterOpen] = useState(() => new URLSearchParams(window.location.hash.slice(1)).has('newsletter'));
  const feedRef = useRef(null);
  const searchRef = useRef(null);
  const currentArticles = useRef(articles);
  const requestInFlight = useRef(false);
  const shortRetries = useRef(0);
  const abortRef = useRef(null);
  const pauseTimer = useRef(null);
  const modalRef = useRef(null);
  const readerRef = useRef(null);
  const continuousRef = useRef(null);
  const audioSettings = useRef({});
  audioSettings.current = { mode: readoutMode, gap: audioGap, rate: voiceRate };
  const visibleRef = useRef([]);
  const lastAttemptRef = useRef(null);
  const wheelRemainder = useRef(0);
  const savedIds = useMemo(() => new Set(saved.map((a) => a.id)), [saved]);
  const readIds = useMemo(
    () => new Set(Object.keys(readHistory)),
    [readHistory],
  );
  const base = category === "saved" ? saved : articles;
  const visible = useMemo(
    () =>
      filterArticles(base, { category, query, mode, interests, now, readIds }),
    [base, category, query, mode, interests, now, readIds],
  );
  const hiddenMatching = visible.length
    ? 0
    : filterArticles(base, { category, query, mode, interests, now }).filter(
        (article) => readIds.has(article.id),
      ).length;
  visibleRef.current = visible;
  const notify = useCallback((message) => {
    setToast(message);
    setUndoRead(null);
  }, []);
  const reading = useReadingProgress({
    feedRef,
    initialProgress,
    ready:
      category === "saved" || articles.length > 0 || (!loading && !error),
    visible,
    category,
    mode,
    query,
    onResume: notify,
  });
  const listening = speechState.status === "speaking";
  const activeReadout =
    base.find((article) => article.id === speechState.articleId) ||
    articles.find((article) => article.id === speechState.articleId) ||
    saved.find((article) => article.id === speechState.articleId);
  const freshPending = useMemo(
    () =>
      pending
        ? pending.articles.filter((article) => isFreshArticle(article, now))
        : [],
    [pending, now],
  );
  const pendingCount = freshPending.filter(
    (article) =>
      !readIds.has(article.id) &&
      !currentArticles.current.some((current) => current.id === article.id),
  ).length;
  const running =
    playing &&
    !interactionPause &&
    !focused &&
    !showHelp &&
    !newsletterOpen &&
    !listening &&
    !continuousState.enabled &&
    !reading.restoring &&
    category !== "saved" &&
    visible.length > 0;

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(
      () => {
        setToast("");
        setUndoRead(null);
      },
      undoRead ? 8000 : 3500,
    );
    return () => clearTimeout(id);
  }, [toast, undoRead]);
  useEffect(() => {
    writeStorage("autoscroll:v1", playing);
  }, [playing]);
  useEffect(() => {
    writeStorage("readout-mode:v1", readoutMode);
  }, [readoutMode]);
  useEffect(() => { writeStorage('audio-gap:v1', audioGap); }, [audioGap]);
  useEffect(() => { writeStorage('voice-rate:v1', voiceRate); }, [voiceRate]);
  useEffect(() => {
    const reader = createSpeechReader({
      synthesis: window.speechSynthesis,
      Utterance: window.SpeechSynthesisUtterance,
      onState: setSpeechState,
      onError: message => { if (continuousRef.current?.enabled) continuousRef.current.stop(); setAudioError(message); notify(message); },
      onComplete: id => continuousRef.current?.completed(id),
    });
    readerRef.current = reader;
    const current = () => {
      const feed = feedRef.current;
      if (!feed) return null;
      const top = feed.getBoundingClientRect().top;
      const card = [...feed.querySelectorAll('[data-article-id]')].find(node => node.getBoundingClientRect().bottom > top + 24);
      return visibleRef.current.find(article => article.id === card?.getAttribute('data-article-id'));
    };
    continuousRef.current = createContinuousReader({
      reader, current, settings: () => audioSettings.current,
      onState: setContinuousState, onEnd: notify,
      next: (id, spoken) => {
        const list = visibleRef.current;
        const index = list.findIndex(article => article.id === id);
        const article = list.slice(index < 0 ? 0 : index + 1).find(item => !spoken.has(item.id));
        const feed = feedRef.current;
        const card = feed && [...feed.querySelectorAll('[data-article-id]')].find(node => node.getAttribute('data-article-id') === article?.id);
        if (card) feed.scrollTop += card.getBoundingClientRect().top - feed.getBoundingClientRect().top;
        return article;
      },
    });
    setSpeechSupported(reader.supported);
    return () => {
      continuousRef.current?.stop();
      continuousRef.current = null;
      reader.dispose();
      readerRef.current = null;
    };
  }, [notify]);
  useEffect(() => {
    continuousRef.current?.stop();
  }, [category, query, mode, readoutMode]);
  useEffect(() => {
    if (showHelp || newsletterOpen) { continuousRef.current?.stop(); readerRef.current?.stop(); }
  }, [showHelp, newsletterOpen]);
  useEffect(() => {
    const stopOnLeave = () => { if (document.hidden) { continuousRef.current?.stop(); readerRef.current?.stop(); } };
    document.addEventListener('visibilitychange', stopOnLeave);
    return () => document.removeEventListener('visibilitychange', stopOnLeave);
  }, []);
  useEffect(() => {
    if (
      listening &&
      !visible.some((article) => article.id === speechState.articleId)
    ) {
      continuousRef.current?.stop();
      readerRef.current?.stop();
    }
  }, [listening, speechState.articleId, visible]);
  useEffect(() => {
    const syncReadHistory = (event) => {
      if (event.key === "dhivi:read:v1")
        setReadHistory(normalizeReadHistory(readStorage("read:v1", {})));
      if (event.key === "dhivi:saved:v1") setSaved(initialSaved());
    };
    window.addEventListener("storage", syncReadHistory);
    return () => window.removeEventListener("storage", syncReadHistory);
  }, []);
  useEffect(() => {
    writeStorage("speed:v1", speed);
  }, [speed]);
  useEffect(() => {
    writeStorage("interests:v1", interests);
  }, [interests]);
  useEffect(() => {
    if (!showHelp) return;
    const previouslyFocused = document.activeElement;
    const modalKeys = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowHelp(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = modalRef.current?.querySelectorAll(
        'button, a[href], input, select, [tabindex="0"]',
      );
      if (!controls?.length) return;
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", modalKeys);
    modalRef.current?.querySelector("button")?.focus();
    return () => {
      document.removeEventListener("keydown", modalKeys);
      previouslyFocused?.focus();
    };
  }, [showHelp]);

  const refresh = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setRefreshing(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch("/.netlify/functions/news", {
        signal: controller.signal,
        cache: "no-cache",
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 503 && payload.cacheStatus === "refreshing" && shortRetries.current < 12) {
          shortRetries.current += 1;
          const seconds = Math.max(2, Math.min(15, Number(response.headers.get("Retry-After")) || 5));
          setRetryAt(Date.now() + seconds * 1000);
          const queued = new Error("The hourly feed is updating. Reconnecting automatically in a few seconds.");
          queued.refreshing = true;
          throw queued;
        }
        throw new Error("News sources are temporarily unavailable.");
      }
      shortRetries.current = 0;
      setRetryAt(null);
      if (!Array.isArray(payload.articles))
        throw new Error("The news feed could not be read.");
      const next = normalizeCachedFeed(payload.articles);
      writeStorage("feed:v2", next);
      const previousIds = new Set(currentArticles.current.map((a) => a.id));
      const newCount = next.filter((a) => !previousIds.has(a.id)).length;
      if (
        currentArticles.current.length &&
        newCount &&
        (feedRef.current?.scrollTop || 0) > 40
      )
        setPending({ articles: next, count: newCount });
      else {
        if (currentArticles.current.length) reading.preservePosition();
        setArticles(next);
        currentArticles.current = next;
        setPending(null);
      }
      setFeedInfo(payload);
      setError("");
    } catch (err) {
      if (!controller.signal.aborted || abortRef.current === controller)
        setError(
          err.refreshing ? err.message : navigator.onLine
            ? "The live feed is taking a break. We’ll retry automatically; you can still read loaded and saved stories."
            : "You’re offline. Your saved stories are still here.",
        );
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      setRefreshing(false);
      requestInFlight.current = false;
      lastAttemptRef.current = Date.now();
      setLastAttempt(lastAttemptRef.current);
    }
  }, [reading.preservePosition]);

  useEffect(() => {
    if (!retryAt) return;
    const timer = setTimeout(() => {
      setRetryAt(null);
      refresh();
    }, Math.max(0, retryAt - Date.now()));
    return () => clearTimeout(timer);
  }, [retryAt, refresh]);

  useEffect(() => {
    refresh();
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        (!lastAttemptRef.current ||
          Date.now() - lastAttemptRef.current >= REFRESH_INTERVAL)
      )
        refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(ticker);
      abortRef.current?.abort();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      clearTimeout(pauseTimer.current);
    };
  }, [refresh]);
  useEffect(() => {
    if (!lastAttempt) return;
    const next = setTimeout(
      refresh,
      Math.max(1000, REFRESH_INTERVAL - (Date.now() - lastAttempt)),
    );
    return () => clearTimeout(next);
  }, [lastAttempt, refresh]);

  const applyPending = useCallback(() => {
    if (!pending) return;
    continuousRef.current?.stop();
    setArticles(pending.articles);
    currentArticles.current = pending.articles;
    setPending(null);
    reading.restartAtTop();
  }, [pending, reading.restartAtTop]);

  useEffect(() => {
    if (
      category !== "saved" &&
      articles.length > 0 &&
      freshPending.length > 0 &&
      !articles.some((article) => isFreshArticle(article, now))
    ) applyPending();
  }, [category, articles, freshPending.length, now, applyPending]);

  useEffect(() => {
    wheelRemainder.current = 0;
  }, [category, query, mode]);

  useEffect(() => {
    if (!running) return;
    let frame, previous;
    const tick = (timestamp) => {
      if (previous !== undefined && document.visibilityState === "visible") {
        const el = feedRef.current;
        if (el && el.scrollHeight > el.clientHeight + 1) {
          wheelRemainder.current +=
            Math.min(timestamp - previous, 48) * 0.023 * speed;
          if (wheelRemainder.current >= 1) {
            const amount = Math.floor(wheelRemainder.current);
            el.scrollTop += amount;
            wheelRemainder.current -= amount;
          }
          if (el.scrollTop >= el.scrollHeight - el.clientHeight - 1) {
            if (pending) applyPending();
            else el.scrollTop = 0;
          }
        }
      }
      previous = timestamp;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, speed, pending, applyPending]);

  useEffect(() => {
    const shortcuts = (event) => {
      if (
        event.target.closest(
          'input, textarea, select, button, a, [contenteditable="true"]',
        ) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        setPlaying((v) => !v);
      }
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setShowHelp(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, []);

  const manualScroll = () => {
    continuousRef.current?.moved();
    reading.cancelRestore();
    setInteractionPause(true);
    clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => setInteractionPause(false), 4000);
  };
  const selectCategory = (id) => {
    readerRef.current?.stop();
    setCategory(id);
    setQuery("");
    setFocused(false);
  };
  const chooseReadoutMode = useCallback((value) => {
    readerRef.current?.stop();
    setReadoutMode(value === "headline" ? "headline" : "summary");
  }, []);
  const selectSource = useCallback((name) => {
    readerRef.current?.stop();
    setCategory("all");
    setQuery(name);
    setFocused(false);
    setShowHelp(false);
  }, []);
  const readOut = useCallback(
    (article) => {
      const alreadyReading = readerRef.current?.getState().articleId === article.id;
      setAudioError('');
      continuousRef.current?.stop();
      const reader = readerRef.current;
      if (!reader?.supported) {
        notify("Readout is unavailable in this browser.");
        return;
      }
      setFocused(false);
      reading.checkpoint();
      if (alreadyReading) reader.stop();
      else reader.read(article, readoutMode, { rate: audioSettings.current.rate });
    },
    [readoutMode, notify, reading.checkpoint],
  );
  const markRead = useCallback(
    (article) => {
      continuousRef.current?.stop();
      if (readerRef.current?.getState().articleId === article.id)
        readerRef.current.stop();
      if (category !== 'saved') reading.beforeRemove(article.id);
      const next = markArticleRead(readHistory, article.id);
      const persisted = writeStorage("read:v1", next);
      setReadHistory(next);
      setFocused(false);
      notify(
        persisted
          ? savedIds.has(article.id) ? "Marked as read. Kept in your saved archive." : "Marked as read. Story hidden."
          : "Marked as read for this visit. Browser storage is unavailable.",
      );
      setUndoRead(article);
    },
    [readHistory, reading.beforeRemove, notify, savedIds, category],
  );
  const undoMarkRead = useCallback(() => {
    if (!undoRead) return;
    const next = unmarkArticleRead(readHistory, undoRead.id);
    writeStorage("read:v1", next);
    reading.restoreArticle(undoRead.id);
    setReadHistory(next);
    notify("Story restored to your unread feed.");
  }, [undoRead, readHistory, reading.restoreArticle, notify]);
  const restoreHiddenStories = useCallback(() => {
    const next = normalizeReadHistory({});
    writeStorage("read:v1", next);
    setReadHistory(next);
    notify("Marked-as-read stories are visible again.");
  }, [notify]);
  const learn = useCallback(
    (article) =>
      setInterests((previous) => ({
        ...previous,
        [article.category]: Math.min(
          25,
          (Number(previous[article.category]) || 0) + 1,
        ),
      })),
    [],
  );
  const toggleSave = useCallback(
    (article) => {
      const removing = savedIds.has(article.id);
      const next = changeSavedArchive(initialSaved(), article, removing);
      if (!writeStorage("saved:v1", next)) {
        notify(
          "Couldn’t save: device storage is full or blocked. Existing saves are kept. Free space and try again.",
        );
        return;
      } else
        notify(
          removing ? "Story removed from saved." : "Saved on this device. This story won’t expire after 24 hours.",
        );
      if (!removing) navigator.storage?.persist?.().catch(() => {});
      setSaved(next);
      if (!removing) learn(article);
    },
    [savedIds, saved, notify, learn],
  );
  const nextCheck = lastAttempt
    ? Math.max(
        0,
        Math.min(
          REFRESH_INTERVAL / 1000,
          Math.ceil((REFRESH_INTERVAL - (now - lastAttempt)) / 1000),
        ),
      )
    : null;
  const selectedTitle =
    category === "saved"
      ? "Your reading list."
      : query
        ? `Searching “${query}”`
        : LABELS[category];

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            selectCategory("all");
          }}
          aria-label="Dhivi Live AI News home"
        >
          <span>
            dhivi<span className="brand-dot">.</span>
          </span>
          <small>LIVE AI NEWS</small>
        </a>
        <nav className="nav-list">
          {NAV.map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${category === id ? "active" : ""}`}
              onClick={() => selectCategory(id)}
              aria-label={LABELS[id]}
              aria-current={category === id ? "page" : undefined}
            >
              <Icon size={20} strokeWidth={1.7} />
              <span className="desktop-nav-label">{LABELS[id]}</span>
              <span className="mobile-nav-label" aria-hidden="true">
                {MOBILE_LABELS[id]}
              </span>
              {category === id && <span className="nav-active-dot" />}
            </button>
          ))}
          <div className="nav-divider" />
          <button
            className={`nav-item saved-nav ${category === "saved" ? "active" : ""}`}
            onClick={() => selectCategory("saved")}
            aria-label={`Saved for later ${saved.length}`}
            aria-current={category === "saved" ? "page" : undefined}
          >
            <Bookmark size={20} strokeWidth={1.7} />
            <span className="desktop-nav-label">Saved for later</span>
            <span className="mobile-nav-label" aria-hidden="true">
              Saved
            </span>
            <span className="saved-count">{saved.length}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="system-note">
            <span className="live-dot" />
            <span>Curiosity, always on.</span>
          </div>
          <p>
            By sai praneeth
            <br className="byline-break" /> renduchinthala
          </p>
          <small>Made for the endlessly curious.</small>
        </div>
      </aside>

      <main className="main">
        <header className="utility-bar">
          <span>
            Your daily intelligence<span className="green">.</span>
          </span>
          <div className="utility-right">
            <button className="newsletter-trigger" onClick={() => setNewsletterOpen(true)} aria-label="Subscribe to the morning newsletter"><Mail size={16}/><span>Morning briefing</span></button>
            <span className={`feed-status ${error ? "degraded" : ""}`}>
              <span className="live-dot" />
              {loading
                ? "CONNECTING"
                : error
                  ? "RECONNECTING"
                  : feedInfo?.stale
                    ? "CACHED FEED"
                    : "LIVE FEED"}
            </span>
            <button
              className="icon-button help-button"
              aria-label="How Dhivi works"
              onClick={() => setShowHelp(true)}
            >
              <CircleHelp size={17} />
            </button>
          </div>
        </header>

        <section className="hero">
          <div>
            <h1>
              Stay ahead.
              <br />
              <span>Stay intelligent.</span>
            </h1>
            <p>Must-know AI. Only the past 24 hours.</p>
            <small className="mobile-byline">
              By sai praneeth renduchinthala
            </small>
          </div>
          <form
            className="search"
            role="search"
            onSubmit={(e) => e.preventDefault()}
          >
            <Search size={21} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search AI news..."
              aria-label="Search news"
            />
            {query ? (
              <button
                className="icon-button"
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={17} />
              </button>
            ) : (
              <kbd>/</kbd>
            )}
          </form>
        </section>

        <div className="content-layout">
          <section className="feed-column" aria-label={selectedTitle}>
            <div className="feed-toolbar">
              <div className="segmented" aria-label="Feed order">
                <button
                  className={mode === "spotlight" ? "selected" : ""}
                  aria-pressed={mode === "spotlight"}
                  onClick={() => setMode("spotlight")}
                >
                  <Sparkles size={12} />
                  Spotlight
                </button>
                <button
                  className={mode === "latest" ? "selected" : ""}
                  aria-pressed={mode === "latest"}
                  onClick={() => setMode("latest")}
                >
                  Latest
                </button>
                <button
                  className={mode === "for-you" ? "selected" : ""}
                  aria-pressed={mode === "for-you"}
                  onClick={() => setMode("for-you")}
                >
                  For you
                </button>
              </div>
              <span className="story-count">
                {loading
                  ? "TUNING IN..."
                  : `${visible.length} ${visible.length === 1 ? "STORY" : "STORIES"}`}
                <span className="count-dot">·</span>
                {category === "saved" ? "SAVED" : "24H ONLY"}
              </span>
            </div>
            <div className="audio-session">
              <button aria-expanded={audioOpen} onClick={() => setAudioOpen(value => !value)}>
                <Volume2 size={16} /> Hands-free news <span>{continuousState.enabled ? continuousState.phase === 'interval' ? 'Taking a breath' : 'Reading aloud' : 'Listen as you browse'}</span>
              </button>
              <button className="audio-start" disabled={!speechSupported || reading.restoring || (!visible.length && !continuousState.enabled)}
                aria-pressed={continuousState.enabled} onClick={() => {
                  if (continuousRef.current?.enabled) continuousRef.current.stop();
                  else { setAudioError(''); setFocused(false); reading.checkpoint(); continuousRef.current?.start(); }
                }}>{continuousState.enabled ? 'Stop hands-free' : 'Start hands-free'}</button>
              {audioOpen && <div className="audio-options">
                <label>Read <select aria-label="Hands-free content" value={readoutMode} onChange={event => chooseReadoutMode(event.target.value)}><option value="summary">Headline + summary</option><option value="headline">Headline only</option></select></label>
                <label>Gap <select aria-label="Gap between stories" value={audioGap} onChange={event => setAudioGap(Number(event.target.value))}>{[1,3,5,10,15].map(gap => <option key={gap} value={gap}>{gap} seconds</option>)}</select></label>
                <label>Voice <select aria-label="Voice speed" value={voiceRate} onChange={event => setVoiceRate(Number(event.target.value))}>{[0.75,1,1.25,1.5].map(rate => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
                <p>One tap starts the visible story. The feed pauses for speech, waits between stories, then moves to the next. Scroll manually to change stories. Playback stops when you leave this tab.</p>
              </div>}
              {audioError && <p className="audio-error" role="status">{audioError}</p>}
            </div>
            {category === 'saved' && <div className="archive-note">Your device archive · no 24-hour expiry · read stories stay here until you unsave them.</div>}
            {mode === "spotlight" && category !== "saved" && (
              <details className="spotlight-briefing">
                <summary>
                  <span>
                    <Sparkles size={12} /> Your 24h spotlight
                  </span>
                  <span>
                    How picks work <ChevronRight size={12} />
                  </span>
                </summary>
                <div>
                  <p>
                    Fresh reporting, significant launches, policy developments,
                    and related coverage across publishers. Each story explains
                    its selection; these are editorial signals, not social-media
                    popularity counts.
                  </p>
                </div>
              </details>
            )}
            {(category !== "all" || query) && (
              <div className="filter-context">
                <span>{selectedTitle}</span>
                <button
                  onClick={() => {
                    setQuery("");
                    if (category !== "saved") setCategory("all");
                  }}
                >
                  <X size={13} />{" "}
                  {category === "saved" ? "Clear search" : "Clear filter"}
                </button>
              </div>
            )}
            {pendingCount > 0 && category !== "saved" && (
              <button className="new-stories" onClick={applyPending}>
                <ArrowUp size={14} /> {pendingCount} new{" "}
                {pendingCount === 1 ? "story" : "stories"} · Bring me up to
                speed
              </button>
            )}
            {error && (
              <div className="feed-alert" role="status">
                <WifiOff size={16} />
                <span>{error}</span>
                <button onClick={refresh}>Retry</button>
              </div>
            )}
            {feedInfo?.stale && !error && (
              <div className="feed-alert" role="status">
                Showing the last available feed while sources reconnect.
              </div>
            )}
            {listening && (
              <div
                className="readout-player"
                role="region"
                aria-label="News readout"
              >
                <Volume2 size={17} />
                <div>
                  <strong>{activeReadout?.title || "Reading the news"}</strong>
                  <small>Scrolling paused while you listen</small>
                </div>
                <button
                  onClick={() => {
                    continuousRef.current?.stop();
                    readerRef.current?.stop();
                    setFocused(false);
                  }}
                  aria-label="Stop readout"
                >
                  <Square size={14} fill="currentColor" />
                  Stop
                </button>
              </div>
            )}
            <div
              className="feed-viewport"
              ref={feedRef}
              tabIndex={0}
              aria-label="News feed. Scroll to browse, or use the pause control."
              onWheel={manualScroll}
              onTouchStart={manualScroll}
              onPointerDown={reading.cancelRestore}
              onKeyDown={(event) => {
                if (
                  [
                    "ArrowDown",
                    "ArrowUp",
                    "PageDown",
                    "PageUp",
                    "Home",
                    "End",
                  ].includes(event.key)
                )
                  manualScroll();
              }}
              onFocusCapture={() => setFocused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setFocused(false);
              }}
            >
              {loading && !articles.length ? (
                <div className="loading-state">
                  <div className="skeleton-image" />
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line medium" />
                  <p>
                    <RefreshCw size={14} className="spin" /> Tuning into the AI
                    world...
                  </p>
                </div>
              ) : visible.length ? (
                <>
                  {visible.map((article, index) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      saved={savedIds.has(article.id)}
                      onSave={toggleSave}
                      onRead={learn}
                      priority={index < 2}
                      spotlight={mode === "spotlight" && category !== "saved"}
                      readoutMode={readoutMode}
                      onReadoutMode={chooseReadoutMode}
                      onReadout={readOut}
                      onMarkRead={markRead}
                      listening={
                        listening && speechState.articleId === article.id
                      }
                      speechSupported={speechSupported}
                      read={category === 'saved' && readIds.has(article.id)}
                    />
                  ))}
                  <div className="end-of-feed">
                    <Radio size={20} />
                    <p>You’re on the same wavelength.</p>
                    <small>
                      {category === "saved"
                        ? "Your saved stories stay on this device."
                        : playing
                          ? "Looping back to the latest. Stay curious."
                          : "You’re all caught up. Fresh checks every hour."}
                    </small>
                    <button
                      onClick={() =>
                        feedRef.current?.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        })
                      }
                    >
                      Back to the top <ArrowUp size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  {category === "saved" ? (
                    <Bookmark size={35} />
                  ) : (
                    <Search size={35} />
                  )}
                  <h2>
                    {hiddenMatching > 0
                      ? "All caught up."
                      : query
                        ? "No stories on that frequency."
                        : category === "saved"
                          ? "Good reads deserve a second look."
                          : "Quiet in the past 24 hours."}
                  </h2>
                  <p>
                    {hiddenMatching > 0
                      ? "You’ve marked the matching stories as read. New headlines arrive with the hourly refresh."
                      : query
                        ? "Try a topic, tool name, or publisher. Search matches all words in your query."
                        : category === "saved"
                          ? "Tap the bookmark on any story. Your saved news will be waiting right here, on this device."
                          : "No matching AI stories were published in the past 24 hours. Fresh checks continue every hour."}
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => {
                      setQuery("");
                      setCategory("all");
                    }}
                  >
                    {query ? "Clear search" : "Explore AI news"}{" "}
                    <ArrowRight size={16} />
                  </button>
                  {hiddenMatching > 0 && (
                    <button
                      className="restore-read-button"
                      onClick={restoreHiddenStories}
                    >
                      Restore marked-as-read stories
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="feed-bottom">
              <span>
                <span className={`live-dot ${!running ? "muted-dot" : ""}`} />
                {listening
                  ? "LISTENING · SCROLL PAUSED"
                  : reading.restoring
                    ? "RESTORING YOUR PLACE"
                    : category === "saved"
                      ? "YOUR PERSONAL ARCHIVE"
                      : running
                        ? "AUTO-SCROLLING UPWARD"
                        : playing && (focused || interactionPause)
                          ? "PAUSED WHILE YOU BROWSE"
                          : "FEED PAUSED"}
              </span>
              <span>
                Stay curious <ArrowUpRight size={12} />
              </span>
            </div>
          </section>

          <aside
            className="right-rail"
            aria-label="Feed controls and discovery"
          >
            <section className="panel controls-panel">
              <h3>You control the flow</h3>
              <button
                className="primary-button play-button"
                onClick={() => {
                  setPlaying((v) => !v);
                  setInteractionPause(false);
                }}
                aria-pressed={playing}
              >
                {playing ? (
                  <Pause size={19} fill="currentColor" />
                ) : (
                  <Play size={19} fill="currentColor" />
                )}{" "}
                {playing ? "Pause feed" : "Play feed"}
              </button>
              <div className="speed-heading">
                <label htmlFor="speed">Scroll speed</label>
                <span>
                  {speed
                    .toFixed(speed % 1 ? 2 : 0)
                    .replace(/0$/, speed % 1 ? "" : "0")}
                  ×
                </span>
              </div>
              <input
                id="speed"
                className="speed-slider"
                type="range"
                min="0.5"
                max="2"
                step="0.25"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                style={{ "--progress": `${((speed - 0.5) / 1.5) * 100}%` }}
                aria-label="Scroll speed"
                aria-valuetext={`${speed} times speed`}
              />
              <div className="speed-ticks">
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={speed === s ? "current" : ""}
                    aria-label={`Set scroll speed to ${s}x`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <div className="refresh-status">
                <span className="live-dot" />
                <span>Updates every hour</span>
                <button
                  className="icon-button"
                  aria-label="Refresh news now"
                  onClick={refresh}
                  disabled={refreshing}
                >
                  <RefreshCw size={14} className={refreshing ? "spin" : ""} />
                </button>
              </div>
              <div className="next-check">
                {refreshing
                  ? "Checking the wires..."
                  : nextCheck === null
                    ? "Connecting to publishers..."
                    : `Next check in ${Math.floor(nextCheck / 3600)}:${String(Math.floor((nextCheck % 3600) / 60)).padStart(2, "0")}:${String(nextCheck % 60).padStart(2, "0")}`}
              </div>
            </section>
            <section className="panel radar-panel">
              <h3>On your radar</h3>
              {TOPICS.map((topic) => (
                <button
                  key={topic.label}
                  onClick={() => {
                    setCategory(topic.category || "all");
                    setQuery(topic.query || "");
                  }}
                >
                  <span>{topic.label}</span>
                  <ArrowRight size={17} />
                </button>
              ))}
            </section>
            <SourceCoverage
              info={feedInfo}
              loading={loading}
              error={error}
              onReadSource={selectSource}
            />
            <div className="rail-footer">
              <p>
                <kbd>SPACE</kbd> pause / play <span>│</span>
                <ArrowUp size={14} /> auto-scrolling
              </p>
              <button onClick={() => setShowHelp(true)}>
                A little more about Dhivi <ArrowUpRight size={12} />
              </button>
            </div>
          </aside>
        </div>
      </main>
      <div className="mobile-controls">
        <button
          onClick={() => {
            setPlaying((v) => !v);
            setInteractionPause(false);
          }}
          aria-label={playing ? "Pause feed" : "Play feed"}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
        <label htmlFor="mobile-speed">Speed</label>
        <select
          id="mobile-speed"
          aria-label="Mobile scroll speed"
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
        >
          {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
        <button
          onClick={refresh}
          aria-label="Refresh news"
          disabled={refreshing}
        >
          <RefreshCw size={17} className={refreshing ? "spin" : ""} />
        </button>
        <span className="mobile-refresh">Hourly refresh</span>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          {undoRead && <button onClick={undoMarkRead}>Undo</button>}
        </div>
      )}
      <Newsletter open={newsletterOpen} onClose={() => setNewsletterOpen(false)} />
      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <section
            ref={modalRef}
            className="about-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="Close about Dhivi"
              onClick={() => setShowHelp(false)}
            >
              <X size={21} />
            </button>
            <span className="modal-brand">dhivi.</span>
            <h2 id="about-title">
              A little signal.
              <br />A lot less noise.
            </h2>
            <p>
              Dhivi Live AI News brings AI headlines, publisher images, and
              short excerpts into one moving feed. Every story links to its
              original publisher. Topic illustrations fill in when a publisher
              doesn’t provide an image.
            </p>
            <p>
              The live feed includes only articles published in the past 24
              hours, with a fresh check every hour. Stories age out
              automatically. Your saved reading list remains an archive. AI
              geopolitical covers policy, export controls, defense, national
              security, and international AI competition.
            </p>
            <p>
              <strong>Spotlight</strong> highlights must-know developments using
              freshness, launch and policy impact, related coverage across
              publishers. Each story explains its selection. Original reporting
              must be published within the past 24 hours.
            </p>
            <p>
              <strong>For you</strong> gently prioritizes categories you read
              and save. Your reading preferences and saved stories stay in this
              browser. Saved stories have no 24-hour expiry and are kept even after marking them read. Clearing site data removes this device’s archive.
            </p>
            <SourceCoverage info={feedInfo} loading={loading} error={error} onReadSource={selectSource} />
            <p>
              Tap <strong>Listen</strong> on a story to hear its headline or
              headline and publisher summary. Scrolling pauses for the readout.
              Your place, feed settings, and scroll preference are remembered in
              this browser. If a story expires, you resume at the next available
              unread story. <strong>Mark as read</strong> hides a story across
              the live feed and search. Saved stories remain in your archive with a read badge. Use Undo to bring a story back to the live feed.
            </p>
            {readIds.size > 0 && (
              <button
                className="restore-read-button"
                onClick={restoreHiddenStories}
              >
                Restore marked-as-read stories
              </button>
            )}
            <p>
              Press <kbd>SPACE</kbd> to pause, <kbd>/</kbd> to search. Scrolling
              pauses briefly when you browse manually. Reduced-motion
              preferences start the feed paused.
            </p>
            <small>By sai praneeth renduchinthala</small>
            <button
              className="primary-button"
              onClick={() => setShowHelp(false)}
            >
              Back to the feed <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
