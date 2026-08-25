import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const textureRoot = resolve(gameRoot, 'public/assets/textures/dungeon-v1');

test('dungeon texture kit stays tileable and within the Quest budget', async () => {
  const manifest = JSON.parse(await readFile(resolve(textureRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.size, 512);
  assert.deepEqual(Object.keys(manifest.materials), ['stone-wall', 'flagstone-floor', 'aged-bronze']);

  let totalBytes = 0;
  for (const material of Object.values(manifest.materials)) {
    const albedo = sharp(resolve(textureRoot, material.albedo));
    const normal = sharp(resolve(textureRoot, material.normal));
    const [albedoMetadata, normalPixels] = await Promise.all([
      albedo.metadata(),
      normal.raw().toBuffer({ resolveWithObject: true }),
    ]);
    assert.equal(albedoMetadata.width, 512);
    assert.equal(albedoMetadata.height, 512);
    assert.equal(normalPixels.info.width, 512);
    assert.equal(normalPixels.info.height, 512);

    const { data, info } = normalPixels;
    const pixel = (x, y) => data.subarray((y * info.width + x) * info.channels, (y * info.width + x + 1) * info.channels);
    for (let coordinate = 0; coordinate < info.width; coordinate += 16) {
      assert.deepEqual(pixel(0, coordinate), pixel(info.width - 1, coordinate));
      assert.deepEqual(pixel(coordinate, 0), pixel(coordinate, info.height - 1));
    }
    totalBytes += material.albedoBytes + material.normalBytes;
  }
  assert.ok(totalBytes < 900_000, `texture download budget exceeded: ${totalBytes} bytes`);
});

test('room consumes every generated dungeon material', async () => {
  const engine = await readFile(resolve(gameRoot, 'app/game/engine.ts'), 'utf8');
  for (const asset of [
    'stone-wall-albedo.webp',
    'stone-wall-normal.png',
    'flagstone-floor-albedo.webp',
    'flagstone-floor-normal.png',
    'aged-bronze-albedo.webp',
    'aged-bronze-normal.png',
  ]) {
    assert.match(engine, new RegExp(asset.replace('.', '\\.')));
  }
  assert.doesNotMatch(engine, /new THREE\.GridHelper\(24, 24/);
});
