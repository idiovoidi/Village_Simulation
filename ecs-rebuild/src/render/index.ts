/**
 * Render Module Index
 *
 * Rendering subsystem for the ECS rebuild.
 * Contains models, animations, and materials.
 *
 * @module render
 */

// Models - Humanoids
export {
  VillagerModel,
  createVillagerModel,
  type VillagerParts,
  type VillagerConfig,
  ZombieModel,
  createZombieModel,
  type ZombieParts,
  type ZombieConfig
} from './models';

// Models - Animals
export {
  BirdModel,
  createBirdModel,
  type BirdParts,
  type BirdConfig,
  DogModel,
  createDogModel,
  type DogParts,
  type DogConfig,
  FishModel,
  createFishModel,
  type FishParts,
  type FishConfig,
  DinosaurModel,
  createDinosaurModel,
  type DinosaurParts,
  type DinosaurConfig
} from './models';

// Models - Vehicles
export {
  BoatModel,
  createBoatModel,
  type BoatParts,
  type BoatConfig
} from './models';

// Animation
export {
  AnimationController,
  createAnimationController,
  type AnimationState,
  type AnimationCallback,
  VillagerAnimation,
  createVillagerAnimation,
  BirdAnimation,
  createBirdAnimation
} from './animation';
