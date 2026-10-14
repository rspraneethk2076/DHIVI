import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpeechReader } from '../src/speech-reader.mjs';

const idle = { articleId: null, mode: null, status: 'idle' };
const article = (overrides = {}) => ({ id: 'story-1', title: 'A new AI model arrives', summary: 'The publisher reports a new reasoning model. Its evaluation is available today.', source: 'Research Wire', ...overrides });

function harness({ voices = [], speak, cancel, Utterance } = {}) {
  const spoken = [], states = [], errors = [];
  const synthesis = {
    cancelCount: 0,
    getVoices: () => voices,
    speak(utterance) { spoken.push(utterance); speak?.(utterance); },
    cancel() { this.cancelCount += 1; cancel?.(spoken.at(-1)); },
  };
  class MockUtterance {
    constructor(text) { this.text = text; this.onend = null; this.onerror = null; }
  }
  const reader = createSpeechReader({ synthesis, Utterance: Utterance || MockUtterance, onState: next => states.push(next), onError: message => errors.push(message) });
  const finish = () => {
    const utterance = spoken.at(-1);
    utterance?.onstart?.({ elapsedTime: 0 });
    utterance?.onend?.({ elapsedTime: 3, charIndex: utterance.text.length });
  };
  const fail = error => spoken.at(-1)?.onerror?.({ error });
  const drain = () => {
    let calls = 0;
    while (reader.getState().status === 'speaking') {
      assert.ok(calls++ < 100, 'speech should finish after a bounded number of chunks');
      finish();
    }
  };
  return { reader, synthesis, spoken, states, errors, finish, fail, drain };
}

test('construction is idle and never starts speech or cancels browser audio', () => {
  const h = harness();
  assert.equal(h.reader.supported, true);
  assert.deepEqual(h.reader.getState(), idle);
  assert.deepEqual(h.spoken, []);
  assert.deepEqual(h.states, []);
  assert.equal(h.synthesis.cancelCount, 0);
});

test('headline mode reads the actual title and excludes the publisher summary', () => {
  const h = harness();
  assert.equal(h.reader.read(article(), 'headline'), true);
  assert.equal(h.spoken[0].text, article().title);
  assert.deepEqual(h.reader.getState(), { articleId: 'story-1', mode: 'headline', status: 'speaking' });
  assert.equal(h.synthesis.cancelCount, 1);
  h.finish();
  assert.deepEqual(h.reader.getState(), idle);
  assert.deepEqual(h.states.map(state => state.status), ['speaking', 'idle']);
});

test('summary mode reads only the headline and existing publisher excerpt', () => {
  const h = harness();
  h.reader.read(article());
  assert.equal(h.spoken[0].text, `${article().title}. ${article().summary}`);
  assert.deepEqual(h.reader.getState(), { articleId: 'story-1', mode: 'summary', status: 'speaking' });
  h.drain();
  assert.deepEqual(h.errors, []);
});

test('an absent or malformed summary falls back to the actual headline without inventing text', () => {
  for (const summary of ['', '   ', undefined, null, { toString: 1 }]) {
    const h = harness();
    h.reader.read(article({ summary }));
    assert.equal(h.spoken[0].text, article().title);
    h.drain();
    assert.deepEqual(h.errors, []);
  }
});

test('summary punctuation and whitespace are normalized without duplicate sentence punctuation', () => {
  const h = harness();
  h.reader.read(article({ title: '  A new\nmodel arrives!  ', summary: '  Existing\n publisher excerpt.  ' }));
  assert.equal(h.spoken[0].text, 'A new model arrives! Existing publisher excerpt.');
});

test('empty titles are rejected, stop prior speech, and never read the summary alone', () => {
  for (const title of ['', ' \n ', undefined, null, 3, { toString: 1 }]) {
    const h = harness();
    h.reader.read(article());
    assert.equal(h.reader.read(article({ title })), false);
    assert.equal(h.spoken.length, 1);
    assert.deepEqual(h.reader.getState(), idle);
    assert.match(h.errors[0], /no headline/i);
    assert.equal(h.synthesis.cancelCount, 2);
  }
});

test('speech stays active across sentence chunks and resumes scrolling only after the final chunk', () => {
  const h = harness();
  const summary = 'This is a detailed publisher sentence about its research results and evaluation. '.repeat(8).trim();
  h.reader.read(article({ summary }));
  assert.equal(h.spoken.length, 1, 'only one utterance is queued at a time');
  h.finish();
  assert.equal(h.spoken.length, 2);
  assert.equal(h.reader.getState().status, 'speaking');
  assert.deepEqual(h.states.map(state => state.status), ['speaking']);
  h.drain();
  assert.ok(h.spoken.length > 2);
  assert.ok(h.spoken.every(utterance => utterance.text.length <= 200));
  assert.equal(h.spoken.map(utterance => utterance.text).join(' '), `${article().title}. ${summary}`);
  assert.deepEqual(h.states.map(state => state.status), ['speaking', 'idle']);
});

test('large publisher text is bounded to 1600 characters with short word-bounded utterances', () => {
  const h = harness();
  h.reader.read(article({ summary: 'A publisher reports measured benchmark results in a technical evaluation. '.repeat(100) }));
  h.drain();
  const text = h.spoken.map(utterance => utterance.text).join(' ');
  assert.ok(text.length <= 1600);
  assert.ok(text.endsWith('…'));
  assert.ok(h.spoken.every(utterance => utterance.text.length <= 200 && utterance.text === utterance.text.trim()));
});

test('unbroken text and a long sentence still use bounded chunks and finish', () => {
  const h = harness();
  h.reader.read(article({ title: 'x'.repeat(2000), summary: '' }), 'headline');
  h.drain();
  assert.ok(h.spoken.every(utterance => utterance.text.length <= 200));
  assert.equal(h.spoken.map(utterance => utterance.text).join('').length, 1600);
});

test('an available English voice is preferred and its language is applied', () => {
  const french = { name: 'French default', lang: 'fr-FR', default: true };
  const english = { name: 'English local', lang: 'en-US', localService: true };
  const h = harness({ voices: [french, english] });
  h.reader.read(article());
  assert.equal(h.spoken[0].voice, english);
  assert.equal(h.spoken[0].lang, 'en-US');
});

test('an English default is preferred; no available English voice leaves browser defaults intact', () => {
  const english = { name: 'English default', lang: 'en-GB', default: true };
  const h = harness({ voices: [{ lang: 'en-US', localService: true }, english] });
  h.reader.read(article());
  assert.equal(h.spoken[0].voice, english);
  for (const voices of [[], [{ lang: 'fr-FR', default: true }]]) {
    const other = harness({ voices });
    other.reader.read(article());
    assert.equal(other.spoken[0].voice, undefined);
    assert.equal(other.spoken[0].lang, undefined);
  }
});

test('voices that load later are discovered on the next playback; voice lookup failure uses defaults', () => {
  const h = harness();
  h.synthesis.getVoices = () => { throw new Error('not loaded'); };
  assert.equal(h.reader.read(article()), true);
  assert.equal(h.spoken[0].voice, undefined);
  const voice = { lang: 'en-US' };
  h.synthesis.getVoices = () => [voice];
  h.reader.read(article({ id: 'new-story' }));
  assert.equal(h.spoken.at(-1).voice, voice);
  assert.deepEqual(h.errors, []);
});

test('stop cancels speech, releases the pause state, and ignores saved stale callbacks', () => {
  const h = harness();
  h.reader.read(article());
  const oldEnd = h.spoken[0].onend, oldError = h.spoken[0].onerror;
  h.reader.stop();
  assert.deepEqual(h.reader.getState(), idle);
  assert.equal(h.synthesis.cancelCount, 2);
  oldEnd();
  oldError({ error: 'audio-hardware' });
  assert.equal(h.spoken.length, 1);
  assert.deepEqual(h.errors, []);
  assert.deepEqual(h.states.map(state => state.status), ['speaking', 'idle']);
});

test('switching articles and modes invalidates old events before synchronous cancellation fires', () => {
  const h = harness({ cancel: utterance => utterance?.onerror?.({ error: 'interrupted' }) });
  h.reader.read(article());
  const oldEnd = h.spoken[0].onend, oldError = h.spoken[0].onerror;
  h.reader.read(article({ id: 'story-2', title: 'Second headline' }), 'headline');
  oldEnd();
  oldError({ error: 'synthesis-failed' });
  assert.equal(h.spoken.length, 2);
  assert.equal(h.spoken[1].text, 'Second headline');
  assert.deepEqual(h.reader.getState(), { articleId: 'story-2', mode: 'headline', status: 'speaking' });
  assert.deepEqual(h.errors, []);
  assert.deepEqual(h.states.map(state => state.status), ['speaking', 'speaking']);
  h.finish();
  assert.deepEqual(h.reader.getState(), idle);
});

test('duplicate chunk completion cannot skip or start additional chunks', () => {
  const h = harness();
  h.reader.read(article({ summary: 'A long sentence reports a detailed independent evaluation with public results. '.repeat(8) }));
  const oldEnd = h.spoken[0].onend;
  h.spoken[0].onstart({ elapsedTime: 0 });
  oldEnd();
  assert.equal(h.spoken.length, 2);
  oldEnd();
  assert.equal(h.spoken.length, 2);
  h.drain();
  assert.deepEqual(h.errors, []);
});

test('audio failures release scrolling, report a friendly error, and discard stale completion', () => {
  const h = harness();
  h.reader.read(article({ summary: 'A long detailed research result from the publisher. '.repeat(12) }));
  const oldEnd = h.spoken[0].onend, oldError = h.spoken[0].onerror;
  h.fail('audio-hardware');
  assert.deepEqual(h.reader.getState(), idle);
  assert.match(h.errors[0], /audio.*speakers/i);
  oldEnd();
  oldError({ error: 'network' });
  assert.equal(h.spoken.length, 1);
  assert.equal(h.errors.length, 1);
  assert.deepEqual(h.states.map(state => state.status), ['speaking', 'idle']);
});

test('unexpected browser cancellation is reported while intentional cancellation stays silent', () => {
  for (const code of ['canceled', 'interrupted']) {
    const h = harness();
    h.reader.read(article());
    h.fail(code);
    assert.deepEqual(h.reader.getState(), idle);
    assert.match(h.errors[0], /interrupted.*Tap Listen/i);
  }
  const h = harness();
  h.reader.read(article());
  h.fail('not-allowed');
  assert.deepEqual(h.reader.getState(), idle);
  assert.match(h.errors[0], /blocked.*Tap Listen/i);
});

test('optional diagnostics distinguish native end/error from explicit stop/dispose', () => {
  const events = [], spoken = [];
  const reader = createSpeechReader({
    synthesis: { speaking: false, pending: false, paused: false, cancel() {}, speak: value => spoken.push(value), getVoices: () => [{ name: 'Local English', lang: 'en-US' }] },
    Utterance: class { constructor(text) { this.text = text; } },
    onEvent: event => events.push(event),
  });
  reader.read(article(), 'headline');
  spoken[0].onstart({ elapsedTime: 0 });
  spoken[0].onend({ elapsedTime: 3.5, charIndex: article().title.length });
  assert.deepEqual(events.map(event => event.type), ['read', 'cancel', 'voices', 'queued', 'start', 'end']);
  assert.equal(events[1].reason, 'replace');
  assert.equal(events[5].elapsedTime, 3.5);
  assert.equal(events[5].voice, 'Local English');
  reader.read(article());
  spoken[1].onerror({ error: 'interrupted', elapsedTime: 0.01 });
  assert.equal(events.at(-1).type, 'error');
  assert.equal(events.at(-1).error, 'interrupted');
  reader.read(article());
  reader.stop();
  assert.deepEqual(events.slice(-2).map(event => event.type), ['stop', 'cancel']);
  assert.equal(events.at(-1).reason, 'stop');
  reader.dispose();
  assert.deepEqual(events.slice(-2).map(event => event.type), ['dispose', 'cancel']);
  assert.equal(events.at(-1).reason, 'dispose');
});

test('a failing diagnostic callback cannot prevent playback', () => {
  const spoken = [];
  const reader = createSpeechReader({ synthesis: { cancel() {}, speak: value => spoken.push(value) }, Utterance: class { constructor(text) { this.text = text; } }, onEvent() { throw new Error('debug consumer failed'); } });
  assert.equal(reader.read(article()), true);
  spoken[0].onstart({});
  spoken[0].onend({});
  assert.deepEqual(reader.getState(), idle);
});

test('a silent Windows voice retries the same chunk with a Google voice before another local voice', () => {
  const windows = { name: 'Microsoft David', lang: 'en-US', localService: true, default: true };
  const anotherLocal = { name: 'Microsoft Zira', lang: 'en-US', localService: true };
  const google = { name: 'Google US English', lang: 'en-US', localService: false };
  const h = harness({ voices: [windows, anotherLocal, google] });
  h.reader.read(article({ summary: 'A publisher reports independent evaluation results and detailed research. '.repeat(7) }));
  const first = h.spoken[0];
  const oldEnd = first.onend;
  assert.equal(first.voice, windows);
  first.onend({ elapsedTime: 93.6, charIndex: 0 });
  assert.equal(h.spoken.length, 2);
  assert.equal(h.spoken[1].text, first.text, 'failed text is retried rather than skipped');
  assert.equal(h.spoken[1].voice, google);
  assert.equal(h.reader.getState().status, 'speaking');
  assert.deepEqual(h.states.map(state => state.status), ['speaking']);
  oldEnd({ charIndex: 0 });
  assert.equal(h.spoken.length, 2, 'a stale native end cannot trigger another retry');
  h.finish();
  assert.equal(h.spoken[2].voice, google, 'the working voice is reused on later chunks');
  h.drain();
  assert.deepEqual(h.errors, []);
  assert.deepEqual(h.states.map(state => state.status), ['speaking', 'idle']);
});

test('all voices ending without start stops with an honest error instead of fake playback', () => {
  const voices = [
    { name: 'Microsoft David', lang: 'en-US', localService: true, default: true },
    { name: 'Microsoft Zira', lang: 'en-US', localService: true },
    { name: 'Google US English', lang: 'en-US', localService: false },
    { name: 'French', lang: 'fr-FR', localService: false },
  ];
  const h = harness({ voices });
  h.reader.read(article(), 'headline');
  for (let i = 0; i < 3; i++) h.spoken.at(-1).onend({ elapsedTime: 0.1, charIndex: 0 });
  assert.equal(h.spoken.length, 3);
  assert.deepEqual(h.spoken.map(value => value.voice.name), ['Microsoft David', 'Google US English', 'Microsoft Zira']);
  assert.ok(h.spoken.every(value => value.text === article().title));
  assert.deepEqual(h.reader.getState(), idle);
  assert.equal(h.errors.length, 1);
  assert.match(h.errors[0], /voices couldn’t start.*audio settings/i);
});

test('a silent browser-default voice discovers English voices that became available', () => {
  const h = harness();
  h.reader.read(article(), 'headline');
  assert.equal(h.spoken[0].voice, undefined);
  const voice = { name: 'Google US English', lang: 'en-US', localService: false };
  h.synthesis.getVoices = () => [voice];
  h.spoken[0].onend({ charIndex: 0 });
  assert.equal(h.spoken[1].voice, voice);
  h.finish();
  assert.deepEqual(h.reader.getState(), idle);
  assert.deepEqual(h.errors, []);
});

test('without any available voice, a native end before start produces a useful error', () => {
  const h = harness();
  h.reader.read(article());
  h.spoken[0].onend({ elapsedTime: 0, charIndex: 0 });
  assert.deepEqual(h.reader.getState(), idle);
  assert.equal(h.spoken.length, 1);
  assert.match(h.errors[0], /voices couldn’t start/i);
});

test('clear voice-service errors before start retry another English voice', () => {
  for (const error of ['voice-unavailable', 'language-unavailable', 'synthesis-failed', 'synthesis-unavailable']) {
    const primary = { name: 'Microsoft David', lang: 'en-US', localService: true, default: true };
    const fallback = { name: 'Google US English', lang: 'en-US', localService: false };
    const h = harness({ voices: [primary, fallback] });
    h.reader.read(article());
    h.fail(error);
    assert.equal(h.spoken.length, 2, error);
    assert.equal(h.spoken[1].voice, fallback);
    assert.equal(h.spoken[1].text, h.spoken[0].text);
    assert.equal(h.reader.getState().status, 'speaking');
    h.drain();
    assert.deepEqual(h.errors, []);
  }
});

test('permission/audio failures and failures after speech starts do not retry voices', () => {
  const voices = [{ name: 'Microsoft David', lang: 'en-US', localService: true, default: true }, { name: 'Google US English', lang: 'en-US', localService: false }];
  for (const error of ['not-allowed', 'audio-hardware', 'audio-busy', 'network', 'interrupted']) {
    const h = harness({ voices });
    h.reader.read(article());
    h.fail(error);
    assert.equal(h.spoken.length, 1, error);
    assert.deepEqual(h.reader.getState(), idle);
    assert.equal(h.errors.length, 1);
  }
  const h = harness({ voices });
  h.reader.read(article());
  h.spoken[0].onstart({ elapsedTime: 0 });
  h.fail('synthesis-failed');
  assert.equal(h.spoken.length, 1, 'speech that already started must not be repeated');
  assert.deepEqual(h.reader.getState(), idle);
  assert.equal(h.errors.length, 1);
});

test('exhausted voice-service failures report one helpful error and preserve full inventory diagnostics', () => {
  const events = [], errors = [], spoken = [];
  const voices = [{ name: 'Microsoft David', voiceURI: 'local-david', lang: 'en-US', localService: true, default: true }, { name: 'Google US English', voiceURI: 'google-en', lang: 'en-US', localService: false }];
  const reader = createSpeechReader({ synthesis: { cancel() {}, speak: value => spoken.push(value), getVoices: () => voices }, Utterance: class { constructor(text) { this.text = text; } }, onError: value => errors.push(value), onEvent: value => events.push(value) });
  reader.read(article());
  assert.deepEqual(events.find(event => event.type === 'voices').voices, voices.map(value => ({ name: value.name, lang: value.lang, localService: value.localService, default: Boolean(value.default), voiceURI: value.voiceURI })));
  spoken[0].onerror({ error: 'voice-unavailable' });
  spoken[1].onerror({ error: 'synthesis-failed' });
  assert.deepEqual(reader.getState(), idle);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /voices couldn’t start/i);
  assert.equal(events.at(-1).type, 'unavailable');
});

test('resume after speak recovers a native paused controller even when paused reports false', () => {
  const calls = [], errors = [];
  let queued;
  const synthesis = {
    paused: false,
    cancel() { calls.push('cancel'); },
    speak(utterance) { queued = utterance; calls.push('speak'); },
    resume() { calls.push('resume'); queued.onstart({ elapsedTime: 0 }); },
  };
  const reader = createSpeechReader({ synthesis, Utterance: class { constructor(text) { this.text = text; } }, onError: value => errors.push(value) });
  assert.equal(reader.read(article(), 'headline'), true);
  assert.deepEqual(calls, ['cancel', 'speak', 'resume']);
  assert.equal(reader.getState().status, 'speaking');
  queued.onend({ elapsedTime: 4, charIndex: queued.text.length });
  assert.deepEqual(reader.getState(), idle);
  assert.deepEqual(errors, []);
});

test('resume errors leave queued speech active and allow its normal completion', () => {
  let queued;
  const errors = [];
  const reader = createSpeechReader({ synthesis: { cancel() {}, speak: value => { queued = value; }, resume() { throw new Error('resume unavailable'); } }, Utterance: class { constructor(text) { this.text = text; } }, onError: value => errors.push(value) });
  assert.equal(reader.read(article(), 'headline'), true);
  assert.equal(reader.getState().status, 'speaking');
  queued.onstart({});
  queued.onend({ charIndex: queued.text.length });
  assert.deepEqual(reader.getState(), idle);
  assert.deepEqual(errors, []);
});

test('resume is skipped when speech is synchronously stopped or replaced during speak', () => {
  let reader, resumed = 0;
  reader = createSpeechReader({ synthesis: { cancel() {}, speak() { reader.stop(); }, resume() { resumed += 1; } }, Utterance: class { constructor(text) { this.text = text; } } });
  assert.equal(reader.read(article()), false);
  assert.equal(resumed, 0);
  assert.deepEqual(reader.getState(), idle);
});

test('unsupported browsers are safe and surface a useful message only when read is requested', () => {
  for (const options of [{}, { synthesis: { speak() {}, cancel() {} } }, { Utterance: class {} }, { synthesis: { speak() {} }, Utterance: class {} }]) {
    const errors = [], states = [];
    const reader = createSpeechReader({ ...options, onError: value => errors.push(value), onState: value => states.push(value) });
    assert.equal(reader.supported, false);
    assert.deepEqual(errors, []);
    assert.equal(reader.read(article()), false);
    assert.match(errors[0], /isn’t supported/i);
    assert.deepEqual(reader.getState(), idle);
    assert.deepEqual(states, []);
    assert.doesNotThrow(() => { reader.stop(); reader.dispose(); });
  }
});

test('constructor, speak, and cancel exceptions cannot leave a stuck speaking state', () => {
  const variants = [
    { Utterance: class { constructor() { throw new Error('voice service unavailable'); } } },
    { speak() { throw new Error('browser audio failed'); } },
    { cancel() { throw new Error('browser audio unavailable'); } },
  ];
  for (const options of variants) {
    const h = harness(options);
    assert.equal(h.reader.read(article()), false);
    assert.deepEqual(h.reader.getState(), idle);
    assert.equal(h.errors.length, 1);
    assert.match(h.errors[0], /couldn’t play/i);
  }
});

test('dispose cancels once, clears active state, ignores later events, and never starts again', () => {
  const h = harness();
  h.reader.read(article());
  const oldEnd = h.spoken[0].onend, oldError = h.spoken[0].onerror;
  h.reader.dispose();
  assert.deepEqual(h.reader.getState(), idle);
  assert.equal(h.synthesis.cancelCount, 2);
  assert.equal(h.spoken[0].onend, null);
  assert.equal(h.spoken[0].onerror, null);
  oldEnd();
  oldError({ error: 'synthesis-failed' });
  h.reader.stop();
  h.reader.dispose();
  assert.equal(h.reader.read(article()), false);
  assert.equal(h.synthesis.cancelCount, 2);
  assert.equal(h.spoken.length, 1);
  assert.deepEqual(h.errors, []);
});

test('state snapshots cannot mutate the controller and stopping from onState prevents playback', () => {
  const h = harness();
  h.reader.read(article());
  h.reader.getState().status = 'idle';
  h.states[0].articleId = 'mutated';
  assert.deepEqual(h.reader.getState(), { articleId: 'story-1', mode: 'summary', status: 'speaking' });
  let calls = 0, reader;
  reader = createSpeechReader({ synthesis: { cancel() {}, speak() { calls += 1; } }, Utterance: class {}, onState: state => { if (state.status === 'speaking') reader.stop(); } });
  assert.equal(reader.read(article()), false);
  assert.equal(calls, 0);
  assert.deepEqual(reader.getState(), idle);
});
