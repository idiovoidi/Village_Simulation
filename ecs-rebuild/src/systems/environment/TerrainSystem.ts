/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Terrain System
 * 
 * Creates and manages the bowl-shaped terrain for the village simulation.
 * Ported from MyHavokSimCode/BowlCreator.js
 */

import type { World } from '../../core/World.ts';
import { System } from '../../core/System.ts';
import { valueNoise2 } from '../../utils/Noise.ts';

/**
 * Terrain configuration
 */
export interface TerrainConfig {
  bowlRadius: number;
  bowlDepth: number;
  segments: number;
  waterLevel: number;
  /** Optional bay/lake carved into one side of the bowl. */
  bay?: { angle: number; width: number; depth: number };
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
  private waterObserver: unknown = null;
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

  /** Config of the terrain most recently initialised (static for hot-path queries). */
  static getActiveConfig(): Readonly<TerrainConfig> {
    return TerrainSystem.activeConfig;
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

    for (let z = 0; z <= segments; z++) {
      for (let x = 0; x <= segments; x++) {
        const u = x / segments;
        const v = z / segments;
        const worldX = (u - 0.5) * 2 * bowlRadius;
        const worldZ = (v - 0.5) * 2 * bowlRadius;
        positions.push(worldX, TerrainSystem.getTerrainHeight(worldX, worldZ), worldZ);
        uvs.push(u, v);
      }
    }

    for (let z = 0; z < segments; z++) {
      for (let x = 0; x < segments; x++) {
        const topLeft = z * (segments + 1) + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * (segments + 1) + x;
        const bottomRight = bottomLeft + 1;
        indices.push(topLeft, topRight, bottomLeft);
        indices.push(topRight, bottomRight, bottomLeft);
      }
    }

    if (BABYLON?.VertexData?.ComputeNormals) {
      BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    }

    // Colours depend on slope, so they are computed after the normals.
    const vertexCount = positions.length / 3;
    for (let i = 0; i < vertexCount; i++) {
      const c = TerrainSystem.sampleColor(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2],
        normals[i * 3 + 1] ?? 1
      );
      colors.push(c[0], c[1], c[2], 1);
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

    // Carve a bay: a cone of lowered ground opening towards the rim, with a sandy beach.
    const bay = TerrainSystem.activeConfig.bay;
    if (bay) {
      let da = Math.atan2(z, x) - bay.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const t = Math.min(1, Math.max(0, (Math.abs(da) - bay.width * 0.55) / (bay.width * 0.45)));
      const angular = 1 - t * t * (3 - 2 * t);
      const r0 = Math.min(1, Math.max(0, (normalizedDist - 0.36) / 0.26));
      const radial = r0 * r0 * (3 - 2 * r0);
      const k = angular * radial;
      const r1 = Math.min(1, Math.max(0, (normalizedDist - 0.5) / 0.5));
      const seabed = waterLevel - bay.depth * (0.35 + 0.65 * r1 * r1 * (3 - 2 * r1));
      y = y + (seabed - y) * k;
    }

    return y;
  }

  /** Terrain albedo from height above water, slope and noise. */
  private static sampleColor(x: number, y: number, z: number, normalY: number): [number, number, number] {
    const { waterLevel } = TerrainSystem.activeConfig;
    const rel = y - waterLevel;
    const slope = 1 - Math.min(1, Math.max(0, normalY));
    const broad = valueNoise2(x * 0.045, z * 0.045);
    const fine = valueNoise2(x * 0.3, z * 0.3);

    const mix = (a: number[], b: number[], t: number): number[] => {
      const k = Math.min(1, Math.max(0, t));
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    };

    const seabed = [0.3, 0.3, 0.26];
    const sand = [0.8, 0.72, 0.5];
    const grassA = [0.4, 0.62, 0.22];
    const grassB = [0.3, 0.52, 0.2];
    const dry = [0.58, 0.62, 0.28];
    const forest = [0.2, 0.4, 0.18];
    const rock = [0.5, 0.47, 0.42];
    const peak = [0.72, 0.7, 0.68];

    let col: number[];
    if (rel < 0) {
      col = mix(seabed, [0.18, 0.22, 0.24], -rel / 6);
    } else {
      col = mix(sand, grassA, (rel - 0.2) / 1.4);
      const meadow = mix(grassA, grassB, broad);
      col = mix(col, mix(meadow, dry, Math.max(0, fine - 0.62) * 2.2), (rel - 0.3) / 1.4);
      col = mix(col, forest, (rel - 4.5) / 6);
      col = mix(col, rock, Math.max((rel - 11) / 6, (slope - 0.18) / 0.22));
      col = mix(col, peak, (rel - 20) / 10);
    }

    // Fine-grain brightness so large slopes don't look like flat paint.
    const grain = 0.92 + fine * 0.16;
    return [col[0] * grain, col[1] * grain, col[2] * grain];
  }

  /**
   * Create terrain material
   */
  private createTerrainMaterial(): unknown {
    const BABYLON = (window as any).BABYLON;
    if (!BABYLON) return null;

    const material = new BABYLON.StandardMaterial('terrainMaterial', this.scene);
    material.diffuseColor = new BABYLON.Color3(1, 1, 1);
    material.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    material.useVertexColors = true;
    material.backFaceCulling = false;
    material.twoSidedLighting = true;

    // Tiling grain texture adds close-up detail on top of the vertex colours.
    const size = 256;
    const tex = new BABYLON.DynamicTexture('terrainGrain', { width: size, height: size }, this.scene, true);
    const ctx = tex.getContext();
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < size * size; i++) {
      const px = i % size;
      const py = Math.floor(i / size);
      const n = valueNoise2(px * 0.12, py * 0.12) * 0.5 + Math.random() * 0.5;
      const v = Math.floor(205 + n * 50);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    tex.update();
    tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    tex.uScale = 60;
    tex.vScale = 60;
    material.diffuseTexture = tex;

    return material;
  }

  /**
   * Create the water surface.
   *
   * A grid whose vertex colour/alpha encode depth below the surface: shallows
   * are clear turquoise with a foam rim, deeps fade to dark blue. A scrolling
   * procedural normal map adds moving glints.
   */
  private createWater(): void {
    const BABYLON = (window as any).BABYLON;
    if (!BABYLON || !this.scene) return;

    const { waterLevel, bowlRadius } = this.config;
    const extent = bowlRadius * 0.98;
    const segments = 168;

    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let zi = 0; zi <= segments; zi++) {
      for (let xi = 0; xi <= segments; xi++) {
        const x = (xi / segments - 0.5) * 2 * extent;
        const z = (zi / segments - 0.5) * 2 * extent;
        const depth = waterLevel - TerrainSystem.getTerrainHeight(x, z);
        positions.push(x, waterLevel, z);
        normals.push(0, 1, 0);
        uvs.push(xi / segments, zi / segments);

        if (depth <= 0) {
          colors.push(0.6, 0.85, 0.9, 0);
        } else {
          const d = Math.min(1, depth / 7);
          const foam = Math.max(0, 1 - depth / 0.9);
          const r = 0.2 - 0.14 * d + foam * 0.55;
          const g = 0.62 - 0.4 * d + foam * 0.35;
          const b = 0.68 - 0.24 * d + foam * 0.3;
          const a = Math.pow(Math.min(1, depth / 1.6), 0.7) * 0.85;
          colors.push(r, g, b, a);
        }
      }
    }

    for (let zi = 0; zi < segments; zi++) {
      for (let xi = 0; xi < segments; xi++) {
        const a = zi * (segments + 1) + xi;
        const b = a + 1;
        const c = a + segments + 1;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    const water = new BABYLON.Mesh('water', this.scene);
    const vd = new BABYLON.VertexData();
    vd.positions = positions;
    vd.normals = normals;
    vd.colors = colors;
    vd.uvs = uvs;
    vd.indices = indices;
    vd.applyToMesh(water);
    water.hasVertexAlpha = true;
    water.isPickable = false;

    const mat = new BABYLON.StandardMaterial('waterMaterial', this.scene);
    mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    mat.specularColor = new BABYLON.Color3(0.9, 0.95, 1);
    mat.specularPower = 180;
    mat.useVertexColors = true;
    mat.backFaceCulling = false;
    mat.useSpecularOverAlpha = true;
    mat.bumpTexture = this.createWaterNormalMap();
    mat.bumpTexture.level = 0.22;
    mat.bumpTexture.uScale = 22;
    mat.bumpTexture.vScale = 22;
    water.material = mat;

    // Drift the normal map so the surface shimmers.
    this.waterObserver = (this.scene as any).onBeforeRenderObservable.add(() => {
      const t = performance.now() * 0.00004;
      mat.bumpTexture.uOffset = t;
      mat.bumpTexture.vOffset = t * 0.6;
    });

    this.waterMesh = water;
  }

  /** Tileable normal map built from summed sines (no asset download). */
  private createWaterNormalMap(): any {
    const BABYLON = (window as any).BABYLON;
    const size = 256;
    const tex = new BABYLON.DynamicTexture('waterNormals', { width: size, height: size }, this.scene, true);
    const ctx = tex.getContext();
    const img = ctx.createImageData(size, size);
    const TAU = Math.PI * 2;
    // Tileable value noise (lattice wraps) breaks up the sine regularity.
    const lattice = (n: number) => {
      const g: number[] = [];
      for (let i = 0; i < n * n; i++) g.push(Math.random());
      return (u: number, v: number) => {
        const x = (((u * n) % n) + n) % n;
        const y = (((v * n) % n) + n) % n;
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const fx = x - x0;
        const fy = y - y0;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const at = (xi: number, yi: number) => g[(yi % n) * n + (xi % n)];
        const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
        const bot = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
        return top + (bot - top) * sy;
      };
    };
    const n1 = lattice(6);
    const n2 = lattice(13);
    const n3 = lattice(29);
    const height = (u: number, v: number) =>
      (n1(u, v) - 0.5) * 1.1 +
      (n2(u + 0.31, v + 0.17) - 0.5) * 0.7 +
      (n3(u + 0.63, v + 0.52) - 0.5) * 0.35 +
      Math.sin((u * 3 + v * 2) * TAU) * 0.12;
    const e = 1 / size;
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const u = px / size;
        const v = py / size;
        const dx = (height(u + e, v) - height(u - e, v)) * 2.2;
        const dy = (height(u, v + e) - height(u, v - e)) * 2.2;
        const len = Math.hypot(dx, dy, 1);
        const i = (py * size + px) * 4;
        img.data[i] = Math.floor((-dx / len * 0.5 + 0.5) * 255);
        img.data[i + 1] = Math.floor((-dy / len * 0.5 + 0.5) * 255);
        img.data[i + 2] = Math.floor((1 / len * 0.5 + 0.5) * 255);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    tex.update();
    tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    return tex;
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

    if (this.waterObserver) {
      (this.scene as any).onBeforeRenderObservable.remove(this.waterObserver);
      this.waterObserver = null;
    }

    if (this.waterMesh) {
      (this.waterMesh as { dispose: () => void }).dispose();
      this.waterMesh = null;
    }

    this.initialized = false;
    console.log('TerrainSystem disposed');
  }
}