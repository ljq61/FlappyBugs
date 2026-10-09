import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SKINS } from '../src/game/unlocks.js';
import { SKIN_POSES, recolorShell } from '../src/render/skin.js';

test('all skins recolor only the shell in every pose and match their editable previews', () => {
  const outside = svg => svg.replace(/<g id="abdomen">[\s\S]*?<\/g>/, 'SHELL');
  for (const pose of SKIN_POSES) {
    const source = readFileSync(new URL(`../assets/art/${pose}.svg`, import.meta.url), 'utf8');
    for (const skin of SKINS) {
      const painted = recolorShell(source, skin.shellColors);
      assert.equal(outside(painted), outside(source), `${pose}/${skin.id}: non-shell art changed`);
      assert.ok(painted.includes(skin.color));
      if (skin.id === 'classic') assert.equal(painted, source);
      if (pose === 'beetle') {
        const preview = readFileSync(new URL(`../assets/art/skin-${skin.id}.svg`, import.meta.url), 'utf8');
        const shell = svg => svg.match(/<g id="abdomen">[\s\S]*?<\/g>/)[0];
        assert.equal(shell(preview), shell(painted), `${skin.id}: preview differs from gameplay`);
      }
    }
  }
  assert.throws(() => recolorShell('<svg/>', SKINS[1].shellColors), /abdomen/);
  assert.throws(() => recolorShell('<svg/>', ['red']), TypeError);
});
