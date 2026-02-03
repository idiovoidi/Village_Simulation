/**
 * FlockingSystem
 * 
 * Implements flocking behavior for birds and schooling behavior for fish.
 * Calculates separation, alignment, and cohesion forces for group coordination.
 * 
 * Requirements: 6.3, 6.4
 */

import { System } from '../../core/System';
import type { World } from '../../core/World';
import type { EntityId } from '../../core/Entity';
import type { FlockComponent } from '../../components/CreatureComponents';
import type { PositionComponent, VelocityComponent, Vector3 } from '../../components/CoreComponents';
import type { SteeringComponent } from '../../components/AIComponents';
import { distance, normalizeVector, subtractVectors, addVectors, multiplyVector } from '../../utils/Vector3Helpers';
import { SpatialGrid } from '../../utils/SpatialGrid';

/**
 * FlockingSystem implements Reynolds' flocking algorithm.
 * Applies separation, alignment, and cohesion forces to entities in flocks.
 */
export class FlockingSystem extends System {
  readonly componentSignature = new Set(['Position', 'Velocity', 'Flock', 'Steering']);
  readonly priority = 140; // Before steering system

  private spatialGrid: SpatialGrid;
  private maxNeighborDistance = 15; // Maximum distance to consider neighbors

  constructor(world: World, spatialGrid: SpatialGrid) {
    super(world);
    this.spatialGrid = spatialGrid;
  }

  update(_deltaTime: number): void {
    const entities = this.queryEntities();

    // Group entities by flock ID
    const flocks = this.groupByFlock(entities);

    // Process each flock
    for (const [_flockId, flockMembers] of flocks) {
      this.processFlockBehavior(flockMembers);
    }
  }

  /**
   * Groups entities by their flock ID.
   */
  private groupByFlock(entities: EntityId[]): Map<number, EntityId[]> {
    const flocks = new Map<number, EntityId[]>();

    for (const entityId of entities) {
      const flock = this.world.getComponent<FlockComponent>(entityId, 'Flock');
      if (!flock) continue;

      if (!flocks.has(flock.flockId)) {
        flocks.set(flock.flockId, []);
      }
      flocks.get(flock.flockId)!.push(entityId);
    }

    return flocks;
  }

  /**
   * Processes flocking behavior for a group of entities.
   */
  private processFlockBehavior(flockMembers: EntityId[]): void {
    for (const entityId of flockMembers) {
      const position = this.world.getComponent<PositionComponent>(entityId, 'Position');
      const velocity = this.world.getComponent<VelocityComponent>(entityId, 'Velocity');
      const flock = this.world.getComponent<FlockComponent>(entityId, 'Flock');
      const steering = this.world.getComponent<SteeringComponent>(entityId, 'Steering');

      if (!position || !velocity || !flock || !steering) continue;

      // Find neighbors using spatial grid
      const neighbors = this.findNeighbors(entityId, position, flock, flockMembers);

      if (neighbors.length === 0) continue;

      // Calculate flocking forces
      const separation = this.calculateSeparation(position, neighbors, flock);
      const alignment = this.calculateAlignment(velocity, neighbors, flock);
      const cohesion = this.calculateCohesion(position, neighbors, flock);

      // Combine forces
      const flockingForce = addVectors(
        addVectors(separation, alignment),
        cohesion
      );

      // Add flocking force to steering force
      steering.steeringForce = addVectors(steering.steeringForce, flockingForce);
    }
  }

  /**
   * Finds neighboring entities within the flock.
   */
  private findNeighbors(
    entityId: EntityId,
    position: PositionComponent,
    flock: FlockComponent,
    flockMembers: EntityId[]
  ): Array<{ id: EntityId; position: PositionComponent; velocity: VelocityComponent }> {
    const neighbors: Array<{ id: EntityId; position: PositionComponent; velocity: VelocityComponent }> = [];
    const entityPos: Vector3 = { x: position.x, y: position.y, z: position.z };

    // Use spatial grid for efficient neighbor search
    const nearbyEntities = this.spatialGrid.query(entityPos, flock.neighborRadius);

    for (const nearbyId of nearbyEntities) {
      // Skip self
      if (nearbyId === entityId) continue;

      // Only consider entities in the same flock
      if (!flockMembers.includes(nearbyId)) continue;

      const neighborPos = this.world.getComponent<PositionComponent>(nearbyId, 'Position');
      const neighborVel = this.world.getComponent<VelocityComponent>(nearbyId, 'Velocity');

      if (!neighborPos || !neighborVel) continue;

      const neighborPosVec: Vector3 = { x: neighborPos.x, y: neighborPos.y, z: neighborPos.z };
      const dist = distance(entityPos, neighborPosVec);

      // Check if within neighbor radius
      if (dist <= flock.neighborRadius && dist > 0) {
        neighbors.push({
          id: nearbyId,
          position: neighborPos,
          velocity: neighborVel
        });
      }
    }

    return neighbors;
  }

  /**
   * Calculates separation force - steer away from nearby neighbors.
   */
  private calculateSeparation(
    position: PositionComponent,
    neighbors: Array<{ id: EntityId; position: PositionComponent; velocity: VelocityComponent }>,
    flock: FlockComponent
  ): Vector3 {
    if (neighbors.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    const entityPos: Vector3 = { x: position.x, y: position.y, z: position.z };
    let separationForce: Vector3 = { x: 0, y: 0, z: 0 };

    for (const neighbor of neighbors) {
      const neighborPos: Vector3 = { x: neighbor.position.x, y: neighbor.position.y, z: neighbor.position.z };
      const diff = subtractVectors(entityPos, neighborPos);
      const dist = distance(entityPos, neighborPos);

      if (dist > 0) {
        // Weight by inverse distance (closer neighbors have more influence)
        const weighted = multiplyVector(diff, 1 / dist);
        separationForce = addVectors(separationForce, weighted);
      }
    }

    // Average and apply weight
    if (neighbors.length > 0) {
      separationForce = multiplyVector(separationForce, 1 / neighbors.length);
      separationForce = multiplyVector(separationForce, flock.separationWeight);
    }

    return separationForce;
  }

  /**
   * Calculates alignment force - steer towards average heading of neighbors.
   */
  private calculateAlignment(
    velocity: VelocityComponent,
    neighbors: Array<{ id: EntityId; position: PositionComponent; velocity: VelocityComponent }>,
    flock: FlockComponent
  ): Vector3 {
    if (neighbors.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    let avgVelocity: Vector3 = { x: 0, y: 0, z: 0 };

    for (const neighbor of neighbors) {
      const neighborVel: Vector3 = { x: neighbor.velocity.vx, y: neighbor.velocity.vy, z: neighbor.velocity.vz };
      avgVelocity = addVectors(avgVelocity, neighborVel);
    }

    // Average
    avgVelocity = multiplyVector(avgVelocity, 1 / neighbors.length);

    // Calculate steering force towards average velocity
    const currentVel: Vector3 = { x: velocity.vx, y: velocity.vy, z: velocity.vz };
    const alignmentForce = subtractVectors(avgVelocity, currentVel);

    // Apply weight
    return multiplyVector(alignmentForce, flock.alignmentWeight);
  }

  /**
   * Calculates cohesion force - steer towards average position of neighbors.
   */
  private calculateCohesion(
    position: PositionComponent,
    neighbors: Array<{ id: EntityId; position: PositionComponent; velocity: VelocityComponent }>,
    flock: FlockComponent
  ): Vector3 {
    if (neighbors.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    const entityPos: Vector3 = { x: position.x, y: position.y, z: position.z };
    let centerOfMass: Vector3 = { x: 0, y: 0, z: 0 };

    for (const neighbor of neighbors) {
      const neighborPos: Vector3 = { x: neighbor.position.x, y: neighbor.position.y, z: neighbor.position.z };
      centerOfMass = addVectors(centerOfMass, neighborPos);
    }

    // Average
    centerOfMass = multiplyVector(centerOfMass, 1 / neighbors.length);

    // Calculate steering force towards center of mass
    const cohesionForce = subtractVectors(centerOfMass, entityPos);

    // Normalize and apply weight
    const normalized = normalizeVector(cohesionForce);
    return multiplyVector(normalized, flock.cohesionWeight);
  }

  /**
   * Sets the maximum distance to consider neighbors.
   */
  setMaxNeighborDistance(distance: number): void {
    this.maxNeighborDistance = distance;
  }

  /**
   * Gets the maximum neighbor distance.
   */
  getMaxNeighborDistance(): number {
    return this.maxNeighborDistance;
  }
}
