/**
 * Dog Behavior System
 *
 * Manages dog AI behaviors including wandering, resting, and following terrain.
 * Dogs patrol within a radius, rest periodically, and follow terrain slopes.
 *
 * @module systems/ai
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { ComponentSignature } from '../../core/Component.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { AIBehaviourComponent, SteeringComponent } from '../../components/AIComponents.ts';
import type { DogComponent } from '../../components/CreatureComponents.ts';
import type { PositionComponent, VelocityComponent } from '../../components/CoreComponents.ts';

export interface DogBehaviorConfig {
  wanderRadius: number;
  restDuration: { min: number; max: number };
  speed: number;
  terrainHeightFn?: (x: number, z: number) => number;
}

/**
 * System that manages dog wandering and resting behavior
 */
export class DogBehaviorSystem extends System {
  readonly componentSignature: ComponentSignature = new Set([
    'Dog',
    'Position',
    'Velocity',
    'AIBehaviour',
    'Steering'
  ]);
  readonly priority = 120; // After zombie behavior, before decision system

  private config: DogBehaviorConfig;
  private terrainHeightFn?: (x: number, z: number) => number;

  constructor(world: World, config?: Partial<DogBehaviorConfig>) {
    super(world);
    this.config = {
      wanderRadius: 30,
      restDuration: { min: 2, max: 5 },
      speed: 0.15,
      ...config
    };
    this.terrainHeightFn = config?.terrainHeightFn;
  }

  update(deltaTime: number): void {
    const dogs = this.queryEntities();

    for (const dogId of dogs) {
      this.updateDogBehavior(dogId, deltaTime);
    }
  }

  /**
   * Updates behavior for a single dog
   */
  private updateDogBehavior(dogId: EntityId, deltaTime: number): void {
    const dog = this.world.getComponent<DogComponent>(dogId, 'Dog');
    const position = this.world.getComponent<PositionComponent>(dogId, 'Position');
    const velocity = this.world.getComponent<VelocityComponent>(dogId, 'Velocity');
    const behavior = this.world.getComponent<AIBehaviourComponent>(dogId, 'AIBehaviour');
    const steering = this.world.getComponent<SteeringComponent>(dogId, 'Steering');

    if (!dog || !position || !velocity || !behavior || !steering) return;

    // Handle resting state
    if (dog.isResting) {
      dog.restTimer -= deltaTime;
      if (dog.restTimer <= 0) {
        dog.isResting = false;
        this.setNewWanderTarget(dog, position);
      }
      // Stop movement while resting
      velocity.vx = 0;
      velocity.vy = 0;
      velocity.vz = 0;
      steering.target = { x: position.x, y: position.y, z: position.z };
      return;
    }

    // Check if we've reached the target
    if (dog.targetPosition) {
      const dx = dog.targetPosition.x - position.x;
      const dz = dog.targetPosition.z - position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < 0.5) {
        // Reached target, start resting
        dog.isResting = true;
        dog.restTimer = this.config.restDuration.min + Math.random() * (this.config.restDuration.max - this.config.restDuration.min);
        dog.targetPosition = null;
        return;
      }
    }

    // Set new target if none exists
    if (!dog.targetPosition) {
      this.setNewWanderTarget(dog, position);
      return;
    }

    // Calculate steering toward target
    const direction = {
      x: dog.targetPosition.x - position.x,
      y: 0,
      z: dog.targetPosition.z - position.z
    };
    const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    direction.x /= distance;
    direction.z /= distance;

    // Add terrain following
    if (this.terrainHeightFn) {
      const targetY = this.terrainHeightFn(position.x, position.z) + 1;
      direction.y = (targetY - position.y) * 2;
    }

    // SteeringSystem seeks steering.target and handles terrain/water.
    steering.target = { ...dog.targetPosition };

    // Set steering force
    steering.steeringForce = {
      x: direction.x * this.config.speed * 40,
      y: direction.y * 10,
      z: direction.z * this.config.speed * 40
    };
  }

  /**
   * Sets a new random wander target for a dog
   */
  private setNewWanderTarget(dog: DogComponent, position: PositionComponent): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 10;

    dog.targetPosition = {
      x: position.x + Math.cos(angle) * radius,
      y: position.y,
      z: position.z + Math.sin(angle) * radius
    };
  }
}
