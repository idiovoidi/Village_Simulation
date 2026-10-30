/**
 * Physics Components
 * 
 * Components for physics simulation using Havok Physics engine.
 * These components enable entities to participate in physics simulation.
 */

import type { Component } from '../core/Component.ts';
import type { Vector3 } from './CoreComponents.ts';

/**
 * Physics body types supported by Havok.
 */
export const PhysicsBodyType = {
  Static: 'Static',
  Dynamic: 'Dynamic',
  Kinematic: 'Kinematic'
} as const;

export type PhysicsBodyType = typeof PhysicsBodyType[keyof typeof PhysicsBodyType];

/**
 * Physics shape types for collision detection.
 */
export const PhysicsShapeType = {
  Box: 'Box',
  Sphere: 'Sphere',
  Capsule: 'Capsule',
  Cylinder: 'Cylinder',
  Mesh: 'Mesh'
} as const;

export type PhysicsShapeType = typeof PhysicsShapeType[keyof typeof PhysicsShapeType];

/**
 * Physics body component.
 * Attaches a physics body to an entity for physics simulation.
 */
export interface PhysicsBodyComponent extends Component {
  readonly type: 'PhysicsBody';
  bodyType: PhysicsBodyType;
  shapeType: PhysicsShapeType;
  mass: number;
  friction: number;
  restitution: number; // Bounciness (0-1)
  linearDamping: number;
  angularDamping: number;
  dimensions: Vector3; // Size for box/sphere/capsule
  collisionGroup: number;
  collisionMask: number;
  physicsBodyId: number | null; // Reference to Havok physics body
  isKinematic: boolean;
}

/**
 * Collision callback component.
 * Stores collision event handlers for an entity.
 */
export interface CollisionComponent extends Component {
  readonly type: 'Collision';
  onCollisionEnter: ((otherEntityId: number) => void) | null;
  onCollisionStay: ((otherEntityId: number) => void) | null;
  onCollisionExit: ((otherEntityId: number) => void) | null;
  collidingWith: Set<number>; // Currently colliding entity IDs
}

/**
 * Factory functions for creating physics components with default values.
 */

export function createPhysicsBodyComponent(
  bodyType: PhysicsBodyType = PhysicsBodyType.Dynamic,
  shapeType: PhysicsShapeType = PhysicsShapeType.Box,
  mass = 1,
  dimensions: Vector3 = { x: 1, y: 1, z: 1 }
): PhysicsBodyComponent {
  return {
    type: 'PhysicsBody',
    bodyType,
    shapeType,
    mass,
    friction: 0.5,
    restitution: 0.3,
    linearDamping: 0.1,
    angularDamping: 0.1,
    dimensions,
    collisionGroup: 1,
    collisionMask: 0xFFFFFFFF,
    physicsBodyId: null,
    isKinematic: bodyType === PhysicsBodyType.Kinematic
  };
}

export function createCollisionComponent(): CollisionComponent {
  return {
    type: 'Collision',
    onCollisionEnter: null,
    onCollisionStay: null,
    onCollisionExit: null,
    collidingWith: new Set()
  };
}
