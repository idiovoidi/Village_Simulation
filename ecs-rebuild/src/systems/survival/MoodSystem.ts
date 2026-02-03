/**
 * Mood System
 * 
 * Calculates mood from survival needs and social interactions.
 * Applies mood modifiers to behavior.
 * 
 * Requirements: 19.5
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';
import type { ComponentSignature } from '../../core/Component.ts';
import type { EntityId } from '../../core/Entity.ts';
import type { MoodComponent } from '../../components/SurvivalComponents.ts';
import type {
  HungerComponent,
  ThirstComponent,
  EnergyComponent,
  TemperatureComponent
} from '../../components/SurvivalComponents.ts';

/**
 * System that manages mood calculation and its effects on behavior.
 */
export class MoodSystem extends System {
  readonly componentSignature: ComponentSignature = new Set(['Mood']);
  readonly priority = 314; // Game logic systems priority range

  constructor(world: World) {
    super(world);
  }

  update(deltaTime: number): void {
    const entities = this.queryEntities();

    for (const entityId of entities) {
      this.updateMood(entityId, deltaTime);
    }
  }

  /**
   * Updates mood for a single entity.
   */
  private updateMood(entityId: EntityId, deltaTime: number): void {
    const mood = this.world.getComponent<MoodComponent>(entityId, 'Mood');
    if (!mood) return;

    // Calculate base mood from survival needs
    const survivalMood = this.calculateSurvivalMood(entityId);

    // Apply temporary modifiers
    let modifierTotal = 0;
    const expiredModifiers: number[] = [];

    for (let i = 0; i < mood.modifiers.length; i++) {
      const modifier = mood.modifiers[i];
      modifier.duration -= deltaTime;

      if (modifier.duration <= 0) {
        expiredModifiers.push(i);
      } else {
        modifierTotal += modifier.value;
      }
    }

    // Remove expired modifiers (in reverse order to maintain indices)
    for (let i = expiredModifiers.length - 1; i >= 0; i--) {
      mood.modifiers.splice(expiredModifiers[i], 1);
    }

    // Calculate target mood level
    const targetMood = survivalMood + modifierTotal;

    // Gradually move toward target mood (baseline recovery)
    const moodDifference = targetMood - mood.moodLevel;
    const moodChange = moodDifference * mood.baselineRecoveryRate * deltaTime;
    mood.moodLevel += moodChange;

    // Clamp mood to valid range [-100, 100]
    mood.moodLevel = Math.max(-100, Math.min(100, mood.moodLevel));
  }

  /**
   * Calculates mood contribution from survival needs.
   * Returns a value between -100 and 100.
   */
  private calculateSurvivalMood(entityId: EntityId): number {
    let moodContribution = 0;
    let factorCount = 0;

    // Hunger contribution
    const hunger = this.world.getComponent<HungerComponent>(entityId, 'Hunger');
    if (hunger) {
      // High hunger = negative mood, full = positive mood
      moodContribution += (hunger.level - 50) * 0.5;
      factorCount++;
    }

    // Thirst contribution
    const thirst = this.world.getComponent<ThirstComponent>(entityId, 'Thirst');
    if (thirst) {
      // High thirst = negative mood, hydrated = positive mood
      moodContribution += (thirst.level - 50) * 0.6;
      factorCount++;
    }

    // Energy contribution
    const energy = this.world.getComponent<EnergyComponent>(entityId, 'Energy');
    if (energy) {
      // Low energy = negative mood, energized = positive mood
      moodContribution += (energy.level - 50) * 0.4;
      factorCount++;
    }

    // Temperature contribution
    const temperature = this.world.getComponent<TemperatureComponent>(entityId, 'Temperature');
    if (temperature) {
      // Outside comfort range = negative mood
      if (temperature.bodyTemperature < temperature.comfortMin) {
        const discomfort = temperature.comfortMin - temperature.bodyTemperature;
        moodContribution -= discomfort * 2;
      } else if (temperature.bodyTemperature > temperature.comfortMax) {
        const discomfort = temperature.bodyTemperature - temperature.comfortMax;
        moodContribution -= discomfort * 2;
      }
      factorCount++;
    }

    // Average the contributions if we have any factors
    if (factorCount > 0) {
      return moodContribution / factorCount;
    }

    return 0;
  }
}
