/**
 * Render Models Index
 *
 * Procedural mesh generators for the 3D Village Simulation.
 * These models are created programmatically without external assets.
 *
 * @module render/models
 */

// Humanoids
export { VillagerModel, createVillagerModel, type VillagerParts, type VillagerConfig } from './VillagerModel';
export { ZombieModel, createZombieModel, type ZombieParts, type ZombieConfig } from './ZombieModel';

// Animals
export { BirdModel, createBirdModel, type BirdParts, type BirdConfig } from './BirdModel';
export { DogModel, createDogModel, type DogParts, type DogConfig } from './DogModel';
export { FishModel, createFishModel, type FishParts, type FishConfig } from './FishModel';
export { DinosaurModel, createDinosaurModel, type DinosaurParts, type DinosaurConfig } from './DinosaurModel';

// Vehicles
export { BoatModel, createBoatModel, type BoatParts, type BoatConfig } from './BoatModel';
