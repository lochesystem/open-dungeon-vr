import assert from 'node:assert/strict';
import test from 'node:test';
import {
  pointInExpandedCollider,
  resolveMovement,
  resolvePosition,
} from '../app/game/collision.ts';

const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
const radius = 0.32;

test('keeps the player capsule inside the room walls', () => {
  const resolved = resolvePosition({ x: 8, z: -9 }, radius, [], bounds);
  assert.deepEqual(resolved, { x: 4.68, z: -4.68 });
});

test('uses an exact circular footprint around the altar', () => {
  const altar = { kind: 'circle', id: 'altar', x: 0, z: 0, radius: 1.45 };
  const resolved = resolveMovement({ x: 0, z: 3 }, { x: 0, z: -5 }, radius, [altar], bounds);
  assert.ok(resolved.z > 1.76 && resolved.z < 1.78);
  assert.equal(pointInExpandedCollider(resolved, radius, altar), false);
});

test('does not tunnel through a thin oriented box', () => {
  const wall = {
    kind: 'box',
    id: 'thin-wall',
    x: 1,
    z: 0,
    halfX: 0.12,
    halfZ: 1.5,
    rotation: 0,
  };
  const resolved = resolveMovement({ x: -2, z: 0 }, { x: 6, z: 0 }, radius, [wall], bounds);
  assert.ok(resolved.x <= 0.561);
  assert.equal(pointInExpandedCollider(resolved, radius, wall), false);
});

test('resolves against the true rotation of a pillar hitbox', () => {
  const pillar = {
    kind: 'box',
    id: 'rotated-pillar',
    x: 0,
    z: 0,
    halfX: 0.8,
    halfZ: 0.5,
    rotation: Math.PI / 4,
  };
  const inside = { x: 0.72, z: 0 };
  assert.equal(pointInExpandedCollider(inside, radius, pillar), true);
  const resolved = resolvePosition(inside, radius, [pillar], bounds);
  assert.equal(pointInExpandedCollider(resolved, radius, pillar), false);
});

test('slides tangentially instead of cancelling the whole movement', () => {
  const pillar = {
    kind: 'box',
    id: 'pillar',
    x: 0,
    z: 0,
    halfX: 0.7,
    halfZ: 0.7,
    rotation: 0,
  };
  const resolved = resolveMovement({ x: -1.5, z: 1.2 }, { x: 2.5, z: -0.3 }, radius, [pillar], bounds);
  assert.ok(resolved.x > -1.5, 'player should retain tangential progress');
  assert.equal(pointInExpandedCollider(resolved, radius, pillar), false);
});

