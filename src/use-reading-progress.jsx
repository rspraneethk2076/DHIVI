import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { writeStorage } from "./feed-model.mjs";
import {
  normalizeReadingState,
  resolveReadingPosition,
} from "./reading-state.mjs";

export function useReadingProgress({
  feedRef,
  initialProgress,
  ready,
  visible,
  category,
  mode,
  query,
  onResume,
}) {
  const [restoring, setRestoring] = useState(Boolean(initialProgress));
  const pending = useRef(
    initialProgress ? { progress: initialProgress, announce: true } : null,
  );
  const current = useRef({});
  current.current = { ready, visible, category, mode, query, onResume };
  const viewKey = `${category}\n${mode}\n${query}`;
  const previousView = useRef(viewKey);
  const eligibleIds = visible.map((article) => article.id).join("\n");

  const capture = useCallback(() => {
    const feed = feedRef.current;
    const view = current.current;
    if (!feed || !view.ready) return null;
    const top = feed.getBoundingClientRect().top;
    const cards = [...feed.querySelectorAll("[data-article-id]")];
    const card =
      cards.find((node) => node.getBoundingClientRect().bottom > top + 16) ||
      cards.at(-1);
    return normalizeReadingState({
      category: view.category,
      mode: view.mode,
      query: view.query,
      articleId: card?.getAttribute("data-article-id") || "",
      articleIds: view.visible.map((article) => article.id),
      offset: card ? card.getBoundingClientRect().top - top : 0,
      scrollTop: feed.scrollTop,
      updatedAt: Date.now(),
    });
  }, [feedRef]);

  const checkpoint = useCallback(() => {
    if (pending.current) return;
    const progress = capture();
    if (progress) writeStorage("reading:v1", progress);
  }, [capture]);

  const requestAnchor = useCallback(
    (articleId) => {
      const view = current.current;
      pending.current = {
        progress: {
          category: view.category,
          mode: view.mode,
          query: view.query,
          articleId: articleId || "",
          articleIds: view.visible.map((article) => article.id),
          offset: 0,
          scrollTop: feedRef.current?.scrollTop || 0,
          updatedAt: Date.now(),
        },
        announce: false,
      };
      setRestoring(true);
    },
    [feedRef],
  );

  const beforeRemove = useCallback(
    (articleId) => {
      const articles = current.current.visible;
      const index = articles.findIndex((article) => article.id === articleId);
      requestAnchor(articles[index + 1]?.id || articles[index - 1]?.id || "");
    },
    [requestAnchor],
  );

  const restartAtTop = useCallback(() => {
    pending.current = null;
    setRestoring(false);
    feedRef.current?.scrollTo({ top: 0 });
    requestAnimationFrame(checkpoint);
  }, [feedRef, checkpoint]);
  const preservePosition = useCallback(() => {
    if (pending.current) return;
    const progress = capture();
    if (!progress) return;
    pending.current = { progress, announce: false };
    setRestoring(true);
  }, [capture]);
  const cancelRestore = useCallback(() => {
    if (!pending.current) return;
    pending.current = null;
    setRestoring(false);
    checkpoint();
  }, [checkpoint]);

  useLayoutEffect(() => {
    if (previousView.current === viewKey) return;
    previousView.current = viewKey;
    pending.current = null;
    setRestoring(false);
    feedRef.current?.scrollTo({ top: 0 });
    requestAnimationFrame(checkpoint);
  }, [viewKey, feedRef, checkpoint]);

  useLayoutEffect(() => {
    const target = pending.current;
    const feed = feedRef.current;
    if (!target || !ready || !feed) return;
    let cancelled = false;
    const position = resolveReadingPosition(
      target.progress,
      current.current.visible,
    );
    const apply = () => {
      if (cancelled || pending.current !== target) return;
      const card = position?.articleId
        ? [...feed.querySelectorAll("[data-article-id]")].find(
            (node) =>
              node.getAttribute("data-article-id") === position.articleId,
          )
        : null;
      const top = card
        ? feed.scrollTop +
          card.getBoundingClientRect().top -
          feed.getBoundingClientRect().top -
          position.offset
        : position?.scrollTop || 0;
      feed.scrollTop = Math.max(
        0,
        Math.min(top, feed.scrollHeight - feed.clientHeight),
      );
    };
    apply();
    const frame = requestAnimationFrame(apply);
    let fontTimer;
    const fontReady = document.fonts?.ready || Promise.resolve();
    Promise.race([
      fontReady,
      new Promise((resolve) => {
        fontTimer = setTimeout(resolve, 1000);
      }),
    ]).then(() => {
      if (cancelled || pending.current !== target) return;
      clearTimeout(fontTimer);
      apply();
      pending.current = null;
      setRestoring(false);
      checkpoint();
      if (target.announce && position?.articleId)
        current.current.onResume?.(
          position.reason === "current"
            ? "Resumed where you left off."
            : "Resumed at your next available story.",
        );
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(fontTimer);
    };
  }, [ready, eligibleIds, restoring, viewKey, feedRef, checkpoint]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    let lastSave = 0,
      timer;
    const onScroll = () => {
      if (pending.current) return;
      const remaining = 1000 - (Date.now() - lastSave);
      if (remaining <= 0) {
        checkpoint();
        lastSave = Date.now();
      } else if (!timer)
        timer = setTimeout(() => {
          timer = null;
          checkpoint();
          lastSave = Date.now();
        }, remaining);
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") checkpoint();
    };
    feed.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", checkpoint);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      clearTimeout(timer);
      checkpoint();
      feed.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", checkpoint);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [feedRef, checkpoint]);

  return {
    restoring,
    checkpoint,
    beforeRemove,
    restoreArticle: requestAnchor,
    restartAtTop,
    preservePosition,
    cancelRestore,
  };
}
