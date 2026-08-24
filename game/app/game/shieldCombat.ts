import type { Point3 } from './objectInteraction';

export type DirectionalShieldBlock = {
  attackPrevious: Point3;
  attackCurrent: Point3;
  shieldCenter: Point3;
  shieldNormal: Point3;
  shieldRadius: number;
  minimumFacingDot?: number;
};

function dot(a: Point3, b: Point3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function subtract(a: Point3, b: Point3): Point3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function normalize(vector: Point3): Point3 | null {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length <= 1e-6) return null;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

export function directionalShieldBlock({
  attackPrevious,
  attackCurrent,
  shieldCenter,
  shieldNormal,
  shieldRadius,
  minimumFacingDot = 0.5,
}: DirectionalShieldBlock): boolean {
  if (shieldRadius <= 0) return false;
  const normal = normalize(shieldNormal);
  const movement = subtract(attackCurrent, attackPrevious);
  const direction = normalize(movement);
  if (!normal || !direction) return false;

  // The decorated face must look toward the source of the incoming strike.
  if (dot(normal, { x: -direction.x, y: -direction.y, z: -direction.z }) < minimumFacingDot) return false;

  const previousDistance = dot(subtract(attackPrevious, shieldCenter), normal);
  const currentDistance = dot(subtract(attackCurrent, shieldCenter), normal);
  if (previousDistance < 0 || currentDistance > 0) return false;

  const denominator = previousDistance - currentDistance;
  if (denominator <= 1e-6) return false;
  const progress = previousDistance / denominator;
  if (progress < 0 || progress > 1) return false;

  const contact = {
    x: attackPrevious.x + movement.x * progress,
    y: attackPrevious.y + movement.y * progress,
    z: attackPrevious.z + movement.z * progress,
  };
  const centerToContact = subtract(contact, shieldCenter);
  const normalDistance = dot(centerToContact, normal);
  const radialSquared = dot(centerToContact, centerToContact) - normalDistance * normalDistance;
  return radialSquared <= shieldRadius * shieldRadius;
}
