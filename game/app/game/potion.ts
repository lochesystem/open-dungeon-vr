export const POTION_DRINK_DISTANCE = 0.24;
export const POTION_DRINK_TILT_DOT = 0.38;
export const POTION_DRINK_HOLD_SECONDS = 0.32;
export const POTION_WORLD_SCALE = 0.58;

export function shouldDrinkPotion(distanceToMouth: number, uprightDot: number, heldSeconds: number): boolean {
  return Number.isFinite(distanceToMouth + uprightDot + heldSeconds)
    && distanceToMouth <= POTION_DRINK_DISTANCE
    && uprightDot <= POTION_DRINK_TILT_DOT
    && heldSeconds >= POTION_DRINK_HOLD_SECONDS;
}

export function healPlayer(health: number, maximumHealth: number, amount = 1): number {
  return Math.min(maximumHealth, Math.max(0, health) + Math.max(0, amount));
}

export function applyNonLethalHazard(health: number, damage = 1): number {
  return Math.max(1, health - Math.max(0, damage));
}
