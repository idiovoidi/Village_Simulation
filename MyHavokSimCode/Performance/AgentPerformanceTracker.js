/**
 * Agent performance tracking component
 * Monitors individual agent performance and behavior execution times
 */

export class AgentPerformanceTracker {
    constructor() {
        // Tracking state
        this.isTracking = false;
        this.agentProfiles = new Map(); // Agent ID -> performance data
        this.behaviorProfiles = new Map(); // Behavior type -> aggregated data
        
        // Performance thresholds (in milliseconds)
        this.thresholds = {
            update: 2.0,      // Agent update should be < 2ms
            behavior: 1.0,    // Behavior execution should be < 1ms
            pathfinding: 5.0, // Pathfinding should be < 5ms
            collision: 0.5    // Collision detection should be < 0.5ms
        };
        
        // Optimization-specific thresholds
        this.optimizationThresholds = {
            schedulingDelay: 100,     // Max delay between scheduled updates (ms)
            cacheHitRate: 0.7,        // Minimum cache hit rate (70%)
            behaviorComplexity: 1.5,  // Max behavior complexity score
            memoryUsage: 50           // Max memory usage per agent (MB)
        };
        
        // Statistics
        this.totalAgents = 0;
        this.activeAgents = 0;
        this.totalUpdates = 0;
        
        // Optimization metrics
        this.optimizationMetrics = {
            scheduledUpdates: 0,
            skippedUpdates: 0,
            cacheHits: 0,
            cacheMisses: 0,
            behaviorOptimizations: 0,
            qualityAdjustments: 0,
            memoryOptimizations: 0
        };
        
        // Performance budgets
        this.performanceBudgets = new Map(); // Agent ID -> budget data
        this.globalBudget = {
            totalFrameTime: 16.67,    // 60 FPS target
            agentUpdateBudget: 8.0,   // 8ms for all agent updates
            behaviorBudget: 4.0,      // 4ms for behavior processing
            remainingBudget: 16.67
        };
        
        // History management
        this.maxHistorySize = 1000;
        this.performanceHistory = [];
        
        // Alert system
        this.alerts = [];
        this.maxAlerts = 50;
        
        // Quality adjustment triggers
        this.qualityTriggers = {
            enabled: true,
            frameTimeThreshold: 20.0,     // Trigger at 20ms frame time
            consecutiveFrames: 5,         // Trigger after 5 consecutive slow frames
            recoveryFrames: 30,           // Wait 30 frames before increasing quality
            currentSlowFrames: 0,
            currentRecoveryFrames: 0
        };
    }

    /**
     * Start agent performance tracking
     */
    start() {
        if (this.isTracking) {
            console.warn('Agent performance tracking is already active');
            return;
        }

        console.log('Starting agent performance tracking...');
        this.isTracking = true;
        
        // Reset statistics
        this.agentProfiles.clear();
        this.behaviorProfiles.clear();
        this.performanceHistory = [];
        this.alerts = [];
        this.totalUpdates = 0;
    }

    /**
     * Stop agent performance tracking
     */
    stop() {
        if (!this.isTracking) {
            return;
        }

        console.log('Stopping agent performance tracking...');
        this.isTracking = false;
    }

    /**
     * Register an agent for tracking
     */
    registerAgent(agentId, agentType, position = null) {
        if (!this.isTracking) {
            return;
        }

        if (!this.agentProfiles.has(agentId)) {
            this.agentProfiles.set(agentId, {
                id: agentId,
                type: agentType,
                position: position ? { ...position } : null,
                registeredAt: performance.now(),
                
                // Performance metrics
                updateCount: 0,
                totalUpdateTime: 0,
                averageUpdateTime: 0,
                minUpdateTime: Infinity,
                maxUpdateTime: 0,
                lastUpdateTime: 0,
                
                // Behavior tracking
                behaviors: new Map(), // Behavior name -> metrics
                currentBehavior: null,
                behaviorStartTime: 0,
                
                // Pathfinding metrics
                pathfindingCalls: 0,
                totalPathfindingTime: 0,
                averagePathfindingTime: 0,
                
                // Collision metrics
                collisionChecks: 0,
                totalCollisionTime: 0,
                averageCollisionTime: 0,
                
                // State tracking
                isActive: true,
                lastActiveTime: performance.now(),
                
                // Performance flags
                isBottleneck: false,
                alertCount: 0,
                
                // Optimization-specific metrics
                schedulingMetrics: {
                    scheduledUpdates: 0,
                    skippedUpdates: 0,
                    averageSchedulingDelay: 0,
                    lastScheduledFrame: 0,
                    priority: 'medium',
                    distanceCategory: 'medium'
                },
                
                // Behavior optimization metrics
                behaviorOptimization: {
                    cacheHits: 0,
                    cacheMisses: 0,
                    optimizedBehaviors: new Set(),
                    complexityLevel: 'medium',
                    sharedComputations: 0
                },
                
                // Performance budget tracking
                budget: {
                    allocated: 1.0,           // Allocated time budget (ms)
                    used: 0,                  // Used time this frame
                    overbudget: false,        // Whether agent exceeded budget
                    overbudgetCount: 0,       // Number of times over budget
                    budgetEfficiency: 1.0     // Budget usage efficiency
                },
                
                // Quality adjustment tracking
                qualityAdjustments: {
                    reductions: 0,
                    increases: 0,
                    currentLevel: 1.0,
                    lastAdjustment: 0
                }
            });
            
            // Initialize performance budget
            this.initializeAgentBudget(agentId);
            
            this.totalAgents++;
        }
    }

    /**
     * Unregister an agent from tracking
     */
    unregisterAgent(agentId) {
        if (!this.isTracking || !this.agentProfiles.has(agentId)) {
            return;
        }

        const profile = this.agentProfiles.get(agentId);
        profile.isActive = false;
        
        // Keep the profile for historical data but mark as inactive
        // Don't delete immediately to preserve performance history
    }

    /**
     * Start timing an agent update
     */
    startAgentUpdate(agentId) {
        if (!this.isTracking || !this.agentProfiles.has(agentId)) {
            return null;
        }

        const profile = this.agentProfiles.get(agentId);
        const startTime = performance.now();
        
        profile.lastActiveTime = startTime;
        
        return {
            agentId,
            startTime,
            type: 'update'
        };
    }

    /**
     * End timing an agent update
     */
    endAgentUpdate(timingData) {
        if (!this.isTracking || !timingData || !this.agentProfiles.has(timingData.agentId)) {
            return;
        }

        const endTime = performance.now();
        const duration = endTime - timingData.startTime;
        const profile = this.agentProfiles.get(timingData.agentId);
        
        // Update metrics
        profile.updateCount++;
        profile.totalUpdateTime += duration;
        profile.averageUpdateTime = profile.totalUpdateTime / profile.updateCount;
        profile.minUpdateTime = Math.min(profile.minUpdateTime, duration);
        profile.maxUpdateTime = Math.max(profile.maxUpdateTime, duration);
        profile.lastUpdateTime = duration;
        
        this.totalUpdates++;
        
        // Check for performance issues
        this.checkPerformanceThresholds(timingData.agentId, 'update', duration);
        
        // Update active agent count
        this.updateActiveAgentCount();
        
        return {
            agentId: timingData.agentId,
            duration,
            type: 'update'
        };
    }

    /**
     * Start timing a behavior execution
     */
    startBehavior(agentId, behaviorName) {
        if (!this.isTracking || !this.agentProfiles.has(agentId)) {
            return null;
        }

        const profile = this.agentProfiles.get(agentId);
        const startTime = performance.now();
        
        profile.currentBehavior = behaviorName;
        profile.behaviorStartTime = startTime;
        
        return {
            agentId,
            behaviorName,
            startTime,
            type: 'behavior'
        };
    }

    /**
     * End timing a behavior execution
     */
    endBehavior(timingData) {
        if (!this.isTracking || !timingData || !this.agentProfiles.has(timingData.agentId)) {
            return;
        }

        const endTime = performance.now();
        const duration = endTime - timingData.startTime;
        const profile = this.agentProfiles.get(timingData.agentId);
        
        // Update behavior metrics for this agent
        if (!profile.behaviors.has(timingData.behaviorName)) {
            profile.behaviors.set(timingData.behaviorName, {
                name: timingData.behaviorName,
                callCount: 0,
                totalTime: 0,
                averageTime: 0,
                minTime: Infinity,
                maxTime: 0
            });
        }
        
        const behaviorMetrics = profile.behaviors.get(timingData.behaviorName);
        behaviorMetrics.callCount++;
        behaviorMetrics.totalTime += duration;
        behaviorMetrics.averageTime = behaviorMetrics.totalTime / behaviorMetrics.callCount;
        behaviorMetrics.minTime = Math.min(behaviorMetrics.minTime, duration);
        behaviorMetrics.maxTime = Math.max(behaviorMetrics.maxTime, duration);
        
        // Update global behavior metrics
        this.updateGlobalBehaviorMetrics(timingData.behaviorName, duration);
        
        // Check thresholds
        this.checkPerformanceThresholds(timingData.agentId, 'behavior', duration);
        
        profile.currentBehavior = null;
        profile.behaviorStartTime = 0;
        
        return {
            agentId: timingData.agentId,
            behaviorName: timingData.behaviorName,
            duration,
            type: 'behavior'
        };
    }

    /**
     * Track pathfinding performance
     */
    trackPathfinding(agentId, duration) {
        if (!this.isTracking || !this.agentProfiles.has(agentId)) {
            return;
        }

        const profile = this.agentProfiles.get(agentId);
        profile.pathfindingCalls++;
        profile.totalPathfindingTime += duration;
        profile.averagePathfindingTime = profile.totalPathfindingTime / profile.pathfindingCalls;
        
        this.checkPerformanceThresholds(agentId, 'pathfinding', duration);
    }

    /**
     * Track collision detection performance
     */
    trackCollisionDetection(agentId, duration) {
        if (!this.isTracking || !this.agentProfiles.has(agentId)) {
            return;
        }

        const profile = this.agentProfiles.get(agentId);
        profile.collisionChecks++;
        profile.totalCollisionTime += duration;
        profile.averageCollisionTime = profile.totalCollisionTime / profile.collisionChecks;
        
        this.checkPerformanceThresholds(agentId, 'collision', duration);
    }

    /**
     * Update global behavior metrics
     */
    updateGlobalBehaviorMetrics(behaviorName, duration) {
        if (!this.behaviorProfiles.has(behaviorName)) {
            this.behaviorProfiles.set(behaviorName, {
                name: behaviorName,
                callCount: 0,
                totalTime: 0,
                averageTime: 0,
                minTime: Infinity,
                maxTime: 0,
                agentCount: 0
            });
        }
        
        const metrics = this.behaviorProfiles.get(behaviorName);
        metrics.callCount++;
        metrics.totalTime += duration;
        metrics.averageTime = metrics.totalTime / metrics.callCount;
        metrics.minTime = Math.min(metrics.minTime, duration);
        metrics.maxTime = Math.max(metrics.maxTime, duration);
        
        // Count unique agents using this behavior
        const agentsUsingBehavior = new Set();
        for (const [agentId, profile] of this.agentProfiles) {
            if (profile.behaviors.has(behaviorName)) {
                agentsUsingBehavior.add(agentId);
            }
        }
        metrics.agentCount = agentsUsingBehavior.size;
    }

    /**
     * Check performance thresholds and generate alerts
     */
    checkPerformanceThresholds(agentId, type, duration) {
        const threshold = this.thresholds[type];
        if (!threshold || duration <= threshold) {
            return;
        }

        const profile = this.agentProfiles.get(agentId);
        profile.alertCount++;
        
        // Mark as bottleneck if consistently slow
        if (profile.alertCount > 5) {
            profile.isBottleneck = true;
        }
        
        // Create alert
        const alert = {
            timestamp: performance.now(),
            agentId,
            agentType: profile.type,
            type,
            duration: Math.round(duration * 100) / 100,
            threshold,
            severity: duration > threshold * 2 ? 'high' : 'medium'
        };
        
        this.alerts.push(alert);
        
        // Maintain alert history size
        if (this.alerts.length > this.maxAlerts) {
            this.alerts.shift();
        }
    }

    /**
     * Update active agent count
     */
    updateActiveAgentCount() {
        const currentTime = performance.now();
        const activeThreshold = 5000; // 5 seconds
        
        this.activeAgents = 0;
        for (const [agentId, profile] of this.agentProfiles) {
            if (profile.isActive && (currentTime - profile.lastActiveTime) < activeThreshold) {
                this.activeAgents++;
            }
        }
    }

    /**
     * Get current performance metrics
     */
    getCurrentMetrics() {
        this.updateActiveAgentCount();
        
        return {
            isTracking: this.isTracking,
            totalAgents: this.totalAgents,
            activeAgents: this.activeAgents,
            totalUpdates: this.totalUpdates,
            averageUpdatesPerAgent: this.totalAgents > 0 ? 
                Math.round((this.totalUpdates / this.totalAgents) * 100) / 100 : 0,
            
            // Performance summary
            bottleneckAgents: this.getBottleneckAgents().length,
            recentAlerts: this.getRecentAlerts(5000).length, // Last 5 seconds
            
            // Behavior summary
            trackedBehaviors: this.behaviorProfiles.size,
            
            // Thresholds
            thresholds: { ...this.thresholds }
        };
    }

    /**
     * Get performance data for a specific agent
     */
    getAgentPerformance(agentId) {
        const profile = this.agentProfiles.get(agentId);
        if (!profile) {
            return null;
        }

        return {
            id: profile.id,
            type: profile.type,
            isActive: profile.isActive,
            isBottleneck: profile.isBottleneck,
            
            update: {
                count: profile.updateCount,
                averageTime: Math.round(profile.averageTime * 100) / 100,
                minTime: profile.minUpdateTime === Infinity ? 0 : Math.round(profile.minUpdateTime * 100) / 100,
                maxTime: Math.round(profile.maxUpdateTime * 100) / 100,
                lastTime: Math.round(profile.lastUpdateTime * 100) / 100
            },
            
            pathfinding: {
                calls: profile.pathfindingCalls,
                averageTime: Math.round(profile.averagePathfindingTime * 100) / 100,
                totalTime: Math.round(profile.totalPathfindingTime * 100) / 100
            },
            
            collision: {
                checks: profile.collisionChecks,
                averageTime: Math.round(profile.averageCollisionTime * 100) / 100,
                totalTime: Math.round(profile.totalCollisionTime * 100) / 100
            },
            
            behaviors: Array.from(profile.behaviors.values()).map(b => ({
                ...b,
                averageTime: Math.round(b.averageTime * 100) / 100,
                minTime: b.minTime === Infinity ? 0 : Math.round(b.minTime * 100) / 100,
                maxTime: Math.round(b.maxTime * 100) / 100,
                totalTime: Math.round(b.totalTime * 100) / 100
            })),
            
            alertCount: profile.alertCount,
            registeredAt: profile.registeredAt,
            lastActiveTime: profile.lastActiveTime
        };
    }

    /**
     * Get all agent performance data
     */
    getAllAgentPerformance() {
        const agents = [];
        for (const [agentId, profile] of this.agentProfiles) {
            agents.push(this.getAgentPerformance(agentId));
        }
        return agents.sort((a, b) => b.update.averageTime - a.update.averageTime);
    }

    /**
     * Get behavior performance summary
     */
    getBehaviorPerformance() {
        const behaviors = [];
        for (const [name, metrics] of this.behaviorProfiles) {
            behaviors.push({
                ...metrics,
                averageTime: Math.round(metrics.averageTime * 100) / 100,
                minTime: metrics.minTime === Infinity ? 0 : Math.round(metrics.minTime * 100) / 100,
                maxTime: Math.round(metrics.maxTime * 100) / 100,
                totalTime: Math.round(metrics.totalTime * 100) / 100
            });
        }
        return behaviors.sort((a, b) => b.averageTime - a.averageTime);
    }

    /**
     * Get bottleneck agents
     */
    getBottleneckAgents() {
        const bottlenecks = [];
        for (const [agentId, profile] of this.agentProfiles) {
            if (profile.isBottleneck || profile.averageUpdateTime > this.thresholds.update) {
                bottlenecks.push(this.getAgentPerformance(agentId));
            }
        }
        return bottlenecks.sort((a, b) => b.update.averageTime - a.update.averageTime);
    }

    /**
     * Get recent alerts
     */
    getRecentAlerts(timeRangeMs = 10000) {
        const cutoffTime = performance.now() - timeRangeMs;
        return this.alerts.filter(alert => alert.timestamp >= cutoffTime);
    }

    /**
     * Get performance statistics
     */
    getPerformanceStatistics() {
        const allAgents = this.getAllAgentPerformance();
        const activeAgents = allAgents.filter(a => a.isActive);
        
        if (activeAgents.length === 0) {
            return {
                agentCount: 0,
                averageUpdateTime: 0,
                medianUpdateTime: 0,
                p95UpdateTime: 0,
                bottleneckPercentage: 0
            };
        }
        
        const updateTimes = activeAgents.map(a => a.update.averageTime).sort((a, b) => a - b);
        const bottleneckCount = this.getBottleneckAgents().length;
        
        return {
            agentCount: activeAgents.length,
            averageUpdateTime: Math.round((updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length) * 100) / 100,
            medianUpdateTime: Math.round(updateTimes[Math.floor(updateTimes.length / 2)] * 100) / 100,
            p95UpdateTime: Math.round(updateTimes[Math.floor(updateTimes.length * 0.95)] * 100) / 100,
            bottleneckPercentage: Math.round((bottleneckCount / activeAgents.length) * 100 * 100) / 100
        };
    }

    /**
     * Set performance thresholds
     */
    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }

    /**
     * Clear all performance data
     */
    clearData() {
        this.agentProfiles.clear();
        this.behaviorProfiles.clear();
        this.performanceHistory = [];
        this.alerts = [];
        this.totalAgents = 0;
        this.activeAgents = 0;
        this.totalUpdates = 0;
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const metrics = this.getCurrentMetrics();
        const statistics = this.getPerformanceStatistics();
        const bottlenecks = this.getBottleneckAgents();
        const behaviorPerf = this.getBehaviorPerformance();
        const recentAlerts = this.getRecentAlerts();
        
        return {
            summary: metrics,
            statistics,
            bottlenecks: bottlenecks.slice(0, 10), // Top 10 bottlenecks
            behaviors: behaviorPerf.slice(0, 10), // Top 10 behaviors by time
            recentAlerts: recentAlerts.slice(0, 20), // Last 20 alerts
            recommendations: this.generateRecommendations(statistics, bottlenecks, behaviorPerf)
        };
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations(statistics, bottlenecks, behaviors) {
        const recommendations = [];
        
        if (statistics.bottleneckPercentage > 20) {
            recommendations.push(`${statistics.bottleneckPercentage}% of agents are performance bottlenecks. Consider optimizing agent behaviors.`);
        }
        
        if (statistics.p95UpdateTime > this.thresholds.update * 2) {
            recommendations.push(`95th percentile update time (${statistics.p95UpdateTime}ms) is high. Review agent update logic.`);
        }
        
        if (behaviors.length > 0 && behaviors[0].averageTime > this.thresholds.behavior * 3) {
            recommendations.push(`Behavior "${behaviors[0].name}" is very slow (${behaviors[0].averageTime}ms avg). Consider optimization.`);
        }
        
        if (statistics.agentCount > 100 && statistics.averageUpdateTime > 1) {
            recommendations.push('High agent count with slow updates. Consider agent pooling or level-of-detail systems.');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Agent performance looks good! No major issues detected.');
        }
        
        return recommendations;
    }

    /**
     * Initialize performance budget for an agent
     */
    initializeAgentBudget(agentId) {
        const profile = this.agentProfiles.get(agentId);
        if (!profile) return;

        // Calculate initial budget based on agent type and total budget
        const baseBudget = this.globalBudget.agentUpdateBudget / Math.max(1, this.totalAgents);
        profile.budget.allocated = baseBudget;
        
        this.performanceBudgets.set(agentId, {
            frameAllocated: baseBudget,
            frameUsed: 0,
            frameOverrun: 0,
            totalOverruns: 0,
            efficiency: 1.0
        });
    }

    /**
     * Track scheduling performance for an agent
     */
    trackSchedulingPerformance(agentId, schedulingData) {
        if (!this.isTracking || !this.agentProfiles.has(agentId)) {
            return;
        }

        const profile = this.agentProfiles.get(agentId);
        const scheduling = profile.schedulingMetrics;
        
        scheduling.scheduledUpdates++;
        scheduling.priority = schedulingData.priority || 'medium';
        scheduling.distanceCategory = schedulingData.distanceCategory || 'medium';
        scheduling.lastScheduledFrame = schedulingData.frameNumber || 0;
        
        if (schedulingData.delay) {
            const totalDelay = scheduling.averageSchedulingDelay * (scheduling.scheduledUpdates - 1) + schedulingData.delay;
            scheduling.averageSchedulingDelay = totalDelay / scheduling.scheduledUpdates;
        }
        
        if (schedulingData.skipped) {
            scheduling.skippedUpdates++;
            this.optimizationMetrics.skippedUpdates++;
        } else {
            this.optimizationMetrics.scheduledUpdates++;
        }
    }

    /**
     * Track behavior optimization performance
     */
    trackBehaviorOptimization(agentId, behaviorData) {
        if (!this.isTracking || !this.agentProfiles.has(agentId)) {
            return;
        }

        const profile = this.agentProfiles.get(agentId);
        const optimization = profile.behaviorOptimization;
        
        if (behaviorData.cacheHit) {
            optimization.cacheHits++;
            this.optimizationMetrics.cacheHits++;
        } else {
            optimization.cacheMisses++;
            this.optimizationMetrics.cacheMisses++;
        }
        
        if (behaviorData.behaviorType) {
            optimization.optimizedBehaviors.add(behaviorData.behaviorType);
        }
        
        if (behaviorData.complexityLevel) {
            optimization.complexityLevel = behaviorData.complexityLevel;
        }
        
        if (behaviorData.sharedComputation) {
            optimization.sharedComputations++;
        }
        
        this.optimizationMetrics.behaviorOptimizations++;
    }

    /**
     * Track performance budget usage
     */
    trackBudgetUsage(agentId, timeUsed) {
        if (!this.isTracking || !this.agentProfiles.has(agentId)) {
            return;
        }

        const profile = this.agentProfiles.get(agentId);
        const budget = profile.budget;
        const frameBudget = this.performanceBudgets.get(agentId);
        
        budget.used = timeUsed;
        budget.overbudget = timeUsed > budget.allocated;
        
        if (budget.overbudget) {
            budget.overbudgetCount++;
            frameBudget.totalOverruns++;
            frameBudget.frameOverrun = timeUsed - budget.allocated;
        } else {
            frameBudget.frameOverrun = 0;
        }
        
        // Calculate efficiency
        budget.budgetEfficiency = budget.allocated > 0 ? 
            Math.min(1.0, budget.allocated / Math.max(0.1, timeUsed)) : 1.0;
        frameBudget.efficiency = budget.budgetEfficiency;
        
        // Update frame budget tracking
        frameBudget.frameUsed = timeUsed;
        
        // Check if budget enforcement is needed
        this.checkBudgetEnforcement(agentId);
    }

    /**
     * Check if budget enforcement is needed
     */
    checkBudgetEnforcement(agentId) {
        const profile = this.agentProfiles.get(agentId);
        if (!profile) return;

        const budget = profile.budget;
        
        // If agent consistently exceeds budget, trigger quality adjustment
        if (budget.overbudgetCount > 5 && budget.budgetEfficiency < 0.7) {
            this.triggerQualityAdjustment(agentId, 'reduce', 'budget_exceeded');
        }
    }

    /**
     * Trigger quality adjustment for performance
     */
    triggerQualityAdjustment(agentId, direction, reason) {
        if (!this.qualityTriggers.enabled) {
            return;
        }

        const profile = this.agentProfiles.get(agentId);
        if (!profile) return;

        const adjustments = profile.qualityAdjustments;
        const now = performance.now();
        
        // Prevent too frequent adjustments
        if (now - adjustments.lastAdjustment < 1000) {
            return;
        }
        
        if (direction === 'reduce' && adjustments.currentLevel > 0.3) {
            adjustments.currentLevel = Math.max(0.3, adjustments.currentLevel - 0.1);
            adjustments.reductions++;
            this.optimizationMetrics.qualityAdjustments++;
            
            // Create alert
            this.createQualityAlert(agentId, 'reduced', reason, adjustments.currentLevel);
            
        } else if (direction === 'increase' && adjustments.currentLevel < 1.0) {
            adjustments.currentLevel = Math.min(1.0, adjustments.currentLevel + 0.1);
            adjustments.increases++;
            
            // Create alert
            this.createQualityAlert(agentId, 'increased', reason, adjustments.currentLevel);
        }
        
        adjustments.lastAdjustment = now;
    }

    /**
     * Create quality adjustment alert
     */
    createQualityAlert(agentId, action, reason, newLevel) {
        const profile = this.agentProfiles.get(agentId);
        if (!profile) return;

        const alert = {
            timestamp: performance.now(),
            agentId,
            agentType: profile.type,
            type: 'quality_adjustment',
            action,
            reason,
            newLevel: Math.round(newLevel * 100) / 100,
            severity: newLevel < 0.5 ? 'high' : 'medium'
        };
        
        this.alerts.push(alert);
        
        // Maintain alert history size
        if (this.alerts.length > this.maxAlerts) {
            this.alerts.shift();
        }
    }

    /**
     * Update global performance budget
     */
    updateGlobalBudget(frameTime) {
        this.globalBudget.remainingBudget = Math.max(0, 
            this.globalBudget.totalFrameTime - frameTime);
        
        // Check for quality adjustment triggers
        this.checkGlobalQualityTriggers(frameTime);
        
        // Redistribute budgets if needed
        if (this.totalAgents > 0) {
            const newAgentBudget = this.globalBudget.agentUpdateBudget / this.totalAgents;
            
            for (const [agentId, profile] of this.agentProfiles) {
                profile.budget.allocated = newAgentBudget;
                const frameBudget = this.performanceBudgets.get(agentId);
                if (frameBudget) {
                    frameBudget.frameAllocated = newAgentBudget;
                }
            }
        }
    }

    /**
     * Check global quality triggers
     */
    checkGlobalQualityTriggers(frameTime) {
        const triggers = this.qualityTriggers;
        
        if (frameTime > triggers.frameTimeThreshold) {
            triggers.currentSlowFrames++;
            triggers.currentRecoveryFrames = 0;
            
            // Trigger quality reduction after consecutive slow frames
            if (triggers.currentSlowFrames >= triggers.consecutiveFrames) {
                this.triggerGlobalQualityReduction();
                triggers.currentSlowFrames = 0;
            }
        } else {
            triggers.currentSlowFrames = 0;
            triggers.currentRecoveryFrames++;
            
            // Trigger quality increase after recovery period
            if (triggers.currentRecoveryFrames >= triggers.recoveryFrames) {
                this.triggerGlobalQualityIncrease();
                triggers.currentRecoveryFrames = 0;
            }
        }
    }

    /**
     * Trigger global quality reduction
     */
    triggerGlobalQualityReduction() {
        let adjustedAgents = 0;
        
        // Reduce quality for the most expensive agents first
        const sortedAgents = Array.from(this.agentProfiles.values())
            .filter(profile => profile.qualityAdjustments.currentLevel > 0.3)
            .sort((a, b) => b.averageUpdateTime - a.averageUpdateTime);
        
        const maxAdjustments = Math.min(5, sortedAgents.length);
        
        for (let i = 0; i < maxAdjustments; i++) {
            this.triggerQualityAdjustment(sortedAgents[i].id, 'reduce', 'global_performance');
            adjustedAgents++;
        }
        
        console.log(`Global quality reduction: adjusted ${adjustedAgents} agents`);
    }

    /**
     * Trigger global quality increase
     */
    triggerGlobalQualityIncrease() {
        let adjustedAgents = 0;
        
        // Increase quality for agents with reduced quality
        const sortedAgents = Array.from(this.agentProfiles.values())
            .filter(profile => profile.qualityAdjustments.currentLevel < 1.0)
            .sort((a, b) => a.qualityAdjustments.currentLevel - b.qualityAdjustments.currentLevel);
        
        const maxAdjustments = Math.min(3, sortedAgents.length);
        
        for (let i = 0; i < maxAdjustments; i++) {
            this.triggerQualityAdjustment(sortedAgents[i].id, 'increase', 'performance_recovery');
            adjustedAgents++;
        }
        
        if (adjustedAgents > 0) {
            console.log(`Global quality increase: adjusted ${adjustedAgents} agents`);
        }
    }

    /**
     * Get optimization metrics
     */
    getOptimizationMetrics() {
        const cacheHitRate = this.optimizationMetrics.cacheHits + this.optimizationMetrics.cacheMisses > 0 ?
            (this.optimizationMetrics.cacheHits / (this.optimizationMetrics.cacheHits + this.optimizationMetrics.cacheMisses)) * 100 : 0;
        
        const schedulingEfficiency = this.optimizationMetrics.scheduledUpdates + this.optimizationMetrics.skippedUpdates > 0 ?
            (this.optimizationMetrics.scheduledUpdates / (this.optimizationMetrics.scheduledUpdates + this.optimizationMetrics.skippedUpdates)) * 100 : 0;
        
        return {
            ...this.optimizationMetrics,
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            schedulingEfficiency: Math.round(schedulingEfficiency * 100) / 100,
            globalBudget: { ...this.globalBudget },
            qualityTriggers: { ...this.qualityTriggers }
        };
    }

    /**
     * Get agent optimization performance
     */
    getAgentOptimizationPerformance(agentId) {
        const profile = this.agentProfiles.get(agentId);
        if (!profile) {
            return null;
        }

        const cacheHitRate = profile.behaviorOptimization.cacheHits + profile.behaviorOptimization.cacheMisses > 0 ?
            (profile.behaviorOptimization.cacheHits / (profile.behaviorOptimization.cacheHits + profile.behaviorOptimization.cacheMisses)) * 100 : 0;

        return {
            id: profile.id,
            type: profile.type,
            
            scheduling: {
                ...profile.schedulingMetrics,
                efficiency: profile.schedulingMetrics.scheduledUpdates > 0 ?
                    (profile.schedulingMetrics.scheduledUpdates / (profile.schedulingMetrics.scheduledUpdates + profile.schedulingMetrics.skippedUpdates)) * 100 : 0
            },
            
            behaviorOptimization: {
                ...profile.behaviorOptimization,
                cacheHitRate: Math.round(cacheHitRate * 100) / 100,
                optimizedBehaviorCount: profile.behaviorOptimization.optimizedBehaviors.size
            },
            
            budget: {
                ...profile.budget,
                budgetEfficiency: Math.round(profile.budget.budgetEfficiency * 100) / 100
            },
            
            qualityAdjustments: {
                ...profile.qualityAdjustments,
                currentLevel: Math.round(profile.qualityAdjustments.currentLevel * 100) / 100
            }
        };
    }

    /**
     * Set optimization thresholds
     */
    setOptimizationThresholds(newThresholds) {
        this.optimizationThresholds = { ...this.optimizationThresholds, ...newThresholds };
    }

    /**
     * Configure quality triggers
     */
    configureQualityTriggers(config) {
        this.qualityTriggers = { ...this.qualityTriggers, ...config };
    }

    /**
     * Reset optimization metrics
     */
    resetOptimizationMetrics() {
        this.optimizationMetrics = {
            scheduledUpdates: 0,
            skippedUpdates: 0,
            cacheHits: 0,
            cacheMisses: 0,
            behaviorOptimizations: 0,
            qualityAdjustments: 0,
            memoryOptimizations: 0
        };
        
        // Reset agent-specific optimization metrics
        for (const profile of this.agentProfiles.values()) {
            profile.schedulingMetrics.scheduledUpdates = 0;
            profile.schedulingMetrics.skippedUpdates = 0;
            profile.behaviorOptimization.cacheHits = 0;
            profile.behaviorOptimization.cacheMisses = 0;
            profile.behaviorOptimization.sharedComputations = 0;
            profile.budget.overbudgetCount = 0;
        }
    }

    /**
     * Dispose of the agent performance tracker
     */
    dispose() {
        this.stop();
        this.clearData();
        this.performanceBudgets.clear();
    }
}