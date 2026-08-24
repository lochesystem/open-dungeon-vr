export const VR_PAUSE_MENU_FALLBACK_BUTTON = 3;
export const VR_PAUSE_MENU_ADDITIONAL_BUTTON_START = 6;

export function vrPauseButtonPressed(
  buttons: readonly Pick<GamepadButton, 'pressed'>[],
): boolean {
  return Boolean(buttons[VR_PAUSE_MENU_FALLBACK_BUTTON]?.pressed)
    || buttons.slice(VR_PAUSE_MENU_ADDITIONAL_BUTTON_START).some((button) => button.pressed);
}

export function moveVrMenuSelection(current: number, direction: -1 | 1, count: number): number {
  if (!Number.isInteger(count) || count <= 0) return 0;
  return (current + direction + count) % count;
}
