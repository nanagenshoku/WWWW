export type SpellId = 'pyro_blast' | 'inferno_orb' | 'flame_triad' | 'meteor_strike';

export interface SpellConfig {
  id: SpellId;
  name: string;
  description: string;
  manaCost: number;
  cooldownMs: number;
  speed: number;
  damage: number;
  splashRadius: number;
  chargeable?: boolean;
  maxChargeTimeMs?: number;
  color: string;
  emissiveColor: string;
  iconName: string;
}

export type EnemyType = 'frost_crawler' | 'ice_golem' | 'shadow_specter' | 'fire_imp';

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  maxHp: number;
  speed: number;
  damage: number;
  scoreValue: number;
  scale: number;
  color: string;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
  createdAt: number;
}

export interface GameStats {
  score: number;
  highScore: number;
  wave: number;
  kills: number;
  totalDamage: number;
  accuracy: number;
  shotsFired: number;
  shotsHit: number;
  highestCombo: number;
}

export interface PlayerStatus {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  activeSpell: SpellId;
  chargeProgress: number; // 0 to 1
  isCharging: boolean;
  combo: number;
  comboMultiplier: number;
  comboTimer: number; // 0 to 1
}

export type LocationType = 'hub' | 'dungeon';

export interface LevelInfo {
  type: LocationType;
  floor: number;
  name: string;
  themeName: string;
  enemiesRemaining: number;
  totalEnemies: number;
  floorCleared: boolean;
  canEnterPortal: boolean;
  portalPrompt: string | null;
}

export type RadarBlipType = 'enemy' | 'crystal' | 'barrel' | 'portal' | 'fountain' | 'dummy' | 'pillar';

export interface RadarBlip {
  id: string;
  x: number;
  z: number;
  type: RadarBlipType;
  label?: string;
  threat?: boolean;
}

export interface RadarData {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  blips: RadarBlip[];
  enemiesBehind: number;
}
