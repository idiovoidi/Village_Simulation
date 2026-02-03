/**
 * Entity
 * 
 * Entities are lightweight identifiers with component masks for fast queries.
 */

import type { ComponentSignature } from './Component.ts';

/**
 * Unique identifier for entities.
 */
export type EntityId = number;

/**
 * Entity interface representing a game object.
 * Entities are composed of components and processed by systems.
 */
export interface Entity {
  /**
   * Unique identifier for this entity.
   */
  readonly id: EntityId;

  /**
   * Bit mask representing which components this entity has.
   * Used for fast component signature matching.
   */
  componentMask: bigint;

  /**
   * Whether this entity is active in the world.
   * Inactive entities are not processed by systems.
   */
  active: boolean;
}

/**
 * Creates a new entity with the given ID.
 * 
 * @param id - The unique identifier for the entity
 * @returns A new Entity instance
 */
export function createEntity(id: EntityId): Entity {
  return {
    id,
    componentMask: 0n,
    active: true,
  };
}

/**
 * Component type to bit position mapping.
 * Used to convert component types to bit positions in the component mask.
 */
export class ComponentMaskManager {
  private typeToPosition: Map<string, number>;
  private nextPosition: number;

  constructor() {
    this.typeToPosition = new Map();
    this.nextPosition = 0;
  }

  /**
   * Gets the bit position for a component type.
   * If the type hasn't been seen before, assigns it a new position.
   * 
   * @param componentType - The component type
   * @returns The bit position for this component type
   */
  getPosition(componentType: string): number {
    const existing = this.typeToPosition.get(componentType);
    if (existing !== undefined) {
      return existing;
    }

    const position = this.nextPosition;
    this.typeToPosition.set(componentType, position);
    this.nextPosition++;
    return position;
  }

  /**
   * Converts a component signature to a bit mask.
   * 
   * @param signature - The component signature
   * @returns A bigint bit mask representing the signature
   */
  signatureToMask(signature: ComponentSignature): bigint {
    let mask = 0n;

    for (const componentType of signature) {
      const position = this.getPosition(componentType);
      mask |= 1n << BigInt(position);
    }

    return mask;
  }

  /**
   * Checks if an entity's component mask matches a query signature.
   * 
   * @param entityMask - The entity's component mask
   * @param queryMask - The query signature mask
   * @returns true if the entity has all components in the query
   */
  maskMatches(entityMask: bigint, queryMask: bigint): boolean {
    return (entityMask & queryMask) === queryMask;
  }

  /**
   * Adds a component type to an entity's mask.
   * 
   * @param entityMask - The entity's current mask
   * @param componentType - The component type to add
   * @returns The updated mask
   */
  addToMask(entityMask: bigint, componentType: string): bigint {
    const position = this.getPosition(componentType);
    return entityMask | (1n << BigInt(position));
  }

  /**
   * Removes a component type from an entity's mask.
   * 
   * @param entityMask - The entity's current mask
   * @param componentType - The component type to remove
   * @returns The updated mask
   */
  removeFromMask(entityMask: bigint, componentType: string): bigint {
    const position = this.getPosition(componentType);
    return entityMask & ~(1n << BigInt(position));
  }
}
