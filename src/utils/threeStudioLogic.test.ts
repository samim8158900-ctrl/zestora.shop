import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDIO_FINISH_PALETTES,
  STUDIO_CAMERA_PRESETS,
  STUDIO_LIGHTING_PRESETS,
  computeExponentialDecayAlpha,
  dampScalar,
  calculateExplodedPosition,
  resolveProductArchetype,
} from './threeStudioLogic.ts';

test('STUDIO_FINISH_PALETTES, STUDIO_CAMERA_PRESETS, and STUDIO_LIGHTING_PRESETS provide valid studio configurations', () => {
  assert.ok(STUDIO_FINISH_PALETTES.length >= 5);
  for (const palette of STUDIO_FINISH_PALETTES) {
    assert.ok(palette.metalness >= 0 && palette.metalness <= 1);
    assert.ok(palette.roughness >= 0 && palette.roughness <= 1);
  }
  assert.equal(STUDIO_CAMERA_PRESETS.length, 5);
  assert.equal(STUDIO_LIGHTING_PRESETS.length, 3);
});

test('computeExponentialDecayAlpha and dampScalar interpolate smoothly and clamp dt', () => {
  assert.equal(computeExponentialDecayAlpha(10, 0), 0);
  const alpha = computeExponentialDecayAlpha(8, 0.016);
  assert.ok(alpha > 0 && alpha < 1);

  const damped = dampScalar(0, 100, 10, 0.05);
  assert.ok(damped > 30 && damped < 50);
  assert.equal(dampScalar(50, 50, 10, 0.016), 50);
});

test('calculateExplodedPosition displaces sub-part coordinates proportionally to explosionProgress', () => {
  const base: [number, number, number] = [0, 1.2, 0];
  const vec: [number, number, number] = [0.8, 0.5, -0.4];

  assert.deepEqual(calculateExplodedPosition(base, vec, 0), [0, 1.2, 0]);
  assert.deepEqual(calculateExplodedPosition(base, vec, 0.5), [0.4, 1.45, -0.2]);
  assert.deepEqual(calculateExplodedPosition(base, vec, 1), [0.8, 1.7, -0.4]);
  // Clamps out-of-range values
  assert.deepEqual(calculateExplodedPosition(base, vec, 2.5), [0.8, 1.7, -0.4]);
  assert.deepEqual(calculateExplodedPosition(base, vec, -1), [0, 1.2, 0]);
});

test('resolveProductArchetype maps artwork, name keywords, and categories accurately', () => {
  assert.equal(
    resolveProductArchetype({ artwork: 'watch', category: 'Electronics', name: 'Smartwatch' }),
    'watch'
  );
  assert.equal(
    resolveProductArchetype({ artwork: undefined as unknown as 'headphones', category: 'Footwear', name: 'Runner' }),
    'sneakers'
  );
  assert.equal(
    resolveProductArchetype({ artwork: undefined as unknown as 'headphones', category: 'Electronics', name: 'Tactile Mechanical Keyboard' }),
    'keyboard'
  );
  assert.equal(resolveProductArchetype(null), 'headphones');
});
