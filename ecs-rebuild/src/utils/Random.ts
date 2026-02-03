/**
 * Random Number Generator
 * 
 * Seeded random number generator for reproducible randomness.
 * Uses a simple LCG (Linear Congruential Generator) algorithm.
 * 
 * Requirements: 18.5
 */

/**
 * Seeded random number generator.
 * Provides reproducible random sequences for testing and debugging.
 */
export class Random {
  private seed: number;
  private readonly a = 1664525;
  private readonly c = 1013904223;
  private readonly m = Math.pow(2, 32);

  /**
   * Creates a new Random instance with the given seed.
   * 
   * @param seed - Initial seed value (defaults to current timestamp)
   */
  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  /**
   * Generates the next random number in the sequence.
   * Returns a value between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m;
  }

  /**
   * Generates a random integer between min (inclusive) and max (inclusive).
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates a random float between min (inclusive) and max (exclusive).
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Generates a random boolean value.
   * 
   * @param probability - Probability of returning true (0-1, defaults to 0.5)
   */
  nextBoolean(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Returns a random element from an array.
   */
  choice<T>(array: T[]): T | undefined {
    if (array.length === 0) {
      return undefined;
    }
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffles an array in place using Fisher-Yates algorithm.
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Generates a random sample of n elements from an array without replacement.
   */
  sample<T>(array: T[], n: number): T[] {
    if (n >= array.length) {
      return [...array];
    }
    const shuffled = this.shuffle([...array]);
    return shuffled.slice(0, n);
  }

  /**
   * Generates a random value from a normal (Gaussian) distribution.
   * Uses the Box-Muller transform.
   * 
   * @param mean - Mean of the distribution (default 0)
   * @param stdDev - Standard deviation (default 1)
   */
  nextGaussian(mean = 0, stdDev = 1): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Generates a random point on a unit circle.
   */
  nextPointOnCircle(): { x: number; y: number } {
    const angle = this.nextFloat(0, Math.PI * 2);
    return {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };
  }

  /**
   * Generates a random point inside a unit circle.
   */
  nextPointInCircle(): { x: number; y: number } {
    const angle = this.nextFloat(0, Math.PI * 2);
    const radius = Math.sqrt(this.next());
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  }

  /**
   * Generates a random point on a unit sphere.
   */
  nextPointOnSphere(): { x: number; y: number; z: number } {
    const theta = this.nextFloat(0, Math.PI * 2);
    const phi = Math.acos(2 * this.next() - 1);
    const sinPhi = Math.sin(phi);
    return {
      x: sinPhi * Math.cos(theta),
      y: sinPhi * Math.sin(theta),
      z: Math.cos(phi)
    };
  }

  /**
   * Generates a random point inside a unit sphere.
   */
  nextPointInSphere(): { x: number; y: number; z: number } {
    const point = this.nextPointOnSphere();
    const radius = Math.cbrt(this.next());
    return {
      x: point.x * radius,
      y: point.y * radius,
      z: point.z * radius
    };
  }

  /**
   * Generates a random color as RGB values (0-255).
   */
  nextColor(): { r: number; g: number; b: number } {
    return {
      r: this.nextInt(0, 255),
      g: this.nextInt(0, 255),
      b: this.nextInt(0, 255)
    };
  }

  /**
   * Generates a random UUID v4.
   */
  nextUUID(): string {
    const hex = '0123456789abcdef';
    let uuid = '';
    for (let i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) {
        uuid += '-';
      } else if (i === 14) {
        uuid += '4';
      } else if (i === 19) {
        uuid += hex[this.nextInt(8, 11)];
      } else {
        uuid += hex[this.nextInt(0, 15)];
      }
    }
    return uuid;
  }

  /**
   * Resets the random number generator with a new seed.
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * Gets the current seed value.
   */
  getSeed(): number {
    return this.seed;
  }
}

/**
 * Global random instance for convenience.
 * Use this for non-deterministic randomness.
 */
export const random = new Random();
