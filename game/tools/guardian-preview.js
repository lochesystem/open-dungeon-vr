import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const turntableEnabled = new URLSearchParams(location.search).has('turntable');
let previousFrameTime = performance.now();
scene.background = new THREE.Color(0x101515);
scene.fog = new THREE.Fog(0x101515, 7, 14);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 50);
camera.position.set(3.2, 1.55, 3.8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
document.body.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xa9d7cf, 0x272016, 2.4));
const key = new THREE.DirectionalLight(0xffe2b4, 4.2);
key.position.set(3, 5, 4);
key.castShadow = true;
scene.add(key);
const rim = new THREE.DirectionalLight(0x58e5c2, 3.5);
rim.position.set(-4, 2.5, -3);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(3.4, 64),
  new THREE.MeshStandardMaterial({ color: 0x1b2522, roughness: 0.96 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
scene.add(new THREE.GridHelper(6, 12, 0x4f746a, 0x263b36));

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.08, 0);
controls.enableDamping = true;
controls.minDistance = 2.3;
controls.maxDistance = 8;

const loader = new GLTFLoader();
const status = document.querySelector('#status');
let candidate;

async function showLod(lod) {
  status.textContent = `Carregando LOD${lod}…`;
  document.querySelectorAll('button').forEach((button) => button.classList.toggle('active', button.dataset.lod === `${lod}`));
  if (candidate) scene.remove(candidate);
  const result = await loader.loadAsync(`../assets/models/enemies/ossuary-guardian-v1/ossuary-guardian-lod${lod}.glb`);
  candidate = result.scene;
  candidate.traverse((object) => {
    if (object.isMesh) object.castShadow = true;
  });
  scene.add(candidate);
  const triangles = lod === 0 ? '4.114' : '1.654';
  status.textContent = `LOD${lod} · ${triangles} triângulos · 2,23 m`;
}

document.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => showLod(Number(button.dataset.lod))));
showLod(0).catch((error) => { status.textContent = `Falha ao carregar: ${error.message}`; });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop(() => {
  const currentFrameTime = performance.now();
  const delta = Math.min((currentFrameTime - previousFrameTime) / 1_000, 0.05);
  previousFrameTime = currentFrameTime;
  if (candidate && turntableEnabled) candidate.rotation.y += delta * 0.54;
  controls.update();
  renderer.render(scene, camera);
});
