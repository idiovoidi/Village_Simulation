/**
 * Game Manager
 * 
 * Main coordinator for the simulation.
 * Initializes the world, systems, and manages the game loop.
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
import { ZombieBehaviorSystem } from '../systems/ai/ZombieBehaviorSystem';
import { ThreatAssessmentSystem } from '../systems/ai/ThreatAssessmentSystem';
import { EntityFactory } from '../factories/EntityFactory';
import { SpatialGrid } from '../utils/SpatialGrid';
import { Logger } from '../utils/Logger';
import { createTimeOfDayComponent } from '../components/WorldComponents';

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
  private spatialGrid: SpatialGrid;
  private logger: Logger;
  
  private running = false;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.logger = new Logger();
    this.logger.info('GameManager', 'Initializing Game Manager...');
    
    // PROOF: This is the NEW TypeScript ECS rebuild!
    console.log('%c🎮 TYPESCRIPT ECS REBUILD ACTIVE 🎮', 'background: #4CAF50; color: white; font-size: 20px; padding: 10px; font-weight: bold;');
    console.log('%cRunning from: ecs-rebuild/src/managers/GameManager.ts', 'color: #2196F3; font-size: 14px;');

    // Create world
    this.world = new World();

    // Create spatial grid for efficient queries
    this.spatialGrid = new SpatialGrid(20);

    // Create renderer (but don't initialize yet)
    this.renderer = new BabylonRenderer(canvas);
    
    // Pathfinding manager doesn't need scene
    this.pathfindingManager = new PathfindingManager();

    // Create entity factory
    this.entityFactory = new EntityFactory(this.world);

    this.logger.info('GameManager', 'Game Manager initialized');
  }

  /**
   * Initializes all systems and starts the simulation.
   */
  async initialize(): Promise<void> {
    this.logger.info('GameManager', 'Initializing systems...');

    try {
      // Initialize renderer first
      await this.renderer.initialize();
      this.logger.info('GameManager', 'Renderer initialized');

      // Now create managers that need the scene
      this.cameraManager = new CameraManager(this.renderer.getScene(), this.renderer.getCanvas());
      this.lightingManager = new LightingManager(this.renderer.getScene());

      // Initialize Havok Physics
      const havokInstance = await this.initializeHavok();
      this.logger.info('GameManager', 'Havok Physics initialized');

      // Register systems in priority order
      await this.registerSystems(havokInstance);

      // Create world entities
      this.createWorldEntities();

      // Create some test entities
      this.createTestEntities();

      // Initialize camera
      this.cameraManager.initialize();

      // Initialize lighting
      this.lightingManager.initialize();

      this.logger.info('GameManager', 'All systems initialized successfully');
    } catch (error) {
      this.logger.error('GameManager', 'Failed to initialize systems', error);
      throw error;
    }
  }

  /**
   * Initializes Havok Physics.
   */
  private async initializeHavok(): Promise<any> {
    return new Promise((resolve, reject) => {
      const checkHavok = () => {
        if ((window as any).HavokPhysics) {
          (window as any).HavokPhysics().then(resolve).catch(reject);
        } else {
          setTimeout(checkHavok, 100);
        }
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!(window as any).HavokPhysics) {
          reject(new Error('Havok Physics failed to load from CDN'));
        }
      }, 10000);

      checkHavok();
    });
  }

  /**
   * Registers all systems with the world.
   */
  private async registerSystems(havokInstance: any): Promise<void> {
    console.log('%c⚙️ Registering ECS Systems...', 'color: #9C27B0; font-size: 14px; font-weight: bold;');
    
    // AI Systems (100-199)
    const villagerScheduleSystem = new VillagerScheduleSystem(this.world);
    this.world.registerSystem(villagerScheduleSystem);
    console.log('  ✓ VillagerScheduleSystem (Priority: 105)');
    
    this.world.registerSystem(new ThreatAssessmentSystem(this.world, this.spatialGrid));
    console.log('  ✓ ThreatAssessmentSystem (Priority: 108)');
    
    this.world.registerSystem(new DecisionSystem(this.world));
    console.log('  ✓ DecisionSystem (Priority: 110)');
    
    this.world.registerSystem(new ZombieBehaviorSystem(this.world, this.spatialGrid));
    console.log('  ✓ ZombieBehaviorSystem (Priority: 115)');
    
    this.world.registerSystem(new SteeringSystem(this.world));
    console.log('  ✓ SteeringSystem (Priority: 120)');
    
    this.world.registerSystem(new PathfindingSystem(this.world, this.pathfindingManager));
    console.log('  ✓ PathfindingSystem (Priority: 125)');
    
    this.world.registerSystem(new FlockingSystem(this.world, this.spatialGrid));
    console.log('  ✓ FlockingSystem (Priority: 130)');

    // Initialize villager schedule system
    if (villagerScheduleSystem.initialize) {
      villagerScheduleSystem.initialize();
    }

    // Physics System (200-299)
    const physicsSystem = new PhysicsSystem(this.world);
    await physicsSystem.initializePhysics(havokInstance);
    this.world.registerSystem(physicsSystem);
    console.log('  ✓ PhysicsSystem (Priority: 200)');

    // Rendering System (600-699)
    this.world.registerSystem(new RenderSystem(this.world, this.renderer.getScene()));
    console.log('  ✓ RenderSystem (Priority: 600)');

    console.log(`%c✅ Registered ${this.world.systemCount} ECS Systems`, 'color: #4CAF50; font-size: 14px; font-weight: bold;');
    this.logger.info('GameManager', `Registered ${this.world.systemCount} systems`);
  }

  /**
   * Creates world entities (time, weather, etc.).
   */
  private createWorldEntities(): void {
    // Create TimeOfDay entity (singleton)
    const timeEntity = this.world.createEntity();
    this.world.addComponent(timeEntity, createTimeOfDayComponent(6, 0, 1.0));
    
    this.logger.info('GameManager', 'World entities created');
  }

  /**
   * Creates test entities for demonstration.
   */
  private createTestEntities(): void {
    console.log('%c🏗️ Creating ECS Entities...', 'color: #FF9800; font-size: 14px; font-weight: bold;');
    
    // Create a few villagers
    for (let i = 0; i < 3; i++) {
      const x = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      this.entityFactory.createVillager({ x, y: 1, z });
    }
    console.log('  ✓ Created 3 villagers');

    // Create a zombie
    this.entityFactory.createZombie({ x: 10, y: 1, z: 10 });
    console.log('  ✓ Created 1 zombie');

    // Create some fish
    for (let i = 0; i < 5; i++) {
      const x = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 30;
      this.entityFactory.createFish({ x, y: -3, z });
    }
    console.log('  ✓ Created 5 fish');

    // Create some birds
    for (let i = 0; i < 5; i++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      this.entityFactory.createBird({ x, y: 15, z });
    }
    console.log('  ✓ Created 5 birds');

    console.log(`%c✅ Total ECS Entities: ${this.world.entityCount}`, 'color: #4CAF50; font-size: 14px; font-weight: bold;');
    this.logger.info('GameManager', `Created ${this.world.entityCount} entities`);
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
   * Main update loop.
   */
  private update(): void {
    if (!this.running) return;

    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Cap delta time to prevent large jumps
    const cappedDeltaTime = Math.min(deltaTime, 0.1);

    // Update all systems
    this.world.update(cappedDeltaTime);
  }

  /**
   * Cleans up resources.
   */
  dispose(): void {
    this.logger.info('GameManager', 'Disposing Game Manager...');
    
    this.stop();
    this.world.clear();
    this.renderer.dispose();
    
    this.logger.info('GameManager', 'Game Manager disposed');
  }

  /**
   * Gets the world instance.
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Gets the entity factory.
   */
  getEntityFactory(): EntityFactory {
    return this.entityFactory;
  }

  /**
   * Gets the renderer.
   */
  getRenderer(): BabylonRenderer {
    return this.renderer;
  }
}
