import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio/audio.js';

function deferredContext() {
  const oscillators = [];
  let resolveResume, resumeCount = 0;
  class Context {
    state = 'suspended'; currentTime = 1; destination = {};
    createGain() { return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    createOscillator() {
      const node = { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; } };
      oscillators.push(node); return node;
    }
    resume() { resumeCount++; return new Promise(resolve => { resolveResume = () => { this.state = 'running'; resolve(); }; }); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  return { Context, oscillators, resume: () => resolveResume(), resumeCount: () => resumeCount };
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
