import type { Point3 } from './objectInteraction';

export function swingSpeed(previous: Point3, current: Point3, deltaSeconds: number): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  return Math.hypot(
    current.x - previous.x,
    current.y - previous.y,
    current.z - previous.z,
  ) / deltaSeconds;
}

export function isDeliberateSwing(
  previous: Point3,
  current: Point3,
  deltaSeconds: number,
  minimumSpeed = 1.35,
  minimumTravel = 0.075,
): boolean {
  const travel = Math.hypot(
    current.x - previous.x,
    current.y - previous.y,
    current.z - previous.z,
  );
  return travel >= minimumTravel && swingSpeed(previous, current, deltaSeconds) >= minimumSpeed;
}

export function sweptSphereHit(
  previous: Point3,
  current: Point3,
  target: Point3,
  radius: number,
): boolean {
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const dz = current.z - previous.z;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  const projection = lengthSq <= 1e-9 ? 0 : Math.max(0, Math.min(1,
    ((target.x - previous.x) * dx + (target.y - previous.y) * dy + (target.z - previous.z) * dz) / lengthSq,
  ));
  const closest = {
    x: previous.x + dx * projection,
    y: previous.y + dy * projection,
    z: previous.z + dz * projection,
  };
  return Math.hypot(closest.x - target.x, closest.y - target.y, closest.z - target.z) <= radius;
}

export function applyCombatDamage(health: number, damage = 1): number {
  return Math.max(0, health - Math.max(0, damage));
}
