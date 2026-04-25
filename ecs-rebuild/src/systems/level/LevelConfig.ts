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
  VILLAGE: {
    name: 'Village',
    description: 'A peaceful village with houses, dogs, and a central plaza',
    config: {
      bowlRadius: 100,
      bowlDepth: 25,
      villageRadius: 60,
      houseCount: 15,
      dogCount: 3,
      birdCount: 15,
      waterLevel: -2,
      fishCount: 20,
      zombieCount: 5,
      hasVillage: true,
      hasWater: true,
      hasBirds: true,
      hasFish: true,
      hasZombies: true,
      hasDogs: true,
      hasClouds: true,
      hasMoon: true,
    },
  },
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
    },
  },
  ZOMBIE_INVASION: {
    name: 'Zombie Invasion',
    description: 'A massive zombie horde invading the countryside',
    config: {
      bowlRadius: 120,
      bowlDepth: 35,
      villageRadius: 40,
      houseCount: 8,
      dogCount: 0,
      birdCount: 0,
      waterLevel: -10,
      fishCount: 0,
      zombieCount: 40,
      hasVillage: true,
      hasWater: true,
      hasBirds: false,
      hasFish: false,
      hasZombies: true,
      hasDogs: false,
      hasClouds: false,
      hasMoon: true,
      zombieAggressiveness: 1.5,
      specialEffects: {
        fog: true,
        bloodParticles: true,
        redSky: true,
      },
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
      zombieCount: 3,
      hasVillage: true,
      hasWater: true,
      hasBirds: true,
      hasFish: true,
      hasZombies: true,
      hasDogs: true,
      hasClouds: true,
      hasMoon: true,
    },
  },
};

/**
 * LevelConfig class for managing level configurations
 */
export class LevelConfig {
  private static currentLevelKey: string = 'VILLAGE';

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