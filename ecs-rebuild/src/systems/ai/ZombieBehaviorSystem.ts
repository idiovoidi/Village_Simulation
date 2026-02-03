/**
 * Zombie Behavior System
 * 
 * Manages zombie AI behaviors including target detection, chasing, and attacking.
 * Zombies detect nearby villagers and pursue them aggressively.
 * 
 * Requirements: 6.2
 */

import { System } from '../../core/System';
import type { World } from '../../core/World';
import type { ComponentSignature } from '../../core/Component';
import type { EntityId } from '../../core/Entity';
import { BehaviourState } from '../../components/AIComponents';
import type {
  AIBehaviourComponent,
  SteeringComponent
} from '../../components/AIComponents';
import type { ZombieComponent, VillagerComponent } from '../../components/CreatureComponents';
import type { PositionComponent, HealthComponent } from '../../components/CoreComponents';
import { SpatialGrid } from '../../utils/SpatialGrid';

/**
 * System that manages zombie behavior including detection, chasing, and attacking.
 */
export class ZombieBehaviorSystem extends System {
  readonly componentSignature: ComponentSignature = new Set([
    'Zombie',
    'Position',
    'AIBehaviour',
    'Steering'
  ]);
  readonly priority = 115; // After schedule system, before decision system

  private spatialGrid: SpatialGrid;
  // @ts-expect-error - Reserved for future zombie coordination features
  private villagerEntities: EntityId[] = [];

  constructor(world: World, spatialGrid?: SpatialGrid) {
    super(world);
    this.spatialGrid = spatialGrid || new SpatialGrid(20); // 20 unit cells
  }

  initialize(): void {
    // Build initial spatial grid with all entities
    this.updateSpatialGrid();
  }

  update(deltaTime: number): void {
    // Update spatial grid with current positions
    this.updateSpatialGrid();

    // Update villager entity list
    this.updateVillagerList();

    const zombies = this.queryEntities();

    for (const zombieId of zombies) {
      this.updateZombieBehavior(zombieId, deltaTime);
    }
  }

  /**
   * Updates the spatial grid with current entity positions.
   */
  private updateSpatialGrid(): void {
    // Clear and rebuild grid
    this.spatialGrid.clear();

    // Add all entities with positions
    const allEntities = this.world.getAllEntities();
    for (const entityId of allEntities) {
      const position = this.world.getComponent<PositionComponent>(entityId, 'Position');
      if (position) {
        this.spatialGrid.insert(entityId, position);
      }
    }
  }

  /**
   * Updates the list of villager entities.
   */
  private updateVillagerList(): void {
    // Keep for future use (e.g., zombie coordination, horde behavior)
    this.villagerEntities = this.world.query(new Set(['Villager', 'Position']));
  }

  /**
   * Updates behavior for a single zombie.
   */
  private updateZombieBehavior(zombieId: EntityId, deltaTime: number): void {
    const zombie = this.world.getComponent<ZombieComponent>(zombieId, 'Zombie');
    const position = this.world.getComponent<PositionComponent>(zombieId, 'Position');
    const behavior = this.world.getComponent<AIBehaviourComponent>(zombieId, 'AIBehaviour');
    const steering = this.world.getComponent<SteeringComponent>(zombieId, 'Steering');

    if (!zombie || !position || !behavior || !steering) return;

    // Update attack cooldown
    if (zombie.attackCooldown > 0) {
      zombie.attackCooldown -= deltaTime;
    }

    // Check if current target is still valid
    if (zombie.targetEntity !== null) {
      if (!this.isValidTarget(zombie.targetEntity)) {
        zombie.targetEntity = null;
      }
    }

    // Detect nearby villagers if no target
    if (zombie.targetEntity === null) {
      const nearestVillager = this.detectNearestVillager(zombieId, position, zombie.detectionRadius);
      if (nearestVillager) {
        zombie.targetEntity = nearestVillager;
      }
    }

    // Update behavior based on target
    if (zombie.targetEntity !== null) {
      this.chaseTarget(zombieId, zombie, position, steering);
      this.attemptAttack(zombieId, zombie, position, deltaTime);
    } else {
      // No target, wander
      if (behavior.currentState !== BehaviourState.Wander) {
        behavior.previousState = behavior.currentState;
        behavior.currentState = BehaviourState.Wander;
        behavior.stateTimer = 0;
      }
      steering.target = null;
    }
  }

  /**
   * Detects the nearest villager within detection radius.
   */
  private detectNearestVillager(
    zombieId: EntityId,
    zombiePosition: PositionComponent,
    detectionRadius: number
  ): EntityId | null {
    // Query spatial grid for nearby entities
    const nearbyEntities = this.spatialGrid.query(zombiePosition, detectionRadius);

    let nearestVillager: EntityId | null = null;
    let nearestDistance = detectionRadius;

    for (const entityId of nearbyEntities) {
      // Skip self
      if (entityId === zombieId) continue;

      // Check if entity is a villager
      const villager = this.world.getComponent<VillagerComponent>(entityId, 'Villager');
      if (!villager) continue;

      // Check if villager is alive
      const health = this.world.getComponent<HealthComponent>(entityId, 'Health');
      if (health && health.current <= 0) continue;

      // Calculate distance
      const villagerPosition = this.world.getComponent<PositionComponent>(entityId, 'Position');
      if (!villagerPosition) continue;

      const distance = this.calculateDistance(zombiePosition, villagerPosition);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestVillager = entityId;
      }
    }

    return nearestVillager;
  }

  /**
   * Checks if a target entity is still valid.
   */
  private isValidTarget(targetId: EntityId): boolean {
    // Check if entity still exists
    const entity = this.world.getEntity(targetId);
    if (!entity || !entity.active) return false;

    // Check if target is still a villager
    const villager = this.world.getComponent<VillagerComponent>(targetId, 'Villager');
    if (!villager) return false;

    // Check if target is still alive
    const health = this.world.getComponent<HealthComponent>(targetId, 'Health');
    if (health && health.current <= 0) return false;

    return true;
  }

  /**
   * Updates zombie to chase its target.
   */
  private chaseTarget(
    zombieId: EntityId,
    zombie: ZombieComponent,
    _zombiePosition: PositionComponent,
    steering: SteeringComponent
  ): void {
    const behavior = this.world.getComponent<AIBehaviourComponent>(zombieId, 'AIBehaviour');
    if (!behavior) return;

    // Get target position
    const targetPosition = this.world.getComponent<PositionComponent>(
      zombie.targetEntity!,
      'Position'
    );

    if (!targetPosition) {
      zombie.targetEntity = null;
      return;
    }

    // Update behavior to attack
    if (behavior.currentState !== BehaviourState.Attack) {
      behavior.previousState = behavior.currentState;
      behavior.currentState = BehaviourState.Attack;
      behavior.stateTimer = 0;
    }

    // Set steering target to chase
    steering.target = {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z
    };
  }

  /**
   * Attempts to attack the target if in range.
   */
  private attemptAttack(
    zombieId: EntityId,
    zombie: ZombieComponent,
    zombiePosition: PositionComponent,
    _deltaTime: number
  ): void {
    if (zombie.targetEntity === null) return;
    if (zombie.attackCooldown > 0) return;

    // Get target position
    const targetPosition = this.world.getComponent<PositionComponent>(
      zombie.targetEntity,
      'Position'
    );

    if (!targetPosition) return;

    // Check if in attack range (close enough)
    const distance = this.calculateDistance(zombiePosition, targetPosition);
    const attackRange = 2.0; // 2 units

    if (distance <= attackRange) {
      // Perform attack
      this.performAttack(zombieId, zombie, zombie.targetEntity);

      // Set attack cooldown
      zombie.attackCooldown = 1.0; // 1 second cooldown
    }
  }

  /**
   * Performs an attack on the target.
   */
  private performAttack(_zombieId: EntityId, zombie: ZombieComponent, targetId: EntityId): void {
    // Get target health
    const targetHealth = this.world.getComponent<HealthComponent>(targetId, 'Health');
    if (!targetHealth) return;

    // Apply damage
    targetHealth.current = Math.max(0, targetHealth.current - zombie.attackDamage);

    // Log attack for debugging
    // console.log(`Zombie ${_zombieId} attacked entity ${targetId} for ${zombie.attackDamage} damage`);

    // If target died, clear target
    if (targetHealth.current <= 0) {
      zombie.targetEntity = null;
    }
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
}
