/**
 * Thirst System
 * 
 * Manages thirst depletion over time for entities with thirst components.
 * Triggers critical behavior when thirst reaches low levels.
 * 
 * Requirements: 19.2, 19.7
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { ComponentSignature } from '../../core/Component.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { ThirstComponent } from '../../components/SurvivalComponents.ts';
import type { ScheduleComponent } from '../../components/AIComponents.ts';

/**
 * System that manages thirst depletion and critical behavior triggers.
 */
export class ThirstSystem extends System {
  readonly componentSignature: ComponentSignature = new Set(['Thirst']);
  readonly priority = 311; // Game logic systems priority range

  constructor(world: World) {
    super(world);
  }

  update(deltaTime: number): void {
    const entities = this.queryEntities();

    for (const entityId of entities) {
      this.updateThirst(entityId, deltaTime);
    }
  }

  /**
   * Updates thirst for a single entity.
   */
  private updateThirst(entityId: EntityId, deltaTime: number): void {
    const thirst = this.world.getComponent<ThirstComponent>(entityId, 'Thirst');
    if (!thirst) return;

    // Decrease thirst over time
    thirst.level -= thirst.depletionRate * deltaTime;

    // Clamp to valid range [0, 100]
    thirst.level = Math.max(0, Math.min(100, thirst.level));

    // Check if thirst is critical and override schedule if needed
    if (thirst.level < thirst.criticalThreshold) {
      this.triggerCriticalBehavior(entityId);
    }
  }

  /**
   * Triggers critical behavior when thirst is low.
   * Overrides the entity's schedule to prioritize finding water.
   */
  private triggerCriticalBehavior(entityId: EntityId): void {
    const schedule = this.world.getComponent<ScheduleComponent>(entityId, 'Schedule');
    if (schedule) {
      // Mark schedule as overridden so DecisionSystem can prioritize drinking
      schedule.overridden = true;
    }
  }
}
