import { BowlCreator } from '../../BowlCreator.js';
import { WorldClock } from '../../UI/WorldClock.js';
import { DayNightCycle } from '../../Environment/DayNightCycle.js';
import { VillagerAgent } from './VillagerAgent.js';
import { BloodDecalManager } from '../../Effects/BloodDecalManager.js';

/**
 * Simplified VillagerBehaviour without advanced systems
 * This version focuses on basic behavior without the performance-heavy
 * survival instinct, social network, and shelter systems.
 */
export class VillagerBehaviour {
    constructor(scene) {
        this.scene = scene;
        this.villagers = [];
        this.villagerAgent = new VillagerAgent(scene);
        this.bloodDecalManager = new BloodDecalManager(scene);
        
        // Initialize time-related systems
        this.worldClock = new WorldClock(this.scene);
        this.dayNightCycle = new DayNightCycle(this.scene);
        
        // Simple states
        this.STATES = {
            IDLE: 'idle',
            WANDERING: 'wandering',
            MOVING_TO_TARGET: 'moving_to_target',
            INSIDE_HOME: 'inside_home',
            FLEEING: 'fleeing'
        };
        
        // Points of interest registry
        this.socialHubs = [];
        this.workLocations = [];
        this.homeLocations = [];
        
        // Simple animation mappings
        this.stateToAnimation = {
            [this.STATES.IDLE]: 'idle',
            [this.STATES.WANDERING]: 'walk',
            [this.STATES.MOVING_TO_TARGET]: 'walk',
            [this.STATES.INSIDE_HOME]: null,
            [this.STATES.FLEEING]: 'walk'
        };
        
        // Helper function to wrap angles
        this.wrapAngle = function(angle) {
            const PI2 = Math.PI * 2;
            while (angle > Math.PI) angle -= PI2;
            while (angle < -Math.PI) angle += PI2;
            return angle;
        };
        
        // Initialize update loop
        this.scene.onBeforeRenderObservable.add(() => {
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            this.updateVillagers(deltaTime);
        });
        
        console.log('VillagerBehaviour: Initialized with simplified behavior (advanced systems disabled)');
    }
    
    initialize(count = 10) {
        // Create initial points of interest
        this.createDefaultPOIs();
        
        // Create villagers in a circle around the center
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 20 + Math.random() * 10;
            const position = new BABYLON.Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            this.createVillager(position);
        }
    }
    
    createDefaultPOIs() {
        // Create some default social hubs
        this.socialHubs.push({
            id: 'market',
            position: new BABYLON.Vector3(0, 0, 0),
            type: 'market'
        });
        
        this.socialHubs.push({
            id: 'well',
            position: new BABYLON.Vector3(15, 0, 15),
            type: 'well'
        });
        
        // Create work locations
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const radius = 25;
            this.workLocations.push({
                id: `work_${i}`,
                position: new BABYLON.Vector3(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                ),
                type: 'work'
            });
        }
        
        // Create homes
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const radius = 35;
            this.homeLocations.push({
                id: `house_${i}`,
                position: new BABYLON.Vector3(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                ),
                type: 'home',
                assigned: false
            });
        }
    }
    
    createVillager(position) {
        const villager = this.villagerAgent.createAgent(
            `villager_${this.villagers.length}`,
            position
        );
        
        return this.addVillager(villager);
    }
    
    addVillager(villager) {
        if (!villager.mesh || !villager.physics) {
            console.warn('Villager added without proper physics setup');
            return null;
        }
        
        // Basic villager properties
        villager.id = `villager_${this.villagers.length}`;
        villager.state = this.STATES.IDLE;
        villager.target = null;
        villager.speed = 2 + Math.random();
        villager.health = 100;
        villager.infected = false;
        villager.home = null;
        villager.currentTask = null;
        villager.taskTimer = 0;
        
        // Find an available home
        const availableHome = this.homeLocations.find(home => !home.assigned);
        if (availableHome) {
            villager.home = availableHome;
            availableHome.assigned = true;
        }
        
        this.villagers.push(villager);
        this.addMovementObserver(villager);
        
        // Start with a random action
        setTimeout(() => this.decideNextAction(villager), Math.random() * 2000);
        
        return villager;
    }
    
    addMovementObserver(villager) {
        let walkTime = 0;
        villager.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (!villager.mesh || !villager.physics) return;
            
            // Force upright orientation
            villager.mesh.rotation.x = 0;
            villager.mesh.rotation.z = 0;
            
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
            }
        });
    }
    
    decideNextAction(villager) {
        const gameTimeMinutes = this.dayNightCycle.getGameTime();
        const hour = Math.floor(gameTimeMinutes / 60);
        
        // Simple schedule based on time of day
        if (hour >= 22 || hour < 6) {
            // Nighttime: go home
            this.goHome(villager);
        } else if (hour >= 6 && hour < 9) {
            // Morning: leave home and wander
            if (villager.state === this.STATES.INSIDE_HOME) {
                this.leaveHome(villager);
            } else {
                this.startWandering(villager);
            }
        } else if (hour >= 9 && hour < 17) {
            // Daytime: wander or idle
            if (Math.random() < 0.5) {
                this.startWandering(villager);
            } else {
                this.startIdling(villager);
            }
        } else {
            // Evening: wander
            this.startWandering(villager);
        }
    }
    
    goHome(villager) {
        if (!villager.home) {
            this.startWandering(villager);
            return;
        }
        
        if (villager.state === this.STATES.INSIDE_HOME) {
            return;
        }
        
        const distance = BABYLON.Vector3.Distance(villager.mesh.position, villager.home.position);
        if (distance < 2) {
            villager.state = this.STATES.INSIDE_HOME;
            if (villager.mesh) {
                villager.mesh.visibility = 0;
            }
            setTimeout(() => this.decideNextAction(villager), 60000);
        } else {
            this.moveToTarget(villager, villager.home.position);
        }
    }
    
    leaveHome(villager) {
        if (!villager.home) return;
        
        if (villager.mesh) {
            villager.mesh.visibility = 1;
        }
        
        villager.state = this.STATES.IDLE;
        this.startWandering(villager);
    }
    
    startWandering(villager) {
        villager.state = this.STATES.WANDERING;
        
        // Pick a random nearby point
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 20;
        const target = new BABYLON.Vector3(
            villager.mesh.position.x + Math.cos(angle) * distance,
            0,
            villager.mesh.position.z + Math.sin(angle) * distance
        );
        
        this.moveToTarget(villager, target);
    }
    
    startIdling(villager) {
        villager.state = this.STATES.IDLE;
        villager.target = null;
        
        if (villager.physics && villager.physics.body) {
            villager.physics.body.setLinearVelocity(BABYLON.Vector3.Zero());
        }
        
        setTimeout(() => this.decideNextAction(villager), 3000 + Math.random() * 5000);
    }
    
    moveToTarget(villager, targetPosition) {
        villager.target = targetPosition;
        villager.state = this.STATES.MOVING_TO_TARGET;
    }
    
    updateVillagers(deltaTime) {
        for (const villager of this.villagers) {
            if (!villager.mesh || !villager.physics) continue;
            
            // Skip if inside home
            if (villager.state === this.STATES.INSIDE_HOME) continue;
            
            // Update based on state
            if (villager.state === this.STATES.MOVING_TO_TARGET && villager.target) {
                this.updateMovement(villager, deltaTime);
            } else if (villager.state === this.STATES.WANDERING && villager.target) {
                this.updateMovement(villager, deltaTime);
            }
        }
    }
    
    /**
     * Update method called by BehavioralSim
     * This is a wrapper for compatibility with the behavior system
     */
    update() {
        const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
        this.updateVillagers(deltaTime);
    }
    
    updateMovement(villager, deltaTime) {
        if (!villager.target) return;
        
        const currentPos = villager.mesh.position;
        const targetPos = villager.target;
        const distance = BABYLON.Vector3.Distance(currentPos, targetPos);
        
        // Check if reached target
        if (distance < 1.5) {
            villager.target = null;
            this.startIdling(villager);
            return;
        }
        
        // Calculate direction
        const direction = targetPos.subtract(currentPos).normalize();
        
        // Apply velocity
        const velocity = direction.scale(villager.speed);
        if (villager.physics && villager.physics.body) {
            villager.physics.body.setLinearVelocity(new BABYLON.Vector3(velocity.x, 0, velocity.z));
        }
        
        // Update rotation to face movement direction
        const targetAngle = Math.atan2(direction.x, direction.z);
        const currentAngle = villager.mesh.rotation.y;
        const angleDiff = this.wrapAngle(targetAngle - currentAngle);
        villager.mesh.rotation.y += angleDiff * 0.1;
    }
    
    handleZombieThreat(villager, zombiePosition) {
        // Simple flee behavior
        villager.state = this.STATES.FLEEING;
        
        const fleeDirection = villager.mesh.position.subtract(zombiePosition).normalize();
        const fleeTarget = villager.mesh.position.add(fleeDirection.scale(30));
        
        this.moveToTarget(villager, fleeTarget);
    }
    
    dispose() {
        // Clean up observers
        for (const villager of this.villagers) {
            if (villager.updateObserver) {
                this.scene.onBeforeRenderObservable.remove(villager.updateObserver);
            }
        }
        
        this.villagers = [];
    }
}
