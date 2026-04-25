/**
 * BoatAnimation
 *
 * Animation controller for boat/ship meshes.
 * Handles wave rocking, sail billowing, and water interaction.
 *
 * @module render/animation
 */

export interface BoatParts {
  root: any;
  hull: any;
  mast: any;
  sail: any;
}

/**
 * Controller for boat animations
 */
export class BoatAnimation {
  private rockPhase = 0;
  private sailPhase = 0;

  /**
   * Updates boat animation
   */
  update(parts: BoatParts, deltaTime: number, speed: number): void {
    if (!parts.root) return;

    // Update phases
    this.rockPhase += deltaTime * 1.5;
    this.sailPhase += deltaTime * 2;

    // Hull rocking (wave motion)
    if (parts.hull) {
      const rockAmount = 0.03 + speed * 0.02;
      parts.hull.rotation.z = Math.sin(this.rockPhase) * rockAmount;
      parts.hull.rotation.x = Math.sin(this.rockPhase * 0.7 + 1) * rockAmount * 0.5;
    }

    // Sail billowing
    if (parts.sail) {
      const billowAmount = 0.05 + speed * 0.1;
      parts.sail.scaling.x = 1 + Math.sin(this.sailPhase) * billowAmount;
    }

    // Mast slight sway
    if (parts.mast) {
      parts.mast.rotation.z = Math.sin(this.rockPhase) * 0.01;
    }
  }

  /**
   * Resets animation phases
   */
  reset(): void {
    this.rockPhase = 0;
    this.sailPhase = 0;
  }
}

/**
 * Factory function for creating BoatAnimation instances
 */
export function createBoatAnimation(): BoatAnimation {
  return new BoatAnimation();
}
