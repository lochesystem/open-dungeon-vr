import assert from 'node:assert/strict';
import test from 'node:test';
import { directionalShieldBlock } from '../app/game/shieldCombat.ts';

const baseAttack = {
  attackPrevious: { x: 0, y: 0, z: 0.3 },
  attackCurrent: { x: 0, y: 0, z: -0.3 },
  shieldCenter: { x: 0, y: 0, z: 0 },
  shieldNormal: { x: 0, y: 0, z: 1 },
  shieldRadius: 0.45,
};

test('shield blocks a swept strike through its front face', () => {
  assert.equal(directionalShieldBlock(baseAttack), true);
});

test('shield does not block from its back face', () => {
  assert.equal(directionalShieldBlock({ ...baseAttack, shieldNormal: { x: 0, y: 0, z: -1 } }), false);
});

test('shield does not block a strike outside its physical radius', () => {
  assert.equal(directionalShieldBlock({
    ...baseAttack,
    attackPrevious: { x: 0.52, y: 0, z: 0.3 },
    attackCurrent: { x: 0.52, y: 0, z: -0.3 },
  }), false);
});

test('shield rejects a glancing strike beyond the allowed angle', () => {
  assert.equal(directionalShieldBlock({
    ...baseAttack,
    attackPrevious: { x: -0.5, y: 0, z: 0.1 },
    attackCurrent: { x: 0.5, y: 0, z: -0.1 },
  }), false);
});
