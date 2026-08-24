import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canResolveEnemyAttack,
  enemyAttackArmAngle,
  enemyAttackArmInwardAngle,
  enemyAttackBodyTwist,
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

test('mace rises overhead, chops downward and crosses toward the body centre', () => {
  const overhead = enemyAttackArmAngle('windup', 1);
  const impact = enemyAttackArmAngle('swing', 1);
  const overheadTipHeight = -Math.cos(overhead);
  const impactTipHeight = -Math.cos(impact);
  assert.ok(overhead < -2.1);
  assert.ok(impact > overhead);
  assert.ok(impact < -1);
  assert.ok(overheadTipHeight > impactTipHeight);
  assert.ok(enemyAttackArmInwardAngle('swing', 1) < -0.5);
  assert.ok(enemyAttackBodyTwist('windup', 1) > 0.15);
  assert.ok(enemyAttackBodyTwist('swing', 1) < 0);
  assert.ok(Math.abs(enemyAttackArmAngle('recover', 1)) < 1e-7);
  assert.ok(Math.abs(enemyAttackArmInwardAngle('recover', 1)) < 1e-7);
});
