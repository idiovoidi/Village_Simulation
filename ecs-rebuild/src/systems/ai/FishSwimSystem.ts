/**
 * Fish Swim System
 *
 * Manages fish swimming behavior including schooling, depth control, and target selection.
 * Fish swim in schools with flocking behavior and maintain depth constraints.
 *
 * @module systems/ai
 */

import { System } from '../../core/System';
import type { World } from '../../core/World';
import type { ComponentSignature } from '../../core/Component';
import type { EntityId } from '../../core/Entity';
import type { AIBehaviourComponent, SteeringComponent } from '../../components/AIComponents';
import type { FishComponent } from '../../components/CreatureComponents';
import type { PositionComponent, VelocityComponent } from '../../components/CoreComponents';

export interface FishSwimConfig {
  schoolCenter: { x: number; y: number; z: number };
  schoolRadius: number;
  minDepth: number;
  maxDepth: number;
  targetUpdateInterval: { min: number; max: number };
}

/**
 * System that manages fish swimming and schooling behavior
 */
export class FishSwimSystem extends System {
  readonly componentSignature: ComponentSignature = new Set([
    'Fish',
    'Position',
    'Velocity',
    'AIBehaviour',
    'Steering'
  ]);
  readonly priority = 125; // After flocking system

  private config: FishSwimConfig;

  constructor(world: World, config?: Partial<FishSwimConfig>) {
    super(world);
    this.config = {
      schoolCenter: { x: 0, y: -5, z: 0 },
      schoolRadius: 30,
      minDepth: -15,
      maxDepth: -2,
      targetUpdateInterval: { min: 3, max: 5 },
      ...config
    };
  }

  update(deltaTime: number): void {
    const fishes = this.queryEntities();

    // Occasionally update school center
    if (Math.random() < 0.001) {
      this.updateSchoolCenter();
    }

    for (const fishId of fishes) {
      this.updateFishBehavior(fishId, deltaTime);
    }
  }

  /**
   * Updates behavior for a single fish
   */
  private updateFishBehavior(fishId: EntityId, deltaTime: number): void {
    const fish = this.world.getComponent<FishComponent>(fishId, 'Fish');
    const position = this.world.getComponent<PositionComponent>(fishId, 'Position');
    const velocity = this.world.getComponent<VelocityComponent>(fishId, 'Velocity');
    const behavior = this.world.getComponent<AIBehaviourComponent>(fishId, 'AIBehaviour');
    const steering = this.world.getComponent<SteeringComponent>(fishId, 'Steering');

    if (!fish || !position || !velocity || !behavior || !steering) return;

    // Update target periodically
    fish.timeSinceLastTarget += deltaTime;
    if (fish.timeSinceLastTarget > this.config.targetUpdateInterval.min + Math.random() * (this.config.targetUpdateInterval.max - this.config.targetUpdateInterval.min)) {
      fish.target = this.getNewTarget(position);
      fish.timeSinceLastTarget = 0;
    }

    // Calculate steering toward target
    if (fish.target) {
      const direction = {
        x: fish.target.x - position.x,
        y: fish.target.y - position.y,
        z: fish.target.z - position.z
      };
      const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
      direction.x /= distance;
      direction.y /= distance;
      direction.z /= distance;

      // Set steering force
      steering.steeringForce = {
        x: direction.x * fish.speed,
        y: direction.y * fish.speed,
        z: direction.z * fish.speed
      };
    }

    // Enforce depth constraints
    if (position.y < this.config.minDepth) {
      steering.steeringForce.y += 0.5;
    } else if (position.y > this.config.maxDepth) {
      steering.steeringForce.y -= 0.5;
    }
  }

  /**
   * Gets a new random target position for a fish
   */
  private getNewTarget(_position: PositionComponent): { x: number; y: number; z: number } {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.config.schoolRadius;
    const height = this.config.minDepth + Math.random() * (this.config.maxDepth - this.config.minDepth);

    return {
      x: this.config.schoolCenter.x + Math.cos(angle) * radius,
      y: height,
      z: this.config.schoolCenter.z + Math.sin(angle) * radius
    };
  }

  /**
   * Updates the school center position
   */
  private updateSchoolCenter(): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 20;

    this.config.schoolCenter = {
      x: Math.cos(angle) * radius,
      y: -5 + Math.random() * 10,
      z: Math.sin(angle) * radius
    };
  }
}
