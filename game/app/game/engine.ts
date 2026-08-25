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
import { isDeliberateSwing, registerTrainingHit, sweptSphereHit } from './combat';
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
import { secondarySwordGripAnchor, swordGripAnchor, uprightSwordGripOffset } from './swordGrip';
import { directionalShieldBlock } from './shieldCombat';
import { heldShieldPosition, heldShieldRotation } from './shieldGrip';
import { enemyStateLabel, enemyStepToward, nextEnemyState, type EnemyState } from './enemyAI';
import {
  ENEMY_ATTACK_RANGE,
  ENEMY_RECOVER_SECONDS,
  ENEMY_SWING_SECONDS,
  ENEMY_WINDUP_SECONDS,
  canResolveEnemyAttack,
  enemyAttackArmAngle,
  enemyAttackArmInwardAngle,
  enemyAttackBodyTwist,
  nextEnemyAttackPhase,
  type EnemyAttackPhase,
} from './enemyCombat';
import { createVrSessionInit } from './xrSession';
import {
  GUARDIAN_MAXIMUM_HEALTH,
  damageGuardian,
  initialGuardianVitals,
  type GuardianVitalState,
} from './guardianVitals';
import { mapBoxUvsByWorldScale, mapCylinderUvsByWorldScale, mapPlaneUvsByWorldScale } from './surfaceUv';
import {
  BOW_MAX_DRAW_METERS,
  arrowFlightStep,
  arrowLaunchSpeed,
  bowDrawDistance,
  bowDrawPower,
  bowHapticStep,
  canArrowDealDamage,
} from './bow';

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
  dummyHits: number;
  arrowsFired: number;
  bowDrawPower: number;
  blockedAttacks: number;
  receivedAttacks: number;
  enemyState: EnemyState;
  enemyDistance: number;
  enemyAttackPhase: EnemyAttackPhase;
  enemyBlockedAttacks: number;
  enemyHits: number;
  guardianHealth: number;
  guardianMaximumHealth: number;
  guardianDefeated: boolean;
  guardianRewardStored: boolean;
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
const SWORD_HOME = new THREE.Vector3(-5.1, 1.08, 1.7);
const SHIELD_HOME = new THREE.Vector3(5.1, 1.12, 1.7);
const BOW_HOME = new THREE.Vector3(-1.7, 1.18, 4.2);
const HAZARD_POSITION = new THREE.Vector3(0, 0, 5.45);
const HAZARD_RADIUS = 0.72;
const MAX_HEALTH = 3;
const LOCK_POSITION = new THREE.Vector3(1.45, 1.18, -7.05);
const TARGET_POSITION = new THREE.Vector3(3, 2, -4.8);
const TARGET_RADIUS = 0.72;
const DUMMY_POSITION = new THREE.Vector3(-3.05, 1.15, -2.8);
const GUARDIAN_HOME = new THREE.Vector3(5.8, 0, -3.8);
const GUARDIAN_REWARD_HOME = new THREE.Vector3(5.8, 0.2, -3.8);
const GUARDIAN_RADIUS = 0.46;
const GUARDIAN_PATROL = [
  new THREE.Vector3(5.8, 0, -3.8),
  new THREE.Vector3(8.3, 0, -5.7),
  new THREE.Vector3(7.8, 0, -8.2),
  new THREE.Vector3(4.8, 0, -7.2),
] as const;
const VR_PAUSE_MENU_ITEM_COUNT = 8;
const STONE_TILE_METERS = 5;
const FLOOR_TILE_METERS = 7;
const BOW_STRING_GRAB_RADIUS = 0.24;
const ARROW_POOL_SIZE = 8;
const ARROW_TIP_OFFSET = 0.78;
const ARROW_LOCAL_FORWARD = new THREE.Vector3(0, 0, -1);

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

const SWORD_RACK_COLLIDER: BoxCollider = {
  kind: 'box',
  id: 'foundation-sword-rack',
  x: SWORD_HOME.x,
  z: SWORD_HOME.z,
  halfX: 0.45,
  halfZ: 0.21,
  rotation: 0,
};

const SHIELD_RACK_COLLIDER: BoxCollider = {
  kind: 'box',
  id: 'foundation-shield-rack',
  x: SHIELD_HOME.x,
  z: SHIELD_HOME.z,
  halfX: 0.45,
  halfZ: 0.21,
  rotation: 0,
};

const BOW_RACK_COLLIDER: BoxCollider = {
  kind: 'box',
  id: 'foundation-bow-rack',
  x: BOW_HOME.x,
  z: BOW_HOME.z,
  halfX: 0.48,
  halfZ: 0.23,
  rotation: 0,
};

const TRAINING_DUMMY_COLLIDER: CircleCollider = {
  kind: 'circle',
  id: 'training-dummy',
  x: DUMMY_POSITION.x,
  z: DUMMY_POSITION.z,
  radius: 0.5,
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
  SWORD_RACK_COLLIDER,
  SHIELD_RACK_COLLIDER,
  BOW_RACK_COLLIDER,
  TRAINING_DUMMY_COLLIDER,
];

type ItemId = 'cube' | 'key' | 'potion' | 'sword' | 'shield' | 'bow' | 'rune';

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
  secondaryHolder: 'left' | 'right' | null;
};

type ArrowRuntime = {
  object: THREE.Group;
  velocity: THREE.Vector3;
  previousTip: THREE.Vector3;
  state: 'ready' | 'nocked' | 'flying' | 'stuck';
  lifeSeconds: number;
  drawDistance: number;
  shooter: Holder | null;
};

type BowDrawRuntime = {
  bowHolder: Holder;
  drawHolder: Holder;
  arrow: ArrowRuntime;
  drawDistance: number;
  lastHapticStep: number;
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
  private readonly disposableTextures = new Set<THREE.Texture>();
  private readonly collisionDebug = new THREE.Group();
  private readonly playerColliderDebug = new THREE.Mesh();
  private readonly worldPosition = new THREE.Vector3();
  private readonly handPosition = new THREE.Vector3();
  private readonly slotPosition = new THREE.Vector3();
  private readonly worldQuaternion = new THREE.Quaternion();
  private readonly raycaster = new THREE.Raycaster();
  private readonly controllers = new Map<Holder, THREE.Group>();
  private readonly vrPointerLines = new Map<'left' | 'right', THREE.Line>();
  private readonly vrPointerCursors = new Map<'left' | 'right', THREE.Mesh>();
  private readonly vrPointerTargets = new Map<'left' | 'right', number | null>();
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
  private readonly trainingDummy: THREE.Group;
  private readonly dummyMaterial: THREE.MeshStandardMaterial;
  private readonly trainingBolt: THREE.Mesh;
  private readonly trainingBoltMaterial: THREE.MeshStandardMaterial;
  private readonly guardian: THREE.Group;
  private readonly guardianBody: THREE.Group;
  private readonly guardianLeftArm: THREE.Group;
  private readonly guardianRightArm: THREE.Group;
  private readonly guardianLeftLeg: THREE.Group;
  private readonly guardianRightLeg: THREE.Group;
  private readonly guardianWeaponTip: THREE.Object3D;
  private readonly guardianStateMaterial: THREE.MeshBasicMaterial;
  private readonly guardianArmorMaterial: THREE.MeshStandardMaterial;
  private readonly bowString: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly arrows: ArrowRuntime[];
  private bowDraw: BowDrawRuntime | null = null;
  private arrowsFired = 0;
  private bowPower = 0;
  private readonly arrowTip = new THREE.Vector3();
  private readonly arrowDirection = new THREE.Vector3();
  private readonly bowLocalHand = new THREE.Vector3();
  private targetHits = 0;
  private targetPulseSeconds = 0;
  private lastInteractionSignature = '';
  private keyInserted = false;
  private doorOpenAmount = 0;
  private health = MAX_HEALTH;
  private potionConsumed = false;
  private dummyHits = 0;
  private dummyHitCooldown = 0;
  private dummyHitPulse = 0;
  private readonly swordTip = new THREE.Vector3();
  private readonly previousSwordTip = new THREE.Vector3();
  private swordTipReady = false;
  private readonly swordGripAnchors = new Map<Holder, THREE.Vector3>();
  private blockedAttacks = 0;
  private receivedAttacks = 0;
  private shieldAttackPhase: 'waiting' | 'telegraph' | 'flight' | 'cooldown' = 'waiting';
  private shieldAttackTimer = 0;
  private readonly shieldAttackOrigin = new THREE.Vector3();
  private readonly shieldAttackTarget = new THREE.Vector3();
  private readonly previousTrainingBoltPosition = new THREE.Vector3();
  private enemyState: EnemyState = 'idle';
  private enemyStateSeconds = 0;
  private enemyPatrolIndex = 1;
  private enemyDistance = Number.POSITIVE_INFINITY;
  private enemyTravelSeconds = 0;
  private enemyAttackPhase: EnemyAttackPhase = 'ready';
  private enemyAttackSeconds = 0;
  private enemyAttackResolved = false;
  private enemyWeaponTipReady = false;
  private readonly enemyWeaponTipPosition = new THREE.Vector3();
  private readonly previousEnemyWeaponTipPosition = new THREE.Vector3();
  private readonly enemyShieldCenter = new THREE.Vector3();
  private readonly enemyShieldNormal = new THREE.Vector3();
  private readonly enemyPlayerTarget = new THREE.Vector3();
  private readonly enemyShieldQuaternion = new THREE.Quaternion();
  private enemyBlockedAttacks = 0;
  private enemyHits = 0;
  private guardianVitals: GuardianVitalState = initialGuardianVitals();
  private guardianHitCooldown = 0;
  private guardianStaggerSeconds = 0;
  private guardianHitPulse = 0;
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
    this.items.set('sword', this.createItemRuntime(
      'sword', 'Espada da fundação', interactables.sword, interactables.swordMaterial, SWORD_HOME, 0.13, INVENTORY_PREVIEW_SCALE.sword,
    ));
    this.items.set('shield', this.createItemRuntime(
      'shield', 'Escudo da fundação', interactables.shield, interactables.shieldMaterial, SHIELD_HOME, 0.46, INVENTORY_PREVIEW_SCALE.shield,
    ));
    this.items.set('bow', this.createItemRuntime(
      'bow', 'Arco da fundação', interactables.bow, interactables.bowMaterial, BOW_HOME, 0.34, INVENTORY_PREVIEW_SCALE.bow,
    ));
    this.items.set('rune', this.createItemRuntime(
      'rune', 'Runa do Guardião', interactables.guardianReward, interactables.guardianRewardMaterial, GUARDIAN_REWARD_HOME, 0.16, INVENTORY_PREVIEW_SCALE.rune,
    ));
    this.door = interactables.door;
    this.lockSocket = interactables.lockSocket;
    this.hazardMaterial = interactables.hazardMaterial;
    this.targetMaterial = interactables.targetMaterial;
    this.targetCore = interactables.targetCore;
    this.trainingDummy = interactables.trainingDummy;
    this.dummyMaterial = interactables.dummyMaterial;
    this.trainingBolt = interactables.trainingBolt;
    this.trainingBoltMaterial = interactables.trainingBoltMaterial;
    this.guardian = interactables.guardian;
    this.guardianBody = interactables.guardianBody;
    this.guardianLeftArm = interactables.guardianLeftArm;
    this.guardianRightArm = interactables.guardianRightArm;
    this.guardianLeftLeg = interactables.guardianLeftLeg;
    this.guardianRightLeg = interactables.guardianRightLeg;
    this.guardianWeaponTip = interactables.guardianWeaponTip;
    this.guardianStateMaterial = interactables.guardianStateMaterial;
    this.guardianArmorMaterial = interactables.guardianArmor;
    this.bowString = interactables.bowString;
    this.arrows = interactables.arrows;
    this.bagMenuMaterial = this.basicMaterial({
      color: 0x102b28,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.vrPauseCanvas = document.createElement('canvas');
    this.vrPauseCanvas.width = 2048;
    this.vrPauseCanvas.height = 1440;
    this.vrPauseTexture = new THREE.CanvasTexture(this.vrPauseCanvas);
    this.vrPauseTexture.colorSpace = THREE.SRGBColorSpace;
    this.vrPauseTexture.generateMipmaps = false;
    this.vrPauseTexture.minFilter = THREE.LinearFilter;
    this.vrPauseTexture.magFilter = THREE.LinearFilter;
    this.vrPauseTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
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
    this.emitInteraction('Encontre a espada na lateral esquerda e treine no boneco central.');
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
    this.disposableTextures.forEach((texture) => texture.dispose());
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

  private surfaceTexture(file: string, color = false) {
    const texture = new THREE.TextureLoader().load(
      new URL(`assets/textures/dungeon-v1/${file}`, document.baseURI).toString(),
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), this.quest ? 4 : 8);
    this.disposableTextures.add(texture);
    return texture;
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
      secondaryHolder: null,
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
    const floorAlbedo = this.surfaceTexture('flagstone-floor-albedo.webp', true);
    const floorNormal = this.surfaceTexture('flagstone-floor-normal.png');
    const floorMaterial = this.material({
      color: 0xd8dfdc,
      map: floorAlbedo,
      normalMap: floorNormal,
      normalScale: new THREE.Vector2(0.46, 0.46),
      roughness: 0.94,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    const floorGeometry = mapPlaneUvsByWorldScale(
      new THREE.PlaneGeometry(24, 24, 12, 12),
      FLOOR_TILE_METERS,
      FLOOR_TILE_METERS,
    );
    const floor = new THREE.Mesh(this.geometry(floorGeometry), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const stone = this.material({
      color: 0xd8ddd6,
      map: this.surfaceTexture('stone-wall-albedo.webp', true),
      normalMap: this.surfaceTexture('stone-wall-normal.png'),
      normalScale: new THREE.Vector2(0.38, 0.38),
      roughness: 0.9,
      metalness: 0.02,
    });
    const bronze = this.material({
      color: 0xc8a37b,
      map: this.surfaceTexture('aged-bronze-albedo.webp', true),
      normalMap: this.surfaceTexture('aged-bronze-normal.png'),
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 0.56,
      metalness: 0.72,
    });
    const rune = this.material({ color: 0x40e0b4, emissive: 0x18b992, emissiveIntensity: 2.2, roughness: 0.2 });

    const pillarGeometry = this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(1.7, 4.4, 1.7), STONE_TILE_METERS, STONE_TILE_METERS,
    ));
    for (const collider of PILLAR_COLLIDERS) {
      const pillar = new THREE.Mesh(pillarGeometry, stone);
      pillar.position.set(collider.x, 2.2, collider.z);
      pillar.rotation.y = collider.rotation;
      this.scene.add(pillar);
    }

    const longWall = this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(24, 4.4, 0.6), STONE_TILE_METERS, STONE_TILE_METERS,
    ));
    const sideWall = this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(0.6, 4.4, 24), STONE_TILE_METERS, STONE_TILE_METERS,
    ));
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
    const postGeometry = this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(1.1, 4.6, 1.4), STONE_TILE_METERS, STONE_TILE_METERS,
    ));
    const topGeometry = this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(6.2, 1.05, 1.4), STONE_TILE_METERS, STONE_TILE_METERS,
    ));
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

    const altarGeometry = mapCylinderUvsByWorldScale(
      new THREE.CylinderGeometry(1.05, 1.45, 1.1, 8),
      Math.PI * (1.05 + 1.45),
      1.1,
      STONE_TILE_METERS,
      STONE_TILE_METERS,
    );
    const altar = new THREE.Mesh(this.geometry(altarGeometry), stone);
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

    const pedestal = new THREE.Mesh(this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(1.16, 1.05, 1.16), STONE_TILE_METERS, STONE_TILE_METERS,
    )), stone);
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

    const keyPedestal = new THREE.Mesh(this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(1.04, 0.92, 1.04), STONE_TILE_METERS, STONE_TILE_METERS,
    )), stone);
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

    const potionPedestal = new THREE.Mesh(this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(0.92, 0.9, 0.92), STONE_TILE_METERS, STONE_TILE_METERS,
    )), stone);
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

    const swordRack = new THREE.Mesh(this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(0.9, 0.72, 0.42), STONE_TILE_METERS, STONE_TILE_METERS,
    )), stone);
    swordRack.position.set(SWORD_HOME.x, 0.36, SWORD_HOME.z);
    this.scene.add(swordRack);
    const swordMaterial = this.material({
      color: 0xc9d8d5,
      emissive: 0x235f59,
      emissiveIntensity: 0.85,
      roughness: 0.24,
      metalness: 0.86,
    });
    const swordGripMaterial = this.material({ color: 0x493227, roughness: 0.72, metalness: 0.22 });
    const sword = new THREE.Group();
    sword.name = 'foundation-sword';
    const grip = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.035, 0.042, 0.22, 12)), swordGripMaterial);
    grip.rotation.x = Math.PI / 2;
    grip.position.z = 0.02;
    const pommel = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(0.065, 12, 8)), bronze);
    pommel.position.z = 0.15;
    const guard = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.32, 0.055, 0.07)), bronze);
    guard.position.z = -0.12;
    const blade = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.085, 0.025, 0.7)), swordMaterial);
    blade.position.z = -0.5;
    const bladeTip = new THREE.Mesh(this.geometry(new THREE.ConeGeometry(0.062, 0.18, 4)), swordMaterial);
    bladeTip.rotation.x = -Math.PI / 2;
    bladeTip.position.z = -0.94;
    sword.add(grip, pommel, guard, blade, bladeTip);
    sword.position.copy(SWORD_HOME);
    sword.rotation.set(0.08, -0.42, 0.12);
    this.scene.add(sword);

    const shieldRack = new THREE.Mesh(this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(0.9, 0.72, 0.42), STONE_TILE_METERS, STONE_TILE_METERS,
    )), stone);
    shieldRack.position.set(SHIELD_HOME.x, 0.36, SHIELD_HOME.z);
    this.scene.add(shieldRack);
    const shieldMaterial = this.material({
      color: 0x436e68,
      emissive: 0x123f39,
      emissiveIntensity: 0.9,
      roughness: 0.42,
      metalness: 0.62,
    });
    const shield = new THREE.Group();
    shield.name = 'foundation-shield';
    const shieldBody = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.46, 0.46, 0.075, 32)), shieldMaterial);
    shieldBody.rotation.x = Math.PI / 2;
    const shieldRim = new THREE.Mesh(this.geometry(new THREE.TorusGeometry(0.43, 0.045, 10, 36)), bronze);
    shieldRim.position.z = 0.045;
    const shieldBoss = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(0.13, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2)), bronze);
    shieldBoss.rotation.x = Math.PI / 2;
    shieldBoss.position.z = 0.048;
    const shieldRune = new THREE.Mesh(this.geometry(new THREE.RingGeometry(0.2, 0.235, 28)), rune);
    shieldRune.position.z = 0.086;
    const shieldHandle = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.2, 0.055, 0.055)), swordGripMaterial);
    shieldHandle.position.z = -0.085;
    shield.add(shieldBody, shieldRim, shieldBoss, shieldRune, shieldHandle);
    shield.position.copy(SHIELD_HOME);
    shield.rotation.set(0.08, 0.42, -0.08);
    this.scene.add(shield);

    const bowRack = new THREE.Mesh(this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(0.96, 0.7, 0.46), STONE_TILE_METERS, STONE_TILE_METERS,
    )), stone);
    bowRack.position.set(BOW_HOME.x, 0.35, BOW_HOME.z);
    this.scene.add(bowRack);
    const bowMaterial = this.material({
      color: 0x855b35,
      emissive: 0x3e2412,
      emissiveIntensity: 0.72,
      roughness: 0.72,
      metalness: 0.08,
    });
    const bow = new THREE.Group();
    bow.name = 'foundation-bow';
    const upperCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(0.24, 0.28, 0),
      new THREE.Vector3(0.2, 0.56, 0),
      new THREE.Vector3(0, 0.7, 0),
    );
    const lowerCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, -0.1, 0),
      new THREE.Vector3(0.24, -0.28, 0),
      new THREE.Vector3(0.2, -0.56, 0),
      new THREE.Vector3(0, -0.7, 0),
    );
    const upperLimb = new THREE.Mesh(this.geometry(new THREE.TubeGeometry(upperCurve, 18, 0.025, 7, false)), bowMaterial);
    const lowerLimb = new THREE.Mesh(this.geometry(new THREE.TubeGeometry(lowerCurve, 18, 0.025, 7, false)), bowMaterial);
    const bowGrip = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.038, 0.042, 0.22, 10)), swordGripMaterial);
    const stringMaterial = new THREE.LineBasicMaterial({ color: 0xe4ddd0, transparent: true, opacity: 0.92 });
    this.disposableMaterials.add(stringMaterial);
    const stringGeometry = this.geometry(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.7, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.7, 0),
    ]));
    const bowString = new THREE.Line(stringGeometry, stringMaterial);
    bowString.name = 'bow-string';
    bow.add(upperLimb, lowerLimb, bowGrip, bowString);
    bow.position.copy(BOW_HOME);
    bow.rotation.set(0.04, 0.2, -0.08);
    this.scene.add(bow);

    const arrowMaterial = this.material({
      color: 0xb8945d,
      emissive: 0x33210e,
      emissiveIntensity: 0.35,
      roughness: 0.76,
      metalness: 0.04,
    });
    const arrowHeadMaterial = this.material({ color: 0xb9c7c4, roughness: 0.28, metalness: 0.82 });
    const fletchingMaterial = this.material({ color: 0x5bcbb0, roughness: 0.62, metalness: 0.08 });
    const shaftGeometry = this.geometry(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 7));
    const headGeometry = this.geometry(new THREE.ConeGeometry(0.025, 0.1, 5));
    const fletchingGeometry = this.geometry(new THREE.BoxGeometry(0.055, 0.012, 0.12));
    const arrows: ArrowRuntime[] = [];
    for (let index = 0; index < ARROW_POOL_SIZE; index += 1) {
      const arrow = new THREE.Group();
      arrow.name = `foundation-arrow-${index + 1}`;
      const shaft = new THREE.Mesh(shaftGeometry, arrowMaterial);
      shaft.rotation.x = -Math.PI / 2;
      shaft.position.z = -0.39;
      const head = new THREE.Mesh(headGeometry, arrowHeadMaterial);
      head.rotation.x = -Math.PI / 2;
      head.position.z = -0.78;
      const featherA = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
      featherA.position.z = -0.08;
      const featherB = new THREE.Mesh(fletchingGeometry, fletchingMaterial);
      featherB.rotation.z = Math.PI / 2;
      featherB.position.z = -0.08;
      arrow.add(shaft, head, featherA, featherB);
      arrow.visible = false;
      this.scene.add(arrow);
      arrows.push({
        object: arrow,
        velocity: new THREE.Vector3(),
        previousTip: new THREE.Vector3(),
        state: 'ready',
        lifeSeconds: 0,
        drawDistance: 0,
        shooter: null,
      });
    }

    const dummyMaterial = this.material({
      color: 0x8a6244,
      emissive: 0x1a0c06,
      emissiveIntensity: 0.25,
      roughness: 0.88,
      metalness: 0.04,
    });
    const trainingDummy = new THREE.Group();
    trainingDummy.name = 'training-dummy';
    trainingDummy.position.copy(DUMMY_POSITION);
    const dummyPost = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.075, 0.095, 1.65, 12)), bronze);
    dummyPost.position.y = -0.32;
    const dummyTorso = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.72, 0.78, 0.28)), dummyMaterial);
    dummyTorso.position.y = 0.16;
    const dummyHead = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(0.22, 16, 12)), dummyMaterial);
    dummyHead.position.y = 0.78;
    const dummyBase = new THREE.Mesh(this.geometry(mapCylinderUvsByWorldScale(
      new THREE.CylinderGeometry(0.48, 0.58, 0.16, 16),
      Math.PI * (0.48 + 0.58),
      0.16,
      STONE_TILE_METERS,
      STONE_TILE_METERS,
    )), stone);
    dummyBase.position.y = -1.05;
    trainingDummy.add(dummyPost, dummyTorso, dummyHead, dummyBase);
    this.scene.add(trainingDummy);

    const trainingBoltMaterial = this.material({
      color: 0xffb35c,
      emissive: 0xe34a24,
      emissiveIntensity: 3.6,
      roughness: 0.2,
      metalness: 0.28,
      transparent: true,
      opacity: 0.94,
    });
    const trainingBolt = new THREE.Mesh(this.geometry(new THREE.IcosahedronGeometry(0.1, 1)), trainingBoltMaterial);
    trainingBolt.name = 'shield-training-bolt';
    trainingBolt.visible = false;
    this.scene.add(trainingBolt);

    const boneMaterial = this.material({
      color: 0xd7c9a6,
      emissive: 0x31271a,
      emissiveIntensity: 0.25,
      roughness: 0.82,
      metalness: 0.04,
    });
    const guardianArmor = this.material({
      color: 0x314b49,
      emissive: 0x0b2422,
      emissiveIntensity: 0.55,
      roughness: 0.5,
      metalness: 0.58,
    });
    const guardian = new THREE.Group();
    guardian.name = 'ossuary-guardian-blockout';
    guardian.position.copy(GUARDIAN_HOME);
    const guardianBody = new THREE.Group();
    guardianBody.name = 'guardian-body-pivot';
    const pelvis = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.46, 0.28, 0.3)), guardianArmor);
    pelvis.position.y = 0.83;
    const torso = new THREE.Mesh(this.geometry(new THREE.BoxGeometry(0.72, 0.72, 0.36)), guardianArmor);
    torso.position.y = 1.25;
    const ribRune = new THREE.Mesh(this.geometry(new THREE.OctahedronGeometry(0.12, 0)), rune);
    ribRune.position.set(0, 1.27, 0.23);
    const guardianNeck = new THREE.Mesh(this.geometry(new THREE.CylinderGeometry(0.08, 0.1, 0.2, 10)), boneMaterial);
    guardianNeck.position.y = 1.7;
    const head = new THREE.Mesh(this.geometry(new THREE.DodecahedronGeometry(0.24, 0)), boneMaterial);
    head.position.y = 1.94;
    const eyeMaterial = this.basicMaterial({ color: 0xff9f45, toneMapped: false });
    for (const x of [-0.085, 0.085]) {
      const eye = new THREE.Mesh(this.geometry(new THREE.SphereGeometry(0.027, 8, 6)), eyeMaterial);
      eye.position.set(x, 1.98, 0.215);
      guardianBody.add(eye);
    }
    guardianBody.add(pelvis, torso, ribRune, guardianNeck, head);
    const limbGeometry = this.geometry(new THREE.CylinderGeometry(0.075, 0.095, 0.68, 10));
    const bootGeometry = this.geometry(new THREE.BoxGeometry(0.18, 0.16, 0.3));
    const guardianLeftArm = new THREE.Group();
    const guardianRightArm = new THREE.Group();
    const guardianLeftLeg = new THREE.Group();
    const guardianRightLeg = new THREE.Group();
    for (const [limb, x, y, isArm] of [
      [guardianLeftArm, -0.46, 1.53, true],
      [guardianRightArm, 0.46, 1.53, true],
      [guardianLeftLeg, -0.18, 0.78, false],
      [guardianRightLeg, 0.18, 0.78, false],
    ] as const) {
      limb.position.set(x, y, 0);
      const segment = new THREE.Mesh(limbGeometry, boneMaterial);
      segment.position.y = -0.32;
      limb.add(segment);
      if (!isArm) {
        const boot = new THREE.Mesh(bootGeometry, guardianArmor);
        boot.position.set(0, -0.7, 0.07);
        limb.add(boot);
      }
      guardianBody.add(limb);
    }
    const maceHandle = new THREE.Mesh(
      this.geometry(new THREE.CylinderGeometry(0.035, 0.045, 0.62, 10)),
      bronze,
    );
    maceHandle.position.y = -0.79;
    const maceHead = new THREE.Mesh(
      this.geometry(new THREE.DodecahedronGeometry(0.17, 0)),
      guardianArmor,
    );
    maceHead.position.y = -1.09;
    maceHead.scale.set(1.15, 0.9, 1.15);
    const guardianWeaponTip = new THREE.Object3D();
    guardianWeaponTip.name = 'guardian-mace-impact-point';
    guardianWeaponTip.position.y = -1.14;
    guardianRightArm.add(maceHandle, maceHead, guardianWeaponTip);
    const guardianStateMaterial = this.basicMaterial({
      color: 0x6de7bf,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const guardianStateRing = new THREE.Mesh(
      this.geometry(new THREE.RingGeometry(0.54, 0.61, 32)),
      guardianStateMaterial,
    );
    guardianStateRing.rotation.x = -Math.PI / 2;
    guardianStateRing.position.y = 0.025;
    guardian.add(guardianBody, guardianStateRing);
    this.scene.add(guardian);

    const guardianRewardMaterial = this.material({
      color: 0x8fffe0,
      emissive: 0x21c99f,
      emissiveIntensity: 3.2,
      roughness: 0.18,
      metalness: 0.38,
    });
    const guardianReward = new THREE.Group();
    guardianReward.name = 'guardian-memory-rune';
    const rewardCore = new THREE.Mesh(
      this.geometry(new THREE.OctahedronGeometry(0.16, 0)),
      guardianRewardMaterial,
    );
    const rewardRing = new THREE.Mesh(
      this.geometry(new THREE.TorusGeometry(0.21, 0.022, 8, 28)),
      bronze,
    );
    rewardRing.rotation.x = Math.PI / 2;
    guardianReward.add(rewardCore, rewardRing);
    guardianReward.position.copy(GUARDIAN_REWARD_HOME);
    guardianReward.visible = false;
    this.scene.add(guardianReward);

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
    const targetStand = new THREE.Mesh(this.geometry(mapBoxUvsByWorldScale(
      new THREE.BoxGeometry(0.18, 1.5, 0.18), STONE_TILE_METERS, STONE_TILE_METERS,
    )), stone);
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
      sword,
      swordMaterial,
      shield,
      shieldMaterial,
      bow,
      bowMaterial,
      bowString,
      arrows,
      trainingBolt,
      trainingBoltMaterial,
      guardian,
      guardianBody,
      guardianLeftArm,
      guardianRightArm,
      guardianLeftLeg,
      guardianRightLeg,
      guardianWeaponTip,
      guardianStateMaterial,
      guardianArmor,
      guardianReward,
      guardianRewardMaterial,
      hazardMaterial,
      door,
      lockSocket,
      targetMaterial,
      targetCore,
      trainingDummy,
      dummyMaterial,
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
      const pointerMaterial = new THREE.LineBasicMaterial({
        color: holder === 'left' ? 0x51e6b8 : 0xd3ad6e,
        transparent: true,
        opacity: 0.88,
        depthTest: false,
        toneMapped: false,
      });
      this.disposableMaterials.add(pointerMaterial);
      const pointer = new THREE.Line(
        this.geometry(new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, -1),
        ])),
        pointerMaterial,
      );
      pointer.name = `${holder}-menu-pointer`;
      pointer.scale.z = 1.2;
      pointer.renderOrder = 42;
      pointer.visible = false;
      controller.add(pointer);
      const cursor = new THREE.Mesh(
        this.geometry(new THREE.RingGeometry(0.012, 0.023, 24)),
        this.basicMaterial({
          color: holder === 'left' ? 0x51e6b8 : 0xd3ad6e,
          side: THREE.DoubleSide,
          depthTest: false,
          toneMapped: false,
        }),
      );
      cursor.name = `${holder}-menu-cursor`;
      cursor.renderOrder = 43;
      cursor.visible = false;
      this.scene.add(cursor);
      this.vrPointerLines.set(holder, pointer);
      this.vrPointerCursors.set(holder, cursor);
      this.vrPointerTargets.set(holder, null);
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
    if (event.code === 'KeyJ') this.desktopSwordStrike();
    if (event.code === 'KeyK') this.tryStartDesktopBowDraw();
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    if (event.code === 'KeyK') this.finishBowDraw('desktop');
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
    this.updateGuardian(delta, resolved);
    this.updateAdventureObject(delta, nowSeconds);
    this.updateGuardianAttack(delta);
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

  private activeColliders(includeGuardian = true) {
    const colliders = doorBlocksPassage(this.doorOpenAmount)
      ? [...ROOM_COLLIDERS, LOCKED_DOOR_COLLIDER]
      : ROOM_COLLIDERS;
    if (!includeGuardian || this.guardianVitals.defeated) return colliders;
    return [...colliders, {
      kind: 'circle' as const,
      id: 'ossuary-guardian',
      x: this.guardian.position.x,
      z: this.guardian.position.z,
      radius: GUARDIAN_RADIUS,
    }];
  }

  private updateDoor(delta: number) {
    const target = this.keyInserted ? 1 : 0;
    const blend = delta > 0 ? 1 - Math.exp(-3.8 * delta) : 1;
    this.doorOpenAmount += (target - this.doorOpenAmount) * blend;
    this.door.position.y = 1.8 + this.doorOpenAmount * 4.2;
    if (this.doorColliderDebug) this.doorColliderDebug.visible = doorBlocksPassage(this.doorOpenAmount);
  }

  private updateGuardian(delta: number, player: { x: number; z: number }) {
    const current = { x: this.guardian.position.x, z: this.guardian.position.z };
    this.enemyDistance = Math.hypot(player.x - current.x, player.z - current.z);
    this.guardianHitCooldown = Math.max(0, this.guardianHitCooldown - delta);
    this.guardianStaggerSeconds = Math.max(0, this.guardianStaggerSeconds - delta);
    this.guardianHitPulse = Math.max(0, this.guardianHitPulse - delta);
    this.guardianArmorMaterial.emissive.setHex(this.guardianHitPulse > 0 ? 0xa32b20 : 0x0b2422);
    this.guardianArmorMaterial.emissiveIntensity = this.guardianHitPulse > 0 ? 3.4 : 0.55;

    if (this.guardianVitals.defeated) {
      const deathBlend = 1 - Math.exp(-4.8 * delta);
      this.guardianBody.rotation.z += (-Math.PI / 2 - this.guardianBody.rotation.z) * deathBlend;
      this.guardianBody.rotation.x += (0 - this.guardianBody.rotation.x) * deathBlend;
      this.guardianBody.rotation.y += (0 - this.guardianBody.rotation.y) * deathBlend;
      this.guardianBody.position.y += (0.16 - this.guardianBody.position.y) * deathBlend;
      this.guardianLeftArm.rotation.x += (0.35 - this.guardianLeftArm.rotation.x) * deathBlend;
      this.guardianRightArm.rotation.x += (-0.2 - this.guardianRightArm.rotation.x) * deathBlend;
      this.guardianStateMaterial.color.setHex(0x35d9ae);
      this.guardianStateMaterial.opacity = 0.42;
      return;
    }

    this.enemyStateSeconds += delta;
    const reachedHome = Math.hypot(current.x - GUARDIAN_HOME.x, current.z - GUARDIAN_HOME.z) <= 0.42;
    const nextState = nextEnemyState(this.enemyState, this.enemyDistance, this.enemyStateSeconds, reachedHome);
    if (nextState !== this.enemyState) {
      this.enemyState = nextState;
      this.enemyStateSeconds = 0;
      const frequency = nextState === 'alert' ? 510 : nextState === 'chase' ? 260 : 340;
      this.playTone(frequency, 0.09, 0.035);
      this.emitInteraction(`Guardião Ossário · ${enemyStateLabel(nextState).toLowerCase()}.`);
    }

    let target: THREE.Vector3 | null = null;
    let speed = 0;
    if (this.guardianStaggerSeconds > 0) {
      target = null;
      speed = 0;
    } else if (this.enemyState === 'patrol') {
      target = GUARDIAN_PATROL[this.enemyPatrolIndex];
      if (Math.hypot(target.x - current.x, target.z - current.z) <= 0.4) {
        this.enemyPatrolIndex = (this.enemyPatrolIndex + 1) % GUARDIAN_PATROL.length;
        target = GUARDIAN_PATROL[this.enemyPatrolIndex];
      }
      speed = 1.05;
    } else if (this.enemyState === 'chase' && this.enemyDistance > 1.35) {
      target = new THREE.Vector3(player.x, 0, player.z);
      speed = 1.8;
    } else if (this.enemyState === 'return') {
      target = GUARDIAN_HOME;
      speed = 1.35;
    }

    let travelled = 0;
    if (target && delta > 0) {
      const baseStep = enemyStepToward(current, target, speed * delta);
      const baseAngle = Math.atan2(baseStep.z, baseStep.x);
      let best = current;
      let bestScore = Number.POSITIVE_INFINITY;
      for (const angleOffset of [0, 0.5, -0.5, 0.95, -0.95]) {
        const stepLength = Math.hypot(baseStep.x, baseStep.z);
        const step = {
          x: Math.cos(baseAngle + angleOffset) * stepLength,
          z: Math.sin(baseAngle + angleOffset) * stepLength,
        };
        const candidate = resolveMovement(current, step, GUARDIAN_RADIUS, this.activeColliders(false), ROOM_BOUNDS);
        const progressScore = Math.hypot(target.x - candidate.x, target.z - candidate.z) + Math.abs(angleOffset) * 0.015;
        if (progressScore < bestScore) {
          best = candidate;
          bestScore = progressScore;
        }
      }
      travelled = Math.hypot(best.x - current.x, best.z - current.z);
      this.guardian.position.set(best.x, 0, best.z);
      if (travelled > 1e-4) {
        const desiredYaw = Math.atan2(best.x - current.x, best.z - current.z);
        const yawDelta = Math.atan2(
          Math.sin(desiredYaw - this.guardian.rotation.y),
          Math.cos(desiredYaw - this.guardian.rotation.y),
        );
        this.guardian.rotation.y += yawDelta * (1 - Math.exp(-8 * delta));
      }
    }

    if (travelled > 1e-4) this.enemyTravelSeconds += travelled * 3.4;
    const stride = travelled > 1e-4 ? Math.sin(this.enemyTravelSeconds * 4.2) * 0.48 : 0;
    const animationBlend = 1 - Math.exp(-10 * delta);
    this.guardianLeftLeg.rotation.x += (stride - this.guardianLeftLeg.rotation.x) * animationBlend;
    this.guardianRightLeg.rotation.x += (-stride - this.guardianRightLeg.rotation.x) * animationBlend;
    this.guardianLeftArm.rotation.x += (-stride * 0.72 - this.guardianLeftArm.rotation.x) * animationBlend;
    this.guardianRightArm.rotation.x += (stride * 0.72 - this.guardianRightArm.rotation.x) * animationBlend;
    const alertLean = this.enemyState === 'alert' ? 0.08 : this.enemyState === 'chase' ? 0.05 : 0;
    this.guardianBody.rotation.x += (alertLean - this.guardianBody.rotation.x) * animationBlend;
    const hitLean = this.guardianStaggerSeconds > 0 ? -0.2 : 0;
    this.guardianBody.rotation.z += (hitLean - this.guardianBody.rotation.z) * animationBlend;
    this.guardianBody.position.y = Math.sin(this.animationSeconds * (travelled > 0 ? 8 : 2.1)) * (travelled > 0 ? 0.025 : 0.012);

    const stateColor = {
      idle: 0x6de7bf,
      patrol: 0x6db8e7,
      alert: 0xffc15c,
      chase: 0xff5b55,
      return: 0xa98ee8,
    }[this.enemyState];
    this.guardianStateMaterial.color.setHex(stateColor);
    this.guardianStateMaterial.opacity = this.enemyState === 'alert' ? 0.95 : 0.7;
  }

  private enemyAttackDuration(phase: EnemyAttackPhase) {
    if (phase === 'windup') return ENEMY_WINDUP_SECONDS;
    if (phase === 'swing') return ENEMY_SWING_SECONDS;
    if (phase === 'recover') return ENEMY_RECOVER_SECONDS;
    return 0;
  }

  private enterEnemyAttackPhase(phase: EnemyAttackPhase) {
    this.enemyAttackPhase = phase;
    this.enemyAttackSeconds = this.enemyAttackDuration(phase);
    if (phase === 'windup') {
      this.enemyAttackResolved = false;
      this.enemyWeaponTipReady = false;
      this.playTone(175, 0.12, 0.035);
      this.emitInteraction('Guardião preparando golpe · recue ou levante o escudo.');
    } else if (phase === 'swing') {
      this.enemyWeaponTipReady = false;
      this.playTone(105, 0.1, 0.055);
    }
  }

  private updateGuardianAttack(delta: number) {
    const canAttack = !this.guardianVitals.defeated
      && this.guardianStaggerSeconds <= 0
      && this.enemyState === 'chase'
      && this.enemyDistance <= ENEMY_ATTACK_RANGE;
    if (!canAttack) {
      if (this.enemyAttackPhase !== 'ready') this.enemyAttackPhase = nextEnemyAttackPhase(this.enemyAttackPhase, false, false);
      this.enemyAttackSeconds = 0;
      this.enemyAttackResolved = false;
      this.enemyWeaponTipReady = false;
      const resetBlend = 1 - Math.exp(-12 * delta);
      this.guardianRightArm.rotation.z += (0 - this.guardianRightArm.rotation.z) * resetBlend;
      this.guardianBody.rotation.y += (0 - this.guardianBody.rotation.y) * resetBlend;
      return;
    }

    if (this.enemyAttackPhase === 'ready') this.enterEnemyAttackPhase('windup');
    this.enemyAttackSeconds = Math.max(0, this.enemyAttackSeconds - delta);
    const duration = this.enemyAttackDuration(this.enemyAttackPhase);
    const progress = duration > 0 ? 1 - this.enemyAttackSeconds / duration : 1;
    this.guardianRightArm.rotation.x = enemyAttackArmAngle(this.enemyAttackPhase, progress);
    this.guardianRightArm.rotation.z = enemyAttackArmInwardAngle(this.enemyAttackPhase, progress);
    this.guardianBody.rotation.y = enemyAttackBodyTwist(this.enemyAttackPhase, progress);

    if (this.enemyAttackPhase === 'swing') {
      this.guardian.updateMatrixWorld(true);
      this.guardianWeaponTip.getWorldPosition(this.enemyWeaponTipPosition);
      if (!this.enemyWeaponTipReady) {
        this.previousEnemyWeaponTipPosition.copy(this.enemyWeaponTipPosition);
        this.enemyWeaponTipReady = true;
      } else if (!this.enemyAttackResolved) {
        const shield = this.items.get('shield')!;
        const shieldHolder = shield.state.holder;
        let blocked = false;
        if (shieldHolder) {
          shield.object.updateMatrixWorld(true);
          shield.object.getWorldPosition(this.enemyShieldCenter);
          shield.object.getWorldQuaternion(this.enemyShieldQuaternion);
          this.enemyShieldNormal.set(0, 0, 1).applyQuaternion(this.enemyShieldQuaternion).normalize();
          blocked = directionalShieldBlock({
            attackPrevious: this.previousEnemyWeaponTipPosition,
            attackCurrent: this.enemyWeaponTipPosition,
            shieldCenter: this.enemyShieldCenter,
            shieldNormal: this.enemyShieldNormal,
            shieldRadius: 0.46,
            minimumFacingDot: 0.32,
          });
        }

        if (canResolveEnemyAttack(this.enemyAttackResolved, blocked)) {
          this.enemyAttackResolved = true;
          this.enemyBlockedAttacks += 1;
          this.playTone(230, 0.06, 0.08);
          this.playTone(790, 0.14, 0.065, 0.035);
          if (shieldHolder) this.pulseController(shieldHolder, 0.82, 125);
          this.emitInteraction(`Maça bloqueada pelo escudo · ${this.enemyBlockedAttacks} defesa${this.enemyBlockedAttacks === 1 ? '' : 's'} contra o Guardião.`);
          this.enterEnemyAttackPhase('recover');
          return;
        }

        this.camera.getWorldPosition(this.enemyPlayerTarget);
        this.enemyPlayerTarget.y -= 0.34;
        const hitPlayer = sweptSphereHit(
          this.previousEnemyWeaponTipPosition,
          this.enemyWeaponTipPosition,
          this.enemyPlayerTarget,
          0.43,
        );
        if (canResolveEnemyAttack(this.enemyAttackResolved, hitPlayer)) {
          this.enemyAttackResolved = true;
          this.enemyHits += 1;
          this.health = applyNonLethalHazard(this.health);
          this.playTone(118, 0.19, 0.085);
          this.pulseControllers(0.62, 105);
          this.emitInteraction(`Golpe da maça recebido · vida ${this.health}/${MAX_HEALTH}. O treino não pode matar.`);
          this.enterEnemyAttackPhase('recover');
          return;
        }
        this.previousEnemyWeaponTipPosition.copy(this.enemyWeaponTipPosition);
      }
    }

    if (this.enemyAttackSeconds > 0) return;
    const nextPhase = nextEnemyAttackPhase(this.enemyAttackPhase, true, canAttack);
    this.enterEnemyAttackPhase(nextPhase);
  }

  private updateAdventureObject(delta: number, nowSeconds: number) {
    this.updateSecondaryItem(this.items.get('key')!, delta, nowSeconds);
    this.updateSecondaryItem(this.items.get('potion')!, delta, nowSeconds);
    this.updateSecondaryItem(this.items.get('sword')!, delta, nowSeconds);
    this.updateSecondaryItem(this.items.get('shield')!, delta, nowSeconds);
    this.updateSecondaryItem(this.items.get('bow')!, delta, nowSeconds);
    this.updateSecondaryItem(this.items.get('rune')!, delta, nowSeconds);
    this.updateBowMechanics(delta);
    this.updateArrows(delta);
    this.updateTrainingCombat(delta);
    this.updateShieldTraining(delta);
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
    if (item.id === 'rune' && !this.guardianVitals.rewardDropped) {
      item.object.visible = false;
      item.velocity.set(0, 0, 0);
      item.sleeping = true;
      return;
    }
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
      const holderRotation = this.holderWorldRotation(holder);
      const gripOffset = this.gripRotationOffsets.get(holder);
      let targetRotation = item.id === 'shield' && holderRotation
        ? heldShieldRotation(holderRotation, holder)
        : holderRotation && gripOffset
          ? heldObjectRotation(holderRotation, gripOffset)
          : item.object.quaternion.clone();
      if (item.id === 'sword' && item.secondaryHolder) {
        targetRotation = this.twoHandedSwordRotation(item, targetRotation);
      }
      const heldPosition = this.heldObjectPosition(holder, item, targetRotation);
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
    if (item.id === 'rune' && !item.state.holder && item.state.storedSlot === null && item.sleeping) {
      item.object.rotation.y += delta * 0.9;
      item.object.position.y = item.radius + 0.06 + Math.sin(this.animationSeconds * 2.2) * 0.035;
    }
    item.material.emissiveIntensity = this.itemCanBeGrabbed(item) ? 2.8 : 1.15;
  }

  private updateBowString(drawDistance: number) {
    const positions = this.bowString.geometry.getAttribute('position');
    positions.setXYZ(0, 0, 0.7, 0);
    positions.setXYZ(1, 0, 0, drawDistance);
    positions.setXYZ(2, 0, -0.7, 0);
    positions.needsUpdate = true;
    this.bowString.geometry.computeBoundingSphere();
  }

  private updateBowMechanics(delta: number) {
    const draw = this.bowDraw;
    if (!draw) {
      this.bowPower = 0;
      this.updateBowString(0);
      return;
    }
    const bow = this.items.get('bow')!;
    if (bow.state.holder !== draw.bowHolder || bow.state.storedSlot !== null) {
      this.cancelBowDraw();
      return;
    }

    if (draw.drawHolder === 'desktop') {
      draw.drawDistance = Math.min(BOW_MAX_DRAW_METERS, draw.drawDistance + delta * 0.62);
    } else {
      const controller = this.controllers.get(draw.drawHolder);
      if (!controller) {
        this.cancelBowDraw();
        return;
      }
      controller.getWorldPosition(this.bowLocalHand);
      bow.object.worldToLocal(this.bowLocalHand);
      draw.drawDistance = bowDrawDistance(this.bowLocalHand);
    }

    const power = bowDrawPower(draw.drawDistance);
    this.bowPower = power;
    this.updateBowString(draw.drawDistance);
    bow.object.updateMatrixWorld(true);
    draw.arrow.object.position.copy(bow.object.localToWorld(this.arrowDirection.set(0, 0, draw.drawDistance)));
    draw.arrow.object.quaternion.copy(bow.object.getWorldQuaternion(this.worldQuaternion));
    draw.arrow.object.visible = true;
    draw.arrow.drawDistance = draw.drawDistance;

    const hapticStep = bowHapticStep(power);
    if (hapticStep > draw.lastHapticStep) {
      draw.lastHapticStep = hapticStep;
      const intensity = 0.16 + power * 0.34;
      this.pulseController(draw.bowHolder, intensity, 24 + hapticStep * 5);
      this.pulseController(draw.drawHolder, intensity, 24 + hapticStep * 5);
      this.playTone(180 + power * 160, 0.035, 0.018);
    }
    this.emitInteraction(`Arco tensionado · ${Math.round(power * 100)}% de potência.`);
  }

  private updateArrows(delta: number) {
    for (const arrow of this.arrows) {
      if (arrow.state === 'ready' || arrow.state === 'nocked') continue;
      arrow.lifeSeconds += delta;
      if (arrow.state === 'stuck') {
        if (arrow.lifeSeconds >= 3.2) this.resetArrow(arrow);
        continue;
      }

      const step = arrowFlightStep(arrow.object.position, arrow.velocity, delta);
      arrow.object.position.set(step.position.x, step.position.y, step.position.z);
      arrow.velocity.set(step.velocity.x, step.velocity.y, step.velocity.z);
      if (arrow.velocity.lengthSq() > 0.001) {
        this.arrowDirection.copy(arrow.velocity).normalize();
        arrow.object.quaternion.setFromUnitVectors(ARROW_LOCAL_FORWARD, this.arrowDirection);
      }
      arrow.object.updateMatrixWorld(true);
      this.arrowTip.set(0, 0, -ARROW_TIP_OFFSET);
      arrow.object.localToWorld(this.arrowTip);

      const damaging = canArrowDealDamage(arrow.drawDistance);
      if (sweptSphereHit(
        arrow.previousTip,
        this.arrowTip,
        { x: DUMMY_POSITION.x, y: DUMMY_POSITION.y + 0.16, z: DUMMY_POSITION.z },
        0.5,
      )) {
        if (damaging) this.registerDummyHit(arrow.shooter ?? 'desktop');
        else this.emitInteraction('A flecha atingiu o boneco sem potência suficiente para causar impacto.');
        this.stickArrow(arrow);
        continue;
      }
      if (!this.guardianVitals.defeated && sweptSphereHit(
        arrow.previousTip,
        this.arrowTip,
        { x: this.guardian.position.x, y: 1.28, z: this.guardian.position.z },
        0.62,
      )) {
        if (damaging) this.registerGuardianHit(arrow.shooter ?? 'desktop');
        else this.emitInteraction('A flecha fraca ricocheteou na armadura do Guardião.');
        this.stickArrow(arrow);
        continue;
      }
      if (sweptSphereHit(arrow.previousTip, this.arrowTip, TARGET_POSITION, TARGET_RADIUS)) {
        if (damaging) {
          this.targetHits += 1;
          this.targetPulseSeconds = 1;
          this.playTone(760, 0.14, 0.075);
          this.emitInteraction(`Alvo atingido por flecha · potência ${Math.round(bowDrawPower(arrow.drawDistance) * 100)}%.`);
        }
        this.stickArrow(arrow);
        continue;
      }

      if (
        this.arrowTip.y <= 0.035
        || this.arrowTip.y >= 4.4
        || this.arrowTip.x <= ROOM_BOUNDS.minX
        || this.arrowTip.x >= ROOM_BOUNDS.maxX
        || this.arrowTip.z <= ROOM_BOUNDS.minZ
        || this.arrowTip.z >= ROOM_BOUNDS.maxZ
      ) {
        this.stickArrow(arrow);
        continue;
      }
      if (arrow.lifeSeconds >= 6) {
        this.resetArrow(arrow);
        continue;
      }
      arrow.previousTip.copy(this.arrowTip);
    }
  }

  private stickArrow(arrow: ArrowRuntime) {
    arrow.state = 'stuck';
    arrow.lifeSeconds = 0;
    arrow.velocity.set(0, 0, 0);
  }

  private resetArrow(arrow: ArrowRuntime) {
    arrow.state = 'ready';
    arrow.lifeSeconds = 0;
    arrow.drawDistance = 0;
    arrow.shooter = null;
    arrow.velocity.set(0, 0, 0);
    arrow.object.visible = false;
  }

  private cancelBowDraw() {
    if (this.bowDraw) this.resetArrow(this.bowDraw.arrow);
    this.bowDraw = null;
    this.bowPower = 0;
    this.updateBowString(0);
  }

  private finishBowDraw(holder: Holder) {
    const draw = this.bowDraw;
    if (!draw || draw.drawHolder !== holder) return false;
    if (draw.drawDistance < 0.035) {
      this.cancelBowDraw();
      this.emitInteraction('Corda solta sem abertura suficiente para disparar.');
      return true;
    }
    const bow = this.items.get('bow')!;
    bow.object.updateMatrixWorld(true);
    const direction = this.arrowDirection.copy(ARROW_LOCAL_FORWARD)
      .applyQuaternion(bow.object.getWorldQuaternion(this.worldQuaternion))
      .normalize();
    const speed = arrowLaunchSpeed(draw.drawDistance);
    const arrow = draw.arrow;
    arrow.state = 'flying';
    arrow.lifeSeconds = 0;
    arrow.drawDistance = draw.drawDistance;
    arrow.shooter = draw.bowHolder;
    arrow.velocity.copy(direction.multiplyScalar(speed));
    arrow.object.updateMatrixWorld(true);
    arrow.previousTip.set(0, 0, -ARROW_TIP_OFFSET);
    arrow.object.localToWorld(arrow.previousTip);
    this.arrowsFired += 1;
    const power = bowDrawPower(draw.drawDistance);
    this.bowDraw = null;
    this.bowPower = 0;
    this.updateBowString(0);
    this.playTone(150 + power * 120, 0.08, 0.055);
    this.playTone(480 + power * 260, 0.055, 0.035, 0.025);
    this.pulseController(draw.bowHolder, 0.26 + power * 0.42, 46 + power * 48);
    this.pulseController(draw.drawHolder, 0.2 + power * 0.36, 38 + power * 42);
    this.emitInteraction(`Flecha disparada · ${Math.round(power * 100)}% de potência · ${speed.toFixed(1)} m/s.`);
    return true;
  }

  private updateTrainingCombat(delta: number) {
    this.dummyHitCooldown = Math.max(0, this.dummyHitCooldown - delta);
    this.dummyHitPulse = Math.max(0, this.dummyHitPulse - delta);
    const targetRotation = this.dummyHitPulse > 0 ? -0.12 : 0;
    this.trainingDummy.rotation.z += (targetRotation - this.trainingDummy.rotation.z) * (1 - Math.exp(-10 * delta));
    this.dummyMaterial.emissive.setHex(this.dummyHitPulse > 0 ? 0xb53122 : 0x1a0c06);
    this.dummyMaterial.emissiveIntensity = this.dummyHitPulse > 0 ? 2.8 : 0.25;

    const sword = this.items.get('sword')!;
    if (!this.renderer.xr.isPresenting || !sword.state.holder || this.pullAnimation?.itemId === 'sword') {
      this.swordTipReady = false;
      return;
    }
    sword.object.updateMatrixWorld(true);
    this.swordTip.set(0, 0, -1.03);
    sword.object.localToWorld(this.swordTip);
    const deliberateSwing = this.swordTipReady
      && isDeliberateSwing(this.previousSwordTip, this.swordTip, delta);
    if (deliberateSwing && !this.guardianVitals.defeated && this.guardianHitCooldown <= 0) {
      const hitGuardian = sweptSphereHit(
        this.previousSwordTip,
        this.swordTip,
        { x: this.guardian.position.x, y: 1.28, z: this.guardian.position.z },
        0.62,
      );
      if (hitGuardian) this.registerGuardianHit(sword.state.holder);
    }
    if (
      deliberateSwing
      && this.dummyHitCooldown <= 0
      && sweptSphereHit(
        this.previousSwordTip,
        this.swordTip,
        { x: DUMMY_POSITION.x, y: DUMMY_POSITION.y + 0.16, z: DUMMY_POSITION.z },
        0.48,
      )
    ) {
      this.registerDummyHit(sword.state.holder);
    }
    this.previousSwordTip.copy(this.swordTip);
    this.swordTipReady = true;
  }

  private registerDummyHit(holder: Holder) {
    if (this.dummyHitCooldown > 0) return;
    this.dummyHits = registerTrainingHit(this.dummyHits);
    this.dummyHitCooldown = 0.32;
    this.dummyHitPulse = 0.24;
    this.playTone(280 + (this.dummyHits % 4) * 55, 0.11, 0.065);
    this.pulseController(holder, 0.42, 68);
    if (holder !== 'desktop') {
      const sword = this.items.get('sword');
      if (sword?.secondaryHolder) this.pulseController(sword.secondaryHolder, 0.24, 48);
    }
    this.emitInteraction(`Golpe válido ${this.dummyHits} · o boneco de treino é imortal.`);
  }

  private registerGuardianHit(holder: Holder) {
    if (this.guardianHitCooldown > 0 || this.guardianVitals.defeated) return;
    const previous = this.guardianVitals;
    this.guardianVitals = damageGuardian(this.guardianVitals);
    if (this.guardianVitals === previous) return;
    this.guardianHitCooldown = 0.38;
    this.guardianHitPulse = 0.24;
    this.guardianStaggerSeconds = this.guardianVitals.defeated ? 0 : 0.52;
    this.enemyAttackPhase = 'ready';
    this.enemyAttackSeconds = 0;
    this.enemyAttackResolved = false;
    this.enemyWeaponTipReady = false;
    this.playTone(this.guardianVitals.defeated ? 105 : 315, this.guardianVitals.defeated ? 0.42 : 0.12, 0.085);
    this.pulseController(holder, this.guardianVitals.defeated ? 0.9 : 0.58, this.guardianVitals.defeated ? 155 : 82);
    if (holder !== 'desktop') {
      const sword = this.items.get('sword');
      if (sword?.secondaryHolder) this.pulseController(sword.secondaryHolder, 0.32, 62);
    }
    if (this.guardianVitals.defeated) {
      this.dropGuardianReward();
      this.emitInteraction('Guardião derrotado · a Runa da Memória foi libertada. Recolha-a.');
      return;
    }
    this.emitInteraction(`Guardião atingido · vida ${this.guardianVitals.health}/${GUARDIAN_MAXIMUM_HEALTH}.`);
  }

  private dropGuardianReward() {
    const reward = this.items.get('rune')!;
    reward.state = { ...INITIAL_OBJECT_STATE };
    reward.lastStoredSlot = null;
    reward.object.visible = true;
    reward.object.scale.setScalar(reward.worldScale);
    reward.object.position.set(this.guardian.position.x, 0.72, this.guardian.position.z);
    reward.object.rotation.set(0, 0, 0);
    reward.velocity.set(0, 1.65, 0);
    reward.sleeping = false;
    this.playTone(470, 0.15, 0.055, 0.18);
    this.playTone(760, 0.28, 0.05, 0.3);
  }

  private beginShieldAttack() {
    this.camera.getWorldPosition(this.shieldAttackTarget);
    this.camera.getWorldQuaternion(this.worldQuaternion);
    const forward = this.slotPosition.set(0, 0, -1).applyQuaternion(this.worldQuaternion).normalize();
    this.shieldAttackTarget.y -= 0.28;
    this.shieldAttackOrigin.copy(this.shieldAttackTarget).addScaledVector(forward, 3.1);
    this.trainingBolt.position.copy(this.shieldAttackOrigin);
    this.previousTrainingBoltPosition.copy(this.shieldAttackOrigin);
    this.trainingBolt.visible = true;
    this.trainingBoltMaterial.emissive.setHex(0xe34a24);
    this.shieldAttackPhase = 'telegraph';
    this.shieldAttackTimer = 1.05;
    this.playTone(190, 0.18, 0.035);
    this.emitInteraction('Ataque anunciado · erga e oriente a face do escudo para o projétil.');
  }

  private finishShieldAttack(blocked: boolean, holder: Holder) {
    this.trainingBolt.visible = false;
    this.shieldAttackPhase = 'cooldown';
    this.shieldAttackTimer = blocked ? 0.9 : 1.25;
    if (blocked) {
      this.blockedAttacks += 1;
      this.trainingBoltMaterial.emissive.setHex(0x35d9ae);
      this.playTone(240, 0.06, 0.07);
      this.playTone(760, 0.13, 0.06, 0.035);
      this.pulseController(holder, 0.72, 115);
      this.emitInteraction(`Bloqueio direcional ${this.blockedAttacks} · face e área do escudo válidas.`);
      return;
    }
    this.receivedAttacks += 1;
    this.health = applyNonLethalHazard(this.health);
    this.trainingBoltMaterial.emissive.setHex(0xe34a24);
    this.playTone(120, 0.18, 0.08);
    this.pulseControllers(0.5, 95);
    this.emitInteraction(`Golpe não bloqueado · vida ${this.health}/${MAX_HEALTH}. Vire a face do escudo para o ataque.`);
  }

  private updateShieldTraining(delta: number) {
    const shield = this.items.get('shield')!;
    const holder = shield.state.holder;
    if (!holder || this.enemyState === 'alert' || this.enemyState === 'chase') {
      this.trainingBolt.visible = false;
      this.shieldAttackPhase = 'waiting';
      this.shieldAttackTimer = 0;
      return;
    }

    if (this.shieldAttackPhase === 'waiting') {
      this.beginShieldAttack();
      return;
    }

    this.shieldAttackTimer = Math.max(0, this.shieldAttackTimer - delta);
    if (this.shieldAttackPhase === 'telegraph') {
      const pulse = 0.82 + Math.sin(this.animationSeconds * 18) * 0.18;
      this.trainingBolt.scale.setScalar(pulse);
      this.trainingBoltMaterial.emissiveIntensity = 3.6 + pulse * 2.2;
      if (this.shieldAttackTimer <= 0) {
        this.shieldAttackPhase = 'flight';
        this.shieldAttackTimer = 0.82;
        this.trainingBolt.scale.setScalar(1);
      }
      return;
    }

    if (this.shieldAttackPhase === 'cooldown') {
      if (this.shieldAttackTimer <= 0) this.beginShieldAttack();
      return;
    }

    this.previousTrainingBoltPosition.copy(this.trainingBolt.position);
    const progress = 1 - this.shieldAttackTimer / 0.82;
    this.trainingBolt.position.lerpVectors(this.shieldAttackOrigin, this.shieldAttackTarget, THREE.MathUtils.clamp(progress, 0, 1));
    this.trainingBolt.rotation.x += delta * 11;
    this.trainingBolt.rotation.y += delta * 8;

    shield.object.updateMatrixWorld(true);
    shield.object.getWorldPosition(this.worldPosition);
    shield.object.getWorldQuaternion(this.worldQuaternion);
    const normal = this.handPosition.set(0, 0, 1).applyQuaternion(this.worldQuaternion).normalize();
    if (directionalShieldBlock({
      attackPrevious: this.previousTrainingBoltPosition,
      attackCurrent: this.trainingBolt.position,
      shieldCenter: this.worldPosition,
      shieldNormal: normal,
      shieldRadius: 0.46,
    })) {
      this.finishShieldAttack(true, holder);
      return;
    }
    if (this.shieldAttackTimer <= 0) this.finishShieldAttack(false, holder);
  }

  private desktopSwordStrike() {
    const sword = this.itemForHolder('desktop');
    if (sword?.id !== 'sword') {
      this.emitInteraction('Segure a espada e pressione J para atacar.');
      return;
    }
    const player = this.getPlayerWorldPosition();
    const guardianDistance = Math.hypot(
      player.x - this.guardian.position.x,
      player.z - this.guardian.position.z,
    );
    if (!this.guardianVitals.defeated && guardianDistance <= 2.35) {
      this.registerGuardianHit('desktop');
      return;
    }
    const dummyDistance = Math.hypot(player.x - DUMMY_POSITION.x, player.z - DUMMY_POSITION.z);
    if (dummyDistance <= 2.35) {
      this.registerDummyHit('desktop');
      return;
    }
    this.emitInteraction('Aproxime-se do Guardião ou do boneco para alcançar com a espada.');
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
    this.vrPointerLines.forEach((pointer) => { pointer.visible = true; });
    this.playTone(420, 0.08, 0.045);
    this.pulseController('left', 0.24, 45);
    this.emitInteraction('Menu de pausa VR aberto. Use o analógico esquerdo e o gatilho.');
  }

  private closeVrPauseMenu() {
    if (!this.vrPauseMenuOpen && !this.vrPausePanel?.visible) return;
    this.vrPauseMenuOpen = false;
    if (this.vrPausePanel) this.vrPausePanel.visible = false;
    this.vrPointerLines.forEach((pointer) => { pointer.visible = false; });
    this.vrPointerCursors.forEach((cursor) => { cursor.visible = false; });
    this.vrPointerTargets.forEach((_, holder) => { this.vrPointerTargets.set(holder, null); });
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
    this.updateVrPausePointers();
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

  private vrPauseMenuIndexFromUv(uv: THREE.Vector2) {
    const x = uv.x * 1024;
    const y = (1 - uv.y) * 720;
    if (x < 58 || x > 966) return null;
    for (let index = 0; index < VR_PAUSE_MENU_ITEM_COUNT; index += 1) {
      const top = 190 + index * 57;
      if (y >= top && y <= top + 45) return index;
    }
    return null;
  }

  private updateVrPausePointers() {
    this.scene.updateMatrixWorld(true);
    const panelRotation = this.vrPausePanel.getWorldQuaternion(new THREE.Quaternion());
    for (const holder of ['left', 'right'] as const) {
      const controller = this.controllers.get(holder);
      const pointer = this.vrPointerLines.get(holder);
      const cursor = this.vrPointerCursors.get(holder);
      if (!controller || !pointer || !cursor) continue;
      pointer.visible = true;
      this.raycaster.setFromXRController(controller);
      const hit = this.raycaster.intersectObject(this.vrPausePanel, false)[0];
      if (!hit) {
        pointer.scale.z = 1.4;
        cursor.visible = false;
        this.vrPointerTargets.set(holder, null);
        continue;
      }
      pointer.scale.z = Math.max(0.08, hit.distance);
      cursor.visible = true;
      cursor.position.copy(hit.point);
      cursor.quaternion.copy(panelRotation);
      const target = hit.uv ? this.vrPauseMenuIndexFromUv(hit.uv) : null;
      this.vrPointerTargets.set(holder, target);
      if (target !== null && target !== this.vrPauseMenuIndex) {
        this.vrPauseMenuIndex = target;
        this.drawVrPauseMenu();
        this.pulseController(holder, 0.06, 16);
      }
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

  private activateVrPauseMenuItem(target?: number | null) {
    if (target !== undefined && target !== null) this.vrPauseMenuIndex = target;
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
    context.setTransform(2, 0, 0, 2, 0, 0);
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
        stored?.id === 'key' ? 0xffbd55
          : stored?.id === 'potion' ? 0xff6f9f
            : stored?.id === 'sword' ? 0xbfe1dc
              : stored?.id === 'bow' ? 0xd5a86a
              : stored?.id === 'rune' ? 0x8fffe0
              : stored ? 0x73e4ca : 0x51e6b8,
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
    return Array.from(this.items.values())
      .find((item) => item.state.holder === holder || item.secondaryHolder === holder) ?? null;
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
    if (this.finishBowDraw(holder)) return;
    const item = this.itemForHolder(holder);
    if (!item) return;
    if (item.id === 'sword' && item.secondaryHolder === holder) {
      item.secondaryHolder = null;
      this.swordGripAnchors.delete(holder);
      this.poseHistory.set(holder, []);
      this.pulseController(holder, 0.12, 28);
      this.emitInteraction('Segunda mão solta · a espada continua livre na mão principal.');
      return;
    }
    if (item.id === 'sword' && item.state.holder === holder && item.secondaryHolder) {
      this.promoteSecondarySwordGrip(item, holder);
      return;
    }
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
    item.secondaryHolder = null;
    item.lastStoredSlot = slot;
    item.sleeping = true;
    item.velocity.set(0, 0, 0);
    if (item.id === 'bow') this.cancelBowDraw();
    this.poseHistory.set(holder, []);
    this.gripRotationOffsets.delete(holder);
    if (item.id === 'sword') this.swordGripAnchors.clear();
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
    this.captureGripRotation(holder, item, true);
    item.state = retrieved;
    item.secondaryHolder = null;
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

  private heldObjectPosition(holder: Holder, item = this.cube, objectRotation?: THREE.Quaternion) {
    if (item.id === 'shield' && objectRotation) {
      const source = holder === 'desktop' ? this.camera : this.controllers.get(holder);
      if (!source) return item.object.position.clone();
      const controllerPosition = source.getWorldPosition(new THREE.Vector3());
      const controllerRotation = source.getWorldQuaternion(new THREE.Quaternion());
      return heldShieldPosition(controllerPosition, controllerRotation, objectRotation);
    }
    let gripPosition: THREE.Vector3;
    if (holder === 'desktop') {
      this.camera.getWorldPosition(this.worldPosition);
      this.camera.getWorldQuaternion(this.worldQuaternion);
      gripPosition = new THREE.Vector3(0, -0.18, -0.82)
        .applyQuaternion(this.worldQuaternion)
        .add(this.worldPosition);
    } else {
      const controller = this.controllers.get(holder);
      if (!controller) return item.object.position.clone();
      controller.getWorldPosition(this.worldPosition);
      controller.getWorldQuaternion(this.worldQuaternion);
      gripPosition = new THREE.Vector3(0, 0, item.id === 'sword' ? -0.045 : item.id === 'bow' ? -0.06 : -0.1)
        .applyQuaternion(this.worldQuaternion)
        .add(this.worldPosition);
    }
    if (item.id !== 'sword' || !objectRotation) return gripPosition;
    const anchor = this.swordGripAnchors.get(holder) ?? new THREE.Vector3(0, 0, 0.02);
    return gripPosition.sub(anchor.clone().applyQuaternion(objectRotation));
  }

  private swordAnchorForController(holder: 'left' | 'right', item: ItemRuntime) {
    const controller = this.controllers.get(holder);
    if (!controller) return new THREE.Vector3(0, 0, 0.02);
    controller.getWorldPosition(this.handPosition);
    const localPoint = item.object.worldToLocal(this.handPosition.clone());
    const anchor = swordGripAnchor(localPoint);
    return new THREE.Vector3(anchor.x, anchor.y, anchor.z);
  }

  private tryAttachSecondarySwordGrip(holder: 'left' | 'right') {
    const sword = this.items.get('sword');
    const primary = sword?.state.holder;
    if (!sword || (primary !== 'left' && primary !== 'right') || primary === holder || sword.secondaryHolder) return false;
    this.scene.updateMatrixWorld(true);
    const candidate = this.swordAnchorForController(holder, sword);
    const anchorWorld = sword.object.localToWorld(candidate.clone());
    const controller = this.controllers.get(holder);
    if (!controller) return false;
    controller.getWorldPosition(this.handPosition);
    if (this.handPosition.distanceTo(anchorWorld) > 0.3) return false;
    const primaryAnchor = this.swordGripAnchors.get(primary) ?? new THREE.Vector3(0, 0, 0.02);
    const resolved = secondarySwordGripAnchor(primaryAnchor, candidate);
    sword.secondaryHolder = holder;
    this.swordGripAnchors.set(holder, new THREE.Vector3(resolved.x, resolved.y, resolved.z));
    this.poseHistory.set(holder, []);
    this.playTone(410, 0.065, 0.045);
    this.pulseControllers(0.2, 38);
    this.emitInteraction('Pegada de duas mãos ativa · mova as duas mãos para orientar a espada.');
    return true;
  }

  private promoteSecondarySwordGrip(item: ItemRuntime, releasedHolder: 'left' | 'right') {
    const promoted = item.secondaryHolder;
    if (!promoted) return;
    item.state = { ...item.state, holder: promoted };
    item.secondaryHolder = null;
    this.swordGripAnchors.delete(releasedHolder);
    this.gripRotationOffsets.delete(releasedHolder);
    const controllerRotation = this.holderWorldRotation(promoted);
    if (controllerRotation) {
      const objectRotation = item.object.getWorldQuaternion(new THREE.Quaternion());
      this.gripRotationOffsets.set(promoted, captureGripRotationOffset(controllerRotation, objectRotation));
    }
    this.poseHistory.set(releasedHolder, []);
    this.poseHistory.set(promoted, []);
    this.pulseController(promoted, 0.24, 42);
    this.emitInteraction(`Handoff concluído · a mão ${promoted} assumiu a espada sem queda.`);
  }

  private twoHandedSwordRotation(item: ItemRuntime, baseRotation: THREE.Quaternion) {
    const primary = item.state.holder;
    const secondary = item.secondaryHolder;
    if ((primary !== 'left' && primary !== 'right') || !secondary) return baseRotation;
    const primaryController = this.controllers.get(primary);
    const secondaryController = this.controllers.get(secondary);
    const primaryAnchor = this.swordGripAnchors.get(primary);
    const secondaryAnchor = this.swordGripAnchors.get(secondary);
    if (!primaryController || !secondaryController || !primaryAnchor || !secondaryAnchor) return baseRotation;
    primaryController.getWorldPosition(this.worldPosition);
    secondaryController.getWorldPosition(this.handPosition);
    const handDirection = this.handPosition.clone().sub(this.worldPosition);
    const localDirection = secondaryAnchor.clone().sub(primaryAnchor);
    if (handDirection.lengthSq() < 0.0025 || localDirection.lengthSq() < 0.0025) return baseRotation;
    handDirection.normalize();
    const currentDirection = localDirection.normalize().applyQuaternion(baseRotation);
    const correction = new THREE.Quaternion().setFromUnitVectors(currentDirection, handDirection);
    return correction.multiply(baseRotation).normalize();
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

  private startBowDraw(bowHolder: Holder, drawHolder: Holder) {
    if (this.bowDraw) return false;
    const arrow = this.arrows.find((candidate) => candidate.state === 'ready');
    if (!arrow) {
      this.emitInteraction('Todas as flechas ainda estão em voo ou cravadas.');
      return false;
    }
    arrow.state = 'nocked';
    arrow.lifeSeconds = 0;
    arrow.drawDistance = 0;
    arrow.shooter = bowHolder;
    arrow.object.visible = true;
    this.bowDraw = {
      bowHolder,
      drawHolder,
      arrow,
      drawDistance: 0,
      lastHapticStep: 0,
    };
    this.playTone(350, 0.05, 0.035);
    this.pulseController(drawHolder, 0.2, 35);
    this.emitInteraction('Flecha encaixada · puxe a corda para trás e solte para disparar.');
    return true;
  }

  private tryStartControllerBowDraw(drawHolder: 'left' | 'right') {
    const bow = this.items.get('bow');
    const bowHolder = bow?.state.holder;
    if (!bow || (bowHolder !== 'left' && bowHolder !== 'right') || bowHolder === drawHolder || this.bowDraw) return false;
    if (this.pullAnimation?.itemId === 'bow') return false;
    const controller = this.controllers.get(drawHolder);
    if (!controller) return false;
    this.scene.updateMatrixWorld(true);
    controller.getWorldPosition(this.handPosition);
    const stringCenter = bow.object.localToWorld(new THREE.Vector3(0, 0, 0));
    if (this.handPosition.distanceTo(stringCenter) > BOW_STRING_GRAB_RADIUS) return false;
    return this.startBowDraw(bowHolder, drawHolder);
  }

  private tryStartDesktopBowDraw() {
    const bow = this.items.get('bow');
    if (bow?.state.holder !== 'desktop' || this.bowDraw) return false;
    return this.startBowDraw('desktop', 'desktop');
  }

  private tryControllerGrab(holder: 'left' | 'right') {
    if (this.vrPauseMenuOpen) {
      this.vrMenuSelectGuards.add(holder);
      this.activateVrPauseMenuItem(this.vrPointerTargets.get(holder));
      this.pulseController(holder, 0.18, 34);
      return;
    }
    if (this.comfort.oneHandMode && holder !== this.comfort.dominantHand) return;
    if (this.itemForHolder(holder)) return;
    if (this.tryAttachSecondarySwordGrip(holder)) return;
    if (this.tryStartControllerBowDraw(holder)) return;
    if (this.isControllerNearWaist(holder)) {
      this.toggleBagMenu(holder);
      return;
    }
    const nearestSlot = this.nearestBagSlot(holder);
    if (nearestSlot !== null && this.itemInSlot(nearestSlot)) {
      this.retrieveStoredObject(holder, nearestSlot);
      return;
    }
    const candidate = this.controllerGrabCandidate(holder);
    if (!candidate) {
      this.emitInteraction('Aponte a mão para um item e pressione o gatilho.');
      return;
    }
    this.claimHeldObject(holder, candidate.item, candidate.pullDistance);
  }

  private claimHeldObject(holder: Holder, item = this.cube, pullDistance?: number) {
    const pullFromPosition = item.object.position.clone();
    const pullFromRotation = item.object.quaternion.clone();
    this.captureGripRotation(holder, item, pullDistance !== undefined);
    item.state = claimObject(item.state, holder);
    item.secondaryHolder = null;
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
      ? item.id === 'bow'
        ? 'Arco em mãos · segure K para tensionar e solte K para disparar.'
        : `${item.label} em mãos · E solta, F arremessa.`
      : item.id === 'bow'
        ? `Arco na mão ${holder} · aproxime a outra mão da corda para encaixar uma flecha.`
        : `${item.label} na mão ${holder}.`);
  }

  private captureGripRotation(holder: Holder, item = this.cube, preferHandle = false) {
    this.scene.updateMatrixWorld(true);
    const holderRotation = this.holderWorldRotation(holder);
    if (holderRotation) {
      if (item.id === 'shield') {
        this.gripRotationOffsets.delete(holder);
        return;
      }
      if (item.id === 'bow') {
        this.gripRotationOffsets.set(holder, new THREE.Quaternion());
        return;
      }
      if (item.id === 'sword') {
        const useDefaultGrip = preferHandle || holder === 'desktop';
        const anchor = useDefaultGrip
          ? new THREE.Vector3(0, 0, 0.02)
          : this.swordAnchorForController(holder, item);
        this.swordGripAnchors.set(holder, anchor);
        if (useDefaultGrip) {
          this.gripRotationOffsets.set(holder, uprightSwordGripOffset());
          return;
        }
      }
      const objectRotation = item.object.getWorldQuaternion(new THREE.Quaternion());
      this.gripRotationOffsets.set(holder, captureGripRotationOffset(holderRotation, objectRotation));
    }
  }

  private releaseHeldObject(holder: Holder, throwObject: boolean, item = this.itemForHolder(holder)) {
    if (!item || item.state.holder !== holder) return;
    if (item.id === 'bow') this.cancelBowDraw();
    const wasPulling = this.pullAnimation?.holder === holder && this.pullAnimation.itemId === item.id;
    if (wasPulling) this.pullAnimation = null;
    const shouldThrow = throwObject && !wasPulling;
    const released = releaseObject(item.state, holder);
    if (released === item.state) return;
    item.state = released;
    item.secondaryHolder = null;
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
    if (item.id === 'sword') this.swordGripAnchors.clear();
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
    const sword = this.items.get('sword')!;
    const shield = this.items.get('shield')!;
    const bow = this.items.get('bow')!;
    const guardianReward = this.items.get('rune')!;
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
    this.resetItem(sword);
    this.resetItem(shield);
    this.resetItem(bow);
    this.resetItem(guardianReward);
    guardianReward.object.visible = false;
    this.keyInserted = false;
    this.potionConsumed = false;
    this.drinkProgress = 0;
    this.health = MAX_HEALTH;
    this.dummyHits = 0;
    this.dummyHitCooldown = 0;
    this.dummyHitPulse = 0;
    this.trainingDummy.rotation.set(0, 0, 0);
    this.swordTipReady = false;
    this.cancelBowDraw();
    this.arrows.forEach((arrow) => this.resetArrow(arrow));
    this.arrowsFired = 0;
    this.bowPower = 0;
    this.blockedAttacks = 0;
    this.receivedAttacks = 0;
    this.shieldAttackPhase = 'waiting';
    this.shieldAttackTimer = 0;
    this.trainingBolt.visible = false;
    this.trainingBolt.scale.setScalar(1);
    this.trainingBoltMaterial.emissive.setHex(0xe34a24);
    this.trainingBoltMaterial.emissiveIntensity = 3.6;
    this.enemyState = 'idle';
    this.enemyStateSeconds = 0;
    this.enemyPatrolIndex = 1;
    this.enemyDistance = Number.POSITIVE_INFINITY;
    this.enemyTravelSeconds = 0;
    this.enemyAttackPhase = 'ready';
    this.enemyAttackSeconds = 0;
    this.enemyAttackResolved = false;
    this.enemyWeaponTipReady = false;
    this.enemyBlockedAttacks = 0;
    this.enemyHits = 0;
    this.guardianVitals = initialGuardianVitals();
    this.guardianHitCooldown = 0;
    this.guardianStaggerSeconds = 0;
    this.guardianHitPulse = 0;
    this.guardianArmorMaterial.emissive.setHex(0x0b2422);
    this.guardianArmorMaterial.emissiveIntensity = 0.55;
    this.guardian.position.copy(GUARDIAN_HOME);
    this.guardian.rotation.set(0, 0, 0);
    this.guardianBody.position.set(0, 0, 0);
    this.guardianBody.rotation.set(0, 0, 0);
    this.guardianLeftArm.rotation.set(0, 0, 0);
    this.guardianRightArm.rotation.set(0, 0, 0);
    this.guardianLeftLeg.rotation.set(0, 0, 0);
    this.guardianRightLeg.rotation.set(0, 0, 0);
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
    this.swordGripAnchors.clear();
    this.pullAnimation = null;
    this.emitInteraction(status);
  }

  private resetItem(item: ItemRuntime) {
    item.state = { ...INITIAL_OBJECT_STATE };
    item.secondaryHolder = null;
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
    item.secondaryHolder = null;
    if (item.id === 'sword') this.swordGripAnchors.clear();
    if (item.id === 'bow') this.cancelBowDraw();
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
      dummyHits: this.dummyHits,
      arrowsFired: this.arrowsFired,
      bowDrawPower: this.bowPower,
      blockedAttacks: this.blockedAttacks,
      receivedAttacks: this.receivedAttacks,
      enemyState: this.enemyState,
      enemyDistance: Number.isFinite(this.enemyDistance) ? Math.round(this.enemyDistance * 10) / 10 : 0,
      enemyAttackPhase: this.enemyAttackPhase,
      enemyBlockedAttacks: this.enemyBlockedAttacks,
      enemyHits: this.enemyHits,
      guardianHealth: this.guardianVitals.health,
      guardianMaximumHealth: GUARDIAN_MAXIMUM_HEALTH,
      guardianDefeated: this.guardianVitals.defeated,
      guardianRewardStored: this.items.get('rune')!.state.storedSlot !== null,
      status,
    };
    const signature = JSON.stringify(snapshot);
    if (signature === this.lastInteractionSignature) return;
    this.lastInteractionSignature = signature;
    this.options.onInteraction?.(snapshot);
  }

  private contextualStatus(fallback: string) {
    const guardianReward = this.items.get('rune');
    if (guardianReward?.state.storedSlot !== null) return `Runa do Guardião guardada no slot ${guardianReward.state.storedSlot + 1} · encontro concluído.`;
    if (this.guardianVitals.defeated) return 'Guardião derrotado · recolha a Runa da Memória e guarde-a na bolsa.';
    if (this.guardianStaggerSeconds > 0) return `Guardião cambaleando · vida ${this.guardianVitals.health}/${GUARDIAN_MAXIMUM_HEALTH}.`;
    if (this.enemyAttackPhase === 'windup') return 'Guardião preparando golpe · recue ou levante a face do escudo.';
    if (this.enemyAttackPhase === 'swing') return 'Maça em movimento · saia do arco ou intercepte com o escudo.';
    if (this.enemyAttackPhase === 'recover') return 'Guardião se recuperando · o próximo ciclo ainda não começou.';
    const shield = this.items.get('shield');
    if (shield?.state.holder) return `Escudo em mãos · ${this.blockedAttacks} bloqueio${this.blockedAttacks === 1 ? '' : 's'} válido${this.blockedAttacks === 1 ? '' : 's'}. Oriente a face para o ataque.`;
    if (shield && shield.state.storedSlot !== null) return `Escudo guardado no slot ${shield.state.storedSlot + 1} · retire-o para treinar bloqueios.`;
    const bow = this.items.get('bow');
    if (this.bowDraw) return `Arco tensionado · ${Math.round(this.bowPower * 100)}% de potência.`;
    if (bow?.state.holder === 'desktop') return `Arco em mãos · segure K para tensionar e solte K para disparar.`;
    if (bow?.state.holder) return `Arco na mão ${bow.state.holder} · aproxime a outra mão da corda, segure e puxe para trás.`;
    if (bow && bow.state.storedSlot !== null) return `Arco guardado no slot ${bow.state.storedSlot + 1} · retire-o para disparar.`;
    const sword = this.items.get('sword');
    if (sword?.state.holder && !this.guardianVitals.defeated) return `Espada em mãos · Guardião com vida ${this.guardianVitals.health}/${GUARDIAN_MAXIMUM_HEALTH}.`;
    if (sword?.state.holder) return `Espada em mãos · ${this.dummyHits} golpe${this.dummyHits === 1 ? '' : 's'} válido${this.dummyHits === 1 ? '' : 's'} no boneco imortal.`;
    if (sword && sword.state.storedSlot !== null) return `Espada guardada no slot ${sword.state.storedSlot + 1} · retire-a para iniciar o treino.`;
    if (sword && !sword.state.holder) return 'Encontre a espada no suporte à esquerda e puxe-a para sua mão.';
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
      || (item.id === 'potion' && this.potionConsumed)
      || (item.id === 'rune' && !this.guardianVitals.rewardDropped)
    );
  }

  private controllerGrabDistance(holder: 'left' | 'right', item: ItemRuntime) {
    const controller = this.controllers.get(holder);
    if (!controller) return null;
    controller.getWorldPosition(this.handPosition);
    let directDistance = this.handPosition.distanceTo(item.object.position);
    if (item.id === 'sword') {
      this.scene.updateMatrixWorld(true);
      const anchor = this.swordAnchorForController(holder, item);
      directDistance = this.handPosition.distanceTo(item.object.localToWorld(anchor.clone()));
    }
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
