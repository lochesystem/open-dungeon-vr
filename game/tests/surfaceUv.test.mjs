import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  mapBoxUvsByWorldScale,
  mapCylinderUvsByWorldScale,
  mapPlaneUvsByWorldScale,
} from '../app/game/surfaceUv.ts';

function span(values) {
  return Math.max(...values) - Math.min(...values);
}

function assertSpan(actual, expected) {
  assert.ok(Math.abs(actual.u - expected.u) < 1e-5, `unexpected U span ${actual.u}`);
  assert.ok(Math.abs(actual.v - expected.v) < 1e-5, `unexpected V span ${actual.v}`);
}

function faceUvSpan(geometry, axis, sign) {
  const normals = geometry.getAttribute('normal');
  const uvs = geometry.getAttribute('uv');
  const components = { x: 0, y: 1, z: 2 };
  const normalIndex = components[axis];
  const u = [];
  const v = [];
  for (let index = 0; index < normals.count; index += 1) {
    if (Math.abs(normals.getComponent(index, normalIndex) - sign) > 0.01) continue;
    u.push(uvs.getX(index));
    v.push(uvs.getY(index));
  }
  return { u: span(u), v: span(v) };
}

test('box UV density follows physical face dimensions instead of stretching to 0..1', () => {
  const geometry = mapBoxUvsByWorldScale(new THREE.BoxGeometry(10, 2, 4), 5, 5);
  assertSpan(faceUvSpan(geometry, 'z', 1), { u: 2, v: 0.4 });
  assertSpan(faceUvSpan(geometry, 'x', 1), { u: 0.8, v: 0.4 });
  assertSpan(faceUvSpan(geometry, 'y', 1), { u: 2, v: 0.8 });
});

test('floor and cylinder UVs preserve a declared world-space texel density', () => {
  const floor = mapPlaneUvsByWorldScale(new THREE.PlaneGeometry(24, 14), 6, 7);
  const floorUvs = floor.getAttribute('uv');
  assert.equal(span(Array.from({ length: floorUvs.count }, (_, index) => floorUvs.getX(index))), 4);
  assert.equal(span(Array.from({ length: floorUvs.count }, (_, index) => floorUvs.getY(index))), 2);

  const cylinder = mapCylinderUvsByWorldScale(new THREE.CylinderGeometry(1, 1, 2, 16), Math.PI * 2, 2, Math.PI, 4);
  const cylinderNormals = cylinder.getAttribute('normal');
  const cylinderUvs = cylinder.getAttribute('uv');
  const sideIndices = Array.from({ length: cylinderUvs.count }, (_, index) => index)
    .filter((index) => Math.abs(cylinderNormals.getY(index)) < 0.9);
  const capIndices = Array.from({ length: cylinderUvs.count }, (_, index) => index)
    .filter((index) => cylinderNormals.getY(index) > 0.9);
  assert.equal(span(sideIndices.map((index) => cylinderUvs.getX(index))), 2);
  assert.equal(span(sideIndices.map((index) => cylinderUvs.getY(index))), 0.5);
  assert.ok(Math.abs(span(capIndices.map((index) => cylinderUvs.getX(index))) - 2 / Math.PI) < 1e-5);
  assert.equal(span(capIndices.map((index) => cylinderUvs.getY(index))), 0.5);
});

test('invalid texture scale fails before corrupting geometry UVs', () => {
  assert.throws(() => mapBoxUvsByWorldScale(new THREE.BoxGeometry(1, 1, 1), 0, 1), RangeError);
});
