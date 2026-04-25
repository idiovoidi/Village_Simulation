/**
 * DogAnimation
 *
 * Animation controller for dog characters.
 * Handles leg movement, tail wagging, and idle breathing.
 *
 * @module render/animation
 */

export interface DogParts {
  root: any;
  body: any;
  head: any;
  snout: any;
  legs: any[];
  tail: any;
}

/**
 * Controller for dog animations
 */
export class DogAnimation {
  private walkPhase = 0;
  private tailPhase = 0;
  private breathePhase = 0;

  /**
   * Updates dog animation
   */
  update(parts: DogParts, deltaTime: number, speed: number): void {
    if (!parts.root) return;

    const isMoving = speed > 0.01;

    // Update phases
    this.walkPhase += deltaTime * (8 + speed * 15);
    this.tailPhase += deltaTime * 6;
    this.breathePhase += deltaTime * 2;

    // Leg animation (trot gait - diagonal pairs)
    if (parts.legs && parts.legs.length >= 4) {
      if (isMoving) {
        const legSwing = 0.4;
        // Front-left + Back-right (diagonal pair)
        parts.legs[0].rotation.x = Math.sin(this.walkPhase) * legSwing;
        parts.legs[3].rotation.x = Math.sin(this.walkPhase) * legSwing;
        // Front-right + Back-left (other diagonal pair)
        parts.legs[1].rotation.x = Math.sin(this.walkPhase + Math.PI) * legSwing;
        parts.legs[2].rotation.x = Math.sin(this.walkPhase + Math.PI) * legSwing;
      } else {
        // Standing - legs return to neutral
        for (const leg of parts.legs) {
          leg.rotation.x *= 0.9;
        }
      }
    }

    // Tail wagging
    if (parts.tail) {
      const wagAmount = isMoving ? 0.3 : 0.5;
      parts.tail.rotation.y = Math.sin(this.tailPhase) * wagAmount;
    }

    // Head bob while moving
    if (parts.head && isMoving) {
      parts.head.position.y += Math.sin(this.walkPhase * 2) * 0.01;
    }

    // Idle breathing
    if (parts.body && !isMoving) {
      parts.body.scaling.y = 1 + Math.sin(this.breathePhase) * 0.02;
    }
  }

  /**
   * Resets animation phases
   */
  reset(): void {
    this.walkPhase = 0;
    this.tailPhase = 0;
    this.breathePhase = 0;
  }
}

/**
 * Factory function for creating DogAnimation instances
 */
export function createDogAnimation(): DogAnimation {
  return new DogAnimation();
}
