/**
 * Reproduction Components
 * 
 * Components for reproduction, pregnancy, aging, and genetic inheritance.
 * Enables population dynamics and genetic evolution in the simulation.
 */

import type { Component } from '../core/Component';

/**
 * Reproduction capability component.
 * Tracks fertility and reproduction cooldowns.
 */
export interface ReproductionComponent extends Component {
  readonly type: 'Reproduction';
  canReproduce: boolean;
  partner: number | null; // Entity ID of current partner
  cooldownRemaining: number;
  fertilityRate: number; // 0-1, chance of successful reproduction
}

/**
 * Pregnancy tracking component.
 * Manages pregnancy duration and offspring genetics.
 */
export interface PregnancyComponent extends Component {
  readonly type: 'Pregnancy';
  duration: number; // Total pregnancy duration in seconds
  elapsed: number; // Time elapsed in seconds
  parent1: number; // Entity ID of first parent
  parent2: number; // Entity ID of second parent
  genetics: GeneticData; // Combined genetics for offspring
}

/**
 * Life stages for aging system.
 */
export enum LifeStage {
  Child = 'Child',
  Adult = 'Adult',
  Elder = 'Elder'
}

/**
 * Age tracking component.
 * Manages life stage transitions and mortality.
 */
export interface AgeComponent extends Component {
  readonly type: 'Age';
  years: number;
  lifeStage: LifeStage;
  mortalityChance: number; // Increases with age
}

/**
 * Fertility tracking component.
 * Affects reproduction success rates.
 */
export interface FertilityComponent extends Component {
  readonly type: 'Fertility';
  fertilityRate: number; // Base fertility rate
  modifiers: Array<{
    source: string;
    multiplier: number;
  }>;
  effectiveFertility: number; // Calculated from base and modifiers
}

/**
 * Genetic trait definition.
 */
export interface GeneticTrait {
  name: string;
  allele1: string;
  allele2: string;
  dominant: string;
  expressed: string;
}

/**
 * Genetic data for inheritance calculations.
 */
export interface GeneticData {
  traits: GeneticTrait[];
  mutationRate: number;
}

/**
 * Genetics component for trait inheritance.
 * Implements Mendelian genetics with mutations.
 */
export interface GeneticsComponent extends Component {
  readonly type: 'Genetics';
  traits: GeneticTrait[];
  mutationRate: number;
}

/**
 * Factory functions for creating reproduction components with default values.
 */

export function createReproductionComponent(
  canReproduce = true,
  fertilityRate = 0.8,
  cooldownRemaining = 0
): ReproductionComponent {
  return {
    type: 'Reproduction',
    canReproduce,
    partner: null,
    cooldownRemaining,
    fertilityRate
  };
}

export function createPregnancyComponent(
  parent1: number,
  parent2: number,
  genetics: GeneticData,
  duration = 300
): PregnancyComponent {
  return {
    type: 'Pregnancy',
    duration,
    elapsed: 0,
    parent1,
    parent2,
    genetics
  };
}

export function createAgeComponent(
  years = 18,
  lifeStage: LifeStage = LifeStage.Adult
): AgeComponent {
  return {
    type: 'Age',
    years,
    lifeStage,
    mortalityChance: calculateMortalityChance(years, lifeStage)
  };
}

export function createFertilityComponent(fertilityRate = 0.8): FertilityComponent {
  return {
    type: 'Fertility',
    fertilityRate,
    modifiers: [],
    effectiveFertility: fertilityRate
  };
}

export function createGeneticsComponent(
  traits: GeneticTrait[] = [],
  mutationRate = 0.01
): GeneticsComponent {
  return {
    type: 'Genetics',
    traits,
    mutationRate
  };
}

/**
 * Helper function to calculate mortality chance based on age and life stage.
 */
function calculateMortalityChance(years: number, lifeStage: LifeStage): number {
  switch (lifeStage) {
    case LifeStage.Child:
      return 0.001;
    case LifeStage.Adult:
      return 0.002 + (years - 18) * 0.0001;
    case LifeStage.Elder:
      return 0.01 + (years - 60) * 0.001;
    default:
      return 0.001;
  }
}

/**
 * Helper function to create a genetic trait.
 */
export function createGeneticTrait(
  name: string,
  allele1: string,
  allele2: string,
  dominant: string
): GeneticTrait {
  const expressed = allele1 === dominant || allele2 === dominant ? dominant : allele1;
  return {
    name,
    allele1,
    allele2,
    dominant,
    expressed
  };
}

/**
 * Helper function to combine parent genetics for offspring.
 */
export function combineGenetics(
  parent1Genetics: GeneticsComponent,
  parent2Genetics: GeneticsComponent,
  mutationRate: number
): GeneticData {
  const offspringTraits: GeneticTrait[] = [];

  // Combine traits from both parents
  for (let i = 0; i < parent1Genetics.traits.length; i++) {
    const trait1 = parent1Genetics.traits[i];
    const trait2 = parent2Genetics.traits[i];

    // Randomly select one allele from each parent
    const allele1 = Math.random() < 0.5 ? trait1.allele1 : trait1.allele2;
    const allele2 = Math.random() < 0.5 ? trait2.allele1 : trait2.allele2;

    // Apply mutation chance
    const finalAllele1 = Math.random() < mutationRate ? mutateAllele(allele1) : allele1;
    const finalAllele2 = Math.random() < mutationRate ? mutateAllele(allele2) : allele2;

    offspringTraits.push(
      createGeneticTrait(trait1.name, finalAllele1, finalAllele2, trait1.dominant)
    );
  }

  return {
    traits: offspringTraits,
    mutationRate
  };
}

/**
 * Helper function to mutate an allele.
 */
function mutateAllele(allele: string): string {
  // Simple mutation: append 'm' to indicate mutation
  return `${allele}m`;
}
