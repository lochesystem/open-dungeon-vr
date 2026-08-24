import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ENEMY_ALERT_SECONDS,
  ENEMY_DETECTION_RANGE,
  ENEMY_LOSE_RANGE,
  enemyStepToward,
  nextEnemyState,
} from '../app/game/enemyAI.ts';

test('guardian patrols, alerts, and only chases after the awareness delay', () => {
  assert.equal(nextEnemyState('idle', ENEMY_DETECTION_RANGE + 1, 1.3, false), 'patrol');
  assert.equal(nextEnemyState('patrol', ENEMY_DETECTION_RANGE - 0.1, 0, false), 'alert');
  assert.equal(nextEnemyState('alert', 2, ENEMY_ALERT_SECONDS - 0.01, false), 'alert');
  assert.equal(nextEnemyState('alert', 2, ENEMY_ALERT_SECONDS, false), 'chase');
});

test('guardian returns home after losing the player and can reacquire them', () => {
  assert.equal(nextEnemyState('chase', ENEMY_LOSE_RANGE + 0.1, 2, false), 'return');
  assert.equal(nextEnemyState('return', ENEMY_DETECTION_RANGE - 0.1, 1, false), 'alert');
  assert.equal(nextEnemyState('return', ENEMY_LOSE_RANGE + 1, 1, true), 'idle');
});

test('enemy steering never overshoots its target', () => {
  assert.deepEqual(enemyStepToward({ x: 0, z: 0 }, { x: 3, z: 4 }, 2), { x: 1.2000000000000002, z: 1.6 });
  assert.deepEqual(enemyStepToward({ x: 0, z: 0 }, { x: 0.3, z: 0.4 }, 2), { x: 0.3, z: 0.4 });
});
