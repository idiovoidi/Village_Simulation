/**
 * Terrain System
 * 
 * Creates and manages the bowl-shaped terrain for the village simulation.
 * Ported from MyHavokSimCode/BowlCreator.js
 */

import type { World } from '../../core/World';
import { System } from '../../core/System';

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
  bowlRadius: 100,
  bowlDepth: 25,
  segments: 64,
  waterLevel: -2,
};

/**
 * TerrainSystem creates and manages the bowl-shaped terrain
 */
export class TerrainSystem extends System {
  readonly componentSignature = new Set(['Terrain']);
  readonly priority = 10; // Run early to set up terrain

  /** Active config used by static height queries after initialize() */
  private static activeConfig: TerrainConfig = { ...DEFAULT_CONFIG };

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
    TerrainSystem.activeConfig = { ...this.config };

    // Create terrain mesh
    await this.createTerrain();

    // Create water (single owner for the vertical slice)
    this.createWater();

    this.initialized = true;
    console.log('TerrainSystem initialized');
  }

  getConfig(): TerrainConfig {
    return { ...this.config };
  }

  /**
   * Create the bowl-shaped terrain
   */
  private async createTerrain(): Promise<void> {
    const BABYLON = (window as any).BABYLON;
    if (!BABYLON || !this.scene) return;

    const { bowlRadius, bowlDepth, segments } = this.config;

    // Create ground mesh
    const ground = new BABYLON.Mesh('bowl', this.scene);
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
    vertexData.applyToMesh(ground, true);

    // Create terrain material
    const terrainMaterial = this.createTerrainMaterial();
    ground.material = terrainMaterial;
    ground.receiveShadows = true;
    ground.isPickable = true;
    ground.checkCollisions = true;
    // Avoid invisible ground if winding/normals point away from the camera
    if (ground.material) {
      ground.material.backFaceCulling = false;
    }
    ground.refreshBoundingInfo();

    console.log(
      `Terrain mesh created: radius=${bowlRadius}, depth=${bowlDepth}, ` +
        `centerHeight=${TerrainSystem.getTerrainHeight(0, 0).toFixed(2)}, ` +
        `waterLevel=${this.config.waterLevel}`
    );

    this.terrainMesh = ground;
  }

  /**
   * Generate terrain vertex data
   */
  private generateTerrainData(
    bowlRadius: number,
    _bowlDepth: number,
    segments: number
  ): {
    positions: number[];
    indices: number[];
    uvs: number[];
    normals: number[];
    colors: number[];
  } {
    const BABYLON = (window as any).BABYLON;
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
    if (BABYLON?.VertexData?.ComputeNormals) {
      BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    }

    return { positions, indices, uvs, normals, colors };
  }

  /**
   * Get terrain height at a given position.
   * Central meadow is always above waterLevel so the village ground stays visible.
   */
  static getTerrainHeight(x: number, z: number): number {
    const { bowlRadius, bowlDepth, waterLevel } = TerrainSystem.activeConfig;

    const distFromCenter = Math.sqrt(x * x + z * z);
    const normalizedDist = distFromCenter / Math.max(bowlRadius, 1);

    // Dry meadow sits clearly above the water plane
    const meadowBase = waterLevel + 2.5;
    // Shore / lower ring just above or at water for a shoreline look
    const shoreBase = waterLevel + 0.35;
    // Outer bowl floor dips under water for a lake rim
    const bowlFloor = waterLevel - Math.max(bowlDepth * 0.15, 2);

    let y = meadowBase - Math.pow(normalizedDist, 2.5) * (meadowBase - bowlFloor);

    // Flat central meadow (village floor)
    if (normalizedDist < 0.55) {
      const meadowNoise =
        Math.sin(x * 0.015) * Math.cos(z * 0.015) * 0.35 +
        Math.sin((x + z) * 0.01) * Math.cos((x - z) * 0.01) * 0.25;

      y = meadowBase + meadowNoise;

      // Soft transition toward shore
      if (normalizedDist > 0.4) {
        const t = (normalizedDist - 0.4) / 0.15;
        y = y * (1 - t) + (shoreBase + meadowNoise * 0.5) * t;
      }
    }
    // Rolling hills in the middle region
    else if (normalizedDist < 0.8) {
      const hillFactor = (normalizedDist - 0.55) / 0.25;
      const hillNoise =
        Math.sin(x * 0.02) * Math.cos(z * 0.02) * 4 +
        Math.sin((x + z) * 0.015) * Math.cos((x - z) * 0.015) * 3;

      y = shoreBase + hillNoise * hillFactor + hillFactor * 3;
    }
    // Mountains at the edges
    else {
      const mountainFactor = (normalizedDist - 0.8) / 0.2;
      const mountainHeight = Math.max(bowlDepth * 0.8, 12);
      const angle = Math.atan2(z, x);

      const mountainNoise =
        Math.sin(angle * 2) * 0.7 +
        Math.sin(angle * 3 + 1.5) * 0.4 +
        Math.sin(angle * 5 + 2.4) * 0.3;

      const ridgeNoise =
        Math.sin(x * 0.03 + z * 0.03) * 0.6 +
        Math.cos(x * 0.045 - z * 0.045) * 0.4;

      y =
        shoreBase +
        4 +
        mountainHeight * mountainFactor * (0.8 + 0.4 * (mountainNoise + ridgeNoise));
    }

    return y;
  }

  /**
   * Create terrain material
   */
  private createTerrainMaterial(): unknown {
    const BABYLON = (window as any).BABYLON;
    if (!BABYLON) return null;

    const material = new BABYLON.StandardMaterial('terrainMaterial', this.scene);

    material.diffuseColor = new BABYLON.Color3(0.35, 0.55, 0.22);
    material.ambientColor = new BABYLON.Color3(0.25, 0.35, 0.15);
    material.emissiveColor = new BABYLON.Color3(0.05, 0.08, 0.02);
    material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
    material.specularPower = 32;
    material.useVertexColors = true;
    material.backFaceCulling = false;

    return material;
  }

  /**
   * Create water plane — kept below the dry meadow so grass remains visible.
   */
  private createWater(): void {
    const BABYLON = (window as any).BABYLON;
    if (!BABYLON || !this.scene) return;

    const waterLevel = this.config.waterLevel;

    // Lake fills the bowl; radius stops short of outer mountains
    const water = BABYLON.MeshBuilder.CreateDisc(
      'water',
      { radius: this.config.bowlRadius * 0.95, tessellation: 64 },
      this.scene
    );
    water.rotation.x = Math.PI / 2;
    water.position.y = waterLevel;

    const waterMaterial = new BABYLON.StandardMaterial('waterMaterial', this.scene);
    waterMaterial.diffuseColor = new BABYLON.Color3(0.15, 0.35, 0.7);
    waterMaterial.specularColor = new BABYLON.Color3(0.5, 0.55, 0.6);
    waterMaterial.alpha = 0.65;
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