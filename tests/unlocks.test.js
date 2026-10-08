import test from 'node:test';
import assert from 'node:assert/strict';
import { SKINS, TRAILS, available, selected, cycle, nextUnlock } from '../src/game/unlocks.js';

test('earned cosmetic rotation never selects a locked look', () => {
  assert.deepEqual(available(SKINS, 0).map(s => s.id), ['classic']);
  assert.equal(cycle(SKINS, 'classic', 0).id, 'classic');
  assert.equal(cycle(SKINS, 'classic', 3).id, 'sunset');
  assert.equal(cycle(SKINS, 'sunset', 3).id, 'classic');
  assert.equal(selected(SKINS, 'honey', 3).id, 'classic');
  assert.equal(selected(TRAILS, 'stardust', 5).id, 'cloud');
  assert.equal(cycle(TRAILS, 'cloud', 3).id, 'sunny');
  assert.equal(nextUnlock(SKINS, 10).need, 15);
  assert.equal(nextUnlock(TRAILS, 6), null);
  assert.equal(available(SKINS, 25).length, 6);
  assert.equal(available(TRAILS, 6).length, 3);
});
