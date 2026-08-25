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

function accessorFloats(file, gltf, accessorIndex) {
  const jsonChunkLength = file.readUInt32LE(12);
  const binaryDataOffset = 20 + jsonChunkLength + 8;
  const accessor = gltf.accessors[accessorIndex];
  const bufferView = gltf.bufferViews[accessor.bufferView];
  const componentCount = accessor.type === 'VEC4' ? 4 : 1;
  const offset = binaryDataOffset + (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return Array.from({ length: accessor.count * componentCount }, (_, index) => file.readFloatLE(offset + index * 4));
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
  assert.deepEqual(lod0.animations, ['idle', 'walk', 'attack_mace', 'stagger', 'death']);
  assert.deepEqual(lod1.animations, ['idle', 'walk', 'attack_mace', 'stagger', 'death']);

  for (const lod of [lod0, lod1]) {
    const filePath = resolve(modelDirectory, lod.file);
    await access(filePath);
    const file = await readFile(filePath);
    assert.equal(file.subarray(0, 4).toString('ascii'), 'glTF');
    assert.ok(file.byteLength > 1_024);
    const gltf = glbJson(file);
    assert.ok(gltf.skins.length >= 1);
    assert.deepEqual(gltf.animations.map((animation) => animation.name), ['idle', 'walk', 'attack_mace', 'stagger', 'death']);
    const nodeNames = new Set(gltf.nodes.map((node) => node.name));
    for (const requiredBone of ['rig_root', 'hips', 'chest', 'head', 'left_clavicle', 'right_clavicle', 'left_wrist', 'right_wrist', 'left_ankle', 'right_ankle', 'left_hand_bone', 'right_hand_bone', 'socket_weapon_right', 'socket_memory_rune']) {
      assert.ok(nodeNames.has(requiredBone), `missing rig node ${requiredBone}`);
    }
    const leftForearmNode = gltf.nodes.findIndex((node) => node.name === 'left_forearm');
    for (const animation of gltf.animations) {
      const channel = animation.channels.find((candidate) => candidate.target.node === leftForearmNode && candidate.target.path === 'rotation');
      if (channel) {
        const quaternionValues = accessorFloats(file, gltf, animation.samplers[channel.sampler].output);
        assert.ok(quaternionValues[0] < 0, `${animation.name} elbow must bend toward the front of the model`);
      }
    }
    const attack = gltf.animations.find((animation) => animation.name === 'attack_mace');
    const death = gltf.animations.find((animation) => animation.name === 'death');
    const rightUpperArmNode = gltf.nodes.findIndex((node) => node.name === 'right_upper_arm');
    const propMaceNode = gltf.nodes.findIndex((node) => node.name === 'prop_mace');
    const hipsNode = gltf.nodes.findIndex((node) => node.name === 'hips');
    assert.ok(attack.channels.some((channel) => channel.target.node === rightUpperArmNode && channel.target.path === 'rotation'));
    assert.ok(attack.channels.some((channel) => channel.target.node === propMaceNode && channel.target.path === 'rotation'));
    assert.ok(death.channels.some((channel) => channel.target.node === hipsNode && channel.target.path === 'translation'));
    assert.ok(gltf.meshes.some((mesh) => mesh.primitives.some((primitive) => primitive.attributes.JOINTS_0 !== undefined && primitive.attributes.WEIGHTS_0 !== undefined)));
  }
});
