export type Point2 = { x: number; z: number };

export type CollisionBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type BoxCollider = {
  kind: 'box';
  id: string;
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  rotation: number;
};

export type CircleCollider = {
  kind: 'circle';
  id: string;
  x: number;
  z: number;
  radius: number;
};

export type StaticCollider = BoxCollider | CircleCollider;

const EPSILON = 1e-8;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function worldToBoxLocal(point: Point2, collider: BoxCollider): Point2 {
  const dx = point.x - collider.x;
  const dz = point.z - collider.z;
  const cosine = Math.cos(collider.rotation);
  const sine = Math.sin(collider.rotation);
  return {
    x: dx * cosine - dz * sine,
    z: dx * sine + dz * cosine,
  };
}

function boxLocalToWorld(point: Point2, collider: BoxCollider): Point2 {
  const cosine = Math.cos(collider.rotation);
  const sine = Math.sin(collider.rotation);
  return {
    x: collider.x + point.x * cosine + point.z * sine,
    z: collider.z - point.x * sine + point.z * cosine,
  };
}

function resolveCircle(position: Point2, playerRadius: number, collider: CircleCollider): Point2 {
  const dx = position.x - collider.x;
  const dz = position.z - collider.z;
  const minimumDistance = playerRadius + collider.radius;
  const distanceSquared = dx * dx + dz * dz;
  if (distanceSquared >= minimumDistance * minimumDistance) return position;

  if (distanceSquared <= EPSILON) {
    return { x: collider.x + minimumDistance, z: collider.z };
  }

  const distance = Math.sqrt(distanceSquared);
  const scale = minimumDistance / distance;
  return {
    x: collider.x + dx * scale,
    z: collider.z + dz * scale,
  };
}

function resolveBox(position: Point2, playerRadius: number, collider: BoxCollider): Point2 {
  const local = worldToBoxLocal(position, collider);
  const closestX = clamp(local.x, -collider.halfX, collider.halfX);
  const closestZ = clamp(local.z, -collider.halfZ, collider.halfZ);
  const dx = local.x - closestX;
  const dz = local.z - closestZ;
  const distanceSquared = dx * dx + dz * dz;

  if (distanceSquared >= playerRadius * playerRadius) return position;

  let resolvedLocal: Point2;
  if (distanceSquared > EPSILON) {
    const distance = Math.sqrt(distanceSquared);
    resolvedLocal = {
      x: closestX + (dx / distance) * playerRadius,
      z: closestZ + (dz / distance) * playerRadius,
    };
  } else {
    const faces = [
      { distance: collider.halfX - local.x, point: { x: collider.halfX + playerRadius, z: local.z } },
      { distance: collider.halfX + local.x, point: { x: -collider.halfX - playerRadius, z: local.z } },
      { distance: collider.halfZ - local.z, point: { x: local.x, z: collider.halfZ + playerRadius } },
      { distance: collider.halfZ + local.z, point: { x: local.x, z: -collider.halfZ - playerRadius } },
    ];
    faces.sort((a, b) => a.distance - b.distance);
    resolvedLocal = faces[0].point;
  }

  return boxLocalToWorld(resolvedLocal, collider);
}

export function resolvePosition(
  position: Point2,
  playerRadius: number,
  colliders: readonly StaticCollider[],
  bounds: CollisionBounds,
): Point2 {
  let resolved = { ...position };
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const before = resolved;
    resolved = {
      x: clamp(resolved.x, bounds.minX + playerRadius, bounds.maxX - playerRadius),
      z: clamp(resolved.z, bounds.minZ + playerRadius, bounds.maxZ - playerRadius),
    };
    for (const collider of colliders) {
      resolved = collider.kind === 'box'
        ? resolveBox(resolved, playerRadius, collider)
        : resolveCircle(resolved, playerRadius, collider);
    }
    if (Math.hypot(resolved.x - before.x, resolved.z - before.z) <= EPSILON) break;
  }
  return resolved;
}

export function resolveMovement(
  start: Point2,
  movement: Point2,
  playerRadius: number,
  colliders: readonly StaticCollider[],
  bounds: CollisionBounds,
): Point2 {
  const distance = Math.hypot(movement.x, movement.z);
  const maximumStep = Math.max(0.04, playerRadius * 0.35);
  const steps = Math.max(1, Math.min(96, Math.ceil(distance / maximumStep)));
  const step = { x: movement.x / steps, z: movement.z / steps };
  let position = resolvePosition(start, playerRadius, colliders, bounds);

  for (let index = 0; index < steps; index += 1) {
    position = resolvePosition(
      { x: position.x + step.x, z: position.z + step.z },
      playerRadius,
      colliders,
      bounds,
    );
  }
  return position;
}

export function pointInExpandedCollider(
  point: Point2,
  playerRadius: number,
  collider: StaticCollider,
): boolean {
  const resolved = collider.kind === 'box'
    ? resolveBox(point, playerRadius, collider)
    : resolveCircle(point, playerRadius, collider);
  return Math.hypot(resolved.x - point.x, resolved.z - point.z) > EPSILON;
}

