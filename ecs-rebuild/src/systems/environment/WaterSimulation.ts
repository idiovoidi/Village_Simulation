/**
 * Water Simulation
 * 
 * Creates and manages animated water surface with wave physics.
 * Ported from MyHavokSimCode/WaterSimulation.js
 */

import { System } from '../../core/System';
import type { World } from '../../core/World';

/**
 * Water configuration
 */
export interface WaterConfig {
  width: number;
  height: number;
  subdivisions: number;
  waterLevel: number;
  waveAmplitude: number;
  waveFrequency: number;
}

/**
 * Default water configuration
 */
const DEFAULT_CONFIG: WaterConfig = {
  width: 600,
  height: 600,
  subdivisions: 150,
  waterLevel: -10,
  waveAmplitude: 0.8,
  waveFrequency: 0.02,
};

/**
 * WaterSimulation creates animated water surface with wave physics
 */
export class WaterSimulation extends System {
  readonly componentSignature = new Set(['Water']);
  readonly priority = 5; // Run early

  private scene: unknown = null;
  private config: WaterConfig;
  private waterMesh: unknown = null;
  private time = 0;
  private initialized = false;

  constructor(world: World, scene: unknown, config: Partial<WaterConfig> = {}) {
    super(world);
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the water simulation
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('WaterSimulation already initialized');
      return;
    }

    if (!this.scene) {
      throw new Error('Scene is required for WaterSimulation');
    }

    console.log('Creating water surface...');

    // Create custom water material
    const waterMaterial = this.createWaterMaterial();

    try {
      // Create larger water surface
      const BABYLON = (window as unknown as { BABYLON: typeof import('babylonjs') }).BABYLON;
      if (!BABYLON || !this.scene) return;

      this.waterMesh = BABYLON.MeshBuilder.CreateGround(
        'waterSurface',
        {
          width: this.config.width,
          height: this.config.height,
          subdivisions: this.config.subdivisions,
        },
        this.scene as import('babylonjs').Scene
      );

      // Position water
      (this.waterMesh as { position: { y: number } }).position.y = this.config.waterLevel;

      // Apply material
      (this.waterMesh as { material: unknown }).material = waterMaterial;

      this.initialized = true;
      console.log('WaterSimulation initialized');
    } catch (error) {
      console.error('Error initializing water:', error);
      throw error;
    }
  }

  /**
   * Create water material with fresnel effect
   */
  private createWaterMaterial(): unknown {
    const BABYLON = (window as unknown as { BABYLON: typeof import('babylonjs') }).BABYLON;
    if (!BABYLON || !this.scene) return null;

    const waterMaterial = new BABYLON.StandardMaterial('waterMat', this.scene as import('babylonjs').Scene);

    // Set transparency
    waterMaterial.alpha = 0.4;

    // Water color and properties
    waterMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.5);
    waterMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    waterMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.3);

    // Add fresnel effect for realistic water surface
    waterMaterial.fresnelParameters = new BABYLON.FresnelParameters();
    waterMaterial.fresnelParameters.bias = 0.1;
    waterMaterial.fresnelParameters.power = 1;
    waterMaterial.fresnelParameters.leftColor = BABYLON.Color3.White();
    waterMaterial.fresnelParameters.rightColor = BABYLON.Color3.Black();

    // Enable backface culling for better transparency
    waterMaterial.backFaceCulling = true;

    return waterMaterial;
  }

  /**
   * Update water waves
   */
  update(deltaTime: number): void {
    if (!this.waterMesh) return;

    this.time += deltaTime;
    this.updateWaterWaves();
  }

  /**
   * Update vertex positions for wave motion
   */
  private updateWaterWaves(): void {
    const BABYLON = (window as unknown as { BABYLON: typeof import('babylonjs') }).BABYLON;
    if (!BABYLON || !this.waterMesh) return;

    const mesh = this.waterMesh as {
      getVerticesData: (kind: string) => Float32Array;
      getIndices: () => Uint16Array;
      updateVerticesData: (kind: string, data: Float32Array) => void;
      position: { y: number };
    };

    const positions = mesh.getVerticesData('Position');
    const normals: number[] = [];

    // Update vertices for wave motion
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      // Create waves with longer wavelengths for larger surface
      positions[i + 1] =
        mesh.position.y +
        Math.sin(x * 0.02 + this.time) * 0.8 +
        Math.cos(z * 0.02 + this.time * 0.5) * 0.8 +
        Math.sin((x + z) * 0.015 + this.time * 0.7) * 0.5;
    }

    // Compute normals for proper lighting
    BABYLON.VertexData.ComputeNormals(positions, mesh.getIndices(), normals);

    // Update mesh
    mesh.updateVerticesData('Position', positions);
    mesh.updateVerticesData('Normal', new Float32Array(normals));
  }

  /**
   * Get water height at position
   */
  getWaterHeight(x: number, z: number): number {
    const { waveAmplitude, waterLevel } = this.config;
    return (
      waterLevel +
      Math.sin(x * 0.02 + this.time) * waveAmplitude +
      Math.cos(z * 0.02 + this.time * 0.5) * waveAmplitude +
      Math.sin((x + z) * 0.015 + this.time * 0.7) * 0.5 * 0.625
    );
  }

  /**
   * Check if position is underwater
   */
  isUnderwater(x: number, z: number, entityY: number): boolean {
    return entityY < this.getWaterHeight(x, z);
  }

  /**
   * Get the water mesh
   */
  getWaterMesh(): unknown {
    return this.waterMesh;
  }

  /**
   * Get current time (for synchronization)
   */
  getTime(): number {
    return this.time;
  }

  /**
   * Set wave parameters
   */
  setWaveParameters(amplitude: number, frequency: number): void {
    this.config.waveAmplitude = amplitude;
    this.config.waveFrequency = frequency;
  }

  /**
   * Dispose of water resources
   */
  dispose(): void {
    if (this.waterMesh) {
      (this.waterMesh as { dispose: () => void }).dispose();
      this.waterMesh = null;
    }

    this.initialized = false;
    console.log('WaterSimulation disposed');
  }
}