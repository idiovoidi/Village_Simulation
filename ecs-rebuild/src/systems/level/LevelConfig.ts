/**
 * Level Configuration
 * 
 * Defines all available levels for the simulation.
 * Ported from MyHavokSimCode/LevelSystem/LevelConfig.js
 */

/**
 * Level configuration interface
 */
export interface LevelConfiguration {
  name: string;
  description: string;
  config: LevelConfigData;
}

/**
 * Level data structure
 */
export interface LevelConfigData {
  bowlRadius: number;
  bowlDepth: number;
  villageRadius: number;
  houseCount: number;
  dogCount: number;
  birdCount: number;
  waterLevel: number;
  fishCount: number;
  zombieCount: number;
  hasVillage: boolean;
  hasWater: boolean;
  hasBirds: boolean;
  hasFish: boolean;
  hasZombies: boolean;
  hasDogs: boolean;
  hasClouds: boolean;
  hasMoon: boolean;
  /** Bay/lake carved into one side of the bowl (angle in radians from +X). */
  bay?: { angle: number; width: number; depth: number };
  /** Instanced woodland outside the village (trees). */
  forestDensity?: number;
  /** Boats on the water (coastal scenarios). */
  boatCount?: number;
  /** Hour of day (0-24) the scenario starts at. */
  startHour?: number;
  zombieAggressiveness?: number;
  specialEffects?: {
    fog: boolean;
    bloodParticles: boolean;
    redSky: boolean;
  };
}

/**
 * Predefined level configurations
 */
export const LEVELS: Record<string, LevelConfiguration> = {
  ZOMBIE_APOCALYPSE: {
    name: 'Zombie Apocalypse',
    description: 'A dark version of the village overrun by zombies',
    config: {
      bowlRadius: 100,
      bowlDepth: 30,
      villageRadius: 60,
      houseCount: 10,
      dogCount: 0,
      birdCount: 5,
      waterLevel: -5,
      fishCount: 0,
      zombieCount: 20,
      hasVillage: true,
      hasWater: true,
      hasBirds: true,
      hasFish: false,
      hasZombies: true,
      hasDogs: false,
      hasClouds: false,
      hasMoon: true,
      startHour: 17.5,
      forestDensity: 0.9,
      zombieAggressiveness: 1.0,
      specialEffects: { fog: true, bloodParticles: false, redSky: true },
    },
  },
  NATURE: {
    name: 'Nature Reserve',
    description: 'A peaceful natural environment with birds and fish',
    config: {
      bowlRadius: 120,
      bowlDepth: 20,
      villageRadius: 0,
      houseCount: 0,
      dogCount: 0,
      birdCount: 30,
      waterLevel: -1,
      fishCount: 40,
      zombieCount: 0,
      hasVillage: false,
      hasWater: true,
      hasBirds: true,
      hasFish: true,
      hasZombies: false,
      hasDogs: false,
      hasClouds: true,
      hasMoon: true,
      startHour: 6.5,
      bay: { angle: Math.PI, width: 0.95, depth: 5 },
      forestDensity: 1.6,
    },
  },
  COASTAL: {
    name: 'Coastal Village',
    description: 'A seaside village with boats and fishing',
    config: {
      bowlRadius: 150,
      bowlDepth: 35,
      villageRadius: 50,
      houseCount: 12,
      dogCount: 2,
      birdCount: 20,
      waterLevel: -8,
      fishCount: 50,
      zombieCount: 0,
      hasVillage: true,
      hasWater: true,
      hasBirds: true,
      hasFish: true,
      hasZombies: false,
      hasDogs: true,
      hasClouds: true,
      hasMoon: true,
      boatCount: 3,
      bay: { angle: 0, width: 1.25, depth: 9 },
      forestDensity: 0.6,
      startHour: 15,
    },
  },
};

/**
 * LevelConfig class for managing level configurations
 */
export class LevelConfig {
  private static currentLevelKey: string = 'COASTAL';

  /**
   * Get the current level configuration
   */
  static getCurrentLevel(): LevelConfiguration | null {
    return LEVELS[this.currentLevelKey] || null;
  }

  /**
   * Get a level by key
   */
  static getLevel(key: string): LevelConfiguration | null {
    return LEVELS[key] || null;
  }

  /**
   * Get all available levels
   */
  static getAllLevels(): Record<string, LevelConfiguration> {
    return { ...LEVELS };
  }

  /**
   * Get level keys
   */
  static getLevelKeys(): string[] {
    return Object.keys(LEVELS);
  }

  /**
   * Set the current level
   */
  static setCurrentLevel(key: string): boolean {
    if (LEVELS[key]) {
      this.currentLevelKey = key;
      return true;
    }
    return false;
  }

  /**
   * Get current level key
   */
  static getCurrentLevelKey(): string {
    return this.currentLevelKey;
  }

  /**
   * Get level config data
   */
  static getLevelConfig(key: string): LevelConfigData | null {
    const level = LEVELS[key];
    return level?.config || null;
  }
}
