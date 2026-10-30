/**
 * PhysicsSystem
 * 
 * Manages Havok Physics integration for the ECS using Babylon.js PhysicsAggregate.
 * Handles physics body creation, synchronization, and cleanup.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.7
 */

import { System } from '../core/System.ts';
import type { World } from '../core/World.ts';
import type { EntityId } from '../core/Entity.ts';
import type {
  PositionComponent,
  VelocityComponent,
  Vector3
} from '../components/CoreComponents.ts';
import type {
  PhysicsBodyComponent,
  CollisionComponent
} from '../components/PhysicsComponents.ts';
import { PhysicsBodyType, PhysicsShapeType } from '../components/PhysicsComponents.ts';

/**
 * Raycast result interface.
 */
export interface RaycastResult {
  hit: boolean;
  entityId: EntityId | null;
  position: Vector3 | null;
  normal: Vector3 | null;
  distance: number;
}

/**
 * PhysicsSystem manages Havok Physics simulation using Babylon.js integration.
 * 
 * Responsibilities:
 * - Initialize Havok Physics plugin on the Babylon scene
 * - Create physics aggregates for entities with PhysicsBody components
 * - Synchronize physics body positions to Position components
 * - Handle physics body cleanup on entity destruction
 * - Process collision events
 */
export class PhysicsSystem extends System {
  readonly componentSignature = new Set(['PhysicsBody', 'Position']);
  readonly priority = 200; // Physics systems priority

  private scene: any = null; // Babylon.Scene
  private havokInstance: any = null; // Havok instance
  private entityToAggregateMap: Map<EntityId, any> = new Map();
  private entityToMeshMap: Map<EntityId, any> = new Map();
  private initialized = false;
  private collisionPairs: Map<string, boolean> = new Map(); // Track collision pairs

  constructor(world: World) {
    super(world);
  }

  /**
   * Initialize Havok Physics engine.
   * Must be called before update() is called.
   * 
   * Requirement 8.1: Initialize Havok Physics plugin
   */
  async initializePhysics(havokInstance: any, scene: any): Promise<void> {
    if (this.initialized) {
      console.warn('PhysicsSystem already initialized');
      return;
    }

    this.havokInstance = havokInstance;
    this.scene = scene;

    // Enable physics on the scene using HavokPlugin
    const BABYLON = (window as any).BABYLON;
    if (typeof BABYLON.HavokPlugin === 'function') {
      // Newer API (Babylon.js 5.0+)
      console.log('Using modern Havok Physics API (HavokPlugin)');
      const havokPlugin = new BABYLON.HavokPlugin(true, this.havokInstance);
      this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), havokPlugin);
    } else if (typeof BABYLON.PhysicsEnginePlugin === 'function') {
      // Older API
      console.log('Using legacy Havok Physics API (PhysicsEnginePlugin)');
      const physicsPlugin = new BABYLON.PhysicsEnginePlugin(this.havokInstance);
      this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin);
    } else {
      throw new Error('No compatible Havok Physics API found in Babylon.js');
    }

    this.initialized = true;
    console.log('PhysicsSystem initialized with Havok');
  }

  /**
   * Update physics simulation.
   * 
   * Requirements:
   * - 8.2: Create physics bodies for entities with physics components
   * - 8.3: Synchronize physics body positions to Position components
   */
  update(_deltaTime: number): void {
    if (!this.initialized || !this.scene) {
      return;
    }

    // Create physics aggregates for new entities
    this.createPhysicsAggregates();

    // Synchronize physics positions back to ECS components
    this.synchronizePositions();

    // Process collisions
    this.processCollisions();
  }

  /**
   * Create physics aggregates for entities that don't have them yet.
   * 
   * Requirement 8.2: Create physics bodies for entities with physics components
   */
  private createPhysicsAggregates(): void {
    if (!this.scene) return;

    const BABYLON = (window as any).BABYLON;
    const entities = this.queryEntities();

    for (const entityId of entities) {
      const physicsBody = this.world.getComponent<PhysicsBodyComponent>(
        entityId,
        'PhysicsBody'
      );
      const position = this.world.getComponent<PositionComponent>(
        entityId,
        'Position'
      );
      const model = this.world.getComponent(entityId, 'Model');

      if (!physicsBody || !position) continue;

      // Skip if aggregate already created
      if (this.entityToAggregateMap.has(entityId)) continue;

      // Get the mesh from the Model component
      const mesh = (model as { mesh?: unknown } | undefined)?.mesh;
      if (!mesh) {
        // Create a simple box mesh for physics if no mesh exists
        const box = BABYLON.MeshBuilder.CreateBox(`physics_${entityId}`, {
          width: physicsBody.dimensions.x,
          height: physicsBody.dimensions.y,
          depth: physicsBody.dimensions.z
        }, this.scene);
        box.position.set(position.x, position.y, position.z);
        // Collider proxy only; RenderSystem owns the visible mesh.
        box.isVisible = false;
        box.isPickable = false;
        this.entityToMeshMap.set(entityId, box);
        this.createAggregateForMesh(entityId, physicsBody, box);
      } else {
        this.entityToMeshMap.set(entityId, mesh);
        this.createAggregateForMesh(entityId, physicsBody, mesh);
      }
    }
  }

  /**
   * Create a PhysicsAggregate for a mesh.
   */
  private createAggregateForMesh(entityId: EntityId, physicsBody: PhysicsBodyComponent, mesh: any): void {
    const BABYLON = (window as any).BABYLON;
    
    // Get the shape type
    const shapeType = this.getBabylonShapeType(physicsBody.shapeType);
    
    // Create physics aggregate
    try {
      const aggregate = new BABYLON.PhysicsAggregate(
        mesh,
        shapeType,
        {
          mass: physicsBody.bodyType === PhysicsBodyType.Static ? 0 : physicsBody.mass,
          friction: physicsBody.friction,
          restitution: physicsBody.restitution,
        },
        this.scene
      );

      this.entityToAggregateMap.set(entityId, aggregate);
      
      // Set collision callback if needed
      if (aggregate.body) {
        aggregate.body.setCollisionCallbackEnabled(true);
      }
      
      console.log(`Created PhysicsAggregate for entity ${entityId}`);
    } catch (error) {
      console.error(`Failed to create PhysicsAggregate for entity ${entityId}:`, error);
    }
  }

  /**
   * Convert our shape type to Babylon.js shape type.
   * Uses numeric values since PhysicsShapeType enum may not be available
   */
  private getBabylonShapeType(shapeType: PhysicsShapeType): number {
    // Babylon.js Havok physics shape type values
    // BOX = 0, SPHERE = 1, CAPSULE = 2, CYLINDER = 3, CONVEX_HULL = 4
    switch (shapeType) {
      case PhysicsShapeType.Box:
        return 0;
      case PhysicsShapeType.Sphere:
        return 1;
      case PhysicsShapeType.Capsule:
        return 2;
      default:
        return 0; // Default to BOX
    }
  }

  /**
   * Synchronize physics body positions back to Position components.
   * 
   * Requirement 8.3: Synchronize physics body positions to Position components
   */
  private synchronizePositions(): void {
    if (!this.scene) return;

    for (const [entityId, aggregate] of this.entityToAggregateMap) {
      const position = this.world.getComponent<PositionComponent>(
        entityId,
        'Position'
      );
      const physicsBody = this.world.getComponent<PhysicsBodyComponent>(
        entityId,
        'PhysicsBody'
      );
      const mesh = this.entityToMeshMap.get(entityId);

      if (!position || !mesh) continue;

      // Kinematic bodies are driven by game logic — push ECS position into the physics mesh
      if (physicsBody?.isKinematic || physicsBody?.bodyType === 'Kinematic') {
        mesh.position.x = position.x;
        mesh.position.y = position.y;
        mesh.position.z = position.z;
        if (mesh.isVisible !== undefined) {
          mesh.isVisible = false; // helper collider; RenderSystem owns the visible mesh
        }
        continue;
      }

      // Get position from the mesh (which is updated by physics)
      position.x = mesh.position.x;
      position.y = mesh.position.y;
      position.z = mesh.position.z;

      // Sync velocity if component exists
      const velocity = this.world.getComponent<VelocityComponent>(
        entityId,
        'Velocity'
      );
      if (velocity && aggregate?.body) {
        const linearVelocity = aggregate.body.getLinearVelocity();
        if (linearVelocity) {
          velocity.vx = linearVelocity.x;
          velocity.vy = linearVelocity.y;
          velocity.vz = linearVelocity.z;
        }
      }
    }
  }

  /**
   * Process collision events.
   * 
   * Requirement 8.4: Handle collision detection and response
   */
  private processCollisions(): void {
    // Get all entities with collision components
    const entities = this.world.query(new Set(['PhysicsBody', 'Collision']));

    for (const entityId of entities) {
      const collision = this.world.getComponent<CollisionComponent>(
        entityId,
        'Collision'
      );
      
      if (!collision) continue;

      // Check for collisions with other entities
      const currentCollisions = new Set<EntityId>();

      for (const otherEntityId of entities) {
        if (entityId === otherEntityId) continue;

        // Check if bodies are colliding (simplified check using distance)
        if (this.areEntitiesColliding(entityId, otherEntityId)) {
          currentCollisions.add(otherEntityId);

          // Check if this is a new collision
          const pairKey = this.getCollisionPairKey(entityId, otherEntityId);
          const wasColliding = this.collisionPairs.get(pairKey) || false;

          if (!wasColliding) {
            // Collision enter
            this.collisionPairs.set(pairKey, true);
            if (collision.onCollisionEnter) {
              collision.onCollisionEnter(otherEntityId);
            }
          } else {
            // Collision stay
            if (collision.onCollisionStay) {
              collision.onCollisionStay(otherEntityId);
            }
          }
        }
      }

      // Check for collision exits
      const previousCollisions = new Set(collision.collidingWith);
      for (const otherEntityId of previousCollisions) {
        if (!currentCollisions.has(otherEntityId)) {
          // Collision exit
          const pairKey = this.getCollisionPairKey(entityId, otherEntityId);
          this.collisionPairs.set(pairKey, false);
          if (collision.onCollisionExit) {
            collision.onCollisionExit(otherEntityId);
          }
        }
      }

      // Update current collisions
      collision.collidingWith = currentCollisions;
    }
  }

  /**
   * Check if two entities are colliding (simplified distance-based check).
   */
  private areEntitiesColliding(entityId1: EntityId, entityId2: EntityId): boolean {
    const pos1 = this.world.getComponent<PositionComponent>(entityId1, 'Position');
    const pos2 = this.world.getComponent<PositionComponent>(entityId2, 'Position');
    const body1 = this.world.getComponent<PhysicsBodyComponent>(entityId1, 'PhysicsBody');
    const body2 = this.world.getComponent<PhysicsBodyComponent>(entityId2, 'PhysicsBody');

    if (!pos1 || !pos2 || !body1 || !body2) return false;

    // Calculate distance between entities
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Simplified collision check using bounding sphere radius
    const radius1 = Math.max(body1.dimensions.x, body1.dimensions.y, body1.dimensions.z) / 2;
    const radius2 = Math.max(body2.dimensions.x, body2.dimensions.y, body2.dimensions.z) / 2;

    return distance < (radius1 + radius2);
  }

  /**
   * Get a unique key for a collision pair.
   */
  private getCollisionPairKey(entityId1: EntityId, entityId2: EntityId): string {
    const [a, b] = entityId1 < entityId2 ? [entityId1, entityId2] : [entityId2, entityId1];
    return `${a}-${b}`;
  }

  /**
   * Perform a raycast from origin in direction.
   * 
   * Requirement 8.6: Implement raycasting for line-of-sight
   */
  raycast(origin: Vector3, direction: Vector3, maxDistance = 1000): RaycastResult {
    if (!this.scene) {
      return {
        hit: false,
        entityId: null,
        position: null,
        normal: null,
        distance: 0
      };
    }

    const BABYLON = (window as any).BABYLON;
    
    // Normalize direction
    const length = Math.sqrt(
      direction.x * direction.x +
      direction.y * direction.y +
      direction.z * direction.z
    );
    const normalizedDir = {
      x: direction.x / length,
      y: direction.y / length,
      z: direction.z / length
    };

    // Perform raycast using Babylon.js
    const ray = new BABYLON.Ray(
      new BABYLON.Vector3(origin.x, origin.y, origin.z),
      new BABYLON.Vector3(normalizedDir.x, normalizedDir.y, normalizedDir.z),
      maxDistance
    );

    const hitInfo = this.scene.pickWithRay(ray, (mesh: any) => {
      // Filter: only pick meshes that have physics aggregates
      return mesh.metadata?.entityId !== undefined;
    });

    if (hitInfo?.hit && hitInfo.pickedMesh) {
      const entityId = hitInfo.pickedMesh.metadata?.entityId || null;
      
      return {
        hit: true,
        entityId,
        position: {
          x: hitInfo.pickedPoint?.x || 0,
          y: hitInfo.pickedPoint?.y || 0,
          z: hitInfo.pickedPoint?.z || 0
        },
        normal: {
          x: hitInfo.getNormal(true)?.x || 0,
          y: hitInfo.getNormal(true)?.y || 0,
          z: hitInfo.getNormal(true)?.z || 0
        },
        distance: hitInfo.distance || 0
      };
    }

    return {
      hit: false,
      entityId: null,
      position: null,
      normal: null,
      distance: 0
    };
  }

  /**
   * Set physics body position (for kinematic bodies).
   */
  setBodyPosition(entityId: EntityId, position: Vector3): void {
    const aggregate = this.entityToAggregateMap.get(entityId);
    const mesh = this.entityToMeshMap.get(entityId);

    if (!aggregate || !mesh) return;

    // For kinematic bodies, directly set the mesh position
    mesh.position.set(position.x, position.y, position.z);
    
    // If we have a physics body, disable physics temporarily
    if (aggregate.body) {
      aggregate.body.setMotionType((window as any).BABYLON.PhysicsBodyType.KINEMATIC);
    }
  }

  /**
   * Set physics body velocity.
   */
  setBodyVelocity(entityId: EntityId, velocity: Vector3): void {
    const aggregate = this.entityToAggregateMap.get(entityId);

    if (!aggregate?.body) return;

    aggregate.body.setLinearVelocity(new (window as any).BABYLON.Vector3(
      velocity.x,
      velocity.y,
      velocity.z
    ));
  }

  /**
   * Clean up physics body for an entity.
   * 
   * Requirement 8.7: Handle physics body cleanup on entity destruction
   */
  cleanupEntity(entityId: EntityId): void {
    const aggregate = this.entityToAggregateMap.get(entityId);
    const mesh = this.entityToMeshMap.get(entityId);

    if (aggregate) {
      // Dispose the physics aggregate
      aggregate.dispose();
      this.entityToAggregateMap.delete(entityId);
    }

    if (mesh) {
      // Collider proxies we created ourselves are ours to dispose.
      if (typeof mesh.name === 'string' && mesh.name.startsWith('physics_')) mesh.dispose();
      this.entityToMeshMap.delete(entityId);
    }

    // Clear body reference in component
    const physicsBody = this.world.getComponent<PhysicsBodyComponent>(
      entityId,
      'PhysicsBody'
    );
    if (physicsBody) {
      physicsBody.physicsBodyId = null;
    }
  }

  /**
   * Cleanup all physics resources.
   */
  dispose(): void {
    // Clean up all physics aggregates
    for (const entityId of this.entityToAggregateMap.keys()) {
      this.cleanupEntity(entityId);
    }

    this.initialized = false;
    console.log('PhysicsSystem disposed');
  }
}