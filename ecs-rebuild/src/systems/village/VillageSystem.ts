/**
 * Village System
 *
 * Creates and manages the village with houses, roads, and decorations.
 * Ported from MyHavokSimCode/VillageSystem.js
 */

import { System } from '../../core/System';
import type { World } from '../../core/World';
import type { EntityId } from '../../core/Entity';
import type { PositionComponent } from '../../components/CoreComponents';
import { EntityFactory } from '../../factories/EntityFactory';
import { TerrainSystem } from '../environment/TerrainSystem';

/**
 * Village configuration
 */
export interface VillageConfig {
  villageRadius: number;
  houseCount: number;
  includeMarket: boolean;
  includeGardens: boolean;
}

/**
 * Default village configuration
 */
const DEFAULT_CONFIG: VillageConfig = {
  villageRadius: 60,
  houseCount: 15,
  includeMarket: true,
  includeGardens: true,
};

/**
 * VillageSystem creates and manages the village
 */
export class VillageSystem extends System {
  readonly componentSignature = new Set(['Village']);
  readonly priority = 15; // Run after terrain

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scene: any = null;
  private config: VillageConfig;
  private entityFactory: EntityFactory;
  private terrainSystem: TerrainSystem | null = null;

  private houses: EntityId[] = [];
  private decorations: EntityId[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private roadMeshes: any[] = [];
  private initialized = false;

  // Village center
  private centerOffset = { x: 0, y: 0, z: 0 };

  constructor(
    world: World,
    scene: unknown,
    entityFactory: EntityFactory,
    config: Partial<VillageConfig> = {}
  ) {
    super(world);
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.entityFactory = entityFactory;
  }

  /**
   * Set terrain system for height queries
   */
  setTerrainSystem(terrainSystem: TerrainSystem): void {
    this.terrainSystem = terrainSystem;
  }

  /**
   * Initialize the village system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('VillageSystem already initialized');
      return;
    }

    console.log('Creating village...');

    this.centerOffset.y = this.getTerrainHeight(0, 0);

    // Create houses
    this.createHouses();

    // Create roads
    this.createRoads();

    // Create decorations
    this.createDecorations();

    // Create market if enabled
    if (this.config.includeMarket) {
      this.createMarket();
    }

    this.initialized = true;
    console.log('VillageSystem initialized');
  }

  /**
   * Create houses with proper layout
   */
  private createHouses(): void {
    const { houseCount, villageRadius } = this.config;

    for (let i = 0; i < houseCount; i++) {
      const angle = (i / houseCount) * Math.PI * 2;
      const radius = villageRadius * (0.3 + Math.random() * 0.5);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.getTerrainHeight(x, z);

      const houseEntity = this.entityFactory.createHouse({
        position: { x, y: y + 0.2, z },
        capacity: 4,
      });

      this.houses.push(houseEntity);
    }

    console.log(`Created ${this.houses.length} houses`);
  }

  /**
   * Create radial roads from center to each house
   */
  private createRoads(): void {
    if (!this.scene) {
      console.warn('VillageSystem: no scene for road meshes');
      return;
    }

    const BABYLON = (window as any).BABYLON;
    if (!BABYLON) return;

    const roadMat = new BABYLON.StandardMaterial('villageRoadMat', this.scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.45, 0.4, 0.35);
    roadMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

    for (let i = 0; i < this.houses.length; i++) {
      const houseId = this.houses[i];
      const posComp = this.world.getComponent<PositionComponent>(houseId, 'Position');
      if (!posComp) continue;

      const dx = posComp.x - this.centerOffset.x;
      const dz = posComp.z - this.centerOffset.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length < 1) continue;

      const midX = (this.centerOffset.x + posComp.x) / 2;
      const midZ = (this.centerOffset.z + posComp.z) / 2;
      const midY = this.getTerrainHeight(midX, midZ) + 0.08;

      const road = BABYLON.MeshBuilder.CreateBox(
        `road_${i}`,
        { width: 2.2, height: 0.12, depth: length },
        this.scene
      );
      road.position = new BABYLON.Vector3(midX, midY, midZ);
      road.rotation.y = Math.atan2(dx, dz);
      road.material = roadMat;
      this.roadMeshes.push(road);
    }

    // Plaza disk at center
    const plaza = BABYLON.MeshBuilder.CreateCylinder(
      'villagePlaza',
      { diameter: 12, height: 0.15, tessellation: 24 },
      this.scene
    );
    plaza.position = new BABYLON.Vector3(
      this.centerOffset.x,
      this.getTerrainHeight(0, 0) + 0.05,
      this.centerOffset.z
    );
    plaza.material = roadMat;
    this.roadMeshes.push(plaza);

    console.log(`Road network created (${this.roadMeshes.length} meshes)`);
  }

  /**
   * Create village decorations
   */
  private createDecorations(): void {
    const treeCount = 20;

    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.config.villageRadius * (0.6 + Math.random() * 0.4);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.getTerrainHeight(x, z);

      const treeEntity = this.entityFactory.createTree({
        position: { x, y, z },
        treeType: Math.random() > 0.5 ? 'oak' : 'pine',
        age: 5 + Math.floor(Math.random() * 15),
      });

      this.decorations.push(treeEntity);
    }

    const wellCount = 3;
    for (let i = 0; i < wellCount; i++) {
      const angle = (i / wellCount) * Math.PI * 2;
      const radius = this.config.villageRadius * 0.4;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.getTerrainHeight(x, z);

      const wellEntity = this.entityFactory.createWell({
        position: { x, y, z },
      });

      this.decorations.push(wellEntity);
    }

    console.log(`Created ${this.decorations.length} decorations`);
  }

  /**
   * Create market area
   */
  private createMarket(): void {
    const marketX = this.centerOffset.x + this.config.villageRadius * 0.4;
    const marketZ = this.centerOffset.z + this.config.villageRadius * 0.2;
    const marketY = this.getTerrainHeight(marketX, marketZ);

    this.entityFactory.createField({
      position: { x: marketX, y: marketY, z: marketZ },
      fieldType: 'market',
    });

    console.log('Market area created');
  }

  /**
   * Get terrain height at position
   */
  private getTerrainHeight(x: number, z: number): number {
    if (this.terrainSystem) {
      return this.terrainSystem.getHeightAt(x, z);
    }
    return TerrainSystem.getTerrainHeight(x, z);
  }

  getHouseCount(): number {
    return this.houses.length;
  }

  getHouses(): EntityId[] {
    return [...this.houses];
  }

  getVillageCenter(): { x: number; y: number; z: number } {
    return {
      x: this.centerOffset.x,
      y: this.getTerrainHeight(this.centerOffset.x, this.centerOffset.z),
      z: this.centerOffset.z,
    };
  }

  update(_deltaTime: number): void {
    // Village is static
  }

  dispose(): void {
    for (const mesh of this.roadMeshes) {
      if (mesh?.dispose) mesh.dispose();
    }
    this.roadMeshes = [];
    this.houses = [];
    this.decorations = [];
    this.initialized = false;
    console.log('VillageSystem disposed');
  }
}
