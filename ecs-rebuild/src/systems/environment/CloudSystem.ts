/**
 * Cloud System
 * 
 * Creates and manages procedural clouds for the simulation.
 * Ported from MyHavokSimCode/CloudSystem.js
 */

import { System } from '../../core/System';
import type { World } from '../../core/World';

/**
 * Cloud configuration
 */
export interface CloudConfig {
  cloudCount: number;
  minHeight: number;
  maxHeight: number;
  boundaryRadius: number;
  speed: number;
}

/**
 * Cloud data structure
 */
interface CloudData {
  mesh: unknown;
  speed: number;
  direction: { x: number; y: number; z: number };
  materials: unknown[];
}

/**
 * Default cloud configuration
 */
const DEFAULT_CONFIG: CloudConfig = {
  cloudCount: 15,
  minHeight: 50,
  maxHeight: 70,
  boundaryRadius: 150,
  speed: 0.02,
};

/**
 * CloudSystem creates and manages procedural clouds
 */
export class CloudSystem extends System {
  readonly componentSignature = new Set(['Cloud']);
  readonly priority = 5; // Run early

  private scene: unknown = null;
  private config: CloudConfig;
  private clouds: CloudData[] = [];
  private initialized = false;

  constructor(world: World, scene: unknown, config: Partial<CloudConfig> = {}) {
    super(world);
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the cloud system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('CloudSystem already initialized');
      return;
    }

    console.log('Creating clouds...');
    this.createClouds();
    this.initialized = true;
    console.log('CloudSystem initialized');
  }

  /**
   * Create cloud meshes
   */
  private createClouds(): void {
    for (let i = 0; i < this.config.cloudCount; i++) {
      const cloudMesh = this.createCloudMesh();

      // Random starting position
      cloudMesh.position = this.getRandomPosition();

      // Random scale for variety
      const scale = 0.8 + Math.random() * 0.4;
      cloudMesh.scaling = new (window as unknown as { BABYLON: typeof import('babylonjs') }).BABYLON.Vector3(
        scale,
        scale * 0.6,
        scale
      );

      // Random rotation
      cloudMesh.rotation.y = Math.random() * Math.PI * 2;

      // Add movement properties
      this.clouds.push({
        mesh: cloudMesh,
        speed: 0.02 + Math.random() * 0.02,
        direction: {
          x: Math.random() - 0.5,
          y: 0,
          z: Math.random() - 0.5,
        },
        materials: (cloudMesh as { materials: unknown[] }).materials,
      });
    }
  }

  /**
   * Create a single cloud mesh from multiple spheres
   */
  private createCloudMesh(): unknown {
    const BABYLON = (window as unknown as { BABYLON: typeof import('babylonjs') }).BABYLON;
    if (!BABYLON || !this.scene) return null;

    // Create cloud from multiple spheres
    const cloud = new BABYLON.TransformNode('cloud', this.scene as import('babylonjs').Scene);
    const segments = 3 + Math.floor(Math.random() * 3);
    const materials: unknown[] = [];

    for (let i = 0; i < segments; i++) {
      const sphere = BABYLON.MeshBuilder.CreateSphere(`cloudPart${i}`, {
        diameter: 10 + Math.random() * 5,
        segments: 8,
      }, this.scene as import('babylonjs').Scene);

      // Position each sphere slightly offset
      sphere.position.x = i * 5 - segments * 2.5;
      sphere.position.y = Math.random() * 2;
      sphere.position.z = Math.random() * 4 - 2;

      // Scale spheres randomly
      const scaleY = 0.6 + Math.random() * 0.2;
      sphere.scaling = new BABYLON.Vector3(1, scaleY, 1);

      // Parent to cloud
      sphere.parent = cloud as unknown as import('babylonjs').TransformNode;

      // Create cloud material
      const cloudMaterial = new BABYLON.StandardMaterial('cloudMat', this.scene as import('babylonjs').Scene);
      cloudMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
      cloudMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
      cloudMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
      cloudMaterial.alpha = 0.8;
      sphere.material = cloudMaterial;

      // Store material reference
      materials.push(cloudMaterial);
    }

    (cloud as { materials: unknown[] }).materials = materials;
    return cloud;
  }

  /**
   * Get random position for cloud
   */
  private getRandomPosition(): { x: number; y: number; z: number } {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.config.boundaryRadius;
    const height = this.config.minHeight + Math.random() * (this.config.maxHeight - this.config.minHeight);

    return {
      x: Math.cos(angle) * radius,
      y: height,
      z: Math.sin(angle) * radius,
    };
  }

  /**
   * Update cloud positions
   */
  update(_deltaTime: number): void {
    for (const cloud of this.clouds) {
      // Move cloud
      const mesh = cloud.mesh as { position: { x: number; y: number; z: number } };
      mesh.position.x += cloud.direction.x * cloud.speed;
      mesh.position.y += cloud.direction.y * cloud.speed;
      mesh.position.z += cloud.direction.z * cloud.speed;

      // Check boundaries and wrap around if needed
      const pos = mesh.position;
      const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

      if (dist > this.config.boundaryRadius) {
        // Reset to opposite side
        const angle = Math.atan2(pos.z, pos.x);
        mesh.position.x = -Math.cos(angle) * this.config.boundaryRadius * 0.9;
        mesh.position.z = -Math.sin(angle) * this.config.boundaryRadius * 0.9;
      }

      // Gentle rotation
      const rotMesh = cloud.mesh as { rotation: { y: number } };
      rotMesh.rotation.y += 0.001;
    }
  }

  /**
   * Adjust cloud appearance based on time of day
   */
  setTimeOfDay(hours: number): void {
    const isSunrise = hours >= 5 && hours <= 7;
    const isSunset = hours >= 17 && hours <= 19;
    const isNight = hours < 5 || hours > 19;

    for (const cloud of this.clouds) {
      for (const material of cloud.materials) {
        const mat = material as {
          alpha: number;
          emissiveColor: { r: number; g: number; b: number };
        };

        if (isNight) {
          mat.alpha = 0.4;
          mat.emissiveColor = { r: 0.1, g: 0.1, b: 0.2 };
        } else if (isSunrise) {
          mat.alpha = 0.7;
          mat.emissiveColor = { r: 1, g: 0.7, b: 0.5 };
        } else if (isSunset) {
          mat.alpha = 0.7;
          mat.emissiveColor = { r: 1, g: 0.5, b: 0.3 };
        } else {
          mat.alpha = 0.8;
          mat.emissiveColor = { r: 0.9, g: 0.9, b: 0.9 };
        }
      }
    }
  }

  /**
   * Set weather/cloudiness
   * @param cloudiness - 0 = clear, 1 = overcast
   */
  setWeather(cloudiness: number): void {
    for (const cloud of this.clouds) {
      for (const material of cloud.materials) {
        const mat = material as { alpha: number };
        mat.alpha = 0.4 + cloudiness * 0.4;
      }
    }
  }

  /**
   * Get cloud count
   */
  getCloudCount(): number {
    return this.clouds.length;
  }

  /**
   * Dispose of cloud resources
   */
  dispose(): void {
    for (const cloud of this.clouds) {
      const mesh = cloud.mesh as { dispose: () => void };
      mesh.dispose();
    }

    this.clouds = [];
    this.initialized = false;
    console.log('CloudSystem disposed');
  }
}