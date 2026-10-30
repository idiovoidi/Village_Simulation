/**
 * Health Components
 * 
 * Components for tracking health status, injuries, diseases, and infections.
 * Used for damage systems, disease transmission, and zombie infection mechanics.
 */

import type { Component } from '../core/Component.ts';

/**
 * Status effect types.
 */
export type StatusEffectType = 'buff' | 'debuff' | 'poison' | 'regeneration' | 'immunity';

/**
 * Active status effects component.
 * Tracks temporary buffs and debuffs affecting an entity.
 */
export interface StatusEffectComponent extends Component {
  readonly type: 'StatusEffect';
  effects: Array<{
    effectType: StatusEffectType;
    name: string;
    magnitude: number;
    duration: number;
    elapsed: number;
  }>;
}

/**
 * Physical injury tracking.
 */
export interface InjuryComponent extends Component {
  readonly type: 'Injury';
  injuries: Array<{
    bodyPart: string;
    severity: number; // 0-1, 1 = critical
    healingRate: number;
    infected: boolean;
  }>;
  totalSeverity: number;
}

/**
 * Disease tracking component.
 */
export interface DiseaseComponent extends Component {
  readonly type: 'Disease';
  diseases: Array<{
    diseaseId: string;
    name: string;
    severity: number;
    transmissionChance: number;
    symptoms: string[];
    duration: number;
    elapsed: number;
  }>;
}

/**
 * Immunity to specific diseases.
 */
export interface ImmunityComponent extends Component {
  readonly type: 'Immunity';
  immunities: Map<string, {
    diseaseId: string;
    strength: number; // 0-1, 1 = complete immunity
    acquired: number; // Timestamp when acquired
  }>;
}

/**
 * Infection stages for zombie infection.
 */
export enum InfectionStage {
  None = 'None',
  Exposed = 'Exposed',
  Incubating = 'Incubating',
  Symptomatic = 'Symptomatic',
  Critical = 'Critical',
  Converted = 'Converted'
}

/**
 * Zombie infection component.
 * Tracks progression of zombie infection from bite to conversion.
 */
export interface InfectedComponent extends Component {
  readonly type: 'Infected';
  stage: InfectionStage;
  progress: number; // 0-1 within current stage
  transmissionChance: number;
  conversionTime: number; // Total time until zombie conversion
  elapsedTime: number;
}

/**
 * Factory functions for creating health components with default values.
 */

export function createStatusEffectComponent(): StatusEffectComponent {
  return {
    type: 'StatusEffect',
    effects: []
  };
}

export function createInjuryComponent(): InjuryComponent {
  return {
    type: 'Injury',
    injuries: [],
    totalSeverity: 0
  };
}

export function createDiseaseComponent(): DiseaseComponent {
  return {
    type: 'Disease',
    diseases: []
  };
}

export function createImmunityComponent(): ImmunityComponent {
  return {
    type: 'Immunity',
    immunities: new Map()
  };
}

export function createInfectedComponent(
  stage: InfectionStage = InfectionStage.Exposed,
  transmissionChance = 0.3,
  conversionTime = 300
): InfectedComponent {
  return {
    type: 'Infected',
    stage,
    progress: 0,
    transmissionChance,
    conversionTime,
    elapsedTime: 0
  };
}

/**
 * Helper function to add a status effect.
 */
export function addStatusEffect(
  component: StatusEffectComponent,
  effect: {
    effectType: StatusEffectType;
    name: string;
    magnitude: number;
    duration: number;
  }
): void {
  component.effects.push({
    ...effect,
    elapsed: 0
  });
}

/**
 * Helper function to add an injury.
 */
export function addInjury(
  component: InjuryComponent,
  bodyPart: string,
  severity: number,
  healingRate = 0.01
): void {
  component.injuries.push({
    bodyPart,
    severity,
    healingRate,
    infected: false
  });
  component.totalSeverity = component.injuries.reduce((sum, inj) => sum + inj.severity, 0);
}

/**
 * Helper function to add immunity.
 */
export function addImmunity(
  component: ImmunityComponent,
  diseaseId: string,
  strength = 1.0
): void {
  component.immunities.set(diseaseId, {
    diseaseId,
    strength,
    acquired: Date.now()
  });
}
