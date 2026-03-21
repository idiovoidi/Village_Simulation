/**
 * AdaptiveQualityManager - Manages dynamic quality adjustments based on performance metrics
 *
 * This class provides:
 * - Quality preset system (low, medium, high, ultra)
 * - Dynamic quality adjustment based on performance metrics
 * - Quality level scaling (0-100) with smooth transitions
 * - Hardware-based quality recommendations
 */

import { HardwareDetector } from './HardwareDetector.js';
import { QualitySettings } from './QualitySettings.js';
import { QualityTransitionSystem } from './QualityTransitionSystem.js';

export class AdaptiveQualityManager {
    constructor(hardwareDetector = null, qualitySettings = null, scene = null) {
        this.hardwareDetector = hardwareDetector || new HardwareDetector();
        this.qualitySettings = qualitySettings || new QualitySettings();
        this.transitionSystem = new QualityTransitionSystem(scene);

        // Quality state
        this.currentQualityLevel = 75; // 0-100 scale
        this.currentPreset = 'medium';
        this.targetQualityLevel = 75;
        this.isTransitioning = false;

        // Dynamic adjustment settings
        this.dynamicAdjustmentEnabled = true;
        this.lastAdjustmentTime = 0;
        this.adjustmentCooldown = 2000; // 2 seconds between adjustments
        this.adjustmentHistory = [];
        this.maxHistorySize = 10;

        // Performance targets for dynamic adjustment
        this.performanceTargets = {
            minFPS: 30,
            targetFPS: 60,
            maxFrameTime: 16.67, // 60 FPS = 16.67ms
            memoryThreshold: 80, // Percentage
            stabilityWindow: 5 // Number of samples to consider for stability
        };

        // Quality presets definition
        this.qualityPresets = this.initializeQualityPresets();

        // Transition settings (legacy - now handled by QualityTransitionSystem)
        this.transitionSettings = {
            duration: 1000,
            easing: 'easeInOutQuad',
            preset: 'smooth'
        };

        // Callbacks
        this.qualityChangeCallbacks = [];
        this.transitionCallbacks = [];

        console.log('AdaptiveQualityManager initialized');
    }

    /**
     * Initialize quality presets with comprehensive settings
     */
    initializeQualityPresets() {
        return {
            low: {
                level: 25,
                name: 'Low',
                description: 'Optimized for performance on low-end hardware',
                rendering: {
                    shadowQuality: 0, // No shadows
                    textureQuality: 1, // Low resolution textures
                    lodDistance: 50, // Aggressive LOD switching
                    maxDrawCalls: 100,
                    enableInstancing: true,
                    enableOcclusion: false,
                    enableFrustumCulling: true,
                    particleCount: 0.3, // 30% of particles
                    enableReflections: false,
                    enableSSAO: false
                },
                ai: {
                    maxActiveAgents: 20,
                    updateFrequency: 0.5, // Half frequency
                    behaviorComplexity: 0.5,
                    pathfindingAccuracy: 0.5,
                    visionRange: 0.7
                },
                physics: {
                    maxActiveBodies: 50,
                    collisionAccuracy: 0.5,
                    updateFrequency: 0.5,
                    enableSleeping: true,
                    sleepThreshold: 0.1
                },
                effects: {
                    cloudDetail: 0.3,
                    waterQuality: 0.5,
                    windEffects: false,
                    atmosphericScattering: false
                }
            },
            medium: {
                level: 50,
                name: 'Medium',
                description: 'Balanced quality and performance',
                rendering: {
                    shadowQuality: 1, // Basic shadows
                    textureQuality: 2, // Medium resolution textures
                    lodDistance: 100,
                    maxDrawCalls: 200,
                    enableInstancing: true,
                    enableOcclusion: true,
                    enableFrustumCulling: true,
                    particleCount: 0.6, // 60% of particles
                    enableReflections: true,
                    enableSSAO: false
                },
                ai: {
                    maxActiveAgents: 50,
                    updateFrequency: 0.75,
                    behaviorComplexity: 0.75,
                    pathfindingAccuracy: 0.75,
                    visionRange: 0.85
                },
                physics: {
                    maxActiveBodies: 100,
                    collisionAccuracy: 0.75,
                    updateFrequency: 0.75,
                    enableSleeping: true,
                    sleepThreshold: 0.05
                },
                effects: {
                    cloudDetail: 0.6,
                    waterQuality: 0.75,
                    windEffects: true,
                    atmosphericScattering: false
                }
            },
            high: {
                level: 75,
                name: 'High',
                description: 'High quality for capable hardware',
                rendering: {
                    shadowQuality: 2, // High quality shadows
                    textureQuality: 3, // High resolution textures
                    lodDistance: 150,
                    maxDrawCalls: 300,
                    enableInstancing: true,
                    enableOcclusion: true,
                    enableFrustumCulling: true,
                    particleCount: 0.8, // 80% of particles
                    enableReflections: true,
                    enableSSAO: true
                },
                ai: {
                    maxActiveAgents: 100,
                    updateFrequency: 1.0,
                    behaviorComplexity: 1.0,
                    pathfindingAccuracy: 1.0,
                    visionRange: 1.0
                },
                physics: {
                    maxActiveBodies: 200,
                    collisionAccuracy: 1.0,
                    updateFrequency: 1.0,
                    enableSleeping: true,
                    sleepThreshold: 0.02
                },
                effects: {
                    cloudDetail: 0.8,
                    waterQuality: 1.0,
                    windEffects: true,
                    atmosphericScattering: true
                }
            },
            ultra: {
                level: 100,
                name: 'Ultra',
                description: 'Maximum quality for high-end hardware',
                rendering: {
                    shadowQuality: 3, // Ultra shadows with soft edges
                    textureQuality: 4, // Ultra high resolution textures
                    lodDistance: 200,
                    maxDrawCalls: 500,
                    enableInstancing: true,
                    enableOcclusion: true,
                    enableFrustumCulling: true,
                    particleCount: 1.0, // 100% of particles
                    enableReflections: true,
                    enableSSAO: true
                },
                ai: {
                    maxActiveAgents: 200,
                    updateFrequency: 1.0,
                    behaviorComplexity: 1.0,
                    pathfindingAccuracy: 1.0,
                    visionRange: 1.0
                },
                physics: {
                    maxActiveBodies: 400,
                    collisionAccuracy: 1.0,
                    updateFrequency: 1.0,
                    enableSleeping: true,
                    sleepThreshold: 0.01
                },
                effects: {
                    cloudDetail: 1.0,
                    waterQuality: 1.0,
                    windEffects: true,
                    atmosphericScattering: true
                }
            }
        };
    }

    /**
     * Initialize the adaptive quality manager
     */
    async initialize() {
        try {
            console.log('Initializing AdaptiveQualityManager...');

            // Load saved settings first
            await this.loadSavedSettings();

            // Detect hardware capabilities if not already done
            if (!this.hardwareDetector.isDetectionComplete()) {
                await this.hardwareDetector.detectCapabilities();
            }

            // If no saved settings, set initial quality based on hardware
            if (!this.qualitySettings.getCurrentSettings()) {
                this.setInitialQualityFromHardware();
                await this.saveCurrentSettings();
            } else {
                // Apply loaded settings
                this.applyLoadedSettings();
            }

            console.log(`AdaptiveQualityManager initialized with quality level: ${this.currentQualityLevel} (${this.currentPreset})`);
        } catch (error) {
            console.error('Failed to initialize AdaptiveQualityManager:', error);
            // Fall back to medium quality
            this.setQualityLevel(50);
        }
    }

    /**
     * Set initial quality level based on detected hardware capabilities
     */
    setInitialQualityFromHardware() {
        const capabilities = this.hardwareDetector.getCapabilities();
        const performanceTier = this.hardwareDetector.getPerformanceTier();

        if (!capabilities) {
            console.warn('No hardware capabilities detected, using medium quality');
            this.setQualityLevel(50);
            return;
        }

        // Map performance tier to quality level
        const tierMapping = {
            'low': 25,
            'medium': 50,
            'high': 75
        };

        const recommendedLevel = tierMapping[performanceTier] || 50;

        // Fine-tune based on specific capabilities
        let adjustedLevel = recommendedLevel;

        // Adjust based on estimated FPS
        const estimatedFPS = capabilities.performance?.estimatedFPS || 30;
        if (estimatedFPS >= 60) {
            adjustedLevel = Math.min(100, adjustedLevel + 15);
        } else if (estimatedFPS < 30) {
            adjustedLevel = Math.max(25, adjustedLevel - 15);
        }

        // Adjust based on memory
        const availableMemory = capabilities.memory?.estimatedAvailableMemory || 0;
        const memoryGB = availableMemory / (1024 * 1024 * 1024);
        if (memoryGB < 1) {
            adjustedLevel = Math.max(25, adjustedLevel - 10);
        } else if (memoryGB >= 4) {
            adjustedLevel = Math.min(100, adjustedLevel + 10);
        }

        this.setQualityLevel(adjustedLevel);

        console.log(`Hardware-based quality recommendation: ${adjustedLevel} (tier: ${performanceTier}, FPS: ${estimatedFPS}, Memory: ${memoryGB.toFixed(1)}GB)`);
    }

    /**
     * Set quality level (0-100 scale)
     */
    setQualityLevel(level, smooth = false) {
        // Clamp level to valid range
        level = Math.max(0, Math.min(100, level));

        if (level === this.currentQualityLevel) {
            return; // No change needed
        }

        const oldLevel = this.currentQualityLevel;
        const oldPreset = this.currentPreset;

        if (smooth && Math.abs(level - this.currentQualityLevel) > 5) {
            // Use smooth transition for significant changes
            this.startQualityTransitionNew(this.currentQualityLevel, level);
        } else {
            // Immediate change
            this.currentQualityLevel = level;
            this.targetQualityLevel = level;
            this.currentPreset = this.getPresetForLevel(level);

            // Notify callbacks
            this.notifyQualityChange(oldLevel, level, oldPreset, this.currentPreset);
        }

        console.log(`Quality level changed from ${oldLevel} to ${level} (${oldPreset} → ${this.currentPreset})`);

        // Auto-save settings when quality changes
        this.saveCurrentSettings().catch(error => {
            console.warn('Failed to auto-save settings after quality change:', error);
        });
    }

    /**
     * Apply a quality preset
     */
    applyPreset(presetName) {
        if (!this.qualityPresets[presetName]) {
            throw new Error(`Unknown quality preset: ${presetName}`);
        }

        const preset = this.qualityPresets[presetName];
        this.setQualityLevel(preset.level, true);
    }

    /**
     * Get the preset name for a given quality level
     */
    getPresetForLevel(level) {
        if (level <= 30) return 'low';
        else if (level <= 60) return 'medium';
        else if (level <= 85) return 'high';
        else return 'ultra';
    }

    /**
     * Get current quality settings based on current level
     */
    getCurrentQualitySettings() {
        const basePreset = this.getPresetForLevel(this.currentQualityLevel);
        const settings = JSON.parse(JSON.stringify(this.qualityPresets[basePreset]));

        // Interpolate settings based on exact level within preset range
        const levelRanges = {
            'low': [0, 30],
            'medium': [31, 60],
            'high': [61, 85],
            'ultra': [86, 100]
        };

        const [minLevel, maxLevel] = levelRanges[basePreset];
        const normalizedLevel = (this.currentQualityLevel - minLevel) / (maxLevel - minLevel);

        // Apply level-based scaling to certain settings
        this.scaleQualitySettings(settings, normalizedLevel);

        return settings;
    }

    /**
     * Scale quality settings based on normalized level within preset range
     */
    scaleQualitySettings(settings, normalizedLevel) {
        // Scale rendering settings
        if (settings.rendering) {
            settings.rendering.lodDistance *= (0.8 + 0.4 * normalizedLevel);
            settings.rendering.maxDrawCalls = Math.floor(settings.rendering.maxDrawCalls * (0.8 + 0.4 * normalizedLevel));
            settings.rendering.particleCount *= (0.8 + 0.4 * normalizedLevel);
        }

        // Scale AI settings
        if (settings.ai) {
            settings.ai.maxActiveAgents = Math.floor(settings.ai.maxActiveAgents * (0.8 + 0.4 * normalizedLevel));
            settings.ai.updateFrequency *= (0.8 + 0.4 * normalizedLevel);
            settings.ai.visionRange *= (0.9 + 0.2 * normalizedLevel);
        }

        // Scale physics settings
        if (settings.physics) {
            settings.physics.maxActiveBodies = Math.floor(settings.physics.maxActiveBodies * (0.8 + 0.4 * normalizedLevel));
            settings.physics.updateFrequency *= (0.8 + 0.4 * normalizedLevel);
        }

        // Scale effects settings
        if (settings.effects) {
            settings.effects.cloudDetail *= (0.8 + 0.4 * normalizedLevel);
            settings.effects.waterQuality *= (0.8 + 0.4 * normalizedLevel);
        }
    }

    /**
     * Adjust quality based on performance metrics
     */
    adjustQualityForPerformance(metrics) {
        if (!this.dynamicAdjustmentEnabled) {
            return;
        }

        const currentTime = performance.now();

        // Check cooldown
        if (currentTime - this.lastAdjustmentTime < this.adjustmentCooldown) {
            return;
        }

        // Analyze performance metrics
        const performanceAnalysis = this.analyzePerformanceMetrics(metrics);

        if (!performanceAnalysis.needsAdjustment) {
            return;
        }

        // Calculate quality adjustment
        const adjustment = this.calculateQualityAdjustment(performanceAnalysis);

        if (Math.abs(adjustment) < 2) {
            return; // Too small to matter
        }

        // Apply adjustment
        const newLevel = Math.max(10, Math.min(100, this.currentQualityLevel + adjustment));

        // Record adjustment in history
        this.adjustmentHistory.push({
            timestamp: currentTime,
            oldLevel: this.currentQualityLevel,
            newLevel,
            adjustment,
            reason: performanceAnalysis.reason,
            metrics: {
                fps: metrics.frameRate?.current || 0,
                frameTime: metrics.frameRate?.frameTime || 0,
                memory: metrics.memory?.percentage || 0
            }
        });

        // Maintain history size
        if (this.adjustmentHistory.length > this.maxHistorySize) {
            this.adjustmentHistory.shift();
        }

        // Apply the new quality level
        this.setQualityLevel(newLevel, true);
        this.lastAdjustmentTime = currentTime;

        console.log(`Dynamic quality adjustment: ${this.currentQualityLevel} → ${newLevel} (${performanceAnalysis.reason})`);
    }

    /**
     * Analyze performance metrics to determine if adjustment is needed
     */
    analyzePerformanceMetrics(metrics) {
        const analysis = {
            needsAdjustment: false,
            reason: '',
            severity: 0, // -1 to 1, negative means reduce quality, positive means increase
            confidence: 0 // 0 to 1
        };

        // Check FPS performance
        const currentFPS = metrics.frameRate?.current || 0;
        const averageFPS = metrics.frameRate?.average || currentFPS;

        if (averageFPS < this.performanceTargets.minFPS) {
            analysis.needsAdjustment = true;
            analysis.reason = 'low_fps';
            analysis.severity = -0.8; // Reduce quality significantly
            analysis.confidence = Math.min(1, (this.performanceTargets.minFPS - averageFPS) / 10);
        } else if (averageFPS < this.performanceTargets.targetFPS * 0.8) {
            analysis.needsAdjustment = true;
            analysis.reason = 'below_target_fps';
            analysis.severity = -0.4; // Reduce quality moderately
            analysis.confidence = 0.6;
        } else if (averageFPS > this.performanceTargets.targetFPS * 1.1 && this.currentQualityLevel < 90) {
            analysis.needsAdjustment = true;
            analysis.reason = 'fps_headroom';
            analysis.severity = 0.3; // Increase quality moderately
            analysis.confidence = 0.4;
        }

        // Check memory usage
        const memoryPercentage = metrics.memory?.percentage || 0;
        if (memoryPercentage > this.performanceTargets.memoryThreshold) {
            analysis.needsAdjustment = true;
            analysis.reason = 'high_memory';
            analysis.severity = Math.min(analysis.severity, -0.6); // Reduce quality
            analysis.confidence = Math.max(analysis.confidence, 0.7);
        }

        // Check frame time consistency
        const frameTime = metrics.frameRate?.frameTime || 0;
        if (frameTime > this.performanceTargets.maxFrameTime * 1.5) {
            analysis.needsAdjustment = true;
            analysis.reason = 'high_frame_time';
            analysis.severity = Math.min(analysis.severity, -0.5);
            analysis.confidence = Math.max(analysis.confidence, 0.6);
        }

        return analysis;
    }

    /**
     * Calculate quality level adjustment based on performance analysis
     */
    calculateQualityAdjustment(analysis) {
        if (!analysis.needsAdjustment) {
            return 0;
        }

        // Base adjustment based on severity and confidence
        let adjustment = analysis.severity * analysis.confidence * 20; // Scale to quality level range

        // Apply dampening based on recent adjustments
        const recentAdjustments = this.adjustmentHistory.filter(
            adj => performance.now() - adj.timestamp < 10000 // Last 10 seconds
        );

        if (recentAdjustments.length > 2) {
            // Reduce adjustment if we've been adjusting frequently
            adjustment *= 0.5;
        }

        // Prevent oscillation by checking recent adjustment direction
        if (recentAdjustments.length > 0) {
            const lastAdjustment = recentAdjustments[recentAdjustments.length - 1];
            if (Math.sign(adjustment) !== Math.sign(lastAdjustment.adjustment)) {
                // Opposite direction, reduce magnitude to prevent oscillation
                adjustment *= 0.7;
            }
        }

        return Math.round(adjustment);
    }

    /**
     * Enable or disable dynamic quality adjustment
     */
    enableDynamicAdjustment(enabled) {
        this.dynamicAdjustmentEnabled = enabled;
        console.log(`Dynamic quality adjustment ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set performance targets for dynamic adjustment
     */
    setPerformanceTargets(targets) {
        this.performanceTargets = { ...this.performanceTargets, ...targets };
        console.log('Performance targets updated:', this.performanceTargets);
    }

    /**
     * Get current quality level
     */
    getCurrentQualityLevel() {
        return this.currentQualityLevel;
    }

    /**
     * Get current preset name
     */
    getCurrentPreset() {
        return this.currentPreset;
    }

    /**
     * Get available quality presets
     */
    getAvailablePresets() {
        return Object.keys(this.qualityPresets).map(key => ({
            key,
            ...this.qualityPresets[key]
        }));
    }

    /**
     * Get adjustment history
     */
    getAdjustmentHistory() {
        return [...this.adjustmentHistory];
    }

    /**
     * Register quality change callback
     */
    onQualityChange(callback) {
        if (typeof callback === 'function') {
            this.qualityChangeCallbacks.push(callback);
        }
    }

    /**
     * Remove quality change callback
     */
    removeQualityChangeCallback(callback) {
        const index = this.qualityChangeCallbacks.indexOf(callback);
        if (index > -1) {
            this.qualityChangeCallbacks.splice(index, 1);
        }
    }

    /**
     * Register transition callback
     */
    onTransition(callback) {
        if (typeof callback === 'function') {
            this.transitionCallbacks.push(callback);
        }
    }

    /**
     * Remove transition callback
     */
    removeTransitionCallback(callback) {
        const index = this.transitionCallbacks.indexOf(callback);
        if (index > -1) {
            this.transitionCallbacks.splice(index, 1);
        }
    }

    /**
     * Notify quality change callbacks
     */
    notifyQualityChange(oldLevel, newLevel, oldPreset, newPreset) {
        const changeData = {
            oldLevel,
            newLevel,
            oldPreset,
            newPreset,
            settings: this.getCurrentQualitySettings(),
            timestamp: performance.now()
        };

        this.qualityChangeCallbacks.forEach(callback => {
            try {
                callback(changeData);
            } catch (error) {
                console.error('Error in quality change callback:', error);
            }
        });
    }

    /**
     * Notify transition callbacks
     */
    notifyTransitionCallbacks(event, data = null) {
        this.transitionCallbacks.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in transition callback:', error);
            }
        });
    }

    /**
     * Start a smooth quality transition using the new transition system
     */
    startQualityTransitionNew(fromLevel, toLevel) {
        // Cancel any existing quality transition
        this.transitionSystem.cancelTransition('qualityLevel');

        this.targetQualityLevel = toLevel;

        // Determine transition preset based on change magnitude
        let preset = 'smooth';
        const changeMagnitude = Math.abs(toLevel - fromLevel);

        if (changeMagnitude > 30) {
            preset = 'dramatic';
        } else if (changeMagnitude > 15) {
            preset = 'smooth';
        } else {
            preset = 'fast';
        }

        // Set up transition callbacks
        this.transitionSystem.onSystemTransition('qualityLevel', (event, transition) => {
            if (event === 'progress') {
                // Update current quality level during transition
                const oldLevel = this.currentQualityLevel;
                const oldPreset = this.currentPreset;

                this.currentQualityLevel = Math.round(transition.currentValue);
                this.currentPreset = this.getPresetForLevel(this.currentQualityLevel);

                // Notify if preset changed
                if (this.currentPreset !== oldPreset) {
                    this.notifyQualityChange(oldLevel, this.currentQualityLevel, oldPreset, this.currentPreset);
                }

                // Notify transition progress
                this.notifyTransitionCallbacks('progress', {
                    progress: transition.progress,
                    currentLevel: this.currentQualityLevel,
                    fromLevel: transition.fromValue,
                    toLevel: transition.toValue
                });
            } else if (event === 'complete') {
                // Ensure final values are set
                const oldLevel = this.currentQualityLevel;
                const oldPreset = this.currentPreset;

                this.currentQualityLevel = toLevel;
                this.currentPreset = this.getPresetForLevel(toLevel);
                this.isTransitioning = false;

                // Final notification
                this.notifyQualityChange(oldLevel, this.currentQualityLevel, oldPreset, this.currentPreset);
                this.notifyTransitionCallbacks('complete', {
                    finalLevel: this.currentQualityLevel,
                    finalPreset: this.currentPreset
                });
            } else if (event === 'cancel') {
                this.isTransitioning = false;
                this.notifyTransitionCallbacks('cancel', {
                    currentLevel: this.currentQualityLevel,
                    targetLevel: toLevel
                });
            }
        });

        // Start the transition
        this.isTransitioning = true;
        this.transitionSystem.startTransition('qualityLevel', fromLevel, toLevel, {
            preset,
            duration: this.transitionSettings.duration,
            easing: this.transitionSettings.easing
        });

        console.log(`Starting quality transition: ${fromLevel} → ${toLevel} (preset: ${preset})`);
    }

    /**
     * Update quality transitions (delegates to QualityTransitionSystem)
     */
    updateQualityTransition() {
        // This method is now handled automatically by the QualityTransitionSystem
        // Keep for backward compatibility but delegate to the new system
        this.transitionSystem.updateAllTransitions();
    }

    /**
     * Complete quality transition (delegates to QualityTransitionSystem)
     */
    completeQualityTransition() {
        // This is now handled automatically by the QualityTransitionSystem
        // Keep for backward compatibility
        const status = this.transitionSystem.getTransitionStatus('qualityLevel');
        if (status && !status.completed) {
            // Force completion by cancelling and setting final value
            this.transitionSystem.cancelTransition('qualityLevel');
            this.currentQualityLevel = this.targetQualityLevel;
            this.currentPreset = this.getPresetForLevel(this.currentQualityLevel);
            this.isTransitioning = false;
        }
    }

    /**
     * Cancel current quality transition (delegates to QualityTransitionSystem)
     */
    cancelQualityTransition() {
        const cancelled = this.transitionSystem.cancelTransition('qualityLevel');
        if (cancelled) {
            this.isTransitioning = false;
        }
    }

    /**
     * Apply easing function to transition progress
     */
    applyEasing(progress, easingType) {
        switch (easingType) {
            case 'linear':
                return progress;

            case 'easeInQuad':
                return progress * progress;

            case 'easeOutQuad':
                return progress * (2 - progress);

            case 'easeInOutQuad':
                return progress < 0.5
                    ? 2 * progress * progress
                    : -1 + (4 - 2 * progress) * progress;

            case 'easeInCubic':
                return progress * progress * progress;

            case 'easeOutCubic':
                return (--progress) * progress * progress + 1;

            case 'easeInOutCubic':
                return progress < 0.5
                    ? 4 * progress * progress * progress
                    : (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1;

            case 'easeInSine':
                return 1 - Math.cos(progress * Math.PI / 2);

            case 'easeOutSine':
                return Math.sin(progress * Math.PI / 2);

            case 'easeInOutSine':
                return -(Math.cos(Math.PI * progress) - 1) / 2;

            default:
                // Default to easeInOutQuad
                return progress < 0.5
                    ? 2 * progress * progress
                    : -1 + (4 - 2 * progress) * progress;
        }
    }

    /**
     * Set transition settings
     */
    setTransitionSettings(settings) {
        this.transitionSettings = { ...this.transitionSettings, ...settings };
        console.log('Transition settings updated:', this.transitionSettings);
    }

    /**
     * Check if currently transitioning
     */
    isCurrentlyTransitioning() {
        const status = this.transitionSystem.getTransitionStatus('qualityLevel');
        return status !== null && !status.completed && !status.cancelled;
    }

    /**
     * Get transition progress (0-1)
     */
    getTransitionProgress() {
        const status = this.transitionSystem.getTransitionStatus('qualityLevel');
        return status ? status.progress : 1;
    }

    /**
     * Get detailed transition status
     */
    getTransitionStatus() {
        return this.transitionSystem.getTransitionStatus('qualityLevel');
    }

    /**
     * Configure transition visual feedback
     */
    configureTransitionFeedback(settings) {
        this.transitionSystem.configureVisualFeedback(settings);
    }

    /**
     * Add custom transition preset
     */
    addTransitionPreset(name, preset) {
        this.transitionSystem.addTransitionPreset(name, preset);
    }

    /**
     * Create a custom quality preset
     */
    createCustomPreset(name, settings) {
        if (this.qualityPresets[name]) {
            console.warn(`Preset '${name}' already exists, overwriting`);
        }

        // Validate settings structure
        const requiredSections = ['rendering', 'ai', 'physics', 'effects'];
        for (const section of requiredSections) {
            if (!settings[section]) {
                throw new Error(`Custom preset must include '${section}' section`);
            }
        }

        // Ensure level is set
        if (typeof settings.level !== 'number' || settings.level < 0 || settings.level > 100) {
            throw new Error('Custom preset must have a valid level (0-100)');
        }

        this.qualityPresets[name] = {
            name: settings.name || name,
            description: settings.description || `Custom preset: ${name}`,
            ...settings
        };

        console.log(`Custom preset '${name}' created with level ${settings.level}`);
    }

    /**
     * Remove a custom preset
     */
    removeCustomPreset(name) {
        // Prevent removal of built-in presets
        const builtInPresets = ['low', 'medium', 'high', 'ultra'];
        if (builtInPresets.includes(name)) {
            throw new Error(`Cannot remove built-in preset: ${name}`);
        }

        if (!this.qualityPresets[name]) {
            throw new Error(`Preset '${name}' does not exist`);
        }

        delete this.qualityPresets[name];
        console.log(`Custom preset '${name}' removed`);
    }

    /**
     * Get quality manager status
     */
    getStatus() {
        return {
            currentQualityLevel: this.currentQualityLevel,
            currentPreset: this.currentPreset,
            targetQualityLevel: this.targetQualityLevel,
            isTransitioning: this.isTransitioning,
            transitionProgress: this.getTransitionProgress(),
            dynamicAdjustmentEnabled: this.dynamicAdjustmentEnabled,
            performanceTargets: this.performanceTargets,
            adjustmentHistory: this.adjustmentHistory.slice(-5), // Last 5 adjustments
            availablePresets: Object.keys(this.qualityPresets),
            hardwareDetected: this.hardwareDetector.isDetectionComplete(),
            performanceTier: this.hardwareDetector.getPerformanceTier()
        };
    }

    /**
     * Reset to default state
     */
    reset() {
        this.cancelQualityTransition();
        this.currentQualityLevel = 75;
        this.currentPreset = 'medium';
        this.targetQualityLevel = 75;
        this.adjustmentHistory = [];
        this.lastAdjustmentTime = 0;

        console.log('AdaptiveQualityManager reset to default state');
    }

    /**
     * Load saved settings from storage
     */
    async loadSavedSettings() {
        try {
            const settings = await this.qualitySettings.loadSettings();
            if (settings && settings.general) {
                console.log('Loaded saved quality settings');
                return true;
            }
        } catch (error) {
            console.warn('Failed to load saved settings:', error);
        }
        return false;
    }

    /**
     * Apply loaded settings to current state
     */
    applyLoadedSettings() {
        const settings = this.qualitySettings.getCurrentSettings();
        if (!settings || !settings.general) {
            return;
        }

        // Apply general settings
        this.currentQualityLevel = settings.general.qualityLevel || 75;
        this.currentPreset = settings.general.preset || 'medium';
        this.targetQualityLevel = this.currentQualityLevel;
        this.dynamicAdjustmentEnabled = settings.general.adaptiveQualityEnabled !== false;

        // Apply performance targets
        if (settings.general.targetFPS) {
            this.performanceTargets.targetFPS = settings.general.targetFPS;
            this.performanceTargets.maxFrameTime = 1000 / settings.general.targetFPS;
        }

        console.log(`Applied loaded settings: level=${this.currentQualityLevel}, preset=${this.currentPreset}`);
    }

    /**
     * Save current settings to storage
     */
    async saveCurrentSettings() {
        try {
            const currentSettings = this.qualitySettings.getCurrentSettings() || this.qualitySettings.defaultSettings;

            // Update general settings with current state
            currentSettings.general.qualityLevel = this.currentQualityLevel;
            currentSettings.general.preset = this.currentPreset;
            currentSettings.general.adaptiveQualityEnabled = this.dynamicAdjustmentEnabled;
            currentSettings.general.targetFPS = this.performanceTargets.targetFPS;

            // Update quality-specific settings based on current preset
            const qualitySettings = this.getCurrentQualitySettings();
            if (qualitySettings.rendering) {
                currentSettings.rendering = { ...currentSettings.rendering, ...qualitySettings.rendering };
            }
            if (qualitySettings.ai) {
                currentSettings.ai = { ...currentSettings.ai, ...qualitySettings.ai };
            }
            if (qualitySettings.physics) {
                currentSettings.physics = { ...currentSettings.physics, ...qualitySettings.physics };
            }
            if (qualitySettings.effects) {
                currentSettings.effects = { ...currentSettings.effects, ...qualitySettings.effects };
            }

            await this.qualitySettings.saveSettings(currentSettings);
            console.log('Current settings saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save current settings:', error);
            return false;
        }
    }

    /**
     * Get comprehensive quality settings for all systems
     */
    getComprehensiveQualitySettings() {
        const settings = this.qualitySettings.getCurrentSettings();
        if (!settings) {
            return this.getCurrentQualitySettings(); // Fallback to preset-based settings
        }

        // Merge current preset settings with saved comprehensive settings
        const presetSettings = this.getCurrentQualitySettings();

        return {
            level: this.currentQualityLevel,
            preset: this.currentPreset,
            rendering: { ...settings.rendering, ...presetSettings.rendering },
            ai: { ...settings.ai, ...presetSettings.ai },
            physics: { ...settings.physics, ...presetSettings.physics },
            effects: { ...settings.effects, ...presetSettings.effects },
            memory: settings.memory || {},
            monitoring: settings.monitoring || {},
            debug: settings.debug || {}
        };
    }

    /**
     * Update and save a specific setting
     */
    async updateSetting(path, value) {
        try {
            this.qualitySettings.updateSetting(path, value);

            // If it's a general setting that affects our state, update accordingly
            if (path.startsWith('general.')) {
                const settingName = path.split('.')[1];
                switch (settingName) {
                    case 'qualityLevel':
                        this.setQualityLevel(value);
                        break;
                    case 'preset':
                        this.applyPreset(value);
                        break;
                    case 'adaptiveQualityEnabled':
                        this.enableDynamicAdjustment(value);
                        break;
                    case 'targetFPS':
                        this.setTargetFPS(value);
                        break;
                }
            }

            await this.qualitySettings.saveSettings();
            console.log(`Setting updated and saved: ${path} = ${value}`);
            return true;
        } catch (error) {
            console.error(`Failed to update setting ${path}:`, error);
            return false;
        }
    }

    /**
     * Export current settings
     */
    exportSettings() {
        return this.qualitySettings.exportSettings();
    }

    /**
     * Import settings from JSON
     */
    async importSettings(jsonString) {
        try {
            const success = await this.qualitySettings.importSettings(jsonString);
            if (success) {
                this.applyLoadedSettings();
                console.log('Settings imported and applied successfully');
            }
            return success;
        } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
        }
    }

    /**
     * Reset settings to defaults
     */
    async resetToDefaults() {
        this.qualitySettings.resetToDefaults();
        await this.qualitySettings.saveSettings();

        // Reset our state
        this.currentQualityLevel = 75;
        this.currentPreset = 'medium';
        this.targetQualityLevel = 75;
        this.dynamicAdjustmentEnabled = true;
        this.adjustmentHistory = [];

        console.log('Settings reset to defaults');
    }

    /**
     * Create a custom preset from current settings
     */
    createCustomPreset(name, description = '') {
        const preset = this.qualitySettings.createPresetFromCurrent(name, description);
        this.qualityPresets[name] = preset;
        console.log(`Custom preset '${name}' created`);
        return preset;
    }

    /**
     * Dispose of the adaptive quality manager
     */
    dispose() {
        console.log('Disposing AdaptiveQualityManager...');

        // Save current settings before disposing
        this.saveCurrentSettings().catch(error => {
            console.warn('Failed to save settings during disposal:', error);
        });

        // Cancel any ongoing transition and dispose transition system
        this.cancelQualityTransition();
        if (this.transitionSystem) {
            this.transitionSystem.dispose();
        }

        // Clear callbacks
        this.qualityChangeCallbacks = [];
        this.transitionCallbacks = [];

        // Clear history
        this.adjustmentHistory = [];

        // Reset hardware detector if we own it
        if (this.hardwareDetector) {
            this.hardwareDetector.reset();
        }

        console.log('AdaptiveQualityManager disposed');
    }
}
