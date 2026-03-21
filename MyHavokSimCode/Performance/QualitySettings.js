/**
 * QualitySettings - Data model and persistence for quality settings
 *
 * This class provides:
 * - Comprehensive quality settings data structure
 * - Settings persistence and loading functionality
 * - Preset migration and validation
 * - Settings versioning and compatibility
 */

export class QualitySettings {
    constructor() {
        // Settings version for migration compatibility
        this.version = '1.0.0';

        // Storage key for localStorage
        this.storageKey = 'villageSimulation_qualitySettings';

        // Default settings structure
        this.defaultSettings = this.createDefaultSettings();

        // Current settings
        this.currentSettings = null;

        // Settings validation schema
        this.validationSchema = this.createValidationSchema();

        // Migration handlers for different versions
        this.migrationHandlers = new Map();
        this.setupMigrationHandlers();

        console.log('QualitySettings initialized');
    }

    /**
     * Create default quality settings structure
     */
    createDefaultSettings() {
        return {
            version: this.version,
            timestamp: Date.now(),

            // General settings
            general: {
                qualityLevel: 75,
                preset: 'high',
                adaptiveQualityEnabled: true,
                targetFPS: 60,
                vsyncEnabled: true
            },

            // Rendering settings
            rendering: {
                // Shadow settings
                shadowQuality: 2, // 0=off, 1=low, 2=medium, 3=high
                shadowMapSize: 2048, // 512, 1024, 2048, 4096
                shadowCascades: 3, // Number of shadow cascades
                enableSoftShadows: true,

                // Texture settings
                textureQuality: 3, // 1=low, 2=medium, 3=high, 4=ultra
                textureFiltering: 'trilinear', // 'nearest', 'linear', 'bilinear', 'trilinear'
                anisotropicFiltering: 8, // 1, 2, 4, 8, 16
                textureCompression: true,

                // Level of Detail (LOD)
                lodDistance: 150, // Distance for LOD switching
                lodBias: 0, // LOD bias adjustment (-2 to 2)
                enableLOD: true,
                lodTransitionSpeed: 1.0,

                // Culling settings
                enableFrustumCulling: true,
                enableOcclusionCulling: true,
                occlusionCullingAccuracy: 0.8, // 0.1 to 1.0
                cullingDistance: 500, // Maximum render distance

                // Instancing and batching
                enableInstancing: true,
                instanceBatchSize: 100,
                enableStaticBatching: true,
                enableDynamicBatching: false,

                // Draw call optimization
                maxDrawCalls: 300,
                drawCallBudget: 250, // Target draw calls per frame

                // Post-processing effects
                enableSSAO: true,
                ssaoRadius: 0.5,
                ssaoIntensity: 1.0,
                enableBloom: true,
                bloomThreshold: 1.0,
                bloomIntensity: 0.8,
                enableToneMapping: true,
                toneMappingExposure: 1.0,

                // Anti-aliasing
                antiAliasing: 'MSAA', // 'none', 'FXAA', 'MSAA', 'TAA'
                msaaSamples: 4, // 2, 4, 8

                // Reflections
                enableReflections: true,
                reflectionQuality: 2, // 0=off, 1=low, 2=medium, 3=high
                reflectionDistance: 100,

                // Particle systems
                particleCount: 0.8, // Multiplier for particle counts
                particleQuality: 2, // 0=low, 1=medium, 2=high
                maxParticles: 1000,

                // Mesh settings
                meshQuality: 3, // 1=low, 2=medium, 3=high, 4=ultra
                enableMeshOptimization: true,
                meshSimplificationThreshold: 0.1
            },

            // AI processing settings
            ai: {
                // Agent limits
                maxActiveAgents: 100,
                maxVisibleAgents: 50,
                agentCullingDistance: 200,

                // Update frequencies
                updateFrequency: 1.0, // Multiplier for update rates
                behaviorUpdateRate: 60, // Updates per second
                pathfindingUpdateRate: 30,
                visionUpdateRate: 20,

                // Behavior complexity
                behaviorComplexity: 1.0, // Multiplier for behavior calculations
                pathfindingAccuracy: 1.0, // Pathfinding precision
                visionRange: 1.0, // Vision distance multiplier
                hearingRange: 1.0, // Hearing distance multiplier

                // Group behavior optimization
                enableFlockingOptimization: true,
                flockingNeighborLimit: 10,
                enableBehaviorCaching: true,
                behaviorCacheSize: 100,

                // AI scheduling
                enableFrameSpreadAI: true,
                aiTimeSliceMs: 2, // Max AI processing time per frame
                prioritizeVisibleAgents: true,

                // Decision making
                decisionTreeDepth: 5,
                enableStateMachineOptimization: true,
                stateTransitionCaching: true
            },

            // Physics settings
            physics: {
                // Simulation settings
                maxActiveBodies: 200,
                physicsUpdateRate: 60, // Hz
                updateFrequency: 1.0, // Multiplier
                subSteps: 1, // Physics sub-steps per frame

                // Collision detection
                collisionAccuracy: 1.0, // Collision precision multiplier
                broadPhaseAlgorithm: 'SAP', // 'SAP', 'DBVT'
                narrowPhaseOptimization: true,

                // Sleeping and activation
                enableSleeping: true,
                sleepThreshold: 0.02, // Linear velocity threshold
                angularSleepThreshold: 0.05, // Angular velocity threshold
                sleepTime: 1.0, // Time before sleep (seconds)

                // Constraint solving
                solverIterations: 10,
                positionIterations: 3,
                velocityIterations: 8,

                // Spatial optimization
                enableSpatialPartitioning: true,
                spatialGridSize: 10, // Grid cell size
                maxObjectsPerCell: 20,

                // Performance limits
                maxCollisionPairs: 500,
                maxConstraints: 200,
                physicsTimeSliceMs: 3 // Max physics time per frame
            },

            // Effects and environment settings
            effects: {
                // Cloud system
                cloudDetail: 0.8, // Detail level multiplier
                cloudDensity: 1.0,
                cloudCoverage: 0.7,
                enableCloudShadows: true,
                cloudUpdateRate: 2, // Updates per second

                // Water simulation
                waterQuality: 1.0, // Quality multiplier
                waveDetail: 2, // 0=low, 1=medium, 2=high, 3=ultra
                enableWaterReflections: true,
                enableWaterRefraction: true,
                waterSimulationRate: 30, // Hz

                // Wind effects
                windEffects: true,
                windStrength: 1.0,
                enableWindOnVegetation: true,
                enableWindOnParticles: true,

                // Atmospheric effects
                atmosphericScattering: true,
                fogDensity: 0.5,
                fogDistance: 1000,
                enableVolumetricFog: false,

                // Weather effects
                enableWeatherEffects: true,
                rainIntensity: 1.0,
                snowIntensity: 1.0,
                weatherTransitionSpeed: 1.0,

                // Lighting
                enableDynamicLighting: true,
                lightQuality: 2, // 0=low, 1=medium, 2=high
                maxDynamicLights: 8,
                lightShadowDistance: 100,

                // Day/night cycle
                enableDayNightCycle: true,
                dayNightSpeed: 1.0,
                enableSunShadows: true,
                enableMoonShadows: false
            },

            // Memory management settings
            memory: {
                // Garbage collection
                enableAggressiveGC: false,
                gcInterval: 30000, // 30 seconds
                memoryPressureThreshold: 0.8, // 80% of available memory

                // Object pooling
                enableObjectPooling: true,
                poolSizes: {
                    particles: 1000,
                    meshes: 100,
                    materials: 50,
                    textures: 200
                },

                // Resource management
                enableResourceCaching: true,
                cacheSize: 100, // MB
                enableAssetStreaming: true,
                streamingDistance: 300,

                // Cleanup settings
                enableAutoCleanup: true,
                cleanupInterval: 60000, // 1 minute
                unusedResourceTimeout: 300000, // 5 minutes

                // Memory monitoring
                enableMemoryMonitoring: true,
                memoryCheckInterval: 5000, // 5 seconds
                memoryAlertThreshold: 0.9 // 90% of available memory
            },

            // Performance monitoring settings
            monitoring: {
                // FPS monitoring
                enableFPSMonitoring: true,
                fpsUpdateInterval: 1000, // 1 second
                fpsHistorySize: 60, // Keep 60 seconds of history

                // Performance alerts
                enablePerformanceAlerts: true,
                fpsAlertThreshold: 25,
                memoryAlertThreshold: 0.85,
                frameTimeAlertThreshold: 20, // ms

                // Profiling
                enableProfiling: false,
                profilingInterval: 10000, // 10 seconds
                profileCategories: ['rendering', 'ai', 'physics', 'effects'],

                // Statistics collection
                enableStatistics: true,
                statisticsInterval: 5000, // 5 seconds
                maxStatisticsHistory: 100
            },

            // Debug and development settings
            debug: {
                enableDebugMode: false,
                showPerformanceOverlay: false,
                showFPSCounter: true,
                showMemoryUsage: false,
                showDrawCalls: false,
                enableWireframe: false,
                showBoundingBoxes: false,
                showLODLevels: false,
                enablePerformanceProfiling: false,
                logPerformanceWarnings: true,
                logQualityChanges: true
            }
        };
    }

    /**
     * Create validation schema for settings
     */
    createValidationSchema() {
        return {
            version: { type: 'string', required: true },
            timestamp: { type: 'number', required: true },

            general: {
                qualityLevel: { type: 'number', min: 0, max: 100 },
                preset: { type: 'string', enum: ['low', 'medium', 'high', 'ultra'] },
                adaptiveQualityEnabled: { type: 'boolean' },
                targetFPS: { type: 'number', min: 15, max: 120 },
                vsyncEnabled: { type: 'boolean' }
            },

            rendering: {
                shadowQuality: { type: 'number', min: 0, max: 3 },
                shadowMapSize: { type: 'number', enum: [512, 1024, 2048, 4096] },
                textureQuality: { type: 'number', min: 1, max: 4 },
                lodDistance: { type: 'number', min: 10, max: 1000 },
                maxDrawCalls: { type: 'number', min: 50, max: 1000 },
                particleCount: { type: 'number', min: 0, max: 2 }
            },

            ai: {
                maxActiveAgents: { type: 'number', min: 1, max: 500 },
                updateFrequency: { type: 'number', min: 0.1, max: 2 },
                behaviorComplexity: { type: 'number', min: 0.1, max: 2 },
                pathfindingAccuracy: { type: 'number', min: 0.1, max: 2 }
            },

            physics: {
                maxActiveBodies: { type: 'number', min: 10, max: 1000 },
                updateFrequency: { type: 'number', min: 0.1, max: 2 },
                collisionAccuracy: { type: 'number', min: 0.1, max: 2 },
                sleepThreshold: { type: 'number', min: 0.001, max: 1 }
            },

            effects: {
                cloudDetail: { type: 'number', min: 0, max: 2 },
                waterQuality: { type: 'number', min: 0, max: 2 },
                windStrength: { type: 'number', min: 0, max: 3 }
            }
        };
    }

    /**
     * Setup migration handlers for different versions
     */
    setupMigrationHandlers() {
        // Migration from version 0.9.x to 1.0.0
        this.migrationHandlers.set('0.9', oldSettings => {
            console.log('Migrating settings from version 0.9.x to 1.0.0');

            // Add new sections that didn't exist in 0.9
            const migratedSettings = { ...this.defaultSettings };

            // Preserve existing settings where possible
            if (oldSettings.general) {
                migratedSettings.general = { ...migratedSettings.general, ...oldSettings.general };
            }

            if (oldSettings.rendering) {
                migratedSettings.rendering = { ...migratedSettings.rendering, ...oldSettings.rendering };
            }

            // Convert old quality level format if needed
            if (oldSettings.qualityLevel && !oldSettings.general?.qualityLevel) {
                migratedSettings.general.qualityLevel = oldSettings.qualityLevel;
            }

            migratedSettings.version = this.version;
            migratedSettings.timestamp = Date.now();

            return migratedSettings;
        });

        // Add more migration handlers as needed for future versions
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            console.log('Loading quality settings...');

            // Try to load from localStorage
            const storedData = localStorage.getItem(this.storageKey);

            if (!storedData) {
                console.log('No stored settings found, using defaults');
                this.currentSettings = { ...this.defaultSettings };
                return this.currentSettings;
            }

            const parsedSettings = JSON.parse(storedData);

            // Validate and migrate if necessary
            const validatedSettings = await this.validateAndMigrateSettings(parsedSettings);

            this.currentSettings = validatedSettings;

            console.log(`Settings loaded successfully (version: ${validatedSettings.version})`);
            return this.currentSettings;
        } catch (error) {
            console.error('Failed to load settings:', error);
            console.log('Falling back to default settings');

            this.currentSettings = { ...this.defaultSettings };
            return this.currentSettings;
        }
    }

    /**
     * Save settings to storage
     */
    async saveSettings(settings = null) {
        try {
            const settingsToSave = settings || this.currentSettings;

            if (!settingsToSave) {
                throw new Error('No settings to save');
            }

            // Update timestamp
            settingsToSave.timestamp = Date.now();
            settingsToSave.version = this.version;

            // Validate settings before saving
            const validationResult = this.validateSettings(settingsToSave);
            if (!validationResult.valid) {
                throw new Error(`Settings validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Save to localStorage
            const serializedSettings = JSON.stringify(settingsToSave, null, 2);
            localStorage.setItem(this.storageKey, serializedSettings);

            this.currentSettings = settingsToSave;

            console.log('Settings saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    /**
     * Validate and migrate settings if necessary
     */
    async validateAndMigrateSettings(settings) {
        // Check if migration is needed
        const currentVersion = settings.version || '0.9.0';

        if (currentVersion !== this.version) {
            console.log(`Settings version mismatch: ${currentVersion} → ${this.version}`);
            settings = await this.migrateSettings(settings, currentVersion);
        }

        // Validate settings
        const validationResult = this.validateSettings(settings);

        if (!validationResult.valid) {
            console.warn('Settings validation failed, merging with defaults:', validationResult.errors);
            settings = this.mergeWithDefaults(settings);
        }

        return settings;
    }

    /**
     * Migrate settings from old version to current version
     */
    async migrateSettings(oldSettings, fromVersion) {
        const majorVersion = `${fromVersion.split('.')[0]}.${fromVersion.split('.')[1]}`;

        if (this.migrationHandlers.has(majorVersion)) {
            const migrationHandler = this.migrationHandlers.get(majorVersion);
            return migrationHandler(oldSettings);
        } else {
            console.warn(`No migration handler for version ${fromVersion}, merging with defaults`);
            return this.mergeWithDefaults(oldSettings);
        }
    }

    /**
     * Merge settings with defaults to fill missing values
     */
    mergeWithDefaults(settings) {
        const merged = JSON.parse(JSON.stringify(this.defaultSettings));

        // Deep merge function
        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        };

        deepMerge(merged, settings);

        // Update version and timestamp
        merged.version = this.version;
        merged.timestamp = Date.now();

        return merged;
    }

    /**
     * Validate settings against schema
     */
    validateSettings(settings) {
        const errors = [];

        // Validate structure
        if (!settings || typeof settings !== 'object') {
            errors.push('Settings must be an object');
            return { valid: false, errors };
        }

        // Validate each section
        this.validateSection(settings, this.validationSchema, '', errors);

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate a settings section recursively
     */
    validateSection(settings, schema, path, errors) {
        for (const key in schema) {
            const fullPath = path ? `${path}.${key}` : key;
            const schemaRule = schema[key];
            const value = settings[key];

            // Check if required field is missing
            if (schemaRule.required && (value === undefined || value === null)) {
                errors.push(`Required field missing: ${fullPath}`);
                continue;
            }

            // Skip validation if value is undefined and not required
            if (value === undefined || value === null) {
                continue;
            }

            // Validate nested objects
            if (schemaRule.type === undefined && typeof schemaRule === 'object') {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    this.validateSection(value, schemaRule, fullPath, errors);
                } else {
                    errors.push(`${fullPath} must be an object`);
                }
                continue;
            }

            // Validate primitive types
            if (schemaRule.type && typeof value !== schemaRule.type) {
                errors.push(`${fullPath} must be of type ${schemaRule.type}`);
                continue;
            }

            // Validate number ranges
            if (schemaRule.type === 'number') {
                if (schemaRule.min !== undefined && value < schemaRule.min) {
                    errors.push(`${fullPath} must be >= ${schemaRule.min}`);
                }
                if (schemaRule.max !== undefined && value > schemaRule.max) {
                    errors.push(`${fullPath} must be <= ${schemaRule.max}`);
                }
            }

            // Validate enums
            if (schemaRule.enum && !schemaRule.enum.includes(value)) {
                errors.push(`${fullPath} must be one of: ${schemaRule.enum.join(', ')}`);
            }
        }
    }

    /**
     * Get current settings
     */
    getCurrentSettings() {
        return this.currentSettings ? { ...this.currentSettings } : null;
    }

    /**
     * Update specific setting
     */
    updateSetting(path, value) {
        if (!this.currentSettings) {
            throw new Error('Settings not loaded');
        }

        const pathParts = path.split('.');
        let current = this.currentSettings;

        // Navigate to parent object
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (!current[pathParts[i]]) {
                current[pathParts[i]] = {};
            }
            current = current[pathParts[i]];
        }

        // Set the value
        const lastKey = pathParts[pathParts.length - 1];
        current[lastKey] = value;

        console.log(`Setting updated: ${path} = ${value}`);
    }

    /**
     * Get specific setting value
     */
    getSetting(path) {
        if (!this.currentSettings) {
            return undefined;
        }

        const pathParts = path.split('.');
        let current = this.currentSettings;

        for (const part of pathParts) {
            if (current[part] === undefined) {
                return undefined;
            }
            current = current[part];
        }

        return current;
    }

    /**
     * Reset settings to defaults
     */
    resetToDefaults() {
        this.currentSettings = { ...this.defaultSettings };
        console.log('Settings reset to defaults');
    }

    /**
     * Export settings to JSON string
     */
    exportSettings() {
        if (!this.currentSettings) {
            throw new Error('No settings to export');
        }

        return JSON.stringify(this.currentSettings, null, 2);
    }

    /**
     * Import settings from JSON string
     */
    async importSettings(jsonString) {
        try {
            const importedSettings = JSON.parse(jsonString);
            const validatedSettings = await this.validateAndMigrateSettings(importedSettings);

            this.currentSettings = validatedSettings;

            console.log('Settings imported successfully');
            return true;
        } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
        }
    }

    /**
     * Create a preset from current settings
     */
    createPresetFromCurrent(name, description = '') {
        if (!this.currentSettings) {
            throw new Error('No current settings to create preset from');
        }

        const preset = {
            name,
            description,
            level: this.currentSettings.general.qualityLevel,
            rendering: { ...this.currentSettings.rendering },
            ai: { ...this.currentSettings.ai },
            physics: { ...this.currentSettings.physics },
            effects: { ...this.currentSettings.effects }
        };

        return preset;
    }

    /**
     * Get settings summary for display
     */
    getSettingsSummary() {
        if (!this.currentSettings) {
            return null;
        }

        return {
            version: this.currentSettings.version,
            timestamp: this.currentSettings.timestamp,
            qualityLevel: this.currentSettings.general.qualityLevel,
            preset: this.currentSettings.general.preset,
            adaptiveQuality: this.currentSettings.general.adaptiveQualityEnabled,
            targetFPS: this.currentSettings.general.targetFPS,

            // Key performance settings
            shadowQuality: this.currentSettings.rendering.shadowQuality,
            textureQuality: this.currentSettings.rendering.textureQuality,
            maxActiveAgents: this.currentSettings.ai.maxActiveAgents,
            maxActiveBodies: this.currentSettings.physics.maxActiveBodies,

            // Memory and performance
            memoryMonitoring: this.currentSettings.memory.enableMemoryMonitoring,
            performanceAlerts: this.currentSettings.monitoring.enablePerformanceAlerts,
            debugMode: this.currentSettings.debug.enableDebugMode
        };
    }
}
