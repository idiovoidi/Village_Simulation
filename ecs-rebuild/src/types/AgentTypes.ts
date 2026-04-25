/**
 * Agent Types
 *
 * Shared type definitions for agent-related systems and components.
 * Extracted from legacy agent code for cross-system reuse.
 *
 * @module types
 */

/**
 * 3D vector representation used across the ECS
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Agent behavior states (mirrors BehaviourState from AIComponents)
 */
export const AgentState = {
  Idle: 'Idle',
  Wander: 'Wander',
  Seek: 'Seek',
  Flee: 'Flee',
  Follow: 'Follow',
  Work: 'Work',
  Sleep: 'Sleep',
  Eat: 'Eat',
  Drink: 'Drink',
  Socialize: 'Socialize',
  Attack: 'Attack',
  Patrol: 'Patrol'
} as const;

export type AgentState = typeof AgentState[keyof typeof AgentState];

/**
 * Zombie-specific states (extends AgentState)
 */
export const ZombieState = {
  ...AgentState,
  Suspicious: 'Suspicious',
  Lurging: 'Lurging'
} as const;

export type ZombieState = typeof ZombieState[keyof typeof ZombieState];

/**
 * Villager-specific states (extends AgentState)
 */
export const VillagerState = {
  ...AgentState,
  InsideHome: 'InsideHome',
  MovingToTarget: 'MovingToTarget'
} as const;

export type VillagerState = typeof VillagerState[keyof typeof VillagerState];

/**
 * Point of Interest type identifiers
 */
export type POIType = 'market' | 'well' | 'work' | 'home' | 'social';

/**
 * Generic agent configuration for factory methods
 */
export interface AgentConfig {
  position?: Vec3;
  name?: string;
  [key: string]: unknown;
}

/**
 * Lurge configuration for zombie behavior
 */
export interface LurgeConfig {
  chance: number;
  duration: number;
  speedMultiplier: number;
  nearCameraBonus: number;
  checkInterval: number;
}

/**
 * Movement parameters shared across agents
 */
export interface MovementConfig {
  minSpeed: number;
  maxSpeed: number;
  swayAmount: number;
  swayOffset: number;
}
