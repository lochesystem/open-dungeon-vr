import * as THREE from 'three';

export function captureGripRotationOffset(
  holderWorldRotation: THREE.Quaternion,
  objectWorldRotation: THREE.Quaternion,
): THREE.Quaternion {
  return holderWorldRotation.clone().invert().multiply(objectWorldRotation);
}

export function heldObjectRotation(
  holderWorldRotation: THREE.Quaternion,
  gripOffset: THREE.Quaternion,
): THREE.Quaternion {
  return holderWorldRotation.clone().multiply(gripOffset);
}
