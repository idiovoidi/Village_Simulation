/**
 * Dinosaur Behavior System
 *
 * Manages dinosaur AI behaviors including wandering, roaring, and terrain following.
 * Dinosaurs are larger, faster, and have more dramatic movement than dogs.
 *
 * @module systems/ai
 */

import { System } from '../../core/System';
import type { World } from '../../core/World';
import type { ComponentSignature } from '../../core/Component';
import type { EntityId } from '../../core/Entity';
import type { AIBehaviourComponent, SteeringComponent } from '../../components/AIComponents';
import type { DinosaurComponent } from '../../components/CreatureComponents';
import type { PositionComponent, VelocityComponent } from '../../components/CoreComponents';

export interface DinosaurBehaviorConfig {
  wanderRadius: number;
  restDuration: { min: number; max: number };
  speed: number;
  roarInterval: { min: number; max: number };
  terrainHeightFn?: (x: number, z: number) => number;
}

/**
 * System that manages dinosaur wandering and roaring behavior
 */
export class DinosaurBehaviorSystem extends System {
  readonly componentSignature: ComponentSignature = new Set([
    'Dinosaur',
    'Position',
    'Velocity',
    'AIBehaviour',
    'Steering'
  ]);
  readonly priority = 120; // Same priority as dog behavior

  private config: DinosaurBehaviorConfig;
  private terrainHeightFn?: (x: number, z: number) => number;

  constructor(world: World, config?: Partial<DinosaurBehaviorConfig>) {
    super(world);
    this.config = {
      wanderRadius: 50,
      restDuration: { min: 1, max: 3 },
      speed: 0.2,
      roarInterval: { min: 5000, max: 10000 },
      ...config
    };
    this.terrainHeightFn = config?.terrainHeightFn;
  }

  update(deltaTime: number): void {
    const dinosaurs = this.queryEntities();

    for (const dinoId of dinosaurs) {
      this.updateDinosaurBehavior(dinoId, deltaTime);
    }
  }

  /**
   * Updates behavior for a single dinosaur
   */
  private updateDinosaurBehavior(dinoId: EntityId, deltaTime: number): void {
    const dino = this.world.getComponent<DinosaurComponent>(dinoId, 'Dinosaur');
    const position = this.world.getComponent<PositionComponent>(dinoId, 'Position');
    const velocity = this.world.getComponent<VelocityComponent>(dinoId, 'Velocity');
    const behavior = this.world.getComponent<AIBehaviourComponent>(dinoId, 'AIBehaviour');
    const steering = this.world.getComponent<SteeringComponent>(dinoId, 'Steering');

    if (!dino || !position || !velocity || !behavior || !steering) return;

    const currentTime = performance.now();

    // Handle roaring
    if (currentTime - dino.lastRoarTime > dino.roarInterval) {
      this.roar(dino);
      dino.lastRoarTime = currentTime;
    }

    // Handle resting state
    if (dino.isResting) {
      dino.restTimer -= deltaTime;
      if (dino.restTimer <= 0) {
        dino.isResting = false;
        this.setNewWanderTarget(dino, position);
      }
      // Stop movement while resting
      velocity.vx = 0;
      velocity.vy = 0;
      velocity.vz = 0;
      return;
    }

    // Check if we've reached the target
    if (dino.targetPosition) {
      const dx = dino.targetPosition.x - position.x;
      const dz = dino.targetPosition.z - position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < 1.0) {
        // Reached target, start resting
        dino.isResting = true;
        dino.restTimer = this.config.restDuration.min + Math.random() * (this.config.restDuration.max - this.config.restDuration.min);
        dino.targetPosition = null;
        return;
      }
    }

    // Set new target if none exists
    if (!dino.targetPosition) {
      this.setNewWanderTarget(dino, position);
      return;
    }

    // Calculate steering toward target
    const direction = {
      x: dino.targetPosition.x - position.x,
      y: 0,
      z: dino.targetPosition.z - position.z
    };
    const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    direction.x /= distance;
    direction.z /= distance;

    // Add terrain following (stronger than dogs due to size)
    if (this.terrainHeightFn) {
      const targetY = this.terrainHeightFn(position.x, position.z) + 2;
      direction.y = (targetY - position.y) * 2;
    }

    // Set steering force (stronger than dogs)
    steering.steeringForce = {
      x: direction.x * this.config.speed * 100,
      y: direction.y * 20,
      z: direction.z * this.config.speed * 100
    };
  }

  /**
   * Sets a new random wander target for a dinosaur
   */
  private setNewWanderTarget(dino: DinosaurComponent, position: PositionComponent): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 20;

    dino.targetPosition = {
      x: position.x + Math.cos(angle) * radius,
      y: position.y,
      z: position.z + Math.sin(angle) * radius
    };
  }

  /**
   * Triggers a roar effect for the dinosaur
   */
  private roar(dino: DinosaurComponent): void {
    // Set new roar interval
    dino.roarInterval = this.config.roarInterval.min + Math.random() * (this.config.roarInterval.max - this.config.roarInterval.min);
    // TODO: Add visual/audio effects for roaring
  }
}
