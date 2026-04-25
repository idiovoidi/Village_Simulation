/**
 * Zombie Behavior System
 *
 * Manages zombie AI behaviors including target detection, chasing, attacking,
 * lurge mechanic, shambling movement, suspicious state, and obstacle avoidance.
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
import type { PositionComponent, VelocityComponent, HealthComponent } from '../../components/CoreComponents';
import { SpatialGrid } from '../../utils/SpatialGrid';

/**
 * Configuration for zombie behavior tuning
 */
export interface ZombieBehaviorConfig {
  lurgeCheckInterval: number;
  lurgeNearCameraBonus: number;
  suspiciousDuration: number;
  obstacleCheckInterval: number;
  wanderRadius: number;
  pursueRadius: number;
  attackRange: number;
}

const DEFAULT_CONFIG: ZombieBehaviorConfig = {
  lurgeCheckInterval: 500,
  lurgeNearCameraBonus: 2,
  suspiciousDuration: 2,
  obstacleCheckInterval: 10,
  wanderRadius: 30,
  pursueRadius: 40,
  attackRange: 3
};

/**
 * System that manages zombie behavior including detection, chasing, attacking,
 * lurge bursts, shambling movement, and suspicious investigation.
 */
export class ZombieBehaviorSystem extends System {
  readonly componentSignature: ComponentSignature = new Set([
    'Zombie',
    'Position',
    'Velocity',
    'AIBehaviour',
    'Steering'
  ]);
  readonly priority = 115;

  private spatialGrid: SpatialGrid;
  private config: ZombieBehaviorConfig;
  private lastLurgeCheck: Map<EntityId, number> = new Map();

  constructor(world: World, spatialGrid?: SpatialGrid, config?: Partial<ZombieBehaviorConfig>) {
    super(world);
    this.spatialGrid = spatialGrid || new SpatialGrid(20);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  initialize(): void {
    this.updateSpatialGrid();
  }

  update(deltaTime: number): void {
    this.updateSpatialGrid();

    const zombies = this.queryEntities();
    for (const zombieId of zombies) {
      this.updateZombieBehavior(zombieId, deltaTime);
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
   * Main behavior update for a single zombie
   */
  private updateZombieBehavior(zombieId: EntityId, deltaTime: number): void {
    const zombie = this.world.getComponent<ZombieComponent>(zombieId, 'Zombie');
    const position = this.world.getComponent<PositionComponent>(zombieId, 'Position');
    const velocity = this.world.getComponent<VelocityComponent>(zombieId, 'Velocity');
    const behavior = this.world.getComponent<AIBehaviourComponent>(zombieId, 'AIBehaviour');
    const steering = this.world.getComponent<SteeringComponent>(zombieId, 'Steering');

    if (!zombie || !position || !velocity || !behavior || !steering) return;

    // Update attack cooldown
    if (zombie.attackCooldown > 0) {
      zombie.attackCooldown -= deltaTime;
    }

    // Update lurge
    if (zombie.isLurging) {
      this.updateLurge(zombie, position, steering, deltaTime);
    } else {
      this.checkLurgeTrigger(zombieId, zombie, position, deltaTime);
    }

    // Skip normal behavior while lurging
    if (zombie.isLurging) return;

    // Check if current target is still valid
    if (zombie.targetEntity !== null) {
      if (!this.isValidTarget(zombie.targetEntity)) {
        zombie.targetEntity = null;
      }
    }

    // State-based behavior
    switch (behavior.currentState) {
      case BehaviourState.Idle:
        this.updateIdleBehavior(zombieId, zombie, position, velocity, behavior, steering, deltaTime);
        break;
      case BehaviourState.Attack:
        this.updatePursuingBehavior(zombieId, zombie, position, behavior, steering, deltaTime);
        break;
      case BehaviourState.Wander:
        this.updateWanderBehavior(zombieId, zombie, position, velocity, behavior, steering, deltaTime);
        break;
      case BehaviourState.Seek:
        this.updateSuspiciousBehavior(zombieId, zombie, position, behavior, steering, deltaTime);
        break;
    }
  }

  // ── Lurge Mechanic ──────────────────────────────────────────────

  private updateLurge(
    zombie: ZombieComponent,
    _position: PositionComponent,
    steering: SteeringComponent,
    deltaTime: number
  ): void {
    zombie.lurgeTimer -= deltaTime;

    if (zombie.lurgeTimer <= 0) {
      zombie.isLurging = false;
      zombie.speed = zombie.minSpeed + Math.random() * (zombie.maxSpeed - zombie.minSpeed);
    } else if (zombie.lurgeDirection) {
      steering.steeringForce = {
        x: -zombie.lurgeDirection.x * zombie.speed * zombie.lurgeSpeedMultiplier,
        y: 0,
        z: -zombie.lurgeDirection.z * zombie.speed * zombie.lurgeSpeedMultiplier
      };
    }
  }

  private checkLurgeTrigger(
    zombieId: EntityId,
    zombie: ZombieComponent,
    position: PositionComponent,
    deltaTime: number
  ): void {
    const now = Date.now();
    const lastCheck = this.lastLurgeCheck.get(zombieId) ?? 0;
    if (now - lastCheck < this.config.lurgeCheckInterval) return;
    this.lastLurgeCheck.set(zombieId, now);

    const chanceMultiplier = this.isNearCamera(position) ? this.config.lurgeNearCameraBonus : 1;
    if (Math.random() < zombie.lurgeChance * chanceMultiplier * deltaTime * 60) {
      this.startLurge(zombie, position);
    }
  }

  private startLurge(zombie: ZombieComponent, position: PositionComponent): void {
    zombie.isLurging = true;
    zombie.lurgeTimer = zombie.lurgeDuration;
    zombie.speed = zombie.maxSpeed * zombie.lurgeSpeedMultiplier;

    const cameraPos = this.getCameraPosition();
    if (cameraPos) {
      zombie.lurgeDirection = {
        x: position.x - cameraPos.x,
        y: 0,
        z: position.z - cameraPos.z
      };
      const len = Math.sqrt(zombie.lurgeDirection.x ** 2 + zombie.lurgeDirection.z ** 2);
      if (len > 0) {
        zombie.lurgeDirection.x /= len;
        zombie.lurgeDirection.z /= len;
      }
    }
  }

  // ── Idle Behavior ────────────────────────────────────────────────

  private updateIdleBehavior(
    zombieId: EntityId,
    zombie: ZombieComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    behavior: AIBehaviourComponent,
    _steering: SteeringComponent,
    deltaTime: number
  ): void {
    const nearestVillager = this.detectNearestVillager(zombieId, position, zombie.detectionRadius);
    if (nearestVillager) {
      zombie.targetEntity = nearestVillager;
      behavior.previousState = behavior.currentState;
      behavior.currentState = BehaviourState.Attack;
      behavior.stateTimer = 0;
      return;
    }

    if (Math.random() < 0.01 * deltaTime * 60) {
      this.selectNewWanderTarget(zombie, position);
      behavior.previousState = behavior.currentState;
      behavior.currentState = BehaviourState.Wander;
      behavior.stateTimer = 0;
    }

    velocity.vx = 0;
    velocity.vy = 0;
    velocity.vz = 0;
  }

  // ── Wander Behavior (with shambling) ────────────────────────────

  private updateWanderBehavior(
    zombieId: EntityId,
    zombie: ZombieComponent,
    position: PositionComponent,
    velocity: VelocityComponent,
    behavior: AIBehaviourComponent,
    steering: SteeringComponent,
    deltaTime: number
  ): void {
    const nearestVillager = this.detectNearestVillager(zombieId, position, zombie.detectionRadius);
    if (nearestVillager) {
      zombie.targetEntity = nearestVillager;
      behavior.previousState = behavior.currentState;
      behavior.currentState = BehaviourState.Attack;
      behavior.stateTimer = 0;
      return;
    }

    this.moveTowardTargetWithShamble(zombie, position, velocity, steering, deltaTime);
  }

  // ── Pursuing/Attacking Behavior ─────────────────────────────────

  private updatePursuingBehavior(
    zombieId: EntityId,
    zombie: ZombieComponent,
    position: PositionComponent,
    behavior: AIBehaviourComponent,
    steering: SteeringComponent,
    deltaTime: number
  ): void {
    if (zombie.targetEntity === null) {
      behavior.previousState = behavior.currentState;
      behavior.currentState = BehaviourState.Idle;
      behavior.stateTimer = 0;
      return;
    }

    const targetPosition = this.world.getComponent<PositionComponent>(zombie.targetEntity, 'Position');
    if (!targetPosition) {
      zombie.targetEntity = null;
      behavior.previousState = behavior.currentState;
      behavior.currentState = BehaviourState.Idle;
      behavior.stateTimer = 0;
      return;
    }

    const distance = this.calculateDistance(position, targetPosition);

    if (distance > this.config.pursueRadius) {
      zombie.targetEntity = null;
      behavior.previousState = behavior.currentState;
      behavior.currentState = BehaviourState.Idle;
      behavior.stateTimer = 0;
      return;
    }

    if (distance <= this.config.attackRange) {
      this.attemptAttack(zombieId, zombie, position, deltaTime);
      steering.steeringForce = { x: 0, y: 0, z: 0 };
      return;
    }

    steering.target = {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z
    };
    steering.steeringForce = {
      x: (targetPosition.x - position.x) * zombie.speed * 2,
      y: 0,
      z: (targetPosition.z - position.z) * zombie.speed * 2
    };
  }

  // ── Suspicious Behavior ─────────────────────────────────────────

  private updateSuspiciousBehavior(
    zombieId: EntityId,
    zombie: ZombieComponent,
    position: PositionComponent,
    behavior: AIBehaviourComponent,
    steering: SteeringComponent,
    deltaTime: number
  ): void {
    const nearestVillager = this.detectNearestVillager(zombieId, position, zombie.detectionRadius);
    if (nearestVillager) {
      zombie.targetEntity = nearestVillager;
      behavior.previousState = behavior.currentState;
      behavior.currentState = BehaviourState.Attack;
      behavior.stateTimer = 0;
      zombie.suspiciousTimer = null;
      return;
    }

    if (zombie.suspiciousTimer !== null) {
      zombie.suspiciousTimer -= deltaTime;
      if (zombie.suspiciousTimer <= 0) {
        zombie.suspiciousTimer = null;
        behavior.previousState = behavior.currentState;
        behavior.currentState = BehaviourState.Idle;
        behavior.stateTimer = 0;
      }
      steering.steeringForce = { x: 0, y: 0, z: 0 };
    }
  }

  // ── Shambling Movement ──────────────────────────────────────────

  private moveTowardTargetWithShamble(
    zombie: ZombieComponent,
    position: PositionComponent,
    _velocity: VelocityComponent,
    steering: SteeringComponent,
    _deltaTime: number
  ): void {
    if (!zombie.targetPosition) {
      this.selectNewWanderTarget(zombie, position);
      return;
    }

    const dx = zombie.targetPosition.x - position.x;
    const dz = zombie.targetPosition.z - position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 1.0) {
      zombie.targetPosition = null;
      steering.steeringForce = { x: 0, y: 0, z: 0 };
      return;
    }

    // Check for obstacles
    if (this.isPathBlocked(zombie, position)) {
      this.findAlternatePath(zombie, position);
      return;
    }

    const dirX = dx / distance;
    const dirZ = dz / distance;
    const wobble = Math.sin(Date.now() * 0.003 + zombie.swayOffset) * zombie.swayAmount;

    steering.steeringForce = {
      x: (dirX * zombie.speed + wobble * dirZ) * 40,
      y: 0,
      z: (dirZ * zombie.speed - wobble * dirX) * 40
    };
  }

  // ── Path Blocking / Obstacle Avoidance ──────────────────────────

  private isPathBlocked(
    zombie: ZombieComponent,
    position: PositionComponent
  ): boolean {
    if (!zombie.targetPosition) return false;
    const dist = Math.sqrt(
      (zombie.targetPosition.x - position.x) ** 2 +
      (zombie.targetPosition.z - position.z) ** 2
    );
    if (dist > 5) return false;

    const frameId = Math.floor(Date.now() / 16);
    if (frameId % this.config.obstacleCheckInterval !== 0) {
      return zombie.lastRaycastResult;
    }

    zombie.lastRaycastResult = false;
    return false;
  }

  private findAlternatePath(
    zombie: ZombieComponent,
    position: PositionComponent
  ): void {
    const angle = (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 4);
    const currentAngle = Math.atan2(
      zombie.targetPosition ? zombie.targetPosition.x - position.x : 0,
      zombie.targetPosition ? zombie.targetPosition.z - position.z : 1
    );
    const newAngle = currentAngle + angle;

    zombie.targetPosition = {
      x: position.x + Math.sin(newAngle) * 10,
      y: position.y,
      z: position.z + Math.cos(newAngle) * 10
    };
  }

  // ── Target Selection ────────────────────────────────────────────

  private selectNewWanderTarget(
    zombie: ZombieComponent,
    position: PositionComponent
  ): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.config.wanderRadius;
    zombie.targetPosition = {
      x: position.x + Math.cos(angle) * radius,
      y: position.y,
      z: position.z + Math.sin(angle) * radius
    };
  }

  // ── Detection ───────────────────────────────────────────────────

  private detectNearestVillager(
    zombieId: EntityId,
    zombiePosition: PositionComponent,
    detectionRadius: number
  ): EntityId | null {
    const nearbyEntities = this.spatialGrid.query(zombiePosition, detectionRadius);

    let nearestVillager: EntityId | null = null;
    let nearestDistance = detectionRadius;

    for (const entityId of nearbyEntities) {
      if (entityId === zombieId) continue;

      const villager = this.world.getComponent<VillagerComponent>(entityId, 'Villager');
      if (!villager) continue;

      const health = this.world.getComponent<HealthComponent>(entityId, 'Health');
      if (health && health.current <= 0) continue;

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

  private isValidTarget(targetId: EntityId): boolean {
    const entity = this.world.getEntity(targetId);
    if (!entity || !entity.active) return false;

    const villager = this.world.getComponent<VillagerComponent>(targetId, 'Villager');
    if (!villager) return false;

    const health = this.world.getComponent<HealthComponent>(targetId, 'Health');
    if (health && health.current <= 0) return false;

    return true;
  }

  // ── Attack ──────────────────────────────────────────────────────

  private attemptAttack(
    zombieId: EntityId,
    zombie: ZombieComponent,
    zombiePosition: PositionComponent,
    _deltaTime: number
  ): void {
    if (zombie.targetEntity === null) return;
    if (zombie.attackCooldown > 0) return;

    const targetPosition = this.world.getComponent<PositionComponent>(zombie.targetEntity, 'Position');
    if (!targetPosition) return;

    const distance = this.calculateDistance(zombiePosition, targetPosition);
    if (distance <= this.config.attackRange) {
      this.performAttack(zombieId, zombie, zombie.targetEntity);
      zombie.attackCooldown = 1.0;
    }
  }

  private performAttack(_zombieId: EntityId, zombie: ZombieComponent, targetId: EntityId): void {
    const targetHealth = this.world.getComponent<HealthComponent>(targetId, 'Health');
    if (!targetHealth) return;

    targetHealth.current = Math.max(0, targetHealth.current - zombie.attackDamage);
    if (targetHealth.current <= 0) {
      zombie.targetEntity = null;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private calculateDistance(pos1: PositionComponent, pos2: PositionComponent): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private isNearCamera(position: PositionComponent): boolean {
    const cameraPos = this.getCameraPosition();
    if (!cameraPos) return false;
    const dx = cameraPos.x - position.x;
    const dz = cameraPos.z - position.z;
    return Math.sqrt(dx * dx + dz * dz) < 30;
  }

  private getCameraPosition(): { x: number; y: number; z: number } | null {
    const BABYLON = (window as any).BABYLON;
    if (!BABYLON || !BABYLON.sceneInstance) return null;
    const camera = BABYLON.sceneInstance.activeCamera;
    if (!camera) return null;
    return { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  }

  setSpatialGrid(grid: SpatialGrid): void {
    this.spatialGrid = grid;
  }

  getSpatialGrid(): SpatialGrid {
    return this.spatialGrid;
  }
}
