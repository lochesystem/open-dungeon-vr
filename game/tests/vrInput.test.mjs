import assert from 'node:assert/strict';
import test from 'node:test';
import {
  META_QUEST_PRIMARY_FACE_BUTTON,
  buttonPressedOnRisingEdge,
} from '../app/game/vrInput.ts';

const buttons = (pressedIndex = -1) => Array.from(
  { length: 6 },
  (_, index) => ({ pressed: index === pressedIndex }),
);

test('Meta Quest X button uses the primary face-button mapping', () => {
  assert.equal(META_QUEST_PRIMARY_FACE_BUTTON, 4);
  assert.equal(buttonPressedOnRisingEdge(buttons(4), META_QUEST_PRIMARY_FACE_BUTTON, false), true);
});

test('holding X toggles the inventory only on the rising edge', () => {
  assert.equal(buttonPressedOnRisingEdge(buttons(4), 4, true), false);
  assert.equal(buttonPressedOnRisingEdge(buttons(), 4, false), false);
});
