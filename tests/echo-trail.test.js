import test from 'node:test';
import assert from 'node:assert/strict';
import { createEchoTrail } from '../src/render/echo-trail.js';

const pose = Object.freeze({ x: -1.72, y: 2.25, angle: .3, scaleX: 1.1, scaleY: .9, texture: 'beetle-flap' });

test('third-perfect rush starts a bounded reusable ghost trail which follows the flight pose', () => {
  const trail = createEchoTrail();
  assert.equal(trail.echoes.length, 10);
  trail.step(1/60, false, pose);
  assert.ok(trail.echoes.every(e => e.life === 0));
  trail.step(1/60, true, pose);
  const first = trail.echoes[0];
  assert.equal(first.life, trail.lifetime);
  assert.equal(first.y, pose.y);
  assert.equal(first.texture, 'beetle-flap');
  const sameObjects = [...trail.echoes];
  for (let i = 0; i < 180; i++) {
    trail.step(1/60, true, { ...pose, y: i / 100 });
  }
  assert.deepEqual(trail.echoes, sameObjects);
  assert.ok(trail.echoes.some(e => e.life > 0 && e.y !== pose.y));
  assert.ok(trail.echoes.every(e => e.life >= 0 && e.life <= trail.lifetime));
  assert.ok(trail.echoes.filter(e => e.life > 0).length <= 10);
});
test('ghost trail freezes when paused, fades after rush, and clears on retry', () => {
  const trail = createEchoTrail({ capacity: 3, interval: .1, lifetime: .5, drift: 2 });
  trail.step(.016, true, pose);
  const firstLife = trail.echoes[0].life;
  const firstX = trail.echoes[0].x;
  trail.step(0, true, pose);
  assert.equal(trail.echoes[0].life, firstLife);
  assert.equal(trail.echoes[0].x, firstX);
  trail.step(.1, false, pose);
  assert.ok(trail.echoes[0].life < firstLife);
  assert.ok(trail.echoes[0].x < firstX);
  trail.step(.6, false, pose);
  assert.ok(trail.echoes.every(e => e.life === 0));
  trail.step(.016, true, pose);
  assert.ok(trail.echoes.some(e => e.life > 0));
  trail.reset();
  assert.ok(trail.echoes.every(e => e.life === 0 && e.texture === null));
  assert.throws(() => trail.step(-.1, true, pose), RangeError);
});
