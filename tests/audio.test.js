import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio/audio.js';

function deferredContext() {
  const oscillators = [];
  const gains = [];
  const param = () => ({ value: 1, events: [],
    setValueAtTime(value, at) { this.events.push(['set', value, at]); },
    exponentialRampToValueAtTime(value, at) { this.events.push(['exp', value, at]); },
    linearRampToValueAtTime(value, at) { this.events.push(['linear', value, at]); },
    cancelScheduledValues(at) { this.events.push(['cancel', at]); },
  });
  let resolveResume, resumeCount = 0;
  class Context {
    state = 'suspended'; currentTime = 1; destination = {};
    constructor() { mock.context = this; }
    createGain() { const node = { gain: param(), connect() {}, disconnect() {} }; gains.push(node); return node; }
    createOscillator() {
      const node = { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; } };
      oscillators.push(node); return node;
    }
    resume() { resumeCount++; return new Promise(resolve => { resolveResume = () => { this.state = 'running'; resolve(); }; }); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  const mock = { Context, oscillators, gains, resume: () => resolveResume(), resumeCount: () => resumeCount };
  return mock;
}
test('first-gesture effects survive delayed audio resume without duplicate activation', async () => {
  const mock = deferredContext(); globalThis.window = { AudioContext: mock.Context };
  const audio = createAudio(); audio.setPlaying(true);
  const unlock = audio.unlock(); const second = audio.unlock();
  assert.equal(unlock, second); assert.equal(mock.resumeCount(), 1);
  audio.consume([{ type: 'flap', runId: 2 }]);
  assert.equal(mock.oscillators.length, 0);
  mock.resume(); await unlock;
  assert.equal(mock.oscillators.length, 2);
  audio.dispose(); delete globalThis.window;
});

test('jump uses smooth sine notes with silent endpoints and bounded rapid-tap stacking', async () => {
  const mock = deferredContext(); globalThis.window = { AudioContext: mock.Context };
  const audio = createAudio();
  try {
    const ready = audio.unlock(); mock.resume(); await ready;
    audio.consume([{ type: 'flap' }]);
    assert.deepEqual(mock.oscillators.map(node => node.type), ['sine', 'sine']);
    for (const { gain } of mock.gains.slice(1)) {
      assert.equal(gain.events[0][1], 0, 'attack begins at silence');
      assert.equal(gain.events.at(-1)[1], 0, 'release reaches true silence before stop');
      assert.equal(gain.events.at(-1)[0], 'linear');
    }
    for (let i = 0; i < 30; i++) audio.consume([{ type: 'flap' }]);
    assert.equal(mock.oscillators.length, 2);
    mock.context.currentTime += .05;
    audio.consume([{ type: 'flap' }]);
    assert.equal(mock.oscillators.length, 4);
    audio.setMuted(false, false);
    assert.ok(mock.gains[0].gain.events.some(e => e[0] === 'linear' && e[1] === 0));
    assert.ok(mock.gains[1].gain.events.some(e => e[0] === 'cancel'), 'older mobile hold fallback is supported');
    audio.consume([{ type: 'flap' }]);
    assert.equal(mock.oscillators.length, 4);
  } finally { audio.dispose(); delete globalThis.window; }
});
test('pause, platform mute and a quick new run discard deferred old sounds', async () => {
  for (const cancel of [a => a.setPlaying(false), a => a.setMuted(true, true), a => { a.setPlaying(false); a.setPlaying(true); }]) {
    const mock = deferredContext(); globalThis.window = { AudioContext: mock.Context };
    const audio = createAudio(); audio.setPlaying(true);
    const unlock = audio.unlock(); audio.consume([{ type: 'gameover', runId: 2 }]);
    cancel(audio); mock.resume(); await unlock;
    assert.equal(mock.oscillators.length, 0);
    audio.dispose(); delete globalThis.window;
  }
});

test('ordinary gate scores are silent; perfect gate plays its unique two-note confirmation', async () => {
  const mock = deferredContext(); globalThis.window = { AudioContext: mock.Context };
  const audio = createAudio();
  try {
    const ready = audio.unlock(); mock.resume(); await ready;
    audio.consume([{ type: 'score', score: 1, perfect: false, combo: 0 }]);
    audio.consume([{ type: 'score', score: 2, perfect: true, combo: 1 }]);
    assert.equal(mock.oscillators.length, 0, 'passing a gate does not create a score sound');
    audio.consume([{ type: 'perfect', combo: 1 }]);
    assert.equal(mock.oscillators.length, 2, 'perfect gate plays two distinctive tones');
    audio.consume([{ type: 'rush-start', seconds: 2.8 }]);
    assert.equal(mock.oscillators.length, 6, 'third perfect still gets rush activation music');
    audio.setMuted(true, true);
    audio.consume([{ type: 'perfect', combo: 4 }]);
    assert.equal(mock.oscillators.length, 6, 'CrazyGames platform mute wins');
  } finally {
    audio.dispose(); delete globalThis.window;
  }
});
