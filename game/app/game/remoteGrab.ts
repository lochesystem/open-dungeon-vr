import type { Point3 } from './objectInteraction';

export function remoteGrabDistance(
  origin: Point3,
  forward: Point3,
  target: Point3,
  targetRadius: number,
  maximumDistance: number,
): number | null {
  const forwardLength = Math.hypot(forward.x, forward.y, forward.z);
  if (!Number.isFinite(forwardLength) || forwardLength < 0.001) return null;

  const direction = {
    x: forward.x / forwardLength,
    y: forward.y / forwardLength,
    z: forward.z / forwardLength,
  };
  const toTarget = {
    x: target.x - origin.x,
    y: target.y - origin.y,
    z: target.z - origin.z,
  };
  const distance = Math.hypot(toTarget.x, toTarget.y, toTarget.z);
  if (!Number.isFinite(distance) || distance <= 0 || distance > maximumDistance) return null;

  const projected = toTarget.x * direction.x + toTarget.y * direction.y + toTarget.z * direction.z;
  if (projected <= 0) return null;
  const perpendicular = Math.sqrt(Math.max(0, distance * distance - projected * projected));
  const assistedRadius = targetRadius + 0.08 + projected * 0.04;
  return perpendicular <= assistedRadius ? distance : null;
}

export function remotePullDuration(distance: number): number {
  return Math.min(0.42, Math.max(0.16, 0.16 + Math.max(0, distance) * 0.07));
}

export function remotePullProgress(elapsed: number, duration: number): number {
  const linear = Math.min(1, Math.max(0, elapsed / Math.max(0.001, duration)));
  return 1 - (1 - linear) ** 3;
}
