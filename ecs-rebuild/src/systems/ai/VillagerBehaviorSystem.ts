/**
 * Villager Behavior System
 *
 * Manages villager POI navigation, social interaction, fleeing from threats,
 * and home behavior. Complements VillagerScheduleSystem which handles
 * time-based activity scheduling.
 *
 * @module systems/ai
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
import type { VillagerComponent, ZombieComponent } from '../../components/CreatureComponents';
import type { PositionComponent, VelocityComponent } from '../../components/CoreComponents';
import { SpatialGrid } from '../../utils/SpatialGrid';

/**
 * Point of Interest definition
 */
export interface PointOfInterest {
  id: string;
  position: { x: number; y: number; z: number };
  type: 'market' | 'well' | 'work' | 'home' | 'social';
}

/**
 * Configuration for villager behavior
 */
export interface VillagerBehaviorConfig {
  fleeRadius: number;
  fleeDistance: number;
  socialRadius: number;
  arrivalThreshold: number;
  idleDecisionDelay: number;
}

const DEFAULT_CONFIG: VillagerBehaviorConfig = {
  fleeRadius: 15,
  fleeDistance: 30,
  socialRadius: 10,
  arrivalThreshold: 1.5,
  idleDecisionDelay: 3
};

/**
 * System that manages villager POI navigation, social behavior,
 * and fleeing from threats.
 */
export class VillagerBehaviorSystem extends System {
  readonly componentSignature: ComponentSignature = new Set([
    'Villager',
    'Position',
    'Velocity',
    'AIBehaviour',
    'Steering'
  ]);
  readonly priority = 110;

  private spatialGrid: SpatialGrid;
  private config: VillagerBehaviorConfig;
  private pointsOfInterest: PointOfInterest[] = [];

  constructor(world: World, spatialGrid?: SpatialGrid, config?: Partial<VillagerBehaviorConfig>) {
    super(world);
    this.spatialGrid = spatialGrid || new SpatialGrid(20);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  initialize(): void {
    this.createDefaultPOIs();
    this.updateSpatialGrid();
  }

  /**
   * Creates default points of interest around the village
   */
  private createDefaultPOIs(): void {
    // Market at center
    this.pointsOfInterest.push({
      id: 'market',
      position: { x: 0, y: 0, z: 0 },
      type: 'market'
    });

    // Well
    this.pointsOfInterest.push({
      id: 'well',
      position: { x: 15, y: 0, z: 15 },
      type: 'well'
    });

    // Work locations in a ring
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const radius = 25;
      this.pointsOfInterest.push({
        id: `work_${i}`,
        position: {
          x: Math.cos(angle) * radius,
          y: 0,
          z: Math.sin(angle) * radius
        },
        type: 'work'
      });
    }

    // Social hubs
    this.pointsOfInterest.push({
      id: 'tavern',
      position: { x: -10, y: 0, z: 5 },
      type: 'social'
    });
  }

  update(deltaTime: number): void {
    this.updateSpatialGrid();

    const villagers = this.queryEntities();
    for (const villagerId of villagers) {
      this.updateVillagerBehavior(villagerId, deltaTime);
    }
  }

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
   * Main behavior update for a single villager
   */
  private updateVillagerBehavior(villagerId: EntityId, deltaTime: number): void {
    const villager = this.world.getComponent<VillagerComponent>(villagerId, 'Villager');
    const position = this.world.getComponent<PositionComponent>(villagerId, 'Position');
    const velocity = this.world.getComponent<VelocityComponent>(villagerId, 'Velocity');
    const behavior = this.world.getComponent<AIBehaviourComponent>(villagerId, 'AIBehaviour');
    const steering = this.world.getComponent<SteeringComponent>(villagerId, 'Steering');

    if (!villager || !position || !velocity || !behavior || !steering) return;

    // Inside home - skip all behavior
    if (villager.isInsideHome) {
      velocity.vx = 0;
      velocity.vy = 0;
      velocity.vz = 0;
      return;
    }

    // Priority 1: Check for zombie threats (flee)
    if (this.checkForThreats(villagerId, villager, position, behavior, steering)) {
      return;
    }

    // If was fleeing but threat is gone, return to idle
    if (villager.isFleeing) {
      villager.isFleeing = false;
      villager.fleeTarget = null;
      behavior.previousState = behavior.currentState;
      behavior.currentState = BehaviourState.Idle;
      behavior.stateTimer = 0;
    }

    // Priority 2: Handle current behavior state
    switch (behavior.currentState) {
      case BehaviourState.Flee:
        this.updateFleeing(villager, position, velocity, steering);
        break;
      case BehaviourState.Socialize:
        this.updateSocializing(villagerId, villager, position, velocity, steering, deltaTime);
        break;
      case BehaviourState.Seek:
      case BehaviourState.Work:
        this.updateMovingToTarget(villager, position, velocity, steering, deltaTime);
        break;
      case BehaviourState.Wander:
        this.updateWandering(villager, position, velocity, steering, deltaTime);
        break;
      case BehaviourState.Idle:
        this.updateIdle(villagerId, villager, position, velocity, behavior, deltaTime);
        break;
    }
  }

  // ── Threat Detection & Fleeing ──────────────────────────────────

  private checkForThreats(
    villagerId: EntityId,
    villager: VillagerComponent,
    position: PositionComponent,
    behavior: AIBehaviourComponent,
    steering: SteeringComponent
  ): boolean {
    const nearbyEntities = this.spatialGrid.query(position, this.config.fleeRadius);

    for (const entityId of nearbyEntities) {
      if (entityId === villagerId) continue;

      const zombie = this.world.getComponent<ZombieComponent>(entityId, 'Zombie');
      if (!zombie) continue;

      // Found a zombie nearby - flee!
      const zombiePos = this.world.getComponent<PositionComponent>(entityId, 'Position');
      if (!zombiePos) continue;

      const distance = this.calculateDistance(position, zombiePos);
      if (distance < this.config.fleeRadius) {
        this.startFleeing(villager, position, zombiePos, behavior, steering);
        return true;
      }
    }

    return false;
  }

  private startFleeing(
    villager: VillagerComponent,
    position: PositionComponent,
    threatPosition: PositionComponent,
    behavior: AIBehaviourComponent,
    steering: SteeringComponent
  ): void {
    villager.isFleeing = true;

    // Calculate flee direction (away from threat)
    const dx = position.x - threatPosition.x;
    const dz = position.z - threatPosition.z;
    const len = Math.sqrt(dx * dx + dz * dz);

    if (len > 0) {
      villager.fleeTarget = {
        x: position.x + (dx / len) * this.config.fleeDistance,
        y: position.y,
        z: position.z + (dz / len) * this.config.fleeDistance
      };
    } else {
      // Random flee direction if on top of threat
      const angle = Math.random() * Math.PI * 2;
      villager.fleeTarget = {
        x: position.x + Math.cos(angle) * this.config.fleeDistance,
        y: position.y,
        z: position.z + Math.sin(angle) * this.config.fleeDistance
      };
    }

    villager.targetPosition = villager.fleeTarget;
    behavior.previousState = behavior.currentState;
    behavior.currentState = BehaviourState.Flee;
    behavior.stateTimer = 0;

    steering.target = villager.fleeTarget;
  }

  private updateFleeing(
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent
  ): void {
    if (!villager.targetPosition) {
      villager.isFleeing = false;
      return;
    }

    const distance = this.distanceToTarget(position, villager.targetPosition);
    if (distance < this.config.arrivalThreshold) {
      // Reached flee destination - stop
      villager.isFleeing = false;
      villager.fleeTarget = null;
      villager.targetPosition = null;
      velocity.vx = 0;
      velocity.vy = 0;
      velocity.vz = 0;
      return;
    }

    // Move toward flee target at full speed
    this.moveToward(villager, position, velocity, steering, villager.speed * 1.5);
  }

  // ── Social Behavior ─────────────────────────────────────────────

  private updateSocializing(
    villagerId: EntityId,
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent,
    _deltaTime: number
  ): void {
    // Find nearby villagers
    const nearbyEntities = this.spatialGrid.query(position, this.config.socialRadius);
    const nearbyVillagers = nearbyEntities.filter(id => {
      if (id === villagerId) return false;
      return this.world.getComponent<VillagerComponent>(id, 'Villager') !== null;
    });

    if (nearbyVillagers.length === 0) {
      // No one nearby - move to a social hub
      const socialHub = this.findNearestPOI(position, 'social');
      if (socialHub) {
        villager.targetPosition = socialHub.position;
        this.moveToward(villager, position, velocity, steering, villager.speed);
      } else {
        velocity.vx = 0;
        velocity.vy = 0;
        velocity.vz = 0;
      }
      return;
    }

    // Move toward nearest villager
    const nearestId = nearbyVillagers[0];
    const nearestPos = this.world.getComponent<PositionComponent>(nearestId, 'Position');
    if (nearestPos) {
      const dist = this.calculateDistance(position, nearestPos);
      if (dist > 2.5) {
        villager.targetPosition = { x: nearestPos.x, y: nearestPos.y, z: nearestPos.z };
        this.moveToward(villager, position, velocity, steering, villager.speed * 0.5);
      } else {
        // Close enough to socialize - stop
        velocity.vx = 0;
        velocity.vy = 0;
        velocity.vz = 0;
      }
    }

    // Add to social group
    if (!villager.socialGroup.includes(nearestId)) {
      villager.socialGroup.push(nearestId);
    }
  }

  // ── Moving to Target ────────────────────────────────────────────

  private updateMovingToTarget(
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent,
    _deltaTime: number
  ): void {
    if (!villager.targetPosition) {
      velocity.vx = 0;
      velocity.vz = 0;
      return;
    }

    const distance = this.distanceToTarget(position, villager.targetPosition);
    if (distance < this.config.arrivalThreshold) {
      // Arrived at target
      villager.targetPosition = null;
      velocity.vx = 0;
      velocity.vy = 0;
      velocity.vz = 0;

      // Update task timer
      if (villager.currentTask) {
        villager.taskTimer = 5 + Math.random() * 10;
      }
      return;
    }

    this.moveToward(villager, position, velocity, steering, villager.speed);
  }

  // ── Wandering ───────────────────────────────────────────────────

  private updateWandering(
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent,
    _deltaTime: number
  ): void {
    if (!villager.targetPosition) {
      // Pick random nearby point
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 20;
      villager.targetPosition = {
        x: position.x + Math.cos(angle) * dist,
        y: position.y,
        z: position.z + Math.sin(angle) * dist
      };
    }

    const distance = this.distanceToTarget(position, villager.targetPosition);
    if (distance < this.config.arrivalThreshold) {
      villager.targetPosition = null;
      velocity.vx = 0;
      velocity.vy = 0;
      velocity.vz = 0;
      return;
    }

    this.moveToward(villager, position, velocity, steering, villager.speed);
  }

  // ── Idle ────────────────────────────────────────────────────────

  private updateIdle(
    villagerId: EntityId,
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    behavior: AIBehaviourComponent,
    deltaTime: number
  ): void {
    velocity.vx = 0;
    velocity.vy = 0;
    velocity.vz = 0;

    // Update task timer
    if (villager.taskTimer > 0) {
      villager.taskTimer -= deltaTime;
      return;
    }

    // After idle delay, decide next action
    behavior.stateTimer += deltaTime;
    if (behavior.stateTimer >= this.config.idleDecisionDelay) {
      this.decideNextAction(villagerId, villager, position, behavior);
    }
  }

  private decideNextAction(
    _villagerId: EntityId,
    villager: VillagerComponent,
    position: PositionComponent,
    behavior: AIBehaviourComponent
  ): void {
    const roll = Math.random();

    if (roll < 0.3) {
      // Go to a POI
      const poiType = Math.random() < 0.5 ? 'work' : 'social';
      const poi = this.findNearestPOI(position, poiType);
      if (poi) {
        villager.targetPosition = poi.position;
        villager.currentPOI = poi.id;
        villager.currentTask = poiType === 'work' ? 'working' : 'socializing';
        behavior.previousState = behavior.currentState;
        behavior.currentState = poiType === 'work' ? BehaviourState.Work : BehaviourState.Socialize;
        behavior.stateTimer = 0;
      }
    } else if (roll < 0.6) {
      // Wander
      behavior.previousState = behavior.currentState;
      behavior.currentState = BehaviourState.Wander;
      behavior.stateTimer = 0;
    }
    // else stay idle
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private moveToward(
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent,
    speed: number
  ): void {
    if (!villager.targetPosition) return;

    const dx = villager.targetPosition.x - position.x;
    const dz = villager.targetPosition.z - position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 0.01) return;

    const dirX = dx / distance;
    const dirZ = dz / distance;

    steering.steeringForce = {
      x: dirX * speed * 40,
      y: 0,
      z: dirZ * speed * 40
    };

    velocity.vx = dirX * speed;
    velocity.vy = 0;
    velocity.vz = dirZ * speed;
  }

  private findNearestPOI(
    position: PositionComponent,
    type?: string
  ): PointOfInterest | null {
    let nearest: PointOfInterest | null = null;
    let nearestDist = Infinity;

    for (const poi of this.pointsOfInterest) {
      if (type && poi.type !== type) continue;

      const dx = poi.position.x - position.x;
      const dz = poi.position.z - position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = poi;
      }
    }

    return nearest;
  }

  private distanceToTarget(
    position: PositionComponent,
    target: { x: number; y: number; z: number }
  ): number {
    const dx = target.x - position.x;
    const dz = target.z - position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private calculateDistance(pos1: PositionComponent, pos2: PositionComponent): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Adds a point of interest
   */
  addPOI(poi: PointOfInterest): void {
    this.pointsOfInterest.push(poi);
  }

  /**
   * Gets all points of interest
   */
  getPOIs(): PointOfInterest[] {
    return [...this.pointsOfInterest];
  }

  setSpatialGrid(grid: SpatialGrid): void {
    this.spatialGrid = grid;
  }

  getSpatialGrid(): SpatialGrid {
    return this.spatialGrid;
  }
}
