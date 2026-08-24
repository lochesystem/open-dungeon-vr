import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  SWORD_GRIP_MAX_Z,
  SWORD_GRIP_MIN_Z,
  SWORD_TWO_HAND_MIN_SEPARATION,
  secondarySwordGripAnchor,
  swordGripAnchor,
  uprightSwordGripOffset,
  uprightSwordRotation,
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

test('assisted sword pickup places the blade upright from the handle', () => {
  const controllerRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.5, 0));
  const swordRotation = uprightSwordRotation(controllerRotation);
  const bladeDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(swordRotation);
  const controllerUp = new THREE.Vector3(0, 1, 0).applyQuaternion(controllerRotation);
  assert.ok(bladeDirection.distanceTo(controllerUp) < 1e-7);
});

test('assisted sword pickup points the cutting edge forward instead of sideways', () => {
  const controllerRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0.35, 0.1));
  const swordRotation = uprightSwordRotation(controllerRotation);
  const cuttingEdge = new THREE.Vector3(1, 0, 0).applyQuaternion(swordRotation);
  const controllerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(controllerRotation);
  assert.ok(cuttingEdge.distanceTo(controllerForward) < 1e-7);
});

test('upright acquisition offset is deterministic and safe to mutate by the caller', () => {
  const first = uprightSwordGripOffset();
  first.set(0, 0, 0, 1);
  const second = uprightSwordGripOffset();
  assert.ok(second.angleTo(uprightSwordRotation(new THREE.Quaternion())) < 1e-7);
});
