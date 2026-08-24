import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GUARDIAN_MAXIMUM_HEALTH,
  damageGuardian,
  initialGuardianVitals,
} from '../app/game/guardianVitals.ts';

test('guardian loses one health for each accepted sword hit', () => {
  const initial = initialGuardianVitals();
  const damaged = damageGuardian(initial);
  assert.equal(damaged.health, GUARDIAN_MAXIMUM_HEALTH - 1);
  assert.equal(damaged.defeated, false);
  assert.equal(damaged.rewardDropped, false);
});

test('final hit defeats the guardian and drops exactly one reward', () => {
  let state = initialGuardianVitals();
  for (let hit = 0; hit < GUARDIAN_MAXIMUM_HEALTH; hit += 1) state = damageGuardian(state);
  assert.deepEqual(state, { health: 0, defeated: true, rewardDropped: true });
  assert.equal(damageGuardian(state), state);
});

test('guardian health cannot become negative or take invalid damage', () => {
  const initial = initialGuardianVitals();
  assert.equal(damageGuardian(initial, 0), initial);
  assert.equal(damageGuardian(initial, -2), initial);
  assert.equal(damageGuardian(initial, 99).health, 0);
});
