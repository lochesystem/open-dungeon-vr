import assert from 'node:assert/strict';
import test from 'node:test';
import {
  moveVrMenuSelection,
  vrPauseButtonPressed,
} from '../app/game/vrPauseMenu.ts';

const buttons = (...pressed) => Array.from(
  { length: 9 },
  (_, index) => ({ pressed: pressed.includes(index) }),
);

test('VR pause accepts an exposed menu button and the left-stick fallback', () => {
  assert.equal(vrPauseButtonPressed(buttons(6)), true);
  assert.equal(vrPauseButtonPressed(buttons(8)), true);
  assert.equal(vrPauseButtonPressed(buttons(3)), true);
  assert.equal(vrPauseButtonPressed(buttons(4)), false);
});

test('VR menu selection wraps in both directions', () => {
  assert.equal(moveVrMenuSelection(0, -1, 7), 6);
  assert.equal(moveVrMenuSelection(6, 1, 7), 0);
  assert.equal(moveVrMenuSelection(2, 1, 7), 3);
});
