import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SWORD_GRIP_MAX_Z,
  SWORD_GRIP_MIN_Z,
  SWORD_TWO_HAND_MIN_SEPARATION,
  secondarySwordGripAnchor,
  swordGripAnchor,
} from '../app/game/swordGrip.ts';

test('a sword can be grabbed anywhere along its physical length', () => {
  assert.deepEqual(swordGripAnchor({ x: 0.3, y: -0.2, z: -0.55 }), { x: 0, y: 0, z: -0.55 });
  assert.equal(swordGripAnchor({ x: 0, y: 0, z: -4 }).z, SWORD_GRIP_MIN_Z);
  assert.equal(swordGripAnchor({ x: 0, y: 0, z: 4 }).z, SWORD_GRIP_MAX_Z);
});

test('the second hand receives a distinct leverage point', () => {
  const primary = { x: 0, y: 0, z: 0 };
  const secondary = secondarySwordGripAnchor(primary, { x: 0, y: 0, z: 0.02 });
  assert.ok(Math.abs(secondary.z - primary.z) >= SWORD_TWO_HAND_MIN_SEPARATION);
});
