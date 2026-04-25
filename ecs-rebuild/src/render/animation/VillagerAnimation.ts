/**
 * VillagerAnimation
 *
 * Animation definitions and controller for villager characters.
 * Creates procedural animations for idle, walk, work, and greet states.
 *
 * @module render/animation
 */

import { AnimationController } from './AnimationController';

export interface VillagerParts {
  root: any;
  torso: any;
  head: any;
  leftArm: any;
  rightArm: any;
  leftLeg: any;
  rightLeg: any;
}

/**
 * Creates and applies villager animations
 */
export class VillagerAnimation {
  private scene: any;

  constructor(scene: any) {
    this.scene = scene;
  }

  /**
   * Creates all animation groups for a villager
   */
  createAnimations(parts: VillagerParts): AnimationController {
    const BABYLON = (window as any).BABYLON;

    // Create animation groups
    const animations: Record<string, any> = {};

    // Idle animation - subtle swaying
    animations.idle = this.createIdleAnimation(parts);

    // Walk animation - arm and leg movement
    animations.walk = this.createWalkAnimation(parts);

    // Work animation - arm movement
    animations.work = this.createWorkAnimation(parts);

    // Greet animation - arm wave
    animations.greet = this.createGreetAnimation(parts);

    // Store on root node
    parts.root.animationGroups = animations;

    return new AnimationController(parts.root);
  }

  /**
   * Creates idle animation
   */
  private createIdleAnimation(parts: VillagerParts): any {
    const BABYLON = (window as any).BABYLON;

    const idleAnimation = new BABYLON.Animation(
      'idleAnimation',
      'rotation.y',
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const idleKeys = [
      { frame: 0, value: -0.05 },
      { frame: 30, value: 0.05 },
      { frame: 60, value: -0.05 }
    ];

    idleAnimation.setKeys(idleKeys);

    const idleGroup = new BABYLON.AnimationGroup('idle', this.scene);
    idleGroup.addTargetedAnimation(idleAnimation, parts.root);
    idleGroup.normalize(0, 60);

    return idleGroup;
  }

  /**
   * Creates walk animation
   */
  private createWalkAnimation(parts: VillagerParts): any {
    const BABYLON = (window as any).BABYLON;

    // Left arm animation
    const leftArmAnim = new BABYLON.Animation(
      'walkLeftArm',
      'rotation.x',
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    leftArmAnim.setKeys([
      { frame: 0, value: -0.5 },
      { frame: 15, value: 0.5 },
      { frame: 30, value: -0.5 }
    ]);

    // Right arm animation (opposite phase)
    const rightArmAnim = new BABYLON.Animation(
      'walkRightArm',
      'rotation.x',
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    rightArmAnim.setKeys([
      { frame: 0, value: 0.5 },
      { frame: 15, value: -0.5 },
      { frame: 30, value: 0.5 }
    ]);

    // Left leg animation
    const leftLegAnim = new BABYLON.Animation(
      'walkLeftLeg',
      'rotation.x',
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    leftLegAnim.setKeys([
      { frame: 0, value: 0.5 },
      { frame: 15, value: -0.3 },
      { frame: 30, value: 0.5 }
    ]);

    // Right leg animation (opposite phase)
    const rightLegAnim = new BABYLON.Animation(
      'walkRightLeg',
      'rotation.x',
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    rightLegAnim.setKeys([
      { frame: 0, value: -0.3 },
      { frame: 15, value: 0.5 },
      { frame: 30, value: -0.3 }
    ]);

    const walkGroup = new BABYLON.AnimationGroup('walk', this.scene);
    walkGroup.addTargetedAnimation(leftArmAnim, parts.leftArm);
    walkGroup.addTargetedAnimation(rightArmAnim, parts.rightArm);
    walkGroup.addTargetedAnimation(leftLegAnim, parts.leftLeg);
    walkGroup.addTargetedAnimation(rightLegAnim, parts.rightLeg);
    walkGroup.normalize(0, 30);

    return walkGroup;
  }

  /**
   * Creates work animation (hammering motion)
   */
  private createWorkAnimation(parts: VillagerParts): any {
    const BABYLON = (window as any).BABYLON;

    const workAnim = new BABYLON.Animation(
      'workAnimation',
      'rotation.x',
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );

    workAnim.setKeys([
      { frame: 0, value: -0.2 },
      { frame: 10, value: -0.8 },
      { frame: 20, value: -0.2 },
      { frame: 30, value: -0.2 }
    ]);

    const workGroup = new BABYLON.AnimationGroup('work', this.scene);
    workGroup.addTargetedAnimation(workAnim, parts.rightArm);
    workGroup.normalize(0, 30);

    return workGroup;
  }

  /**
   * Creates greet animation (waving)
   */
  private createGreetAnimation(parts: VillagerParts): any {
    const BABYLON = (window as any).BABYLON;

    const greetAnim = new BABYLON.Animation(
      'greetAnimation',
      'rotation.z',
      30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );

    greetAnim.setKeys([
      { frame: 0, value: 0 },
      { frame: 5, value: -0.5 },
      { frame: 10, value: 0 },
      { frame: 15, value: -0.5 },
      { frame: 20, value: 0 },
      { frame: 30, value: 0 }
    ]);

    const greetGroup = new BABYLON.AnimationGroup('greet', this.scene);
    greetGroup.addTargetedAnimation(greetAnim, parts.rightArm);
    greetGroup.normalize(0, 30);

    return greetGroup;
  }
}

/**
 * Factory function for creating villager animations
 */
export function createVillagerAnimation(scene: any): VillagerAnimation {
  return new VillagerAnimation(scene);
}
