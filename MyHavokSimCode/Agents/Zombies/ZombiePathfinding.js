/**
 * Enhanced Zombie Pathfinding Component
 * Implements A* pathfinding with dynamic obstacle avoidance and crowd management
 */

export class ZombiePathfinding {
    constructor(zombie, options = {}) {
        this.zombie = zombie;
        this.scene = zombie.scene;
        
        // Configuration
        this.config = {
            gridSize: options.gridSize || 2, // Grid cell size in world units
            maxSearchDistance: options.maxSearchDistance || 100,
            maxSearchNodes: options.maxSearchNodes || 1000,
            smoothingIterations: options.smoothingIterations || 3,
            crowdAvoidanceRadius: options.crowdAvoidanceRadius || 5,
            obstacleAvoidanceRadius: options.obstacleAvoidanceRadius || 3,
            heightTolerance: options.heightTolerance || 2,
            pathUpdateInterval: options.pathUpdateInterval || 500, // ms
            dynamicReplanning: options.dynamicReplanning !== false,
            useFlowFields: options.useFlowFields !== false
        };
        
        // Pathfinding state
        this.currentPath = [];
        this.currentPathIndex = 0;
        this.destination = null;
        this.isPathfinding = false;
        this.lastPathUpdate = 0;
        this.pathfindingFailed = false;
        
        // Navigation grid
        this.navigationGrid = null;
        this.gridBounds = { minX: -200, maxX: 200, minZ: -200, maxZ: 200 };
        
        // Crowd avoidance
        this.crowdAvoidance = {
            enabled: true,
            neighbors: [],
            separationForce: new BABYLON.Vector3(0, 0, 0),
            alignmentForce: new BABYLON.Vector3(0, 0, 0),
            cohesionForce: new BABYLON.Vector3(0, 0, 0)
        };
        
        // Dynamic obstacles
        this.dynamicObstacles = new Set();
        this.staticObstacles = new Set();
        
        // Flow field for group movement
        this.flowField = null;
        this.flowFieldTarget = null;
        
        // Performance optimization
        this.pathCache = new Map();
        this.cacheTimeout = 5000; // 5 seconds
        
        // External systems
        this.environmentalAwareness = null;
        this.groupManager = null;
        
        // Statistics
        this.stats = {
            pathsCalculated: 0,
            pathsSuccessful: 0,
            pathsFailed: 0,
            averagePathLength: 0,
            averageCalculationTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }
    
    /**
     * Initialize the pathfinding system
     * @param {Object} systems - External systems
     */
    initialize(systems = {}) {
        this.environmentalAwareness = systems.environmental;
        this.groupManager = systems.groupManager;
        
        // Initialize navigation grid
        this.initializeNavigationGrid();
        
        console.log(`Zombie Pathfinding initialized for ${this.zombie.id || 'unknown'}`);
    }
    
    /**
     * Initialize the navigation grid
     */
    initializeNavigationGrid() {
        const width = Math.ceil((this.gridBounds.maxX - this.gridBounds.minX) / this.config.gridSize);
        const height = Math.ceil((this.gridBounds.maxZ - this.gridBounds.minZ) / this.config.gridSize);
        
        this.navigationGrid = new NavigationGrid(width, height, this.config.gridSize, this.gridBounds);
        
        // Scan for static obstacles
        this.scanForStaticObstacles();
    }
    
    /**
     * Scan for static obstacles in the scene
     */
    scanForStaticObstacles() {
        if (!this.scene) return;
        
        // Get all meshes that could be obstacles
        const meshes = this.scene.meshes.filter(mesh => 
            mesh.isPickable && 
            !mesh.name.startsWith('agent') && 
            !mesh.name.startsWith('zombie') &&
            !mesh.name.startsWith('villager')
        );
        
        for (const mesh of meshes) {
            this.addStaticObstacle(mesh);
        }
    }
    
    /**
     * Add a static obstacle to the navigation grid
     * @param {BABYLON.Mesh} mesh - Obstacle mesh
     */
    addStaticObstacle(mesh) {
        if (!mesh.getBoundingInfo) return;
        
        const boundingInfo = mesh.getBoundingInfo();
        const min = boundingInfo.minimum;
        const max = boundingInfo.maximum;
        
        // Mark grid cells as obstacles
        this.navigationGrid.markObstacleArea(min, max);
        this.staticObstacles.add(mesh);
    }
    
    /**
     * Add a dynamic obstacle
     * @param {Object} obstacle - Obstacle object with position and radius
     */
    addDynamicObstacle(obstacle) {
        this.dynamicObstacles.add(obstacle);
        
        // Mark grid cells temporarily
        if (obstacle.position && obstacle.radius) {
            this.navigationGrid.markTemporaryObstacle(obstacle.position, obstacle.radius);
        }
    }
    
    /**
     * Remove a dynamic obstacle
     * @param {Object} obstacle - Obstacle to remove
     */
    removeDynamicObstacle(obstacle) {
        this.dynamicObstacles.delete(obstacle);
        
        // Clear temporary obstacle marking
        if (obstacle.position && obstacle.radius) {
            this.navigationGrid.clearTemporaryObstacle(obstacle.position, obstacle.radius);
        }
    }
    
    /**
     * Find path to destination using A* algorithm
     * @param {BABYLON.Vector3} destination - Target destination
     * @param {Object} options - Pathfinding options
     * @returns {Promise<Array>} - Promise resolving to path array
     */
    async findPath(destination, options = {}) {
        const startTime = performance.now();
        
        this.destination = destination.clone();
        this.isPathfinding = true;
        this.pathfindingFailed = false;
        
        try {
            // Check cache first
            const cacheKey = this.getCacheKey(this.zombie.mesh.position, destination);
            const cachedPath = this.getFromCache(cacheKey);
            
            if (cachedPath) {
                this.stats.cacheHits++;
                this.currentPath = cachedPath;
                this.currentPathIndex = 0;
                return cachedPath;
            }
            
            this.stats.cacheMisses++;
            
            // Convert world positions to grid coordinates
            const startGrid = this.navigationGrid.worldToGrid(this.zombie.mesh.position);
            const endGrid = this.navigationGrid.worldToGrid(destination);
            
            // Validate start and end positions
            if (!this.navigationGrid.isValidPosition(startGrid.x, startGrid.z) ||
                !this.navigationGrid.isValidPosition(endGrid.x, endGrid.z)) {
                throw new Error('Invalid start or end position');
            }
            
            // Use flow field if available and appropriate
            if (this.config.useFlowFields && this.shouldUseFlowField(destination)) {
                const flowPath = this.followFlowField(startGrid, endGrid);
                if (flowPath.length > 0) {
                    this.currentPath = flowPath;
                    this.currentPathIndex = 0;
                    this.cacheResult(cacheKey, flowPath);
                    return flowPath;
                }
            }
            
            // Perform A* pathfinding
            const gridPath = await this.aStarSearch(startGrid, endGrid, options);
            
            if (gridPath.length === 0) {
                throw new Error('No path found');
            }
            
            // Convert grid path to world coordinates
            const worldPath = gridPath.map(gridPos => 
                this.navigationGrid.gridToWorld(gridPos.x, gridPos.z)
            );
            
            // Smooth the path
            const smoothedPath = this.smoothPath(worldPath);
            
            // Apply terrain height
            const finalPath = this.applyTerrainHeight(smoothedPath);
            
            // Cache the result
            this.cacheResult(cacheKey, finalPath);
            
            // Update statistics
            this.stats.pathsCalculated++;
            this.stats.pathsSuccessful++;
            this.stats.averagePathLength = (this.stats.averagePathLength + finalPath.length) / 2;
            
            const calculationTime = performance.now() - startTime;
            this.stats.averageCalculationTime = (this.stats.averageCalculationTime + calculationTime) / 2;
            
            this.currentPath = finalPath;
            this.currentPathIndex = 0;
            
            return finalPath;
            
        } catch (error) {
            console.warn(`Pathfinding failed for zombie ${this.zombie.id}:`, error.message);
            
            this.stats.pathsFailed++;
            this.pathfindingFailed = true;
            
            // Fallback to direct path
            const fallbackPath = this.createFallbackPath(destination);
            this.currentPath = fallbackPath;
            this.currentPathIndex = 0;
            
            return fallbackPath;
            
        } finally {
            this.isPathfinding = false;
        }
    }
    
    /**
     * A* pathfinding algorithm implementation
     * @param {Object} start - Start grid position
     * @param {Object} end - End grid position
     * @param {Object} options - Search options
     * @returns {Promise<Array>} - Promise resolving to grid path
     */
    async aStarSearch(start, end, options = {}) {
        const openSet = new PriorityQueue();
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const startKey = `${start.x},${start.z}`;
        const endKey = `${end.x},${end.z}`;
        
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, end));
        openSet.enqueue({ position: start, key: startKey }, fScore.get(startKey));
        
        let nodesExplored = 0;
        const maxNodes = options.maxNodes || this.config.maxSearchNodes;
        
        while (!openSet.isEmpty() && nodesExplored < maxNodes) {
            const current = openSet.dequeue();
            const currentKey = current.key;
            
            // Check if we reached the destination
            if (currentKey === endKey) {
                return this.reconstructPath(cameFrom, current.position);
            }
            
            closedSet.add(currentKey);
            nodesExplored++;
            
            // Explore neighbors
            const neighbors = this.getNeighbors(current.position);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.z}`;
                
                if (closedSet.has(neighborKey)) continue;
                
                // Check if neighbor is walkable
                if (!this.isWalkable(neighbor)) continue;
                
                const tentativeGScore = gScore.get(currentKey) + this.getMovementCost(current.position, neighbor);
                
                if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current.position);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));
                    
                    if (!openSet.contains(neighborKey)) {
                        openSet.enqueue({ position: neighbor, key: neighborKey }, fScore.get(neighborKey));
                    }
                }
            }
            
            // Yield control periodically to prevent blocking
            if (nodesExplored % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        // No path found
        return [];
    }
    
    /**
     * Get neighboring grid positions
     * @param {Object} position - Current grid position
     * @returns {Array} - Array of neighbor positions
     */
    getNeighbors(position) {
        const neighbors = [];
        const directions = [
            { x: -1, z: 0 }, { x: 1, z: 0 }, { x: 0, z: -1 }, { x: 0, z: 1 }, // Cardinal
            { x: -1, z: -1 }, { x: -1, z: 1 }, { x: 1, z: -1 }, { x: 1, z: 1 }  // Diagonal
        ];
        
        for (const dir of directions) {
            const neighbor = {
                x: position.x + dir.x,
                z: position.z + dir.z
            };
            
            if (this.navigationGrid.isValidPosition(neighbor.x, neighbor.z)) {
                neighbors.push(neighbor);
            }
        }
        
        return neighbors;
    }
    
    /**
     * Check if a grid position is walkable
     * @param {Object} position - Grid position to check
     * @returns {boolean} - Whether position is walkable
     */
    isWalkable(position) {
        // Check navigation grid
        if (!this.navigationGrid.isWalkable(position.x, position.z)) {
            return false;
        }
        
        // Check dynamic obstacles
        const worldPos = this.navigationGrid.gridToWorld(position.x, position.z);
        
        for (const obstacle of this.dynamicObstacles) {
            if (obstacle.position && obstacle.radius) {
                const distance = BABYLON.Vector3.Distance(worldPos, obstacle.position);
                if (distance < obstacle.radius) {
                    return false;
                }
            }
        }
        
        // Check height differences
        if (this.environmentalAwareness) {
            const currentHeight = this.getTerrainHeight(worldPos.x, worldPos.z);
            const zombieHeight = this.getTerrainHeight(this.zombie.mesh.position.x, this.zombie.mesh.position.z);
            
            if (Math.abs(currentHeight - zombieHeight) > this.config.heightTolerance) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Calculate movement cost between two grid positions
     * @param {Object} from - Start position
     * @param {Object} to - End position
     * @returns {number} - Movement cost
     */
    getMovementCost(from, to) {
        const dx = Math.abs(to.x - from.x);
        const dz = Math.abs(to.z - from.z);
        
        // Diagonal movement costs more
        const baseCost = (dx === 1 && dz === 1) ? 1.414 : 1.0;
        
        // Add terrain-based cost modifiers
        let terrainCost = 1.0;
        
        if (this.environmentalAwareness) {
            const worldPos = this.navigationGrid.gridToWorld(to.x, to.z);
            const threatLevel = this.environmentalAwareness.threatMap?.getThreatLevel(worldPos) || 0;
            
            // Avoid high-threat areas
            terrainCost += threatLevel * 2.0;
        }
        
        return baseCost * terrainCost;
    }
    
    /**
     * Heuristic function for A* (Manhattan distance with diagonal adjustment)
     * @param {Object} from - Start position
     * @param {Object} to - End position
     * @returns {number} - Heuristic cost
     */
    heuristic(from, to) {
        const dx = Math.abs(to.x - from.x);
        const dz = Math.abs(to.z - from.z);
        
        // Octile distance (allows diagonal movement)
        return Math.max(dx, dz) + (Math.sqrt(2) - 1) * Math.min(dx, dz);
    }
    
    /**
     * Reconstruct path from A* search results
     * @param {Map} cameFrom - Parent map from A* search
     * @param {Object} current - End position
     * @returns {Array} - Reconstructed path
     */
    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = `${current.x},${current.z}`;
        
        while (cameFrom.has(currentKey)) {
            current = cameFrom.get(currentKey);
            path.unshift(current);
            currentKey = `${current.x},${current.z}`;
        }
        
        return path;
    }
    
    /**
     * Smooth the path to reduce sharp turns
     * @param {Array} path - Raw path to smooth
     * @returns {Array} - Smoothed path
     */
    smoothPath(path) {
        if (path.length <= 2) return path;
        
        let smoothedPath = [...path];
        
        for (let iteration = 0; iteration < this.config.smoothingIterations; iteration++) {
            const newPath = [smoothedPath[0]]; // Keep start point
            
            for (let i = 1; i < smoothedPath.length - 1; i++) {
                const prev = smoothedPath[i - 1];
                const current = smoothedPath[i];
                const next = smoothedPath[i + 1];
                
                // Check if we can skip current point (line of sight)
                if (this.hasLineOfSight(prev, next)) {
                    continue; // Skip current point
                }
                
                newPath.push(current);
            }
            
            newPath.push(smoothedPath[smoothedPath.length - 1]); // Keep end point
            smoothedPath = newPath;
        }
        
        return smoothedPath;
    }
    
    /**
     * Check line of sight between two points
     * @param {BABYLON.Vector3} from - Start point
     * @param {BABYLON.Vector3} to - End point
     * @returns {boolean} - Whether there's line of sight
     */
    hasLineOfSight(from, to) {
        const steps = Math.ceil(BABYLON.Vector3.Distance(from, to) / this.config.gridSize);
        
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const checkPoint = BABYLON.Vector3.Lerp(from, to, t);
            const gridPos = this.navigationGrid.worldToGrid(checkPoint);
            
            if (!this.isWalkable(gridPos)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Apply terrain height to path points
     * @param {Array} path - Path to apply height to
     * @returns {Array} - Path with terrain height
     */
    applyTerrainHeight(path) {
        return path.map(point => {
            const height = this.getTerrainHeight(point.x, point.z);
            return new BABYLON.Vector3(point.x, height + 0.5, point.z); // Add small offset above ground
        });
    }
    
    /**
     * Get terrain height at a position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {number} - Terrain height
     */
    getTerrainHeight(x, z) {
        // Try using BowlCreator if available
        if (typeof window !== 'undefined' && window.BowlCreator && window.BowlCreator.getTerrainHeight) {
            return window.BowlCreator.getTerrainHeight(x, z);
        }
        
        // Fallback to simple calculation
        const distFromCenter = Math.sqrt(x * x + z * z);
        return -Math.pow(distFromCenter / 80, 1.2) * 25;
    }
    
    /**
     * Update pathfinding (called each frame)
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        const now = performance.now();
        
        // Update crowd avoidance
        if (this.crowdAvoidance.enabled) {
            this.updateCrowdAvoidance();
        }
        
        // Check if path needs updating
        if (this.config.dynamicReplanning && 
            now - this.lastPathUpdate > this.config.pathUpdateInterval &&
            this.destination) {
            
            this.checkPathValidity();
        }
        
        // Clean up expired cache entries
        this.cleanupCache();
    }
    
    /**
     * Update crowd avoidance forces
     */
    updateCrowdAvoidance() {
        if (!this.environmentalAwareness) return;
        
        // Find nearby zombies
        this.crowdAvoidance.neighbors = this.environmentalAwareness.getAgentsInRange(
            this.zombie.mesh.position,
            this.config.crowdAvoidanceRadius,
            { agentType: 'zombie', excludeAgent: this.zombie }
        );
        
        // Calculate separation force
        this.crowdAvoidance.separationForce = this.calculateSeparationForce();
        
        // Calculate alignment force
        this.crowdAvoidance.alignmentForce = this.calculateAlignmentForce();
        
        // Calculate cohesion force
        this.crowdAvoidance.cohesionForce = this.calculateCohesionForce();
    }
    
    /**
     * Calculate separation force to avoid crowding
     * @returns {BABYLON.Vector3} - Separation force
     */
    calculateSeparationForce() {
        const force = new BABYLON.Vector3(0, 0, 0);
        
        for (const neighbor of this.crowdAvoidance.neighbors) {
            const toNeighbor = neighbor.mesh.position.subtract(this.zombie.mesh.position);
            const distance = toNeighbor.length();
            
            if (distance > 0 && distance < this.config.crowdAvoidanceRadius) {
                const separationVector = toNeighbor.normalize().scale(-1 / distance);
                force.addInPlace(separationVector);
            }
        }
        
        return force;
    }
    
    /**
     * Calculate alignment force to match neighbor velocities
     * @returns {BABYLON.Vector3} - Alignment force
     */
    calculateAlignmentForce() {
        if (this.crowdAvoidance.neighbors.length === 0) {
            return new BABYLON.Vector3(0, 0, 0);
        }
        
        const averageVelocity = new BABYLON.Vector3(0, 0, 0);
        
        for (const neighbor of this.crowdAvoidance.neighbors) {
            if (neighbor.velocity) {
                averageVelocity.addInPlace(neighbor.velocity);
            }
        }
        
        averageVelocity.scaleInPlace(1 / this.crowdAvoidance.neighbors.length);
        
        return averageVelocity;
    }
    
    /**
     * Calculate cohesion force to stay with the group
     * @returns {BABYLON.Vector3} - Cohesion force
     */
    calculateCohesionForce() {
        if (this.crowdAvoidance.neighbors.length === 0) {
            return new BABYLON.Vector3(0, 0, 0);
        }
        
        const centerOfMass = new BABYLON.Vector3(0, 0, 0);
        
        for (const neighbor of this.crowdAvoidance.neighbors) {
            centerOfMass.addInPlace(neighbor.mesh.position);
        }
        
        centerOfMass.scaleInPlace(1 / this.crowdAvoidance.neighbors.length);
        
        return centerOfMass.subtract(this.zombie.mesh.position);
    }
    
    /**
     * Get the next position to move towards
     * @returns {BABYLON.Vector3|null} - Next position or null if no path
     */
    getNextPosition() {
        if (this.currentPath.length === 0 || this.currentPathIndex >= this.currentPath.length) {
            return null;
        }
        
        const nextPoint = this.currentPath[this.currentPathIndex];
        const currentPos = this.zombie.mesh.position;
        const distance = BABYLON.Vector3.Distance(currentPos, nextPoint);
        
        // Check if we've reached the current waypoint
        if (distance < this.config.gridSize * 0.5) {
            this.currentPathIndex++;
            
            // Return next waypoint if available
            if (this.currentPathIndex < this.currentPath.length) {
                return this.currentPath[this.currentPathIndex];
            } else {
                // Path completed
                this.currentPath = [];
                this.currentPathIndex = 0;
                return null;
            }
        }
        
        return nextPoint;
    }
    
    /**
     * Get movement direction with crowd avoidance
     * @returns {BABYLON.Vector3} - Movement direction
     */
    getMovementDirection() {
        const nextPos = this.getNextPosition();
        if (!nextPos) return new BABYLON.Vector3(0, 0, 0);
        
        let direction = nextPos.subtract(this.zombie.mesh.position).normalize();
        
        // Apply crowd avoidance if enabled
        if (this.crowdAvoidance.enabled) {
            const separationWeight = 2.0;
            const alignmentWeight = 0.5;
            const cohesionWeight = 0.3;
            
            const avoidanceForce = this.crowdAvoidance.separationForce.scale(separationWeight)
                .add(this.crowdAvoidance.alignmentForce.scale(alignmentWeight))
                .add(this.crowdAvoidance.cohesionForce.scale(cohesionWeight));
            
            direction = direction.add(avoidanceForce).normalize();
        }
        
        return direction;
    }
    
    /**
     * Check if current path is still valid
     */
    checkPathValidity() {
        if (this.currentPath.length === 0) return;
        
        // Check if any part of the path is now blocked
        for (let i = this.currentPathIndex; i < this.currentPath.length - 1; i++) {
            if (!this.hasLineOfSight(this.currentPath[i], this.currentPath[i + 1])) {
                // Path is blocked, need to replan
                this.replanPath();
                break;
            }
        }
    }
    
    /**
     * Replan the current path
     */
    async replanPath() {
        if (!this.destination) return;
        
        console.log(`Replanning path for zombie ${this.zombie.id}`);
        
        try {
            await this.findPath(this.destination);
            this.lastPathUpdate = performance.now();
        } catch (error) {
            console.warn(`Path replanning failed for zombie ${this.zombie.id}:`, error.message);
        }
    }
    
    /**
     * Create a fallback path when pathfinding fails
     * @param {BABYLON.Vector3} destination - Target destination
     * @returns {Array} - Fallback path
     */
    createFallbackPath(destination) {
        // Simple direct path with basic obstacle avoidance
        const path = [];
        const start = this.zombie.mesh.position.clone();
        const end = destination.clone();
        
        // Add intermediate points to avoid major obstacles
        const direction = end.subtract(start).normalize();
        const distance = BABYLON.Vector3.Distance(start, end);
        const steps = Math.ceil(distance / (this.config.gridSize * 2));
        
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const point = BABYLON.Vector3.Lerp(start, end, t);
            point.y = this.getTerrainHeight(point.x, point.z) + 0.5;
            path.push(point);
        }
        
        return path;
    }
    
    /**
     * Check if flow field should be used
     * @param {BABYLON.Vector3} destination - Target destination
     * @returns {boolean} - Whether to use flow field
     */
    shouldUseFlowField(destination) {
        // Use flow field for group movement
        if (this.zombie.currentGroup && this.zombie.currentGroup.members.size > 3) {
            return true;
        }
        
        // Use flow field if many zombies have the same target
        return false;
    }
    
    /**
     * Follow flow field for group movement
     * @param {Object} start - Start grid position
     * @param {Object} end - End grid position
     * @returns {Array} - Flow field path
     */
    followFlowField(start, end) {
        // Simplified flow field following
        // In a full implementation, this would use a pre-calculated flow field
        return [];
    }
    
    /**
     * Generate cache key for pathfinding result
     * @param {BABYLON.Vector3} start - Start position
     * @param {BABYLON.Vector3} end - End position
     * @returns {string} - Cache key
     */
    getCacheKey(start, end) {
        const startGrid = this.navigationGrid.worldToGrid(start);
        const endGrid = this.navigationGrid.worldToGrid(end);
        return `${startGrid.x},${startGrid.z}-${endGrid.x},${endGrid.z}`;
    }
    
    /**
     * Get result from cache
     * @param {string} key - Cache key
     * @returns {Array|null} - Cached path or null
     */
    getFromCache(key) {
        const cached = this.pathCache.get(key);
        if (cached && performance.now() - cached.timestamp < this.cacheTimeout) {
            return cached.path;
        }
        return null;
    }
    
    /**
     * Cache pathfinding result
     * @param {string} key - Cache key
     * @param {Array} path - Path to cache
     */
    cacheResult(key, path) {
        this.pathCache.set(key, {
            path: [...path],
            timestamp: performance.now()
        });
    }
    
    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = performance.now();
        for (const [key, cached] of this.pathCache) {
            if (now - cached.timestamp > this.cacheTimeout) {
                this.pathCache.delete(key);
            }
        }
    }
    
    /**
     * Get pathfinding statistics
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        return {
            ...this.stats,
            currentPathLength: this.currentPath.length,
            pathProgress: this.currentPath.length > 0 ? this.currentPathIndex / this.currentPath.length : 0,
            isPathfinding: this.isPathfinding,
            pathfindingFailed: this.pathfindingFailed,
            cacheSize: this.pathCache.size,
            cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0,
            crowdAvoidanceNeighbors: this.crowdAvoidance.neighbors.length
        };
    }
    
    /**
     * Dispose of the pathfinding system
     */
    dispose() {
        this.currentPath = [];
        this.pathCache.clear();
        this.dynamicObstacles.clear();
        this.staticObstacles.clear();
        
        if (this.navigationGrid) {
            this.navigationGrid.dispose();
        }
    }
}

/**
 * Navigation Grid for spatial pathfinding
 */
class NavigationGrid {
    constructor(width, height, cellSize, bounds) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.bounds = bounds;
        
        // Grid data: 0 = walkable, 1 = obstacle, 2 = temporary obstacle
        this.grid = new Uint8Array(width * height);
        
        // Initialize as walkable
        this.grid.fill(0);
    }
    
    /**
     * Convert world position to grid coordinates
     * @param {BABYLON.Vector3} worldPos - World position
     * @returns {Object} - Grid coordinates
     */
    worldToGrid(worldPos) {
        const x = Math.floor((worldPos.x - this.bounds.minX) / this.cellSize);
        const z = Math.floor((worldPos.z - this.bounds.minZ) / this.cellSize);
        return { x, z };
    }
    
    /**
     * Convert grid coordinates to world position
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridZ - Grid Z coordinate
     * @returns {BABYLON.Vector3} - World position
     */
    gridToWorld(gridX, gridZ) {
        const x = this.bounds.minX + (gridX + 0.5) * this.cellSize;
        const z = this.bounds.minZ + (gridZ + 0.5) * this.cellSize;
        return new BABYLON.Vector3(x, 0, z);
    }
    
    /**
     * Check if grid position is valid
     * @param {number} x - Grid X coordinate
     * @param {number} z - Grid Z coordinate
     * @returns {boolean} - Whether position is valid
     */
    isValidPosition(x, z) {
        return x >= 0 && x < this.width && z >= 0 && z < this.height;
    }
    
    /**
     * Check if grid position is walkable
     * @param {number} x - Grid X coordinate
     * @param {number} z - Grid Z coordinate
     * @returns {boolean} - Whether position is walkable
     */
    isWalkable(x, z) {
        if (!this.isValidPosition(x, z)) return false;
        return this.grid[z * this.width + x] === 0;
    }
    
    /**
     * Mark an area as obstacle
     * @param {BABYLON.Vector3} min - Minimum bounds
     * @param {BABYLON.Vector3} max - Maximum bounds
     */
    markObstacleArea(min, max) {
        const minGrid = this.worldToGrid(min);
        const maxGrid = this.worldToGrid(max);
        
        for (let z = Math.max(0, minGrid.z); z <= Math.min(this.height - 1, maxGrid.z); z++) {
            for (let x = Math.max(0, minGrid.x); x <= Math.min(this.width - 1, maxGrid.x); x++) {
                this.grid[z * this.width + x] = 1;
            }
        }
    }
    
    /**
     * Mark temporary obstacle
     * @param {BABYLON.Vector3} position - Obstacle position
     * @param {number} radius - Obstacle radius
     */
    markTemporaryObstacle(position, radius) {
        const center = this.worldToGrid(position);
        const gridRadius = Math.ceil(radius / this.cellSize);
        
        for (let z = center.z - gridRadius; z <= center.z + gridRadius; z++) {
            for (let x = center.x - gridRadius; x <= center.x + gridRadius; x++) {
                if (this.isValidPosition(x, z)) {
                    const distance = Math.sqrt((x - center.x) ** 2 + (z - center.z) ** 2);
                    if (distance <= gridRadius) {
                        this.grid[z * this.width + x] = 2;
                    }
                }
            }
        }
    }
    
    /**
     * Clear temporary obstacle
     * @param {BABYLON.Vector3} position - Obstacle position
     * @param {number} radius - Obstacle radius
     */
    clearTemporaryObstacle(position, radius) {
        const center = this.worldToGrid(position);
        const gridRadius = Math.ceil(radius / this.cellSize);
        
        for (let z = center.z - gridRadius; z <= center.z + gridRadius; z++) {
            for (let x = center.x - gridRadius; x <= center.x + gridRadius; x++) {
                if (this.isValidPosition(x, z) && this.grid[z * this.width + x] === 2) {
                    this.grid[z * this.width + x] = 0;
                }
            }
        }
    }
    
    /**
     * Dispose of the navigation grid
     */
    dispose() {
        this.grid = null;
    }
}

/**
 * Priority Queue for A* pathfinding
 */
class PriorityQueue {
    constructor() {
        this.items = [];
        this.keySet = new Set();
    }
    
    enqueue(item, priority) {
        const queueElement = { item, priority };
        let added = false;
        
        for (let i = 0; i < this.items.length; i++) {
            if (queueElement.priority < this.items[i].priority) {
                this.items.splice(i, 0, queueElement);
                added = true;
                break;
            }
        }
        
        if (!added) {
            this.items.push(queueElement);
        }
        
        this.keySet.add(item.key);
    }
    
    dequeue() {
        if (this.isEmpty()) return null;
        
        const item = this.items.shift();
        this.keySet.delete(item.item.key);
        return item.item;
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
    
    contains(key) {
        return this.keySet.has(key);
    }
}