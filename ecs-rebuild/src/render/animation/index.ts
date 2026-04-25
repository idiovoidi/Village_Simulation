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

export {
  VillagerAnimation,
  createVillagerAnimation,
  type VillagerParts
} from './VillagerAnimation';

export {
  BirdAnimation,
  createBirdAnimation,
  type BirdParts
} from './BirdAnimation';
