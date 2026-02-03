/**
 * PhysicsSystem Tests
 * 
 * Property-based tests for physics integration.
 * Validates physics body creation, synchronization, and cleanup.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import fc from 'fast-check';
import { World } from '../core/World.ts';
import { PhysicsSystem } from './PhysicsSystem.ts';
import {
  createPositionComponent,
  createVelocityComponent,
  type Vector3
} from '../components/CoreComponents.ts';
import {
  createPhysicsBodyComponent,
  PhysicsBodyType,
  PhysicsShapeType
} from '../components/PhysicsComponents.ts';

/**
 * Mock Havok Physics implementation for testing.
 */
class MockHavokPhysics {
  private bodies: Map<number, any> = new Map();
  private nextBodyId = 1;
  private worldGravity = new Float32Array([0, -9.81, 0]);

  HP_World_Create(config: any): any {
    if (config.gravity) {
      this.worldGravity = config.gravity;
    }
    return { id: 'mock-world' };
  }

  HP_World_Step(world: any, deltaTime: number): void {
    // Simulate physics step
    for (const [bodyId, body] of this.bodies) {
      if (body.mass > 0) {
        // Apply gravity
        body.velocity[1] += this.worldGravity[1] * deltaTime;
        
        // Update position
        body.position[0] += body.velocity[0] * deltaTime;
        body.position[1] += body.velocity[1] * deltaTime;
        body.position[2] += body.velocity[2] * deltaTime;
      }
    }
  }

  HP_World_Release(world: any): void {
    this.bodies.clear();
  }

  HP_Body_Create(world: any, config: any): number {
    const bodyId = this.nextBodyId++;
    this.bodies.set(bodyId, {
      position: new Float32Array(config.position),
      velocity: new Float32Array([0, 0, 0]),
      mass: config.mass || 0,
      shape: config.shape,
      friction: config.friction || 0.5,
      restitution: config.restitution || 0.3
    });
    return bodyId;
  }

  HP_Body_Release(world: any, bodyId: number): void {
    this.bodies.delete(bodyId);
  }

  HP_Body_GetPosition(world: any, bodyId: number): Float32Array {
    const body = this.bodies.get(bodyId);
    return body ? body.position : new Float32Array([0, 0, 0]);
  }

  HP_Body_SetPosition(world: any, bodyId: number, position: Float32Array): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      body.position = new Float32Array(position);
    }
  }

  HP_Body_GetLinearVelocity(world: any, bodyId: number): Float32Array {
    const body = this.bodies.get(bodyId);
    return body ? body.velocity : new Float32Array([0, 0, 0]);
  }

  HP_Body_SetLinearVelocity(world: any, bodyId: number, velocity: Float32Array): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      body.velocity = new Float32Array(velocity);
    }
  }

  HP_Shape_CreateBox(halfExtents: Float32Array): any {
    return { type: 'box', halfExtents };
  }

  HP_Shape_CreateSphere(radius: number): any {
    return { type: 'sphere', radius };
  }

  HP_Shape_CreateCapsule(radius: number, height: number): any {
    return { type: 'capsule', radius, height };
  }

  HP_Shape_Release(shapeId: any): void {
    // Mock release
  }

  HP_World_CastRay(world: any, origin: Float32Array, direction: Float32Array, maxDistance: number): any {
    // Simple raycast implementation for testing
    let closestHit: any = null;
    let closestDistance = maxDistance;

    for (const [bodyId, body] of this.bodies) {
      // Simple sphere intersection test
      const toBody = {
        x: body.position[0] - origin[0],
        y: body.position[1] - origin[1],
        z: body.position[2] - origin[2]
      };

      // Project toBody onto ray direction
      const projection = 
        toBody.x * direction[0] +
        toBody.y * direction[1] +
        toBody.z * direction[2];

      if (projection < 0) continue; // Behind ray origin

      // Find closest point on ray to body center
      const closestPoint = {
        x: origin[0] + direction[0] * projection,
        y: origin[1] + direction[1] * projection,
        z: origin[2] + direction[2] * projection
      };

      // Distance from body center to closest point
      const dx = body.position[0] - closestPoint.x;
      const dy = body.position[1] - closestPoint.y;
      const dz = body.position[2] - closestPoint.z;
      const distToRay = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Approximate radius (use largest dimension)
      const radius = body.shape?.radius || 1;

      if (distToRay <= radius && projection < closestDistance) {
        // Hit!
        const hitDistance = Math.max(0, projection - radius);
        closestDistance = hitDistance;
        closestHit = {
          hit: true,
          bodyId,
          position: new Float32Array([
            origin[0] + direction[0] * hitDistance,
            origin[1] + direction[1] * hitDistance,
            origin[2] + direction[2] * hitDistance
          ]),
          normal: new Float32Array([
            -direction[0],
            -direction[1],
            -direction[2]
          ]),
          distance: hitDistance
        };
      }
    }

    return closestHit;
  }

  HP_Body_SetCollisionFilterInfo(world: any, bodyId: number, group: number, mask: number): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      body.collisionGroup = group;
      body.collisionMask = mask;
    }
  }

  hasBody(bodyId: number): boolean {
    return this.bodies.has(bodyId);
  }

  getBodyCount(): number {
    return this.bodies.size;
  }
}

describe('PhysicsSystem', () => {
  describe('Property 4: Physics Body Creation', () => {
    /**
     * Feature: typescript-ecs-rebuild
     * Property 4: Physics Body Creation
     * 
     * For any entity with a PhysicsBody component and Position component,
     * a corresponding physics body must be created in the Havok physics engine.
     * 
     * Validates: Requirements 8.2
     */
    it('should create physics bodies for all entities with PhysicsBody and Position components', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate array of entities with random positions and physics configurations
          fc.array(
            fc.record({
              position: fc.record({
                x: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
                y: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
                z: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true })
              }),
              bodyType: fc.constantFrom(
                PhysicsBodyType.Static,
                PhysicsBodyType.Dynamic,
                PhysicsBodyType.Kinematic
              ),
              shapeType: fc.constantFrom(
                PhysicsShapeType.Box,
                PhysicsShapeType.Sphere,
                PhysicsShapeType.Capsule
              ),
              mass: fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
              dimensions: fc.record({
                x: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
                y: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
                z: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true })
              })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (entities) => {
            // Setup
            const world = new World();
            const physicsSystem = new PhysicsSystem(world);
            const mockHavok = new MockHavokPhysics();
            
            await physicsSystem.initializePhysics(mockHavok as any);
            world.registerSystem(physicsSystem);

            // Create entities with physics components
            const entityIds = entities.map(config => {
              const entityId = world.createEntity();
              
              world.addComponent(
                entityId,
                createPositionComponent(
                  config.position.x,
                  config.position.y,
                  config.position.z
                )
              );
              
              world.addComponent(
                entityId,
                createPhysicsBodyComponent(
                  config.bodyType,
                  config.shapeType,
                  config.mass,
                  config.dimensions
                )
              );
              
              return entityId;
            });

            // Update physics system to create bodies
            physicsSystem.update(0.016);

            // Verify: All entities should have physics bodies created
            for (const entityId of entityIds) {
              const physicsBody = world.getComponent(entityId, 'PhysicsBody');
              
              assert.ok(
                physicsBody,
                `Entity ${entityId} should have PhysicsBody component`
              );
              
              assert.ok(
                physicsBody.physicsBodyId !== null,
                `Entity ${entityId} should have physics body created`
              );
              
              assert.ok(
                mockHavok.hasBody(physicsBody.physicsBodyId),
                `Physics body ${physicsBody.physicsBodyId} should exist in Havok`
              );
            }

            // Verify: Number of physics bodies matches number of entities
            assert.equal(
              mockHavok.getBodyCount(),
              entities.length,
              'Number of physics bodies should match number of entities'
            );

            // Cleanup
            physicsSystem.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not create duplicate physics bodies for the same entity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            position: fc.record({
              x: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
              y: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
              z: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true })
            }),
            updateCount: fc.integer({ min: 2, max: 10 })
          }),
          async (config) => {
            // Setup
            const world = new World();
            const physicsSystem = new PhysicsSystem(world);
            const mockHavok = new MockHavokPhysics();
            
            await physicsSystem.initializePhysics(mockHavok as any);
            world.registerSystem(physicsSystem);

            // Create entity
            const entityId = world.createEntity();
            world.addComponent(
              entityId,
              createPositionComponent(
                config.position.x,
                config.position.y,
                config.position.z
              )
            );
            world.addComponent(
              entityId,
              createPhysicsBodyComponent()
            );

            // Update multiple times
            for (let i = 0; i < config.updateCount; i++) {
              physicsSystem.update(0.016);
            }

            // Verify: Only one physics body should be created
            const physicsBody = world.getComponent(entityId, 'PhysicsBody');
            assert.ok(physicsBody);
            assert.ok(physicsBody.physicsBodyId !== null);
            
            assert.equal(
              mockHavok.getBodyCount(),
              1,
              'Should only create one physics body despite multiple updates'
            );

            // Cleanup
            physicsSystem.dispose();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should skip entities without Position component', async () => {
      const world = new World();
      const physicsSystem = new PhysicsSystem(world);
      const mockHavok = new MockHavokPhysics();
      
      await physicsSystem.initializePhysics(mockHavok as any);
      world.registerSystem(physicsSystem);

      // Create entity with only PhysicsBody (no Position)
      const entityId = world.createEntity();
      world.addComponent(entityId, createPhysicsBodyComponent());

      // Update physics system
      physicsSystem.update(0.016);

      // Verify: No physics body should be created
      assert.equal(
        mockHavok.getBodyCount(),
        0,
        'Should not create physics body without Position component'
      );

      // Cleanup
      physicsSystem.dispose();
    });
  });

  describe('Property 5: Physics Position Synchronization', () => {
    /**
     * Feature: typescript-ecs-rebuild
     * Property 5: Physics Position Synchronization
     * 
     * For any entity with both a physics body and a position component,
     * after physics simulation updates, the position component must match
     * the physics body's position.
     * 
     * Validates: Requirements 8.3
     */
    it('should synchronize physics body positions to Position components', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate entities with initial positions and velocities
          fc.array(
            fc.record({
              position: fc.record({
                x: fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true }),
                y: fc.float({ min: Math.fround(10), max: Math.fround(100), noNaN: true }),
                z: fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true })
              }),
              velocity: fc.record({
                vx: fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
                vy: fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
                vz: fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true })
              }),
              mass: fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true }), // deltaTime
          async (entities, deltaTime) => {
            // Setup
            const world = new World();
            const physicsSystem = new PhysicsSystem(world);
            const mockHavok = new MockHavokPhysics();
            
            await physicsSystem.initializePhysics(mockHavok as any);
            world.registerSystem(physicsSystem);

            // Create entities with physics components
            const entityIds = entities.map(config => {
              const entityId = world.createEntity();
              
              world.addComponent(
                entityId,
                createPositionComponent(
                  config.position.x,
                  config.position.y,
                  config.position.z
                )
              );
              
              world.addComponent(
                entityId,
                createVelocityComponent(
                  config.velocity.vx,
                  config.velocity.vy,
                  config.velocity.vz
                )
              );
              
              world.addComponent(
                entityId,
                createPhysicsBodyComponent(
                  PhysicsBodyType.Dynamic,
                  PhysicsShapeType.Sphere,
                  config.mass
                )
              );
              
              return entityId;
            });

            // First update to create physics bodies
            physicsSystem.update(0.016);

            // Store initial positions
            const initialPositions = entityIds.map(id => {
              const pos = world.getComponent(id, 'Position');
              return { x: pos!.x, y: pos!.y, z: pos!.z };
            });

            // Update physics simulation
            physicsSystem.update(deltaTime);

            // Verify: Position components should be updated from physics
            for (let i = 0; i < entityIds.length; i++) {
              const entityId = entityIds[i];
              const position = world.getComponent(entityId, 'Position');
              const physicsBody = world.getComponent(entityId, 'PhysicsBody');
              
              assert.ok(position, 'Position component should exist');
              assert.ok(physicsBody, 'PhysicsBody component should exist');
              assert.ok(physicsBody.physicsBodyId !== null, 'Physics body should be created');

              // Get physics body position from mock
              const physicsPosition = mockHavok.HP_Body_GetPosition(
                null,
                physicsBody.physicsBodyId
              );

              // Position component should match physics body position
              assert.ok(
                Math.abs(position.x - physicsPosition[0]) < 0.001,
                `Position X should match physics body (${position.x} vs ${physicsPosition[0]})`
              );
              assert.ok(
                Math.abs(position.y - physicsPosition[1]) < 0.001,
                `Position Y should match physics body (${position.y} vs ${physicsPosition[1]})`
              );
              assert.ok(
                Math.abs(position.z - physicsPosition[2]) < 0.001,
                `Position Z should match physics body (${position.z} vs ${physicsPosition[2]})`
              );

              // Position should have changed due to physics simulation (gravity)
              // (unless the entity started at rest on the ground)
              if (initialPositions[i].y > 0.1) {
                assert.ok(
                  position.y !== initialPositions[i].y,
                  'Position should change after physics simulation'
                );
              }
            }

            // Cleanup
            physicsSystem.dispose();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not update kinematic body positions from physics', async () => {
      const world = new World();
      const physicsSystem = new PhysicsSystem(world);
      const mockHavok = new MockHavokPhysics();
      
      await physicsSystem.initializePhysics(mockHavok as any);
      world.registerSystem(physicsSystem);

      // Create kinematic entity
      const entityId = world.createEntity();
      const initialPos = { x: 10, y: 20, z: 30 };
      
      world.addComponent(
        entityId,
        createPositionComponent(initialPos.x, initialPos.y, initialPos.z)
      );
      
      const physicsBody = createPhysicsBodyComponent(
        PhysicsBodyType.Kinematic,
        PhysicsShapeType.Box,
        1
      );
      world.addComponent(entityId, physicsBody);

      // Create physics body
      physicsSystem.update(0.016);

      // Manually set physics body position to something different
      const physicsBodyId = physicsBody.physicsBodyId!;
      mockHavok.HP_Body_SetPosition(
        null,
        physicsBodyId,
        new Float32Array([100, 200, 300])
      );

      // Update physics
      physicsSystem.update(0.016);

      // Verify: Kinematic body position should NOT be updated from physics
      const position = world.getComponent(entityId, 'Position');
      assert.ok(position);
      assert.equal(position.x, initialPos.x, 'Kinematic X should not change');
      assert.equal(position.y, initialPos.y, 'Kinematic Y should not change');
      assert.equal(position.z, initialPos.z, 'Kinematic Z should not change');

      // Cleanup
      physicsSystem.dispose();
    });
  });

  describe('Property 7: Physics Body Cleanup', () => {
    /**
     * Feature: typescript-ecs-rebuild
     * Property 7: Physics Body Cleanup
     * 
     * For any entity with a physics body, when the entity is destroyed,
     * the associated physics body must be removed from the physics engine.
     * 
     * Validates: Requirements 8.7
     */
    it('should clean up physics bodies when entities are destroyed', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate entities to create and then destroy
          fc.array(
            fc.record({
              position: fc.record({
                x: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
                y: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
                z: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true })
              }),
              shouldDestroy: fc.boolean()
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (entities) => {
            // Setup
            const world = new World();
            const physicsSystem = new PhysicsSystem(world);
            const mockHavok = new MockHavokPhysics();
            
            await physicsSystem.initializePhysics(mockHavok as any);
            world.registerSystem(physicsSystem);

            // Create entities with physics components
            const entityData = entities.map(config => {
              const entityId = world.createEntity();
              
              world.addComponent(
                entityId,
                createPositionComponent(
                  config.position.x,
                  config.position.y,
                  config.position.z
                )
              );
              
              world.addComponent(
                entityId,
                createPhysicsBodyComponent()
              );
              
              return {
                entityId,
                shouldDestroy: config.shouldDestroy
              };
            });

            // Create physics bodies
            physicsSystem.update(0.016);

            // Store physics body IDs before destruction
            const physicsBodyIds = entityData.map(data => {
              const physicsBody = world.getComponent(data.entityId, 'PhysicsBody');
              return physicsBody?.physicsBodyId;
            });

            // Verify all bodies were created
            const initialBodyCount = mockHavok.getBodyCount();
            assert.equal(
              initialBodyCount,
              entities.length,
              'All physics bodies should be created'
            );

            // Destroy entities marked for destruction
            const destroyedCount = entityData.filter(data => data.shouldDestroy).length;
            for (const data of entityData) {
              if (data.shouldDestroy) {
                world.destroyEntity(data.entityId);
              }
            }

            // Verify: Physics bodies for destroyed entities should be removed
            const remainingBodyCount = mockHavok.getBodyCount();
            assert.equal(
              remainingBodyCount,
              entities.length - destroyedCount,
              'Physics bodies should be removed for destroyed entities'
            );

            // Verify: Destroyed entity physics bodies no longer exist
            for (let i = 0; i < entityData.length; i++) {
              const data = entityData[i];
              const bodyId = physicsBodyIds[i];
              
              if (data.shouldDestroy && bodyId !== null) {
                assert.ok(
                  !mockHavok.hasBody(bodyId),
                  `Physics body ${bodyId} should be removed after entity destruction`
                );
              } else if (!data.shouldDestroy && bodyId !== null) {
                assert.ok(
                  mockHavok.hasBody(bodyId),
                  `Physics body ${bodyId} should still exist for non-destroyed entity`
                );
              }
            }

            // Cleanup
            physicsSystem.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle destroying entities without physics bodies', async () => {
      const world = new World();
      const physicsSystem = new PhysicsSystem(world);
      const mockHavok = new MockHavokPhysics();
      
      await physicsSystem.initializePhysics(mockHavok as any);
      world.registerSystem(physicsSystem);

      // Create entity without physics body
      const entityId = world.createEntity();
      world.addComponent(entityId, createPositionComponent(0, 0, 0));

      // Destroy entity (should not throw)
      const destroyed = world.destroyEntity(entityId);
      
      assert.ok(destroyed, 'Entity should be destroyed');
      assert.equal(mockHavok.getBodyCount(), 0, 'No physics bodies should exist');

      // Cleanup
      physicsSystem.dispose();
    });

    it('should clean up all physics bodies on dispose', async () => {
      const world = new World();
      const physicsSystem = new PhysicsSystem(world);
      const mockHavok = new MockHavokPhysics();
      
      await physicsSystem.initializePhysics(mockHavok as any);
      world.registerSystem(physicsSystem);

      // Create multiple entities with physics
      for (let i = 0; i < 10; i++) {
        const entityId = world.createEntity();
        world.addComponent(entityId, createPositionComponent(i, i, i));
        world.addComponent(entityId, createPhysicsBodyComponent());
      }

      // Create physics bodies
      physicsSystem.update(0.016);

      assert.equal(mockHavok.getBodyCount(), 10, 'Should have 10 physics bodies');

      // Dispose physics system
      physicsSystem.dispose();

      // Verify: All physics bodies should be cleaned up
      assert.equal(
        mockHavok.getBodyCount(),
        0,
        'All physics bodies should be removed on dispose'
      );
    });
  });

  describe('Property 6: Raycast Accuracy', () => {
    /**
     * Feature: typescript-ecs-rebuild
     * Property 6: Raycast Accuracy
     * 
     * For any raycast query with origin and direction, the returned hit information
     * must correctly identify the first intersecting physics body along the ray path.
     * 
     * Validates: Requirements 8.6
     */
    it('should accurately detect raycast hits', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate entities at various positions
          fc.array(
            fc.record({
              position: fc.record({
                x: fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true }),
                y: fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }),
                z: fc.float({ min: Math.fround(-50), max: Math.fround(50), noNaN: true })
              }),
              radius: fc.float({ min: Math.fround(0.5), max: Math.fround(5), noNaN: true })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          // Generate ray origin and direction
          fc.record({
            origin: fc.record({
              x: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
              y: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
              z: fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true })
            }),
            direction: fc.record({
              x: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
              y: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true }),
              z: fc.float({ min: Math.fround(-1), max: Math.fround(1), noNaN: true })
            })
          }),
          async (entities, ray) => {
            // Skip if direction is zero vector
            const dirLength = Math.sqrt(
              ray.direction.x * ray.direction.x +
              ray.direction.y * ray.direction.y +
              ray.direction.z * ray.direction.z
            );
            if (dirLength < 0.01) return;

            // Setup
            const world = new World();
            const physicsSystem = new PhysicsSystem(world);
            const mockHavok = new MockHavokPhysics();
            
            await physicsSystem.initializePhysics(mockHavok as any);
            world.registerSystem(physicsSystem);

            // Create entities with physics bodies
            const entityIds = entities.map(config => {
              const entityId = world.createEntity();
              
              world.addComponent(
                entityId,
                createPositionComponent(
                  config.position.x,
                  config.position.y,
                  config.position.z
                )
              );
              
              world.addComponent(
                entityId,
                createPhysicsBodyComponent(
                  PhysicsBodyType.Static,
                  PhysicsShapeType.Sphere,
                  1,
                  { x: config.radius * 2, y: config.radius * 2, z: config.radius * 2 }
                )
              );
              
              return entityId;
            });

            // Create physics bodies
            physicsSystem.update(0.016);

            // Perform raycast
            const result = physicsSystem.raycast(ray.origin, ray.direction, 1000);

            // Verify: If hit, the entity should exist
            if (result.hit) {
              assert.ok(result.entityId !== null, 'Hit should have entity ID');
              assert.ok(
                entityIds.includes(result.entityId!),
                'Hit entity should be one of the created entities'
              );
              assert.ok(result.position !== null, 'Hit should have position');
              assert.ok(result.distance >= 0, 'Hit distance should be non-negative');
            }

            // Verify: Raycast result is consistent
            if (!result.hit) {
              assert.equal(result.entityId, null, 'No hit should have null entity ID');
              assert.equal(result.position, null, 'No hit should have null position');
            }

            // Cleanup
            physicsSystem.dispose();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return closest hit when multiple bodies intersect ray', async () => {
      const world = new World();
      const physicsSystem = new PhysicsSystem(world);
      const mockHavok = new MockHavokPhysics();
      
      await physicsSystem.initializePhysics(mockHavok as any);
      world.registerSystem(physicsSystem);

      // Create three entities in a line
      const entity1 = world.createEntity();
      world.addComponent(entity1, createPositionComponent(0, 0, 10));
      world.addComponent(entity1, createPhysicsBodyComponent(
        PhysicsBodyType.Static,
        PhysicsShapeType.Sphere,
        1,
        { x: 2, y: 2, z: 2 }
      ));

      const entity2 = world.createEntity();
      world.addComponent(entity2, createPositionComponent(0, 0, 20));
      world.addComponent(entity2, createPhysicsBodyComponent(
        PhysicsBodyType.Static,
        PhysicsShapeType.Sphere,
        1,
        { x: 2, y: 2, z: 2 }
      ));

      const entity3 = world.createEntity();
      world.addComponent(entity3, createPositionComponent(0, 0, 30));
      world.addComponent(entity3, createPhysicsBodyComponent(
        PhysicsBodyType.Static,
        PhysicsShapeType.Sphere,
        1,
        { x: 2, y: 2, z: 2 }
      ));

      // Create physics bodies
      physicsSystem.update(0.016);

      // Raycast from origin towards entities
      const result = physicsSystem.raycast(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        1000
      );

      // Verify: Should hit the closest entity (entity1)
      assert.ok(result.hit, 'Should hit an entity');
      assert.equal(result.entityId, entity1, 'Should hit the closest entity');
      assert.ok(result.distance < 15, 'Distance should be less than 15');

      // Cleanup
      physicsSystem.dispose();
    });

    it('should return no hit when ray misses all bodies', async () => {
      const world = new World();
      const physicsSystem = new PhysicsSystem(world);
      const mockHavok = new MockHavokPhysics();
      
      await physicsSystem.initializePhysics(mockHavok as any);
      world.registerSystem(physicsSystem);

      // Create entity at (10, 0, 0)
      const entity = world.createEntity();
      world.addComponent(entity, createPositionComponent(10, 0, 0));
      world.addComponent(entity, createPhysicsBodyComponent());

      // Create physics body
      physicsSystem.update(0.016);

      // Raycast in opposite direction
      const result = physicsSystem.raycast(
        { x: 0, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        1000
      );

      // Verify: Should not hit anything
      assert.ok(!result.hit, 'Should not hit any entity');
      assert.equal(result.entityId, null, 'Entity ID should be null');

      // Cleanup
      physicsSystem.dispose();
    });
  });
});
