/**
 * Render Models Index
 *
 * Procedural mesh generators for the 3D Village Simulation.
 * These models are created programmatically without external assets.
 *
 * @module render/models
 */

// Humanoids
export { VillagerModel, createVillagerModel, type VillagerParts, type VillagerConfig } from './VillagerModel.ts';
export { ZombieModel, createZombieModel, type ZombieParts, type ZombieConfig } from './ZombieModel.ts';

// Animals
export { BirdModel, createBirdModel, type BirdParts, type BirdConfig } from './BirdModel.ts';
export { DogModel, createDogModel, type DogParts, type DogConfig } from './DogModel.ts';
export { FishModel, createFishModel, type FishParts, type FishConfig } from './FishModel.ts';
export { DinosaurModel, createDinosaurModel, type DinosaurParts, type DinosaurConfig } from './DinosaurModel.ts';

// Vehicles
export { BoatModel, createBoatModel, type BoatParts, type BoatConfig } from './BoatModel.ts';

// World props (village vertical slice)
export { HouseModel, type HouseParts } from './HouseModel.ts';
export { TreeModel, type TreeParts } from './TreeModel.ts';
export { WellModel, type WellParts } from './WellModel.ts';
export { FieldModel, type FieldParts } from './FieldModel.ts';
