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
} from './AnimationController.ts';

// Humanoid animations
export {
  VillagerAnimation,
  createVillagerAnimation,
  type VillagerParts
} from './VillagerAnimation.ts';

export {
  ZombieAnimation,
  createZombieAnimation,
  type ZombieParts
} from './ZombieAnimation.ts';

// Animal animations
export {
  BirdAnimation,
  createBirdAnimation,
  type BirdParts
} from './BirdAnimation.ts';

export {
  DogAnimation,
  createDogAnimation,
  type DogParts
} from './DogAnimation.ts';

export {
  FishAnimation,
  createFishAnimation,
  type FishParts
} from './FishAnimation.ts';

export {
  DinosaurAnimation,
  createDinosaurAnimation,
  type DinosaurParts
} from './DinosaurAnimation.ts';

// Vehicle animations
export {
  BoatAnimation,
  createBoatAnimation,
  type BoatParts
} from './BoatAnimation.ts';
