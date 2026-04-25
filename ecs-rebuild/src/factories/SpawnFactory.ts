/**
 * SpawnFactory
 *
 * Factory for creating entities with safe spawn positions.
 * Handles position validation, terrain checking, and distribution logic.
 *
 * @module factories
 */

export interface SpawnConfig {
  safeRadius?: number;
  minDistance: number;
  maxAttempts: number;
  fallbackZones: Array<{ radius: number; attempts: number }>;
  minSpawnRadius?: number;
  maxSpawnRadius?: number;
  groupSize?: { min: number; max: number };
}

export interface SpawnPosition {
  x: number;
  y: number;
  z: number;
}

export interface TerrainHeightFn {
  (x: number, z: number): number;
}

export interface SpawnFactoryOptions {
  getTerrainHeight: TerrainHeightFn;
  isTerrainSlopeAcceptable?: (x: number, z: number, threshold: number) => boolean;
  hasObstacles?: (x: number, y: number, z: number) => boolean;
}

/**
 * Default spawn configurations
 */
const DEFAULT_CONFIGS: Record<string, SpawnConfig> = {
  villager: {
    safeRadius: 50,
    minDistance: 3,
    maxAttempts: 10,
    fallbackZones: [
      { radius: 50, attempts: 10 },
      { radius: 75, attempts: 5 },
      { radius: 100, attempts: 3 }
    ]
  },
  zombie: {
    minSpawnRadius: 80,
    maxSpawnRadius: 150,
    minDistance: 5,
    maxAttempts: 15,
    groupSize: { min: 2, max: 4 },
    fallbackZones: [
      { radius: 100, attempts: 8 },
      { radius: 125, attempts: 5 },
      { radius: 150, attempts: 3 }
    ]
  },
  animal: {
    safeRadius: 30,
    minDistance: 2,
    maxAttempts: 8,
    fallbackZones: [
      { radius: 30, attempts: 8 },
      { radius: 50, attempts: 5 }
    ]
  }
};

/**
 * Factory for creating entities with safe spawn positions
 */
export class SpawnFactory {
  private getTerrainHeight: TerrainHeightFn;
  private isTerrainSlopeAcceptable?: (x: number, z: number, threshold: number) => boolean;
  private hasObstacles?: (x: number, y: number, z: number) => boolean;

  private spawnPoints: Map<string, SpawnPosition[]> = new Map();

  constructor(options: SpawnFactoryOptions) {
    this.getTerrainHeight = options.getTerrainHeight;
    this.isTerrainSlopeAcceptable = options.isTerrainSlopeAcceptable;
    this.hasObstacles = options.hasObstacles;
  }

  /**
   * Gets spawn configuration for an entity type
   */
  getConfig(type: string): SpawnConfig {
    return DEFAULT_CONFIGS[type] || DEFAULT_CONFIGS.animal;
  }

  /**
   * Finds a safe spawn position for a single entity
   */
  findSpawnPosition(
    type: string,
    existingPoints: SpawnPosition[] = []
  ): SpawnPosition | null {
    const config = this.getConfig(type);
    const BABYLON = (window as any).BABYLON;

    // Try primary spawn zone
    const position = this.findSafePosition(
      config.safeRadius || config.maxSpawnRadius!,
      config.minDistance,
      existingPoints,
      false,
      config.maxAttempts,
      config.minSpawnRadius
    );

    if (position) return position;

    // Try fallback zones
    for (const zone of config.fallbackZones) {
      const fallbackPosition = this.findSafePosition(
        zone.radius,
        config.minDistance * 0.8,
        existingPoints,
        true,
        zone.attempts,
        config.minSpawnRadius ? config.minSpawnRadius * 0.9 : 0
      );

      if (fallbackPosition) return fallbackPosition;
    }

    // Last resort: Find least crowded position
    return this.findLeastCrowdedPosition(
      existingPoints,
      config.safeRadius || config.maxSpawnRadius!,
      config.minDistance * 0.6,
      config.minSpawnRadius ? config.minSpawnRadius * 0.8 : 0
    );
  }

  /**
   * Finds a safe position within a radius
   */
  private findSafePosition(
    radius: number,
    minDistance: number,
    existingPoints: SpawnPosition[],
    isFallback: boolean = false,
    maxAttempts: number = 10,
    minRadius: number = 0
  ): SpawnPosition | null {
    for (let i = 0; i < maxAttempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = minRadius + Math.random() * (radius - minRadius);
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      if (this.isPositionSafe(x, z, existingPoints, minDistance, isFallback)) {
        const y = this.getTerrainHeight(x, z);
        return { x, y, z };
      }
    }

    return null;
  }

  /**
   * Checks if a position is safe for spawning
   */
  private isPositionSafe(
    x: number,
    z: number,
    existingPoints: SpawnPosition[],
    minDistance: number,
    isFallback: boolean = false
  ): boolean {
    const y = this.getTerrainHeight(x, z);
    if (y === undefined || y === null) return false;

    // Check slope
    const slopeThreshold = isFallback ? 0.8 : 0.5;
    if (this.isTerrainSlopeAcceptable) {
      if (!this.isTerrainSlopeAcceptable(x, z, slopeThreshold)) {
        return false;
      }
    }

    // Check distance from existing points
    for (const point of existingPoints) {
      const dx = x - point.x;
      const dz = z - point.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < minDistance) {
        return false;
      }
    }

    // Check for obstacles
    if (this.hasObstacles && this.hasObstacles(x, y, z)) {
      return false;
    }

    return true;
  }

  /**
   * Finds the least crowded position
   */
  private findLeastCrowdedPosition(
    existingPoints: SpawnPosition[],
    maxRadius: number,
    minDistance: number,
    minRadius: number = 0
  ): SpawnPosition | null {
    let bestPosition: SpawnPosition | null = null;
    let bestScore = -Infinity;

    // Sample multiple positions to find the least crowded
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = minRadius + Math.random() * (maxRadius - minRadius);
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      if (this.isPositionSafe(x, z, existingPoints, minDistance, true)) {
        // Calculate score based on distance from other points
        let score = 0;
        for (const point of existingPoints) {
          const dx = x - point.x;
          const dz = z - point.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          score += dist;
        }

        if (score > bestScore) {
          bestScore = score;
          bestPosition = { x, y: this.getTerrainHeight(x, z), z };
        }
      }
    }

    return bestPosition;
  }

  /**
   * Tracks spawn points for an entity type
   */
  addSpawnPoint(type: string, position: SpawnPosition): void {
    if (!this.spawnPoints.has(type)) {
      this.spawnPoints.set(type, []);
    }
    this.spawnPoints.get(type)!.push(position);
  }

  /**
   * Gets all spawn points for an entity type
   */
  getSpawnPoints(type: string): SpawnPosition[] {
    return this.spawnPoints.get(type) || [];
  }

  /**
   * Clears all spawn points for an entity type
   */
  clearSpawnPoints(type: string): void {
    this.spawnPoints.delete(type);
  }

  /**
   * Clears all tracked spawn points
   */
  clearAllSpawnPoints(): void {
    this.spawnPoints.clear();
  }

  /**
   * Generates a random position within a circle
   */
  randomPositionInCircle(center: SpawnPosition, radius: number): SpawnPosition {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y,
      z: center.z + Math.sin(angle) * distance
    };
  }

  /**
   * Generates a random position in a ring (donut shape)
   */
  randomPositionInRing(center: SpawnPosition, minRadius: number, maxRadius: number): SpawnPosition {
    const angle = Math.random() * Math.PI * 2;
    const distance = minRadius + Math.random() * (maxRadius - minRadius);
    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y,
      z: center.z + Math.sin(angle) * distance
    };
  }
}

/**
 * Factory function for creating SpawnFactory instances
 */
export function createSpawnFactory(options: SpawnFactoryOptions): SpawnFactory {
  return new SpawnFactory(options);
}
