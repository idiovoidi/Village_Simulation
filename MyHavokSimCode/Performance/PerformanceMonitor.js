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
            system: this.getSystemMetrics()
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