export type MovementInput = {
  forward: number;
  right: number;
};

export type PlanarVelocity = {
  x: number;
  z: number;
};

export type PlanarPosition = {
  x: number;
  z: number;
};

export const MAX_FRAME_DELTA = 1 / 30;
export const INPUT_DEADZONE = 0.16;

export function clampFrameDelta(delta: number): number {
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  return Math.min(delta, MAX_FRAME_DELTA);
}

export function normalizeMovement(input: MovementInput): MovementInput {
  const length = Math.hypot(input.forward, input.right);
  if (length <= 1) return input;
  return {
    forward: input.forward / length,
    right: input.right / length,
  };
}

export function applyDeadzone(value: number, deadzone = INPUT_DEADZONE): number {
  if (!Number.isFinite(value) || Math.abs(value) <= deadzone) return 0;
  const sign = Math.sign(value);
  return sign * Math.min(1, (Math.abs(value) - deadzone) / (1 - deadzone));
}

export function rigPositionForTrackedSpawn(
  trackedPose: PlanarPosition,
  spawn: PlanarPosition,
): PlanarPosition {
  return {
    x: spawn.x - trackedPose.x,
    z: spawn.z - trackedPose.z,
  };
}

export function movementVelocity(
  input: MovementInput,
  yaw: number,
  speed: number,
): PlanarVelocity {
  const normalized = normalizeMovement(input);
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  return {
    x: (normalized.right * cos - normalized.forward * sin) * speed,
    z: (-normalized.right * sin - normalized.forward * cos) * speed,
  };
}
