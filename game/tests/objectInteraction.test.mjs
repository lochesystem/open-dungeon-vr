import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INITIAL_OBJECT_STATE,
  claimObject,
  computeThrowVelocity,
  firstAvailableSlot,
  registerTargetHit,
  releaseObject,
  retrieveObject,
  shouldRecoverObject,
  storeObject,
  sweptTargetHit,
} from '../app/game/objectInteraction.ts';

test('handoff keeps exactly one authoritative holder', () => {
  const left = claimObject(INITIAL_OBJECT_STATE, 'left');
  const right = claimObject(left, 'right');
  assert.equal(right.holder, 'right');
  assert.equal(releaseObject(right, 'left'), right);
  assert.equal(releaseObject(right, 'right').holder, null);
});

test('bag storage keeps the cube in exactly one slot or one hand', () => {
  const held = claimObject(INITIAL_OBJECT_STATE, 'right');
  const stored = storeObject(held, 'right', 1, 3);
  assert.equal(stored.holder, null);
  assert.equal(stored.storedSlot, 1);
  assert.equal(storeObject(stored, 'left', 2, 3), stored);

  const retrieved = retrieveObject(stored, 'left', 1);
  assert.equal(retrieved.holder, 'left');
  assert.equal(retrieved.storedSlot, null);
});

test('bag rejects invalid slots and retrieval from the wrong socket', () => {
  const held = claimObject(INITIAL_OBJECT_STATE, 'desktop');
  assert.equal(storeObject(held, 'desktop', -1, 3), held);
  assert.equal(storeObject(held, 'desktop', 3, 3), held);
  const stored = storeObject(held, 'desktop', 0, 3);
  assert.equal(retrieveObject(stored, 'right', 2), stored);
});

test('waist portal chooses the first available inventory slot', () => {
  assert.equal(firstAvailableSlot([], 6), 0);
  assert.equal(firstAvailableSlot([0, 2, 3], 6), 1);
  assert.equal(firstAvailableSlot([0, 1], 2), null);
  assert.equal(firstAvailableSlot([], 0), null);
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
