/**
 * ZombieAnimation
 *
 * Animation controller for zombie characters.
 * Handles shambling walk, arm swinging, and idle swaying.
 *
 * @module render/animation
 */

export interface ZombieParts {
  root: any;
  torso: any;
  head: any;
  neck: any;
  leftArm: any;
  rightArm: any;
  leftLeg: any;
  rightLeg: any;
}

/**
 * Controller for zombie animations
 */
export class ZombieAnimation {
  private walkPhase = 0;
  private swayPhase = 0;
  private breathePhase = 0;

  /**
   * Updates zombie animation
   */
  update(parts: ZombieParts, deltaTime: number, speed: number, state: string = 'idle'): void {
    if (!parts.root) return;

    const isMoving = speed > 0.01;
    const isPursuing = state === 'pursuing' || state === 'attacking';

    // Update phases
    this.walkPhase += deltaTime * (4 + speed * 8);
    this.swayPhase += deltaTime * 2;
    this.breathePhase += deltaTime * 1;

    // Leg animation (shambling - uneven gait)
    if (parts.leftLeg && parts.rightLeg) {
      if (isMoving) {
        const legSwing = isPursuing ? 0.5 : 0.3;
        parts.leftLeg.rotation.x = Math.sin(this.walkPhase) * legSwing;
        parts.rightLeg.rotation.x = Math.sin(this.walkPhase + Math.PI * 0.8) * legSwing;
      } else {
        parts.leftLeg.rotation.x *= 0.9;
        parts.rightLeg.rotation.x *= 0.9;
      }
    }

    // Arm animation (swinging loosely, more erratic when pursuing)
    if (parts.leftArm && parts.rightArm) {
      if (isMoving) {
        const armSwing = isPursuing ? 0.7 : 0.4;
        parts.leftArm.rotation.x = Math.sin(this.walkPhase + Math.PI) * armSwing;
        parts.rightArm.rotation.x = Math.sin(this.walkPhase) * armSwing;
        // Arms slightly forward when pursuing
        if (isPursuing) {
          parts.leftArm.rotation.x += 0.3;
          parts.rightArm.rotation.x += 0.3;
        }
      } else {
        // Arms hang loosely at sides
        parts.leftArm.rotation.x *= 0.95;
        parts.rightArm.rotation.x *= 0.95;
        parts.leftArm.rotation.z = Math.sin(this.swayPhase) * 0.05;
        parts.rightArm.rotation.z = Math.sin(this.swayPhase + 1) * -0.05;
      }
    }

    // Head sway (zombies don't hold their head straight)
    if (parts.head) {
      const headSway = isMoving ? 0.1 : 0.05;
      parts.head.rotation.z = Math.sin(this.swayPhase * 1.3) * headSway;
      parts.head.rotation.x = Math.sin(this.swayPhase * 0.7) * 0.03;
    }

    // Torso sway (shambling wobble)
    if (parts.torso) {
      const torsoSway = isMoving ? 0.05 : 0.02;
      parts.torso.rotation.z = Math.sin(this.swayPhase) * torsoSway;
    }

    // Idle breathing (subtle)
    if (parts.torso && !isMoving) {
      parts.torso.scaling.y = 1 + Math.sin(this.breathePhase) * 0.01;
    }
  }

  /**
   * Resets animation phases
   */
  reset(): void {
    this.walkPhase = 0;
    this.swayPhase = 0;
    this.breathePhase = 0;
  }
}

/**
 * Factory function for creating ZombieAnimation instances
 */
export function createZombieAnimation(): ZombieAnimation {
  return new ZombieAnimation();
}
