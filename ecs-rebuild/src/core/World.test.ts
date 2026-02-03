/**
 * Property-Based Tests for ECS Core
 * 
 * Tests universal correctness properties using fast-check.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fc from 'fast-check';
import { World } from './World.ts';
import { createSignature } from './Component.ts';
import type { Component } from './Component.ts';
import type { EntityId } from './Entity.ts';
import { System } from './System.ts';

/**
 * Helper function to create a test component.
 */
function createTestComponent(type: string, data: Record<string, unknown> = {}): Component {
  return {
    type,
    ...data,
  };
}

describe('ECS Core Properties', () => {
  /**
   * Property 1: Entity Query Correctness
   * 
   * For any component signature query, all returned entities must possess exactly
   * the components specified in the signature, and no entities with those components
   * should be excluded.
   * 
   * Validates: Requirements 1.6
   */
  it('Property 1: Entity Query Correctness', () => {
    fc.assert(
      fc.property(
        // Generate array of entities with random component sets
        fc.array(
          fc.record({
            components: fc.array(
              fc.constantFrom('Position', 'Velocity', 'Health', 'AI', 'Transform'),
              { minLength: 0, maxLength: 5 }
            ),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        // Generate query signature
        fc.array(
          fc.constantFrom('Position', 'Velocity', 'Health', 'AI', 'Transform'),
          { minLength: 1, maxLength: 3 }
        ),
        (entities, queryComponents) => {
          const world = new World();
          const entityIds: EntityId[] = [];

          // Create entities with their components
          for (const entitySpec of entities) {
            const id = world.createEntity();
            entityIds.push(id);

            for (const componentType of entitySpec.components) {
              world.addComponent(id, createTestComponent(componentType));
            }
          }

          // Query for entities
          const querySignature = createSignature(...queryComponents);
          const results = world.query(querySignature);

          // Verify: All returned entities must have all queried components
          for (const entityId of results) {
            for (const componentType of queryComponents) {
              const component = world.getComponent(entityId, componentType);
              assert.ok(
                component !== undefined,
                `Entity ${entityId} in results missing component ${componentType}`
              );
            }
          }

          // Verify: All entities with queried components must be returned
          for (const entityId of entityIds) {
            const hasAll = queryComponents.every((componentType) =>
              world.hasComponent(entityId, componentType)
            );

            if (hasAll) {
              assert.ok(
                results.includes(entityId),
                `Entity ${entityId} has all components but not in results`
              );
            }
          }

          // Verify: No entity without all components should be returned
          for (const entityId of results) {
            const hasAll = queryComponents.every((componentType) =>
              world.hasComponent(entityId, componentType)
            );

            assert.ok(
              hasAll,
              `Entity ${entityId} in results but doesn't have all components`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Entity Destruction Cleanup
   * 
   * For any entity with any set of components, when the entity is destroyed,
   * all associated components must be removed from component storage and the
   * entity must no longer appear in any queries.
   * 
   * Validates: Requirements 1.7
   */
  it('Property 2: Entity Destruction Cleanup', () => {
    fc.assert(
      fc.property(
        // Generate array of entities with random component sets
        fc.array(
          fc.record({
            components: fc.array(
              fc.constantFrom('Position', 'Velocity', 'Health', 'AI', 'Transform'),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        // Generate index of entity to destroy
        fc.nat(),
        (entities, destroyIndexRaw) => {
          const world = new World();
          const entityIds: EntityId[] = [];

          // Create entities with their components
          for (const entitySpec of entities) {
            const id = world.createEntity();
            entityIds.push(id);

            for (const componentType of entitySpec.components) {
              world.addComponent(id, createTestComponent(componentType));
            }
          }

          // Select entity to destroy (wrap index to valid range)
          const destroyIndex = destroyIndexRaw % entities.length;
          const destroyId = entityIds[destroyIndex];
          const destroyedComponents = [...entities[destroyIndex].components];

          // Destroy the entity
          const destroyed = world.destroyEntity(destroyId);
          assert.ok(destroyed, 'Entity should be destroyed successfully');

          // Verify: Entity should not exist
          const entity = world.getEntity(destroyId);
          assert.strictEqual(entity, undefined, 'Destroyed entity should not exist');

          // Verify: All components should be removed
          for (const componentType of destroyedComponents) {
            const component = world.getComponent(destroyId, componentType);
            assert.strictEqual(
              component,
              undefined,
              `Component ${componentType} should be removed from destroyed entity`
            );
          }

          // Verify: Entity should not appear in any queries
          const allComponentTypes = ['Position', 'Velocity', 'Health', 'AI', 'Transform'];
          for (const componentType of allComponentTypes) {
            const signature = createSignature(componentType);
            const results = world.query(signature);
            assert.ok(
              !results.includes(destroyId),
              `Destroyed entity should not appear in query for ${componentType}`
            );
          }

          // Verify: Other entities should still exist and have their components
          for (let i = 0; i < entities.length; i++) {
            if (i === destroyIndex) continue;

            const id = entityIds[i];
            const entity = world.getEntity(id);
            assert.ok(entity !== undefined, `Entity ${id} should still exist`);

            for (const componentType of entities[i].components) {
              const component = world.getComponent(id, componentType);
              assert.ok(
                component !== undefined,
                `Entity ${id} should still have component ${componentType}`
              );
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: System Execution Order
   * 
   * For any set of systems with assigned priorities, systems must execute in
   * ascending priority order (lower priority values execute first) during each
   * update cycle.
   * 
   * Validates: Requirements 1.8
   */
  it('Property 3: System Execution Order', () => {
    fc.assert(
      fc.property(
        // Generate array of systems with random priorities
        fc.array(
          fc.record({
            priority: fc.integer({ min: 0, max: 999 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (systemSpecs) => {
          const world = new World();
          const executionOrder: number[] = [];

          // Create test systems that record their execution order
          class TestSystem extends System {
            readonly componentSignature = createSignature('Position');
            readonly priority: number;
            private executionLog: number[];
            private systemId: number;

            constructor(world: World, priority: number, systemId: number, log: number[]) {
              super(world);
              this.priority = priority;
              this.systemId = systemId;
              this.executionLog = log;
            }

            update(_deltaTime: number): void {
              this.executionLog.push(this.systemId);
            }
          }

          // Register systems
          const systems: TestSystem[] = [];
          for (let i = 0; i < systemSpecs.length; i++) {
            const system = new TestSystem(world, systemSpecs[i].priority, i, executionOrder);
            systems.push(system);
            world.registerSystem(system);
          }

          // Update world to trigger system execution
          world.update(0.016);

          // Verify: Systems executed in priority order
          assert.strictEqual(
            executionOrder.length,
            systemSpecs.length,
            'All systems should have executed'
          );

          // Check that execution order matches priority order
          for (let i = 0; i < executionOrder.length - 1; i++) {
            const currentSystemId = executionOrder[i];
            const nextSystemId = executionOrder[i + 1];

            const currentPriority = systemSpecs[currentSystemId].priority;
            const nextPriority = systemSpecs[nextSystemId].priority;

            assert.ok(
              currentPriority <= nextPriority,
              `System ${currentSystemId} (priority ${currentPriority}) should execute before or with system ${nextSystemId} (priority ${nextPriority})`
            );
          }

          // Verify: Multiple updates maintain order
          executionOrder.length = 0;
          world.update(0.016);

          assert.strictEqual(
            executionOrder.length,
            systemSpecs.length,
            'All systems should execute on second update'
          );

          for (let i = 0; i < executionOrder.length - 1; i++) {
            const currentSystemId = executionOrder[i];
            const nextSystemId = executionOrder[i + 1];

            const currentPriority = systemSpecs[currentSystemId].priority;
            const nextPriority = systemSpecs[nextSystemId].priority;

            assert.ok(
              currentPriority <= nextPriority,
              `System execution order should be consistent across updates`
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
