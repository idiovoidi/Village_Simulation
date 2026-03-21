/**
 * Physics optimization system for Havok physics performance tuning
 * Manages physics update frequency, body sleep states, and simulation quality
 */

export class PhysicsOptimizer {
    constructor(scene, performanceMonitor = null) {
        this.scene = scene;
        this.performanceMonitor = performanceMonitor;

        // Physics engine reference
        this.physicsEngine = null;

        // Optimization settings
        this.settings = {
            // Update frequency scaling
            baseUpdateFrequency: 60, // Hz
            currentUpdateFrequency: 60,
            minUpdateFrequency: 20,
            maxUpdateFrequency: 120,

            // Sleep management
            sleepThreshold: 0.1, // Linear velocity threshold for sleep
            sleepAngularThreshold: 0.1, // Angular velocity threshold for sleep
            sleepTimeThreshold: 1.0, // Time in seconds before considering sleep
            maxSleepingBodies: 1000,

            // Quality scaling
            baseCollisionAccuracy: 1.0,
            currentCollisionAccuracy: 1.0,
            minCollisionAccuracy: 0.3,
            maxCollisionAccuracy: 1.0,

            baseSolverIterations: 10,
            currentSolverIterations: 10,
            minSolverIterations: 4,
            maxSolverIterations: 20
        };

        // Performance tracking
        this.metrics = {
            activeBodies: 0,
            sleepingBodies: 0,
            totalBodies: 0,
            updateTime: 0,
            collisionChecks: 0,
            lastUpdateTime: 0
        };

        // Body management
        this.trackedBodies = new Map(); // bodyId -> body info
        this.sleepCandidates = new Set();
        this.forcedAwakeBodies = new Set();

        // Performance thresholds
        this.performanceThresholds = {
            targetFrameTime: 16.67, // 60 FPS target
            warningFrameTime: 20.0,  // 50 FPS warning
            criticalFrameTime: 33.33 // 30 FPS critical
        };

        // Optimization state
        this.isOptimizing = false;
        this.lastOptimizationTime = 0;
        this.optimizationInterval = 100; // ms between optimization checks

        // Initialize when scene is ready
        this.initialize();
    }

    /**
     * Initialize the physics optimizer
     */
    initialize() {
        if (!this.scene) {
            console.warn('PhysicsOptimizer: Scene not available');
            return;
        }

        // Get physics engine reference
        this.physicsEngine = this.scene.getPhysicsEngine();

        if (!this.physicsEngine) {
            console.warn('PhysicsOptimizer: Physics engine not available');
            return;
        }

        console.log('PhysicsOptimizer: Initialized successfully');

        // Set up initial physics settings
        this.applyPhysicsSettings();

        // Start optimization if performance monitor is available
        if (this.performanceMonitor) {
            this.startOptimization();
        }
    }

    /**
     * Start physics optimization
     */
    startOptimization() {
        if (this.isOptimizing) {
            return;
        }

        this.isOptimizing = true;
        console.log('PhysicsOptimizer: Starting optimization');

        // Set up performance monitoring callback
        if (this.performanceMonitor) {
            this.performanceMonitor.onMetricsUpdate(metrics => {
                this.onPerformanceUpdate(metrics);
            });
        }
    }

    /**
     * Stop physics optimization
     */
    stopOptimization() {
        if (!this.isOptimizing) {
            return;
        }

        this.isOptimizing = false;
        console.log('PhysicsOptimizer: Stopping optimization');
    }

    /**
     * Handle performance metrics update
     */
    onPerformanceUpdate(metrics) {
        if (!this.isOptimizing) {
            return;
        }

        const currentTime = performance.now();

        // Throttle optimization checks
        if (currentTime - this.lastOptimizationTime < this.optimizationInterval) {
            return;
        }

        this.lastOptimizationTime = currentTime;

        // Update physics metrics
        this.updatePhysicsMetrics();

        // Analyze performance and adjust settings
        this.analyzePerformanceAndOptimize(metrics);
    }

    /**
     * Update physics-specific metrics
     */
    updatePhysicsMetrics() {
        if (!this.physicsEngine) {
            return;
        }

        const startTime = performance.now();

        // Count active and sleeping bodies
        let activeBodies = 0;
        let sleepingBodies = 0;
        let totalBodies = 0;

        // Iterate through all physics-enabled meshes
        this.scene.meshes.forEach(mesh => {
            if (mesh.physicsImpostor) {
                totalBodies++;

                const body = mesh.physicsImpostor.physicsBody;
                if (body) {
                    // Check if body is sleeping (Havok-specific check)
                    if (this.isBodySleeping(body)) {
                        sleepingBodies++;
                    } else {
                        activeBodies++;
                    }
                }
            }
        });

        // Update metrics
        this.metrics.activeBodies = activeBodies;
        this.metrics.sleepingBodies = sleepingBodies;
        this.metrics.totalBodies = totalBodies;
        this.metrics.lastUpdateTime = performance.now() - startTime;
    }

    /**
     * Check if a physics body is sleeping
     */
    isBodySleeping(body) {
        if (!body) return false;

        try {
            // Havok-specific sleep check
            if (body.getMotionType && body.getLinearVelocity && body.getAngularVelocity) {
                const motionType = body.getMotionType();

                // Static bodies are considered "sleeping"
                if (motionType === 0) { // STATIC
                    return true;
                }

                // Check velocity thresholds for dynamic bodies
                const linearVel = body.getLinearVelocity();
                const angularVel = body.getAngularVelocity();

                const linearSpeed = Math.sqrt(
                    linearVel.x * linearVel.x
                    + linearVel.y * linearVel.y
                    + linearVel.z * linearVel.z
                );

                const angularSpeed = Math.sqrt(
                    angularVel.x * angularVel.x
                    + angularVel.y * angularVel.y
                    + angularVel.z * angularVel.z
                );

                return linearSpeed < this.settings.sleepThreshold
                       && angularSpeed < this.settings.sleepAngularThreshold;
            }
        } catch (error) {
            // Fallback for different Havok API versions
            console.warn('PhysicsOptimizer: Error checking body sleep state:', error);
        }

        return false;
    }

    /**
     * Analyze performance and apply optimizations
     */
    analyzePerformanceAndOptimize(metrics) {
        if (!metrics || !metrics.frameRate) {
            return;
        }

        const currentFrameTime = 1000 / metrics.frameRate.current; // ms

        // Determine optimization level needed
        let optimizationLevel = 0; // 0 = none, 1 = light, 2 = moderate, 3 = aggressive

        if (currentFrameTime > this.performanceThresholds.criticalFrameTime) {
            optimizationLevel = 3;
        } else if (currentFrameTime > this.performanceThresholds.warningFrameTime) {
            optimizationLevel = 2;
        } else if (currentFrameTime > this.performanceThresholds.targetFrameTime) {
            optimizationLevel = 1;
        }

        // Apply optimizations based on level
        this.applyOptimizationLevel(optimizationLevel);

        // Manage sleeping bodies
        this.manageSleepingBodies();
    }

    /**
     * Apply optimization level
     */
    applyOptimizationLevel(level) {
        const prevFreq = this.settings.currentUpdateFrequency;
        const prevAccuracy = this.settings.currentCollisionAccuracy;
        const prevIterations = this.settings.currentSolverIterations;

        switch (level) {
            case 0: // No optimization needed - restore to base settings
                this.settings.currentUpdateFrequency = this.settings.baseUpdateFrequency;
                this.settings.currentCollisionAccuracy = this.settings.baseCollisionAccuracy;
                this.settings.currentSolverIterations = this.settings.baseSolverIterations;
                break;

            case 1: // Light optimization
                this.settings.currentUpdateFrequency = Math.max(
                    this.settings.minUpdateFrequency,
                    this.settings.baseUpdateFrequency * 0.9
                );
                this.settings.currentCollisionAccuracy = Math.max(
                    this.settings.minCollisionAccuracy,
                    this.settings.baseCollisionAccuracy * 0.95
                );
                this.settings.currentSolverIterations = Math.max(
                    this.settings.minSolverIterations,
                    Math.floor(this.settings.baseSolverIterations * 0.9)
                );
                break;

            case 2: // Moderate optimization
                this.settings.currentUpdateFrequency = Math.max(
                    this.settings.minUpdateFrequency,
                    this.settings.baseUpdateFrequency * 0.75
                );
                this.settings.currentCollisionAccuracy = Math.max(
                    this.settings.minCollisionAccuracy,
                    this.settings.baseCollisionAccuracy * 0.8
                );
                this.settings.currentSolverIterations = Math.max(
                    this.settings.minSolverIterations,
                    Math.floor(this.settings.baseSolverIterations * 0.7)
                );
                break;

            case 3: // Aggressive optimization
                this.settings.currentUpdateFrequency = this.settings.minUpdateFrequency;
                this.settings.currentCollisionAccuracy = this.settings.minCollisionAccuracy;
                this.settings.currentSolverIterations = this.settings.minSolverIterations;
                break;
        }

        // Apply settings if they changed
        if (prevFreq !== this.settings.currentUpdateFrequency
            || prevAccuracy !== this.settings.currentCollisionAccuracy
            || prevIterations !== this.settings.currentSolverIterations) {
            this.applyPhysicsSettings();

            console.log(`PhysicsOptimizer: Applied level ${level} optimization - `
                       + `Freq: ${this.settings.currentUpdateFrequency}Hz, `
                       + `Accuracy: ${this.settings.currentCollisionAccuracy.toFixed(2)}, `
                       + `Iterations: ${this.settings.currentSolverIterations}`);
        }
    }

    /**
     * Apply current physics settings to the engine
     */
    applyPhysicsSettings() {
        if (!this.physicsEngine) {
            return;
        }

        try {
            // Set physics update frequency
            if (this.physicsEngine.setTimeStep) {
                const timeStep = 1.0 / this.settings.currentUpdateFrequency;
                this.physicsEngine.setTimeStep(timeStep);
            }

            // Apply solver iterations if supported
            if (this.physicsEngine.setNumSolverIterations) {
                this.physicsEngine.setNumSolverIterations(this.settings.currentSolverIterations);
            }

            // Apply collision accuracy settings if supported
            if (this.physicsEngine.setCollisionMargin) {
                const margin = 0.01 * (2.0 - this.settings.currentCollisionAccuracy);
                this.physicsEngine.setCollisionMargin(margin);
            }
        } catch (error) {
            console.warn('PhysicsOptimizer: Error applying physics settings:', error);
        }
    }

    /**
     * Manage sleeping bodies for performance
     */
    manageSleepingBodies() {
        if (!this.physicsEngine) {
            return;
        }

        const currentTime = performance.now();

        // Check bodies for sleep candidates
        this.scene.meshes.forEach(mesh => {
            if (mesh.physicsImpostor && mesh.physicsImpostor.physicsBody) {
                const body = mesh.physicsImpostor.physicsBody;
                const bodyId = mesh.uniqueId;

                // Skip forced awake bodies
                if (this.forcedAwakeBodies.has(bodyId)) {
                    return;
                }

                // Check if body should be put to sleep
                if (this.shouldBodySleep(body, bodyId, currentTime)) {
                    this.putBodyToSleep(body, bodyId);
                }
            }
        });

        // Clean up old tracking data
        this.cleanupBodyTracking(currentTime);
    }

    /**
     * Check if a body should be put to sleep
     */
    shouldBodySleep(body, bodyId, currentTime) {
        if (!body || this.isBodySleeping(body)) {
            return false;
        }

        try {
            // Get body velocities
            const linearVel = body.getLinearVelocity();
            const angularVel = body.getAngularVelocity();

            const linearSpeed = Math.sqrt(
                linearVel.x * linearVel.x
                + linearVel.y * linearVel.y
                + linearVel.z * linearVel.z
            );

            const angularSpeed = Math.sqrt(
                angularVel.x * angularVel.x
                + angularVel.y * angularVel.y
                + angularVel.z * angularVel.z
            );

            // Check if body is moving slowly enough to be a sleep candidate
            const isSlowEnough = linearSpeed < this.settings.sleepThreshold
                               && angularSpeed < this.settings.sleepAngularThreshold;

            if (isSlowEnough) {
                // Track when body became slow
                if (!this.trackedBodies.has(bodyId)) {
                    this.trackedBodies.set(bodyId, {
                        slowSince: currentTime,
                        lastPosition: body.getPosition ? body.getPosition() : null,
                        lastRotation: body.getRotation ? body.getRotation() : null
                    });
                    return false;
                }

                // Check if body has been slow long enough
                const bodyInfo = this.trackedBodies.get(bodyId);
                const slowDuration = (currentTime - bodyInfo.slowSince) / 1000; // seconds

                return slowDuration >= this.settings.sleepTimeThreshold;
            } else {
                // Body is moving, remove from tracking
                this.trackedBodies.delete(bodyId);
                return false;
            }
        } catch (error) {
            console.warn('PhysicsOptimizer: Error checking body sleep condition:', error);
            return false;
        }
    }

    /**
     * Put a body to sleep
     */
    putBodyToSleep(body, bodyId) {
        try {
            // Havok-specific sleep method
            if (body.setMotionType) {
                // Set to kinematic or static to "sleep" the body
                body.setMotionType(1); // KINEMATIC
            } else if (body.setLinearVelocity && body.setAngularVelocity) {
                // Fallback: zero out velocities
                body.setLinearVelocity({ x: 0, y: 0, z: 0 });
                body.setAngularVelocity({ x: 0, y: 0, z: 0 });
            }

            // Remove from tracking
            this.trackedBodies.delete(bodyId);
        } catch (error) {
            console.warn('PhysicsOptimizer: Error putting body to sleep:', error);
        }
    }

    /**
     * Wake up a body
     */
    wakeUpBody(body, bodyId) {
        try {
            // Havok-specific wake method
            if (body.setMotionType) {
                body.setMotionType(2); // DYNAMIC
            }

            // Remove from sleep candidates and add to forced awake
            this.sleepCandidates.delete(bodyId);
            this.forcedAwakeBodies.add(bodyId);

            // Remove forced awake status after a short time
            setTimeout(() => {
                this.forcedAwakeBodies.delete(bodyId);
            }, 5000); // 5 seconds
        } catch (error) {
            console.warn('PhysicsOptimizer: Error waking up body:', error);
        }
    }

    /**
     * Clean up old body tracking data
     */
    cleanupBodyTracking(currentTime) {
        const maxAge = 30000; // 30 seconds

        for (const [bodyId, bodyInfo] of this.trackedBodies.entries()) {
            if (currentTime - bodyInfo.slowSince > maxAge) {
                this.trackedBodies.delete(bodyId);
            }
        }
    }

    /**
     * Get current physics metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            settings: { ...this.settings },
            optimization: {
                isOptimizing: this.isOptimizing,
                trackedBodies: this.trackedBodies.size,
                sleepCandidates: this.sleepCandidates.size,
                forcedAwakeBodies: this.forcedAwakeBodies.size
            }
        };
    }

    /**
     * Set physics update frequency
     */
    setUpdateFrequency(frequency) {
        this.settings.currentUpdateFrequency = Math.max(
            this.settings.minUpdateFrequency,
            Math.min(this.settings.maxUpdateFrequency, frequency)
        );

        this.applyPhysicsSettings();
    }

    /**
     * Set collision accuracy
     */
    setCollisionAccuracy(accuracy) {
        this.settings.currentCollisionAccuracy = Math.max(
            this.settings.minCollisionAccuracy,
            Math.min(this.settings.maxCollisionAccuracy, accuracy)
        );

        this.applyPhysicsSettings();
    }

    /**
     * Set solver iterations
     */
    setSolverIterations(iterations) {
        this.settings.currentSolverIterations = Math.max(
            this.settings.minSolverIterations,
            Math.min(this.settings.maxSolverIterations, iterations)
        );

        this.applyPhysicsSettings();
    }

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.settings.currentUpdateFrequency = this.settings.baseUpdateFrequency;
        this.settings.currentCollisionAccuracy = this.settings.baseCollisionAccuracy;
        this.settings.currentSolverIterations = this.settings.baseSolverIterations;

        this.applyPhysicsSettings();

        console.log('PhysicsOptimizer: Reset to default settings');
    }

    /**
     * Dispose of the physics optimizer
     */
    dispose() {
        this.stopOptimization();

        // Clear tracking data
        this.trackedBodies.clear();
        this.sleepCandidates.clear();
        this.forcedAwakeBodies.clear();

        // Reset references
        this.scene = null;
        this.physicsEngine = null;
        this.performanceMonitor = null;

        console.log('PhysicsOptimizer: Disposed');
    }
}
