import { VortexBall } from './VortexBall.js';
import { BowlCreator } from './BowlCreator.js';
import { BehavioralSim } from './BehavioralSim.js';
import { WaterSimulation } from './WaterSimulation.js';
import { BoatAgent } from './Boats/BoatAgent.js';
import { RoadSystem } from './RoadSystem.js';
import { HouseSystem } from './HouseSystem.js';
import { FishBehaviour } from './Fish/FishBehaviour.js';
import { BirdBehaviour } from './Agents/Birds/BirdBehaviour.js';
import { CloudSystem } from './CloudSystem.js';
import { ZombieBehaviour } from './Agents/Zombies/ZombieBehaviour.js';
import { VillageSystem } from './VillageSystem.js';
import { DogBehaviour } from './Agents/Dogs/DogBehaviour.js';
import { LevelConfig } from './LevelSystem/LevelConfig.js';
import { LevelSelector } from './LevelSystem/LevelSelector.js';
import { WorldClock } from './UI/WorldClock.js';

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
    // Enable performance monitoring in engine options
    const engineOptions = {
      deterministicLockstep: true,
      lockstepMaxSteps: 4,
      useHighPrecisionMatrix: true,
      performanceMonitoringEnabled: true
    };
    this.engine = new BABYLON.Engine(this.canvas, true, engineOptions);
    this.scene = this.createScene();
    this.boxes = [];
    this.currentLevel = null;
    this.gameTime = 8 * 60; // Start at 8:00 AM (in minutes)
    this.timeScale = 1200; // 1 real second = 20 game minutes
    this.init();
  }

  createScene() {
    const scene = new BABYLON.Scene(this.engine);
    
    // Enable hardware scaling
    this.engine.setHardwareScalingLevel(1.0);
    
    // Enable performance optimization flags
    scene.skipPointerMovePicking = true;
    scene.autoClear = false; // Manually clear between frames
    scene.autoClearDepthAndStencil = false;
    scene.blockMaterialDirtyMechanism = true;
    
    // Optimize meshes
    scene.useGeometryIdsMap = true;
    scene.useMaterialMeshMap = true;
    scene.useClonedMeshMap = true;
    
    // Enable performance monitor with detailed metrics
    scene.performanceMonitor = new BABYLON.PerformanceMonitor();
    scene.performanceMonitor.enable();
    
    // Add FPS counter and performance metrics
    this.addPerformanceMetrics(scene);
    
    return scene;
  }

  addPerformanceMetrics(scene) {
    // Create performance monitor GUI
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("performanceUI");
    
    const fpsText = new BABYLON.GUI.TextBlock();
    fpsText.text = "FPS: 0";
    fpsText.color = "white";
    fpsText.fontSize = 16;
    fpsText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    fpsText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    fpsText.top = "10px";
    fpsText.left = "10px";
    advancedTexture.addControl(fpsText);
    
    const drawCallsText = new BABYLON.GUI.TextBlock();
    drawCallsText.text = "Draw Calls: 0";
    drawCallsText.color = "white";
    drawCallsText.fontSize = 16;
    drawCallsText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    drawCallsText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    drawCallsText.top = "30px";
    drawCallsText.left = "10px";
    advancedTexture.addControl(drawCallsText);

    // Update metrics every frame
    scene.onBeforeRenderObservable.add(() => {
      fpsText.text = `FPS: ${Math.round(this.engine.getFps())}`;
      drawCallsText.text = `Draw Calls: ${scene.getActiveMeshes().length}`;
    });
  }

  async init() {
    try {
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

      // Initialize World Clock first, before other systems
      this.worldClock = new WorldClock(this.scene);

      // Initialize Havok physics
      const havokInstance = await HavokPhysics();
      const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
      this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), havokPlugin);

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

        this.scene.render();
      });

      // Show debug layer
      this.scene.debugLayer.show({ overlay: true });

    } catch (error) {
      console.error("Error initializing scene:", error);
    }
  }

  async loadLevel(level) {
    try {
      console.log("Loading level:", level);
      
      // Dispose of existing systems
      this.disposeCurrentSystems();

      // Create new world clock for the new level
      this.worldClock = new WorldClock(this.scene);

      // Create bowl first and wait for it to be ready
      const bowlCreator = new BowlCreator(this.scene);
      await bowlCreator.createBowl(level.bowlRadius, level.bowlDepth);

      // Create core systems that are always present
      this.vortexBall = new VortexBall(this.scene);
      this.behavioralSim = new BehavioralSim(this.scene);

      // Initialize configured systems
      await this.initializeSystems(level);

      console.log("Level loaded successfully");
      return Promise.resolve();

    } catch (error) {
      console.error("Error loading level:", error);
      return Promise.reject(error);
    }
  }

  async initializeSystems(level) {
    for (const [key, config] of Object.entries(SYSTEM_CONFIGS)) {
      if (level[config.condition]) {
        // Initialize main systems
        for (const system of config.systems) {
          try {
            const constructorArgs = system.constructorArgs ? 
              system.constructorArgs(this.scene) : 
              [this.scene];

            this[system.name] = new system.class(...constructorArgs);
            
            if (system.initialize) {
              await system.initialize(this[system.name], level);
            }
          } catch (error) {
            console.error(`Error initializing ${system.name}:`, error);
          }
        }

        // Initialize dependent systems if they exist
        if (config.dependencies) {
          for (const dep of config.dependencies) {
            if (level[dep.condition]) {
              for (const system of dep.systems) {
                try {
                  const constructorArgs = system.constructorArgs ? 
                    system.constructorArgs(this.scene) : 
                    [this.scene];

                  this[system.name] = new system.class(...constructorArgs);
                  
                  if (system.initialize) {
                    await system.initialize(this[system.name], level);
                  }
                } catch (error) {
                  console.error(`Error initializing dependent system ${system.name}:`, error);
                }
              }
            }
          }
        }
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