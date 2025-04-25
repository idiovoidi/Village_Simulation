import { BowlCreator } from '../../BowlCreator.js';
import { WorldClock } from '../../UI/WorldClock.js';
import { DayNightCycle } from '../../Environment/DayNightCycle.js';
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

// Performance measurement decorator
function Measure(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function(...args) {
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
        
        // Initialize time-related systems
        this.worldClock = new WorldClock(this.scene);
        this.dayNightCycle = new DayNightCycle(this.scene);
        
        // Define states based on our design document
        this.STATES = {
            IDLE: 'idle',
            WANDERING: 'wandering',
            MOVING_TO_TARGET: 'moving_to_target',
            PERFORMING_TASK: 'performing_task',
            SOCIALIZING: 'socializing',
            INSIDE_HOME: 'inside_home',
            FLEEING: 'fleeing'
        };
        
        // Points of interest registry
        this.socialHubs = [];
        this.workLocations = [];
        this.homeLocations = [];
        
        // Animation mappings
        this.stateToAnimation = {
            [this.STATES.IDLE]: 'idle',
            [this.STATES.WANDERING]: 'walk',
            [this.STATES.MOVING_TO_TARGET]: 'walk',
            [this.STATES.PERFORMING_TASK]: 'work',
            [this.STATES.SOCIALIZING]: 'idle', // Default idle, will switch to 'greet' when near others
            [this.STATES.INSIDE_HOME]: null, // No animation when inside (hidden)
            [this.STATES.FLEEING]: 'walk' // Use walk animation at faster speed for fleeing
        };
        
        // Helper function to replace missing BABYLON.Scalar.WrapAngle
        this.wrapAngle = function(angle) {
            // Wrap the angle between -PI and PI
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
        
        // Find an available home
        const availableHome = this.homeLocations.find(home => !home.assigned);
        if (availableHome) {
            villager.home = availableHome;
            availableHome.assigned = true;
            console.log(`Villager ${villager.id} assigned to home ${availableHome.id}`);
        } else {
            console.warn(`No available home for villager ${villager.id}`);
            // Create a fallback "home" location
            villager.home = {
                id: `temp_home_${villager.id}`,
                position: villager.mesh.position.clone(),
                radius: 3
            };
        }
        
        // Add movement update observer
        this.addMovementObserver(villager);
        
        this.villagers.push(villager);
        
        // Schedule first action
        this.decideNextAction(villager);
        
        return villager;
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
        // Update UI with current time from DayNightCycle
        this.worldClock.updateTime(this.dayNightCycle.getGameTime());

        // Update villagers
        this.villagers.forEach(villager => {
            this.updateVillagerState(villager, deltaTime);
        });
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
            villager.physics.body.setLinearVelocity(moveStep.scale(1/deltaTime));
            villager.physics.body.setAngularVelocity(BABYLON.Vector3.Zero());
        }
    }

    updateSocializing(villager, deltaTime) {
        // Increment social timer
        villager.socialTimer += deltaTime;
        
        // Find nearby villagers
        const nearbyVillagers = this.villagers.filter(other => 
            other.id !== villager.id && 
            other.state === this.STATES.SOCIALIZING &&
            other.mesh && 
            BABYLON.Vector3.Distance(villager.mesh.position, other.mesh.position) < 5
        );
        
        // If there are nearby villagers, face the closest one
        if (nearbyVillagers.length > 0) {
            const closest = nearbyVillagers.reduce((prev, curr) => 
                BABYLON.Vector3.Distance(villager.mesh.position, curr.mesh.position) < 
                BABYLON.Vector3.Distance(villager.mesh.position, prev.mesh.position) ? curr : prev
            );
            
            const direction = closest.mesh.position.subtract(villager.mesh.position);
            const targetRotation = Math.atan2(direction.x, direction.z);
            const currentRotation = villager.mesh.rotation.y;
            const rotationDiff = this.wrapAngle(targetRotation - currentRotation);
            villager.mesh.rotation.y += rotationDiff * 0.1;
            
            // Occasionally wave if close enough
            if (BABYLON.Vector3.Distance(villager.mesh.position, closest.mesh.position) < 3 && 
                Math.random() < 0.005) { // 0.5% chance per frame
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
                other.id !== villager.id && 
                other.state === this.STATES.SOCIALIZING &&
                other.mesh && 
                BABYLON.Vector3.Distance(villager.mesh.position, other.mesh.position) < 3
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
            if (villager.mesh.animationGroups && 
                villager.mesh.animationGroups.walk && 
                (!villager.mesh.animationGroups.walk.isPlaying || 
                 villager.mesh.animationGroups.walk.speedRatio !== speedRatio)) {
                this.villagerModel.playAnimation(villager, 'walk', true, speedRatio);
            }
            return;
        }
        
        // For other animations, apply if not already playing
        if (villager.mesh.animationGroups && 
            villager.mesh.animationGroups[animationName] && 
            !villager.mesh.animationGroups[animationName].isPlaying) {
            this.villagerModel.playAnimation(villager, animationName);
        }
    }

    dispose() {
        if (this.worldClock) {
            this.worldClock.dispose();
        }
        
        if (this.dayNightCycle) {
            this.dayNightCycle.dispose();
        }
        
        this.villagers.forEach(villager => {
            if (villager.updateObserver) {
                this.scene.onBeforeRenderObservable.remove(villager.updateObserver);
            }
        });
        
        this.scene.onBeforeRenderObservable.clear();
    }
} 