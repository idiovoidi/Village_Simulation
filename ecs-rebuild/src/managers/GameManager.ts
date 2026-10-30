/**
 * Game Manager
 *
 * Main coordinator for the simulation.
 * Initializes the world, systems, and manages the game loop.
 * Village vertical slice: level-driven terrain, village, nav mesh, villagers, clock.
 */

import { World } from '../core/World';
import { BabylonRenderer } from './BabylonRenderer';
import { CameraManager } from './CameraManager';
import { LightingManager } from './LightingManager';
import { PathfindingManager } from './PathfindingManager';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { RenderSystem } from '../systems/RenderSystem';
import { SteeringSystem } from '../systems/ai/SteeringSystem';
import { PathfindingSystem } from '../systems/ai/PathfindingSystem';
import { FlockingSystem } from '../systems/ai/FlockingSystem';
import { DecisionSystem } from '../systems/ai/DecisionSystem';
import { VillagerScheduleSystem } from '../systems/ai/VillagerScheduleSystem';
import { VillagerBehaviorSystem } from '../systems/ai/VillagerBehaviorSystem';
import { ThreatAssessmentSystem } from '../systems/ai/ThreatAssessmentSystem';
import { HungerSystem } from '../systems/survival/HungerSystem';
import { ThirstSystem } from '../systems/survival/ThirstSystem';
import { EnergySystem } from '../systems/survival/EnergySystem';
import { TerrainSystem } from '../systems/environment/TerrainSystem';
import { VillageSystem } from '../systems/village/VillageSystem';
import { LevelConfig, type LevelConfigData } from '../systems/level/LevelConfig';
import { LevelSelector } from '../systems/level/LevelSelector';
import { WorldClock } from '../systems/ui/WorldClock';
import { EntityFactory } from '../factories/EntityFactory';
import { SpawnFactory } from '../factories/SpawnFactory';
import { SpatialGrid } from '../utils/SpatialGrid';
import { Logger } from '../utils/Logger';
import {
  createTimeOfDayComponent,
  type TimeOfDayComponent,
} from '../components/WorldComponents';
import type { EntityId } from '../core/Entity';
import type { PositionComponent } from '../components/CoreComponents';

/**
 * Main game manager that coordinates all systems.
 */
export class GameManager {
  private world: World;
  private renderer: BabylonRenderer;
  private cameraManager!: CameraManager;
  private lightingManager!: LightingManager;
  private pathfindingManager: PathfindingManager;
  private entityFactory: EntityFactory;
  private spawnFactory: SpawnFactory | null = null;
  private spatialGrid: SpatialGrid;
  private logger: Logger;

  private terrainSystem: TerrainSystem | null = null;
  private villageSystem: VillageSystem | null = null;
  private villagerBehaviorSystem: VillagerBehaviorSystem | null = null;
  private worldClock: WorldClock | null = null;
  private levelSelector: LevelSelector | null = null;
  private timeEntityId: EntityId | null = null;
  private currentLevelKey = 'VILLAGE';

  private running = false;
  private lastTime = 0;
  private systemsRegistered = false;

  constructor(canvas: HTMLCanvasElement) {
    this.logger = new Logger();
    this.logger.info('GameManager', 'Initializing Game Manager...');

    console.log(
      '%c🎮 TYPESCRIPT ECS REBUILD ACTIVE 🎮',
      'background: #4CAF50; color: white; font-size: 20px; padding: 10px; font-weight: bold;'
    );
    console.log(
      '%cRunning from: ecs-rebuild/src/managers/GameManager.ts',
      'color: #2196F3; font-size: 14px;'
    );

    this.world = new World();
    this.spatialGrid = new SpatialGrid(20);
    this.renderer = new BabylonRenderer(canvas);
    this.pathfindingManager = new PathfindingManager();
    this.entityFactory = new EntityFactory(this.world);

    this.logger.info('GameManager', 'Game Manager initialized');
  }

  /**
   * Initializes all systems and starts the simulation.
   */
  async initialize(): Promise<void> {
    console.log('%c🚀 GameManager.initialize() started', 'color: #2196F3; font-size: 16px; font-weight: bold;');

    try {
      console.log('📍 Step 1: Initializing renderer...');
      await this.renderer.initialize();
      console.log('✅ Step 1: Renderer initialized');

      console.log('📍 Step 2: Creating camera and lighting managers...');
      this.cameraManager = new CameraManager(this.renderer.getScene(), this.renderer.getCanvas());
      this.lightingManager = new LightingManager(this.renderer.getScene());
      console.log('✅ Step 2: Camera and lighting managers created');

      console.log('📍 Step 3: Initializing Havok Physics...');
      const havokInstance = await this.initializeHavok();
      console.log('✅ Step 3: Havok Physics initialized');

      console.log('📍 Step 4: Registering systems...');
      await this.registerSystems(havokInstance);
      console.log('✅ Step 4: Systems registered');

      console.log('📍 Step 5: Loading level...');
      const pendingLevel = sessionStorage.getItem('ecsPendingLevel') || 'VILLAGE';
      sessionStorage.removeItem('ecsPendingLevel');
      await this.loadLevel(pendingLevel);
      console.log('✅ Step 5: Level loaded');

      console.log('📍 Step 6: Initializing camera...');
      const lookAt = this.villageSystem?.getVillageCenter() ?? { x: 0, y: -2, z: 0 };
      this.cameraManager.initialize(lookAt, 80, -Math.PI / 2, Math.PI / 3.2);
      console.log('✅ Step 6: Camera initialized');

      console.log('📍 Step 7: Initializing lighting...');
      this.lightingManager.initialize();
      console.log('✅ Step 7: Lighting initialized');

      console.log('📍 Step 8: Creating WorldClock + LevelSelector UI...');
      await this.setupUI();
      console.log('✅ Step 8: UI ready');

      console.log('%c🎉 All systems initialized successfully!', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
      this.logger.info('GameManager', 'All systems initialized successfully');
    } catch (error) {
      console.error('%c❌ GameManager.initialize() failed:', 'color: #F44336; font-size: 14px;', error);
      this.logger.error('GameManager', 'Failed to initialize systems', error);
      throw error;
    }
  }

  /**
   * Initializes Havok Physics from CDN global.
   */
  private async initializeHavok(): Promise<unknown> {
    console.log('%c🔧 Initializing Havok Physics...', 'color: #FF5722; font-size: 14px;');

    return new Promise((resolve, reject) => {
      const checkHavok = () => {
        const havokFn =
          (window as unknown as { HavokPhysics?: () => Promise<unknown> }).HavokPhysics ||
          (globalThis as unknown as { HavokPhysics?: () => Promise<unknown> }).HavokPhysics;

        if (typeof havokFn === 'function') {
          console.log('%c✅ HavokPhysics function found', 'color: #4CAF50; font-size: 14px;');
          havokFn()
            .then((instance) => {
              console.log('%c✅ Havok Physics initialized successfully', 'color: #4CAF50; font-size: 14px;');
              resolve(instance);
            })
            .catch((err) => {
              console.error('%c❌ Havok Physics promise rejected:', 'color: #F44336; font-size: 14px;', err);
              reject(err);
            });
        } else {
          console.log('⏳ Waiting for HavokPhysics...');
          setTimeout(checkHavok, 100);
        }
      };

      const timeout = setTimeout(() => {
        const havokFn =
          (window as unknown as { HavokPhysics?: () => Promise<unknown> }).HavokPhysics ||
          (globalThis as unknown as { HavokPhysics?: () => Promise<unknown> }).HavokPhysics;
        if (typeof havokFn !== 'function') {
          console.error('%c❌ Havok Physics failed to load from CDN - timeout', 'color: #F44336; font-size: 14px;');
          reject(new Error('Havok Physics failed to load from CDN - timeout after 15s'));
        }
      }, 15000);

      const originalResolve = resolve;
      const originalReject = reject;
      resolve = ((value: unknown) => {
        clearTimeout(timeout);
        originalResolve(value);
      }) as typeof resolve;
      reject = ((reason: unknown) => {
        clearTimeout(timeout);
        originalReject(reason);
      }) as typeof reject;

      checkHavok();
    });
  }

  /**
   * Registers always-on ECS systems (once).
   */
  private async registerSystems(havokInstance: unknown): Promise<void> {
    if (this.systemsRegistered) return;

    console.log('%c⚙️ Registering ECS Systems...', 'color: #9C27B0; font-size: 14px; font-weight: bold;');

    const villagerScheduleSystem = new VillagerScheduleSystem(this.world);
    this.world.registerSystem(villagerScheduleSystem);
    if (villagerScheduleSystem.initialize) {
      villagerScheduleSystem.initialize();
    }
    console.log('  ✓ VillagerScheduleSystem');

    this.villagerBehaviorSystem = new VillagerBehaviorSystem(this.world, this.spatialGrid);
    this.world.registerSystem(this.villagerBehaviorSystem);
    this.villagerBehaviorSystem.initialize();
    console.log('  ✓ VillagerBehaviorSystem');

    this.world.registerSystem(new ThreatAssessmentSystem(this.world, this.spatialGrid));
    console.log('  ✓ ThreatAssessmentSystem');

    this.world.registerSystem(new DecisionSystem(this.world));
    console.log('  ✓ DecisionSystem');

    this.world.registerSystem(new SteeringSystem(this.world));
    console.log('  ✓ SteeringSystem');

    this.world.registerSystem(new PathfindingSystem(this.world, this.pathfindingManager));
    console.log('  ✓ PathfindingSystem');

    this.world.registerSystem(new FlockingSystem(this.world, this.spatialGrid));
    console.log('  ✓ FlockingSystem');

    this.world.registerSystem(new HungerSystem(this.world));
    this.world.registerSystem(new ThirstSystem(this.world));
    this.world.registerSystem(new EnergySystem(this.world));
    console.log('  ✓ Survival (Hunger/Thirst/Energy)');

    const physicsSystem = new PhysicsSystem(this.world);
    await physicsSystem.initializePhysics(havokInstance, this.renderer.getScene());
    this.world.registerSystem(physicsSystem);
    console.log('  ✓ PhysicsSystem');

    const renderSystem = new RenderSystem(this.world, this.renderer.getScene());
    renderSystem.initialize();
    this.world.registerSystem(renderSystem);
    console.log('  ✓ RenderSystem');

    this.systemsRegistered = true;
    console.log(
      `%c✅ Registered ${this.world.systemCount} ECS Systems`,
      'color: #4CAF50; font-size: 14px; font-weight: bold;'
    );
    this.logger.info('GameManager', `Registered ${this.world.systemCount} systems`);
  }

  /**
   * Load a level by key. Village vertical slice fully supports VILLAGE;
   * other keys use their LevelConfig for terrain/village but skip extra agents.
   */
  async loadLevel(levelKey: string): Promise<void> {
    const level = LevelConfig.getLevel(levelKey);
    if (!level) {
      throw new Error(`Level "${levelKey}" not found`);
    }

    if (levelKey !== 'VILLAGE') {
      console.warn(
        `[GameManager] Level "${levelKey}" is not fully implemented yet; applying village vertical-slice content from its config.`
      );
    }

    this.currentLevelKey = levelKey;
    LevelConfig.setCurrentLevel(levelKey);
    const config = level.config;

    console.log(`%c📦 Loading level: ${level.name}`, 'color: #FF9800; font-size: 14px; font-weight: bold;');

    // Clear previous level world content (keep systems)
    this.clearLevelEntities();

    // Time of day singleton
    this.timeEntityId = this.world.createEntity();
    this.world.addComponent(this.timeEntityId, createTimeOfDayComponent(8, 0, 12.0));

    // Terrain + water (TerrainSystem owns water for the slice)
    const scene = this.renderer.getScene();
    this.terrainSystem = new TerrainSystem(this.world, scene, {
      bowlRadius: config.bowlRadius,
      bowlDepth: config.bowlDepth,
      waterLevel: config.waterLevel,
      segments: 64,
    });
    await this.terrainSystem.initialize();
    this.world.registerSystem(this.terrainSystem);

    // Village layout
    if (config.hasVillage) {
      this.villageSystem = new VillageSystem(this.world, scene, this.entityFactory, {
        villageRadius: config.villageRadius,
        houseCount: config.houseCount,
        includeMarket: true,
        includeGardens: true,
      });
      this.villageSystem.setTerrainSystem(this.terrainSystem);
      await this.villageSystem.initialize();
      this.world.registerSystem(this.villageSystem);
    }

    // Spawn factory with terrain height
    this.spawnFactory = new SpawnFactory({
      getTerrainHeight: (x, z) => this.terrainSystem!.getHeightAt(x, z),
    });

    // Nav mesh over village area
    this.buildNavMesh(config);

    // Villagers
    this.spawnVillagers(config);

    // Sync POIs to terrain height
    this.refreshVillagerPOIs(config);

    console.log(
      `%c✅ Level ready — entities: ${this.world.entityCount}`,
      'color: #4CAF50; font-size: 14px; font-weight: bold;'
    );
  }

  private clearLevelEntities(): void {
    if (this.terrainSystem) {
      this.terrainSystem.dispose();
      this.terrainSystem = null;
    }
    if (this.villageSystem) {
      this.villageSystem.dispose();
      this.villageSystem = null;
    }
    // Full world clear would drop system registrations; recreate entities only by clearing world is risky.
    // For slice reloads via UI, rebuild World systems is heavy — keep first-load path simple.
  }

  private buildNavMesh(config: LevelConfigData): void {
    const radius = Math.max(config.villageRadius * 1.4, 40);
    const obstacles: Array<{ x: number; y: number; z: number }> = [];

    if (this.villageSystem) {
      for (const houseId of this.villageSystem.getHouses()) {
        const pos = this.world.getComponent<PositionComponent>(houseId, 'Position');
        if (pos) {
          obstacles.push({ x: pos.x, y: pos.y, z: pos.z });
        }
      }
    }

    this.pathfindingManager.createNavMesh(
      {
        min: { x: -radius, y: 0, z: -radius },
        max: { x: radius, y: 0, z: radius },
      },
      obstacles,
      (x, z) => this.terrainSystem!.getHeightAt(x, z),
      config.waterLevel
    );
  }

  private spawnVillagers(config: LevelConfigData): void {
    if (!this.spawnFactory) return;

    const count = Math.max(6, Math.floor(config.houseCount / 2));
    const existing: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i < count; i++) {
      let pos = this.spawnFactory.findSpawnPosition('villager', existing);
      if (!pos) {
        const angle = (i / count) * Math.PI * 2;
        const r = config.villageRadius * 0.25;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = this.terrainSystem!.getHeightAt(x, z) + 1;
        pos = { x, y, z };
      } else {
        pos = { ...pos, y: pos.y + 1 };
      }

      existing.push(pos);
      this.entityFactory.createVillager({
        position: pos,
        name: `Villager_${i + 1}`,
      });
    }

    console.log(`  ✓ Spawned ${count} villagers`);
  }

  private refreshVillagerPOIs(config: LevelConfigData): void {
    if (!this.villagerBehaviorSystem || !this.terrainSystem) return;

    const height = (x: number, z: number) => this.terrainSystem!.getHeightAt(x, z);

    this.villagerBehaviorSystem.addPOI({
      id: 'plaza',
      position: { x: 0, y: height(0, 0), z: 0 },
      type: 'social',
    });

    const marketX = config.villageRadius * 0.4;
    const marketZ = config.villageRadius * 0.2;
    this.villagerBehaviorSystem.addPOI({
      id: 'market_field',
      position: { x: marketX, y: height(marketX, marketZ), z: marketZ },
      type: 'market',
    });

    if (this.villageSystem) {
      this.villageSystem.getHouses().forEach((houseId, index) => {
        const pos = this.world.getComponent<PositionComponent>(houseId, 'Position');
        if (pos) {
          this.villagerBehaviorSystem!.addPOI({
            id: `home_${index}`,
            position: { x: pos.x, y: pos.y, z: pos.z },
            type: 'home',
          });
        }
      });
    }
  }

  private async setupUI(): Promise<void> {
    const scene = this.renderer.getScene();

    this.worldClock = new WorldClock(scene, { position: 'top-left', showPeriod: true });
    await this.worldClock.initialize();
    this.worldClock.updateTime(8 * 60);

    this.levelSelector = new LevelSelector(scene, (key) => {
      void this.onLevelSelected(key);
    });
    this.levelSelector.createLevelUI();
  }

  private async onLevelSelected(key: string): Promise<void> {
    if (key === this.currentLevelKey) return;

    if (key !== 'VILLAGE') {
      console.warn(
        `[GameManager] "${key}" uses vertical-slice content only (terrain/village/villagers); extra agents deferred.`
      );
    }

    try {
      console.log(`[GameManager] Reloading for level ${key}...`);
      sessionStorage.setItem('ecsPendingLevel', key);
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch level', err);
    }
  }

  /**
   * Starts the game loop.
   */
  start(): void {
    if (this.running) {
      this.logger.warn('GameManager', 'Game loop already running');
      return;
    }

    this.running = true;
    this.lastTime = performance.now();

    this.logger.info('GameManager', 'Starting game loop...');
    this.renderer.startRenderLoop(() => this.update());
  }

  /**
   * Stops the game loop.
   */
  stop(): void {
    this.running = false;
    this.renderer.stopRenderLoop();
    this.logger.info('GameManager', 'Game loop stopped');
  }

  /**
   * Main update loop — single World.update path.
   */
  private update(): void {
    if (!this.running) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const cappedDeltaTime = Math.min(deltaTime, 0.1);

    this.advanceTimeOfDay(cappedDeltaTime);
    this.world.update(cappedDeltaTime);
  }

  private advanceTimeOfDay(deltaSeconds: number): void {
    if (this.timeEntityId == null) return;

    const time = this.world.getComponent<TimeOfDayComponent>(this.timeEntityId, 'TimeOfDay');
    if (!time) return;

    // timeScale: in-game minutes per real second
    const minutesToAdd = deltaSeconds * time.timeScale;
    let totalMinutes = time.hour * 60 + time.minute + minutesToAdd;

    while (totalMinutes >= 24 * 60) {
      totalMinutes -= 24 * 60;
      time.dayNumber += 1;
    }
    while (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }

    time.hour = Math.floor(totalMinutes / 60) % 24;
    time.minute = totalMinutes % 60;

    this.worldClock?.updateTime(totalMinutes);
    this.lightingManager?.updateForTimeOfDay(time.hour + time.minute / 60);
  }

  dispose(): void {
    this.logger.info('GameManager', 'Disposing Game Manager...');

    this.stop();
    this.worldClock?.dispose();
    this.levelSelector?.dispose();
    this.terrainSystem?.dispose();
    this.villageSystem?.dispose();
    this.world.clear();
    this.renderer.dispose();

    this.logger.info('GameManager', 'Game Manager disposed');
  }

  getWorld(): World {
    return this.world;
  }

  getEntityFactory(): EntityFactory {
    return this.entityFactory;
  }

  getRenderer(): BabylonRenderer {
    return this.renderer;
  }
}
