export const BOW_MIN_DRAW_METERS = 0.08;
export const BOW_MAX_DRAW_METERS = 0.68;
export const BOW_MIN_ARROW_SPEED = 4.5;
export const BOW_MAX_ARROW_SPEED = 27;
export const BOW_DAMAGE_POWER = 0.28;
export const ARROW_GRAVITY = 7.2;

export type Point3 = { x: number; y: number; z: number };

export function bowDrawDistance(localStringHand: Point3): number {
  return Math.min(BOW_MAX_DRAW_METERS, Math.max(0, localStringHand.z));
}

export function bowDrawPower(drawDistance: number): number {
  const normalized = (drawDistance - BOW_MIN_DRAW_METERS) / (BOW_MAX_DRAW_METERS - BOW_MIN_DRAW_METERS);
  return Math.min(1, Math.max(0, normalized));
}

export function arrowLaunchSpeed(drawDistance: number): number {
  const power = bowDrawPower(drawDistance);
  return BOW_MIN_ARROW_SPEED + (BOW_MAX_ARROW_SPEED - BOW_MIN_ARROW_SPEED) * Math.pow(power, 0.78);
}

export function canArrowDealDamage(drawDistance: number): boolean {
  return bowDrawPower(drawDistance) >= BOW_DAMAGE_POWER;
}

export function arrowFlightStep(position: Point3, velocity: Point3, deltaSeconds: number) {
  const delta = Math.min(0.05, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
  const nextVelocity = {
    x: velocity.x,
    y: velocity.y - ARROW_GRAVITY * delta,
    z: velocity.z,
  };
  return {
    position: {
      x: position.x + nextVelocity.x * delta,
      y: position.y + nextVelocity.y * delta,
      z: position.z + nextVelocity.z * delta,
    },
    velocity: nextVelocity,
  };
}

export function bowHapticStep(power: number, steps = 5): number {
  if (!(steps > 0)) return 0;
  return Math.min(steps, Math.max(0, Math.floor(Math.min(1, Math.max(0, power)) * steps)));
}
