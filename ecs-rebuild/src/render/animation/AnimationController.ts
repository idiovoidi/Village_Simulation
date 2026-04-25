/**
 * AnimationController
 *
 * Manages character animations using Babylon.js animation groups.
 * Provides state-based animation control for procedural models.
 *
 * @module render/animation
 */

export interface AnimationState {
  name: string;
  loop: boolean;
  speedRatio: number;
}

export type AnimationCallback = (deltaTime: number) => void;

/**
 * Controller for managing character animations
 */
export class AnimationController {
  private mesh: any;
  private animationGroups: Map<string, any> = new Map();
  private currentState: string | null = null;
  private customAnimations: Map<string, AnimationCallback> = new Map();
  private isPlaying = false;

  constructor(mesh: any) {
    this.mesh = mesh;
    this.extractAnimationGroups();
  }

  /**
   * Extracts animation groups from the mesh
   */
  private extractAnimationGroups(): void {
    if (this.mesh.animationGroups) {
      Object.entries(this.mesh.animationGroups).forEach(([name, group]) => {
        this.animationGroups.set(name, group);
      });
    }
  }

  /**
   * Plays an animation by name
   */
  play(animationName: string, loop = true, speedRatio = 1): boolean {
    // Stop current animation
    this.stop();

    const group = this.animationGroups.get(animationName);
    if (group) {
      group.speedRatio = speedRatio;
      if (loop) {
        group.play(true);
      } else {
        group.play(false);
      }
      this.currentState = animationName;
      this.isPlaying = true;
      return true;
    }

    // Check for custom animations
    const customAnim = this.customAnimations.get(animationName);
    if (customAnim) {
      this.currentState = animationName;
      this.isPlaying = true;
      return true;
    }

    console.warn(`Animation '${animationName}' not found`);
    return false;
  }

  /**
   * Stops all animations
   */
  stop(): void {
    this.animationGroups.forEach(group => {
      group.stop();
    });
    this.currentState = null;
    this.isPlaying = false;
  }

  /**
   * Updates custom animations
   */
  update(deltaTime: number): void {
    if (!this.isPlaying || !this.currentState) return;

    const customAnim = this.customAnimations.get(this.currentState);
    if (customAnim) {
      customAnim(deltaTime);
    }
  }

  /**
   * Registers a custom animation callback
   */
  registerCustomAnimation(name: string, callback: AnimationCallback): void {
    this.customAnimations.set(name, callback);
  }

  /**
   * Gets the current animation state
   */
  getCurrentState(): string | null {
    return this.currentState;
  }

  /**
   * Checks if an animation is playing
   */
  isAnimationPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Lists available animations
   */
  getAvailableAnimations(): string[] {
    return [
      ...Array.from(this.animationGroups.keys()),
      ...Array.from(this.customAnimations.keys())
    ];
  }

  /**
   * Disposes the controller
   */
  dispose(): void {
    this.stop();
    this.animationGroups.clear();
    this.customAnimations.clear();
  }
}

/**
 * Factory function for creating AnimationController instances
 */
export function createAnimationController(mesh: any): AnimationController {
  return new AnimationController(mesh);
}
