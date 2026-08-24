import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INITIAL_OBJECT_STATE,
  claimObject,
  computeThrowVelocity,
  registerTargetHit,
  releaseObject,
  shouldRecoverObject,
  sweptTargetHit,
} from '../app/game/objectInteraction.ts';

test('handoff keeps exactly one authoritative holder', () => {
  const left = claimObject(INITIAL_OBJECT_STATE, 'left');
  const right = claimObject(left, 'right');
  assert.equal(right.holder, 'right');
  assert.equal(releaseObject(right, 'left'), right);
  assert.equal(releaseObject(right, 'right').holder, null);
});

test('throw velocity uses pose history and caps impossible spikes', () => {
  const velocity = computeThrowVelocity([
    { position: { x: 0, y: 1, z: 1 }, timeSeconds: 1 },
    { position: { x: 0, y: 1.2, z: 0 }, timeSeconds: 1.1 },
  ]);
  assert.ok(Math.abs(Math.hypot(velocity.x, velocity.y, velocity.z) - 9) < 1e-9);
  assert.ok(velocity.y > 0 && velocity.z < 0);
});

test('swept target detection catches fast objects between frames', () => {
  assert.equal(sweptTargetHit(
    { x: 0, y: 2, z: 1 },
    { x: 0.2, y: 2.1, z: -8 },
    { x: 0, y: 2, z: -4 },
    0.7,
    0.22,
  ), true);
});

test('a throw can activate the target only once', () => {
  const thrown = releaseObject(claimObject(INITIAL_OBJECT_STATE, 'desktop'), 'desktop');
  const hit = registerTargetHit(thrown);
  assert.equal(hit.targetHitThrowId, thrown.throwId);
  assert.equal(registerTargetHit(hit), hit);
});

test('lost and invalid objects request recovery', () => {
  const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
  assert.equal(shouldRecoverObject({ x: 0, y: -2, z: 0 }, bounds), true);
  assert.equal(shouldRecoverObject({ x: Number.NaN, y: 1, z: 0 }, bounds), true);
  assert.equal(shouldRecoverObject({ x: 1, y: 1, z: 1 }, bounds), false);
});
