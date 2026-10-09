import test from 'node:test';
import assert from 'node:assert/strict';
import { SKINS, TRAILS, isUnlocked, unlockProgress, available, selected, cycle, nextUnlock } from '../src/game/unlocks.js';

for (const item of [...SKINS, ...TRAILS].filter(item => item.need > 0)) {
  test(`${item.id} unlocks only at its own ${item.metric} threshold`, () => {
    for (const offset of [-1, 0, 1]) {
      const progress = { best: 0, bestCombo: 0, totalPassed: 0, [item.metric]: item.need + offset };
      assert.equal(isUnlocked(item, progress), offset >= 0);
      assert.equal(available([item], progress).length, offset >= 0 ? 1 : 0);
    }
    assert.equal(isUnlocked(item, { best: 1000, bestCombo: 1000, totalPassed: 1000, [item.metric]: 0 }), false);
  });
}
test('default looks, earned rotation and saved selections use progress', () => {
  assert.deepEqual(available(SKINS, {}).map(item => item.id), ['classic']);
  assert.deepEqual(available(TRAILS, {}).map(item => item.id), ['cloud']);
  assert.equal(cycle(SKINS, 'classic', {}).id, 'classic');
  const progress = { best: 30, bestCombo: 10, totalPassed: 200 };
  assert.deepEqual(available(SKINS, progress).map(item => item.id), ['classic', 'sunset', 'mint']);
  assert.equal(cycle(SKINS, 'classic', progress).id, 'sunset');
  assert.equal(cycle(SKINS, 'mint', progress).id, 'classic');
  assert.equal(cycle(SKINS, 'honey', progress).id, 'classic');
  assert.equal(selected(SKINS, 'honey', progress).id, 'classic');
  assert.equal(selected(SKINS, 'missing', progress).id, 'classic');
  assert.equal(selected(TRAILS, 'stardust', progress).id, 'cloud');
  assert.equal(selected(TRAILS, 'sunny', progress).name, 'Star');
  assert.equal(cycle(TRAILS, 'cloud', progress).id, 'sunny');
  assert.equal(cycle(TRAILS, 'sunny', progress).id, 'cloud');
  assert.equal(nextUnlock(SKINS, progress).id, 'blue');
  assert.equal(nextUnlock(TRAILS, progress).id, 'stardust');
});
test('all conditions satisfied exposes every cosmetic', () => {
  const progress = { best: 70, bestCombo: 20, totalPassed: 1000 };
  assert.equal(available(SKINS, progress).length, 6);
  assert.equal(available(TRAILS, progress).length, 3);
  assert.equal(nextUnlock(SKINS, progress), null);
  assert.equal(nextUnlock(TRAILS, progress), null);
});
test('unlock progress rejects invalid values and caps its display ratio', () => {
  const star = TRAILS.find(item => item.id === 'sunny');
  for (const value of [undefined, null, -1, NaN, Infinity, -Infinity, '10', {}, []]) {
    assert.equal(isUnlocked(star, { bestCombo: value }), false);
    assert.deepEqual(unlockProgress(star, { bestCombo: value }), { current: 0, target: 10, ratio: 0 });
  }
  for (const progress of [undefined, null, 0, '10', NaN]) assert.equal(isUnlocked(star, progress), false);
  assert.deepEqual(unlockProgress(star, { bestCombo: 9.9 }), { current: 9, target: 10, ratio: 9 / 10 });
  assert.deepEqual(unlockProgress(star, { bestCombo: 99 }), { current: 10, target: 10, ratio: 1 });
  assert.deepEqual(unlockProgress(SKINS[0], undefined), { current: 0, target: 0, ratio: 1 });
  assert.deepEqual(unlockProgress(TRAILS[0], null), { current: 0, target: 0, ratio: 1 });
});
