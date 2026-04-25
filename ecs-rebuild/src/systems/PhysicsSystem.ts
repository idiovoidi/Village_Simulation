/**
 * PhysicsSystem
 * 
 * Manages Havok Physics integration for the ECS.
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
 * Havok Physics types (loaded from CDN)
 */
interface HavokPhysics {
  HP_BodyId: any;
  HP_ShapeId: any;
  HP_World_Create: (config: any) => any;
  HP_World_Step: (world: any, deltaTime: number) => void;
  HP_World_Release: (world: any) => void;
  HP_Body_Create: (world: any, config: any) => any;
  HP_Body_Release: (world: any, bodyId: any) => void;
  HP_Body_GetPosition: (world: any, bodyId: any) => Float32Array;
  HP_Body_SetPosition: (world: any, bodyId: any, position: Float32Array) => void;
  HP_Body_GetLinearVelocity: (world: any, bodyId: any) => Float32Array;
  HP_Body_SetLinearVelocity: (world: any, bodyId: any, velocity: Float32Array) => void;
  HP_Shape_CreateBox: (halfExtents: Float32Array) => any;
  HP_Shape_CreateSphere: (radius: number) => any;
  HP_Shape_CreateCapsule: (radius: number, height: number) => any;
  HP_Shape_Release: (shapeId: any) => void;
  HP_World_CastRay: (world: any, origin: Float32Array, direction: Float32Array, maxDistance: number) => any;
  HP_Body_SetCollisionFilterInfo: (world: any, bodyId: any, group: number, mask: number) => void;
}

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
 * PhysicsSystem manages Havok Physics simulation.
 * 
 * Responsibilities:
 * - Initialize Havok Physics engine
 * - Create physics bodies for entities with PhysicsBody components
 * - Synchronize physics body positions to Position components
 * - Handle physics body cleanup on entity destruction
 * - Process collision events
 */
export class PhysicsSystem extends System {
  readonly componentSignature = new Set(['PhysicsBody', 'Position']);
  readonly priority = 200; // Physics systems priority

  private havok: HavokPhysics | null = null;
  private physicsWorld: any = null;
  private entityToBodyMap: Map<EntityId, any> = new Map();
  private bodyToEntityMap: Map<any, EntityId> = new Map();
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
  async initializePhysics(havokInstance: HavokPhysics): Promise<void> {
    if (this.initialized) {
      console.warn('PhysicsSystem already initialized');
      return;
    }

    this.havok = havokInstance;

    // Create physics world with gravity
    this.physicsWorld = this.havok.HP_World_Create({
      gravity: new Float32Array([0, -9.81, 0])
    });

    this.initialized = true;
    console.log('PhysicsSystem initialized');
  }

  /**
   * Update physics simulation.
   * 
   * Requirements:
   * - 8.2: Create physics bodies for entities with physics components
   * - 8.3: Synchronize physics body positions to Position components
   */
  update(deltaTime: number): void {
    if (!this.initialized || !this.havok || !this.physicsWorld) {
      return;
    }

    // Create physics bodies for new entities
    this.createPhysicsBodies();

    // Step physics simulation
    this.havok.HP_World_Step(this.physicsWorld, deltaTime);

    // Synchronize physics positions back to ECS components
    this.synchronizePositions();

    // Process collisions
    this.processCollisions();
  }

  /**
   * Create physics bodies for entities that don't have them yet.
   * 
   * Requirement 8.2: Create physics bodies for entities with physics components
   */
  private createPhysicsBodies(): void {
    if (!this.havok || !this.physicsWorld) return;

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

      if (!physicsBody || !position) continue;

      // Skip if body already created
      if (physicsBody.physicsBodyId !== null) continue;

      // Create physics shape
      const shape = this.createPhysicsShape(physicsBody);
      if (!shape) continue;

      // Create physics body
      const bodyConfig = {
        shape,
        position: new Float32Array([position.x, position.y, position.z]),
        mass: physicsBody.bodyType === PhysicsBodyType.Static ? 0 : physicsBody.mass,
        friction: physicsBody.friction,
        restitution: physicsBody.restitution,
        linearDamping: physicsBody.linearDamping,
        angularDamping: physicsBody.angularDamping,
        motionType: this.getMotionType(physicsBody.bodyType)
      };

      const bodyId = this.havok.HP_Body_Create(this.physicsWorld, bodyConfig);

      // Store body reference
      physicsBody.physicsBodyId = bodyId;
      this.entityToBodyMap.set(entityId, bodyId);
      this.bodyToEntityMap.set(bodyId, entityId);

      // Set collision filter info
      if (this.havok.HP_Body_SetCollisionFilterInfo) {
        this.havok.HP_Body_SetCollisionFilterInfo(
          this.physicsWorld,
          bodyId,
          physicsBody.collisionGroup,
          physicsBody.collisionMask
        );
      }

      // Release shape (body now owns it)
      this.havok.HP_Shape_Release(shape);
    }
  }

  /**
   * Create a physics shape based on component configuration.
   */
  private createPhysicsShape(physicsBody: PhysicsBodyComponent): any {
    if (!this.havok) return null;

    const { shapeType, dimensions } = physicsBody;

    switch (shapeType) {
      case PhysicsShapeType.Box:
        return this.havok.HP_Shape_CreateBox(
          new Float32Array([
            dimensions.x / 2,
            dimensions.y / 2,
            dimensions.z / 2
          ])
        );

      case PhysicsShapeType.Sphere:
        return this.havok.HP_Shape_CreateSphere(new Float32Array([dimensions.x / 2, 0, 0]));

      case PhysicsShapeType.Capsule: {
        // For now, use a sphere as a fallback for capsules
        // TODO: Implement proper capsule shape when Havok API is clarified
        console.warn('Capsule shape not fully supported, using sphere fallback');
        return this.havok.HP_Shape_CreateSphere(new Float32Array([dimensions.x / 2, 0, 0]));
      }

      default:
        console.warn(`Unsupported shape type: ${shapeType}`);
        return null;
    }
  }

  /**
   * Get Havok motion type from physics body type.
   */
  private getMotionType(bodyType: PhysicsBodyType): number {
    switch (bodyType) {
      case PhysicsBodyType.Static:
        return 0; // STATIC
      case PhysicsBodyType.Dynamic:
        return 1; // DYNAMIC
      case PhysicsBodyType.Kinematic:
        return 2; // KINEMATIC
      default:
        return 1;
    }
  }

  /**
   * Synchronize physics body positions back to Position components.
   * 
   * Requirement 8.3: Synchronize physics body positions to Position components
   */
  private synchronizePositions(): void {
    if (!this.havok || !this.physicsWorld) return;

    for (const [entityId, bodyId] of this.entityToBodyMap) {
      const position = this.world.getComponent<PositionComponent>(
        entityId,
        'Position'
      );
      const physicsBody = this.world.getComponent<PhysicsBodyComponent>(
        entityId,
        'PhysicsBody'
      );

      if (!position || !physicsBody) continue;

      // Skip kinematic bodies (they are controlled by game logic)
      if (physicsBody.isKinematic) continue;

      // Get position from physics body
      const physicsPosition = this.havok.HP_Body_GetPosition(
        this.physicsWorld,
        bodyId
      );

      // Update ECS position component
      position.x = physicsPosition[0];
      position.y = physicsPosition[1];
      position.z = physicsPosition[2];

      // Sync velocity if component exists
      const velocity = this.world.getComponent<VelocityComponent>(
        entityId,
        'Velocity'
      );
      if (velocity) {
        const physicsVelocity = this.havok.HP_Body_GetLinearVelocity(
          this.physicsWorld,
          bodyId
        );
        velocity.vx = physicsVelocity[0];
        velocity.vy = physicsVelocity[1];
        velocity.vz = physicsVelocity[2];
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
    if (!this.havok || !this.physicsWorld) {
      return {
        hit: false,
        entityId: null,
        position: null,
        normal: null,
        distance: 0
      };
    }

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

    // Perform raycast
    if (this.havok.HP_World_CastRay) {
      const result = this.havok.HP_World_CastRay(
        this.physicsWorld,
        new Float32Array([origin.x, origin.y, origin.z]),
        new Float32Array([normalizedDir.x, normalizedDir.y, normalizedDir.z]),
        maxDistance
      );

      if (result && result.hit) {
        const bodyId = result.bodyId;
        const entityId = this.bodyToEntityMap.get(bodyId) || null;

        return {
          hit: true,
          entityId,
          position: {
            x: result.position[0],
            y: result.position[1],
            z: result.position[2]
          },
          normal: {
            x: result.normal[0],
            y: result.normal[1],
            z: result.normal[2]
          },
          distance: result.distance
        };
      }
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
    if (!this.havok || !this.physicsWorld) return;

    const bodyId = this.entityToBodyMap.get(entityId);
    if (!bodyId) return;

    this.havok.HP_Body_SetPosition(
      this.physicsWorld,
      bodyId,
      new Float32Array([position.x, position.y, position.z])
    );
  }

  /**
   * Set physics body velocity.
   */
  setBodyVelocity(entityId: EntityId, velocity: Vector3): void {
    if (!this.havok || !this.physicsWorld) return;

    const bodyId = this.entityToBodyMap.get(entityId);
    if (!bodyId) return;

    this.havok.HP_Body_SetLinearVelocity(
      this.physicsWorld,
      bodyId,
      new Float32Array([velocity.x, velocity.y, velocity.z])
    );
  }

  /**
   * Clean up physics body for an entity.
   * 
   * Requirement 8.7: Handle physics body cleanup on entity destruction
   */
  cleanupEntity(entityId: EntityId): void {
    if (!this.havok || !this.physicsWorld) return;

    const bodyId = this.entityToBodyMap.get(entityId);
    if (!bodyId) return;

    // Release physics body
    this.havok.HP_Body_Release(this.physicsWorld, bodyId);

    // Remove from maps
    this.entityToBodyMap.delete(entityId);
    this.bodyToEntityMap.delete(bodyId);

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
    if (!this.havok || !this.physicsWorld) return;

    // Clean up all physics bodies
    for (const entityId of this.entityToBodyMap.keys()) {
      this.cleanupEntity(entityId);
    }

    // Release physics world
    this.havok.HP_World_Release(this.physicsWorld);
    this.physicsWorld = null;
    this.initialized = false;

    console.log('PhysicsSystem disposed');
  }
}
