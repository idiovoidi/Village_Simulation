/**
 * SteeringSystem Tests
 * 
 * Unit tests for the SteeringSystem.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { World } from '../../core/World.ts';
import { SteeringSystem } from './SteeringSystem.ts';
import { createPositionComponent, createVelocityComponent } from '../../components/CoreComponents.ts';
import { createSteeringComponent } from '../../components/AIComponents.ts';
import { distance, vectorLength } from '../../utils/Vector3Helpers.ts';

describe('SteeringSystem', () => {
  it('should calculate seek behavior toward target', () => {
    const world = new World();
    const system = new SteeringSystem(world);
    world.registerSystem(system);

    // Create entity at origin
    const entity = world.createEntity();
    world.addComponent(entity, createPositionComponent(0, 0, 0));
    world.addComponent(entity, createVelocityComponent(0, 0, 0, 5));
    const steering = createSteeringComponent(10, 2);
    steering.target = { x: 10, y: 0, z: 0 }; // Target to the right
    world.addComponent(entity, steering);

    // Update system
    system.update(0.1);

    // Check that velocity is now pointing toward target
    const velocity = world.getComponent(entity, 'Velocity');
    assert.ok(velocity);
    assert.ok(velocity.vx > 0, 'Velocity should be positive in x direction');
  });

  it('should calculate arrive behavior near target', () => {
    const world = new World();
    const system = new SteeringSystem(world);
    world.registerSystem(system);

    // Create entity near target
    const entity = world.createEntity();
    world.addComponent(entity, createPositionComponent(8, 0, 0));
    world.addComponent(entity, createVelocityComponent(1, 0, 0, 5));
    const steering = createSteeringComponent(10, 3);
    steering.target = { x: 10, y: 0, z: 0 }; // Target 2 units away
    world.addComponent(entity, steering);

    // Update system
    system.update(0.1);

    // Check that steering force is applied
    const steeringComp = world.getComponent(entity, 'Steering');
    assert.ok(steeringComp);
    assert.ok(vectorLength(steeringComp.steeringForce) > 0, 'Steering force should be non-zero');
  });

  it('should calculate wander behavior when no target', () => {
    const world = new World();
    const system = new SteeringSystem(world);
    world.registerSystem(system);

    // Create entity with no target
    const entity = world.createEntity();
    world.addComponent(entity, createPositionComponent(0, 0, 0));
    world.addComponent(entity, createVelocityComponent(1, 0, 0, 5));
    const steering = createSteeringComponent(10, 2);
    steering.target = null; // No target
    world.addComponent(entity, steering);

    // Update system multiple times
    for (let i = 0; i < 5; i++) {
      system.update(0.1);
    }

    // Check that velocity has changed (wandering)
    const velocity = world.getComponent(entity, 'Velocity');
    assert.ok(velocity);
    const speed = Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2 + velocity.vz ** 2);
    assert.ok(speed > 0, 'Entity should be moving');
  });

  it('should clamp velocity to max speed', () => {
    const world = new World();
    const system = new SteeringSystem(world);
    world.registerSystem(system);

    // Create entity with high steering force
    const entity = world.createEntity();
    world.addComponent(entity, createPositionComponent(0, 0, 0));
    world.addComponent(entity, createVelocityComponent(0, 0, 0, 5));
    const steering = createSteeringComponent(100, 2); // Very high max force
    steering.target = { x: 100, y: 0, z: 0 };
    world.addComponent(entity, steering);

    // Update system multiple times
    for (let i = 0; i < 10; i++) {
      system.update(0.1);
    }

    // Check that velocity doesn't exceed max speed
    const velocity = world.getComponent(entity, 'Velocity');
    assert.ok(velocity);
    const speed = Math.sqrt(velocity.vx ** 2 + velocity.vy ** 2 + velocity.vz ** 2);
    assert.ok(speed <= velocity.maxSpeed + 0.01, `Speed ${speed} should not exceed max speed ${velocity.maxSpeed}`);
  });

  it('should calculate obstacle avoidance', () => {
    const world = new World();
    const system = new SteeringSystem(world);
    world.registerSystem(system);

    // Create entity
    const entity = world.createEntity();
    world.addComponent(entity, createPositionComponent(0, 0, 0));
    world.addComponent(entity, createVelocityComponent(1, 0, 0, 5));
    world.addComponent(entity, createSteeringComponent(10, 2));

    // Create obstacle
    const obstacle = world.createEntity();
    world.addComponent(obstacle, createPositionComponent(5, 0, 0));

    // Calculate avoidance force
    const avoidanceForce = system.calculateObstacleAvoidance(entity, [obstacle], 10);

    // Force should point away from obstacle (negative x direction)
    assert.ok(avoidanceForce.x < 0, 'Avoidance force should point away from obstacle');
  });

  it('should handle multiple entities', () => {
    const world = new World();
    const system = new SteeringSystem(world);
    world.registerSystem(system);

    // Create multiple entities
    const entities = [];
    for (let i = 0; i < 5; i++) {
      const entity = world.createEntity();
      world.addComponent(entity, createPositionComponent(i * 2, 0, 0));
      world.addComponent(entity, createVelocityComponent(0, 0, 0, 5));
      const steering = createSteeringComponent(10, 2);
      steering.target = { x: 20, y: 0, z: 0 };
      world.addComponent(entity, steering);
      entities.push(entity);
    }

    // Update system
    system.update(0.1);

    // Check that all entities have updated velocities
    for (const entity of entities) {
      const velocity = world.getComponent(entity, 'Velocity');
      assert.ok(velocity);
      assert.ok(velocity.vx > 0, 'All entities should be moving toward target');
    }
  });
});
