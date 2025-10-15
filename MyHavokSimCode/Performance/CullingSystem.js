/**
 * CullingSystem - Frustum and occlusion culling optimization system
 * 
 * This class provides:
 * - Frustum culling for meshes outside camera view
 * - Basic occlusion culling for hidden objects
 * - Culling statistics tracking for performance monitoring
 * - Integration with LOD system and quality settings
 */

export class CullingSystem {
    constructor(scene, camera, qualitySettings = null) {
        this.scene = scene;
        this.camera = camera;
        this.qualitySettings = qualitySettings;
        
        // Core state
        this.initialized = false;
        this.enabled = true;
        
        // Culling configuration
        this.config = {
            // Frustum culling settings
            frustumCulling: {
                enabled: true,
                margin: 0.1, // Extra margin around frustum (10%)
                enableNearPlaneOptimization: true,
                enableFarPlaneOptimization: true
            },
            
            // Occlusion culling settings
            occlusionCulling: {
                enabled: true,
                accuracy: 0.8, // 0.1 to 1.0
                maxOccluders: 20, // Maximum number of occluder objects
                minOccluderSize: 5.0, // Minimum size to be considered an occluder
                raycastSamples: 9, // Number of raycast samples for occlusion testing
                updateFrequency: 10, // Update every N frames
                maxDistance: 200 // Maximum distance for occlusion testing
            },
            
            // Performance settings
            performance: {
                maxCullChecksPerFrame: 100, // Limit culling checks per frame
                enableBatchProcessing: true,
                batchSize: 25,
                enableSpatialOptimization: true,
                spatialGridSize: 50
            }
        };
        
        // Managed objects for culling
        this.cullingObjects = new Map(); // meshId -> CullingObjectData
        this.occluders = new Set(); // Set of mesh IDs that can occlude others
        this.spatialGrid = new Map(); // Spatial grid for optimization
        
        // Frustum planes cache
        this.frustumPlanes = [];
        this.frustumPlanesValid = false;
        this.lastCameraMatrix = null;
        
        // Occlusion testing
        this.occlusionTestQueue = [];
        this.occlusionTestIndex = 0;
        this.raycastResults = new Map(); // Cache raycast results
        
        // Performance tracking
        this.statistics = {
            totalObjects: 0,
            frustumCulled: 0,
            occlusionCulled: 0,
            visible: 0,
            frustumTests: 0,
            occlusionTests: 0,
            lastUpdateTime: 0,
            updateDuration: 0,
            spatialGridCells: 0,
            occluders: 0
        };
        
        // Update frequency control
        this.frameCounter = 0;
        this.updateFrequency = 1; // Update every frame for frustum, less for occlusion
        
        console.log('CullingSystem initialized');
    }
    
    /**
     * Initialize the culling system
     */
    async initialize() {
        if (this.initialized) {
            console.warn('CullingSystem already initialized');
            return;
        }
        
        try {
            console.log('Initializing CullingSystem...');
            
            // Apply quality settings if available
            if (this.qualitySettings) {
                this.applyQualitySettings();
            }
            
            // Set up spatial grid
            if (this.config.performance.enableSpatialOptimization) {
                this.initializeSpatialGrid();
            }
            
            // Register existing meshes
            this.registerExistingMeshes();
            
            // Set up scene observation
            this.setupSceneObservation();
            
            this.initialized = true;
            console.log('CullingSystem initialization complete');
            
        } catch (error) {
            console.error('Failed to initialize CullingSystem:', error);
            throw error;
        }
    }
    
    /**
     * Apply quality settings to culling configuration
     */
    applyQualitySettings() {
        if (!this.qualitySettings) return;
        
        const settings = this.qualitySettings.getCurrentSettings();
        if (!settings) return;
        
        const renderingSettings = settings.rendering;
        
        // Apply frustum culling settings
        this.config.frustumCulling.enabled = renderingSettings.enableFrustumCulling;
        
        // Apply occlusion culling settings
        this.config.occlusionCulling.enabled = renderingSettings.enableOcclusionCulling;
        this.config.occlusionCulling.accuracy = renderingSettings.occlusionCullingAccuracy || 0.8;
        
        // Adjust performance settings based on quality level
        const qualityLevel = settings.general.qualityLevel;
        
        if (qualityLevel < 50) {
            // Low quality - reduce culling accuracy for performance
            this.config.occlusionCulling.raycastSamples = 4;
            this.config.occlusionCulling.updateFrequency = 15;
            this.config.performance.maxCullChecksPerFrame = 50;
        } else if (qualityLevel > 80) {
            // High quality - increase culling accuracy
            this.config.occlusionCulling.raycastSamples = 16;
            this.config.occlusionCulling.updateFrequency = 5;
            this.config.performance.maxCullChecksPerFrame = 200;
        }
        
        console.log(`Culling settings applied for quality level: ${qualityLevel}`);
    }
    
    /**
     * Initialize spatial grid for optimization
     */
    initializeSpatialGrid() {
        this.spatialGrid.clear();
        
        // Calculate scene bounds
        const sceneBounds = this.calculateSceneBounds();
        
        this.spatialGridBounds = sceneBounds;
        this.spatialGridSize = this.config.performance.spatialGridSize;
        
        console.log('Spatial grid initialized with bounds:', sceneBounds);
    }
    
    /**
     * Calculate scene bounds for spatial grid
     */
    calculateSceneBounds() {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (const mesh of this.scene.meshes) {
            if (mesh.isDisposed() || !mesh.getBoundingInfo()) continue;
            
            const boundingInfo = mesh.getBoundingInfo();
            const min = boundingInfo.boundingBox.minimumWorld;
            const max = boundingInfo.boundingBox.maximumWorld;
            
            minX = Math.min(minX, min.x);
            minY = Math.min(minY, min.y);
            minZ = Math.min(minZ, min.z);
            maxX = Math.max(maxX, max.x);
            maxY = Math.max(maxY, max.y);
            maxZ = Math.max(maxZ, max.z);
        }
        
        return {
            min: new BABYLON.Vector3(minX, minY, minZ),
            max: new BABYLON.Vector3(maxX, maxY, maxZ),
            size: new BABYLON.Vector3(maxX - minX, maxY - minY, maxZ - minZ)
        };
    }
    
    /**
     * Register existing meshes for culling
     */
    registerExistingMeshes() {
        for (const mesh of this.scene.meshes) {
            if (this.shouldCullMesh(mesh)) {
                this.registerMesh(mesh);
            }
        }
    }
    
    /**
     * Set up scene observation for automatic mesh registration
     */
    setupSceneObservation() {
        // Listen for new meshes being added
        this.scene.onNewMeshAddedObservable.add((mesh) => {
            if (this.shouldCullMesh(mesh)) {
                this.registerMesh(mesh);
            }
        });
        
        // Listen for meshes being removed
        this.scene.onMeshRemovedObservable.add((mesh) => {
            this.unregisterMesh(mesh);
        });
    }
    
    /**
     * Determine if a mesh should be managed by culling system
     */
    shouldCullMesh(mesh) {
        // Skip if mesh is already disposed
        if (mesh.isDisposed()) return false;
        
        // Skip system meshes (skybox, ground plane, etc.)
        if (mesh.name.startsWith('__')) return false;
        
        // Skip if mesh has culling disabled in metadata
        if (mesh.metadata && mesh.metadata.disableCulling) return false;
        
        // Skip very small meshes (likely UI or effects)
        const boundingInfo = mesh.getBoundingInfo();
        if (boundingInfo) {
            const size = boundingInfo.boundingBox.extendSize;
            const maxSize = Math.max(size.x, size.y, size.z);
            if (maxSize < 0.5) return false;
        }
        
        // Skip transparent or always-visible meshes
        if (mesh.material && mesh.material.alpha < 1.0 && mesh.material.alpha > 0.0) {
            // Transparent meshes might need special handling
            return false;
        }
        
        return true;
    }
    
    /**
     * Register a mesh for culling
     */
    registerMesh(mesh, isOccluder = null) {
        if (!mesh || mesh.isDisposed()) return false;
        
        const meshId = mesh.uniqueId;
        
        // Skip if already registered
        if (this.cullingObjects.has(meshId)) {
            return false;
        }
        
        // Determine if mesh can be an occluder
        if (isOccluder === null) {
            isOccluder = this.canBeOccluder(mesh);
        }
        
        // Create culling object data
        const cullingData = {
            mesh: mesh,
            meshId: meshId,
            isOccluder: isOccluder,
            isFrustumCulled: false,
            isOcclusionCulled: false,
            isVisible: true,
            lastFrustumTest: 0,
            lastOcclusionTest: 0,
            boundingInfo: mesh.getBoundingInfo(),
            spatialGridCell: null,
            occlusionTestPriority: 0
        };
        
        // Add to spatial grid
        if (this.config.performance.enableSpatialOptimization) {
            this.addToSpatialGrid(cullingData);
        }
        
        // Register the mesh
        this.cullingObjects.set(meshId, cullingData);
        
        // Add to occluders if applicable
        if (isOccluder) {
            this.occluders.add(meshId);
            this.statistics.occluders++;
        }
        
        this.statistics.totalObjects++;
        
        console.log(`Registered mesh for culling: ${mesh.name} (occluder: ${isOccluder})`);
        return true;
    }
    
    /**
     * Determine if a mesh can be an occluder
     */
    canBeOccluder(mesh) {
        const boundingInfo = mesh.getBoundingInfo();
        if (!boundingInfo) return false;
        
        // Check size - must be large enough to occlude other objects
        const size = boundingInfo.boundingBox.extendSize;
        const maxSize = Math.max(size.x, size.y, size.z);
        
        if (maxSize < this.config.occlusionCulling.minOccluderSize) {
            return false;
        }
        
        // Check if mesh is solid (not transparent)
        if (mesh.material && mesh.material.alpha < 0.9) {
            return false;
        }
        
        // Check mesh name patterns for likely occluders
        const name = mesh.name.toLowerCase();
        if (name.includes('building') || name.includes('wall') || name.includes('terrain')) {
            return true;
        }
        
        // Large meshes are likely occluders
        return maxSize > this.config.occlusionCulling.minOccluderSize * 2;
    }
    
    /**
     * Add mesh to spatial grid
     */
    addToSpatialGrid(cullingData) {
        if (!this.spatialGridBounds) return;
        
        const mesh = cullingData.mesh;
        const boundingInfo = mesh.getBoundingInfo();
        if (!boundingInfo) return;
        
        const center = boundingInfo.boundingBox.centerWorld;
        
        // Calculate grid coordinates
        const gridX = Math.floor((center.x - this.spatialGridBounds.min.x) / this.spatialGridSize);
        const gridY = Math.floor((center.y - this.spatialGridBounds.min.y) / this.spatialGridSize);
        const gridZ = Math.floor((center.z - this.spatialGridBounds.min.z) / this.spatialGridSize);
        
        const cellKey = `${gridX},${gridY},${gridZ}`;
        
        if (!this.spatialGrid.has(cellKey)) {
            this.spatialGrid.set(cellKey, new Set());
        }
        
        this.spatialGrid.get(cellKey).add(cullingData.meshId);
        cullingData.spatialGridCell = cellKey;
    }
    
    /**
     * Remove mesh from spatial grid
     */
    removeFromSpatialGrid(cullingData) {
        if (!cullingData.spatialGridCell) return;
        
        const cell = this.spatialGrid.get(cullingData.spatialGridCell);
        if (cell) {
            cell.delete(cullingData.meshId);
            if (cell.size === 0) {
                this.spatialGrid.delete(cullingData.spatialGridCell);
            }
        }
    }
    
    /**
     * Unregister a mesh from culling
     */
    unregisterMesh(mesh) {
        if (!mesh) return false;
        
        const meshId = mesh.uniqueId;
        const cullingData = this.cullingObjects.get(meshId);
        
        if (!cullingData) return false;
        
        // Remove from spatial grid
        if (this.config.performance.enableSpatialOptimization) {
            this.removeFromSpatialGrid(cullingData);
        }
        
        // Remove from occluders
        if (cullingData.isOccluder) {
            this.occluders.delete(meshId);
            this.statistics.occluders--;
        }
        
        // Remove from culling objects
        this.cullingObjects.delete(meshId);
        this.statistics.totalObjects--;
        
        console.log(`Unregistered mesh from culling: ${mesh.name}`);
        return true;
    }
    
    /**
     * Update culling for all managed objects
     */
    updateCulling(deltaTime) {
        if (!this.initialized || !this.enabled) return;
        
        const startTime = performance.now();
        this.frameCounter++;
        
        // Update frustum planes if camera moved
        this.updateFrustumPlanes();
        
        // Reset statistics
        this.statistics.frustumCulled = 0;
        this.statistics.occlusionCulled = 0;
        this.statistics.visible = 0;
        this.statistics.frustumTests = 0;
        this.statistics.occlusionTests = 0;
        
        // Process culling in batches to maintain performance
        const objectsToProcess = Array.from(this.cullingObjects.values());
        const batchSize = this.config.performance.enableBatchProcessing ? 
            this.config.performance.batchSize : objectsToProcess.length;
        
        let processedCount = 0;
        const maxProcessCount = this.config.performance.maxCullChecksPerFrame;
        
        for (let i = 0; i < objectsToProcess.length && processedCount < maxProcessCount; i += batchSize) {
            const batch = objectsToProcess.slice(i, i + batchSize);
            
            for (const cullingData of batch) {
                if (cullingData.mesh.isDisposed()) {
                    // Clean up disposed meshes
                    this.cullingObjects.delete(cullingData.meshId);
                    this.statistics.totalObjects--;
                    continue;
                }
                
                this.updateObjectCulling(cullingData);
                processedCount++;
                
                if (processedCount >= maxProcessCount) break;
            }
        }
        
        // Update occlusion testing queue
        if (this.config.occlusionCulling.enabled) {
            this.updateOcclusionTesting();
        }
        
        // Update statistics
        this.statistics.lastUpdateTime = performance.now();
        this.statistics.updateDuration = this.statistics.lastUpdateTime - startTime;
        this.statistics.spatialGridCells = this.spatialGrid.size;
    }
    
    /**
     * Update frustum planes from camera
     */
    updateFrustumPlanes() {
        if (!this.config.frustumCulling.enabled) return;
        
        // Check if camera matrix changed
        const currentMatrix = this.camera.getViewMatrix().multiply(this.camera.getProjectionMatrix());
        
        if (this.lastCameraMatrix && currentMatrix.equals(this.lastCameraMatrix)) {
            return; // No change, frustum planes are still valid
        }
        
        this.lastCameraMatrix = currentMatrix.clone();
        this.frustumPlanes = BABYLON.Frustum.GetPlanes(currentMatrix);
        this.frustumPlanesValid = true;
    }
    
    /**
     * Update culling for a specific object
     */
    updateObjectCulling(cullingData) {
        const mesh = cullingData.mesh;
        
        // Reset culling state
        cullingData.isFrustumCulled = false;
        cullingData.isOcclusionCulled = false;
        cullingData.isVisible = true;
        
        // Perform frustum culling
        if (this.config.frustumCulling.enabled && this.frustumPlanesValid) {
            cullingData.isFrustumCulled = this.performFrustumCulling(cullingData);
            this.statistics.frustumTests++;
            
            if (cullingData.isFrustumCulled) {
                this.statistics.frustumCulled++;
                cullingData.isVisible = false;
                mesh.setEnabled(false);
                return; // No need to test occlusion if frustum culled
            }
        }
        
        // Perform occlusion culling (only if not frustum culled)
        if (this.config.occlusionCulling.enabled && !cullingData.isFrustumCulled) {
            // Add to occlusion test queue if not recently tested
            const framesSinceLastTest = this.frameCounter - cullingData.lastOcclusionTest;
            if (framesSinceLastTest >= this.config.occlusionCulling.updateFrequency) {
                this.queueOcclusionTest(cullingData);
            }
        }
        
        // Update mesh visibility
        if (cullingData.isVisible && !mesh.isEnabled()) {
            mesh.setEnabled(true);
            this.statistics.visible++;
        } else if (!cullingData.isVisible && mesh.isEnabled()) {
            mesh.setEnabled(false);
        }
        
        if (cullingData.isVisible) {
            this.statistics.visible++;
        }
    }
    
    /**
     * Perform frustum culling test
     */
    performFrustumCulling(cullingData) {
        const mesh = cullingData.mesh;
        const boundingInfo = mesh.getBoundingInfo();
        
        if (!boundingInfo) return false;
        
        // Get bounding sphere for faster initial test
        const boundingSphere = boundingInfo.boundingSphere;
        
        // Apply margin to frustum test
        const margin = this.config.frustumCulling.margin;
        const expandedRadius = boundingSphere.radius * (1 + margin);
        
        // Test against each frustum plane
        for (const plane of this.frustumPlanes) {
            const distance = BABYLON.Vector3.Dot(plane.normal, boundingSphere.centerWorld) + plane.d;
            
            if (distance < -expandedRadius) {
                return true; // Object is outside this plane
            }
        }
        
        return false; // Object is inside frustum
    }
    
    /**
     * Queue an object for occlusion testing
     */
    queueOcclusionTest(cullingData) {
        // Calculate priority based on distance and size
        const cameraPosition = this.camera.position;
        const meshPosition = cullingData.mesh.getAbsolutePosition();
        const distance = BABYLON.Vector3.Distance(cameraPosition, meshPosition);
        
        // Skip if too far away
        if (distance > this.config.occlusionCulling.maxDistance) {
            return;
        }
        
        const boundingInfo = cullingData.boundingInfo;
        const size = boundingInfo ? boundingInfo.boundingBox.extendSize.length() : 1;
        
        // Higher priority for closer, larger objects
        cullingData.occlusionTestPriority = (size / distance) * 1000;
        
        this.occlusionTestQueue.push(cullingData);
    }
    
    /**
     * Update occlusion testing
     */
    updateOcclusionTesting() {
        if (this.occlusionTestQueue.length === 0) return;
        
        // Sort queue by priority (higher priority first)
        this.occlusionTestQueue.sort((a, b) => b.occlusionTestPriority - a.occlusionTestPriority);
        
        // Process a limited number of occlusion tests per frame
        const maxTests = Math.min(5, this.occlusionTestQueue.length);
        
        for (let i = 0; i < maxTests; i++) {
            const cullingData = this.occlusionTestQueue.shift();
            
            if (cullingData.mesh.isDisposed()) continue;
            
            const isOccluded = this.performOcclusionTest(cullingData);
            cullingData.isOcclusionCulled = isOccluded;
            cullingData.lastOcclusionTest = this.frameCounter;
            
            if (isOccluded) {
                this.statistics.occlusionCulled++;
                cullingData.isVisible = false;
            }
            
            this.statistics.occlusionTests++;
        }
    }
    
    /**
     * Perform occlusion test for an object
     */
    performOcclusionTest(cullingData) {
        const mesh = cullingData.mesh;
        const cameraPosition = this.camera.position;
        const meshPosition = mesh.getAbsolutePosition();
        
        // Get potential occluders in the area
        const nearbyOccluders = this.getNearbyOccluders(cullingData);
        
        if (nearbyOccluders.length === 0) {
            return false; // No occluders nearby
        }
        
        // Perform raycast sampling
        const samples = this.config.occlusionCulling.raycastSamples;
        const boundingInfo = cullingData.boundingInfo;
        
        if (!boundingInfo) return false;
        
        let occludedSamples = 0;
        const samplePoints = this.generateSamplePoints(boundingInfo, samples);
        
        for (const samplePoint of samplePoints) {
            const direction = samplePoint.subtract(cameraPosition).normalize();
            const distance = BABYLON.Vector3.Distance(cameraPosition, samplePoint);
            
            // Create ray from camera to sample point
            const ray = new BABYLON.Ray(cameraPosition, direction);
            
            // Test against nearby occluders
            let isOccluded = false;
            
            for (const occluderMesh of nearbyOccluders) {
                const hit = ray.intersectsMesh(occluderMesh);
                
                if (hit.hit && hit.distance < distance - 0.1) { // Small epsilon for floating point errors
                    isOccluded = true;
                    break;
                }
            }
            
            if (isOccluded) {
                occludedSamples++;
            }
        }
        
        // Object is considered occluded if enough samples are blocked
        const occlusionRatio = occludedSamples / samples;
        return occlusionRatio >= this.config.occlusionCulling.accuracy;
    }
    
    /**
     * Get nearby occluders for occlusion testing
     */
    getNearbyOccluders(cullingData) {
        const nearbyOccluders = [];
        const meshPosition = cullingData.mesh.getAbsolutePosition();
        const maxDistance = this.config.occlusionCulling.maxDistance;
        
        // Use spatial grid if available
        if (this.config.performance.enableSpatialOptimization && cullingData.spatialGridCell) {
            const cellsToCheck = this.getNearbySpatialCells(cullingData.spatialGridCell);
            
            for (const cellKey of cellsToCheck) {
                const cell = this.spatialGrid.get(cellKey);
                if (!cell) continue;
                
                for (const meshId of cell) {
                    if (meshId === cullingData.meshId) continue; // Skip self
                    
                    const occluderData = this.cullingObjects.get(meshId);
                    if (!occluderData || !occluderData.isOccluder) continue;
                    
                    const occluderMesh = occluderData.mesh;
                    if (occluderMesh.isDisposed() || !occluderMesh.isEnabled()) continue;
                    
                    const occluderPosition = occluderMesh.getAbsolutePosition();
                    const distance = BABYLON.Vector3.Distance(meshPosition, occluderPosition);
                    
                    if (distance < maxDistance) {
                        nearbyOccluders.push(occluderMesh);
                        
                        if (nearbyOccluders.length >= this.config.occlusionCulling.maxOccluders) {
                            break;
                        }
                    }
                }
                
                if (nearbyOccluders.length >= this.config.occlusionCulling.maxOccluders) {
                    break;
                }
            }
        } else {
            // Fallback: check all occluders
            for (const occluderId of this.occluders) {
                if (occluderId === cullingData.meshId) continue;
                
                const occluderData = this.cullingObjects.get(occluderId);
                if (!occluderData) continue;
                
                const occluderMesh = occluderData.mesh;
                if (occluderMesh.isDisposed() || !occluderMesh.isEnabled()) continue;
                
                const occluderPosition = occluderMesh.getAbsolutePosition();
                const distance = BABYLON.Vector3.Distance(meshPosition, occluderPosition);
                
                if (distance < maxDistance) {
                    nearbyOccluders.push(occluderMesh);
                    
                    if (nearbyOccluders.length >= this.config.occlusionCulling.maxOccluders) {
                        break;
                    }
                }
            }
        }
        
        return nearbyOccluders;
    }
    
    /**
     * Get nearby spatial grid cells
     */
    getNearbySpatialCells(centerCellKey) {
        const [x, y, z] = centerCellKey.split(',').map(Number);
        const cells = [];
        
        // Check 3x3x3 grid around center cell
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const cellKey = `${x + dx},${y + dy},${z + dz}`;
                    cells.push(cellKey);
                }
            }
        }
        
        return cells;
    }
    
    /**
     * Generate sample points for occlusion testing
     */
    generateSamplePoints(boundingInfo, sampleCount) {
        const points = [];
        const center = boundingInfo.boundingBox.centerWorld;
        const extents = boundingInfo.boundingBox.extendSize;
        
        if (sampleCount === 1) {
            points.push(center);
        } else if (sampleCount === 4) {
            // Sample corners of bounding box
            points.push(center.add(new BABYLON.Vector3(extents.x, extents.y, extents.z)));
            points.push(center.add(new BABYLON.Vector3(-extents.x, extents.y, extents.z)));
            points.push(center.add(new BABYLON.Vector3(extents.x, -extents.y, extents.z)));
            points.push(center.add(new BABYLON.Vector3(-extents.x, -extents.y, extents.z)));
        } else if (sampleCount === 9) {
            // Sample center and 8 points around it
            points.push(center);
            
            const offsets = [
                new BABYLON.Vector3(extents.x, 0, 0),
                new BABYLON.Vector3(-extents.x, 0, 0),
                new BABYLON.Vector3(0, extents.y, 0),
                new BABYLON.Vector3(0, -extents.y, 0),
                new BABYLON.Vector3(0, 0, extents.z),
                new BABYLON.Vector3(0, 0, -extents.z),
                new BABYLON.Vector3(extents.x, extents.y, 0),
                new BABYLON.Vector3(-extents.x, -extents.y, 0)
            ];
            
            for (const offset of offsets) {
                points.push(center.add(offset));
            }
        } else {
            // Generate random sample points within bounding box
            points.push(center); // Always include center
            
            for (let i = 1; i < sampleCount; i++) {
                const randomOffset = new BABYLON.Vector3(
                    (Math.random() - 0.5) * 2 * extents.x,
                    (Math.random() - 0.5) * 2 * extents.y,
                    (Math.random() - 0.5) * 2 * extents.z
                );
                points.push(center.add(randomOffset));
            }
        }
        
        return points;
    }
    
    /**
     * Get culling statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            cullingObjects: this.cullingObjects.size,
            occlusionTestQueueSize: this.occlusionTestQueue.length,
            enabled: this.enabled,
            frustumCullingEnabled: this.config.frustumCulling.enabled,
            occlusionCullingEnabled: this.config.occlusionCulling.enabled
        };
    }
    
    /**
     * Enable or disable culling system
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled) {
            // Make all objects visible
            for (const cullingData of this.cullingObjects.values()) {
                if (!cullingData.mesh.isDisposed()) {
                    cullingData.mesh.setEnabled(true);
                    cullingData.isVisible = true;
                    cullingData.isFrustumCulled = false;
                    cullingData.isOcclusionCulled = false;
                }
            }
        }
        
        console.log(`Culling system ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Enable or disable frustum culling
     */
    setFrustumCullingEnabled(enabled) {
        this.config.frustumCulling.enabled = enabled;
        console.log(`Frustum culling ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Enable or disable occlusion culling
     */
    setOcclusionCullingEnabled(enabled) {
        this.config.occlusionCulling.enabled = enabled;
        
        if (!enabled) {
            // Clear occlusion test queue
            this.occlusionTestQueue = [];
            
            // Reset occlusion culling state
            for (const cullingData of this.cullingObjects.values()) {
                cullingData.isOcclusionCulled = false;
            }
        }
        
        console.log(`Occlusion culling ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Force culling update for all objects
     */
    forceUpdate() {
        this.frustumPlanesValid = false;
        this.lastCameraMatrix = null;
        this.occlusionTestQueue = [];
        this.raycastResults.clear();
        
        console.log('Forced culling update for all objects');
    }
    
    /**
     * Get culling data for a specific mesh
     */
    getCullingData(mesh) {
        return this.cullingObjects.get(mesh.uniqueId);
    }
    
    /**
     * Dispose of the culling system
     */
    dispose() {
        console.log('Disposing CullingSystem...');
        
        // Make all objects visible
        for (const cullingData of this.cullingObjects.values()) {
            if (!cullingData.mesh.isDisposed()) {
                cullingData.mesh.setEnabled(true);
            }
        }
        
        // Clear all data
        this.cullingObjects.clear();
        this.occluders.clear();
        this.spatialGrid.clear();
        this.occlusionTestQueue = [];
        this.raycastResults.clear();
        this.frustumPlanes = [];
        
        this.initialized = false;
        
        console.log('CullingSystem disposed');
    }
}