/**
 * Core components for entity composition
 * Following the composition over inheritance principle
 */

import { ComponentError } from './ErrorHandling.js';

// Base component interface
export class Component {
  constructor(data = {}) {
    this.type = this.constructor.name;
    this.data = data;
  }
  
  // Method to be overridden by specific components
  update(deltaTime) {
    // Default implementation does nothing
  }
  
  // Cleanup resources
  dispose() {
    // Default implementation does nothing
  }
}

/**
 * Transform Component - Position, rotation, and scale
 */
export class TransformComponent extends Component {
  constructor({ 
    position = { x: 0, y: 0, z: 0 }, 
    rotation = { x: 0, y: 0, z: 0 }, 
    scale = { x: 1, y: 1, z: 1 } 
  } = {}) {
    super();
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.previousPosition = { ...position };
    this.previousRotation = { ...rotation };
  }
  
  /**
   * Update transform
   * @param {Object} newPosition - New position
   * @param {Object} newRotation - New rotation
   * @param {Object} newScale - New scale
   */
  updateTransform(newPosition, newRotation, newScale) {
    try {
      // Store previous state for interpolation
      this.previousPosition = { ...this.position };
      this.previousRotation = { ...this.rotation };
      
      // Update current state
      if (newPosition) this.position = { ...newPosition };
      if (newRotation) this.rotation = { ...newRotation };
      if (newScale) this.scale = { ...newScale };
    } catch (error) {
      throw new ComponentError(`Error in updateTransform: ${error.message}`);
    }
  }
  
  /**
   * Interpolate between previous and current transform
   * @param {number} alpha - Interpolation factor (0-1)
   * @returns {Object} Interpolated transform
   */
  interpolate(alpha) {
    // Clamp alpha to valid range
    alpha = Math.max(0, Math.min(1, alpha));
    
    return {
      position: {
        x: this.previousPosition.x + (this.position.x - this.previousPosition.x) * alpha,
        y: this.previousPosition.y + (this.position.y - this.previousPosition.y) * alpha,
        z: this.previousPosition.z + (this.position.z - this.previousPosition.z) * alpha
      },
      rotation: {
        x: this.previousRotation.x + (this.rotation.x - this.previousRotation.x) * alpha,
        y: this.previousRotation.y + (this.rotation.y - this.previousRotation.y) * alpha,
        z: this.previousRotation.z + (this.rotation.z - this.previousRotation.z) * alpha
      },
      scale: { ...this.scale } // Scale is not interpolated
    };
  }
}

/**
 * Physics Component - Physics properties and collision
 */
export class PhysicsComponent extends Component {
  constructor({ 
    mass = 1, 
    isStatic = false, 
    restitution = 0.2,
    friction = 0.5,
    colliderType = 'box',
    colliderSize = { x: 1, y: 1, z: 1 },
    collisionGroup = 1,
    collisionMask = -1,
    isTrigger = false
  } = {}) {
    super();
    this.mass = mass;
    this.isStatic = isStatic;
    this.restitution = restitution;
    this.friction = friction;
    this.colliderType = colliderType;
    this.colliderSize = colliderSize;
    this.collisionGroup = collisionGroup;
    this.collisionMask = collisionMask;
    this.isTrigger = isTrigger;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };
    this.physicsBody = null; // Will be set by PhysicsSystem
    this.collisions = new Set(); // Set of entity IDs currently in collision
  }
  
  /**
   * Apply force to the physics body
   * @param {Object} force - Force vector
   * @param {Object} point - Application point (relative to center)
   */
  applyForce(force, point = { x: 0, y: 0, z: 0 }) {
    try {
      if (!this.physicsBody) {
        throw new ComponentError("Physics body not initialized");
      }
      
      // Implementation will depend on physics engine
      // This is just a placeholder
      this.velocity.x += force.x / this.mass;
      this.velocity.y += force.y / this.mass;
      this.velocity.z += force.z / this.mass;
    } catch (error) {
      throw new ComponentError(`Error in applyForce: ${error.message}`);
    }
  }
  
  /**
   * Apply impulse to the physics body
   * @param {Object} impulse - Impulse vector
   */
  applyImpulse(impulse) {
    try {
      if (!this.physicsBody) {
        throw new ComponentError("Physics body not initialized");
      }
      
      // Implementation will depend on physics engine
      this.velocity.x += impulse.x / this.mass;
      this.velocity.y += impulse.y / this.mass;
      this.velocity.z += impulse.z / this.mass;
    } catch (error) {
      throw new ComponentError(`Error in applyImpulse: ${error.message}`);
    }
  }
  
  /**
   * Set velocity directly
   * @param {Object} velocity - Velocity vector
   */
  setVelocity(velocity) {
    try {
      this.velocity = { ...velocity };
      
      // Update physics body if available
      if (this.physicsBody) {
        // Implementation will depend on physics engine
      }
    } catch (error) {
      throw new ComponentError(`Error in setVelocity: ${error.message}`);
    }
  }
  
  dispose() {
    // Clean up physics body
    if (this.physicsBody) {
      // Implementation will depend on physics engine
      this.physicsBody = null;
    }
  }
}

/**
 * Render Component - Visual representation
 */
export class RenderComponent extends Component {
  constructor({ 
    meshType = 'box',
    meshOptions = {},
    material = null,
    visible = true,
    castShadow = true,
    receiveShadow = true,
    lodLevels = []
  } = {}) {
    super();
    this.meshType = meshType;
    this.meshOptions = meshOptions;
    this.material = material;
    this.visible = visible;
    this.castShadow = castShadow;
    this.receiveShadow = receiveShadow;
    this.lodLevels = lodLevels;
    this.mesh = null; // Will be set by RenderSystem
    this.currentLodLevel = 0;
  }
  
  /**
   * Set visibility
   * @param {boolean} visible - Visibility flag
   */
  setVisibility(visible) {
    try {
      this.visible = visible;
      
      if (this.mesh) {
        this.mesh.visible = visible;
      }
    } catch (error) {
      throw new ComponentError(`Error in setVisibility: ${error.message}`);
    }
  }
  
  /**
   * Update LOD level based on distance
   * @param {number} distance - Distance to camera
   */
  updateLOD(distance) {
    try {
      if (!this.lodLevels.length) return;
      
      // Find appropriate LOD level
      let level = 0;
      for (let i = 0; i < this.lodLevels.length; i++) {
        if (distance > this.lodLevels[i].distance) {
          level = i + 1;
        } else {
          break;
        }
      }
      
      // If level changed, update mesh
      if (level !== this.currentLodLevel) {
        this.currentLodLevel = level;
        this.updateMesh();
      }
    } catch (error) {
      throw new ComponentError(`Error in updateLOD: ${error.message}`);
    }
  }
  
  /**
   * Update mesh based on current LOD level
   * @private
   */
  updateMesh() {
    if (!this.mesh) return;
    
    // Implementation will depend on rendering engine
  }
  
  dispose() {
    // Clean up mesh
    if (this.mesh) {
      // Implementation will depend on rendering engine
      this.mesh = null;
    }
  }
}

/**
 * AI Component - Agent behavior
 */
export class AIComponent extends Component {
  constructor({ 
    behaviorType = 'idle',
    parameters = {},
    target = null,
    enabled = true
  } = {}) {
    super();
    this.behaviorType = behaviorType;
    this.parameters = parameters;
    this.target = target;
    this.enabled = enabled;
    this.state = {
      currentState: 'idle',
      previousState: null,
      stateTime: 0,
      path: [],
      waypoint: null,
      targetPosition: null
    };
  }
  
  /**
   * Change behavior type
   * @param {string} behaviorType - New behavior type
   * @param {Object} parameters - Behavior parameters
   */
  setBehavior(behaviorType, parameters = {}) {
    try {
      this.behaviorType = behaviorType;
      this.parameters = { ...this.parameters, ...parameters };
      // Reset state time for new behavior
      this.state.stateTime = 0;
    } catch (error) {
      throw new ComponentError(`Error in setBehavior: ${error.message}`);
    }
  }
  
  /**
   * Set AI target
   * @param {Object} target - Target object or entity
   */
  setTarget(target) {
    try {
      this.target = target;
      // Update target position if available
      if (target && target.position) {
        this.state.targetPosition = { ...target.position };
      }
    } catch (error) {
      throw new ComponentError(`Error in setTarget: ${error.message}`);
    }
  }
  
  /**
   * Change AI state
   * @param {string} state - New state
   */
  setState(state) {
    try {
      this.state.previousState = this.state.currentState;
      this.state.currentState = state;
      this.state.stateTime = 0;
    } catch (error) {
      throw new ComponentError(`Error in setState: ${error.message}`);
    }
  }
  
  /**
   * Update AI state
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.enabled) return;
    
    // Update state time
    this.state.stateTime += deltaTime;
    
    // Update target position if target is available
    if (this.target && this.target.position) {
      this.state.targetPosition = { ...this.target.position };
    }
    
    // Behavior implementation will be handled by AISystem
  }
}

/**
 * Interaction Component - Entity interaction capabilities
 */
export class InteractionComponent extends Component {
  constructor({ 
    interactionRadius = 2,
    interactionTypes = [],
    isInteractable = true,
    cooldown = 0,
    data = {}
  } = {}) {
    super();
    this.interactionRadius = interactionRadius;
    this.interactionTypes = interactionTypes;
    this.isInteractable = isInteractable;
    this.cooldown = cooldown;
    this.lastInteractionTime = 0;
    this.data = data;
    this.onInteract = null; // Callback function
  }
  
  /**
   * Check if interaction is possible
   * @param {Object} interactor - Interacting entity
   * @param {string} interactionType - Type of interaction
   * @returns {boolean} Whether interaction is possible
   */
  canInteract(interactor, interactionType) {
    try {
      if (!this.isInteractable) return false;
      
      // Check cooldown
      const currentTime = performance.now();
      if (currentTime - this.lastInteractionTime < this.cooldown) {
        return false;
      }
      
      // Check interaction type
      if (interactionType && !this.interactionTypes.includes(interactionType)) {
        return false;
      }
      
      return true;
    } catch (error) {
      throw new ComponentError(`Error in canInteract: ${error.message}`);
    }
  }
  
  /**
   * Handle interaction
   * @param {Object} interactor - Interacting entity
   * @param {string} interactionType - Type of interaction
   * @returns {boolean} Whether interaction was successful
   */
  interact(interactor, interactionType) {
    try {
      if (!this.canInteract(interactor, interactionType)) {
        return false;
      }
      
      // Update last interaction time
      this.lastInteractionTime = performance.now();
      
      // Call interaction callback if available
      if (this.onInteract) {
        this.onInteract(interactor, interactionType);
      }
      
      return true;
    } catch (error) {
      throw new ComponentError(`Error in interact: ${error.message}`);
    }
  }
  
  /**
   * Set interaction callback
   * @param {Function} callback - Interaction callback
   */
  setInteractionCallback(callback) {
    try {
      this.onInteract = callback;
    } catch (error) {
      throw new ComponentError(`Error in setInteractionCallback: ${error.message}`);
    }
  }
}

/**
 * Environment Component - Environmental properties
 */
export class EnvironmentComponent extends Component {
  constructor({ 
    environmentType = 'neutral',
    temperature = 20,
    humidity = 0.5,
    luminosity = 1,
    windDirection = { x: 0, y: 0, z: 0 },
    windStrength = 0
  } = {}) {
    super();
    this.environmentType = environmentType;
    this.temperature = temperature;
    this.humidity = humidity;
    this.luminosity = luminosity;
    this.windDirection = windDirection;
    this.windStrength = windStrength;
    this.effects = new Map(); // Map of active environmental effects
  }
  
  /**
   * Add an environmental effect
   * @param {string} effectType - Effect type
   * @param {Object} effectData - Effect data
   * @param {number} duration - Effect duration (0 for permanent)
   */
  addEffect(effectType, effectData, duration = 0) {
    try {
      this.effects.set(effectType, {
        data: effectData,
        startTime: performance.now(),
        duration: duration
      });
    } catch (error) {
      throw new ComponentError(`Error in addEffect: ${error.message}`);
    }
  }
  
  /**
   * Remove an environmental effect
   * @param {string} effectType - Effect type
   */
  removeEffect(effectType) {
    try {
      this.effects.delete(effectType);
    } catch (error) {
      throw new ComponentError(`Error in removeEffect: ${error.message}`);
    }
  }
  
  /**
   * Check if an effect is active
   * @param {string} effectType - Effect type
   * @returns {boolean} Whether the effect is active
   */
  hasEffect(effectType) {
    try {
      return this.effects.has(effectType);
    } catch (error) {
      throw new ComponentError(`Error in hasEffect: ${error.message}`);
    }
  }
  
  /**
   * Update environmental effects
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    const currentTime = performance.now();
    
    // Remove expired effects
    for (const [effectType, effect] of this.effects.entries()) {
      if (effect.duration > 0 && currentTime - effect.startTime > effect.duration) {
        this.effects.delete(effectType);
      }
    }
  }
}

/**
 * Sound Component - Sound and audio
 */
export class SoundComponent extends Component {
  constructor({ 
    sounds = {},
    volume = 1,
    spatialBlend = 1,
    minDistance = 1,
    maxDistance = 20
  } = {}) {
    super();
    this.sounds = sounds; // Map of sound names to sound data
    this.volume = volume;
    this.spatialBlend = spatialBlend;
    this.minDistance = minDistance;
    this.maxDistance = maxDistance;
    this.playingSounds = new Map(); // Map of currently playing sounds
  }
  
  /**
   * Play a sound
   * @param {string} soundName - Sound name
   * @param {boolean} loop - Whether to loop the sound
   * @param {number} volume - Sound volume override
   * @returns {Object} Sound instance
   */
  playSound(soundName, loop = false, volume = this.volume) {
    try {
      if (!this.sounds[soundName]) {
        throw new ComponentError(`Sound "${soundName}" not found`);
      }
      
      // Implementation will depend on audio engine
      const soundInstance = {
        id: Date.now(),
        name: soundName,
        loop: loop,
        volume: volume,
        startTime: performance.now()
      };
      
      this.playingSounds.set(soundInstance.id, soundInstance);
      
      return soundInstance;
    } catch (error) {
      throw new ComponentError(`Error in playSound: ${error.message}`);
    }
  }
  
  /**
   * Stop a sound
   * @param {string|Object} sound - Sound name or instance
   */
  stopSound(sound) {
    try {
      if (typeof sound === 'string') {
        // Stop all sounds with the given name
        for (const [id, instance] of this.playingSounds.entries()) {
          if (instance.name === sound) {
            // Implementation will depend on audio engine
            this.playingSounds.delete(id);
          }
        }
      } else if (sound && sound.id) {
        // Stop specific sound instance
        // Implementation will depend on audio engine
        this.playingSounds.delete(sound.id);
      }
    } catch (error) {
      throw new ComponentError(`Error in stopSound: ${error.message}`);
    }
  }
  
  /**
   * Set sound volume
   * @param {number} volume - New volume
   */
  setVolume(volume) {
    try {
      this.volume = Math.max(0, Math.min(1, volume));
      
      // Update volume of playing sounds
      for (const instance of this.playingSounds.values()) {
        // Implementation will depend on audio engine
      }
    } catch (error) {
      throw new ComponentError(`Error in setVolume: ${error.message}`);
    }
  }
  
  /**
   * Update playing sounds
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Implementation will depend on audio engine
  }
  
  dispose() {
    // Stop all sounds
    for (const [id, instance] of this.playingSounds.entries()) {
      // Implementation will depend on audio engine
    }
    
    this.playingSounds.clear();
  }
} 