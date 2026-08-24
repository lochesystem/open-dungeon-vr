import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modelDirectory = resolve(gameRoot, 'assets/models/enemies/ossuary-guardian-v1');

test('guardian model candidate contains valid Quest-sized LOD GLBs', async () => {
  const report = JSON.parse(await readFile(resolve(modelDirectory, 'qa-report.json'), 'utf8'));
  const lod0 = report.lods.lod0;
  const lod1 = report.lods.lod1;

  assert.equal(report.id, 'enemy_ossuary_guardian_v1');
  assert.ok(lod0.triangles <= 6_000);
  assert.ok(lod1.triangles <= 2_500);
  assert.ok(lod1.triangles < lod0.triangles * 0.5);
  assert.ok(lod0.bounds.height >= 2.1 && lod0.bounds.height <= 2.35);
  assert.ok(lod1.bounds.height >= 2.1 && lod1.bounds.height <= 2.35);
  assert.ok(lod0.materials <= 7);
  assert.ok(lod1.materials <= 7);

  for (const lod of [lod0, lod1]) {
    const filePath = resolve(modelDirectory, lod.file);
    await access(filePath);
    const file = await readFile(filePath);
    assert.equal(file.subarray(0, 4).toString('ascii'), 'glTF');
    assert.ok(file.byteLength > 1_024);
  }
});
