/**
 * FishAnimation
 *
 * Animation controller for fish characters.
 * Handles tail swishing and body undulation.
 *
 * @module render/animation
 */

export interface FishParts {
  root: any;
  body: any;
  tail: any;
}

/**
 * Controller for fish animations
 */
export class FishAnimation {
  private swimPhase = 0;

  /**
   * Updates fish animation
   */
  update(parts: FishParts, deltaTime: number, speed: number): void {
    if (!parts.root) return;

    const swimSpeed = 8 + speed * 20;

    // Update phase
    this.swimPhase += deltaTime * swimSpeed;

    // Tail swishing
    if (parts.tail) {
      const tailSwing = 0.4 + speed * 0.3;
      parts.tail.rotation.y = Math.sin(this.swimPhase) * tailSwing;
    }

    // Body undulation
    if (parts.body) {
      parts.body.rotation.y = Math.sin(this.swimPhase - 0.5) * 0.1;
      // Slight vertical bob
      parts.body.position.y += Math.sin(this.swimPhase * 0.5) * 0.002;
    }
  }

  /**
   * Resets animation phase
   */
  reset(): void {
    this.swimPhase = 0;
  }
}

/**
 * Factory function for creating FishAnimation instances
 */
export function createFishAnimation(): FishAnimation {
  return new FishAnimation();
}
