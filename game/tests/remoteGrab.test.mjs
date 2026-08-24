import assert from 'node:assert/strict';
import test from 'node:test';
import { remoteGrabDistance, remotePullDuration, remotePullProgress } from '../app/game/remoteGrab.ts';

test('remote grab accepts an aimed object without requiring the hand to be nearby', () => {
  const distance = remoteGrabDistance(
    { x: 0, y: 1.4, z: 3 },
    { x: 0, y: 0, z: -1 },
    { x: 0.18, y: 1.25, z: 0 },
    0.22,
    3.5,
  );
  assert.ok(distance !== null && distance > 3);
});

test('remote grab rejects objects behind the hand, outside aim assist, or beyond range', () => {
  assert.equal(remoteGrabDistance({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 }, 0.2, 3.5), null);
  assert.equal(remoteGrabDistance({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, { x: 1.5, y: 0, z: -2 }, 0.2, 3.5), null);
  assert.equal(remoteGrabDistance({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: -4 }, 0.2, 3.5), null);
});

test('pull animation is short, distance-aware, and finishes exactly at the hand', () => {
  assert.ok(remotePullDuration(3) > remotePullDuration(1));
  assert.equal(remotePullProgress(0, 0.3), 0);
  assert.equal(remotePullProgress(0.3, 0.3), 1);
  assert.ok(remotePullProgress(0.15, 0.3) > 0.5);
});
