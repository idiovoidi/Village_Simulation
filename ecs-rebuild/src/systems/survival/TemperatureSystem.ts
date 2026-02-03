/**
 * Temperature System
 * 
 * Calculates body temperature based on environmental conditions.
 * Applies temperature effects to survival stats.
 * 
 * Requirements: 19.4
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { ComponentSignature } from '../../core/Component.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { TemperatureComponent } from '../../components/SurvivalComponents.ts';
import type { HungerComponent, ThirstComponent, EnergyComponent } from '../../components/SurvivalComponents.ts';

/**
 * System that manages body temperature and its effects on survival.
 */
export class TemperatureSystem extends System {
  readonly componentSignature: ComponentSignature = new Set(['Temperature']);
  readonly priority = 313; // Game logic systems priority range

  constructor(world: World) {
    super(world);
  }

  update(deltaTime: number): void {
    const entities = this.queryEntities();

    for (const entityId of entities) {
      this.updateTemperature(entityId, deltaTime);
    }
  }

  /**
   * Updates temperature for a single entity.
   */
  private updateTemperature(entityId: EntityId, deltaTime: number): void {
    const temperature = this.world.getComponent<TemperatureComponent>(entityId, 'Temperature');
    if (!temperature) return;

    // Apply environmental temperature change
    temperature.bodyTemperature += temperature.environmentalEffect * deltaTime;

    // Check if temperature is outside comfort range and apply effects
    if (temperature.bodyTemperature < temperature.comfortMin) {
      this.applyHypothermiaEffects(entityId, temperature.comfortMin - temperature.bodyTemperature, deltaTime);
    } else if (temperature.bodyTemperature > temperature.comfortMax) {
      this.applyHyperthermiaEffects(entityId, temperature.bodyTemperature - temperature.comfortMax, deltaTime);
    }
  }

  /**
   * Applies effects when body temperature is too low (hypothermia).
   */
  private applyHypothermiaEffects(entityId: EntityId, severity: number, deltaTime: number): void {
    // Increase hunger and energy depletion when cold
    const hunger = this.world.getComponent<HungerComponent>(entityId, 'Hunger');
    const energy = this.world.getComponent<EnergyComponent>(entityId, 'Energy');

    if (hunger) {
      // Cold increases hunger depletion rate
      const coldEffect = severity * 0.1 * deltaTime;
      hunger.level -= coldEffect;
      hunger.level = Math.max(0, hunger.level);
    }

    if (energy) {
      // Cold increases energy depletion rate
      const coldEffect = severity * 0.15 * deltaTime;
      energy.level -= coldEffect;
      energy.level = Math.max(0, energy.level);
    }
  }

  /**
   * Applies effects when body temperature is too high (hyperthermia).
   */
  private applyHyperthermiaEffects(entityId: EntityId, severity: number, deltaTime: number): void {
    // Increase thirst and energy depletion when hot
    const thirst = this.world.getComponent<ThirstComponent>(entityId, 'Thirst');
    const energy = this.world.getComponent<EnergyComponent>(entityId, 'Energy');

    if (thirst) {
      // Heat increases thirst depletion rate
      const heatEffect = severity * 0.2 * deltaTime;
      thirst.level -= heatEffect;
      thirst.level = Math.max(0, thirst.level);
    }

    if (energy) {
      // Heat increases energy depletion rate
      const heatEffect = severity * 0.1 * deltaTime;
      energy.level -= heatEffect;
      energy.level = Math.max(0, energy.level);
    }
  }
}
