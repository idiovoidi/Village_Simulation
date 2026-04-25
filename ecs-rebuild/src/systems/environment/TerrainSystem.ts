/**
 * Terrain System
 * 
 * Creates and manages the bowl-shaped terrain for the village simulation.
 * Ported from MyHavokSimCode/BowlCreator.js
 */

import type { World } from '../../core/World';
import { System } from '../../core/System';
import type { EntityId } from '../../core/Entity';
import type { PositionComponent, Vector3 } from '../../components/CoreComponents';
import { createPositionComponent, createActiveComponent } from '../../components/CoreComponents';
import { createPhysicsBodyComponent, PhysicsBodyType, PhysicsShapeType } from '../../components/PhysicsComponents';
import { createModelComponent, createVisualComponent } from '../../components/RenderingComponents';

/**
 * Terrain configuration
 */
export interface TerrainConfig {
  bowlRadius: number;
  bowlDepth: number;
  segments: number;
  waterLevel: number;
}

/**
 * Default terrain configuration
 */
const DEFAULT_CONFIG: TerrainConfig = {
  bowlRadius: 300,
  bowlDepth: 50,
  segments: 64,
  waterLevel: -3,
};

/**
 * TerrainSystem creates and manages the bowl-shaped terrain
 */
export class TerrainSystem extends System {
  readonly componentSignature = new Set(['Terrain']);
  readonly priority = 10; // Run early to set up terrain

  private scene: unknown = null;
  private config: TerrainConfig;
  private terrainMesh: unknown = null;
  private waterMesh: unknown = null;
  private initialized = false;

  constructor(world: World, scene: unknown, config: Partial<TerrainConfig> = {}) {
    super(world);
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the terrain system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('TerrainSystem already initialized');
      return;
    }

    console.log('Creating terrain...');

    // Create terrain mesh
    await this.createTerrain();

    // Create water
    this.createWater();

    this.initialized = true;
    console.log('TerrainSystem initialized');
  }

  /**
   * Create the bowl-shaped terrain
   */
  private async createTerrain(): Promise<void> {
    const BABYLON = (window as unknown as { BABYLON: typeof import('babylonjs') }).BABYLON;
    if (!BABYLON || !this.scene) return;

    const { bowlRadius, bowlDepth, segments } = this.config;

    // Create ground mesh
    const ground = new BABYLON.Mesh('bowl', this.scene as import('babylonjs').Scene);
    const vertexData = new BABYLON.VertexData();

    const { positions, indices, uvs, normals, colors } = this.generateTerrainData(
      bowlRadius,
      bowlDepth,
      segments
    );

    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.uvs = uvs;
    vertexData.normals = normals;
    vertexData.colors = colors;
    vertexData.applyToMesh(ground);

    // Create terrain material
    const terrainMaterial = this.createTerrainMaterial();
    ground.material = terrainMaterial;

    // Enable receiving shadows
    ground.receiveShadows = true;

    this.terrainMesh = ground;
  }

  /**
   * Generate terrain vertex data
   */
  private generateTerrainData(
    bowlRadius: number,
    bowlDepth: number,
    segments: number
  ): {
    positions: number[];
    indices: number[];
    uvs: number[];
    normals: number[];
    colors: number[];
  } {
    const positions: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];

    // Generate vertices
    for (let z = 0; z <= segments; z++) {
      for (let x = 0; x <= segments; x++) {
        const u = x / segments;
        const v = z / segments;

        // Calculate position
        const worldX = (u - 0.5) * 2 * bowlRadius;
        const worldZ = (v - 0.5) * 2 * bowlRadius;
        const worldY = TerrainSystem.getTerrainHeight(worldX, worldZ);

        positions.push(worldX, worldY, worldZ);
        uvs.push(u, v);

        // Default color (grass green)
        colors.push(0.3, 0.6, 0.2, 1);
      }
    }

    // Generate indices
    for (let z = 0; z < segments; z++) {
      for (let x = 0; x < segments; x++) {
        const topLeft = z * (segments + 1) + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * (segments + 1) + x;
        const bottomRight = bottomLeft + 1;

        // First triangle
        indices.push(topLeft, bottomLeft, topRight);
        // Second triangle
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }

    // Calculate normals
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    return { positions, indices, uvs, normals, colors };
  }

  /**
   * Get terrain height at a given position
   * Static method for physics and AI to query terrain height
   */
  static getTerrainHeight(x: number, z: number): number {
    const bowlRadius = 300;
    const bowlDepth = 50;

    const distFromCenter = Math.sqrt(x * x + z * z);
    const normalizedDist = distFromCenter / bowlRadius;

    // Flatter, more gradual base shape
    let y = -Math.pow(normalizedDist, 2.5) * bowlDepth;

    // Create a very flat central meadow (larger area)
    if (normalizedDist < 0.5) {
      // Almost completely flat center with very subtle undulation
      const meadowNoise =
        Math.sin(x * 0.015) * Math.cos(z * 0.015) * 1.2 +
        Math.sin((x + z) * 0.01) * Math.cos((x - z) * 0.01) * 0.8;

      y = -3 + meadowNoise;

      // Smoother transition to surrounding terrain
      if (normalizedDist > 0.4) {
        const transitionFactor = (normalizedDist - 0.4) / 0.1;
        y = y * (1 - transitionFactor) + (-8 * transitionFactor);
      }
    }
    // Rolling hills in the middle region
    else if (normalizedDist < 0.8) {
      const hillFactor = (normalizedDist - 0.5) / 0.3;
      const hillNoise =
        Math.sin(x * 0.02) * Math.cos(z * 0.02) * 10 +
        Math.sin((x + z) * 0.015) * Math.cos((x - z) * 0.015) * 8;

      y = -8 + hillNoise * hillFactor;
    }
    // Mountains at the edges
    else {
      const mountainFactor = (normalizedDist - 0.8) / 0.2;
      const mountainHeight = 50;
      const angle = Math.atan2(z, x);

      const mountainNoise =
        Math.sin(angle * 2) * 0.7 +
        Math.sin(angle * 3 + 1.5) * 0.4 +
        Math.sin(angle * 5 + 2.4) * 0.3;

      const ridgeNoise =
        Math.sin(x * 0.03 + z * 0.03) * 0.6 +
        Math.cos(x * 0.045 - z * 0.045) * 0.4;

      y += mountainHeight * mountainFactor * (0.8 + 0.4 * (mountainNoise + ridgeNoise));
    }

    return y;
  }

  /**
   * Create terrain material
   */
  private createTerrainMaterial(): unknown {
    const BABYLON = (window as unknown as { BABYLON: typeof import('babylonjs') }).BABYLON;
    if (!BABYLON) return null;

    const material = new BABYLON.StandardMaterial('terrainMaterial', this.scene as import('babylonjs').Scene);

    // Set material properties
    material.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.2);
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    material.specularPower = 32;

    // Add some variation with vertex colors
    material.useVertexColors = true;

    return material;
  }

  /**
   * Create water plane
   */
  private createWater(): void {
    const BABYLON = (window as unknown as { BABYLON: typeof import('babylonjs') }).BABYLON;
    if (!BABYLON || !this.scene) return;

    const waterLevel = this.config.waterLevel;

    // Create water plane
    const water = BABYLON.MeshBuilder.CreateGround(
      'water',
      { width: this.config.bowlRadius * 2.5, height: this.config.bowlRadius * 2.5 },
      this.scene as import('babylonjs').Scene
    );

    water.position.y = waterLevel;

    // Create water material
    const waterMaterial = new BABYLON.StandardMaterial('waterMaterial', this.scene as import('babylonjs').Scene);
    waterMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);
    waterMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    waterMaterial.alpha = 0.7;
    waterMaterial.backFaceCulling = false;

    water.material = waterMaterial;
    this.waterMesh = water;
  }

  /**
   * Get terrain height at position
   */
  getHeightAt(x: number, z: number): number {
    return TerrainSystem.getTerrainHeight(x, z);
  }

  /**
   * Check if position is within water
   */
  isUnderwater(x: number, z: number): boolean {
    const terrainHeight = this.getHeightAt(x, z);
    return terrainHeight < this.config.waterLevel;
  }

  /**
   * Get the terrain mesh
   */
  getTerrainMesh(): unknown {
    return this.terrainMesh;
  }

  /**
   * Get the water mesh
   */
  getWaterMesh(): unknown {
    return this.waterMesh;
  }

  /**
   * Update system (not used for terrain)
   */
  update(_deltaTime: number): void {
    // Terrain is static, no per-frame updates needed
  }

  /**
   * Dispose of terrain resources
   */
  dispose(): void {
    if (this.terrainMesh) {
      (this.terrainMesh as { dispose: () => void }).dispose();
      this.terrainMesh = null;
    }

    if (this.waterMesh) {
      (this.waterMesh as { dispose: () => void }).dispose();
      this.waterMesh = null;
    }

    this.initialized = false;
    console.log('TerrainSystem disposed');
  }
}