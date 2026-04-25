/**
 * BirdAnimation
 *
 * Animation controller for bird characters.
 * Handles wing flapping and tail movement.
 *
 * @module render/animation
 */

export interface BirdParts {
  root: any;
  body: any;
  wingLeft: any;
  wingRight: any;
  tail: any;
}

/**
 * Controller for bird animations
 */
export class BirdAnimation {
  private flapPhase = 0;
  private tailPhase = 0;

  /**
   * Updates bird animation
   */
  update(parts: BirdParts, deltaTime: number, speed: number): void {
    if (!parts.root) return;

    // Calculate flap parameters based on speed
    const flapSpeed = 15 + speed * 20;
    const flapAmount = 0.5 + speed * 0.5;

    // Update phases
    this.flapPhase += deltaTime * flapSpeed;
    this.tailPhase += deltaTime * 5;

    // Apply wing flapping
    if (parts.wingLeft && parts.wingRight) {
      const wingAngle = Math.sin(this.flapPhase) * flapAmount;
      parts.wingLeft.rotation.x = wingAngle;
      parts.wingRight.rotation.x = -wingAngle;
    }

    // Apply tail movement
    if (parts.tail) {
      parts.tail.rotation.y = Math.sin(this.tailPhase) * 0.1;
    }
  }

  /**
   * Resets animation phases
   */
  reset(): void {
    this.flapPhase = 0;
    this.tailPhase = 0;
  }

  /**
   * Sets the wing position directly (for gliding)
   */
  setWingPosition(parts: BirdParts, angle: number): void {
    if (parts.wingLeft && parts.wingRight) {
      parts.wingLeft.rotation.x = angle;
      parts.wingRight.rotation.x = -angle;
    }
  }
}

/**
 * Factory function for creating BirdAnimation instances
 */
export function createBirdAnimation(): BirdAnimation {
  return new BirdAnimation();
}
