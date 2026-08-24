import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCombatDamage,
  isDeliberateSwing,
  sweptSphereHit,
} from '../app/game/combat.ts';

test('small controller tremors are not deliberate sword swings', () => {
  assert.equal(isDeliberateSwing({ x: 0, y: 1, z: 0 }, { x: 0.015, y: 1, z: 0 }, 1 / 72), false);
});

test('a fast deliberate arc crossing the dummy registers a hit', () => {
  const previous = { x: -0.5, y: 1.25, z: -2 };
  const current = { x: 0.5, y: 1.25, z: -2 };
  assert.equal(isDeliberateSwing(previous, current, 0.08), true);
  assert.equal(sweptSphereHit(previous, current, { x: 0, y: 1.25, z: -2 }, 0.32), true);
});

test('swept hit rejects a fast swing that misses the target volume', () => {
  assert.equal(sweptSphereHit(
    { x: -0.5, y: 2.2, z: -2 },
    { x: 0.5, y: 2.2, z: -2 },
    { x: 0, y: 1.25, z: -2 },
    0.32,
  ), false);
});

test('combat damage clamps at zero health', () => {
  assert.equal(applyCombatDamage(3), 2);
  assert.equal(applyCombatDamage(0), 0);
});
