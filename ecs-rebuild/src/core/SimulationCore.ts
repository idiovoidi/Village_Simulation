/**
 * Core simulation engine with dependency injection
 */

import {
  SimulationError,
  SystemError,
  FatalSystemError,
  DependencyError,
  ServiceError,
  EntityError,
} from './ErrorHandling.js';

/**
 * System registration info
 */
interface SystemRegistration {
  instance: unknown;
  dependencies: string[];
  active: boolean;
}

/**
 * Physics manager interface
 */
interface PhysicsManager {
  update(deltaTime: number): void;
}

/**
 * Core simulation engine with dependency injection
 */
export class SimulationCore {
  private systems: Map<string, SystemRegistration> = new Map();
  private eventBus: EventBus;
  private serviceRegistry: ServiceRegistry;
  private entityManager: EntityManager;
  private timeManager: TimeManager;
  private physicsManager: PhysicsManager | null = null;

  constructor() {
    this.eventBus = new EventBus();
    this.serviceRegistry = new ServiceRegistry();
    this.entityManager = new EntityManager();
    this.timeManager = new TimeManager();
  }

  /**
   * Get the event bus
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get the service registry
   */
  getServiceRegistry(): ServiceRegistry {
    return this.serviceRegistry;
  }

  /**
   * Get the entity manager
   */
  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  /**
   * Get the time manager
   */
  getTimeManager(): TimeManager {
    return this.timeManager;
  }

  /**
   * Register a system with the simulation core
   * @param id - System identifier
   * @param system - System instance
   * @param dependencies - System dependencies
   */
  registerSystem(id: string, system: unknown, dependencies: string[] = []): this {
    // Check dependencies
    for (const dep of dependencies) {
      if (!this.systems.has(dep) && !this.serviceRegistry.hasService(dep)) {
        throw new DependencyError(`System "${id}" requires "${dep}" which is not registered`);
      }
    }

    this.systems.set(id, {
      instance: system,
      dependencies,
      active: false,
    });

    return this;
  }

  /**
   * Initializes a system and its dependencies
   * @param id - System identifier
   */
  async initializeSystem(id: string): Promise<void> {
    const system = this.systems.get(id);
    if (!system) {
      throw new SystemError(`System "${id}" not found`);
    }

    // Already initialized
    if (system.active) return;

    // Initialize dependencies first
    for (const dep of system.dependencies) {
      // Check if dependency is a system or service
      if (this.systems.has(dep)) {
        await this.initializeSystem(dep);
      }
    }

    // Inject dependencies if the system has an inject method
    const systemInstance = system.instance as { inject?: (...deps: unknown[]) => void };
    if (typeof systemInstance.inject === 'function') {
      const depInstances = system.dependencies.map((dep) => {
        if (this.systems.has(dep)) {
          return this.systems.get(dep)?.instance;
        } else {
          return this.serviceRegistry.getService(dep);
        }
      });

      systemInstance.inject(...depInstances);
    }

    // Initialize the system
    const initSystem = system.instance as { initialize?: (core: SimulationCore) => Promise<void> };
    if (typeof initSystem.initialize === 'function') {
      await initSystem.initialize(this);
    }

    system.active = true;

    // Notify that system has been initialized
    this.eventBus.publish('system:initialized', { id });
  }

  /**
   * Set the physics manager for the simulation
   * @param physicsManager - Physics manager instance
   */
  setPhysicsManager(physicsManager: PhysicsManager): this {
    this.physicsManager = physicsManager;
    return this;
  }

  /**
   * Run the simulation update loop
   * @param deltaTime - Time since last update in seconds
   */
  update(deltaTime: number): void {
    // Update time
    this.timeManager.update(deltaTime);

    // Update all active systems
    for (const [id, system] of this.systems.entries()) {
      if (system.active) {
        const systemInstance = system.instance as {
          update?: (deltaTime: number, gameTime: number) => void;
        };
        if (typeof systemInstance.update === 'function') {
          try {
            systemInstance.update(deltaTime, this.timeManager.gameTime);
          } catch (error) {
            this.handleSystemError(id, error as Error);
          }
        }
      }
    }

    // Update physics last to apply all changes
    if (this.physicsManager) {
      this.physicsManager.update(deltaTime);
    }
  }

  /**
   * Handle system errors
   * @param systemId - System identifier
   * @param error - Error object
   */
  private handleSystemError(systemId: string, error: Error): void {
    // Log error
    console.error(`Error in system "${systemId}":`, error);

    // Publish error event
    this.eventBus.publish('system:error', {
      systemId,
      error,
      timestamp: this.timeManager.gameTime,
    });

    // If it's a fatal error, deactivate the system
    if (error instanceof FatalSystemError) {
      const system = this.systems.get(systemId);
      if (system) {
        system.active = false;
      }
      this.eventBus.publish('system:deactivated', { systemId });
    }
  }

  /**
   * Dispose of the simulation core
   */
  dispose(): void {
    // Dispose all systems
    for (const [, system] of this.systems.entries()) {
      const systemInstance = system.instance as { dispose?: () => void };
      if (typeof systemInstance.dispose === 'function') {
        try {
          systemInstance.dispose();
        } catch (error) {
          console.error('Error disposing system:', error);
        }
      }
    }

    this.systems.clear();
    this.eventBus.publish('simulation:disposed', {});
  }
}

/**
 * Event bus for inter-system communication
 */
export class EventBus {
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  subscribe(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)?.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Publish an event
   * @param event - Event name
   * @param data - Event data
   */
  publish(event: string, data: unknown = {}): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const callback of eventListeners) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      }
    }
  }

  /**
   * Clear all listeners for an event
   * @param event - Event name
   */
  clear(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Clear all listeners
   */
  clearAll(): void {
    this.listeners.clear();
  }
}

/**
 * Service registry for dependency injection
 */
export class ServiceRegistry {
  private services: Map<string, unknown> = new Map();

  /**
   * Register a service
   * @param id - Service identifier
   * @param service - Service instance
   */
  registerService(id: string, service: unknown): this {
    this.services.set(id, service);
    return this;
  }

  /**
   * Check if a service exists
   * @param id - Service identifier
   */
  hasService(id: string): boolean {
    return this.services.has(id);
  }

  /**
   * Get a service
   * @param id - Service identifier
   */
  getService<T = unknown>(id: string): T {
    if (!this.services.has(id)) {
      throw new ServiceError(`Service "${id}" not found`);
    }

    return this.services.get(id) as T;
  }

  /**
   * Unregister a service
   * @param id - Service identifier
   */
  unregisterService(id: string): boolean {
    return this.services.delete(id);
  }
}

/**
 * Entity manager for component-entity system
 */
export class EntityManager {
  private entities: Map<number, Map<string, unknown>> = new Map();
  private componentsByType: Map<string, Map<number, unknown>> = new Map();
  private nextEntityId = 1;

  /**
   * Create a new entity
   * @returns Entity ID
   */
  createEntity(): number {
    const entityId = this.nextEntityId++;
    this.entities.set(entityId, new Map());
    return entityId;
  }

  /**
   * Remove an entity and all its components
   * @param entityId - Entity ID
   */
  removeEntity(entityId: number): void {
    const components = this.entities.get(entityId);
    if (!components) return;

    // Remove components from index
    for (const [componentType] of components) {
      const typeIndex = this.componentsByType.get(componentType);
      if (typeIndex) {
        typeIndex.delete(entityId);
      }
    }

    // Remove entity
    this.entities.delete(entityId);
  }

  /**
   * Add a component to an entity
   * @param entityId - Entity ID
   * @param componentType - Component type
   * @param component - Component instance
   */
  addComponent(entityId: number, componentType: string, component: unknown): void {
    const entityComponents = this.entities.get(entityId);
    if (!entityComponents) {
      throw new EntityError(`Entity ${entityId} not found`);
    }

    // Add to entity
    entityComponents.set(componentType, component);

    // Add to component index
    if (!this.componentsByType.has(componentType)) {
      this.componentsByType.set(componentType, new Map());
    }

    this.componentsByType.get(componentType)?.set(entityId, component);
  }

  /**
   * Get a component from an entity
   * @param entityId - Entity ID
   * @param componentType - Component type
   */
  getComponent<T = unknown>(entityId: number, componentType: string): T | null {
    const entityComponents = this.entities.get(entityId);
    if (!entityComponents) {
      throw new EntityError(`Entity ${entityId} not found`);
    }

    return (entityComponents.get(componentType) as T) ?? null;
  }

  /**
   * Query entities that have specific components
   * @param componentTypes - Component types to query for
   */
  queryEntities(componentTypes: string[]): number[] {
    if (componentTypes.length === 0) return [];

    // Start with entities that have the first component
    const firstType = componentTypes[0];
    const firstTypeIndex = this.componentsByType.get(firstType);
    if (!firstTypeIndex) {
      return [];
    }

    const candidates = Array.from(firstTypeIndex.keys());

    // Filter by remaining component types
    return candidates.filter((entityId) => {
      const entity = this.entities.get(entityId);
      if (!entity) return false;
      return componentTypes.every((type) => entity.has(type));
    });
  }

  /**
   * Get all entities
   */
  getAllEntities(): number[] {
    return Array.from(this.entities.keys());
  }

  /**
   * Get entity count
   */
  get entityCount(): number {
    return this.entities.size;
  }
}

/**
 * Time manager for game time and time scaling
 */
export class TimeManager {
  private _gameTime = 0; // Game time in seconds
  private timeScale = 1; // Time scale factor
  private readonly dayLength = 24 * 60 * 60; // Day length in seconds

  get gameTime(): number {
    return this._gameTime;
  }

  /**
   * Update game time
   * @param deltaTime - Real time delta in seconds
   */
  update(deltaTime: number): void {
    this._gameTime += deltaTime * this.timeScale;

    // Wrap around day time if needed
    if (this._gameTime >= this.dayLength) {
      this._gameTime %= this.dayLength;
    }
  }

  /**
   * Set the time scale
   * @param scale - Time scale factor
   */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }

  /**
   * Set the game time
   * @param time - Game time in seconds
   */
  setGameTime(time: number): void {
    this._gameTime = time % this.dayLength;
  }

  /**
   * Get the time of day (hours)
   */
  getTimeOfDay(): number {
    return (this._gameTime / 3600) % 24;
  }

  /**
   * Get the day length in seconds
   */
  getDayLength(): number {
    return this.dayLength;
  }
}