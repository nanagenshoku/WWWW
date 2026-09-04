import * as THREE from 'three';
import { SPELLS } from './spellData';
import { SpellId, EnemyType, FloatingText, GameStats, PlayerStatus, LevelInfo, RadarData, RadarBlip } from '../types';
import { sounds } from '../audio/SoundFX';
import { LevelGenerator, GeneratedLevel, PortalEntity, FountainEntity, TrainingDummyEntity, PillarObstacle } from './LevelGenerator';
import {
  createStoneFloorTexture,
  createRuneCircleTexture,
  createFireParticleTexture,
  createExplosiveBarrelTexture,
  createScorchTexture,
} from './textureUtils';

interface Projectile {
  id: string;
  mesh: THREE.Group;
  light: THREE.PointLight;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  spellId: SpellId;
  damage: number;
  splashRadius: number;
  powerMultiplier: number;
  hasGravity: boolean;
  gravityY: number;
  lifetime: number;
  maxLifetime: number;
  color: string;
}

interface Enemy {
  id: string;
  type: EnemyType;
  group: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  scoreValue: number;
  radius: number;
  isHit: boolean;
  hitTimer: number;
  attackCooldown: number;
  originalMaterials: THREE.Material[];
  animationTime: number;
  parts: {
    body?: THREE.Mesh;
    leftLeg?: THREE.Mesh;
    rightLeg?: THREE.Mesh;
    leftArm?: THREE.Mesh;
    rightArm?: THREE.Mesh;
    head?: THREE.Mesh;
    eyes?: THREE.Mesh[];
  };
}

interface DestructibleObject {
  id: string;
  type: 'barrel' | 'crystal';
  mesh: THREE.Group;
  position: THREE.Vector3;
  radius: number;
  hp: number;
}

interface Particle {
  mesh: THREE.Mesh | THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
  decayRate: number;
  color?: THREE.Color;
}

interface Shockwave {
  mesh: THREE.Mesh;
  currentRadius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

export class FireballEngine {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // View settings
  public isThirdPerson: boolean = false;
  private cameraDistance: number = 5.5;

  // Player state
  public playerPosition: THREE.Vector3 = new THREE.Vector3(0, 1.7, 0);
  public playerVelocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public playerRotation: { yaw: number; pitch: number } = { yaw: 0, pitch: 0 };
  public hp: number = 100;
  public maxHp: number = 100;
  public mana: number = 100;
  public maxMana: number = 100;
  public activeSpellId: SpellId = 'pyro_blast';
  public isCharging: boolean = false;
  public chargeStartTime: number = 0;
  public chargeProgress: number = 0;
  public lastShotTime: number = 0;
  public pyromaniaTimer: number = 0; // double damage buff

  // Stats & Scoring
  public score: number = 0;
  public highScore: number = 0;
  public wave: number = 1;
  public kills: number = 0;
  public totalDamage: number = 0;
  public shotsFired: number = 0;
  public shotsHit: number = 0;
  public combo: number = 0;
  public comboTimer: number = 0;
  public maxCombo: number = 0;
  public enemiesRemainingInWave: number = 0;
  public waveSpawningActive: boolean = false;
  public isGameOver: boolean = false;
  public isPaused: boolean = false;

  // Visual Entities
  private projectiles: Projectile[] = [];
  private enemies: Enemy[] = [];
  private destructibles: DestructibleObject[] = [];
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private torches: { light: THREE.PointLight; baseIntensity: number }[] = [];
  private staffGroup: THREE.Group | null = null;
  private staffGem: THREE.Mesh | null = null;
  private staffLight: THREE.PointLight | null = null;
  private runeCircle: THREE.Mesh | null = null;

  // Grimoire Book in Left Hand & Radar Canvas
  private bookGroup: THREE.Group | null = null;
  private bookLight: THREE.PointLight | null = null;
  private radarCanvas: HTMLCanvasElement | null = null;
  private radarCtx: CanvasRenderingContext2D | null = null;
  private radarTexture: THREE.CanvasTexture | null = null;
  private radarSweepAngle: number = 0;

  // Textures & Shared Geometries
  private fireParticleTexture: THREE.CanvasTexture;
  private scorchTexture: THREE.CanvasTexture;
  private sphereGeo: THREE.SphereGeometry;
  private particleMat: THREE.SpriteMaterial;

  // Screen shake
  private screenShakeIntensity: number = 0;

  // Input states
  public keys: Record<string, boolean> = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
  };
  public pointerLocked: boolean = false;
  private isPointerDown: boolean = false;

  // Level & Location State
  public currentLevelType: 'hub' | 'dungeon' = 'hub';
  public currentFloor: number = 0;
  public currentThemeName: string = 'Sanctuary of Embers';
  public floorCleared: boolean = false;
  public totalEnemiesInFloor: number = 0;
  public activePortalPrompt: string | null = null;
  public canEnterPortal: boolean = false;
  public nearbyPortal: PortalEntity | null = null;

  private currentLevelData: GeneratedLevel | null = null;
  private portals: PortalEntity[] = [];
  private fountains: FountainEntity[] = [];
  private trainingDummies: TrainingDummyEntity[] = [];
  private pillars: PillarObstacle[] = [];
  private fountainHealTimer: number = 0;
  private hemiLight: THREE.HemisphereLight | null = null;
  private moonLight: THREE.DirectionalLight | null = null;
  private sunGroup: THREE.Group | null = null;
  private sunCore: THREE.Mesh | null = null;
  private sunCorona: THREE.Mesh | null = null;
  private sunRays: THREE.Mesh | null = null;

  // Callbacks for UI updates
  public onStatusUpdate?: (status: PlayerStatus, stats: GameStats) => void;
  public onFloatingText?: (text: FloatingText) => void;
  public onHitMarker?: () => void;
  public onWaveCleared?: (wave: number) => void;
  public onGameOver?: (stats: GameStats) => void;
  public onLevelUpdate?: (info: LevelInfo) => void;
  public onRadarUpdate?: (radar: RadarData) => void;

  private animationFrameId: number | null = null;
  private spawnIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // Load High Score
    try {
      const saved = localStorage.getItem('fireball3d_highscore');
      if (saved) this.highScore = parseInt(saved, 10) || 0;
    } catch {
      this.highScore = 0;
    }

    // 1. Scene & Fog (Open-air Sun Temple)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x5ba3e8);
    this.scene.fog = new THREE.FogExp2(0xa0c9ec, 0.007);

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 260);
    this.camera.position.set(0, 1.7, 0);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    container.appendChild(this.renderer.domElement);

    // 4. Pre-create shared assets
    this.fireParticleTexture = createFireParticleTexture();
    this.scorchTexture = createScorchTexture();
    this.sphereGeo = new THREE.SphereGeometry(1, 16, 16);
    this.particleMat = new THREE.SpriteMaterial({
      map: this.fireParticleTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    // 5. Build Lighting, Staff, & Grimoire Book in Left Hand
    this.buildLighting();
    this.buildStaff();
    this.buildGrimoire();

    // 6. Setup Listeners
    this.setupEventListeners();

    // 7. Start on Floor 1 of Expedition (Sanctuary only appears after 10 floors cleared!)
    this.loadDungeonFloor(1);

    // 8. Start Loop
    this.animate = this.animate.bind(this);
    this.clock.start();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  private buildLighting() {
    // Ambient bright open-sky illumination
    this.hemiLight = new THREE.HemisphereLight(0x9bc2e8, 0xd8c2a4, 1.35);
    this.scene.add(this.hemiLight);

    // Overhead blazing sun with crisp shadows
    this.moonLight = new THREE.DirectionalLight(0xfff6e2, 3.8);
    this.moonLight.position.set(38, 70, -32);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 160;
    const d = 52;
    this.moonLight.shadow.camera.left = -d;
    this.moonLight.shadow.camera.right = d;
    this.moonLight.shadow.camera.top = d;
    this.moonLight.shadow.camera.bottom = -d;
    this.moonLight.shadow.bias = -0.0003;
    this.scene.add(this.moonLight);

    // Radiant celestial Sun in the open-air temple sky
    this.sunGroup = new THREE.Group();
    this.sunGroup.position.set(65, 115, -55);

    // Blinding white-hot solar sphere
    this.sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(7.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.sunGroup.add(this.sunCore);

    // Inner radiant golden corona
    this.sunCorona = new THREE.Mesh(
      new THREE.RingGeometry(6, 28, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffe873,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    this.sunGroup.add(this.sunCorona);

    // Outer solar flare flare-burst ring
    this.sunRays = new THREE.Mesh(
      new THREE.RingGeometry(20, 52, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff9900,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    this.sunGroup.add(this.sunRays);

    this.scene.add(this.sunGroup);
  }

  /**
   * Loads the Prototype Level as the Sanctuary / Safe Hub
   */
  public loadHub(nextTargetFloor: number = 11) {
    this.cleanupLevelEntities();

    // Reset lighting to Sanctuary theme
    if (this.hemiLight) this.hemiLight.color.setHex(0x3b3a55);
    if (this.moonLight) this.moonLight.color.setHex(0x7880aa);

    this.currentLevelData = LevelGenerator.generateHub(nextTargetFloor);
    this.scene.add(this.currentLevelData.levelGroup);

    // Apply brilliant sun temple lighting & sky
    this.scene.background = new THREE.Color(this.currentLevelData.skyColor);
    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).color.setHex(this.currentLevelData.fogColor);
      (this.scene.fog as THREE.FogExp2).density = 0.007;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(this.currentLevelData.ambientColor);
      this.hemiLight.intensity = 1.35;
    }
    if (this.moonLight) {
      this.moonLight.color.setHex(this.currentLevelData.dirLightColor);
      this.moonLight.intensity = this.currentLevelData.sunLightIntensity;
    }

    this.torches = this.currentLevelData.torches;
    this.runeCircle = this.currentLevelData.runeCircle;
    this.portals = this.currentLevelData.portals;
    this.fountains = this.currentLevelData.fountains;
    this.trainingDummies = this.currentLevelData.trainingDummies;
    this.pillars = this.currentLevelData.pillars;

    this.spawnDestructiblesAt(
      this.currentLevelData.barrelPositions,
      this.currentLevelData.crystalPositions
    );

    this.currentLevelType = 'hub';
    this.currentFloor = 0;
    this.currentThemeName = 'Sanctuary of Embers';
    this.enemiesRemainingInWave = 0;
    this.totalEnemiesInFloor = 0;
    this.floorCleared = false;
    this.waveSpawningActive = false;
    if (this.spawnIntervalId) clearInterval(this.spawnIntervalId);

    this.playerPosition.set(0, 1.7, 0);
    this.hp = this.maxHp;
    this.mana = this.maxMana;

    this.broadcastLevelInfo();
  }

  /**
   * Loads a procedurally generated dungeon floor
   */
  public loadDungeonFloor(floorNum: number) {
    this.cleanupLevelEntities();

    this.currentLevelData = LevelGenerator.generateProceduralDungeon(floorNum);
    this.scene.add(this.currentLevelData.levelGroup);

    // Apply open-air sun temple sky and sunlight
    this.scene.background = new THREE.Color(this.currentLevelData.skyColor);
    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).color.setHex(this.currentLevelData.fogColor);
      (this.scene.fog as THREE.FogExp2).density = 0.007;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(this.currentLevelData.ambientColor);
      this.hemiLight.intensity = 1.35;
    }
    if (this.moonLight) {
      this.moonLight.color.setHex(this.currentLevelData.dirLightColor);
      this.moonLight.intensity = this.currentLevelData.sunLightIntensity;
    }

    this.torches = this.currentLevelData.torches;
    this.runeCircle = this.currentLevelData.runeCircle;
    this.portals = this.currentLevelData.portals;
    this.fountains = [];
    this.trainingDummies = [];
    this.pillars = this.currentLevelData.pillars;

    this.spawnDestructiblesAt(
      this.currentLevelData.barrelPositions,
      this.currentLevelData.crystalPositions
    );

    this.currentLevelType = 'dungeon';
    this.currentFloor = floorNum;
    this.currentThemeName = this.currentLevelData.themeName;
    this.floorCleared = false;

    // Start player near South return portal stone
    this.playerPosition.set(0, 1.7, 24);

    // Start wave of dungeon hostiles
    this.startDungeonWave(floorNum);

    this.broadcastLevelInfo();
  }

  private cleanupLevelEntities() {
    // Remove previous level geometry
    if (this.currentLevelData) {
      this.scene.remove(this.currentLevelData.levelGroup);
      this.currentLevelData = null;
    }

    // Clear projectiles
    this.projectiles.forEach(p => {
      this.scene.remove(p.mesh);
      this.scene.remove(p.light);
    });
    this.projectiles = [];

    // Clear enemies
    this.enemies.forEach(e => this.scene.remove(e.group));
    this.enemies = [];

    // Clear particles & shockwaves
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.particles = [];
    this.shockwaves.forEach(s => this.scene.remove(s.mesh));
    this.shockwaves = [];

    // Clear destructibles
    this.destructibles.forEach(d => this.scene.remove(d.mesh));
    this.destructibles = [];

    this.portals = [];
    this.fountains = [];
    this.trainingDummies = [];
    this.pillars = [];
    this.torches = [];
    this.nearbyPortal = null;
    this.canEnterPortal = false;
    this.activePortalPrompt = null;
  }

  public interactPortal() {
    if (!this.nearbyPortal || !this.nearbyPortal.active) return;
    const portal = this.nearbyPortal;

    sounds.playPortalWarp();

    if (portal.type === 'expedition') {
      this.loadDungeonFloor(portal.targetFloor || 1);
    } else if (portal.type === 'descent') {
      this.loadDungeonFloor(portal.targetFloor);
    } else if (portal.type === 'sanctuary') {
      const nextExpedition = portal.targetFloor || (this.currentFloor + 1);
      this.loadHub(nextExpedition);
      if (this.onFloatingText) {
        this.onFloatingText({
          id: `sanctuary_entered_${Date.now()}`,
          text: `SANCTUARY OF THE SUN UNLOCKED! (10 Floors Cleared)`,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2 - 50,
          color: '#34d399',
          size: 26,
          opacity: 1,
          createdAt: performance.now(),
        });
      }
    }
  }

  public broadcastLevelInfo() {
    if (this.onLevelUpdate) {
      this.onLevelUpdate({
        type: this.currentLevelType,
        floor: this.currentFloor,
        name: this.currentLevelType === 'hub' ? 'Sanctuary of Embers' : `Floor ${this.currentFloor}`,
        themeName: this.currentThemeName,
        enemiesRemaining: this.enemiesRemainingInWave,
        totalEnemies: this.totalEnemiesInFloor,
        floorCleared: this.floorCleared,
        canEnterPortal: this.canEnterPortal,
        portalPrompt: this.activePortalPrompt,
      });
    }
  }

  private buildStaff() {
    // Spellcaster Staff / Hand in front of camera
    this.staffGroup = new THREE.Group();

    // Staff wooden pole
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.6, 12);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x3d2314,
      roughness: 0.7,
      metalness: 0.1,
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(0, -0.4, 0);
    this.staffGroup.add(pole);

    // Gold ornate head bracket
    const bracketGeo = new THREE.TorusGeometry(0.12, 0.03, 8, 16);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.85,
    });
    const bracket = new THREE.Mesh(bracketGeo, goldMat);
    bracket.position.set(0, 0.35, 0);
    bracket.rotation.x = Math.PI / 2;
    this.staffGroup.add(bracket);

    // Floating Fire Core Gem / Crystal
    const gemGeo = new THREE.IcosahedronGeometry(0.14, 1);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff5500,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.3,
    });
    this.staffGem = new THREE.Mesh(gemGeo, gemMat);
    this.staffGem.position.set(0, 0.4, 0);
    this.staffGroup.add(this.staffGem);

    // Light emitting from gem
    this.staffLight = new THREE.PointLight(0xff6600, 1.2, 5);
    this.staffLight.position.set(0, 0.4, 0);
    this.staffGroup.add(this.staffLight);

    // Position staff on right side of view
    this.staffGroup.position.set(0.38, -0.32, -0.7);
    this.staffGroup.rotation.set(0.15, -0.15, -0.1);
    this.camera.add(this.staffGroup);
    this.scene.add(this.camera);
  }

  private buildGrimoire() {
    this.radarCanvas = document.createElement('canvas');
    this.radarCanvas.width = 512;
    this.radarCanvas.height = 512;
    this.radarCtx = this.radarCanvas.getContext('2d');
    this.radarTexture = new THREE.CanvasTexture(this.radarCanvas);
    this.radarTexture.anisotropy = 4;

    this.bookGroup = new THREE.Group();

    // 1. Robed Left Arm & Gauntleted Hand holding the book
    const armGroup = new THREE.Group();
    const sleeveGeo = new THREE.CylinderGeometry(0.065, 0.088, 0.45, 12);
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1,
    });
    const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeve.position.set(-0.06, -0.22, 0.18);
    sleeve.rotation.set(-0.65, 0.25, 0.25);
    armGroup.add(sleeve);

    // Gold embroidered cuff band on sleeve
    const cuffGeo = new THREE.TorusGeometry(0.078, 0.014, 8, 16);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.35,
      metalness: 0.85,
    });
    const cuff = new THREE.Mesh(cuffGeo, goldMat);
    cuff.position.set(-0.035, -0.10, 0.09);
    cuff.rotation.set(-0.65, 0.25, 0.25);
    armGroup.add(cuff);

    // Gauntleted Hand holding under the spine of the book
    const handGeo = new THREE.BoxGeometry(0.10, 0.05, 0.14);
    const handMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.6,
      metalness: 0.5,
    });
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.set(0, -0.04, 0.02);
    armGroup.add(hand);

    // Armored fingers curled up along the bottom edge of the book
    const fingerMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.6,
    });
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.055, 8), fingerMat);
      finger.position.set(-0.045 + f * 0.028, -0.015, -0.075);
      finger.rotation.x = Math.PI / 3;
      armGroup.add(finger);
    }
    // Thumb resting on the left margin
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.055, 8), fingerMat);
    thumb.position.set(-0.16, 0.025, 0.085);
    thumb.rotation.set(0.2, 0, -Math.PI / 3);
    armGroup.add(thumb);

    this.bookGroup.add(armGroup);

    // 2. Open Ancient Grimoire (Cover + Spine + Pages)
    const bookMeshGroup = new THREE.Group();

    // Dark oxblood leather cover
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x221310,
      roughness: 0.68,
      metalness: 0.18,
    });

    // Book Spine
    const spineGeo = new THREE.BoxGeometry(0.045, 0.045, 0.38);
    const spine = new THREE.Mesh(spineGeo, leatherMat);
    spine.position.set(0, -0.015, 0);
    bookMeshGroup.add(spine);

    // Gold spine bands
    for (let b = -0.14; b <= 0.14; b += 0.07) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.012), goldMat);
      band.position.set(0, -0.015, b);
      bookMeshGroup.add(band);
    }

    // Left & Right Book Covers (opened wide ~165 degrees)
    const coverGeo = new THREE.BoxGeometry(0.25, 0.014, 0.38);

    const leftCover = new THREE.Mesh(coverGeo, leatherMat);
    leftCover.position.set(-0.13, -0.005, 0);
    leftCover.rotation.z = -0.12;
    bookMeshGroup.add(leftCover);

    const rightCover = new THREE.Mesh(coverGeo, leatherMat);
    rightCover.position.set(0.13, -0.005, 0);
    rightCover.rotation.z = 0.12;
    bookMeshGroup.add(rightCover);

    // Gold ornate corner brackets on outer corners
    const cornerGeo = new THREE.BoxGeometry(0.035, 0.02, 0.035);
    const corners = [
      [-0.24, -0.002, -0.175, -0.12],
      [-0.24, -0.002, 0.175, -0.12],
      [0.24, -0.002, -0.175, 0.12],
      [0.24, -0.002, 0.175, 0.12],
    ];
    corners.forEach(([cx, cy, cz, rotZ]) => {
      const corner = new THREE.Mesh(cornerGeo, goldMat);
      corner.position.set(cx, cy, cz);
      corner.rotation.z = rotZ;
      bookMeshGroup.add(corner);
    });

    // 3. Thick Parchment Pages Stack
    const parchmentMat = new THREE.MeshStandardMaterial({
      color: 0xeee4cc,
      roughness: 0.9,
      metalness: 0.05,
    });
    const pageBlockGeo = new THREE.BoxGeometry(0.24, 0.022, 0.36);

    const leftPages = new THREE.Mesh(pageBlockGeo, parchmentMat);
    leftPages.position.set(-0.125, 0.008, 0);
    leftPages.rotation.z = -0.12;
    bookMeshGroup.add(leftPages);

    const rightPages = new THREE.Mesh(pageBlockGeo, parchmentMat);
    rightPages.position.set(0.125, 0.008, 0);
    rightPages.rotation.z = 0.12;
    bookMeshGroup.add(rightPages);

    // 4. Live Radar Display Surface Mesh
    // Positioned flat on top of the open pages, facing directly towards camera
    const radarPlaneGeo = new THREE.PlaneGeometry(0.48, 0.34);
    const radarPlaneMat = new THREE.MeshBasicMaterial({
      map: this.radarTexture,
      transparent: false,
    });
    const radarMesh = new THREE.Mesh(radarPlaneGeo, radarPlaneMat);
    radarMesh.position.set(0, 0.024, 0);
    radarMesh.rotation.x = -Math.PI / 2;
    bookMeshGroup.add(radarMesh);

    // 5. Arcane Floating Crystal & Gentle Reading Light
    const runeStoneGeo = new THREE.OctahedronGeometry(0.028, 0);
    const runeStoneMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const runeStone = new THREE.Mesh(runeStoneGeo, runeStoneMat);
    runeStone.position.set(0, 0.11, -0.14);
    bookMeshGroup.add(runeStone);

    this.bookLight = new THREE.PointLight(0x38bdf8, 1.2, 3.2);
    this.bookLight.position.set(0, 0.13, 0);
    bookMeshGroup.add(this.bookLight);

    this.bookGroup.add(bookMeshGroup);

    // Position book in left side of first-person view, angled comfortably towards player
    this.bookGroup.position.set(-0.36, -0.28, -0.62);
    this.bookGroup.rotation.set(0.52, 0.36, -0.16);

    this.camera.add(this.bookGroup);
  }

  private spawnDestructiblesAt(barrelLocations: THREE.Vector3[], crystalLocations: THREE.Vector3[]) {
    // Clear existing
    this.destructibles.forEach(d => this.scene.remove(d.mesh));
    this.destructibles = [];

    const barrelTex = createExplosiveBarrelTexture();
    const barrelGeo = new THREE.CylinderGeometry(1.0, 1.0, 2.4, 16);
    const barrelMat = new THREE.MeshStandardMaterial({
      map: barrelTex,
      roughness: 0.6,
      metalness: 0.3,
    });

    barrelLocations.forEach((pos, idx) => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(barrelGeo, barrelMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      group.position.copy(pos);
      this.scene.add(group);

      this.destructibles.push({
        id: `barrel_${idx}`,
        type: 'barrel',
        mesh: group,
        position: group.position,
        radius: 1.3,
        hp: 30,
      });
    });

    // Floating Mystic Mana Crystals
    const crystalGeo = new THREE.OctahedronGeometry(1.2, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      emissive: 0x0099ff,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.9,
    });

    crystalLocations.forEach((pos, idx) => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(crystalGeo, crystalMat);
      mesh.castShadow = true;
      group.add(mesh);

      // Light for crystal
      const pLight = new THREE.PointLight(0x00bbff, 1.2, 8);
      group.add(pLight);

      group.position.copy(pos);
      this.scene.add(group);

      this.destructibles.push({
        id: `crystal_${idx}`,
        type: 'crystal',
        mesh: group,
        position: group.position,
        radius: 1.4,
        hp: 40,
      });
    });
  }

  public startDungeonWave(floorNumber: number) {
    this.wave = floorNumber;
    const enemyCount = 4 + floorNumber * 3;
    this.enemiesRemainingInWave = enemyCount;
    this.totalEnemiesInFloor = enemyCount;
    this.waveSpawningActive = true;
    this.floorCleared = false;

    if (this.spawnIntervalId) clearInterval(this.spawnIntervalId);

    let spawned = 0;
    const spawnPoints = this.currentLevelData?.enemySpawnPoints || [];

    this.spawnIntervalId = setInterval(() => {
      if (this.isGameOver || this.isPaused || this.currentLevelType !== 'dungeon') return;
      if (spawned >= enemyCount) {
        if (this.spawnIntervalId) clearInterval(this.spawnIntervalId);
        this.waveSpawningActive = false;
        return;
      }

      this.spawnDungeonEnemy(spawnPoints, floorNumber);
      spawned++;
    }, Math.max(650, 1800 - floorNumber * 90));
  }

  private spawnDungeonEnemy(spawnPoints: THREE.Vector3[], floorNum: number) {
    const types: EnemyType[] = ['frost_crawler'];
    if (floorNum >= 2) types.push('fire_imp');
    if (floorNum >= 2) types.push('ice_golem');
    if (floorNum >= 3) types.push('shadow_specter');

    const type = types[Math.floor(Math.random() * types.length)];
    const pt = spawnPoints.length > 0
      ? spawnPoints[Math.floor(Math.random() * spawnPoints.length)]
      : undefined;
    this.createEnemy(type, pt);
  }

  public startWave(waveNumber: number) {
    if (this.currentLevelType === 'dungeon') {
      this.startDungeonWave(waveNumber);
    } else {
      this.loadDungeonFloor(waveNumber);
    }
  }

  private createEnemy(type: EnemyType, spawnPoint?: THREE.Vector3) {
    let spawnX: number;
    let spawnZ: number;

    if (spawnPoint) {
      spawnX = spawnPoint.x + (Math.random() - 0.5) * 3;
      spawnZ = spawnPoint.z + (Math.random() - 0.5) * 3;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const distance = 28 + Math.random() * 5;
      spawnX = Math.cos(angle) * distance;
      spawnZ = Math.sin(angle) * distance;
    }

    const group = new THREE.Group();
    const parts: Enemy['parts'] = {};
    const originalMaterials: THREE.Material[] = [];

    let hp = 45;
    let speed = 6.5;
    let damage = 12;
    let scoreVal = 100;
    let radius = 1.0;

    if (type === 'frost_crawler') {
      // Swift crystalline crawler
      hp = 40 + this.wave * 10;
      speed = 7.5 + Math.min(this.wave * 0.3, 3);
      damage = 10;
      scoreVal = 120;
      radius = 0.9;

      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.3,
        metalness: 0.7,
        emissive: 0x0284c7,
        emissiveIntensity: 0.3,
      });
      originalMaterials.push(bodyMat);

      const bodyGeo = new THREE.OctahedronGeometry(0.7, 1);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.7;
      body.castShadow = true;
      group.add(body);
      parts.body = body;

      // Spiky legs
      const legMat = new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.5 });
      originalMaterials.push(legMat);
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 4), legMat);
        const legAngle = (i * Math.PI) / 2 + Math.PI / 4;
        leg.position.set(Math.cos(legAngle) * 0.6, 0.4, Math.sin(legAngle) * 0.6);
        leg.rotation.z = Math.cos(legAngle) * 0.7;
        leg.rotation.x = Math.sin(legAngle) * 0.7;
        group.add(leg);
      }
    } else if (type === 'ice_golem') {
      // Heavy Tank Golem
      hp = 160 + this.wave * 35;
      speed = 3.6 + Math.min(this.wave * 0.15, 1.5);
      damage = 25;
      scoreVal = 260;
      radius = 1.6;

      const golemMat = new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        roughness: 0.5,
        metalness: 0.5,
        emissive: 0x2563eb,
        emissiveIntensity: 0.2,
      });
      originalMaterials.push(golemMat);

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.2), golemMat);
      torso.position.y = 1.8;
      torso.castShadow = true;
      group.add(torso);
      parts.body = torso;

      // Head
      const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6), golemMat);
      head.position.set(0, 2.9, 0.2);
      head.castShadow = true;
      group.add(head);
      parts.head = head;

      // Glowing blue eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
      eye1.position.set(0.2, 2.95, 0.7);
      const eye2 = eye1.clone();
      eye2.position.set(-0.2, 2.95, 0.7);
      group.add(eye1);
      group.add(eye2);

      // Thick arms
      const armGeo = new THREE.BoxGeometry(0.5, 1.6, 0.5);
      const leftArm = new THREE.Mesh(armGeo, golemMat);
      leftArm.position.set(1.1, 1.7, 0);
      leftArm.castShadow = true;
      group.add(leftArm);
      parts.leftArm = leftArm;

      const rightArm = new THREE.Mesh(armGeo, golemMat);
      rightArm.position.set(-1.1, 1.7, 0);
      rightArm.castShadow = true;
      group.add(rightArm);
      parts.rightArm = rightArm;

      // Legs
      const legGeo = new THREE.BoxGeometry(0.6, 1.2, 0.6);
      const leftLeg = new THREE.Mesh(legGeo, golemMat);
      leftLeg.position.set(0.45, 0.6, 0);
      group.add(leftLeg);
      parts.leftLeg = leftLeg;

      const rightLeg = new THREE.Mesh(legGeo, golemMat);
      rightLeg.position.set(-0.45, 0.6, 0);
      group.add(rightLeg);
      parts.rightLeg = rightLeg;
    } else if (type === 'shadow_specter') {
      // Floating skull wraith
      hp = 65 + this.wave * 15;
      speed = 5.8 + Math.min(this.wave * 0.2, 2);
      damage = 18;
      scoreVal = 200;
      radius = 1.1;

      const specterMat = new THREE.MeshStandardMaterial({
        color: 0x1e1b4b,
        roughness: 0.4,
        metalness: 0.8,
        emissive: 0x7c3aed,
        emissiveIntensity: 0.5,
      });
      originalMaterials.push(specterMat);

      // Floating Skull Head
      const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), specterMat);
      skull.position.y = 2.4;
      skull.castShadow = true;
      group.add(skull);
      parts.head = skull;

      // Glowing sinister eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
      const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
      eye1.position.set(0.22, 2.5, 0.65);
      const eye2 = eye1.clone();
      eye2.position.set(-0.22, 2.5, 0.65);
      group.add(eye1);
      group.add(eye2);

      // Floating shroud cones
      const shroudMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.7,
        transparent: true,
        opacity: 0.85,
      });
      originalMaterials.push(shroudMat);
      const shroud = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 8), shroudMat);
      shroud.position.y = 1.4;
      shroud.rotation.x = Math.PI;
      group.add(shroud);
      parts.body = shroud;
    } else {
      // Fire Imp (berserk runner)
      hp = 50 + this.wave * 12;
      speed = 8.5;
      damage = 14;
      scoreVal = 150;
      radius = 0.85;

      const impMat = new THREE.MeshStandardMaterial({
        color: 0xb91c1c,
        roughness: 0.6,
        metalness: 0.2,
        emissive: 0xef4444,
        emissiveIntensity: 0.3,
      });
      originalMaterials.push(impMat);

      const impBody = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65), impMat);
      impBody.position.y = 1.0;
      impBody.castShadow = true;
      group.add(impBody);
      parts.body = impBody;

      // Horns
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4), hornMat);
      horn1.position.set(0.25, 1.45, 0.1);
      horn1.rotation.z = -0.3;
      const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4), hornMat);
      horn2.position.set(-0.25, 1.45, 0.1);
      horn2.rotation.z = 0.3;
      group.add(horn1);
      group.add(horn2);
    }

    group.position.set(spawnX, 0, spawnZ);
    this.scene.add(group);

    // Spawn summoning portal flash effect
    this.createSummonFlash(group.position);

    this.enemies.push({
      id: `enemy_${Date.now()}_${Math.random()}`,
      type,
      group,
      hp,
      maxHp: hp,
      speed,
      damage,
      scoreValue: scoreVal,
      radius,
      isHit: false,
      hitTimer: 0,
      attackCooldown: 0,
      originalMaterials,
      animationTime: Math.random() * 10,
      parts,
    });
  }

  private createSummonFlash(pos: THREE.Vector3) {
    // Magic rune flash on ground
    const flash = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 2.0, 16),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      })
    );
    flash.rotation.x = -Math.PI / 2;
    flash.position.set(pos.x, 0.05, pos.z);
    this.scene.add(flash);

    this.shockwaves.push({
      mesh: flash,
      currentRadius: 2.0,
      maxRadius: 3.5,
      life: 0.4,
      maxLife: 0.4,
    });
  }

  // --- CASTING SYSTEM ---

  public setSpell(spellId: SpellId) {
    if (this.activeSpellId !== spellId) {
      this.activeSpellId = spellId;
      sounds.playSwitchSpell();

      // Update staff gem color
      const spell = SPELLS[spellId];
      if (this.staffGem && spell) {
        const mat = this.staffGem.material as THREE.MeshStandardMaterial;
        mat.color.set(spell.color);
        mat.emissive.set(spell.emissiveColor);
        if (this.staffLight) this.staffLight.color.set(spell.color);
      }
    }
  }

  public startCasting() {
    if (this.isGameOver || this.isPaused) return;
    const spell = SPELLS[this.activeSpellId];
    if (!spell) return;

    if (spell.chargeable) {
      if (this.mana >= spell.manaCost) {
        this.isCharging = true;
        this.chargeStartTime = performance.now();
        sounds.startCharging();
      }
    } else {
      this.castActiveSpell(1.0);
    }
  }

  public releaseCasting() {
    if (!this.isCharging) return;
    const spell = SPELLS[this.activeSpellId];
    sounds.stopCharging();

    if (spell && spell.chargeable) {
      const chargeDuration = performance.now() - this.chargeStartTime;
      const maxCharge = spell.maxChargeTimeMs || 1500;
      const ratio = Math.min(1.0, Math.max(0.25, chargeDuration / maxCharge));
      this.castActiveSpell(0.6 + ratio * 1.4);
    }

    this.isCharging = false;
    this.chargeProgress = 0;
  }

  public castActiveSpell(powerMultiplier: number = 1.0) {
    const spell = SPELLS[this.activeSpellId];
    if (!spell) return;

    // Check cooldown
    const now = performance.now();
    if (now - this.lastShotTime < spell.cooldownMs) return;

    // Check mana
    const actualManaCost = spell.manaCost;
    if (this.mana < actualManaCost) {
      // Out of mana warning sound/text
      if (this.onFloatingText) {
        this.onFloatingText({
          id: `mana_low_${now}`,
          text: 'LOW MANA!',
          x: window.innerWidth / 2,
          y: window.innerHeight / 2 - 60,
          color: '#38bdf8',
          size: 20,
          opacity: 1,
          createdAt: now,
        });
      }
      return;
    }

    // Deduct mana
    this.mana = Math.max(0, this.mana - actualManaCost);
    this.lastShotTime = now;
    this.shotsFired++;

    // Audio
    sounds.playFireballLaunch(powerMultiplier);

    // Wand recoil animation
    if (this.staffGroup) {
      this.staffGroup.position.z = -0.5;
      this.staffGroup.rotation.x = -0.1;
      setTimeout(() => {
        if (this.staffGroup) {
          this.staffGroup.position.z = -0.7;
          this.staffGroup.rotation.x = 0.15;
        }
      }, 100);
    }

    // Direction calculation
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    // Spawn fireball
    if (spell.id === 'flame_triad') {
      // 3 Fireballs in fan spread
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const angles = [-0.14, 0, 0.14];
      angles.forEach(ang => {
        const spreadDir = direction.clone().addScaledVector(right, ang).normalize();
        this.spawnFireball(spell, spreadDir, powerMultiplier);
      });
    } else {
      this.spawnFireball(spell, direction, powerMultiplier);
    }
  }

  private spawnFireball(spell: typeof SPELLS[string], direction: THREE.Vector3, powerMultiplier: number) {
    const group = new THREE.Group();

    // Scale by power
    const radius = (spell.id === 'inferno_orb' ? 0.65 : 0.35) * powerMultiplier;

    // Fiery Core Mesh
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(spell.color),
    });
    const core = new THREE.Mesh(this.sphereGeo, coreMat);
    core.scale.setScalar(radius);
    group.add(core);

    // Fiery Outer Glow Aura
    const auraMat = new THREE.SpriteMaterial({
      map: this.fireParticleTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      color: new THREE.Color(spell.emissiveColor),
    });
    const aura = new THREE.Sprite(auraMat);
    aura.scale.setScalar(radius * 4.5);
    group.add(aura);

    // Dynamic Point Light on Fireball
    const light = new THREE.PointLight(new THREE.Color(spell.color), 2.2 * powerMultiplier, 12 * powerMultiplier);
    group.add(light);

    // Position in front of camera / staff tip
    const startPos = this.camera.position.clone().addScaledVector(direction, 0.9);
    // Slight offset to right to align with staff
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    startPos.addScaledVector(right, 0.25).addScaledVector(new THREE.Vector3(0, -0.15, 0), 1);
    group.position.copy(startPos);

    this.scene.add(group);

    // Has ballistic gravity if meteor strike
    const hasGravity = spell.id === 'meteor_strike';
    const velocity = direction.clone().multiplyScalar(spell.speed);
    if (hasGravity) {
      velocity.y += 8.0; // lob angle
    }

    const damageMultiplier = this.pyromaniaTimer > 0 ? 2.0 : 1.0;
    const finalDamage = spell.damage * powerMultiplier * damageMultiplier;

    this.projectiles.push({
      id: `proj_${Date.now()}_${Math.random()}`,
      mesh: group,
      light,
      position: group.position,
      velocity,
      spellId: spell.id as SpellId,
      damage: finalDamage,
      splashRadius: spell.splashRadius * powerMultiplier,
      powerMultiplier,
      hasGravity,
      gravityY: hasGravity ? -22 : 0,
      lifetime: 0,
      maxLifetime: 4.0,
      color: spell.color,
    });
  }

  // --- COLLISION & EXPLOSION ---

  private triggerExplosion(
    epicenter: THREE.Vector3,
    spellId: SpellId,
    damage: number,
    radius: number,
    power: number
  ) {
    // Screen shake
    const distToPlayer = epicenter.distanceTo(this.playerPosition);
    if (distToPlayer < 30) {
      const falloff = 1 - distToPlayer / 30;
      this.screenShakeIntensity = Math.min(0.6, 0.15 * power * falloff);
    }

    // Audio
    sounds.playExplosion(power);

    // 1. Expanding Fiery Shockwave Ring
    const ringGeo = new THREE.RingGeometry(0.1, radius * 0.9, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(epicenter);
    ring.position.y += 0.1;
    this.scene.add(ring);

    this.shockwaves.push({
      mesh: ring,
      currentRadius: 0.1,
      maxRadius: radius,
      life: 0.5,
      maxLife: 0.5,
    });

    // 2. Scorch Decal on Floor
    if (epicenter.y < 3.0) {
      const scorch = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 1.5, radius * 1.5),
        new THREE.MeshBasicMaterial({
          map: this.scorchTexture,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        })
      );
      scorch.rotation.x = -Math.PI / 2;
      scorch.position.set(epicenter.x, 0.02, epicenter.z);
      this.scene.add(scorch);

      // Clean up scorch mark after 12s
      setTimeout(() => {
        this.scene.remove(scorch);
        scorch.geometry.dispose();
      }, 12000);
    }

    // 3. Radial Flying Fire Particles / Debris
    const particleCount = Math.floor(18 * power);
    for (let i = 0; i < particleCount; i++) {
      const sprite = new THREE.Sprite(this.particleMat.clone());
      sprite.position.copy(epicenter);
      this.scene.add(sprite);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 16 * power,
        Math.random() * 14 * power + 3,
        (Math.random() - 0.5) * 16 * power
      );

      this.particles.push({
        mesh: sprite,
        velocity: vel,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        startScale: 1.2 * power,
        endScale: 0.1,
        decayRate: 1.5,
      });
    }

    // 4. Temporary Bright Explosion Light
    const explLight = new THREE.PointLight(0xff7711, 4.0 * power, radius * 2.5);
    explLight.position.copy(epicenter);
    this.scene.add(explLight);
    setTimeout(() => {
      this.scene.remove(explLight);
    }, 180);

    // 5. Apply Splash Damage & Knockback to Enemies
    let hitAny = false;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = enemy.group.position.distanceTo(epicenter);

      if (dist <= radius + enemy.radius) {
        hitAny = true;
        // Falloff formula
        const ratio = 1 - Math.min(1, dist / (radius + enemy.radius));
        const finalDamage = Math.round(damage * (0.4 + 0.6 * ratio));

        this.damageEnemy(enemy, finalDamage, epicenter);
      }
    }

    // 6. Check Destructibles (Barrels & Crystals)
    for (let i = this.destructibles.length - 1; i >= 0; i--) {
      const d = this.destructibles[i];
      const dist = d.position.distanceTo(epicenter);
      if (dist <= radius + d.radius) {
        d.hp -= damage;
        if (d.hp <= 0) {
          this.destroyDestructible(d, i);
        }
      }
    }

    // 7. Check Training Dummies (Hub Sanctuary)
    for (const dummy of this.trainingDummies) {
      const dist = dummy.position.distanceTo(epicenter);
      if (dist <= radius + dummy.radius) {
        hitAny = true;
        const ratio = 1 - Math.min(1, dist / (radius + dummy.radius));
        const finalDamage = Math.round(damage * (0.5 + 0.5 * ratio));
        this.damageDummy(dummy, finalDamage, epicenter);
      }
    }

    if (hitAny) {
      this.shotsHit++;
      sounds.playHitMarker();
      if (this.onHitMarker) this.onHitMarker();
    }
  }

  private damageEnemy(enemy: Enemy, dmg: number, impactPoint: THREE.Vector3) {
    enemy.hp -= dmg;
    this.totalDamage += dmg;

    // Tactical aim reward: refund +1.5 MP in dungeon when landing hits
    if (this.currentLevelType === 'dungeon') {
      this.mana = Math.min(this.maxMana, this.mana + 1.5);
    }

    // Flash hit reaction
    enemy.isHit = true;
    enemy.hitTimer = 0.15;
    enemy.group.traverse(child => {
      if (child instanceof THREE.Mesh && child.material) {
        child.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      }
    });

    // Knockback
    const knockDir = enemy.group.position.clone().sub(impactPoint).normalize();
    knockDir.y = 0.35;
    enemy.group.position.addScaledVector(knockDir, 0.8);

    // Floating damage numbers
    const screenPos = this.toScreenPosition(enemy.group.position.clone().add(new THREE.Vector3(0, 1.8, 0)));
    if (this.onFloatingText && screenPos) {
      const isCrit = dmg > 100;
      this.onFloatingText({
        id: `dmg_${Date.now()}_${Math.random()}`,
        text: isCrit ? `CRIT! ${dmg}` : `${dmg}`,
        x: screenPos.x,
        y: screenPos.y,
        color: isCrit ? '#f59e0b' : '#ef4444',
        size: isCrit ? 26 : 18,
        opacity: 1,
        createdAt: performance.now(),
      });
    }

    // Combo system
    this.combo++;
    this.comboTimer = 3.5;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    // Death check
    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private damageDummy(dummy: TrainingDummyEntity, dmg: number, impactPoint: THREE.Vector3) {
    dummy.hitTimer = 0.18;
    dummy.mesh.traverse(child => {
      if (child instanceof THREE.Mesh && child.material) {
        child.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      }
    });

    // Wobble physics
    const knockDir = dummy.position.clone().sub(impactPoint).normalize();
    dummy.mesh.rotation.z = (Math.random() - 0.5) * 0.25;
    dummy.mesh.rotation.x = (Math.random() - 0.5) * 0.25;

    // Floating damage numbers in emerald/cyan
    const screenPos = this.toScreenPosition(dummy.position.clone().add(new THREE.Vector3(0, 2.0, 0)));
    if (this.onFloatingText && screenPos) {
      const isCrit = dmg > 100;
      this.onFloatingText({
        id: `dummy_${Date.now()}_${Math.random()}`,
        text: isCrit ? `CRIT! ${dmg}` : `${dmg}`,
        x: screenPos.x,
        y: screenPos.y,
        color: isCrit ? '#f59e0b' : '#34d399',
        size: isCrit ? 26 : 18,
        opacity: 1,
        createdAt: performance.now(),
      });
    }

    // Dummy counts toward practicing combos
    this.combo++;
    this.comboTimer = 3.5;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
  }

  private killEnemy(enemy: Enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
    }

    this.kills++;
    this.enemiesRemainingInWave = Math.max(0, this.enemiesRemainingInWave - 1);

    // Score with combo multiplier
    const comboMult = Math.min(5, 1 + Math.floor(this.combo / 4) * 0.5);
    const pointsGained = Math.round(enemy.scoreValue * comboMult);
    this.score += pointsGained;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('fireball3d_highscore', this.highScore.toString());
      } catch {
        // Storage unavailable
      }
    }

    // Audio & Death Burst
    sounds.playEnemyDeath(enemy.type);

    // Spawn death ember explosion
    for (let i = 0; i < 16; i++) {
      const sprite = new THREE.Sprite(this.particleMat);
      sprite.position.copy(enemy.group.position).add(new THREE.Vector3(0, 0.8, 0));
      this.scene.add(sprite);

      this.particles.push({
        mesh: sprite,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          Math.random() * 8 + 2,
          (Math.random() - 0.5) * 8
        ),
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        startScale: 1.0,
        endScale: 0.1,
        decayRate: 1.8,
      });
    }

    // Remove mesh from scene
    this.scene.remove(enemy.group);

    // Floating score text
    const screenPos = this.toScreenPosition(enemy.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)));
    if (this.onFloatingText && screenPos) {
      this.onFloatingText({
        id: `score_${Date.now()}_${Math.random()}`,
        text: `+${pointsGained}`,
        x: screenPos.x,
        y: screenPos.y,
        color: '#fbbf24',
        size: 22,
        opacity: 1,
        createdAt: performance.now(),
      });
    }

    // Check wave clear / floor clear
    if (this.enemiesRemainingInWave === 0 && !this.waveSpawningActive && this.enemies.length === 0) {
      if (this.currentLevelType === 'dungeon') {
        this.floorCleared = true;

        // Unlock and activate Descent Portal
        const descentPortal = this.portals.find(p => p.type === 'descent');
        if (descentPortal) {
          descentPortal.active = true;
          (descentPortal.vortexMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
          descentPortal.light.intensity = 3.2;
          descentPortal.light.color.setHex(0xf59e0b);
        }

        sounds.playWaveClear();
        if (this.onWaveCleared) this.onWaveCleared(this.currentFloor);

        // Floor clear rewards
        const floorBonus = 500 * this.currentFloor;
        this.score += floorBonus;
        this.hp = Math.min(this.maxHp, this.hp + 40);
        this.mana = this.maxMana;

        if (this.onFloatingText) {
          this.onFloatingText({
            id: `floor_clear_${Date.now()}`,
            text: `FLOOR ${this.currentFloor} CLEARED! +${floorBonus} PTS & DESCENT UNLOCKED!`,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2 - 40,
            color: '#10b981',
            size: 24,
            opacity: 1,
            createdAt: performance.now(),
          });
        }

        this.broadcastLevelInfo();
      } else {
        sounds.playWaveClear();
        if (this.onWaveCleared) this.onWaveCleared(this.wave);
      }
    }
  }

  private destroyDestructible(d: DestructibleObject, index: number) {
    this.destructibles.splice(index, 1);
    this.scene.remove(d.mesh);
    sounds.playShatter();

    if (d.type === 'barrel') {
      // MEGA EXPLOSION! Chain detonation
      this.triggerExplosion(d.position, 'meteor_strike', 260, 11.0, 2.4);

      if (this.onFloatingText) {
        const screenPos = this.toScreenPosition(d.position);
        if (screenPos) {
          this.onFloatingText({
            id: `chain_${Date.now()}`,
            text: '🔥 CHAIN DETONATION! 🔥',
            x: screenPos.x,
            y: screenPos.y - 30,
            color: '#f97316',
            size: 24,
            opacity: 1,
            createdAt: performance.now(),
          });
        }
      }
    } else if (d.type === 'crystal') {
      // Mana burst & Pyromania powerup
      this.mana = this.maxMana;
      this.pyromaniaTimer = 10.0; // 10s of 2x damage

      // Burst of cyan particles
      for (let i = 0; i < 20; i++) {
        const sprite = new THREE.Sprite(this.particleMat);
        sprite.position.copy(d.position);
        sprite.material.color.set(0x00ffff);
        this.scene.add(sprite);

        this.particles.push({
          mesh: sprite,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 9,
            Math.random() * 8 + 1,
            (Math.random() - 0.5) * 9
          ),
          life: 0.8,
          maxLife: 0.8,
          startScale: 1.5,
          endScale: 0.1,
          decayRate: 1.2,
        });
      }

      if (this.onFloatingText) {
        const screenPos = this.toScreenPosition(d.position);
        if (screenPos) {
          this.onFloatingText({
            id: `pyro_${Date.now()}`,
            text: '⚡ PYROMANIA! 2X DAMAGE + FULL MANA! ⚡',
            x: screenPos.x,
            y: screenPos.y - 20,
            color: '#38bdf8',
            size: 22,
            opacity: 1,
            createdAt: performance.now(),
          });
        }
      }
    }
  }

  // --- PLAYER MOVEMENT & CONTROLS ---

  private setupEventListeners() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.container.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0) {
        this.isPointerDown = true;
        this.startCasting();
      } else if (e.button === 2) {
        e.preventDefault();
        // Right click cycles spells
        const spellKeys: SpellId[] = ['pyro_blast', 'inferno_orb', 'flame_triad', 'meteor_strike'];
        const currIdx = spellKeys.indexOf(this.activeSpellId);
        const nextSpell = spellKeys[(currIdx + 1) % spellKeys.length];
        this.setSpell(nextSpell);
      }
    });

    this.container.addEventListener('mouseup', (e: MouseEvent) => {
      if (e.button === 0) {
        this.isPointerDown = false;
        this.releaseCasting();
      }
    });

    this.container.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });

    // Pointer lock & mouse movement
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.container;
    });

    let prevMouseX = 0;
    let prevMouseY = 0;

    this.container.addEventListener('mousedown', (e: MouseEvent) => {
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      if (!this.pointerLocked && e.button === 0) {
        this.requestPointerLock();
      }
    });

    this.container.addEventListener('mousemove', (e: MouseEvent) => {
      const sensitivity = 0.0024;
      if (this.pointerLocked) {
        this.playerRotation.yaw -= e.movementX * sensitivity;
        this.playerRotation.pitch -= e.movementY * sensitivity;
      } else if (this.isPointerDown) {
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        this.playerRotation.yaw -= dx * sensitivity;
        this.playerRotation.pitch -= dy * sensitivity;
      }
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      // Clamp pitch to avoid neck flip
      this.playerRotation.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.playerRotation.pitch));
    });

    // Touch controls for mobile / tablet
    let touchStartX = 0;
    let touchStartY = 0;
    this.container.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.container.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const touchSensitivity = 0.0035;
        this.playerRotation.yaw -= dx * touchSensitivity;
        this.playerRotation.pitch -= dy * touchSensitivity;
        this.playerRotation.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.playerRotation.pitch));
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }
    }, { passive: true });
  }

  public requestPointerLock() {
    try {
      this.container.requestPointerLock();
    } catch {
      // May fail if not user gesture initiated
    }
  }

  public exitPointerLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    if (this.isGameOver) return;
    const key = e.key.toLowerCase();
    if (key === 'w') this.keys.w = true;
    if (key === 'a') this.keys.a = true;
    if (key === 's') this.keys.s = true;
    if (key === 'd') this.keys.d = true;
    if (key === ' ') {
      this.keys.space = true;
      e.preventDefault();
    }

    // Number keys switch spells
    if (key === '1') this.setSpell('pyro_blast');
    if (key === '2') this.setSpell('inferno_orb');
    if (key === '3') this.setSpell('flame_triad');
    if (key === '4') this.setSpell('meteor_strike');

    // Toggle perspective with 'p' or 'v'
    if (key === 'p' || key === 'v') {
      this.togglePerspective();
    }

    // Interact with nearby portal
    if (key === 'e') {
      this.interactPortal();
    }

    // Pause toggle
    if (key === 'escape') {
      this.isPaused = !this.isPaused;
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    if (key === 'w') this.keys.w = false;
    if (key === 'a') this.keys.a = false;
    if (key === 's') this.keys.s = false;
    if (key === 'd') this.keys.d = false;
    if (key === ' ') this.keys.space = false;
  }

  public togglePerspective() {
    this.isThirdPerson = !this.isThirdPerson;
    if (this.staffGroup) {
      this.staffGroup.visible = !this.isThirdPerson;
    }
    if (this.bookGroup) {
      this.bookGroup.visible = !this.isThirdPerson;
    }
  }

  // --- MAIN LOOP ---

  private animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (!this.isPaused && !this.isGameOver) {
      this.updatePlayer(delta);
      this.updateProjectiles(delta);
      this.updateEnemies(delta);
      this.updateParticles(delta);
      this.updateShockwaves(delta);
      this.updateArena(delta);
      this.updateBuffsAndMana(delta);
    }

    // Always update live Grimoire book radar in left hand
    this.updateGrimoireRadar(delta);

    this.render();

    // Broadcast tactical radar state to UI (Top-Left screen radar)
    if (this.onRadarUpdate) {
      const blips: RadarBlip[] = [];
      let enemiesBehind = 0;

      // Player forward vector in XZ plane (Three.js camera faces -Z at yaw 0)
      const forwardX = -Math.sin(this.playerRotation.yaw);
      const forwardZ = -Math.cos(this.playerRotation.yaw);

      // 1. Enemies
      for (const enemy of this.enemies) {
        const dx = enemy.group.position.x - this.playerPosition.x;
        const dz = enemy.group.position.z - this.playerPosition.z;
        // Dot product with forward vector: negative means behind player
        const dot = dx * forwardX + dz * forwardZ;
        if (dot < -0.2) {
          enemiesBehind++;
        }
        blips.push({
          id: enemy.id,
          x: enemy.group.position.x,
          z: enemy.group.position.z,
          type: 'enemy',
          threat: true,
        });
      }

      // 2. Destructibles (Barrels & Crystals)
      for (const d of this.destructibles) {
        blips.push({
          id: d.id,
          x: d.position.x,
          z: d.position.z,
          type: d.type === 'crystal' ? 'crystal' : 'barrel',
        });
      }

      // 3. Portals
      for (const p of this.portals) {
        blips.push({
          id: p.id,
          x: p.position.x,
          z: p.position.z,
          type: 'portal',
          label: p.label,
        });
      }

      // 4. Fountains
      for (const f of this.fountains) {
        blips.push({
          id: f.id,
          x: f.position.x,
          z: f.position.z,
          type: 'fountain',
        });
      }

      // 5. Training Dummies
      for (const td of this.trainingDummies) {
        blips.push({
          id: td.id,
          x: td.position.x,
          z: td.position.z,
          type: 'dummy',
        });
      }

      // 6. Temple Pillars - OMITTED per user request (dont include pillars in the radar)

      this.onRadarUpdate({
        playerX: this.playerPosition.x,
        playerZ: this.playerPosition.z,
        playerYaw: this.playerRotation.yaw,
        blips,
        enemiesBehind,
      });
    }

    // Broadcast status to UI
    if (this.onStatusUpdate) {
      const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 100;
      this.onStatusUpdate(
        {
          hp: Math.round(this.hp),
          maxHp: this.maxHp,
          mana: Math.round(this.mana),
          maxMana: this.maxMana,
          activeSpell: this.activeSpellId,
          chargeProgress: this.chargeProgress,
          isCharging: this.isCharging,
          combo: this.combo,
          comboMultiplier: Math.min(5, 1 + Math.floor(this.combo / 4) * 0.5),
          comboTimer: Math.max(0, this.comboTimer / 3.5),
        },
        {
          score: this.score,
          highScore: this.highScore,
          wave: this.wave,
          kills: this.kills,
          totalDamage: this.totalDamage,
          accuracy,
          shotsFired: this.shotsFired,
          shotsHit: this.shotsHit,
          highestCombo: this.maxCombo,
        }
      );
    }
  }

  private updatePlayer(delta: number) {
    // 1. Movement vector from WASD
    const moveSpeed = 11.0;
    const moveVector = new THREE.Vector3();

    if (this.keys.w) moveVector.z -= 1;
    if (this.keys.s) moveVector.z += 1;
    if (this.keys.a) moveVector.x -= 1;
    if (this.keys.d) moveVector.x += 1;

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      // Rotate by yaw
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotation.yaw);
      this.playerPosition.addScaledVector(moveVector, moveSpeed * delta);
    }

    // Pillar Collision for Player
    const playerRadius = 0.85;
    for (let iter = 0; iter < 2; iter++) {
      for (const pillar of this.pillars) {
        const dx = this.playerPosition.x - pillar.position.x;
        const dz = this.playerPosition.z - pillar.position.z;
        const dist = Math.hypot(dx, dz);
        const minDist = pillar.radius + playerRadius;
        if (dist < minDist && dist > 0.0001) {
          const push = minDist - dist;
          this.playerPosition.x += (dx / dist) * push;
          this.playerPosition.z += (dz / dist) * push;
        }
      }
    }

    // Boundary constraints (within arena perimeter)
    const bound = 36.5;
    this.playerPosition.x = Math.max(-bound, Math.min(bound, this.playerPosition.x));
    this.playerPosition.z = Math.max(-bound, Math.min(bound, this.playerPosition.z));

    // 2. Camera Orientation
    const euler = new THREE.Euler(this.playerRotation.pitch, this.playerRotation.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    if (this.isThirdPerson) {
      // Over the shoulder 3rd person
      const backVector = new THREE.Vector3(0.8, 1.2, this.cameraDistance).applyQuaternion(this.camera.quaternion);
      this.camera.position.copy(this.playerPosition).add(backVector);
    } else {
      // 1st Person with head bob
      const isMoving = moveVector.lengthSq() > 0;
      const bobOffset = isMoving ? Math.sin(performance.now() * 0.012) * 0.05 : 0;
      this.camera.position.copy(this.playerPosition).add(new THREE.Vector3(0, bobOffset, 0));
    }

    // 3. Screen Shake decay
    if (this.screenShakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.screenShakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.screenShakeIntensity;
      this.screenShakeIntensity = Math.max(0, this.screenShakeIntensity - delta * 1.5);
    }

    // 4. Staff Gem Idle Hover / Charge Pulse
    if (this.staffGem) {
      const t = performance.now() * 0.004;
      this.staffGem.rotation.y = t * 2;
      this.staffGem.rotation.x = t;

      if (this.isCharging) {
        const spell = SPELLS[this.activeSpellId];
        const elapsed = performance.now() - this.chargeStartTime;
        const maxTime = spell?.maxChargeTimeMs || 1500;
        this.chargeProgress = Math.min(1.0, elapsed / maxTime);
        sounds.updateChargePitch(this.chargeProgress);

        const scale = 1.0 + this.chargeProgress * 1.5;
        this.staffGem.scale.setScalar(scale);

        // Converging spark particle into staff
        if (Math.random() > 0.4) {
          this.spawnChargingSpark();
        }
      } else {
        this.staffGem.scale.setScalar(1.0);
      }
    }

    // Grimoire Book in Left Hand Idle Sway & Movement Bob
    if (this.bookGroup && !this.isThirdPerson) {
      const swayTime = performance.now() * 0.0025;
      const isMoving = moveVector.lengthSq() > 0;
      const bobY = isMoving ? Math.sin(performance.now() * 0.012) * 0.015 : Math.sin(swayTime) * 0.005;
      const bobX = isMoving ? Math.cos(performance.now() * 0.006) * 0.01 : Math.cos(swayTime * 0.7) * 0.003;
      this.bookGroup.position.set(-0.36 + bobX, -0.28 + bobY, -0.62);
      this.bookGroup.rotation.z = -0.16 + bobX * 0.3;
    }

    // 5. Portal Proximity Check & Prompt
    let foundNearPortal: PortalEntity | null = null;
    for (const portal of this.portals) {
      const dist = this.playerPosition.distanceTo(portal.position);
      if (dist <= portal.triggerRadius + 1.2) {
        foundNearPortal = portal;
        break;
      }
    }

    if (foundNearPortal !== this.nearbyPortal) {
      this.nearbyPortal = foundNearPortal;
      if (foundNearPortal && foundNearPortal.active) {
        this.canEnterPortal = true;
        this.activePortalPrompt = foundNearPortal.prompt;
      } else if (foundNearPortal && !foundNearPortal.active) {
        this.canEnterPortal = false;
        this.activePortalPrompt = 'Defeat all dungeon hostiles to activate Descent!';
      } else {
        this.canEnterPortal = false;
        this.activePortalPrompt = null;
      }
      this.broadcastLevelInfo();
    }

    // 6. Hub Fountain Healing & Mana Pool
    if (this.currentLevelType === 'hub' && this.fountains.length > 0) {
      this.fountainHealTimer += delta;
      for (const fountain of this.fountains) {
        const dist = this.playerPosition.distanceTo(fountain.position);
        if (dist <= fountain.radius && this.fountainHealTimer >= 0.5) {
          this.fountainHealTimer = 0;
          if (this.hp < this.maxHp || this.mana < this.maxMana) {
            this.hp = Math.min(this.maxHp, this.hp + 20);
            this.mana = Math.min(this.maxMana, this.mana + 30);
            sounds.playFountainHeal();
            if (this.onFloatingText) {
              const screenPos = this.toScreenPosition(this.playerPosition.clone().add(new THREE.Vector3(0, 2.2, 0)));
              if (screenPos) {
                this.onFloatingText({
                  id: `fountain_${Date.now()}`,
                  text: '+20 HP & +30 MP (Fountain of Renewal)',
                  x: screenPos.x,
                  y: screenPos.y,
                  color: '#10b981',
                  size: 20,
                  opacity: 1,
                  createdAt: performance.now(),
                });
              }
            }
          }
        }
      }
    }
  }

  private spawnChargingSpark() {
    if (!this.staffGroup) return;
    const sprite = new THREE.Sprite(this.particleMat);
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 0.6 + 0.4,
      (Math.random() - 0.5) * 0.6
    );
    sprite.position.copy(offset);
    this.staffGroup.add(sprite);

    // Moves inward to gem (0, 0.4, 0)
    setTimeout(() => {
      this.staffGroup?.remove(sprite);
    }, 120);
  }

  private updateProjectiles(delta: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime += delta;

      // Gravity physics
      if (p.hasGravity) {
        p.velocity.y += p.gravityY * delta;
      }

      const prevPos = p.position.clone();
      const step = p.velocity.clone().multiplyScalar(delta);
      const newPos = prevPos.clone().add(step);

      // Trailing Ember Particles
      if (Math.random() > 0.2) {
        this.spawnTrailParticle(p.position, p.color);
      }

      // 1. Raycast collision check along step vector to prevent tunneling
      const raycaster = new THREE.Raycaster(prevPos, step.clone().normalize(), 0, step.length() + 0.5);

      // Check ground hit
      if (newPos.y <= 0.2) {
        newPos.y = 0.2;
        this.triggerExplosion(newPos, p.spellId, p.damage, p.splashRadius, p.powerMultiplier);
        this.removeProjectile(i);
        continue;
      }

      // Check arena wall collision
      if (Math.abs(newPos.x) >= 39 || Math.abs(newPos.z) >= 39) {
        this.triggerExplosion(newPos, p.spellId, p.damage, p.splashRadius, p.powerMultiplier);
        this.removeProjectile(i);
        continue;
      }

      // Check pillar obstacle collisions
      let hitPillar = false;
      for (const pillar of this.pillars) {
        const distXZ = Math.hypot(newPos.x - pillar.position.x, newPos.z - pillar.position.z);
        if (distXZ <= pillar.radius + 0.35 && newPos.y >= 0 && newPos.y <= pillar.height) {
          this.triggerExplosion(newPos, p.spellId, p.damage, p.splashRadius, p.powerMultiplier);
          this.removeProjectile(i);
          hitPillar = true;
          break;
        }
      }
      if (hitPillar) continue;

      // Check direct enemy hit
      let hitEnemy = false;
      for (const enemy of this.enemies) {
        const dist = newPos.distanceTo(enemy.group.position.clone().add(new THREE.Vector3(0, enemy.radius, 0)));
        if (dist <= enemy.radius + 0.4) {
          this.triggerExplosion(newPos, p.spellId, p.damage, p.splashRadius, p.powerMultiplier);
          this.removeProjectile(i);
          hitEnemy = true;
          break;
        }
      }
      if (hitEnemy) continue;

      // Check destructibles
      let hitDestructible = false;
      for (const d of this.destructibles) {
        const dist = newPos.distanceTo(d.position);
        if (dist <= d.radius + 0.3) {
          this.triggerExplosion(newPos, p.spellId, p.damage, p.splashRadius, p.powerMultiplier);
          this.removeProjectile(i);
          hitDestructible = true;
          break;
        }
      }
      if (hitDestructible) continue;

      // Check training dummies (Hub Sanctuary)
      let hitDummy = false;
      for (const dummy of this.trainingDummies) {
        const dist = newPos.distanceTo(dummy.position.clone().add(new THREE.Vector3(0, 1.0, 0)));
        if (dist <= dummy.radius + 0.3) {
          this.triggerExplosion(newPos, p.spellId, p.damage, p.splashRadius, p.powerMultiplier);
          this.removeProjectile(i);
          hitDummy = true;
          break;
        }
      }
      if (hitDummy) continue;

      // Lifetime timeout
      if (p.lifetime >= p.maxLifetime) {
        this.triggerExplosion(newPos, p.spellId, p.damage, p.splashRadius, p.powerMultiplier);
        this.removeProjectile(i);
        continue;
      }

      p.position.copy(newPos);
      p.mesh.position.copy(newPos);
    }
  }

  private spawnTrailParticle(pos: THREE.Vector3, color: string) {
    const sprite = new THREE.Sprite(this.particleMat);
    sprite.position.copy(pos).add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    ));
    this.scene.add(sprite);

    this.particles.push({
      mesh: sprite,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 2,
        (Math.random() - 0.5) * 1.5
      ),
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      startScale: 0.8,
      endScale: 0.05,
      decayRate: 2.2,
    });
  }

  private removeProjectile(index: number) {
    const p = this.projectiles[index];
    this.scene.remove(p.mesh);
    this.projectiles.splice(index, 1);
  }

  private updateEnemies(delta: number) {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      enemy.animationTime += delta * 6;

      // Hit flash reset
      if (enemy.isHit) {
        enemy.hitTimer -= delta;
        if (enemy.hitTimer <= 0) {
          enemy.isHit = false;
          // Restore original materials
          let matIdx = 0;
          enemy.group.traverse(child => {
            if (child instanceof THREE.Mesh && child.material && enemy.originalMaterials[matIdx]) {
              child.material = enemy.originalMaterials[matIdx];
              matIdx = (matIdx + 1) % enemy.originalMaterials.length;
            }
          });
        }
      }

      // Move toward player
      const toPlayer = this.playerPosition.clone().sub(enemy.group.position);
      toPlayer.y = 0;
      const distToPlayer = toPlayer.length();

      if (distToPlayer > 1.2) {
        toPlayer.normalize();
        enemy.group.position.addScaledVector(toPlayer, enemy.speed * delta);
        enemy.group.lookAt(this.playerPosition.x, enemy.group.position.y, this.playerPosition.z);
      }

      // Pillar collision for enemies
      for (const pillar of this.pillars) {
        const dx = enemy.group.position.x - pillar.position.x;
        const dz = enemy.group.position.z - pillar.position.z;
        const dist = Math.hypot(dx, dz);
        const minDist = pillar.radius + enemy.radius;
        if (dist < minDist && dist > 0.0001) {
          const push = minDist - dist;
          enemy.group.position.x += (dx / dist) * push;
          enemy.group.position.z += (dz / dist) * push;
        }
      }

      // Procedural walking / bobbing animation
      if (enemy.parts.leftLeg && enemy.parts.rightLeg) {
        enemy.parts.leftLeg.rotation.x = Math.sin(enemy.animationTime) * 0.5;
        enemy.parts.rightLeg.rotation.x = -Math.sin(enemy.animationTime) * 0.5;
      }
      if (enemy.parts.leftArm && enemy.parts.rightArm) {
        enemy.parts.leftArm.rotation.x = -Math.sin(enemy.animationTime) * 0.4;
        enemy.parts.rightArm.rotation.x = Math.sin(enemy.animationTime) * 0.4;
      }
      if (enemy.type === 'shadow_specter') {
        enemy.group.position.y = 0.5 + Math.sin(enemy.animationTime * 0.6) * 0.35;
      }

      // Attack player if in melee reach
      enemy.attackCooldown -= delta;
      if (distToPlayer <= 2.2 && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 1.2;
        this.damagePlayer(enemy.damage);
      }
    }
  }

  private damagePlayer(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    sounds.playPlayerHurt();
    this.screenShakeIntensity = 0.4;

    // Reset combo on taking damage
    this.combo = 0;

    if (this.onFloatingText) {
      this.onFloatingText({
        id: `player_hurt_${Date.now()}`,
        text: `-${amount} HP`,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2 + 50,
        color: '#ef4444',
        size: 24,
        opacity: 1,
        createdAt: performance.now(),
      });
    }

    if (this.hp <= 0 && !this.isGameOver) {
      this.gameOver();
    }
  }

  private gameOver() {
    this.isGameOver = true;
    this.exitPointerLock();

    const accuracy = this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 100;
    const stats: GameStats = {
      score: this.score,
      highScore: this.highScore,
      wave: this.wave,
      kills: this.kills,
      totalDamage: this.totalDamage,
      accuracy,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      highestCombo: this.maxCombo,
    };

    if (this.onGameOver) this.onGameOver(stats);
  }

  public restartGame() {
    // Clear all projectiles, enemies, particles
    this.projectiles.forEach(p => this.scene.remove(p.mesh));
    this.projectiles = [];

    this.enemies.forEach(e => this.scene.remove(e.group));
    this.enemies = [];

    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.particles = [];

    this.shockwaves.forEach(s => this.scene.remove(s.mesh));
    this.shockwaves = [];

    // Reset player state
    this.hp = 100;
    this.maxHp = 100;
    this.mana = 100;
    this.score = 0;
    this.kills = 0;
    this.totalDamage = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.isCharging = false;
    this.chargeProgress = 0;
    this.playerPosition.set(0, 1.7, 0);
    this.playerRotation.yaw = 0;
    this.playerRotation.pitch = 0;

    this.loadDungeonFloor(1);
  }

  private updateParticles(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta * p.decayRate;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.addScaledVector(p.velocity, delta);
      // Gravity for debris
      p.velocity.y -= 12 * delta;

      const progress = p.life / p.maxLife;
      const currentScale = p.endScale + (p.startScale - p.endScale) * progress;
      p.mesh.scale.setScalar(currentScale);

      if (p.mesh instanceof THREE.Sprite) {
        p.mesh.material.opacity = progress;
      }
    }
  }

  private updateShockwaves(delta: number) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= delta;

      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }

      const progress = 1 - s.life / s.maxLife;
      const currentRadius = s.maxRadius * progress;
      s.mesh.scale.setScalar(currentRadius);

      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - progress;
    }
  }

  private updateArena(delta: number) {
    // Solar celestial disk billboard & pulsing corona
    if (this.sunGroup) {
      this.sunGroup.lookAt(this.camera.position);
      if (this.sunCorona) {
        this.sunCorona.rotation.z += delta * 0.08;
      }
      if (this.sunRays) {
        this.sunRays.rotation.z -= delta * 0.04;
        const s = 1.0 + Math.sin(performance.now() * 0.002) * 0.08;
        this.sunRays.scale.set(s, s, s);
      }
    }

    // Rune circle rotation
    if (this.runeCircle) {
      this.runeCircle.rotation.z += delta * 0.15;
    }

    // Torch flicker
    const t = performance.now() * 0.008;
    this.torches.forEach((torch, idx) => {
      torch.light.intensity = torch.baseIntensity + Math.sin(t + idx * 1.5) * 0.35 + (Math.random() - 0.5) * 0.1;
    });

    // Destructible mana crystals hovering
    this.destructibles.forEach(d => {
      if (d.type === 'crystal') {
        d.mesh.rotation.y += delta * 1.2;
        d.mesh.rotation.z += delta * 0.6;
        d.mesh.position.y = 2.2 + Math.sin(performance.now() * 0.003 + d.position.x) * 0.3;
      }
    });

    // Portals vortex rotation & pulsing glow
    this.portals.forEach((portal, idx) => {
      if (portal.vortexMesh) {
        portal.vortexMesh.rotation.z += delta * 1.8;
      }
      if (portal.ringMesh) {
        portal.ringMesh.rotation.z -= delta * 0.8;
      }
      if (portal.active && portal.light) {
        portal.light.intensity = 2.4 + Math.sin(t * 1.5 + idx) * 0.6;
      }
    });

    // Training dummy recovery from hit
    this.trainingDummies.forEach(dummy => {
      if (dummy.hitTimer > 0) {
        dummy.hitTimer -= delta;
        if (dummy.hitTimer <= 0) {
          dummy.mesh.traverse(child => {
            if (child instanceof THREE.Mesh && child.material && dummy.originalMaterial) {
              child.material = dummy.originalMaterial;
            }
          });
          dummy.mesh.rotation.x = 0;
          dummy.mesh.rotation.z = 0;
        }
      }
    });
  }

  private updateBuffsAndMana(delta: number) {
    // Mana natural regeneration:
    // Safe Hub: 35 MP/s for unrestricted spellcasting practice
    // Hostile Procedural Dungeon: Nerfed to 4.5 MP/s (12 MP/s with Pyromania)
    // to prevent spamming high-impact spells (Inferno Orb: 35 MP, Meteor: 60 MP)
    const baseRegen = this.currentLevelType === 'hub' ? 35 : 4.5;
    const regenRate = this.pyromaniaTimer > 0 ? (this.currentLevelType === 'hub' ? 55 : 12) : baseRegen;
    this.mana = Math.min(this.maxMana, this.mana + regenRate * delta);

    // Buff decay
    if (this.pyromaniaTimer > 0) {
      this.pyromaniaTimer = Math.max(0, this.pyromaniaTimer - delta);
    }

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }
  }

  private toScreenPosition(pos: THREE.Vector3): { x: number; y: number } | null {
    const v = pos.clone().project(this.camera);
    if (v.z > 1) return null; // Behind camera
    const widthHalf = this.container.clientWidth / 2;
    const heightHalf = this.container.clientHeight / 2;
    return {
      x: v.x * widthHalf + widthHalf,
      y: -(v.y * heightHalf) + heightHalf,
    };
  }

  private onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateGrimoireRadar(delta: number) {
    if (!this.radarCtx || !this.radarTexture) return;
    const ctx = this.radarCtx;
    const w = 512;
    const h = 512;

    this.radarSweepAngle = (this.radarSweepAngle + delta * 2.8) % (Math.PI * 2);

    // 1. Grimoire Parchment / Arcane Night Canvas Background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, w, h);

    // Subtle center gutter shadow between pages
    const gutterGrad = ctx.createLinearGradient(w / 2 - 24, 0, w / 2 + 24, 0);
    gutterGrad.addColorStop(0, 'rgba(0,0,0,0)');
    gutterGrad.addColorStop(0.5, 'rgba(0,0,0,0.65)');
    gutterGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gutterGrad;
    ctx.fillRect(w / 2 - 24, 0, 48, h);

    // Gold gilded border framing the ancient manuscript
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.strokeStyle = '#78541a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    // Ornate runic corners
    const drawCorner = (x: number, y: number, sx: number, sy: number) => {
      ctx.beginPath();
      ctx.moveTo(x + sx * 26, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * 26);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    drawCorner(14, 14, 1, 1);
    drawCorner(w - 14, 14, -1, 1);
    drawCorner(14, h - 14, 1, -1);
    drawCorner(w - 14, h - 14, -1, -1);

    // 2. Grimoire Header
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px "Cinzel", Georgia, serif';
    ctx.textAlign = 'center';
    if (this.currentLevelType === 'hub') {
      ctx.fillText('SANCTUARY OF EMBERS', w / 2, 44);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('SUN TEMPLE • SAFE HAVEN (FULL MANA REGEN)', w / 2, 66);
    } else {
      ctx.fillText(`FLOOR ${this.currentFloor}: ${this.currentThemeName.toUpperCase()}`, w / 2, 44);
      ctx.fillStyle = this.enemiesRemainingInWave > 0 ? '#f87171' : '#34d399';
      ctx.font = 'bold 14px monospace';
      const statusText = this.enemiesRemainingInWave > 0
        ? `HOSTILES: ${this.enemiesRemainingInWave} / ${this.totalEnemiesInFloor}`
        : 'FLOOR CLEARED • DESCENT OPEN';
      ctx.fillText(statusText, w / 2, 66);
    }

    // 3. Central Magical Radar Circle
    const cx = 256;
    const cy = 286;
    const radarRadius = 182;
    const maxRange = 44; // 3D units

    // Circular dark starry background
    const bgRad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radarRadius);
    bgRad.addColorStop(0, '#101e38');
    bgRad.addColorStop(0.7, '#090e1a');
    bgRad.addColorStop(1, '#04060d');
    ctx.fillStyle = bgRad;
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    ctx.fill();

    // Range rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    [60, 120].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Outer Gilded Compass Rim
    ctx.setLineDash([]);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy - radarRadius);
    ctx.lineTo(cx, cy + radarRadius);
    ctx.moveTo(cx - radarRadius, cy);
    ctx.lineTo(cx + radarRadius, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rotating Radar Sonar Sweep
    const sweepStart = this.radarSweepAngle;
    const sweepEnd = this.radarSweepAngle + 0.55;
    const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radarRadius);
    sweepGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    sweepGrad.addColorStop(1, 'rgba(56, 189, 248, 0.05)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radarRadius, sweepStart, sweepEnd);
    ctx.closePath();
    ctx.fillStyle = sweepGrad;
    ctx.fill();

    // Leading sweep beam line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepEnd) * radarRadius, cy + Math.sin(sweepEnd) * radarRadius);
    ctx.stroke();
    ctx.restore();

    // Cardinal North Marker (aligned with world North)
    const northAngle = this.playerRotation.yaw - Math.PI / 2;
    const nx = cx + Math.cos(northAngle) * (radarRadius - 12);
    const ny = cy + Math.sin(northAngle) * (radarRadius - 12);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);

    // Player Chevron at center pointing UP
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx - 8, cy + 8);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx + 8, cy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Transformation for entities relative to player yaw
    const cosYaw = Math.cos(this.playerRotation.yaw);
    const sinYaw = Math.sin(this.playerRotation.yaw);

    const projectToRadar = (wx: number, wz: number) => {
      const dx = wx - this.playerPosition.x;
      const dz = wz - this.playerPosition.z;
      const relRight = dx * cosYaw - dz * sinYaw;
      const relForward = -dx * sinYaw - dz * cosYaw;
      const dist = Math.hypot(relRight, relForward);
      const isClamped = dist > maxRange;
      const normDist = isClamped ? radarRadius : (dist / maxRange) * radarRadius;
      const angle = Math.atan2(-relForward, relRight);
      return {
        x: cx + Math.cos(angle) * normDist,
        y: cy + Math.sin(angle) * normDist,
        dist,
        isBehind: relForward < 0,
      };
    };

    let enemiesBehindCount = 0;

    // 1. Portals
    for (const portal of this.portals) {
      const p = projectToRadar(portal.position.x, portal.position.z);
      ctx.strokeStyle = '#f59e0b';
      ctx.fillStyle = portal.active ? '#fbbf24' : '#78541a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(portal.type === 'sanctuary' ? 'SANCTUARY' : 'PORTAL', p.x, p.y - 12);
    }

    // 2. Mana Crystals & Explosive Barrels
    for (const d of this.destructibles) {
      if (d.type === 'crystal') {
        const p = projectToRadar(d.position.x, d.position.z);
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 6);
        ctx.lineTo(p.x + 5, p.y);
        ctx.lineTo(p.x, p.y + 6);
        ctx.lineTo(p.x - 5, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (d.type === 'barrel') {
        const p = projectToRadar(d.position.x, d.position.z);
        ctx.fillStyle = '#f97316';
        ctx.strokeStyle = '#c2410c';
        ctx.lineWidth = 1.5;
        ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
        ctx.strokeRect(p.x - 4, p.y - 4, 8, 8);
      }
    }

    // 3. Fountains
    for (const f of this.fountains) {
      const p = projectToRadar(f.position.x, f.position.z);
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x - 4, p.y - 1.5, 8, 3);
      ctx.fillRect(p.x - 1.5, p.y - 4, 3, 8);
    }

    // 4. Training Dummies
    for (const td of this.trainingDummies) {
      const p = projectToRadar(td.position.x, td.position.z);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Enemies (Hostiles) - Pulsing Threat Dot & Warning
    const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.2;
    for (const e of this.enemies) {
      const p = projectToRadar(e.group.position.x, e.group.position.z);
      if (p.isBehind) enemiesBehindCount++;

      // Pulse warning ring if hostile is behind
      if (p.isBehind) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Red core dot
      ctx.fillStyle = p.isBehind ? '#ef4444' : '#f87171';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.isBehind ? 5.5 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // NOTE: Pillars are intentionally NOT included per user request!

    // Bottom Alert Banner if hostiles are behind
    if (enemiesBehindCount > 0) {
      const flash = Math.sin(performance.now() * 0.012) > 0;
      ctx.fillStyle = flash ? 'rgba(220, 38, 38, 0.95)' : 'rgba(153, 27, 27, 0.9)';
      ctx.beginPath();
      ctx.roundRect(cx - 110, h - 35, 220, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⚠️ ${enemiesBehindCount} HOSTILE${enemiesBehindCount > 1 ? 'S' : ''} BEHIND!`, cx, h - 23);
    }

    this.radarTexture.needsUpdate = true;
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.spawnIntervalId) clearInterval(this.spawnIntervalId);
    if (this.radarTexture) this.radarTexture.dispose();
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
