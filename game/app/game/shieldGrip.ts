import * as THREE from 'three';

export const SHIELD_HANDLE_ANCHOR = new THREE.Vector3(0, 0, -0.085);
export const SHIELD_CONTROLLER_OFFSET = new THREE.Vector3(0, 0, -0.035);

const SHIELD_FORWARD_ALIGNMENT = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(-Math.PI / 2, 0, 0),
);

export function heldShieldRotation(holderWorldRotation: THREE.Quaternion): THREE.Quaternion {
  return holderWorldRotation.clone().multiply(SHIELD_FORWARD_ALIGNMENT);
}

export function heldShieldPosition(
  controllerPosition: THREE.Vector3,
  controllerRotation: THREE.Quaternion,
  shieldRotation: THREE.Quaternion,
): THREE.Vector3 {
  const gripPosition = SHIELD_CONTROLLER_OFFSET.clone()
    .applyQuaternion(controllerRotation)
    .add(controllerPosition);
  return gripPosition.sub(SHIELD_HANDLE_ANCHOR.clone().applyQuaternion(shieldRotation));
}
