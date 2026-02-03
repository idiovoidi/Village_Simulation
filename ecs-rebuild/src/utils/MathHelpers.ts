/**
 * Math Helpers
 * 
 * Utility functions for common mathematical calculations.
 * Provides clamping, interpolation, angle conversions, and more.
 * 
 * Requirements: 18.5
 */

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linearly interpolates between two values.
 * 
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Inverse linear interpolation - finds t for a value between a and b.
 */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) {
    return 0;
  }
  return (value - a) / (b - a);
}

/**
 * Maps a value from one range to another.
 */
export function map(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = inverseLerp(inMin, inMax, value);
  return lerp(outMin, outMax, t);
}

/**
 * Converts degrees to radians.
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees.
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Wraps an angle to the range [0, 2π).
 */
export function wrapAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

/**
 * Calculates the shortest angular difference between two angles.
 */
export function angleDifference(a: number, b: number): number {
  const diff = wrapAngle(b - a);
  return diff > Math.PI ? diff - Math.PI * 2 : diff;
}

/**
 * Smoothly interpolates between two values using smoothstep.
 */
export function smoothstep(a: number, b: number, t: number): number {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * Smoother interpolation using smootherstep.
 */
export function smootherstep(a: number, b: number, t: number): number {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Checks if a value is approximately equal to another.
 */
export function approximately(a: number, b: number, epsilon = 0.0001): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Checks if a value is within a range (inclusive).
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Returns the sign of a number (-1, 0, or 1).
 */
export function sign(value: number): number {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

/**
 * Rounds a number to a specified number of decimal places.
 */
export function roundTo(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Calculates the percentage of a value within a range.
 */
export function percentage(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100;
}

/**
 * Calculates a value from a percentage within a range.
 */
export function fromPercentage(percentage: number, min: number, max: number): number {
  return min + (max - min) * (percentage / 100);
}

/**
 * Snaps a value to the nearest multiple of step.
 */
export function snap(value: number, step: number): number {
  if (step === 0) {
    return value;
  }
  return Math.round(value / step) * step;
}

/**
 * Calculates the average of an array of numbers.
 */
export function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Finds the minimum value in an array.
 */
export function min(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.min(...values);
}

/**
 * Finds the maximum value in an array.
 */
export function max(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.max(...values);
}

/**
 * Calculates the sum of an array of numbers.
 */
export function sum(values: number[]): number {
  return values.reduce((total, val) => total + val, 0);
}

/**
 * Calculates the standard deviation of an array of numbers.
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const avg = average(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = average(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

/**
 * Generates a random integer between min (inclusive) and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random float between min (inclusive) and max (exclusive).
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Returns a random element from an array.
 */
export function randomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) {
    return undefined;
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffles an array in place using Fisher-Yates algorithm.
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Calculates the factorial of a number.
 */
export function factorial(n: number): number {
  if (n < 0) {
    return 0;
  }
  if (n === 0 || n === 1) {
    return 1;
  }
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Calculates the binomial coefficient (n choose k).
 */
export function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) {
    return 0;
  }
  return factorial(n) / (factorial(k) * factorial(n - k));
}

/**
 * Checks if a number is a power of two.
 */
export function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0;
}

/**
 * Rounds a number up to the nearest power of two.
 */
export function nextPowerOfTwo(value: number): number {
  if (value <= 0) {
    return 1;
  }
  return Math.pow(2, Math.ceil(Math.log2(value)));
}
