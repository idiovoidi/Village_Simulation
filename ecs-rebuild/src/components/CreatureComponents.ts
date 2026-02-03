/**
 * Creature Components
 * 
 * Components specific to different creature types in the simulation.
 * Each creature type has unique properties and behaviors.
 */

import type { Component } from '../core/Component';

/**
 * Villager-specific component.
 * Represents human NPCs with professions and social structures.
 */
export interface VillagerComponent extends Component {
  readonly type: 'Villager';
  name: string;
  profession: string;
  home: number | null; // Entity ID of home
  workplace: number | null; // Entity ID of workplace
  socialGroup: number[]; // Entity IDs of social connections
}

/**
 * Zombie-specific component.
 * Represents hostile undead creatures that chase and attack villagers.
 */
export interface ZombieComponent extends Component {
  readonly type: 'Zombie';
  aggressionLevel: number;
  targetEntity: number | null; // Entity ID of current target
  detectionRadius: number;
  attackCooldown: number;
  attackDamage: number;
}

/**
 * Fish-specific component.
 * Represents aquatic creatures with schooling behavior.
 */
export interface FishComponent extends Component {
  readonly type: 'Fish';
  schoolId: number | null;
  depthPreference: number;
  swimSpeed: number;
  species: string;
}

/**
 * Bird-specific component.
 * Represents flying creatures with flocking behavior.
 */
export interface BirdComponent extends Component {
  readonly type: 'Bird';
  flockId: number | null;
  altitude: number;
  preferredAltitude: number;
  flySpeed: number;
  species: string;
}

/**
 * Dog-specific component.
 * Represents ground-based animals with territory and owner.
 */
export interface DogComponent extends Component {
  readonly type: 'Dog';
  owner: number | null; // Entity ID of owner
  territory: {
    center: { x: number; y: number; z: number };
    radius: number;
  } | null;
  loyalty: number;
  breed: string;
}

/**
 * Boat-specific component.
 * Represents water-based vehicles with cargo and navigation.
 */
export interface BoatComponent extends Component {
  readonly type: 'Boat';
  cargo: Array<{ itemType: string; quantity: number }>;
  destination: { x: number; y: number; z: number } | null;
  capacity: number;
  speed: number;
  boatType: string;
}

/**
 * Flock/school membership component.
 * Used for group behaviors like flocking (birds) and schooling (fish).
 */
export interface FlockComponent extends Component {
  readonly type: 'Flock';
  flockId: number;
  role: 'leader' | 'follower';
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
  neighborRadius: number;
}

/**
 * Factory functions for creating creature components with default values.
 */

export function createVillagerComponent(
  name: string,
  profession = 'peasant'
): VillagerComponent {
  return {
    type: 'Villager',
    name,
    profession,
    home: null,
    workplace: null,
    socialGroup: []
  };
}

export function createZombieComponent(
  aggressionLevel = 1.0,
  detectionRadius = 20,
  attackDamage = 10
): ZombieComponent {
  return {
    type: 'Zombie',
    aggressionLevel,
    targetEntity: null,
    detectionRadius,
    attackCooldown: 0,
    attackDamage
  };
}

export function createFishComponent(
  species = 'generic',
  swimSpeed = 3
): FishComponent {
  return {
    type: 'Fish',
    schoolId: null,
    depthPreference: -5,
    swimSpeed,
    species
  };
}

export function createBirdComponent(
  species = 'generic',
  preferredAltitude = 20,
  flySpeed = 5
): BirdComponent {
  return {
    type: 'Bird',
    flockId: null,
    altitude: preferredAltitude,
    preferredAltitude,
    flySpeed,
    species
  };
}

export function createDogComponent(breed = 'generic'): DogComponent {
  return {
    type: 'Dog',
    owner: null,
    territory: null,
    loyalty: 1.0,
    breed
  };
}

export function createBoatComponent(
  boatType = 'fishing',
  capacity = 100,
  speed = 4
): BoatComponent {
  return {
    type: 'Boat',
    cargo: [],
    destination: null,
    capacity,
    speed,
    boatType
  };
}

export function createFlockComponent(
  flockId: number,
  role: 'leader' | 'follower' = 'follower'
): FlockComponent {
  return {
    type: 'Flock',
    flockId,
    role,
    separationWeight: 1.5,
    alignmentWeight: 1.0,
    cohesionWeight: 1.0,
    neighborRadius: 10
  };
}
