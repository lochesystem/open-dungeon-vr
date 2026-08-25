import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modelDirectory = resolve(gameRoot, 'assets/models/enemies/ossuary-guardian-v1');

function glbJson(file) {
  const jsonChunkLength = file.readUInt32LE(12);
  assert.equal(file.readUInt32LE(16), 0x4e4f534a);
  return JSON.parse(file.subarray(20, 20 + jsonChunkLength).toString('utf8').trim());
}

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
  assert.ok(lod0.bones >= 31);
  assert.deepEqual(lod0.animations, ['idle', 'walk']);
  assert.deepEqual(lod1.animations, ['idle', 'walk']);

  for (const lod of [lod0, lod1]) {
    const filePath = resolve(modelDirectory, lod.file);
    await access(filePath);
    const file = await readFile(filePath);
    assert.equal(file.subarray(0, 4).toString('ascii'), 'glTF');
    assert.ok(file.byteLength > 1_024);
    const gltf = glbJson(file);
    assert.ok(gltf.skins.length >= 1);
    assert.deepEqual(gltf.animations.map((animation) => animation.name), ['idle', 'walk']);
    const nodeNames = new Set(gltf.nodes.map((node) => node.name));
    for (const requiredBone of ['rig_root', 'hips', 'chest', 'head', 'left_clavicle', 'right_clavicle', 'left_wrist', 'right_wrist', 'left_ankle', 'right_ankle', 'left_hand_bone', 'right_hand_bone', 'socket_weapon_right', 'socket_memory_rune']) {
      assert.ok(nodeNames.has(requiredBone), `missing rig node ${requiredBone}`);
    }
    assert.ok(gltf.meshes.some((mesh) => mesh.primitives.some((primitive) => primitive.attributes.JOINTS_0 !== undefined && primitive.attributes.WEIGHTS_0 !== undefined)));
  }
});
