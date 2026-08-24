import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DOOR_PASSABLE_OPEN_AMOUNT,
  KEY_INSERT_DISTANCE,
  canInsertMissionKey,
  doorBlocksPassage,
} from '../app/game/missionDoor.ts';

test('mission key only activates the lock inside its physical socket radius', () => {
  assert.equal(canInsertMissionKey(KEY_INSERT_DISTANCE), true);
  assert.equal(canInsertMissionKey(KEY_INSERT_DISTANCE + 0.001), false);
  assert.equal(canInsertMissionKey(Number.NaN), false);
});

test('door collider remains active until the raised door is actually passable', () => {
  assert.equal(doorBlocksPassage(DOOR_PASSABLE_OPEN_AMOUNT - 0.001), true);
  assert.equal(doorBlocksPassage(DOOR_PASSABLE_OPEN_AMOUNT), false);
});
