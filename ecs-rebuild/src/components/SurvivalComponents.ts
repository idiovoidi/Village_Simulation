/**
 * Survival Components
 * 
 * Components for tracking survival needs like hunger, thirst, energy, temperature, and mood.
 * These drive realistic behavior in villagers and other creatures.
 */

import type { Component } from '../core/Component';

/**
 * Hunger tracking component.
 * Represents the need for food.
 */
export interface HungerComponent extends Component {
  readonly type: 'Hunger';
  level: number; // 0-100, 0 = starving, 100 = full
  depletionRate: number; // Units per second
  criticalThreshold: number; // Triggers urgent behavior
}

/**
 * Thirst tracking component.
 * Represents the need for water.
 */
export interface ThirstComponent extends Component {
  readonly type: 'Thirst';
  level: number; // 0-100, 0 = dehydrated, 100 = hydrated
  depletionRate: number; // Units per second
  criticalThreshold: number; // Triggers urgent behavior
}

/**
 * Energy tracking component.
 * Represents stamina and need for rest.
 */
export interface EnergyComponent extends Component {
  readonly type: 'Energy';
  level: number; // 0-100, 0 = exhausted, 100 = energized
  depletionRate: number; // Base depletion per second
  restoreRate: number; // Restoration per second when sleeping
  activityMultiplier: number; // Affects depletion based on activity
}

/**
 * Body temperature component.
 * Affected by weather and environment.
 */
export interface TemperatureComponent extends Component {
  readonly type: 'Temperature';
  bodyTemperature: number; // Current body temperature
  comfortMin: number; // Minimum comfortable temperature
  comfortMax: number; // Maximum comfortable temperature
  environmentalEffect: number; // Rate of temperature change from environment
}

/**
 * Mood state component.
 * Influenced by survival needs and social interactions.
 */
export interface MoodComponent extends Component {
  readonly type: 'Mood';
  moodLevel: number; // -100 to 100, negative = bad mood, positive = good mood
  modifiers: Array<{
    source: string;
    value: number;
    duration: number;
  }>;
  baselineRecoveryRate: number; // Rate of return to neutral mood
}

/**
 * Factory functions for creating survival components with default values.
 */

export function createHungerComponent(
  level = 100,
  depletionRate = 0.5,
  criticalThreshold = 20
): HungerComponent {
  return {
    type: 'Hunger',
    level,
    depletionRate,
    criticalThreshold
  };
}

export function createThirstComponent(
  level = 100,
  depletionRate = 0.7,
  criticalThreshold = 15
): ThirstComponent {
  return {
    type: 'Thirst',
    level,
    depletionRate,
    criticalThreshold
  };
}

export function createEnergyComponent(
  level = 100,
  depletionRate = 0.3,
  restoreRate = 2.0,
  activityMultiplier = 1.0
): EnergyComponent {
  return {
    type: 'Energy',
    level,
    depletionRate,
    restoreRate,
    activityMultiplier
  };
}

export function createTemperatureComponent(
  bodyTemperature = 37.0,
  comfortMin = 18.0,
  comfortMax = 26.0
): TemperatureComponent {
  return {
    type: 'Temperature',
    bodyTemperature,
    comfortMin,
    comfortMax,
    environmentalEffect: 0
  };
}

export function createMoodComponent(
  moodLevel = 0,
  baselineRecoveryRate = 0.1
): MoodComponent {
  return {
    type: 'Mood',
    moodLevel,
    modifiers: [],
    baselineRecoveryRate
  };
}
