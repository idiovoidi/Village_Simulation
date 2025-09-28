/**
 * Core performance monitoring system for the village simulation
 * Provides comprehensive tracking of frame rate, memory usage, and system performance
 */

import { FrameRateTracker } from './FrameRateTracker.js';
import { MemoryMonitor } from './MemoryMonitor.js';

export class PerformanceMonitor {
    constructor(engine, scene) {
        this.engine = engine;
        this.scene = scene;
        
        // Initialize monitoring components
        this.frameRateTracker = new FrameRateTracker(engine);
        this.memoryMonitor = new MemoryMonitor();
        
        // Performance data storage
        this.isMonitoring = false;
        this.metricsHistory = [];
        this.maxHistorySize = 1000; // Keep last 1000 measurements
        
        // Callbacks for real-time updates
        this.updateCallbacks = [];
        
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
        
        // Create comprehensive metrics object
        const metrics = {
            timestamp,
            frameRate: frameRateData,
            memory: memoryData,
            scene: this.getSceneMetrics(),
            system: this.getSystemMetrics()
        };

        // Store in history
        this.addToHistory(metrics);
        
        // Notify callbacks
        this.notifyUpdateCallbacks(metrics);
        
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
        
        this.updateCallbacks = [];
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