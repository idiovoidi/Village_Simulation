import { VortexBall } from './VortexBall.js';
import { BowlCreator } from './BowlCreator.js';
import { BehavioralSim } from './BehavioralSim.js';
import { WaterSimulation } from './WaterSimulation.js';
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
import { RTSIntegrationHelper } from './UI/RTSIntegrationHelper.js';
import { VillageEngine } from './NewVillageEngine.js';
import { VillagerBehaviour } from './Agents/Villagers/VillagerBehaviour.js';
import { BoatAgent } from './Agents/Boats/BoatAgent.js';
import { BoatAgentBehaviour } from './Agents/Boats/BoatAgentBehaviour.js';

// Define system configurations
const SYSTEM_CONFIGS = {
    village: {
        condition: 'hasVillage',
        systems: [
            { name: 'roadSystem', class: RoadSystem },
            { name: 'villageSystem', class: VillageSystem },
            { name: 'houseSystem', class: HouseSystem },
            { name: 'villagerSystem', class: VillagerBehaviour }
        ]
    },
    water: {
        condition: 'hasWater',
        systems: [
            {
                name: 'waterSim',
                class: WaterSimulation,
                initialize: instance => instance.initialize()
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
                        constructorArgs: (scene, ctx) => [scene, ctx.waterSim?.waterMesh]
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

    updateLoadingProgress(message, percent) {
    // Update loading screen if it exists
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            const messageEl = loadingScreen.querySelector('p');
            if (messageEl) {
                messageEl.textContent = message;
            }

            // Add progress bar if it doesn't exist
            let progressBar = loadingScreen.querySelector('.progress-bar');
            if (!progressBar) {
                const progressContainer = document.createElement('div');
                progressContainer.className = 'progress-container';
                progressContainer.style.cssText = 'width: 300px; height: 20px; background: rgba(255,255,255,0.2); border-radius: 10px; margin-top: 20px; overflow: hidden;';

                progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';
                progressBar.style.cssText = 'height: 100%; background: linear-gradient(90deg, #4CAF50, #45a049); transition: width 0.3s ease; width: 0%;';

                progressContainer.appendChild(progressBar);
                loadingScreen.appendChild(progressContainer);
            }

            progressBar.style.width = `${percent}%`;
        }

        console.log(`Loading: ${message} (${percent}%)`);
    }

    async init() {
        try {
            // Initialize the new village engine
            this.villageEngine = new VillageEngine(this.canvas);
            await this.villageEngine.initialize();

            // Store reference to the Babylon.js engine for backward compatibility
            this.engine = this.villageEngine.engine;
            this.scene = this.villageEngine.scene;

            // Preload textures in parallel with scene setup
            this.updateLoadingProgress('Loading assets...', 5);
            const { AssetManager } = await import('../assets/AssetManager.js');
            AssetManager.preloadTextures(this.scene).catch(err => {
                console.warn('Some textures failed to preload:', err);
            });

            // Set up camera
            const camera = new BABYLON.ArcRotateCamera(
                'Camera',
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
                'light',
                new BABYLON.Vector3(0, 1, 0),
                this.scene
            );

            // Initialize World Clock after scene is fully setup
            if (this.scene) {
                this.worldClock = new WorldClock(this.scene);
            } else {
                console.warn('Cannot initialize WorldClock: scene is not available');
            }

            // Initialize RTS UI
            if (this.scene) {
                this.rtsUI = new RTSIntegrationHelper(this.scene);
                this.rtsUI.initialize();
                console.log('RTS UI initialized successfully');
            } else {
                console.warn('Cannot initialize RTS UI: scene is not available');
            }

            // Initialize level selector
            this.levelSelector = new LevelSelector(this.scene, levelId => this.loadLevel(levelId));

            // Load initial level
            const initialLevel = LevelConfig.getCurrentLevel();
            if (initialLevel) {
                await this.loadLevel(initialLevel.config);
            } else {
                console.error('No initial level found');
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

                // PERFORMANCE FIX: Consolidated system updates in main loop
                // Update all agent systems
                if (this.villagerSystem && this.villagerSystem.update) {
                    this.villagerSystem.update(deltaTime);
                }
                if (this.zombieSystem && this.zombieSystem.update) {
                    this.zombieSystem.update(deltaTime);
                }
                if (this.fishSystem && this.fishSystem.update) {
                    this.fishSystem.update(deltaTime);
                }
                if (this.birdSystem && this.birdSystem.update) {
                    this.birdSystem.update(deltaTime);
                }
                if (this.dogSystem && this.dogSystem.update) {
                    this.dogSystem.update(deltaTime);
                }

                // Update environment systems
                if (this.waterSim && this.waterSim.update) {
                    this.waterSim.update(deltaTime);
                }
                if (this.cloudSystem && this.cloudSystem.update) {
                    this.cloudSystem.update(deltaTime);
                }
                if (this.cloudSystem) {
                    this.cloudSystem.setTimeOfDay(this.gameTime / 60); // Convert minutes to hours
                }

                // Update behavioral sim (if it has update method)
                if (this.behavioralSim && this.behavioralSim.updateBehaviorsOptimized) {
                    this.behavioralSim.updateBehaviorsOptimized();
                }

                // Update world clock with current game time
                if (this.worldClock) {
                    this.worldClock.updateTime(this.gameTime);
                }

                // Update RTS UI
                if (this.rtsUI) {
                    this.rtsUI.update();
                    this.rtsUI.updateTimeFromMinutes(this.gameTime);

                    // Update resource counts
                    const villagerCount = this.villagerSystem?.villagers?.length || 0;
                    const zombieCount = this.zombieSystem?.zombies?.length || 0;
                    const otherCount = (this.fishSystem?.fishes?.length || 0)
                              + (this.birdSystem?.birds?.length || 0)
                              + (this.dogSystem?.dogs?.length || 0);

                    this.rtsUI.updateResources(villagerCount, zombieCount, otherCount);
                }

                this.scene.render();
            });

            // Show debug layer
            if (this.scene && this.scene.debugLayer) {
                this.scene.debugLayer.show({ overlay: true });
            }

            console.log('Village simulation started successfully');
        } catch (error) {
            console.error('Error initializing scene:', error);
        }
    }

    async loadLevel(level) {
        try {
            console.log('Loading level:', level);
            this.updateLoadingProgress('Preparing scene...', 10);

            // Dispose of existing systems
            this.disposeCurrentSystems();

            // Ensure we have a valid scene and engine
            if (!this.scene || !this.engine) {
                throw new Error('Scene or engine not initialized');
            }

            // Initialize Havok physics if not already done
            if (!this.scene.getPhysicsEngine()) {
                try {
                    this.updateLoadingProgress('Loading physics engine...', 20);
                    const havokInstance = await HavokPhysics();
                    console.log('Loaded Havok Physics module');

                    // Check for both older and newer Havok APIs
                    if (typeof BABYLON.HavokPlugin === 'function') {
                        // Newer API (Babylon.js 5.0+)
                        console.log('Using modern Havok Physics API (HavokPlugin)');
                        const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
                        this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), havokPlugin);
                    } else if (typeof BABYLON.PhysicsEnginePlugin === 'function') {
                        // Older API
                        console.log('Using legacy Havok Physics API (PhysicsEnginePlugin)');
                        const physicsPlugin = new BABYLON.PhysicsEnginePlugin(havokInstance);
                        this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), physicsPlugin);
                    } else {
                        throw new Error('No compatible Havok Physics API found in Babylon.js');
                    }

                    // Make static method available globally
                    window.BowlCreator = { getTerrainHeight: BowlCreator.getTerrainHeight };

                    console.log('Havok Physics initialized successfully');
                } catch (error) {
                    console.error('Failed to initialize Havok Physics:', error);
                    throw error;
                }
            }

            // Create new world clock for the new level
            this.worldClock = new WorldClock(this.scene);

            // Create bowl creator with proper scene reference
            try {
                this.updateLoadingProgress('Generating terrain...', 40);
                const bowlCreator = new BowlCreator(this.scene);
                await bowlCreator.createBowl(level.bowlRadius, level.bowlDepth);
                console.log('Bowl created successfully');
            } catch (error) {
                console.error('Error creating bowl:', error);
                throw error;
            }

            // Create core systems that are always present
            try {
                this.updateLoadingProgress('Initializing core systems...', 60);
                this.vortexBall = new VortexBall(this.scene);
                this.behavioralSim = new BehavioralSim(this.scene);
                console.log('Core systems initialized');
            } catch (error) {
                console.error('Error initializing core systems:', error);
                throw error;
            }

            // Initialize configured systems with better error handling
            this.updateLoadingProgress('Spawning agents...', 70);
            await this.initializeSystems(level);

            this.updateLoadingProgress('Finalizing...', 95);

            // Defer non-critical systems to after initial load
            setTimeout(() => this.initializeDeferredSystems(level), 100);

            console.log('Level loaded successfully');
            this.updateLoadingProgress('Ready!', 100);
            return Promise.resolve();
        } catch (error) {
            console.error('Error loading level:', error);
            this.updateLoadingProgress('Error loading level', 0);
            return Promise.reject(error);
        }
    }

    updateLoadingProgress(message, percent) {
    // Update loading screen if it exists
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            const messageEl = loadingScreen.querySelector('p');
            if (messageEl) {
                messageEl.textContent = message;
            }

            // Add progress bar if it doesn't exist
            let progressBar = loadingScreen.querySelector('.progress-bar');
            if (!progressBar) {
                const progressContainer = document.createElement('div');
                progressContainer.className = 'progress-container';
                progressContainer.style.cssText = 'width: 300px; height: 20px; background: rgba(255,255,255,0.2); border-radius: 10px; margin-top: 20px; overflow: hidden;';

                progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';
                progressBar.style.cssText = 'height: 100%; background: linear-gradient(90deg, #4CAF50, #45a049); transition: width 0.3s ease; width: 0%;';

                progressContainer.appendChild(progressBar);
                loadingScreen.appendChild(progressContainer);
            }

            progressBar.style.width = `${percent}%`;
        }

        console.log(`Loading: ${message} (${percent}%)`);
    }

    async initializeDeferredSystems(level) {
        console.log('Initializing deferred systems...');

        // Initialize clouds in background if needed
        if (level.hasClouds && !this.cloudSystem) {
            try {
                const { CloudSystem } = await import('./CloudSystem.js');
                this.cloudSystem = new CloudSystem(this.scene);
                console.log('Cloud system initialized (deferred)');
            } catch (error) {
                console.warn('Failed to initialize cloud system:', error);
            }
        }
    }

    async initializeSystems(level) {
        const criticalSystems = [];
        const deferredSystems = [];

        console.log('Initializing systems for level:', level.name || 'Unknown');

        // Separate critical and deferred systems
        const deferredSystemNames = ['cloudSystem']; // Systems that can load after initial render

        // Collect all systems that need to be initialized
        for (const [key, config] of Object.entries(SYSTEM_CONFIGS)) {
            if (level[config.condition]) {
                console.log(`  - Initializing system group: ${key} (${config.condition})`);

                // Skip clouds - they're deferred
                if (key === 'clouds') {
                    continue;
                }

                // Initialize main systems
                for (const system of config.systems) {
                    const systemInfo = {
                        name: system.name,
                        class: system.class,
                        constructorArgs: system.constructorArgs,
                        initialize: system.initialize
                    };

                    if (deferredSystemNames.includes(system.name)) {
                        deferredSystems.push(systemInfo);
                    } else {
                        criticalSystems.push(systemInfo);
                    }
                }

                // Add dependent systems if they exist
                if (config.dependencies) {
                    for (const dep of config.dependencies) {
                        if (level[dep.condition]) {
                            console.log(`  - Initializing dependent system group: ${dep.condition}`);

                            for (const system of dep.systems) {
                                const systemInfo = {
                                    name: system.name,
                                    class: system.class,
                                    constructorArgs: system.constructorArgs,
                                    initialize: system.initialize
                                };

                                if (deferredSystemNames.includes(system.name)) {
                                    deferredSystems.push(systemInfo);
                                } else {
                                    criticalSystems.push(systemInfo);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Create and initialize critical systems in parallel batches
        const batchSize = 3; // Process 3 systems at a time
        for (let i = 0; i < criticalSystems.length; i += batchSize) {
            const batch = criticalSystems.slice(i, i + batchSize);

            await Promise.all(batch.map(async systemInfo => {
                try {
                    console.log(`    - Creating system: ${systemInfo.name}`);

                    // Prepare constructor arguments
                    const constructorArgs = systemInfo.constructorArgs
                        ? systemInfo.constructorArgs(this.scene, this)
                        : [this.scene];

                    // Create system instance
                    this[systemInfo.name] = new systemInfo.class(...constructorArgs);

                    // Initialize immediately
                    if (systemInfo.initialize) {
                        await systemInfo.initialize(this[systemInfo.name], level);
                    }

                    console.log(`System ${systemInfo.name} initialized successfully`);
                } catch (error) {
                    console.error(`Error creating/initializing ${systemInfo.name}:`, error);
                }
            }));
        }

        // After all systems are initialized, link them
        if (this.villagerSystem && this.zombieSystem) {
            this.villagerSystem.zombieSystem = this.zombieSystem;
            this.zombieSystem.villagerSystem = this.villagerSystem;
        }
    }

    disposeCurrentSystems() {
        console.log('Disposing current systems');

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
