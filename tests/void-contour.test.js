import test from 'node:test';
import assert from 'node:assert/strict';
import { isVoidRush, showStarAura, installVoidContour, VOID_GLOW_SHADER_KEY } from '../src/render/void-contour.js';

test('void rush replaces the star shield, while a normal star pickup retains it', () => {
  for (const rushTime of [0, 0.1, 2.8]) {
    const playing = { state: 'playing', rushTime, starTime: 0 };
    assert.equal(isVoidRush(playing), rushTime > 0);
    assert.equal(showStarAura(playing), false);
  }
  assert.equal(showStarAura({ state: 'playing', rushTime: 0, starTime: 4.2 }), true);
  assert.equal(showStarAura({ state: 'playing', rushTime: 1.7, starTime: 4.2 }), false,
    'the five-point shield is hidden even if the star powerup overlaps a void rush');
  assert.equal(showStarAura({ state: 'gameover', rushTime: 0, starTime: 0 }), false);
  assert.equal(isVoidRush({ state: 'gameover', rushTime: 2, starTime: 0 }), false);
});

test('blue contour samples mapped alpha edges, uses a shared animation uniform, and has its own shader cache key', () => {
  const material = {};
  const clock = { value: 2 };
  installVoidContour(material, clock);
  assert.equal(material.customProgramCacheKey(), VOID_GLOW_SHADER_KEY);
  const shader = { uniforms: {}, fragmentShader: 'void main() {\n#include <map_fragment>\n}' };
  material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.voidContourTime, clock);
  assert.ok(shader.fragmentShader.includes('diffuseColor.a = clamp'));
  assert.ok(shader.fragmentShader.includes('texture2D(map, vMapUv'));
  assert.ok(shader.fragmentShader.includes('vec3(0.035, 0.35, 1.0)'));
  assert.equal(shader.fragmentShader.split('#include <map_fragment>').length - 1, 1,
    'the original map sample is retained once');
  assert.throws(() => material.onBeforeCompile({ uniforms: {}, fragmentShader: 'unmapped shader' }),
    /Missing mapped-sprite fragment hook/);
});
