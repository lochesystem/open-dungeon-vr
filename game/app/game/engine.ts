import * as THREE from 'three';
import {
  type BoxCollider,
  type CircleCollider,
  type CollisionBounds,
  type StaticCollider,
  resolveMovement,
  resolvePosition,
} from './collision';
import { applyDeadzone, clampFrameDelta, movementVelocity, rigPositionForTrackedSpawn } from './motion';
import { captureGripRotationOffset, heldObjectRotation } from './grip';
import { INVENTORY_PREVIEW_SCALE, inventoryPreviewYaw } from './inventoryPreview';
import { canInsertMissionKey, doorBlocksPassage } from './missionDoor';
import { POTION_WORLD_SCALE, applyNonLethalHazard, healPlayer, shouldDrinkPotion } from './potion';
import { remoteGrabDistance, remotePullDuration, remotePullProgress } from './remoteGrab';
import {
  INITIAL_OBJECT_STATE,
  type AdventureObjectState,
  type Holder,
  type PoseSample,
  claimObject,
  computeThrowVelocity,
  firstAvailableSlot,
  preferredRecoverySlot,
  registerTargetHit,
  releaseObject,
  retrieveObject,
  shouldRecoverObject,
  storeObject,
  sweptTargetHit,
} from './objectInteraction';
import { META_QUEST_PRIMARY_FACE_BUTTON, buttonPressedOnRisingEdge } from './vrInput';
import { moveVrMenuSelection, vrPauseButtonPressed } from './vrPauseMenu';
import { createVrSessionInit } from './xrSession';

export type InteractionSnapshot = {
  canGrab: boolean;
  heldBy: Holder | null;
  storedSlot: number | null;
  targetHits: number;
  storedItemCount: number;
  keyInserted: boolean;
  doorOpen: boolean;
  health: number;
  maximumHealth: number;
  potionConsumed: boolean;
  status: string;
};

export type ComfortSettings = {
  posture: 'standing' | 'seated';
  dominantHand: 'left' | 'right';
  oneHandMode: boolean;
  waistOffset: number;
  menuDistance: number;
};

export const DEFAULT_COMFORT_SETTINGS: ComfortSettings = {
  posture: 'standing',
  dominantHand: 'left',
  oneHandMode: false,
  waistOffset: 0,
  menuDistance: 0.52,
};

type EngineOptions = {
  onStats?: (fps: number) => void;
  onXrChange?: (active: boolean) => void;
  onInteraction?: (snapshot: InteractionSnapshot) => void;
  onComfortChange?: (settings: ComfortSettings) => void;
};

const PLAYER_HEIGHT = 1.68;
const PLAYER_SPAWN = { x: 0, z: 6.8 } as const;
const MOVE_SPEED = 3.8;
const TURN_SPEED = 1.85;
const PLAYER_RADIUS = 0.32;
const CUBE_RADIUS = 0.22;
const GRAB_DISTANCE = 0.58;
const REMOTE_GRAB_DISTANCE = 3.5;
const BAG_SLOT_DISTANCE = 0.22;
const BAG_SLOT_COUNT = 6;
const DESKTOP_REACH = 3.2;
const ROOM_BOUNDS: CollisionBounds = { minX: -11.7, maxX: 11.7, minZ: -11.7, maxZ: 11.7 };
const CUBE_HOME = new THREE.Vector3(3, 1.27, 4.2);
const KEY_HOME = new THREE.Vector3(-3, 1.2, 4.2);
const POTION_HOME = new THREE.Vector3(0, 1.22, 4.15);
const HAZARD_POSITION = new THREE.Vector3(0, 0, 5.45);
const HAZARD_RADIUS = 0.72;
const MAX_HEALTH = 3;
const LOCK_POSITION = new THREE.Vector3(1.45, 1.18, -7.05);
const TARGET_POSITION = new THREE.Vector3(3, 2, -4.8);
const TARGET_RADIUS = 0.72;
const VR_PAUSE_MENU_ITEM_COUNT = 8;

const PILLAR_COLLIDERS: BoxCollider[] = [-9.6, -6.4, 6.4, 9.6].flatMap((x) =>
  [-9.6, 0, 9.6].map((z) => ({
    kind: 'box' as const,
    id: `pillar-${x}-${z}`,
    x,
    z,
    halfX: 0.85,
    halfZ: 0.85,
    rotation: (x + z) * 0.03,
  })),
);

const PORTAL_COLLIDERS: BoxCollider[] = [-2.55, 2.55].map((x) => ({
  kind: 'box' as const,
  id: `portal-post-${x}`,
  x,
  z: -7.4,
  halfX: 0.55,
  halfZ: 0.7,
  rotation: 0,
}));

const ALTAR_COLLIDER: CircleCollider = {
  kind: 'circle',
  id: 'altar',
  x: 0,
  z: 0.5,
  radius: 1.45,
};

const PEDESTAL_COLLIDER: BoxCollider = {
  kind: 'box',
  id: 'rune-cube-pedestal',
  x: CUBE_HOME.x,
  z: CUBE_HOME.z,
  halfX: 0.58,
  halfZ: 0.58,
  rotation: 0,
};

const KEY_PEDESTAL_COLLIDER: BoxCollider = {
  kind: 'box',
  id: 'mission-key-pedestal',
  x: KEY_HOME.x,
  z: KEY_HOME.z,
  halfX: 0.52,
  halfZ: 0.52,
  rotation: 0,
};

const POTION_PEDESTAL_COLLIDER: BoxCollider = {
  kind: 'box',
  id: 'healing-potion-pedestal',
  x: POTION_HOME.x,
  z: POTION_HOME.z,
  halfX: 0.46,
  halfZ: 0.46,
  rotation: 0,
};

const LOCKED_DOOR_COLLIDER: BoxCollider = {
  kind: 'box',
  id: 'locked-portal-door',
  x: 0,
  z: -7.15,
  halfX: 1.72,
  halfZ: 0.16,
  rotation: 0,
};

const ROOM_COLLIDERS: StaticCollider[] = [
  ...PILLAR_COLLIDERS,
  ...PORTAL_COLLIDERS,
  ALTAR_COLLIDER,
  PEDESTAL_COLLIDER,
  KEY_PEDESTAL_COLLIDER,
  POTION_PEDESTAL_COLLIDER,
];

type ItemId = 'cube' | 'key' | 'potion';

type ItemRuntime = {
  id: ItemId;
  label: string;
  object: THREE.Object3D;
  material: THREE.MeshStandardMaterial;
  state: AdventureObjectState;
  home: THREE.Vector3;
  radius: number;
  inventoryScale: number;
  worldScale: number;
  velocity: THREE.Vector3;
  previousPosition: THREE.Vector3;
  sleeping: boolean;
  lastStoredSlot: number | null;
};

export class OpenDungeonEngine {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(70, 1, 0.05, 80);
  private readonly playerRig = new THREE.Group();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly keys = new Set<string>();
  private readonly options: EngineOptions;
  private readonly disposableGeometries = new Set<THREE.BufferGeometry>();
  private readonly disposableMaterials = new Set<THREE.Material>();
  private readonly collisionDebug = new THREE.Group();
  private readonly playerColliderDebug = new THREE.Mesh();
  private readonly worldPosition = new THREE.Vector3();
  private readonly handPosition = new THREE.Vector3();
  private readonly slotPosition = new THREE.Vector3();
  private readonly worldQuaternion = new THREE.Quaternion();
  private readonly raycaster = new THREE.Raycaster();
  private readonly controllers = new Map<Holder, THREE.Group>();
  private readonly poseHistory = new Map<Holder, PoseSample[]>();
  private readonly gripRotationOffsets = new Map<Holder, THREE.Quaternion>();
  private readonly controllerListeners: Array<{ controller: THREE.Group; start: () => void; end: () => void }> = [];
  private readonly adventureBag = new THREE.Group();
  private readonly bagMenu = new THREE.Group();
  private readonly bagSlots: THREE.Mesh[] = [];
  private readonly bagSlotMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly bagMenuMaterial: THREE.MeshBasicMaterial;
  private readonly vrPauseCanvas: HTMLCanvasElement;
  private readonly vrPauseTexture: THREE.CanvasTexture;
  private readonly vrPausePanel: THREE.Mesh;
  private readonly items = new Map<ItemId, ItemRuntime>();
  private readonly door: THREE.Mesh;
  private readonly lockSocket: THREE.Group;
  private readonly hazardMaterial: THREE.MeshStandardMaterial;
  private readonly wristHealth = new THREE.Group();
  private readonly healthPips: THREE.Mesh[] = [];
  private doorColliderDebug: THREE.Object3D | null = null;
  private readonly targetMaterial: THREE.MeshStandardMaterial;
  private readonly targetCore: THREE.Mesh;
  private targetHits = 0;
  private targetPulseSeconds = 0;
  private lastInteractionSignature = '';
  private keyInserted = false;
  private doorOpenAmount = 0;
  private health = MAX_HEALTH;
  private potionConsumed = false;
  private drinkProgress = 0;
  private hazardOccupied = false;
  private hazardPulseSeconds = 0;
  private audioContext: AudioContext | null = null;
  private animationSeconds = 0;
  private lastFrameSeconds = 0;
  private frameCount = 0;
  private statsSeconds = 0;
  private yaw = 0;
  private paused = false;
  private disposed = false;
  private readonly quest: boolean;
  private xrOriginPending = false;
  private bagOpenAmount = 0;
  private bagMenuOpen = false;
  private desktopBagOpenSeconds = 0;
  private inventoryButtonWasPressed = false;
  private comfort: ComfortSettings = { ...DEFAULT_COMFORT_SETTINGS };
  private vrPauseMenuOpen = false;
  private vrPauseMenuIndex = 0;
  private vrPauseButtonWasPressed = false;
  private vrPauseAxisReady = true;
  private vrPauseAdjustReady = true;
  private readonly vrMenuSelectGuards = new Set<'left' | 'right'>();
  private pullAnimation: {
    itemId: ItemId;
    holder: 'left' | 'right';
    fromPosition: THREE.Vector3;
    fromRotation: THREE.Quaternion;
    elapsed: number;
    duration: number;
  } | null = null;

  constructor(container: HTMLElement, options: EngineOptions = {}) {
    this.options = options;
    this.quest = /OculusBrowser|Meta Quest/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.quest,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quest ? 1 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    this.renderer.xr.setFramebufferScaleFactor(0.78);
    this.renderer.domElement.className = 'game-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Sala tridimensional da fundação de Open Dungeon VR');
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x0c1519);
    this.scene.fog = new THREE.FogExp2(0x0c1519, 0.022);
    this.camera.position.set(0, PLAYER_HEIGHT, 0);
    this.playerRig.position.set(PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z);
    this.playerRig.add(this.camera);
    this.scene.add(this.playerRig);

    const interactables = this.buildRoom();
    this.items.set('cube', this.createItemRuntime(
      'cube', 'Cubo rúnico', interactables.runeCube, interactables.cubeMaterial, CUBE_HOME, CUBE_RADIUS, INVENTORY_PREVIEW_SCALE.cube,
    ));
    this.items.set('key', this.createItemRuntime(
      'key', 'Chave da passagem', interactables.missionKey, interactables.keyMaterial, KEY_HOME, 0.18, INVENTORY_PREVIEW_SCALE.key,
    ));
    this.items.set('potion', this.createItemRuntime(
      'potion', 'Poção restauradora', interactables.potion, interactables.potionMaterial, POTION_HOME, 0.1, INVENTORY_PREVIEW_SCALE.potion, POTION_WORLD_SCALE,
    ));
    this.door = interactables.door;
    this.lockSocket = interactables.lockSocket;
    this.hazardMaterial = interactables.hazardMaterial;
    this.targetMaterial = interactables.targetMaterial;
    this.targetCore = interactables.targetCore;
    this.bagMenuMaterial = this.basicMaterial({
      color: 0x102b28,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.vrPauseCanvas = document.createElement('canvas');
    this.vrPauseCanvas.width = 1024;
    this.vrPauseCanvas.height = 720;
    this.vrPauseTexture = new THREE.CanvasTexture(this.vrPauseCanvas);
    this.vrPauseTexture.colorSpace = THREE.SRGBColorSpace;
    this.vrPausePanel = new THREE.Mesh(
      this.geometry(new THREE.PlaneGeometry(1.36, 0.96)),
      this.basicMaterial({
        map: this.vrPauseTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false,
        toneMapped: false,
      }),
    );
    this.vrPausePanel.name = 'vr-comfort-pause-menu';
    this.vrPausePanel.renderOrder = 40;
    this.vrPausePanel.visible = false;
    this.playerRig.add(this.vrPausePanel);
    this.drawVrPauseMenu();
    this.buildControllers();
    this.buildAdventureBag();
    this.buildCollisionDebug();
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.renderer.xr.addEventListener('sessionstart', this.onXrSessionStart);
    this.renderer.xr.addEventListener('sessionend', this.onXrSessionEnd);
    this.renderer.setAnimationLoop(this.render);
    this.emitInteraction('Aproxime-se do cubo rúnico e mire nele para pegar.');
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused) this.lastFrameSeconds = 0;
  }

  setComfortSettings(settings: ComfortSettings) {
    this.comfort = {
      posture: settings.posture,
      dominantHand: settings.dominantHand,
      oneHandMode: settings.oneHandMode,
      waistOffset: THREE.MathUtils.clamp(settings.waistOffset, -0.2, 0.2),
      menuDistance: THREE.MathUtils.clamp(settings.menuDistance, 0.42, 0.72),
    };
    this.inventoryButtonWasPressed = false;
    if (this.bagMenuOpen) this.placeBagMenu();
    this.updateBagTransform(0);
    this.drawVrPauseMenu();
  }

  reset() {
    this.resetPlayerTransform();
    this.resetObject('Cubo e alvo restaurados.');
  }

  private resetPlayerTransform() {
    this.playerRig.position.set(PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z);
    this.playerRig.rotation.set(0, 0, 0);
    this.camera.position.set(0, PLAYER_HEIGHT, 0);
    this.yaw = 0;
    this.camera.rotation.set(0, 0, 0);
    this.lastFrameSeconds = 0;
  }

  async enterVr() {
    if (!navigator.xr) throw new Error('WebXR indisponível neste navegador.');
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    if (!supported) throw new Error('Headset WebXR não encontrado.');

    this.resetPlayerTransform();
    const session = await navigator.xr.requestSession('immersive-vr', createVrSessionInit());
    await this.renderer.xr.setSession(session);
  }

  async exitVr() {
    const session = this.renderer.xr.getSession();
    if (session) await session.end();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.renderer.xr.removeEventListener('sessionstart', this.onXrSessionStart);
    this.renderer.xr.removeEventListener('sessionend', this.onXrSessionEnd);
    for (const listener of this.controllerListeners) {
      listener.controller.removeEventListener('selectstart', listener.start);
      listener.controller.removeEventListener('selectend', listener.end);
    }
    this.disposableGeometries.forEach((geometry) => geometry.dispose());
    this.disposableMaterials.forEach((material) => material.dispose());
    this.vrPauseTexture.dispose();
    this.renderer.dispose();
    void this.audioContext?.close();
    this.renderer.domElement.remove();
  }

  private readonly onXrSessionStart = () => {
    this.resetPlayerTransform();
    this.xrOriginPending = true;
    this.renderer.setPixelRatio(1);
    this.renderer.xr.setFoveation(0.9);
    this.options.onXrChange?.(true);
  };

  private readonly onXrSessionEnd = () => {
    this.xrOriginPending = false;
    this.inventoryButtonWasPressed = false;
    this.vrPauseButtonWasPressed = false;
    this.vrMenuSelectGuards.clear();
    this.closeVrPauseMenu();
    this.resetPlayerTransform();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quest ? 1 : 1.5));
    this.resize();
    this.options.onXrChange?.(false);
  };

  private material(parameters: THREE.MeshStandardMaterialParameters) {
    const material = new THREE.MeshStandardMaterial(parameters);
    this.disposableMaterials.add(material);
    return material;
  }

  private basicMaterial(parameters: THREE.MeshBasicMaterialParameters) {
    const material = new THREE.MeshBasicMaterial(parameters);
    this.disposableMaterials.add(material);
    return material;
  }

  private geometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.disposableGeometries.add(geometry);
    return geometry;
  }

  private createItemRuntime(
    id: ItemId,
    label: string,
    object: THREE.Object3D,
    material: THREE.MeshStandardMaterial,
    home: THREE.Vector3,
    radius: number,
    inventoryScale: number,
    worldScale = 1,
  ): ItemRuntime {
    return {
      id,
      label,
      object,
      material,
      state: { ...INITIAL_OBJECT_STATE },
      home: home.clone(),
      radius,
      inventoryScale,
      worldScale,
      velocity: new THREE.Vector3(),
      previousPosition: new THREE.Vector3(),
      sleeping: true,
      lastStoredSlot: null,
    };
  }

  private get cube() {
    return this.items.get('cube')!;
  }

  private get runeCube() {
    return this.cube.object;
  }

  private get cubeMaterial() {
    return this.cube.material;
  }

  private get objectState() {
    return this.cube.state;
  }

  private set objectState(state: AdventureObjectState) {
    this.cube.state = state;
  }

  private get objectVelocity() {
    return this.cube.velocity;
  }

  private get previousObjectPosition() {
    return this.cube.previousPosition;
  }

  private get objectSleeping() {
    return this.cube.sleeping;
  }

  private set objectSleeping(value: boolean) {
    this.cube.sleeping = value;
  }

  private buildRoom() {
    const floorMaterial = this.material({
      color: 0x35423d,
      emissive: 0x081713,
      emissiveIntensity: 0.72,
      roughness: 0.92,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(24, 24, 12, 12)), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(24, 24, 0x69e8c2, 0x294c43);
    grid.position.y = 0.008;
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.64;
      this.disposableMaterials.add(material);
    });
    this.disposableGeometries.add(grid.geometry);
    this.scene.add(grid);

    const stone = this.material({ color: 0x4b514a, roughness: 0.8, metalness: 0.08 });
    const bronze = this.material({ color: 0x8b5b2f, roughness: 0.42, metalness: 0.65 });
    const rune = this.material({ color: 0x40e0b4, emissive: 0x18b992, emissiveIntensity: 2.2, roughness: 0.2 });

    const pillarGeometry = this.geometry(new THREE.BoxGeometry(1.7, 4.4, 1.7));
    for (const collider of PILLAR_COLLIDERS) {
      const pillar = new THREE.Mesh(pillarGeometry, stone);
      pillar.position.set(collider.x, 2.2, collider.z);
      pillar.rotation.y = collider.rotation;
      this.scene.add(pillar);
    }

    const longWall = this.geometry(new THREE.BoxGeometry(24, 4.4, 0.6));
    const sideWall = this.geometry(new THREE.BoxGeometry(0.6, 4.4, 24));
    for (const z of [ROOM_BOUNDS.minZ - 0.3, ROOM_BOUNDS.maxZ + 0.3]) {
      const wall = new THREE.Mesh(longWall, stone);
      wall.position.set(0, 2.2, z);
      this.scene.add(wall);
    }
    for (const x of [ROOM_BOUNDS.minX - 0.3, ROOM_BOUNDS.maxX + 0.3]) {
      const wall = new THREE.Mesh(sideWall, stone);
      wall.position.set(x, 2.2, 0);
      this.scene.add(wall);
    }

    const arch = new THREE.Group();
    const postGeometry = this.geometry(new THREE.BoxGeometry(1.1, 4.6, 1.4));
    const topGeometry = this.geometry(new THREE.BoxGeometry(6.2, 1.05, 1.4));
    for (const x of [-2.55, 2.55]) {
      const post = new THREE.Mesh(postGeometry, stone);
      post.position.set(x, 2.3, 0);
      arch.add(post);
    }
    const top = new THREE.Mesh(topGeometry, stone);
    top.position.y = 4.45;
    arch.add(top);

    const ring = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(1.82, 0.18, 12, 48)), bronze);
    ring.position.set(0, 2.18, -0.78);
    arch.add(ring);
    const portal = new THREE.Mesh(this.geometry(new THREE.CircleGeometry(1.62, 48)), rune);
    portal.position.set(0, 2.18, -0.8);
    arch.add(portal);
    arch.position.z = -7.4;
    this.scene.add(arch);

    const altar = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(1.05, 1.45, 1.1, 8)), stone);
    altar.position.set(0, 0.55, 0.5);
    this.scene.add(altar);
    const crystal = new THREE.Mesh(this.geometry(new THREE.OctahedronGeometry(0.5, 0)), rune);
    crystal.name = 'foundation-crystal';
    crystal.position.set(0, 1.55, 0.5);
    this.scene.add(crystal);

    const guideMaterial = this.basicMaterial({
      color: 0x51e6b8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const spawnRing = new THREE.Mesh(this.geometry(new THREE.RingGeometry(1.15, 1.24, 48)), guideMaterial);
    spawnRing.rotation.x = -Math.PI / 2;
    spawnRing.position.set(0, 0.025, 6.8);
    this.scene.add(spawnRing);

    const guideGeometry = this.geometry(new THREE.BoxGeometry(0.09, 1.6, 0.09));
    for (const x of [-4, 4]) {
      const guide = new THREE.Mesh(guideGeometry, guideMaterial);
      guide.position.set(x, 0.8, 3.8);
      this.scene.add(guide);
    }

    const pedestal = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(1.16, 1.05, 1.16)), stone);
    pedestal.position.set(CUBE_HOME.x, 0.525, CUBE_HOME.z);
    this.scene.add(pedestal);
    const pedestalRune = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.42, 0.5, 0.1, 8)), bronze);
    pedestalRune.position.set(CUBE_HOME.x, 1.1, CUBE_HOME.z);
    this.scene.add(pedestalRune);

    const cubeMaterial = this.material({
      color: 0x5bd9b6,
      emissive: 0x0b6e59,
      emissiveIntensity: 1.2,
      roughness: 0.24,
      metalness: 0.32,
    });
    const runeCube = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.4, 0.4, 0.4, 2, 2, 2)), cubeMaterial);
    runeCube.name = 'rune-cube';
    runeCube.position.copy(CUBE_HOME);
    this.scene.add(runeCube);

    const keyPedestal = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(1.04, 0.92, 1.04)), stone);
    keyPedestal.position.set(KEY_HOME.x, 0.46, KEY_HOME.z);
    this.scene.add(keyPedestal);
    const keyMaterial = this.material({
      color: 0xe0a84f,
      emissive: 0x5c2e08,
      emissiveIntensity: 1.15,
      roughness: 0.3,
      metalness: 0.78,
    });
    const missionKey = new THREE.Group();
    missionKey.name = 'mission-key';
    const keyBow = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.13, 0.035, 10, 28)), keyMaterial);
    keyBow.position.x = -0.17;
    const keyShaft = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 12)), keyMaterial);
    keyShaft.rotation.z = Math.PI / 2;
    keyShaft.position.x = 0.12;
    const keyTooth = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.1, 0.11, 0.07)), keyMaterial);
    keyTooth.position.set(0.29, -0.055, 0);
    const keyToothTip = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.07, 0.075, 0.07)), keyMaterial);
    keyToothTip.position.set(0.34, 0.02, 0);
    missionKey.add(keyBow, keyShaft, keyTooth, keyToothTip);
    missionKey.position.copy(KEY_HOME);
    missionKey.rotation.set(0.12, 0.3, -0.08);
    this.scene.add(missionKey);

    const potionPedestal = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.92, 0.9, 0.92)), stone);
    potionPedestal.position.set(POTION_HOME.x, 0.45, POTION_HOME.z);
    this.scene.add(potionPedestal);
    const potionMaterial = this.material({
      color: 0xaaf7e4,
      emissive: 0x146d62,
      emissiveIntensity: 1.4,
      roughness: 0.18,
      metalness: 0.08,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const potionLiquid = this.material({
      color: 0xff5e94,
      emissive: 0xb51454,
      emissiveIntensity: 2.1,
      roughness: 0.2,
      transparent: true,
      opacity: 0.96,
    });
    const corkMaterial = this.material({ color: 0x8b5b2f, roughness: 0.9, metalness: 0.02 });
    const potion = new THREE.Group();
    potion.name = 'healing-potion';
    const bottle = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.105, 0.13, 0.3, 18)), potionMaterial);
    bottle.position.y = -0.025;
    const liquid = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.09, 0.108, 0.19, 18)), potionLiquid);
    liquid.position.y = -0.075;
    const neck = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.055, 0.07, 0.13, 14)), potionMaterial);
    neck.position.y = 0.185;
    const cork = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.052, 0.052, 0.07, 12)), corkMaterial);
    cork.position.y = 0.285;
    potion.add(bottle, liquid, neck, cork);
    potion.position.copy(POTION_HOME);
    this.scene.add(potion);

    const hazardMaterial = this.material({
      color: 0xd14b55,
      emissive: 0x8f1027,
      emissiveIntensity: 1.7,
      roughness: 0.38,
      metalness: 0.42,
    });
    const hazard = new THREE.Mesh(this.geometry(new THREE.RingGeometry(0.48, HAZARD_RADIUS, 36)), hazardMaterial);
    hazard.name = 'training-hazard';
    hazard.rotation.x = -Math.PI / 2;
    hazard.position.copy(HAZARD_POSITION).setY(0.018);
    this.scene.add(hazard);
    const hazardLight = new THREE.PointLight(0xff315f, 5.5, 3.2, 2);
    hazardLight.position.copy(HAZARD_POSITION).setY(0.16);
    this.scene.add(hazardLight);

    const doorMaterial = this.material({ color: 0x342f29, roughness: 0.7, metalness: 0.34 });
    const door = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(3.42, 3.6, 0.26)), doorMaterial);
    door.name = 'locked-portal-door';
    door.position.set(0, 1.8, -7.15);
    this.scene.add(door);
    const doorRune = new THREE.Mesh(this.geometry(new THREE.RingGeometry(0.46, 0.53, 32)), rune);
    doorRune.position.set(0, 0.1, 0.14);
    door.add(doorRune);

    const lockSocket = new THREE.Group();
    lockSocket.name = 'mission-key-lock';
    lockSocket.position.copy(LOCK_POSITION);
    const lockPlate = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.42, 0.58, 0.12)), bronze);
    const keyHole = new THREE.Mesh(this.geometry(new THREE.RingGeometry(0.07, 0.105, 24)), rune);
    keyHole.position.z = 0.075;
    lockSocket.add(lockPlate, keyHole);
    this.scene.add(lockSocket);

    const targetGroup = new THREE.Group();
    targetGroup.position.copy(TARGET_POSITION);
    const targetMaterial = this.material({
      color: 0x53392b,
      emissive: 0x120a06,
      emissiveIntensity: 0.4,
      roughness: 0.6,
      metalness: 0.45,
    });
    const targetCore = new THREE.Mesh(this.geometry(new THREE.CircleGeometry(TARGET_RADIUS, 40)), targetMaterial);
    targetGroup.add(targetCore);
    const targetRing = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(TARGET_RADIUS, 0.09, 10, 40)), bronze);
    targetRing.position.z = 0.025;
    targetGroup.add(targetRing);
    const targetStand = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.18, 1.5, 0.18)), stone);
    targetStand.position.set(0, -1.45, -0.08);
    targetGroup.add(targetStand);
    this.scene.add(targetGroup);

    const hemi = new THREE.HemisphereLight(0xc8fff1, 0x273129, 2.8);
    this.scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xffe0bd, 3.6);
    keyLight.position.set(-4, 8, 5);
    this.scene.add(keyLight);
    const portalLight = new THREE.PointLight(0x30d7aa, 18, 11, 2);
    portalLight.position.set(0, 2.3, -6.9);
    this.scene.add(portalLight);

    return {
      runeCube,
      cubeMaterial,
      missionKey,
      keyMaterial,
      potion,
      potionMaterial,
      hazardMaterial,
      door,
      lockSocket,
      targetMaterial,
      targetCore,
    };
  }

  private buildControllers() {
    (['left', 'right'] as const).forEach((holder, index) => {
      const controller = this.renderer.xr.getController(index);
      controller.name = `${holder}-hand`;
      const handMaterial = this.material({
        color: holder === 'left' ? 0x6b8f88 : 0x8f7557,
        emissive: 0x173d35,
        emissiveIntensity: 0.55,
        roughness: 0.56,
        metalness: 0.18,
      });
      const palm = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.09, 0.08, 0.17)), handMaterial);
      palm.position.z = -0.06;
      controller.add(palm);
      if (holder === 'left') {
        this.wristHealth.name = 'wrist-health-indicator';
        this.wristHealth.position.set(0, 0.075, -0.015);
        for (let pipIndex = 0; pipIndex < MAX_HEALTH; pipIndex += 1) {
          const pipMaterial = this.material({
            color: 0xff668d,
            emissive: 0xc51f55,
            emissiveIntensity: 2.2,
            roughness: 0.25,
          });
          const pip = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(0.018, 10, 8)), pipMaterial);
          pip.position.x = (pipIndex - 1) * 0.042;
          this.healthPips.push(pip);
          this.wristHealth.add(pip);
        }
        this.wristHealth.visible = false;
        controller.add(this.wristHealth);
      }
      const activeHolder = () => {
        const handedness = Array.from(this.renderer.xr.getSession()?.inputSources ?? [])[index]?.handedness;
        const resolvedHolder = handedness === 'right' ? 'right' : handedness === 'left' ? 'left' : holder;
        this.controllers.set(resolvedHolder, controller);
        return resolvedHolder;
      };
      const start = () => this.tryControllerGrab(activeHolder());
      const end = () => this.finishControllerGrab(activeHolder());
      controller.addEventListener('selectstart', start);
      controller.addEventListener('selectend', end);
      this.controllerListeners.push({ controller, start, end });
      this.controllers.set(holder, controller);
      this.poseHistory.set(holder, []);
      this.playerRig.add(controller);
    });
    this.poseHistory.set('desktop', []);
  }

  private buildAdventureBag() {
    this.adventureBag.name = 'waist-bag-portal';
    const portalMaterial = this.basicMaterial({
      color: 0x51e6b8,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const portal = new THREE.Mesh(this.geometry(new THREE.RingGeometry(0.09, 0.115, 32)), portalMaterial);
    portal.rotation.x = -Math.PI / 2;
    portal.name = 'waist-bag-opening';
    this.adventureBag.add(portal);
    this.adventureBag.visible = false;
    this.playerRig.add(this.adventureBag);

    this.bagMenu.name = 'adventure-bag-menu';
    const panel = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(0.5, 0.34)), this.bagMenuMaterial);
    panel.position.z = 0.025;
    this.bagMenu.add(panel);

    const slotGeometry = this.geometry(new THREE.RingGeometry(0.05, 0.063, 28));
    for (let index = 0; index < BAG_SLOT_COUNT; index += 1) {
      const material = this.material({
        color: 0x51e6b8,
        emissive: 0x123c32,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.42,
      });
      const slot = new THREE.Mesh(slotGeometry, material);
      slot.name = `bag-slot-${index + 1}`;
      const column = index % 3;
      const row = Math.floor(index / 3);
      slot.position.set((column - 1) * 0.15, row === 0 ? 0.085 : -0.085, 0);
      slot.visible = false;
      this.bagSlots.push(slot);
      this.bagSlotMaterials.push(material);
      this.bagMenu.add(slot);
    }

    this.bagMenu.visible = false;
    this.playerRig.add(this.bagMenu);
    this.updateBagTransform(0);
  }

  private buildCollisionDebug() {
    const obstacleMaterial = this.material({ color: 0xff6b57, wireframe: true, transparent: true, opacity: 0.82 });
    const playerMaterial = this.material({ color: 0x51e6b8, wireframe: true, transparent: true, opacity: 0.95 });

    for (const collider of [...ROOM_COLLIDERS, LOCKED_DOOR_COLLIDER]) {
      if (collider.kind === 'box') {
        const mesh = new THREE.Mesh(
          this.geometry(new THREE.BoxGeometry(collider.halfX * 2, 2.2, collider.halfZ * 2)),
          obstacleMaterial,
        );
        mesh.position.set(collider.x, 1.1, collider.z);
        mesh.rotation.y = collider.rotation;
        if (collider.id === LOCKED_DOOR_COLLIDER.id) this.doorColliderDebug = mesh;
        this.collisionDebug.add(mesh);
      } else {
        const mesh = new THREE.Mesh(
          this.geometry(new THREE.CylinderGeometry(collider.radius, collider.radius, 1.15, 32)),
          obstacleMaterial,
        );
        mesh.position.set(collider.x, 0.575, collider.z);
        this.collisionDebug.add(mesh);
      }
    }

    const boundaryGeometry = this.geometry(new THREE.BoxGeometry(
      ROOM_BOUNDS.maxX - ROOM_BOUNDS.minX,
      2.2,
      ROOM_BOUNDS.maxZ - ROOM_BOUNDS.minZ,
    ));
    const boundary = new THREE.Mesh(boundaryGeometry, obstacleMaterial);
    boundary.position.y = 1.1;
    this.collisionDebug.add(boundary);

    const playerGeometry = this.geometry(new THREE.CylinderGeometry(PLAYER_RADIUS, PLAYER_RADIUS, 1.65, 24));
    this.playerColliderDebug.geometry = playerGeometry;
    this.playerColliderDebug.material = playerMaterial;
    this.playerColliderDebug.position.y = 0.825;
    this.collisionDebug.add(this.playerColliderDebug);
    this.collisionDebug.visible = false;
    this.scene.add(this.collisionDebug);
  }

  private readonly resize = () => {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.code);
    if (event.code === 'KeyH' && !event.repeat) {
      this.collisionDebug.visible = !this.collisionDebug.visible;
    }
    if (this.paused || event.repeat) return;
    if (event.code === 'KeyE') {
      const held = this.itemForHolder('desktop');
      if (held?.id === 'key' && this.itemNearLock(held, 0.48)) this.insertKeyInLock(held, 'desktop');
      else if (held) this.releaseHeldObject('desktop', false);
      else this.tryDesktopGrab();
    }
    if (event.code === 'KeyF') this.releaseHeldObject('desktop', true);
    if (event.code === 'KeyG') {
      const potion = this.itemForHolder('desktop');
      if (potion?.id === 'potion' && this.health < MAX_HEALTH) this.consumePotion(potion, 'desktop');
      else this.emitInteraction('Segure a poção após sofrer dano para consumi-la.');
    }
    if (event.code === 'KeyR') this.resetObject('Itens e passagem restaurados.');
    if (event.code === 'KeyB') this.toggleDesktopBag();
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private readonly render = (timeMs = performance.now()) => {
    if (this.disposed) return;
    const nowSeconds = timeMs / 1000;
    const rawDelta = this.lastFrameSeconds === 0 ? 0 : nowSeconds - this.lastFrameSeconds;
    this.lastFrameSeconds = nowSeconds;
    const delta = clampFrameDelta(rawDelta);

    if (!this.paused) {
      if (this.vrPauseMenuOpen) this.updateVrPauseMenu();
      else this.update(delta, nowSeconds);
      this.animationSeconds += delta;
      const crystal = this.scene.getObjectByName('foundation-crystal');
      if (crystal) {
        crystal.rotation.y = this.animationSeconds * 0.8;
        crystal.position.y = 1.55 + Math.sin(this.animationSeconds * 1.7) * 0.08;
      }
      this.targetPulseSeconds = Math.max(0, this.targetPulseSeconds - delta);
      this.targetMaterial.emissive.setHex(this.targetPulseSeconds > 0 ? 0x38d9ad : 0x120a06);
      this.targetMaterial.emissiveIntensity = this.targetPulseSeconds > 0 ? 3.2 : 0.4;
      this.targetCore.scale.setScalar(1 + Math.sin(this.targetPulseSeconds * 24) * this.targetPulseSeconds * 0.06);
    }

    this.renderer.render(this.scene, this.camera);
    if (this.xrOriginPending && this.renderer.xr.isPresenting) {
      const rigPosition = rigPositionForTrackedSpawn(
        { x: this.camera.position.x, z: this.camera.position.z },
        PLAYER_SPAWN,
      );
      this.playerRig.position.set(rigPosition.x, 0, rigPosition.z);
      this.playerRig.rotation.set(0, 0, 0);
      this.yaw = 0;
      this.xrOriginPending = false;
    }
    this.frameCount += 1;
    this.statsSeconds += rawDelta;
    if (this.statsSeconds >= 0.5) {
      this.options.onStats?.(Math.round(this.frameCount / this.statsSeconds));
      this.statsSeconds = 0;
      this.frameCount = 0;
    }
  };

  private update(delta: number, nowSeconds: number) {
    let forward = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    let right = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    let turn = Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'));

    if (this.renderer.xr.isPresenting) {
      const session = this.renderer.xr.getSession();
      const leftButtons = Array.from(session?.inputSources ?? [])
        .find((source) => source.handedness === 'left')?.gamepad?.buttons;
      const pausePressed = leftButtons ? vrPauseButtonPressed(leftButtons) : false;
      if (pausePressed && !this.vrPauseButtonWasPressed) {
        this.openVrPauseMenu();
        this.vrPauseButtonWasPressed = true;
        return;
      }
      this.vrPauseButtonWasPressed = pausePressed;
      let inventoryButtonPressed = false;
      for (const source of session?.inputSources ?? []) {
        if (!source.gamepad) continue;
        const [axisX, axisY] = this.readStick(source.gamepad.axes);
        const hand = source.handedness === 'right' ? 'right' : source.handedness === 'left' ? 'left' : null;
        const locomotionHand = this.comfort.oneHandMode ? this.comfort.dominantHand : 'left';
        if (hand === locomotionHand) {
          right += axisX;
          forward -= axisY;
        }
        if (hand === this.comfort.dominantHand) {
          inventoryButtonPressed = Boolean(source.gamepad.buttons[META_QUEST_PRIMARY_FACE_BUTTON]?.pressed);
          if (buttonPressedOnRisingEdge(
            source.gamepad.buttons,
            META_QUEST_PRIMARY_FACE_BUTTON,
            this.inventoryButtonWasPressed,
          )) {
            this.toggleBagMenu(this.comfort.dominantHand);
          }
        }
        if (!this.comfort.oneHandMode && hand === 'right') {
          turn += axisX;
        }
      }
      this.inventoryButtonWasPressed = inventoryButtonPressed;

    } else {
      this.inventoryButtonWasPressed = false;
      this.vrPauseButtonWasPressed = false;
      const gamepad = Array.from(navigator.getGamepads?.() ?? []).find((candidate) => candidate?.connected);
      if (gamepad) {
        right += applyDeadzone(gamepad.axes[0] ?? 0);
        forward -= applyDeadzone(gamepad.axes[1] ?? 0);
        turn += applyDeadzone(gamepad.axes[2] ?? 0);
      }
    }

    this.yaw -= THREE.MathUtils.clamp(turn, -1, 1) * TURN_SPEED * delta;

    const playerPosition = this.getPlayerWorldPosition();
    const colliders = this.activeColliders();
    const safePosition = resolvePosition(playerPosition, PLAYER_RADIUS, colliders, ROOM_BOUNDS);
    this.playerRig.position.x += safePosition.x - playerPosition.x;
    this.playerRig.position.z += safePosition.z - playerPosition.z;

    const velocity = movementVelocity({ forward, right }, this.yaw, MOVE_SPEED);
    const resolved = resolveMovement(
      safePosition,
      { x: velocity.x * delta, z: velocity.z * delta },
      PLAYER_RADIUS,
      colliders,
      ROOM_BOUNDS,
    );
    this.playerRig.position.x += resolved.x - safePosition.x;
    this.playerRig.position.z += resolved.z - safePosition.z;
    this.playerRig.rotation.y = this.yaw;
    this.playerColliderDebug.position.x = resolved.x;
    this.playerColliderDebug.position.z = resolved.z;
    this.updateHazard(delta, resolved);
    this.updateWristHealth();
    this.updateBagTransform(delta);
    this.updateDoor(delta);
    this.updateAdventureObject(delta, nowSeconds);
  }

  private updateHazard(delta: number, player: { x: number; z: number }) {
    const inside = Math.hypot(player.x - HAZARD_POSITION.x, player.z - HAZARD_POSITION.z) <= HAZARD_RADIUS;
    if (inside && !this.hazardOccupied) {
      const nextHealth = applyNonLethalHazard(this.health);
      if (nextHealth < this.health) {
        this.health = nextHealth;
        this.hazardPulseSeconds = 0.75;
        this.playTone(135, 0.16, 0.075);
        this.pulseControllers(0.48, 95);
        this.emitInteraction(`Armadilha rúnica ativada · vida ${this.health}/${MAX_HEALTH}. Encontre a poção.`);
      }
    }
    this.hazardOccupied = inside;
    this.hazardPulseSeconds = Math.max(0, this.hazardPulseSeconds - delta);
    this.hazardMaterial.emissiveIntensity = this.hazardPulseSeconds > 0 ? 4.2 : 1.7;
  }

  private updateWristHealth() {
    this.wristHealth.visible = this.renderer.xr.isPresenting;
    this.healthPips.forEach((pip, index) => {
      const active = index < this.health;
      const material = pip.material as THREE.MeshStandardMaterial;
      material.color.setHex(active ? 0xff668d : 0x31252a);
      material.emissive.setHex(active ? 0xc51f55 : 0x080506);
      material.emissiveIntensity = active ? 2.2 : 0.15;
      pip.scale.setScalar(active ? 1 : 0.72);
    });
  }

  private activeColliders() {
    return doorBlocksPassage(this.doorOpenAmount)
      ? [...ROOM_COLLIDERS, LOCKED_DOOR_COLLIDER]
      : ROOM_COLLIDERS;
  }

  private updateDoor(delta: number) {
    const target = this.keyInserted ? 1 : 0;
    const blend = delta > 0 ? 1 - Math.exp(-3.8 * delta) : 1;
    this.doorOpenAmount += (target - this.doorOpenAmount) * blend;
    this.door.position.y = 1.8 + this.doorOpenAmount * 4.2;
    if (this.doorColliderDebug) this.doorColliderDebug.visible = doorBlocksPassage(this.doorOpenAmount);
  }

  private updateAdventureObject(delta: number, nowSeconds: number) {
    this.updateSecondaryItem(this.items.get('key')!, delta, nowSeconds);
    this.updateSecondaryItem(this.items.get('potion')!, delta, nowSeconds);
    if (this.objectState.storedSlot !== null) {
      const slot = this.bagSlots[this.objectState.storedSlot];
      if (slot) {
        slot.getWorldPosition(this.worldPosition);
        this.runeCube.position.copy(this.worldPosition);
        this.runeCube.rotation.set(0, inventoryPreviewYaw(this.animationSeconds, this.objectState.storedSlot), 0);
      }
      this.runeCube.scale.setScalar(this.cube.inventoryScale);
      this.runeCube.visible = this.bagMenuOpen && this.bagOpenAmount > 0.18;
      this.objectVelocity.set(0, 0, 0);
      this.objectSleeping = true;
      this.cubeMaterial.emissiveIntensity = 2.2;
      this.emitInteraction(this.contextualStatus(`Cubo rúnico guardado no slot ${this.objectState.storedSlot + 1}.`));
      return;
    }

    this.runeCube.visible = true;
    this.runeCube.scale.setScalar(1);
    if (this.objectState.holder) {
      const heldPosition = this.heldObjectPosition(this.objectState.holder);
      const holder = this.objectState.holder;
      const holderRotation = this.holderWorldRotation(holder);
      const gripOffset = this.gripRotationOffsets.get(holder);
      const targetRotation = holderRotation && gripOffset
        ? heldObjectRotation(holderRotation, gripOffset)
        : this.runeCube.quaternion.clone();
      if (this.pullAnimation?.itemId === 'cube' && this.pullAnimation.holder === holder) {
        this.pullAnimation.elapsed += delta;
        const progress = remotePullProgress(this.pullAnimation.elapsed, this.pullAnimation.duration);
        this.runeCube.position.lerpVectors(this.pullAnimation.fromPosition, heldPosition, progress);
        this.runeCube.quaternion.slerpQuaternions(this.pullAnimation.fromRotation, targetRotation, progress);
        if (progress >= 1) {
          this.pullAnimation = null;
          this.playTone(610, 0.07, 0.045);
          this.pulseController(holder, 0.24, 42);
        }
      } else {
        this.runeCube.position.copy(heldPosition);
        this.runeCube.quaternion.copy(targetRotation);
      }
      this.objectVelocity.set(0, 0, 0);
      this.recordPose(holder, this.runeCube.position, nowSeconds);
      this.cubeMaterial.emissiveIntensity = 2.6;
      this.emitInteraction(this.pullAnimation?.itemId === 'cube'
        ? `Cubo atraído para a mão ${holder}.`
        : `Cubo seguro pela mão ${holder === 'desktop' ? 'virtual' : holder}.`);
      return;
    }

    if (!this.objectSleeping && delta > 0) {
      this.previousObjectPosition.copy(this.runeCube.position);
      this.objectVelocity.y -= 9.81 * delta;
      const desiredX = this.runeCube.position.x + this.objectVelocity.x * delta;
      const desiredZ = this.runeCube.position.z + this.objectVelocity.z * delta;
      const resolved = resolveMovement(
        { x: this.runeCube.position.x, z: this.runeCube.position.z },
        { x: desiredX - this.runeCube.position.x, z: desiredZ - this.runeCube.position.z },
        CUBE_RADIUS,
        this.activeColliders(),
        ROOM_BOUNDS,
      );
      if (Math.abs(resolved.x - desiredX) > 0.002) this.objectVelocity.x *= -0.34;
      if (Math.abs(resolved.z - desiredZ) > 0.002) this.objectVelocity.z *= -0.34;
      this.runeCube.position.set(
        resolved.x,
        this.runeCube.position.y + this.objectVelocity.y * delta,
        resolved.z,
      );
      this.runeCube.rotation.x += this.objectVelocity.z * delta * 1.8;
      this.runeCube.rotation.z -= this.objectVelocity.x * delta * 1.8;

      if (this.runeCube.position.y <= CUBE_RADIUS) {
        this.runeCube.position.y = CUBE_RADIUS;
        if (this.objectVelocity.y < -0.65) this.objectVelocity.y *= -0.32;
        else this.objectVelocity.y = 0;
        this.objectVelocity.x *= 0.84;
        this.objectVelocity.z *= 0.84;
        if (this.objectVelocity.lengthSq() < 0.035) {
          this.objectVelocity.set(0, 0, 0);
          this.objectSleeping = true;
        }
      }

      if (
        this.objectState.throwId > 0
        && this.objectState.targetHitThrowId !== this.objectState.throwId
        && sweptTargetHit(
          this.previousObjectPosition,
          this.runeCube.position,
          TARGET_POSITION,
          TARGET_RADIUS,
          CUBE_RADIUS,
        )
      ) {
        this.objectState = registerTargetHit(this.objectState);
        this.targetHits += 1;
        this.targetPulseSeconds = 1;
        this.playTone(620, 0.16, 0.12);
        this.playTone(920, 0.2, 0.08, 0.09);
        this.pulseControllers(0.62, 110);
        this.emitInteraction(`Alvo rúnico atingido · ${this.targetHits} acerto${this.targetHits === 1 ? '' : 's'}.`);
      }
    }

    if (shouldRecoverObject(this.runeCube.position, ROOM_BOUNDS)) {
      this.recoverItem(this.cube);
      return;
    }

    const canGrab = this.renderer.xr.isPresenting ? this.anyControllerCanGrab() : this.canDesktopGrab();
    this.cubeMaterial.emissiveIntensity = canGrab ? 3 : 1.2;
    this.emitInteraction(this.contextualStatus(
      canGrab ? 'Item sob a mira · pressione para pegar.' : 'Atravesse a runa e encontre a poção no pedestal central.',
    ));
  }

  private updateSecondaryItem(item: ItemRuntime, delta: number, nowSeconds: number) {
    if (item.id === 'key' && this.keyInserted) {
      item.object.visible = true;
      item.object.scale.setScalar(0.72);
      item.object.position.copy(LOCK_POSITION).add(new THREE.Vector3(0, 0, 0.1));
      item.object.rotation.set(0, 0, Math.PI / 2);
      item.velocity.set(0, 0, 0);
      item.sleeping = true;
      return;
    }
    if (item.id === 'potion' && this.potionConsumed) {
      item.object.visible = false;
      item.velocity.set(0, 0, 0);
      item.sleeping = true;
      return;
    }

    if (item.state.storedSlot !== null) {
      const slot = this.bagSlots[item.state.storedSlot];
      if (slot) {
        slot.getWorldPosition(this.worldPosition);
        item.object.position.copy(this.worldPosition);
        item.object.rotation.set(0, inventoryPreviewYaw(this.animationSeconds, item.state.storedSlot), 0);
      }
      item.object.scale.setScalar(item.inventoryScale);
      item.object.visible = this.bagMenuOpen && this.bagOpenAmount > 0.18;
      item.velocity.set(0, 0, 0);
      item.sleeping = true;
      item.material.emissiveIntensity = 1.9;
      return;
    }

    item.object.visible = true;
    item.object.scale.setScalar(item.worldScale);
    if (item.state.holder) {
      const holder = item.state.holder;
      const heldPosition = this.heldObjectPosition(holder, item);
      const holderRotation = this.holderWorldRotation(holder);
      const gripOffset = this.gripRotationOffsets.get(holder);
      const targetRotation = holderRotation && gripOffset
        ? heldObjectRotation(holderRotation, gripOffset)
        : item.object.quaternion.clone();
      if (this.pullAnimation?.itemId === item.id && this.pullAnimation.holder === holder) {
        this.pullAnimation.elapsed += delta;
        const progress = remotePullProgress(this.pullAnimation.elapsed, this.pullAnimation.duration);
        item.object.position.lerpVectors(this.pullAnimation.fromPosition, heldPosition, progress);
        item.object.quaternion.slerpQuaternions(this.pullAnimation.fromRotation, targetRotation, progress);
        if (progress >= 1) {
          this.pullAnimation = null;
          this.playTone(720, 0.07, 0.045);
          this.pulseController(holder, 0.24, 42);
        }
      } else {
        item.object.position.copy(heldPosition);
        item.object.quaternion.copy(targetRotation);
      }
      item.velocity.set(0, 0, 0);
      this.recordPose(holder, item.object.position, nowSeconds);
      item.material.emissiveIntensity = 2.5;
      if (item.id === 'potion' && this.updateDrinkGesture(item, holder, delta)) return;
      return;
    }

    if (!item.sleeping && delta > 0) {
      item.velocity.y -= 9.81 * delta;
      const desiredX = item.object.position.x + item.velocity.x * delta;
      const desiredZ = item.object.position.z + item.velocity.z * delta;
      const resolved = resolveMovement(
        { x: item.object.position.x, z: item.object.position.z },
        { x: desiredX - item.object.position.x, z: desiredZ - item.object.position.z },
        item.radius,
        this.activeColliders(),
        ROOM_BOUNDS,
      );
      item.object.position.set(resolved.x, item.object.position.y + item.velocity.y * delta, resolved.z);
      item.object.rotation.x += item.velocity.z * delta * 1.5;
      item.object.rotation.z -= item.velocity.x * delta * 1.5;
      if (item.object.position.y <= item.radius) {
        item.object.position.y = item.radius;
        item.velocity.y = item.velocity.y < -0.6 ? item.velocity.y * -0.25 : 0;
        item.velocity.x *= 0.82;
        item.velocity.z *= 0.82;
        if (item.velocity.lengthSq() < 0.03) {
          item.velocity.set(0, 0, 0);
          item.sleeping = true;
        }
      }
    }

    if (shouldRecoverObject(item.object.position, ROOM_BOUNDS)) {
      this.recoverItem(item);
    }
    item.material.emissiveIntensity = this.itemCanBeGrabbed(item) ? 2.8 : 1.15;
  }

  private updateDrinkGesture(item: ItemRuntime, holder: Holder, delta: number) {
    if (this.health >= MAX_HEALTH) {
      this.drinkProgress = 0;
      return false;
    }
    this.camera.getWorldPosition(this.worldPosition);
    const distanceToMouth = item.object.position.distanceTo(this.worldPosition);
    item.object.getWorldQuaternion(this.worldQuaternion);
    const bottleUp = this.slotPosition.set(0, 1, 0).applyQuaternion(this.worldQuaternion).normalize();
    const uprightDot = bottleUp.y;
    const inDrinkingPose = distanceToMouth <= 0.24 && uprightDot <= 0.38;
    this.drinkProgress = inDrinkingPose ? this.drinkProgress + delta : 0;
    if (!shouldDrinkPotion(distanceToMouth, uprightDot, this.drinkProgress)) return false;

    this.consumePotion(item, holder);
    return true;
  }

  private openVrPauseMenu() {
    if (!this.renderer.xr.isPresenting) return;
    this.vrPauseMenuOpen = true;
    this.vrPauseMenuIndex = 0;
    this.vrPauseAxisReady = false;
    this.vrPauseAdjustReady = false;
    this.bagMenuOpen = false;
    this.bagOpenAmount = 0;
    this.adventureBag.visible = false;
    this.bagMenu.visible = false;
    this.bagSlots.forEach((slot) => { slot.visible = false; });
    this.items.forEach((item) => {
      if (item.state.storedSlot !== null) item.object.visible = false;
    });
    this.placeVrPauseMenu();
    this.drawVrPauseMenu();
    this.vrPausePanel.visible = true;
    this.playTone(420, 0.08, 0.045);
    this.pulseController('left', 0.24, 45);
    this.emitInteraction('Menu de pausa VR aberto. Use o analógico esquerdo e o gatilho.');
  }

  private closeVrPauseMenu() {
    if (!this.vrPauseMenuOpen && !this.vrPausePanel?.visible) return;
    this.vrPauseMenuOpen = false;
    if (this.vrPausePanel) this.vrPausePanel.visible = false;
    this.playTone(310, 0.07, 0.04);
    this.emitInteraction('Menu de pausa VR fechado.');
  }

  private placeVrPauseMenu() {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
    forward.normalize();
    this.vrPausePanel.position.set(
      this.camera.position.x + forward.x * 1.18,
      THREE.MathUtils.clamp(this.camera.position.y - 0.04, 1.04, 1.7),
      this.camera.position.z + forward.z * 1.18,
    );
    this.vrPausePanel.rotation.set(0, Math.atan2(-forward.x, -forward.z), 0);
  }

  private updateVrPauseMenu() {
    const session = this.renderer.xr.getSession();
    if (!session) return;
    const left = Array.from(session.inputSources)
      .find((source) => source.handedness === 'left')?.gamepad;
    const pausePressed = left ? vrPauseButtonPressed(left.buttons) : false;
    if (!pausePressed) this.vrPauseButtonWasPressed = false;
    if (pausePressed && !this.vrPauseButtonWasPressed) {
      this.vrPauseButtonWasPressed = true;
      this.closeVrPauseMenu();
      return;
    }
    const [axisX, axisY] = this.readStick(left?.axes ?? []);
    if (Math.abs(axisY) < 0.3) this.vrPauseAxisReady = true;
    if (Math.abs(axisY) > 0.65 && this.vrPauseAxisReady) {
      this.vrPauseMenuIndex = moveVrMenuSelection(
        this.vrPauseMenuIndex,
        axisY > 0 ? 1 : -1,
        VR_PAUSE_MENU_ITEM_COUNT,
      );
      this.vrPauseAxisReady = false;
      this.drawVrPauseMenu();
      this.pulseController('left', 0.1, 24);
    }
    if (Math.abs(axisX) < 0.3) this.vrPauseAdjustReady = true;
    if (Math.abs(axisX) > 0.65 && this.vrPauseAdjustReady) {
      this.vrPauseAdjustReady = false;
      this.adjustVrPauseMenu(axisX > 0 ? 1 : -1);
    }
  }

  private adjustVrPauseMenu(direction: -1 | 1) {
    const next = { ...this.comfort };
    if (this.vrPauseMenuIndex === 1) next.posture = next.posture === 'standing' ? 'seated' : 'standing';
    else if (this.vrPauseMenuIndex === 2) next.dominantHand = next.dominantHand === 'left' ? 'right' : 'left';
    else if (this.vrPauseMenuIndex === 3) next.oneHandMode = !next.oneHandMode;
    else if (this.vrPauseMenuIndex === 4) next.waistOffset += direction * 0.02;
    else if (this.vrPauseMenuIndex === 5) next.menuDistance += direction * 0.02;
    else return;
    this.setComfortSettings(next);
    this.options.onComfortChange?.({ ...this.comfort });
    this.playTone(560, 0.055, 0.035);
    this.pulseController('left', 0.12, 28);
  }

  private activateVrPauseMenuItem() {
    if (this.vrPauseMenuIndex === 0) {
      this.closeVrPauseMenu();
      return;
    }
    if (this.vrPauseMenuIndex >= 1 && this.vrPauseMenuIndex <= 5) {
      this.adjustVrPauseMenu(1);
      return;
    }
    if (this.vrPauseMenuIndex === 6) {
      this.reset();
      this.closeVrPauseMenu();
      return;
    }
    void this.exitVr();
  }

  private drawVrPauseMenu() {
    const context = this.vrPauseCanvas.getContext('2d');
    if (!context) return;
    const choices = [
      'Continuar expedição',
      `Postura · ${this.comfort.posture === 'standing' ? 'Em pé' : 'Sentado'}`,
      `Mão dominante · ${this.comfort.dominantHand === 'left' ? 'Esquerda / X' : 'Direita / A'}`,
      `Controles · ${this.comfort.oneHandMode ? 'Uma mão' : 'Duas mãos'}`,
      `Altura da cintura · ${Math.round(this.comfort.waistOffset * 100)} cm`,
      `Distância do menu · ${Math.round(this.comfort.menuDistance * 100)} cm`,
      'Reiniciar sala',
      'Sair do VR',
    ];
    context.clearRect(0, 0, 1024, 720);
    context.fillStyle = 'rgba(4, 13, 14, 0.96)';
    context.fillRect(16, 16, 992, 688);
    context.strokeStyle = '#51e6b8';
    context.lineWidth = 4;
    context.strokeRect(16, 16, 992, 688);
    context.fillStyle = '#51e6b8';
    context.font = '700 22px monospace';
    context.fillText('OPEN DUNGEON VR · CONFORTO', 58, 64);
    context.fillStyle = '#f1eee5';
    context.font = '700 50px Georgia';
    context.fillText('Expedição pausada', 58, 125);
    context.fillStyle = '#8fa29c';
    context.font = '22px sans-serif';
    context.fillText('Analógico navega e ajusta · gatilho confirma', 58, 162);
    choices.forEach((choice, index) => {
      const y = 190 + index * 57;
      const selected = index === this.vrPauseMenuIndex;
      context.fillStyle = selected ? 'rgba(81, 230, 184, 0.2)' : 'rgba(19, 38, 37, 0.76)';
      context.fillRect(58, y, 908, 45);
      context.fillStyle = selected ? '#51e6b8' : '#344d49';
      context.fillRect(58, y, selected ? 8 : 3, 45);
      context.strokeStyle = selected ? '#51e6b8' : 'rgba(81, 230, 184, 0.16)';
      context.lineWidth = selected ? 3 : 1;
      context.strokeRect(58, y, 908, 45);
      context.fillStyle = selected ? '#ffffff' : '#a4b3ae';
      context.font = `${selected ? '700' : '600'} 22px sans-serif`;
      context.fillText(`${selected ? '›' : ' '} ${choice}`, 82, y + 30);
    });
    context.fillStyle = '#d3ad6e';
    context.font = '700 17px monospace';
    context.fillText('MENU / CLIQUE NO ANALÓGICO: FECHAR', 58, 682);
    this.vrPauseTexture.needsUpdate = true;
  }

  private consumePotion(item: ItemRuntime, holder: Holder) {
    if (this.potionConsumed || item.id !== 'potion') return;
    item.state = { ...item.state, holder: null, storedSlot: null };
    item.object.visible = false;
    item.velocity.set(0, 0, 0);
    item.sleeping = true;
    this.potionConsumed = true;
    this.health = healPlayer(this.health, MAX_HEALTH);
    this.drinkProgress = 0;
    this.poseHistory.set(holder, []);
    this.gripRotationOffsets.delete(holder);
    if (this.pullAnimation?.itemId === 'potion') this.pullAnimation = null;
    this.playTone(540, 0.12, 0.055);
    this.playTone(820, 0.18, 0.05, 0.1);
    this.pulseController(holder, 0.42, 90);
    this.emitInteraction(`Poção consumida · vida restaurada para ${this.health}/${MAX_HEALTH}.`);
  }

  private updateBagTransform(delta: number) {
    const headHeight = THREE.MathUtils.clamp(this.camera.position.y, 1.15, 1.95);
    const postureDrop = this.comfort.posture === 'seated' ? 0.58 : 0.76;
    this.adventureBag.position.set(
      this.camera.position.x,
      Math.max(0.48, headHeight - postureDrop + this.comfort.waistOffset),
      this.camera.position.z - 0.03,
    );
    this.desktopBagOpenSeconds = Math.max(0, this.desktopBagOpenSeconds - delta);
    this.scene.updateMatrixWorld(true);

    let handNear = false;
    if (this.renderer.xr.isPresenting) {
      for (const holder of ['left', 'right'] as const) {
        if (this.isControllerNearWaist(holder)) {
          handNear = true;
          break;
        }
      }
    }

    this.adventureBag.visible = handNear || this.bagMenuOpen || this.desktopBagOpenSeconds > 0;
    const target = this.bagMenuOpen ? 1 : 0;
    const blend = delta > 0 ? 1 - Math.exp(-10 * delta) : 1;
    this.bagOpenAmount += (target - this.bagOpenAmount) * blend;
    this.bagMenu.visible = this.bagOpenAmount > 0.015;
    this.bagMenu.scale.setScalar(0.9 + this.bagOpenAmount * 0.1);
    this.bagMenuMaterial.opacity = this.bagOpenAmount * 0.22;
    this.bagSlots.forEach((slot) => { slot.visible = this.bagOpenAmount > 0.18; });

    for (let index = 0; index < this.bagSlotMaterials.length; index += 1) {
      const material = this.bagSlotMaterials[index];
      const stored = this.itemInSlot(index);
      material.emissiveIntensity = stored ? 2.6 : 0.5;
      material.color.setHex(
        stored?.id === 'key' ? 0xffbd55 : stored?.id === 'potion' ? 0xff6f9f : stored ? 0x73e4ca : 0x51e6b8,
      );
    }

    for (const holder of ['left', 'right'] as const) {
      if (!this.itemForHolder(holder)) continue;
      const nearest = this.nearestBagSlot(holder);
      if (nearest !== null) {
        this.bagSlotMaterials[nearest].emissiveIntensity = 3.4;
        this.bagSlotMaterials[nearest].color.setHex(0xffffff);
      }
    }
  }

  private isControllerNearWaist(holder: 'left' | 'right') {
    const controller = this.controllers.get(holder);
    if (!controller) return false;
    this.adventureBag.getWorldPosition(this.worldPosition);
    controller.getWorldPosition(this.handPosition);
    return this.handPosition.distanceTo(this.worldPosition) <= 0.34;
  }

  private placeBagMenu() {
    const forward = this.slotPosition.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
    forward.normalize();
    this.bagMenu.position.set(
      this.camera.position.x + forward.x * this.comfort.menuDistance,
      THREE.MathUtils.clamp(this.camera.position.y - 0.12, 1.02, 1.6),
      this.camera.position.z + forward.z * this.comfort.menuDistance,
    );
    this.bagMenu.rotation.set(0, Math.atan2(-forward.x, -forward.z), 0);
  }

  private toggleBagMenu(holder?: 'left' | 'right') {
    this.bagMenuOpen = !this.bagMenuOpen;
    if (this.bagMenuOpen) this.placeBagMenu();
    this.playTone(this.bagMenuOpen ? 520 : 310, 0.065, 0.04);
    if (holder) this.pulseController(holder, 0.2, 35);
    this.emitInteraction(this.bagMenuOpen ? 'Bolsa aberta · escolha um dos seis slots.' : 'Bolsa fechada.');
  }

  private nearestBagSlot(holder: 'left' | 'right') {
    const controller = this.controllers.get(holder);
    if (!controller || !this.bagMenuOpen || this.bagOpenAmount < 0.18) return null;
    controller.getWorldPosition(this.handPosition);
    let nearest: number | null = null;
    let nearestDistance = BAG_SLOT_DISTANCE;
    for (let index = 0; index < this.bagSlots.length; index += 1) {
      this.bagSlots[index].getWorldPosition(this.slotPosition);
      const distance = this.handPosition.distanceTo(this.slotPosition);
      if (distance <= nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private itemForHolder(holder: Holder) {
    return Array.from(this.items.values()).find((item) => item.state.holder === holder) ?? null;
  }

  private itemInSlot(slot: number) {
    return Array.from(this.items.values()).find((item) => item.state.storedSlot === slot) ?? null;
  }

  private occupiedSlots() {
    return Array.from(this.items.values())
      .map((item) => item.state.storedSlot)
      .filter((slot): slot is number => slot !== null);
  }

  private controllerNearLock(holder: 'left' | 'right') {
    const controller = this.controllers.get(holder);
    if (!controller) return false;
    controller.getWorldPosition(this.handPosition);
    this.lockSocket.getWorldPosition(this.worldPosition);
    return canInsertMissionKey(this.handPosition.distanceTo(this.worldPosition));
  }

  private itemNearLock(item: ItemRuntime, distance: number) {
    this.lockSocket.getWorldPosition(this.worldPosition);
    return item.object.position.distanceTo(this.worldPosition) <= distance;
  }

  private insertKeyInLock(item: ItemRuntime, holder: Holder) {
    item.state = { ...item.state, holder: null, storedSlot: null };
    item.velocity.set(0, 0, 0);
    item.sleeping = true;
    this.keyInserted = true;
    this.pullAnimation = null;
    this.poseHistory.set(holder, []);
    this.gripRotationOffsets.delete(holder);
    this.playTone(440, 0.08, 0.06);
    this.playTone(760, 0.16, 0.055, 0.08);
    this.pulseController(holder, 0.55, 105);
    this.emitInteraction('Chave inserida · a passagem está abrindo.');
  }

  private finishControllerGrab(holder: 'left' | 'right') {
    if (this.vrMenuSelectGuards.delete(holder) || this.vrPauseMenuOpen) return;
    const item = this.itemForHolder(holder);
    if (!item) return;
    if (item.id === 'key' && this.controllerNearLock(holder)) {
      this.insertKeyInLock(item, holder);
      return;
    }
    if (this.isControllerNearWaist(holder)) {
      const slot = firstAvailableSlot(this.occupiedSlots(), BAG_SLOT_COUNT);
      if (slot !== null) {
        this.storeHeldObject(holder, slot, item);
        this.emitInteraction(`${item.label} guardada automaticamente no slot ${slot + 1}.`);
        return;
      }
      this.emitInteraction('A bolsa está cheia.');
      return;
    }
    const slot = this.nearestBagSlot(holder);
    if (slot !== null) {
      if (this.itemInSlot(slot)) {
        this.emitInteraction(`O slot ${slot + 1} já está ocupado.`);
        return;
      }
      this.storeHeldObject(holder, slot, item);
      return;
    }
    this.releaseHeldObject(holder, true, item);
  }

  private storeHeldObject(holder: Holder, slot: number, item = this.itemForHolder(holder)) {
    if (!item || this.itemInSlot(slot)) return;
    const stored = storeObject(item.state, holder, slot, BAG_SLOT_COUNT);
    if (stored === item.state) return;
    item.state = stored;
    item.lastStoredSlot = slot;
    item.sleeping = true;
    item.velocity.set(0, 0, 0);
    this.poseHistory.set(holder, []);
    this.gripRotationOffsets.delete(holder);
    if (this.pullAnimation?.holder === holder && this.pullAnimation.itemId === item.id) this.pullAnimation = null;
    this.desktopBagOpenSeconds = 1.3;
    this.playTone(440, 0.08, 0.055);
    this.playTone(660, 0.1, 0.04, 0.055);
    this.pulseController(holder, 0.34, 55);
    this.emitInteraction(`${item.label} guardada no slot ${slot + 1}.`);
  }

  private retrieveStoredObject(holder: Holder, slot: number) {
    const item = this.itemInSlot(slot);
    if (!item || this.itemForHolder(holder)) return;
    const retrieved = retrieveObject(item.state, holder, slot);
    if (retrieved === item.state) return;
    this.captureGripRotation(holder, item);
    item.state = retrieved;
    item.object.visible = true;
    item.object.scale.setScalar(item.worldScale);
    item.sleeping = false;
    item.velocity.set(0, 0, 0);
    this.poseHistory.set(holder, []);
    this.desktopBagOpenSeconds = 1.1;
    this.playTone(660, 0.07, 0.055);
    this.pulseController(holder, 0.28, 45);
    this.emitInteraction(`${item.label} retirada do slot ${slot + 1}.`);
  }

  private toggleDesktopBag() {
    this.desktopBagOpenSeconds = 1.6;
    if (!this.bagMenuOpen) {
      this.toggleBagMenu();
      return;
    }
    const held = this.itemForHolder('desktop');
    if (held) {
      const slot = firstAvailableSlot(this.occupiedSlots(), BAG_SLOT_COUNT);
      if (slot !== null) this.storeHeldObject('desktop', slot, held);
      return;
    }
    const stored = Array.from(this.items.values()).find((item) => item.state.storedSlot !== null);
    if (stored?.state.storedSlot !== null && stored?.state.storedSlot !== undefined) {
      this.retrieveStoredObject('desktop', stored.state.storedSlot);
      return;
    }
    this.toggleBagMenu();
  }

  private heldObjectPosition(holder: Holder, item = this.cube) {
    if (holder === 'desktop') {
      this.camera.getWorldPosition(this.worldPosition);
      this.camera.getWorldQuaternion(this.worldQuaternion);
      return new THREE.Vector3(0, -0.18, -0.82)
        .applyQuaternion(this.worldQuaternion)
        .add(this.worldPosition);
    }
    const controller = this.controllers.get(holder);
    if (!controller) return item.object.position.clone();
    controller.getWorldPosition(this.worldPosition);
    controller.getWorldQuaternion(this.worldQuaternion);
    return new THREE.Vector3(0, 0, -0.1).applyQuaternion(this.worldQuaternion).add(this.worldPosition);
  }

  private recordPose(holder: Holder, position: THREE.Vector3, timeSeconds: number) {
    const history = this.poseHistory.get(holder) ?? [];
    history.push({ position: { x: position.x, y: position.y, z: position.z }, timeSeconds });
    while (history.length > 2 && timeSeconds - history[0].timeSeconds > 0.22) history.shift();
    this.poseHistory.set(holder, history);
  }

  private tryDesktopGrab() {
    if (this.itemForHolder('desktop')) return;
    const item = this.desktopGrabCandidate();
    if (this.renderer.xr.isPresenting || !item) {
      this.emitInteraction('Mire em um item para pegá-lo.');
      return;
    }
    this.claimHeldObject('desktop', item);
  }

  private tryControllerGrab(holder: 'left' | 'right') {
    if (this.vrPauseMenuOpen) {
      this.vrMenuSelectGuards.add(holder);
      this.activateVrPauseMenuItem();
      this.pulseController(holder, 0.18, 34);
      return;
    }
    if (this.comfort.oneHandMode && holder !== this.comfort.dominantHand) return;
    if (this.isControllerNearWaist(holder)) {
      this.toggleBagMenu(holder);
      return;
    }
    if (this.itemForHolder(holder)) return;
    const nearestSlot = this.nearestBagSlot(holder);
    if (nearestSlot !== null && this.itemInSlot(nearestSlot)) {
      this.retrieveStoredObject(holder, nearestSlot);
      return;
    }
    const candidate = this.controllerGrabCandidate(holder);
    if (!candidate) {
      this.emitInteraction('Aponte a mão para o cubo ou para a chave e pressione o gatilho.');
      return;
    }
    this.claimHeldObject(holder, candidate.item, candidate.pullDistance);
  }

  private claimHeldObject(holder: Holder, item = this.cube, pullDistance?: number) {
    const pullFromPosition = item.object.position.clone();
    const pullFromRotation = item.object.quaternion.clone();
    this.captureGripRotation(holder, item);
    item.state = claimObject(item.state, holder);
    item.object.visible = true;
    item.object.scale.setScalar(item.worldScale);
    item.sleeping = false;
    item.velocity.set(0, 0, 0);
    this.poseHistory.set(holder, []);
    if ((holder === 'left' || holder === 'right') && pullDistance !== undefined) {
      this.pullAnimation = {
        itemId: item.id,
        holder,
        fromPosition: pullFromPosition,
        fromRotation: pullFromRotation,
        elapsed: 0,
        duration: remotePullDuration(pullDistance),
      };
    }
    this.playTone(330, 0.07, 0.055);
    this.pulseController(holder, 0.26, 45);
    this.emitInteraction(holder === 'desktop'
      ? `${item.label} em mãos · E solta, F arremessa.`
      : `${item.label} na mão ${holder}.`);
  }

  private captureGripRotation(holder: Holder, item = this.cube) {
    this.scene.updateMatrixWorld(true);
    const holderRotation = this.holderWorldRotation(holder);
    if (holderRotation) {
      const objectRotation = item.object.getWorldQuaternion(new THREE.Quaternion());
      this.gripRotationOffsets.set(holder, captureGripRotationOffset(holderRotation, objectRotation));
    }
  }

  private releaseHeldObject(holder: Holder, throwObject: boolean, item = this.itemForHolder(holder)) {
    if (!item || item.state.holder !== holder) return;
    const wasPulling = this.pullAnimation?.holder === holder && this.pullAnimation.itemId === item.id;
    if (wasPulling) this.pullAnimation = null;
    const shouldThrow = throwObject && !wasPulling;
    const released = releaseObject(item.state, holder);
    if (released === item.state) return;
    item.state = released;
    item.sleeping = false;

    if (shouldThrow) {
      const velocity = computeThrowVelocity(this.poseHistory.get(holder) ?? []);
      item.velocity.set(velocity.x, velocity.y, velocity.z);
      if (holder === 'desktop') {
        this.camera.getWorldDirection(this.worldPosition);
        item.velocity.copy(this.worldPosition.multiplyScalar(6.4));
        item.velocity.y += 1.15;
      }
    } else {
      item.velocity.set(0, 0, 0);
    }
    this.poseHistory.set(holder, []);
    this.gripRotationOffsets.delete(holder);
    this.playTone(shouldThrow ? 210 : 260, 0.08, 0.045);
    this.pulseController(holder, shouldThrow ? 0.38 : 0.18, shouldThrow ? 65 : 35);
    this.emitInteraction(shouldThrow ? `${item.label} lançado.` : `${item.label} solto.`);
  }

  private canDesktopGrab() {
    return this.desktopGrabCandidate() !== null;
  }

  private desktopGrabCandidate() {
    if (this.itemForHolder('desktop')) return null;
    this.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    let candidate: ItemRuntime | null = null;
    let nearest = DESKTOP_REACH;
    for (const item of this.items.values()) {
      if (this.itemUnavailable(item)) continue;
      const hit = this.raycaster.intersectObject(item.object, true)[0];
      if (hit && hit.distance <= nearest) {
        candidate = item;
        nearest = hit.distance;
      }
    }
    return candidate;
  }

  private anyControllerCanGrab() {
    for (const holder of ['left', 'right'] as const) {
      const slot = this.nearestBagSlot(holder);
      if (slot !== null && this.itemInSlot(slot)) return true;
      if (!this.itemForHolder(holder) && this.controllerGrabCandidate(holder)) return true;
    }
    return false;
  }

  private resetObject(status: string) {
    this.objectState = { ...INITIAL_OBJECT_STATE };
    const key = this.items.get('key')!;
    const potion = this.items.get('potion')!;
    key.state = { ...INITIAL_OBJECT_STATE };
    this.targetHits = 0;
    this.targetPulseSeconds = 0;
    this.objectSleeping = true;
    this.objectVelocity.set(0, 0, 0);
    this.runeCube.position.copy(CUBE_HOME);
    this.runeCube.rotation.set(0, Math.PI / 4, 0);
    this.runeCube.scale.setScalar(1);
    this.runeCube.visible = true;
    this.cube.lastStoredSlot = null;
    this.resetItem(key);
    this.resetItem(potion);
    this.keyInserted = false;
    this.potionConsumed = false;
    this.drinkProgress = 0;
    this.health = MAX_HEALTH;
    this.hazardOccupied = false;
    this.hazardPulseSeconds = 0;
    this.doorOpenAmount = 0;
    this.door.position.y = 1.8;
    this.bagMenuOpen = false;
    this.bagOpenAmount = 0;
    this.bagMenu.visible = false;
    this.targetCore.scale.setScalar(1);
    this.poseHistory.forEach((history) => history.splice(0));
    this.gripRotationOffsets.clear();
    this.pullAnimation = null;
    this.emitInteraction(status);
  }

  private resetItem(item: ItemRuntime) {
    item.state = { ...INITIAL_OBJECT_STATE };
    item.lastStoredSlot = null;
    item.sleeping = true;
    item.velocity.set(0, 0, 0);
    item.object.position.copy(item.home);
    item.object.rotation.set(0.12, item.id === 'cube' ? Math.PI / 4 : 0.3, item.id === 'key' ? -0.08 : 0);
    item.object.scale.setScalar(item.worldScale);
    item.object.visible = true;
  }

  private recoverItem(item: ItemRuntime) {
    const occupied = Array.from(this.items.values())
      .filter((candidate) => candidate !== item)
      .map((candidate) => candidate.state.storedSlot)
      .filter((slot): slot is number => slot !== null);
    const slot = preferredRecoverySlot(item.lastStoredSlot, occupied, BAG_SLOT_COUNT);
    item.velocity.set(0, 0, 0);
    item.sleeping = true;
    item.state = slot === null
      ? { ...INITIAL_OBJECT_STATE }
      : { ...INITIAL_OBJECT_STATE, storedSlot: slot };
    this.poseHistory.forEach((history) => history.splice(0));
    this.gripRotationOffsets.clear();
    if (this.pullAnimation?.itemId === item.id) this.pullAnimation = null;
    if (slot === null) {
      item.object.position.copy(item.home);
      item.object.rotation.set(0.12, item.id === 'cube' ? Math.PI / 4 : 0.3, item.id === 'key' ? -0.08 : 0);
      item.object.scale.setScalar(item.worldScale);
      item.object.visible = true;
      this.emitInteraction(`${item.label} recuperada no pedestal.`);
      return;
    }
    item.lastStoredSlot = slot;
    item.object.scale.setScalar(item.inventoryScale);
    item.object.visible = this.bagMenuOpen;
    this.emitInteraction(`${item.label} recuperada no slot ${slot + 1}.`);
  }

  private emitInteraction(status: string) {
    const snapshot: InteractionSnapshot = {
      canGrab: this.renderer.xr.isPresenting ? this.anyControllerCanGrab() : this.canDesktopGrab(),
      heldBy: Array.from(this.items.values()).find((item) => item.state.holder)?.state.holder ?? null,
      storedSlot: Array.from(this.items.values()).find((item) => item.state.storedSlot !== null)?.state.storedSlot ?? null,
      targetHits: this.targetHits,
      storedItemCount: this.occupiedSlots().length,
      keyInserted: this.keyInserted,
      doorOpen: !doorBlocksPassage(this.doorOpenAmount),
      health: this.health,
      maximumHealth: MAX_HEALTH,
      potionConsumed: this.potionConsumed,
      status,
    };
    const signature = JSON.stringify(snapshot);
    if (signature === this.lastInteractionSignature) return;
    this.lastInteractionSignature = signature;
    this.options.onInteraction?.(snapshot);
  }

  private contextualStatus(fallback: string) {
    if (this.keyInserted) return 'Passagem desbloqueada · atravesse a porta do portal.';
    if (this.health < MAX_HEALTH && !this.potionConsumed) return `Vida ${this.health}/${MAX_HEALTH} · encontre e beba a poção.`;
    if (this.potionConsumed) return `Poção consumida · vida ${this.health}/${MAX_HEALTH}.`;
    const held = Array.from(this.items.values()).find((item) => item.state.holder);
    if (held) return `${held.label} segura · leve à cintura ou use no objetivo.`;
    const storedCount = this.occupiedSlots().length;
    if (storedCount > 0) return `${storedCount} item${storedCount === 1 ? '' : 's'} guardado${storedCount === 1 ? '' : 's'} na bolsa.`;
    return fallback;
  }

  private playTone(frequency: number, duration: number, volume: number, delay = 0) {
    try {
      this.audioContext ??= new AudioContext();
      const start = this.audioContext.currentTime + delay;
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(this.audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    } catch {
      // Audio is feedback-only; interaction remains functional if a browser blocks it.
    }
  }

  private pulseController(holder: Holder, intensity: number, durationMs: number) {
    if (holder === 'desktop') return;
    const source = Array.from(this.renderer.xr.getSession()?.inputSources ?? [])
      .find((candidate) => candidate.handedness === holder);
    const gamepad = source?.gamepad as (Gamepad & {
      hapticActuators?: Array<{ pulse: (value: number, duration: number) => Promise<boolean> }>;
    }) | undefined;
    void gamepad?.hapticActuators?.[0]?.pulse(intensity, durationMs);
  }

  private pulseControllers(intensity: number, durationMs: number) {
    this.pulseController('left', intensity, durationMs);
    this.pulseController('right', intensity, durationMs);
  }

  private getPlayerWorldPosition() {
    if (!this.renderer.xr.isPresenting) {
      return { x: this.playerRig.position.x, z: this.playerRig.position.z };
    }
    // The XR manager's internal ArrayCamera has no playerRig parent. Reading it
    // directly returns tracking-space coordinates and makes a distant Quest
    // stationary-boundary origin push the rig farther away every frame.
    this.camera.getWorldPosition(this.worldPosition);
    return { x: this.worldPosition.x, z: this.worldPosition.z };
  }

  private readStick(axes: readonly number[]): [number, number] {
    const offset = axes.length >= 4 ? 2 : 0;
    return [applyDeadzone(axes[offset] ?? 0), applyDeadzone(axes[offset + 1] ?? 0)];
  }

  private holderWorldRotation(holder: Holder) {
    const source = holder === 'desktop' ? this.camera : this.controllers.get(holder);
    if (!source) return null;
    return source.getWorldQuaternion(new THREE.Quaternion());
  }

  private itemCanBeGrabbed(item: ItemRuntime) {
    if (this.itemUnavailable(item)) return false;
    if (!this.renderer.xr.isPresenting) return this.desktopGrabCandidate()?.id === item.id;
    return (['left', 'right'] as const).some((holder) => this.controllerGrabDistance(holder, item) !== null);
  }

  private controllerGrabCandidate(holder: 'left' | 'right') {
    let best: { item: ItemRuntime; pullDistance?: number; distance: number } | null = null;
    for (const item of this.items.values()) {
      if (this.itemUnavailable(item)) continue;
      const distance = this.controllerGrabDistance(holder, item);
      if (distance === null || (best && best.distance <= distance)) continue;
      best = { item, distance, pullDistance: distance > GRAB_DISTANCE ? distance : undefined };
    }
    return best;
  }

  private itemUnavailable(item: ItemRuntime) {
    return Boolean(
      item.state.holder
      || item.state.storedSlot !== null
      || (item.id === 'key' && this.keyInserted)
      || (item.id === 'potion' && this.potionConsumed),
    );
  }

  private controllerGrabDistance(holder: 'left' | 'right', item: ItemRuntime) {
    const controller = this.controllers.get(holder);
    if (!controller) return null;
    controller.getWorldPosition(this.handPosition);
    const directDistance = this.handPosition.distanceTo(item.object.position);
    if (directDistance <= GRAB_DISTANCE) return directDistance;
    controller.getWorldQuaternion(this.worldQuaternion);
    const forward = this.slotPosition.set(0, 0, -1).applyQuaternion(this.worldQuaternion);
    return remoteGrabDistance(
      this.handPosition,
      forward,
      item.object.position,
      item.radius,
      REMOTE_GRAB_DISTANCE,
    );
  }
}
