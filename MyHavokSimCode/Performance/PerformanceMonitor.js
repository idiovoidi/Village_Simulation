/**
 * Core performance monitoring system for the village simulation
 * Provides comprehensive tracking of frame rate, memory usage, and system performance
 */

import { FrameRateTracker } from './FrameRateTracker.js';
import { MemoryMonitor } from './MemoryMonitor.js';
import { CPUProfiler } from './CPUProfiler.js';
import { AgentPerformanceTracker } from './AgentPerformanceTracker.js';
import { PerformanceDataStore } from './PerformanceDataStore.js';
import { ThresholdMonitor } from './ThresholdMonitor.js';

export class PerformanceMonitor {
    constructor(engine, scene) {
        this.engine = engine;
        this.scene = scene;
        
        // Initialize monitoring components
        this.frameRateTracker = new FrameRateTracker(engine);
        this.memoryMonitor = new MemoryMonitor();
        this.cpuProfiler = new CPUProfiler();
        this.agentPerformanceTracker = new AgentPerformanceTracker();
        
        // Optimization system references (set externally)
        this.optimizationSystems = {
            lodManager: null,
            cullingSystem: null,
            instanceManager: null,
            memoryManager: null,
            agentScheduler: null,
            behaviorOptimizer: null,
            physicsOptimizer: null,
            adaptiveQualityManager: null
        };
        
        // Initialize data storage and threshold monitoring
        this.dataStore = new PerformanceDataStore({
            maxStorageSize: 10000,
            retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
            storageKey: 'village_performance_metrics'
        });
        
        this.thresholdMonitor = new ThresholdMonitor({
            thresholds: {
                frameRate: {
                    critical: { min: 15, max: Infinity },
                    warning: { min: 30, max: Infinity },
                    info: { min: 45, max: Infinity }
                },
                memory: {
                    critical: { min: 0, max: 90 },
                    warning: { min: 0, max: 75 },
                    info: { min: 0, max: 60 }
                }
            },
            alertConfig: {
                cooldownPeriod: 30000, // 30 seconds
                maxAlertsPerMinute: 5
            }
        });
        
        // Performance data storage (legacy - kept for backward compatibility)
        this.isMonitoring = false;
        this.metricsHistory = [];
        this.maxHistorySize = 1000; // Keep last 1000 measurements
        
        // Callbacks for real-time updates
        this.updateCallbacks = [];
        this.alertCallbacks = [];
        
        // Monitoring interval
        this.monitoringInterval = null;
        this.updateFrequency = 60; // Updates per second
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.warn('Performance monitoring is already active');
            return;
        }

        console.log('Starting performance monitoring...');
        this.isMonitoring = true;
        
        // Start component monitoring
        this.frameRateTracker.start();
        this.memoryMonitor.start();
        this.cpuProfiler.start();
        this.agentPerformanceTracker.start();
        
        // Start data storage and threshold monitoring
        this.thresholdMonitor.start();
        
        // Set up periodic data collection
        const intervalMs = 1000 / this.updateFrequency;
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, intervalMs);
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        console.log('Stopping performance monitoring...');
        this.isMonitoring = false;
        
        // Stop component monitoring
        this.frameRateTracker.stop();
        this.memoryMonitor.stop();
        this.cpuProfiler.stop();
        this.agentPerformanceTracker.stop();
        
        // Stop data storage and threshold monitoring
        this.thresholdMonitor.stop();
        
        // Clear monitoring interval
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Collect current performance metrics
     */
    collectMetrics() {
        if (!this.isMonitoring) {
            return null;
        }

        const timestamp = performance.now();
        
        // Gather metrics from all components
        const frameRateData = this.frameRateTracker.getCurrentMetrics();
        const memoryData = this.memoryMonitor.getCurrentMetrics();
        const cpuData = this.cpuProfiler.getCurrentMetrics();
        const agentData = this.agentPerformanceTracker.getCurrentMetrics();
        
        // Create comprehensive metrics object
        const metrics = {
            timestamp,
            frameRate: frameRateData,
            memory: memoryData,
            cpu: cpuData,
            agents: agentData,
            scene: this.getSceneMetrics(),
            system: this.getSystemMetrics(),
            optimization: this.getOptimizationMetrics()
        };

        // Store in history (legacy)
        this.addToHistory(metrics);
        
        // Store in data store
        this.dataStore.store(metrics);
        
        // Check thresholds and generate alerts
        const alerts = this.thresholdMonitor.checkMetrics(metrics);
        
        // Notify callbacks
        this.notifyUpdateCallbacks(metrics);
        
        // Notify alert callbacks if there are alerts
        if (alerts.length > 0) {
            this.notifyAlertCallbacks(alerts);
        }
        
        return metrics;
    }

    /**
     * Get scene-specific metrics
     */
    getSceneMetrics() {
        if (!this.scene) {
            return {
                meshCount: 0,
                materialCount: 0,
                textureCount: 0,
                lightCount: 0,
                cameraCount: 0,
                drawCalls: 0
            };
        }

        return {
            meshCount: this.scene.meshes.length,
            materialCount: this.scene.materials.length,
            textureCount: this.scene.textures.length,
            lightCount: this.scene.lights.length,
            cameraCount: this.scene.cameras.length,
            drawCalls: this.scene.getEngine().drawCalls || 0
        };
    }

    /**
     * Get system-level metrics
     */
    getSystemMetrics() {
        const engineStats = this.engine ? this.engine.getGlInfo() : null;
        
        return {
            webglVersion: engineStats ? engineStats.version : 'Unknown',
            renderer: engineStats ? engineStats.renderer : 'Unknown',
            vendor: engineStats ? engineStats.vendor : 'Unknown',
            maxTextureSize: engineStats ? engineStats.maxTextureSize : 0,
            maxVertexAttribs: engineStats ? engineStats.maxVertexAttribs : 0
        };
    }

    /**
     * Get optimization-specific metrics
     */
    getOptimizationMetrics() {
        const optimizationMetrics = {
            timestamp: performance.now(),
            lod: this.getLODMetrics(),
            culling: this.getCullingMetrics(),
            instancing: this.getInstancingMetrics(),
            memory: this.getMemoryOptimizationMetrics(),
            agents: this.getAgentOptimizationMetrics(),
            physics: this.getPhysicsOptimizationMetrics(),
            quality: this.getQualityMetrics(),
            effectiveness: this.calculateOptimizationEffectiveness()
        };

        return optimizationMetrics;
    }

    /**
     * Get LOD (Level of Detail) metrics
     */
    getLODMetrics() {
        if (!this.optimizationSystems.lodManager) {
            return {
                enabled: false,
                totalMeshes: 0,
                lodLevel0: 0,
                lodLevel1: 0,
                lodLevel2: 0,
                lodLevel3: 0,
                averageLODLevel: 0,
                lodSwitches: 0,
                culledMeshes: 0
            };
        }

        const lodStats = this.optimizationSystems.lodManager.getStatistics();
        const totalVisible = lodStats.lodLevel0 + lodStats.lodLevel1 + lodStats.lodLevel2;
        const averageLODLevel = totalVisible > 0 ? 
            (lodStats.lodLevel1 + lodStats.lodLevel2 * 2 + lodStats.lodLevel3 * 3) / totalVisible : 0;

        return {
            enabled: lodStats.enabled,
            totalMeshes: lodStats.totalMeshes,
            lodLevel0: lodStats.lodLevel0,
            lodLevel1: lodStats.lodLevel1,
            lodLevel2: lodStats.lodLevel2,
            lodLevel3: lodStats.lodLevel3,
            averageLODLevel: Math.round(averageLODLevel * 100) / 100,
            lodSwitches: lodStats.lodSwitches || 0,
            culledMeshes: lodStats.lodLevel3,
            updateDuration: lodStats.updateDuration || 0,
            meshesProcessed: lodStats.meshesProcessed || 0
        };
    }

    /**
     * Get culling system metrics
     */
    getCullingMetrics() {
        if (!this.optimizationSystems.cullingSystem) {
            return {
                enabled: false,
                totalObjects: 0,
                frustumCulled: 0,
                occlusionCulled: 0,
                visible: 0,
                cullingRatio: 0,
                frustumTests: 0,
                occlusionTests: 0
            };
        }

        const cullingStats = this.optimizationSystems.cullingSystem.getStatistics();
        const totalCulled = cullingStats.frustumCulled + cullingStats.occlusionCulled;
        const cullingRatio = cullingStats.totalObjects > 0 ? 
            totalCulled / cullingStats.totalObjects : 0;

        return {
            enabled: cullingStats.enabled,
            totalObjects: cullingStats.totalObjects,
            frustumCulled: cullingStats.frustumCulled,
            occlusionCulled: cullingStats.occlusionCulled,
            visible: cullingStats.visible,
            cullingRatio: Math.round(cullingRatio * 100) / 100,
            frustumTests: cullingStats.frustumTests,
            occlusionTests: cullingStats.occlusionTests,
            updateDuration: cullingStats.updateDuration || 0,
            spatialGridCells: cullingStats.spatialGridCells || 0,
            occluders: cullingStats.occluders || 0
        };
    }

    /**
     * Get instancing system metrics
     */
    getInstancingMetrics() {
        if (!this.optimizationSystems.instanceManager) {
            return {
                enabled: false,
                totalMeshes: 0,
                instancedMeshes: 0,
                instanceGroups: 0,
                totalInstances: 0,
                drawCallsSaved: 0,
                instancingRatio: 0
            };
        }

        const instanceStats = this.optimizationSystems.instanceManager.getStatistics();
        const instancingRatio = instanceStats.totalMeshes > 0 ? 
            instanceStats.instancedMeshes / instanceStats.totalMeshes : 0;

        return {
            enabled: instanceStats.enabled,
            totalMeshes: instanceStats.totalMeshes,
            instancedMeshes: instanceStats.instancedMeshes,
            instanceGroups: instanceStats.instanceGroups,
            totalInstances: instanceStats.totalInstances,
            drawCallsSaved: instanceStats.drawCallsSaved,
            instancingRatio: Math.round(instancingRatio * 100) / 100,
            memoryUsed: instanceStats.memoryUsed || 0,
            bufferUpdates: instanceStats.bufferUpdates || 0,
            updateDuration: instanceStats.updateDuration || 0
        };
    }

    /**
     * Get memory optimization metrics
     */
    getMemoryOptimizationMetrics() {
        if (!this.optimizationSystems.memoryManager) {
            return {
                enabled: false,
                poolHits: 0,
                poolMisses: 0,
                objectsPooled: 0,
                resourcesDisposed: 0,
                memoryReclaimed: 0,
                poolEfficiency: 0
            };
        }

        const memoryStats = this.optimizationSystems.memoryManager.getStatistics();
        const totalPoolRequests = memoryStats.poolHits + memoryStats.poolMisses;
        const poolEfficiency = totalPoolRequests > 0 ? 
            memoryStats.poolHits / totalPoolRequests : 0;

        return {
            enabled: true,
            poolHits: memoryStats.poolHits,
            poolMisses: memoryStats.poolMisses,
            objectsPooled: memoryStats.objectsPooled,
            objectsReturned: memoryStats.objectsReturned,
            resourcesDisposed: memoryStats.resourcesDisposed,
            memoryReclaimed: memoryStats.memoryReclaimed,
            poolEfficiency: Math.round(poolEfficiency * 100) / 100,
            cleanupCycles: memoryStats.cleanupCycles,
            trackedResources: memoryStats.resources?.tracked || 0,
            isMemoryPressure: memoryStats.cleanup?.isMemoryPressure || false
        };
    }

    /**
     * Get agent optimization metrics
     */
    getAgentOptimizationMetrics() {
        const agentMetrics = {
            scheduler: this.getAgentSchedulerMetrics(),
            behavior: this.getBehaviorOptimizerMetrics()
        };

        return agentMetrics;
    }

    /**
     * Get agent scheduler metrics
     */
    getAgentSchedulerMetrics() {
        if (!this.optimizationSystems.agentScheduler) {
            return {
                enabled: false,
                totalAgents: 0,
                updatesThisFrame: 0,
                averageUpdatesPerFrame: 0,
                skippedUpdates: 0
            };
        }

        const schedulerStats = this.optimizationSystems.agentScheduler.getMetrics();

        return {
            enabled: schedulerStats.schedulingEnabled,
            totalAgents: schedulerStats.totalAgents,
            updatesThisFrame: schedulerStats.updatesThisFrame,
            averageUpdatesPerFrame: Math.round(schedulerStats.averageUpdatesPerFrame * 100) / 100,
            updatesPerSecond: Math.round(schedulerStats.updatesPerSecond * 100) / 100,
            skippedUpdates: schedulerStats.skippedUpdates,
            priorityDistribution: schedulerStats.priorityDistribution,
            queueSizes: schedulerStats.queueSizes
        };
    }

    /**
     * Get behavior optimizer metrics
     */
    getBehaviorOptimizerMetrics() {
        if (!this.optimizationSystems.behaviorOptimizer) {
            return {
                enabled: false,
                cachedBehaviors: 0,
                cacheHits: 0,
                cacheMisses: 0,
                sharedComputations: 0
            };
        }

        const behaviorStats = this.optimizationSystems.behaviorOptimizer.getStatistics();
        const totalCacheRequests = behaviorStats.cacheHits + behaviorStats.cacheMisses;
        const cacheEfficiency = totalCacheRequests > 0 ? 
            behaviorStats.cacheHits / totalCacheRequests : 0;

        return {
            enabled: behaviorStats.enabled,
            cachedBehaviors: behaviorStats.cachedBehaviors || 0,
            cacheHits: behaviorStats.cacheHits || 0,
            cacheMisses: behaviorStats.cacheMisses || 0,
            cacheEfficiency: Math.round(cacheEfficiency * 100) / 100,
            sharedComputations: behaviorStats.sharedComputations || 0,
            optimizedBehaviors: behaviorStats.optimizedBehaviors || 0
        };
    }

    /**
     * Get physics optimization metrics
     */
    getPhysicsOptimizationMetrics() {
        if (!this.optimizationSystems.physicsOptimizer) {
            return {
                enabled: false,
                activeBodies: 0,
                sleepingBodies: 0,
                collisionChecks: 0,
                spatialOptimizations: 0
            };
        }

        const physicsStats = this.optimizationSystems.physicsOptimizer.getStatistics();

        return {
            enabled: physicsStats.enabled,
            activeBodies: physicsStats.activeBodies || 0,
            sleepingBodies: physicsStats.sleepingBodies || 0,
            totalBodies: (physicsStats.activeBodies || 0) + (physicsStats.sleepingBodies || 0),
            collisionChecks: physicsStats.collisionChecks || 0,
            spatialOptimizations: physicsStats.spatialOptimizations || 0,
            updateFrequency: physicsStats.updateFrequency || 60,
            processingTime: physicsStats.processingTime || 0
        };
    }

    /**
     * Get quality management metrics
     */
    getQualityMetrics() {
        if (!this.optimizationSystems.adaptiveQualityManager) {
            return {
                enabled: false,
                currentQualityLevel: 100,
                targetQualityLevel: 100,
                qualityAdjustments: 0,
                autoAdjustmentEnabled: false
            };
        }

        const qualityStats = this.optimizationSystems.adaptiveQualityManager.getStatistics();

        return {
            enabled: qualityStats.enabled,
            currentQualityLevel: qualityStats.currentQualityLevel || 100,
            targetQualityLevel: qualityStats.targetQualityLevel || 100,
            qualityAdjustments: qualityStats.qualityAdjustments || 0,
            autoAdjustmentEnabled: qualityStats.autoAdjustmentEnabled || false,
            lastAdjustmentTime: qualityStats.lastAdjustmentTime || 0,
            performanceScore: qualityStats.performanceScore || 100
        };
    }

    /**
     * Calculate overall optimization effectiveness
     */
    calculateOptimizationEffectiveness() {
        const effectiveness = {
            overall: 0,
            rendering: 0,
            memory: 0,
            agents: 0,
            physics: 0
        };

        // Calculate rendering effectiveness (LOD + Culling + Instancing)
        const lodMetrics = this.getLODMetrics();
        const cullingMetrics = this.getCullingMetrics();
        const instancingMetrics = this.getInstancingMetrics();

        if (lodMetrics.enabled || cullingMetrics.enabled || instancingMetrics.enabled) {
            let renderingScore = 0;
            let renderingComponents = 0;

            if (lodMetrics.enabled) {
                // Higher average LOD level means more optimization
                renderingScore += Math.min(100, lodMetrics.averageLODLevel * 33);
                renderingComponents++;
            }

            if (cullingMetrics.enabled) {
                // Higher culling ratio means more optimization
                renderingScore += cullingMetrics.cullingRatio * 100;
                renderingComponents++;
            }

            if (instancingMetrics.enabled) {
                // Higher instancing ratio means more optimization
                renderingScore += instancingMetrics.instancingRatio * 100;
                renderingComponents++;
            }

            effectiveness.rendering = renderingComponents > 0 ? 
                Math.round(renderingScore / renderingComponents) : 0;
        }

        // Calculate memory effectiveness
        const memoryMetrics = this.getMemoryOptimizationMetrics();
        if (memoryMetrics.enabled) {
            effectiveness.memory = Math.round(memoryMetrics.poolEfficiency * 100);
        }

        // Calculate agent effectiveness
        const agentMetrics = this.getAgentOptimizationMetrics();
        if (agentMetrics.scheduler.enabled) {
            const schedulerEfficiency = agentMetrics.scheduler.totalAgents > 0 ? 
                (agentMetrics.scheduler.averageUpdatesPerFrame / agentMetrics.scheduler.totalAgents) * 100 : 0;
            effectiveness.agents = Math.min(100, Math.round(schedulerEfficiency));
        }

        // Calculate physics effectiveness
        const physicsMetrics = this.getPhysicsOptimizationMetrics();
        if (physicsMetrics.enabled && physicsMetrics.totalBodies > 0) {
            const sleepRatio = physicsMetrics.sleepingBodies / physicsMetrics.totalBodies;
            effectiveness.physics = Math.round(sleepRatio * 100);
        }

        // Calculate overall effectiveness
        const components = [
            effectiveness.rendering,
            effectiveness.memory,
            effectiveness.agents,
            effectiveness.physics
        ].filter(score => score > 0);

        effectiveness.overall = components.length > 0 ? 
            Math.round(components.reduce((a, b) => a + b, 0) / components.length) : 0;

        return effectiveness;
    }

    /**
     * Add metrics to history with size management
     */
    addToHistory(metrics) {
        this.metricsHistory.push(metrics);
        
        // Maintain history size limit
        if (this.metricsHistory.length > this.maxHistorySize) {
            this.metricsHistory.shift();
        }
    }

    /**
     * Get current performance metrics
     */
    getCurrentMetrics() {
        return this.collectMetrics();
    }

    /**
     * Get metrics history
     */
    getMetricsHistory(count = null) {
        if (count === null) {
            return [...this.metricsHistory];
        }
        
        return this.metricsHistory.slice(-count);
    }

    /**
     * Get performance summary statistics
     */
    getPerformanceSummary(timeRangeMs = 10000) {
        const cutoffTime = performance.now() - timeRangeMs;
        const recentMetrics = this.metricsHistory.filter(m => m.timestamp >= cutoffTime);
        
        if (recentMetrics.length === 0) {
            return null;
        }

        // Calculate frame rate statistics
        const frameRates = recentMetrics.map(m => m.frameRate.current);
        const memoryUsages = recentMetrics.map(m => m.memory.used);
        
        return {
            timeRange: timeRangeMs,
            sampleCount: recentMetrics.length,
            frameRate: {
                average: this.calculateAverage(frameRates),
                min: Math.min(...frameRates),
                max: Math.max(...frameRates),
                std: this.calculateStandardDeviation(frameRates)
            },
            memory: {
                average: this.calculateAverage(memoryUsages),
                min: Math.min(...memoryUsages),
                max: Math.max(...memoryUsages),
                std: this.calculateStandardDeviation(memoryUsages)
            },
            stability: {
                frameRateVariance: this.calculateVariance(frameRates),
                memoryVariance: this.calculateVariance(memoryUsages)
            }
        };
    }

    /**
     * Register callback for real-time metric updates
     */
    onMetricsUpdate(callback) {
        if (typeof callback === 'function') {
            this.updateCallbacks.push(callback);
        }
    }

    /**
     * Remove update callback
     */
    removeUpdateCallback(callback) {
        const index = this.updateCallbacks.indexOf(callback);
        if (index > -1) {
            this.updateCallbacks.splice(index, 1);
        }
    }

    /**
     * Notify all update callbacks
     */
    notifyUpdateCallbacks(metrics) {
        this.updateCallbacks.forEach(callback => {
            try {
                callback(metrics);
            } catch (error) {
                console.error('Error in performance metrics callback:', error);
            }
        });
    }

    /**
     * Set monitoring update frequency
     */
    setUpdateFrequency(frequency) {
        this.updateFrequency = Math.max(1, Math.min(120, frequency)); // Clamp between 1-120 Hz
        
        if (this.isMonitoring) {
            // Restart monitoring with new frequency
            this.stopMonitoring();
            this.startMonitoring();
        }
    }

    /**
     * Clear metrics history
     */
    clearHistory() {
        this.metricsHistory = [];
    }

    /**
     * Get CPU profiler instance for direct access
     */
    getCPUProfiler() {
        return this.cpuProfiler;
    }

    /**
     * Get agent performance tracker instance for direct access
     */
    getAgentPerformanceTracker() {
        return this.agentPerformanceTracker;
    }

    /**
     * Start timing a render frame
     */
    startRenderFrame() {
        if (this.cpuProfiler) {
            this.cpuProfiler.startRenderFrame();
        }
    }

    /**
     * End timing a render frame
     */
    endRenderFrame() {
        if (this.cpuProfiler) {
            this.cpuProfiler.endRenderFrame();
        }
    }

    /**
     * Start timing an update cycle
     */
    startUpdateCycle() {
        if (this.cpuProfiler) {
            this.cpuProfiler.startUpdateCycle();
        }
    }

    /**
     * End timing an update cycle
     */
    endUpdateCycle() {
        if (this.cpuProfiler) {
            this.cpuProfiler.endUpdateCycle();
        }
    }

    /**
     * Register an agent for performance tracking
     */
    registerAgent(agentId, agentType, position = null) {
        if (this.agentPerformanceTracker) {
            this.agentPerformanceTracker.registerAgent(agentId, agentType, position);
        }
    }

    /**
     * Unregister an agent from performance tracking
     */
    unregisterAgent(agentId) {
        if (this.agentPerformanceTracker) {
            this.agentPerformanceTracker.unregisterAgent(agentId);
        }
    }

    /**
     * Start timing an agent update
     */
    startAgentUpdate(agentId) {
        if (this.agentPerformanceTracker) {
            return this.agentPerformanceTracker.startAgentUpdate(agentId);
        }
        return null;
    }

    /**
     * End timing an agent update
     */
    endAgentUpdate(timingData) {
        if (this.agentPerformanceTracker && timingData) {
            return this.agentPerformanceTracker.endAgentUpdate(timingData);
        }
        return null;
    }

    /**
     * Start timing a behavior execution
     */
    startBehavior(agentId, behaviorName) {
        if (this.agentPerformanceTracker) {
            return this.agentPerformanceTracker.startBehavior(agentId, behaviorName);
        }
        return null;
    }

    /**
     * End timing a behavior execution
     */
    endBehavior(timingData) {
        if (this.agentPerformanceTracker && timingData) {
            return this.agentPerformanceTracker.endBehavior(timingData);
        }
        return null;
    }

    /**
     * Time a function execution using CPU profiler
     */
    timeFunction(name, fn, ...args) {
        if (this.cpuProfiler) {
            return this.cpuProfiler.timeFunction(name, fn, ...args);
        }
        return fn(...args);
    }

    /**
     * Time an async function execution using CPU profiler
     */
    async timeAsyncFunction(name, fn, ...args) {
        if (this.cpuProfiler) {
            return await this.cpuProfiler.timeAsyncFunction(name, fn, ...args);
        }
        return await fn(...args);
    }

    /**
     * Get historical performance data
     */
    getHistoricalData(startTime, endTime, options = {}) {
        return this.dataStore.getMetrics(startTime, endTime, options);
    }

    /**
     * Get aggregated performance data
     */
    getAggregatedData(startTime, endTime, interval = '5min') {
        return this.dataStore.getAggregatedMetrics(startTime, endTime, interval);
    }

    /**
     * Get performance statistics for a time range
     */
    getPerformanceStatistics(startTime, endTime) {
        return this.dataStore.getStatistics(startTime, endTime);
    }

    /**
     * Set performance thresholds
     */
    setThresholds(metricType, thresholds) {
        this.thresholdMonitor.setThresholds(metricType, thresholds);
    }

    /**
     * Get current thresholds
     */
    getThresholds(metricType = null) {
        return this.thresholdMonitor.getThresholds(metricType);
    }

    /**
     * Register alert callback
     */
    onAlert(callback, options = {}) {
        const callbackId = this.thresholdMonitor.onAlert(callback, options);
        this.alertCallbacks.push({ id: callbackId, callback });
        return callbackId;
    }

    /**
     * Remove alert callback
     */
    removeAlertCallback(callbackId) {
        const removed = this.thresholdMonitor.removeAlertCallback(callbackId);
        if (removed) {
            this.alertCallbacks = this.alertCallbacks.filter(cb => cb.id !== callbackId);
        }
        return removed;
    }

    /**
     * Get alert history
     */
    getAlertHistory(options = {}) {
        return this.thresholdMonitor.getAlertHistory(options);
    }

    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return this.thresholdMonitor.getActiveAlerts();
    }

    /**
     * Get alert statistics
     */
    getAlertStatistics() {
        return this.thresholdMonitor.getStatistics();
    }

    /**
     * Generate performance report
     */
    generatePerformanceReport(timeRange = 3600000) { // Default 1 hour
        const endTime = Date.now();
        const startTime = endTime - timeRange;
        
        const performanceStats = this.getPerformanceStatistics(startTime, endTime);
        const alertReport = this.thresholdMonitor.generateReport(timeRange);
        const storageInfo = this.dataStore.getStorageInfo();
        
        return {
            timeRange: { start: startTime, end: endTime, duration: timeRange },
            performance: performanceStats,
            alerts: alertReport,
            storage: storageInfo,
            summary: this.generateReportSummary(performanceStats, alertReport)
        };
    }

    /**
     * Generate report summary
     */
    generateReportSummary(performanceStats, alertReport) {
        const summary = {
            overallHealth: 'good',
            keyMetrics: {},
            issues: [],
            recommendations: []
        };

        // Analyze performance metrics
        if (performanceStats && performanceStats.frameRate) {
            summary.keyMetrics.averageFPS = Math.round(performanceStats.frameRate.mean);
            summary.keyMetrics.minFPS = Math.round(performanceStats.frameRate.min);
            
            if (performanceStats.frameRate.mean < 30) {
                summary.overallHealth = 'poor';
                summary.issues.push('Low average frame rate detected');
                summary.recommendations.push('Consider optimizing rendering or reducing scene complexity');
            } else if (performanceStats.frameRate.mean < 45) {
                summary.overallHealth = 'fair';
                summary.issues.push('Frame rate could be improved');
            }
        }

        // Analyze memory usage
        if (performanceStats && performanceStats.memory) {
            summary.keyMetrics.averageMemory = Math.round(performanceStats.memory.mean);
            
            if (performanceStats.memory.mean > 80) {
                summary.overallHealth = 'poor';
                summary.issues.push('High memory usage detected');
                summary.recommendations.push('Check for memory leaks and optimize memory usage');
            }
        }

        // Analyze alerts
        if (alertReport && alertReport.summary) {
            summary.keyMetrics.totalAlerts = alertReport.summary.totalAlerts;
            summary.keyMetrics.criticalAlerts = alertReport.summary.alertsBySeverity.critical || 0;
            
            if (summary.keyMetrics.criticalAlerts > 0) {
                summary.overallHealth = 'critical';
                summary.issues.push(`${summary.keyMetrics.criticalAlerts} critical alerts detected`);
            }
            
            // Add alert recommendations
            if (alertReport.recommendations) {
                summary.recommendations.push(...alertReport.recommendations);
            }
        }

        return summary;
    }

    /**
     * Export performance data
     */
    exportData(format = 'json', startTime = null, endTime = null) {
        return this.dataStore.exportData(format, startTime, endTime);
    }

    /**
     * Clear all stored data
     */
    clearStoredData() {
        this.dataStore.clear();
        this.thresholdMonitor.clearHistory();
        this.clearHistory(); // Clear legacy history
    }

    /**
     * Get data storage information
     */
    getStorageInfo() {
        return this.dataStore.getStorageInfo();
    }

    /**
     * Notify alert callbacks
     */
    notifyAlertCallbacks(alerts) {
        // This is handled by the ThresholdMonitor's callback system
        // but we can add additional processing here if needed
        alerts.forEach(alert => {
            console.log(`Performance Alert: ${alert.message}`);
        });
    }

    /**
     * Register optimization systems for metrics collection
     */
    registerOptimizationSystem(systemName, systemInstance) {
        if (this.optimizationSystems.hasOwnProperty(systemName)) {
            this.optimizationSystems[systemName] = systemInstance;
            console.log(`Registered optimization system: ${systemName}`);
            return true;
        } else {
            console.warn(`Unknown optimization system: ${systemName}`);
            return false;
        }
    }

    /**
     * Unregister an optimization system
     */
    unregisterOptimizationSystem(systemName) {
        if (this.optimizationSystems.hasOwnProperty(systemName)) {
            this.optimizationSystems[systemName] = null;
            console.log(`Unregistered optimization system: ${systemName}`);
            return true;
        }
        return false;
    }

    /**
     * Get optimization impact measurement
     */
    measureOptimizationImpact(timeRangeMs = 30000) {
        const endTime = performance.now();
        const startTime = endTime - timeRangeMs;
        
        const recentMetrics = this.metricsHistory.filter(m => 
            m.timestamp >= startTime && m.optimization
        );

        if (recentMetrics.length < 2) {
            return null;
        }

        const firstMetrics = recentMetrics[0];
        const lastMetrics = recentMetrics[recentMetrics.length - 1];

        // Calculate performance improvements
        const frameRateImprovement = lastMetrics.frameRate.current - firstMetrics.frameRate.current;
        const memoryImprovement = firstMetrics.memory.used - lastMetrics.memory.used;
        
        // Calculate optimization effectiveness changes
        const effectivenessImprovement = {
            overall: lastMetrics.optimization.effectiveness.overall - firstMetrics.optimization.effectiveness.overall,
            rendering: lastMetrics.optimization.effectiveness.rendering - firstMetrics.optimization.effectiveness.rendering,
            memory: lastMetrics.optimization.effectiveness.memory - firstMetrics.optimization.effectiveness.memory,
            agents: lastMetrics.optimization.effectiveness.agents - firstMetrics.optimization.effectiveness.agents,
            physics: lastMetrics.optimization.effectiveness.physics - firstMetrics.optimization.effectiveness.physics
        };

        return {
            timeRange: timeRangeMs,
            sampleCount: recentMetrics.length,
            performance: {
                frameRateChange: Math.round(frameRateImprovement * 100) / 100,
                memoryChange: Math.round(memoryImprovement / 1024 / 1024 * 100) / 100, // MB
                frameTimeChange: (1000 / lastMetrics.frameRate.current) - (1000 / firstMetrics.frameRate.current)
            },
            effectiveness: effectivenessImprovement,
            optimizationStats: {
                lodSwitches: lastMetrics.optimization.lod.lodSwitches || 0,
                cullingRatio: lastMetrics.optimization.culling.cullingRatio || 0,
                poolEfficiency: lastMetrics.optimization.memory.poolEfficiency || 0,
                agentSchedulingEfficiency: lastMetrics.optimization.agents.scheduler.averageUpdatesPerFrame || 0
            }
        };
    }

    /**
     * Generate optimization effectiveness report
     */
    generateOptimizationReport(timeRange = 300000) { // 5 minutes default
        const endTime = Date.now();
        const startTime = endTime - timeRange;
        
        const performanceStats = this.getPerformanceStatistics(startTime, endTime);
        const optimizationImpact = this.measureOptimizationImpact(timeRange);
        const currentOptimization = this.getOptimizationMetrics();
        
        return {
            timeRange: { start: startTime, end: endTime, duration: timeRange },
            currentOptimization,
            optimizationImpact,
            performance: performanceStats,
            recommendations: this.generateOptimizationRecommendations(currentOptimization, performanceStats),
            summary: this.generateOptimizationSummary(currentOptimization, optimizationImpact)
        };
    }

    /**
     * Generate optimization recommendations
     */
    generateOptimizationRecommendations(optimizationMetrics, performanceStats) {
        const recommendations = [];

        // LOD recommendations
        if (optimizationMetrics.lod.enabled && optimizationMetrics.lod.averageLODLevel < 1.0) {
            recommendations.push({
                category: 'LOD',
                priority: 'medium',
                message: 'Consider increasing LOD distances to improve performance',
                impact: 'Reduces rendering complexity for distant objects'
            });
        }

        // Culling recommendations
        if (optimizationMetrics.culling.enabled && optimizationMetrics.culling.cullingRatio < 0.3) {
            recommendations.push({
                category: 'Culling',
                priority: 'high',
                message: 'Low culling ratio detected - check culling configuration',
                impact: 'Improves performance by hiding non-visible objects'
            });
        }

        // Instancing recommendations
        if (optimizationMetrics.instancing.enabled && optimizationMetrics.instancing.instancingRatio < 0.2) {
            recommendations.push({
                category: 'Instancing',
                priority: 'medium',
                message: 'Low instancing ratio - consider grouping similar meshes',
                impact: 'Reduces draw calls for similar objects'
            });
        }

        // Memory recommendations
        if (optimizationMetrics.memory.enabled && optimizationMetrics.memory.poolEfficiency < 0.7) {
            recommendations.push({
                category: 'Memory',
                priority: 'medium',
                message: 'Low object pool efficiency - adjust pool sizes',
                impact: 'Reduces garbage collection overhead'
            });
        }

        // Agent scheduling recommendations
        if (optimizationMetrics.agents.scheduler.enabled) {
            const updateRatio = optimizationMetrics.agents.scheduler.averageUpdatesPerFrame / 
                               optimizationMetrics.agents.scheduler.totalAgents;
            if (updateRatio > 0.5) {
                recommendations.push({
                    category: 'Agents',
                    priority: 'high',
                    message: 'High agent update ratio - consider reducing update frequency',
                    impact: 'Spreads AI processing load across frames'
                });
            }
        }

        // Performance-based recommendations
        if (performanceStats && performanceStats.frameRate && performanceStats.frameRate.mean < 30) {
            recommendations.push({
                category: 'Performance',
                priority: 'critical',
                message: 'Low frame rate detected - enable aggressive optimizations',
                impact: 'Improves overall performance and user experience'
            });
        }

        return recommendations;
    }

    /**
     * Generate optimization summary
     */
    generateOptimizationSummary(optimizationMetrics, optimizationImpact) {
        const summary = {
            overallEffectiveness: optimizationMetrics.effectiveness.overall,
            status: 'good',
            activeOptimizations: 0,
            keyMetrics: {},
            improvements: [],
            issues: []
        };

        // Count active optimizations
        if (optimizationMetrics.lod.enabled) summary.activeOptimizations++;
        if (optimizationMetrics.culling.enabled) summary.activeOptimizations++;
        if (optimizationMetrics.instancing.enabled) summary.activeOptimizations++;
        if (optimizationMetrics.memory.enabled) summary.activeOptimizations++;
        if (optimizationMetrics.agents.scheduler.enabled) summary.activeOptimizations++;

        // Set status based on effectiveness
        if (optimizationMetrics.effectiveness.overall < 30) {
            summary.status = 'poor';
        } else if (optimizationMetrics.effectiveness.overall < 60) {
            summary.status = 'fair';
        } else if (optimizationMetrics.effectiveness.overall >= 80) {
            summary.status = 'excellent';
        }

        // Key metrics
        summary.keyMetrics = {
            lodLevel: optimizationMetrics.lod.averageLODLevel,
            cullingRatio: optimizationMetrics.culling.cullingRatio,
            instancingRatio: optimizationMetrics.instancing.instancingRatio,
            poolEfficiency: optimizationMetrics.memory.poolEfficiency,
            drawCallsSaved: optimizationMetrics.instancing.drawCallsSaved
        };

        // Analyze improvements
        if (optimizationImpact) {
            if (optimizationImpact.performance.frameRateChange > 5) {
                summary.improvements.push(`Frame rate improved by ${optimizationImpact.performance.frameRateChange.toFixed(1)} FPS`);
            }
            if (optimizationImpact.performance.memoryChange > 10) {
                summary.improvements.push(`Memory usage reduced by ${optimizationImpact.performance.memoryChange.toFixed(1)} MB`);
            }
            if (optimizationImpact.effectiveness.overall > 10) {
                summary.improvements.push(`Overall optimization effectiveness improved by ${optimizationImpact.effectiveness.overall}%`);
            }
        }

        // Identify issues
        if (optimizationMetrics.culling.enabled && optimizationMetrics.culling.cullingRatio < 0.2) {
            summary.issues.push('Low culling effectiveness');
        }
        if (optimizationMetrics.memory.enabled && optimizationMetrics.memory.isMemoryPressure) {
            summary.issues.push('Memory pressure detected');
        }
        if (optimizationMetrics.agents.scheduler.enabled && 
            optimizationMetrics.agents.scheduler.averageUpdatesPerFrame > optimizationMetrics.agents.scheduler.totalAgents * 0.8) {
            summary.issues.push('High agent processing load');
        }

        return summary;
    }

    /**
     * Dispose of the performance monitor
     */
    dispose() {
        this.stopMonitoring();
        
        if (this.frameRateTracker) {
            this.frameRateTracker.dispose();
        }
        
        if (this.memoryMonitor) {
            this.memoryMonitor.dispose();
        }
        
        if (this.cpuProfiler) {
            this.cpuProfiler.dispose();
        }
        
        if (this.agentPerformanceTracker) {
            this.agentPerformanceTracker.dispose();
        }
        
        if (this.dataStore) {
            this.dataStore.dispose();
        }
        
        if (this.thresholdMonitor) {
            this.thresholdMonitor.dispose();
        }
        
        // Clear optimization system references
        for (const systemName in this.optimizationSystems) {
            this.optimizationSystems[systemName] = null;
        }
        
        this.updateCallbacks = [];
        this.alertCallbacks = [];
        this.metricsHistory = [];
    }

    // Utility methods for statistical calculations
    calculateAverage(values) {
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }

    calculateVariance(values) {
        if (values.length === 0) return 0;
        const avg = this.calculateAverage(values);
        return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    }

    calculateStandardDeviation(values) {
        return Math.sqrt(this.calculateVariance(values));
    }
}