/**
 * RenderSystem
 *
 * Manages mesh creation, transform synchronization, and rendering for entities.
 * Creates meshes for entities with Model components and updates their transforms.
 */

import { System } from '../core/System.ts';
import type { World } from '../core/World.ts';
import type { ComponentSignature } from '../core/Component.ts';
import type { EntityId } from '../core/Entity.ts';
import type { ModelComponent } from '../components/RenderingComponents.ts';
import type { TransformComponent } from '../components/CoreComponents.ts';
import { VillagerModel } from '../render/models/VillagerModel.js';
import { ZombieModel } from '../render/models/ZombieModel.js';
import { FishModel } from '../render/models/FishModel.js';
import { BirdModel } from '../render/models/BirdModel.js';
import { DogModel } from '../render/models/DogModel.js';
import { BoatModel } from '../render/models/BoatModel.js';
import { DinosaurModel } from '../render/models/DinosaurModel.js';

/**
 * RenderSystem handles mesh creation and transform synchronization.
 * Priority: 600 (Rendering systems)
 */
export class RenderSystem extends System {
  readonly componentSignature: ComponentSignature = new Set(['Model', 'Transform']);
  readonly priority: number = 600;

  private scene: any; // Babylon.Scene
  private entityMeshMap: Map<EntityId, any>; // Map of entity IDs to mesh instances
  private modelInstances: Map<string, any> = new Map(); // Model class instances

  /**
   * Creates a new RenderSystem.
   *
   * @param world - The world this system operates on
   * @param scene - The Babylon.js scene
   */
  constructor(world: World, scene: any) {
    super(world);
    this.scene = scene;
    this.entityMeshMap = new Map();
  }

  /**
   * Initializes the render system.
   * Creates model instances for procedural mesh generation.
   */
  initialize(): void {
    // Initialize model instances
    this.modelInstances.set('villager', new VillagerModel(this.scene));
    this.modelInstances.set('zombie', new ZombieModel(this.scene));
    this.modelInstances.set('fish', new FishModel(this.scene));
    this.modelInstances.set('bird', new BirdModel(this.scene));
    this.modelInstances.set('dog', new DogModel(this.scene));
    this.modelInstances.set('boat', new BoatModel(this.scene));
    this.modelInstances.set('dinosaur', new DinosaurModel(this.scene));
  }

  /**
   * Updates the render system.
   * Creates meshes for new entities and updates transforms for existing entities.
   * 
   * @param deltaTime - Time elapsed since last update in seconds
   */
  update(_deltaTime: number): void {
    const entities = this.queryEntities();

    for (const entityId of entities) {
      const modelComponent = this.world.getComponent<ModelComponent>(entityId, 'Model');
      const transformComponent = this.world.getComponent<TransformComponent>(entityId, 'Transform');

      if (!modelComponent || !transformComponent) {
        continue;
      }

      // Create mesh if it doesn't exist
      if (!modelComponent.meshInstance) {
        this.createMeshForEntity(entityId, modelComponent);
      }

      // Update mesh transform if transform is dirty
      if (transformComponent.dirty) {
        this.updateMeshTransform(entityId, modelComponent, transformComponent);
        transformComponent.dirty = false;
      }

      // Update mesh visibility
      const mesh = this.entityMeshMap.get(entityId);
      if (mesh) {
        mesh.isVisible = modelComponent.visible;
      }
    }

    // Clean up meshes for destroyed entities
    this.cleanupDestroyedEntities();
  }

  /**
   * Creates a mesh for an entity using the appropriate model class.
   *
   * @param entityId - The entity to create a mesh for
   * @param modelComponent - The model component
   */
  private createMeshForEntity(entityId: EntityId, modelComponent: ModelComponent): void {
    console.log(`[RenderSystem] Creating mesh for entity ${entityId} with meshId: ${modelComponent.meshId}`);

    const modelInstance = this.modelInstances.get(modelComponent.meshId);
    const transformComponent = this.world.getComponent<TransformComponent>(entityId, 'Transform');

    if (!modelInstance) {
      console.warn(`No model instance found for meshId: ${modelComponent.meshId}`);
      return;
    }

    // Get position from transform component
    const position = transformComponent?.position ?? { x: 0, y: 0, z: 0 };
    console.log(`[RenderSystem] Position:`, position);

    // Create mesh using the model class - method names vary
    let meshParts: any;
    try {
      switch (modelComponent.meshId) {
        case 'villager':
          console.log(`[RenderSystem] Calling createVillager()`);
          meshParts = (modelInstance as VillagerModel).createVillager(position);
          break;
        case 'zombie':
        case 'fish':
        case 'bird':
        case 'dog':
        case 'boat':
        case 'dinosaur':
          console.log(`[RenderSystem] Calling create() for ${modelComponent.meshId}`);
          meshParts = (modelInstance as any).create(position);
          break;
        default:
          console.warn(`Unknown mesh type: ${modelComponent.meshId}`);
          return;
      }
    } catch (error) {
      console.error(`[RenderSystem] Error creating mesh for ${modelComponent.meshId}:`, error);
      return;
    }

    // Store the root mesh
    const rootMesh = meshParts.root || meshParts;
    console.log(`[RenderSystem] Root mesh created:`, rootMesh);
    (modelComponent as any).meshInstance = rootMesh;
    this.entityMeshMap.set(entityId, rootMesh);
  }

  /**
   * Updates the transform of a mesh from the transform component.
   * 
   * @param entityId - The entity ID
   * @param modelComponent - The model component
   * @param transformComponent - The transform component
   */
  private updateMeshTransform(
    entityId: EntityId,
    _modelComponent: ModelComponent,
    transformComponent: TransformComponent
  ): void {
    const mesh = this.entityMeshMap.get(entityId);

    if (!mesh) {
      return;
    }

    const BABYLON = (window as any).BABYLON;

    // Update position
    mesh.position = new BABYLON.Vector3(
      transformComponent.position.x,
      transformComponent.position.y,
      transformComponent.position.z
    );

    // Update rotation (from quaternion)
    mesh.rotationQuaternion = new BABYLON.Quaternion(
      transformComponent.rotation.x,
      transformComponent.rotation.y,
      transformComponent.rotation.z,
      transformComponent.rotation.w
    );

    // Update scale
    mesh.scaling = new BABYLON.Vector3(
      transformComponent.scale.x,
      transformComponent.scale.y,
      transformComponent.scale.z
    );
  }

  /**
   * Cleans up meshes for entities that no longer exist.
   */
  private cleanupDestroyedEntities(): void {
    const currentEntities = new Set(this.queryEntities());

    // Find entities that have meshes but no longer exist
    for (const [entityId, mesh] of this.entityMeshMap) {
      if (!currentEntities.has(entityId)) {
        // Dispose mesh
        if (mesh && mesh.dispose) {
          mesh.dispose();
        }

        // Remove from map
        this.entityMeshMap.delete(entityId);

        // Clear mesh instance reference in component (if entity still exists)
        const modelComponent = this.world.getComponent<ModelComponent>(entityId, 'Model');
        if (modelComponent) {
          (modelComponent as any).meshInstance = null;
        }
      }
    }
  }

  /**
   * Gets the mesh instance for an entity.
   * 
   * @param entityId - The entity ID
   * @returns The mesh instance or undefined
   */
  getMesh(entityId: EntityId): any {
    return this.entityMeshMap.get(entityId);
  }

  /**
   * Cleanup method called when system is unregistered.
   */
  cleanup(): void {
    // Dispose all entity meshes
    for (const [_entityId, mesh] of this.entityMeshMap) {
      if (mesh && mesh.dispose) {
        mesh.dispose();
      }
    }
    this.entityMeshMap.clear();

    // Dispose model instances
    for (const [_modelId, model] of this.modelInstances) {
      if (model && model.dispose) {
        model.dispose();
      }
    }
    this.modelInstances.clear();
  }
}
