import * as THREE from 'three';
import {
  createStoneFloorTexture,
  createSunTempleFloorTexture,
  createRuneCircleTexture,
  createSunMandalaTexture,
  createPortalVortexTexture,
} from './textureUtils';

export interface PortalEntity {
  id: string;
  type: 'expedition' | 'descent' | 'sanctuary';
  position: THREE.Vector3;
  mesh: THREE.Group;
  vortexMesh: THREE.Mesh;
  ringMesh?: THREE.Mesh;
  light: THREE.PointLight;
  active: boolean;
  prompt: string;
  targetFloor: number;
  triggerRadius: number;
  label?: string;
}

export interface FountainEntity {
  id: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  radius: number;
}

export interface TrainingDummyEntity {
  id: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  targetMesh: THREE.Mesh;
  originalMaterial?: THREE.Material;
  hp: number;
  maxHp: number;
  radius: number;
  isHit: boolean;
  hitTimer: number;
}

export interface PillarObstacle {
  id: string;
  position: THREE.Vector3;
  radius: number;
  height: number;
}

export interface GeneratedLevel {
  levelGroup: THREE.Group;
  torches: { light: THREE.PointLight; baseIntensity: number }[];
  runeCircle: THREE.Mesh | null;
  portals: PortalEntity[];
  fountains: FountainEntity[];
  trainingDummies: TrainingDummyEntity[];
  pillars: PillarObstacle[];
  barrelPositions: THREE.Vector3[];
  crystalPositions: THREE.Vector3[];
  enemySpawnPoints: THREE.Vector3[];
  roomBounds: number;
  themeName: string;
  skyColor: number;
  fogColor: number;
  ambientColor: number;
  dirLightColor: number;
  sunLightIntensity: number;
}

export class LevelGenerator {
  private static stoneFloorTexture: THREE.CanvasTexture | null = null;
  private static sunFloorTexture: THREE.CanvasTexture | null = null;
  private static runeCircleTexture: THREE.CanvasTexture | null = null;
  private static sunMandalaTexture: THREE.CanvasTexture | null = null;
  private static portalVortexTexture: THREE.CanvasTexture | null = null;

  public static getTextures() {
    if (!this.stoneFloorTexture) this.stoneFloorTexture = createStoneFloorTexture();
    if (!this.sunFloorTexture) this.sunFloorTexture = createSunTempleFloorTexture();
    if (!this.runeCircleTexture) this.runeCircleTexture = createRuneCircleTexture();
    if (!this.sunMandalaTexture) this.sunMandalaTexture = createSunMandalaTexture();
    if (!this.portalVortexTexture) this.portalVortexTexture = createPortalVortexTexture();
    return {
      floor: this.stoneFloorTexture,
      sunFloor: this.sunFloorTexture,
      rune: this.runeCircleTexture,
      sunMandala: this.sunMandalaTexture,
      vortex: this.portalVortexTexture,
    };
  }

  /**
   * Generates the Prototype Level as the Sun Temple Sanctuary (No Roof)
   */
  public static generateHub(targetExpeditionFloor: number = 1): GeneratedLevel {
    const { sunFloor, sunMandala, vortex } = this.getTextures();
    const group = new THREE.Group();
    const torches: { light: THREE.PointLight; baseIntensity: number }[] = [];
    const portals: PortalEntity[] = [];
    const fountains: FountainEntity[] = [];
    const trainingDummies: TrainingDummyEntity[] = [];
    const pillars: PillarObstacle[] = [];

    const arenaRadius = 38;
    const roomBounds = 37;

    // 1. Sun Temple Travertine Flagstone Floor
    const floorGeo = new THREE.PlaneGeometry(84, 84, 16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      map: sunFloor,
      color: 0xf5eee1,
      roughness: 0.76,
      metalness: 0.1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // 2. Central Radiant Sun Mandala
    const runeGeo = new THREE.PlaneGeometry(25, 25);
    const runeMat = new THREE.MeshBasicMaterial({
      map: sunMandala,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
      depthWrite: false,
    });
    const runeCircle = new THREE.Mesh(runeGeo, runeMat);
    runeCircle.rotation.x = -Math.PI / 2;
    runeCircle.position.y = 0.04;
    group.add(runeCircle);

    // 3. Open Colonnade of 10 Grand Classical Fluted Pillars (No Roof!)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xf3eee2,
      roughness: 0.72,
      metalness: 0.08,
    });
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0xe5dcce,
      roughness: 0.8,
      metalness: 0.05,
    });

    const pillarRadius = 1.6;
    const pillarHeight = 11;
    const pillarCount = 10;

    for (let i = 0; i < pillarCount; i++) {
      const angle = (i * Math.PI * 2) / pillarCount;
      const px = Math.cos(angle) * (arenaRadius - 6);
      const pz = Math.sin(angle) * (arenaRadius - 6);

      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(px, 0, pz);

      // Square stepped plinth base
      const baseLower = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 3.6), plinthMat);
      baseLower.position.set(0, 0.35, 0);
      baseLower.castShadow = true;
      baseLower.receiveShadow = true;
      pillarGroup.add(baseLower);

      const baseUpper = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 3.2), plinthMat);
      baseUpper.position.set(0, 0.95, 0);
      baseUpper.castShadow = true;
      baseUpper.receiveShadow = true;
      pillarGroup.add(baseUpper);

      // Fluted cylindrical column shaft
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(pillarRadius * 0.92, pillarRadius * 1.05, pillarHeight, 16),
        pillarMat
      );
      shaft.position.set(0, 1.2 + pillarHeight / 2, 0);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      pillarGroup.add(shaft);

      // Classical Doric/Corinthian style carved capital on top
      const capitalRound = new THREE.Mesh(
        new THREE.CylinderGeometry(pillarRadius * 1.35, pillarRadius * 0.95, 0.8, 16),
        pillarMat
      );
      capitalRound.position.set(0, 1.2 + pillarHeight + 0.4, 0);
      capitalRound.castShadow = true;
      capitalRound.receiveShadow = true;
      pillarGroup.add(capitalRound);

      const capitalAbacus = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.5, 3.4),
        plinthMat
      );
      capitalAbacus.position.set(0, 1.2 + pillarHeight + 1.05, 0);
      capitalAbacus.castShadow = true;
      capitalAbacus.receiveShadow = true;
      pillarGroup.add(capitalAbacus);

      // Sun Brazier / Sconce mounted on pillar facing inward
      const toCenter = new THREE.Vector3(-px, 0, -pz).normalize();
      const sconceDist = pillarRadius + 0.35;
      const sconcePos = toCenter.clone().multiplyScalar(sconceDist);

      const sconce = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.15, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.3 })
      );
      sconce.position.set(sconcePos.x, 5.5, sconcePos.z);
      pillarGroup.add(sconce);

      const brazierDish = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.2, 0.3, 12),
        new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.9, roughness: 0.25 })
      );
      brazierDish.position.set(sconcePos.x, 6.0, sconcePos.z);
      pillarGroup.add(brazierDish);

      // Solar Flame Light
      const torchLight = new THREE.PointLight(0xffaa22, 2.0, 18, 1.2);
      torchLight.position.set(px + sconcePos.x, 6.5, pz + sconcePos.z);
      group.add(torchLight);
      torches.push({ light: torchLight, baseIntensity: 2.0 });

      group.add(pillarGroup);

      // Register pillar collision obstacle
      pillars.push({
        id: `hub_pillar_${i}`,
        position: new THREE.Vector3(px, 0, pz),
        radius: 1.75,
        height: 13,
      });
    }

    // Weathered ancient architrave lintels bridging select pairs of pillars (framing the open sky)
    const connectPairs = [
      [1, 2],
      [6, 7],
    ];
    connectPairs.forEach(([p1Idx, p2Idx]) => {
      const a1 = (p1Idx * Math.PI * 2) / pillarCount;
      const a2 = (p2Idx * Math.PI * 2) / pillarCount;
      const p1 = new THREE.Vector3(Math.cos(a1) * (arenaRadius - 6), 0, Math.sin(a1) * (arenaRadius - 6));
      const p2 = new THREE.Vector3(Math.cos(a2) * (arenaRadius - 6), 0, Math.sin(a2) * (arenaRadius - 6));
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const len = p1.distanceTo(p2);
      const angle = Math.atan2(p2.z - p1.z, p2.x - p1.x);

      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(len + 1.2, 1.2, 1.8),
        plinthMat
      );
      lintel.position.set(mid.x, 13.5, mid.z);
      lintel.rotation.y = -angle;
      lintel.castShadow = true;
      lintel.receiveShadow = true;
      group.add(lintel);
    });

    // 4. Open-Air Low Perimeter Marble Balustrade (Height 2.4m - completely open to the bright sunny sky)
    const balustradeHeight = 2.4;
    const marbleBalustradeMat = new THREE.MeshStandardMaterial({
      color: 0xede4d4,
      roughness: 0.8,
      metalness: 0.1,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xdfd3be,
      roughness: 0.75,
      metalness: 0.1,
    });

    const createBalustradeWall = (x: number, z: number, w: number, d: number) => {
      const wallGroup = new THREE.Group();
      wallGroup.position.set(x, 0, z);

      const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, balustradeHeight, d),
        marbleBalustradeMat
      );
      wallMesh.position.set(0, balustradeHeight / 2, 0);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      wallGroup.add(wallMesh);

      // Classical top railing cap
      const capMesh = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.6, 0.4, d + 0.6),
        capMat
      );
      capMesh.position.set(0, balustradeHeight + 0.2, 0);
      capMesh.castShadow = true;
      capMesh.receiveShadow = true;
      wallGroup.add(capMesh);

      return wallGroup;
    };

    group.add(createBalustradeWall(0, -40, 82, 2.5));
    group.add(createBalustradeWall(0, 40, 82, 2.5));
    group.add(createBalustradeWall(40, 0, 2.5, 82));
    group.add(createBalustradeWall(-40, 0, 2.5, 82));

    // 5. Corner Marble Pedestals with Golden Solar Orbs
    const cornerOffsets = [
      [-36, -36],
      [36, -36],
      [-36, 36],
      [36, 36],
    ];
    cornerOffsets.forEach(([cx, cz]) => {
      const pedestal = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 3.2, 3.5),
        plinthMat
      );
      pedestal.position.set(cx, 1.6, cz);
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      group.add(pedestal);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 0.6,
          roughness: 0.2,
          metalness: 0.9,
        })
      );
      orb.position.set(cx, 4.4, cz);
      orb.castShadow = true;
      group.add(orb);
    });

    // 6. EXPEDITION SUN GATE (PORTAL) at North (0, 0, -26)
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, -26);

    const archPillarMat = new THREE.MeshStandardMaterial({
      color: 0xf5efe2,
      roughness: 0.65,
      metalness: 0.15,
    });

    // Archway Pillars
    const leftArch = new THREE.Mesh(new THREE.BoxGeometry(1.4, 8.0, 1.4), archPillarMat);
    leftArch.position.set(-3.2, 4.0, 0);
    leftArch.castShadow = true;
    leftArch.receiveShadow = true;
    portalGroup.add(leftArch);

    const rightArch = leftArch.clone();
    rightArch.position.set(3.2, 4.0, 0);
    portalGroup.add(rightArch);

    const archHeader = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.5, 1.6), archPillarMat);
    archHeader.position.set(0, 8.4, 0);
    archHeader.castShadow = true;
    archHeader.receiveShadow = true;
    portalGroup.add(archHeader);

    // Decorative Golden Sun Crest over Gate
    const sunCrest = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 })
    );
    sunCrest.position.set(0, 9.8, 0);
    portalGroup.add(sunCrest);

    // Runic Dais / Steps
    const dais = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.8, 0.4, 16),
      new THREE.MeshStandardMaterial({ color: 0xded3be, roughness: 0.75 })
    );
    dais.position.set(0, 0.2, 0);
    dais.receiveShadow = true;
    portalGroup.add(dais);

    // Swirling Portal Vortex Mesh
    const vortexGeo = new THREE.PlaneGeometry(5.2, 6.6);
    const vortexMat = new THREE.MeshBasicMaterial({
      map: vortex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      opacity: 0.95,
      depthWrite: false,
    });
    const vortexMesh = new THREE.Mesh(vortexGeo, vortexMat);
    vortexMesh.position.set(0, 4.0, 0);
    portalGroup.add(vortexMesh);

    // Portal Light
    const portalLight = new THREE.PointLight(0xfbbf24, 3.5, 18);
    portalLight.position.set(0, 4.0, 0);
    portalGroup.add(portalLight);

    group.add(portalGroup);

    portals.push({
      id: 'hub_expedition_portal',
      type: 'expedition',
      position: new THREE.Vector3(0, 1.7, -26),
      mesh: portalGroup,
      vortexMesh,
      light: portalLight,
      active: true,
      prompt: `ENTER EXPEDITION: FLOOR ${targetExpeditionFloor} (Press E or Step In)`,
      targetFloor: targetExpeditionFloor,
      triggerRadius: 3.5,
      label: `Floor ${targetExpeditionFloor} Expedition`,
    });

    // Register portal gate posts as collision obstacles
    pillars.push({
      id: 'hub_portal_left',
      position: new THREE.Vector3(-3.2, 0, -26),
      radius: 1.3,
      height: 8.5,
    });
    pillars.push({
      id: 'hub_portal_right',
      position: new THREE.Vector3(3.2, 0, -26),
      radius: 1.3,
      height: 8.5,
    });

    // 7. RESTORATION SOLAR FOUNTAIN at East (22, 0, 0)
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(22, 0, 0);

    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 4.2, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0xded3bf, roughness: 0.7, metalness: 0.15 })
    );
    basin.position.set(0, 0.6, 0);
    basin.castShadow = true;
    basin.receiveShadow = true;
    fountainGroup.add(basin);

    const water = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 16),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 1.15, 0);
    fountainGroup.add(water);

    const spire = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.1, 0),
      new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00d4ff,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      })
    );
    spire.position.set(0, 2.5, 0);
    spire.castShadow = true;
    fountainGroup.add(spire);

    const fLight = new THREE.PointLight(0x00e5ff, 2.5, 14);
    fLight.position.set(0, 2.5, 0);
    fountainGroup.add(fLight);

    group.add(fountainGroup);

    fountains.push({
      id: 'hub_restoration_fountain',
      position: new THREE.Vector3(22, 1.7, 0),
      mesh: fountainGroup,
      radius: 4.5,
    });

    // Register fountain pedestal as collision obstacle
    pillars.push({
      id: 'hub_fountain_basin',
      position: new THREE.Vector3(22, 0, 0),
      radius: 3.5,
      height: 2.0,
    });

    // 8. THREE TRAINING TARGET DUMMIES in Southern practice court
    const dummyLocations = [
      new THREE.Vector3(-10, 0, 20),
      new THREE.Vector3(0, 0, 22),
      new THREE.Vector3(10, 0, 20),
    ];

    dummyLocations.forEach((pos, idx) => {
      const dummyGroup = new THREE.Group();
      dummyGroup.position.copy(pos);

      // Carved stone plinth beneath dummy
      const dPlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 1.2, 0.3, 12),
        plinthMat
      );
      dPlinth.position.set(0, 0.15, 0);
      dPlinth.receiveShadow = true;
      dummyGroup.add(dPlinth);

      // Wooden Post Stand
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 2.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 })
      );
      post.position.set(0, 1.1, 0);
      post.castShadow = true;
      dummyGroup.add(post);

      // Crossbar arms
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 })
      );
      arm.rotation.z = Math.PI / 2;
      arm.position.set(0, 1.6, 0);
      arm.castShadow = true;
      dummyGroup.add(arm);

      // Straw / Canvas Torso Target
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.45, 1.2, 12),
        new THREE.MeshStandardMaterial({
          color: 0xca8a04,
          roughness: 0.9,
        })
      );
      torso.position.set(0, 1.6, 0);
      torso.castShadow = true;
      dummyGroup.add(torso);

      // Target Bullseye Disc
      const targetDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.4, 16),
        new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
      );
      targetDisc.position.set(0, 1.6, -0.46);
      dummyGroup.add(targetDisc);

      // Straw Head with Helm
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.9 })
      );
      head.position.set(0, 2.5, 0);
      head.castShadow = true;
      dummyGroup.add(head);

      const helm = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 })
      );
      helm.position.set(0, 2.8, 0);
      helm.castShadow = true;
      dummyGroup.add(helm);

      group.add(dummyGroup);

      trainingDummies.push({
        id: `dummy_${idx}`,
        position: pos.clone().add(new THREE.Vector3(0, 1.5, 0)),
        mesh: dummyGroup,
        targetMesh: torso,
        originalMaterial: torso.material,
        hp: 500,
        maxHp: 500,
        radius: 1.2,
        isHit: false,
        hitTimer: 0,
      });
    });

    // 9. Strategic Practice Barrels & Crystals in the Hub
    const barrelPositions = [
      new THREE.Vector3(-18, 1.2, 12),
      new THREE.Vector3(-14, 1.2, 16),
      new THREE.Vector3(18, 1.2, 14),
      new THREE.Vector3(-22, 1.2, -10),
    ];

    const crystalPositions = [
      new THREE.Vector3(-18, 2.2, -14),
      new THREE.Vector3(18, 2.2, -14),
      new THREE.Vector3(0, 2.2, 12),
    ];

    return {
      levelGroup: group,
      torches,
      runeCircle,
      portals,
      fountains,
      trainingDummies,
      pillars,
      barrelPositions,
      crystalPositions,
      enemySpawnPoints: [], // Safe place! No hostile spawns in Hub
      roomBounds,
      themeName: 'Sun Temple Sanctuary',
      skyColor: 0x5ba3e8,
      fogColor: 0xa0c9ec,
      ambientColor: 0x9bc2e8,
      dirLightColor: 0xfff6e2,
      sunLightIntensity: 3.8,
    };
  }

  /**
   * Generates a Procedural Open-Air Sunken Temple Courtyard Floor based on Depth (No Roof)
   */
  public static generateProceduralDungeon(floorNumber: number): GeneratedLevel {
    const { sunFloor, vortex } = this.getTextures();
    const group = new THREE.Group();
    const torches: { light: THREE.PointLight; baseIntensity: number }[] = [];
    const portals: PortalEntity[] = [];
    const pillars: PillarObstacle[] = [];

    // Cycle open-air sun temple themes by floor
    const themes = [
      {
        name: 'Sunken Courtyard of Dawn',
        floorColor: 0xede2cf,
        wallColor: 0xd8c8af,
        pillarColor: 0xeae0cc,
        torchColor: 0xf59e0b,
        skyColor: 0x64a3de,
        fogColor: 0xb2ceeb,
        ambientColor: 0x9bc1e8,
        dirLightColor: 0xffeed5,
        sunLightIntensity: 3.5,
      },
      {
        name: 'Solarium of High Noon',
        floorColor: 0xf7f0e4,
        wallColor: 0xe2dcd1,
        pillarColor: 0xf5eee4,
        torchColor: 0xfbbf24,
        skyColor: 0x4794df,
        fogColor: 0x9bc7f2,
        ambientColor: 0xa4cefd,
        dirLightColor: 0xffffff,
        sunLightIntensity: 4.0,
      },
      {
        name: 'Ruins of Sol Invictus',
        floorColor: 0xe8dcbf,
        wallColor: 0xd0c0a5,
        pillarColor: 0xe2d4b8,
        torchColor: 0xf97316,
        skyColor: 0x589bdc,
        fogColor: 0xb7d1e8,
        ambientColor: 0x9ec4ea,
        dirLightColor: 0xfff0d4,
        sunLightIntensity: 3.6,
      },
      {
        name: 'Celestial Acropolis',
        floorColor: 0xe0e8ea,
        wallColor: 0xc4d4d6,
        pillarColor: 0xdde9ec,
        torchColor: 0x38bdf8,
        skyColor: 0x3b89de,
        fogColor: 0x91c1ee,
        ambientColor: 0x9bc5f5,
        dirLightColor: 0xfffaee,
        sunLightIntensity: 3.8,
      },
    ];

    const theme = themes[(floorNumber - 1) % themes.length];
    const roomBounds = 36;
    const roomSize = 78;
    const wallHeight = 3.4; // Low temple courtyard boundary, open to the heavens!

    // 1. Procedural Sun Temple Floor
    const floorGeo = new THREE.PlaneGeometry(roomSize, roomSize, 16, 16);
    const floorMat = new THREE.MeshStandardMaterial({
      map: sunFloor,
      roughness: 0.78,
      metalness: 0.12,
      color: theme.floorColor,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // 2. Perimeter Sunken Temple Walls (No Roof - open sky above!)
    const wallMat = new THREE.MeshStandardMaterial({
      color: theme.wallColor,
      roughness: 0.85,
      metalness: 0.1,
    });
    const wallCapMat = new THREE.MeshStandardMaterial({
      color: theme.pillarColor,
      roughness: 0.75,
      metalness: 0.1,
    });

    const createDungeonWall = (x: number, z: number, w: number, d: number) => {
      const wallGroup = new THREE.Group();
      wallGroup.position.set(x, 0, z);

      const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), wallMat);
      m.position.set(0, wallHeight / 2, 0);
      m.castShadow = true;
      m.receiveShadow = true;
      wallGroup.add(m);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.4, d + 0.4), wallCapMat);
      cap.position.set(0, wallHeight + 0.2, 0);
      cap.castShadow = true;
      cap.receiveShadow = true;
      wallGroup.add(cap);

      return wallGroup;
    };

    group.add(createDungeonWall(0, -roomSize / 2, roomSize + 2, 3));
    group.add(createDungeonWall(0, roomSize / 2, roomSize + 2, 3));
    group.add(createDungeonWall(roomSize / 2, 0, 3, roomSize + 2));
    group.add(createDungeonWall(-roomSize / 2, 0, 3, roomSize + 2));

    // 3. Procedural Interior Pillar Architecture (Fluted classical temple columns with collision)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: theme.pillarColor,
      roughness: 0.72,
      metalness: 0.1,
    });

    const pillarLayoutType = (floorNumber % 3);
    const pillarPositions: THREE.Vector3[] = [];

    if (pillarLayoutType === 0) {
      // Quad Monoliths: 4 large pillars with tactical flanking
      const dist = 16;
      pillarPositions.push(
        new THREE.Vector3(-dist, 0, -dist),
        new THREE.Vector3(dist, 0, -dist),
        new THREE.Vector3(-dist, 0, dist),
        new THREE.Vector3(dist, 0, dist)
      );
    } else if (pillarLayoutType === 1) {
      // Grand Colonnade: 6 pillars forming a central arena lane
      pillarPositions.push(
        new THREE.Vector3(-14, 0, -18),
        new THREE.Vector3(14, 0, -18),
        new THREE.Vector3(-14, 0, -18),
        new THREE.Vector3(-14, 0, 0),
        new THREE.Vector3(14, 0, 0),
        new THREE.Vector3(-14, 0, 18),
        new THREE.Vector3(14, 0, 18)
      );
    } else {
      // Ring of 8 Fortified Pillars
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI * 2) / 8;
        pillarPositions.push(new THREE.Vector3(Math.cos(ang) * 20, 0, Math.sin(ang) * 20));
      }
    }

    const pRadius = 1.7;
    const pHeight = 11;

    pillarPositions.forEach((pos, pIdx) => {
      const pGroup = new THREE.Group();
      pGroup.position.copy(pos);

      // Stepped square plinth base
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 3.6), wallMat);
      base.position.set(0, 0.4, 0);
      base.castShadow = true;
      base.receiveShadow = true;
      pGroup.add(base);

      // Fluted column shaft
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(pRadius * 0.95, pRadius * 1.1, pHeight, 16),
        pillarMat
      );
      shaft.position.set(0, 0.8 + pHeight / 2, 0);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      pGroup.add(shaft);

      // Column capital
      const capital = new THREE.Mesh(
        new THREE.CylinderGeometry(pRadius * 1.35, pRadius * 0.95, 0.8, 16),
        pillarMat
      );
      capital.position.set(0, 0.8 + pHeight + 0.4, 0);
      capital.castShadow = true;
      capital.receiveShadow = true;
      pGroup.add(capital);

      const capAbacus = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 3.4), wallCapMat);
      capAbacus.position.set(0, 0.8 + pHeight + 1.05, 0);
      capAbacus.castShadow = true;
      capAbacus.receiveShadow = true;
      pGroup.add(capAbacus);

      // Torch Sconce
      const sconce = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.15, 0.9, 8),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85 })
      );
      sconce.position.set(0, 5.5, pRadius + 0.3);
      pGroup.add(sconce);

      // Themed Torch Light
      const torchLight = new THREE.PointLight(theme.torchColor, 2.0, 18, 1.2);
      torchLight.position.set(pos.x, 6.2, pos.z + pRadius + 0.3);
      group.add(torchLight);
      torches.push({ light: torchLight, baseIntensity: 2.0 });

      group.add(pGroup);

      // Register obstacle for player, enemy, and projectile collision
      pillars.push({
        id: `dungeon_pillar_${pIdx}`,
        position: pos.clone(),
        radius: pRadius + 0.1,
        height: pHeight + 2,
      });
    });

    // 4. NORTH GATE (DESCENT TO NEXT FLOOR OR SANCTUARY ON FLOOR 10/20/...)
    const descentGroup = new THREE.Group();
    descentGroup.position.set(0, 0, -28);

    const archPillarMat = new THREE.MeshStandardMaterial({
      color: theme.pillarColor,
      roughness: 0.6,
      metalness: 0.2,
    });
    const leftArch = new THREE.Mesh(new THREE.BoxGeometry(1.4, 8.0, 1.4), archPillarMat);
    leftArch.position.set(-3, 4.0, 0);
    leftArch.castShadow = true;
    leftArch.receiveShadow = true;
    descentGroup.add(leftArch);

    const rightArch = leftArch.clone();
    rightArch.position.set(3, 4.0, 0);
    descentGroup.add(rightArch);

    const archTop = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.4, 1.6), archPillarMat);
    archTop.position.set(0, 8.4, 0);
    archTop.castShadow = true;
    archTop.receiveShadow = true;
    descentGroup.add(archTop);

    const isMilestoneFloor = floorNumber > 0 && floorNumber % 10 === 0;

    const descentVortexMat = new THREE.MeshBasicMaterial({
      map: vortex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      opacity: 0.4, // dimmer when inactive
      depthWrite: false,
      color: isMilestoneFloor ? 0x34d399 : 0xffffff,
    });
    const descentVortex = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 6.0), descentVortexMat);
    descentVortex.position.set(0, 4.0, 0);
    descentGroup.add(descentVortex);

    const descentLight = new THREE.PointLight(isMilestoneFloor ? 0x10b981 : 0xf59e0b, 1.5, 12);
    descentLight.position.set(0, 4.0, 0);
    descentGroup.add(descentLight);

    group.add(descentGroup);

    portals.push({
      id: isMilestoneFloor ? `sanctuary_portal_floor_${floorNumber}` : `descent_portal_floor_${floorNumber}`,
      type: isMilestoneFloor ? 'sanctuary' : 'descent',
      position: new THREE.Vector3(0, 1.7, -28),
      mesh: descentGroup,
      vortexMesh: descentVortex,
      light: descentLight,
      active: false, // will activate upon defeating floor hostiles
      prompt: isMilestoneFloor
        ? 'ENTER SANCTUARY OF THE SUN (10 Floors Cleared! Step In)'
        : `DESCEND TO FLOOR ${floorNumber + 1} (Step In)`,
      targetFloor: floorNumber + 1,
      triggerRadius: 3.5,
      label: isMilestoneFloor ? 'Sanctuary of the Sun (Milestone)' : `Floor ${floorNumber + 1} Descent`,
    });

    // Register descent portal gate posts for collision
    pillars.push({
      id: 'descent_arch_left',
      position: new THREE.Vector3(-3, 0, -28),
      radius: 1.3,
      height: 8.5,
    });
    pillars.push({
      id: 'descent_arch_right',
      position: new THREE.Vector3(3, 0, -28),
      radius: 1.3,
      height: 8.5,
    });

    // 5. Procedural Barrel Locations (Strategic clusters)
    const barrelPositions: THREE.Vector3[] = [
      new THREE.Vector3(-22, 1.2, -12),
      new THREE.Vector3(22, 1.2, -12),
      new THREE.Vector3(-20, 1.2, 16),
      new THREE.Vector3(20, 1.2, 16),
      new THREE.Vector3(-8, 1.2, -4),
      new THREE.Vector3(8, 1.2, 4),
    ];

    // 7. Procedural Mana Crystal Locations (Scarce/Tactical)
    const crystalPositions: THREE.Vector3[] = [
      new THREE.Vector3(-25, 2.2, -22),
      new THREE.Vector3(25, 2.2, -22),
      new THREE.Vector3(-24, 2.2, 22),
      new THREE.Vector3(24, 2.2, 22),
    ];

    // 8. Enemy Summoning Rifts (4 perimeter corners)
    const enemySpawnPoints: THREE.Vector3[] = [
      new THREE.Vector3(-28, 0.2, -26),
      new THREE.Vector3(28, 0.2, -26),
      new THREE.Vector3(-28, 0.2, 24),
      new THREE.Vector3(28, 0.2, 24),
      new THREE.Vector3(0, 0.2, -24),
      new THREE.Vector3(0, 0.2, 24),
    ];

    return {
      levelGroup: group,
      torches,
      runeCircle: null,
      portals,
      fountains: [],
      trainingDummies: [],
      pillars,
      barrelPositions,
      crystalPositions,
      enemySpawnPoints,
      roomBounds,
      themeName: theme.name,
      skyColor: theme.skyColor,
      fogColor: theme.fogColor,
      ambientColor: theme.ambientColor,
      dirLightColor: theme.dirLightColor,
      sunLightIntensity: theme.sunLightIntensity,
    };
  }
}
