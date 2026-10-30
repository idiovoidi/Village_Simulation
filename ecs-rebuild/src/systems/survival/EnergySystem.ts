/**
 * Energy System
 * 
 * Manages energy depletion based on activity level and restoration during sleep.
 * Triggers sleep behavior when energy is depleted.
 * 
 * Requirements: 19.3, 19.8
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { ComponentSignature } from '../../core/Component.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { EnergyComponent } from '../../components/SurvivalComponents.ts';
import type { AIBehaviourComponent, ScheduleComponent } from '../../components/AIComponents.ts';
import { BehaviourState } from '../../components/AIComponents.ts';

/** Energy at or below this level overrides the schedule so the villager rests. */
const CRITICAL_ENERGY = 10;

/**
 * System that manages energy depletion and restoration.
 */
export class EnergySystem extends System {
  readonly componentSignature: ComponentSignature = new Set(['Energy']);
  readonly priority = 312; // Game logic systems priority range

  constructor(world: World) {
    super(world);
  }

  update(deltaTime: number): void {
    const entities = this.queryEntities();

    for (const entityId of entities) {
      this.updateEnergy(entityId, deltaTime);
    }
  }

  /**
   * Updates energy for a single entity.
   */
  private updateEnergy(entityId: EntityId, deltaTime: number): void {
    const energy = this.world.getComponent<EnergyComponent>(entityId, 'Energy');
    if (!energy) return;

    const behavior = this.world.getComponent<AIBehaviourComponent>(entityId, 'AIBehaviour');

    // Check if entity is sleeping
    if (behavior && behavior.currentState === BehaviourState.Sleep) {
      // Restore energy when sleeping
      energy.level += energy.restoreRate * deltaTime;
    } else {
      // Decrease energy based on activity level
      const activityDepletion = energy.depletionRate * energy.activityMultiplier * deltaTime;
      energy.level -= activityDepletion;
    }

    // Clamp to valid range [0, 100]
    energy.level = Math.max(0, Math.min(100, energy.level));

    // Rest before total exhaustion, like hunger and thirst react at their thresholds
    if (energy.level <= CRITICAL_ENERGY) {
      this.triggerSleepBehavior(entityId);
    }
  }

  /**
   * Triggers sleep behavior when energy is depleted.
   * Overrides the entity's schedule to prioritize rest.
   */
  private triggerSleepBehavior(entityId: EntityId): void {
    const schedule = this.world.getComponent<ScheduleComponent>(entityId, 'Schedule');
    if (schedule) {
      // Mark schedule as overridden so DecisionSystem can prioritize sleeping
      schedule.overridden = true;
    }
  }
}
