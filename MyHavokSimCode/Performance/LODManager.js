/**
 * LODManager - Level-of-Detail optimization system
 * 
 * This class provides:
 * - Distance-based LOD calculation for meshes
 * - LOD level switching with hysteresis to prevent flickering
 * - LOD configuration per mesh type (agents, buildings, terrain)
 * - Integration with quality settings and performance monitoring
 */

export class LODManager {
    constructor(scene, camera, qualitySettings = null) {
        this.scene = scene;
        this.camera = camera;
        this.qualitySettings = qualitySettings;
        
        // Core state
        this.initialized = false;
        this.enabled = true;
        
        // LOD configuration per mesh type
        this.lodConfigs = new Map();
        this.setupDefaultLODConfigs();
        
        // Registered meshes for LOD management
        this.managedMeshes = new Map(); // meshId -> LODMeshData
        this.meshGroups = new Map(); // groupName -> Set of meshIds
        
        // Performance tracking
        this.statistics = {
            totalMeshes: 0,
            lodLevel0: 0, // Highest detail
            lodLevel1: 0, // Medium detail
            lodLevel2: 0, // Low detail
            lodLevel3: 0, // Lowest detail/culled
            lastUpdateTime: 0,
            updateDuration: 0,
            meshesProcessed: 0
        };
        
        // Update frequency control
        this.updateInterval = 100; // Update every 100ms
        this.lastUpdateTime = 0;
        this.frameCounter = 0;
        this.updateFrequency = 6; // Update every 6 frames at 60fps
        
        // Hysteresis settings to prevent flickering
        this.hysteresis = {
            enabled: true,
            factor: 0.1, // 10% hysteresis
            minDistance: 5 // Minimum distance change to trigger LOD switch
        };
        
        // Distance calculation cache
        this.distanceCache = new Map();
        this.cacheValidFrames = 3; // Cache distances for 3 frames
        
        console.log('LODManager initialized');
    }
    
    /**
     * Setup default LOD configurations for different mesh types
     */
    setupDefaultLODConfigs() {
        // Agent LOD configuration
        this.lodConfigs.set('agent', {
            distances: [25, 75, 150, 300], // LOD switch distances
            hysteresis: 0.15, // 15% hysteresis for agents
            enableCulling: true,
            cullDistance: 300,
            lodLevels: [
                { // LOD 0 - Highest detail
                    geometryComplexity: 1.0,
                    textureResolution: 1.0,
                    animationQuality: 1.0,
                    enableShadows: true,
                    enableReflections: true
                },
                { // LOD 1 - Medium detail
                    geometryComplexity: 0.7,
                    textureResolution: 0.8,
                    animationQuality: 0.8,
                    enableShadows: true,
                    enableReflections: false
                },
                { // LOD 2 - Low detail
                    geometryComplexity: 0.4,
                    textureResolution: 0.5,
                    animationQuality: 0.5,
                    enableShadows: false,
                    enableReflections: false
                },
                { // LOD 3 - Lowest detail/billboard
                    geometryComplexity: 0.1,
                    textureResolution: 0.25,
                    animationQuality: 0.2,
                    enableShadows: false,
                    enableReflections: false
                }
            ]
        });
        
        // Building LOD configuration
        this.lodConfigs.set('building', {
            distances: [50, 150, 300, 500],
            hysteresis: 0.1,
            enableCulling: true,
            cullDistance: 500,
            lodLevels: [
                { // LOD 0 - Full detail
                    geometryComplexity: 1.0,
                    textureResolution: 1.0,
                    enableShadows: true,
                    enableReflections: true,
                    showDetails: true
                },
                { // LOD 1 - Reduced detail
                    geometryComplexity: 0.6,
                    textureResolution: 0.8,
                    enableShadows: true,
                    enableReflections: false,
                    showDetails: true
                },
                { // LOD 2 - Simple geometry
                    geometryComplexity: 0.3,
                    textureResolution: 0.5,
                    enableShadows: false,
                    enableReflections: false,
                    showDetails: false
                },
                { // LOD 3 - Box representation
                    geometryComplexity: 0.1,
                    textureResolution: 0.25,
                    enableShadows: false,
                    enableReflections: false,
                    showDetails: false
                }
            ]
        });
        
        // Terrain LOD configuration
        this.lodConfigs.set('terrain', {
            distances: [100, 250, 500, 1000],
            hysteresis: 0.05,
            enableCulling: false, // Terrain usually shouldn't be culled
            cullDistance: 1000,
            lodLevels: [
                { // LOD 0 - Full tessellation
                    geometryComplexity: 1.0,
                    textureResolution: 1.0,
                    tessellationLevel: 4,
                    enableShadows: true
                },
                { // LOD 1 - Reduced tessellation
                    geometryComplexity: 0.7,
                    textureResolution: 0.8,
                    tessellationLevel: 3,
                    enableShadows: true
                },
                { // LOD 2 - Low tessellation
                    geometryComplexity: 0.4,
                    textureResolution: 0.6,
                    tessellationLevel: 2,
                    enableShadows: false
                },
                { // LOD 3 - Minimal tessellation
                    geometryComplexity: 0.2,
                    textureResolution: 0.4,
                    tessellationLevel: 1,
                    enableShadows: false
                }
            ]
        });
        
        // Vegetation LOD configuration
        this.lodConfigs.set('vegetation', {
            distances: [30, 100, 200, 400],
            hysteresis: 0.2, // Higher hysteresis for vegetation to reduce pop-in
            enableCulling: true,
            cullDistance: 400,
            lodLevels: [
                { // LOD 0 - Full 3D model
                    geometryComplexity: 1.0,
                    textureResolution: 1.0,
                    enableShadows: true,
                    useBillboard: false
                },
                { // LOD 1 - Simplified 3D
                    geometryComplexity: 0.5,
                    textureResolution: 0.8,
                    enableShadows: true,
                    useBillboard: false
                },
                { // LOD 2 - Cross-quad billboard
                    geometryComplexity: 0.2,
                    textureResolution: 0.6,
                    enableShadows: false,
                    useBillboard: true,
                    billboardType: 'cross'
                },
                { // LOD 3 - Simple billboard
                    geometryComplexity: 0.1,
                    textureResolution: 0.4,
                    enableShadows: false,
                    useBillboard: true,
                    billboardType: 'simple'
                }
            ]
        });
        
        // Default/generic LOD configuration
        this.lodConfigs.set('default', {
            distances: [50, 150, 300, 500],
            hysteresis: 0.1,
            enableCulling: true,
            cullDistance: 500,
            lodLevels: [
                { geometryComplexity: 1.0, textureResolution: 1.0, enableShadows: true },
                { geometryComplexity: 0.7, textureResolution: 0.8, enableShadows: true },
                { geometryComplexity: 0.4, textureResolution: 0.6, enableShadows: false },
                { geometryComplexity: 0.2, textureResolution: 0.4, enableShadows: false }
            ]
        });
    }
    
    /**
     * Initialize the LOD manager
     */
    async initialize() {
        if (this.initialized) {
            console.warn('LODManager already initialized');
            return;
        }
        
        try {
            console.log('Initializing LODManager...');
            
            // Apply quality settings if available
            if (this.qualitySettings) {
                this.applyQualitySettings();
            }
            
            // Set up scene observation for automatic mesh registration
            this.setupSceneObservation();
            
            this.initialized = true;
            console.log('LODManager initialization complete');
            
        } catch (error) {
            console.error('Failed to initialize LODManager:', error);
            throw error;
        }
    }
    
    /**
     * Apply quality settings to LOD configuration
     */
    applyQualitySettings() {
        if (!this.qualitySettings) return;
        
        const settings = this.qualitySettings.getCurrentSettings();
        if (!settings) return;
        
        const renderingSettings = settings.rendering;
        
        // Adjust LOD distances based on quality settings
        const lodDistanceMultiplier = renderingSettings.lodDistance / 150; // 150 is default
        const lodBias = renderingSettings.lodBias || 0;
        
        // Apply distance multiplier and bias to all LOD configs
        for (const [type, config] of this.lodConfigs) {
            // Adjust distances
            config.distances = config.distances.map(distance => {
                let adjustedDistance = distance * lodDistanceMultiplier;
                
                // Apply LOD bias (negative bias = higher detail at distance)
                if (lodBias !== 0) {
                    const biasMultiplier = Math.pow(2, -lodBias);
                    adjustedDistance *= biasMultiplier;
                }
                
                return Math.max(5, adjustedDistance); // Minimum distance of 5
            });
            
            // Adjust cull distance
            if (config.enableCulling) {
                config.cullDistance *= lodDistanceMultiplier;
            }
        }
        
        // Update hysteresis settings
        this.hysteresis.enabled = renderingSettings.enableLOD;
        
        // Adjust update frequency based on performance settings
        const qualityLevel = settings.general.qualityLevel;
        if (qualityLevel < 50) {
            this.updateFrequency = 10; // Update less frequently for low quality
        } else if (qualityLevel > 80) {
            this.updateFrequency = 3; // Update more frequently for high quality
        }
        
        console.log(`LOD settings applied: distance multiplier ${lodDistanceMultiplier.toFixed(2)}, bias ${lodBias}`);
    }
    
    /**
     * Setup scene observation for automatic mesh registration
     */
    setupSceneObservation() {
        // Register existing meshes
        this.scene.meshes.forEach(mesh => {
            if (this.shouldManageMesh(mesh)) {
                this.registerMesh(mesh);
            }
        });
        
        // Listen for new meshes being added
        this.scene.onNewMeshAddedObservable.add((mesh) => {
            if (this.shouldManageMesh(mesh)) {
                this.registerMesh(mesh);
            }
        });
        
        // Listen for meshes being removed
        this.scene.onMeshRemovedObservable.add((mesh) => {
            this.unregisterMesh(mesh);
        });
    }
    
    /**
     * Determine if a mesh should be managed by LOD system
     */
    shouldManageMesh(mesh) {
        // Skip if mesh is already disposed
        if (mesh.isDisposed()) return false;
        
        // Skip system meshes (skybox, ground plane, etc.)
        if (mesh.name.startsWith('__')) return false;
        
        // Skip if mesh has LOD disabled in metadata
        if (mesh.metadata && mesh.metadata.disableLOD) return false;
        
        // Skip very small meshes (likely UI or effects)
        const boundingInfo = mesh.getBoundingInfo();
        if (boundingInfo) {
            const size = boundingInfo.boundingBox.extendSize;
            const maxSize = Math.max(size.x, size.y, size.z);
            if (maxSize < 0.5) return false; // Skip meshes smaller than 0.5 units
        }
        
        return true;
    }
    
    /**
     * Register a mesh for LOD management
     */
    registerMesh(mesh, meshType = null, groupName = null) {
        if (!mesh || mesh.isDisposed()) return false;
        
        const meshId = mesh.uniqueId;
        
        // Skip if already registered
        if (this.managedMeshes.has(meshId)) {
            return false;
        }
        
        // Determine mesh type if not provided
        if (!meshType) {
            meshType = this.determineMeshType(mesh);
        }
        
        // Get LOD configuration for this mesh type
        const lodConfig = this.lodConfigs.get(meshType) || this.lodConfigs.get('default');
        
        // Create LOD mesh data
        const lodMeshData = {
            mesh: mesh,
            meshType: meshType,
            groupName: groupName,
            lodConfig: lodConfig,
            currentLODLevel: 0,
            lastDistance: 0,
            lastLODLevel: 0,
            framesSinceUpdate: 0,
            originalGeometry: null,
            lodGeometries: new Map(),
            originalMaterials: null,
            lodMaterials: new Map(),
            isVisible: true,
            isCulled: false
        };
        
        // Store original geometry and materials for LOD switching
        this.storeOriginalMeshData(lodMeshData);
        
        // Register the mesh
        this.managedMeshes.set(meshId, lodMeshData);
        
        // Add to group if specified
        if (groupName) {
            if (!this.meshGroups.has(groupName)) {
                this.meshGroups.set(groupName, new Set());
            }
            this.meshGroups.get(groupName).add(meshId);
        }
        
        this.statistics.totalMeshes++;
        
        console.log(`Registered mesh for LOD: ${mesh.name} (type: ${meshType}, group: ${groupName || 'none'})`);
        return true;
    }
    
    /**
     * Determine mesh type based on mesh properties
     */
    determineMeshType(mesh) {
        const name = mesh.name.toLowerCase();
        const metadata = mesh.metadata || {};
        
        // Check metadata first
        if (metadata.lodType) {
            return metadata.lodType;
        }
        
        // Determine by name patterns
        if (name.includes('agent') || name.includes('character') || name.includes('npc')) {
            return 'agent';
        }
        
        if (name.includes('building') || name.includes('house') || name.includes('structure')) {
            return 'building';
        }
        
        if (name.includes('terrain') || name.includes('ground') || name.includes('landscape')) {
            return 'terrain';
        }
        
        if (name.includes('tree') || name.includes('plant') || name.includes('grass') || name.includes('vegetation')) {
            return 'vegetation';
        }
        
        // Check mesh properties
        const boundingInfo = mesh.getBoundingInfo();
        if (boundingInfo) {
            const size = boundingInfo.boundingBox.extendSize;
            const maxSize = Math.max(size.x, size.y, size.z);
            
            // Large meshes are likely terrain or buildings
            if (maxSize > 50) {
                return name.includes('terrain') ? 'terrain' : 'building';
            }
            
            // Medium meshes could be agents or vegetation
            if (maxSize > 5) {
                return name.includes('tree') || name.includes('plant') ? 'vegetation' : 'agent';
            }
        }
        
        return 'default';
    }
    
    /**
     * Store original mesh data for LOD switching
     */
    storeOriginalMeshData(lodMeshData) {
        const mesh = lodMeshData.mesh;
        
        // Store original geometry
        if (mesh.geometry) {
            lodMeshData.originalGeometry = {
                vertices: mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind),
                indices: mesh.getIndices(),
                normals: mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind),
                uvs: mesh.getVerticesData(BABYLON.VertexBuffer.UVKind)
            };
        }
        
        // Store original materials
        if (mesh.material) {
            lodMeshData.originalMaterials = mesh.material;
        }
    }
    
    /**
     * Unregister a mesh from LOD management
     */
    unregisterMesh(mesh) {
        if (!mesh) return false;
        
        const meshId = mesh.uniqueId;
        const lodMeshData = this.managedMeshes.get(meshId);
        
        if (!lodMeshData) return false;
        
        // Remove from group
        if (lodMeshData.groupName) {
            const group = this.meshGroups.get(lodMeshData.groupName);
            if (group) {
                group.delete(meshId);
                if (group.size === 0) {
                    this.meshGroups.delete(lodMeshData.groupName);
                }
            }
        }
        
        // Clean up LOD data
        lodMeshData.lodGeometries.clear();
        lodMeshData.lodMaterials.clear();
        
        // Remove from managed meshes
        this.managedMeshes.delete(meshId);
        this.statistics.totalMeshes--;
        
        console.log(`Unregistered mesh from LOD: ${mesh.name}`);
        return true;
    }
    
    /**
     * Update LOD for all managed meshes
     */
    updateLOD(deltaTime) {
        if (!this.initialized || !this.enabled) return;
        
        const currentTime = performance.now();
        
        // Check if it's time for update
        this.frameCounter++;
        if (this.frameCounter < this.updateFrequency) {
            return;
        }
        this.frameCounter = 0;
        
        const startTime = performance.now();
        
        // Get camera position
        const cameraPosition = this.camera.position;
        
        // Reset statistics
        this.statistics.lodLevel0 = 0;
        this.statistics.lodLevel1 = 0;
        this.statistics.lodLevel2 = 0;
        this.statistics.lodLevel3 = 0;
        this.statistics.meshesProcessed = 0;
        
        // Update LOD for each managed mesh
        for (const [meshId, lodMeshData] of this.managedMeshes) {
            if (lodMeshData.mesh.isDisposed()) {
                // Clean up disposed meshes
                this.managedMeshes.delete(meshId);
                this.statistics.totalMeshes--;
                continue;
            }
            
            this.updateMeshLOD(lodMeshData, cameraPosition);
            this.statistics.meshesProcessed++;
        }
        
        // Update statistics
        this.statistics.lastUpdateTime = currentTime;
        this.statistics.updateDuration = performance.now() - startTime;
        
        // Clear distance cache periodically
        if (this.frameCounter % (this.cacheValidFrames * this.updateFrequency) === 0) {
            this.distanceCache.clear();
        }
    }
    
    /**
     * Update LOD for a specific mesh
     */
    updateMeshLOD(lodMeshData, cameraPosition) {
        const mesh = lodMeshData.mesh;
        
        // Calculate distance to camera
        const distance = this.calculateDistance(mesh, cameraPosition);
        lodMeshData.lastDistance = distance;
        
        // Determine appropriate LOD level
        const newLODLevel = this.calculateLODLevel(lodMeshData, distance);
        
        // Apply hysteresis to prevent flickering
        const finalLODLevel = this.applyHysteresis(lodMeshData, newLODLevel, distance);
        
        // Update LOD if changed
        if (finalLODLevel !== lodMeshData.currentLODLevel) {
            this.applyLODLevel(lodMeshData, finalLODLevel);
            lodMeshData.currentLODLevel = finalLODLevel;
        }
        
        // Update statistics
        switch (finalLODLevel) {
            case 0: this.statistics.lodLevel0++; break;
            case 1: this.statistics.lodLevel1++; break;
            case 2: this.statistics.lodLevel2++; break;
            case 3: this.statistics.lodLevel3++; break;
        }
        
        lodMeshData.framesSinceUpdate = 0;
    }
    
    /**
     * Calculate distance from mesh to camera
     */
    calculateDistance(mesh, cameraPosition) {
        const meshId = mesh.uniqueId;
        
        // Check cache first
        if (this.distanceCache.has(meshId)) {
            const cached = this.distanceCache.get(meshId);
            if (cached.frame >= this.frameCounter - this.cacheValidFrames) {
                return cached.distance;
            }
        }
        
        // Calculate distance
        const meshPosition = mesh.getAbsolutePosition();
        const distance = BABYLON.Vector3.Distance(cameraPosition, meshPosition);
        
        // Cache the result
        this.distanceCache.set(meshId, {
            distance: distance,
            frame: this.frameCounter
        });
        
        return distance;
    }
    
    /**
     * Calculate appropriate LOD level based on distance
     */
    calculateLODLevel(lodMeshData, distance) {
        const config = lodMeshData.lodConfig;
        const distances = config.distances;
        
        // Check if mesh should be culled
        if (config.enableCulling && distance > config.cullDistance) {
            return 3; // Highest LOD level (culled/lowest detail)
        }
        
        // Find appropriate LOD level
        for (let i = 0; i < distances.length; i++) {
            if (distance <= distances[i]) {
                return i;
            }
        }
        
        // If beyond all distances, use highest LOD level
        return Math.min(3, distances.length - 1);
    }
    
    /**
     * Apply hysteresis to prevent LOD flickering
     */
    applyHysteresis(lodMeshData, newLODLevel, distance) {
        if (!this.hysteresis.enabled) {
            return newLODLevel;
        }
        
        const currentLODLevel = lodMeshData.currentLODLevel;
        
        // No change needed
        if (newLODLevel === currentLODLevel) {
            return currentLODLevel;
        }
        
        const config = lodMeshData.lodConfig;
        const hysteresisFactor = config.hysteresis || this.hysteresis.factor;
        
        // Calculate hysteresis threshold
        let thresholdDistance;
        
        if (newLODLevel > currentLODLevel) {
            // Moving to higher LOD (lower detail) - use current threshold + hysteresis
            thresholdDistance = config.distances[currentLODLevel] * (1 + hysteresisFactor);
        } else {
            // Moving to lower LOD (higher detail) - use new threshold - hysteresis
            thresholdDistance = config.distances[newLODLevel] * (1 - hysteresisFactor);
        }
        
        // Check if distance change is significant enough
        const distanceChange = Math.abs(distance - lodMeshData.lastDistance);
        if (distanceChange < this.hysteresis.minDistance) {
            return currentLODLevel;
        }
        
        // Apply hysteresis
        if (newLODLevel > currentLODLevel && distance > thresholdDistance) {
            return newLODLevel;
        } else if (newLODLevel < currentLODLevel && distance < thresholdDistance) {
            return newLODLevel;
        }
        
        return currentLODLevel;
    }
    
    /**
     * Apply LOD level to mesh
     */
    applyLODLevel(lodMeshData, lodLevel) {
        const mesh = lodMeshData.mesh;
        const config = lodMeshData.lodConfig;
        const lodSettings = config.lodLevels[lodLevel];
        
        if (!lodSettings) {
            console.warn(`No LOD settings for level ${lodLevel}`);
            return;
        }
        
        // Handle culling (LOD level 3 typically means culled)
        if (lodLevel >= 3 && config.enableCulling) {
            mesh.setEnabled(false);
            lodMeshData.isCulled = true;
            lodMeshData.isVisible = false;
            return;
        } else {
            if (lodMeshData.isCulled) {
                mesh.setEnabled(true);
                lodMeshData.isCulled = false;
                lodMeshData.isVisible = true;
            }
        }
        
        // Apply geometry complexity (simplified implementation)
        this.applyGeometryLOD(lodMeshData, lodSettings);
        
        // Apply material/texture LOD
        this.applyMaterialLOD(lodMeshData, lodSettings);
        
        // Apply shadow settings
        if (lodSettings.enableShadows !== undefined) {
            mesh.receiveShadows = lodSettings.enableShadows;
            if (mesh.material && mesh.material.shadowGenerator) {
                if (lodSettings.enableShadows) {
                    mesh.material.shadowGenerator.addShadowCaster(mesh);
                } else {
                    mesh.material.shadowGenerator.removeShadowCaster(mesh);
                }
            }
        }
        
        // Apply reflection settings
        if (lodSettings.enableReflections !== undefined && mesh.material) {
            // This would need to be implemented based on the specific material system
            // For now, we'll just store the setting in metadata
            if (!mesh.metadata) mesh.metadata = {};
            mesh.metadata.enableReflections = lodSettings.enableReflections;
        }
        
        console.log(`Applied LOD level ${lodLevel} to mesh: ${mesh.name}`);
    }
    
    /**
     * Apply geometry LOD settings
     */
    applyGeometryLOD(lodMeshData, lodSettings) {
        const mesh = lodMeshData.mesh;
        const complexity = lodSettings.geometryComplexity;
        
        // For now, we'll implement a simple approach using mesh scaling
        // In a full implementation, this would involve actual geometry simplification
        
        if (complexity < 1.0) {
            // Store original scale if not already stored
            if (!mesh.metadata) mesh.metadata = {};
            if (!mesh.metadata.originalScale) {
                mesh.metadata.originalScale = mesh.scaling.clone();
            }
            
            // Apply complexity as a subtle scale reduction for distant objects
            const scaleReduction = 1.0 - (1.0 - complexity) * 0.1; // Max 10% scale reduction
            const originalScale = mesh.metadata.originalScale;
            mesh.scaling = originalScale.scale(scaleReduction);
        } else {
            // Restore original scale
            if (mesh.metadata && mesh.metadata.originalScale) {
                mesh.scaling = mesh.metadata.originalScale.clone();
            }
        }
    }
    
    /**
     * Apply material/texture LOD settings
     */
    applyMaterialLOD(lodMeshData, lodSettings) {
        const mesh = lodMeshData.mesh;
        const material = mesh.material;
        
        if (!material) return;
        
        // Apply texture resolution scaling
        const textureResolution = lodSettings.textureResolution;
        
        if (textureResolution < 1.0 && material.diffuseTexture) {
            // Store original texture level if not already stored
            if (!material.metadata) material.metadata = {};
            if (material.metadata.originalTextureLevel === undefined) {
                material.metadata.originalTextureLevel = material.diffuseTexture.level || 1.0;
            }
            
            // Reduce texture detail
            const originalLevel = material.metadata.originalTextureLevel;
            material.diffuseTexture.level = originalLevel * textureResolution;
        } else if (material.diffuseTexture && material.metadata && material.metadata.originalTextureLevel !== undefined) {
            // Restore original texture level
            material.diffuseTexture.level = material.metadata.originalTextureLevel;
        }
    }
    
    /**
     * Get LOD statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            managedMeshes: this.managedMeshes.size,
            meshGroups: this.meshGroups.size,
            enabled: this.enabled,
            updateFrequency: this.updateFrequency,
            hysteresisEnabled: this.hysteresis.enabled
        };
    }
    
    /**
     * Set LOD configuration for a specific mesh type
     */
    setLODConfig(meshType, config) {
        this.lodConfigs.set(meshType, config);
        console.log(`LOD configuration updated for mesh type: ${meshType}`);
    }
    
    /**
     * Get LOD configuration for a mesh type
     */
    getLODConfig(meshType) {
        return this.lodConfigs.get(meshType) || this.lodConfigs.get('default');
    }
    
    /**
     * Enable or disable LOD system
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled) {
            // Restore all meshes to highest detail
            for (const lodMeshData of this.managedMeshes.values()) {
                this.applyLODLevel(lodMeshData, 0);
                lodMeshData.currentLODLevel = 0;
            }
        }
        
        console.log(`LOD system ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Force LOD update for all meshes
     */
    forceUpdate() {
        this.frameCounter = this.updateFrequency; // Force next update
        this.distanceCache.clear();
        console.log('Forced LOD update for all meshes');
    }
    
    /**
     * Get managed mesh data
     */
    getManagedMeshData(mesh) {
        return this.managedMeshes.get(mesh.uniqueId);
    }
    
    /**
     * Get meshes in a specific group
     */
    getMeshGroup(groupName) {
        const meshIds = this.meshGroups.get(groupName);
        if (!meshIds) return [];
        
        const meshes = [];
        for (const meshId of meshIds) {
            const lodMeshData = this.managedMeshes.get(meshId);
            if (lodMeshData && !lodMeshData.mesh.isDisposed()) {
                meshes.push(lodMeshData.mesh);
            }
        }
        
        return meshes;
    }
    
    /**
     * Dispose of the LOD manager
     */
    dispose() {
        console.log('Disposing LODManager...');
        
        // Restore all meshes to original state
        for (const lodMeshData of this.managedMeshes.values()) {
            if (!lodMeshData.mesh.isDisposed()) {
                this.applyLODLevel(lodMeshData, 0); // Restore to highest detail
            }
        }
        
        // Clear all data
        this.managedMeshes.clear();
        this.meshGroups.clear();
        this.lodConfigs.clear();
        this.distanceCache.clear();
        
        this.initialized = false;
        
        console.log('LODManager disposed');
    }
}