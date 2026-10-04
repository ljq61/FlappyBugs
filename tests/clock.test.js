import test from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../src/game/clock.js';

test('the fixed clock consumes the same simulation steps at different refresh rates', () => {
  for (const hz of [60, 120, 144, 165]) {
    const clock = createClock(); let ticks = 0;
    for (let frame = 0; frame <= hz * 10; frame++) clock.advance(frame * 1000 / hz, () => ticks++);
    assert.equal(ticks, 1200, `${hz} Hz`);
  }
});
test('long stalls and resume discard stale time', () => {
  const clock = createClock(); let ticks = 0;
  clock.advance(0, () => ticks++);
  assert.equal(clock.advance(3000, () => ticks++).interrupted, true);
  assert.equal(ticks, 0);
  clock.reset(); clock.advance(5000, () => ticks++);
  assert.equal(ticks, 0);
  clock.advance(5000 + 1000 / 60, () => ticks++);
  assert.equal(ticks, 2);
});
test('a stale RAF timestamp after gesture activation cannot rewind the baseline', () => {
  const clock = createClock(); let ticks = 0;
  clock.reset(1210);
  assert.deepEqual(clock.advance(1000, () => ticks++), { dt: 0, interrupted: false });
  clock.advance(1210 + 1000 / 60, () => ticks++);
  assert.equal(ticks, 2);
  clock.reset(1210);
  clock.advance(1000, () => ticks++);
  assert.equal(clock.advance(1410, () => ticks++).interrupted, true);
  assert.equal(ticks, 2);
});
