export const META_QUEST_PRIMARY_FACE_BUTTON = 4;

export function buttonPressedOnRisingEdge(
  buttons: readonly Pick<GamepadButton, 'pressed'>[],
  index: number,
  wasPressed: boolean,
): boolean {
  return Boolean(buttons[index]?.pressed) && !wasPressed;
}
