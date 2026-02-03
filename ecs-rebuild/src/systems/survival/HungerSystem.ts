/**
 * Hunger System
 * 
 * Manages hunger depletion over time for entities with hunger components.
 * Triggers critical behavior when hunger reaches low levels.
 * 
 * Requirements: 19.1, 19.6
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { ComponentSignature } from '../../core/Component.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { HungerComponent } from '../../components/SurvivalComponents.ts';
import type { ScheduleComponent } from '../../components/AIComponents.ts';

/**
 * System that manages hunger depletion and critical behavior triggers.
 */
export class HungerSystem extends System {
  readonly componentSignature: ComponentSignature = new Set(['Hunger']);
  readonly priority = 310; // Game logic systems priority range

  constructor(world: World) {
    super(world);
  }

  update(deltaTime: number): void {
    const entities = this.queryEntities();

    for (const entityId of entities) {
      this.updateHunger(entityId, deltaTime);
    }
  }

  /**
   * Updates hunger for a single entity.
   */
  private updateHunger(entityId: EntityId, deltaTime: number): void {
    const hunger = this.world.getComponent<HungerComponent>(entityId, 'Hunger');
    if (!hunger) return;

    // Decrease hunger over time
    hunger.level -= hunger.depletionRate * deltaTime;

    // Clamp to valid range [0, 100]
    hunger.level = Math.max(0, Math.min(100, hunger.level));

    // Check if hunger is critical and override schedule if needed
    if (hunger.level < hunger.criticalThreshold) {
      this.triggerCriticalBehavior(entityId);
    }
  }

  /**
   * Triggers critical behavior when hunger is low.
   * Overrides the entity's schedule to prioritize finding food.
   */
  private triggerCriticalBehavior(entityId: EntityId): void {
    const schedule = this.world.getComponent<ScheduleComponent>(entityId, 'Schedule');
    if (schedule) {
      // Mark schedule as overridden so DecisionSystem can prioritize eating
      schedule.overridden = true;
    }
  }
}
