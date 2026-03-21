/**
 * OptimizationConfig - Configuration and settings management for performance optimization
 * Handles loading, saving, and managing optimization settings and presets
 */

export class OptimizationConfig {
    constructor() {
        this.configKey = 'villageSimOptimizationConfig';
        this.defaultConfig = this.getDefaultConfig();
        this.currentConfig = null;
        this.presets = this.getDefaultPresets();
        this.callbacks = [];

        console.log('OptimizationConfig initialized');
    }

    /**
     * Initialize the configuration system
     */
    async initialize() {
        try {
            console.log('Initializing OptimizationConfig...');

            // Load configuration from storage
            await this.loadConfiguration();

            // Validate and migrate if necessary
            this.validateConfiguration();

            console.log('OptimizationConfig initialization complete');
        } catch (error) {
            console.error('Failed to initialize OptimizationConfig:', error);
            // Fall back to default configuration
            this.currentConfig = { ...this.defaultConfig };
        }
    }

    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            version: '1.0.0',
            optimizationLevel: 'balanced',
            targetFPS: 60,
            adaptiveQualityEnabled: true,
            enabledOptimizations: {
                adaptiveQuality: true,
                rendering: true,
                aiProcessing: true,
                physics: true,
                memory: true
            },
            performanceTargets: {
                minFPS: 30,
                targetFPS: 60,
                maxFrameTime: 16.67,
                memoryThreshold: 80
            },
            optimizationThresholds: {
                conservative: {
                    fpsDropThreshold: 5,
                    memoryThreshold: 70,
                    responseDelay: 2000
                },
                balanced: {
                    fpsDropThreshold: 10,
                    memoryThreshold: 75,
                    responseDelay: 1000
                },
                aggressive: {
                    fpsDropThreshold: 15,
                    memoryThreshold: 80,
                    responseDelay: 500
                }
            },
            qualitySettings: {
                level: 75,
                preset: 'medium',
                rendering: {
                    shadowQuality: 2,
                    textureQuality: 2,
                    lodDistance: 50,
                    maxDrawCalls: 1000,
                    enableInstancing: true
                },
                ai: {
                    maxActiveAgents: 100,
                    updateFrequency: 1.0,
                    behaviorComplexity: 2
                },
                physics: {
                    maxActiveBodies: 200,
                    collisionAccuracy: 2,
                    updateFrequency: 1.0
                },
                effects: {
                    particleCount: 500,
                    cloudDetail: 2,
                    waterQuality: 2
                }
            },
            distanceOptimization: {
                enabled: true,
                nearDistance: 20,
                mediumDistance: 50,
                farDistance: 100,
                cullingDistance: 150
            },
            userPreferences: {
                showPerformanceMetrics: true,
                autoOptimization: true,
                alertsEnabled: true,
                debugMode: false
            }
        };
    }

    /**
     * Get default presets
     */
    getDefaultPresets() {
        return {
            low: {
                name: 'Low Quality',
                description: 'Optimized for low-end hardware',
                qualitySettings: {
                    level: 25,
                    preset: 'low',
                    rendering: {
                        shadowQuality: 0,
                        textureQuality: 0,
                        lodDistance: 25,
                        maxDrawCalls: 500,
                        enableInstancing: true
                    },
                    ai: {
                        maxActiveAgents: 50,
                        updateFrequency: 0.5,
                        behaviorComplexity: 1
                    },
                    physics: {
                        maxActiveBodies: 100,
                        collisionAccuracy: 1,
                        updateFrequency: 0.5
                    },
                    effects: {
                        particleCount: 100,
                        cloudDetail: 1,
                        waterQuality: 1
                    }
                },
                optimizationLevel: 'aggressive',
                targetFPS: 30
            },
            medium: {
                name: 'Medium Quality',
                description: 'Balanced quality and performance',
                qualitySettings: {
                    level: 50,
                    preset: 'medium',
                    rendering: {
                        shadowQuality: 1,
                        textureQuality: 1,
                        lodDistance: 40,
                        maxDrawCalls: 750,
                        enableInstancing: true
                    },
                    ai: {
                        maxActiveAgents: 75,
                        updateFrequency: 0.75,
                        behaviorComplexity: 2
                    },
                    physics: {
                        maxActiveBodies: 150,
                        collisionAccuracy: 2,
                        updateFrequency: 0.75
                    },
                    effects: {
                        particleCount: 300,
                        cloudDetail: 2,
                        waterQuality: 2
                    }
                },
                optimizationLevel: 'balanced',
                targetFPS: 45
            },
            high: {
                name: 'High Quality',
                description: 'High quality for mid-range hardware',
                qualitySettings: {
                    level: 75,
                    preset: 'high',
                    rendering: {
                        shadowQuality: 2,
                        textureQuality: 2,
                        lodDistance: 60,
                        maxDrawCalls: 1000,
                        enableInstancing: true
                    },
                    ai: {
                        maxActiveAgents: 100,
                        updateFrequency: 1.0,
                        behaviorComplexity: 3
                    },
                    physics: {
                        maxActiveBodies: 200,
                        collisionAccuracy: 3,
                        updateFrequency: 1.0
                    },
                    effects: {
                        particleCount: 500,
                        cloudDetail: 3,
                        waterQuality: 3
                    }
                },
                optimizationLevel: 'balanced',
                targetFPS: 60
            },
            ultra: {
                name: 'Ultra Quality',
                description: 'Maximum quality for high-end hardware',
                qualitySettings: {
                    level: 100,
                    preset: 'ultra',
                    rendering: {
                        shadowQuality: 3,
                        textureQuality: 3,
                        lodDistance: 80,
                        maxDrawCalls: 1500,
                        enableInstancing: true
                    },
                    ai: {
                        maxActiveAgents: 150,
                        updateFrequency: 1.0,
                        behaviorComplexity: 3
                    },
                    physics: {
                        maxActiveBodies: 300,
                        collisionAccuracy: 3,
                        updateFrequency: 1.0
                    },
                    effects: {
                        particleCount: 1000,
                        cloudDetail: 3,
                        waterQuality: 3
                    }
                },
                optimizationLevel: 'conservative',
                targetFPS: 60
            }
        };
    }

    /**
     * Load configuration from storage
     */
    async loadConfiguration() {
        try {
            const stored = localStorage.getItem(this.configKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.currentConfig = { ...this.defaultConfig, ...parsed };
                console.log('Configuration loaded from storage');
            } else {
                this.currentConfig = { ...this.defaultConfig };
                console.log('Using default configuration');
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
            this.currentConfig = { ...this.defaultConfig };
        }
    }

    /**
     * Save configuration to storage
     */
    async saveConfiguration() {
        try {
            const configToSave = { ...this.currentConfig };
            localStorage.setItem(this.configKey, JSON.stringify(configToSave));
            console.log('Configuration saved to storage');

            // Notify callbacks
            this.notifyCallbacks('configurationSaved', configToSave);
        } catch (error) {
            console.error('Failed to save configuration:', error);
            throw error;
        }
    }

    /**
     * Validate and migrate configuration
     */
    validateConfiguration() {
        if (!this.currentConfig) {
            this.currentConfig = { ...this.defaultConfig };
            return;
        }

        // Check version and migrate if necessary
        if (!this.currentConfig.version || this.currentConfig.version !== this.defaultConfig.version) {
            console.log('Migrating configuration to new version');
            this.migrateConfiguration();
        }

        // Validate required fields
        const requiredFields = [
            'optimizationLevel',
            'targetFPS',
            'adaptiveQualityEnabled',
            'enabledOptimizations',
            'performanceTargets',
            'qualitySettings'
        ];

        for (const field of requiredFields) {
            if (!(field in this.currentConfig)) {
                console.warn(`Missing configuration field: ${field}, using default`);
                this.currentConfig[field] = this.defaultConfig[field];
            }
        }

        // Validate ranges
        this.currentConfig.targetFPS = Math.max(15, Math.min(120, this.currentConfig.targetFPS));
        this.currentConfig.qualitySettings.level = Math.max(0, Math.min(100, this.currentConfig.qualitySettings.level));
    }

    /**
     * Migrate configuration to new version
     */
    migrateConfiguration() {
        // Add migration logic here as the configuration format evolves
        this.currentConfig.version = this.defaultConfig.version;

        // Ensure all new fields are present
        for (const [key, value] of Object.entries(this.defaultConfig)) {
            if (!(key in this.currentConfig)) {
                this.currentConfig[key] = value;
            }
        }
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    getConfiguration() {
        return { ...this.currentConfig };
    }

    /**
     * Update configuration
     * @param {Object} updates - Configuration updates
     */
    updateConfiguration(updates) {
        const oldConfig = { ...this.currentConfig };
        this.currentConfig = { ...this.currentConfig, ...updates };

        // Validate after update
        this.validateConfiguration();

        // Notify callbacks
        this.notifyCallbacks('configurationUpdated', {
            oldConfig,
            newConfig: this.currentConfig,
            updates
        });

        console.log('Configuration updated:', updates);
    }

    /**
     * Apply preset configuration
     * @param {string} presetName - Name of preset to apply
     */
    applyPreset(presetName) {
        if (!(presetName in this.presets)) {
            throw new Error(`Unknown preset: ${presetName}`);
        }

        const preset = this.presets[presetName];
        const updates = {
            qualitySettings: preset.qualitySettings,
            optimizationLevel: preset.optimizationLevel,
            targetFPS: preset.targetFPS
        };

        this.updateConfiguration(updates);

        console.log(`Applied preset: ${preset.name}`);

        // Notify callbacks
        this.notifyCallbacks('presetApplied', {
            presetName,
            preset
        });
    }

    /**
     * Get available presets
     * @returns {Object} Available presets
     */
    getPresets() {
        return { ...this.presets };
    }

    /**
     * Create custom preset
     * @param {string} name - Preset name
     * @param {Object} settings - Preset settings
     */
    createCustomPreset(name, settings) {
        this.presets[name] = {
            name: settings.name || name,
            description: settings.description || 'Custom preset',
            qualitySettings: settings.qualitySettings || this.currentConfig.qualitySettings,
            optimizationLevel: settings.optimizationLevel || this.currentConfig.optimizationLevel,
            targetFPS: settings.targetFPS || this.currentConfig.targetFPS,
            custom: true
        };

        console.log(`Created custom preset: ${name}`);

        // Notify callbacks
        this.notifyCallbacks('presetCreated', {
            name,
            preset: this.presets[name]
        });
    }

    /**
     * Delete custom preset
     * @param {string} name - Preset name
     */
    deleteCustomPreset(name) {
        if (!(name in this.presets)) {
            throw new Error(`Preset not found: ${name}`);
        }

        if (!this.presets[name].custom) {
            throw new Error(`Cannot delete built-in preset: ${name}`);
        }

        delete this.presets[name];

        console.log(`Deleted custom preset: ${name}`);

        // Notify callbacks
        this.notifyCallbacks('presetDeleted', { name });
    }

    /**
     * Reset configuration to defaults
     */
    resetToDefaults() {
        const oldConfig = { ...this.currentConfig };
        this.currentConfig = { ...this.defaultConfig };

        console.log('Configuration reset to defaults');

        // Notify callbacks
        this.notifyCallbacks('configurationReset', {
            oldConfig,
            newConfig: this.currentConfig
        });
    }

    /**
     * Export configuration
     * @returns {string} Configuration as JSON string
     */
    exportConfiguration() {
        return JSON.stringify(this.currentConfig, null, 2);
    }

    /**
     * Import configuration
     * @param {string} configJson - Configuration as JSON string
     */
    importConfiguration(configJson) {
        try {
            const imported = JSON.parse(configJson);
            const oldConfig = { ...this.currentConfig };

            this.currentConfig = { ...this.defaultConfig, ...imported };
            this.validateConfiguration();

            console.log('Configuration imported successfully');

            // Notify callbacks
            this.notifyCallbacks('configurationImported', {
                oldConfig,
                newConfig: this.currentConfig
            });
        } catch (error) {
            console.error('Failed to import configuration:', error);
            throw new Error(`Invalid configuration format: ${error.message}`);
        }
    }

    /**
     * Register callback for configuration changes
     * @param {Function} callback - Callback function
     */
    onChange(callback) {
        if (typeof callback === 'function') {
            this.callbacks.push(callback);
        }
    }

    /**
     * Remove callback
     * @param {Function} callback - Callback function to remove
     */
    removeCallback(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

    /**
     * Notify callbacks of configuration changes
     * @param {string} event - Event type
     * @param {Object} data - Event data
     */
    notifyCallbacks(event, data) {
        this.callbacks.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in configuration callback:', error);
            }
        });
    }

    /**
     * Get optimization settings for a specific system
     * @param {string} system - System name ('rendering', 'ai', 'physics', etc.)
     * @returns {Object} System-specific settings
     */
    getSystemSettings(system) {
        switch (system) {
            case 'rendering':
                return {
                    ...this.currentConfig.qualitySettings.rendering,
                    enabled: this.currentConfig.enabledOptimizations.rendering
                };
            case 'ai':
                return {
                    ...this.currentConfig.qualitySettings.ai,
                    enabled: this.currentConfig.enabledOptimizations.aiProcessing,
                    distanceOptimization: this.currentConfig.distanceOptimization
                };
            case 'physics':
                return {
                    ...this.currentConfig.qualitySettings.physics,
                    enabled: this.currentConfig.enabledOptimizations.physics
                };
            case 'memory':
                return {
                    enabled: this.currentConfig.enabledOptimizations.memory,
                    threshold: this.currentConfig.performanceTargets.memoryThreshold
                };
            case 'effects':
                return this.currentConfig.qualitySettings.effects;
            default:
                return {};
        }
    }

    /**
     * Dispose of the configuration system
     */
    dispose() {
        console.log('Disposing OptimizationConfig...');

        // Save current configuration
        try {
            this.saveConfiguration();
        } catch (error) {
            console.error('Failed to save configuration on dispose:', error);
        }

        // Clear callbacks
        this.callbacks = [];
        this.currentConfig = null;

        console.log('OptimizationConfig disposed');
    }
}
