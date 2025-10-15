/**
 * OptimizationErrorHandler - Handles errors and provides fallbacks for optimization systems
 * 
 * This class provides:
 * - Fallback mechanisms when optimization features fail
 * - Error logging and reporting for optimization issues
 * - Safe mode operation when optimization systems are unavailable
 * - Recovery strategies for different types of failures
 */

export class OptimizationErrorHandler {
    constructor(performanceOptimizer) {
        this.performanceOptimizer = performanceOptimizer;
        
        // Error handling state
        this.initialized = false;
        this.safeModeActive = false;
        this.failedSystems = new Set();
        this.errorHistory = [];
        this.maxErrorHistorySize = 100;
        
        // Error thresholds
        this.errorThresholds = {
            maxErrorsPerMinute: 10,
            maxConsecutiveErrors: 5,
            criticalErrorTypes: ['memory_leak', 'gpu_crash', 'system_freeze'],
            safeModeTimeout: 30000 // 30 seconds
        };
        
        // Fallback configurations
        this.fallbackConfigs = {
            adaptiveQuality: {
                enabled: true,
                fallbackLevel: 50, // Medium quality
                disableDynamicAdjustment: true
            },
            rendering: {
                enabled: true,
                disableLOD: false,
                disableCulling: false,
                disableInstancing: true,
                fallbackDrawCalls: 100
            },
            aiProcessing: {
                enabled: true,
                maxAgents: 20,
                reducedUpdateFrequency: 0.5,
                disableComplexBehaviors: true
            },
            physics: {
                enabled: true,
                reducedAccuracy: true,
                maxBodies: 50,
                disableComplexCollisions: true
            },
            memory: {
                enabled: true,
                aggressiveCleanup: true,
                disablePooling: false,
                reducedCacheSize: true
            }
        };
        
        // Safe mode configuration
        this.safeModeConfig = {
            qualityLevel: 25,
            maxActiveAgents: 10,
            disableEffects: true,
            disablePhysicsOptimization: true,
            disableRenderingOptimization: true,
            enableBasicFunctionality: true,
            logAllOperations: true
        };
        
        // Error recovery strategies
        this.recoveryStrategies = {
            'initialization_failure': this.handleInitializationFailure.bind(this),
            'runtime_error': this.handleRuntimeError.bind(this),
            'memory_error': this.handleMemoryError.bind(this),
            'gpu_error': this.handleGPUError.bind(this),
            'performance_crash': this.handlePerformanceCrash.bind(this),
            'system_overload': this.handleSystemOverload.bind(this)
        };
        
        // Callbacks
        this.errorCallbacks = [];
        this.safeModeCallbacks = [];
        this.recoveryCallbacks = [];
        
        console.log('OptimizationErrorHandler initialized');
    }
    
    /**
     * Initialize the error handler
     */
    async initialize() {
        if (this.initialized) {
            console.warn('OptimizationErrorHandler already initialized');
            return;
        }
        
        try {
            console.log('Initializing OptimizationErrorHandler...');
            
            // Set up global error handling
            this.setupGlobalErrorHandling();
            
            // Set up system monitoring
            this.setupSystemMonitoring();
            
            // Initialize error tracking
            this.initializeErrorTracking();
            
            this.initialized = true;
            console.log('OptimizationErrorHandler initialization complete');
            
        } catch (error) {
            console.error('Failed to initialize OptimizationErrorHandler:', error);
            // Don't throw - error handler should always work
            this.initialized = true; // Mark as initialized to prevent retry loops
        }
    }
    
    /**
     * Set up global error handling
     */
    setupGlobalErrorHandling() {
        // Wrap console.error to capture optimization-related errors
        const originalConsoleError = console.error;
        console.error = (...args) => {
            // Check if this is an optimization-related error
            const errorMessage = args.join(' ');
            if (this.isOptimizationError(errorMessage)) {
                this.handleError('console_error', new Error(errorMessage), {
                    source: 'console',
                    args: args
                });
            }
            originalConsoleError.apply(console, args);
        };
        
        // Set up unhandled promise rejection handling
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                if (this.isOptimizationError(event.reason?.message || event.reason)) {
                    this.handleError('unhandled_promise_rejection', event.reason, {
                        source: 'promise',
                        event: event
                    });
                }
            });
        }
        
        console.log('Global error handling set up');
    }
    
    /**
     * Set up system monitoring
     */
    setupSystemMonitoring() {
        // Monitor performance optimizer health
        if (this.performanceOptimizer) {
            // Wrap critical methods with error handling
            this.wrapMethodWithErrorHandling(
                this.performanceOptimizer,
                'updateOptimizations',
                'performance_optimizer_update'
            );
            
            this.wrapMethodWithErrorHandling(
                this.performanceOptimizer,
                'startOptimization',
                'performance_optimizer_start'
            );
        }
        
        console.log('System monitoring set up');
    }
    
    /**
     * Initialize error tracking
     */
    initializeErrorTracking() {
        this.errorHistory = [];
        this.failedSystems.clear();
        this.safeModeActive = false;
    }
    
    /**
     * Check if an error is optimization-related
     */
    isOptimizationError(errorMessage) {
        if (!errorMessage) return false;
        
        const optimizationKeywords = [
            'optimization', 'performance', 'quality', 'rendering', 'lod', 'culling',
            'instancing', 'agent', 'physics', 'memory', 'degradation', 'adaptive'
        ];
        
        const message = errorMessage.toString().toLowerCase();
        return optimizationKeywords.some(keyword => message.includes(keyword));
    }
    
    /**
     * Wrap a method with error handling
     */
    wrapMethodWithErrorHandling(object, methodName, errorType) {
        if (!object || !object[methodName]) {
            return;
        }
        
        const originalMethod = object[methodName];
        object[methodName] = (...args) => {
            try {
                const result = originalMethod.apply(object, args);
                
                // Handle promises
                if (result && typeof result.catch === 'function') {
                    return result.catch(error => {
                        this.handleError(errorType, error, {
                            method: methodName,
                            args: args
                        });
                        throw error; // Re-throw to maintain original behavior
                    });
                }
                
                return result;
            } catch (error) {
                this.handleError(errorType, error, {
                    method: methodName,
                    args: args
                });
                throw error; // Re-throw to maintain original behavior
            }
        };
    }
    
    /**
     * Handle an error
     */
    handleError(errorType, error, context = {}) {
        const currentTime = performance.now();
        
        // Create error record
        const errorRecord = {
            timestamp: currentTime,
            type: errorType,
            error: error,
            message: error?.message || error?.toString() || 'Unknown error',
            stack: error?.stack,
            context: context,
            severity: this.determineErrorSeverity(errorType, error),
            handled: false
        };
        
        // Add to error history
        this.errorHistory.push(errorRecord);
        
        // Maintain history size
        if (this.errorHistory.length > this.maxErrorHistorySize) {
            this.errorHistory.shift();
        }
        
        console.error(`Optimization error [${errorType}]:`, error, context);
        
        // Determine if this requires immediate action
        const requiresAction = this.shouldTakeAction(errorRecord);
        
        if (requiresAction) {
            this.executeErrorResponse(errorRecord);
        }
        
        // Notify callbacks
        this.notifyErrorCallbacks(errorRecord);
        
        // Mark as handled
        errorRecord.handled = true;
    }
    
    /**
     * Determine error severity
     */
    determineErrorSeverity(errorType, error) {
        const message = error?.message?.toLowerCase() || '';
        
        // Critical errors
        if (this.errorThresholds.criticalErrorTypes.some(type => 
            errorType.includes(type) || message.includes(type))) {
            return 'critical';
        }
        
        // High severity errors
        if (errorType.includes('crash') || errorType.includes('freeze') || 
            message.includes('out of memory') || message.includes('gpu')) {
            return 'high';
        }
        
        // Medium severity errors
        if (errorType.includes('performance') || errorType.includes('optimization') ||
            message.includes('failed') || message.includes('timeout')) {
            return 'medium';
        }
        
        // Low severity errors
        return 'low';
    }
    
    /**
     * Determine if error requires immediate action
     */
    shouldTakeAction(errorRecord) {
        // Always act on critical errors
        if (errorRecord.severity === 'critical') {
            return true;
        }
        
        // Check error frequency
        const recentErrors = this.getRecentErrors(60000); // Last minute
        if (recentErrors.length >= this.errorThresholds.maxErrorsPerMinute) {
            return true;
        }
        
        // Check consecutive errors
        const consecutiveErrors = this.getConsecutiveErrors();
        if (consecutiveErrors >= this.errorThresholds.maxConsecutiveErrors) {
            return true;
        }
        
        // Check if system is already failing
        if (this.failedSystems.size > 0 && errorRecord.severity !== 'low') {
            return true;
        }
        
        return false;
    }
    
    /**
     * Execute error response
     */
    executeErrorResponse(errorRecord) {
        console.warn(`Executing error response for: ${errorRecord.type} (severity: ${errorRecord.severity})`);
        
        // Try specific recovery strategy first
        const strategy = this.recoveryStrategies[errorRecord.type];
        if (strategy) {
            try {
                strategy(errorRecord);
                return;
            } catch (recoveryError) {
                console.error('Recovery strategy failed:', recoveryError);
            }
        }
        
        // Fall back to general response based on severity
        switch (errorRecord.severity) {
            case 'critical':
                this.activateSafeMode('critical_error');
                break;
                
            case 'high':
                this.applySystemFallbacks(errorRecord);
                break;
                
            case 'medium':
                this.applyPartialFallbacks(errorRecord);
                break;
                
            case 'low':
                this.logErrorForAnalysis(errorRecord);
                break;
        }
    }
    
    /**
     * Activate safe mode
     */
    activateSafeMode(reason) {
        if (this.safeModeActive) {
            console.warn('Safe mode already active');
            return;
        }
        
        console.warn(`Activating safe mode due to: ${reason}`);
        
        this.safeModeActive = true;
        
        // Store current state for potential restoration
        this.preeSafeModeState = this.captureCurrentState();
        
        // Apply safe mode configuration
        this.applySafeModeConfiguration();
        
        // Set timeout for automatic safe mode exit
        setTimeout(() => {
            if (this.safeModeActive) {
                this.attemptSafeModeExit();
            }
        }, this.errorThresholds.safeModeTimeout);
        
        // Notify callbacks
        this.notifySafeModeCallbacks('activated', { reason });
        
        console.warn('Safe mode activated');
    }
    
    /**
     * Apply safe mode configuration
     */
    applySafeModeConfiguration() {
        try {
            // Disable all optimization systems
            if (this.performanceOptimizer) {
                this.performanceOptimizer.stopOptimization();
                
                // Apply minimal quality settings
                if (this.performanceOptimizer.adaptiveQualityManager) {
                    this.performanceOptimizer.adaptiveQualityManager.setQualityLevel(
                        this.safeModeConfig.qualityLevel,
                        false
                    );
                    this.performanceOptimizer.adaptiveQualityManager.enableDynamicAdjustment(false);
                }
            }
            
            console.log('Safe mode configuration applied');
            
        } catch (error) {
            console.error('Failed to apply safe mode configuration:', error);
        }
    }
    
    /**
     * Attempt to exit safe mode
     */
    attemptSafeModeExit() {
        if (!this.safeModeActive) {
            return;
        }
        
        console.log('Attempting to exit safe mode...');
        
        // Check if recent errors have subsided
        const recentErrors = this.getRecentErrors(30000); // Last 30 seconds
        if (recentErrors.length > 0) {
            console.log('Recent errors detected, extending safe mode');
            setTimeout(() => this.attemptSafeModeExit(), this.errorThresholds.safeModeTimeout);
            return;
        }
        
        // Exit safe mode
        this.exitSafeMode();
    }
    
    /**
     * Exit safe mode
     */
    exitSafeMode() {
        if (!this.safeModeActive) {
            return;
        }
        
        console.log('Exiting safe mode');
        
        this.safeModeActive = false;
        
        try {
            // Restore basic optimization functionality
            if (this.performanceOptimizer) {
                // Re-enable adaptive quality with conservative settings
                if (this.performanceOptimizer.adaptiveQualityManager) {
                    this.performanceOptimizer.adaptiveQualityManager.setQualityLevel(50, true);
                    this.performanceOptimizer.adaptiveQualityManager.enableDynamicAdjustment(true);
                }
                
                // Restart optimization with conservative settings
                this.performanceOptimizer.setOptimizationLevel('conservative');
                this.performanceOptimizer.startOptimization();
            }
            
        } catch (error) {
            console.error('Error during safe mode exit:', error);
            // Stay in safe mode if restoration fails
            this.safeModeActive = true;
            return;
        }
        
        // Clear failed systems list
        this.failedSystems.clear();
        
        // Notify callbacks
        this.notifySafeModeCallbacks('deactivated', {});
        
        console.log('Safe mode exited successfully');
    }
    
    /**
     * Apply system fallbacks
     */
    applySystemFallbacks(errorRecord) {
        console.log('Applying system fallbacks for error:', errorRecord.type);
        
        // Determine which system failed
        const failedSystem = this.identifyFailedSystem(errorRecord);
        
        if (failedSystem) {
            this.failedSystems.add(failedSystem);
            this.applySystemSpecificFallback(failedSystem);
        } else {
            // Apply general fallbacks
            this.applyGeneralFallbacks();
        }
    }
    
    /**
     * Apply partial fallbacks
     */
    applyPartialFallbacks(errorRecord) {
        console.log('Applying partial fallbacks for error:', errorRecord.type);
        
        // Apply less aggressive fallbacks
        if (this.performanceOptimizer?.adaptiveQualityManager) {
            const currentLevel = this.performanceOptimizer.adaptiveQualityManager.getCurrentQualityLevel();
            const newLevel = Math.max(25, currentLevel - 10);
            this.performanceOptimizer.adaptiveQualityManager.setQualityLevel(newLevel, true);
        }
    }
    
    /**
     * Identify failed system from error record
     */
    identifyFailedSystem(errorRecord) {
        const context = errorRecord.context || {};
        const message = errorRecord.message.toLowerCase();
        
        if (message.includes('rendering') || message.includes('lod') || message.includes('culling')) {
            return 'rendering';
        }
        
        if (message.includes('agent') || message.includes('ai') || message.includes('behavior')) {
            return 'aiProcessing';
        }
        
        if (message.includes('physics') || message.includes('collision')) {
            return 'physics';
        }
        
        if (message.includes('memory') || message.includes('pool')) {
            return 'memory';
        }
        
        if (message.includes('quality') || message.includes('adaptive')) {
            return 'adaptiveQuality';
        }
        
        return null;
    }
    
    /**
     * Apply system-specific fallback
     */
    applySystemSpecificFallback(systemName) {
        const fallbackConfig = this.fallbackConfigs[systemName];
        if (!fallbackConfig || !fallbackConfig.enabled) {
            return;
        }
        
        console.log(`Applying fallback for system: ${systemName}`);
        
        try {
            switch (systemName) {
                case 'rendering':
                    this.applyRenderingFallback(fallbackConfig);
                    break;
                case 'aiProcessing':
                    this.applyAIProcessingFallback(fallbackConfig);
                    break;
                case 'physics':
                    this.applyPhysicsFallback(fallbackConfig);
                    break;
                case 'memory':
                    this.applyMemoryFallback(fallbackConfig);
                    break;
                case 'adaptiveQuality':
                    this.applyAdaptiveQualityFallback(fallbackConfig);
                    break;
            }
            
        } catch (error) {
            console.error(`Failed to apply fallback for ${systemName}:`, error);
        }
    }
    
    /**
     * Apply rendering fallback
     */
    applyRenderingFallback(config) {
        // Disable problematic rendering optimizations
        if (config.disableInstancing && this.performanceOptimizer?.renderingOptimizer) {
            // Disable instancing if available
            console.log('Disabling rendering instancing due to fallback');
        }
        
        // Reduce draw call limit
        if (config.fallbackDrawCalls) {
            console.log(`Reducing draw call limit to ${config.fallbackDrawCalls}`);
        }
    }
    
    /**
     * Apply AI processing fallback
     */
    applyAIProcessingFallback(config) {
        // Reduce agent count and complexity
        console.log(`Applying AI processing fallback: max agents ${config.maxAgents}, frequency ${config.reducedUpdateFrequency}`);
    }
    
    /**
     * Apply physics fallback
     */
    applyPhysicsFallback(config) {
        // Reduce physics complexity
        console.log(`Applying physics fallback: max bodies ${config.maxBodies}, reduced accuracy ${config.reducedAccuracy}`);
    }
    
    /**
     * Apply memory fallback
     */
    applyMemoryFallback(config) {
        // Enable aggressive cleanup
        if (config.aggressiveCleanup) {
            console.log('Enabling aggressive memory cleanup');
        }
    }
    
    /**
     * Apply adaptive quality fallback
     */
    applyAdaptiveQualityFallback(config) {
        if (this.performanceOptimizer?.adaptiveQualityManager) {
            this.performanceOptimizer.adaptiveQualityManager.setQualityLevel(config.fallbackLevel, false);
            
            if (config.disableDynamicAdjustment) {
                this.performanceOptimizer.adaptiveQualityManager.enableDynamicAdjustment(false);
            }
        }
    }
    
    /**
     * Apply general fallbacks
     */
    applyGeneralFallbacks() {
        console.log('Applying general optimization fallbacks');
        
        // Reduce overall optimization aggressiveness
        if (this.performanceOptimizer) {
            this.performanceOptimizer.setOptimizationLevel('conservative');
        }
    }
    
    /**
     * Specific error handlers
     */
    handleInitializationFailure(errorRecord) {
        console.warn('Handling initialization failure');
        
        // Try to reinitialize with fallback configuration
        setTimeout(() => {
            this.attemptSystemReinitialize(errorRecord.context?.system);
        }, 2000);
    }
    
    handleRuntimeError(errorRecord) {
        console.warn('Handling runtime error');
        
        // Apply system-specific fallbacks
        this.applySystemFallbacks(errorRecord);
    }
    
    handleMemoryError(errorRecord) {
        console.warn('Handling memory error');
        
        // Trigger aggressive memory cleanup
        if (this.performanceOptimizer?.memoryManager) {
            console.log('Triggering emergency memory cleanup');
        }
        
        // Reduce quality to free memory
        if (this.performanceOptimizer?.adaptiveQualityManager) {
            const currentLevel = this.performanceOptimizer.adaptiveQualityManager.getCurrentQualityLevel();
            const newLevel = Math.max(15, currentLevel - 20);
            this.performanceOptimizer.adaptiveQualityManager.setQualityLevel(newLevel, false);
        }
    }
    
    handleGPUError(errorRecord) {
        console.warn('Handling GPU error');
        
        // Disable GPU-intensive optimizations
        this.failedSystems.add('rendering');
        this.applySystemSpecificFallback('rendering');
    }
    
    handlePerformanceCrash(errorRecord) {
        console.warn('Handling performance crash');
        
        // Activate safe mode immediately
        this.activateSafeMode('performance_crash');
    }
    
    handleSystemOverload(errorRecord) {
        console.warn('Handling system overload');
        
        // Reduce all optimization levels
        if (this.performanceOptimizer?.adaptiveQualityManager) {
            this.performanceOptimizer.adaptiveQualityManager.setQualityLevel(25, false);
        }
    }
    
    /**
     * Attempt to reinitialize a system
     */
    attemptSystemReinitialize(systemName) {
        if (!systemName || !this.performanceOptimizer) {
            return;
        }
        
        console.log(`Attempting to reinitialize system: ${systemName}`);
        
        try {
            const system = this.performanceOptimizer[systemName];
            if (system && typeof system.initialize === 'function') {
                system.initialize().then(() => {
                    console.log(`Successfully reinitialized ${systemName}`);
                    this.failedSystems.delete(systemName);
                }).catch(error => {
                    console.error(`Failed to reinitialize ${systemName}:`, error);
                });
            }
        } catch (error) {
            console.error(`Error during ${systemName} reinitialization:`, error);
        }
    }
    
    /**
     * Capture current state for restoration
     */
    captureCurrentState() {
        const state = {
            timestamp: performance.now(),
            optimizationActive: this.performanceOptimizer?.optimizationActive || false,
            optimizationLevel: this.performanceOptimizer?.optimizationLevel || 'balanced',
            qualityLevel: this.performanceOptimizer?.adaptiveQualityManager?.getCurrentQualityLevel() || 50
        };
        
        return state;
    }
    
    /**
     * Get recent errors
     */
    getRecentErrors(timeWindow) {
        const currentTime = performance.now();
        return this.errorHistory.filter(error => 
            currentTime - error.timestamp <= timeWindow
        );
    }
    
    /**
     * Get consecutive errors
     */
    getConsecutiveErrors() {
        let consecutive = 0;
        for (let i = this.errorHistory.length - 1; i >= 0; i--) {
            if (this.errorHistory[i].severity !== 'low') {
                consecutive++;
            } else {
                break;
            }
        }
        return consecutive;
    }
    
    /**
     * Log error for analysis
     */
    logErrorForAnalysis(errorRecord) {
        // This could be extended to send to analytics service
        console.log('Error logged for analysis:', {
            type: errorRecord.type,
            message: errorRecord.message,
            timestamp: errorRecord.timestamp
        });
    }
    
    /**
     * Get error handler status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            safeModeActive: this.safeModeActive,
            failedSystems: Array.from(this.failedSystems),
            errorCount: this.errorHistory.length,
            recentErrorCount: this.getRecentErrors(60000).length,
            consecutiveErrors: this.getConsecutiveErrors(),
            errorThresholds: this.errorThresholds,
            fallbackConfigs: this.fallbackConfigs
        };
    }
    
    /**
     * Get error history
     */
    getErrorHistory(count = 10) {
        return this.errorHistory.slice(-count);
    }
    
    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.errorHistory = [];
        console.log('Error history cleared');
    }
    
    /**
     * Update error thresholds
     */
    updateErrorThresholds(newThresholds) {
        this.errorThresholds = { ...this.errorThresholds, ...newThresholds };
        console.log('Error thresholds updated:', this.errorThresholds);
    }
    
    /**
     * Update fallback configurations
     */
    updateFallbackConfigs(newConfigs) {
        this.fallbackConfigs = { ...this.fallbackConfigs, ...newConfigs };
        console.log('Fallback configurations updated');
    }
    
    /**
     * Register error callback
     */
    onError(callback) {
        if (typeof callback === 'function') {
            this.errorCallbacks.push(callback);
        }
    }
    
    /**
     * Register safe mode callback
     */
    onSafeMode(callback) {
        if (typeof callback === 'function') {
            this.safeModeCallbacks.push(callback);
        }
    }
    
    /**
     * Register recovery callback
     */
    onRecovery(callback) {
        if (typeof callback === 'function') {
            this.recoveryCallbacks.push(callback);
        }
    }
    
    /**
     * Notify error callbacks
     */
    notifyErrorCallbacks(errorRecord) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(errorRecord);
            } catch (error) {
                console.error('Error in error callback:', error);
            }
        });
    }
    
    /**
     * Notify safe mode callbacks
     */
    notifySafeModeCallbacks(event, data) {
        this.safeModeCallbacks.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in safe mode callback:', error);
            }
        });
    }
    
    /**
     * Notify recovery callbacks
     */
    notifyRecoveryCallbacks(event) {
        this.recoveryCallbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Error in recovery callback:', error);
            }
        });
    }
    
    /**
     * Dispose of the error handler
     */
    dispose() {
        console.log('Disposing OptimizationErrorHandler...');
        
        // Exit safe mode if active
        if (this.safeModeActive) {
            this.exitSafeMode();
        }
        
        // Clear callbacks and data
        this.errorCallbacks = [];
        this.safeModeCallbacks = [];
        this.recoveryCallbacks = [];
        this.errorHistory = [];
        this.failedSystems.clear();
        
        this.initialized = false;
        
        console.log('OptimizationErrorHandler disposed');
    }
}