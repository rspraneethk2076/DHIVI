// Keep sequencing outside React so cancellation and delayed callbacks are testable.
export function createContinuousReader({ reader, current, next, settings, onState, onEnd,
  delay = setTimeout, cancelDelay = clearTimeout } = {}) {
  let enabled = false, timer = null, generation = 0, number = 0, activeId = null;
  const spoken = new Set();
  const emit = phase => onState?.({ enabled, phase, number, articleId: activeId });
  function clear() { if (timer !== null) cancelDelay(timer); timer = null; }
  function stop(reason = '') {
    enabled = false; generation++; clear(); reader.stop(); activeId = null;
    emit('idle');
    if (reason) onEnd?.(reason);
  }
  function speak(article) {
    if (!enabled) return;
    if (!article || spoken.has(article.id)) { stop('You’ve reached the end of this reading session.'); return; }
    activeId = article.id; spoken.add(article.id); number++;
    emit('reading');
    const { mode, rate } = settings();
    if (!reader.read(article, mode, { rate, introduction: number > 1 ? 'Next news.' : '' })) stop();
  }
  return {
    start() { stop(); spoken.clear(); number = 0; enabled = true; speak(current()); },
    stop,
    completed(articleId) {
      if (!enabled || activeId !== articleId) return;
      const token = generation;
      emit('interval');
      const seconds = Math.max(1, Math.min(15, Number(settings().gap) || 3));
      timer = delay(() => {
        timer = null;
        if (!enabled || token !== generation) return;
        speak(next(activeId, spoken));
      }, seconds * 1000);
    },
    // Manual navigation cancels the old voice before selecting the visible card.
    moved() {
      if (!enabled) return;
      generation++; clear(); reader.stop(); emit('interval');
      const token = generation;
      timer = delay(() => {
        timer = null;
        if (!enabled || token !== generation) return;
        const article = current();
        if (article?.id === activeId) {
          // Re-read a partially heard story when the user remains on that card.
          number = Math.max(0, number - 1);
        }
        if (article) spoken.delete(article.id);
        speak(article);
      }, 700);
    },
    get enabled() { return enabled; },
  };
}
