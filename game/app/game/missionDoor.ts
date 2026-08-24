export const KEY_INSERT_DISTANCE = 0.38;
export const DOOR_PASSABLE_OPEN_AMOUNT = 0.82;

export function canInsertMissionKey(distance: number): boolean {
  return Number.isFinite(distance) && distance >= 0 && distance <= KEY_INSERT_DISTANCE;
}

export function doorBlocksPassage(openAmount: number): boolean {
  return !Number.isFinite(openAmount) || openAmount < DOOR_PASSABLE_OPEN_AMOUNT;
}
