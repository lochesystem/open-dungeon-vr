import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_FRAME_DELTA,
  applyDeadzone,
  clampFrameDelta,
  movementVelocity,
  normalizeMovement,
  rigPositionForTrackedSpawn,
} from '../app/game/motion.ts';

test('clamps long and invalid frame deltas', () => {
  assert.equal(clampFrameDelta(1), MAX_FRAME_DELTA);
  assert.equal(clampFrameDelta(-1), 0);
  assert.equal(clampFrameDelta(Number.NaN), 0);
});

test('normalizes diagonal movement to avoid a speed boost', () => {
  const input = normalizeMovement({ forward: 1, right: 1 });
  assert.ok(Math.abs(Math.hypot(input.forward, input.right) - 1) < 1e-9);
});

test('filters controller drift and rescales intentional input', () => {
  assert.equal(applyDeadzone(0.1), 0);
  assert.equal(applyDeadzone(-0.1), 0);
  assert.ok(applyDeadzone(0.5) > 0 && applyDeadzone(0.5) < 0.5);
  assert.equal(applyDeadzone(1), 1);
});

test('maps forward input to the camera yaw', () => {
  const north = movementVelocity({ forward: 1, right: 0 }, 0, 4);
  assert.deepEqual(north, { x: 0, z: -4 });

  const west = movementVelocity({ forward: 1, right: 0 }, Math.PI / 2, 4);
  assert.ok(Math.abs(west.x + 4) < 1e-9);
  assert.ok(Math.abs(west.z) < 1e-9);
});

test('anchors a distant stationary-boundary pose at the intended dungeon spawn', () => {
  const trackedPose = { x: 37.5, z: -82.25 };
  const spawn = { x: 0, z: 6.8 };
  const rig = rigPositionForTrackedSpawn(trackedPose, spawn);

  assert.deepEqual(rig, { x: -37.5, z: 89.05 });
  assert.ok(Math.abs(rig.x + trackedPose.x - spawn.x) < 1e-9);
  assert.ok(Math.abs(rig.z + trackedPose.z - spawn.z) < 1e-9);
});
