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
import type { TreeComponent } from '../components/WorldComponents.ts';
import { VillagerModel } from '../render/models/VillagerModel.ts';
import { ZombieModel } from '../render/models/ZombieModel.ts';
import { FishModel } from '../render/models/FishModel.ts';
import { BirdModel } from '../render/models/BirdModel.ts';
import { DogModel } from '../render/models/DogModel.ts';
import { BoatModel } from '../render/models/BoatModel.ts';
import { DinosaurModel } from '../render/models/DinosaurModel.ts';
import { HouseModel } from '../render/models/HouseModel.ts';
import { TreeModel } from '../render/models/TreeModel.ts';
import { WellModel } from '../render/models/WellModel.ts';
import { FieldModel } from '../render/models/FieldModel.ts';

/** Models that float/fly and are centred on their Position instead of resting on it. */
const FLOATING_MODELS = new Set(['bird', 'fish']);

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
  private entityPartsMap: Map<EntityId, any> = new Map(); // Raw parts returned by model factories
  private meshEntityMap: Map<any, EntityId> = new Map(); // Root node -> entity (for picking)
  private footOffsetMap: Map<EntityId, number> = new Map(); // Lift so the lowest mesh point sits on Position.y

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
    this.modelInstances.set('house', new HouseModel(this.scene));
    this.modelInstances.set('tree', new TreeModel(this.scene));
    this.modelInstances.set('well', new WellModel(this.scene));
    this.modelInstances.set('field', new FieldModel(this.scene));
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
        // setEnabled cascades to child parts (limbs, head); isVisible does not.
        if (mesh.isEnabled?.() !== modelComponent.visible) mesh.setEnabled?.(modelComponent.visible);
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
    const modelInstance = this.modelInstances.get(modelComponent.meshId);
    const transformComponent = this.world.getComponent<TransformComponent>(entityId, 'Transform');

    if (!modelInstance) {
      console.warn(`No model instance found for meshId: ${modelComponent.meshId}`);
      return;
    }

    // Get position from transform component
    const position = transformComponent?.position ?? { x: 0, y: 0, z: 0 };
    // Create mesh using the model class - method names vary
    let meshParts: any;
    try {
      switch (modelComponent.meshId) {
        case 'villager':
          meshParts = (modelInstance as VillagerModel).createVillager(position);
          break;
        case 'tree': {
          const tree = this.world.getComponent<TreeComponent>(entityId, 'Tree');
          meshParts = (modelInstance as TreeModel).create(position, {
            treeType: tree?.treeType,
            age: tree?.age,
          });
          break;
        }
        case 'zombie':
        case 'fish':
        case 'bird':
        case 'dog':
        case 'boat':
        case 'dinosaur':
        case 'house':
        case 'well':
        case 'field':
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
    (modelComponent as any).meshInstance = rootMesh;
    this.entityMeshMap.set(entityId, rootMesh);
    this.entityPartsMap.set(entityId, meshParts);
    this.meshEntityMap.set(rootMesh, entityId);

    // Ground-bound models are lifted so their lowest point rests on the entity's
    // Position.y instead of every model baking in its own offset.
    if (!FLOATING_MODELS.has(modelComponent.meshId) && rootMesh.getHierarchyBoundingVectors) {
      rootMesh.computeWorldMatrix(true);
      const { min } = rootMesh.getHierarchyBoundingVectors(true);
      this.footOffsetMap.set(entityId, min.y - rootMesh.position.y);
    }
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
      transformComponent.position.y - (this.footOffsetMap.get(entityId) ?? 0) * transformComponent.scale.y,
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

        // Remove from maps
        this.entityMeshMap.delete(entityId);
        this.entityPartsMap.delete(entityId);
        this.meshEntityMap.delete(mesh);
        this.footOffsetMap.delete(entityId);

        // Clear mesh instance reference in component (if entity still exists)
        const modelComponent = this.world.getComponent<ModelComponent>(entityId, 'Model');
        if (modelComponent) {
          (modelComponent as any).meshInstance = null;
        }
      }
    }
  }

  /** Parts (limbs, wings, tail...) created by the model factory for an entity. */
  getParts(entityId: EntityId): any {
    return this.entityPartsMap.get(entityId);
  }

  /** Resolves a picked mesh (or any of its descendants) back to its entity. */
  findEntityByMesh(mesh: any): EntityId | null {
    let node = mesh;
    while (node) {
      const id = this.meshEntityMap.get(node);
      if (id !== undefined) return id;
      node = node.parent;
    }
    return null;
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
