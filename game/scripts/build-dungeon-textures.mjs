import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(gameRoot, 'assets/textures/dungeon-v1/source');
const outputRoot = resolve(gameRoot, 'public/assets/textures/dungeon-v1');
const textureSize = 512;
const quadrantSize = textureSize / 2;

const materials = [
  { id: 'stone-wall', source: 'stone-wall-ai-source.png', normalStrength: 2.4 },
  { id: 'flagstone-floor', source: 'flagstone-floor-ai-source.png', normalStrength: 2.8 },
  { id: 'aged-bronze', source: 'aged-bronze-ai-source.png', normalStrength: 1.35 },
];

async function mirroredTile(sourcePath) {
  const quadrant = await sharp(sourcePath)
    .resize(quadrantSize, quadrantSize, { fit: 'cover', position: 'centre' })
    .removeAlpha()
    .toBuffer();
  const horizontal = await sharp(quadrant).flop().toBuffer();
  const vertical = await sharp(quadrant).flip().toBuffer();
  const diagonal = await sharp(quadrant).flip().flop().toBuffer();
  return sharp({
    create: {
      width: textureSize,
      height: textureSize,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  }).composite([
    { input: quadrant, left: 0, top: 0 },
    { input: horizontal, left: quadrantSize, top: 0 },
    { input: vertical, left: 0, top: quadrantSize },
    { input: diagonal, left: quadrantSize, top: quadrantSize },
  ]).png().toBuffer();
}

async function normalMap(tile, strength) {
  const { data, info } = await sharp(tile)
    .greyscale()
    .blur(1.2)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = Buffer.alloc(info.width * info.height * 3);
  const sample = (x, y) => data[((y + info.height) % info.height) * info.width + ((x + info.width) % info.width)];

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const dx = (sample(x + 1, y) - sample(x - 1, y)) / 255 * strength;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) / 255 * strength;
      const inverseLength = 1 / Math.hypot(dx, dy, 1);
      const offset = (y * info.width + x) * 3;
      output[offset] = Math.round((-dx * inverseLength * 0.5 + 0.5) * 255);
      output[offset + 1] = Math.round((-dy * inverseLength * 0.5 + 0.5) * 255);
      output[offset + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
    }
  }

  for (let y = 0; y < info.height; y += 1) {
    output.copy(output, (y * info.width + info.width - 1) * 3, y * info.width * 3, y * info.width * 3 + 3);
  }
  output.copy(output, (info.height - 1) * info.width * 3, 0, info.width * 3);

  return sharp(output, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

await mkdir(outputRoot, { recursive: true });
const report = { version: 1, size: textureSize, materials: {} };

for (const material of materials) {
  const tile = await mirroredTile(resolve(sourceRoot, material.source));
  const albedo = await sharp(tile).webp({ quality: 82, effort: 6, smartSubsample: true }).toBuffer();
  const normal = await normalMap(tile, material.normalStrength);
  const albedoName = `${material.id}-albedo.webp`;
  const normalName = `${material.id}-normal.png`;
  await Promise.all([
    writeFile(resolve(outputRoot, albedoName), albedo),
    writeFile(resolve(outputRoot, normalName), normal),
  ]);
  report.materials[material.id] = {
    source: `../../../../assets/textures/dungeon-v1/source/${material.source}`,
    albedo: albedoName,
    normal: normalName,
    albedoBytes: albedo.byteLength,
    normalBytes: normal.byteLength,
  };
}

await writeFile(resolve(outputRoot, 'manifest.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
