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
