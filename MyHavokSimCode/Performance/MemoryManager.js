/**
 * Memory management system with object pooling and resource cleanup
 * Handles memory optimization through pooling, cleanup scheduling, and leak detection
 */

export class MemoryManager {
    constructor(scene, memoryMonitor = null) {
        this.scene = scene;
        this.memoryMonitor = memoryMonitor;
        
        // Object pools for different types
        this.objectPools = new Map();
        this.poolConfigs = new Map();
        
        // Resource tracking
        this.trackedResources = new Map();
        this.resourceReferences = new Map();
        
        // Cleanup scheduling
        this.cleanupScheduler = null;
        this.cleanupInterval = 30000; // 30 seconds default
        this.isCleanupActive = false;
        
        // Memory pressure management
        this.memoryPressureThreshold = 0.8; // 80% memory usage
        this.aggressiveCleanupThreshold = 0.9; // 90% memory usage
        this.isMemoryPressure = false;
        
        // Statistics
        this.stats = {
            poolHits: 0,
            poolMisses: 0,
            objectsPooled: 0,
            objectsReturned: 0,
            resourcesDisposed: 0,
            cleanupCycles: 0,
            memoryReclaimed: 0
        };
        
        // Initialize default pools
        this.initializeDefaultPools();
        
        console.log('MemoryManager initialized');
    }

    /**
     * Initialize default object pools for common types
     */
    initializeDefaultPools() {
        // Particle system pools
        this.createObjectPool('particles', {
            initialSize: 50,
            maxSize: 200,
            factory: () => this.createParticleObject(),
            reset: (obj) => this.resetParticleObject(obj),
            dispose: (obj) => this.disposeParticleObject(obj)
        });
        
        // Temporary mesh pools
        this.createObjectPool('tempMeshes', {
            initialSize: 20,
            maxSize: 100,
            factory: () => this.createTempMesh(),
            reset: (obj) => this.resetTempMesh(obj),
            dispose: (obj) => this.disposeTempMesh(obj)
        });
        
        // Vector3 pools for calculations
        this.createObjectPool('vector3', {
            initialSize: 100,
            maxSize: 500,
            factory: () => new BABYLON.Vector3(),
            reset: (obj) => obj.setAll(0),
            dispose: (obj) => {} // Vectors don't need disposal
        });
        
        // Matrix pools
        this.createObjectPool('matrix', {
            initialSize: 50,
            maxSize: 200,
            factory: () => new BABYLON.Matrix(),
            reset: (obj) => obj.reset(),
            dispose: (obj) => {} // Matrices don't need disposal
        });
        
        // Animation group pools
        this.createObjectPool('animationGroups', {
            initialSize: 10,
            maxSize: 50,
            factory: () => this.createAnimationGroup(),
            reset: (obj) => this.resetAnimationGroup(obj),
            dispose: (obj) => this.disposeAnimationGroup(obj)
        });
    }

    /**
     * Create an object pool for a specific type
     */
    createObjectPool(type, config) {
        const pool = {
            available: [],
            inUse: new Set(),
            config: {
                initialSize: config.initialSize || 10,
                maxSize: config.maxSize || 100,
                factory: config.factory,
                reset: config.reset || (() => {}),
                dispose: config.dispose || (() => {})
            },
            stats: {
                created: 0,
                hits: 0,
                misses: 0,
                disposed: 0
            }
        };
        
        // Pre-populate pool
        for (let i = 0; i < pool.config.initialSize; i++) {
            const obj = pool.config.factory();
            pool.available.push(obj);
            pool.stats.created++;
        }
        
        this.objectPools.set(type, pool);
        this.poolConfigs.set(type, config);
        
        console.log(`Created object pool '${type}' with ${pool.config.initialSize} initial objects`);
        
        return pool;
    }

    /**
     * Get an object from the pool
     */
    getPooledObject(type) {
        const pool = this.objectPools.get(type);
        if (!pool) {
            console.warn(`Object pool '${type}' not found`);
            this.stats.poolMisses++;
            return null;
        }
        
        let obj;
        
        if (pool.available.length > 0) {
            // Get from pool
            obj = pool.available.pop();
            pool.stats.hits++;
            this.stats.poolHits++;
        } else {
            // Create new if under max size
            if (pool.inUse.size < pool.config.maxSize) {
                obj = pool.config.factory();
                pool.stats.created++;
                pool.stats.misses++;
                this.stats.poolMisses++;
            } else {
                console.warn(`Object pool '${type}' at maximum capacity (${pool.config.maxSize})`);
                return null;
            }
        }
        
        // Reset object state
        pool.config.reset(obj);
        
        // Track as in use
        pool.inUse.add(obj);
        this.stats.objectsPooled++;
        
        return obj;
    }

    /**
     * Return an object to the pool
     */
    returnToPool(obj, type) {
        const pool = this.objectPools.get(type);
        if (!pool) {
            console.warn(`Object pool '${type}' not found`);
            return false;
        }
        
        if (!pool.inUse.has(obj)) {
            console.warn(`Object not tracked in pool '${type}'`);
            return false;
        }
        
        // Remove from in-use tracking
        pool.inUse.delete(obj);
        
        // Reset object state
        pool.config.reset(obj);
        
        // Return to available pool
        pool.available.push(obj);
        this.stats.objectsReturned++;
        
        return true;
    }

    /**
     * Track a resource for cleanup management
     */
    trackResource(resource, type, metadata = {}) {
        const resourceId = this.generateResourceId();
        
        const resourceInfo = {
            id: resourceId,
            resource,
            type,
            metadata,
            createdAt: performance.now(),
            lastAccessed: performance.now(),
            accessCount: 0,
            size: this.estimateResourceSize(resource, type)
        };
        
        this.trackedResources.set(resourceId, resourceInfo);
        
        // Initialize reference count
        this.resourceReferences.set(resourceId, 0);
        
        return resourceId;
    }

    /**
     * Add reference to a tracked resource
     */
    addResourceReference(resourceId) {
        if (!this.trackedResources.has(resourceId)) {
            console.warn(`Resource ${resourceId} not found for reference tracking`);
            return false;
        }
        
        const currentRefs = this.resourceReferences.get(resourceId) || 0;
        this.resourceReferences.set(resourceId, currentRefs + 1);
        
        // Update access tracking
        const resourceInfo = this.trackedResources.get(resourceId);
        resourceInfo.lastAccessed = performance.now();
        resourceInfo.accessCount++;
        
        return true;
    }

    /**
     * Remove reference from a tracked resource
     */
    removeResourceReference(resourceId) {
        if (!this.trackedResources.has(resourceId)) {
            return false;
        }
        
        const currentRefs = this.resourceReferences.get(resourceId) || 0;
        const newRefs = Math.max(0, currentRefs - 1);
        this.resourceReferences.set(resourceId, newRefs);
        
        // Schedule for cleanup if no references
        if (newRefs === 0) {
            this.scheduleResourceCleanup(resourceId);
        }
        
        return true;
    }

    /**
     * Start automatic cleanup scheduling
     */
    startCleanupScheduler() {
        if (this.cleanupScheduler) {
            return;
        }
        
        console.log('Starting memory cleanup scheduler...');
        this.isCleanupActive = true;
        
        this.cleanupScheduler = setInterval(() => {
            this.performScheduledCleanup();
        }, this.cleanupInterval);
    }

    /**
     * Stop automatic cleanup scheduling
     */
    stopCleanupScheduler() {
        if (!this.cleanupScheduler) {
            return;
        }
        
        console.log('Stopping memory cleanup scheduler...');
        clearInterval(this.cleanupScheduler);
        this.cleanupScheduler = null;
        this.isCleanupActive = false;
    }

    /**
     * Perform scheduled cleanup of unused resources
     */
    performScheduledCleanup() {
        const startTime = performance.now();
        let disposedCount = 0;
        let reclaimedMemory = 0;
        
        // Check memory pressure
        this.checkMemoryPressure();
        
        // Determine cleanup aggressiveness
        const isAggressive = this.isMemoryPressure;
        const maxAge = isAggressive ? 30000 : 60000; // 30s aggressive, 60s normal
        const currentTime = performance.now();
        
        // Find resources to cleanup
        const resourcesToCleanup = [];
        
        for (const [resourceId, resourceInfo] of this.trackedResources) {
            const refCount = this.resourceReferences.get(resourceId) || 0;
            const age = currentTime - resourceInfo.lastAccessed;
            
            // Cleanup criteria
            const shouldCleanup = refCount === 0 && (
                age > maxAge || 
                (isAggressive && age > 15000) // 15s in aggressive mode
            );
            
            if (shouldCleanup) {
                resourcesToCleanup.push({ resourceId, resourceInfo });
            }
        }
        
        // Dispose resources
        for (const { resourceId, resourceInfo } of resourcesToCleanup) {
            try {
                this.disposeResource(resourceInfo.resource, resourceInfo.type);
                reclaimedMemory += resourceInfo.size;
                disposedCount++;
                
                // Remove from tracking
                this.trackedResources.delete(resourceId);
                this.resourceReferences.delete(resourceId);
                
            } catch (error) {
                console.error(`Error disposing resource ${resourceId}:`, error);
            }
        }
        
        // Update statistics
        this.stats.resourcesDisposed += disposedCount;
        this.stats.cleanupCycles++;
        this.stats.memoryReclaimed += reclaimedMemory;
        
        const duration = performance.now() - startTime;
        
        if (disposedCount > 0) {
            console.log(`Cleanup cycle completed: ${disposedCount} resources disposed, ` +
                       `${this.formatBytes(reclaimedMemory)} reclaimed in ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * Check for memory pressure conditions
     */
    checkMemoryPressure() {
        if (!this.memoryMonitor) {
            return;
        }
        
        const metrics = this.memoryMonitor.getCurrentMetrics();
        const usagePercent = metrics.usagePercentage / 100;
        
        const wasMemoryPressure = this.isMemoryPressure;
        this.isMemoryPressure = usagePercent > this.memoryPressureThreshold;
        
        // Trigger aggressive cleanup if crossing threshold
        if (!wasMemoryPressure && this.isMemoryPressure) {
            console.warn(`Memory pressure detected (${metrics.usagePercentage}% usage)`);
            this.triggerAggressiveCleanup();
        }
        
        // Emergency cleanup at critical threshold
        if (usagePercent > this.aggressiveCleanupThreshold) {
            console.error(`Critical memory usage (${metrics.usagePercentage}% usage) - triggering emergency cleanup`);
            this.triggerEmergencyCleanup();
        }
    }

    /**
     * Trigger aggressive cleanup mode
     */
    triggerAggressiveCleanup() {
        console.log('Triggering aggressive memory cleanup...');
        
        // Reduce pool sizes
        this.shrinkObjectPools(0.5); // Reduce to 50%
        
        // Force cleanup of all unreferenced resources
        this.performScheduledCleanup();
        
        // Trigger garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Trigger emergency cleanup mode
     */
    triggerEmergencyCleanup() {
        console.log('Triggering emergency memory cleanup...');
        
        // Drastically reduce pool sizes
        this.shrinkObjectPools(0.2); // Reduce to 20%
        
        // Dispose all unreferenced resources immediately
        const resourcesToDispose = [];
        for (const [resourceId, resourceInfo] of this.trackedResources) {
            const refCount = this.resourceReferences.get(resourceId) || 0;
            if (refCount === 0) {
                resourcesToDispose.push({ resourceId, resourceInfo });
            }
        }
        
        for (const { resourceId, resourceInfo } of resourcesToDispose) {
            try {
                this.disposeResource(resourceInfo.resource, resourceInfo.type);
                this.trackedResources.delete(resourceId);
                this.resourceReferences.delete(resourceId);
            } catch (error) {
                console.error(`Emergency cleanup error for resource ${resourceId}:`, error);
            }
        }
        
        // Force garbage collection
        if (window.gc) {
            window.gc();
        }
        
        console.log(`Emergency cleanup completed: ${resourcesToDispose.length} resources disposed`);
    }

    /**
     * Shrink object pools to reduce memory usage
     */
    shrinkObjectPools(factor = 0.5) {
        for (const [type, pool] of this.objectPools) {
            const targetSize = Math.floor(pool.available.length * factor);
            const toDispose = pool.available.splice(targetSize);
            
            // Dispose excess objects
            for (const obj of toDispose) {
                try {
                    pool.config.dispose(obj);
                    pool.stats.disposed++;
                } catch (error) {
                    console.error(`Error disposing pooled object from '${type}':`, error);
                }
            }
            
            if (toDispose.length > 0) {
                console.log(`Shrunk pool '${type}': disposed ${toDispose.length} objects`);
            }
        }
    }

    /**
     * Get memory management statistics
     */
    getStatistics() {
        const poolStats = {};
        for (const [type, pool] of this.objectPools) {
            poolStats[type] = {
                available: pool.available.length,
                inUse: pool.inUse.size,
                total: pool.available.length + pool.inUse.size,
                maxSize: pool.config.maxSize,
                utilization: pool.inUse.size / pool.config.maxSize,
                ...pool.stats
            };
        }
        
        return {
            pools: poolStats,
            resources: {
                tracked: this.trackedResources.size,
                totalSize: this.getTotalTrackedResourceSize()
            },
            cleanup: {
                isActive: this.isCleanupActive,
                interval: this.cleanupInterval,
                isMemoryPressure: this.isMemoryPressure
            },
            ...this.stats
        };
    }

    /**
     * Get total size of tracked resources
     */
    getTotalTrackedResourceSize() {
        let totalSize = 0;
        for (const resourceInfo of this.trackedResources.values()) {
            totalSize += resourceInfo.size;
        }
        return totalSize;
    }

    /**
     * Schedule a specific resource for cleanup
     */
    scheduleResourceCleanup(resourceId, delay = 5000) {
        setTimeout(() => {
            const resourceInfo = this.trackedResources.get(resourceId);
            if (resourceInfo) {
                const refCount = this.resourceReferences.get(resourceId) || 0;
                if (refCount === 0) {
                    try {
                        this.disposeResource(resourceInfo.resource, resourceInfo.type);
                        this.trackedResources.delete(resourceId);
                        this.resourceReferences.delete(resourceId);
                        this.stats.resourcesDisposed++;
                    } catch (error) {
                        console.error(`Error in scheduled cleanup for resource ${resourceId}:`, error);
                    }
                }
            }
        }, delay);
    }

    // Factory methods for default pool objects
    createParticleObject() {
        // Create a simple particle object structure
        return {
            position: new BABYLON.Vector3(),
            velocity: new BABYLON.Vector3(),
            life: 1.0,
            maxLife: 1.0,
            size: 1.0,
            color: new BABYLON.Color4(1, 1, 1, 1),
            active: false
        };
    }

    resetParticleObject(particle) {
        particle.position.setAll(0);
        particle.velocity.setAll(0);
        particle.life = 1.0;
        particle.maxLife = 1.0;
        particle.size = 1.0;
        particle.color.set(1, 1, 1, 1);
        particle.active = false;
    }

    disposeParticleObject(particle) {
        // Particles don't need special disposal
    }

    createTempMesh() {
        const mesh = BABYLON.MeshBuilder.CreateBox("tempMesh", { size: 1 }, this.scene);
        mesh.setEnabled(false);
        return mesh;
    }

    resetTempMesh(mesh) {
        mesh.position.setAll(0);
        mesh.rotation.setAll(0);
        mesh.scaling.setAll(1);
        mesh.setEnabled(false);
        if (mesh.material) {
            mesh.material = null;
        }
    }

    disposeTempMesh(mesh) {
        if (mesh && !mesh.isDisposed()) {
            mesh.dispose();
        }
    }

    createAnimationGroup() {
        return new BABYLON.AnimationGroup("pooledAnimationGroup", this.scene);
    }

    resetAnimationGroup(animGroup) {
        animGroup.stop();
        animGroup.reset();
        animGroup.setWeightForAllAnimatables(1);
    }

    disposeAnimationGroup(animGroup) {
        if (animGroup && !animGroup.isDisposed) {
            animGroup.dispose();
        }
    }

    /**
     * Estimate resource size for tracking
     */
    estimateResourceSize(resource, type) {
        switch (type) {
            case 'mesh':
                return this.estimateMeshSize(resource);
            case 'texture':
                return this.estimateTextureSize(resource);
            case 'material':
                return 1024; // Rough estimate
            case 'animation':
                return 2048; // Rough estimate
            default:
                return 512; // Default estimate
        }
    }

    estimateMeshSize(mesh) {
        if (!mesh || !mesh.getVerticesData) {
            return 1024;
        }
        
        const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const indices = mesh.getIndices();
        
        let size = 0;
        if (positions) size += positions.length * 4; // Float32 = 4 bytes
        if (indices) size += indices.length * 2; // Uint16 = 2 bytes
        
        return size || 1024;
    }

    estimateTextureSize(texture) {
        if (!texture || !texture.getSize) {
            return 4096;
        }
        
        const size = texture.getSize();
        const bytesPerPixel = 4; // RGBA
        return size.width * size.height * bytesPerPixel;
    }

    /**
     * Dispose a resource based on its type
     */
    disposeResource(resource, type) {
        if (!resource) return;
        
        switch (type) {
            case 'mesh':
                if (resource.dispose && !resource.isDisposed()) {
                    resource.dispose();
                }
                break;
            case 'texture':
                if (resource.dispose && !resource.isDisposed()) {
                    resource.dispose();
                }
                break;
            case 'material':
                if (resource.dispose && !resource.isDisposed()) {
                    resource.dispose();
                }
                break;
            case 'animation':
                if (resource.dispose) {
                    resource.dispose();
                }
                break;
            default:
                if (resource.dispose) {
                    resource.dispose();
                }
        }
    }

    /**
     * Generate unique resource ID
     */
    generateResourceId() {
        return `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Set cleanup interval
     */
    setCleanupInterval(intervalMs) {
        this.cleanupInterval = Math.max(5000, intervalMs); // Minimum 5 seconds
        
        if (this.isCleanupActive) {
            this.stopCleanupScheduler();
            this.startCleanupScheduler();
        }
    }

    /**
     * Set memory pressure thresholds
     */
    setMemoryPressureThresholds(normalThreshold, aggressiveThreshold) {
        this.memoryPressureThreshold = Math.max(0.1, Math.min(1.0, normalThreshold));
        this.aggressiveCleanupThreshold = Math.max(this.memoryPressureThreshold, Math.min(1.0, aggressiveThreshold));
    }

    /**
     * Dispose of the memory manager
     */
    dispose() {
        console.log('Disposing MemoryManager...');
        
        // Stop cleanup scheduler
        this.stopCleanupScheduler();
        
        // Dispose all pooled objects
        for (const [type, pool] of this.objectPools) {
            for (const obj of pool.available) {
                try {
                    pool.config.dispose(obj);
                } catch (error) {
                    console.error(`Error disposing pooled object from '${type}':`, error);
                }
            }
            
            for (const obj of pool.inUse) {
                try {
                    pool.config.dispose(obj);
                } catch (error) {
                    console.error(`Error disposing in-use object from '${type}':`, error);
                }
            }
        }
        
        // Dispose all tracked resources
        for (const [resourceId, resourceInfo] of this.trackedResources) {
            try {
                this.disposeResource(resourceInfo.resource, resourceInfo.type);
            } catch (error) {
                console.error(`Error disposing tracked resource ${resourceId}:`, error);
            }
        }
        
        // Clear all data structures
        this.objectPools.clear();
        this.poolConfigs.clear();
        this.trackedResources.clear();
        this.resourceReferences.clear();
        
        console.log('MemoryManager disposed');
    }
}