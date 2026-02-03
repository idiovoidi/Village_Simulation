/**
 * System
 * 
 * Base class for all ECS systems.
 * Systems contain logic that operates on entities with specific component signatures.
 */

import type { ComponentSignature } from './Component.ts';
import type { World } from './World.ts';
import type { EntityId } from './Entity.ts';

/**
 * Abstract base class for all systems.
 * Systems process entities that match their component signature.
 */
export abstract class System {
  /**
   * Reference to the world this system operates on.
   */
  protected world: World;

  /**
   * Component signature that entities must match to be processed by this system.
   * Entities must have ALL components in this signature.
   */
  abstract readonly componentSignature: ComponentSignature;

  /**
   * Execution priority for this system.
   * Lower values execute first. Systems with the same priority execute in registration order.
   * 
   * Priority ranges:
   * - 0-99: Input systems
   * - 100-199: AI systems
   * - 200-299: Physics systems
   * - 300-499: Game logic systems
   * - 500-599: Transform systems
   * - 600-699: Rendering systems
   */
  abstract readonly priority: number;

  /**
   * Creates a new system.
   * 
   * @param world - The world this system operates on
   */
  constructor(world: World) {
    this.world = world;
  }

  /**
   * Updates the system.
   * Called once per frame with the time elapsed since the last update.
   * 
   * @param deltaTime - Time elapsed since last update in seconds
   */
  abstract update(deltaTime: number): void;

  /**
   * Helper method to query entities that match this system's component signature.
   * 
   * @returns Array of entity IDs that match the component signature
   */
  protected queryEntities(): EntityId[] {
    return this.world.query(this.componentSignature);
  }

  /**
   * Optional initialization method.
   * Called when the system is first registered with the world.
   */
  initialize?(): void;

  /**
   * Optional cleanup method.
   * Called when the system is unregistered from the world.
   */
  cleanup?(): void;
}
