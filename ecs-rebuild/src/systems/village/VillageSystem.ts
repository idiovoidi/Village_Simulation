/**
 * Village System
 * 
 * Creates and manages the village with houses, roads, and decorations.
 * Ported from MyHavokSimCode/VillageSystem.js
 */

import { System } from '../../core/System';
import type { World } from '../../core/World';
import type { EntityId } from '../../core/Entity';
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

  private scene: unknown = null;
  private config: VillageConfig;
  private entityFactory: EntityFactory;
  private terrainSystem: TerrainSystem | null = null;
  
  private houses: unknown[] = [];
  private decorations: unknown[] = [];
  private roads: unknown[] = [];
  private initialized = false;

  // Village center
  private centerOffset = { x: 0, y: 0, z: 0 };

  constructor(world: World, scene: unknown, entityFactory: EntityFactory, config: Partial<VillageConfig> = {}) {
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

    // Create houses in a ring pattern around the center
    for (let i = 0; i < houseCount; i++) {
      const angle = (i / houseCount) * Math.PI * 2;
      const radius = villageRadius * (0.3 + Math.random() * 0.5);
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.getTerrainHeight(x, z);

      // Create house entity
      const houseEntity = this.entityFactory.createHouse({
        position: { x, y: y + 0.2, z },
        capacity: 4,
      });

      this.houses.push(houseEntity);
    }

    console.log(`Created ${this.houses.length} houses`);
  }

  /**
   * Create road network
   */
  private createRoads(): void {
    // Create roads connecting houses to center
    // For now, create simple paths from center to each house
    for (const house of this.houses) {
      // Road creation would go here
      // This is simplified - full implementation would use RoadNetworkSystem
    }

    console.log('Road network created');
  }

  /**
   * Create village decorations
   */
  private createDecorations(): void {
    // Create trees around the village
    const treeCount = 20;
    
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.config.villageRadius * (0.6 + Math.random() * 0.4);
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.getTerrainHeight(x, z);

      // Create tree entity
      const treeEntity = this.entityFactory.createTree({
        position: { x, y, z },
        treeType: Math.random() > 0.5 ? 'oak' : 'pine',
        age: 5 + Math.floor(Math.random() * 15),
      });

      this.decorations.push(treeEntity);
    }

    // Create some wells
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
    // Create market area to the east of village center
    const marketX = this.centerOffset.x + this.config.villageRadius * 0.4;
    const marketZ = this.centerOffset.z + this.config.villageRadius * 0.2;
    const marketY = this.getTerrainHeight(marketX, marketZ);

    // Create a field for the market
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
    // Fallback to static method
    return TerrainSystem.getTerrainHeight(x, z);
  }

  /**
   * Get house count
   */
  getHouseCount(): number {
    return this.houses.length;
  }

  /**
   * Get village center
   */
  getVillageCenter(): { x: number; y: number; z: number } {
    return { ...this.centerOffset };
  }

  /**
   * Update system (not used for static village)
   */
  update(_deltaTime: number): void {
    // Village is static, no per-frame updates needed
  }

  /**
   * Dispose of village resources
   */
  dispose(): void {
    this.houses = [];
    this.decorations = [];
    this.roads = [];
    this.initialized = false;
    console.log('VillageSystem disposed');
  }
}