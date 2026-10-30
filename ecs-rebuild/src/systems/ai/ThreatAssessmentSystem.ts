/**
 * Threat Assessment System
 * 
 * Evaluates threats in the environment and updates Threat components.
 * Detects dangerous entities (zombies) and calculates danger levels.
 * Influences behavior decisions through threat awareness.
 * 
 * Requirements: 6.2
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { ComponentSignature } from '../../core/Component.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { ThreatComponent } from '../../components/AIComponents.ts';
import type { ZombieComponent, VillagerComponent } from '../../components/CreatureComponents.ts';
import type { PositionComponent } from '../../components/CoreComponents.ts';
import { SpatialGrid } from '../../utils/SpatialGrid.ts';

/**
 * Configuration for threat assessment.
 */
const THREAT_CONFIG = {
  DETECTION_RADIUS: 30, // How far entities can detect threats
  ZOMBIE_BASE_DANGER: 0.8, // Base danger level for zombies
  DISTANCE_FALLOFF: 0.5, // How quickly danger decreases with distance
  MEMORY_DURATION: 10, // How long to remember threats (seconds)
  UPDATE_INTERVAL: 0.5 // How often to update threats (seconds)
} as const;

/**
 * System that evaluates environmental threats and updates threat awareness.
 */
export class ThreatAssessmentSystem extends System {
  readonly componentSignature: ComponentSignature = new Set([
    'Threat',
    'Position'
  ]);
  readonly priority = 108; // Before decision system

  private spatialGrid: SpatialGrid;
  // @ts-expect-error - Reserved for future zombie coordination features
  private zombieEntities: EntityId[] = [];
  private updateTimer = 0;

  constructor(world: World, spatialGrid?: SpatialGrid) {
    super(world);
    this.spatialGrid = spatialGrid || new SpatialGrid(20);
  }

  initialize(): void {
    // Build initial spatial grid
    this.updateSpatialGrid();
  }

  update(deltaTime: number): void {
    // Update on interval to reduce computational cost
    this.updateTimer += deltaTime;
    if (this.updateTimer < THREAT_CONFIG.UPDATE_INTERVAL) {
      return;
    }
    this.updateTimer = 0;

    // Update spatial grid and zombie list
    this.updateSpatialGrid();
    this.updateZombieList();

    const entities = this.queryEntities();

    for (const entityId of entities) {
      this.assessThreats(entityId, deltaTime);
    }
  }

  /**
   * Updates the spatial grid with current entity positions.
   */
  private updateSpatialGrid(): void {
    this.spatialGrid.clear();

    const allEntities = this.world.getAllEntities();
    for (const entityId of allEntities) {
      const position = this.world.getComponent<PositionComponent>(entityId, 'Position');
      if (position) {
        this.spatialGrid.insert(entityId, position);
      }
    }
  }

  /**
   * Updates the list of zombie entities.
   */
  private updateZombieList(): void {
    // Keep for future use (e.g., zombie coordination)
    this.zombieEntities = this.world.query(new Set(['Zombie', 'Position']));
  }

  /**
   * Assesses threats for a single entity.
   */
  private assessThreats(entityId: EntityId, deltaTime: number): void {
    const threat = this.world.getComponent<ThreatComponent>(entityId, 'Threat');
    const position = this.world.getComponent<PositionComponent>(entityId, 'Position');

    if (!threat || !position) return;

    // Age existing threats
    this.ageThreats(threat, deltaTime);

    // Detect new threats
    this.detectThreats(entityId, position, threat);

    // Calculate highest threat level
    this.updateHighestThreatLevel(threat);
  }

  /**
   * Ages existing threats and removes expired ones.
   */
  private ageThreats(threat: ThreatComponent, _deltaTime: number): void {
    const currentTime = Date.now() / 1000; // Convert to seconds

    // Remove threats that are too old or no longer exist
    threat.threats = threat.threats.filter(t => {
      const age = currentTime - t.lastSeenTime;
      if (age > THREAT_CONFIG.MEMORY_DURATION) {
        return false; // Too old, forget it
      }

      // Check if threat entity still exists
      const entity = this.world.getEntity(t.entityId);
      if (!entity || !entity.active) {
        return false; // Entity no longer exists
      }

      return true;
    });
  }

  /**
   * Detects new threats in the environment.
   */
  private detectThreats(
    entityId: EntityId,
    position: PositionComponent,
    threat: ThreatComponent
  ): void {
    // Only villagers assess threats (for now)
    const villager = this.world.getComponent<VillagerComponent>(entityId, 'Villager');
    if (!villager) return;

    // Query nearby entities
    const nearbyEntities = this.spatialGrid.query(position, THREAT_CONFIG.DETECTION_RADIUS);

    const currentTime = Date.now() / 1000;

    for (const nearbyId of nearbyEntities) {
      // Skip self
      if (nearbyId === entityId) continue;

      // Check if entity is a zombie
      const zombie = this.world.getComponent<ZombieComponent>(nearbyId, 'Zombie');
      if (!zombie) continue;

      // Get zombie position
      const zombiePosition = this.world.getComponent<PositionComponent>(nearbyId, 'Position');
      if (!zombiePosition) continue;

      // Calculate danger level based on distance
      const distance = this.calculateDistance(position, zombiePosition);
      const dangerLevel = this.calculateDangerLevel(distance, zombie);

      // Update or add threat
      this.updateThreat(threat, nearbyId, zombiePosition, dangerLevel, currentTime);
    }
  }

  /**
   * Calculates danger level based on distance and zombie properties.
   */
  private calculateDangerLevel(distance: number, zombie: ZombieComponent): number {
    // Base danger from zombie aggression
    let danger = THREAT_CONFIG.ZOMBIE_BASE_DANGER * zombie.aggressionLevel;

    // Reduce danger with distance
    const distanceFactor = 1 - (distance / THREAT_CONFIG.DETECTION_RADIUS);
    danger *= Math.max(0, distanceFactor) ** THREAT_CONFIG.DISTANCE_FALLOFF;

    // If zombie is targeting this entity, increase danger
    // (This would require passing entityId, but we'll keep it simple for now)

    return Math.max(0, Math.min(1, danger));
  }

  /**
   * Updates or adds a threat to the threat list.
   */
  private updateThreat(
    threat: ThreatComponent,
    threatEntityId: EntityId,
    threatPosition: PositionComponent,
    dangerLevel: number,
    currentTime: number
  ): void {
    // Find existing threat
    const existingThreat = threat.threats.find(t => t.entityId === threatEntityId);

    if (existingThreat) {
      // Update existing threat
      existingThreat.dangerLevel = dangerLevel;
      existingThreat.lastSeenPosition = {
        x: threatPosition.x,
        y: threatPosition.y,
        z: threatPosition.z
      };
      existingThreat.lastSeenTime = currentTime;
    } else {
      // Add new threat
      threat.threats.push({
        entityId: threatEntityId,
        dangerLevel,
        lastSeenPosition: {
          x: threatPosition.x,
          y: threatPosition.y,
          z: threatPosition.z
        },
        lastSeenTime: currentTime
      });
    }
  }

  /**
   * Updates the highest threat level.
   */
  private updateHighestThreatLevel(threat: ThreatComponent): void {
    if (threat.threats.length === 0) {
      threat.highestThreatLevel = 0;
      return;
    }

    threat.highestThreatLevel = Math.max(
      ...threat.threats.map(t => t.dangerLevel)
    );
  }

  /**
   * Calculates distance between two positions.
   */
  private calculateDistance(pos1: PositionComponent, pos2: PositionComponent): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Sets a custom spatial grid (useful for testing or sharing grid between systems).
   */
  setSpatialGrid(grid: SpatialGrid): void {
    this.spatialGrid = grid;
  }

  /**
   * Gets the spatial grid (useful for debugging).
   */
  getSpatialGrid(): SpatialGrid {
    return this.spatialGrid;
  }

  /**
   * Gets threat configuration (useful for testing).
   */
  static getThreatConfig(): typeof THREAT_CONFIG {
    return { ...THREAT_CONFIG };
  }
}
