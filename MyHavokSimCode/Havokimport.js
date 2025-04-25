import { VortexBall } from './VortexBall.js';
import { BowlCreator } from './BowlCreator.js';
import { BehavioralSim } from './BehavioralSim.js';
import { WaterSimulation } from './WaterSimulation.js';
import { BoatAgent } from './Agents/Boats/Boats/BoatAgent.js';
import { RoadSystem } from './RoadSystem.js';
import { HouseSystem } from './HouseSystem.js';
import { FishBehaviour } from './Agents/Fish/FishBehaviour.js';
import { BirdBehaviour } from './Agents/Birds/BirdBehaviour.js';
import { CloudSystem } from './CloudSystem.js';
import { ZombieBehaviour } from './Agents/Zombies/ZombieBehaviour.js';
import { VillageSystem } from './VillageSystem.js';
import { DogBehaviour } from './Agents/Dogs/DogBehaviour.js';
import { LevelConfig } from './LevelSystem/LevelConfig.js';
import { LevelSelector } from './LevelSystem/LevelSelector.js';
import { WorldClock } from './UI/WorldClock.js';
import { VillageEngine } from './NewVillageEngine.js';

// Define system configurations
const SYSTEM_CONFIGS = {
  village: {
    condition: 'hasVillage',
    systems: [
      { name: 'roadSystem', class: RoadSystem },
      { name: 'villageSystem', class: VillageSystem },
      { name: 'houseSystem', class: HouseSystem }
    ]
  },
  water: {
    condition: 'hasWater',
    systems: [
      { 
        name: 'waterSim', 
        class: WaterSimulation,
        initialize: (instance) => instance.initialize()
      }
    ],
    dependencies: [
      {
        condition: 'hasFish',
        systems: [
          { 
            name: 'fishSystem', 
            class: FishBehaviour,
            initialize: (instance, level) => instance.initialize(level.fishCount),
            constructorArgs: (scene) => [scene, this.waterSim.waterMesh]
          }
        ]
      }
    ]
  },
  birds: {
    condition: 'hasBirds',
    systems: [
      { 
        name: 'birdSystem', 
        class: BirdBehaviour,
        initialize: (instance, level) => instance.initialize(level.birdCount)
      }
    ]
  },
  clouds: {
    condition: 'hasClouds',
    systems: [
      { name: 'cloudSystem', class: CloudSystem }
    ]
  },
  dogs: {
    condition: 'hasDogs',
    systems: [
      { 
        name: 'dogSystem', 
        class: DogBehaviour,
        initialize: (instance, level) => instance.initialize(level.dogCount)
      }
    ]
  },
  zombies: {
    condition: 'hasZombies',
    systems: [
      { 
        name: 'zombieSystem', 
        class: ZombieBehaviour,
        initialize: (instance, level) => instance.initialize(level.zombieCount)
      }
    ]
  }
};

export class LeoScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = null;
    this.villageEngine = null;
    this.boxes = [];
    this.currentLevel = null;
    this.gameTime = 8 * 60; // Start at 8:00 AM (in minutes)
    this.timeScale = 1200; // 1 real second = 20 game minutes
    this.init();
  }

  async init() {
    try {
      // Initialize the new village engine
      this.villageEngine = new VillageEngine(this.canvas);
      await this.villageEngine.initialize();
      
      // Store reference to the Babylon.js engine for backward compatibility
      this.engine = this.villageEngine.engine;
      this.scene = this.villageEngine.scene;
      
      // Set up camera
      const camera = new BABYLON.ArcRotateCamera(
        "Camera",
        Math.PI / 1.5,
        Math.PI / 4,
        50,
        new BABYLON.Vector3(0, 0, 0),
        this.scene
      );
      camera.attachControl(this.canvas, true);
      camera.lowerRadiusLimit = 10;
      camera.upperRadiusLimit = 100;

      // Add lighting
      const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(0, 1, 0),
        this.scene
      );

      // Initialize World Clock after scene is fully setup
      if (this.scene) {
        this.worldClock = new WorldClock(this.scene);
      } else {
        console.warn("Cannot initialize WorldClock: scene is not available");
      }

      // Initialize level selector
      this.levelSelector = new LevelSelector(this.scene, (levelId) => this.loadLevel(levelId));

      // Load initial level
      const initialLevel = LevelConfig.getCurrentLevel();
      if (initialLevel) {
        await this.loadLevel(initialLevel.config);
      } else {
        console.error("No initial level found");
      }

      // Start the render loop with time update
      let lastTime = performance.now();
      this.engine.runRenderLoop(() => {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) * 0.001; // Convert to seconds
        lastTime = currentTime;

        // Update game time
        this.gameTime += deltaTime * this.timeScale / 60;
        if (this.gameTime >= 24 * 60) {
            this.gameTime = 0;
        }

        // Update world clock with current game time
        if (this.worldClock) {
            this.worldClock.updateTime(this.gameTime);
        }

        // Update cloud system with current time
        if (this.cloudSystem) {
            this.cloudSystem.setTimeOfDay(this.gameTime / 60); // Convert minutes to hours
        }

        this.scene.render();
      });

      // Show debug layer
      if (this.scene && this.scene.debugLayer) {
        this.scene.debugLayer.show({ overlay: true });
      }

      console.log("Village simulation started successfully");
    } catch (error) {
      console.error("Error initializing scene:", error);
    }
  }

  async loadLevel(level) {
    try {
      console.log("Loading level:", level);
      
      // Dispose of existing systems
      this.disposeCurrentSystems();

      // Ensure we have a valid scene and engine
      if (!this.scene || !this.engine) {
        throw new Error("Scene or engine not initialized");
      }

      // Initialize Havok physics if not already done
      if (!this.scene.getPhysicsEngine()) {
        try {
          const havokInstance = await HavokPhysics();
          console.log("Loaded Havok Physics module");
          
          // Check for both older and newer Havok APIs
          if (typeof BABYLON.HavokPlugin === 'function') {
            // Newer API (Babylon.js 5.0+)
            console.log("Using modern Havok Physics API (HavokPlugin)");
            const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
            this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), havokPlugin);
          } else if (typeof BABYLON.PhysicsEnginePlugin === 'function') {
            // Older API
            console.log("Using legacy Havok Physics API (PhysicsEnginePlugin)");
            const physicsPlugin = new BABYLON.PhysicsEnginePlugin(havokInstance);
            this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin);
          } else {
            throw new Error("No compatible Havok Physics API found in Babylon.js");
          }
          
          // Make static method available globally
          window.BowlCreator = { getTerrainHeight: BowlCreator.getTerrainHeight };
          
          console.log("Havok Physics initialized successfully");
        } catch (error) {
          console.error("Failed to initialize Havok Physics:", error);
          throw error;
        }
      }

      // Create new world clock for the new level
      this.worldClock = new WorldClock(this.scene);

      // Create bowl creator with proper scene reference
      try {
        const bowlCreator = new BowlCreator(this.scene);
        await bowlCreator.createBowl(level.bowlRadius, level.bowlDepth);
        console.log("Bowl created successfully");
      } catch (error) {
        console.error("Error creating bowl:", error);
        throw error;
      }

      // Create core systems that are always present
      try {
        this.vortexBall = new VortexBall(this.scene);
        this.behavioralSim = new BehavioralSim(this.scene);
        console.log("Core systems initialized");
      } catch (error) {
        console.error("Error initializing core systems:", error);
        throw error;
      }

      // Initialize configured systems with better error handling
      await this.initializeSystems(level);

      console.log("Level loaded successfully");
      return Promise.resolve();

    } catch (error) {
      console.error("Error loading level:", error);
      return Promise.reject(error);
    }
  }

  async initializeSystems(level) {
    const promises = [];
    const systems = [];

    console.log("Initializing systems for level:", level.name || "Unknown");

    // Collect all systems that need to be initialized
    for (const [key, config] of Object.entries(SYSTEM_CONFIGS)) {
      if (level[config.condition]) {
        console.log(`  - Initializing system group: ${key} (${config.condition})`);

        // Initialize main systems
        for (const system of config.systems) {
          promises.push((async () => {
            try {
              console.log(`    - Creating system: ${system.name}`);
              
              // Prepare constructor arguments
              const constructorArgs = system.constructorArgs ? 
                system.constructorArgs(this.scene) : 
                [this.scene];

              // Create system instance
              this[system.name] = new system.class(...constructorArgs);
              systems.push({ name: system.name, system: this[system.name], initialize: system.initialize });
              
            } catch (error) {
              console.error(`Error creating ${system.name}:`, error);
            }
          })());
        }

        // Add dependent systems if they exist
        if (config.dependencies) {
          for (const dep of config.dependencies) {
            if (level[dep.condition]) {
              console.log(`  - Initializing dependent system group: ${dep.condition}`);
              
              for (const system of dep.systems) {
                promises.push((async () => {
                  try {
                    console.log(`    - Creating dependent system: ${system.name}`);
                    
                    // Prepare constructor arguments
                    const constructorArgs = system.constructorArgs ? 
                      system.constructorArgs(this.scene) : 
                      [this.scene];

                    // Create system instance
                    this[system.name] = new system.class(...constructorArgs);
                    systems.push({ name: system.name, system: this[system.name], initialize: system.initialize });
                    
                  } catch (error) {
                    console.error(`Error creating dependent system ${system.name}:`, error);
                  }
                })());
              }
            }
          }
        }
      }
    }

    // Wait for all system creation to complete
    await Promise.all(promises);

    // Now initialize all created systems sequentially
    for (const { name, system, initialize } of systems) {
      try {
        console.log(`Initializing system: ${name}`);
        if (initialize) {
          await initialize(system, level);
        }
        console.log(`System ${name} initialized successfully`);
      } catch (error) {
        console.error(`Error initializing ${name}:`, error);
      }
    }
  }

  disposeCurrentSystems() {
    console.log("Disposing current systems");
    
    const systems = [
      'roadSystem', 'villageSystem', 'vortexBall', 'waterSim',
      'fishSystem', 'moonSystem', 'behavioralSim', 'houseSystem',
      'birdSystem', 'cloudSystem', 'dogSystem', 'zombieSystem'
    ];

    systems.forEach(system => {
      if (this[system]) {
        if (typeof this[system].dispose === 'function') {
          try {
            this[system].dispose();
          } catch (error) {
            console.warn(`Error disposing system ${system}:`, error);
          }
        }
        this[system] = null;
      }
    });

    // Dispose world clock separately to ensure it's recreated
    if (this.worldClock) {
      this.worldClock.dispose();
      this.worldClock = null;
    }
  }
}