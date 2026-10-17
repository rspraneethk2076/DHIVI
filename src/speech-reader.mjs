const MAX_TEXT_LENGTH = 1600;
const MAX_CHUNK_LENGTH = 200;
const idleState = () => ({ articleId: null, mode: null, status: 'idle' });

const cleanText = value => typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';

function boundedText(text) {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  const prefix = text.slice(0, MAX_TEXT_LENGTH - 1);
  const wordEnd = prefix.lastIndexOf(' ');
  return `${prefix.slice(0, wordEnd > MAX_TEXT_LENGTH - 100 ? wordEnd : prefix.length).trimEnd()}…`;
}

// Short requests avoid sending a long article to a single browser utterance.
// Prefer complete sentences, then word boundaries when a sentence is long.
function chunkText(text) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > MAX_CHUNK_LENGTH) {
    const preview = remaining.slice(0, MAX_CHUNK_LENGTH + 1);
    const endings = [...preview.matchAll(/[.!?](?:["'”’\])]*)(?=\s)/gu)];
    const sentence = endings.at(-1);
    const sentenceEnd = sentence ? sentence.index + sentence[0].length : 0;
    const wordEnd = preview.lastIndexOf(' ', MAX_CHUNK_LENGTH);
    const end = sentenceEnd >= 40 ? sentenceEnd : wordEnd >= 40 ? wordEnd : MAX_CHUNK_LENGTH;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function availableVoices(synthesis) {
  try {
    return Array.from(synthesis.getVoices?.() || []).filter(Boolean);
  } catch {
    // Voices can be unavailable until the browser loads them. Its default is valid.
    return [];
  }
}

const englishVoices = voices => voices.filter(voice => /^en(?:[-_]|$)/iu.test(voice.lang || ''));
const voiceKey = voice => voice ? voice.voiceURI || voice.name || `${voice.lang}|${Boolean(voice.localService)}|${Boolean(voice.default)}` : 'browser-default';
const voiceInfo = voice => voice ? { name: voice.name || '', lang: voice.lang || '', localService: Boolean(voice.localService), default: Boolean(voice.default), voiceURI: voice.voiceURI || '' } : { name: 'browser-default', lang: '', localService: null, default: true, voiceURI: '' };
const retryVoicePriority = voice => !voice.localService && /google/iu.test(voice.name || '') ? 0 : !voice.localService ? 1 : 2;

function playbackError(code) {
  if (code === 'canceled' || code === 'interrupted') return 'Read aloud was interrupted by your browser. Tap Listen to try again.';
  if (code === 'not-allowed') return 'Your browser blocked read aloud. Tap Listen again to start playback.';
  if (code === 'audio-busy' || code === 'audio-hardware') return 'Read aloud couldn’t access audio. Check your speakers and try again.';
  if (['voice-unavailable', 'language-unavailable', 'synthesis-unavailable'].includes(code)) return 'No read-aloud voice is available. Check your browser’s speech settings.';
  return 'Read aloud couldn’t play. Check your browser audio and try again.';
}

/**
 * Read existing publisher text with an injected browser Web Speech API.
 * No speech starts until read() is called from the user's playback action.
 * onState receives copies; speaking includes the gaps between serial chunks.
 * read() returns whether playback was started, and defaults to summary mode.
 */
export function createSpeechReader({ synthesis, Utterance, onState, onError, onEvent, onComplete } = {}) {
  const supported = Boolean(synthesis && typeof synthesis.speak === 'function' && typeof synthesis.cancel === 'function' && typeof Utterance === 'function');
  let state = idleState();
  let currentUtterance = null;
  let requestToken = 0;
  let disposed = false;

  function diagnose(type, details = {}) {
    if (typeof onEvent !== 'function') return;
    try {
      onEvent({ type, requestToken, ...state, ...details });
    } catch {
      // Optional diagnostics must never interfere with browser playback.
    }
  }

  function emitState(next) {
    const changed = state.articleId !== next.articleId || state.mode !== next.mode || state.status !== next.status;
    state = next;
    if (changed && typeof onState === 'function') onState({ ...state });
  }

  function reportError(message) {
    if (typeof onError === 'function') onError(message);
  }

  function detachUtterance() {
    if (currentUtterance) {
      currentUtterance.onstart = null;
      currentUtterance.onend = null;
      currentUtterance.onerror = null;
      currentUtterance = null;
    }
  }

  function cancelQueue(reason) {
    detachUtterance();
    if (supported) {
      diagnose('cancel', { reason, browserSpeaking: synthesis.speaking, browserPending: synthesis.pending, browserPaused: synthesis.paused });
      synthesis.cancel();
    }
  }

  function settle(token, message) {
    if (disposed || token !== requestToken) return;
    requestToken += 1;
    detachUtterance();
    emitState(idleState());
    if (message) reportError(message);
  }

  function read(article, mode = 'summary', options = {}) {
    if (disposed) return false;
    const token = ++requestToken;
    diagnose('read', { articleId: article?.id ?? null, mode: mode === 'headline' ? 'headline' : 'summary' });
    try {
      cancelQueue('replace');
    } catch {
      settle(token, playbackError());
      return false;
    }
    if (!supported) {
      settle(token, 'Read aloud isn’t supported in this browser. Try a browser with text-to-speech support.');
      return false;
    }

    const title = cleanText(article?.title);
    if (!title) {
      settle(token, 'This story has no headline to read.');
      return false;
    }
    const selectedMode = mode === 'headline' ? 'headline' : 'summary';
    const summary = selectedMode === 'summary' ? cleanText(article?.summary) : '';
    const headline = /[.!?…]["'”’\])]*$/u.test(title) ? title : `${title}.`;
    const introduction = cleanText(options.introduction).slice(0, 60);
    const text = boundedText(`${introduction ? `${introduction} ` : ''}${summary ? `${headline} ${summary}` : title}`);
    const chunks = chunkText(text);
    const inventory = availableVoices(synthesis);
    const choices = englishVoices(inventory);
    let voice = choices.find(candidate => candidate.default) || choices.find(candidate => candidate.localService) || choices[0];
    const failedVoices = new Set();
    diagnose('voices', { voices: inventory.map(voiceInfo) });

    function retryChunk(index, failedVoice, reason = 'ended-before-start') {
      failedVoices.add(voiceKey(failedVoice));
      // A Windows voice can report end without ever starting. Retry the same
      // text with a distinct voice, favoring Chrome's Google voices over another
      // local Windows voice. A successful fallback remains selected for the rest.
      const candidates = englishVoices(availableVoices(synthesis))
        .filter(candidate => !failedVoices.has(voiceKey(candidate)))
        .sort((a, b) => retryVoicePriority(a) - retryVoicePriority(b));
      if (!candidates.length) {
        diagnose('unavailable', { reason, failedVoices: [...failedVoices] });
        settle(token, 'Your browser’s voices couldn’t start read aloud. Check its audio settings or try another browser.');
        return false;
      }
      voice = candidates[0];
      diagnose('fallback', { reason, chunk: index + 1, failedVoice: voiceInfo(failedVoice), nextVoice: voiceInfo(voice) });
      return speakChunk(index);
    }

    function speakChunk(index) {
      if (disposed || token !== requestToken) return false;
      if (index >= chunks.length) {
        settle(token);
        if (typeof onComplete === 'function') onComplete(article?.id);
        return true;
      }
      try {
        const utterance = new Utterance(chunks[index]);
        utterance.rate = Math.max(0.75, Math.min(1.5, Number(options.rate) || 1));
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        }
        currentUtterance = utterance; // Keep a reference until this chunk completes.
        const isCurrent = () => !disposed && token === requestToken && currentUtterance === utterance;
        const utteranceVoice = voice;
        let started = false;
        const chunkDetails = { chunk: index + 1, chunks: chunks.length, textLength: chunks[index].length, voice: voice?.name || 'browser-default' };
        utterance.onstart = event => {
          if (!isCurrent()) return;
          started = true;
          diagnose('start', { ...chunkDetails, elapsedTime: event?.elapsedTime });
        };
        utterance.onend = event => {
          if (!isCurrent()) return;
          diagnose('end', { ...chunkDetails, started, elapsedTime: event?.elapsedTime, charIndex: event?.charIndex });
          detachUtterance();
          if (!started) retryChunk(index, utteranceVoice);
          else speakChunk(index + 1);
        };
        utterance.onerror = event => {
          if (!isCurrent()) return;
          diagnose('error', { ...chunkDetails, error: event?.error || 'unknown', elapsedTime: event?.elapsedTime, charIndex: event?.charIndex });
          const voiceFailed = ['voice-unavailable', 'language-unavailable', 'synthesis-failed', 'synthesis-unavailable'].includes(event?.error);
          if (!started && voiceFailed) {
            detachUtterance();
            retryChunk(index, utteranceVoice, event.error);
            return;
          }
          // Our stop/switch paths invalidate this handler before canceling. Any
          // current cancellation is therefore a browser failure worth reporting.
          settle(token, playbackError(event?.error));
        };
        diagnose('queued', chunkDetails);
        synthesis.speak(utterance);
        if (isCurrent() && typeof synthesis.resume === 'function') {
          // Chromium can expose paused=false while its shared native controller
          // remains paused. Resume after queuing without trusting that flag.
          // https://issues.chromium.org/issues/41281349
          try {
            diagnose('resume', chunkDetails);
            synthesis.resume();
          } catch {
            // An optional resume failure must not cancel speech already queued.
            diagnose('resume-error', chunkDetails);
          }
        }
        return token === requestToken;
      } catch {
        settle(token, playbackError());
        return false;
      }
    }

    emitState({ articleId: article?.id ?? null, mode: selectedMode, status: 'speaking' });
    return speakChunk(0);
  }

  function stop() {
    if (disposed) return;
    requestToken += 1; // Invalidate old callbacks before cancel() can fire them.
    diagnose('stop');
    try {
      cancelQueue('stop');
    } catch {
      reportError('Your browser couldn’t stop read aloud. Check its audio controls.');
    } finally {
      emitState(idleState());
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    requestToken += 1;
    diagnose('dispose');
    try {
      cancelQueue('dispose');
    } catch {
      // Cleanup must remain safe when the browser audio service has gone away.
    }
    emitState(idleState());
  }

  return { supported, read, stop, dispose, getState: () => ({ ...state }) };
}
