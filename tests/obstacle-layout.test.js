import test from 'node:test';
import assert from 'node:assert/strict';
import { obstacleLayout } from '../src/render/obstacle-layout.js';

test('both shafts end inside the opaque root, never midway through the crown', () => {
  for (const centerY of [-3.4, 0, 3.4]) for (const gap of [2.93, 3.55]) {
    for (let phase = 0; phase < 20; phase += .17) {
      const height = 1.48 * (.99 + .01 * Math.sin(phase));
      const { bottom, top } = obstacleLayout({ centerY, gap }, height);
      const bottomRoot = bottom.capY - height / 2, topRoot = top.capY + height / 2;
      const bottomOverlap = (bottom.stemY + bottom.stemHeight / 2 - bottomRoot) / height * 150;
      const topOverlap = (topRoot - (top.stemY - top.stemHeight / 2)) / height * 150;
      for (const overlap of [bottomOverlap, topOverlap]) assert.ok(overlap > 7.99 && overlap < 8.01);
      assert.ok(Math.abs(bottom.stemY - bottom.stemHeight / 2 + 9) < 1e-10);
      assert.ok(Math.abs(top.stemY + top.stemHeight / 2 - 9) < 1e-10);
      assert.ok(Math.abs(bottom.capY + height / 2 - height * 5 / 150 - (centerY - gap / 2)) < 1e-10);
      assert.ok(Math.abs(top.capY - height / 2 + height * 5 / 150 - (centerY + gap / 2)) < 1e-10);
    }
  }
});

test('fire and reduced-motion caps keep the same opaque joins when a gate moves', () => {
  for (const centerY of [-3, 0, 3]) {
    const { bottom, top } = obstacleLayout({ centerY, gap: 3.55 }, 1.48);
    const b = bottom.stemY + bottom.stemHeight / 2, t = top.stemY - top.stemHeight / 2;
    assert.ok(b < centerY - 3.55 / 2 - 1.3);
    assert.ok(t > centerY + 3.55 / 2 + 1.3);
    assert.ok(bottom.stemHeight > 0 && top.stemHeight > 0);
  }
});
