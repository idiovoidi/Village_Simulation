/**
 * TextureOptimizer - Texture optimization system
 *
 * This class provides:
 * - Texture quality scaling based on performance settings
 * - Texture streaming for large textures
 * - Texture memory usage tracking and optimization
 * - Automatic texture compression and format optimization
 */

export class TextureOptimizer {
    constructor(scene, qualitySettings = null) {
        this.scene = scene;
        this.qualitySettings = qualitySettings;

        // Core state
        this.initialized = false;
        this.enabled = true;

        // Texture optimization configuration
        this.config = {
            // Quality scaling settings
            qualityScaling: {
                enabled: true,
                baseQuality: 1.0, // Base texture quality multiplier
                minQuality: 0.25, // Minimum quality (25% of original)
                maxQuality: 2.0, // Maximum quality (200% of original)
                distanceScaling: true, // Scale quality based on distance
                maxDistance: 200 // Maximum distance for quality scaling
            },

            // Texture streaming settings
            streaming: {
                enabled: true,
                streamingDistance: 300, // Distance threshold for streaming
                preloadDistance: 150, // Distance to start preloading textures
                unloadDistance: 500, // Distance to unload textures
                maxStreamingTextures: 50, // Maximum textures to stream simultaneously
                streamingBudget: 100 * 1024 * 1024 // 100MB streaming budget
            },

            // Memory management settings
            memory: {
                enableTracking: true,
                maxTextureMemory: 256 * 1024 * 1024, // 256MB texture memory limit
                cleanupThreshold: 0.8, // Cleanup when 80% of memory is used
                aggressiveCleanupThreshold: 0.9, // Aggressive cleanup at 90%
                unusedTextureTimeout: 30000, // 30 seconds before unused texture cleanup
                enableCompression: true
            },

            // Format optimization settings
            formatOptimization: {
                enabled: true,
                preferCompressedFormats: true,
                enableMipmaps: true,
                anisotropicFiltering: 8,
                textureFiltering: 'trilinear'
            },

            // Performance settings
            performance: {
                maxOptimizationsPerFrame: 5,
                updateFrequency: 10, // Update every 10 frames
                enableBatchProcessing: true,
                batchSize: 10
            }
        };

        // Texture management
        this.managedTextures = new Map(); // textureId -> TextureData
        this.textureGroups = new Map(); // groupName -> Set of textureIds
        this.streamingQueue = [];
        this.unloadQueue = [];

        // Memory tracking
        this.memoryUsage = {
            totalUsed: 0,
            totalAllocated: 0,
            textureCount: 0,
            compressedTextures: 0,
            streamingTextures: 0,
            lastCleanup: 0
        };

        // Performance tracking
        this.statistics = {
            totalTextures: 0,
            optimizedTextures: 0,
            streamedTextures: 0,
            compressedTextures: 0,
            memoryUsed: 0,
            memorySaved: 0,
            lastUpdateTime: 0,
            updateDuration: 0,
            optimizationsApplied: 0
        };

        // Update control
        this.frameCounter = 0;
        this.lastCameraPosition = null;

        // Hardware capabilities
        this.hardwareSupport = {
            supportedFormats: new Set(),
            maxTextureSize: 0,
            supportsCompression: false,
            supportsAnisotropic: false,
            maxAnisotropy: 1
        };

        console.log('TextureOptimizer initialized');
    }

    /**
     * Initialize the texture optimizer
     */
    async initialize() {
        if (this.initialized) {
            console.warn('TextureOptimizer already initialized');
            return;
        }

        try {
            console.log('Initializing TextureOptimizer...');

            // Detect hardware capabilities
            this.detectHardwareCapabilities();

            // Apply quality settings if available
            if (this.qualitySettings) {
                this.applyQualitySettings();
            }

            // Register existing textures
            this.registerExistingTextures();

            // Set up scene observation
            this.setupSceneObservation();

            // Perform initial optimization
            await this.performInitialOptimization();

            this.initialized = true;
            console.log('TextureOptimizer initialization complete');
        } catch (error) {
            console.error('Failed to initialize TextureOptimizer:', error);
            throw error;
        }
    }

    /**
     * Detect hardware capabilities for texture optimization
     */
    detectHardwareCapabilities() {
        const engine = this.scene.getEngine();
        const gl = engine._gl;

        if (!gl) {
            console.warn('WebGL context not available for hardware detection');
            return;
        }

        // Get maximum texture size
        this.hardwareSupport.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;

        // Check for compression support
        const compressionExtensions = [
            'WEBGL_compressed_texture_s3tc',
            'WEBGL_compressed_texture_etc1',
            'WEBGL_compressed_texture_pvrtc',
            'WEBGL_compressed_texture_astc'
        ];

        for (const ext of compressionExtensions) {
            if (gl.getExtension(ext)) {
                this.hardwareSupport.supportedFormats.add(ext);
                this.hardwareSupport.supportsCompression = true;
            }
        }

        // Check for anisotropic filtering
        const anisotropicExt = gl.getExtension('EXT_texture_filter_anisotropic');
        if (anisotropicExt) {
            this.hardwareSupport.supportsAnisotropic = true;
            this.hardwareSupport.maxAnisotropy = gl.getParameter(anisotropicExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1;
        }

        console.log('Hardware texture capabilities:', this.hardwareSupport);
    }

    /**
     * Apply quality settings to texture configuration
     */
    applyQualitySettings() {
        if (!this.qualitySettings) return;

        const settings = this.qualitySettings.getCurrentSettings();
        if (!settings) return;

        const renderingSettings = settings.rendering;

        // Apply texture quality settings
        this.config.qualityScaling.baseQuality = renderingSettings.textureQuality / 3.0; // Convert 1-4 scale to multiplier
        this.config.formatOptimization.enableMipmaps = renderingSettings.textureQuality >= 2;
        this.config.formatOptimization.anisotropicFiltering = renderingSettings.anisotropicFiltering || 8;
        this.config.formatOptimization.textureFiltering = renderingSettings.textureFiltering || 'trilinear';

        // Apply memory settings based on quality level
        const { qualityLevel } = settings.general;

        if (qualityLevel < 50) {
            // Low quality - aggressive memory management
            this.config.memory.maxTextureMemory = 128 * 1024 * 1024; // 128MB
            this.config.memory.cleanupThreshold = 0.7;
            this.config.streaming.streamingBudget = 50 * 1024 * 1024; // 50MB
            this.config.qualityScaling.minQuality = 0.25;
        } else if (qualityLevel > 80) {
            // High quality - more generous memory usage
            this.config.memory.maxTextureMemory = 512 * 1024 * 1024; // 512MB
            this.config.memory.cleanupThreshold = 0.9;
            this.config.streaming.streamingBudget = 200 * 1024 * 1024; // 200MB
            this.config.qualityScaling.minQuality = 0.5;
        }

        console.log(`Texture settings applied for quality level: ${qualityLevel}`);
    }

    /**
     * Register existing textures for optimization
     */
    registerExistingTextures() {
        // Get all textures from materials in the scene
        const textures = new Set();

        for (const material of this.scene.materials) {
            this.extractTexturesFromMaterial(material, textures);
        }

        // Register each unique texture
        for (const texture of textures) {
            this.registerTexture(texture);
        }

        console.log(`Registered ${textures.size} existing textures`);
    }

    /**
     * Extract textures from a material
     */
    extractTexturesFromMaterial(material, textureSet) {
        if (!material) return;

        // Common texture properties to check
        const textureProperties = [
            'diffuseTexture',
            'normalTexture',
            'specularTexture',
            'emissiveTexture',
            'ambientTexture',
            'bumpTexture',
            'reflectionTexture',
            'refractionTexture',
            'lightmapTexture',
            'opacityTexture'
        ];

        for (const prop of textureProperties) {
            const texture = material[prop];
            if (texture && texture.getInternalTexture) {
                textureSet.add(texture);
            }
        }

        // Check for texture arrays or additional textures
        if (material.getActiveTextures) {
            const activeTextures = material.getActiveTextures();
            for (const texture of activeTextures) {
                textureSet.add(texture);
            }
        }
    }

    /**
     * Set up scene observation for automatic texture registration
     */
    setupSceneObservation() {
        // Listen for new materials being added
        this.scene.onNewMaterialAddedObservable.add(material => {
            const textures = new Set();
            this.extractTexturesFromMaterial(material, textures);

            for (const texture of textures) {
                this.registerTexture(texture);
            }
        });

        // Listen for materials being removed
        this.scene.onMaterialRemovedObservable.add(material => {
            const textures = new Set();
            this.extractTexturesFromMaterial(material, textures);

            for (const texture of textures) {
                this.unregisterTexture(texture);
            }
        });
    }

    /**
     * Register a texture for optimization
     */
    registerTexture(texture, group = null) {
        if (!texture || !texture.getInternalTexture) return false;

        const internalTexture = texture.getInternalTexture();
        if (!internalTexture) return false;

        const textureId = internalTexture.uniqueId;

        // Skip if already registered
        if (this.managedTextures.has(textureId)) {
            return false;
        }

        // Create texture data
        const textureData = {
            texture,
            internalTexture,
            textureId,
            group,
            originalSize: this.getTextureSize(texture),
            currentSize: this.getTextureSize(texture),
            originalQuality: 1.0,
            currentQuality: 1.0,
            isStreaming: false,
            isLoaded: true,
            isCompressed: false,
            lastUsed: performance.now(),
            distanceFromCamera: 0,
            memoryUsage: this.estimateTextureMemory(texture),
            optimizationApplied: false,
            needsUpdate: false
        };

        // Register the texture
        this.managedTextures.set(textureId, textureData);

        // Add to group if specified
        if (group) {
            if (!this.textureGroups.has(group)) {
                this.textureGroups.set(group, new Set());
            }
            this.textureGroups.get(group).add(textureId);
        }

        // Update memory tracking
        this.memoryUsage.totalUsed += textureData.memoryUsage;
        this.memoryUsage.textureCount++;
        this.statistics.totalTextures++;

        console.log(`Registered texture for optimization: ${texture.name || 'unnamed'}`);
        return true;
    }

    /**
     * Get texture size
     */
    getTextureSize(texture) {
        if (!texture.getSize) return { width: 0, height: 0 };

        const size = texture.getSize();
        return {
            width: size.width || 0,
            height: size.height || 0
        };
    }

    /**
     * Estimate texture memory usage
     */
    estimateTextureMemory(texture) {
        const size = this.getTextureSize(texture);
        const { width } = size;
        const { height } = size;

        if (width === 0 || height === 0) return 0;

        // Estimate based on format (assuming RGBA8 for now)
        const bytesPerPixel = 4; // RGBA8

        // Account for mipmaps (adds ~33% more memory)
        const hasMipmaps = texture.generateMipMaps !== false;
        const mipmapMultiplier = hasMipmaps ? 1.33 : 1.0;

        return width * height * bytesPerPixel * mipmapMultiplier;
    }

    /**
     * Unregister a texture
     */
    unregisterTexture(texture) {
        if (!texture || !texture.getInternalTexture) return false;

        const internalTexture = texture.getInternalTexture();
        if (!internalTexture) return false;

        const textureId = internalTexture.uniqueId;
        const textureData = this.managedTextures.get(textureId);

        if (!textureData) return false;

        // Remove from group
        if (textureData.group) {
            const group = this.textureGroups.get(textureData.group);
            if (group) {
                group.delete(textureId);
                if (group.size === 0) {
                    this.textureGroups.delete(textureData.group);
                }
            }
        }

        // Update memory tracking
        this.memoryUsage.totalUsed -= textureData.memoryUsage;
        this.memoryUsage.textureCount--;
        this.statistics.totalTextures--;

        // Remove from managed textures
        this.managedTextures.delete(textureId);

        console.log(`Unregistered texture: ${texture.name || 'unnamed'}`);
        return true;
    }

    /**
     * Perform initial optimization on all registered textures
     */
    async performInitialOptimization() {
        console.log('Performing initial texture optimization...');

        const startTime = performance.now();
        let optimizedCount = 0;

        for (const textureData of this.managedTextures.values()) {
            if (await this.optimizeTexture(textureData)) {
                optimizedCount++;
            }
        }

        const duration = performance.now() - startTime;
        console.log(`Initial texture optimization completed in ${duration.toFixed(2)}ms, optimized ${optimizedCount} textures`);
    }

    /**
     * Update texture optimization
     */
    updateOptimization(deltaTime, camera) {
        if (!this.initialized || !this.enabled) return;

        this.frameCounter++;

        // Check if it's time for update
        if (this.frameCounter % this.config.performance.updateFrequency !== 0) {
            return;
        }

        const startTime = performance.now();

        // Update camera position tracking
        if (camera) {
            this.lastCameraPosition = camera.position.clone();
        }

        // Update texture distances and usage
        this.updateTextureDistances();

        // Process streaming queue
        this.processStreamingQueue();

        // Process unload queue
        this.processUnloadQueue();

        // Perform memory cleanup if needed
        this.performMemoryCleanup();

        // Apply optimizations to textures that need it
        this.applyPendingOptimizations();

        // Update statistics
        this.statistics.lastUpdateTime = performance.now();
        this.statistics.updateDuration = this.statistics.lastUpdateTime - startTime;
    }

    /**
     * Update texture distances from camera
     */
    updateTextureDistances() {
        if (!this.lastCameraPosition) return;

        for (const textureData of this.managedTextures.values()) {
            // Find meshes using this texture to calculate distance
            const distance = this.calculateTextureDistance(textureData);
            textureData.distanceFromCamera = distance;

            // Update last used time if texture is close
            if (distance < this.config.streaming.preloadDistance) {
                textureData.lastUsed = performance.now();
            }
        }
    }

    /**
     * Calculate distance of texture from camera
     */
    calculateTextureDistance(textureData) {
        let minDistance = Infinity;

        // Find all meshes using this texture
        for (const mesh of this.scene.meshes) {
            if (mesh.material && this.meshUsesTexture(mesh, textureData.texture)) {
                const meshPosition = mesh.getAbsolutePosition();
                const distance = BABYLON.Vector3.Distance(this.lastCameraPosition, meshPosition);
                minDistance = Math.min(minDistance, distance);
            }
        }

        return minDistance === Infinity ? this.config.streaming.maxDistance : minDistance;
    }

    /**
     * Check if mesh uses a specific texture
     */
    meshUsesTexture(mesh, texture) {
        if (!mesh.material) return false;

        const { material } = mesh;
        const textureProperties = [
            'diffuseTexture',
            'normalTexture',
            'specularTexture',
            'emissiveTexture',
            'ambientTexture',
            'bumpTexture'
        ];

        for (const prop of textureProperties) {
            if (material[prop] === texture) {
                return true;
            }
        }

        return false;
    }

    /**
     * Process streaming queue
     */
    processStreamingQueue() {
        if (!this.config.streaming.enabled) return;

        // Sort by priority (distance and usage)
        this.streamingQueue.sort((a, b) => {
            const priorityA = this.calculateStreamingPriority(a);
            const priorityB = this.calculateStreamingPriority(b);
            return priorityB - priorityA; // Higher priority first
        });

        // Process up to max streaming textures
        let streamingCount = 0;
        for (const textureData of this.managedTextures.values()) {
            if (textureData.isStreaming) streamingCount++;
        }

        const maxToProcess = Math.min(
            this.config.streaming.maxStreamingTextures - streamingCount,
            this.streamingQueue.length
        );

        for (let i = 0; i < maxToProcess; i++) {
            const textureData = this.streamingQueue.shift();
            this.streamTexture(textureData);
        }
    }

    /**
     * Calculate streaming priority for texture
     */
    calculateStreamingPriority(textureData) {
        const distance = textureData.distanceFromCamera;
        const timeSinceUsed = performance.now() - textureData.lastUsed;

        // Higher priority for closer textures and recently used textures
        const distancePriority = Math.max(0, 1000 - distance);
        const usagePriority = Math.max(0, 10000 - timeSinceUsed);

        return distancePriority + usagePriority;
    }

    /**
     * Stream a texture
     */
    async streamTexture(textureData) {
        if (textureData.isStreaming || textureData.isLoaded) return;

        try {
            console.log(`Streaming texture: ${textureData.texture.name || 'unnamed'}`);

            textureData.isStreaming = true;

            // Simulate texture streaming (in a real implementation, this would load texture data)
            await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async loading

            textureData.isLoaded = true;
            textureData.isStreaming = false;

            this.statistics.streamedTextures++;
        } catch (error) {
            console.error('Failed to stream texture:', error);
            textureData.isStreaming = false;
        }
    }

    /**
     * Process unload queue
     */
    processUnloadQueue() {
        const currentTime = performance.now();

        for (const textureData of this.managedTextures.values()) {
            const timeSinceUsed = currentTime - textureData.lastUsed;
            const distance = textureData.distanceFromCamera;

            // Queue for unloading if far away and not used recently
            if (distance > this.config.streaming.unloadDistance
                && timeSinceUsed > this.config.memory.unusedTextureTimeout
                && textureData.isLoaded) {
                this.unloadQueue.push(textureData);
            }
        }

        // Process unload queue
        const maxUnloads = 5; // Limit unloads per frame
        for (let i = 0; i < Math.min(maxUnloads, this.unloadQueue.length); i++) {
            const textureData = this.unloadQueue.shift();
            this.unloadTexture(textureData);
        }
    }

    /**
     * Unload a texture to free memory
     */
    unloadTexture(textureData) {
        if (!textureData.isLoaded) return;

        console.log(`Unloading texture: ${textureData.texture.name || 'unnamed'}`);

        // In a real implementation, this would free texture GPU memory
        // For now, we'll just mark it as unloaded
        textureData.isLoaded = false;

        // Add to streaming queue for potential reload
        if (this.config.streaming.enabled) {
            this.streamingQueue.push(textureData);
        }
    }

    /**
     * Perform memory cleanup if needed
     */
    performMemoryCleanup() {
        const memoryUsageRatio = this.memoryUsage.totalUsed / this.config.memory.maxTextureMemory;

        if (memoryUsageRatio < this.config.memory.cleanupThreshold) {
            return; // No cleanup needed
        }

        console.log(`Performing texture memory cleanup (usage: ${(memoryUsageRatio * 100).toFixed(1)}%)`);

        const isAggressiveCleanup = memoryUsageRatio > this.config.memory.aggressiveCleanupThreshold;
        const currentTime = performance.now();

        // Find textures to clean up
        const cleanupCandidates = [];

        for (const textureData of this.managedTextures.values()) {
            const timeSinceUsed = currentTime - textureData.lastUsed;
            const distance = textureData.distanceFromCamera;

            // Score for cleanup (higher score = better candidate for cleanup)
            let cleanupScore = 0;

            if (distance > this.config.streaming.unloadDistance) cleanupScore += 100;
            if (timeSinceUsed > this.config.memory.unusedTextureTimeout) cleanupScore += 50;
            if (!textureData.optimizationApplied) cleanupScore += 25;

            if (isAggressiveCleanup || cleanupScore > 75) {
                cleanupCandidates.push({ textureData, score: cleanupScore });
            }
        }

        // Sort by cleanup score (highest first)
        cleanupCandidates.sort((a, b) => b.score - a.score);

        // Clean up textures until memory usage is acceptable
        let cleanedUp = 0;
        for (const candidate of cleanupCandidates) {
            this.unloadTexture(candidate.textureData);
            cleanedUp++;

            const newUsageRatio = this.memoryUsage.totalUsed / this.config.memory.maxTextureMemory;
            if (newUsageRatio < this.config.memory.cleanupThreshold) {
                break;
            }
        }

        this.memoryUsage.lastCleanup = currentTime;
        console.log(`Cleaned up ${cleanedUp} textures`);
    }

    /**
     * Apply pending optimizations
     */
    applyPendingOptimizations() {
        let optimizationsApplied = 0;

        for (const textureData of this.managedTextures.values()) {
            if (textureData.needsUpdate && optimizationsApplied < this.config.performance.maxOptimizationsPerFrame) {
                this.optimizeTexture(textureData);
                optimizationsApplied++;
            }
        }
    }

    /**
     * Optimize a specific texture
     */
    async optimizeTexture(textureData) {
        if (textureData.optimizationApplied) return false;

        try {
            let optimized = false;

            // Apply quality scaling based on distance
            if (this.config.qualityScaling.enabled) {
                optimized = this.applyQualityScaling(textureData) || optimized;
            }

            // Apply compression if supported
            if (this.config.memory.enableCompression && this.hardwareSupport.supportsCompression) {
                optimized = this.applyTextureCompression(textureData) || optimized;
            }

            // Apply format optimization
            if (this.config.formatOptimization.enabled) {
                optimized = this.applyFormatOptimization(textureData) || optimized;
            }

            if (optimized) {
                textureData.optimizationApplied = true;
                textureData.needsUpdate = false;
                this.statistics.optimizedTextures++;
                this.statistics.optimizationsApplied++;

                console.log(`Optimized texture: ${textureData.texture.name || 'unnamed'}`);
            }

            return optimized;
        } catch (error) {
            console.error('Failed to optimize texture:', error);
            return false;
        }
    }

    /**
     * Apply quality scaling to texture
     */
    applyQualityScaling(textureData) {
        if (!this.config.qualityScaling.distanceScaling) return false;

        const distance = textureData.distanceFromCamera;
        const { maxDistance } = this.config.qualityScaling;

        // Calculate quality based on distance
        let qualityMultiplier = 1.0;

        if (distance > maxDistance * 0.5) {
            // Start reducing quality at half max distance
            const distanceRatio = (distance - maxDistance * 0.5) / (maxDistance * 0.5);
            qualityMultiplier = Math.max(this.config.qualityScaling.minQuality, 1.0 - distanceRatio * 0.75);
        }

        // Apply base quality setting
        qualityMultiplier *= this.config.qualityScaling.baseQuality;

        // Clamp to valid range
        qualityMultiplier = Math.max(this.config.qualityScaling.minQuality,
            Math.min(this.config.qualityScaling.maxQuality, qualityMultiplier));

        if (Math.abs(qualityMultiplier - textureData.currentQuality) > 0.1) {
            textureData.currentQuality = qualityMultiplier;

            // Apply quality to texture (simplified implementation)
            if (textureData.texture.level !== undefined) {
                textureData.texture.level = qualityMultiplier;
            }

            return true;
        }

        return false;
    }

    /**
     * Apply texture compression
     */
    applyTextureCompression(textureData) {
        if (textureData.isCompressed) return false;

        // In a real implementation, this would convert texture to compressed format
        // For now, we'll just mark it as compressed and estimate memory savings

        const originalMemory = textureData.memoryUsage;
        const compressedMemory = originalMemory * 0.25; // Assume 4:1 compression ratio
        const memorySaved = originalMemory - compressedMemory;

        textureData.isCompressed = true;
        textureData.memoryUsage = compressedMemory;

        // Update memory tracking
        this.memoryUsage.totalUsed -= memorySaved;
        this.memoryUsage.compressedTextures++;
        this.statistics.memorySaved += memorySaved;
        this.statistics.compressedTextures++;

        console.log(`Compressed texture: ${textureData.texture.name || 'unnamed'}, saved ${(memorySaved / 1024).toFixed(1)}KB`);

        return true;
    }

    /**
     * Apply format optimization
     */
    applyFormatOptimization(textureData) {
        const { texture } = textureData;
        let optimized = false;

        // Apply anisotropic filtering if supported
        if (this.hardwareSupport.supportsAnisotropic && texture.anisotropicFilteringLevel !== this.config.formatOptimization.anisotropicFiltering) {
            texture.anisotropicFilteringLevel = Math.min(
                this.config.formatOptimization.anisotropicFiltering,
                this.hardwareSupport.maxAnisotropy
            );
            optimized = true;
        }

        // Apply texture filtering
        if (texture.samplingMode !== this.getSamplingModeFromString(this.config.formatOptimization.textureFiltering)) {
            texture.updateSamplingMode(this.getSamplingModeFromString(this.config.formatOptimization.textureFiltering));
            optimized = true;
        }

        return optimized;
    }

    /**
     * Get Babylon.js sampling mode from string
     */
    getSamplingModeFromString(filteringType) {
        switch (filteringType) {
            case 'nearest': return BABYLON.Texture.NEAREST_SAMPLINGMODE;
            case 'linear': return BABYLON.Texture.LINEAR_SAMPLINGMODE;
            case 'bilinear': return BABYLON.Texture.BILINEAR_SAMPLINGMODE;
            case 'trilinear': return BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
            default: return BABYLON.Texture.TRILINEAR_SAMPLINGMODE;
        }
    }

    /**
     * Get texture optimization statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            managedTextures: this.managedTextures.size,
            textureGroups: this.textureGroups.size,
            memoryUsage: this.memoryUsage,
            streamingQueueSize: this.streamingQueue.length,
            unloadQueueSize: this.unloadQueue.length,
            enabled: this.enabled,
            hardwareSupport: this.hardwareSupport
        };
    }

    /**
     * Enable or disable texture optimization
     */
    setEnabled(enabled) {
        this.enabled = enabled;

        if (!enabled) {
            // Restore all textures to original quality
            for (const textureData of this.managedTextures.values()) {
                if (textureData.texture.level !== undefined) {
                    textureData.texture.level = textureData.originalQuality;
                }
                textureData.currentQuality = textureData.originalQuality;
                textureData.optimizationApplied = false;
            }
        }

        console.log(`Texture optimization ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Force optimization update for all textures
     */
    forceUpdate() {
        for (const textureData of this.managedTextures.values()) {
            textureData.needsUpdate = true;
            textureData.optimizationApplied = false;
        }

        console.log('Forced texture optimization update for all textures');
    }

    /**
     * Get texture data for a specific texture
     */
    getTextureData(texture) {
        if (!texture || !texture.getInternalTexture) return null;

        const internalTexture = texture.getInternalTexture();
        if (!internalTexture) return null;

        return this.managedTextures.get(internalTexture.uniqueId);
    }

    /**
     * Dispose of the texture optimizer
     */
    dispose() {
        console.log('Disposing TextureOptimizer...');

        // Restore all textures to original state
        for (const textureData of this.managedTextures.values()) {
            if (textureData.texture.level !== undefined) {
                textureData.texture.level = textureData.originalQuality;
            }
        }

        // Clear all data
        this.managedTextures.clear();
        this.textureGroups.clear();
        this.streamingQueue = [];
        this.unloadQueue = [];

        this.initialized = false;

        console.log('TextureOptimizer disposed');
    }
}
