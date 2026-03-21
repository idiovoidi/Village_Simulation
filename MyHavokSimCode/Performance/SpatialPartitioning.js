/**
 * Spatial partitioning system for efficient collision detection optimization
 * Implements spatial grid and octree structures for broad-phase collision filtering
 */

export class SpatialGrid {
    constructor(bounds, cellSize) {
        this.bounds = bounds; // { min: Vector3, max: Vector3 }
        this.cellSize = cellSize;

        // Calculate grid dimensions
        this.gridWidth = Math.ceil((bounds.max.x - bounds.min.x) / cellSize);
        this.gridHeight = Math.ceil((bounds.max.y - bounds.min.y) / cellSize);
        this.gridDepth = Math.ceil((bounds.max.z - bounds.min.z) / cellSize);

        // Grid storage - each cell contains array of object IDs
        this.grid = new Map();

        // Object tracking
        this.objects = new Map(); // objectId -> { position, bounds, cells }

        console.log(`SpatialGrid: Created ${this.gridWidth}x${this.gridHeight}x${this.gridDepth} grid`);
    }

    /**
     * Get grid cell coordinates for a position
     */
    getGridCoords(position) {
        return {
            x: Math.floor((position.x - this.bounds.min.x) / this.cellSize),
            y: Math.floor((position.y - this.bounds.min.y) / this.cellSize),
            z: Math.floor((position.z - this.bounds.min.z) / this.cellSize)
        };
    }

    /**
     * Get cell key for grid coordinates
     */
    getCellKey(x, y, z) {
        return `${x},${y},${z}`;
    }

    /**
     * Get all cells that an object's bounds intersect
     */
    getCellsForBounds(bounds) {
        const minCoords = this.getGridCoords(bounds.min);
        const maxCoords = this.getGridCoords(bounds.max);

        const cells = [];

        for (let x = Math.max(0, minCoords.x); x <= Math.min(this.gridWidth - 1, maxCoords.x); x++) {
            for (let y = Math.max(0, minCoords.y); y <= Math.min(this.gridHeight - 1, maxCoords.y); y++) {
                for (let z = Math.max(0, minCoords.z); z <= Math.min(this.gridDepth - 1, maxCoords.z); z++) {
                    cells.push(this.getCellKey(x, y, z));
                }
            }
        }

        return cells;
    }

    /**
     * Add object to spatial grid
     */
    addObject(objectId, position, bounds) {
        // Remove object if it already exists
        this.removeObject(objectId);

        // Get cells this object occupies
        const cells = this.getCellsForBounds(bounds);

        // Add object to each cell
        cells.forEach(cellKey => {
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, new Set());
            }
            this.grid.get(cellKey).add(objectId);
        });

        // Track object
        this.objects.set(objectId, {
            position: { ...position },
            bounds: {
                min: { ...bounds.min },
                max: { ...bounds.max }
            },
            cells
        });
    }

    /**
     * Remove object from spatial grid
     */
    removeObject(objectId) {
        const objectData = this.objects.get(objectId);
        if (!objectData) {
            return false;
        }

        // Remove from all cells
        objectData.cells.forEach(cellKey => {
            const cell = this.grid.get(cellKey);
            if (cell) {
                cell.delete(objectId);

                // Clean up empty cells
                if (cell.size === 0) {
                    this.grid.delete(cellKey);
                }
            }
        });

        // Remove object tracking
        this.objects.delete(objectId);
        return true;
    }

    /**
     * Update object position and bounds
     */
    updateObject(objectId, position, bounds) {
        const objectData = this.objects.get(objectId);
        if (!objectData) {
            // Object doesn't exist, add it
            this.addObject(objectId, position, bounds);
            return;
        }

        // Check if object moved to different cells
        const newCells = this.getCellsForBounds(bounds);
        const oldCells = objectData.cells;

        // If cells changed, update grid
        if (!this.arraysEqual(newCells, oldCells)) {
            // Remove from old cells
            oldCells.forEach(cellKey => {
                const cell = this.grid.get(cellKey);
                if (cell) {
                    cell.delete(objectId);
                    if (cell.size === 0) {
                        this.grid.delete(cellKey);
                    }
                }
            });

            // Add to new cells
            newCells.forEach(cellKey => {
                if (!this.grid.has(cellKey)) {
                    this.grid.set(cellKey, new Set());
                }
                this.grid.get(cellKey).add(objectId);
            });

            // Update object data
            objectData.cells = newCells;
        }

        // Update position and bounds
        objectData.position = { ...position };
        objectData.bounds = {
            min: { ...bounds.min },
            max: { ...bounds.max }
        };
    }

    /**
     * Get potential collision candidates for an object
     */
    getCollisionCandidates(objectId) {
        const objectData = this.objects.get(objectId);
        if (!objectData) {
            return [];
        }

        const candidates = new Set();

        // Check all cells the object occupies
        objectData.cells.forEach(cellKey => {
            const cell = this.grid.get(cellKey);
            if (cell) {
                cell.forEach(candidateId => {
                    if (candidateId !== objectId) {
                        candidates.add(candidateId);
                    }
                });
            }
        });

        return Array.from(candidates);
    }

    /**
     * Get all objects in a region
     */
    getObjectsInRegion(bounds) {
        const cells = this.getCellsForBounds(bounds);
        const objects = new Set();

        cells.forEach(cellKey => {
            const cell = this.grid.get(cellKey);
            if (cell) {
                cell.forEach(objectId => objects.add(objectId));
            }
        });

        return Array.from(objects);
    }

    /**
     * Helper method to compare arrays
     */
    arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return sortedA.every((val, i) => val === sortedB[i]);
    }

    /**
     * Get grid statistics
     */
    getStatistics() {
        let totalObjects = 0;
        let maxObjectsPerCell = 0;
        let occupiedCells = 0;

        this.grid.forEach(cell => {
            occupiedCells++;
            totalObjects += cell.size;
            maxObjectsPerCell = Math.max(maxObjectsPerCell, cell.size);
        });

        return {
            totalCells: this.gridWidth * this.gridHeight * this.gridDepth,
            occupiedCells,
            totalObjects: this.objects.size,
            maxObjectsPerCell,
            averageObjectsPerCell: occupiedCells > 0 ? totalObjects / occupiedCells : 0,
            memoryUsage: this.grid.size * 32 + this.objects.size * 128 // Rough estimate
        };
    }

    /**
     * Clear all objects from grid
     */
    clear() {
        this.grid.clear();
        this.objects.clear();
    }
}

export class CollisionOptimizer {
    constructor(scene, spatialGrid = null) {
        this.scene = scene;
        this.spatialGrid = spatialGrid;

        // Collision pair caching
        this.collisionPairCache = new Map(); // "id1,id2" -> { lastCheck, result, ttl }
        this.cacheTimeout = 100; // ms
        this.maxCacheSize = 10000;

        // Broad-phase filtering
        this.broadPhaseFilters = new Map(); // filterId -> filterFunction

        // Performance tracking
        this.metrics = {
            totalChecks: 0,
            cacheHits: 0,
            cacheMisses: 0,
            filteredPairs: 0,
            activePairs: 0
        };

        // Initialize default filters
        this.initializeDefaultFilters();
    }

    /**
     * Initialize default broad-phase filters
     */
    initializeDefaultFilters() {
        // Distance filter - skip objects too far apart
        this.addBroadPhaseFilter('distance', (obj1, obj2, maxDistance = 50) => {
            const dx = obj1.position.x - obj2.position.x;
            const dy = obj1.position.y - obj2.position.y;
            const dz = obj1.position.z - obj2.position.z;
            const distanceSquared = dx * dx + dy * dy + dz * dz;
            return distanceSquared <= maxDistance * maxDistance;
        });

        // Layer filter - skip objects on different collision layers
        this.addBroadPhaseFilter('layer', (obj1, obj2) => {
            const layer1 = obj1.collisionLayer || 0;
            const layer2 = obj2.collisionLayer || 0;
            return (layer1 & layer2) !== 0;
        });

        // Static filter - skip static-static collisions
        this.addBroadPhaseFilter('static', (obj1, obj2) => {
            const static1 = obj1.isStatic || false;
            const static2 = obj2.isStatic || false;
            return !(static1 && static2);
        });
    }

    /**
     * Add a broad-phase filter
     */
    addBroadPhaseFilter(filterId, filterFunction) {
        this.broadPhaseFilters.set(filterId, filterFunction);
    }

    /**
     * Remove a broad-phase filter
     */
    removeBroadPhaseFilter(filterId) {
        return this.broadPhaseFilters.delete(filterId);
    }

    /**
     * Check if two objects should be tested for collision
     */
    shouldCheckCollision(obj1, obj2) {
        // Apply all broad-phase filters
        for (const [filterId, filterFunc] of this.broadPhaseFilters.entries()) {
            try {
                if (!filterFunc(obj1, obj2)) {
                    this.metrics.filteredPairs++;
                    return false;
                }
            } catch (error) {
                console.warn(`CollisionOptimizer: Error in filter ${filterId}:`, error);
            }
        }

        return true;
    }

    /**
     * Get collision pair cache key
     */
    getPairCacheKey(id1, id2) {
        // Ensure consistent ordering
        return id1 < id2 ? `${id1},${id2}` : `${id2},${id1}`;
    }

    /**
     * Check collision pair cache
     */
    checkCollisionCache(id1, id2) {
        const cacheKey = this.getPairCacheKey(id1, id2);
        const cached = this.collisionPairCache.get(cacheKey);

        if (!cached) {
            this.metrics.cacheMisses++;
            return null;
        }

        const currentTime = performance.now();

        // Check if cache entry is still valid
        if (currentTime - cached.lastCheck > this.cacheTimeout) {
            this.collisionPairCache.delete(cacheKey);
            this.metrics.cacheMisses++;
            return null;
        }

        this.metrics.cacheHits++;
        return cached.result;
    }

    /**
     * Store collision result in cache
     */
    storeCollisionCache(id1, id2, result) {
        const cacheKey = this.getPairCacheKey(id1, id2);
        const currentTime = performance.now();

        // Manage cache size
        if (this.collisionPairCache.size >= this.maxCacheSize) {
            this.cleanupCollisionCache();
        }

        this.collisionPairCache.set(cacheKey, {
            lastCheck: currentTime,
            result,
            ttl: currentTime + this.cacheTimeout
        });
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCollisionCache() {
        const currentTime = performance.now();
        const toDelete = [];

        for (const [key, cached] of this.collisionPairCache.entries()) {
            if (currentTime > cached.ttl) {
                toDelete.push(key);
            }
        }

        toDelete.forEach(key => this.collisionPairCache.delete(key));

        // If still too large, remove oldest entries
        if (this.collisionPairCache.size >= this.maxCacheSize) {
            const entries = Array.from(this.collisionPairCache.entries());
            entries.sort((a, b) => a[1].lastCheck - b[1].lastCheck);

            const toRemove = entries.slice(0, Math.floor(this.maxCacheSize * 0.2));
            toRemove.forEach(([key]) => this.collisionPairCache.delete(key));
        }
    }

    /**
     * Get optimized collision pairs for an object
     */
    getCollisionPairs(objectId) {
        if (!this.spatialGrid) {
            return [];
        }

        // Get spatial candidates
        const candidates = this.spatialGrid.getCollisionCandidates(objectId);
        const objectData = this.spatialGrid.objects.get(objectId);

        if (!objectData) {
            return [];
        }

        const validPairs = [];

        candidates.forEach(candidateId => {
            const candidateData = this.spatialGrid.objects.get(candidateId);
            if (!candidateData) {
                return;
            }

            // Check cache first
            const cachedResult = this.checkCollisionCache(objectId, candidateId);
            if (cachedResult !== null) {
                if (cachedResult) {
                    validPairs.push(candidateId);
                }
                return;
            }

            // Apply broad-phase filters
            if (this.shouldCheckCollision(objectData, candidateData)) {
                validPairs.push(candidateId);
                this.storeCollisionCache(objectId, candidateId, true);
                this.metrics.activePairs++;
            } else {
                this.storeCollisionCache(objectId, candidateId, false);
            }

            this.metrics.totalChecks++;
        });

        return validPairs;
    }

    /**
     * Update collision optimization for all objects
     */
    updateCollisionOptimization() {
        if (!this.spatialGrid || !this.scene) {
            return;
        }

        // Update spatial grid with current object positions
        this.scene.meshes.forEach(mesh => {
            if (mesh.physicsImpostor) {
                const position = mesh.getAbsolutePosition();
                const bounds = this.calculateBounds(mesh);

                this.spatialGrid.updateObject(mesh.uniqueId, position, bounds);
            }
        });

        // Clean up cache periodically
        if (Math.random() < 0.01) { // 1% chance per update
            this.cleanupCollisionCache();
        }
    }

    /**
     * Calculate bounding box for a mesh
     */
    calculateBounds(mesh) {
        const boundingInfo = mesh.getBoundingInfo();

        return {
            min: {
                x: boundingInfo.boundingBox.minimumWorld.x,
                y: boundingInfo.boundingBox.minimumWorld.y,
                z: boundingInfo.boundingBox.minimumWorld.z
            },
            max: {
                x: boundingInfo.boundingBox.maximumWorld.x,
                y: boundingInfo.boundingBox.maximumWorld.y,
                z: boundingInfo.boundingBox.maximumWorld.z
            }
        };
    }

    /**
     * Get collision optimization metrics
     */
    getMetrics() {
        const spatialStats = this.spatialGrid ? this.spatialGrid.getStatistics() : null;

        return {
            ...this.metrics,
            cacheSize: this.collisionPairCache.size,
            cacheHitRate: this.metrics.totalChecks > 0
                ? this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) : 0,
            spatial: spatialStats
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            totalChecks: 0,
            cacheHits: 0,
            cacheMisses: 0,
            filteredPairs: 0,
            activePairs: 0
        };
    }

    /**
     * Clear all caches
     */
    clearCaches() {
        this.collisionPairCache.clear();
        if (this.spatialGrid) {
            this.spatialGrid.clear();
        }
    }

    /**
     * Dispose of the collision optimizer
     */
    dispose() {
        this.clearCaches();
        this.broadPhaseFilters.clear();
        this.scene = null;
        this.spatialGrid = null;
    }
}

export class PhysicsCollisionOptimizer {
    constructor(scene, bounds = null, cellSize = 10) {
        this.scene = scene;

        // Auto-calculate bounds if not provided
        if (!bounds) {
            bounds = this.calculateSceneBounds();
        }

        // Initialize spatial partitioning
        this.spatialGrid = new SpatialGrid(bounds, cellSize);
        this.collisionOptimizer = new CollisionOptimizer(scene, this.spatialGrid);

        // Integration state
        this.isActive = false;
        this.updateInterval = null;
        this.updateFrequency = 10; // Hz

        console.log('PhysicsCollisionOptimizer: Initialized with bounds:', bounds);
    }

    /**
     * Calculate scene bounds automatically
     */
    calculateSceneBounds() {
        if (!this.scene || this.scene.meshes.length === 0) {
            // Default bounds
            return {
                min: { x: -100, y: -10, z: -100 },
                max: { x: 100, y: 50, z: 100 }
            };
        }

        let minX = Infinity; let minY = Infinity; let minZ = Infinity;
        let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;

        this.scene.meshes.forEach(mesh => {
            const position = mesh.getAbsolutePosition();
            const boundingInfo = mesh.getBoundingInfo();

            if (boundingInfo) {
                const min = boundingInfo.boundingBox.minimumWorld;
                const max = boundingInfo.boundingBox.maximumWorld;

                minX = Math.min(minX, min.x);
                minY = Math.min(minY, min.y);
                minZ = Math.min(minZ, min.z);
                maxX = Math.max(maxX, max.x);
                maxY = Math.max(maxY, max.y);
                maxZ = Math.max(maxZ, max.z);
            }
        });

        // Add padding
        const padding = 20;
        return {
            min: { x: minX - padding, y: minY - padding, z: minZ - padding },
            max: { x: maxX + padding, y: maxY + padding, z: maxZ + padding }
        };
    }

    /**
     * Start collision optimization
     */
    start() {
        if (this.isActive) {
            return;
        }

        this.isActive = true;

        // Initial population of spatial grid
        this.populateSpatialGrid();

        // Start update loop
        const intervalMs = 1000 / this.updateFrequency;
        this.updateInterval = setInterval(() => {
            this.update();
        }, intervalMs);

        console.log('PhysicsCollisionOptimizer: Started');
    }

    /**
     * Stop collision optimization
     */
    stop() {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        console.log('PhysicsCollisionOptimizer: Stopped');
    }

    /**
     * Populate spatial grid with current scene objects
     */
    populateSpatialGrid() {
        if (!this.scene) {
            return;
        }

        this.spatialGrid.clear();

        this.scene.meshes.forEach(mesh => {
            if (mesh.physicsImpostor) {
                const position = mesh.getAbsolutePosition();
                const bounds = this.collisionOptimizer.calculateBounds(mesh);

                // Add collision properties
                const objectData = {
                    position,
                    bounds,
                    isStatic: mesh.physicsImpostor.type === BABYLON.PhysicsImpostor.BoxImpostor
                             && mesh.physicsImpostor.getLinearVelocity().length() < 0.01,
                    collisionLayer: mesh.collisionLayer || 1
                };

                this.spatialGrid.addObject(mesh.uniqueId, position, bounds);
            }
        });

        console.log(`PhysicsCollisionOptimizer: Populated grid with ${this.spatialGrid.objects.size} objects`);
    }

    /**
     * Update collision optimization
     */
    update() {
        if (!this.isActive) {
            return;
        }

        this.collisionOptimizer.updateCollisionOptimization();
    }

    /**
     * Get collision candidates for a specific object
     */
    getCollisionCandidates(objectId) {
        return this.collisionOptimizer.getCollisionPairs(objectId);
    }

    /**
     * Get optimization metrics
     */
    getMetrics() {
        return this.collisionOptimizer.getMetrics();
    }

    /**
     * Set update frequency
     */
    setUpdateFrequency(frequency) {
        this.updateFrequency = Math.max(1, Math.min(60, frequency));

        if (this.isActive) {
            this.stop();
            this.start();
        }
    }

    /**
     * Dispose of the collision optimizer
     */
    dispose() {
        this.stop();

        if (this.collisionOptimizer) {
            this.collisionOptimizer.dispose();
        }

        if (this.spatialGrid) {
            this.spatialGrid.clear();
        }

        this.scene = null;
        this.spatialGrid = null;
        this.collisionOptimizer = null;

        console.log('PhysicsCollisionOptimizer: Disposed');
    }
}
