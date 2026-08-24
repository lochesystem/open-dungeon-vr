import * as THREE from 'three';

export const SHIELD_HANDLE_ANCHOR = new THREE.Vector3(0, 0, -0.085);
export const SHIELD_CONTROLLER_OFFSET = new THREE.Vector3(0, 0, -0.035);

export type ShieldHand = 'left' | 'right' | 'desktop';

export function heldShieldRotation(
  holderWorldRotation: THREE.Quaternion,
  hand: ShieldHand,
): THREE.Quaternion {
  const outwardYaw = hand === 'left' ? Math.PI / 2 : -Math.PI / 2;
  const backhandAlignment = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, outwardYaw, 0));
  return holderWorldRotation.clone().multiply(backhandAlignment);
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
