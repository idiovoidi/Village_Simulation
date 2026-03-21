import { BowlCreator } from '../../BowlCreator.js';
import { WorldClock } from '../../UI/WorldClock.js';
import { DayNightCycle } from '../../Environment/DayNightCycle.js';
import { BasicAgent } from '../BasicAgent.js';
import { VillagerModel } from './VillagerModel.js';
import { BloodDecalManager } from '../../Effects/BloodDecalManager.js';
import { VillagerSurvivalInstinct } from './VillagerSurvivalInstinct.js';
import { VillagerSocialNetwork } from './VillagerSocialNetwork.js';
import { VillagerShelterSystem } from './VillagerShelterSystem.js';
import { EnhancedStateMachine } from '../../core/EnhancedStateMachine.js';
import { AgentCommunicationSystem } from '../../core/AgentCommunicationSystem.js';
import { EnvironmentalAwareness } from '../../core/EnvironmentalAwareness.js';

// Error handling decorator
function ErrorDecorator(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        try {
            return originalMethod.apply(this, args);
        } catch (error) {
            console.error(`Error in ${propertyKey}:`, error);
            // Return a fallback or default value if appropriate
            return null;
        }
    };
    return descriptor;
}

// Performance measurement decorator
function Measure(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        const start = performance.now();
        const result = originalMethod.apply(this, args);
        const elapsed = performance.now() - start;
        if (elapsed > 5) { // Only log if took more than 5ms
            console.log(`${propertyKey} took ${elapsed.toFixed(2)}ms`);
        }
        return result;
    };
    return descriptor;
}

export class VillagerBehaviour {
    constructor(scene) {
        this.scene = scene;
        this.villagers = [];
        this.basicAgent = new BasicAgent(scene);
        this.villagerModel = new VillagerModel(scene);
        this.bloodDecalManager = new BloodDecalManager(scene);

        // Initialize time-related systems
        this.worldClock = new WorldClock(this.scene);
        this.dayNightCycle = new DayNightCycle(this.scene);

        // Initialize enhanced systems
        this.communicationSystem = new AgentCommunicationSystem(scene);
        this.environmentalAwareness = new EnvironmentalAwareness(scene);

        // Performance optimization settings
        this.performanceSettings = {
            enhancedSystemsEnabled: true,
            maxEnhancedVillagers: 20, // Limit enhanced behavior to first 20 villagers
            updateThrottleMs: 100, // Update enhanced systems every 100ms instead of every frame
            staggeredUpdates: true, // Spread updates across frames
            lastSystemUpdate: 0,
            villagerUpdateIndex: 0 // For staggered updates
        };

        // Define enhanced states based on our design document
        this.STATES = {
            IDLE: 'idle',
            WANDERING: 'wandering',
            MOVING_TO_TARGET: 'moving_to_target',
            PERFORMING_TASK: 'performing_task',
            SOCIALIZING: 'socializing',
            INSIDE_HOME: 'inside_home',
            FLEEING: 'fleeing',
            SEEKING_SHELTER: 'seeking_shelter',
            IN_SHELTER: 'in_shelter',
            ALERT: 'alert',
            PANICKING: 'panicking',
            COORDINATING_ESCAPE: 'coordinating_escape'
        };

        // Points of interest registry
        this.socialHubs = [];
        this.workLocations = [];
        this.homeLocations = [];

        // Enhanced animation mappings
        this.stateToAnimation = {
            [this.STATES.IDLE]: 'idle',
            [this.STATES.WANDERING]: 'walk',
            [this.STATES.MOVING_TO_TARGET]: 'walk',
            [this.STATES.PERFORMING_TASK]: 'work',
            [this.STATES.SOCIALIZING]: 'idle', // Default idle, will switch to 'greet' when near others
            [this.STATES.INSIDE_HOME]: null, // No animation when inside (hidden)
            [this.STATES.FLEEING]: 'walk', // Use walk animation at faster speed for fleeing
            [this.STATES.SEEKING_SHELTER]: 'walk',
            [this.STATES.IN_SHELTER]: 'idle',
            [this.STATES.ALERT]: 'idle',
            [this.STATES.PANICKING]: 'walk',
            [this.STATES.COORDINATING_ESCAPE]: 'idle'
        };

        // Helper function to replace missing BABYLON.Scalar.WrapAngle
        this.wrapAngle = function (angle) {
            // Wrap the angle between -PI and PI
            const PI2 = Math.PI * 2;
            while (angle > Math.PI) angle -= PI2;
            while (angle < -Math.PI) angle += PI2;
            return angle;
        };

        // Initialize enhanced systems
        this.initializeEnhancedSystems();

        // Performance monitoring
        this.lastPerformanceCheck = 0;
        this.performanceCheckInterval = 2000; // Check every 2 seconds

        // Initialize update loop
        this.scene.onBeforeRenderObservable.add(() => {
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            this.updateVillagers(deltaTime);

            // Periodically adjust performance settings
            const now = performance.now();
            if (now - this.lastPerformanceCheck > this.performanceCheckInterval) {
                this.adjustPerformanceSettings();
                this.lastPerformanceCheck = now;
            }
        });
    }

    /**
     * Initialize enhanced systems for villager behavior
     */
    initializeEnhancedSystems() {
        try {
            // Initialize communication system
            if (this.communicationSystem && typeof this.communicationSystem.initialize === 'function') {
                this.communicationSystem.initialize();
            }

            // Initialize environmental awareness
            if (this.environmentalAwareness && typeof this.environmentalAwareness.initialize === 'function') {
                this.environmentalAwareness.initialize();
            }

            console.log('Enhanced villager systems initialized');
        } catch (error) {
            console.error('Error initializing enhanced systems:', error);
            // Continue with basic functionality
        }
    }

    initialize(count = 10) {
        // Create initial social hubs (could be loaded from level config in the future)
        this.createDefaultPOIs();

        // Create villagers in a circle around the center
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 20 + Math.random() * 10;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = BowlCreator.getTerrainHeight(x, z) + 2;

            const position = new BABYLON.Vector3(x, y, z);
            const villager = this.basicAgent.createAgent(`villager_${i}`, position);
            this.addVillager(villager);
        }
    }

    createDefaultPOIs() {
        // Create some default social hubs
        this.socialHubs.push({
            id: 'central_square',
            position: new BABYLON.Vector3(0, BowlCreator.getTerrainHeight(0, 0) + 1, 0),
            radius: 10,
            capacity: 10
        });

        this.socialHubs.push({
            id: 'market',
            position: new BABYLON.Vector3(15, BowlCreator.getTerrainHeight(15, 15) + 1, 15),
            radius: 8,
            capacity: 8
        });

        // Create some work locations
        this.workLocations.push({
            id: 'farm',
            position: new BABYLON.Vector3(-20, BowlCreator.getTerrainHeight(-20, 10) + 1, 10),
            radius: 12,
            capacity: 5,
            taskDuration: 60 // seconds
        });

        // Create some "homes"
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const radius = 35;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            this.homeLocations.push({
                id: `house_${i}`,
                position: new BABYLON.Vector3(x, BowlCreator.getTerrainHeight(x, z) + 1, z),
                radius: 3,
                capacity: 1,
                assigned: false
            });
        }

        // Visualize POIs with simple markers (for debugging)
        if (this.scene) {
            [...this.socialHubs, ...this.workLocations, ...this.homeLocations].forEach(poi => {
                const marker = BABYLON.MeshBuilder.CreateCylinder(
                    `marker_${poi.id}`,
                    { height: 0.5, diameter: 2 * poi.radius },
                    this.scene
                );
                marker.position = poi.position.clone();
                marker.position.y -= 0.2;

                const markerMaterial = new BABYLON.StandardMaterial(`material_${poi.id}`, this.scene);

                // Color based on type
                if (poi.id.includes('house')) {
                    markerMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.9); // Blue for homes
                    markerMaterial.alpha = 0.3;
                } else if (poi.id.includes('farm')) {
                    markerMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Green for work
                    markerMaterial.alpha = 0.3;
                } else {
                    markerMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.6, 0.2); // Orange for social
                    markerMaterial.alpha = 0.3;
                }

                marker.material = markerMaterial;
            });
        }
    }

    addVillager(villager) {
        if (!villager.mesh || !villager.physics) {
            console.warn('Villager added without proper physics setup');
            return null;
        }

        villager.id = this.villagers.length;
        villager.state = this.STATES.IDLE;
        villager.speed = 0.05;
        villager.destination = null;
        villager.taskDuration = 0;
        villager.taskTimer = 0;
        villager.socialTimer = 0;

        // Initialize enhanced components
        this.initializeVillagerComponents(villager);

        // Find an available home
        const availableHome = this.homeLocations.find(home => !home.assigned);
        if (availableHome) {
            villager.home = availableHome;
            availableHome.assigned = true;
            console.log(`Villager ${villager.id} assigned to home ${availableHome.id}`);
        } else {
            // Dynamically create a new home POI at the villager's current position
            const newHome = {
                id: `house_dynamic_${this.homeLocations.length}`,
                position: villager.mesh.position.clone(),
                radius: 3,
                capacity: 1,
                assigned: true
            };
            this.homeLocations.push(newHome);

            // Optionally visualize the new home marker if debug markers are enabled
            if (this.scene) {
                const marker = BABYLON.MeshBuilder.CreateCylinder(
                    `marker_${newHome.id}`,
                    { height: 0.5, diameter: 2 * newHome.radius },
                    this.scene
                );
                marker.position = newHome.position.clone();
                marker.position.y -= 0.2;
                const markerMaterial = new BABYLON.StandardMaterial(`material_${newHome.id}`, this.scene);
                markerMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.9);
                markerMaterial.alpha = 0.3;
                marker.material = markerMaterial;
            }

            villager.home = newHome;
        }

        // Add movement update observer
        this.addMovementObserver(villager);

        this.villagers.push(villager);

        // Schedule first action
        this.decideNextAction(villager);

        // Attach animation groups using VillagerModel if not present
        if (!villager.mesh.animationGroups) {
            // Ensure parts exist and call applyAnimations
            if (villager.parts && Object.keys(villager.parts).length > 0) {
                this.villagerModel.applyAnimations(villager.mesh, {
                    leftArm: villager.parts.leftArm,
                    rightArm: villager.parts.rightArm,
                    leftLeg: villager.parts.leftLeg,
                    rightLeg: villager.parts.rightLeg
                });
            }
        }

        return villager;
    }

    /**
     * Dynamically adjust performance settings based on frame rate
     */
    adjustPerformanceSettings() {
        const engine = this.scene.getEngine();
        const fps = engine.getFps();

        // Adjust settings based on performance
        if (fps < 20) {
            // Very poor performance - disable enhanced systems temporarily
            this.performanceSettings.enhancedSystemsEnabled = false;
            console.warn('VillagerBehaviour: Enhanced systems disabled due to poor performance');
        } else if (fps < 30) {
            // Poor performance - reduce enhanced villagers and increase throttling
            this.performanceSettings.enhancedSystemsEnabled = true;
            this.performanceSettings.maxEnhancedVillagers = Math.max(3, Math.floor(this.villagers.length * 0.15));
            this.performanceSettings.updateThrottleMs = 300;
            this.performanceSettings.staggeredUpdates = true;
        } else if (fps < 45) {
            // Moderate performance - moderate settings
            this.performanceSettings.enhancedSystemsEnabled = true;
            this.performanceSettings.maxEnhancedVillagers = Math.max(8, Math.floor(this.villagers.length * 0.4));
            this.performanceSettings.updateThrottleMs = 200;
            this.performanceSettings.staggeredUpdates = true;
        } else {
            // Good performance - allow more enhanced villagers
            this.performanceSettings.enhancedSystemsEnabled = true;
            this.performanceSettings.maxEnhancedVillagers = Math.min(15, this.villagers.length);
            this.performanceSettings.updateThrottleMs = 100;
            this.performanceSettings.staggeredUpdates = false;
        }
    }

    /**
     * Manually set performance mode
     * @param {string} mode - 'high', 'medium', 'low', or 'basic'
     */
    setPerformanceMode(mode) {
        switch (mode) {
            case 'high':
                this.performanceSettings.enhancedSystemsEnabled = true;
                this.performanceSettings.maxEnhancedVillagers = Math.min(20, this.villagers.length);
                this.performanceSettings.updateThrottleMs = 50;
                this.performanceSettings.staggeredUpdates = false;
                break;
            case 'medium':
                this.performanceSettings.enhancedSystemsEnabled = true;
                this.performanceSettings.maxEnhancedVillagers = Math.min(10, this.villagers.length);
                this.performanceSettings.updateThrottleMs = 100;
                this.performanceSettings.staggeredUpdates = true;
                break;
            case 'low':
                this.performanceSettings.enhancedSystemsEnabled = true;
                this.performanceSettings.maxEnhancedVillagers = Math.min(5, this.villagers.length);
                this.performanceSettings.updateThrottleMs = 200;
                this.performanceSettings.staggeredUpdates = true;
                break;
            case 'basic':
                this.performanceSettings.enhancedSystemsEnabled = false;
                break;
            default:
                console.warn('Invalid performance mode. Use: high, medium, low, or basic');
        }
        console.log(`VillagerBehaviour performance mode set to: ${mode}`);
    }

    /**
     * Get current performance statistics
     * @returns {Object} Performance stats
     */
    getPerformanceStats() {
        const engine = this.scene.getEngine();
        return {
            fps: engine.getFps(),
            enhancedSystemsEnabled: this.performanceSettings.enhancedSystemsEnabled,
            maxEnhancedVillagers: this.performanceSettings.maxEnhancedVillagers,
            totalVillagers: this.villagers.length,
            updateThrottleMs: this.performanceSettings.updateThrottleMs,
            staggeredUpdates: this.performanceSettings.staggeredUpdates
        };
    }

    /**
     * Initialize enhanced components for a villager (lazy loading for performance)
     * @param {Object} villager - Villager to initialize
     */
    initializeVillagerComponents(villager) {
        try {
            // Only initialize enhanced components for villagers that will use them
            const villagerIndex = this.villagers.length;
            const shouldInitializeEnhanced = villagerIndex < this.performanceSettings.maxEnhancedVillagers;

            if (shouldInitializeEnhanced) {
                // Initialize enhanced state machine
                const stateDefinitions = this.createVillagerStateDefinitions();
                villager.stateMachine = new EnhancedStateMachine(villager, stateDefinitions);

                // Initialize survival instinct system with reduced settings for performance
                villager.survivalInstinct = new VillagerSurvivalInstinct(villager, {
                    threatDetectionRadius: 100, // Reduced from 150
                    fleeSpeed: 1.3, // Reduced from 1.5
                    staminaMax: 80, // Reduced from 100
                    groupCoordinationRadius: 80 // Reduced from 100
                });

                // Initialize social network system with reduced settings
                villager.socialNetwork = new VillagerSocialNetwork(villager, {
                    maxRelationships: 8, // Reduced from 12
                    socialRange: 15, // Reduced from 20
                    leadershipThreshold: 0.7,
                    socialUpdateInterval: 2000 // Increased from 1000ms
                });

                // Initialize shelter system with reduced settings
                villager.shelterSystem = new VillagerShelterSystem(villager, {
                    shelterSearchRadius: 40, // Reduced from 50
                    maxShelterDistance: 80, // Reduced from 100
                    cooperationThreshold: 0.6,
                    shelterEvaluationInterval: 3000 // Increased from 2000ms
                });

                // Initialize all systems with cross-references
                const systems = {
                    communication: this.communicationSystem,
                    environmental: this.environmentalAwareness,
                    socialNetwork: villager.socialNetwork,
                    shelterSystem: villager.shelterSystem
                };

                // Initialize systems with error handling
                if (villager.survivalInstinct && typeof villager.survivalInstinct.initialize === 'function') {
                    villager.survivalInstinct.initialize(systems);
                }

                if (villager.socialNetwork && typeof villager.socialNetwork.initialize === 'function') {
                    villager.socialNetwork.initialize(systems);
                }

                if (villager.shelterSystem && typeof villager.shelterSystem.initialize === 'function') {
                    villager.shelterSystem.initialize(systems);
                }

                // Set up state machine with enhanced states
                if (villager.stateMachine && typeof villager.stateMachine.initialize === 'function') {
                    villager.stateMachine.initialize();
                }

                console.log(`Enhanced components initialized for villager ${villager.id}`);
            } else {
                console.log(`Basic components only for villager ${villager.id} (performance optimization)`);
            }
        } catch (error) {
            console.error(`Error initializing enhanced components for villager ${villager.id}:`, error);
            // Continue with basic villager functionality
        }
    }

    /**
     * Create state definitions for enhanced villager state machine
     * @returns {Object} - State definitions
     */
    createVillagerStateDefinitions() {
        return {
            [this.STATES.IDLE]: {
                enter: villager => this.enterIdleState(villager),
                update: (villager, deltaTime) => this.updateIdleState(villager, deltaTime),
                exit: villager => this.exitIdleState(villager)
            },
            [this.STATES.WANDERING]: {
                enter: villager => this.enterWanderingState(villager),
                update: (villager, deltaTime) => this.updateWanderingState(villager, deltaTime),
                exit: villager => this.exitWanderingState(villager)
            },
            [this.STATES.FLEEING]: {
                enter: villager => this.enterFleeingState(villager),
                update: (villager, deltaTime) => this.updateFleeingState(villager, deltaTime),
                exit: villager => this.exitFleeingState(villager)
            },
            [this.STATES.SEEKING_SHELTER]: {
                enter: villager => this.enterSeekingShelterState(villager),
                update: (villager, deltaTime) => this.updateSeekingShelterState(villager, deltaTime),
                exit: villager => this.exitSeekingShelterState(villager)
            },
            [this.STATES.IN_SHELTER]: {
                enter: villager => this.enterInShelterState(villager),
                update: (villager, deltaTime) => this.updateInShelterState(villager, deltaTime),
                exit: villager => this.exitInShelterState(villager)
            },
            [this.STATES.ALERT]: {
                enter: villager => this.enterAlertState(villager),
                update: (villager, deltaTime) => this.updateAlertState(villager, deltaTime),
                exit: villager => this.exitAlertState(villager)
            },
            [this.STATES.SOCIALIZING]: {
                enter: villager => this.enterSocializingState(villager),
                update: (villager, deltaTime) => this.updateSocializingState(villager, deltaTime),
                exit: villager => this.exitSocializingState(villager)
            }
        };
    }

    addMovementObserver(villager) {
        // Add walking animation and position correction
        let walkTime = 0;
        villager.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (!villager.mesh || !villager.physics) return;

            // Force upright orientation
            const uprightQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
                villager.mesh.rotation.y,
                0,
                0
            );
            villager.mesh.rotationQuaternion = uprightQuaternion;

            // Ensure proper ground contact
            const groundHeight = BowlCreator.getTerrainHeight(villager.mesh.position.x, villager.mesh.position.z);
            if (groundHeight !== null) {
                const targetHeight = groundHeight + 0.9;

                // Add walking bounce when moving
                if (villager.state === this.STATES.MOVING_TO_TARGET || villager.state === this.STATES.WANDERING) {
                    walkTime += this.scene.getEngine().getDeltaTime() * 0.001;
                    const bounce = Math.sin(walkTime * 10) * 0.1;
                    villager.mesh.position.y = targetHeight + bounce;
                } else {
                    villager.mesh.position.y = targetHeight;
                }

                // Zero out vertical velocity
                const velocity = villager.physics.body.getLinearVelocity();
                villager.physics.body.setLinearVelocity(new BABYLON.Vector3(velocity.x, 0, velocity.z));
            }
        });
    }

    decideNextAction(villager) {
        const gameTimeMinutes = this.dayNightCycle.getGameTime();
        const hour = Math.floor(gameTimeMinutes / 60);

        // Schedule based on time of day
        if (hour >= 22 || hour < 6) {
            // Nighttime (10 PM - 6 AM): go/stay home
            this.goHome(villager);
        } else if (hour >= 6 && hour < 9) {
            // Morning (6 AM - 9 AM): leave home, wander or socialize
            if (villager.state === this.STATES.INSIDE_HOME) {
                this.leaveHome(villager);
            } else {
                Math.random() < 0.7 ? this.startWandering(villager) : this.goSocialize(villager);
            }
        } else if (hour >= 9 && hour < 17) {
            // Daytime (9 AM - 5 PM): work or productive tasks
            if (Math.random() < 0.7) {
                this.goToWork(villager);
            } else {
                this.startWandering(villager);
            }
        } else {
            // Evening (5 PM - 10 PM): socialize or wander
            if (Math.random() < 0.6) {
                this.goSocialize(villager);
            } else {
                this.startWandering(villager);
            }
        }
    }

    goHome(villager) {
        if (!villager.home) {
            console.warn(`Villager ${villager.id} has no home, wandering instead`);
            this.startWandering(villager);
            return;
        }

        if (villager.state === this.STATES.INSIDE_HOME) {
            // Already home, stay there
            return;
        }

        // Move to home
        villager.destination = villager.home.position.clone();
        villager.state = this.STATES.MOVING_TO_TARGET;
        villager.currentPOI = villager.home;
        villager.onArrival = () => {
            villager.state = this.STATES.INSIDE_HOME;

            // Hide the villager (as if they're inside)
            if (villager.mesh) {
                villager.mesh.visibility = 0;

                // Stop any playing animations
                if (villager.mesh.animationGroups) {
                    Object.values(villager.mesh.animationGroups).forEach(group => group.stop());
                }
            }

            // Schedule next action after some time
            setTimeout(() => {
                this.decideNextAction(villager);
            }, 60000); // Check again in 1 minute
        };
    }

    leaveHome(villager) {
        if (!villager.home) return;

        // Make villager visible again
        if (villager.mesh) {
            villager.mesh.visibility = 1;
        }

        // Move slightly away from home position
        const angle = Math.random() * Math.PI * 2;
        const distance = villager.home.radius + 2;
        villager.destination = new BABYLON.Vector3(
            villager.home.position.x + Math.cos(angle) * distance,
            villager.home.position.y,
            villager.home.position.z + Math.sin(angle) * distance
        );

        villager.state = this.STATES.MOVING_TO_TARGET;
        villager.onArrival = () => {
            this.decideNextAction(villager);
        };
    }

    goToWork(villager) {
        if (this.workLocations.length === 0) {
            this.startWandering(villager);
            return;
        }

        // Pick a random work location
        const workLocation = this.workLocations[Math.floor(Math.random() * this.workLocations.length)];

        // Move to work location
        villager.destination = workLocation.position.clone();
        villager.state = this.STATES.MOVING_TO_TARGET;
        villager.currentPOI = workLocation;
        villager.onArrival = () => {
            // Start performing work task
            villager.state = this.STATES.PERFORMING_TASK;
            villager.taskDuration = workLocation.taskDuration || 60;
            villager.taskTimer = 0;

            // After task is done, decide next action
            setTimeout(() => {
                this.decideNextAction(villager);
            }, villager.taskDuration * 1000);
        };
    }

    goSocialize(villager) {
        if (this.socialHubs.length === 0) {
            this.startWandering(villager);
            return;
        }

        // Pick a random social hub
        const socialHub = this.socialHubs[Math.floor(Math.random() * this.socialHubs.length)];

        // Move to social hub
        villager.destination = socialHub.position.clone();
        // Add some randomness within the hub area
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * socialHub.radius * 0.8;
        villager.destination.x += Math.cos(angle) * distance;
        villager.destination.z += Math.sin(angle) * distance;

        villager.state = this.STATES.MOVING_TO_TARGET;
        villager.currentPOI = socialHub;
        villager.onArrival = () => {
            // Start socializing
            villager.state = this.STATES.SOCIALIZING;
            villager.socialTimer = 0;

            // After socializing, decide next action
            const socializeDuration = 60 + Math.random() * 180; // 1-4 minutes
            setTimeout(() => {
                this.decideNextAction(villager);
            }, socializeDuration * 1000);
        };
    }

    startWandering(villager) {
        if (villager.state === this.STATES.INSIDE_HOME) {
            this.leaveHome(villager);
            return;
        }

        if (villager.state !== this.STATES.WANDERING) {
            // Set a random destination within a reasonable radius
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 20;
            const x = villager.mesh.position.x + Math.cos(angle) * radius;
            const z = villager.mesh.position.z + Math.sin(angle) * radius;
            const y = BowlCreator.getTerrainHeight(x, z);

            villager.destination = new BABYLON.Vector3(x, y, z);
            villager.state = this.STATES.WANDERING;
            villager.currentPOI = null;

            // Schedule next decision after wandering for a while
            setTimeout(() => {
                this.decideNextAction(villager);
            }, (10 + Math.random() * 20) * 1000); // 10-30 seconds
        }
    }

    updateVillagers(deltaTime) {
        try {
            // Update UI with current time from DayNightCycle
            this.worldClock.updateTime(this.dayNightCycle.getGameTime());

            const now = performance.now();

            // Throttle enhanced systems updates
            if (this.performanceSettings.enhancedSystemsEnabled
                && now - this.performanceSettings.lastSystemUpdate > this.performanceSettings.updateThrottleMs) {
                // Update enhanced systems less frequently
                if (this.communicationSystem && typeof this.communicationSystem.update === 'function') {
                    this.communicationSystem.update(deltaTime);
                }

                if (this.environmentalAwareness && typeof this.environmentalAwareness.update === 'function') {
                    this.environmentalAwareness.update(deltaTime);
                }

                this.performanceSettings.lastSystemUpdate = now;
            }

            // Update villagers with performance optimizations
            if (!this.performanceSettings.enhancedSystemsEnabled) {
                // Use basic updates only when enhanced systems are disabled
                this.villagers.forEach(villager => {
                    this.updateVillagerState(villager, deltaTime);
                });
            } else if (this.performanceSettings.staggeredUpdates) {
                this.updateVillagersStaggered(deltaTime);
            } else {
                this.villagers.forEach((villager, index) => {
                    if (index < this.performanceSettings.maxEnhancedVillagers) {
                        this.updateEnhancedVillager(villager, deltaTime);
                    } else {
                        // Use basic update for performance
                        this.updateVillagerState(villager, deltaTime);
                    }
                });
            }
        } catch (error) {
            console.error('Error in updateVillagers:', error);
        }
    }

    /**
     * Update villagers in a staggered manner to spread load across frames
     * @param {number} deltaTime - Time since last update
     */
    updateVillagersStaggered(deltaTime) {
        const villagersPerFrame = Math.max(1, Math.ceil(this.villagers.length / 5)); // Spread across 5 frames
        const startIndex = this.performanceSettings.villagerUpdateIndex;
        const endIndex = Math.min(startIndex + villagersPerFrame, this.villagers.length);

        for (let i = startIndex; i < endIndex; i++) {
            const villager = this.villagers[i];
            if (i < this.performanceSettings.maxEnhancedVillagers) {
                this.updateEnhancedVillager(villager, deltaTime);
            } else {
                // Use basic update for performance
                this.updateVillagerState(villager, deltaTime);
            }
        }

        // Update index for next frame
        this.performanceSettings.villagerUpdateIndex = endIndex >= this.villagers.length ? 0 : endIndex;
    }

    /**
     * Update villager with enhanced systems (performance optimized)
     * @param {Object} villager - Villager to update
     * @param {number} deltaTime - Time since last update
     */
    updateEnhancedVillager(villager, deltaTime) {
        if (!villager.mesh || !villager.physics) return;

        try {
            // Initialize performance tracking if not exists
            if (!villager.performanceData) {
                villager.performanceData = {
                    lastEnhancedUpdate: 0,
                    updateInterval: 200, // Update enhanced systems every 200ms
                    skipFrames: 0
                };
            }

            const now = performance.now();
            const shouldUpdateEnhanced = now - villager.performanceData.lastEnhancedUpdate > villager.performanceData.updateInterval;

            if (shouldUpdateEnhanced) {
                // Update enhanced components less frequently
                if (villager.survivalInstinct && typeof villager.survivalInstinct.update === 'function') {
                    villager.survivalInstinct.update(deltaTime);
                }

                if (villager.socialNetwork && typeof villager.socialNetwork.update === 'function') {
                    villager.socialNetwork.update(deltaTime);
                }

                if (villager.shelterSystem && typeof villager.shelterSystem.update === 'function') {
                    villager.shelterSystem.update(deltaTime);
                }

                // Check for state transitions based on survival instinct
                this.checkSurvivalStateTransitions(villager);

                villager.performanceData.lastEnhancedUpdate = now;
            }

            // Always update state machine and animation (lightweight)
            if (villager.stateMachine && typeof villager.stateMachine.update === 'function') {
                villager.stateMachine.update(deltaTime);
            } else {
                // Fallback to original behavior if state machine not available
                this.updateVillagerState(villager, deltaTime);
            }

            // Update animation based on current state
            this.updateAnimation(villager);
        } catch (error) {
            console.error(`Error updating enhanced villager ${villager.id}:`, error);
            // Fallback to basic update
            this.updateVillagerState(villager, deltaTime);
        }
    }

    /**
     * Check for state transitions based on survival instinct
     * @param {Object} villager - Villager to check
     */
    checkSurvivalStateTransitions(villager) {
        if (!villager.survivalInstinct || !villager.survivalInstinct.survivalState) return;

        const { survivalState } = villager.survivalInstinct;
        const threatLevel = survivalState.threatLevel || 0;
        const panicLevel = survivalState.panicLevel || 0;
        const stamina = survivalState.stamina || 100;

        // Transition to appropriate state based on survival instinct
        if (stamina <= 10) {
            // Exhausted - seek shelter
            if (villager.state !== this.STATES.SEEKING_SHELTER && villager.state !== this.STATES.IN_SHELTER) {
                this.changeVillagerState(villager, this.STATES.SEEKING_SHELTER);
            }
        } else if (panicLevel > 0.7 || threatLevel > 0.6) {
            // High panic or threat - flee
            if (villager.state !== this.STATES.FLEEING && villager.state !== this.STATES.SEEKING_SHELTER) {
                this.changeVillagerState(villager, this.STATES.FLEEING);
            }
        } else if (threatLevel > 0.3 || panicLevel > 0.4) {
            // Moderate threat - alert
            if (villager.state !== this.STATES.ALERT && threatLevel > 0.3) {
                this.changeVillagerState(villager, this.STATES.ALERT);
            }
        } else if (threatLevel < 0.1 && panicLevel < 0.2) {
            // Calm - return to normal activities
            if (villager.state === this.STATES.FLEEING || villager.state === this.STATES.ALERT) {
                this.decideNextAction(villager);
            }
        }
    }

    /**
     * Change villager state using enhanced state machine
     * @param {Object} villager - Villager to change state
     * @param {string} newState - New state to transition to
     */
    changeVillagerState(villager, newState) {
        if (villager.stateMachine) {
            villager.stateMachine.changeState(newState);
        } else {
            villager.state = newState;
        }
    }

    updateVillagerState(villager, deltaTime) {
        if (!villager.mesh || !villager.physics) return;

        // Update animation based on state
        this.updateAnimation(villager);

        // Update based on current state
        switch (villager.state) {
            case this.STATES.IDLE:
                // No movement in idle state
                villager.physics.body.setLinearVelocity(BABYLON.Vector3.Zero());
                break;

            case this.STATES.WANDERING:
            case this.STATES.MOVING_TO_TARGET:
                this.updateVillagerMovement(villager, deltaTime);
                break;

            case this.STATES.PERFORMING_TASK:
                // Increment task timer
                villager.taskTimer += deltaTime;
                // Could add task animations here
                break;

            case this.STATES.SOCIALIZING:
                // Implement socializing behavior - look for nearby villagers
                this.updateSocializing(villager, deltaTime);
                break;

            case this.STATES.INSIDE_HOME:
                // Inside home - hidden and inactive
                break;

            case this.STATES.FLEEING:
                // For future implementation - fleeing from threats
                break;
        }
    }

    updateVillagerMovement(villager, deltaTime) {
        if (!villager.destination) {
            villager.state = this.STATES.IDLE;
            setTimeout(() => this.decideNextAction(villager), 1000 + Math.random() * 2000);
            return;
        }

        const direction = villager.destination.subtract(villager.mesh.position);
        const distance = direction.length();

        if (distance < 0.5) {
            // Arrived at destination
            villager.physics.body.setLinearVelocity(BABYLON.Vector3.Zero());

            // Call onArrival callback if exists
            if (typeof villager.onArrival === 'function') {
                villager.onArrival();
                villager.onArrival = null;
            } else {
                villager.state = this.STATES.IDLE;
                setTimeout(() => this.decideNextAction(villager), 2000 + Math.random() * 3000);
            }
            return;
        }

        direction.normalize();
        const moveStep = direction.scale(villager.speed * deltaTime * 60);
        const newPosition = villager.mesh.position.add(moveStep);

        const groundHeight = BowlCreator.getTerrainHeight(newPosition.x, newPosition.z);
        if (groundHeight !== null) {
            newPosition.y = groundHeight + 0.9;
            villager.mesh.position = newPosition;

            // Update rotation to face movement direction
            const targetRotation = Math.atan2(direction.x, direction.z);
            const currentRotation = villager.mesh.rotation.y;
            const rotationDiff = this.wrapAngle(targetRotation - currentRotation);
            villager.mesh.rotation.y += rotationDiff * 0.1;

            // Update physics velocity for movement
            villager.physics.body.setLinearVelocity(moveStep.scale(1 / deltaTime));
            villager.physics.body.setAngularVelocity(BABYLON.Vector3.Zero());
        }
    }

    updateSocializing(villager, deltaTime) {
        // Increment social timer
        villager.socialTimer += deltaTime;

        // Find nearby villagers
        const nearbyVillagers = this.villagers.filter(other =>
            other.id !== villager.id
            && other.state === this.STATES.SOCIALIZING
            && other.mesh
            && BABYLON.Vector3.Distance(villager.mesh.position, other.mesh.position) < 5
        );

        // If there are nearby villagers, face the closest one
        if (nearbyVillagers.length > 0) {
            const closest = nearbyVillagers.reduce((prev, curr) =>
                BABYLON.Vector3.Distance(villager.mesh.position, curr.mesh.position)
                < BABYLON.Vector3.Distance(villager.mesh.position, prev.mesh.position) ? curr : prev
            );

            const direction = closest.mesh.position.subtract(villager.mesh.position);
            const targetRotation = Math.atan2(direction.x, direction.z);
            const currentRotation = villager.mesh.rotation.y;
            const rotationDiff = this.wrapAngle(targetRotation - currentRotation);
            villager.mesh.rotation.y += rotationDiff * 0.1;

            // Occasionally wave if close enough
            if (BABYLON.Vector3.Distance(villager.mesh.position, closest.mesh.position) < 3
                && Math.random() < 0.005) { // 0.5% chance per frame
                this.villagerModel.playAnimation(villager, 'greet', false);
            }
        }
    }

    updateAnimation(villager) {
        // Get the animation for the current state
        const animationName = this.stateToAnimation[villager.state];

        // Skip if no animation for this state or mesh is not visible
        if (!animationName || !villager.mesh || villager.mesh.visibility === 0) {
            return;
        }

        // Special case for socializing - use greet animation if there are nearby villagers
        if (villager.state === this.STATES.SOCIALIZING) {
            const nearbyVillagers = this.villagers.filter(other =>
                other.id !== villager.id
                && other.state === this.STATES.SOCIALIZING
                && other.mesh
                && BABYLON.Vector3.Distance(villager.mesh.position, other.mesh.position) < 3
            );

            if (nearbyVillagers.length > 0 && Math.random() < 0.02) {
                // Occasionally greet when near others (2% chance per frame)
                this.villagerModel.playAnimation(villager, 'greet', false);
                return;
            }
        }

        // Special case for walking/running - adjust speed based on state
        if (animationName === 'walk') {
            let speedRatio = 1.0;

            if (villager.state === this.STATES.FLEEING) {
                speedRatio = 2.0; // Faster animation for fleeing
            } else if (villager.destination) {
                // Adjust animation speed based on distance to destination
                const distToDestination = BABYLON.Vector3.Distance(
                    villager.mesh.position,
                    villager.destination
                );

                if (distToDestination < 5) {
                    speedRatio = 0.7; // Slow down when approaching destination
                }
            }

            // Apply animation with speed ratio
            if (villager.mesh.animationGroups
                && villager.mesh.animationGroups.walk
                && (!villager.mesh.animationGroups.walk.isPlaying
                 || villager.mesh.animationGroups.walk.speedRatio !== speedRatio)) {
                this.villagerModel.playAnimation(villager, 'walk', true, speedRatio);
            }
            return;
        }

        // For other animations, apply if not already playing
        if (villager.mesh.animationGroups
            && villager.mesh.animationGroups[animationName]
            && !villager.mesh.animationGroups[animationName].isPlaying) {
            this.villagerModel.playAnimation(villager, animationName);
        }
    }

    killVillager(villager) {
        // Create blood decal at the villager's position
        this.bloodDecalManager.createBloodDecal(villager.mesh.position);

        // Remove the villager
        const index = this.villagers.findIndex(v => v.id === villager.id);
        if (index !== -1) {
            this.villagers.splice(index, 1);
        }
        villager.mesh.dispose();

        // Spawn a new zombie in its place
        if (this.zombieSystem) {
            this.zombieSystem.addZombie(villager.mesh.position);
        }
    }

    // Enhanced State Handlers

    /**
     * Enter idle state
     * @param {Object} villager - Villager entering state
     */
    enterIdleState(villager) {
        villager.destination = null;
        if (villager.physics) {
            villager.physics.body.setLinearVelocity(BABYLON.Vector3.Zero());
        }
    }

    /**
     * Update idle state
     * @param {Object} villager - Villager in state
     * @param {number} deltaTime - Time delta
     */
    updateIdleState(villager, deltaTime) {
        // Check if we should transition to another state
        setTimeout(() => this.decideNextAction(villager), 1000 + Math.random() * 2000);
    }

    /**
     * Exit idle state
     * @param {Object} villager - Villager exiting state
     */
    exitIdleState(villager) {
        // No specific cleanup needed
    }

    /**
     * Enter fleeing state
     * @param {Object} villager - Villager entering state
     */
    enterFleeingState(villager) {
        console.log(`Villager ${villager.id} entering fleeing state`);

        // Increase speed for fleeing
        villager.speed = 0.08;

        // Use survival instinct to determine flee direction
        if (villager.survivalInstinct && villager.survivalInstinct.survivalState.currentThreat) {
            // Calculate flee direction away from threat
            const threatPos = villager.survivalInstinct.survivalState.currentThreat.mesh.position;
            const villagerPos = villager.mesh.position;

            const fleeDirection = villagerPos.subtract(threatPos).normalize();
            const fleeDistance = 50;

            villager.destination = new BABYLON.Vector3(
                villager.mesh.position.x + fleeDirection.x * fleeDistance,
                villager.mesh.position.y,
                villager.mesh.position.z + fleeDirection.z * fleeDistance
            );

            // Adjust destination to terrain height
            const groundHeight = BowlCreator.getTerrainHeight(villager.destination.x, villager.destination.z);
            if (groundHeight !== null) {
                villager.destination.y = groundHeight + 0.9;
            }
        } else {
            // Fallback: flee in random direction
            const angle = Math.random() * Math.PI * 2;
            const fleeDistance = 30;
            villager.destination = new BABYLON.Vector3(
                villager.mesh.position.x + Math.cos(angle) * fleeDistance,
                villager.mesh.position.y,
                villager.mesh.position.z + Math.sin(angle) * fleeDistance
            );

            const groundHeight = BowlCreator.getTerrainHeight(villager.destination.x, villager.destination.z);
            if (groundHeight !== null) {
                villager.destination.y = groundHeight + 0.9;
            }
        }

        // Share threat information with nearby villagers
        if (villager.socialNetwork && this.communicationSystem) {
            this.communicationSystem.sendMessage(
                villager,
                'social_interaction',
                {
                    type: 'panic_alert',
                    threatLevel: villager.survivalInstinct?.survivalState?.threatLevel || 0.8,
                    position: villager.mesh.position
                },
                { range: 20 }
            );
        }
    }

    /**
     * Update fleeing state
     * @param {Object} villager - Villager in state
     * @param {number} deltaTime - Time delta
     */
    updateFleeingState(villager, deltaTime) {
        // Use enhanced movement with survival instinct
        this.updateVillagerMovement(villager, deltaTime);

        // Check if we should seek shelter instead
        if (villager.survivalInstinct && villager.survivalInstinct.survivalState.stamina <= 10) {
            this.changeVillagerState(villager, this.STATES.SEEKING_SHELTER);
        }

        // Check if threat has passed
        if (villager.survivalInstinct && villager.survivalInstinct.survivalState.threatLevel < 0.2) {
            this.decideNextAction(villager);
        }
    }

    /**
     * Exit fleeing state
     * @param {Object} villager - Villager exiting state
     */
    exitFleeingState(villager) {
        // Reset speed to normal
        villager.speed = 0.05;
        console.log(`Villager ${villager.id} exiting fleeing state`);
    }

    /**
     * Enter seeking shelter state
     * @param {Object} villager - Villager entering state
     */
    enterSeekingShelterState(villager) {
        console.log(`Villager ${villager.id} seeking shelter`);

        if (villager.shelterSystem) {
            const bestShelter = villager.shelterSystem.findBestAvailableShelter();
            if (bestShelter) {
                villager.destination = bestShelter.position.clone();
                villager.targetShelter = bestShelter;
            } else {
                // No shelter available, continue fleeing
                this.changeVillagerState(villager, this.STATES.FLEEING);
            }
        }
    }

    /**
     * Update seeking shelter state
     * @param {Object} villager - Villager in state
     * @param {number} deltaTime - Time delta
     */
    updateSeekingShelterState(villager, deltaTime) {
        this.updateVillagerMovement(villager, deltaTime);

        // Check if we've reached the shelter
        if (villager.destination && villager.mesh) {
            const distance = BABYLON.Vector3.Distance(villager.mesh.position, villager.destination);
            if (distance < 2.0) {
                this.changeVillagerState(villager, this.STATES.IN_SHELTER);
            }
        }
    }

    /**
     * Exit seeking shelter state
     * @param {Object} villager - Villager exiting state
     */
    exitSeekingShelterState(villager) {
        // Clear shelter target
        villager.targetShelter = null;
    }

    /**
     * Enter in shelter state
     * @param {Object} villager - Villager entering state
     */
    enterInShelterState(villager) {
        console.log(`Villager ${villager.id} entered shelter`);

        if (villager.shelterSystem && villager.targetShelter) {
            villager.shelterSystem.enterShelter(villager.targetShelter);
        }

        // Stop movement
        villager.destination = null;
        if (villager.physics) {
            villager.physics.body.setLinearVelocity(BABYLON.Vector3.Zero());
        }
    }

    /**
     * Update in shelter state
     * @param {Object} villager - Villager in state
     * @param {number} deltaTime - Time delta
     */
    updateInShelterState(villager, deltaTime) {
        // Check if it's safe to leave shelter
        if (villager.survivalInstinct && villager.survivalInstinct.survivalState.threatLevel < 0.1) {
            // Wait a bit longer to be sure
            setTimeout(() => {
                if (villager.survivalInstinct.survivalState.threatLevel < 0.1) {
                    this.decideNextAction(villager);
                }
            }, 5000);
        }
    }

    /**
     * Exit in shelter state
     * @param {Object} villager - Villager exiting state
     */
    exitInShelterState(villager) {
        console.log(`Villager ${villager.id} leaving shelter`);

        if (villager.shelterSystem) {
            villager.shelterSystem.exitShelter();
        }
    }

    /**
     * Enter alert state
     * @param {Object} villager - Villager entering state
     */
    enterAlertState(villager) {
        console.log(`Villager ${villager.id} entering alert state`);

        // Reduce movement speed to be more cautious
        villager.speed = 0.03;

        // Share alert information with social network
        if (villager.socialNetwork && this.communicationSystem) {
            this.communicationSystem.sendMessage(
                villager,
                'social_interaction',
                {
                    type: 'alert_warning',
                    threatLevel: villager.survivalInstinct?.survivalState?.threatLevel || 0.4,
                    position: villager.mesh.position
                },
                { range: 15 }
            );
        }
    }

    /**
     * Update alert state
     * @param {Object} villager - Villager in state
     * @param {number} deltaTime - Time delta
     */
    updateAlertState(villager, deltaTime) {
        // Continue current activity but with heightened awareness
        this.updateVillagerMovement(villager, deltaTime);

        // Check if threat level increases (transition to fleeing)
        if (villager.survivalInstinct && villager.survivalInstinct.survivalState.threatLevel > 0.6) {
            this.changeVillagerState(villager, this.STATES.FLEEING);
        }
    }

    /**
     * Exit alert state
     * @param {Object} villager - Villager exiting state
     */
    exitAlertState(villager) {
        // Reset speed to normal
        villager.speed = 0.05;
    }

    /**
     * Enter socializing state with enhanced social network
     * @param {Object} villager - Villager entering state
     */
    enterSocializingState(villager) {
        // Find nearby villagers to socialize with
        const nearbyVillagers = this.villagers.filter(other =>
            other.id !== villager.id
            && other.mesh
            && BABYLON.Vector3.Distance(villager.mesh.position, other.mesh.position) < 10
        );

        // Initiate social interaction with a random nearby villager
        if (nearbyVillagers.length > 0 && villager.socialNetwork) {
            const targetVillager = nearbyVillagers[Math.floor(Math.random() * nearbyVillagers.length)];
            villager.socialNetwork.initiateSocialInteraction(targetVillager);
        }
    }

    /**
     * Update socializing state with enhanced social network
     * @param {Object} villager - Villager in state
     * @param {number} deltaTime - Time delta
     */
    updateSocializingState(villager, deltaTime) {
        // Original socializing behavior as fallback
        this.updateSocializing(villager, deltaTime);

        // The social network system handles its own updates in updateEnhancedVillager
    }

    /**
     * Exit socializing state
     * @param {Object} villager - Villager exiting state
     */
    exitSocializingState(villager) {
        // No specific cleanup needed
    }

    /**
     * Enter wandering state
     * @param {Object} villager - Villager entering state
     */
    enterWanderingState(villager) {
        // Set random destination for wandering
        this.startWandering(villager);
    }

    /**
     * Update wandering state
     * @param {Object} villager - Villager in state
     * @param {number} deltaTime - Time delta
     */
    updateWanderingState(villager, deltaTime) {
        this.updateVillagerMovement(villager, deltaTime);
    }

    /**
     * Exit wandering state
     * @param {Object} villager - Villager exiting state
     */
    exitWanderingState(villager) {
        // No specific cleanup needed
    }

    /**
     * Enhanced villager disposal with cleanup of new systems
     */
    dispose() {
        if (this.worldClock) {
            this.worldClock.dispose();
        }

        if (this.dayNightCycle) {
            this.dayNightCycle.dispose();
        }

        if (this.communicationSystem) {
            this.communicationSystem.dispose();
        }

        if (this.environmentalAwareness) {
            this.environmentalAwareness.dispose();
        }

        this.villagers.forEach(villager => {
            if (villager.updateObserver) {
                this.scene.onBeforeRenderObservable.remove(villager.updateObserver);
            }

            // Dispose enhanced components
            if (villager.survivalInstinct) {
                villager.survivalInstinct.dispose();
            }
            if (villager.socialNetwork) {
                villager.socialNetwork.dispose();
            }
            if (villager.shelterSystem) {
                villager.shelterSystem.dispose();
            }
            if (villager.stateMachine) {
                villager.stateMachine.dispose();
            }
        });

        this.scene.onBeforeRenderObservable.clear();
    }
}
