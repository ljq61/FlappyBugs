import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlameGeometry, deformFlame } from '../src/render/flame.js';

test('both flame directions stay inside the original cap and keep their roots fixed', () => {
  const geometry = createFlameGeometry();
  const p = geometry.attributes.position;
  for (const direction of [-1, 1]) {
    for (let time = 0; time < 20; time += .13) {
      deformFlame(geometry, time, direction, 1.7);
      for (let i = 0; i < p.count; i++) {
        assert.ok(Math.abs(p.getX(i)) <= .500001);
        assert.ok(Math.abs(p.getY(i)) <= .500001);
        const restY = geometry.userData.restPositions[i * 3 + 1];
        if (direction * restY === -.5) {
          assert.equal(p.getX(i), geometry.userData.restPositions[i * 3]);
          assert.equal(p.getY(i), restY);
        }
      }
    }
  }
  geometry.dispose();
});

test('flame curls vary along its height, freeze at the same time, and respect reduced motion', () => {
  const geometry = createFlameGeometry();
  deformFlame(geometry, .4);
  const frame = geometry.attributes.position.array.slice();
  deformFlame(geometry, .4);
  assert.deepEqual(geometry.attributes.position.array, frame);
  deformFlame(geometry, .9);
  assert.notDeepEqual(geometry.attributes.position.array, frame);
  const p = geometry.attributes.position;
  const centerOffsets = [];
  for (let i = 0; i < p.count; i++) {
    if (geometry.userData.restPositions[i * 3] === 0) centerOffsets.push(p.getX(i));
  }
  assert.ok(new Set(centerOffsets).size > 3, 'curl must bend the shape rather than translate it');
  deformFlame(geometry, 4, 1, 0, true);
  assert.deepEqual(p.array, geometry.userData.restPositions);
  deformFlame(geometry, 9, -1, 2, true);
  assert.deepEqual(p.array, geometry.userData.restPositions);
  geometry.dispose();
});
