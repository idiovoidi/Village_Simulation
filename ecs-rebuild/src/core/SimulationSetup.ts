/**
 * SimulationSetup - Initializes the simulation core and systems
 */

import { SimulationCore, EventBus, ServiceRegistry, EntityManager, TimeManager } from './SimulationCore.js';
import { SimulationError, EntityError } from './ErrorHandling.js';
import type { World } from './World.js';
import type { System } from './System.js';

/**
 * Component factory interface
 */
interface ComponentFactory {
  createComponent: (type: string, config: unknown) => unknown;
}

/**
 * Entity factory interface
 */
interface EntityFactory {
  createEntity: (components?: Record<string, unknown>) => number;
  removeEntity: (entityId: number) => void;
}

/**
 * Performance monitor interface
 */
interface PerformanceMonitor {
  initialize: () => Promise<void>;
  update: (deltaTime: number) => void;
  dispose: () => void;
}

/**
 * Behavioral simulation interface
 */
interface BehavioralSim {
  setPerformanceOptimizer: (optimizer: unknown) => void;
  dispose: () => void;
}

/**
 * Canvas and scene for Babylon.js
 */
interface CanvasScene {
  canvas?: HTMLCanvasElement;
  scene?: unknown;
}

/**
 * SimulationSetup creates and configures a new simulation
 */
export class SimulationSetup {
  private canvas: HTMLCanvasElement | null = null;
  private scene: unknown = null;
  private core: SimulationCore;
  private initialized = false;

  // Performance optimization integration
  private performanceOptimizer: unknown = null;
  private behavioralSim: BehavioralSim | null = null;
  private performanceMonitor: PerformanceMonitor | null = null;

  constructor(canvas?: HTMLCanvasElement, scene?: unknown) {
    this.canvas = canvas ?? null;
    this.scene = scene ?? null;
    this.core = new SimulationCore();
  }

  /**
   * Get the simulation core
   */
  getCore(): SimulationCore {
    return this.core;
  }

  /**
   * Get the event bus
   */
  getEventBus(): EventBus {
    return this.core.getEventBus();
  }

  /**
   * Get the service registry
   */
  getServiceRegistry(): ServiceRegistry {
    return this.core.getServiceRegistry();
  }

  /**
   * Get the entity manager
   */
  getEntityManager(): EntityManager {
    return this.core.getEntityManager();
  }

  /**
   * Get the time manager
   */
  getTimeManager(): TimeManager {
    return this.core.getTimeManager();
  }

  /**
   * Initialize the simulation
   */
  async initialize(): Promise<SimulationCore> {
    try {
      console.log('Initializing simulation...');

      // Initialize core services
      this.initializeCoreServices();

      // Register systems
      await this.registerSystems();

      // Initialize systems
      await this.initializeSystems();

      // Create initial entities
      this.createInitialEntities();

      // Initialize performance monitoring
      await this.initializePerformanceMonitoring();

      this.initialized = true;
      console.log('Simulation initialization complete');

      return this.core;
    } catch (error) {
      // Wrap error in SimulationError if it's not already
      if (error instanceof SimulationError) {
        throw error;
      }
      throw new SimulationError(`Error in simulation initialization: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize core services
   */
  private initializeCoreServices(): void {
    // Register component factories
    this.registerComponentFactories();

    // Set up event subscriptions
    this.setupEventSubscriptions();
  }

  /**
   * Register component factories for entity creation
   */
  private registerComponentFactories(): void {
    const serviceRegistry = this.core.getServiceRegistry();

    // Create component factory service
    const componentFactory: ComponentFactory = {
      createComponent: (type: string, config: unknown) => {
        // Component creation is handled by the ECS components
        // This is a placeholder for the factory pattern
        return { type, ...config };
      },
    };

    // Register component factory service
    serviceRegistry.registerService('componentFactory', componentFactory);

    // Create entity factory
    const entityFactory: EntityFactory = {
      createEntity: (components = {}) => {
        const entityId = this.core.getEntityManager().createEntity();

        // Add components
        for (const [type, config] of Object.entries(components)) {
          this.core.getEntityManager().addComponent(entityId, type, config);

          // Publish component added event
          this.core.getEventBus().publish('component:added', {
            entityId,
            componentType: type,
            component: config,
          });
        }

        // Publish entity created event
        this.core.getEventBus().publish('entity:created', { entityId });

        return entityId;
      },
      removeEntity: (entityId: number) => {
        // Publish entity removal event
        this.core.getEventBus().publish('entity:removed', { entityId });

        // Remove entity
        this.core.getEntityManager().removeEntity(entityId);
      },
    };

    // Register entity factory service
    serviceRegistry.registerService('entityFactory', entityFactory);
  }

  /**
   * Set up event subscriptions
   */
  private setupEventSubscriptions(): void {
    // Log system initialization
    this.core.getEventBus().subscribe('system:initialized', (data: unknown) => {
      const { id } = data as { id: string };
      console.log(`System initialized: ${id}`);
    });

    // Log system errors
    this.core.getEventBus().subscribe('system:error', (data: unknown) => {
      const { systemId, error } = data as { systemId: string; error: Error };
      console.error(`System error in ${systemId}:`, error);
    });

    // Log system deactivation
    this.core.getEventBus().subscribe('system:deactivated', (data: unknown) => {
      const { systemId } = data as { systemId: string };
      console.warn(`System deactivated: ${systemId}`);
    });
  }

  /**
   * Register all simulation systems
   */
  private async registerSystems(): Promise<void> {
    // Systems are registered through the World class in the ECS
    // This is a placeholder for additional system registration
    // The PhysicsSystem and other systems are registered separately
  }

  /**
   * Initialize all registered systems
   */
  private async initializeSystems(): Promise<void> {
    // Systems are initialized through the World class
    // This is a placeholder for additional initialization
  }

  /**
   * Initialize performance monitoring systems
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    try {
      console.log('Initializing performance monitoring...');

      // Performance monitoring is handled by the Performance package
      // This is a placeholder for integration

      console.log('Performance monitoring initialization complete');
    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error);
      // Don't throw - performance monitoring is optional
    }
  }

  /**
   * Set performance optimizer reference for integration
   * @param optimizer - Performance optimizer instance
   */
  setPerformanceOptimizer(optimizer: unknown): void {
    this.performanceOptimizer = optimizer;

    // Integrate with behavioral simulation
    if (this.behavioralSim) {
      this.behavioralSim.setPerformanceOptimizer(optimizer);
    }

    console.log('SimulationSetup integrated with PerformanceOptimizer');
  }

  /**
   * Get performance monitor instance
   */
  getPerformanceMonitor(): PerformanceMonitor | null {
    return this.performanceMonitor;
  }

  /**
   * Get behavioral simulation instance
   */
  getBehavioralSim(): BehavioralSim | null {
    return this.behavioralSim;
  }

  /**
   * Update simulation systems - called each frame
   * @param deltaTime - Time since last update
   */
  update(deltaTime: number): void {
    try {
      // Update core systems
      this.core.update(deltaTime);

      // Update performance monitoring
      if (this.performanceMonitor) {
        this.performanceMonitor.update(deltaTime);
      }
    } catch (error) {
      console.error('Error updating simulation:', error);
    }
  }

  /**
   * Dispose of simulation resources
   */
  dispose(): void {
    try {
      console.log('Disposing simulation...');

      // Dispose behavioral simulation
      if (this.behavioralSim) {
        this.behavioralSim.dispose();
        this.behavioralSim = null;
      }

      // Dispose performance monitor
      if (this.performanceMonitor) {
        this.performanceMonitor.dispose();
        this.performanceMonitor = null;
      }

      // Dispose core
      this.core.dispose();

      this.performanceOptimizer = null;
      this.initialized = false;

      console.log('Simulation disposal complete');
    } catch (error) {
      console.error('Error disposing simulation:', error);
    }
  }

  /**
   * Create initial entities for the simulation
   */
  private createInitialEntities(): void {
    const entityFactory = this.core.getServiceRegistry().getService<EntityFactory>('entityFactory');

    // Create a ground plane
    const groundId = entityFactory.createEntity({
      TransformComponent: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 100, y: 1, z: 100 },
      },
      PhysicsComponent: {
        mass: 0, // Static
        isStatic: true,
        colliderType: 'box',
        colliderSize: { x: 100, y: 1, z: 100 },
        friction: 0.5,
        restitution: 0.2,
      },
      RenderComponent: {
        meshType: 'box',
        meshOptions: {
          width: 100,
          height: 1,
          depth: 100,
        },
        receiveShadow: true,
      },
    });

    // Create a few test cubes
    this.createTestCubes(entityFactory, 10);
  }

  /**
   * Create test cubes for physics demo
   * @param entityFactory - Entity factory service
   * @param count - Number of cubes to create
   */
  private createTestCubes(entityFactory: EntityFactory, count: number): void {
    for (let i = 0; i < count; i++) {
      // Random position above ground
      const position = {
        x: (Math.random() - 0.5) * 20,
        y: 10 + Math.random() * 10,
        z: (Math.random() - 0.5) * 20,
      };

      // Random size
      const size = 0.5 + Math.random() * 1.5;

      // Random rotation
      const rotation = {
        x: Math.random() * Math.PI,
        y: Math.random() * Math.PI,
        z: Math.random() * Math.PI,
      };

      // Create cube entity
      entityFactory.createEntity({
        TransformComponent: {
          position,
          rotation,
          scale: { x: 1, y: 1, z: 1 },
        },
        PhysicsComponent: {
          mass: 1 + Math.random() * 5,
          isStatic: false,
          colliderType: 'box',
          colliderSize: { x: size, y: size, z: size },
          friction: 0.5,
          restitution: 0.3 + Math.random() * 0.4,
        },
        RenderComponent: {
          meshType: 'box',
          meshOptions: {
            width: size,
            height: size,
            depth: size,
          },
          castShadow: true,
          receiveShadow: true,
        },
      });
    }
  }

  /**
   * Check if simulation is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Creates a new simulation setup
 */
export function createSimulationSetup(
  canvas?: HTMLCanvasElement,
  scene?: unknown
): SimulationSetup {
  return new SimulationSetup(canvas, scene);
}