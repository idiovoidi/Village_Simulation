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

/**
 * RenderSystem handles mesh creation and transform synchronization.
 * Priority: 600 (Rendering systems)
 */
export class RenderSystem extends System {
  readonly componentSignature: ComponentSignature = new Set(['Model', 'Transform']);
  readonly priority: number = 600;

  private scene: any; // Babylon.Scene
  private meshCache: Map<string, any>; // Cache of loaded meshes by meshId
  private entityMeshMap: Map<EntityId, any>; // Map of entity IDs to mesh instances

  /**
   * Creates a new RenderSystem.
   * 
   * @param world - The world this system operates on
   * @param scene - The Babylon.js scene
   */
  constructor(world: World, scene: any) {
    super(world);
    this.scene = scene;
    this.meshCache = new Map();
    this.entityMeshMap = new Map();
  }

  /**
   * Initializes the render system.
   * Creates placeholder meshes for common mesh types.
   */
  initialize(): void {
    this.createPlaceholderMeshes();
  }

  /**
   * Creates placeholder meshes for testing and fallback.
   */
  private createPlaceholderMeshes(): void {
    const BABYLON = (window as any).BABYLON;

    // Create basic placeholder meshes
    const placeholders = [
      { id: 'villager', type: 'box', size: { width: 1, height: 2, depth: 1 } },
      { id: 'zombie', type: 'box', size: { width: 1, height: 2, depth: 1 } },
      { id: 'fish', type: 'sphere', size: { diameter: 0.5 } },
      { id: 'bird', type: 'sphere', size: { diameter: 0.3 } },
      { id: 'dog', type: 'box', size: { width: 0.8, height: 0.6, depth: 1.2 } },
      { id: 'boat', type: 'box', size: { width: 2, height: 0.5, depth: 3 } },
      { id: 'house', type: 'box', size: { width: 4, height: 3, depth: 4 } },
      { id: 'tree', type: 'cylinder', size: { height: 5, diameter: 1 } }
    ];

    for (const placeholder of placeholders) {
      let mesh: any;

      if (placeholder.type === 'box') {
        const size = placeholder.size as { width: number; height: number; depth: number };
        mesh = BABYLON.MeshBuilder.CreateBox(
          placeholder.id,
          { width: size.width, height: size.height, depth: size.depth },
          this.scene
        );
      } else if (placeholder.type === 'sphere') {
        const size = placeholder.size as { diameter: number };
        mesh = BABYLON.MeshBuilder.CreateSphere(
          placeholder.id,
          { diameter: size.diameter },
          this.scene
        );
      } else if (placeholder.type === 'cylinder') {
        const size = placeholder.size as { height: number; diameter: number };
        mesh = BABYLON.MeshBuilder.CreateCylinder(
          placeholder.id,
          { height: size.height, diameter: size.diameter },
          this.scene
        );
      }

      if (mesh) {
        mesh.isVisible = false; // Hide template mesh
        this.meshCache.set(placeholder.id, mesh);
      }
    }
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
   * Creates a mesh for an entity.
   * 
   * @param entityId - The entity to create a mesh for
   * @param modelComponent - The model component
   */
  private createMeshForEntity(entityId: EntityId, modelComponent: ModelComponent): void {
    const BABYLON = (window as any).BABYLON;

    // Get or create mesh from cache
    let templateMesh = this.meshCache.get(modelComponent.meshId);

    if (!templateMesh) {
      // Create default box if mesh type not found
      templateMesh = BABYLON.MeshBuilder.CreateBox(
        modelComponent.meshId,
        { size: 1 },
        this.scene
      );
      templateMesh.isVisible = false;
      this.meshCache.set(modelComponent.meshId, templateMesh);
    }

    // Create instance of the mesh
    const meshInstance = templateMesh.createInstance(`${modelComponent.meshId}_${entityId}`);
    meshInstance.isVisible = modelComponent.visible;

    // Store references
    (modelComponent as any).meshInstance = meshInstance;
    this.entityMeshMap.set(entityId, meshInstance);
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
   * Loads a custom mesh from a file.
   * 
   * @param meshId - The identifier for the mesh
   * @param fileName - The file name to load
   * @param rootUrl - The root URL for the file (default: '/models/')
   * @returns Promise that resolves when the mesh is loaded
   */
  async loadMesh(meshId: string, fileName: string, rootUrl = '/models/'): Promise<void> {
    const BABYLON = (window as any).BABYLON;

    return new Promise((resolve, reject) => {
      BABYLON.SceneLoader.ImportMesh(
        '',
        rootUrl,
        fileName,
        this.scene,
        (meshes: any[]) => {
          if (meshes.length > 0) {
            const mesh = meshes[0];
            mesh.isVisible = false;
            this.meshCache.set(meshId, mesh);
            resolve();
          } else {
            reject(new Error(`No meshes found in ${fileName}`));
          }
        },
        null,
        (_scene: any, message: string) => {
          reject(new Error(`Failed to load mesh: ${message}`));
        }
      );
    });
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

    // Dispose template meshes
    for (const [_meshId, mesh] of this.meshCache) {
      if (mesh && mesh.dispose) {
        mesh.dispose();
      }
    }
    this.meshCache.clear();
  }
}
