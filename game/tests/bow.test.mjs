import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARROW_GRAVITY,
  BOW_DAMAGE_POWER,
  BOW_MAX_ARROW_SPEED,
  BOW_MAX_DRAW_METERS,
  BOW_MIN_ARROW_SPEED,
  BOW_MIN_DRAW_METERS,
  arrowFlightStep,
  arrowLaunchSpeed,
  bowDrawDistance,
  bowDrawPower,
  bowHapticStep,
  canArrowDealDamage,
} from '../app/game/bow.ts';

test('bow strength comes only from pulling the string backward in local space', () => {
  assert.equal(bowDrawDistance({ x: 0.4, y: -0.3, z: -0.2 }), 0);
  assert.equal(bowDrawDistance({ x: 9, y: 9, z: 0.34 }), 0.34);
  assert.equal(bowDrawDistance({ x: 0, y: 0, z: 2 }), BOW_MAX_DRAW_METERS);
});

test('draw distance maps monotonically to power and arrow speed', () => {
  assert.equal(bowDrawPower(BOW_MIN_DRAW_METERS), 0);
  assert.equal(bowDrawPower(BOW_MAX_DRAW_METERS), 1);
  assert.equal(arrowLaunchSpeed(0), BOW_MIN_ARROW_SPEED);
  assert.equal(arrowLaunchSpeed(BOW_MAX_DRAW_METERS), BOW_MAX_ARROW_SPEED);
  assert.ok(arrowLaunchSpeed(0.5) > arrowLaunchSpeed(0.25));
});

test('weak releases fly but cannot damage combat targets', () => {
  const thresholdDistance = BOW_MIN_DRAW_METERS
    + (BOW_MAX_DRAW_METERS - BOW_MIN_DRAW_METERS) * BOW_DAMAGE_POWER;
  assert.equal(canArrowDealDamage(thresholdDistance - 0.001), false);
  assert.equal(canArrowDealDamage(thresholdDistance + 0.001), true);
});

test('arrow flight is deterministic, gravity-driven, and clamps unsafe frame deltas', () => {
  const initial = { x: 0, y: 1.5, z: 0 };
  const velocity = { x: 0, y: 1, z: -10 };
  const result = arrowFlightStep(initial, velocity, 0.1);
  assert.equal(result.position.z, -0.5);
  assert.equal(result.velocity.y, 1 - ARROW_GRAVITY * 0.05);
  assert.equal(result.position.y, 1.5 + result.velocity.y * 0.05);
  assert.deepEqual(arrowFlightStep(initial, velocity, Number.NaN).position, initial);
});

test('haptic tension advances in bounded discrete steps', () => {
  assert.equal(bowHapticStep(-1), 0);
  assert.equal(bowHapticStep(0.42), 2);
  assert.equal(bowHapticStep(1.8), 5);
});
