/**
 * GeometryHelpers
 *
 * Utility functions for geometric calculations and transformations.
 * Used for positioning, rotation, and spatial queries.
 *
 * @module utils
 */

import type { Vector3 } from '../components/CoreComponents.ts';

/**
 * Wraps an angle to the range [-PI, PI]
 */
export function wrapAngle(angle: number): number {
  const PI2 = Math.PI * 2;
  let result = angle;
  while (result > Math.PI) result -= PI2;
  while (result < -Math.PI) result += PI2;
  return result;
}

/**
 * Calculates the distance between two points
 */
export function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates the squared distance (faster than distance when comparing)
 */
export function distanceSquared(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Normalizes a vector
 */
export function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Clamps a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Calculates the angle between two vectors (in radians)
 */
export function angleBetween(a: Vector3, b: Vector3): number {
  const magA = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  const magB = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
  if (magA === 0 || magB === 0) return 0;
  const dot = (a.x * b.x + a.y * b.y + a.z * b.z) / (magA * magB);
  return Math.acos(clamp(dot, -1, 1));
}

/**
 * Generates a random position within a circle
 */
export function randomPointInCircle(radius: number): { x: number; z: number } {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return {
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r
  };
}

/**
 * Generates a random position within a sphere
 */
export function randomPointInSphere(radius: number): Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi)
  };
}

/**
 * Gets the yaw rotation to look from position A to position B
 */
export function lookAtRotation(from: Vector3, to: Vector3): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return Math.atan2(dx, dz);
}
