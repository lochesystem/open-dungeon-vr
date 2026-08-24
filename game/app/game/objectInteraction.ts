export type Point3 = { x: number; y: number; z: number };

export type PoseSample = {
  position: Point3;
  timeSeconds: number;
};

export type Holder = 'desktop' | 'left' | 'right';

export type AdventureObjectState = {
  holder: Holder | null;
  throwId: number;
  targetHitThrowId: number | null;
};

export const INITIAL_OBJECT_STATE: AdventureObjectState = {
  holder: null,
  throwId: 0,
  targetHitThrowId: null,
};

export function claimObject(state: AdventureObjectState, holder: Holder): AdventureObjectState {
  return { ...state, holder };
}

export function releaseObject(state: AdventureObjectState, holder: Holder): AdventureObjectState {
  if (state.holder !== holder) return state;
  return { ...state, holder: null, throwId: state.throwId + 1 };
}

export function registerTargetHit(state: AdventureObjectState): AdventureObjectState {
  if (state.holder || state.targetHitThrowId === state.throwId) return state;
  return { ...state, targetHitThrowId: state.throwId };
}

export function computeThrowVelocity(
  samples: readonly PoseSample[],
  maximumAge = 0.18,
  maximumSpeed = 9,
): Point3 {
  if (samples.length < 2) return { x: 0, y: 0, z: 0 };

  const latest = samples[samples.length - 1];
  let earliest = latest;
  for (let index = samples.length - 2; index >= 0; index -= 1) {
    const sample = samples[index];
    if (latest.timeSeconds - sample.timeSeconds > maximumAge) break;
    earliest = sample;
  }

  const elapsed = latest.timeSeconds - earliest.timeSeconds;
  if (!Number.isFinite(elapsed) || elapsed <= 0.008) return { x: 0, y: 0, z: 0 };

  const velocity = {
    x: (latest.position.x - earliest.position.x) / elapsed,
    y: (latest.position.y - earliest.position.y) / elapsed,
    z: (latest.position.z - earliest.position.z) / elapsed,
  };
  const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
  if (!Number.isFinite(speed) || speed === 0) return { x: 0, y: 0, z: 0 };
  if (speed <= maximumSpeed) return velocity;

  const scale = maximumSpeed / speed;
  return { x: velocity.x * scale, y: velocity.y * scale, z: velocity.z * scale };
}

export function sweptTargetHit(
  previous: Point3,
  current: Point3,
  target: Point3,
  targetRadius: number,
  objectRadius: number,
): boolean {
  const previousSide = previous.z - target.z;
  const currentSide = current.z - target.z;
  if (previousSide * currentSide > 0 || previous.z === current.z) return false;

  const time = (target.z - previous.z) / (current.z - previous.z);
  if (time < 0 || time > 1) return false;
  const x = previous.x + (current.x - previous.x) * time;
  const y = previous.y + (current.y - previous.y) * time;
  return Math.hypot(x - target.x, y - target.y) <= targetRadius + objectRadius;
}

export function shouldRecoverObject(
  position: Point3,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
): boolean {
  return !Number.isFinite(position.x + position.y + position.z)
    || position.y < -1.5
    || position.x < bounds.minX - 1
    || position.x > bounds.maxX + 1
    || position.z < bounds.minZ - 1
    || position.z > bounds.maxZ + 1;
}
