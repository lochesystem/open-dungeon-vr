import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INVENTORY_PREVIEW_SCALE,
  INVENTORY_SLOT_CENTER_SPACING,
  inventoryPreviewYaw,
} from '../app/game/inventoryPreview.ts';

test('cube and key previews fit inside their slot without touching neighbours', () => {
  const cubeWidth = 0.4 * INVENTORY_PREVIEW_SCALE.cube;
  const keyWidth = 0.55 * INVENTORY_PREVIEW_SCALE.key;
  const potionWidth = 0.26 * INVENTORY_PREVIEW_SCALE.potion;
  const safeWidth = INVENTORY_SLOT_CENTER_SPACING * 0.82;

  assert.ok(cubeWidth < safeWidth);
  assert.ok(keyWidth < safeWidth);
  assert.ok(potionWidth < safeWidth);
});

test('sword preview remains compact enough for a single inventory socket', () => {
  assert.ok(INVENTORY_PREVIEW_SCALE.sword * 1.05 < INVENTORY_SLOT_CENTER_SPACING);
});

test('inventory preview only rocks subtly instead of completing full rotations', () => {
  for (let frame = 0; frame < 240; frame += 1) {
    assert.ok(Math.abs(inventoryPreviewYaw(frame / 60, 1)) <= 0.16);
  }
});
