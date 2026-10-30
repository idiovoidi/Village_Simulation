/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AnimationSystem
 *
 * Procedural gait and idle animation driven by each entity's velocity.
 * Limbs are re-pivoted at their joints on first sight, then swung with a
 * speed-scaled walk cycle. Runs after RenderSystem so meshes already exist.
 */

import { System } from '../core/System.ts';
import type { World } from '../core/World.ts';
import type { EntityId } from '../core/Entity.ts';
import type { ComponentSignature } from '../core/Component.ts';
import type { ModelComponent } from '../components/RenderingComponents.ts';
import type { VelocityComponent } from '../components/CoreComponents.ts';
import type { AIBehaviourComponent } from '../components/AIComponents.ts';
import type { RenderSystem } from './RenderSystem.ts';

interface AnimState {
  phase: number;
  seed: number;
  baseTorsoY: number;
  prepared: boolean;
}

export class AnimationSystem extends System {
  readonly componentSignature: ComponentSignature = new Set(['Model', 'Velocity']);
  readonly priority = 650;

  private renderSystem: RenderSystem;
  private states = new Map<EntityId, AnimState>();
  private clock = 0;

  constructor(world: World, renderSystem: RenderSystem) {
    super(world);
    this.renderSystem = renderSystem;
  }

  update(deltaTime: number): void {
    this.clock += deltaTime;
    const B = (window as any).BABYLON;
    if (!B) return;

    for (const id of this.queryEntities()) {
      const model = this.world.getComponent<ModelComponent>(id, 'Model');
      const velocity = this.world.getComponent<VelocityComponent>(id, 'Velocity');
      const parts = this.renderSystem.getParts(id);
      if (!model || !velocity || !parts) continue;

      let state = this.states.get(id);
      if (!state) {
        state = { phase: Math.random() * 6, seed: Math.random() * 100, baseTorsoY: parts.torso?.position?.y ?? 0, prepared: false };
        this.states.set(id, state);
      }

      const speed = Math.hypot(velocity.vx, velocity.vz);

      switch (model.meshId) {
        case 'villager':
          this.animateHumanoid(parts, state, speed, deltaTime, false, this.world.getComponent<AIBehaviourComponent>(id, 'AIBehaviour')?.currentState);
          break;
        case 'zombie':
          this.animateHumanoid(parts, state, speed, deltaTime, true);
          break;
        case 'dog':
          this.animateDog(parts, state, speed, deltaTime);
          break;
        case 'bird':
          this.animateBird(parts, state);
          break;
        case 'fish':
          if (parts.tail) parts.tail.rotation.y = Math.sin(this.clock * (6 + speed * 2) + state.seed) * 0.55;
          break;
        case 'boat':
          if (parts.hull) {
            parts.hull.rotation.z = Math.sin(this.clock * 0.9 + state.seed) * 0.035;
            parts.hull.rotation.x = Math.sin(this.clock * 0.7 + state.seed * 2) * 0.02;
          }
          break;
        default:
          break;
      }
    }

    // Forget entities that no longer exist.
    if (this.states.size > 0 && this.clock % 5 < deltaTime) {
      for (const id of this.states.keys()) {
        if (!this.world.getEntity(id)) this.states.delete(id);
      }
    }
  }

  /** Moves a limb's pivot to its top so it rotates at the shoulder/hip. */
  private pivotAtTop(limb: any): void {
    const B = (window as any).BABYLON;
    if (!limb?.getBoundingInfo) return;
    const ext = limb.getBoundingInfo().boundingBox.extendSize;
    limb.setPivotPoint(new B.Vector3(0, ext.y, 0));
  }

  private animateHumanoid(parts: any, state: AnimState, speed: number, dt: number, zombie: boolean, activity?: string): void {
    const { leftArm, rightArm, leftLeg, rightLeg, torso, head } = parts;
    if (!leftLeg || !rightLeg) return;

    if (!state.prepared) {
      [leftArm, rightArm, leftLeg, rightLeg].forEach((l) => this.pivotAtTop(l));
      state.prepared = true;
    }

    const stride = zombie ? 1.6 : 2.4;
    state.phase += dt * (1.5 + speed * stride);
    const amp = Math.min(zombie ? 0.55 : 0.85, speed * (zombie ? 0.35 : 0.45));
    const swing = Math.sin(state.phase) * amp;

    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;

    if (zombie) {
      // Arms stretched out, swaying; head lolling.
      const sway = Math.sin(this.clock * 1.4 + state.seed) * 0.12;
      leftArm.rotation.x = -1.35 + sway;
      rightArm.rotation.x = -1.35 - sway;
      if (head) head.rotation.z = Math.sin(this.clock * 0.9 + state.seed) * 0.18;
      if (torso) torso.rotation.x = 0.1 + Math.abs(swing) * 0.1;
    } else {
      leftArm.rotation.x = -swing * 0.9;
      rightArm.rotation.x = swing * 0.9;
      if (head) {
        head.rotation.y = Math.sin(this.clock * 0.6 + state.seed) * 0.15 * (1 - Math.min(1, speed));
        head.rotation.x = 0;
      }
      if (torso) torso.rotation.x = 0;
      if (speed < 0.3) this.poseActivity(parts, state, activity);
    }

    if (torso) {
      torso.position.y = state.baseTorsoY + Math.abs(Math.cos(state.phase)) * 0.07 * Math.min(1, speed);
      torso.rotation.z = Math.sin(state.phase) * 0.04 * Math.min(1, speed);
    }
  }

  /** Stationary villager poses for what they are doing (working, eating, chatting...). */
  private poseActivity(parts: any, state: AnimState, activity: string | undefined): void {
    const { leftArm, rightArm, torso, head } = parts;
    const t = this.clock + state.seed;
    switch (activity) {
      case 'Work': {
        // Chopping / hammering: overhead swing with a forward lean.
        const strike = Math.max(0, Math.sin(t * 4.2));
        rightArm.rotation.x = -2.3 + strike * 1.9;
        leftArm.rotation.x = -1.1 + strike * 0.7;
        if (torso) torso.rotation.x = 0.12 + strike * 0.18;
        break;
      }
      case 'Eat': {
        // Hand to mouth, small bites.
        rightArm.rotation.x = -2.0 + Math.sin(t * 3) * 0.25;
        if (head) head.rotation.x = Math.sin(t * 3) * 0.1;
        break;
      }
      case 'Drink': {
        // Cupped hands lifted, head tipped back.
        rightArm.rotation.x = leftArm.rotation.x = -1.9 + Math.sin(t * 1.5) * 0.1;
        if (head) head.rotation.x = -0.25;
        break;
      }
      case 'Socialize': {
        // Animated chat: gesturing arm and nodding head, looking about.
        rightArm.rotation.x = -0.6 + Math.sin(t * 2.6) * 0.5 * Math.max(0, Math.sin(t * 0.7));
        if (head) {
          head.rotation.y = Math.sin(t * 0.8) * 0.5;
          head.rotation.x = Math.sin(t * 2.2) * 0.08;
        }
        break;
      }
      default:
        break;
    }
  }

  private animateDog(parts: any, state: AnimState, speed: number, dt: number): void {
    state.phase += dt * (2 + speed * 3);
    const swing = Math.sin(state.phase) * Math.min(0.8, speed * 0.4);
    const legs: any[] = parts.legs ?? [];
    if (!state.prepared) {
      legs.forEach((l) => this.pivotAtTop(l));
      state.prepared = true;
    }
    legs.forEach((leg, i) => {
      leg.rotation.x = i === 0 || i === 3 ? swing : -swing;
    });
    if (parts.tail) parts.tail.rotation.z = Math.sin(this.clock * (speed > 0.3 ? 9 : 5) + state.seed) * 0.5;
  }

  private animateBird(parts: any, state: AnimState): void {
    const flap = Math.sin(this.clock * 13 + state.seed) * 0.75;
    if (parts.wingLeft) parts.wingLeft.rotation.z = flap;
    if (parts.wingRight) parts.wingRight.rotation.z = -flap;
  }

  cleanupEntity(entityId: EntityId): void {
    this.states.delete(entityId);
  }
}
