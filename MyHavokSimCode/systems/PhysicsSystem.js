/**
 * Physics system using Havok Physics engine
 * Handles all physics interactions between entities
 */

import { 
  PhysicsError, 
  CollisionError
} from '../core/ErrorHandling.js';

export class PhysicsSystem {
  constructor(scene) {
    this.scene = scene;
    this.physicsEngine = null;
    this.bodies = new Map(); // EntityID -> Physics Body
    this.plugins = new Map(); // Plugin name -> Plugin instance
    this.timeAccumulator = 0;
    this.fixedTimeStep = 1/60; // 60 Hz physics update
    this.gravity = { x: 0, y: -9.81, z: 0 };
    this.maxSubSteps = 4;
    this.debugDraw = false;
    this.debugDrawMesh = null;
    this.collisionCallbacks = new Map(); // EntityID -> Collision callback
    this.isInitialized = false;
  }
  
  /**
   * Initialize the physics system with Havok
   */
  async initialize(core) {
    try {
      // Save reference to simulation core
      this.core = core;
      
      console.log("Initializing Havok Physics...");
      
      // Initialize Havok physics
      const havokInstance = await HavokPhysics();
      const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
      
      // Enable physics in the scene
      this.scene.enablePhysics(
        new BABYLON.Vector3(this.gravity.x, this.gravity.y, this.gravity.z), 
        havokPlugin
      );
      
      this.physicsEngine = this.scene.getPhysicsEngine();
      
      // Subscribe to collision events
      this.scene.onBeforePhysicsObservable.add(() => {
        this.beforePhysicsUpdate();
      });
      
      this.scene.onAfterPhysicsObservable.add(() => {
        this.afterPhysicsUpdate();
      });
      
      // Setup debug drawing if enabled
      if (this.debugDraw) {
        this.setupDebugDraw();
      }
      
      this.isInitialized = true;
      console.log("Havok Physics initialized successfully");
      
      // Subscribe to entity creation/removal events
      this.core.eventBus.subscribe('entity:created', this.onEntityCreated.bind(this));
      this.core.eventBus.subscribe('entity:removed', this.onEntityRemoved.bind(this));
      this.core.eventBus.subscribe('component:added', this.onComponentAdded.bind(this));
      this.core.eventBus.subscribe('component:removed', this.onComponentRemoved.bind(this));
      
      return true;
    } catch (error) {
      console.error("Failed to initialize Havok Physics:", error);
      throw new PhysicsError(`Failed to initialize physics: ${error.message}`);
    }
  }
  
  /**
   * Set gravity vector
   * @param {Object} gravity - Gravity vector
   */
  setGravity(gravity) {
    try {
      this.gravity = { ...gravity };
      
      if (this.physicsEngine) {
        this.physicsEngine.setGravity(
          new BABYLON.Vector3(gravity.x, gravity.y, gravity.z)
        );
      }
    } catch (error) {
      if (error instanceof PhysicsError) {
        throw error;
      } else {
        throw new PhysicsError(`Error in setGravity: ${error.message}`);
      }
    }
  }
  
  /**
   * Create a physics body for an entity
   * @param {number} entityId - Entity ID
   * @param {Object} physicsComponent - Physics component
   * @param {Object} transformComponent - Transform component
   */
  createBody(entityId, physicsComponent, transformComponent) {
    try {
      if (!this.isInitialized) {
        throw new PhysicsError("Physics system not initialized");
      }
      
      if (this.bodies.has(entityId)) {
        throw new PhysicsError(`Physics body already exists for entity ${entityId}`);
      }
      
      // Create physics impostor
      const position = transformComponent.position;
      const rotation = transformComponent.rotation;
      
      // Create mesh for physics if it doesn't exist
      let mesh = this.scene.getMeshByName(`physics_${entityId}`);
      if (!mesh) {
        // Create physics mesh based on collider type
        switch (physicsComponent.colliderType) {
          case 'box':
            mesh = BABYLON.MeshBuilder.CreateBox(
              `physics_${entityId}`,
              {
                width: physicsComponent.colliderSize.x,
                height: physicsComponent.colliderSize.y,
                depth: physicsComponent.colliderSize.z
              },
              this.scene
            );
            break;
          case 'sphere':
            mesh = BABYLON.MeshBuilder.CreateSphere(
              `physics_${entityId}`,
              { diameter: physicsComponent.colliderSize.x },
              this.scene
            );
            break;
          case 'cylinder':
            mesh = BABYLON.MeshBuilder.CreateCylinder(
              `physics_${entityId}`,
              {
                height: physicsComponent.colliderSize.y,
                diameter: physicsComponent.colliderSize.x
              },
              this.scene
            );
            break;
          case 'capsule':
            mesh = BABYLON.MeshBuilder.CreateCapsule(
              `physics_${entityId}`,
              {
                height: physicsComponent.colliderSize.y,
                radius: physicsComponent.colliderSize.x / 2
              },
              this.scene
            );
            break;
          default:
            throw new PhysicsError(`Unsupported collider type: ${physicsComponent.colliderType}`);
        }
        
        // Set mesh properties
        mesh.position = new BABYLON.Vector3(position.x, position.y, position.z);
        mesh.rotation = new BABYLON.Vector3(rotation.x, rotation.y, rotation.z);
        mesh.isVisible = this.debugDraw; // Only visible in debug mode
      }
      
      // Create physics impostor
      const impostorType = this.getImpostorType(physicsComponent.colliderType);
      const impostor = new BABYLON.PhysicsImpostor(
        mesh,
        impostorType,
        {
          mass: physicsComponent.isStatic ? 0 : physicsComponent.mass,
          restitution: physicsComponent.restitution,
          friction: physicsComponent.friction
        },
        this.scene
      );
      
      // Set initial velocity if specified
      if (physicsComponent.velocity && !physicsComponent.isStatic) {
        impostor.setLinearVelocity(
          new BABYLON.Vector3(
            physicsComponent.velocity.x,
            physicsComponent.velocity.y,
            physicsComponent.velocity.z
          )
        );
      }
      
      // Set angular velocity if specified
      if (physicsComponent.angularVelocity && !physicsComponent.isStatic) {
        impostor.setAngularVelocity(
          new BABYLON.Vector3(
            physicsComponent.angularVelocity.x,
            physicsComponent.angularVelocity.y,
            physicsComponent.angularVelocity.z
          )
        );
      }
      
      // Store physics body
      this.bodies.set(entityId, {
        mesh: mesh,
        impostor: impostor,
        entityId: entityId
      });
      
      // Update physics component reference
      physicsComponent.physicsBody = this.bodies.get(entityId);
      
      // Set up collision callback if the component has onCollision
      if (typeof physicsComponent.onCollision === 'function') {
        this.setCollisionCallback(entityId, physicsComponent.onCollision);
      }
      
      return this.bodies.get(entityId);
    } catch (error) {
      if (error instanceof PhysicsError) {
        throw error;
      } else {
        throw new PhysicsError(`Error in createBody: ${error.message}`);
      }
    }
  }
  
  /**
   * Remove a physics body
   * @param {number} entityId - Entity ID
   */
  removeBody(entityId) {
    try {
      if (!this.bodies.has(entityId)) return;
      
      const body = this.bodies.get(entityId);
      
      // Remove collision callback
      this.collisionCallbacks.delete(entityId);
      
      // Remove impostor
      if (body.impostor) {
        // Properly dispose the impostor - this is different between physics engines
        try {
          body.impostor.dispose();
        } catch (e) {
          console.warn(`Error disposing impostor for entity ${entityId}: ${e.message}`);
          // If direct disposal fails, try to remove it from the scene
          if (this.scene && this.scene.getPhysicsEngine()) {
            // Some physics engines may use a different method to remove impostors
            const physicsEngine = this.scene.getPhysicsEngine();
            
            // Check if physics engine has the right method before calling it
            if (typeof physicsEngine.unregisterImpostor === 'function') {
              physicsEngine.unregisterImpostor(body.impostor);
            }
          }
        }
      }
      
      // Remove mesh if it was created for physics
      if (body.mesh && body.mesh.name.startsWith('physics_')) {
        body.mesh.dispose();
      }
      
      // Remove from bodies map
      this.bodies.delete(entityId);
    } catch (error) {
      if (error instanceof PhysicsError) {
        throw error;
      } else {
        throw new PhysicsError(`Error in removeBody: ${error.message}`);
      }
    }
  }
  
  /**
   * Set collision callback for an entity
   * @param {number} entityId - Entity ID
   * @param {Function} callback - Collision callback
   */
  setCollisionCallback(entityId, callback) {
    try {
      if (!this.bodies.has(entityId)) {
        throw new PhysicsError(`Entity ${entityId} has no physics body`);
      }
      
      this.collisionCallbacks.set(entityId, callback);
      
      // Set up Havok collision callback
      const body = this.bodies.get(entityId);
      body.impostor.onCollideEvent = (collider, collidedWith) => {
        // Find the entity ID for the collided body
        let collidedEntityId = null;
        for (const [id, body] of this.bodies.entries()) {
          if (body.impostor === collidedWith) {
            collidedEntityId = id;
            break;
          }
        }
        
        if (collidedEntityId !== null) {
          // Call the callback
          try {
            callback(collidedEntityId, {
              point: null, // Havok doesn't provide collision point directly
              normal: null, // Havok doesn't provide collision normal directly
              impulse: null // Havok doesn't provide impulse directly
            });
          } catch (error) {
            console.error(`Error in collision callback for entity ${entityId}:`, error);
          }
        }
      };
    } catch (error) {
      if (error instanceof PhysicsError) {
        throw error;
      } else {
        throw new PhysicsError(`Error in setCollisionCallback: ${error.message}`);
      }
    }
  }
  
  /**
   * Apply force to an entity
   * @param {number} entityId - Entity ID
   * @param {Object} force - Force vector
   * @param {Object} point - Application point (world space)
   */
  applyForce(entityId, force, point = null) {
    try {
      if (!this.bodies.has(entityId)) {
        throw new PhysicsError(`Entity ${entityId} has no physics body`);
      }
      
      const body = this.bodies.get(entityId);
      
      if (body.impostor.mass === 0) {
        throw new PhysicsError(`Cannot apply force to static body for entity ${entityId}`);
      }
      
      const forceVector = new BABYLON.Vector3(force.x, force.y, force.z);
      
      if (point) {
        const pointVector = new BABYLON.Vector3(point.x, point.y, point.z);
        body.impostor.applyForce(forceVector, pointVector);
      } else {
        body.impostor.applyForce(forceVector, body.mesh.getAbsolutePosition());
      }
    } catch (error) {
      if (error instanceof PhysicsError) {
        throw error;
      } else {
        throw new PhysicsError(`Error in applyForce: ${error.message}`);
      }
    }
  }
  
  /**
   * Apply impulse to an entity
   * @param {number} entityId - Entity ID
   * @param {Object} impulse - Impulse vector
   * @param {Object} point - Application point (world space)
   */
  applyImpulse(entityId, impulse, point = null) {
    try {
      if (!this.bodies.has(entityId)) {
        throw new PhysicsError(`Entity ${entityId} has no physics body`);
      }
      
      const body = this.bodies.get(entityId);
      
      if (body.impostor.mass === 0) {
        throw new PhysicsError(`Cannot apply impulse to static body for entity ${entityId}`);
      }
      
      const impulseVector = new BABYLON.Vector3(impulse.x, impulse.y, impulse.z);
      
      if (point) {
        const pointVector = new BABYLON.Vector3(point.x, point.y, point.z);
        body.impostor.applyImpulse(impulseVector, pointVector);
      } else {
        body.impostor.applyImpulse(impulseVector, body.mesh.getAbsolutePosition());
      }
    } catch (error) {
      if (error instanceof PhysicsError) {
        throw error;
      } else {
        throw new PhysicsError(`Error in applyImpulse: ${error.message}`);
      }
    }
  }
  
  /**
   * Set linear velocity of an entity
   * @param {number} entityId - Entity ID
   * @param {Object} velocity - Velocity vector
   */
  setLinearVelocity(entityId, velocity) {
    try {
      if (!this.bodies.has(entityId)) {
        throw new PhysicsError(`Entity ${entityId} has no physics body`);
      }
      
      const body = this.bodies.get(entityId);
      
      if (body.impostor.mass === 0) {
        throw new PhysicsError(`Cannot set velocity for static body for entity ${entityId}`);
      }
      
      body.impostor.setLinearVelocity(
        new BABYLON.Vector3(velocity.x, velocity.y, velocity.z)
      );
    } catch (error) {
      if (error instanceof PhysicsError) {
        throw error;
      } else {
        throw new PhysicsError(`Error in setLinearVelocity: ${error.message}`);
      }
    }
  }
  
  /**
   * Get linear velocity of an entity
   * @param {number} entityId - Entity ID
   * @returns {Object} Velocity vector
   */
  getLinearVelocity(entityId) {
    try {
      if (!this.bodies.has(entityId)) {
        throw new PhysicsError(`Entity ${entityId} has no physics body`);
      }
      
      const body = this.bodies.get(entityId);
      const velocity = body.impostor.getLinearVelocity();
      
      return {
        x: velocity.x,
        y: velocity.y,
        z: velocity.z
      };
    } catch (error) {
      if (error instanceof PhysicsError) {
        throw error;
      } else {
        throw new PhysicsError(`Error in getLinearVelocity: ${error.message}`);
      }
    }
  }
  
  /**
   * Update physics simulation
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    try {
      const start = performance.now();
      
      if (!this.isInitialized || !this.physicsEngine) return;
      
      // Physics is handled by Babylon.js physics engine
      // We just need to sync our entity transforms with physics bodies
      
      // Update transforms from physics
      this.syncTransformsFromPhysics();
      
      // Update debug visualization if enabled
      if (this.debugDraw) {
        this.updateDebugDraw();
      }
      
      const duration = performance.now() - start;
      console.debug(`update took ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.error(`Error in physics update: ${error.message}`);
    }
  }
  
  /**
   * Update transforms from physics simulation
   */
  syncTransformsFromPhysics() {
    for (const [entityId, body] of this.bodies.entries()) {
      // Skip if body is static
      if (body.impostor.mass === 0) continue;
      
      // Get transform component
      const transformComponent = this.core.entityManager.getComponent(entityId, 'TransformComponent');
      if (!transformComponent) continue;
      
      // Get position and rotation from physics body
      const position = body.mesh.position;
      const rotation = body.mesh.rotation;
      
      // Update transform component
      transformComponent.updateTransform(
        { x: position.x, y: position.y, z: position.z },
        { x: rotation.x, y: rotation.y, z: rotation.z }
      );
    }
  }
  
  /**
   * Update transforms from entity before physics step
   */
  syncTransformsToPhysics() {
    for (const [entityId, body] of this.bodies.entries()) {
      // Skip if body is static
      if (body.impostor.mass === 0) continue;
      
      // Get transform component
      const transformComponent = this.core.entityManager.getComponent(entityId, 'TransformComponent');
      if (!transformComponent) continue;
      
      // Update physics body position and rotation
      body.mesh.position = new BABYLON.Vector3(
        transformComponent.position.x,
        transformComponent.position.y,
        transformComponent.position.z
      );
      
      body.mesh.rotation = new BABYLON.Vector3(
        transformComponent.rotation.x,
        transformComponent.rotation.y,
        transformComponent.rotation.z
      );
    }
  }
  
  /**
   * Called before physics update
   */
  beforePhysicsUpdate() {
    // Sync transforms before physics step
    this.syncTransformsToPhysics();
  }
  
  /**
   * Called after physics update
   */
  afterPhysicsUpdate() {
    // Sync transforms after physics step
    this.syncTransformsFromPhysics();
  }
  
  /**
   * Set up debug drawing
   */
  setupDebugDraw() {
    // Make all physics meshes visible
    for (const body of this.bodies.values()) {
      if (body.mesh) {
        body.mesh.isVisible = true;
        
        // Add wireframe material
        const material = new BABYLON.StandardMaterial("physicsMaterial", this.scene);
        material.wireframe = true;
        material.emissiveColor = new BABYLON.Color3(0, 1, 0);
        body.mesh.material = material;
      }
    }
  }
  
  /**
   * Update debug drawing
   */
  updateDebugDraw() {
    // Nothing to do, meshes are automatically updated
  }
  
  /**
   * Convert collider type to Babylon.js impostor type
   * @param {string} colliderType - Collider type
   * @returns {number} Impostor type
   */
  getImpostorType(colliderType) {
    switch (colliderType) {
      case 'box':
        return BABYLON.PhysicsImpostor.BoxImpostor;
      case 'sphere':
        return BABYLON.PhysicsImpostor.SphereImpostor;
      case 'cylinder':
        return BABYLON.PhysicsImpostor.CylinderImpostor;
      case 'capsule':
        return BABYLON.PhysicsImpostor.CapsuleImpostor;
      case 'mesh':
        return BABYLON.PhysicsImpostor.MeshImpostor;
      case 'heightmap':
        return BABYLON.PhysicsImpostor.HeightmapImpostor;
      default:
        throw new PhysicsError(`Unsupported collider type: ${colliderType}`);
    }
  }
  
  /**
   * Cast ray and return hit information
   * @param {Object} from - Ray start position
   * @param {Object} to - Ray end position
   * @returns {Object} Hit information
   */
  rayCast(from, to) {
    try {
      if (!this.isInitialized) {
        throw new PhysicsError("Physics system not initialized");
      }
      
      const fromVector = new BABYLON.Vector3(from.x, from.y, from.z);
      const toVector = new BABYLON.Vector3(to.x, to.y, to.z);
      
      const ray = new BABYLON.Ray(fromVector, toVector.subtract(fromVector).normalize());
      const length = BABYLON.Vector3.Distance(fromVector, toVector);
      
      const hit = this.scene.pickWithRay(ray, (mesh) => {
        // Only consider meshes with physics impostors
        return mesh.physicsImpostor !== null;
      }, false, false, length);
      
      if (hit.hit) {
        // Find entity ID for hit object
        let hitEntityId = null;
        for (const [entityId, body] of this.bodies.entries()) {
          if (body.mesh === hit.pickedMesh) {
            hitEntityId = entityId;
            break;
          }
        }
        
        return {
          hit: true,
          entityId: hitEntityId,
          point: {
            x: hit.pickedPoint.x,
            y: hit.pickedPoint.y,
            z: hit.pickedPoint.z
          },
          normal: {
            x: hit.getNormal().x,
            y: hit.getNormal().y,
            z: hit.getNormal().z
          },
          distance: hit.distance
        };
      } else {
        return {
          hit: false,
          entityId: null,
          point: null,
          normal: null,
          distance: null
        };
      }
    } catch (error) {
      if (error instanceof PhysicsError) {
        throw error;
      } else {
        throw new PhysicsError(`Error in rayCast: ${error.message}`);
      }
    }
  }
  
  /**
   * Handle entity created event
   * @param {Object} data - Event data
   */
  onEntityCreated(data) {
    // Nothing to do, wait for components to be added
  }
  
  /**
   * Handle entity removed event
   * @param {Object} data - Event data
   */
  onEntityRemoved(data) {
    // Remove physics body if it exists
    this.removeBody(data.entityId);
  }
  
  /**
   * Handle component added event
   * @param {Object} data - Event data
   */
  onComponentAdded(data) {
    const { entityId, componentType, component } = data;
    
    // If physics component added, create physics body
    if (componentType === 'PhysicsComponent') {
      // Need transform component as well
      const transformComponent = this.core.entityManager.getComponent(entityId, 'TransformComponent');
      if (transformComponent) {
        this.createBody(entityId, component, transformComponent);
      }
    }
    
    // If transform component added and physics component exists, create physics body
    if (componentType === 'TransformComponent') {
      const physicsComponent = this.core.entityManager.getComponent(entityId, 'PhysicsComponent');
      if (physicsComponent && !this.bodies.has(entityId)) {
        this.createBody(entityId, physicsComponent, component);
      }
    }
  }
  
  /**
   * Handle component removed event
   * @param {Object} data - Event data
   */
  onComponentRemoved(data) {
    const { entityId, componentType } = data;
    
    // If physics component removed, remove physics body
    if (componentType === 'PhysicsComponent') {
      this.removeBody(entityId);
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    // Remove all physics bodies
    for (const entityId of this.bodies.keys()) {
      this.removeBody(entityId);
    }
    
    // Clear maps
    this.bodies.clear();
    this.collisionCallbacks.clear();
    
    // Reset state
    this.isInitialized = false;
  }
} 