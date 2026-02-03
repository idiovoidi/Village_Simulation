/**
 * ComponentStorage
 * 
 * Efficient storage for ECS components using Maps.
 * Provides fast component access, addition, and removal.
 */

import type { Component, ComponentType } from './Component.ts';

/**
 * Type for entity identifiers.
 */
export type EntityId = number;

/**
 * Storage for a single component type.
 * Maps entity IDs to component instances.
 */
type ComponentArray<T extends Component> = Map<EntityId, T>;

/**
 * ComponentStorage manages all components in the ECS.
 * Uses separate Maps for each component type for efficient storage and retrieval.
 */
export class ComponentStorage {
  /**
   * Maps component types to their storage arrays.
   */
  private componentArrays: Map<ComponentType, ComponentArray<Component>>;

  /**
   * Maps entity IDs to the set of component types they have.
   * Used for fast entity-to-component lookups.
   */
  private entityToComponents: Map<EntityId, Set<ComponentType>>;

  constructor() {
    this.componentArrays = new Map();
    this.entityToComponents = new Map();
  }

  /**
   * Adds a component to an entity.
   * If the entity already has a component of this type, it will be replaced.
   * 
   * @param entityId - The entity to add the component to
   * @param component - The component to add
   */
  add<T extends Component>(entityId: EntityId, component: T): void {
    const componentType = component.type;

    // Get or create component array for this type
    if (!this.componentArrays.has(componentType)) {
      this.componentArrays.set(componentType, new Map());
    }

    const componentArray = this.componentArrays.get(componentType);
    if (componentArray) {
      componentArray.set(entityId, component);
    }

    // Update entity-to-component index
    if (!this.entityToComponents.has(entityId)) {
      this.entityToComponents.set(entityId, new Set());
    }

    const entityComponents = this.entityToComponents.get(entityId);
    if (entityComponents) {
      entityComponents.add(componentType);
    }
  }

  /**
   * Removes a component from an entity.
   * 
   * @param entityId - The entity to remove the component from
   * @param componentType - The type of component to remove
   * @returns true if the component was removed, false if it didn't exist
   */
  remove(entityId: EntityId, componentType: ComponentType): boolean {
    const componentArray = this.componentArrays.get(componentType);
    if (!componentArray) {
      return false;
    }

    const removed = componentArray.delete(entityId);

    if (removed) {
      // Update entity-to-component index
      const entityComponents = this.entityToComponents.get(entityId);
      if (entityComponents) {
        entityComponents.delete(componentType);

        // Clean up empty sets
        if (entityComponents.size === 0) {
          this.entityToComponents.delete(entityId);
        }
      }
    }

    return removed;
  }

  /**
   * Gets a component from an entity.
   * 
   * @param entityId - The entity to get the component from
   * @param componentType - The type of component to get
   * @returns The component if it exists, undefined otherwise
   */
  get<T extends Component>(entityId: EntityId, componentType: ComponentType): T | undefined {
    const componentArray = this.componentArrays.get(componentType);
    if (!componentArray) {
      return undefined;
    }

    return componentArray.get(entityId) as T | undefined;
  }

  /**
   * Gets all components of a specific type.
   * 
   * @param componentType - The type of components to get
   * @returns Array of all components of the specified type
   */
  getAll<T extends Component>(componentType: ComponentType): T[] {
    const componentArray = this.componentArrays.get(componentType);
    if (!componentArray) {
      return [];
    }

    return Array.from(componentArray.values()) as T[];
  }

  /**
   * Gets all component types that an entity has.
   * 
   * @param entityId - The entity to get component types for
   * @returns Set of component types the entity has
   */
  getEntityComponents(entityId: EntityId): Set<ComponentType> {
    return this.entityToComponents.get(entityId) ?? new Set();
  }

  /**
   * Checks if an entity has a specific component type.
   * 
   * @param entityId - The entity to check
   * @param componentType - The component type to check for
   * @returns true if the entity has the component
   */
  has(entityId: EntityId, componentType: ComponentType): boolean {
    const entityComponents = this.entityToComponents.get(entityId);
    return entityComponents ? entityComponents.has(componentType) : false;
  }

  /**
   * Removes all components from an entity.
   * 
   * @param entityId - The entity to remove all components from
   */
  removeAllForEntity(entityId: EntityId): void {
    const entityComponents = this.entityToComponents.get(entityId);
    if (!entityComponents) {
      return;
    }

    // Remove from each component array
    for (const componentType of entityComponents) {
      const componentArray = this.componentArrays.get(componentType);
      if (componentArray) {
        componentArray.delete(entityId);
      }
    }

    // Remove from entity index
    this.entityToComponents.delete(entityId);
  }

  /**
   * Gets all entities that have a specific component type.
   * 
   * @param componentType - The component type to search for
   * @returns Array of entity IDs that have the component
   */
  getEntitiesWithComponent(componentType: ComponentType): EntityId[] {
    const componentArray = this.componentArrays.get(componentType);
    if (!componentArray) {
      return [];
    }

    return Array.from(componentArray.keys());
  }

  /**
   * Clears all component storage.
   * Used for cleanup or resetting the world.
   */
  clear(): void {
    this.componentArrays.clear();
    this.entityToComponents.clear();
  }
}
