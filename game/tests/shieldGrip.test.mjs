import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  SHIELD_CONTROLLER_OFFSET,
  SHIELD_HANDLE_ANCHOR,
  heldShieldPosition,
  heldShieldRotation,
} from '../app/game/shieldGrip.ts';

const closeVector = (actual, expected) => {
  assert.ok(actual.distanceTo(expected) < 1e-7, `${actual.toArray()} != ${expected.toArray()}`);
};

test('shield decorated face rests on the outside of each hand instead of above it', () => {
  const controllerRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, -0.7, 0.2));
  const leftFace = new THREE.Vector3(0, 0, 1).applyQuaternion(heldShieldRotation(controllerRotation, 'left'));
  const rightFace = new THREE.Vector3(0, 0, 1).applyQuaternion(heldShieldRotation(controllerRotation, 'right'));
  const leftOutside = new THREE.Vector3(-1, 0, 0).applyQuaternion(controllerRotation);
  const rightOutside = new THREE.Vector3(1, 0, 0).applyQuaternion(controllerRotation);
  closeVector(leftFace, leftOutside);
  closeVector(rightFace, rightOutside);
});

test('fixed shield grip places its physical handle at the controller grip point', () => {
  const controllerPosition = new THREE.Vector3(1, 1.4, -2);
  const controllerRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0.4, 0.1));
  const shieldRotation = heldShieldRotation(controllerRotation, 'right');
  const shieldPosition = heldShieldPosition(controllerPosition, controllerRotation, shieldRotation);
  const handlePosition = SHIELD_HANDLE_ANCHOR.clone().applyQuaternion(shieldRotation).add(shieldPosition);
  const expectedGrip = SHIELD_CONTROLLER_OFFSET.clone().applyQuaternion(controllerRotation).add(controllerPosition);
  closeVector(handlePosition, expectedGrip);
});

test('pickup orientation cannot invert the fixed shield pose', () => {
  const controllerRotation = new THREE.Quaternion();
  const first = heldShieldRotation(controllerRotation, 'left');
  const second = heldShieldRotation(controllerRotation, 'left');
  assert.ok(first.angleTo(second) < 1e-7);
});

test('shield handle axis follows the controller wrist-to-fingers direction', () => {
  const controllerRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0.45, 0.08));
  for (const hand of ['left', 'right']) {
    const handleAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(heldShieldRotation(controllerRotation, hand));
    const fingers = new THREE.Vector3(0, 0, hand === 'left' ? 1 : -1).applyQuaternion(controllerRotation);
    assert.ok(Math.abs(handleAxis.dot(fingers)) > 1 - 1e-7);
  }
});
