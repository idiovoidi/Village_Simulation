/**
 * Render Module Index
 *
 * Rendering subsystem for the ECS rebuild.
 * Contains models, animations, and materials.
 *
 * @module render
 */

// Models
export {
  VillagerModel,
  createVillagerModel,
  type VillagerParts,
  type VillagerConfig
} from './models';

export {
  BirdModel,
  createBirdModel,
  type BirdParts,
  type BirdConfig
} from './models';

// Animation
export {
  AnimationController,
  createAnimationController,
  type AnimationState,
  type AnimationCallback
} from './animation';

export {
  VillagerAnimation,
  createVillagerAnimation
} from './animation';

export {
  BirdAnimation,
  createBirdAnimation
} from './animation';
