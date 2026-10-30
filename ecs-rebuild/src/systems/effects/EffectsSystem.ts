/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Effects System
 * 
 * Manages visual effects like blood decals, particles, etc.
 * Ported from MyHavokSimCode/Effects/BloodDecalManager.js
 */

import { System } from '../../core/System.ts';
import type { World } from '../../core/World.ts';

/**
 * Effects configuration
 */
export interface EffectsConfig {
  maxDecals: number;
  enableBloodEffects: boolean;
  enableParticleEffects: boolean;
}

/**
 * Default effects configuration
 */
const DEFAULT_CONFIG: EffectsConfig = {
  maxDecals: 50,
  enableBloodEffects: true,
  enableParticleEffects: true,
};

/**
 * EffectsSystem manages visual effects
 */
export class EffectsSystem extends System {
  readonly componentSignature = new Set(['Effect']);
  readonly priority = 700; // Run late, after rendering

  private scene: unknown = null;
  private config: EffectsConfig;
  private decals: unknown[] = [];
  private decalMaterial: unknown = null;
  private initialized = false;

  constructor(world: World, scene: unknown, config: Partial<EffectsConfig> = {}) {
    super(world);
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the effects system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('EffectsSystem already initialized');
      return;
    }

    console.log('Initializing effects system...');

    if (this.config.enableBloodEffects) {
      this.createDecalMaterial();
    }

    this.initialized = true;
    console.log('EffectsSystem initialized');
  }

  /**
   * Create reusable decal material
   */
  private createDecalMaterial(): void {
    const BABYLON = (window as any).BABYLON;
    if (!BABYLON || !this.scene) return;

    this.decalMaterial = new BABYLON.StandardMaterial('bloodDecalMaterial', this.scene as import('babylonjs').Scene);
    (this.decalMaterial as { diffuseTexture: unknown }).diffuseTexture = new BABYLON.Texture(
      'https://www.babylonjs-playground.com/textures/impact.png',
      this.scene as import('babylonjs').Scene
    );
    (this.decalMaterial as { diffuseTexture: { hasAlpha: boolean } }).diffuseTexture.hasAlpha = true;
    (this.decalMaterial as { zOffset: number }).zOffset = -2;
  }

  /**
   * Create a blood decal at position
   */
  createBloodDecal(position: { x: number; y: number; z: number }): void {
    if (!this.config.enableBloodEffects || !this.decalMaterial) return;

    const BABYLON = (window as any).BABYLON;
    if (!BABYLON || !this.scene) return;

    // Remove oldest decal if at max
    if (this.decals.length >= this.config.maxDecals) {
      const oldestDecal = this.decals.shift();
      if (oldestDecal) {
        (oldestDecal as { dispose: () => void }).dispose();
      }
    }

    const decalSize = new BABYLON.Vector3(2, 2, 2);
    const groundMesh = (this.scene as { getMeshByName: (name: string) => unknown }).getMeshByName('ground');

    if (!groundMesh) {
      console.warn('Ground mesh not found for decal');
      return;
    }

    const decal = BABYLON.MeshBuilder.CreateDecal(
      'bloodDecal',
      groundMesh,
      {
        position: new BABYLON.Vector3(position.x, position.y, position.z),
        normal: new BABYLON.Vector3(0, 1, 0),
        size: decalSize,
      },
      this.scene as import('babylonjs').Scene
    );

    (decal as { material: unknown }).material = this.decalMaterial;
    this.decals.push(decal);
  }

  /**
   * Create particle effect at position
   */
  createParticleEffect(position: { x: number; y: number; z: number }, type: string): void {
    if (!this.config.enableParticleEffects) return;

    const BABYLON = (window as any).BABYLON;
    if (!BABYLON || !this.scene) return;

    // Create particle system based on type
    const particleSystem = new BABYLON.ParticleSystem(type, 100, this.scene as import('babylonjs').Scene);

    // Configure based on type
    switch (type) {
      case 'blood':
        particleSystem.particleTexture = new BABYLON.Texture(
          'https://www.babylonjs-playground.com/textures/flare.png',
          this.scene as import('babylonjs').Scene
        );
        particleSystem.color1 = new BABYLON.Color4(0.8, 0, 0, 1);
        particleSystem.color2 = new BABYLON.Color4(0.5, 0, 0, 1);
        particleSystem.colorDead = new BABYLON.Color4(0.2, 0, 0, 0);
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        particleSystem.minLifeTime = 0.5;
        particleSystem.maxLifeTime = 1.5;
        particleSystem.emitRate = 50;
        break;

      case 'dust':
        particleSystem.particleTexture = new BABYLON.Texture(
          'https://www.babylonjs-playground.com/textures/flare.png',
          this.scene as import('babylonjs').Scene
        );
        particleSystem.color1 = new BABYLON.Color4(0.6, 0.5, 0.4, 0.5);
        particleSystem.color2 = new BABYLON.Color4(0.4, 0.3, 0.2, 0.3);
        particleSystem.minSize = 0.2;
        particleSystem.maxSize = 0.5;
        particleSystem.minLifeTime = 1;
        particleSystem.maxLifeTime = 3;
        particleSystem.emitRate = 20;
        break;

      default:
        particleSystem.particleTexture = new BABYLON.Texture(
          'https://www.babylonjs-playground.com/textures/flare.png',
          this.scene as import('babylonjs').Scene
        );
    }

    // Set emitter position
    particleSystem.emitter = new BABYLON.Vector3(position.x, position.y, position.z);

    // Start and stop after short duration
    particleSystem.start();
    setTimeout(() => {
      particleSystem.stop();
      setTimeout(() => particleSystem.dispose(), 3000);
    }, 500);
  }

  /**
   * Clear all decals
   */
  clearDecals(): void {
    for (const decal of this.decals) {
      (decal as { dispose: () => void }).dispose();
    }
    this.decals = [];
  }

  /**
   * Get decal count
   */
  getDecalCount(): number {
    return this.decals.length;
  }

  /**
   * Update system
   */
  update(_deltaTime: number): void {
    // Effects are triggered by events, not updated per frame
  }

  /**
   * Dispose of effects resources
   */
  dispose(): void {
    this.clearDecals();

    if (this.decalMaterial) {
      (this.decalMaterial as { dispose: () => void }).dispose();
      this.decalMaterial = null;
    }

    this.initialized = false;
    console.log('EffectsSystem disposed');
  }
}