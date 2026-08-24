import assert from 'node:assert/strict';
import test from 'node:test';
import {
  POTION_DRINK_DISTANCE,
  POTION_DRINK_HOLD_SECONDS,
  POTION_DRINK_TILT_DOT,
  applyNonLethalHazard,
  healPlayer,
  shouldDrinkPotion,
} from '../app/game/potion.ts';

test('drinking requires mouth proximity, bottle tilt, and a deliberate hold', () => {
  assert.equal(shouldDrinkPotion(POTION_DRINK_DISTANCE, POTION_DRINK_TILT_DOT, POTION_DRINK_HOLD_SECONDS), true);
  assert.equal(shouldDrinkPotion(POTION_DRINK_DISTANCE + 0.01, 0, 1), false);
  assert.equal(shouldDrinkPotion(0.1, POTION_DRINK_TILT_DOT + 0.01, 1), false);
  assert.equal(shouldDrinkPotion(0.1, 0, POTION_DRINK_HOLD_SECONDS - 0.01), false);
});

test('potion heals once without exceeding maximum health', () => {
  assert.equal(healPlayer(2, 3), 3);
  assert.equal(healPlayer(3, 3), 3);
});

test('training hazard damages the player but never kills', () => {
  assert.equal(applyNonLethalHazard(3), 2);
  assert.equal(applyNonLethalHazard(1), 1);
});
