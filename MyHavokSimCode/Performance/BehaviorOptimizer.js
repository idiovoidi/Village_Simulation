/**
 * BehaviorOptimizer - AI behavior efficiency optimization system
 * Implements behavior caching, shared computation optimization, and complexity scaling
 */

export class BehaviorOptimizer {
    constructor(scene) {
        this.scene = scene;
        
        // Caching system
        this.behaviorCache = new Map();        // Cache for behavior calculations
        this.sharedComputations = new Map();   // Shared computation results
        this.cacheConfig = {
            maxCacheSize: 1000,
            cacheTimeout: 5000,               // 5 seconds
            enableCaching: true
        };
        
        // Shared computation groups
        this.computationGroups = new Map();   // Group ID -> agents using shared computation
        this.groupResults = new Map();        // Group ID -> cached results
        
        // Behavior complexity scaling
        this.complexitySettings = {
            low: {
                pathfindingAccuracy: 0.5,
                flockingNeighbors: 5,
                decisionFrequency: 0.5,
                sensorRange: 0.7
            },
            medium: {
                pathfindingAccuracy: 0.75,
                flockingNeighbors: 8,
                decisionFrequency: 0.75,
                sensorRange: 0.85
            },
            high: {
                pathfindingAccuracy: 1.0,
                flockingNeighbors: 12,
                decisionFrequency: 1.0,
                sensorRange: 1.0
            }
        };
        
        // Current performance settings
        this.currentComplexity = 'medium';
        this.adaptiveComplexity = true;
        
        // Performance tracking
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            sharedComputations: 0,
            behaviorOptimizations: 0,
            totalBehaviorCalls: 0,
            averageOptimizationSaving: 0
        };
        
        // Behavior type configurations
        this.behaviorConfigs = new Map();
        this.initializeBehaviorConfigs();
        
        // Cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanupCache();
        }, 10000); // Cleanup every 10 seconds
        
        console.log('BehaviorOptimizer initialized');
    }

    /**
     * Initialize default behavior configurations
     */
    initializeBehaviorConfigs() {
        // Flocking behavior configuration
        this.behaviorConfigs.set('flocking', {
            cacheable: true,
            sharedComputation: true,
            complexityScalable: true,
            cacheKey: (agent, neighbors) => `flocking_${agent.id}_${neighbors.length}`,
            sharedGroupKey: (agents) => `flock_${Math.floor(agents[0].mesh.position.x / 10)}_${Math.floor(agents[0].mesh.position.z / 10)}`,
            optimizations: ['neighborReduction', 'spatialCaching', 'forceReuse']
        });
        
        // Pathfinding behavior configuration
        this.behaviorConfigs.set('pathfinding', {
            cacheable: true,
            sharedComputation: false,
            complexityScalable: true,
            cacheKey: (start, end, accuracy) => `path_${Math.floor(start.x)}_${Math.floor(start.z)}_${Math.floor(end.x)}_${Math.floor(end.z)}_${accuracy}`,
            optimizations: ['pathCaching', 'hierarchicalPathfinding', 'accuracyScaling']
        });
        
        // Seeking behavior configuration
        this.behaviorConfigs.set('seeking', {
            cacheable: true,
            sharedComputation: true,
            complexityScalable: true,
            cacheKey: (agent, target) => `seek_${agent.id}_${Math.floor(target.x)}_${Math.floor(target.z)}`,
            sharedGroupKey: (agents, target) => `seek_group_${Math.floor(target.x / 5)}_${Math.floor(target.z / 5)}`,
            optimizations: ['directionCaching', 'groupSeeking']
        });
        
        // Avoidance behavior configuration
        this.behaviorConfigs.set('avoidance', {
            cacheable: true,
            sharedComputation: true,
            complexityScalable: true,
            cacheKey: (agent, obstacles) => `avoid_${agent.id}_${obstacles.length}`,
            sharedGroupKey: (agents) => `avoid_${Math.floor(agents[0].mesh.position.x / 5)}_${Math.floor(agents[0].mesh.position.z / 5)}`,
            optimizations: ['obstacleGrouping', 'spatialHashing', 'forceBlending']
        });
    }

    /**
     * Cache a behavior calculation result
     */
    cacheBehaviorResult(behaviorType, cacheKey, result, ttl = null) {
        if (!this.cacheConfig.enableCaching) {
            return false;
        }

        const config = this.behaviorConfigs.get(behaviorType);
        if (!config || !config.cacheable) {
            return false;
        }

        // Check cache size limit
        if (this.behaviorCache.size >= this.cacheConfig.maxCacheSize) {
            this.cleanupOldestCacheEntries(Math.floor(this.cacheConfig.maxCacheSize * 0.1));
        }

        const cacheEntry = {
            result: this.cloneResult(result),
            timestamp: performance.now(),
            ttl: ttl || this.cacheConfig.cacheTimeout,
            behaviorType,
            accessCount: 0
        };

        this.behaviorCache.set(cacheKey, cacheEntry);
        return true;
    }

    /**
     * Retrieve a cached behavior result
     */
    getCachedBehaviorResult(behaviorType, cacheKey) {
        if (!this.cacheConfig.enableCaching) {
            this.metrics.cacheMisses++;
            return null;
        }

        const cacheEntry = this.behaviorCache.get(cacheKey);
        if (!cacheEntry) {
            this.metrics.cacheMisses++;
            return null;
        }

        // Check if cache entry has expired
        const age = performance.now() - cacheEntry.timestamp;
        if (age > cacheEntry.ttl) {
            this.behaviorCache.delete(cacheKey);
            this.metrics.cacheMisses++;
            return null;
        }

        // Update access tracking
        cacheEntry.accessCount++;
        this.metrics.cacheHits++;
        
        return this.cloneResult(cacheEntry.result);
    }

    /**
     * Optimize flocking behavior with caching and shared computation
     */
    optimizeFlockingBehavior(agents, options = {}) {
        this.metrics.totalBehaviorCalls++;
        const startTime = performance.now();
        
        const config = this.behaviorConfigs.get('flocking');
        const complexity = this.getComplexitySettings();
        
        // Group agents spatially for shared computation
        const spatialGroups = this.groupAgentsSpatially(agents, 15); // 15 unit grid
        const results = new Map();
        
        for (const [groupKey, groupAgents] of spatialGroups) {
            // Check for shared computation cache
            const sharedKey = `flocking_group_${groupKey}_${this.frameCounter}`;
            let sharedResult = this.getSharedComputation(sharedKey);
            
            if (!sharedResult) {
                // Compute shared flocking forces for the group
                sharedResult = this.computeSharedFlockingForces(groupAgents, complexity);
                this.cacheSharedComputation(sharedKey, sharedResult, 100); // Short TTL for frame-based cache
                this.metrics.sharedComputations++;
            }
            
            // Apply individual agent calculations
            for (const agent of groupAgents) {
                const individualKey = config.cacheKey(agent, groupAgents);
                let agentResult = this.getCachedBehaviorResult('flocking', individualKey);
                
                if (!agentResult) {
                    agentResult = this.computeIndividualFlockingForces(agent, groupAgents, sharedResult, complexity);
                    this.cacheBehaviorResult('flocking', individualKey, agentResult, 1000);
                }
                
                results.set(agent.id, agentResult);
            }
        }
        
        const duration = performance.now() - startTime;
        this.metrics.averageOptimizationSaving = 
            (this.metrics.averageOptimizationSaving + duration) / 2;
        this.metrics.behaviorOptimizations++;
        
        return results;
    }

    /**
     * Optimize pathfinding behavior with caching and complexity scaling
     */
    optimizePathfindingBehavior(agent, start, end, options = {}) {
        this.metrics.totalBehaviorCalls++;
        const startTime = performance.now();
        
        const config = this.behaviorConfigs.get('pathfinding');
        const complexity = this.getComplexitySettings();
        const accuracy = complexity.pathfindingAccuracy;
        
        // Create cache key with accuracy consideration
        const cacheKey = config.cacheKey(start, end, accuracy);
        let result = this.getCachedBehaviorResult('pathfinding', cacheKey);
        
        if (!result) {
            // Compute pathfinding with scaled complexity
            result = this.computeScaledPathfinding(agent, start, end, accuracy, options);
            this.cacheBehaviorResult('pathfinding', cacheKey, result, 5000); // Longer TTL for paths
        }
        
        const duration = performance.now() - startTime;
        this.metrics.averageOptimizationSaving = 
            (this.metrics.averageOptimizationSaving + duration) / 2;
        this.metrics.behaviorOptimizations++;
        
        return result;
    }

    /**
     * Optimize seeking behavior with shared computation
     */
    optimizeSeekingBehavior(agents, target, options = {}) {
        this.metrics.totalBehaviorCalls++;
        const startTime = performance.now();
        
        const config = this.behaviorConfigs.get('seeking');
        const complexity = this.getComplexitySettings();
        
        // Check for shared group computation
        const sharedKey = config.sharedGroupKey(agents, target);
        let sharedResult = this.getSharedComputation(sharedKey);
        
        if (!sharedResult) {
            // Compute shared seeking direction and distance
            sharedResult = this.computeSharedSeekingForces(agents, target, complexity);
            this.cacheSharedComputation(sharedKey, sharedResult, 500);
            this.metrics.sharedComputations++;
        }
        
        const results = new Map();
        
        // Apply individual modifications
        for (const agent of agents) {
            const individualKey = config.cacheKey(agent, target);
            let agentResult = this.getCachedBehaviorResult('seeking', individualKey);
            
            if (!agentResult) {
                agentResult = this.computeIndividualSeekingForce(agent, target, sharedResult, complexity);
                this.cacheBehaviorResult('seeking', individualKey, agentResult, 1000);
            }
            
            results.set(agent.id, agentResult);
        }
        
        const duration = performance.now() - startTime;
        this.metrics.averageOptimizationSaving = 
            (this.metrics.averageOptimizationSaving + duration) / 2;
        this.metrics.behaviorOptimizations++;
        
        return results;
    }

    /**
     * Compute shared flocking forces for a group of agents
     */
    computeSharedFlockingForces(agents, complexity) {
        const maxNeighbors = complexity.flockingNeighbors;
        const groupCenter = this.calculateGroupCenter(agents);
        const groupVelocity = this.calculateGroupVelocity(agents);
        
        // Spatial partitioning for neighbor finding
        const spatialGrid = this.createSpatialGrid(agents, 5);
        
        return {
            groupCenter,
            groupVelocity,
            spatialGrid,
            maxNeighbors,
            agentCount: agents.length
        };
    }

    /**
     * Compute individual flocking forces using shared computation
     */
    computeIndividualFlockingForces(agent, groupAgents, sharedResult, complexity) {
        const neighbors = this.findNearestNeighbors(
            agent, 
            groupAgents, 
            sharedResult.spatialGrid, 
            sharedResult.maxNeighbors
        );
        
        // Calculate flocking forces with reduced computation
        const separation = this.calculateSeparationForce(agent, neighbors);
        const alignment = this.calculateAlignmentForce(agent, sharedResult.groupVelocity);
        const cohesion = this.calculateCohesionForce(agent, sharedResult.groupCenter);
        
        return {
            separation,
            alignment,
            cohesion,
            neighborCount: neighbors.length
        };
    }

    /**
     * Compute scaled pathfinding based on complexity settings
     */
    computeScaledPathfinding(agent, start, end, accuracy, options) {
        // Implement hierarchical pathfinding based on accuracy
        if (accuracy < 0.6) {
            // Low accuracy: simple direct path with basic obstacle avoidance
            return this.computeSimplePath(start, end);
        } else if (accuracy < 0.9) {
            // Medium accuracy: A* with reduced node resolution
            return this.computeMediumAccuracyPath(start, end, 2); // 2x grid reduction
        } else {
            // High accuracy: Full A* pathfinding
            return this.computeHighAccuracyPath(start, end);
        }
    }

    /**
     * Compute shared seeking forces for a group
     */
    computeSharedSeekingForces(agents, target, complexity) {
        const groupCenter = this.calculateGroupCenter(agents);
        const directionToTarget = target.subtract(groupCenter).normalize();
        const distanceToTarget = BABYLON.Vector3.Distance(groupCenter, target);
        
        return {
            groupCenter,
            directionToTarget,
            distanceToTarget,
            sensorRange: complexity.sensorRange
        };
    }

    /**
     * Compute individual seeking force using shared computation
     */
    computeIndividualSeekingForce(agent, target, sharedResult, complexity) {
        const agentToTarget = target.subtract(agent.mesh.position);
        const distance = agentToTarget.length();
        
        // Use shared direction as base, modify for individual agent
        let seekForce = sharedResult.directionToTarget.clone();
        
        // Apply individual modifications based on agent position
        const individualDirection = agentToTarget.normalize();
        seekForce = seekForce.scale(0.7).add(individualDirection.scale(0.3));
        
        // Scale by distance and sensor range
        const effectiveRange = sharedResult.sensorRange * 50; // Base sensor range
        const forceStrength = Math.min(1.0, effectiveRange / distance);
        
        return {
            force: seekForce.scale(forceStrength),
            distance,
            strength: forceStrength
        };
    }

    /**
     * Group agents spatially for shared computation
     */
    groupAgentsSpatially(agents, gridSize) {
        const groups = new Map();
        
        for (const agent of agents) {
            if (!agent.mesh || !agent.mesh.position) continue;
            
            const gridX = Math.floor(agent.mesh.position.x / gridSize);
            const gridZ = Math.floor(agent.mesh.position.z / gridSize);
            const groupKey = `${gridX}_${gridZ}`;
            
            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            groups.get(groupKey).push(agent);
        }
        
        return groups;
    }

    /**
     * Cache shared computation result
     */
    cacheSharedComputation(key, result, ttl) {
        const cacheEntry = {
            result: this.cloneResult(result),
            timestamp: performance.now(),
            ttl: ttl || 1000,
            accessCount: 0
        };
        
        this.sharedComputations.set(key, cacheEntry);
    }

    /**
     * Get shared computation result
     */
    getSharedComputation(key) {
        const cacheEntry = this.sharedComputations.get(key);
        if (!cacheEntry) {
            return null;
        }
        
        const age = performance.now() - cacheEntry.timestamp;
        if (age > cacheEntry.ttl) {
            this.sharedComputations.delete(key);
            return null;
        }
        
        cacheEntry.accessCount++;
        return this.cloneResult(cacheEntry.result);
    }

    /**
     * Get current complexity settings
     */
    getComplexitySettings() {
        return this.complexitySettings[this.currentComplexity];
    }

    /**
     * Set behavior complexity level
     */
    setComplexityLevel(level) {
        if (this.complexitySettings[level]) {
            this.currentComplexity = level;
            console.log(`BehaviorOptimizer complexity set to: ${level}`);
            return true;
        }
        return false;
    }

    /**
     * Enable or disable adaptive complexity
     */
    setAdaptiveComplexity(enabled) {
        this.adaptiveComplexity = enabled;
    }

    /**
     * Adjust complexity based on performance metrics
     */
    adjustComplexityForPerformance(performanceMetrics) {
        if (!this.adaptiveComplexity) {
            return;
        }
        
        const fps = performanceMetrics.frameRate?.current || 60;
        const targetFps = performanceMetrics.frameRate?.target || 60;
        
        if (fps < targetFps * 0.8) {
            // Performance is poor, reduce complexity
            if (this.currentComplexity === 'high') {
                this.setComplexityLevel('medium');
            } else if (this.currentComplexity === 'medium') {
                this.setComplexityLevel('low');
            }
        } else if (fps > targetFps * 1.1) {
            // Performance is good, can increase complexity
            if (this.currentComplexity === 'low') {
                this.setComplexityLevel('medium');
            } else if (this.currentComplexity === 'medium') {
                this.setComplexityLevel('high');
            }
        }
    }

    /**
     * Helper methods for behavior calculations
     */
    calculateGroupCenter(agents) {
        if (agents.length === 0) return new BABYLON.Vector3.Zero();
        
        const sum = agents.reduce((acc, agent) => {
            if (agent.mesh && agent.mesh.position) {
                return acc.add(agent.mesh.position);
            }
            return acc;
        }, new BABYLON.Vector3.Zero());
        
        return sum.scale(1 / agents.length);
    }

    calculateGroupVelocity(agents) {
        if (agents.length === 0) return new BABYLON.Vector3.Zero();
        
        const sum = agents.reduce((acc, agent) => {
            if (agent.velocity) {
                return acc.add(agent.velocity);
            }
            return acc;
        }, new BABYLON.Vector3.Zero());
        
        return sum.scale(1 / agents.length);
    }

    createSpatialGrid(agents, cellSize) {
        const grid = new Map();
        
        for (const agent of agents) {
            if (!agent.mesh || !agent.mesh.position) continue;
            
            const cellX = Math.floor(agent.mesh.position.x / cellSize);
            const cellZ = Math.floor(agent.mesh.position.z / cellSize);
            const cellKey = `${cellX}_${cellZ}`;
            
            if (!grid.has(cellKey)) {
                grid.set(cellKey, []);
            }
            grid.get(cellKey).push(agent);
        }
        
        return grid;
    }

    findNearestNeighbors(agent, allAgents, spatialGrid, maxNeighbors) {
        // Use spatial grid to find nearby agents efficiently
        const agentPos = agent.mesh.position;
        const cellSize = 5;
        const cellX = Math.floor(agentPos.x / cellSize);
        const cellZ = Math.floor(agentPos.z / cellSize);
        
        const neighbors = [];
        
        // Check surrounding cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const cellKey = `${cellX + dx}_${cellZ + dz}`;
                const cellAgents = spatialGrid.get(cellKey) || [];
                
                for (const other of cellAgents) {
                    if (other.id !== agent.id && neighbors.length < maxNeighbors) {
                        const distance = BABYLON.Vector3.Distance(agentPos, other.mesh.position);
                        neighbors.push({ agent: other, distance });
                    }
                }
            }
        }
        
        // Sort by distance and return closest neighbors
        return neighbors
            .sort((a, b) => a.distance - b.distance)
            .slice(0, maxNeighbors)
            .map(n => n.agent);
    }

    calculateSeparationForce(agent, neighbors) {
        const separationForce = new BABYLON.Vector3.Zero();
        const separationRadius = 3;
        
        for (const neighbor of neighbors) {
            const distance = BABYLON.Vector3.Distance(agent.mesh.position, neighbor.mesh.position);
            if (distance < separationRadius && distance > 0) {
                const diff = agent.mesh.position.subtract(neighbor.mesh.position);
                diff.normalize();
                diff.scaleInPlace(1 / distance); // Stronger force when closer
                separationForce.addInPlace(diff);
            }
        }
        
        return separationForce;
    }

    calculateAlignmentForce(agent, groupVelocity) {
        if (!agent.velocity) return new BABYLON.Vector3.Zero();
        
        const alignmentForce = groupVelocity.subtract(agent.velocity);
        return alignmentForce.scale(0.1); // Gentle alignment
    }

    calculateCohesionForce(agent, groupCenter) {
        const cohesionForce = groupCenter.subtract(agent.mesh.position);
        return cohesionForce.scale(0.05); // Gentle cohesion
    }

    // Simplified pathfinding methods
    computeSimplePath(start, end) {
        const direction = end.subtract(start).normalize();
        return {
            path: [start, end],
            direction,
            distance: BABYLON.Vector3.Distance(start, end),
            accuracy: 'low'
        };
    }

    computeMediumAccuracyPath(start, end, gridReduction) {
        // Simplified A* with reduced resolution
        const direction = end.subtract(start).normalize();
        const distance = BABYLON.Vector3.Distance(start, end);
        const midpoint = start.add(end).scale(0.5);
        
        return {
            path: [start, midpoint, end],
            direction,
            distance,
            accuracy: 'medium'
        };
    }

    computeHighAccuracyPath(start, end) {
        // Full pathfinding implementation would go here
        const direction = end.subtract(start).normalize();
        const distance = BABYLON.Vector3.Distance(start, end);
        
        return {
            path: [start, end], // Simplified for now
            direction,
            distance,
            accuracy: 'high'
        };
    }

    /**
     * Clone result for caching
     */
    cloneResult(result) {
        if (result && typeof result === 'object') {
            return JSON.parse(JSON.stringify(result));
        }
        return result;
    }

    /**
     * Cleanup old cache entries
     */
    cleanupCache() {
        const now = performance.now();
        
        // Cleanup behavior cache
        for (const [key, entry] of this.behaviorCache) {
            if (now - entry.timestamp > entry.ttl) {
                this.behaviorCache.delete(key);
            }
        }
        
        // Cleanup shared computations
        for (const [key, entry] of this.sharedComputations) {
            if (now - entry.timestamp > entry.ttl) {
                this.sharedComputations.delete(key);
            }
        }
    }

    /**
     * Cleanup oldest cache entries
     */
    cleanupOldestCacheEntries(count) {
        const entries = Array.from(this.behaviorCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        for (let i = 0; i < Math.min(count, entries.length); i++) {
            this.behaviorCache.delete(entries[i][0]);
        }
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0 ?
            (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0;
        
        return {
            ...this.metrics,
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            cacheSize: this.behaviorCache.size,
            sharedComputationSize: this.sharedComputations.size,
            currentComplexity: this.currentComplexity,
            adaptiveComplexity: this.adaptiveComplexity,
            complexitySettings: this.getComplexitySettings()
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            sharedComputations: 0,
            behaviorOptimizations: 0,
            totalBehaviorCalls: 0,
            averageOptimizationSaving: 0
        };
    }

    /**
     * Configure caching settings
     */
    configureCaching(config) {
        this.cacheConfig = { ...this.cacheConfig, ...config };
    }

    /**
     * Dispose of the behavior optimizer
     */
    dispose() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.behaviorCache.clear();
        this.sharedComputations.clear();
        this.computationGroups.clear();
        this.groupResults.clear();
        
        console.log('BehaviorOptimizer disposed');
    }
}