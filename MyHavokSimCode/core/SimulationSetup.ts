/**
 * Simulation setup - initializes the simulation core and systems
 */

import { SimulationCore } from './SimulationCore.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { 
  TransformComponent, 
  PhysicsComponent,
  RenderComponent,
  AIComponent,
  InteractionComponent,
  EnvironmentComponent,
  SoundComponent
} from './Components.js';
import { SimulationError } from './ErrorHandling.js';

// Type definitions for configuration interfaces
interface ComponentConfig {
  [key: string]: any;
}

interface TransformConfig {
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
}

interface PhysicsConfig {
  mass?: number;
  isStatic?: boolean;
  colliderType?: string;
  colliderSize?: { x: number; y: number; z: number };
  friction?: number;
  restitution?: number;
}

interface RenderConfig {
  meshType?: string;
  meshOptions?: any;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

interface EntityComponents {
  TransformComponent?: TransformConfig;
  PhysicsComponent?: PhysicsConfig;
  RenderComponent?: RenderConfig;
  AIComponent?: ComponentConfig;
  InteractionComponent?: ComponentConfig;
  EnvironmentComponent?: ComponentConfig;
  SoundComponent?: ComponentConfig;
}

interface ComponentFactory {
  createComponent(type: string, config: ComponentConfig): any;
}

interface EntityFactory {
  createEntity(components?: EntityComponents): number;
  removeEntity(entityId: number): void;
}

interface PerformanceMonitor {
  initialize(): Promise<void>;
  update(deltaTime: number): void;
  dispose(): void;
}

interface BehavioralSim {
  setPerformanceOptimizer(optimizer: any): void;
  dispose(): void;
}

interface PerformanceOptimizer {
  // Add specific methods as needed
}

/**
 * Creates and configures a new simulation
 */
export class SimulationSetup {
  private canvas: HTMLCanvasElement;
  private scene: any; // BABYLON.Scene type would be ideal
  private core: SimulationCore;
  private initialized: boolean;
  private performanceOptimizer: PerformanceOptimizer | null;
  private behavioralSim: BehavioralSim | null;
  private performanceMonitor: PerformanceMonitor | null;

  constructor(canvas: HTMLCanvasElement, scene: any) {
    this.canvas = canvas;
    this.scene = scene;
    this.core = new SimulationCore();
    this.initialized = false;
    
    // Performance optimization integration
    this.performanceOptimizer = null;
    this.behavioralSim = null;
    this.performanceMonitor = null;
  }
  
  /**
   * Initialize the simulation
   */
  async initialize(): Promise<SimulationCore> {
    try {
      console.log("Initializing simulation...");
      
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
      console.log("Simulation initialization complete");
      
      return this.core;
    } catch (error) {
      // Wrap error in SimulationError if it's not already
      if (!(error instanceof SimulationError)) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new SimulationError(`Error in simulation initialization: ${errorMessage}`);
      }
      throw error;
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
    const serviceRegistry = this.core.serviceRegistry;
    
    // Create component factory service
    const componentFactory: ComponentFactory = {
      createComponent: (type: string, config: ComponentConfig) => {
        switch (type) {
          case 'TransformComponent':
            return new TransformComponent(config as TransformConfig);
          case 'PhysicsComponent':
            return new PhysicsComponent(config as PhysicsConfig);
          case 'RenderComponent':
            return new RenderComponent(config as RenderConfig);
          case 'AIComponent':
            return new AIComponent(config);
          case 'InteractionComponent':
            return new InteractionComponent(config);
          case 'EnvironmentComponent':
            return new EnvironmentComponent(config);
          case 'SoundComponent':
            return new SoundComponent(config);
          default:
            throw new SimulationError(`Unknown component type: ${type}`);
        }
      }
    };
    
    // Register component factory service
    serviceRegistry.registerService('componentFactory', componentFactory);
    
    // Create entity factory
    const entityFactory: EntityFactory = {
      createEntity: (components: EntityComponents = {}) => {
        const entityId = this.core.entityManager.createEntity();
        
        // Add components
        for (const [type, config] of Object.entries(components)) {
          const component = componentFactory.createComponent(type, config);
          this.core.entityManager.addComponent(entityId, type, component);
          
          // Publish component added event
          this.core.eventBus.publish('component:added', {
            entityId,
            componentType: type,
            component
          });
        }
        
        // Publish entity created event
        this.core.eventBus.publish('entity:created', { entityId });
        
        return entityId;
      },
      removeEntity: (entityId: number) => {
        // Publish entity removal event
        this.core.eventBus.publish('entity:removed', { entityId });
        
        // Remove entity
        this.core.entityManager.removeEntity(entityId);
      }
    };
    
    // Register entity factory service
    serviceRegistry.registerService('entityFactory', entityFactory);
  }
  
  /**
   * Set up event subscriptions
   */
  private setupEventSubscriptions(): void {
    // Log system initialization
    this.core.eventBus.subscribe('system:initialized', (data: any) => {
      console.log(`System initialized: ${data.id}`);
    });
    
    // Log system errors
    this.core.eventBus.subscribe('system:error', (data: any) => {
      console.error(`System error in ${data.systemId}:`, data.error);
    });
    
    // Log system deactivation
    this.core.eventBus.subscribe('system:deactivated', (data: any) => {
      console.warn(`System deactivated: ${data.systemId}`);
    });
  }
  
  /**
   * Register all simulation systems
   */
  private async registerSystems(): Promise<void> {
    // Create physics system
    const physicsSystem = new PhysicsSystem(this.scene);
    
    // Register systems with core
    this.core.registerSystem('physics', physicsSystem);
    
    // Set physics manager in core
    this.core.setPhysicsManager(physicsSystem);
    
    // Add additional systems here as they're implemented
    // this.core.registerSystem('render', renderSystem, ['physics']);
    // this.core.registerSystem('ai', aiSystem, ['physics']);
    // etc.
  }
  
  /**
   * Initialize all registered systems
   */
  private async initializeSystems(): Promise<void> {
    // Initialize physics first
    await this.core.initializeSystem('physics');
    
    // Initialize other systems in order
    // await this.core.initializeSystem('render');
    // await this.core.initializeSystem('ai');
    // etc.
  }
  
  /**
   * Initialize performance monitoring systems
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    try {
      console.log("Initializing performance monitoring...");
      
      // Import and initialize PerformanceMonitor
      const { PerformanceMonitor } = await import('../Performance/PerformanceMonitor.js');
      this.performanceMonitor = new PerformanceMonitor(this.scene);
      await this.performanceMonitor.initialize();
      
      // Import and initialize BehavioralSim
      const { BehavioralSim } = await import('../BehavioralSim.js');
      this.behavioralSim = await new BehavioralSim(this.scene);
      
      // Register performance monitor as a service
      this.core.serviceRegistry.registerService('performanceMonitor', this.performanceMonitor);
      this.core.serviceRegistry.registerService('behavioralSim', this.behavioralSim);
      
      console.log("Performance monitoring initialization complete");
      
    } catch (error) {
      console.error("Failed to initialize performance monitoring:", error);
      // Don't throw - performance monitoring is optional
    }
  }
  
  /**
   * Set performance optimizer reference for integration
   * @param optimizer - Performance optimizer instance
   */
  setPerformanceOptimizer(optimizer: PerformanceOptimizer): void {
    this.performanceOptimizer = optimizer;
    
    // Integrate with behavioral simulation
    if (this.behavioralSim) {
      this.behavioralSim.setPerformanceOptimizer(optimizer);
    }
    
    console.log("SimulationSetup integrated with PerformanceOptimizer");
  }
  
  /**
   * Get performance monitor instance
   * @returns Performance monitor instance
   */
  getPerformanceMonitor(): PerformanceMonitor | null {
    return this.performanceMonitor;
  }
  
  /**
   * Get behavioral simulation instance
   * @returns Behavioral simulation instance
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
      if (this.core) {
        this.core.update(deltaTime);
      }
      
      // Update performance monitoring
      if (this.performanceMonitor) {
        this.performanceMonitor.update(deltaTime);
      }
      
      // Behavioral simulation updates are handled in its own render loop
      
    } catch (error) {
      console.error("Error updating simulation:", error);
    }
  }
  
  /**
   * Dispose of simulation resources
   */
  dispose(): void {
    try {
      console.log("Disposing simulation...");
      
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
      if (this.core) {
        this.core.dispose();
      }
      
      this.performanceOptimizer = null;
      this.initialized = false;
      
      console.log("Simulation disposal complete");
      
    } catch (error) {
      console.error("Error disposing simulation:", error);
    }
  }
  
  /**
   * Create initial entities for the simulation
   */
  private createInitialEntities(): void {
    const entityFactory = this.core.serviceRegistry.getService('entityFactory') as EntityFactory;
    
    // Create a ground plane
    const groundId = entityFactory.createEntity({
      'TransformComponent': {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 100, y: 1, z: 100 }
      },
      'PhysicsComponent': {
        mass: 0, // Static
        isStatic: true,
        colliderType: 'box',
        colliderSize: { x: 100, y: 1, z: 100 },
        friction: 0.5,
        restitution: 0.2
      },
      'RenderComponent': {
        meshType: 'box',
        meshOptions: {
          width: 100,
          height: 1,
          depth: 100
        },
        receiveShadow: true
      }
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
        z: (Math.random() - 0.5) * 20
      };
      
      // Random size
      const size = 0.5 + Math.random() * 1.5;
      
      // Random rotation
      const rotation = {
        x: Math.random() * Math.PI,
        y: Math.random() * Math.PI,
        z: Math.random() * Math.PI
      };
      
      // Create cube entity
      const cubeId = entityFactory.createEntity({
        'TransformComponent': {
          position,
          rotation,
          scale: { x: 1, y: 1, z: 1 }
        },
        'PhysicsComponent': {
          mass: 1 + Math.random() * 5,
          isStatic: false,
          colliderType: 'box',
          colliderSize: { x: size, y: size, z: size },
          friction: 0.5,
          restitution: 0.3 + Math.random() * 0.4
        },
        'RenderComponent': {
          meshType: 'box',
          meshOptions: {
            width: size,
            height: size,
            depth: size
          },
          castShadow: true,
          receiveShadow: true
        }
      });
    }
  }
}