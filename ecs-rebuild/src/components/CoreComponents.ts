/**
 * Core Components
 * 
 * Fundamental components used across all entity types.
 * These components provide basic functionality like position, movement, health, and transforms.
 */

import type { Component } from '../core/Component';

/**
 * 3D position in world space.
 * Represents the location of an entity in the simulation.
 */
export interface PositionComponent extends Component {
  readonly type: 'Position';
  x: number;
  y: number;
  z: number;
}

/**
 * Movement velocity vector.
 * Represents the speed and direction of entity movement.
 */
export interface VelocityComponent extends Component {
  readonly type: 'Velocity';
  vx: number;
  vy: number;
  vz: number;
  maxSpeed: number;
}

/**
 * Health tracking for entities.
 * Manages current and maximum health values with regeneration.
 */
export interface HealthComponent extends Component {
  readonly type: 'Health';
  current: number;
  maximum: number;
  regenerationRate: number;
}

/**
 * Vector3 helper type for transform calculations.
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Quaternion helper type for rotations.
 */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * 4x4 transformation matrix.
 */
export type Matrix = number[]; // 16 elements

/**
 * Full transform with position, rotation, and scale.
 * Includes cached matrix for efficient rendering.
 */
export interface TransformComponent extends Component {
  readonly type: 'Transform';
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  matrix: Matrix;
  dirty: boolean; // Needs recalculation
}

/**
 * Entity active state.
 * Inactive entities are skipped by most systems.
 */
export interface ActiveComponent extends Component {
  readonly type: 'Active';
  active: boolean;
}

/**
 * Factory functions for creating core components with default values.
 */

export function createPositionComponent(x = 0, y = 0, z = 0): PositionComponent {
  return {
    type: 'Position',
    x,
    y,
    z
  };
}

export function createVelocityComponent(
  vx = 0,
  vy = 0,
  vz = 0,
  maxSpeed = 10
): VelocityComponent {
  return {
    type: 'Velocity',
    vx,
    vy,
    vz,
    maxSpeed
  };
}

export function createHealthComponent(
  maximum = 100,
  current?: number,
  regenerationRate = 0
): HealthComponent {
  return {
    type: 'Health',
    current: current ?? maximum,
    maximum,
    regenerationRate
  };
}

export function createTransformComponent(
  position: Vector3 = { x: 0, y: 0, z: 0 },
  rotation: Quaternion = { x: 0, y: 0, z: 0, w: 1 },
  scale: Vector3 = { x: 1, y: 1, z: 1 }
): TransformComponent {
  return {
    type: 'Transform',
    position,
    rotation,
    scale,
    matrix: createIdentityMatrix(),
    dirty: true
  };
}

export function createActiveComponent(active = true): ActiveComponent {
  return {
    type: 'Active',
    active
  };
}

/**
 * Helper function to create an identity matrix.
 */
function createIdentityMatrix(): Matrix {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}
