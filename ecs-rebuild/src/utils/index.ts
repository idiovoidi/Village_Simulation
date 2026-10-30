/**
 * Utility Exports
 * 
 * Central export point for all utility functions and classes.
 */

export * from './Vector3Helpers.ts';
export * from './Random.ts';
export * from './Logger.ts';
export * from './SpatialGrid.ts';
export * from './EventBus.ts';
export * from './ColorHelpers.ts';
export * from './MaterialHelpers.ts';

// Export GeometryHelpers with namespace to avoid conflicts with Vector3Helpers
export {
  wrapAngle,
  distance as geometryDistance,
  distanceSquared as geometryDistanceSquared,
  normalize as geometryNormalize,
  clamp,
  lerp as geometryLerp,
  angleBetween,
  randomPointInCircle,
  randomPointInSphere,
  lookAtRotation
} from './GeometryHelpers.ts';

// Export MathHelpers separately to avoid naming conflicts
export * as MathHelpers from './MathHelpers.ts';
