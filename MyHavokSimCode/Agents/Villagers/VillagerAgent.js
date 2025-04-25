import { BasicAgent } from '../BasicAgent.js';
import { VillagerModel } from './VillagerModel.js';

// Error handling decorator
function ErrorDecorator(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function(...args) {
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

export class VillagerAgent {
    constructor(scene) {
        this.scene = scene;
        this.villagerModel = new VillagerModel(scene);
        this.basicAgent = new BasicAgent(scene);
        this.villagers = [];
        
        // Define villager states matching VillagerBehaviour
        this.STATES = {
            IDLE: 'idle',
            WANDERING: 'wandering',
            MOVING_TO_TARGET: 'moving_to_target',
            PERFORMING_TASK: 'performing_task',
            SOCIALIZING: 'socializing',
            INSIDE_HOME: 'inside_home',
            FLEEING: 'fleeing'
        };
    }

    createAgent(name, position) {
        // Create a basic agent first to get the physics setup
        const basicAgent = this.basicAgent.createAgent(name, position);
        
        // Create a villager model for visual representation
        const villagerModel = this.villagerModel.createVillager(position);
        
        // Merge the objects while keeping both the physics from basic agent and the visual from villager model
        const villager = {
            id: this.villagers.length,
            name: name,
            mesh: basicAgent.mesh, // Root mesh with physics
            parts: villagerModel.parts, // Visual parts
            physics: basicAgent.physics, // Physics system
            
            // State tracking
            state: this.STATES.IDLE,
            previousState: null,
            stateChangeTime: performance.now(),
            
            // Movement parameters
            speed: 0.5 + Math.random() * 0.5,
            destination: null,
            path: [], // For future pathfinding
            
            // Home/schedule tracking
            home: null,  // Will be assigned by VillagerBehaviour
            workLocation: null,
            socialLocation: null,
            currentPOI: null, // Current point of interest
            
            // Task handling
            taskDuration: 0,
            taskTimer: 0,
            taskProgress: 0,
            
            // Socializing
            socialTargets: [],
            socialTimer: 0,
            
            // Callback for arrival at destination
            onArrival: null,
            
            // Schedule/routine tracking
            schedule: {
                wakeUpTime: 6 * 60 + Math.random() * 60, // 6-7 AM in minutes
                workStartTime: 9 * 60 + Math.random() * 60, // 9-10 AM
                workEndTime: 16 * 60 + Math.random() * 60, // 4-5 PM
                sleepTime: 21 * 60 + Math.random() * 60, // 9-10 PM
            },
            
            // Needs system (future expansion)
            needs: {
                energy: 100,
                social: 100,
                hunger: 100
            },
            
            // Method to change state with tracking
            changeState: function(newState) {
                if (this.state !== newState) {
                    this.previousState = this.state;
                    this.state = newState;
                    this.stateChangeTime = performance.now();
                    console.log(`Villager ${this.id} changed state from ${this.previousState} to ${newState}`);
                }
            },
            
            // Calculate how long the villager has been in the current state
            getTimeInState: function() {
                return (performance.now() - this.stateChangeTime) / 1000; // In seconds
            }
        };
        
        // Hide the basic agent's visual parts and use our custom villager model
        Object.values(basicAgent.parts).forEach(part => {
            if (part && part.dispose) {
                part.dispose();
            }
        });
        
        // Parent the villager model to the basic agent's root
        villagerModel.mesh.parent = basicAgent.mesh;
        villagerModel.mesh.position = BABYLON.Vector3.Zero(); // Reset position relative to parent
        
        this.villagers.push(villager);
        return villager;
    }

    getVillagerById(id) {
        return this.villagers.find(v => v.id === id);
    }

    updateNeeds(villager, deltaTime) {
        // Simple needs decay over time
        // Energy decreases faster when moving
        const isActive = villager.state === this.STATES.MOVING_TO_TARGET || 
                         villager.state === this.STATES.WANDERING ||
                         villager.state === this.STATES.PERFORMING_TASK;
                         
        const energyDecay = isActive ? 2 : 0.5;
        villager.needs.energy = Math.max(0, villager.needs.energy - energyDecay * deltaTime);
        
        // Social increases when socializing, decreases otherwise
        if (villager.state === this.STATES.SOCIALIZING) {
            villager.needs.social = Math.min(100, villager.needs.social + 5 * deltaTime);
        } else {
            villager.needs.social = Math.max(0, villager.needs.social - 0.5 * deltaTime);
        }
        
        // Hunger always decreases
        villager.needs.hunger = Math.max(0, villager.needs.hunger - 1 * deltaTime);
        
        // Inside home restores energy
        if (villager.state === this.STATES.INSIDE_HOME) {
            villager.needs.energy = Math.min(100, villager.needs.energy + 10 * deltaTime);
        }
    }

    dispose() {
        this.villagers.forEach(villager => {
            if (villager.mesh && villager.mesh.dispose) {
                if (villager.physics) {
                    villager.physics.dispose();
                }
                villager.mesh.dispose();
            }
        });
        
        this.villagers = [];
        
        if (this.villagerModel) {
            this.villagerModel.dispose();
        }
        
        if (this.basicAgent) {
            this.basicAgent.dispose();
        }
    }
} 