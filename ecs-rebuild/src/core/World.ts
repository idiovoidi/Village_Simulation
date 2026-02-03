/**
 * World
 * 
 * The World class is the central coordinator of the ECS.
 * It manages all entities, components, and systems.
 */

import type { Component, ComponentType, ComponentSignature } from './Component.ts';
import { validateComponent } from './Component.ts';
import { ComponentStorage } from './ComponentStorage.ts';
import type { Entity, EntityId } from './Entity.ts';
import { createEntity, ComponentMaskManager } from './Entity.ts';
import type { System } from './System.ts';

/**
 * World manages the entire ECS ecosystem.
 * Provides methods for entity lifecycle, component management, and system execution.
 */
export class World {
  /**
   * Map of entity IDs to entity objects.
   */
  private entities: Map<EntityId, Entity>;

  /**
   * Storage for all components.
   */
  private componentStorage: ComponentStorage;

  /**
   * Registered systems.
   */
  private systems: System[];

  /**
   * System execution order (sorted by priority).
   */
  private systemExecutionOrder: System[];

  /**
   * Component mask manager for fast queries.
   */
  private maskManager: ComponentMaskManager;

  /**
   * Next entity ID to assign.
   */
  private nextEntityId: EntityId;

  /**
   * Whether systems need to be re-sorted.
   */
  private systemsDirty: boolean;

  constructor() {
    this.entities = new Map();
    this.componentStorage = new ComponentStorage();
    this.systems = [];
    this.systemExecutionOrder = [];
    this.maskManager = new ComponentMaskManager();
    this.nextEntityId = 1;
    this.systemsDirty = false;
  }

  /**
   * Creates a new entity in the world.
   * 
   * @returns The ID of the newly created entity
   */
  createEntity(): EntityId {
    const id = this.nextEntityId++;
    const entity = createEntity(id);
    this.entities.set(id, entity);
    return id;
  }

  /**
   * Destroys an entity and removes all its components.
   * Notifies systems that need to clean up resources.
   * 
   * @param entityId - The entity to destroy
   * @returns true if the entity was destroyed, false if it didn't exist
   */
  destroyEntity(entityId: EntityId): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return false;
    }

    // Notify systems about entity destruction (for cleanup)
    for (const system of this.systems) {
      if ('cleanupEntity' in system && typeof system.cleanupEntity === 'function') {
        (system as any).cleanupEntity(entityId);
      }
    }

    // Remove all components
    this.componentStorage.removeAllForEntity(entityId);

    // Remove entity
    this.entities.delete(entityId);

    return true;
  }

  /**
   * Adds a component to an entity.
   * 
   * @param entityId - The entity to add the component to
   * @param component - The component to add
   * @throws Error if the entity doesn't exist or component is invalid
   */
  addComponent<T extends Component>(entityId: EntityId, component: T): void {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    // Validate component
    const validation = validateComponent(component);
    if (!validation.valid) {
      throw new Error(`Invalid component: ${validation.errors.join(', ')}`);
    }

    // Add to storage
    this.componentStorage.add(entityId, component);

    // Update entity mask
    entity.componentMask = this.maskManager.addToMask(entity.componentMask, component.type);
  }

  /**
   * Removes a component from an entity.
   * 
   * @param entityId - The entity to remove the component from
   * @param componentType - The type of component to remove
   * @returns true if the component was removed, false if it didn't exist
   */
  removeComponent(entityId: EntityId, componentType: ComponentType): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return false;
    }

    const removed = this.componentStorage.remove(entityId, componentType);

    if (removed) {
      // Update entity mask
      entity.componentMask = this.maskManager.removeFromMask(entity.componentMask, componentType);
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
  getComponent<T extends Component>(entityId: EntityId, componentType: ComponentType): T | undefined {
    return this.componentStorage.get<T>(entityId, componentType);
  }

  /**
   * Checks if an entity has a specific component.
   * 
   * @param entityId - The entity to check
   * @param componentType - The component type to check for
   * @returns true if the entity has the component
   */
  hasComponent(entityId: EntityId, componentType: ComponentType): boolean {
    return this.componentStorage.has(entityId, componentType);
  }

  /**
   * Queries for entities that have all components in the signature.
   * 
   * @param signature - The component signature to match
   * @returns Array of entity IDs that match the signature
   */
  query(signature: ComponentSignature): EntityId[] {
    const queryMask = this.maskManager.signatureToMask(signature);
    const results: EntityId[] = [];

    for (const [entityId, entity] of this.entities) {
      if (entity.active && this.maskManager.maskMatches(entity.componentMask, queryMask)) {
        results.push(entityId);
      }
    }

    return results;
  }

  /**
   * Gets an entity by ID.
   * 
   * @param entityId - The entity ID
   * @returns The entity if it exists, undefined otherwise
   */
  getEntity(entityId: EntityId): Entity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Gets all entities in the world.
   * 
   * @returns Array of all entity IDs
   */
  getAllEntities(): EntityId[] {
    return Array.from(this.entities.keys());
  }

  /**
   * Registers a system with the world.
   * 
   * @param system - The system to register
   */
  registerSystem(system: System): void {
    this.systems.push(system);
    this.systemsDirty = true;
  }

  /**
   * Unregisters a system from the world.
   * 
   * @param system - The system to unregister
   * @returns true if the system was removed, false if it wasn't registered
   */
  unregisterSystem(system: System): boolean {
    const index = this.systems.indexOf(system);
    if (index === -1) {
      return false;
    }

    this.systems.splice(index, 1);
    this.systemsDirty = true;
    return true;
  }

  /**
   * Sorts systems by priority if needed.
   */
  private sortSystems(): void {
    if (!this.systemsDirty) {
      return;
    }

    this.systemExecutionOrder = [...this.systems].sort((a, b) => a.priority - b.priority);
    this.systemsDirty = false;
  }

  /**
   * Updates all systems in priority order.
   * 
   * @param deltaTime - Time elapsed since last update in seconds
   */
  update(deltaTime: number): void {
    this.sortSystems();

    for (const system of this.systemExecutionOrder) {
      system.update(deltaTime);
    }
  }

  /**
   * Clears all entities, components, and systems.
   */
  clear(): void {
    this.entities.clear();
    this.componentStorage.clear();
    this.systems = [];
    this.systemExecutionOrder = [];
    this.nextEntityId = 1;
    this.systemsDirty = false;
  }

  /**
   * Gets the number of entities in the world.
   */
  get entityCount(): number {
    return this.entities.size;
  }

  /**
   * Gets the number of registered systems.
   */
  get systemCount(): number {
    return this.systems.length;
  }
}
