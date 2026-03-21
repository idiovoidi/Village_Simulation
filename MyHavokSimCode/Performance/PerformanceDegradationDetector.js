/**
 * PerformanceDegradationDetector - Detects performance degradation and triggers recovery
 *
 * This class provides:
 * - Automatic quality reduction when performance drops below thresholds
 * - Emergency mode with minimal settings for critical performance issues
 * - Gradual quality recovery when performance improves
 * - Performance trend analysis and prediction
 */

export class PerformanceDegradationDetector {
    constructor(performanceMonitor, adaptiveQualityManager) {
        this.performanceMonitor = performanceMonitor;
        this.adaptiveQualityManager = adaptiveQualityManager;

        // Detection state
        this.initialized = false;
        this.detectionActive = false;
        this.emergencyModeActive = false;
        this.lastRecoveryAttempt = 0;

        // Performance thresholds
        this.thresholds = {
            // Critical thresholds that trigger emergency mode
            critical: {
                minFPS: 15,
                maxFrameTime: 66.67, // 15 FPS = 66.67ms
                maxMemoryUsage: 95, // Percentage
                maxConsecutiveDrops: 3
            },
            // Warning thresholds that trigger quality reduction
            warning: {
                minFPS: 25,
                maxFrameTime: 40, // 25 FPS = 40ms
                maxMemoryUsage: 85, // Percentage
                maxConsecutiveDrops: 5
            },
            // Recovery thresholds for quality improvement
            recovery: {
                minFPS: 45,
                maxFrameTime: 22.22, // 45 FPS = 22.22ms
                maxMemoryUsage: 70, // Percentage
                minStablePeriod: 10000 // 10 seconds of stable performance
            }
        };

        // Performance tracking
        this.performanceHistory = [];
        this.maxHistorySize = 60; // 60 samples (1 minute at 1 sample/second)
        this.consecutiveDrops = 0;
        this.lastStableTime = 0;
        this.degradationEvents = [];
        this.recoveryEvents = [];

        // Emergency mode settings
        this.emergencySettings = {
            qualityLevel: 10, // Minimal quality
            maxActiveAgents: 5,
            disableEffects: true,
            disablePhysics: false, // Keep basic physics
            disableShadows: true,
            disableParticles: true,
            lodDistance: 25,
            maxDrawCalls: 50
        };

        // Recovery settings
        this.recoverySettings = {
            cooldownPeriod: 5000, // 5 seconds between recovery attempts
            gradualRecoveryStep: 5, // Quality level increase per recovery step
            maxRecoveryLevel: 75, // Don't auto-recover beyond this level
            stabilityRequirement: 8000 // 8 seconds of stable performance before recovery
        };

        // Callbacks
        this.degradationCallbacks = [];
        this.recoveryCallbacks = [];
        this.emergencyCallbacks = [];

        console.log('PerformanceDegradationDetector initialized');
    }

    /**
     * Initialize the degradation detector
     */
    async initialize() {
        if (this.initialized) {
            console.warn('PerformanceDegradationDetector already initialized');
            return;
        }

        try {
            console.log('Initializing PerformanceDegradationDetector...');

            // Validate dependencies
            this.validateDependencies();

            // Set up performance monitoring integration
            this.setupPerformanceMonitoringIntegration();

            // Initialize performance tracking
            this.initializePerformanceTracking();

            this.initialized = true;
            console.log('PerformanceDegradationDetector initialization complete');
        } catch (error) {
            console.error('Failed to initialize PerformanceDegradationDetector:', error);
            throw error;
        }
    }

    /**
     * Validate required dependencies
     */
    validateDependencies() {
        if (!this.performanceMonitor) {
            throw new Error('PerformanceMonitor is required for degradation detection');
        }

        if (!this.adaptiveQualityManager) {
            throw new Error('AdaptiveQualityManager is required for quality adjustments');
        }
    }

    /**
     * Set up performance monitoring integration
     */
    setupPerformanceMonitoringIntegration() {
        if (!this.performanceMonitor) {
            return;
        }

        console.log('Setting up performance monitoring integration for degradation detection...');

        // Register for performance metric updates
        this.performanceMonitor.onMetricsUpdate(metrics => {
            this.analyzePerformanceMetrics(metrics);
        });

        // Register for performance alerts
        this.performanceMonitor.onAlert(alert => {
            this.handlePerformanceAlert(alert);
        });

        console.log('Performance monitoring integration complete');
    }

    /**
     * Initialize performance tracking
     */
    initializePerformanceTracking() {
        this.performanceHistory = [];
        this.consecutiveDrops = 0;
        this.lastStableTime = performance.now();
        this.degradationEvents = [];
        this.recoveryEvents = [];
    }

    /**
     * Start degradation detection
     */
    startDetection() {
        if (!this.initialized) {
            throw new Error('PerformanceDegradationDetector must be initialized before starting');
        }

        if (this.detectionActive) {
            console.warn('Degradation detection already active');
            return;
        }

        console.log('Starting performance degradation detection...');

        this.detectionActive = true;
        this.lastStableTime = performance.now();

        console.log('Performance degradation detection started');
    }

    /**
     * Stop degradation detection
     */
    stopDetection() {
        if (!this.detectionActive) {
            return;
        }

        console.log('Stopping performance degradation detection...');

        this.detectionActive = false;

        // Exit emergency mode if active
        if (this.emergencyModeActive) {
            this.exitEmergencyMode();
        }

        console.log('Performance degradation detection stopped');
    }

    /**
     * Analyze performance metrics for degradation
     */
    analyzePerformanceMetrics(metrics) {
        if (!this.detectionActive) {
            return;
        }

        const currentTime = performance.now();

        // Add to performance history
        const performanceData = {
            timestamp: currentTime,
            fps: metrics.frameRate?.current || 0,
            frameTime: metrics.frameRate?.frameTime || 0,
            memoryUsage: metrics.memory?.percentage || 0,
            drawCalls: metrics.rendering?.drawCalls || 0
        };

        this.performanceHistory.push(performanceData);

        // Maintain history size
        if (this.performanceHistory.length > this.maxHistorySize) {
            this.performanceHistory.shift();
        }

        // Analyze current performance
        const analysis = this.analyzeCurrentPerformance(performanceData);

        // Handle degradation or recovery
        if (analysis.isDegraded) {
            this.handlePerformanceDegradation(analysis);
        } else if (analysis.isStable) {
            this.handlePerformanceRecovery(analysis);
        }
    }

    /**
     * Analyze current performance data
     */
    analyzeCurrentPerformance(data) {
        const analysis = {
            isDegraded: false,
            isStable: false,
            isCritical: false,
            severity: 0, // 0-1 scale
            reason: '',
            recommendations: []
        };

        // Check critical thresholds
        if (data.fps < this.thresholds.critical.minFPS
            || data.frameTime > this.thresholds.critical.maxFrameTime
            || data.memoryUsage > this.thresholds.critical.maxMemoryUsage) {
            analysis.isDegraded = true;
            analysis.isCritical = true;
            analysis.severity = 1.0;
            analysis.reason = 'critical_performance_drop';
            analysis.recommendations.push('emergency_mode');

            this.consecutiveDrops++;
        }
        // Check warning thresholds
        else if (data.fps < this.thresholds.warning.minFPS
                 || data.frameTime > this.thresholds.warning.maxFrameTime
                 || data.memoryUsage > this.thresholds.warning.maxMemoryUsage) {
            analysis.isDegraded = true;
            analysis.isCritical = false;
            analysis.severity = 0.6;
            analysis.reason = 'performance_degradation';
            analysis.recommendations.push('reduce_quality');

            this.consecutiveDrops++;
        }
        // Check recovery thresholds
        else if (data.fps >= this.thresholds.recovery.minFPS
                 && data.frameTime <= this.thresholds.recovery.maxFrameTime
                 && data.memoryUsage <= this.thresholds.recovery.maxMemoryUsage) {
            analysis.isStable = true;
            analysis.severity = 0;
            analysis.reason = 'stable_performance';

            // Check if we've been stable long enough for recovery
            const stableDuration = performance.now() - this.lastStableTime;
            if (stableDuration >= this.thresholds.recovery.minStablePeriod) {
                analysis.recommendations.push('increase_quality');
            }

            this.consecutiveDrops = 0;
        } else {
            // Performance is neither degraded nor stable enough for recovery
            this.consecutiveDrops = Math.max(0, this.consecutiveDrops - 1);
        }

        // Update last stable time
        if (analysis.isStable && this.consecutiveDrops === 0) {
            if (this.lastStableTime === 0) {
                this.lastStableTime = performance.now();
            }
        } else {
            this.lastStableTime = 0;
        }

        return analysis;
    }

    /**
     * Handle performance degradation
     */
    handlePerformanceDegradation(analysis) {
        const currentTime = performance.now();

        // Record degradation event
        const degradationEvent = {
            timestamp: currentTime,
            severity: analysis.severity,
            reason: analysis.reason,
            isCritical: analysis.isCritical,
            consecutiveDrops: this.consecutiveDrops,
            currentQuality: this.adaptiveQualityManager.getCurrentQualityLevel()
        };

        this.degradationEvents.push(degradationEvent);

        // Maintain event history
        if (this.degradationEvents.length > 50) {
            this.degradationEvents.shift();
        }

        console.log(`Performance degradation detected: ${analysis.reason} (severity: ${analysis.severity}, consecutive: ${this.consecutiveDrops})`);

        // Determine response based on severity and consecutive drops
        if (analysis.isCritical || this.consecutiveDrops >= this.thresholds.critical.maxConsecutiveDrops) {
            this.triggerEmergencyMode(degradationEvent);
        } else if (this.consecutiveDrops >= this.thresholds.warning.maxConsecutiveDrops) {
            this.triggerQualityReduction(degradationEvent);
        }

        // Notify callbacks
        this.notifyDegradationCallbacks(degradationEvent);
    }

    /**
     * Handle performance recovery
     */
    handlePerformanceRecovery(analysis) {
        const currentTime = performance.now();

        // Check if we can attempt recovery
        if (currentTime - this.lastRecoveryAttempt < this.recoverySettings.cooldownPeriod) {
            return; // Still in cooldown
        }

        // Check if we've been stable long enough
        const stableDuration = currentTime - this.lastStableTime;
        if (stableDuration < this.recoverySettings.stabilityRequirement) {
            return; // Not stable long enough
        }

        // Check if we're in emergency mode
        if (this.emergencyModeActive) {
            this.attemptEmergencyModeExit();
            return;
        }

        // Check if we can increase quality
        const currentQuality = this.adaptiveQualityManager.getCurrentQualityLevel();
        if (currentQuality >= this.recoverySettings.maxRecoveryLevel) {
            return; // Already at max recovery level
        }

        // Attempt gradual quality recovery
        this.attemptQualityRecovery();
    }

    /**
     * Trigger emergency mode
     */
    triggerEmergencyMode(degradationEvent) {
        if (this.emergencyModeActive) {
            return; // Already in emergency mode
        }

        console.warn('Triggering emergency performance mode due to critical degradation');

        this.emergencyModeActive = true;

        // Store current settings for potential restoration
        this.preEmergencyQuality = this.adaptiveQualityManager.getCurrentQualityLevel();

        // Apply emergency settings
        this.applyEmergencySettings();

        // Record emergency event
        const emergencyEvent = {
            timestamp: performance.now(),
            trigger: degradationEvent,
            preEmergencyQuality: this.preEmergencyQuality,
            emergencySettings: { ...this.emergencySettings }
        };

        // Notify callbacks
        this.notifyEmergencyCallbacks('emergency_mode_activated', emergencyEvent);

        console.warn(`Emergency mode activated. Quality reduced from ${this.preEmergencyQuality} to ${this.emergencySettings.qualityLevel}`);
    }

    /**
     * Apply emergency settings
     */
    applyEmergencySettings() {
        // Set minimal quality level
        this.adaptiveQualityManager.setQualityLevel(this.emergencySettings.qualityLevel, false);

        // Disable dynamic adjustment temporarily
        this.adaptiveQualityManager.enableDynamicAdjustment(false);

        console.log('Emergency settings applied');
    }

    /**
     * Attempt to exit emergency mode
     */
    attemptEmergencyModeExit() {
        if (!this.emergencyModeActive) {
            return;
        }

        console.log('Attempting to exit emergency mode...');

        // Check if performance has been stable enough
        const stableDuration = performance.now() - this.lastStableTime;
        if (stableDuration < this.recoverySettings.stabilityRequirement * 2) {
            console.log('Performance not stable enough to exit emergency mode');
            return;
        }

        // Exit emergency mode
        this.exitEmergencyMode();
    }

    /**
     * Exit emergency mode
     */
    exitEmergencyMode() {
        if (!this.emergencyModeActive) {
            return;
        }

        console.log('Exiting emergency performance mode');

        this.emergencyModeActive = false;

        // Re-enable dynamic adjustment
        this.adaptiveQualityManager.enableDynamicAdjustment(true);

        // Gradually restore quality (don't jump back to pre-emergency level)
        const targetQuality = Math.min(this.preEmergencyQuality, 50); // Cap at medium quality
        this.adaptiveQualityManager.setQualityLevel(targetQuality, true);

        // Record recovery event
        const recoveryEvent = {
            timestamp: performance.now(),
            exitedEmergencyMode: true,
            restoredQuality: targetQuality,
            preEmergencyQuality: this.preEmergencyQuality
        };

        this.recoveryEvents.push(recoveryEvent);

        // Notify callbacks
        this.notifyEmergencyCallbacks('emergency_mode_deactivated', recoveryEvent);
        this.notifyRecoveryCallbacks(recoveryEvent);

        console.log(`Emergency mode exited. Quality restored to ${targetQuality}`);

        this.lastRecoveryAttempt = performance.now();
    }

    /**
     * Trigger quality reduction
     */
    triggerQualityReduction(degradationEvent) {
        const currentQuality = this.adaptiveQualityManager.getCurrentQualityLevel();

        // Calculate reduction amount based on severity
        const reductionAmount = Math.ceil(degradationEvent.severity * 15); // 5-15 point reduction
        const newQuality = Math.max(15, currentQuality - reductionAmount);

        console.log(`Reducing quality due to performance degradation: ${currentQuality} → ${newQuality}`);

        // Apply quality reduction
        this.adaptiveQualityManager.setQualityLevel(newQuality, true);

        // Record the action
        degradationEvent.qualityReduction = {
            from: currentQuality,
            to: newQuality,
            amount: reductionAmount
        };
    }

    /**
     * Attempt quality recovery
     */
    attemptQualityRecovery() {
        const currentQuality = this.adaptiveQualityManager.getCurrentQualityLevel();
        const newQuality = Math.min(
            this.recoverySettings.maxRecoveryLevel,
            currentQuality + this.recoverySettings.gradualRecoveryStep
        );

        if (newQuality <= currentQuality) {
            return; // No improvement possible
        }

        console.log(`Attempting quality recovery: ${currentQuality} → ${newQuality}`);

        // Apply quality increase
        this.adaptiveQualityManager.setQualityLevel(newQuality, true);

        // Record recovery event
        const recoveryEvent = {
            timestamp: performance.now(),
            qualityIncrease: {
                from: currentQuality,
                to: newQuality,
                amount: newQuality - currentQuality
            },
            stableDuration: performance.now() - this.lastStableTime
        };

        this.recoveryEvents.push(recoveryEvent);

        // Maintain event history
        if (this.recoveryEvents.length > 50) {
            this.recoveryEvents.shift();
        }

        // Notify callbacks
        this.notifyRecoveryCallbacks(recoveryEvent);

        this.lastRecoveryAttempt = performance.now();
    }

    /**
     * Handle performance alerts from monitor
     */
    handlePerformanceAlert(alert) {
        console.log('Performance alert received by degradation detector:', alert);

        // Convert alert to degradation analysis
        const analysis = {
            isDegraded: alert.severity === 'critical' || alert.severity === 'warning',
            isCritical: alert.severity === 'critical',
            severity: alert.severity === 'critical' ? 1.0 : 0.6,
            reason: alert.type || 'performance_alert',
            recommendations: []
        };

        if (analysis.isDegraded) {
            this.handlePerformanceDegradation(analysis);
        }
    }

    /**
     * Get degradation detector status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            detectionActive: this.detectionActive,
            emergencyModeActive: this.emergencyModeActive,
            consecutiveDrops: this.consecutiveDrops,
            lastStableTime: this.lastStableTime,
            stableDuration: this.lastStableTime > 0 ? performance.now() - this.lastStableTime : 0,
            thresholds: this.thresholds,
            performanceHistorySize: this.performanceHistory.length,
            degradationEventsCount: this.degradationEvents.length,
            recoveryEventsCount: this.recoveryEvents.length,
            lastRecoveryAttempt: this.lastRecoveryAttempt
        };
    }

    /**
     * Get performance history
     */
    getPerformanceHistory(count = 10) {
        return this.performanceHistory.slice(-count);
    }

    /**
     * Get degradation events
     */
    getDegradationEvents(count = 10) {
        return this.degradationEvents.slice(-count);
    }

    /**
     * Get recovery events
     */
    getRecoveryEvents(count = 10) {
        return this.recoveryEvents.slice(-count);
    }

    /**
     * Update thresholds
     */
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log('Degradation detection thresholds updated:', this.thresholds);
    }

    /**
     * Update emergency settings
     */
    updateEmergencySettings(newSettings) {
        this.emergencySettings = { ...this.emergencySettings, ...newSettings };
        console.log('Emergency settings updated:', this.emergencySettings);
    }

    /**
     * Update recovery settings
     */
    updateRecoverySettings(newSettings) {
        this.recoverySettings = { ...this.recoverySettings, ...newSettings };
        console.log('Recovery settings updated:', this.recoverySettings);
    }

    /**
     * Register degradation callback
     */
    onDegradation(callback) {
        if (typeof callback === 'function') {
            this.degradationCallbacks.push(callback);
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
     * Register emergency callback
     */
    onEmergency(callback) {
        if (typeof callback === 'function') {
            this.emergencyCallbacks.push(callback);
        }
    }

    /**
     * Notify degradation callbacks
     */
    notifyDegradationCallbacks(event) {
        this.degradationCallbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Error in degradation callback:', error);
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
     * Notify emergency callbacks
     */
    notifyEmergencyCallbacks(eventType, event) {
        this.emergencyCallbacks.forEach(callback => {
            try {
                callback(eventType, event);
            } catch (error) {
                console.error('Error in emergency callback:', error);
            }
        });
    }

    /**
     * Dispose of the degradation detector
     */
    dispose() {
        console.log('Disposing PerformanceDegradationDetector...');

        // Stop detection
        this.stopDetection();

        // Clear callbacks and data
        this.degradationCallbacks = [];
        this.recoveryCallbacks = [];
        this.emergencyCallbacks = [];
        this.performanceHistory = [];
        this.degradationEvents = [];
        this.recoveryEvents = [];

        this.initialized = false;

        console.log('PerformanceDegradationDetector disposed');
    }
}
