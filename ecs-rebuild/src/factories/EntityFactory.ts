/**
 * Entity Factory
 * 
 * Factory class for creating pre-configured entities with appropriate components.
 * Provides methods for creating all agent types and world entities.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */

import type { World } from '../core/World.ts';
import type { EntityId } from '../core/Entity.ts';
import type { Vector3 } from '../components/CoreComponents.ts';

// Core components
import {
  createPositionComponent,
  createVelocityComponent,
  createHealthComponent,
  createTransformComponent,
  createActiveComponent
} from '../components/CoreComponents.ts';

// AI components
import {
  BehaviourState,
  createAIBehaviourComponent,
  createSteeringComponent,
  createMemoryComponent,
  createScheduleComponent,
  createGoalComponent,
  createThreatComponent,
  type ScheduleActivity
} from '../components/AIComponents.ts';

// Creature components
import {
  createVillagerComponent,
  createZombieComponent,
  createFishComponent,
  createBirdComponent,
  createDogComponent,
  createBoatComponent,
  createDinosaurComponent,
  createFlockComponent
} from '../components/CreatureComponents.ts';

// Survival components
import {
  createHungerComponent,
  createThirstComponent,
  createEnergyComponent,
  createTemperatureComponent,
  createMoodComponent
} from '../components/SurvivalComponents.ts';

// Reproduction components
import {
  createReproductionComponent,
  createAgeComponent,
  createFertilityComponent,
  createGeneticsComponent,
  LifeStage
} from '../components/ReproductionComponents.ts';

// World components
import {
  createHouseComponent,
  createFieldComponent,
  createTreeComponent,
  createWellComponent,
  createResourceComponent,
  createCropComponent
} from '../components/WorldComponents.ts';

// Rendering components
import {
  createModelComponent,
  createAnimationStateComponent,
  createVisualComponent
} from '../components/RenderingComponents.ts';

// Physics components
import {
  createPhysicsBodyComponent,
  PhysicsBodyType,
  PhysicsShapeType
} from '../components/PhysicsComponents.ts';

/**
 * Configuration for entity creation.
 */
export interface EntityConfig {
  position?: Vector3;
  name?: string;
  [key: string]: unknown;
}

/**
 * EntityFactory creates pre-configured entities with appropriate components.
 */
const CHARACTER_SCALE = { x: 1.3, y: 1.3, z: 1.3 };

export class EntityFactory {
  private world: World;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Creates a villager entity with all required components.
   * 
   * @param config - Configuration for the villager
   * @returns Entity ID of the created villager
   */
  createVillager(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: 0, z: 0 };
    const name = (config.name as string) ?? this.generateName();
    const profession = (config.profession as string) ?? 'peasant';

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createVelocityComponent(0, 0, 0, 5));
    this.world.addComponent(entity, createHealthComponent(100, 100, 0.1));
    // Characters read better from the RTS camera a little larger than life.
    this.world.addComponent(entity, createTransformComponent(position, undefined, { ...CHARACTER_SCALE }));
    this.world.addComponent(entity, createActiveComponent(true));

    // AI components
    this.world.addComponent(entity, createAIBehaviourComponent(BehaviourState.Idle));
    this.world.addComponent(entity, createSteeringComponent(10, 2));
    this.world.addComponent(entity, createMemoryComponent(50, 300));
    this.world.addComponent(entity, createScheduleComponent(this.createDefaultSchedule()));
    this.world.addComponent(entity, createGoalComponent('idle', null, 1));
    this.world.addComponent(entity, createThreatComponent());

    // Creature component
    this.world.addComponent(entity, createVillagerComponent(name, profession));

    // Survival components
    this.world.addComponent(entity, createHungerComponent(100, 0.5, 20));
    this.world.addComponent(entity, createThirstComponent(100, 0.7, 15));
    this.world.addComponent(entity, createEnergyComponent(100, 0.3, 2.0, 1.0));
    this.world.addComponent(entity, createTemperatureComponent(37.0, 18.0, 26.0));
    this.world.addComponent(entity, createMoodComponent(0, 0.1));

    // Life components
    this.world.addComponent(entity, createAgeComponent(18, LifeStage.Adult));
    this.world.addComponent(entity, createReproductionComponent(true, 300));
    this.world.addComponent(entity, createFertilityComponent(0.8));
    this.world.addComponent(entity, createGeneticsComponent(this.generateGenetics()));

    // Rendering components
    this.world.addComponent(entity, createModelComponent('villager', 0, true));
    this.world.addComponent(entity, createAnimationStateComponent('idle', 1.0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 1, g: 0.8, b: 0.6 }, 1.0));

    // Kinematic: AI/steering owns movement; physics does not overwrite Position
    this.world.addComponent(entity, createPhysicsBodyComponent(
      PhysicsBodyType.Kinematic,
      PhysicsShapeType.Capsule,
      70,
      { x: 0.5, y: 1.8, z: 0.5 }
    ));

    return entity;
  }

  /**
   * Creates a zombie entity with all required components.
   * 
   * @param config - Configuration for the zombie
   * @returns Entity ID of the created zombie
   */
  createZombie(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: 0, z: 0 };
    const aggressionLevel = (config.aggressionLevel as number) ?? 1.0;

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createVelocityComponent(0, 0, 0, 3));
    this.world.addComponent(entity, createHealthComponent(80, 80, 0));
    // Characters read better from the RTS camera a little larger than life.
    this.world.addComponent(entity, createTransformComponent(position, undefined, { ...CHARACTER_SCALE }));
    this.world.addComponent(entity, createActiveComponent(true));

    // AI components
    this.world.addComponent(entity, createAIBehaviourComponent(BehaviourState.Wander));
    this.world.addComponent(entity, createSteeringComponent(8, 1));
    this.world.addComponent(entity, createMemoryComponent(20, 60));

    // Creature component
    this.world.addComponent(entity, createZombieComponent(aggressionLevel, 20, 10));

    // Rendering components
    this.world.addComponent(entity, createModelComponent('zombie', 0, true));
    this.world.addComponent(entity, createAnimationStateComponent('walk', 1.0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 0.5, g: 0.6, b: 0.4 }, 1.0));

    // Physics components
    this.world.addComponent(entity, createPhysicsBodyComponent(
      PhysicsBodyType.Kinematic,
      PhysicsShapeType.Capsule,
      80,
      { x: 0.5, y: 1.8, z: 0.5 }
    ));

    return entity;
  }

  /**
   * Creates a fish entity with schooling behavior.
   * 
   * @param config - Configuration for the fish
   * @returns Entity ID of the created fish
   */
  createFish(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: -5, z: 0 };
    const species = (config.species as string) ?? 'generic';
    const schoolId = (config.schoolId as number) ?? null;

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createVelocityComponent(0, 0, 0, 3));
    this.world.addComponent(entity, createHealthComponent(20, 20, 0));
    this.world.addComponent(entity, createTransformComponent(position));
    this.world.addComponent(entity, createActiveComponent(true));

    // AI components
    this.world.addComponent(entity, createAIBehaviourComponent(BehaviourState.Wander));
    // Fish are driven by WildlifeSystem (no ground-bound Steering).

    // Creature component
    this.world.addComponent(entity, createFishComponent(species, 3));

    // Flocking component if part of a school
    if (schoolId !== null) {
      this.world.addComponent(entity, createFlockComponent(schoolId, 'follower'));
    }

    // Rendering components
    this.world.addComponent(entity, createModelComponent('fish', 0, true));
    this.world.addComponent(entity, createAnimationStateComponent('swim', 1.0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 0.7, g: 0.7, b: 0.9 }, 1.0));

    // Physics components
    this.world.addComponent(entity, createPhysicsBodyComponent(
      PhysicsBodyType.Kinematic,
      PhysicsShapeType.Box,
      2,
      { x: 0.3, y: 0.2, z: 0.6 }
    ));

    return entity;
  }

  /**
   * Creates a bird entity with flocking behavior.
   * 
   * @param config - Configuration for the bird
   * @returns Entity ID of the created bird
   */
  createBird(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: 20, z: 0 };
    const species = (config.species as string) ?? 'generic';
    const flockId = (config.flockId as number) ?? null;

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createVelocityComponent(0, 0, 0, 5));
    this.world.addComponent(entity, createHealthComponent(15, 15, 0));
    this.world.addComponent(entity, createTransformComponent(position));
    this.world.addComponent(entity, createActiveComponent(true));

    // AI components
    this.world.addComponent(entity, createAIBehaviourComponent(BehaviourState.Wander));
    // Birds are driven by WildlifeSystem (no ground-bound Steering).

    // Creature component
    this.world.addComponent(entity, createBirdComponent(species, 20, 5));

    // Flocking component if part of a flock
    if (flockId !== null) {
      this.world.addComponent(entity, createFlockComponent(flockId, 'follower'));
    }

    // Rendering components
    this.world.addComponent(entity, createModelComponent('bird', 0, true));
    this.world.addComponent(entity, createAnimationStateComponent('fly', 1.0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 0.8, g: 0.6, b: 0.4 }, 1.0));

    // Physics components (lighter for flying)
    this.world.addComponent(entity, createPhysicsBodyComponent(
      PhysicsBodyType.Kinematic,
      PhysicsShapeType.Sphere,
      0.5,
      { x: 0.2, y: 0.2, z: 0.2 }
    ));

    return entity;
  }

  /**
   * Creates a dog entity with territory behavior.
   * 
   * @param config - Configuration for the dog
   * @returns Entity ID of the created dog
   */
  createDog(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: 0, z: 0 };
    const breed = (config.breed as string) ?? 'generic';

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createVelocityComponent(0, 0, 0, 6));
    this.world.addComponent(entity, createHealthComponent(40, 40, 0.05));
    this.world.addComponent(entity, createTransformComponent(position));
    this.world.addComponent(entity, createActiveComponent(true));

    // AI components
    this.world.addComponent(entity, createAIBehaviourComponent(BehaviourState.Wander));
    this.world.addComponent(entity, createSteeringComponent(8, 1.5));
    this.world.addComponent(entity, createMemoryComponent(30, 120));

    // Creature component
    this.world.addComponent(entity, createDogComponent(breed));

    // Rendering components
    this.world.addComponent(entity, createModelComponent('dog', 0, true));
    this.world.addComponent(entity, createAnimationStateComponent('walk', 1.0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 0.6, g: 0.4, b: 0.3 }, 1.0));

    // Physics components
    this.world.addComponent(entity, createPhysicsBodyComponent(
      PhysicsBodyType.Kinematic,
      PhysicsShapeType.Capsule,
      20,
      { x: 0.3, y: 0.6, z: 0.3 }
    ));

    return entity;
  }

  /**
   * Creates a boat entity for water navigation.
   * 
   * @param config - Configuration for the boat
   * @returns Entity ID of the created boat
   */
  createBoat(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: 0, z: 0 };
    const boatType = (config.boatType as string) ?? 'fishing';

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createVelocityComponent(0, 0, 0, 4));
    this.world.addComponent(entity, createHealthComponent(200, 200, 0));
    this.world.addComponent(entity, createTransformComponent(position));
    this.world.addComponent(entity, createActiveComponent(true));

    // AI components
    this.world.addComponent(entity, createAIBehaviourComponent(BehaviourState.Idle));
    // Boats are driven by WildlifeSystem (no ground-bound Steering).

    // Creature component
    this.world.addComponent(entity, createBoatComponent(boatType, 100, 4));

    // Rendering components
    this.world.addComponent(entity, createModelComponent('boat', 0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 0.5, g: 0.3, b: 0.2 }, 1.0));

    // Physics components
    this.world.addComponent(entity, createPhysicsBodyComponent(
      PhysicsBodyType.Kinematic,
      PhysicsShapeType.Box,
      500,
      { x: 2, y: 1, z: 4 }
    ));

    return entity;
  }

  /**
   * Creates a dinosaur entity with aggressive behavior.
   *
   * @param config - Configuration for the dinosaur
   * @returns Entity ID of the created dinosaur
   */
  createDinosaur(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: 0, z: 0 };
    const species = (config.species as string) ?? 'generic';
    const size = (config.size as number) ?? 3;

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createVelocityComponent(0, 0, 0, 4));
    this.world.addComponent(entity, createHealthComponent(200, 200, 0.05));
    this.world.addComponent(entity, createTransformComponent(position));
    this.world.addComponent(entity, createActiveComponent(true));

    // AI components
    this.world.addComponent(entity, createAIBehaviourComponent(BehaviourState.Wander));
    this.world.addComponent(entity, createSteeringComponent(12, 2));
    this.world.addComponent(entity, createMemoryComponent(30, 120));

    // Creature component
    this.world.addComponent(entity, createDinosaurComponent(species, size));

    // Rendering components
    this.world.addComponent(entity, createModelComponent('dinosaur', 0, true));
    this.world.addComponent(entity, createAnimationStateComponent('walk', 1.0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 0.4, g: 0.5, b: 0.3 }, 1.0));

    // Physics components
    this.world.addComponent(entity, createPhysicsBodyComponent(
      PhysicsBodyType.Kinematic,
      PhysicsShapeType.Capsule,
      500,
      { x: 1, y: 2, z: 1 }
    ));

    return entity;
  }

  /**
   * Creates a house entity with beds and containers.
   * 
   * @param config - Configuration for the house
   * @returns Entity ID of the created house
   */
  createHouse(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: 0, z: 0 };
    const capacity = (config.capacity as number) ?? 4;

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createTransformComponent(position));
    this.world.addComponent(entity, createActiveComponent(true));

    // World component
    this.world.addComponent(entity, createHouseComponent(capacity));

    // Rendering components
    this.world.addComponent(entity, createModelComponent('house', 0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 0.8, g: 0.7, b: 0.6 }, 1.0));

    // Physics components (static)
    this.world.addComponent(entity, createPhysicsBodyComponent(
      PhysicsBodyType.Static,
      PhysicsShapeType.Box,
      0,
      { x: 6, y: 4, z: 6 }
    ));

    return entity;
  }

  /**
   * Creates a field entity for agriculture.
   * 
   * @param config - Configuration for the field
   * @returns Entity ID of the created field
   */
  createField(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: 0, z: 0 };
    const fieldType = (config.fieldType as string) ?? 'wheat';

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createTransformComponent(position));
    this.world.addComponent(entity, createActiveComponent(true));

    // World component
    this.world.addComponent(entity, createFieldComponent(fieldType));

    // Rendering components
    this.world.addComponent(entity, createModelComponent('field', 0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 0.4, g: 0.3, b: 0.2 }, 1.0));

    return entity;
  }

  /**
   * Creates a tree entity with harvestable resources.
   * 
   * @param config - Configuration for the tree
   * @returns Entity ID of the created tree
   */
  createTree(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: 0, z: 0 };
    const treeType = (config.treeType as string) ?? 'oak';
    const age = (config.age as number) ?? 10;

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createTransformComponent(position));
    this.world.addComponent(entity, createActiveComponent(true));

    // World component
    this.world.addComponent(entity, createTreeComponent(treeType, age));

    // Resource component
    this.world.addComponent(entity, createResourceComponent('wood', 50, 50));

    // Rendering components
    this.world.addComponent(entity, createModelComponent('tree', 0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 0.3, g: 0.5, b: 0.2 }, 1.0));

    // Physics components (static)
    this.world.addComponent(entity, createPhysicsBodyComponent(
      PhysicsBodyType.Static,
      PhysicsShapeType.Cylinder,
      0,
      { x: 0.5, y: age * 0.5, z: 0.5 }
    ));

    return entity;
  }

  /**
   * Creates a well entity for water source.
   * 
   * @param config - Configuration for the well
   * @returns Entity ID of the created well
   */
  createWell(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: 0, z: 0 };

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createTransformComponent(position));
    this.world.addComponent(entity, createActiveComponent(true));

    // World component
    this.world.addComponent(entity, createWellComponent(1000));

    // Rendering components
    this.world.addComponent(entity, createModelComponent('well', 0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 0.6, g: 0.6, b: 0.6 }, 1.0));

    // Physics components (static)
    this.world.addComponent(entity, createPhysicsBodyComponent(
      PhysicsBodyType.Static,
      PhysicsShapeType.Cylinder,
      0,
      { x: 1, y: 1, z: 1 }
    ));

    return entity;
  }

  /**
   * Creates a crop entity in a field.
   * 
   * @param config - Configuration for the crop
   * @returns Entity ID of the created crop
   */
  createCrop(config: EntityConfig = {}): EntityId {
    const position = config.position ?? { x: 0, y: 0, z: 0 };
    const cropType = (config.cropType as string) ?? 'wheat';

    const entity = this.world.createEntity();

    // Core components
    this.world.addComponent(entity, createPositionComponent(position.x, position.y, position.z));
    this.world.addComponent(entity, createTransformComponent(position));
    this.world.addComponent(entity, createActiveComponent(true));

    // World component
    this.world.addComponent(entity, createCropComponent(cropType, 0.1));

    // Rendering components
    this.world.addComponent(entity, createModelComponent('crop', 0, true));
    this.world.addComponent(entity, createVisualComponent({ r: 0.4, g: 0.7, b: 0.3 }, 1.0));

    return entity;
  }

  /**
   * Generates a random name for villagers.
   */
  private generateName(): string {
    const firstNames = ['John', 'Mary', 'Robert', 'Sarah', 'William', 'Emma', 'James', 'Olivia'];
    const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  /**
   * Creates a default daily schedule for villagers.
   */
  private createDefaultSchedule(): ScheduleActivity[] {
    return [
      {
        name: 'Sleep',
        startHour: 22,
        endHour: 6,
        location: null,
        behaviour: BehaviourState.Sleep
      },
      {
        name: 'Breakfast',
        startHour: 6,
        endHour: 7,
        location: null,
        behaviour: BehaviourState.Eat
      },
      {
        name: 'Work',
        startHour: 7,
        endHour: 12,
        location: null,
        behaviour: BehaviourState.Work
      },
      {
        name: 'Lunch',
        startHour: 12,
        endHour: 13,
        location: null,
        behaviour: BehaviourState.Eat
      },
      {
        name: 'Work',
        startHour: 13,
        endHour: 18,
        location: null,
        behaviour: BehaviourState.Work
      },
      {
        name: 'Dinner',
        startHour: 18,
        endHour: 19,
        location: null,
        behaviour: BehaviourState.Eat
      },
      {
        name: 'Socialize',
        startHour: 19,
        endHour: 22,
        location: null,
        behaviour: BehaviourState.Socialize
      }
    ];
  }

  /**
   * Generates random genetics for a villager.
   */
  private generateGenetics(): Array<{ name: string; allele1: string; allele2: string; dominant: string; expressed: string }> {
    const traits = [
      { name: 'height', alleles: ['tall', 'short'], dominant: 'tall' },
      { name: 'strength', alleles: ['strong', 'weak'], dominant: 'strong' },
      { name: 'intelligence', alleles: ['smart', 'average'], dominant: 'smart' },
      { name: 'speed', alleles: ['fast', 'slow'], dominant: 'fast' }
    ];

    return traits.map(trait => {
      const allele1 = trait.alleles[Math.floor(Math.random() * trait.alleles.length)];
      const allele2 = trait.alleles[Math.floor(Math.random() * trait.alleles.length)];
      const expressed = (allele1 === trait.dominant || allele2 === trait.dominant) ? trait.dominant : allele1;

      return {
        name: trait.name,
        allele1,
        allele2,
        dominant: trait.dominant,
        expressed
      };
    });
  }
}
