/**
 * Render Animation Index
 *
 * Animation controllers and definitions for the 3D Village Simulation.
 *
 * @module render/animation
 */

export {
  AnimationController,
  createAnimationController,
  type AnimationState,
  type AnimationCallback
} from './AnimationController';

// Humanoid animations
export {
  VillagerAnimation,
  createVillagerAnimation,
  type VillagerParts
} from './VillagerAnimation';

export {
  ZombieAnimation,
  createZombieAnimation,
  type ZombieParts
} from './ZombieAnimation';

// Animal animations
export {
  BirdAnimation,
  createBirdAnimation,
  type BirdParts
} from './BirdAnimation';

export {
  DogAnimation,
  createDogAnimation,
  type DogParts
} from './DogAnimation';

export {
  FishAnimation,
  createFishAnimation,
  type FishParts
} from './FishAnimation';

export {
  DinosaurAnimation,
  createDinosaurAnimation,
  type DinosaurParts
} from './DinosaurAnimation';

// Vehicle animations
export {
  BoatAnimation,
  createBoatAnimation,
  type BoatParts
} from './BoatAnimation';
