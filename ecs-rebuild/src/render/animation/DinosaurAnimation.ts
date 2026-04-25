/**
 * DinosaurAnimation
 *
 * Animation controller for dinosaur characters.
 * Handles leg movement, tail swaying, jaw opening, and idle breathing.
 *
 * @module render/animation
 */

export interface DinosaurParts {
  root: any;
  body: any;
  head: any;
  jaw: any;
  legs: any[];
  tail: any;
}

/**
 * Controller for dinosaur animations
 */
export class DinosaurAnimation {
  private walkPhase = 0;
  private tailPhase = 0;
  private breathePhase = 0;
  private jawOpenAmount = 0;

  /**
   * Updates dinosaur animation
   */
  update(parts: DinosaurParts, deltaTime: number, speed: number): void {
    if (!parts.root) return;

    const isMoving = speed > 0.01;

    // Update phases
    this.walkPhase += deltaTime * (5 + speed * 10);
    this.tailPhase += deltaTime * 3;
    this.breathePhase += deltaTime * 1.5;

    // Leg animation (quadruped gait)
    if (parts.legs && parts.legs.length >= 4) {
      if (isMoving) {
        const legSwing = 0.3;
        // Diagonal pair gait
        parts.legs[0].rotation.x = Math.sin(this.walkPhase) * legSwing;
        parts.legs[3].rotation.x = Math.sin(this.walkPhase) * legSwing;
        parts.legs[1].rotation.x = Math.sin(this.walkPhase + Math.PI) * legSwing;
        parts.legs[2].rotation.x = Math.sin(this.walkPhase + Math.PI) * legSwing;
      } else {
        for (const leg of parts.legs) {
          leg.rotation.x *= 0.9;
        }
      }
    }

    // Tail swaying (larger, slower movement than dogs)
    if (parts.tail) {
      const swayAmount = isMoving ? 0.2 : 0.15;
      parts.tail.rotation.y = Math.sin(this.tailPhase) * swayAmount;
      // Secondary sway
      if (parts.tail.children && parts.tail.children.length > 0) {
        parts.tail.rotation.x = Math.sin(this.tailPhase * 0.7) * 0.05;
      }
    }

    // Head bob while moving
    if (parts.head && isMoving) {
      parts.head.position.y += Math.sin(this.walkPhase * 2) * 0.015;
    }

    // Jaw animation (roar)
    if (parts.jaw) {
      const targetJaw = this.jawOpenAmount;
      parts.jaw.rotation.x += (targetJaw - parts.jaw.rotation.x) * 0.1;
    }

    // Idle breathing (deeper than dogs due to size)
    if (parts.body && !isMoving) {
      parts.body.scaling.y = 1 + Math.sin(this.breathePhase) * 0.03;
    }
  }

  /**
   * Sets jaw open amount (0 = closed, 1 = fully open)
   */
  setJawOpen(amount: number): void {
    this.jawOpenAmount = Math.max(0, Math.min(1, amount));
  }

  /**
   * Triggers a roar animation
   */
  roar(duration: number = 1.0): void {
    this.setJawOpen(0.8);
    // Auto-close after duration (caller should handle timing)
    setTimeout(() => this.setJawOpen(0), duration * 1000);
  }

  /**
   * Resets animation phases
   */
  reset(): void {
    this.walkPhase = 0;
    this.tailPhase = 0;
    this.breathePhase = 0;
    this.jawOpenAmount = 0;
  }
}

/**
 * Factory function for creating DinosaurAnimation instances
 */
export function createDinosaurAnimation(): DinosaurAnimation {
  return new DinosaurAnimation();
}
