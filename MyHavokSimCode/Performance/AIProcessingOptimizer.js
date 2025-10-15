/**
 * AIProcessingOptimizer - Main AI processing optimization system
 * Integrates AgentScheduler, BehaviorOptimizer, and AgentPerformanceTracker
 */

import { AgentScheduler } from './AgentScheduler.js';
import { BehaviorOptimizer } from './BehaviorOptimizer.js';

export class AIProcessingOptimizer {
    constructor(scene, camera, performanceTracker) {
        this.scene = scene;
        this.camera = camera;
        this.performanceTracker = performanceTracker;
        
        // Initialize optimization components
        this.agentScheduler = new AgentScheduler(scene, camera);
        this.behaviorOptimizer = new BehaviorOptimizer(scene);
        
        // Integration state
        this.isInitialized = false;
        this.isOptimizing = true;
        
        // Registered agents and their optimization data
        this.optimizedAgents = new Map(); // agentId -> optimization data
        
        // Performance monitoring
        this.frameCounter = 0;
        this.lastPerformanceCheck = performance.now();
        this.performanceCheckInterval = 1000; // Check every second
        
        // Optimization settings
        this.settings = {
            enableScheduling: true,
            enableBehaviorOptimization: true,
            enablePerformanceTracking: true,
            adaptiveComplexity: true,
            qualityAdjustments: true
        };
        
        console.log('AIProcessingOptimizer initialized');
    }

    /**
     * Initialize the AI processing optimization system
     */
    initialize() {
        if (this.isInitialized) {
            console.warn('AIProcessingOptimizer already initialized');
            return;
        }

        // Start performance tracking if not already started
        if (!this.performanceTracker.isTracking) {
            this.performanceTracker.start();
        }

        // Set up frame-based optimization loop
        this.scene.onBeforeRenderObservable.add(() => {
            if (this.isOptimizing) {
                this.processOptimizations();
            }
        });

        this.isInitialized = true;
        console.log('AIProcessingOptimizer fully initialized');
    }

    /**
     * Register an agent for AI processing optimization
     */
    registerAgent(agentId, agentData) {
        if (this.optimizedAgents.has(agentId)) {
            console.warn(`Agent ${agentId} already registered for optimization`);
            return false;
        }

        // Register with performance tracker
        if (this.settings.enablePerformanceTracking) {
            this.performanceTracker.registerAgent(
                agentId, 
                agentData.type || 'unknown',
                agentData.position
            );
        }

        // Create optimized update callback
        const optimizedCallback = this.createOptimizedUpdateCallback(agentId, agentData.updateCallback);

        // Register with scheduler
        if (this.settings.enableScheduling) {
            this.agentScheduler.registerAgent(agentId, {
                ...agentData,
                updateCallback: optimizedCallback
            });
        }

        // Store optimization data
        this.optimizedAgents.set(agentId, {
            id: agentId,
            originalCallback: agentData.updateCallback,
            optimizedCallback: optimizedCallback,
            behaviorType: agentData.behaviorType || 'default',
            mesh: agentData.mesh,
            lastOptimizationTime: 0,
            optimizationLevel: 1.0,
            
            // Behavior optimization state
            cachedBehaviors: new Map(),
            sharedComputationGroups: new Set(),
            
            // Performance state
            performanceHistory: [],
            qualityLevel: 1.0
        });

        return true;
    }

    /**
     * Unregister an agent from optimization
     */
    unregisterAgent(agentId) {
        if (!this.optimizedAgents.has(agentId)) {
            return false;
        }

        // Unregister from scheduler
        if (this.settings.enableScheduling) {
            this.agentScheduler.unregisterAgent(agentId);
        }

        // Unregister from performance tracker
        if (this.settings.enablePerformanceTracking) {
            this.performanceTracker.unregisterAgent(agentId);
        }

        // Clean up optimization data
        this.optimizedAgents.delete(agentId);

        return true;
    }

    /**
     * Create optimized update callback for an agent
     */
    createOptimizedUpdateCallback(agentId, originalCallback) {
        return (deltaTime, schedulingInfo) => {
            const startTime = performance.now();
            
            // Start performance tracking
            let timingData = null;
            if (this.settings.enablePerformanceTracking) {
                timingData = this.performanceTracker.startAgentUpdate(agentId);
            }

            try {
                // Get agent optimization data
                const optimizationData = this.optimizedAgents.get(agentId);
                if (!optimizationData) {
                    // Fallback to original callback
                    originalCallback(deltaTime, schedulingInfo);
                    return;
                }

                // Apply behavior optimizations if enabled
                let optimizedDeltaTime = deltaTime;
                let behaviorContext = {};
                
                if (this.settings.enableBehaviorOptimization) {
                    const complexitySettings = this.behaviorOptimizer.getComplexitySettings();
                    optimizedDeltaTime = deltaTime * complexitySettings.decisionFrequency;
                    
                    behaviorContext = {
                        complexityLevel: this.behaviorOptimizer.currentComplexity,
                        qualityLevel: optimizationData.qualityLevel,
                        cacheEnabled: true,
                        sharedComputation: true
                    };
                }

                // Execute the original callback with optimizations
                const enhancedSchedulingInfo = {
                    ...schedulingInfo,
                    optimizationLevel: optimizationData.optimizationLevel,
                    behaviorContext
                };

                originalCallback(optimizedDeltaTime, enhancedSchedulingInfo);

                // Track successful execution
                const executionTime = performance.now() - startTime;
                this.trackOptimizationSuccess(agentId, executionTime, behaviorContext);

            } catch (error) {
                console.error(`Error in optimized update for agent ${agentId}:`, error);
                
                // Fallback to original callback
                try {
                    originalCallback(deltaTime, schedulingInfo);
                } catch (fallbackError) {
                    console.error(`Fallback also failed for agent ${agentId}:`, fallbackError);
                }
            } finally {
                // End performance tracking
                if (timingData && this.settings.enablePerformanceTracking) {
                    const result = this.performanceTracker.endAgentUpdate(timingData);
                    
                    // Track budget usage
                    if (result) {
                        this.performanceTracker.trackBudgetUsage(agentId, result.duration);
                    }
                }
            }
        };
    }

    /**
     * Process frame-based optimizations
     */
    processOptimizations() {
        this.frameCounter++;
        const now = performance.now();
        
        // Periodic performance checks
        if (now - this.lastPerformanceCheck >= this.performanceCheckInterval) {
            this.performPerformanceOptimizations();
            this.lastPerformanceCheck = now;
        }

        // Update global performance budget
        if (this.settings.enablePerformanceTracking) {
            const frameTime = this.scene.getEngine().getDeltaTime();
            this.performanceTracker.updateGlobalBudget(frameTime);
        }
    }

    /**
     * Perform periodic performance optimizations
     */
    performPerformanceOptimizations() {
        if (!this.settings.adaptiveComplexity) {
            return;
        }

        // Get current performance metrics
        const performanceMetrics = this.performanceTracker.getCurrentMetrics();
        const optimizationMetrics = this.performanceTracker.getOptimizationMetrics();
        
        // Adjust behavior complexity based on performance
        this.behaviorOptimizer.adjustComplexityForPerformance({
            frameRate: {
                current: this.scene.getEngine().getFps(),
                target: 60
            }
        });

        // Check for agents that need quality adjustments
        this.checkAgentQualityAdjustments(performanceMetrics);
        
        // Log optimization status periodically
        if (this.frameCounter % 300 === 0) { // Every 5 seconds at 60fps
            this.logOptimizationStatus(performanceMetrics, optimizationMetrics);
        }
    }

    /**
     * Check and apply agent quality adjustments
     */
    checkAgentQualityAdjustments(performanceMetrics) {
        const bottleneckAgents = this.performanceTracker.getBottleneckAgents();
        
        for (const agentPerf of bottleneckAgents) {
            const optimizationData = this.optimizedAgents.get(agentPerf.id);
            if (!optimizationData) continue;

            // Reduce quality for bottleneck agents
            if (optimizationData.qualityLevel > 0.3) {
                optimizationData.qualityLevel = Math.max(0.3, optimizationData.qualityLevel - 0.1);
                
                // Update scheduler priority
                if (this.settings.enableScheduling) {
                    this.agentScheduler.setPlayerInteracting(agentPerf.id, false);
                }
                
                console.log(`Reduced quality for bottleneck agent ${agentPerf.id} to ${optimizationData.qualityLevel}`);
            }
        }
    }

    /**
     * Track optimization success
     */
    trackOptimizationSuccess(agentId, executionTime, behaviorContext) {
        const optimizationData = this.optimizedAgents.get(agentId);
        if (!optimizationData) return;

        // Update optimization history
        optimizationData.performanceHistory.push({
            timestamp: performance.now(),
            executionTime,
            qualityLevel: optimizationData.qualityLevel,
            behaviorContext
        });

        // Limit history size
        if (optimizationData.performanceHistory.length > 100) {
            optimizationData.performanceHistory.shift();
        }

        // Track behavior optimization metrics
        if (this.settings.enablePerformanceTracking && behaviorContext.cacheEnabled) {
            this.performanceTracker.trackBehaviorOptimization(agentId, {
                cacheHit: behaviorContext.cacheHit || false,
                behaviorType: optimizationData.behaviorType,
                complexityLevel: behaviorContext.complexityLevel,
                sharedComputation: behaviorContext.sharedComputation || false
            });
        }
    }

    /**
     * Optimize flocking behavior for multiple agents
     */
    optimizeFlockingBehavior(agents, options = {}) {
        if (!this.settings.enableBehaviorOptimization) {
            return null;
        }

        const results = this.behaviorOptimizer.optimizeFlockingBehavior(agents, options);
        
        // Track optimization for each agent
        for (const [agentId, result] of results) {
            if (this.settings.enablePerformanceTracking) {
                this.performanceTracker.trackBehaviorOptimization(agentId, {
                    cacheHit: result.cached || false,
                    behaviorType: 'flocking',
                    sharedComputation: true
                });
            }
        }
        
        return results;
    }

    /**
     * Optimize pathfinding behavior for an agent
     */
    optimizePathfindingBehavior(agentId, start, end, options = {}) {
        if (!this.settings.enableBehaviorOptimization) {
            return null;
        }

        const agent = this.optimizedAgents.get(agentId);
        if (!agent) return null;

        const result = this.behaviorOptimizer.optimizePathfindingBehavior(
            { id: agentId, mesh: agent.mesh }, 
            start, 
            end, 
            options
        );
        
        // Track optimization
        if (this.settings.enablePerformanceTracking) {
            this.performanceTracker.trackBehaviorOptimization(agentId, {
                cacheHit: result.cached || false,
                behaviorType: 'pathfinding',
                complexityLevel: result.accuracy
            });
        }
        
        return result;
    }

    /**
     * Set agent as player-interacting for priority scheduling
     */
    setAgentPlayerInteracting(agentId, isInteracting) {
        if (this.settings.enableScheduling) {
            return this.agentScheduler.setPlayerInteracting(agentId, isInteracting);
        }
        return false;
    }

    /**
     * Set agent critical behavior status
     */
    setAgentCriticalBehavior(agentId, isCritical) {
        if (this.settings.enableScheduling) {
            return this.agentScheduler.setCriticalBehavior(agentId, isCritical);
        }
        return false;
    }

    /**
     * Force update for a specific agent
     */
    forceAgentUpdate(agentId) {
        if (this.settings.enableScheduling) {
            return this.agentScheduler.forceAgentUpdate(agentId);
        }
        return false;
    }

    /**
     * Update optimization settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Apply settings to components
        if (this.agentScheduler) {
            this.agentScheduler.setSchedulingEnabled(this.settings.enableScheduling);
        }
        
        if (this.behaviorOptimizer) {
            this.behaviorOptimizer.setAdaptiveComplexity(this.settings.adaptiveComplexity);
        }
        
        if (this.performanceTracker) {
            this.performanceTracker.configureQualityTriggers({
                enabled: this.settings.qualityAdjustments
            });
        }
    }

    /**
     * Get comprehensive optimization metrics
     */
    getOptimizationMetrics() {
        const schedulerMetrics = this.agentScheduler.getMetrics();
        const behaviorMetrics = this.behaviorOptimizer.getMetrics();
        const performanceMetrics = this.performanceTracker.getOptimizationMetrics();
        
        return {
            scheduler: schedulerMetrics,
            behavior: behaviorMetrics,
            performance: performanceMetrics,
            
            // Combined metrics
            totalOptimizedAgents: this.optimizedAgents.size,
            frameCounter: this.frameCounter,
            isOptimizing: this.isOptimizing,
            settings: { ...this.settings }
        };
    }

    /**
     * Get agent-specific optimization data
     */
    getAgentOptimizationData(agentId) {
        const optimizationData = this.optimizedAgents.get(agentId);
        if (!optimizationData) return null;

        const schedulerData = this.agentScheduler.getAgentPerformance(agentId);
        const performanceData = this.performanceTracker.getAgentOptimizationPerformance(agentId);
        
        return {
            optimization: {
                id: optimizationData.id,
                behaviorType: optimizationData.behaviorType,
                optimizationLevel: optimizationData.optimizationLevel,
                qualityLevel: optimizationData.qualityLevel,
                cachedBehaviorCount: optimizationData.cachedBehaviors.size,
                sharedComputationGroups: optimizationData.sharedComputationGroups.size
            },
            scheduler: schedulerData,
            performance: performanceData
        };
    }

    /**
     * Log optimization status
     */
    logOptimizationStatus(performanceMetrics, optimizationMetrics) {
        console.log('AI Processing Optimization Status:', {
            optimizedAgents: this.optimizedAgents.size,
            activeAgents: performanceMetrics.activeAgents,
            cacheHitRate: optimizationMetrics.cacheHitRate,
            schedulingEfficiency: optimizationMetrics.schedulingEfficiency,
            qualityAdjustments: optimizationMetrics.qualityAdjustments,
            behaviorComplexity: this.behaviorOptimizer.currentComplexity
        });
    }

    /**
     * Enable or disable optimization
     */
    setOptimizationEnabled(enabled) {
        this.isOptimizing = enabled;
        
        if (this.agentScheduler) {
            this.agentScheduler.setSchedulingEnabled(enabled && this.settings.enableScheduling);
        }
    }

    /**
     * Dispose of the AI processing optimizer
     */
    dispose() {
        this.isOptimizing = false;
        
        // Dispose of components
        if (this.agentScheduler) {
            this.agentScheduler.dispose();
        }
        
        if (this.behaviorOptimizer) {
            this.behaviorOptimizer.dispose();
        }
        
        // Clear optimization data
        this.optimizedAgents.clear();
        
        console.log('AIProcessingOptimizer disposed');
    }
}