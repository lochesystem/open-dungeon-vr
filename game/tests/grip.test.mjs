import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { captureGripRotationOffset, heldObjectRotation } from '../app/game/grip.ts';

const almostEqual = (actual, expected) => {
  assert.ok(actual.angleTo(expected) < 1e-7);
};

test('held object preserves the orientation captured at grab time', () => {
  const holder = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.4, -0.1));
  const object = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0.8, 0.25));
  const offset = captureGripRotationOffset(holder, object);
  almostEqual(heldObjectRotation(holder, offset), object);
});

test('held object rotates only when the controller rotates', () => {
  const initialHolder = new THREE.Quaternion();
  const object = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0));
  const offset = captureGripRotationOffset(initialHolder, object);
  const movedHolder = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 6, 0, 0));

  const firstFrame = heldObjectRotation(movedHolder, offset);
  const laterFrame = heldObjectRotation(movedHolder, offset);
  almostEqual(firstFrame, laterFrame);
});
