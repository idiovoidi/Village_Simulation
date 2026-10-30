/**
 * Boat Navigation System
 *
 * Manages boat navigation including terrain avoidance, target selection, and water depth checking.
 * Boats navigate within safe water areas and avoid shallow terrain.
 *
 * @module systems/ai
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { ComponentSignature } from '../../core/Component.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { AIBehaviourComponent, SteeringComponent } from '../../components/AIComponents.ts';
import type { BoatComponent } from '../../components/CreatureComponents.ts';
import type { PositionComponent, VelocityComponent } from '../../components/CoreComponents.ts';

export interface BoatNavigationConfig {
  waterLevel: number;
  safeRadius: number;
  minWaterDepth: number;
  terrainCheckDistance: number;
  speed: number;
  turnSpeed: number;
  avoidanceStrength: number;
  getWaterDepth?: (x: number, z: number) => number;
  getTerrainHeight?: (x: number, z: number) => number;
}

/**
 * System that manages boat navigation and water awareness
 */
export class BoatNavigationSystem extends System {
  readonly componentSignature: ComponentSignature = new Set([
    'Boat',
    'Position',
    'Velocity',
    'AIBehaviour',
    'Steering'
  ]);
  readonly priority = 130; // After behavior systems, before steering

  private config: BoatNavigationConfig;

  constructor(world: World, config?: Partial<BoatNavigationConfig>) {
    super(world);
    this.config = {
      waterLevel: -8,
      safeRadius: 30,
      minWaterDepth: 3,
      terrainCheckDistance: 8,
      speed: 0.03,
      turnSpeed: 0.01,
      avoidanceStrength: 2.0,
      ...config
    };
  }

  update(deltaTime: number): void {
    const boats = this.queryEntities();

    for (const boatId of boats) {
      this.updateBoatNavigation(boatId, deltaTime);
    }
  }

  /**
   * Updates navigation for a single boat
   */
  private updateBoatNavigation(boatId: EntityId, _deltaTime: number): void {
    const boat = this.world.getComponent<BoatComponent>(boatId, 'Boat');
    const position = this.world.getComponent<PositionComponent>(boatId, 'Position');
    const velocity = this.world.getComponent<VelocityComponent>(boatId, 'Velocity');
    const behavior = this.world.getComponent<AIBehaviourComponent>(boatId, 'AIBehaviour');
    const steering = this.world.getComponent<SteeringComponent>(boatId, 'Steering');

    if (!boat || !position || !velocity || !behavior || !steering) return;

    // Get steering direction with terrain awareness
    const steeringDir = this.getSteeringDirection(boat, position, velocity);

    // Only move if we're in safe water
    if (this.isInSafeWater(position)) {
      steering.steeringForce = {
        x: steeringDir.x * this.config.speed,
        y: 0,
        z: steeringDir.z * this.config.speed
      };
    } else {
      // If in shallow water, reverse course
      this.reverseFromDanger(boat, position, steering);
    }
  }

  /**
   * Calculates steering direction considering terrain avoidance
   */
  private getSteeringDirection(boat: BoatComponent, position: PositionComponent, velocity: VelocityComponent): { x: number; y: number; z: number } {
    const direction = { x: 0, y: 0, z: 0 };

    // Get forward direction based on current velocity or rotation
    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vz * velocity.vz);
    let forward = { x: 0, z: 1 };
    if (speed > 0.01) {
      forward = {
        x: velocity.vx / speed,
        z: velocity.vz / speed
      };
    }

    // Check terrain ahead
    const terrainAvoidance = this.getTerrainAvoidanceVector(position, forward);
    if (terrainAvoidance) {
      direction.x += terrainAvoidance.x * this.config.avoidanceStrength;
      direction.z += terrainAvoidance.z * this.config.avoidanceStrength;
    }

    // Normal navigation logic
    if (this.isInSafeWater(position)) {
      const distFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
      if (distFromCenter > this.config.safeRadius) {
        // Return toward center
        direction.x -= position.x / distFromCenter;
        direction.z -= position.z / distFromCenter;
      } else {
        // Set new target if needed
        if (!boat.targetPoint || this.distanceToTarget(position, boat.targetPoint) < 5) {
          boat.targetPoint = this.getNewTarget(position);
        }
        // Move toward target
        const dx = boat.targetPoint.x - position.x;
        const dz = boat.targetPoint.z - position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        direction.x += dx / dist;
        direction.z += dz / dist;
      }
    }

    // Normalize direction
    const dirLength = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    if (dirLength > 0) {
      direction.x /= dirLength;
      direction.z /= dirLength;
    }

    return direction;
  }

  /**
   * Gets terrain avoidance vector
   */
  private getTerrainAvoidanceVector(position: PositionComponent, forward: { x: number; z: number }): { x: number; z: number } | null {
    const checkPoints = [
      { direction: forward, weight: 1.0 },
      { direction: this.rotateVector(forward, Math.PI / 4), weight: 0.7 },
      { direction: this.rotateVector(forward, -Math.PI / 4), weight: 0.7 }
    ];

    const avoidanceVector = { x: 0, z: 0 };

    for (const point of checkPoints) {
      const checkPos = {
        x: position.x + point.direction.x * this.config.terrainCheckDistance,
        z: position.z + point.direction.z * this.config.terrainCheckDistance
      };
      const waterDepth = this.getWaterDepth(checkPos.x, checkPos.z);

      if (waterDepth < this.config.minWaterDepth) {
        // Add avoidance force away from shallow water
        const avoidDir = {
          x: position.x - checkPos.x,
          z: position.z - checkPos.z
        };
        const avoidDist = Math.sqrt(avoidDir.x * avoidDir.x + avoidDir.z * avoidDir.z);
        if (avoidDist > 0) {
          avoidanceVector.x += (avoidDir.x / avoidDist) * point.weight * (this.config.minWaterDepth - waterDepth);
          avoidanceVector.z += (avoidDir.z / avoidDist) * point.weight * (this.config.minWaterDepth - waterDepth);
        }
      }
    }

    const avoidLength = Math.sqrt(avoidanceVector.x * avoidanceVector.x + avoidanceVector.z * avoidanceVector.z);
    return avoidLength > 0 ? { x: avoidanceVector.x / avoidLength, z: avoidanceVector.z / avoidLength } : null;
  }

  /**
   * Rotates a vector by an angle
   */
  private rotateVector(vector: { x: number; z: number }, angle: number): { x: number; z: number } {
    return {
      x: vector.x * Math.cos(angle) - vector.z * Math.sin(angle),
      z: vector.x * Math.sin(angle) + vector.z * Math.cos(angle)
    };
  }

  /**
   * Gets water depth at a position
   */
  private getWaterDepth(x: number, z: number): number {
    if (this.config.getWaterDepth) {
      return this.config.getWaterDepth(x, z);
    }
    if (this.config.getTerrainHeight) {
      const terrainHeight = this.config.getTerrainHeight(x, z);
      return this.config.waterLevel - terrainHeight;
    }
    return 10; // Default depth
  }

  /**
   * Checks if a position is in safe water
   */
  private isInSafeWater(position: PositionComponent): boolean {
    const waterDepth = this.getWaterDepth(position.x, position.z);
    return waterDepth >= this.config.minWaterDepth;
  }

  /**
   * Reverses boat from dangerous shallow water
   */
  private reverseFromDanger(_boat: BoatComponent, position: PositionComponent, steering: SteeringComponent): void {
    // Reverse direction
    steering.steeringForce = {
      x: -position.x * 0.1,
      y: 0,
      z: -position.z * 0.1
    };
  }

  /**
   * Gets a new random target position
   */
  private getNewTarget(_position: PositionComponent): { x: number; y: number; z: number } {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.config.safeRadius * 0.8;

    return {
      x: Math.cos(angle) * radius,
      y: this.config.waterLevel,
      z: Math.sin(angle) * radius
    };
  }

  /**
   * Calculates distance to target
   */
  private distanceToTarget(position: PositionComponent, target: { x: number; z: number }): number {
    const dx = target.x - position.x;
    const dz = target.z - position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
