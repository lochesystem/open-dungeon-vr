import type { Point3 } from './objectInteraction';

export const SWORD_GRIP_MIN_Z = -0.96;
export const SWORD_GRIP_MAX_Z = 0.16;
export const SWORD_TWO_HAND_MIN_SEPARATION = 0.14;

export function swordGripAnchor(localPoint: Point3): Point3 {
  return {
    x: 0,
    y: 0,
    z: Math.max(SWORD_GRIP_MIN_Z, Math.min(SWORD_GRIP_MAX_Z, localPoint.z)),
  };
}

export function secondarySwordGripAnchor(primary: Point3, candidate: Point3): Point3 {
  const anchor = swordGripAnchor(candidate);
  if (Math.abs(anchor.z - primary.z) >= SWORD_TWO_HAND_MIN_SEPARATION) return anchor;
  const towardBlade = primary.z - SWORD_TWO_HAND_MIN_SEPARATION;
  const towardPommel = primary.z + SWORD_TWO_HAND_MIN_SEPARATION;
  anchor.z = towardBlade >= SWORD_GRIP_MIN_Z ? towardBlade : Math.min(SWORD_GRIP_MAX_Z, towardPommel);
  return anchor;
}
