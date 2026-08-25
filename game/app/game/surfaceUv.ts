import * as THREE from 'three';

function assertTileSize(tileWidth: number, tileHeight: number) {
  if (!(tileWidth > 0) || !(tileHeight > 0)) throw new RangeError('texture tile size must be positive');
}

export function mapBoxUvsByWorldScale<T extends THREE.BufferGeometry>(
  geometry: T,
  tileWidth: number,
  tileHeight: number,
): T {
  assertTileSize(tileWidth, tileHeight);
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const uvs = geometry.getAttribute('uv');

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const normalX = Math.abs(normals.getX(index));
    const normalY = Math.abs(normals.getY(index));
    const normalZ = Math.abs(normals.getZ(index));

    if (normalX >= normalY && normalX >= normalZ) {
      uvs.setXY(index, z / tileWidth, y / tileHeight);
    } else if (normalY >= normalZ) {
      uvs.setXY(index, x / tileWidth, z / tileHeight);
    } else {
      uvs.setXY(index, x / tileWidth, y / tileHeight);
    }
  }
  uvs.needsUpdate = true;
  return geometry;
}

export function mapPlaneUvsByWorldScale<T extends THREE.BufferGeometry>(
  geometry: T,
  tileWidth: number,
  tileHeight: number,
): T {
  assertTileSize(tileWidth, tileHeight);
  const positions = geometry.getAttribute('position');
  const uvs = geometry.getAttribute('uv');
  for (let index = 0; index < positions.count; index += 1) {
    uvs.setXY(index, positions.getX(index) / tileWidth, positions.getY(index) / tileHeight);
  }
  uvs.needsUpdate = true;
  return geometry;
}

export function mapCylinderUvsByWorldScale<T extends THREE.BufferGeometry>(
  geometry: T,
  circumference: number,
  height: number,
  tileWidth: number,
  tileHeight: number,
): T {
  assertTileSize(tileWidth, tileHeight);
  if (!(circumference > 0) || !(height > 0)) throw new RangeError('cylinder dimensions must be positive');
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const uvs = geometry.getAttribute('uv');
  for (let index = 0; index < uvs.count; index += 1) {
    if (Math.abs(normals.getY(index)) > 0.9) {
      uvs.setXY(index, positions.getX(index) / tileWidth, positions.getZ(index) / tileHeight);
    } else {
      uvs.setXY(
        index,
        uvs.getX(index) * circumference / tileWidth,
        (positions.getY(index) + height / 2) / tileHeight,
      );
    }
  }
  uvs.needsUpdate = true;
  return geometry;
}
