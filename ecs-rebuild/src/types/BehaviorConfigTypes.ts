/**
 * Behavior Config Types
 *
 * Configuration type definitions for AI behavior systems.
 * Used to tune behavior parameters without code changes.
 *
 * @module types
 */

import type { Vec3 } from './AgentTypes.ts';

/**
 * Configuration for zombie behavior system
 */
export interface ZombieBehaviorConfigType {
  lurgeCheckInterval: number;
  lurgeNearCameraBonus: number;
  suspiciousDuration: number;
  obstacleCheckInterval: number;
  wanderRadius: number;
  pursueRadius: number;
  attackRange: number;
}

/**
 * Configuration for villager behavior system
 */
export interface VillagerBehaviorConfigType {
  fleeRadius: number;
  fleeDistance: number;
  socialRadius: number;
  arrivalThreshold: number;
  idleDecisionDelay: number;
}

/**
 * Configuration for dog behavior system
 */
export interface DogBehaviorConfigType {
  territoryRadius: number;
  chaseRadius: number;
  returnRadius: number;
  wanderRadius: number;
  sniffDuration: number;
  barkCooldown: number;
}

/**
 * Configuration for fish swim system
 */
export interface FishSwimConfigType {
  schoolRadius: number;
  separationRadius: number;
  alignmentWeight: number;
  cohesionWeight: number;
  separationWeight: number;
  wanderWeight: number;
  depthRange: { min: number; max: number };
  speedRange: { min: number; max: number };
}

/**
 * Configuration for dinosaur behavior system
 */
export interface DinosaurBehaviorConfigType {
  territoryRadius: number;
  detectionRadius: number;
  attackRange: number;
  roarCooldown: number;
  wanderRadius: number;
}

/**
 * Configuration for boat navigation system
 */
export interface BoatNavigationConfigType {
  waypointRadius: number;
  dockRadius: number;
  maxSpeed: number;
  turnSpeed: number;
  avoidanceRadius: number;
}

/**
 * Spawn configuration for entity types
 */
export interface SpawnConfigType {
  entityType: string;
  maxCount: number;
  spawnInterval: number;
  spawnRadius: { min: number; max: number };
  safeRadius: number;
  minDistance: number;
  maxAttempts: number;
  spawnPosition?: Vec3;
}
