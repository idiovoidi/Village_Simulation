/**
 * Enhanced Zombie Behaviour System
 * Integrates all advanced zombie AI components for sophisticated emergent behavior
 */

import { ZombieAgent } from './ZombieAgent.js';
import { ZombieIntelligence } from './ZombieIntelligence.js';
import { ZombieGroupManager } from './ZombieGroupManager.js';
import { ZombiePathfinding } from './ZombiePathfinding.js';
import { AgentCommunicationSystem } from '../../core/AgentCommunicationSystem.js';
import { EnvironmentalAwareness } from '../../core/EnvironmentalAwareness.js';
import { BowlCreator } from '../../BowlCreator.js';

export class EnhancedZombieBehaviour {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.zombies = [];
        this.villagerSystem = null; // Will be set by the main scene

        // Enhanced configuration with backward compatibility
        this.config = {
            // Basic zombie parameters
            wanderRadius: options.wanderRadius || 80,
            terrainBounds: {
                minHeight: options.minHeight || -20,
                maxHeight: options.maxHeight || 0
            },
            speed: {
                min: options.minSpeed || 0.02,
                max: options.maxSpeed || 0.05,
                lurgeMultiplier: options.lurgeSpeedMultiplier || 4.0
            },
            lurge: {
                chance: options.lurgeChance || 0.02,
                duration: options.lurgeDuration || 1.0
            },
            detection: {
                playerAwarenessRadius: options.playerAwarenessRadius || 40,
                aggressiveRadius: options.aggressiveRadius || 30
            },

            // Enhanced AI parameters
            intelligence: {
                enabled: options.enableIntelligence !== false,
                memoryDuration: options.memoryDuration || 30000,
                adaptationRate: options.adaptationRate || 0.1,
                learningEnabled: options.learningEnabled !== false
            },

            // Group management parameters
            groupManagement: {
                enabled: options.enableGroupManagement !== false,
                maxGroupSize: options.maxGroupSize || 6,
                minGroupSize: options.minGroupSize || 2,
                formationRadius: options.formationRadius || 8
            },

            // Pathfinding parameters
            pathfinding: {
                enabled: options.enablePathfinding !== false,
                gridSize: options.pathfindingGridSize || 2,
                crowdAvoidance: options.enableCrowdAvoidance !== false,
                dynamicReplanning: options.enableDynamicReplanning !== false
            },

            // Communication parameters
            communication: {
                enabled: options.enableCommunication !== false,
                range: options.communicationRange || 50
            },

            // Environmental awareness parameters
            environmental: {
                enabled: options.enableEnvironmentalAwareness !== false,
                threatAssessment: options.enableThreatAssessment !== false,
                safeZoneAwareness: options.enableSafeZoneAwareness !== false
            },

            // Performance parameters
            performance: {
                maxZombies: options.maxZombies || 50,
                updateThrottling: options.enableUpdateThrottling !== false,
                lodSystem: options.enableLOD !== false,
                spatialOptimization: options.enableSpatialOptimization !== false
            }
        };

        // Enhanced systems
        this.communicationSystem = null;
        this.environmentalAwareness = null;
        this.groupManager = null;

        // Performance optimization
        this.updateCounter = 0;
        this.lastPerformanceCheck = 0;
        this.performanceMetrics = {
            averageUpdateTime: 0,
            peakUpdateTime: 0,
            zombieUpdateTimes: new Map(),
            systemLoad: 0
        };

        // Event system for integration
        this.eventCallbacks = new Map();

        // Statistics tracking
        this.stats = {
            zombiesCreated: 0,
            zombiesDestroyed: 0,
            groupsFormed: 0,
            targetsAcquired: 0,
            pathsCalculated: 0,
            communicationMessages: 0,
            emergentBehaviors: 0
        };
    }

    /**
     * Initialize the enhanced zombie behavior system
     * @param {number} count - Number of zombies to create
     * @param {Object} options - Initialization options
     */
    async initialize(count, options = {}) {
        console.log('Initializing Enhanced Zombie Behaviour System...');

        try {
            // Initialize core systems
            await this.initializeCoreSystemsAsync();

            // Create enhanced zombies
            await this.createEnhancedZombies(count, options);

            // Set up update loop
            this.setupUpdateLoop();

            // Initialize performance monitoring
            this.initializePerformanceMonitoring();

            console.log(`Enhanced Zombie Behaviour System initialized with ${count} zombies`);
        } catch (error) {
            console.error('Failed to initialize Enhanced Zombie Behaviour System:', error);
            throw error;
        }
    }

    /**
     * Initialize core AI systems
     */
    async initializeCoreSystemsAsync() {
        // Initialize Communication System
        if (this.config.communication.enabled) {
            this.communicationSystem = new AgentCommunicationSystem(this.scene);
            this.communicationSystem.initialize();
            console.log('Communication system initialized');
        }

        // Initialize Environmental Awareness
        if (this.config.environmental.enabled) {
            this.environmentalAwareness = new EnvironmentalAwareness(this.scene);
            this.environmentalAwareness.initialize();
            console.log('Environmental awareness system initialized');
        }

        // Initialize Group Manager
        if (this.config.groupManagement.enabled) {
            this.groupManager = new ZombieGroupManager(this.scene, {
                maxGroupSize: this.config.groupManagement.maxGroupSize,
                minGroupSize: this.config.groupManagement.minGroupSize,
                formationRadius: this.config.groupManagement.formationRadius
            });

            this.groupManager.initialize({
                communication: this.communicationSystem,
                environmental: this.environmentalAwareness
            });
            console.log('Group management system initialized');
        }

        // Set up system integrations
        this.setupSystemIntegrations();
    }

    /**
     * Set up integrations between systems
     */
    setupSystemIntegrations() {
        // Environmental awareness threat detection
        if (this.environmentalAwareness) {
            this.environmentalAwareness.onEvent('threat_added', data => {
                this.handleThreatDetected(data.threat);
            });
        }

        // Communication system message handling
        if (this.communicationSystem) {
            // Set up global message handlers for zombie coordination
            this.setupGlobalMessageHandlers();
        }

        // Group manager event handling
        if (this.groupManager) {
            this.setupGroupEventHandlers();
        }
    }

    /**
     * Set up global message handlers for zombie coordination
     */
    setupGlobalMessageHandlers() {
        // This would set up handlers for system-wide coordination
        // For now, individual zombies handle their own messages
    }

    /**
     * Set up group event handlers
     */
    setupGroupEventHandlers() {
        // Handle group formation events
        // Individual zombies will be notified through the communication system
    }

    /**
     * Create enhanced zombies with all AI systems
     * @param {number} count - Number of zombies to create
     * @param {Object} options - Creation options
     */
    async createEnhancedZombies(count, options = {}) {
        const actualCount = Math.min(count, this.config.performance.maxZombies);

        // Create zombies in batches to prevent frame drops
        const batchSize = 5;
        const batches = Math.ceil(actualCount / batchSize);

        for (let batch = 0; batch < batches; batch++) {
            const batchStart = batch * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, actualCount);

            // Create batch of zombies
            for (let i = batchStart; i < batchEnd; i++) {
                const zombie = await this.createEnhancedZombie(i, options);
                this.zombies.push(zombie);
            }

            // Yield control between batches
            if (batch < batches - 1) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        // Initialize group formations after all zombies are created
        if (this.groupManager) {
            this.initializeGroupFormations();
        }

        this.stats.zombiesCreated = actualCount;
    }

    /**
     * Create a single enhanced zombie with all AI components
     * @param {number} index - Zombie index
     * @param {Object} options - Creation options
     * @returns {Object} - Enhanced zombie
     */
    async createEnhancedZombie(index, options = {}) {
        // Generate spawn position
        const position = options.position || this.generateSpawnPosition();

        // Create base zombie agent
        const zombie = new ZombieAgent(this.scene, {
            position,
            initialState: 'idle',
            minSpeed: this.config.speed.min,
            maxSpeed: this.config.speed.max,
            lurgeSpeedMultiplier: this.config.speed.lurgeMultiplier,
            lurgeChance: this.config.lurge.chance,
            lurgeDuration: this.config.lurge.duration,
            swayAmount: 0.2 + Math.random() * 0.2
        });

        // Add unique identifier
        zombie.id = `zombie_${index}_${Date.now()}`;
        zombie.agentType = 'zombie';
        zombie.detectionRange = this.config.detection.playerAwarenessRadius;

        // Initialize Intelligence System
        if (this.config.intelligence.enabled) {
            zombie.intelligence = new ZombieIntelligence(zombie, {
                memoryDuration: this.config.intelligence.memoryDuration,
                adaptationRate: this.config.intelligence.adaptationRate,
                learningEnabled: this.config.intelligence.learningEnabled
            });

            zombie.intelligence.initialize({
                communication: this.communicationSystem,
                environmental: this.environmentalAwareness
            });
        }

        // Initialize Pathfinding System
        if (this.config.pathfinding.enabled) {
            zombie.pathfinding = new ZombiePathfinding(zombie, {
                gridSize: this.config.pathfinding.gridSize,
                crowdAvoidanceRadius: this.config.pathfinding.crowdAvoidance ? 5 : 0,
                dynamicReplanning: this.config.pathfinding.dynamicReplanning
            });

            zombie.pathfinding.initialize({
                environmental: this.environmentalAwareness,
                groupManager: this.groupManager
            });
        }

        // Register with systems
        if (this.communicationSystem) {
            this.communicationSystem.registerAgent(zombie);
        }

        if (this.environmentalAwareness) {
            this.environmentalAwareness.registerAgent(zombie);
        }

        // Set up zombie-specific message handling
        this.setupZombieMessageHandling(zombie);

        // Initialize performance tracking for this zombie
        this.performanceMetrics.zombieUpdateTimes.set(zombie.id, {
            averageTime: 0,
            peakTime: 0,
            updateCount: 0
        });

        return zombie;
    }

    /**
     * Set up message handling for a specific zombie
     * @param {Object} zombie - Zombie to set up messaging for
     */
    setupZombieMessageHandling(zombie) {
        if (!zombie.onMessageReceived) {
            zombie.onMessageReceived = message => {
                this.handleZombieMessage(zombie, message);
            };
        }
    }

    /**
     * Handle messages received by a zombie
     * @param {Object} zombie - Zombie that received the message
     * @param {Object} message - Message received
     */
    handleZombieMessage(zombie, message) {
        switch (message.type) {
            case 'target_spotted':
                this.handleTargetSpottedMessage(zombie, message);
                break;
            case 'group_formation':
                this.handleGroupFormationMessage(zombie, message);
                break;
            case 'retreat_order':
                this.handleRetreatOrderMessage(zombie, message);
                break;
            case 'attack_coordinate':
                this.handleAttackCoordinationMessage(zombie, message);
                break;
        }

        this.stats.communicationMessages++;
    }

    /**
     * Generate spawn position for a zombie
     * @returns {BABYLON.Vector3} - Spawn position
     */
    generateSpawnPosition() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.config.wanderRadius * 0.8; // Spawn within 80% of wander radius
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = this.getTerrainHeight(x, z) + 2;

        return new BABYLON.Vector3(x, y, z);
    }

    /**
     * Initialize group formations after all zombies are created
     */
    initializeGroupFormations() {
        // Add all zombies to group management
        for (const zombie of this.zombies) {
            this.groupManager.addZombie(zombie);
        }
    }

    /**
     * Set up the main update loop
     */
    setupUpdateLoop() {
        this.scene.registerBeforeRender(() => {
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            this.update(deltaTime);
        });
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        this.lastPerformanceCheck = performance.now();

        // Set up periodic performance analysis
        setInterval(() => {
            this.analyzePerformance();
        }, 5000); // Every 5 seconds
    }

    /**
     * Main update loop for all zombies
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        const updateStartTime = performance.now();

        // Update counter for throttling
        this.updateCounter++;

        // Update zombies with performance optimization
        this.updateZombiesOptimized(deltaTime);

        // Update systems
        this.updateSystems(deltaTime);

        // Handle villager interactions
        this.handleVillagerInteractions();

        // Check for emergent behaviors
        this.checkEmergentBehaviors();

        // Update performance metrics
        const updateTime = performance.now() - updateStartTime;
        this.updatePerformanceMetrics(updateTime);
    }

    /**
     * Update zombies with performance optimizations
     * @param {number} deltaTime - Time since last update
     */
    updateZombiesOptimized(deltaTime) {
        const cameraPosition = this.scene.activeCamera ? this.scene.activeCamera.position : new BABYLON.Vector3(0, 0, 0);

        // Sort zombies by distance for LOD
        if (this.config.performance.lodSystem && this.updateCounter % 30 === 0) { // Every 30 frames
            this.zombies.sort((a, b) => {
                const distA = BABYLON.Vector3.Distance(a.model.mesh.position, cameraPosition);
                const distB = BABYLON.Vector3.Distance(b.model.mesh.position, cameraPosition);
                return distA - distB;
            });
        }

        // Update zombies with different frequencies based on distance
        for (let i = 0; i < this.zombies.length; i++) {
            const zombie = this.zombies[i];
            const distance = BABYLON.Vector3.Distance(zombie.model.mesh.position, cameraPosition);

            // Determine update frequency based on distance and LOD
            let shouldUpdate = true;

            if (this.config.performance.lodSystem) {
                if (distance > 100) {
                    shouldUpdate = this.updateCounter % 8 === (i % 8); // Every 8 frames for far zombies
                } else if (distance > 50) {
                    shouldUpdate = this.updateCounter % 4 === (i % 4); // Every 4 frames for medium distance
                } else if (distance > 25) {
                    shouldUpdate = this.updateCounter % 2 === (i % 2); // Every 2 frames for close zombies
                }
                // Near zombies (< 25 units) update every frame
            }

            if (shouldUpdate) {
                this.updateSingleZombie(zombie, deltaTime, distance);
            }
        }
    }

    /**
     * Update a single zombie
     * @param {Object} zombie - Zombie to update
     * @param {number} deltaTime - Time since last update
     * @param {number} distanceToCamera - Distance to camera for optimization
     */
    updateSingleZombie(zombie, deltaTime, distanceToCamera) {
        const zombieUpdateStart = performance.now();

        try {
            // Update base zombie agent
            zombie.update(deltaTime);

            // Update intelligence system
            if (zombie.intelligence) {
                zombie.intelligence.update(deltaTime);
            }

            // Update pathfinding system
            if (zombie.pathfinding) {
                zombie.pathfinding.update(deltaTime);

                // Apply pathfinding movement
                this.applyPathfindingMovement(zombie, deltaTime);
            } else {
                // Fallback to basic movement for compatibility
                this.applyBasicMovement(zombie, deltaTime);
            }

            // Update group behavior (if not using group manager)
            if (!this.groupManager) {
                this.updateBasicGroupBehavior(zombie, deltaTime);
            }

            // Check for player detection
            this.checkPlayerDetection(zombie);
        } catch (error) {
            console.warn(`Error updating zombie ${zombie.id}:`, error);
        }

        // Track performance
        const zombieUpdateTime = performance.now() - zombieUpdateStart;
        this.updateZombiePerformanceMetrics(zombie.id, zombieUpdateTime);
    }

    /**
     * Apply pathfinding-based movement to a zombie
     * @param {Object} zombie - Zombie to move
     * @param {number} deltaTime - Time since last update
     */
    applyPathfindingMovement(zombie, deltaTime) {
        const movementDirection = zombie.pathfinding.getMovementDirection();

        if (movementDirection.length() > 0) {
            const speed = zombie.currentStrategy?.speed === 'slow' ? zombie.speed * 0.5 : zombie.speed;
            const movement = movementDirection.scale(speed * deltaTime * 60);

            // Apply movement
            const newPosition = zombie.model.mesh.position.add(movement);
            newPosition.y = this.getTerrainHeight(newPosition.x, newPosition.z) + 0.5;

            zombie.model.mesh.position = newPosition;

            // Update rotation to face movement direction
            const targetRotation = Math.atan2(movementDirection.x, movementDirection.z);
            zombie.model.mesh.rotation.y = targetRotation;

            // Store velocity for crowd avoidance
            zombie.velocity = movement.scale(1 / deltaTime);
        }
    }

    /**
     * Apply basic movement for backward compatibility
     * @param {Object} zombie - Zombie to move
     * @param {number} deltaTime - Time since last update
     */
    applyBasicMovement(zombie, deltaTime) {
        // This maintains the original movement logic for zombies without pathfinding
        if (zombie.target) {
            const direction = zombie.target.subtract(zombie.model.mesh.position);
            const distance = direction.length();

            if (distance > 0.5) {
                const normalizedDirection = direction.normalize();
                const movement = normalizedDirection.scale(zombie.speed * deltaTime * 60);

                const newPosition = zombie.model.mesh.position.add(movement);
                newPosition.y = this.getTerrainHeight(newPosition.x, newPosition.z) + 0.5;

                zombie.model.mesh.position = newPosition;
                zombie.model.mesh.rotation.y = Math.atan2(normalizedDirection.x, normalizedDirection.z);
            }
        }
    }

    /**
     * Update basic group behavior for backward compatibility
     * @param {Object} zombie - Zombie to update
     * @param {number} deltaTime - Time since last update
     */
    updateBasicGroupBehavior(zombie, deltaTime) {
        // Find nearby zombies for basic flocking
        const nearbyZombies = this.zombies.filter(other =>
            other !== zombie
            && BABYLON.Vector3.Distance(zombie.model.mesh.position, other.model.mesh.position) < 15
        );

        if (nearbyZombies.length > 0) {
            // Basic separation
            for (const other of nearbyZombies) {
                const distance = BABYLON.Vector3.Distance(zombie.model.mesh.position, other.model.mesh.position);
                if (distance < 3) {
                    const awayVector = zombie.model.mesh.position.subtract(other.model.mesh.position).normalize();
                    const newPos = zombie.model.mesh.position.add(awayVector.scale(0.1));
                    zombie.model.mesh.position = newPos;
                }
            }

            // Basic state influence
            if (zombie.state === 'idle') {
                const pursuingNeighbor = nearbyZombies.find(other => other.state === 'pursuing');
                if (pursuingNeighbor && Math.random() < 0.03 * deltaTime * 60) {
                    zombie.setState('pursuing');
                }
            }
        }
    }

    /**
     * Update core systems
     * @param {number} deltaTime - Time since last update
     */
    updateSystems(deltaTime) {
        // Communication system updates itself
        // Environmental awareness updates itself
        // Group manager updates itself

        // We just need to handle any system-level coordination here
        this.handleSystemCoordination(deltaTime);
    }

    /**
     * Handle coordination between systems
     * @param {number} deltaTime - Time since last update
     */
    handleSystemCoordination(deltaTime) {
        // Coordinate between intelligence and pathfinding
        for (const zombie of this.zombies) {
            if (zombie.intelligence && zombie.pathfinding) {
                this.coordinateIntelligenceAndPathfinding(zombie);
            }
        }
    }

    /**
     * Coordinate intelligence and pathfinding systems
     * @param {Object} zombie - Zombie to coordinate systems for
     */
    coordinateIntelligenceAndPathfinding(zombie) {
        const { intelligence } = zombie;
        const { pathfinding } = zombie;

        // If intelligence has a target, make sure pathfinding knows about it
        if (intelligence.targetTracker.currentTarget) {
            const targetPosition = intelligence.targetTracker.currentTarget.mesh.position;

            // Check if pathfinding needs to update its destination
            if (!pathfinding.destination
                || BABYLON.Vector3.Distance(pathfinding.destination, targetPosition) > 5) {
                pathfinding.findPath(targetPosition).catch(error => {
                    console.warn(`Pathfinding failed for zombie ${zombie.id}:`, error.message);
                });
            }
        }
    }

    /**
     * Check for player detection
     * @param {Object} zombie - Zombie to check
     */
    checkPlayerDetection(zombie) {
        if (!this.scene.activeCamera) return;

        const playerPos = this.scene.activeCamera.position;
        const distToPlayer = BABYLON.Vector3.Distance(zombie.model.mesh.position, playerPos);

        // Use intelligence system if available
        if (zombie.intelligence) {
            // Intelligence system handles its own detection
            return;
        }

        // Fallback to basic detection
        if (zombie.state === 'idle' && distToPlayer < this.config.detection.playerAwarenessRadius) {
            zombie.setTarget(playerPos);
            zombie.setState('suspicious');
        } else if (zombie.state === 'suspicious' && distToPlayer < this.config.detection.aggressiveRadius) {
            zombie.setState('pursuing');
        }
    }

    /**
     * Handle villager interactions
     */
    handleVillagerInteractions() {
        if (!this.villagerSystem) return;

        for (const zombie of this.zombies) {
            if (zombie.state === 'pursuing' || zombie.state === 'attacking') {
                const nearbyVillagers = this.villagerSystem.villagers.filter(villager =>
                    BABYLON.Vector3.Distance(zombie.model.mesh.position, villager.mesh.position) < 3
                );

                if (nearbyVillagers.length > 0) {
                    // Attack the first villager in range
                    this.villagerSystem.killVillager(nearbyVillagers[0]);
                    zombie.setState('idle');

                    // Record success if using intelligence
                    if (zombie.intelligence) {
                        zombie.intelligence.recordSuccess('villager_eliminated');
                    }

                    this.stats.targetsAcquired++;
                }
            }
        }
    }

    /**
     * Check for emergent behaviors
     */
    checkEmergentBehaviors() {
        // Look for interesting emergent patterns
        this.detectSwarmBehavior();
        this.detectHuntingPacks();
        this.detectTerritorialBehavior();
    }

    /**
     * Detect swarm behavior emergence
     */
    detectSwarmBehavior() {
        // Check if large groups of zombies are moving together
        const threshold = 8; // Minimum zombies for swarm
        const clusters = this.findZombieClusters(15); // 15 unit radius

        for (const cluster of clusters) {
            if (cluster.length >= threshold) {
                // Check if they're moving in the same direction
                const avgDirection = this.calculateAverageDirection(cluster);
                const coherence = this.calculateDirectionCoherence(cluster, avgDirection);

                if (coherence > 0.7) {
                    this.triggerEmergentBehavior('swarm_detected', {
                        zombies: cluster,
                        direction: avgDirection,
                        coherence
                    });
                }
            }
        }
    }

    /**
     * Detect hunting pack behavior
     */
    detectHuntingPacks() {
        // Look for coordinated pursuit behavior
        const pursuingZombies = this.zombies.filter(z => z.state === 'pursuing');

        if (pursuingZombies.length >= 3) {
            const clusters = this.findZombieClusters(20, pursuingZombies);

            for (const cluster of clusters) {
                if (cluster.length >= 3) {
                    this.triggerEmergentBehavior('hunting_pack_detected', {
                        zombies: cluster,
                        packSize: cluster.length
                    });
                }
            }
        }
    }

    /**
     * Detect territorial behavior
     */
    detectTerritorialBehavior() {
        // Look for zombies that stay in specific areas
        // This would require tracking zombie positions over time
        // For now, just a placeholder
    }

    /**
     * Find clusters of zombies within a radius
     * @param {number} radius - Clustering radius
     * @param {Array} zombieList - List of zombies to cluster (optional)
     * @returns {Array} - Array of zombie clusters
     */
    findZombieClusters(radius, zombieList = null) {
        const zombies = zombieList || this.zombies;
        const clusters = [];
        const processed = new Set();

        for (const zombie of zombies) {
            if (processed.has(zombie)) continue;

            const cluster = [zombie];
            processed.add(zombie);

            // Find nearby zombies
            for (const other of zombies) {
                if (processed.has(other)) continue;

                const distance = BABYLON.Vector3.Distance(
                    zombie.model.mesh.position,
                    other.model.mesh.position
                );

                if (distance <= radius) {
                    cluster.push(other);
                    processed.add(other);
                }
            }

            if (cluster.length > 1) {
                clusters.push(cluster);
            }
        }

        return clusters;
    }

    /**
     * Calculate average movement direction for a group of zombies
     * @param {Array} zombies - Group of zombies
     * @returns {BABYLON.Vector3} - Average direction
     */
    calculateAverageDirection(zombies) {
        const avgDirection = new BABYLON.Vector3(0, 0, 0);

        for (const zombie of zombies) {
            if (zombie.velocity) {
                avgDirection.addInPlace(zombie.velocity.normalize());
            }
        }

        return avgDirection.scale(1 / zombies.length).normalize();
    }

    /**
     * Calculate direction coherence for a group
     * @param {Array} zombies - Group of zombies
     * @param {BABYLON.Vector3} avgDirection - Average direction
     * @returns {number} - Coherence value (0-1)
     */
    calculateDirectionCoherence(zombies, avgDirection) {
        let totalCoherence = 0;

        for (const zombie of zombies) {
            if (zombie.velocity && zombie.velocity.length() > 0) {
                const dot = BABYLON.Vector3.Dot(zombie.velocity.normalize(), avgDirection);
                totalCoherence += Math.max(0, dot);
            }
        }

        return totalCoherence / zombies.length;
    }

    /**
     * Trigger an emergent behavior event
     * @param {string} behaviorType - Type of emergent behavior
     * @param {Object} data - Behavior data
     */
    triggerEmergentBehavior(behaviorType, data) {
        console.log(`Emergent behavior detected: ${behaviorType}`, data);

        this.stats.emergentBehaviors++;

        // Trigger event callbacks
        if (this.eventCallbacks.has(behaviorType)) {
            for (const callback of this.eventCallbacks.get(behaviorType)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in emergent behavior callback:`, error);
                }
            }
        }
    }

    /**
     * Handle threat detection from environmental awareness
     * @param {Object} threat - Threat information
     */
    handleThreatDetected(threat) {
        // Notify nearby zombies about the threat
        if (this.communicationSystem) {
            // Find zombies near the threat
            const nearbyZombies = this.zombies.filter(zombie => {
                const distance = BABYLON.Vector3.Distance(zombie.model.mesh.position, threat.position);
                return distance <= 30;
            });

            // Send threat notification
            for (const zombie of nearbyZombies) {
                this.communicationSystem.sendMessage(
                    zombie,
                    'danger_warning',
                    { threat, position: threat.position }
                );
            }
        }
    }

    /**
     * Handle message callbacks
     */
    handleTargetSpottedMessage(zombie, message) {
        if (zombie.intelligence) {
            // Intelligence system handles this
            return;
        }

        // Basic handling for non-intelligent zombies
        if (message.content.target && zombie.state === 'idle') {
            zombie.setTarget(message.content.target.mesh.position);
            zombie.setState('suspicious');
        }
    }

    handleGroupFormationMessage(zombie, message) {
        // Group manager handles this automatically
    }

    handleRetreatOrderMessage(zombie, message) {
        if (zombie.state === 'pursuing') {
            zombie.setState('idle');
            zombie.setTarget(this.generateSpawnPosition());
        }
    }

    handleAttackCoordinationMessage(zombie, message) {
        if (message.content.target && zombie.state === 'idle') {
            zombie.setTarget(message.content.target.mesh.position);
            zombie.setState('pursuing');
        }
    }

    /**
     * Get terrain height at position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {number} - Terrain height
     */
    getTerrainHeight(x, z) {
        // Use BowlCreator if available
        if (typeof BowlCreator.getTerrainHeight === 'function') {
            return BowlCreator.getTerrainHeight(x, z);
        }

        // Fallback calculation
        const distFromCenter = Math.sqrt(x * x + z * z);
        const bowlDepth = 25;

        let height = -Math.pow(distFromCenter / this.config.wanderRadius, 1.2) * bowlDepth;
        height += Math.sin(x / 20) * Math.cos(z / 20) * 2;

        return Math.max(
            this.config.terrainBounds.minHeight,
            Math.min(this.config.terrainBounds.maxHeight, height)
        );
    }

    /**
     * Performance monitoring and optimization
     */
    updatePerformanceMetrics(updateTime) {
        this.performanceMetrics.averageUpdateTime
            = (this.performanceMetrics.averageUpdateTime + updateTime) / 2;

        this.performanceMetrics.peakUpdateTime
            = Math.max(this.performanceMetrics.peakUpdateTime, updateTime);
    }

    updateZombiePerformanceMetrics(zombieId, updateTime) {
        const metrics = this.performanceMetrics.zombieUpdateTimes.get(zombieId);
        if (metrics) {
            metrics.updateCount++;
            metrics.averageTime = (metrics.averageTime + updateTime) / 2;
            metrics.peakTime = Math.max(metrics.peakTime, updateTime);
        }
    }

    analyzePerformance() {
        const now = performance.now();
        const timeSinceLastCheck = now - this.lastPerformanceCheck;

        // Calculate system load
        const targetFrameTime = 16.67; // 60 FPS
        this.performanceMetrics.systemLoad
            = this.performanceMetrics.averageUpdateTime / targetFrameTime;

        // Adjust performance settings if needed
        if (this.performanceMetrics.systemLoad > 0.8) {
            this.optimizePerformance();
        }

        this.lastPerformanceCheck = now;
    }

    optimizePerformance() {
        console.log('High system load detected, optimizing performance...');

        // Enable more aggressive LOD
        this.config.performance.lodSystem = true;

        // Reduce update frequencies
        this.config.performance.updateThrottling = true;

        // Disable some features for distant zombies
        for (const zombie of this.zombies) {
            const distance = BABYLON.Vector3.Distance(
                zombie.model.mesh.position,
                this.scene.activeCamera.position
            );

            if (distance > 50) {
                // Reduce intelligence update frequency
                if (zombie.intelligence) {
                    zombie.intelligence.config.adaptationRate *= 0.5;
                }

                // Reduce pathfinding accuracy
                if (zombie.pathfinding) {
                    zombie.pathfinding.config.maxSearchNodes = Math.min(
                        zombie.pathfinding.config.maxSearchNodes,
                        500
                    );
                }
            }
        }
    }

    /**
     * Public API methods for backward compatibility and external control
     */

    getZombieCount() {
        return this.zombies.length;
    }

    addZombie(position) {
        if (this.zombies.length >= this.config.performance.maxZombies) {
            console.warn('Maximum zombie count reached');
            return null;
        }

        return this.createEnhancedZombie(this.zombies.length, { position }).then(zombie => {
            this.zombies.push(zombie);

            // Add to group management
            if (this.groupManager) {
                this.groupManager.addZombie(zombie);
            }

            this.stats.zombiesCreated++;
            return zombie;
        });
    }

    removeZombie(index) {
        if (index >= 0 && index < this.zombies.length) {
            const zombie = this.zombies[index];

            // Remove from systems
            if (this.communicationSystem) {
                this.communicationSystem.unregisterAgent(zombie);
            }

            if (this.environmentalAwareness) {
                this.environmentalAwareness.unregisterAgent(zombie);
            }

            if (this.groupManager) {
                this.groupManager.removeZombie(zombie);
            }

            // Dispose zombie
            zombie.dispose();

            // Remove from array
            this.zombies.splice(index, 1);

            // Clean up performance tracking
            this.performanceMetrics.zombieUpdateTimes.delete(zombie.id);

            this.stats.zombiesDestroyed++;
            return true;
        }
        return false;
    }

    /**
     * Get system statistics
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        const baseStats = { ...this.stats };

        // Add system-specific stats
        if (this.communicationSystem) {
            baseStats.communication = this.communicationSystem.getStatistics();
        }

        if (this.environmentalAwareness) {
            baseStats.environmental = this.environmentalAwareness.getStatistics();
        }

        if (this.groupManager) {
            baseStats.groupManagement = this.groupManager.getStatistics();
        }

        // Add performance metrics
        baseStats.performance = { ...this.performanceMetrics };

        return baseStats;
    }

    /**
     * Register event callback
     * @param {string} eventType - Event type
     * @param {Function} callback - Callback function
     */
    onEvent(eventType, callback) {
        if (!this.eventCallbacks.has(eventType)) {
            this.eventCallbacks.set(eventType, []);
        }
        this.eventCallbacks.get(eventType).push(callback);
    }

    /**
     * Dispose of the enhanced zombie behavior system
     */
    dispose() {
        console.log('Disposing Enhanced Zombie Behaviour System...');

        // Dispose all zombies
        this.zombies.forEach(zombie => {
            zombie.dispose();
        });
        this.zombies = [];

        // Dispose systems
        if (this.communicationSystem) {
            this.communicationSystem.dispose();
        }

        if (this.environmentalAwareness) {
            this.environmentalAwareness.dispose();
        }

        if (this.groupManager) {
            this.groupManager.dispose();
        }

        // Clear callbacks
        this.eventCallbacks.clear();

        // Clear scene observers
        this.scene.onBeforeRenderObservable.clear();

        console.log('Enhanced Zombie Behaviour System disposed');
    }
}
