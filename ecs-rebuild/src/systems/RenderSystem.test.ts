/**
 * RenderSystem Property-Based Tests
 * 
 * Tests for mesh creation and transform synchronization properties.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import fc from 'fast-check';
import { World } from '../core/World.ts';
import { RenderSystem } from './RenderSystem.ts';
import { createModelComponent } from '../components/RenderingComponents.ts';
import { createTransformComponent } from '../components/CoreComponents.ts';

/**
 * Mock Babylon.js for testing
 */
function setupBabylonMock(): any {
  const meshes = new Map<string, any>();

  const mockMesh = {
    isVisible: false,
    position: { x: 0, y: 0, z: 0 },
    rotationQuaternion: { x: 0, y: 0, z: 0, w: 1 },
    scaling: { x: 1, y: 1, z: 1 },
    createInstance: (name: string) => {
      const instance = {
        name,
        isVisible: true,
        position: { x: 0, y: 0, z: 0 },
        rotationQuaternion: { x: 0, y: 0, z: 0, w: 1 },
        scaling: { x: 1, y: 1, z: 1 },
        dispose: () => {}
      };
      return instance;
    },
    dispose: () => {}
  };

  const mockScene = {
    meshes: [],
    render: () => {}
  };

  (global as any).window = {
    BABYLON: {
      Vector3: class {
        x: number;
        y: number;
        z: number;
        constructor(x: number, y: number, z: number) {
          this.x = x;
          this.y = y;
          this.z = z;
        }
      },
      Quaternion: class {
        x: number;
        y: number;
        z: number;
        w: number;
        constructor(x: number, y: number, z: number, w: number) {
          this.x = x;
          this.y = y;
          this.z = z;
          this.w = w;
        }
      },
      MeshBuilder: {
        CreateBox: (name: string, options: any, scene: any) => {
          const mesh = { ...mockMesh, name };
          meshes.set(name, mesh);
          return mesh;
        },
        CreateSphere: (name: string, options: any, scene: any) => {
          const mesh = { ...mockMesh, name };
          meshes.set(name, mesh);
          return mesh;
        },
        CreateCylinder: (name: string, options: any, scene: any) => {
          const mesh = { ...mockMesh, name };
          meshes.set(name, mesh);
          return mesh;
        }
      }
    }
  };

  return { mockScene, meshes };
}

describe('RenderSystem Property Tests', () => {
  let world: World;
  let renderSystem: RenderSystem;
  let mockScene: any;

  beforeEach(() => {
    world = new World();
    const { mockScene: scene } = setupBabylonMock();
    mockScene = scene;
    renderSystem = new RenderSystem(world, mockScene);
    renderSystem.initialize();
    world.registerSystem(renderSystem);
  });

  /**
   * Property 8: Mesh Creation for Visual Entities
   * 
   * For any entity with a visual component (Model + Transform),
   * a corresponding mesh must be created in the Babylon.js scene.
   * 
   * **Validates: Requirements 9.2**
   */
  it('Property 8: Mesh Creation for Visual Entities', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            meshId: fc.constantFrom('villager', 'zombie', 'fish', 'bird', 'dog', 'boat'),
            position: fc.record({
              x: fc.float({ min: Math.fround(-100), max: Math.fround(100) }),
              y: fc.float({ min: Math.fround(-100), max: Math.fround(100) }),
              z: fc.float({ min: Math.fround(-100), max: Math.fround(100) })
            }),
            visible: fc.boolean()
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (entities) => {
          // Create entities with Model and Transform components
          const entityIds: number[] = [];

          for (const entityData of entities) {
            const entityId = world.createEntity();
            entityIds.push(entityId);

            // Add Model component
            const modelComponent = createModelComponent(entityData.meshId, 0, entityData.visible);
            world.addComponent(entityId, modelComponent);

            // Add Transform component
            const transformComponent = createTransformComponent(entityData.position);
            world.addComponent(entityId, transformComponent);
          }

          // Update render system to create meshes
          renderSystem.update(0);

          // Verify: All entities with Model + Transform must have a mesh created
          for (const entityId of entityIds) {
            const modelComponent = world.getComponent(entityId, 'Model');
            assert.ok(modelComponent, `Entity ${entityId} should have Model component`);

            // Check that meshInstance was created
            assert.ok(
              (modelComponent as any).meshInstance !== null,
              `Entity ${entityId} should have mesh instance created`
            );

            // Verify mesh can be retrieved
            const mesh = renderSystem.getMesh(entityId);
            assert.ok(mesh, `Entity ${entityId} should have retrievable mesh`);

            // Verify mesh visibility matches component
            assert.strictEqual(
              mesh.isVisible,
              modelComponent.visible,
              `Mesh visibility should match component for entity ${entityId}`
            );
          }

          // Cleanup
          for (const entityId of entityIds) {
            world.destroyEntity(entityId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Mesh Transform Synchronization
   * 
   * For any entity with both a mesh and a transform component,
   * when the transform component changes, the mesh's transform must be updated to match.
   * 
   * **Validates: Requirements 9.3**
   */
  it('Property 9: Mesh Transform Synchronization', () => {
    fc.assert(
      fc.property(
        fc.record({
          meshId: fc.constantFrom('villager', 'zombie', 'fish'),
          initialPosition: fc.record({
            x: fc.float({ min: Math.fround(-50), max: Math.fround(50) }),
            y: fc.float({ min: Math.fround(-50), max: Math.fround(50) }),
            z: fc.float({ min: Math.fround(-50), max: Math.fround(50) })
          }),
          newPosition: fc.record({
            x: fc.float({ min: Math.fround(-50), max: Math.fround(50) }),
            y: fc.float({ min: Math.fround(-50), max: Math.fround(50) }),
            z: fc.float({ min: Math.fround(-50), max: Math.fround(50) })
          }),
          rotation: fc.record({
            x: fc.float({ min: Math.fround(-1), max: Math.fround(1) }),
            y: fc.float({ min: Math.fround(-1), max: Math.fround(1) }),
            z: fc.float({ min: Math.fround(-1), max: Math.fround(1) }),
            w: fc.float({ min: Math.fround(-1), max: Math.fround(1) })
          }),
          scale: fc.record({
            x: fc.float({ min: Math.fround(0.1), max: Math.fround(3) }),
            y: fc.float({ min: Math.fround(0.1), max: Math.fround(3) }),
            z: fc.float({ min: Math.fround(0.1), max: Math.fround(3) })
          })
        }),
        (data) => {
          // Create entity with Model and Transform
          const entityId = world.createEntity();

          const modelComponent = createModelComponent(data.meshId);
          world.addComponent(entityId, modelComponent);

          const transformComponent = createTransformComponent(data.initialPosition);
          world.addComponent(entityId, transformComponent);

          // Initial update to create mesh
          renderSystem.update(0);

          const mesh = renderSystem.getMesh(entityId);
          assert.ok(mesh, 'Mesh should be created');

          // Verify initial position
          assert.strictEqual(mesh.position.x, data.initialPosition.x);
          assert.strictEqual(mesh.position.y, data.initialPosition.y);
          assert.strictEqual(mesh.position.z, data.initialPosition.z);

          // Update transform component
          transformComponent.position = data.newPosition;
          transformComponent.rotation = data.rotation;
          transformComponent.scale = data.scale;
          transformComponent.dirty = true;

          // Update render system to sync transform
          renderSystem.update(0);

          // Verify: Mesh transform must match component transform
          assert.strictEqual(
            mesh.position.x,
            data.newPosition.x,
            'Mesh position X should match transform'
          );
          assert.strictEqual(
            mesh.position.y,
            data.newPosition.y,
            'Mesh position Y should match transform'
          );
          assert.strictEqual(
            mesh.position.z,
            data.newPosition.z,
            'Mesh position Z should match transform'
          );

          assert.strictEqual(
            mesh.rotationQuaternion.x,
            data.rotation.x,
            'Mesh rotation X should match transform'
          );
          assert.strictEqual(
            mesh.rotationQuaternion.y,
            data.rotation.y,
            'Mesh rotation Y should match transform'
          );
          assert.strictEqual(
            mesh.rotationQuaternion.z,
            data.rotation.z,
            'Mesh rotation Z should match transform'
          );
          assert.strictEqual(
            mesh.rotationQuaternion.w,
            data.rotation.w,
            'Mesh rotation W should match transform'
          );

          assert.strictEqual(
            mesh.scaling.x,
            data.scale.x,
            'Mesh scale X should match transform'
          );
          assert.strictEqual(
            mesh.scaling.y,
            data.scale.y,
            'Mesh scale Y should match transform'
          );
          assert.strictEqual(
            mesh.scaling.z,
            data.scale.z,
            'Mesh scale Z should match transform'
          );

          // Verify dirty flag is cleared
          assert.strictEqual(
            transformComponent.dirty,
            false,
            'Transform dirty flag should be cleared after sync'
          );

          // Cleanup
          world.destroyEntity(entityId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
