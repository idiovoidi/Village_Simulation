/**
 * Resource cleanup and disposal system
 * Handles automatic cleanup scheduling, resource reference tracking, and leak detection
 */

export class ResourceCleanupSystem {
    constructor(scene, memoryManager = null) {
        this.scene = scene;
        this.memoryManager = memoryManager;
        
        // Resource tracking
        this.resourceRegistry = new Map();
        this.disposalQueue = new Map();
        this.leakDetector = new Map();
        
        // Cleanup scheduling
        this.cleanupTimer = null;
        this.cleanupInterval = 15000; // 15 seconds
        this.isActive = false;
        
        // Cleanup strategies
        this.cleanupStrategies = new Map();
        this.initializeCleanupStrategies();
        
        // Resource lifecycle tracking
        this.resourceLifecycles = new Map();
        
        // Statistics
        this.stats = {
            resourcesTracked: 0,
            resourcesDisposed: 0,
            leaksDetected: 0,
            cleanupCycles: 0,
            memoryReclaimed: 0,
            averageResourceLifetime: 0
        };
        
        // Configuration
        this.config = {
            maxResourceAge: 300000, // 5 minutes
            leakDetectionThreshold: 100, // Number of similar resources
            aggressiveCleanupThreshold: 0.85, // Memory usage percentage
            emergencyCleanupThreshold: 0.95,
            resourceSizeThreshold: 1024 * 1024 // 1MB - large resources get priority cleanup
        };
        
        console.log('ResourceCleanupSystem initialized');
    }

    /**
     * Initialize cleanup strategies for different resource types
     */
    initializeCleanupStrategies() {
        // Mesh cleanup strategy
        this.cleanupStrategies.set('mesh', {
            priority: 1,
            canDispose: (resource) => {
                return resource && !resource.isDisposed() && 
                       this.getResourceReferenceCount(resource) === 0;
            },
            dispose: (resource) => {
                if (resource.material && resource.material !== this.scene.defaultMaterial) {
                    this.scheduleResourceDisposal(resource.material, 'material');
                }
                resource.dispose();
            },
            estimateSize: (resource) => {
                const positions = resource.getVerticesData?.(BABYLON.VertexBuffer.PositionKind);
                const indices = resource.getIndices?.();
                let size = 0;
                if (positions) size += positions.length * 4;
                if (indices) size += indices.length * 2;
                return size || 1024;
            }
        });
        
        // Texture cleanup strategy
        this.cleanupStrategies.set('texture', {
            priority: 2,
            canDispose: (resource) => {
                return resource && !resource.isDisposed() && 
                       this.getResourceReferenceCount(resource) === 0;
            },
            dispose: (resource) => {
                resource.dispose();
            },
            estimateSize: (resource) => {
                const size = resource.getSize?.();
                if (size) {
                    return size.width * size.height * 4; // RGBA
                }
                return 4096; // Default estimate
            }
        });
        
        // Material cleanup strategy
        this.cleanupStrategies.set('material', {
            priority: 3,
            canDispose: (resource) => {
                return resource && !resource.isDisposed() && 
                       resource !== this.scene.defaultMaterial &&
                       this.getResourceReferenceCount(resource) === 0;
            },
            dispose: (resource) => {
                // Dispose associated textures if they're not shared
                if (resource.diffuseTexture) {
                    this.scheduleResourceDisposal(resource.diffuseTexture, 'texture');
                }
                if (resource.normalTexture) {
                    this.scheduleResourceDisposal(resource.normalTexture, 'texture');
                }
                if (resource.specularTexture) {
                    this.scheduleResourceDisposal(resource.specularTexture, 'texture');
                }
                resource.dispose();
            },
            estimateSize: (resource) => 1024 // Materials are relatively small
        });
        
        // Animation cleanup strategy
        this.cleanupStrategies.set('animation', {
            priority: 4,
            canDispose: (resource) => {
                return resource && !resource.isDisposed &&
                       this.getResourceReferenceCount(resource) === 0;
            },
            dispose: (resource) => {
                if (resource.stop) resource.stop();
                if (resource.dispose) resource.dispose();
            },
            estimateSize: (resource) => 2048 // Animation data estimate
        });
        
        // Particle system cleanup strategy
        this.cleanupStrategies.set('particleSystem', {
            priority: 5,
            canDispose: (resource) => {
                return resource && !resource.isDisposed &&
                       this.getResourceReferenceCount(resource) === 0;
            },
            dispose: (resource) => {
                resource.stop();
                resource.dispose();
            },
            estimateSize: (resource) => resource.getCapacity?.() * 64 || 4096
        });
    }

    /**
     * Start the cleanup system
     */
    start() {
        if (this.isActive) {
            return;
        }
        
        console.log('Starting ResourceCleanupSystem...');
        this.isActive = true;
        
        // Start cleanup timer
        this.cleanupTimer = setInterval(() => {
            this.performCleanupCycle();
        }, this.cleanupInterval);
        
        // Perform initial cleanup
        this.performCleanupCycle();
    }

    /**
     * Stop the cleanup system
     */
    stop() {
        if (!this.isActive) {
            return;
        }
        
        console.log('Stopping ResourceCleanupSystem...');
        this.isActive = false;
        
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Register a resource for tracking and cleanup
     */
    registerResource(resource, type, metadata = {}) {
        if (!resource || !type) {
            console.warn('Invalid resource or type provided for registration');
            return null;
        }
        
        const resourceId = this.generateResourceId();
        const currentTime = performance.now();
        
        const resourceInfo = {
            id: resourceId,
            resource,
            type,
            metadata,
            registeredAt: currentTime,
            lastAccessed: currentTime,
            accessCount: 0,
            referenceCount: 0,
            size: this.estimateResourceSize(resource, type),
            disposed: false
        };
        
        this.resourceRegistry.set(resourceId, resourceInfo);
        this.resourceLifecycles.set(resourceId, {
            created: currentTime,
            firstAccess: null,
            lastAccess: currentTime,
            disposed: null
        });
        
        this.stats.resourcesTracked++;
        
        // Check for potential leaks
        this.checkForResourceLeaks(type);
        
        return resourceId;
    }

    /**
     * Unregister a resource from tracking
     */
    unregisterResource(resourceId) {
        const resourceInfo = this.resourceRegistry.get(resourceId);
        if (!resourceInfo) {
            return false;
        }
        
        // Update lifecycle
        const lifecycle = this.resourceLifecycles.get(resourceId);
        if (lifecycle) {
            lifecycle.disposed = performance.now();
            const lifetime = lifecycle.disposed - lifecycle.created;
            this.updateAverageLifetime(lifetime);
        }
        
        // Remove from tracking
        this.resourceRegistry.delete(resourceId);
        this.resourceLifecycles.delete(resourceId);
        this.disposalQueue.delete(resourceId);
        
        return true;
    }

    /**
     * Add reference to a resource
     */
    addReference(resourceId) {
        const resourceInfo = this.resourceRegistry.get(resourceId);
        if (!resourceInfo) {
            return false;
        }
        
        resourceInfo.referenceCount++;
        resourceInfo.lastAccessed = performance.now();
        resourceInfo.accessCount++;
        
        // Update lifecycle tracking
        const lifecycle = this.resourceLifecycles.get(resourceId);
        if (lifecycle) {
            if (!lifecycle.firstAccess) {
                lifecycle.firstAccess = performance.now();
            }
            lifecycle.lastAccess = performance.now();
        }
        
        return true;
    }

    /**
     * Remove reference from a resource
     */
    removeReference(resourceId) {
        const resourceInfo = this.resourceRegistry.get(resourceId);
        if (!resourceInfo) {
            return false;
        }
        
        resourceInfo.referenceCount = Math.max(0, resourceInfo.referenceCount - 1);
        
        // Schedule for disposal if no references
        if (resourceInfo.referenceCount === 0) {
            this.scheduleResourceDisposal(resourceInfo.resource, resourceInfo.type, 5000); // 5 second delay
        }
        
        return true;
    }

    /**
     * Schedule a resource for disposal
     */
    scheduleResourceDisposal(resource, type, delay = 0) {
        // Find resource ID
        let resourceId = null;
        for (const [id, info] of this.resourceRegistry) {
            if (info.resource === resource) {
                resourceId = id;
                break;
            }
        }
        
        if (!resourceId) {
            // Resource not tracked, dispose immediately if possible
            this.disposeResourceDirect(resource, type);
            return;
        }
        
        const disposalTime = performance.now() + delay;
        this.disposalQueue.set(resourceId, {
            scheduledAt: performance.now(),
            disposeAt: disposalTime,
            type,
            priority: this.getDisposalPriority(resource, type)
        });
    }

    /**
     * Perform a cleanup cycle
     */
    performCleanupCycle() {
        const startTime = performance.now();
        let disposedCount = 0;
        let memoryReclaimed = 0;
        
        // Process disposal queue
        const currentTime = performance.now();
        const toDispose = [];
        
        for (const [resourceId, disposalInfo] of this.disposalQueue) {
            if (currentTime >= disposalInfo.disposeAt) {
                const resourceInfo = this.resourceRegistry.get(resourceId);
                if (resourceInfo && !resourceInfo.disposed) {
                    toDispose.push({ resourceId, resourceInfo, disposalInfo });
                }
            }
        }
        
        // Sort by priority (higher priority first)
        toDispose.sort((a, b) => b.disposalInfo.priority - a.disposalInfo.priority);
        
        // Dispose resources
        for (const { resourceId, resourceInfo, disposalInfo } of toDispose) {
            try {
                if (this.canDisposeResource(resourceInfo.resource, resourceInfo.type)) {
                    this.disposeResource(resourceInfo.resource, resourceInfo.type);
                    memoryReclaimed += resourceInfo.size;
                    disposedCount++;
                    
                    // Mark as disposed
                    resourceInfo.disposed = true;
                    this.disposalQueue.delete(resourceId);
                    
                    // Update lifecycle
                    const lifecycle = this.resourceLifecycles.get(resourceId);
                    if (lifecycle) {
                        lifecycle.disposed = currentTime;
                    }
                }
            } catch (error) {
                console.error(`Error disposing resource ${resourceId}:`, error);
                this.disposalQueue.delete(resourceId); // Remove from queue to prevent retry
            }
        }
        
        // Check for aged resources
        this.cleanupAgedResources();
        
        // Update statistics
        this.stats.resourcesDisposed += disposedCount;
        this.stats.cleanupCycles++;
        this.stats.memoryReclaimed += memoryReclaimed;
        
        const duration = performance.now() - startTime;
        
        if (disposedCount > 0) {
            console.log(`Cleanup cycle: ${disposedCount} resources disposed, ` +
                       `${this.formatBytes(memoryReclaimed)} reclaimed in ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * Clean up aged resources that haven't been accessed recently
     */
    cleanupAgedResources() {
        const currentTime = performance.now();
        const maxAge = this.config.maxResourceAge;
        
        for (const [resourceId, resourceInfo] of this.resourceRegistry) {
            if (resourceInfo.disposed) continue;
            
            const age = currentTime - resourceInfo.lastAccessed;
            const hasNoReferences = resourceInfo.referenceCount === 0;
            
            if (hasNoReferences && age > maxAge) {
                this.scheduleResourceDisposal(resourceInfo.resource, resourceInfo.type);
            }
        }
    }

    /**
     * Check for potential resource leaks
     */
    checkForResourceLeaks(type) {
        const resourcesOfType = Array.from(this.resourceRegistry.values())
            .filter(info => info.type === type && !info.disposed);
        
        if (resourcesOfType.length > this.config.leakDetectionThreshold) {
            console.warn(`Potential memory leak detected: ${resourcesOfType.length} ${type} resources tracked`);
            this.stats.leaksDetected++;
            
            // Store leak information
            this.leakDetector.set(type, {
                count: resourcesOfType.length,
                detectedAt: performance.now(),
                resources: resourcesOfType.slice(0, 10) // Store first 10 for analysis
            });
        }
    }

    /**
     * Get resource reference count
     */
    getResourceReferenceCount(resource) {
        for (const resourceInfo of this.resourceRegistry.values()) {
            if (resourceInfo.resource === resource) {
                return resourceInfo.referenceCount;
            }
        }
        return 0;
    }

    /**
     * Check if a resource can be disposed
     */
    canDisposeResource(resource, type) {
        const strategy = this.cleanupStrategies.get(type);
        if (strategy && strategy.canDispose) {
            return strategy.canDispose(resource);
        }
        
        // Default check
        return resource && 
               (!resource.isDisposed || !resource.isDisposed()) &&
               this.getResourceReferenceCount(resource) === 0;
    }

    /**
     * Dispose a resource using the appropriate strategy
     */
    disposeResource(resource, type) {
        const strategy = this.cleanupStrategies.get(type);
        if (strategy && strategy.dispose) {
            strategy.dispose(resource);
        } else {
            this.disposeResourceDirect(resource, type);
        }
    }

    /**
     * Direct resource disposal fallback
     */
    disposeResourceDirect(resource, type) {
        if (!resource) return;
        
        try {
            if (resource.dispose && typeof resource.dispose === 'function') {
                resource.dispose();
            } else if (resource.stop && typeof resource.stop === 'function') {
                resource.stop();
            }
        } catch (error) {
            console.error(`Error in direct disposal of ${type} resource:`, error);
        }
    }

    /**
     * Estimate resource size
     */
    estimateResourceSize(resource, type) {
        const strategy = this.cleanupStrategies.get(type);
        if (strategy && strategy.estimateSize) {
            return strategy.estimateSize(resource);
        }
        
        // Default size estimates
        switch (type) {
            case 'mesh': return 8192;
            case 'texture': return 16384;
            case 'material': return 1024;
            case 'animation': return 2048;
            default: return 512;
        }
    }

    /**
     * Get disposal priority for a resource
     */
    getDisposalPriority(resource, type) {
        const strategy = this.cleanupStrategies.get(type);
        let basePriority = strategy ? strategy.priority : 10;
        
        // Increase priority for large resources
        const size = this.estimateResourceSize(resource, type);
        if (size > this.config.resourceSizeThreshold) {
            basePriority += 5;
        }
        
        // Increase priority based on age
        const resourceInfo = this.findResourceInfo(resource);
        if (resourceInfo) {
            const age = performance.now() - resourceInfo.lastAccessed;
            if (age > this.config.maxResourceAge) {
                basePriority += 3;
            }
        }
        
        return basePriority;
    }

    /**
     * Find resource info by resource reference
     */
    findResourceInfo(resource) {
        for (const resourceInfo of this.resourceRegistry.values()) {
            if (resourceInfo.resource === resource) {
                return resourceInfo;
            }
        }
        return null;
    }

    /**
     * Trigger aggressive cleanup mode
     */
    triggerAggressiveCleanup() {
        console.log('Triggering aggressive resource cleanup...');
        
        const resourcesToDispose = [];
        
        // Find all unreferenced resources
        for (const [resourceId, resourceInfo] of this.resourceRegistry) {
            if (!resourceInfo.disposed && resourceInfo.referenceCount === 0) {
                resourcesToDispose.push({ resourceId, resourceInfo });
            }
        }
        
        // Sort by size (largest first) and age (oldest first)
        resourcesToDispose.sort((a, b) => {
            const sizeDiff = b.resourceInfo.size - a.resourceInfo.size;
            if (sizeDiff !== 0) return sizeDiff;
            
            const ageDiff = a.resourceInfo.lastAccessed - b.resourceInfo.lastAccessed;
            return ageDiff;
        });
        
        // Dispose resources
        let disposedCount = 0;
        let memoryReclaimed = 0;
        
        for (const { resourceId, resourceInfo } of resourcesToDispose) {
            try {
                if (this.canDisposeResource(resourceInfo.resource, resourceInfo.type)) {
                    this.disposeResource(resourceInfo.resource, resourceInfo.type);
                    memoryReclaimed += resourceInfo.size;
                    disposedCount++;
                    
                    resourceInfo.disposed = true;
                    this.disposalQueue.delete(resourceId);
                }
            } catch (error) {
                console.error(`Aggressive cleanup error for resource ${resourceId}:`, error);
            }
        }
        
        console.log(`Aggressive cleanup completed: ${disposedCount} resources disposed, ` +
                   `${this.formatBytes(memoryReclaimed)} reclaimed`);
    }

    /**
     * Get cleanup statistics
     */
    getStatistics() {
        const resourcesByType = {};
        const disposalQueueByType = {};
        
        // Count resources by type
        for (const resourceInfo of this.resourceRegistry.values()) {
            const type = resourceInfo.type;
            if (!resourcesByType[type]) {
                resourcesByType[type] = { active: 0, disposed: 0, totalSize: 0 };
            }
            
            if (resourceInfo.disposed) {
                resourcesByType[type].disposed++;
            } else {
                resourcesByType[type].active++;
                resourcesByType[type].totalSize += resourceInfo.size;
            }
        }
        
        // Count disposal queue by type
        for (const [resourceId, disposalInfo] of this.disposalQueue) {
            const type = disposalInfo.type;
            disposalQueueByType[type] = (disposalQueueByType[type] || 0) + 1;
        }
        
        return {
            isActive: this.isActive,
            resourcesByType,
            disposalQueueByType,
            totalTracked: this.resourceRegistry.size,
            queuedForDisposal: this.disposalQueue.size,
            leakDetection: Object.fromEntries(this.leakDetector),
            ...this.stats
        };
    }

    /**
     * Update average resource lifetime
     */
    updateAverageLifetime(lifetime) {
        const currentAvg = this.stats.averageResourceLifetime;
        const count = this.stats.resourcesDisposed;
        
        if (count === 0) {
            this.stats.averageResourceLifetime = lifetime;
        } else {
            this.stats.averageResourceLifetime = ((currentAvg * (count - 1)) + lifetime) / count;
        }
    }

    /**
     * Generate unique resource ID
     */
    generateResourceId() {
        return `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
     * Set cleanup configuration
     */
    setConfiguration(config) {
        this.config = { ...this.config, ...config };
    }

    /**
     * Set cleanup interval
     */
    setCleanupInterval(intervalMs) {
        this.cleanupInterval = Math.max(5000, intervalMs);
        
        if (this.isActive) {
            this.stop();
            this.start();
        }
    }

    /**
     * Dispose of the cleanup system
     */
    dispose() {
        console.log('Disposing ResourceCleanupSystem...');
        
        this.stop();
        
        // Dispose all tracked resources
        for (const [resourceId, resourceInfo] of this.resourceRegistry) {
            if (!resourceInfo.disposed) {
                try {
                    this.disposeResource(resourceInfo.resource, resourceInfo.type);
                } catch (error) {
                    console.error(`Error disposing resource ${resourceId} during cleanup system disposal:`, error);
                }
            }
        }
        
        // Clear all data structures
        this.resourceRegistry.clear();
        this.disposalQueue.clear();
        this.leakDetector.clear();
        this.resourceLifecycles.clear();
        this.cleanupStrategies.clear();
        
        console.log('ResourceCleanupSystem disposed');
    }
}