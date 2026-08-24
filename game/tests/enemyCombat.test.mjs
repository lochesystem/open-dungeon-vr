import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canResolveEnemyAttack,
  enemyAttackArmAngle,
  nextEnemyAttackPhase,
} from '../app/game/enemyCombat.ts';

test('guardian attack advances through one explicit cycle', () => {
  assert.equal(nextEnemyAttackPhase('ready', true, true), 'windup');
  assert.equal(nextEnemyAttackPhase('windup', true, true), 'swing');
  assert.equal(nextEnemyAttackPhase('swing', true, true), 'recover');
  assert.equal(nextEnemyAttackPhase('recover', true, true), 'ready');
});

test('one attack cycle resolves contact only once', () => {
  assert.equal(canResolveEnemyAttack(false, true), true);
  assert.equal(canResolveEnemyAttack(true, true), false);
  assert.equal(canResolveEnemyAttack(false, false), false);
});

test('leaving combat range cancels every pending attack phase', () => {
  assert.equal(nextEnemyAttackPhase('windup', false, false), 'ready');
  assert.equal(nextEnemyAttackPhase('swing', false, false), 'ready');
  assert.equal(nextEnemyAttackPhase('recover', false, false), 'ready');
});

test('mace visibly winds up, crosses forward, and recovers', () => {
  assert.ok(enemyAttackArmAngle('windup', 1) > 0.8);
  assert.ok(enemyAttackArmAngle('swing', 1) < -1.2);
  assert.ok(Math.abs(enemyAttackArmAngle('recover', 1)) < 1e-7);
});
