export const INVENTORY_PREVIEW_SCALE = {
  cube: 0.22,
  key: 0.2,
} as const;

export const INVENTORY_SLOT_CENTER_SPACING = 0.15;

export function inventoryPreviewYaw(timeSeconds: number, slot: number): number {
  return Math.sin(timeSeconds * 0.72 + slot * 0.65) * 0.16;
}
