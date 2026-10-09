import test from 'node:test';
import assert from 'node:assert/strict';
import { createStardustBurst, createStarBurst, stardustAppearance, MAX_STARDUST_PARTICLES } from '../src/render/stardust.js';

test('stardust is a backwards, colorful, bounded glitter burst rather than tinted smoke', () => {
  const particles = createStardustBurst(-1.72, -.25);
  assert.ok(particles.length >= 11);
  assert.ok(MAX_STARDUST_PARTICLES >= particles.length);
  assert.ok(new Set(particles.map(p => p.color)).size >= 4);
  assert.ok(particles.every(p => p.x < -1.72 && p.vx < 0 && p.duration > 0));
  assert.ok(new Set(particles.map(p => p.size)).size >= 3);
  assert.ok(createStardustBurst(-1.72, -.25, { reducedMotion: true }).length < particles.length);
  assert.deepEqual(createStardustBurst(-1.72, -.25), particles);
  assert.throws(() => createStardustBurst(Infinity, 0), TypeError);
});

test('star particles visibly twinkle over time and fade with reduced-motion support', () => {
  const duration = .7, phase = .8;
  const samples = Array.from({ length: 40 }, (_, i) => stardustAppearance(i * .012, duration, phase));
  assert.ok(samples.every(v => v.opacity > 0 && v.opacity <= 1 && v.scale > 0));
  assert.ok(Math.max(...samples.map(v => v.opacity)) > Math.min(...samples.slice(0, 14).map(v => v.opacity)) * 1.2);
  assert.ok(stardustAppearance(duration * .9, duration, phase).opacity < .2);
  assert.equal(stardustAppearance(duration, duration, phase).opacity, 0);
  assert.equal(stardustAppearance(duration * 2, duration, phase).opacity, 0);
  assert.equal(stardustAppearance(.15, duration, phase, true).opacity,
    stardustAppearance(.15, duration, phase + 7, true).opacity);
  assert.throws(() => stardustAppearance(1, 0, 0), RangeError);
});

test('Star emits visible gold stars while Stardust keeps a distinct larger sparkling burst', () => {
  const stars = createStarBurst(0, 0), dust = createStardustBurst(0, 0);
  assert.ok(stars.length < dust.length);
  assert.ok(stars.every(p => p.size >= .3 && p.duration >= .75 && p.vx < 0));
  assert.ok(dust.every(p => p.size >= .28 && p.duration >= .78));
  assert.ok(stars.every(p => ['#ffdd71', '#fff3b4'].includes(p.color)));
  assert.ok(createStarBurst(0, 0, { reducedMotion: true }).length < stars.length);
});
