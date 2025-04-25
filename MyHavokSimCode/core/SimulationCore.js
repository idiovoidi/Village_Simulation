// Core simulation engine with dependency injection
export class SimulationCore {
  constructor() {
    this.systems = new Map();
    this.eventBus = new EventBus();
    this.serviceRegistry = new ServiceRegistry();
    this.entityManager = new EntityManager();
    this.timeManager = new TimeManager();
    this.physicsManager = null; // Will be injected
  }

  /**
   * Register a system with the simulation core
   * @param {string} id - System identifier
   * @param {Object} system - System instance
   * @param {Array<string>} dependencies - System dependencies
   */
  registerSystem(id, system, dependencies = []) {
    // Check dependencies
    for (const dep of dependencies) {
      if (!this.systems.has(dep) && !this.serviceRegistry.hasService(dep)) {
        throw new DependencyError(`System "${id}" requires "${dep}" which is not registered`);
      }
    }
    
    this.systems.set(id, { 
      instance: system, 
      dependencies,
      active: false
    });
    
    return this;
  }

  /**
   * Initializes a system and its dependencies
   * @param {string} id - System identifier
   */
  async initializeSystem(id) {
    if (!this.systems.has(id)) {
      throw new SystemError(`System "${id}" not found`);
    }
    
    const system = this.systems.get(id);
    
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
    if (typeof system.instance.inject === 'function') {
      const depInstances = system.dependencies.map(dep => {
        if (this.systems.has(dep)) {
          return this.systems.get(dep).instance;
        } else {
          return this.serviceRegistry.getService(dep);
        }
      });
      
      system.instance.inject(...depInstances);
    }
    
    // Initialize the system
    if (typeof system.instance.initialize === 'function') {
      await system.instance.initialize(this);
    }
    
    system.active = true;
    
    // Notify that system has been initialized
    this.eventBus.publish('system:initialized', { id });
  }
  
  /**
   * Set the physics manager for the simulation
   * @param {Object} physicsManager - Physics manager instance
   */
  setPhysicsManager(physicsManager) {
    this.physicsManager = physicsManager;
    return this;
  }
  
  /**
   * Run the simulation update loop
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Update time
    this.timeManager.update(deltaTime);
    
    // Update all active systems
    for (const [id, system] of this.systems.entries()) {
      if (system.active && typeof system.instance.update === 'function') {
        try {
          system.instance.update(deltaTime, this.timeManager.gameTime);
        } catch (error) {
          this.handleSystemError(id, error);
        }
      }
    }
    
    // Update physics last to apply all changes
    if (this.physicsManager && typeof this.physicsManager.update === 'function') {
      this.physicsManager.update(deltaTime);
    }
  }
  
  /**
   * Handle system errors
   * @param {string} systemId - System identifier
   * @param {Error} error - Error object
   * @private
   */
  handleSystemError(systemId, error) {
    // Log error
    console.error(`Error in system "${systemId}":`, error);
    
    // Publish error event
    this.eventBus.publish('system:error', { 
      systemId, 
      error,
      timestamp: this.timeManager.gameTime
    });
    
    // If it's a fatal error, deactivate the system
    if (error instanceof FatalSystemError) {
      this.systems.get(systemId).active = false;
      this.eventBus.publish('system:deactivated', { systemId });
    }
  }
}

/**
 * Event bus for inter-system communication
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }
  
  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    };
  }
  
  /**
   * Publish an event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  publish(event, data = {}) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      }
    }
  }
}

/**
 * Service registry for dependency injection
 */
export class ServiceRegistry {
  constructor() {
    this.services = new Map();
  }
  
  /**
   * Register a service
   * @param {string} id - Service identifier
   * @param {Object} service - Service instance
   */
  registerService(id, service) {
    this.services.set(id, service);
    return this;
  }
  
  /**
   * Check if a service exists
   * @param {string} id - Service identifier
   * @returns {boolean} Whether the service exists
   */
  hasService(id) {
    return this.services.has(id);
  }
  
  /**
   * Get a service
   * @param {string} id - Service identifier
   * @returns {Object} Service instance
   */
  getService(id) {
    if (!this.services.has(id)) {
      throw new ServiceError(`Service "${id}" not found`);
    }
    
    return this.services.get(id);
  }
}

/**
 * Entity manager for component-entity system
 */
export class EntityManager {
  constructor() {
    this.entities = new Map();
    this.componentsByType = new Map();
    this.nextEntityId = 1;
  }
  
  /**
   * Create a new entity
   * @returns {number} Entity ID
   */
  createEntity() {
    const entityId = this.nextEntityId++;
    this.entities.set(entityId, new Map());
    return entityId;
  }
  
  /**
   * Remove an entity and all its components
   * @param {number} entityId - Entity ID
   */
  removeEntity(entityId) {
    if (!this.entities.has(entityId)) return;
    
    // Remove components from index
    const components = this.entities.get(entityId);
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
   * @param {number} entityId - Entity ID
   * @param {string} componentType - Component type
   * @param {Object} component - Component instance
   */
  addComponent(entityId, componentType, component) {
    if (!this.entities.has(entityId)) {
      throw new EntityError(`Entity ${entityId} not found`);
    }
    
    // Add to entity
    this.entities.get(entityId).set(componentType, component);
    
    // Add to component index
    if (!this.componentsByType.has(componentType)) {
      this.componentsByType.set(componentType, new Map());
    }
    
    this.componentsByType.get(componentType).set(entityId, component);
  }
  
  /**
   * Get a component from an entity
   * @param {number} entityId - Entity ID
   * @param {string} componentType - Component type
   * @returns {Object} Component instance
   */
  getComponent(entityId, componentType) {
    if (!this.entities.has(entityId)) {
      throw new EntityError(`Entity ${entityId} not found`);
    }
    
    const components = this.entities.get(entityId);
    if (!components.has(componentType)) {
      return null;
    }
    
    return components.get(componentType);
  }
  
  /**
   * Query entities that have specific components
   * @param {Array<string>} componentTypes - Component types to query for
   * @returns {Array<number>} Entity IDs
   */
  queryEntities(componentTypes) {
    if (componentTypes.length === 0) return [];
    
    // Start with entities that have the first component
    const firstType = componentTypes[0];
    if (!this.componentsByType.has(firstType)) {
      return [];
    }
    
    const candidates = Array.from(this.componentsByType.get(firstType).keys());
    
    // Filter by remaining component types
    return candidates.filter(entityId => {
      const entity = this.entities.get(entityId);
      return componentTypes.every(type => entity.has(type));
    });
  }
}

/**
 * Time manager for game time and time scaling
 */
export class TimeManager {
  constructor() {
    this.gameTime = 0; // Game time in seconds
    this.timeScale = 1; // Time scale factor
    this.dayLength = 24 * 60 * 60; // Day length in seconds
  }
  
  /**
   * Update game time
   * @param {number} deltaTime - Real time delta in seconds
   */
  update(deltaTime) {
    this.gameTime += deltaTime * this.timeScale;
    
    // Wrap around day time if needed
    if (this.gameTime >= this.dayLength) {
      this.gameTime %= this.dayLength;
    }
  }
  
  /**
   * Set the time scale
   * @param {number} scale - Time scale factor
   */
  setTimeScale(scale) {
    this.timeScale = Math.max(0, scale);
  }
  
  /**
   * Set the game time
   * @param {number} time - Game time in seconds
   */
  setGameTime(time) {
    this.gameTime = time % this.dayLength;
  }
  
  /**
   * Get the time of day (hours)
   * @returns {number} Time of day in hours (0-24)
   */
  getTimeOfDay() {
    return (this.gameTime / 3600) % 24;
  }
} 