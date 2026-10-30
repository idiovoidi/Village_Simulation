/**
 * SteeringSystem
 * 
 * Implements steering behaviors for autonomous agent movement.
 * Calculates steering forces (seek, flee, arrive, wander) and applies them to velocity.
 * 
 * Requirements: 6.7
 */

import { System } from '../../core/System.ts';
import type { ComponentSignature } from '../../core/Component.ts';
import type { World } from '../../core/World.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { SteeringComponent } from '../../components/AIComponents.ts';
import type {
  PositionComponent,
  VelocityComponent,
  TransformComponent,
  Vector3,
} from '../../components/CoreComponents.ts';
import {
  subtractVectors,
  normalizeVector,
  vectorLength,
  multiplyVector,
  addVectors,
  clampLength,
  distance
} from '../../utils/Vector3Helpers.ts';
import { TerrainSystem } from '../environment/TerrainSystem.ts';

/**
 * Steering behavior types.
 */
export const SteeringBehavior = {
  None: 'None',
  Seek: 'Seek',
  Flee: 'Flee',
  Arrive: 'Arrive',
  Wander: 'Wander'
} as const;

export type SteeringBehavior = typeof SteeringBehavior[keyof typeof SteeringBehavior];

/**
 * SteeringSystem processes entities with steering components.
 * Calculates steering forces based on behavior and applies them to velocity.
 * 
 * Priority: 150 (AI Systems)
 */
export class SteeringSystem extends System {
  readonly componentSignature: ComponentSignature = new Set([
    'Steering',
    'Position',
    'Velocity'
  ]);

  readonly priority = 150;

  private wanderAngle = 0;
  private wanderRadius = 5;
  private wanderDistance = 10;
  private wanderJitter = 1;

  constructor(world: World) {
    super(world);
  }

  update(deltaTime: number): void {
    const entities = this.queryEntities();

    for (const entityId of entities) {
      const steering = this.world.getComponent(entityId, 'Steering') as SteeringComponent;
      const position = this.world.getComponent(entityId, 'Position') as PositionComponent;
      const velocity = this.world.getComponent(entityId, 'Velocity') as VelocityComponent;

      if (!steering || !position || !velocity) {
        continue;
      }

      // Calculate steering force based on target
      let steeringForce: Vector3 = { x: 0, y: 0, z: 0 };

      if (steering.target) {
        // Determine behavior based on distance to target
        const distanceToTarget = distance(position, steering.target);

        if (distanceToTarget < steering.arrivalRadius) {
          // Arrive behavior - slow down as we approach
          steeringForce = this.calculateArrive(position, velocity, steering.target, steering.arrivalRadius);
        } else {
          // Seek behavior - move toward target
          steeringForce = this.calculateSeek(position, velocity, steering.target, velocity.maxSpeed);
        }
      } else {
        // Wander behavior when no target
        steeringForce = this.calculateWander(position, velocity, deltaTime);
      }

      // Clamp steering force to max force
      steeringForce = clampLength(steeringForce, steering.maxForce);

      // Update steering component
      steering.steeringForce = steeringForce;
      steering.desiredVelocity = clampLength(
        addVectors({ x: velocity.vx, y: velocity.vy, z: velocity.vz }, steeringForce),
        velocity.maxSpeed
      );

      // Apply steering force to velocity (horizontal movement for ground agents)
      velocity.vx += steeringForce.x * deltaTime;
      velocity.vz += steeringForce.z * deltaTime;
      velocity.vy = 0;

      // Clamp velocity to max speed
      const currentSpeed = Math.sqrt(
        velocity.vx * velocity.vx +
        velocity.vz * velocity.vz
      );

      if (currentSpeed > velocity.maxSpeed && currentSpeed > 0) {
        const scale = velocity.maxSpeed / currentSpeed;
        velocity.vx *= scale;
        velocity.vz *= scale;
      }

      // Integrate position from velocity
      position.x += velocity.vx * deltaTime;
      position.z += velocity.vz * deltaTime;
      position.y = TerrainSystem.getTerrainHeight(position.x, position.z) + 1;

      // Keep render transform in sync
      const transform = this.world.getComponent<TransformComponent>(entityId, 'Transform');
      if (transform) {
        transform.position.x = position.x;
        transform.position.y = position.y;
        transform.position.z = position.z;
        transform.dirty = true;
      }
    }
  }

  /**
   * Calculate seek steering force.
   * Steers toward the target at maximum speed.
   */
  private calculateSeek(
    position: Vector3,
    velocity: { vx: number; vy: number; vz: number },
    target: Vector3,
    maxSpeed: number
  ): Vector3 {
    // Desired velocity points toward target at max speed
    const desired = subtractVectors(target, position);
    const desiredNormalized = normalizeVector(desired);
    const desiredVelocity = multiplyVector(desiredNormalized, maxSpeed);

    // Steering force = desired velocity - current velocity
    const currentVelocity: Vector3 = { x: velocity.vx, y: velocity.vy, z: velocity.vz };
    return subtractVectors(desiredVelocity, currentVelocity);
  }

  // Flee behavior - kept for future use
  // /**
  //  * Calculate flee steering force.
  //  * Steers away from the target at maximum speed.
  //  */
  // private calculateFlee(
  //   position: Vector3,
  //   velocity: { vx: number; vy: number; vz: number },
  //   target: Vector3,
  //   maxSpeed: number
  // ): Vector3 {
  //   // Desired velocity points away from target at max speed
  //   const desired = subtractVectors(position, target);
  //   const desiredNormalized = normalizeVector(desired);
  //   const desiredVelocity = multiplyVector(desiredNormalized, maxSpeed);

  //   // Steering force = desired velocity - current velocity
  //   const currentVelocity: Vector3 = { x: velocity.vx, y: velocity.vy, z: velocity.vz };
  //   return subtractVectors(desiredVelocity, currentVelocity);
  // }

  /**
   * Calculate arrive steering force.
   * Slows down as the agent approaches the target.
   */
  private calculateArrive(
    position: Vector3,
    velocity: { vx: number; vy: number; vz: number },
    target: Vector3,
    arrivalRadius: number
  ): Vector3 {
    const desired = subtractVectors(target, position);
    const dist = vectorLength(desired);

    if (dist < 0.001) {
      // Already at target
      return { x: -velocity.vx, y: -velocity.vy, z: -velocity.vz };
    }

    // Calculate desired speed based on distance
    // Speed ramps down linearly as we approach the target
    const desiredSpeed = (dist / arrivalRadius) * velocity.vx; // Use current max speed
    const desiredNormalized = normalizeVector(desired);
    const desiredVelocity = multiplyVector(desiredNormalized, Math.min(desiredSpeed, 10));

    // Steering force = desired velocity - current velocity
    const currentVelocity: Vector3 = { x: velocity.vx, y: velocity.vy, z: velocity.vz };
    return subtractVectors(desiredVelocity, currentVelocity);
  }

  /**
   * Calculate wander steering force.
   * Creates random wandering behavior by projecting a circle in front of the agent.
   */
  private calculateWander(
    _position: Vector3,
    velocity: { vx: number; vy: number; vz: number },
    deltaTime: number
  ): Vector3 {
    // Get current velocity direction
    const currentVelocity: Vector3 = { x: velocity.vx, y: velocity.vy, z: velocity.vz };
    const speed = vectorLength(currentVelocity);

    if (speed < 0.001) {
      // If not moving, pick a random direction
      this.wanderAngle = Math.random() * Math.PI * 2;
      return {
        x: Math.cos(this.wanderAngle),
        y: 0,
        z: Math.sin(this.wanderAngle)
      };
    }

    // Normalize velocity to get forward direction
    const forward = normalizeVector(currentVelocity);

    // Calculate circle center (in front of agent)
    const circleCenter = multiplyVector(forward, this.wanderDistance);

    // Add random displacement to wander angle
    this.wanderAngle += (Math.random() - 0.5) * this.wanderJitter * deltaTime;

    // Calculate displacement on circle
    const displacement = {
      x: Math.cos(this.wanderAngle) * this.wanderRadius,
      y: 0,
      z: Math.sin(this.wanderAngle) * this.wanderRadius
    };

    // Wander force = circle center + displacement
    const wanderForce = addVectors(circleCenter, displacement);

    return wanderForce;
  }

  /**
   * Calculate obstacle avoidance steering force.
   * Steers away from nearby obstacles.
   */
  public calculateObstacleAvoidance(
    entityId: EntityId,
    obstacles: EntityId[],
    detectionRadius: number
  ): Vector3 {
    const position = this.world.getComponent(entityId, 'Position') as PositionComponent;
    const velocity = this.world.getComponent(entityId, 'Velocity') as VelocityComponent;

    if (!position || !velocity) {
      return { x: 0, y: 0, z: 0 };
    }

    let avoidanceForce: Vector3 = { x: 0, y: 0, z: 0 };
    let obstacleCount = 0;

    for (const obstacleId of obstacles) {
      if (obstacleId === entityId) continue;

      const obstaclePos = this.world.getComponent(obstacleId, 'Position') as PositionComponent;
      if (!obstaclePos) continue;

      const dist = distance(position, obstaclePos);

      if (dist < detectionRadius && dist > 0.001) {
        // Calculate avoidance force (inversely proportional to distance)
        const away = subtractVectors(position, obstaclePos);
        const awayNormalized = normalizeVector(away);
        const strength = (detectionRadius - dist) / detectionRadius;
        const force = multiplyVector(awayNormalized, strength * 10);

        avoidanceForce = addVectors(avoidanceForce, force);
        obstacleCount++;
      }
    }

    // Average the avoidance forces
    if (obstacleCount > 0) {
      avoidanceForce = multiplyVector(avoidanceForce, 1 / obstacleCount);
    }

    return avoidanceForce;
  }
}
