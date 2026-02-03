import { DogBehaviour } from './Agents/Dogs/DogBehaviour.js';
import { NavigationMesh } from './Navigation/NavigationMesh.js';
import { BasicAgent } from './Agents/BasicAgent.js';
import { VillagerBehaviour } from './Agents/Villagers/VillagerBehaviour.js';
// DinosaurBehaviour archived - not used in active levels

export class BehavioralSim {
    constructor(scene) {
        this.scene = scene;
        this.agents = [];
        this.targetPoints = [];
        this.zombies = [];
        this.zombieCount = 10;
        this.dogBehaviour = null;
        this.villagerBehaviour = null;
        // dinosaurBehaviour removed - archived
        this.navigationMesh = new NavigationMesh(scene);
        this.basicAgent = new BasicAgent(scene);
        
        // Performance optimization integration
        this.performanceOptimizer = null;
        this.optimizationEnabled = true;
        this.lastOptimizationUpdate = 0;
        this.optimizationUpdateInterval = 1000; // Update every second
        
        // Agent performance tracking
        this.agentPerformanceData = {
            totalAgents: 0,
            activeAgents: 0,
            visibleAgents: 0,
            updateTime: 0,
            lastFrameTime: 0
        };
        
        // Distance-based optimization settings
        this.distanceOptimization = {
            enabled: true,
            nearDistance: 20,    // Full update frequency
            mediumDistance: 50,  // Reduced update frequency
            farDistance: 100,    // Minimal update frequency
            cullingDistance: 150 // Don't update at all
        };
        
        // Return the initialization promise
        return this.init();
    }

    async init() {
        try {
            // Initialize navigation system
            await this.navigationMesh.initialize({
                gridSize: 20,
                spacing: 10,
                debug: this.scene.debugLayer.isVisible()
            });

            // Create target points for agents to seek
            this.createTargetPoints();
            // Create some basic agents
            this.createAgents(10); // Create 10 basic agents
            // Create zombies
            this.createZombies();
            // Initialize dogs
            this.initializeDogs();
            // Initialize villagers
            this.initializeVillagers();
            // Dinosaur system archived - not used

            // PERFORMANCE FIX: Disabled duplicate render loop
            // Updates are handled by the main render loop in Havokimport.js
            // this.scene.registerBeforeRender(() => this.updateBehaviorsOptimized());

            // Return this for chaining
            return this;
        } catch (error) {
            console.error('Failed to initialize BehavioralSim:', error);
            throw error;
        }
    }
    
    /**
     * Set performance optimizer reference for integration
     * @param {PerformanceOptimizer} optimizer - Performance optimizer instance
     */
    setPerformanceOptimizer(optimizer) {
        this.performanceOptimizer = optimizer;
        console.log('BehavioralSim integrated with PerformanceOptimizer');
    }
    
    /**
     * Enable or disable optimization features
     * @param {boolean} enabled - Whether to enable optimization
     */
    setOptimizationEnabled(enabled) {
        this.optimizationEnabled = enabled;
        console.log(`BehavioralSim optimization ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Configure distance-based optimization settings
     * @param {Object} settings - Distance optimization settings
     */
    configureDistanceOptimization(settings) {
        this.distanceOptimization = { ...this.distanceOptimization, ...settings };
        console.log('Distance optimization configured:', this.distanceOptimization);
    }
    
    /**
     * Optimized behavior update method
     */
    updateBehaviorsOptimized() {
        const startTime = performance.now();
        
        try {
            // Get camera position for distance calculations
            const camera = this.scene.activeCamera;
            const cameraPosition = camera ? camera.position : new BABYLON.Vector3(0, 0, 0);
            
            // Update agent performance tracking
            this.updateAgentPerformanceTracking(cameraPosition);
            
            // Update behaviors with optimization
            if (this.optimizationEnabled) {
                this.updateBehaviorsWithOptimization(cameraPosition);
            } else {
                this.updateBehaviors(); // Fallback to original method
            }
            
            // Track performance
            const endTime = performance.now();
            this.agentPerformanceData.updateTime = endTime - startTime;
            this.agentPerformanceData.lastFrameTime = endTime;
            
            // Update optimization system periodically
            if (endTime - this.lastOptimizationUpdate > this.optimizationUpdateInterval) {
                this.updateOptimizationMetrics();
                this.lastOptimizationUpdate = endTime;
            }
            
        } catch (error) {
            console.error('Error in optimized behavior update:', error);
            // Fallback to original method
            this.updateBehaviors();
        }
    }
    
    /**
     * Update behaviors with distance-based optimization
     * @param {BABYLON.Vector3} cameraPosition - Camera position for distance calculations
     */
    updateBehaviorsWithOptimization(cameraPosition) {
        // Update different agent types with optimization
        this.updateAgentsWithOptimization(cameraPosition);
        this.updateZombiesWithOptimization(cameraPosition);
        this.updateDogsWithOptimization(cameraPosition);
        this.updateVillagersWithOptimization(cameraPosition);
        // Dinosaur updates removed - system archived
    }
    
    /**
     * Update basic agents with distance-based optimization
     * @param {BABYLON.Vector3} cameraPosition - Camera position
     */
    updateAgentsWithOptimization(cameraPosition) {
        if (!this.agents || this.agents.length === 0) return;
        
        for (let i = 0; i < this.agents.length; i++) {
            const agent = this.agents[i];
            if (!agent || !agent.mesh) continue;
            
            const distance = BABYLON.Vector3.Distance(agent.mesh.position, cameraPosition);
            const updateFrequency = this.getUpdateFrequencyForDistance(distance);
            
            // Skip update based on distance and frame timing
            if (updateFrequency < 1.0 && Math.random() > updateFrequency) {
                continue;
            }
            
            // Update agent behavior
            this.updateAgentBehavior(agent, distance < this.distanceOptimization.nearDistance);
        }
    }
    
    /**
     * Update zombies with distance-based optimization
     * @param {BABYLON.Vector3} cameraPosition - Camera position
     */
    updateZombiesWithOptimization(cameraPosition) {
        if (!this.zombies || this.zombies.length === 0) return;
        
        for (let i = 0; i < this.zombies.length; i++) {
            const zombie = this.zombies[i];
            if (!zombie || !zombie.mesh) continue;
            
            const distance = BABYLON.Vector3.Distance(zombie.mesh.position, cameraPosition);
            const updateFrequency = this.getUpdateFrequencyForDistance(distance);
            
            if (updateFrequency < 1.0 && Math.random() > updateFrequency) {
                continue;
            }
            
            // Update zombie behavior (simplified for distant zombies)
            this.updateZombieBehavior(zombie, distance < this.distanceOptimization.nearDistance);
        }
    }
    
    /**
     * Update dogs with distance-based optimization
     * @param {BABYLON.Vector3} cameraPosition - Camera position
     */
    updateDogsWithOptimization(cameraPosition) {
        if (!this.dogBehaviour) return;
        
        // Let the dog behavior system handle its own optimization
        if (this.dogBehaviour.updateWithOptimization) {
            this.dogBehaviour.updateWithOptimization(cameraPosition, this.distanceOptimization);
        } else {
            this.dogBehaviour.update();
        }
    }
    
    /**
     * Update villagers with distance-based optimization
     * @param {BABYLON.Vector3} cameraPosition - Camera position
     */
    updateVillagersWithOptimization(cameraPosition) {
        if (!this.villagerBehaviour) return;
        
        // Let the villager behavior system handle its own optimization
        if (this.villagerBehaviour.updateWithOptimization) {
            this.villagerBehaviour.updateWithOptimization(cameraPosition, this.distanceOptimization);
        } else {
            this.villagerBehaviour.update();
        }
    }
    
    // updateDinosaursWithOptimization removed - dinosaur system archived
    
    /**
     * Get update frequency based on distance from camera
     * @param {number} distance - Distance from camera
     * @returns {number} Update frequency (0.0 to 1.0)
     */
    getUpdateFrequencyForDistance(distance) {
        if (distance < this.distanceOptimization.nearDistance) {
            return 1.0; // Full update frequency
        } else if (distance < this.distanceOptimization.mediumDistance) {
            return 0.5; // Half update frequency
        } else if (distance < this.distanceOptimization.farDistance) {
            return 0.25; // Quarter update frequency
        } else if (distance < this.distanceOptimization.cullingDistance) {
            return 0.1; // Very low update frequency
        } else {
            return 0.0; // No updates
        }
    }
    
    /**
     * Update agent performance tracking
     * @param {BABYLON.Vector3} cameraPosition - Camera position
     */
    updateAgentPerformanceTracking(cameraPosition) {
        let totalAgents = 0;
        let activeAgents = 0;
        let visibleAgents = 0;
        
        // Count basic agents
        if (this.agents) {
            totalAgents += this.agents.length;
            for (const agent of this.agents) {
                if (agent && agent.mesh) {
                    activeAgents++;
                    const distance = BABYLON.Vector3.Distance(agent.mesh.position, cameraPosition);
                    if (distance < this.distanceOptimization.farDistance) {
                        visibleAgents++;
                    }
                }
            }
        }
        
        // Count zombies
        if (this.zombies) {
            totalAgents += this.zombies.length;
            activeAgents += this.zombies.length;
            for (const zombie of this.zombies) {
                if (zombie && zombie.mesh) {
                    const distance = BABYLON.Vector3.Distance(zombie.mesh.position, cameraPosition);
                    if (distance < this.distanceOptimization.farDistance) {
                        visibleAgents++;
                    }
                }
            }
        }
        
        // Count dogs
        if (this.dogBehaviour && this.dogBehaviour.dogs) {
            totalAgents += this.dogBehaviour.dogs.length;
            activeAgents += this.dogBehaviour.dogs.length;
            for (const dog of this.dogBehaviour.dogs) {
                if (dog && dog.mesh) {
                    const distance = BABYLON.Vector3.Distance(dog.mesh.position, cameraPosition);
                    if (distance < this.distanceOptimization.farDistance) {
                        visibleAgents++;
                    }
                }
            }
        }
        
        // Count villagers
        if (this.villagerBehaviour && this.villagerBehaviour.villagers) {
            totalAgents += this.villagerBehaviour.villagers.length;
            activeAgents += this.villagerBehaviour.villagers.length;
            for (const villager of this.villagerBehaviour.villagers) {
                if (villager && villager.mesh) {
                    const distance = BABYLON.Vector3.Distance(villager.mesh.position, cameraPosition);
                    if (distance < this.distanceOptimization.farDistance) {
                        visibleAgents++;
                    }
                }
            }
        }
        
        // Dinosaur counting removed - system archived
        
        // Update performance data
        this.agentPerformanceData.totalAgents = totalAgents;
        this.agentPerformanceData.activeAgents = activeAgents;
        this.agentPerformanceData.visibleAgents = visibleAgents;
    }
    
    /**
     * Update optimization metrics for the performance optimizer
     */
    updateOptimizationMetrics() {
        if (!this.performanceOptimizer) return;
        
        // Send agent performance data to the optimizer
        const metrics = {
            agentCount: this.agentPerformanceData.totalAgents,
            activeAgentCount: this.agentPerformanceData.activeAgents,
            visibleAgentCount: this.agentPerformanceData.visibleAgents,
            agentUpdateTime: this.agentPerformanceData.updateTime,
            optimizationEnabled: this.optimizationEnabled,
            distanceOptimization: this.distanceOptimization
        };
        
        // This would integrate with the AI processing optimizer
        if (this.performanceOptimizer.aiProcessingOptimizer) {
            // Send metrics to AI processing optimizer
            if (this.performanceOptimizer.aiProcessingOptimizer.updateMetrics) {
                this.performanceOptimizer.aiProcessingOptimizer.updateMetrics(metrics);
            }
        }
    }
    
    /**
     * Get agent performance data for monitoring
     * @returns {Object} Agent performance data
     */
    getAgentPerformanceData() {
        return { ...this.agentPerformanceData };
    }
    
    /**
     * Update individual agent behavior with optimization
     * @param {Object} agent - Agent object
     * @param {boolean} fullUpdate - Whether to perform full update
     */
    updateAgentBehavior(agent, fullUpdate = true) {
        if (!agent || !agent.mesh) return;
        
        try {
            if (fullUpdate) {
                // Full behavior update for nearby agents
                const flockingForce = this.calculateFlockingForce(agent);
                
                switch (agent.state) {
                    case 'seeking':
                        this.updateSeekingBehavior(agent, flockingForce);
                        break;
                    case 'waiting':
                        this.updateWaitingBehavior(agent);
                        break;
                }
                
                this.updateAgentPhysics(agent);
                this.updateLimbAnimations(agent);
            } else {
                // Simplified update for distant agents
                this.updateAgentPhysicsSimplified(agent);
            }
        } catch (error) {
            console.error('Error updating agent behavior:', error);
        }
    }
    
    /**
     * Update individual zombie behavior with optimization
     * @param {Object} zombie - Zombie object
     * @param {boolean} fullUpdate - Whether to perform full update
     */
    updateZombieBehavior(zombie, fullUpdate = true) {
        if (!zombie || !zombie.mesh) return;
        
        try {
            if (fullUpdate) {
                // Full zombie behavior update
                // This would integrate with the zombie behavior system
                if (this.zombieBehaviour && this.zombieBehaviour.updateZombie) {
                    this.zombieBehaviour.updateZombie(zombie);
                }
            } else {
                // Simplified update for distant zombies
                this.updateZombiePhysicsSimplified(zombie);
            }
        } catch (error) {
            console.error('Error updating zombie behavior:', error);
        }
    }
    
    /**
     * Simplified physics update for distant agents
     * @param {Object} agent - Agent object
     */
    updateAgentPhysicsSimplified(agent) {
        if (!agent || !agent.mesh || !agent.currentTarget) return;
        
        // Simple movement towards target without complex calculations
        const direction = agent.currentTarget.subtract(agent.mesh.position);
        direction.normalize();
        direction.scaleInPlace(agent.speed * 0.5); // Reduced speed for distant agents
        
        agent.mesh.position.addInPlace(direction);
    }
    
    /**
     * Simplified physics update for distant zombies
     * @param {Object} zombie - Zombie object
     */
    updateZombiePhysicsSimplified(zombie) {
        if (!zombie || !zombie.mesh) return;
        
        // Very basic movement for distant zombies
        if (zombie.targetPosition) {
            const direction = zombie.targetPosition.subtract(zombie.mesh.position);
            if (direction.length() > 0.1) {
                direction.normalize();
                direction.scaleInPlace(zombie.speed * 0.3); // Very reduced speed
                zombie.mesh.position.addInPlace(direction);
            }
        }
    }

    initializeDogs() {
        // Create dog behavior manager
        this.dogBehaviour = new DogBehaviour(this.scene);
        // Initialize with 5 dogs
        this.dogBehaviour.initialize(5);
    }

    initializeVillagers() {
        // Create villager behavior manager
        this.villagerBehaviour = new VillagerBehaviour(this.scene);
        
        // Initialize with 20 villagers (increased from 10 for more interactions)
        console.log('Initializing Villager Behavior System with enhanced AI...');
        this.villagerBehaviour.initialize(20);
        
        // Set up a scheduled event to update day/night-specific behaviors
        const checkTimeInterval = setInterval(() => {
            if (this.scene.isDisposed) {
                clearInterval(checkTimeInterval);
                return;
            }
            
            // Get current time from the villager's day/night cycle
            if (this.villagerBehaviour && this.villagerBehaviour.dayNightCycle) {
                const gameTime = this.villagerBehaviour.dayNightCycle.getGameTime();
                const hour = Math.floor(gameTime / 60);
                
                // Log time of day transitions for debugging
                if (hour === 6 || hour === 9 || hour === 17 || hour === 22) {
                    console.log(`Time transition: ${hour}:00 - Villagers updating schedule`);
                }
            }
        }, 10000); // Check every 10 seconds
    }

    // initializeDinosaur removed - dinosaur system archived

    createAgent(name) {
        const startPos = this.getRandomStartPosition();
        return this.basicAgent.createAgent(name, startPos);
    }

    createAgents(count) {
        for (let i = 0; i < count; i++) {
            const agent = this.createAgent(`agent_${i}`);
            this.agents.push(agent);
        }
    }

    createTargetPoints() {
        // Create points in a circle around the bowl
        const radius = 80;
        const pointCount = 8;
        
        for (let i = 0; i < pointCount; i++) {
            const angle = (i / pointCount) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = this.getTerrainHeight(x, z);
            
            this.targetPoints.push({
                position: new BABYLON.Vector3(x, y, z),
                priority: 1
            });
        }

        // Add center point
        this.targetPoints.push({
            position: new BABYLON.Vector3(0, this.getTerrainHeight(0, 0), 0),
            priority: 1.2
        });
    }

    createZombies() {
        for (let i = 0; i < this.zombieCount; i++) {
            // Create zombie mesh
            const zombie = BABYLON.MeshBuilder.CreateBox("zombie" + i, {
                height: 2,
                width: 0.6,
                depth: 0.3
            }, this.scene);

            // Random position within bowl
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 30; // Keep zombies near center initially
            zombie.position = new BABYLON.Vector3(
                Math.cos(angle) * radius,
                5, // Start above ground
                Math.sin(angle) * radius
            );

            // Add physics
            const zombieAggregate = new BABYLON.PhysicsAggregate(
                zombie,
                BABYLON.PhysicsShapeType.BOX,
                { mass: 1, restitution: 0.5, friction: 0.1 },
                this.scene
            );

            // Add material
            const zombieMaterial = new BABYLON.StandardMaterial("zombieMat" + i, this.scene);
            zombieMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.8, 0.4);
            zombie.material = zombieMaterial;

            this.zombies.push({
                mesh: zombie,
                physics: zombieAggregate,
                speed: 2 + Math.random() * 2 // Random speed between 2 and 4
            });
        }

        // PERFORMANCE FIX: Disabled duplicate zombie behavior loop
        // Zombies are updated through their own ZombieBehaviour system
        // this.scene.onBeforeRenderObservable.add(() => {
        //     this.updateZombies();
        // });
    }

    updateZombies() {
        for (const zombie of this.zombies) {
            // Get current position
            const pos = zombie.mesh.position;
            
            // Simple wandering behavior
            const angle = Math.random() * Math.PI * 2;
            const force = new BABYLON.Vector3(
                Math.cos(angle) * zombie.speed,
                0,
                Math.sin(angle) * zombie.speed
            );

            // Apply force for movement
            zombie.physics.body.applyForce(force, pos);

            // Keep zombies upright
            const rotation = zombie.mesh.rotationQuaternion || 
                           BABYLON.Quaternion.FromEulerAngles(zombie.mesh.rotation.x, zombie.mesh.rotation.y, zombie.mesh.rotation.z);
            const upright = BABYLON.Quaternion.Identity();
            BABYLON.Quaternion.SlerpToRef(rotation, upright, 0.1, rotation);
            zombie.mesh.rotationQuaternion = rotation;
        }
    }

    updateBehaviors() {
        this.agents.forEach(agent => {
            // Calculate flocking forces
            const flockingForce = this.calculateFlockingForce(agent);
            
            switch (agent.state) {
                case 'seeking':
                    this.updateSeekingBehavior(agent, flockingForce);
                    break;
                case 'waiting':
                    this.updateWaitingBehavior(agent);
                    break;
            }
            
            // Update physics, orientation, and animations
            this.updateAgentPhysics(agent);
            this.updateLimbAnimations(agent);
        });
    }

    calculateFlockingForce(agent) {
        const separation = this.calculateSeparation(agent);
        const alignment = this.calculateAlignment(agent);
        const cohesion = this.calculateCohesion(agent);

        return {
            separation: separation.scale(agent.flockingParams.separationWeight),
            alignment: alignment.scale(agent.flockingParams.alignmentWeight),
            cohesion: cohesion.scale(agent.flockingParams.cohesionWeight)
        };
    }

    calculateSeparation(agent) {
        let separationForce = new BABYLON.Vector3(0, 0, 0);
        let neighborCount = 0;

        this.agents.forEach(other => {
            if (other !== agent) {
                const distance = BABYLON.Vector3.Distance(
                    agent.mesh.position,
                    other.mesh.position
                );
                
                if (distance < agent.flockingParams.separationRadius) {
                    const away = agent.mesh.position.subtract(other.mesh.position);
                    away.normalize();
                    away.scaleInPlace(1 / Math.max(0.1, distance)); // Stronger force when closer
                    separationForce.addInPlace(away);
                    neighborCount++;
                }
            }
        });

        if (neighborCount > 0) {
            separationForce.scaleInPlace(1 / neighborCount);
        }
        return separationForce;
    }

    calculateAlignment(agent) {
        let averageVelocity = new BABYLON.Vector3(0, 0, 0);
        let neighborCount = 0;

        this.agents.forEach(other => {
            if (other !== agent) {
                const distance = BABYLON.Vector3.Distance(
                    agent.mesh.position,
                    other.mesh.position
                );
                
                if (distance < agent.flockingParams.alignmentRadius) {
                    const velocity = other.physics.body.getLinearVelocity();
                    averageVelocity.addInPlace(velocity);
                    neighborCount++;
                }
            }
        });

        if (neighborCount > 0) {
            averageVelocity.scaleInPlace(1 / neighborCount);
            averageVelocity.normalize();
        }
        return averageVelocity;
    }

    calculateCohesion(agent) {
        let centerOfMass = new BABYLON.Vector3(0, 0, 0);
        let neighborCount = 0;

        this.agents.forEach(other => {
            if (other !== agent) {
                const distance = BABYLON.Vector3.Distance(
                    agent.mesh.position,
                    other.mesh.position
                );
                
                if (distance < agent.flockingParams.cohesionRadius) {
                    centerOfMass.addInPlace(other.mesh.position);
                    neighborCount++;
                }
            }
        });

        if (neighborCount > 0) {
            centerOfMass.scaleInPlace(1 / neighborCount);
            const toCenter = centerOfMass.subtract(agent.mesh.position);
            toCenter.normalize();
            return toCenter;
        }
        return new BABYLON.Vector3(0, 0, 0);
    }

    updateSeekingBehavior(agent, flockingForce) {
        if (!agent.currentTarget) {
            agent.currentTarget = this.getRandomTarget().position;
        }

        const target = agent.currentTarget;
        const direction = target.subtract(agent.mesh.position);
        const distance = direction.length();

        if (distance > 0.1) {
            // Combine target seeking with flocking
            const desiredVelocity = direction.normalize().scale(agent.speed * 5);
            const flockingVelocity = flockingForce.separation
                .add(flockingForce.alignment)
                .add(flockingForce.cohesion);

            // Blend velocities
            const combinedVelocity = desiredVelocity.add(flockingVelocity).scale(0.5);
            
            // Apply movement
            const currentVel = agent.physics.body.getLinearVelocity();
            const newVel = BABYLON.Vector3.Lerp(currentVel, combinedVelocity, 0.1);
            newVel.y = currentVel.y; // Keep vertical velocity for terrain following
            
            agent.physics.body.setLinearVelocity(newVel);

            // Update orientation
            this.updateAgentOrientation(agent, newVel);
        }

        // Check if reached target
        if (distance < 5) {
            agent.state = 'waiting';
            agent.waitTime = 1000 + Math.random() * 2000;
            agent.currentTarget = null;
        }
    }

    updateWaitingBehavior(agent) {
        agent.waitTime -= this.scene.getEngine().getDeltaTime();
        if (agent.waitTime <= 0) {
            agent.state = 'seeking';
        }
    }

    updateAgentPhysics(agent) {
        const pos = agent.mesh.position;
        const desiredHeight = this.getTerrainHeight(pos.x, pos.z) + 2;
        
        // Apply upward force to stay above terrain
        const velocity = agent.physics.body.getLinearVelocity();
        if (pos.y < desiredHeight) {
            velocity.y = Math.max(5, (desiredHeight - pos.y) * 10);
            agent.physics.body.setLinearVelocity(velocity);
        }

        // Keep agent upright
        agent.physics.body.setAngularVelocity(BABYLON.Vector3.Zero());
    }

    updateLimbAnimations(agent) {
        const velocity = agent.physics.body.getLinearVelocity();
        const speed = new BABYLON.Vector3(velocity.x, 0, velocity.z).length();
        
        if (speed > 0.1) {
            // Animate legs and arms based on movement
            const cycle = (performance.now() * 0.01 * speed) % (Math.PI * 2);
            
            agent.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.5;
            agent.parts.rightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.5;
            agent.parts.leftArm.rotation.x = Math.sin(cycle + Math.PI) * 0.3;
            agent.parts.rightArm.rotation.x = Math.sin(cycle) * 0.3;
        } else {
            // Reset limbs to neutral position
            Object.values(agent.parts).forEach(part => {
                if (part !== agent.parts.torso && part !== agent.parts.head) {
                    part.rotation.x = 0;
                }
            });
        }
    }

    updateAgentOrientation(agent, velocity) {
        const forward = new BABYLON.Vector3(velocity.x, 0, velocity.z).normalize();
        if (forward.length() > 0.1) {
            const targetRotation = Math.atan2(forward.x, forward.z);
            agent.parts.torso.rotation.y = targetRotation;
        }
    }

    getTerrainHeight(x, z) {
        // Get height from bowl terrain
        const bowlRadius = 100;
        const bowlDepth = 25;
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        // Base bowl shape with terrain features
        let height = -Math.pow(distFromCenter / bowlRadius, 0.8) * bowlDepth;
        height += Math.sin(x/20) * Math.cos(z/20) * 3;
        
        return height;
    }

    getRandomStartPosition() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 80;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = this.getTerrainHeight(x, z) + 2;
        return new BABYLON.Vector3(x, y, z);
    }

    getRandomTarget() {
        return this.targetPoints[Math.floor(Math.random() * this.targetPoints.length)];
    }

    getHeightAtPoint(x, z) {
        // Simplified height calculation - replace with actual terrain height
        return Math.sin(x/20) * Math.cos(z/20) * 5;
    }

    dispose() {
        if (this.dogBehaviour) {
            this.dogBehaviour.dispose();
        }
        
        if (this.villagerBehaviour) {
            this.villagerBehaviour.dispose();
        }
        
        // Dinosaur disposal removed - system archived
        
        this.zombies.forEach(zombie => {
            if (zombie.physics) {
                zombie.physics.dispose();
            }
            if (zombie.mesh) {
                zombie.mesh.dispose();
            }
        });
        
        this.agents.forEach(agent => {
            if (agent.mesh) {
                if (agent.physics) {
                    agent.physics.dispose();
                }
                agent.mesh.dispose();
            }
        });
        
        if (this.navigationMesh) {
            this.navigationMesh.dispose();
        }
        
        this.zombies = [];
        this.agents = [];
        this.targetPoints = [];
    }
} 