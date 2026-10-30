/**
 * Vector3 Helpers
 * 
 * Utility functions for 3D vector mathematics.
 * Provides common vector operations for physics, AI, and rendering.
 * 
 * Requirements: 18.5
 */

import type { Vector3 } from '../components/CoreComponents.ts';

/**
 * Creates a new Vector3.
 */
export function createVector3(x = 0, y = 0, z = 0): Vector3 {
  return { x, y, z };
}

/**
 * Creates a copy of a Vector3.
 */
export function cloneVector3(v: Vector3): Vector3 {
  return { x: v.x, y: v.y, z: v.z };
}

/**
 * Adds two vectors.
 */
export function addVectors(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z
  };
}

/**
 * Subtracts vector b from vector a.
 */
export function subtractVectors(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z
  };
}

/**
 * Multiplies a vector by a scalar.
 */
export function multiplyVector(v: Vector3, scalar: number): Vector3 {
  return {
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar
  };
}

/**
 * Divides a vector by a scalar.
 */
export function divideVector(v: Vector3, scalar: number): Vector3 {
  if (scalar === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: v.x / scalar,
    y: v.y / scalar,
    z: v.z / scalar
  };
}

/**
 * Calculates the dot product of two vectors.
 */
export function dotProduct(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Calculates the cross product of two vectors.
 */
export function crossProduct(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

/**
 * Calculates the length (magnitude) of a vector.
 */
export function vectorLength(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Calculates the squared length of a vector (faster than length).
 */
export function vectorLengthSquared(v: Vector3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

/**
 * Normalizes a vector to unit length.
 */
export function normalizeVector(v: Vector3): Vector3 {
  const length = vectorLength(v);
  if (length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return divideVector(v, length);
}

/**
 * Calculates the distance between two points.
 */
export function distance(a: Vector3, b: Vector3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates the squared distance between two points (faster than distance).
 */
export function distanceSquared(a: Vector3, b: Vector3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Linearly interpolates between two vectors.
 * 
 * @param a - Start vector
 * @param b - End vector
 * @param t - Interpolation factor (0-1)
 */
export function lerp(a: Vector3, b: Vector3, t: number): Vector3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  };
}

/**
 * Clamps a vector's length to a maximum value.
 */
export function clampLength(v: Vector3, maxLength: number): Vector3 {
  const length = vectorLength(v);
  if (length > maxLength) {
    return multiplyVector(normalizeVector(v), maxLength);
  }
  return v;
}

/**
 * Reflects a vector off a surface with the given normal.
 */
export function reflect(v: Vector3, normal: Vector3): Vector3 {
  const dot = dotProduct(v, normal);
  return subtractVectors(v, multiplyVector(normal, 2 * dot));
}

/**
 * Projects vector a onto vector b.
 */
export function project(a: Vector3, b: Vector3): Vector3 {
  const dot = dotProduct(a, b);
  const lengthSq = vectorLengthSquared(b);
  if (lengthSq === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return multiplyVector(b, dot / lengthSq);
}

/**
 * Checks if two vectors are approximately equal.
 */
export function vectorsEqual(a: Vector3, b: Vector3, epsilon = 0.0001): boolean {
  return (
    Math.abs(a.x - b.x) < epsilon &&
    Math.abs(a.y - b.y) < epsilon &&
    Math.abs(a.z - b.z) < epsilon
  );
}

/**
 * Returns a zero vector.
 */
export function zero(): Vector3 {
  return { x: 0, y: 0, z: 0 };
}

/**
 * Returns a unit vector pointing up.
 */
export function up(): Vector3 {
  return { x: 0, y: 1, z: 0 };
}

/**
 * Returns a unit vector pointing down.
 */
export function down(): Vector3 {
  return { x: 0, y: -1, z: 0 };
}

/**
 * Returns a unit vector pointing forward.
 */
export function forward(): Vector3 {
  return { x: 0, y: 0, z: 1 };
}

/**
 * Returns a unit vector pointing backward.
 */
export function backward(): Vector3 {
  return { x: 0, y: 0, z: -1 };
}

/**
 * Returns a unit vector pointing right.
 */
export function right(): Vector3 {
  return { x: 1, y: 0, z: 0 };
}

/**
 * Returns a unit vector pointing left.
 */
export function left(): Vector3 {
  return { x: -1, y: 0, z: 0 };
}
