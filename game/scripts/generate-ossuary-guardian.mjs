import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

if (globalThis.FileReader === undefined) {
  globalThis.FileReader = class FileReader {
    result = null;
    onloadend = null;

    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = buffer;
        this.onloadend?.();
      });
    }
  };
}

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(gameRoot, 'assets/models/enemies/ossuary-guardian-v1');

function materialLibrary() {
  return {
    bone: new THREE.MeshStandardMaterial({
      name: 'mat_bone_aged', color: 0xc9b98f, roughness: 0.82, metalness: 0.02,
    }),
    boneDark: new THREE.MeshStandardMaterial({
      name: 'mat_bone_cavity', color: 0x322c24, roughness: 0.95, metalness: 0,
    }),
    armor: new THREE.MeshStandardMaterial({
      name: 'mat_bronze_oxidized', color: 0x264b47, roughness: 0.48, metalness: 0.68,
    }),
    armorEdge: new THREE.MeshStandardMaterial({
      name: 'mat_bronze_edge', color: 0x86613d, roughness: 0.38, metalness: 0.76,
    }),
    leather: new THREE.MeshStandardMaterial({
      name: 'mat_leather_dark', color: 0x3d291f, roughness: 0.9, metalness: 0.02,
    }),
    rune: new THREE.MeshStandardMaterial({
      name: 'mat_rune_memory', color: 0x8fffe0, emissive: 0x20d7aa, emissiveIntensity: 3.4,
      roughness: 0.18, metalness: 0.28,
    }),
    eye: new THREE.MeshStandardMaterial({
      name: 'mat_eye_ember', color: 0xffaa45, emissive: 0xff6a18, emissiveIntensity: 4,
      roughness: 0.2, metalness: 0,
    }),
  };
}

function addMesh(parent, name, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addLimb(parent, side, materials, detail, isArm) {
  const sign = side === 'left' ? -1 : 1;
  const radial = detail === 0 ? 10 : 6;
  const group = new THREE.Group();
  group.name = `${side}_${isArm ? 'arm' : 'leg'}_assembly`;
  if (isArm) {
    group.position.set(sign * 0.48, 1.52, 0);
    group.rotation.z = sign * 0.18;
    addMesh(group, `${side}_upper_arm_bone`, new THREE.CylinderGeometry(0.07, 0.085, 0.48, radial), materials.bone, [0, -0.23, 0]);
    addMesh(group, `${side}_shoulder_joint`, new THREE.SphereGeometry(0.1, radial, Math.max(5, radial / 2)), materials.boneDark, [0, 0, 0]);
    addMesh(group, `${side}_pauldron`, new THREE.DodecahedronGeometry(0.18, detail === 0 ? 1 : 0), materials.armor, [0, -0.02, 0.015], [1.35, 0.72, 1.1]);
    const forearm = new THREE.Group();
    forearm.name = `${side}_forearm_pivot`;
    forearm.position.set(0, -0.48, 0);
    addMesh(forearm, `${side}_elbow`, new THREE.SphereGeometry(0.082, radial, Math.max(5, radial / 2)), materials.boneDark, [0, 0, 0]);
    addMesh(forearm, `${side}_forearm_bone`, new THREE.CylinderGeometry(0.055, 0.07, 0.42, radial), materials.bone, [0, -0.2, 0]);
    addMesh(forearm, `${side}_bracer`, new THREE.CylinderGeometry(0.105, 0.082, 0.34, radial), materials.armor, [0, -0.2, 0], [1, 1, 0.78]);
    addMesh(forearm, `${side}_hand`, new THREE.BoxGeometry(0.13, 0.18, 0.1), materials.bone, [0, -0.45, 0.015], [1, 1, 0.8]);
    if (detail === 0) {
      for (let finger = -1.5; finger <= 1.5; finger += 1) {
        addMesh(forearm, `${side}_finger_${finger + 1.5}`, new THREE.BoxGeometry(0.022, 0.11, 0.025), materials.bone, [finger * 0.027, -0.56, 0.025]);
      }
    }
    group.add(forearm);
  } else {
    group.position.set(sign * 0.19, 0.84, 0);
    addMesh(group, `${side}_hip_joint`, new THREE.SphereGeometry(0.11, radial, Math.max(5, radial / 2)), materials.boneDark, [0, 0, 0]);
    addMesh(group, `${side}_thigh_bone`, new THREE.CylinderGeometry(0.09, 0.105, 0.4, radial), materials.bone, [0, -0.2, 0]);
    addMesh(group, `${side}_thigh_guard`, new THREE.CylinderGeometry(0.14, 0.105, 0.34, radial), materials.armor, [0, -0.18, 0.015], [1, 1, 0.78]);
    const shin = new THREE.Group();
    shin.name = `${side}_shin_pivot`;
    shin.position.set(0, -0.4, 0);
    addMesh(shin, `${side}_knee`, new THREE.DodecahedronGeometry(0.115, 0), materials.armorEdge, [0, 0, 0.055], [1, 0.9, 0.75]);
    addMesh(shin, `${side}_shin_bone`, new THREE.CylinderGeometry(0.07, 0.085, 0.32, radial), materials.bone, [0, -0.15, 0]);
    addMesh(shin, `${side}_greave`, new THREE.CylinderGeometry(0.12, 0.095, 0.34, radial), materials.armor, [0, -0.16, 0.035], [1, 1, 0.78]);
    addMesh(shin, `${side}_boot`, new THREE.BoxGeometry(0.24, 0.14, 0.38), materials.armor, [0, -0.36, 0.09]);
    addMesh(shin, `${side}_toe_bone`, new THREE.BoxGeometry(0.18, 0.08, 0.16), materials.bone, [0, -0.33, 0.25]);
    group.add(shin);
  }
  parent.add(group);
}

function addRibs(chest, materials, detail) {
  const ribCount = detail === 0 ? 5 : 3;
  const tubularSegments = detail === 0 ? 12 : 6;
  const radialSegments = detail === 0 ? 5 : 3;
  for (let index = 0; index < ribCount; index += 1) {
    const y = 0.22 - index * (detail === 0 ? 0.09 : 0.14);
    for (const side of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.05, y, 0.13),
        new THREE.Vector3(side * 0.23, y + 0.035, 0.18),
        new THREE.Vector3(side * 0.38, y - 0.015, 0.08),
        new THREE.Vector3(side * 0.31, y - 0.08, -0.03),
      ]);
      addMesh(
        chest,
        `rib_${index}_${side < 0 ? 'left' : 'right'}`,
        new THREE.TubeGeometry(curve, tubularSegments, 0.026, radialSegments, false),
        materials.bone,
        [0, 0, 0],
      );
    }
  }
}

function addSkull(head, materials, detail) {
  const segments = detail === 0 ? 12 : 7;
  addMesh(head, 'skull_cranium', new THREE.DodecahedronGeometry(0.22, detail === 0 ? 1 : 0), materials.bone, [0, 0.05, 0], [0.9, 1.08, 0.86]);
  addMesh(head, 'skull_jaw', new THREE.BoxGeometry(0.25, 0.13, 0.15), materials.bone, [0, -0.13, 0.035], [0.82, 1, 0.9]);
  for (const side of [-1, 1]) {
    addMesh(head, `eye_socket_${side}`, new THREE.SphereGeometry(0.067, segments, Math.max(5, Math.floor(segments / 2))), materials.boneDark, [side * 0.082, 0.075, 0.17], [1, 0.85, 0.42]);
    addMesh(head, `eye_ember_${side}`, new THREE.SphereGeometry(0.034, segments, Math.max(5, Math.floor(segments / 2))), materials.eye, [side * 0.082, 0.075, 0.205]);
  }
  addMesh(head, 'nose_cavity', new THREE.ConeGeometry(0.035, 0.08, 3), materials.boneDark, [0, 0.005, 0.19], [1, 1, 0.5], [0, 0, Math.PI]);
  if (detail === 0) {
    for (let tooth = -2; tooth <= 2; tooth += 1) {
      addMesh(head, `tooth_${tooth + 2}`, new THREE.BoxGeometry(0.027, 0.055, 0.025), materials.bone, [tooth * 0.033, -0.095, 0.125]);
    }
  }
}

function addMace(root, materials, detail) {
  const radial = detail === 0 ? 12 : 6;
  const mace = new THREE.Group();
  mace.name = 'weapon_mace_assembly';
  mace.position.set(0.86, 0.12, 0);
  addMesh(mace, 'mace_grip', new THREE.CylinderGeometry(0.035, 0.04, 0.78, radial), materials.leather, [0, 0.39, 0]);
  addMesh(mace, 'mace_pommel', new THREE.SphereGeometry(0.065, radial, Math.max(5, radial / 2)), materials.armorEdge, [0, -0.02, 0]);
  addMesh(mace, 'mace_neck', new THREE.CylinderGeometry(0.07, 0.05, 0.16, radial), materials.armorEdge, [0, 0.84, 0]);
  addMesh(mace, 'mace_head', new THREE.DodecahedronGeometry(0.19, detail === 0 ? 1 : 0), materials.armor, [0, 1.02, 0], [1.05, 1.18, 1.05]);
  if (detail === 0) {
    for (const direction of [
      [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0],
    ]) {
      addMesh(mace, `mace_stud_${direction.join('_')}`, new THREE.ConeGeometry(0.045, 0.11, 4), materials.armorEdge, [direction[0] * 0.19, 1.02 + direction[1] * 0.22, direction[2] * 0.19], [1, 1, 1], [direction[2] * Math.PI / 2, 0, -direction[0] * Math.PI / 2]);
    }
  }
  root.add(mace);
}

function buildGuardian(detail) {
  const materials = materialLibrary();
  const root = new THREE.Group();
  root.name = `ossuary_guardian_lod${detail}`;
  root.userData = { assetId: 'enemy_ossuary_guardian_v1', lod: detail, rigTarget: 'humanoid_large_v1' };

  const hips = new THREE.Group();
  hips.name = 'hips_pivot';
  hips.position.y = 0.86;
  addMesh(hips, 'pelvis_core', new THREE.BoxGeometry(0.46, 0.24, 0.28), materials.boneDark, [0, 0, 0]);
  addMesh(hips, 'pelvis_armor', new THREE.DodecahedronGeometry(0.28, 0), materials.armor, [0, 0.04, 0.02], [1.35, 0.72, 0.72]);
  addMesh(hips, 'pelvis_front_plate', new THREE.BoxGeometry(0.29, 0.36, 0.08), materials.armor, [0, -0.14, 0.19], [1, 1, 1], [0.12, 0, 0]);
  root.add(hips);

  const chest = new THREE.Group();
  chest.name = 'chest_pivot';
  chest.position.y = 1.34;
  addMesh(chest, 'spine', new THREE.CylinderGeometry(0.09, 0.11, 0.52, detail === 0 ? 10 : 6), materials.boneDark, [0, -0.08, -0.05]);
  addRibs(chest, materials, detail);
  addMesh(chest, 'back_plate', new THREE.BoxGeometry(0.54, 0.52, 0.1), materials.armor, [0, 0.01, -0.17], [1, 1, 1]);
  addMesh(chest, 'sternum_plate', new THREE.DodecahedronGeometry(0.23, 0), materials.armor, [0, 0.02, 0.17], [1.15, 1.35, 0.34]);
  addMesh(chest, 'memory_rune', new THREE.OctahedronGeometry(0.115, 0), materials.rune, [0, 0.03, 0.265], [0.84, 1.25, 0.28]);
  root.add(chest);

  const neck = new THREE.Group();
  neck.name = 'neck_pivot';
  neck.position.y = 1.73;
  addMesh(neck, 'neck_column', new THREE.CylinderGeometry(0.075, 0.095, 0.2, detail === 0 ? 10 : 6), materials.boneDark, [0, 0, 0]);
  addMesh(neck, 'gorget', new THREE.CylinderGeometry(0.22, 0.19, 0.12, detail === 0 ? 12 : 6), materials.armor, [0, 0.02, 0]);
  root.add(neck);

  const head = new THREE.Group();
  head.name = 'head_pivot';
  head.position.y = 1.96;
  addSkull(head, materials, detail);
  root.add(head);

  addLimb(root, 'left', materials, detail, true);
  addLimb(root, 'right', materials, detail, true);
  addLimb(root, 'left', materials, detail, false);
  addLimb(root, 'right', materials, detail, false);
  addMace(root, materials, detail);

  root.traverse((object) => {
    if (object.isMesh) object.userData.part = object.name;
  });
  root.updateMatrixWorld(true);
  return root;
}

function metricsFor(root) {
  let triangles = 0;
  let vertices = 0;
  let meshes = 0;
  const materials = new Set();
  root.traverse((object) => {
    if (!object.isMesh) return;
    meshes += 1;
    vertices += object.geometry.attributes.position.count;
    triangles += object.geometry.index
      ? object.geometry.index.count / 3
      : object.geometry.attributes.position.count / 3;
    materials.add(object.material.name);
  });
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  return {
    meshes,
    materials: materials.size,
    vertices,
    triangles: Math.round(triangles),
    bounds: {
      width: Number(size.x.toFixed(3)),
      height: Number(size.y.toFixed(3)),
      depth: Number(size.z.toFixed(3)),
    },
  };
}

async function exportGlb(root, outputPath) {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(root, {
    binary: true,
    trs: true,
    onlyVisible: false,
    includeCustomExtensions: true,
  });
  await writeFile(outputPath, Buffer.from(result));
}

await mkdir(outputDirectory, { recursive: true });
const report = {
  id: 'enemy_ossuary_guardian_v1',
  generatedAt: new Date().toISOString(),
  generator: 'scripts/generate-ossuary-guardian.mjs',
  concept: '../../../concepts/ossuary-guardian-v1/ossuary-guardian-turnaround-v1.png',
  targetRig: 'humanoid_large_v1',
  lods: {},
};

for (const detail of [0, 1]) {
  const root = buildGuardian(detail);
  const fileName = `ossuary-guardian-lod${detail}.glb`;
  await exportGlb(root, resolve(outputDirectory, fileName));
  report.lods[`lod${detail}`] = { file: fileName, ...metricsFor(root) };
}

await writeFile(
  resolve(outputDirectory, 'qa-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
