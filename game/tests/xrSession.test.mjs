import assert from 'node:assert/strict';
import test from 'node:test';
import { createVrSessionInit } from '../app/game/xrSession.ts';

test('requests every feature required by the Three.js WebXR render path', () => {
  const options = createVrSessionInit();
  assert.deepEqual(options.optionalFeatures, ['local-floor', 'bounded-floor', 'layers']);
});

test('returns a new mutable feature list for every session attempt', () => {
  const first = createVrSessionInit();
  const second = createVrSessionInit();
  assert.notEqual(first.optionalFeatures, second.optionalFeatures);
});
