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

test('shield decorated face always points along the controller forward axis', () => {
  const controllerRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, -0.7, 0.2));
  const shieldRotation = heldShieldRotation(controllerRotation);
  const decoratedFace = new THREE.Vector3(0, 0, 1).applyQuaternion(shieldRotation);
  const controllerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(controllerRotation);
  closeVector(decoratedFace, controllerForward);
});

test('fixed shield grip places its physical handle at the controller grip point', () => {
  const controllerPosition = new THREE.Vector3(1, 1.4, -2);
  const controllerRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0.4, 0.1));
  const shieldRotation = heldShieldRotation(controllerRotation);
  const shieldPosition = heldShieldPosition(controllerPosition, controllerRotation, shieldRotation);
  const handlePosition = SHIELD_HANDLE_ANCHOR.clone().applyQuaternion(shieldRotation).add(shieldPosition);
  const expectedGrip = SHIELD_CONTROLLER_OFFSET.clone().applyQuaternion(controllerRotation).add(controllerPosition);
  closeVector(handlePosition, expectedGrip);
});

test('pickup orientation cannot invert the fixed shield pose', () => {
  const controllerRotation = new THREE.Quaternion();
  const first = heldShieldRotation(controllerRotation);
  const second = heldShieldRotation(controllerRotation);
  assert.ok(first.angleTo(second) < 1e-7);
});
