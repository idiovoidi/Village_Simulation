export interface LevelDetails {
  name: string;
  description: string;
  config: {
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
      fog?: boolean;
      bloodParticles?: boolean;
      redSky?: boolean;
    };
  };
}

export class LevelConfig {
  static Levels: Record<string, LevelDetails>;
  static getCurrentLevel(): LevelDetails | undefined;
  static setCurrentLevel(levelName: string): boolean;
  static getAllLevels(): Array<{ id: string; name: string; description: string }>;
}
