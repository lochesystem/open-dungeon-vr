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
    addMesh(forearm, `${side}_elbow`, new THREE.SphereGeometry(0.082, radial, Math.max(5, radial / 2)), materials.armorEdge, [0, 0, 0]);
    addMesh(forearm, `${side}_elbow_hinge`, new THREE.CylinderGeometry(0.055, 0.055, 0.19, radial), materials.boneDark, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
    addMesh(forearm, `${side}_forearm_bone`, new THREE.CylinderGeometry(0.055, 0.07, 0.42, radial), materials.bone, [0, -0.2, 0]);
    addMesh(forearm, `${side}_bracer`, new THREE.CylinderGeometry(0.105, 0.082, 0.34, radial), materials.armor, [0, -0.2, 0], [1, 1, 0.78]);
    addMesh(forearm, `${side}_wrist_joint`, new THREE.CylinderGeometry(0.072, 0.072, 0.09, radial), materials.armorEdge, [0, -0.39, 0.015]);
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
    addMesh(shin, `${side}_ankle_joint`, new THREE.SphereGeometry(0.075, radial, Math.max(5, radial / 2)), materials.armorEdge, [0, -0.31, 0.09]);
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
  mace.position.set(0.66, 0.5, 0.055);
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

function addBone(name, parent, position) {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.set(...position);
  parent?.add(bone);
  return bone;
}

function buildSkeleton() {
  const bones = {};
  bones.rigRoot = addBone('rig_root', null, [0, 0, 0]);
  bones.hips = addBone('hips', bones.rigRoot, [0, 0.86, 0]);
  bones.spine = addBone('spine_bone', bones.hips, [0, 0.24, 0]);
  bones.chest = addBone('chest', bones.spine, [0, 0.24, 0]);
  bones.neck = addBone('neck', bones.chest, [0, 0.39, 0]);
  bones.head = addBone('head', bones.neck, [0, 0.23, 0]);

  for (const side of ['left', 'right']) {
    const sign = side === 'left' ? -1 : 1;
    bones[`${side}Clavicle`] = addBone(`${side}_clavicle`, bones.chest, [sign * 0.18, 0.2, 0]);
    bones[`${side}UpperArm`] = addBone(`${side}_upper_arm`, bones[`${side}Clavicle`], [sign * 0.3, -0.02, 0]);
    bones[`${side}Forearm`] = addBone(`${side}_forearm`, bones[`${side}UpperArm`], [0, -0.48, 0]);
    bones[`${side}Wrist`] = addBone(`${side}_wrist`, bones[`${side}Forearm`], [0, -0.4, 0.015]);
    bones[`${side}Hand`] = addBone(`${side}_hand_bone`, bones[`${side}Wrist`], [0, -0.05, 0]);
    bones[`${side}UpperLeg`] = addBone(`${side}_upper_leg`, bones.hips, [sign * 0.19, -0.02, 0]);
    bones[`${side}LowerLeg`] = addBone(`${side}_lower_leg`, bones[`${side}UpperLeg`], [0, -0.4, 0]);
    bones[`${side}Ankle`] = addBone(`${side}_ankle`, bones[`${side}LowerLeg`], [0, -0.31, 0.09]);
    bones[`${side}Foot`] = addBone(`${side}_foot`, bones[`${side}Ankle`], [0, -0.05, 0]);
    addBone(`socket_hand_${side}`, bones[`${side}Hand`], [0, -0.1, 0.04]);
  }

  addBone('socket_weapon_right', bones.rightHand, [0, -0.1, 0.04]);
  addBone('socket_memory_rune', bones.chest, [0, 0.03, 0.27]);
  addBone('socket_hit_head', bones.head, [0, 0.05, 0.12]);
  addBone('socket_hit_chest', bones.chest, [0, 0, 0.16]);
  bones.propMace = addBone('prop_mace', bones.rightHand, [0.18, -0.09, 0.04]);
  return bones;
}

function boneForPart(name, bones) {
  if (name.startsWith('mace_')) return bones.propMace;
  if (/skull|eye_|nose_|tooth_/.test(name)) return bones.head;
  if (/neck_|gorget/.test(name)) return bones.neck;
  if (/pelvis/.test(name)) return bones.hips;
  if (name === 'spine') return bones.spine;
  for (const side of ['left', 'right']) {
    if (!name.startsWith(`${side}_`)) continue;
    if (/wrist/.test(name)) return bones[`${side}Wrist`];
    if (/finger|hand/.test(name)) return bones[`${side}Hand`];
    if (/forearm|bracer|elbow/.test(name)) return bones[`${side}Forearm`];
    if (/clavicle|shoulder|pauldron/.test(name)) return bones[`${side}Clavicle`];
    if (/upper_arm/.test(name)) return bones[`${side}UpperArm`];
    if (/ankle/.test(name)) return bones[`${side}Ankle`];
    if (/boot|toe/.test(name)) return bones[`${side}Foot`];
    if (/shin|greave|knee/.test(name)) return bones[`${side}LowerLeg`];
    if (/hip|thigh/.test(name)) return bones[`${side}UpperLeg`];
  }
  return bones.chest;
}

function quaternionValues(angles) {
  return angles.flatMap(([x, y, z]) => {
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
    return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
  });
}

function rotationTrack(bone, times, angles) {
  return new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, quaternionValues(angles));
}

function positionTrack(bone, times, positions) {
  return new THREE.VectorKeyframeTrack(`${bone.name}.position`, times, positions.flat());
}

function buildAnimations(bones) {
  const idleTimes = [0, 1.2, 2.4];
  const idle = new THREE.AnimationClip('idle', 2.4, [
    rotationTrack(bones.chest, idleTimes, [[0, 0, 0], [0, 0.035, 0.025], [0, 0, 0]]),
    rotationTrack(bones.head, idleTimes, [[0, 0, 0], [-0.025, -0.08, 0], [0, 0, 0]]),
    rotationTrack(bones.leftClavicle, idleTimes, [[0, 0, 0.015], [0, -0.018, 0.03], [0, 0, 0.015]]),
    rotationTrack(bones.rightClavicle, idleTimes, [[0, 0, -0.015], [0, 0.018, -0.03], [0, 0, -0.015]]),
    rotationTrack(bones.leftUpperArm, idleTimes, [[0, 0, 0], [0.025, 0, -0.02], [0, 0, 0]]),
    rotationTrack(bones.rightUpperArm, idleTimes, [[0, 0, 0], [-0.025, 0, 0.02], [0, 0, 0]]),
    rotationTrack(bones.leftForearm, idleTimes, [[-0.34, 0, 0.075], [-0.38, 0, 0.09], [-0.34, 0, 0.075]]),
    rotationTrack(bones.rightForearm, idleTimes, [[-0.34, 0, -0.075], [-0.38, 0, -0.09], [-0.34, 0, -0.075]]),
    rotationTrack(bones.leftWrist, idleTimes, [[0.12, 0, -0.025], [0.14, 0, -0.025], [0.12, 0, -0.025]]),
    rotationTrack(bones.rightWrist, idleTimes, [[0.12, 0, 0.025], [0.14, 0, 0.025], [0.12, 0, 0.025]]),
  ]);

  const walkTimes = Array.from({ length: 9 }, (_, index) => index * 0.1);
  const phaseAt = (time) => (time / 0.8) * Math.PI * 2;
  const swing = (amount, phaseOffset = 0) => walkTimes.map((time) => [Math.sin(phaseAt(time) + phaseOffset) * amount, 0, 0]);
  const flex = (amount, phaseOffset = 0, rest = 0) => walkTimes.map((time) => [rest + Math.max(0, Math.sin(phaseAt(time) + phaseOffset)) * amount, 0, 0]);
  const counterFlex = (amount, phaseOffset = 0) => walkTimes.map((time) => [-Math.max(0, Math.sin(phaseAt(time) + phaseOffset)) * amount, 0, 0]);
  const walk = new THREE.AnimationClip('walk', 0.8, [
    positionTrack(bones.hips, walkTimes, walkTimes.map((time) => [Math.sin(phaseAt(time)) * 0.018, 0.86 + Math.abs(Math.sin(phaseAt(time))) * 0.025, 0])),
    rotationTrack(bones.leftUpperLeg, walkTimes, swing(0.34)),
    rotationTrack(bones.rightUpperLeg, walkTimes, swing(0.34, Math.PI)),
    rotationTrack(bones.leftLowerLeg, walkTimes, flex(0.46, Math.PI)),
    rotationTrack(bones.rightLowerLeg, walkTimes, flex(0.46, 0)),
    rotationTrack(bones.leftAnkle, walkTimes, counterFlex(0.3, Math.PI)),
    rotationTrack(bones.rightAnkle, walkTimes, counterFlex(0.3, 0)),
    rotationTrack(bones.leftFoot, walkTimes, swing(0.08, Math.PI)),
    rotationTrack(bones.rightFoot, walkTimes, swing(0.08, 0)),
    rotationTrack(bones.leftClavicle, walkTimes, walkTimes.map((time) => [0, Math.sin(phaseAt(time)) * 0.035, 0.02 + Math.sin(phaseAt(time) * 2) * 0.018])),
    rotationTrack(bones.rightClavicle, walkTimes, walkTimes.map((time) => [0, -Math.sin(phaseAt(time)) * 0.035, -0.02 - Math.sin(phaseAt(time) * 2) * 0.018])),
    rotationTrack(bones.leftUpperArm, walkTimes, walkTimes.map((time) => [Math.sin(phaseAt(time) + Math.PI) * 0.4, Math.sin(phaseAt(time)) * 0.035, -0.06])),
    rotationTrack(bones.rightUpperArm, walkTimes, walkTimes.map((time) => [Math.sin(phaseAt(time)) * 0.4, -Math.sin(phaseAt(time)) * 0.035, 0.06])),
    rotationTrack(bones.leftForearm, walkTimes, walkTimes.map((time) => [-0.4 - Math.max(0, Math.sin(phaseAt(time))) * 0.28, 0, 0.08 + Math.abs(Math.sin(phaseAt(time))) * 0.035])),
    rotationTrack(bones.rightForearm, walkTimes, walkTimes.map((time) => [-0.4 - Math.max(0, Math.sin(phaseAt(time) + Math.PI)) * 0.28, 0, -0.08 - Math.abs(Math.sin(phaseAt(time))) * 0.035])),
    rotationTrack(bones.leftWrist, walkTimes, walkTimes.map((time) => [0.14 + Math.max(0, Math.sin(phaseAt(time))) * 0.08, 0, -0.028])),
    rotationTrack(bones.rightWrist, walkTimes, walkTimes.map((time) => [0.14 + Math.max(0, Math.sin(phaseAt(time) + Math.PI)) * 0.08, 0, 0.028])),
    rotationTrack(bones.chest, walkTimes, walkTimes.map((time) => [0, Math.sin(phaseAt(time)) * 0.045, Math.sin(phaseAt(time) * 2) * 0.012])),
    rotationTrack(bones.head, walkTimes, walkTimes.map((time) => [0, -Math.sin(phaseAt(time)) * 0.025, 0])),
  ]);

  const attackTimes = [0, 0.25, 0.62, 0.88, 1.12, 1.5];
  const attackMace = new THREE.AnimationClip('attack_mace', 1.5, [
    rotationTrack(bones.hips, attackTimes, [[0, 0, 0], [0, -0.08, 0.02], [0, -0.18, 0.04], [0, 0.16, -0.025], [0, 0.09, -0.015], [0, 0, 0]]),
    rotationTrack(bones.chest, attackTimes, [[0, 0, 0], [-0.04, -0.12, 0.02], [-0.08, -0.26, 0.04], [0.12, 0.24, -0.05], [0.05, 0.12, -0.025], [0, 0, 0]]),
    rotationTrack(bones.head, attackTimes, [[0, 0, 0], [0.03, 0.08, 0], [0.05, 0.12, 0], [-0.08, -0.08, 0], [-0.03, -0.03, 0], [0, 0, 0]]),
    rotationTrack(bones.rightClavicle, attackTimes, [[0, 0, -0.02], [-0.08, 0, -0.12], [-0.18, 0.04, -0.26], [0.04, 0, -0.05], [0.02, 0, -0.03], [0, 0, -0.02]]),
    rotationTrack(bones.rightUpperArm, attackTimes, [[0, 0, 0.06], [-0.12, 0, 0.65], [-0.18, 0, 2.48], [-0.58, 0.04, 0.72], [-0.34, 0.02, 0.34], [0, 0, 0.06]]),
    rotationTrack(bones.rightForearm, attackTimes, [[-0.4, 0, -0.08], [-0.62, 0, -0.12], [-0.95, 0, -0.16], [-0.25, 0, -0.06], [-0.48, 0, -0.09], [-0.4, 0, -0.08]]),
    rotationTrack(bones.rightWrist, attackTimes, [[0.14, 0, 0.028], [0.22, 0, 0.03], [0.32, 0, 0.035], [0.08, 0, 0.018], [0.16, 0, 0.025], [0.14, 0, 0.028]]),
    rotationTrack(bones.leftUpperArm, attackTimes, [[0, 0, -0.06], [-0.18, 0, -0.14], [-0.24, 0, -0.18], [0.14, 0, -0.1], [0.06, 0, -0.08], [0, 0, -0.06]]),
    rotationTrack(bones.leftForearm, attackTimes, [[-0.4, 0, 0.08], [-0.52, 0, 0.12], [-0.58, 0, 0.14], [-0.34, 0, 0.09], [-0.38, 0, 0.08], [-0.4, 0, 0.08]]),
  ]);

  const staggerTimes = [0, 0.08, 0.22, 0.44, 0.68];
  const stagger = new THREE.AnimationClip('stagger', 0.68, [
    positionTrack(bones.hips, staggerTimes, [[0, 0.86, 0], [0, 0.85, -0.035], [0, 0.83, -0.075], [0, 0.85, -0.03], [0, 0.86, 0]]),
    rotationTrack(bones.chest, staggerTimes, [[0, 0, 0], [-0.08, 0, 0], [-0.2, 0.04, 0.04], [-0.07, -0.02, -0.015], [0, 0, 0]]),
    rotationTrack(bones.head, staggerTimes, [[0, 0, 0], [0.1, 0, 0], [0.22, -0.08, 0.05], [0.07, 0.03, -0.02], [0, 0, 0]]),
    rotationTrack(bones.leftUpperArm, staggerTimes, [[0, 0, -0.06], [0.1, 0, -0.16], [0.26, 0, -0.32], [0.08, 0, -0.12], [0, 0, -0.06]]),
    rotationTrack(bones.rightUpperArm, staggerTimes, [[0, 0, 0.06], [0.1, 0, 0.16], [0.26, 0, 0.32], [0.08, 0, 0.12], [0, 0, 0.06]]),
    rotationTrack(bones.leftForearm, staggerTimes, [[-0.4, 0, 0.08], [-0.3, 0, 0.12], [-0.12, 0, 0.18], [-0.34, 0, 0.1], [-0.4, 0, 0.08]]),
    rotationTrack(bones.rightForearm, staggerTimes, [[-0.4, 0, -0.08], [-0.3, 0, -0.12], [-0.12, 0, -0.18], [-0.34, 0, -0.1], [-0.4, 0, -0.08]]),
  ]);

  const deathTimes = [0, 0.25, 0.55, 0.95, 1.35, 1.7];
  const death = new THREE.AnimationClip('death', 1.7, [
    positionTrack(bones.hips, deathTimes, [[0, 0.86, 0], [-0.04, 0.82, 0], [-0.12, 0.68, -0.04], [-0.25, 0.38, -0.1], [-0.34, 0.18, -0.14], [-0.36, 0.14, -0.15]]),
    rotationTrack(bones.hips, deathTimes, [[0, 0, 0], [0.05, 0, -0.12], [0.12, 0, -0.42], [0.18, 0.04, -0.9], [0.2, 0.08, -1.32], [0.2, 0.08, -1.4]]),
    rotationTrack(bones.chest, deathTimes, [[0, 0, 0], [-0.08, 0.05, 0.04], [-0.16, 0.12, -0.08], [-0.22, 0.18, -0.18], [-0.26, 0.2, -0.22], [-0.26, 0.2, -0.22]]),
    rotationTrack(bones.head, deathTimes, [[0, 0, 0], [0.08, -0.06, 0], [0.18, -0.14, 0.08], [0.26, -0.2, 0.14], [0.3, -0.24, 0.18], [0.3, -0.24, 0.18]]),
    rotationTrack(bones.leftUpperLeg, deathTimes, [[0, 0, 0], [0.08, 0, 0.04], [0.2, 0, 0.12], [0.34, 0, 0.22], [0.42, 0, 0.28], [0.42, 0, 0.28]]),
    rotationTrack(bones.rightUpperLeg, deathTimes, [[0, 0, 0], [-0.04, 0, -0.03], [-0.12, 0, -0.08], [-0.24, 0, -0.14], [-0.32, 0, -0.2], [-0.32, 0, -0.2]]),
    rotationTrack(bones.leftLowerLeg, deathTimes, [[0, 0, 0], [0.08, 0, 0], [0.22, 0, 0], [0.38, 0, 0], [0.48, 0, 0], [0.48, 0, 0]]),
    rotationTrack(bones.rightLowerLeg, deathTimes, [[0, 0, 0], [0.12, 0, 0], [0.3, 0, 0], [0.5, 0, 0], [0.62, 0, 0], [0.62, 0, 0]]),
    rotationTrack(bones.leftUpperArm, deathTimes, [[0, 0, -0.06], [0.08, 0, -0.16], [0.2, 0, -0.34], [0.32, 0, -0.48], [0.38, 0, -0.55], [0.38, 0, -0.55]]),
    rotationTrack(bones.rightUpperArm, deathTimes, [[0, 0, 0.06], [0.04, 0, 0.12], [0.12, 0, 0.24], [0.2, 0, 0.36], [0.24, 0, 0.44], [0.24, 0, 0.44]]),
  ]);
  return [idle, walk, attackMace, stagger, death];
}

function rigGuardian(sourceRoot) {
  sourceRoot.updateMatrixWorld(true);
  const sourceMeshes = [];
  sourceRoot.traverse((object) => {
    if (object.isMesh) sourceMeshes.push(object);
  });

  const root = new THREE.Group();
  root.name = sourceRoot.name;
  root.userData = { ...sourceRoot.userData, rigged: true };
  const bones = buildSkeleton();
  root.add(bones.rigRoot);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(Object.values(bones));
  skeleton.calculateInverses();
  const boneIndices = new Map(skeleton.bones.map((bone, index) => [bone, index]));

  for (const source of sourceMeshes) {
    const geometry = source.geometry.clone();
    geometry.applyMatrix4(source.matrixWorld);
    const bone = boneForPart(source.name, bones);
    const vertexCount = geometry.attributes.position.count;
    const skinIndices = new Uint16Array(vertexCount * 4);
    const skinWeights = new Float32Array(vertexCount * 4);
    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      skinIndices[vertex * 4] = boneIndices.get(bone);
      skinWeights[vertex * 4] = 1;
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    const mesh = new THREE.SkinnedMesh(geometry, source.material);
    mesh.name = source.name;
    mesh.userData = { ...source.userData, weightedBone: bone.name };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.bind(skeleton, new THREE.Matrix4());
    root.add(mesh);
  }

  root.animations = buildAnimations(bones);
  root.updateMatrixWorld(true);
  return root;
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
  for (const side of ['left', 'right']) {
    const sign = side === 'left' ? -1 : 1;
    addMesh(chest, `${side}_clavicle_bone`, new THREE.CylinderGeometry(0.038, 0.045, 0.34, detail === 0 ? 8 : 5), materials.bone, [sign * 0.25, 0.18, 0.02], [1, 1, 1], [0, 0, Math.PI / 2]);
  }
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
  return rigGuardian(root);
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
    bones: root.getObjectsByProperty('isBone', true).length,
    animations: root.animations.map((clip) => clip.name),
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
    animations: root.animations,
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
