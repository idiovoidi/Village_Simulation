/**
 * PathfindingSystem
 * 
 * Requests paths from PathfindingManager and updates steering targets.
 * Handles path following, completion, and re-pathing when needed.
 * 
 * Requirements: 6.7
 */

import { System } from '../../core/System';
import type { World } from '../../core/World';
import type { EntityId } from '../../core/Entity';
import type { PathfindingManager, PathResult } from '../../managers/PathfindingManager';
import type { SteeringComponent } from '../../components/AIComponents';
import type { PositionComponent, Vector3 } from '../../components/CoreComponents';
import { distance } from '../../utils/Vector3Helpers';
import { Logger } from '../../utils/Logger';

/**
 * Pathfinding state for an entity.
 */
interface PathState {
  path: Vector3[];
  currentWaypointIndex: number;
  targetPosition: Vector3;
  needsRepath: boolean;
  lastPathTime: number;
}

/**
 * PathfindingSystem manages pathfinding for entities with steering components.
 * It requests paths from the PathfindingManager and updates steering targets.
 */
export class PathfindingSystem extends System {
  readonly componentSignature = new Set(['Position', 'Steering']);
  readonly priority = 150; // After decision systems, before steering

  private pathfindingManager: PathfindingManager;
  private pathStates = new Map<EntityId, PathState>();
  private waypointReachedDistance = 1.5; // Distance to consider waypoint reached
  private repathInterval = 5.0; // Seconds between automatic re-pathing
  private logger = new Logger();
  private readonly logCategory = 'PathfindingSystem';

  constructor(world: World, pathfindingManager: PathfindingManager) {
    super(world);
    this.pathfindingManager = pathfindingManager;
  }

  update(_deltaTime: number): void {
    const entities = this.queryEntities();

    for (const entityId of entities) {
      this.updateEntityPathfinding(entityId);
    }
  }

  /**
   * Updates pathfinding for a single entity.
   */
  private updateEntityPathfinding(entityId: EntityId): void {
    const position = this.world.getComponent<PositionComponent>(entityId, 'Position');
    const steering = this.world.getComponent<SteeringComponent>(entityId, 'Steering');

    if (!position || !steering) return;

    const pathState = this.pathStates.get(entityId);

    // If entity has a steering target but no path, request one
    if (steering.target && !pathState) {
      this.requestPath(entityId, position, steering.target);
      return;
    }

    // If entity has a path, follow it
    if (pathState) {
      this.followPath(entityId, position, steering, pathState);
    }
  }

  /**
   * Requests a path from current position to target.
   */
  requestPath(entityId: EntityId, from: PositionComponent, to: Vector3): void {
    const fromPos: Vector3 = { x: from.x, y: from.y, z: from.z };
    const result: PathResult = this.pathfindingManager.findPath(fromPos, to);

    if (result.found && result.path.length > 0) {
      const pathState: PathState = {
        path: result.path,
        currentWaypointIndex: 0,
        targetPosition: to,
        needsRepath: false,
        lastPathTime: Date.now() / 1000
      };

      this.pathStates.set(entityId, pathState);
      this.logger.debug(this.logCategory, `Path found for entity ${entityId}: ${result.path.length} waypoints`);
    } else {
      this.logger.warn(this.logCategory, `No path found for entity ${entityId}`);
      // Clear steering target if no path found
      const steering = this.world.getComponent<SteeringComponent>(entityId, 'Steering');
      if (steering) {
        steering.target = null;
      }
    }
  }

  /**
   * Follows the current path by updating steering target to next waypoint.
   */
  private followPath(
    entityId: EntityId,
    position: PositionComponent,
    steering: SteeringComponent,
    pathState: PathState
  ): void {
    const currentPos: Vector3 = { x: position.x, y: position.y, z: position.z };

    // Check if we need to repath (target changed or time elapsed)
    if (this.shouldRepath(steering, pathState)) {
      this.clearPath(entityId);
      if (steering.target) {
        this.requestPath(entityId, position, steering.target);
      }
      return;
    }

    // Check if path is complete
    if (pathState.currentWaypointIndex >= pathState.path.length) {
      this.handlePathComplete(entityId);
      return;
    }

    // Get current waypoint
    const waypoint = pathState.path[pathState.currentWaypointIndex];
    const distToWaypoint = distance(currentPos, waypoint);

    // Check if waypoint reached
    if (distToWaypoint < this.waypointReachedDistance) {
      pathState.currentWaypointIndex++;

      // If there are more waypoints, continue
      if (pathState.currentWaypointIndex < pathState.path.length) {
        const nextWaypoint = pathState.path[pathState.currentWaypointIndex];
        steering.target = nextWaypoint;
        this.logger.debug(this.logCategory, `Entity ${entityId} reached waypoint, moving to next`);
      } else {
        // Path complete
        this.handlePathComplete(entityId);
      }
    } else {
      // Update steering target to current waypoint
      steering.target = waypoint;
    }
  }

  /**
   * Checks if entity should repath.
   */
  private shouldRepath(steering: SteeringComponent, pathState: PathState): boolean {
    // Check if steering target changed significantly
    if (steering.target) {
      const targetDist = distance(steering.target, pathState.targetPosition);
      if (targetDist > this.waypointReachedDistance * 2) {
        return true;
      }
    }

    // Check if enough time has passed for automatic repath
    const currentTime = Date.now() / 1000;
    if (currentTime - pathState.lastPathTime > this.repathInterval) {
      return true;
    }

    // Check if repath was explicitly requested
    if (pathState.needsRepath) {
      return true;
    }

    return false;
  }

  /**
   * Handles path completion.
   */
  private handlePathComplete(entityId: EntityId): void {
    this.logger.debug(this.logCategory, `Entity ${entityId} completed path`);
    this.clearPath(entityId);
    // Keep the final target so entity can arrive at it
    // Steering system will handle arrival behavior
  }

  /**
   * Clears the path for an entity.
   */
  clearPath(entityId: EntityId): void {
    this.pathStates.delete(entityId);
  }

  /**
   * Requests a repath for an entity on its next update.
   */
  requestRepath(entityId: EntityId): void {
    const pathState = this.pathStates.get(entityId);
    if (pathState) {
      pathState.needsRepath = true;
    }
  }

  /**
   * Sets the waypoint reached distance threshold.
   */
  setWaypointReachedDistance(distance: number): void {
    this.waypointReachedDistance = distance;
  }

  /**
   * Sets the automatic repath interval.
   */
  setRepathInterval(interval: number): void {
    this.repathInterval = interval;
  }

  /**
   * Gets the current path for an entity (for debugging/visualization).
   */
  getPath(entityId: EntityId): Vector3[] | null {
    const pathState = this.pathStates.get(entityId);
    return pathState ? pathState.path : null;
  }

  /**
   * Gets the current waypoint index for an entity.
   */
  getCurrentWaypointIndex(entityId: EntityId): number {
    const pathState = this.pathStates.get(entityId);
    return pathState ? pathState.currentWaypointIndex : -1;
  }
}
