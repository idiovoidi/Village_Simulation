/**
 * ECS Core Module
 * 
 * Exports all core ECS types and classes.
 */

// Component types and utilities
export type {
  Component,
  ComponentType,
  ComponentSignature,
  ValidationResult,
} from './Component.ts';

export {
  isComponent,
  validateComponent,
  createSignature,
  signatureMatches,
} from './Component.ts';

// Component storage
export type { EntityId } from './ComponentStorage.ts';
export { ComponentStorage } from './ComponentStorage.ts';

// Entity types and utilities
export type { Entity } from './Entity.ts';
export { createEntity, ComponentMaskManager } from './Entity.ts';

// World
export { World } from './World.ts';

// System
export { System } from './System.ts';

// Legacy DI bootstrap (NOT used by live GameManager / World path — reference only)
/** @deprecated Prefer World + GameManager. Kept for ported utilities / future cleanup. */
export {
  SimulationCore,
  EventBus,
  ServiceRegistry,
  EntityManager,
  TimeManager,
} from './SimulationCore.ts';

/** @deprecated Prefer GameManager.loadLevel. Not wired into the live bootstrap. */
export { SimulationSetup, createSimulationSetup } from './SimulationSetup.ts';

// Error Handling
export {
  SimulationError,
  SystemError,
  FatalSystemError,
  DependencyError,
  ServiceError,
  EntityError,
  ComponentError,
  PhysicsError,
  CollisionError,
  AIError,
  PathfindingError,
  BehaviorError,
  EnvironmentError,
  WeatherError,
  TerrainError,
  WaterError,
  catchErrors,
  logMethod,
  validateArgs,
  handleAsyncErrors,
  retry,
  throttle,
  measurePerformance,
} from './ErrorHandling.ts';

// Enhanced State Machine
export {
  EnhancedStateMachine,
  StateDefinitionBuilder,
} from './EnhancedStateMachine.ts';

export type {
  StateDefinition,
  StateContext,
  AutoTransition,
  StateHistoryEntry,
  StatePerformanceMetrics,
  StateChangeCallback,
  TransitionCallback,
} from './EnhancedStateMachine.ts';
