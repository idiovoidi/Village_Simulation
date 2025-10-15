/**
 * PerformanceOptimizer - Main controller for performance optimization system
 * Integrates with VillageEngine and PerformanceMonitor to provide dynamic optimization
 */

export class PerformanceOptimizer {
    constructor(engine, scene, systems = {}) {
        this.engine = engine;
        this.scene = scene;
        this.systems = systems;
        
        // Core state
        this.initialized = false;
        this.optimizationActive = false;
        this.optimizationLevel = 'balanced'; // 'conservative', 'balanced', 'aggressive'
        this.targetFPS = 60;
        this.adaptiveQualityEnabled = true;
        
        // Performance monitoring integration
        this.performanceMonitor = systems.performanceMonitor || null;
        
        // Configuration management
        this.optimizationConfig = null;
        this.settingsUI = null;
        
        // Optimization subsystems (will be initialized later)
        this.adaptiveQualityManager = null;
        this.renderingOptimizer = null;
        this.aiProcessingOptimizer = null;
        this.physicsOptimizer = null;
        this.memoryManager = null;
        this.degradationDetector = null;
        this.errorHandler = null;
        
        // Performance tracking
        this.lastOptimizationTime = 0;
        this.optimizationInterval = 1000; // Check every second
        this.performanceHistory = [];
        this.maxHistorySize = 60; // Keep 60 seconds of history
        
        // Configuration
        this.config = {
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
                maxFrameTime: 16.67, // 60 FPS = 16.67ms per frame
                memoryThreshold: 80 // Percentage
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
            }
        };
        
        // Event callbacks
        this.optimizationCallbacks = [];
        this.alertCallbacks = [];
        
        console.log('PerformanceOptimizer initialized');
    }
    
    /**
     * Initialize the performance optimization system
     */
    async initialize() {
        if (this.initialized) {
            console.warn('PerformanceOptimizer already initialized');
            return;
        }
        
        try {
            console.log('Initializing PerformanceOptimizer...');
            
            // Validate required dependencies
            this.validateDependencies();
            
            // Initialize configuration management
            await this.initializeConfiguration();
            
            // Initialize optimization subsystems
            await this.initializeSubsystems();
            
            // Set up performance monitoring integration
            this.setupPerformanceMonitoringIntegration();
            
            // Set up optimization lifecycle
            this.setupOptimizationLifecycle();
            
            // Initialize settings UI
            await this.initializeSettingsUI();
            
            this.initialized = true;
            console.log('PerformanceOptimizer initialization complete');
            
        } catch (error) {
            console.error('Failed to initialize PerformanceOptimizer:', error);
            throw error;
        }
    }
    
    /**
     * Validate required dependencies
     */
    validateDependencies() {
        if (!this.engine) {
            throw new Error('Babylon.js engine is required');
        }
        
        if (!this.scene) {
            throw new Error('Babylon.js scene is required');
        }
        
        // Performance monitor is optional but recommended
        if (!this.performanceMonitor) {
            console.warn('PerformanceMonitor not provided - some features may be limited');
        }
    }
    
    /**
     * Initialize configuration management
     */
    async initializeConfiguration() {
        try {
            console.log('Initializing optimization configuration...');
            
            // Import and initialize OptimizationConfig
            const { OptimizationConfig } = await import('./OptimizationConfig.js');
            this.optimizationConfig = new OptimizationConfig();
            await this.optimizationConfig.initialize();
            
            // Apply configuration to optimizer
            this.applyConfigurationSettings();
            
            // Listen for configuration changes
            this.optimizationConfig.onChange((event, data) => {
                this.onConfigurationChanged(event, data);
            });
            
            console.log('Optimization configuration initialized');
            
        } catch (error) {
            console.error('Failed to initialize configuration:', error);
            // Continue without configuration - use defaults
        }
    }
    
    /**
     * Initialize settings UI
     */
    async initializeSettingsUI() {
        try {
            if (!this.optimizationConfig) {
                console.warn('Cannot initialize settings UI without configuration');
                return;
            }
            
            console.log('Initializing optimization settings UI...');
            
            // Import and initialize OptimizationSettingsUI
            const { OptimizationSettingsUI } = await import('../UI/OptimizationSettingsUI.js');
            this.settingsUI = new OptimizationSettingsUI(this.scene, this.optimizationConfig, this);
            await this.settingsUI.initialize();
            
            console.log('Optimization settings UI initialized');
            
        } catch (error) {
            console.error('Failed to initialize settings UI:', error);
            // Continue without UI - optimization still works
        }
    }
    
    /**
     * Apply configuration settings to the optimizer
     */
    applyConfigurationSettings() {
        if (!this.optimizationConfig) return;
        
        const config = this.optimizationConfig.getConfiguration();
        
        // Apply basic settings
        this.optimizationLevel = config.optimizationLevel;
        this.targetFPS = config.targetFPS;
        this.adaptiveQualityEnabled = config.adaptiveQualityEnabled;
        
        // Update internal config
        this.config = {
            ...this.config,
            enabledOptimizations: config.enabledOptimizations,
            performanceTargets: config.performanceTargets,
            optimizationThresholds: config.optimizationThresholds
        };
        
        console.log('Configuration settings applied to optimizer');
    }
    
    /**
     * Handle configuration changes
     */
    onConfigurationChanged(event, data) {
        console.log(`Configuration changed: ${event}`, data);
        
        switch (event) {
            case 'configurationUpdated':
                this.applyConfigurationSettings();
                break;
            case 'presetApplied':
                this.applyConfigurationSettings();
                // Notify subsystems of preset change
                this.notifySubsystemsOfConfigChange(data.preset);
                break;
            case 'configurationReset':
                this.applyConfigurationSettings();
                break;
        }
    }
    
    /**
     * Notify subsystems of configuration changes
     */
    notifySubsystemsOfConfigChange(preset) {
        // Update adaptive quality manager
        if (this.adaptiveQualityManager && this.adaptiveQualityManager.applyQualitySettings) {
            const config = this.optimizationConfig.getConfiguration();
            this.adaptiveQualityManager.applyQualitySettings(config.qualitySettings);
        }
        
        // Update rendering optimizer
        if (this.renderingOptimizer && this.renderingOptimizer.applySettings) {
            const renderingSettings = this.optimizationConfig.getSystemSettings('rendering');
            this.renderingOptimizer.applySettings(renderingSettings);
        }
        
        // Update AI processing optimizer
        if (this.aiProcessingOptimizer && this.aiProcessingOptimizer.applySettings) {
            const aiSettings = this.optimizationConfig.getSystemSettings('ai');
            this.aiProcessingOptimizer.applySettings(aiSettings);
        }
        
        // Update physics optimizer
        if (this.physicsOptimizer && this.physicsOptimizer.applySettings) {
            const physicsSettings = this.optimizationConfig.getSystemSettings('physics');
            this.physicsOptimizer.applySettings(physicsSettings);
        }
        
        // Update memory manager
        if (this.memoryManager && this.memoryManager.applySettings) {
            const memorySettings = this.optimizationConfig.getSystemSettings('memory');
            this.memoryManager.applySettings(memorySettings);
        }
    }
    
    /**
     * Initialize optimization subsystems
     */
    async initializeSubsystems() {
        // Note: Actual subsystem implementations will be created in subsequent tasks
        // For now, we'll create placeholder objects to establish the architecture
        
        console.log('Initializing optimization subsystems...');
        
        // Import and initialize the real AdaptiveQualityManager
        import('./AdaptiveQualityManager.js').then(module => {
            const { AdaptiveQualityManager } = module;
            this.adaptiveQualityManager = new AdaptiveQualityManager(null, null, this.scene);
            this.adaptiveQualityManager.initialize().then(() => {
                console.log('AdaptiveQualityManager integrated with PerformanceOptimizer');
            }).catch(error => {
                console.error('Failed to initialize AdaptiveQualityManager:', error);
            });
        }).catch(error => {
            console.error('Failed to load AdaptiveQualityManager:', error);
            // Fallback to placeholder
            this.adaptiveQualityManager = {
                initialized: false,
                currentQualityLevel: 75,
                initialize: async () => { this.adaptiveQualityManager.initialized = true; },
                setQualityLevel: (level) => { this.adaptiveQualityManager.currentQualityLevel = level; },
                adjustQualityForPerformance: (metrics) => { /* Placeholder */ },
                dispose: () => { this.adaptiveQualityManager.initialized = false; }
            };
        });
        
        // Rendering Optimizer (real implementation)
        import('./RenderingOptimizer.js').then(module => {
            const { RenderingOptimizer } = module;
            this.renderingOptimizer = new RenderingOptimizer(this.scene, this.scene.activeCamera, this.qualitySettings);
            this.renderingOptimizer.initialize().then(() => {
                console.log('RenderingOptimizer integrated with PerformanceOptimizer');
            }).catch(error => {
                console.error('Failed to initialize RenderingOptimizer:', error);
            });
        }).catch(error => {
            console.error('Failed to load RenderingOptimizer:', error);
            // Fallback to placeholder
            this.renderingOptimizer = {
                initialized: false,
                initialize: () => { this.renderingOptimizer.initialized = true; },
                updateOptimizations: (deltaTime) => { /* Implementation in task 4 */ },
                dispose: () => { this.renderingOptimizer.initialized = false; }
            };
        });
        
        // AI Processing Optimizer (placeholder)
        this.aiProcessingOptimizer = {
            initialized: false,
            initialize: () => { this.aiProcessingOptimizer.initialized = true; },
            updateOptimizations: (deltaTime) => { /* Implementation in task 5 */ },
            dispose: () => { this.aiProcessingOptimizer.initialized = false; }
        };
        
        // Physics Optimizer (placeholder)
        this.physicsOptimizer = {
            initialized: false,
            initialize: () => { this.physicsOptimizer.initialized = true; },
            updateOptimizations: (deltaTime) => { /* Implementation in task 6 */ },
            dispose: () => { this.physicsOptimizer.initialized = false; }
        };
        
        // Memory Manager (placeholder)
        this.memoryManager = {
            initialized: false,
            initialize: () => { this.memoryManager.initialized = true; },
            updateOptimizations: (deltaTime) => { /* Implementation in task 7 */ },
            dispose: () => { this.memoryManager.initialized = false; }
        };
        
        // Performance Degradation Detector (real implementation)
        import('./PerformanceDegradationDetector.js').then(module => {
            const { PerformanceDegradationDetector } = module;
            // Wait for adaptive quality manager to be available
            const initDegradationDetector = () => {
                if (this.adaptiveQualityManager && this.adaptiveQualityManager.initialized) {
                    this.degradationDetector = new PerformanceDegradationDetector(
                        this.performanceMonitor,
                        this.adaptiveQualityManager
                    );
                    this.degradationDetector.initialize().then(() => {
                        console.log('PerformanceDegradationDetector integrated with PerformanceOptimizer');
                        if (this.optimizationActive) {
                            this.degradationDetector.startDetection();
                        }
                    }).catch(error => {
                        console.error('Failed to initialize PerformanceDegradationDetector:', error);
                    });
                } else {
                    // Retry after a short delay
                    setTimeout(initDegradationDetector, 100);
                }
            };
            initDegradationDetector();
        }).catch(error => {
            console.error('Failed to load PerformanceDegradationDetector:', error);
            // Fallback to placeholder
            this.degradationDetector = {
                initialized: false,
                initialize: async () => { this.degradationDetector.initialized = true; },
                startDetection: () => { /* Placeholder */ },
                stopDetection: () => { /* Placeholder */ },
                dispose: () => { this.degradationDetector.initialized = false; }
            };
        });
        
        // Optimization Error Handler (real implementation)
        import('./OptimizationErrorHandler.js').then(module => {
            const { OptimizationErrorHandler } = module;
            this.errorHandler = new OptimizationErrorHandler(this);
            this.errorHandler.initialize().then(() => {
                console.log('OptimizationErrorHandler integrated with PerformanceOptimizer');
            }).catch(error => {
                console.error('Failed to initialize OptimizationErrorHandler:', error);
            });
        }).catch(error => {
            console.error('Failed to load OptimizationErrorHandler:', error);
            // Fallback to placeholder
            this.errorHandler = {
                initialized: false,
                initialize: async () => { this.errorHandler.initialized = true; },
                handleError: () => { /* Placeholder */ },
                dispose: () => { this.errorHandler.initialized = false; }
            };
        });
        
        // Initialize all subsystems
        if (this.config.enabledOptimizations.adaptiveQuality) {
            this.adaptiveQualityManager.initialize();
        }
        
        if (this.config.enabledOptimizations.rendering) {
            this.renderingOptimizer.initialize();
        }
        
        if (this.config.enabledOptimizations.aiProcessing) {
            this.aiProcessingOptimizer.initialize();
        }
        
        if (this.config.enabledOptimizations.physics) {
            this.physicsOptimizer.initialize();
        }
        
        if (this.config.enabledOptimizations.memory) {
            this.memoryManager.initialize();
        }
        
        // Degradation detector will be initialized asynchronously when dependencies are ready
        
        console.log('Optimization subsystems initialized');
    }
    
    /**
     * Set up performance monitoring integration
     */
    setupPerformanceMonitoringIntegration() {
        if (!this.performanceMonitor) {
            return;
        }
        
        console.log('Setting up performance monitoring integration...');
        
        // Register for performance metric updates
        this.performanceMonitor.onMetricsUpdate((metrics) => {
            this.onPerformanceMetricsUpdate(metrics);
        });
        
        // Register for performance alerts
        this.performanceMonitor.onAlert((alert) => {
            this.onPerformanceAlert(alert);
        });
        
        console.log('Performance monitoring integration complete');
    }
    
    /**
     * Set up optimization lifecycle
     */
    setupOptimizationLifecycle() {
        console.log('Setting up optimization lifecycle...');
        
        // The optimization lifecycle will be driven by the main update loop
        // This is integrated with VillageEngine's update cycle
        
        console.log('Optimization lifecycle setup complete');
    }
    
    /**
     * Start optimization system
     */
    startOptimization() {
        if (!this.initialized) {
            throw new Error('PerformanceOptimizer must be initialized before starting');
        }
        
        if (this.optimizationActive) {
            console.warn('Optimization already active');
            return;
        }
        
        console.log('Starting performance optimization...');
        
        this.optimizationActive = true;
        this.lastOptimizationTime = performance.now();
        
        // Start degradation detection if available
        if (this.degradationDetector && this.degradationDetector.initialized) {
            this.degradationDetector.startDetection();
        }
        
        // Notify callbacks
        this.notifyOptimizationCallbacks('started');
        
        console.log('Performance optimization started');
    }
    
    /**
     * Stop optimization system
     */
    stopOptimization() {
        if (!this.optimizationActive) {
            return;
        }
        
        console.log('Stopping performance optimization...');
        
        this.optimizationActive = false;
        
        // Stop degradation detection if active
        if (this.degradationDetector && this.degradationDetector.initialized) {
            this.degradationDetector.stopDetection();
        }
        
        // Notify callbacks
        this.notifyOptimizationCallbacks('stopped');
        
        console.log('Performance optimization stopped');
    }
    
    /**
     * Update optimization system - called each frame
     */
    updateOptimizations(deltaTime) {
        if (!this.initialized || !this.optimizationActive) {
            return;
        }
        
        const currentTime = performance.now();
        
        // Check if it's time for optimization update
        if (currentTime - this.lastOptimizationTime < this.optimizationInterval) {
            return;
        }
        
        try {
            // Update optimization subsystems
            this.updateSubsystems(deltaTime);
            
            // Update performance history
            this.updatePerformanceHistory();
            
            // Check for optimization opportunities
            this.checkOptimizationOpportunities();
            
            this.lastOptimizationTime = currentTime;
            
        } catch (error) {
            console.error('Error in optimization update:', error);
            
            // Report error to error handler
            if (this.errorHandler && this.errorHandler.initialized) {
                this.errorHandler.handleError('optimization_update_error', error, {
                    method: 'updateOptimizations',
                    deltaTime: deltaTime,
                    currentTime: currentTime
                });
            }
        }
    }
    
    /**
     * Update optimization subsystems
     */
    updateSubsystems(deltaTime) {
        // Update each enabled subsystem with error handling
        if (this.config.enabledOptimizations.rendering && this.renderingOptimizer && this.renderingOptimizer.initialized) {
            try {
                this.renderingOptimizer.updateOptimizations(deltaTime);
            } catch (error) {
                console.error('Error in rendering optimizer update:', error);
                if (this.errorHandler && this.errorHandler.initialized) {
                    this.errorHandler.handleError('rendering_optimizer_error', error, {
                        subsystem: 'rendering',
                        method: 'updateOptimizations'
                    });
                }
            }
        }
        
        if (this.config.enabledOptimizations.aiProcessing && this.aiProcessingOptimizer.initialized) {
            try {
                this.aiProcessingOptimizer.updateOptimizations(deltaTime);
            } catch (error) {
                console.error('Error in AI processing optimizer update:', error);
                if (this.errorHandler && this.errorHandler.initialized) {
                    this.errorHandler.handleError('ai_processing_optimizer_error', error, {
                        subsystem: 'aiProcessing',
                        method: 'updateOptimizations'
                    });
                }
            }
        }
        
        if (this.config.enabledOptimizations.physics && this.physicsOptimizer.initialized) {
            try {
                this.physicsOptimizer.updateOptimizations(deltaTime);
            } catch (error) {
                console.error('Error in physics optimizer update:', error);
                if (this.errorHandler && this.errorHandler.initialized) {
                    this.errorHandler.handleError('physics_optimizer_error', error, {
                        subsystem: 'physics',
                        method: 'updateOptimizations'
                    });
                }
            }
        }
        
        if (this.config.enabledOptimizations.memory && this.memoryManager.initialized) {
            try {
                this.memoryManager.updateOptimizations(deltaTime);
            } catch (error) {
                console.error('Error in memory manager update:', error);
                if (this.errorHandler && this.errorHandler.initialized) {
                    this.errorHandler.handleError('memory_manager_error', error, {
                        subsystem: 'memory',
                        method: 'updateOptimizations'
                    });
                }
            }
        }
    }
    
    /**
     * Update performance history
     */
    updatePerformanceHistory() {
        if (!this.performanceMonitor) {
            return;
        }
        
        const currentMetrics = this.performanceMonitor.getCurrentMetrics();
        if (currentMetrics) {
            this.performanceHistory.push({
                timestamp: performance.now(),
                fps: currentMetrics.frameRate?.current || 0,
                frameTime: currentMetrics.frameRate?.frameTime || 0,
                memory: currentMetrics.memory?.used || 0
            });
            
            // Maintain history size
            if (this.performanceHistory.length > this.maxHistorySize) {
                this.performanceHistory.shift();
            }
        }
    }
    
    /**
     * Check for optimization opportunities
     */
    checkOptimizationOpportunities() {
        if (this.performanceHistory.length < 5) {
            return; // Need some history to make decisions
        }
        
        const recentMetrics = this.performanceHistory.slice(-5);
        const avgFPS = recentMetrics.reduce((sum, m) => sum + m.fps, 0) / recentMetrics.length;
        const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory, 0) / recentMetrics.length;
        
        const thresholds = this.config.optimizationThresholds[this.optimizationLevel];
        
        // Check if FPS is below target
        if (avgFPS < this.targetFPS - thresholds.fpsDropThreshold) {
            this.triggerPerformanceOptimization('low_fps', { avgFPS, targetFPS: this.targetFPS });
        }
        
        // Check memory usage
        if (avgMemory > thresholds.memoryThreshold) {
            this.triggerPerformanceOptimization('high_memory', { avgMemory, threshold: thresholds.memoryThreshold });
        }
    }
    
    /**
     * Trigger performance optimization
     */
    triggerPerformanceOptimization(reason, data) {
        console.log(`Triggering optimization for: ${reason}`, data);
        
        // This will be expanded in subsequent tasks to actually perform optimizations
        if (this.adaptiveQualityEnabled && this.adaptiveQualityManager.initialized) {
            // Reduce quality level slightly
            const currentLevel = this.adaptiveQualityManager.currentQualityLevel;
            const newLevel = Math.max(25, currentLevel - 10);
            this.adaptiveQualityManager.setQualityLevel(newLevel);
            
            console.log(`Reduced quality level from ${currentLevel} to ${newLevel}`);
        }
        
        // Notify callbacks
        this.notifyOptimizationCallbacks('optimization_triggered', { reason, data });
    }
    
    /**
     * Handle performance metrics updates
     */
    onPerformanceMetricsUpdate(metrics) {
        // This method will be called by the PerformanceMonitor
        // We can use this to make real-time optimization decisions
        
        if (this.adaptiveQualityEnabled && this.adaptiveQualityManager.initialized) {
            this.adaptiveQualityManager.adjustQualityForPerformance(metrics);
        }
    }
    
    /**
     * Handle performance alerts
     */
    onPerformanceAlert(alert) {
        console.log('Performance alert received:', alert);
        
        // Respond to critical alerts immediately
        if (alert.severity === 'critical') {
            this.triggerPerformanceOptimization('critical_alert', alert);
        }
        
        // Notify alert callbacks
        this.notifyAlertCallbacks(alert);
    }
    
    /**
     * Set optimization level
     */
    setOptimizationLevel(level) {
        const validLevels = ['conservative', 'balanced', 'aggressive'];
        if (!validLevels.includes(level)) {
            throw new Error(`Invalid optimization level: ${level}. Must be one of: ${validLevels.join(', ')}`);
        }
        
        this.optimizationLevel = level;
        console.log(`Optimization level set to: ${level}`);
        
        // Notify callbacks
        this.notifyOptimizationCallbacks('level_changed', { level });
    }
    
    /**
     * Set target FPS
     */
    setTargetFPS(fps) {
        if (fps < 15 || fps > 120) {
            throw new Error('Target FPS must be between 15 and 120');
        }
        
        this.targetFPS = fps;
        this.config.performanceTargets.targetFPS = fps;
        this.config.performanceTargets.maxFrameTime = 1000 / fps;
        
        console.log(`Target FPS set to: ${fps}`);
        
        // Notify callbacks
        this.notifyOptimizationCallbacks('target_fps_changed', { fps });
    }
    
    /**
     * Enable or disable adaptive quality
     */
    enableAdaptiveQuality(enabled) {
        this.adaptiveQualityEnabled = enabled;
        console.log(`Adaptive quality ${enabled ? 'enabled' : 'disabled'}`);
        
        // Notify callbacks
        this.notifyOptimizationCallbacks('adaptive_quality_changed', { enabled });
    }
    
    /**
     * Get optimization status
     */
    getOptimizationStatus() {
        return {
            initialized: this.initialized,
            active: this.optimizationActive,
            level: this.optimizationLevel,
            targetFPS: this.targetFPS,
            adaptiveQualityEnabled: this.adaptiveQualityEnabled,
            subsystems: {
                adaptiveQuality: this.adaptiveQualityManager?.initialized || false,
                rendering: this.renderingOptimizer?.initialized || false,
                aiProcessing: this.aiProcessingOptimizer?.initialized || false,
                physics: this.physicsOptimizer?.initialized || false,
                memory: this.memoryManager?.initialized || false,
                degradationDetector: this.degradationDetector?.initialized || false,
                errorHandler: this.errorHandler?.initialized || false
            },
            currentQualityLevel: this.adaptiveQualityManager?.currentQualityLevel || 0,
            performanceHistory: this.performanceHistory.slice(-10), // Last 10 entries
            config: this.config,
            hasConfiguration: !!this.optimizationConfig,
            hasSettingsUI: !!this.settingsUI
        };
    }
    
    /**
     * Get optimization configuration
     * @returns {OptimizationConfig|null} Configuration instance
     */
    getOptimizationConfig() {
        return this.optimizationConfig;
    }
    
    /**
     * Get settings UI
     * @returns {OptimizationSettingsUI|null} Settings UI instance
     */
    getSettingsUI() {
        return this.settingsUI;
    }
    
    /**
     * Show optimization settings UI
     */
    showSettings() {
        if (this.settingsUI) {
            this.settingsUI.show();
        } else {
            console.warn('Settings UI not available');
        }
    }
    
    /**
     * Hide optimization settings UI
     */
    hideSettings() {
        if (this.settingsUI) {
            this.settingsUI.hide();
        }
    }
    
    /**
     * Toggle optimization settings UI
     */
    toggleSettings() {
        if (this.settingsUI) {
            this.settingsUI.toggle();
        } else {
            console.warn('Settings UI not available');
        }
    }
    
    /**
     * Get error handler
     * @returns {OptimizationErrorHandler|null} Error handler instance
     */
    getErrorHandler() {
        return this.errorHandler;
    }
    
    /**
     * Get degradation detector
     * @returns {PerformanceDegradationDetector|null} Degradation detector instance
     */
    getDegradationDetector() {
        return this.degradationDetector;
    }
    
    /**
     * Check if system is in safe mode
     * @returns {boolean} True if in safe mode
     */
    isInSafeMode() {
        return this.errorHandler?.safeModeActive || false;
    }
    
    /**
     * Get failed systems list
     * @returns {string[]} Array of failed system names
     */
    getFailedSystems() {
        return this.errorHandler?.getStatus()?.failedSystems || [];
    }
    
    /**
     * Manually trigger safe mode
     * @param {string} reason - Reason for activating safe mode
     */
    activateSafeMode(reason = 'manual_activation') {
        if (this.errorHandler && this.errorHandler.initialized) {
            this.errorHandler.activateSafeMode(reason);
        } else {
            console.warn('Error handler not available for safe mode activation');
        }
    }
    
    /**
     * Manually exit safe mode
     */
    exitSafeMode() {
        if (this.errorHandler && this.errorHandler.initialized) {
            this.errorHandler.exitSafeMode();
        } else {
            console.warn('Error handler not available for safe mode exit');
        }
    }
    
    /**
     * Register optimization callback
     */
    onOptimization(callback) {
        if (typeof callback === 'function') {
            this.optimizationCallbacks.push(callback);
        }
    }
    
    /**
     * Remove optimization callback
     */
    removeOptimizationCallback(callback) {
        const index = this.optimizationCallbacks.indexOf(callback);
        if (index > -1) {
            this.optimizationCallbacks.splice(index, 1);
        }
    }
    
    /**
     * Register alert callback
     */
    onAlert(callback) {
        if (typeof callback === 'function') {
            this.alertCallbacks.push(callback);
        }
    }
    
    /**
     * Remove alert callback
     */
    removeAlertCallback(callback) {
        const index = this.alertCallbacks.indexOf(callback);
        if (index > -1) {
            this.alertCallbacks.splice(index, 1);
        }
    }
    
    /**
     * Notify optimization callbacks
     */
    notifyOptimizationCallbacks(event, data = null) {
        this.optimizationCallbacks.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in optimization callback:', error);
            }
        });
    }
    
    /**
     * Notify alert callbacks
     */
    notifyAlertCallbacks(alert) {
        this.alertCallbacks.forEach(callback => {
            try {
                callback(alert);
            } catch (error) {
                console.error('Error in alert callback:', error);
            }
        });
    }
    
    /**
     * Dispose of the performance optimizer
     */
    dispose() {
        console.log('Disposing PerformanceOptimizer...');
        
        // Stop optimization
        this.stopOptimization();
        
        // Dispose settings UI
        if (this.settingsUI) {
            this.settingsUI.dispose();
            this.settingsUI = null;
        }
        
        // Dispose configuration
        if (this.optimizationConfig) {
            this.optimizationConfig.dispose();
            this.optimizationConfig = null;
        }
        
        // Dispose subsystems
        if (this.adaptiveQualityManager) {
            this.adaptiveQualityManager.dispose();
            this.adaptiveQualityManager = null;
        }
        
        if (this.renderingOptimizer) {
            this.renderingOptimizer.dispose();
            this.renderingOptimizer = null;
        }
        
        if (this.aiProcessingOptimizer) {
            this.aiProcessingOptimizer.dispose();
            this.aiProcessingOptimizer = null;
        }
        
        if (this.physicsOptimizer) {
            this.physicsOptimizer.dispose();
            this.physicsOptimizer = null;
        }
        
        if (this.memoryManager) {
            this.memoryManager.dispose();
            this.memoryManager = null;
        }
        
        if (this.degradationDetector) {
            this.degradationDetector.dispose();
            this.degradationDetector = null;
        }
        
        if (this.errorHandler) {
            this.errorHandler.dispose();
            this.errorHandler = null;
        }
        
        // Clear callbacks and history
        this.optimizationCallbacks = [];
        this.alertCallbacks = [];
        this.performanceHistory = [];
        
        this.initialized = false;
        
        console.log('PerformanceOptimizer disposed');
    }
}