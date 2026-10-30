/**
 * Villager Behavior System
 *
 * Manages villager POI navigation, social interaction, fleeing from threats,
 * and home behavior. Complements VillagerScheduleSystem which handles
 * time-based activity scheduling.
 *
 * @module systems/ai
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { ComponentSignature } from '../../core/Component.ts';
import type { EntityId } from '../../core/Entity.ts';
import { BehaviourState } from '../../components/AIComponents.ts';
import type {
  AIBehaviourComponent,
  ScheduleComponent,
  SteeringComponent
} from '../../components/AIComponents.ts';
import type {
  EnergyComponent,
  HungerComponent,
  ThirstComponent
} from '../../components/SurvivalComponents.ts';
import type { ModelComponent } from '../../components/RenderingComponents.ts';
import { TerrainSystem } from '../environment/TerrainSystem.ts';
import type { VillagerComponent, ZombieComponent } from '../../components/CreatureComponents.ts';
import type { PositionComponent, VelocityComponent } from '../../components/CoreComponents.ts';
import { SpatialGrid } from '../../utils/SpatialGrid.ts';

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

/** Distance from a house centre at which a villager steps in (or out) of the door. */
const DOOR_RADIUS = 4.5;
/** Give up on a destination that has not been reached after this many seconds. */
const MAX_TRAVEL_TIME = 45;
/** Need restored per second while eating / drinking at the right spot. */
const EAT_RATE = 9;
const DRINK_RATE = 14;
/** Needs below this level pull a villager off their schedule when it is overridden. */
const NEED_PULL_LEVEL = 70;

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
  private travelTime = new Map<EntityId, number>();

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

    // Needs the schedule cannot wait for (set by the survival systems).
    this.applyNeedOverride(villagerId, behavior);

    const state = behavior.currentState;

    // Indoors: stay put while sleeping, otherwise step back outside.
    if (villager.isInsideHome) {
      if (state === BehaviourState.Sleep) {
        velocity.vx = velocity.vy = velocity.vz = 0;
        this.hold(position, steering);
        return;
      }
      this.leaveHome(villagerId, villager, position);
    }

    // Priority 1: Check for zombie threats (flee)
    if (this.checkForThreats(villagerId, villager, position, behavior, steering)) {
      return;
    }

    // If was fleeing but threat is gone, return to idle
    if (villager.isFleeing) {
      villager.isFleeing = false;
      villager.fleeTarget = null;
      villager.targetPosition = null;
      behavior.previousState = behavior.currentState;
      behavior.currentState = BehaviourState.Idle;
      behavior.stateTimer = 0;
    }

    // A scheduled activity change invalidates the previous destination.
    if (behavior.currentState !== villager.currentTask) {
      villager.currentTask = behavior.currentState;
      villager.targetPosition = null;
      villager.currentPOI = null;
      this.travelTime.delete(villagerId);
    }

    // Priority 2: Handle current behavior state
    switch (behavior.currentState) {
      case BehaviourState.Flee:
        this.updateFleeing(villager, position, velocity, steering);
        break;
      case BehaviourState.Sleep:
        this.updateSleeping(villagerId, villager, position, velocity, steering, deltaTime);
        break;
      case BehaviourState.Eat:
        this.updateAtPOI(villagerId, villager, position, velocity, steering, 'market', deltaTime, EAT_RATE);
        break;
      case BehaviourState.Drink:
        this.updateAtPOI(villagerId, villager, position, velocity, steering, 'well', deltaTime, DRINK_RATE);
        break;
      case BehaviourState.Work:
        this.updateWorking(villagerId, villager, position, velocity, steering, deltaTime);
        break;
      case BehaviourState.Socialize:
        this.updateSocializing(villagerId, villager, position, velocity, steering, deltaTime);
        break;
      case BehaviourState.Patrol:
        this.updatePatrolling(villagerId, villager, position, velocity, steering, deltaTime);
        break;
      case BehaviourState.Seek:
        this.updateMovingToTarget(villager, position, velocity, steering, deltaTime);
        break;
      case BehaviourState.Wander:
        this.updateWandering(villagerId, villager, position, velocity, steering, deltaTime);
        break;
      default:
        this.updateIdle(villagerId, villager, position, velocity, behavior, deltaTime);
        this.hold(position, steering);
        break;
    }
  }

  // ── Routine helpers ─────────────────────────────────────────────

  /** While the schedule is overridden, pick the most pressing unmet need. */
  private applyNeedOverride(villagerId: EntityId, behavior: AIBehaviourComponent): void {
    const schedule = this.world.getComponent<ScheduleComponent>(villagerId, 'Schedule');
    if (!schedule?.overridden) return;

    const hunger = this.world.getComponent<HungerComponent>(villagerId, 'Hunger');
    const thirst = this.world.getComponent<ThirstComponent>(villagerId, 'Thirst');
    const energy = this.world.getComponent<EnergyComponent>(villagerId, 'Energy');

    let pick: BehaviourState | null = null;
    let lowest = NEED_PULL_LEVEL;
    if (thirst && thirst.level < lowest) { pick = BehaviourState.Drink; lowest = thirst.level; }
    if (hunger && hunger.level < lowest) { pick = BehaviourState.Eat; lowest = hunger.level; }
    if (energy && energy.level < lowest) { pick = BehaviourState.Sleep; lowest = energy.level; }

    if (pick && behavior.currentState !== pick) {
      behavior.previousState = behavior.currentState;
      behavior.currentState = pick;
      behavior.stateTimer = 0;
    }
  }

  /** Stable per-villager spot near a POI so groups fan out instead of stacking. */
  private spotAt(poi: PointOfInterest, villagerId: EntityId): { x: number; y: number; z: number } {
    const angle = villagerId * 2.399;
    const radius = 1.6 + (villagerId % 3) * 1.1;
    return {
      x: poi.position.x + Math.cos(angle) * radius,
      y: poi.position.y,
      z: poi.position.z + Math.sin(angle) * radius
    };
  }

  /** A stable pick among POIs of one type, spreading villagers across them. */
  private pickPOI(position: PositionComponent, villagerId: EntityId, type: PointOfInterest['type']): PointOfInterest | null {
    const matches = this.pointsOfInterest.filter(p => p.type === type);
    if (matches.length === 0) return this.findNearestPOI(position);
    return matches[villagerId % matches.length];
  }

  /**
   * Walks toward `target`; returns true once within `threshold`.
   * Abandons destinations that cannot be reached (water, bowl edge).
   */
  private travel(
    villagerId: EntityId,
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent,
    target: { x: number; y: number; z: number },
    deltaTime: number,
    threshold = this.config.arrivalThreshold,
    speed = villager.speed
  ): boolean {
    if (this.distanceToTarget(position, target) < threshold) {
      velocity.vx = velocity.vy = velocity.vz = 0;
      this.hold(position, steering);
      this.travelTime.delete(villagerId);
      return true;
    }

    const elapsed = (this.travelTime.get(villagerId) ?? 0) + deltaTime;
    if (elapsed > MAX_TRAVEL_TIME) {
      this.travelTime.delete(villagerId);
      villager.targetPosition = null;
      velocity.vx = velocity.vy = velocity.vz = 0;
      this.hold(position, steering);
      return true;
    }
    this.travelTime.set(villagerId, elapsed);

    villager.targetPosition = target;
    steering.target = { x: target.x, y: target.y, z: target.z };
    this.moveToward(villager, position, velocity, steering, speed);
    return false;
  }

  /** Pins the steering target to the villager so SteeringSystem does not wander them. */
  private hold(position: PositionComponent, steering: SteeringComponent): void {
    steering.target = { x: position.x, y: position.y, z: position.z };
  }

  private homePosition(villager: VillagerComponent, position: PositionComponent): { x: number; y: number; z: number } | null {
    if (villager.home !== null) {
      const home = this.world.getComponent<PositionComponent>(villager.home, 'Position');
      if (home) return { x: home.x, y: home.y, z: home.z };
    }
    const poi = this.findNearestPOI(position, 'home');
    return poi ? { ...poi.position } : null;
  }

  private setVisible(villagerId: EntityId, visible: boolean): void {
    const model = this.world.getComponent<ModelComponent>(villagerId, 'Model');
    if (model) model.visible = visible;
  }

  private leaveHome(villagerId: EntityId, villager: VillagerComponent, position: PositionComponent): void {
    const home = this.homePosition(villager, position);
    if (home) {
      // Step out on the plaza side of the house.
      const len = Math.hypot(home.x, home.z) || 1;
      position.x = home.x - (home.x / len) * (DOOR_RADIUS + 1.2);
      position.z = home.z - (home.z / len) * (DOOR_RADIUS + 1.2);
    }
    villager.isInsideHome = false;
    this.setVisible(villagerId, true);
  }

  // ── Scheduled routines ──────────────────────────────────────────

  private updateSleeping(
    villagerId: EntityId,
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent,
    deltaTime: number
  ): void {
    const home = this.homePosition(villager, position);
    if (!home) {
      // Nowhere to go: bed down where they stand.
      velocity.vx = velocity.vy = velocity.vz = 0;
      this.hold(position, steering);
      return;
    }
    if (this.travel(villagerId, villager, position, velocity, steering, home, deltaTime, DOOR_RADIUS)
      && this.distanceToTarget(position, home) < DOOR_RADIUS) {
      villager.isInsideHome = true;
      this.setVisible(villagerId, false);
    }
  }

  /** Eating at the market, drinking at a well: walk there, then restore the need. */
  private updateAtPOI(
    villagerId: EntityId,
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent,
    type: 'market' | 'well',
    deltaTime: number,
    restorePerSecond: number
  ): void {
    const poi = this.pickPOI(position, villagerId, type);
    if (!poi) {
      velocity.vx = velocity.vy = velocity.vz = 0;
      this.hold(position, steering);
      return;
    }
    villager.currentPOI = poi.id;
    if (!this.travel(villagerId, villager, position, velocity, steering, this.spotAt(poi, villagerId), deltaTime)) return;

    if (type === 'market') {
      const hunger = this.world.getComponent<HungerComponent>(villagerId, 'Hunger');
      if (hunger) hunger.level = Math.min(100, hunger.level + restorePerSecond * deltaTime);
    } else {
      const thirst = this.world.getComponent<ThirstComponent>(villagerId, 'Thirst');
      if (thirst) thirst.level = Math.min(100, thirst.level + restorePerSecond * deltaTime);
    }
  }

  private updateWorking(
    villagerId: EntityId,
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent,
    deltaTime: number
  ): void {
    const poi = this.pickPOI(position, villagerId, 'work');
    if (!poi) {
      velocity.vx = velocity.vy = velocity.vz = 0;
      this.hold(position, steering);
      return;
    }
    villager.currentPOI = poi.id;
    this.travel(villagerId, villager, position, velocity, steering, this.spotAt(poi, villagerId), deltaTime);
  }

  private updatePatrolling(
    villagerId: EntityId,
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent,
    deltaTime: number
  ): void {
    if (!villager.targetPosition) {
      const stops = this.pointsOfInterest.filter(p => p.type !== 'home');
      if (stops.length === 0) {
        velocity.vx = velocity.vy = velocity.vz = 0;
        this.hold(position, steering);
        return;
      }
      const poi = stops[Math.floor(Math.random() * stops.length)];
      villager.currentPOI = poi.id;
      villager.targetPosition = this.spotAt(poi, villagerId);
    }
    if (this.travel(villagerId, villager, position, velocity, steering, villager.targetPosition, deltaTime, undefined, villager.speed * 0.8)) {
      villager.targetPosition = null;
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

  // ── Social ──────────────────────────────────────────────────────

  /** Gather at a social POI (plaza) and mingle. */
  private updateSocializing(
    villagerId: EntityId,
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent,
    deltaTime: number
  ): void {
    const poi = this.pickPOI(position, villagerId, 'social');
    if (!poi) {
      velocity.vx = velocity.vy = velocity.vz = 0;
      this.hold(position, steering);
      return;
    }
    villager.currentPOI = poi.id;
    if (!this.travel(villagerId, villager, position, velocity, steering, this.spotAt(poi, villagerId), deltaTime)) return;

    // Remember who is close, for flavour in the inspector.
    const nearby = this.spatialGrid.query(position, this.config.socialRadius)
      .find(id => id !== villagerId && this.world.getComponent<VillagerComponent>(id, 'Villager') !== null);
    if (nearby !== undefined && !villager.socialGroup.includes(nearby)) villager.socialGroup.push(nearby);
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
    villagerId: EntityId,
    villager: VillagerComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    steering: SteeringComponent,
    deltaTime: number
  ): void {
    if (!villager.targetPosition) {
      // Pick a dry nearby point; a few tries is plenty.
      const { waterLevel } = TerrainSystem.getActiveConfig();
      for (let i = 0; i < 6 && !villager.targetPosition; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 6 + Math.random() * 14;
        const x = position.x + Math.cos(angle) * dist;
        const z = position.z + Math.sin(angle) * dist;
        const y = TerrainSystem.getTerrainHeight(x, z);
        if (y > waterLevel + 0.8) villager.targetPosition = { x, y, z };
      }
      if (!villager.targetPosition) {
        velocity.vx = velocity.vy = velocity.vz = 0;
        this.hold(position, steering);
        return;
      }
    }

    if (this.travel(villagerId, villager, position, velocity, steering, villager.targetPosition, deltaTime)) {
      villager.targetPosition = null;
    }
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

  /** Replaces every point of interest (used when a new level is laid out). */
  setPOIs(pois: PointOfInterest[]): void {
    this.pointsOfInterest = [...pois];
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
