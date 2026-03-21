/**
 * Physics performance monitoring integration
 * Extends the existing performance monitoring system with physics-specific metrics
 */

export class PhysicsPerformanceMonitor {
    constructor(performanceMonitor, physicsOptimizer = null, collisionOptimizer = null) {
        this.performanceMonitor = performanceMonitor;
        this.physicsOptimizer = physicsOptimizer;
        this.collisionOptimizer = collisionOptimizer;

        // Physics-specific metrics
        this.physicsMetrics = {
            // Timing metrics
            physicsUpdateTime: 0,
            collisionDetectionTime: 0,
            constraintSolvingTime: 0,
            integrationTime: 0,

            // Body metrics
            totalBodies: 0,
            activeBodies: 0,
            sleepingBodies: 0,
            staticBodies: 0,

            // Collision metrics
            collisionPairs: 0,
            activeCollisions: 0,
            broadPhaseChecks: 0,
            narrowPhaseChecks: 0,

            // Optimization metrics
            optimizationLevel: 0,
            spatialGridCells: 0,
            cachedCollisions: 0,

            // Performance indicators
            physicsLoad: 0, // 0-100%
            bottleneckType: 'none', // 'collision', 'integration', 'constraints', 'none'
            recommendedActions: []
        };

        // Performance thresholds for physics
        this.physicsThresholds = {
            updateTime: {
                good: 2.0,    // < 2ms
                warning: 5.0, // 2-5ms
                critical: 10.0 // > 10ms
            },
            bodyCount: {
                good: 100,
                warning: 500,
                critical: 1000
            },
            collisionPairs: {
                good: 50,
                warning: 200,
                critical: 500
            }
        };

        // Bottleneck detection
        this.bottleneckHistory = [];
        this.bottleneckHistorySize = 60; // 1 second at 60fps

        // Recommendation system
        this.lastRecommendationTime = 0;
        this.recommendationCooldown = 10000; // 10 seconds

        // Initialize monitoring
        this.initialize();
    }

    /**
     * Initialize physics performance monitoring
     */
    initialize() {
        if (!this.performanceMonitor) {
            console.warn('PhysicsPerformanceMonitor: No performance monitor provided');
            return;
        }

        // Register for performance updates
        this.performanceMonitor.onMetricsUpdate(metrics => {
            this.updatePhysicsMetrics(metrics);
        });

        // Set up physics-specific thresholds
        this.setupPhysicsThresholds();

        console.log('PhysicsPerformanceMonitor: Initialized');
    }

    /**
     * Set up physics-specific performance thresholds
     */
    setupPhysicsThresholds() {
        if (!this.performanceMonitor.setThresholds) {
            return;
        }

        // Add physics thresholds to the main performance monitor
        this.performanceMonitor.setThresholds('physics', {
            updateTime: {
                critical: { min: 0, max: this.physicsThresholds.updateTime.critical },
                warning: { min: 0, max: this.physicsThresholds.updateTime.warning },
                info: { min: 0, max: this.physicsThresholds.updateTime.good }
            },
            bodyCount: {
                critical: { min: this.physicsThresholds.bodyCount.critical, max: Infinity },
                warning: { min: this.physicsThresholds.bodyCount.warning, max: Infinity },
                info: { min: this.physicsThresholds.bodyCount.good, max: Infinity }
            }
        });
    }

    /**
     * Update physics-specific metrics
     */
    updatePhysicsMetrics(generalMetrics) {
        const startTime = performance.now();

        // Collect physics optimizer metrics
        if (this.physicsOptimizer) {
            const optimizerMetrics = this.physicsOptimizer.getMetrics();

            this.physicsMetrics.totalBodies = optimizerMetrics.totalBodies;
            this.physicsMetrics.activeBodies = optimizerMetrics.activeBodies;
            this.physicsMetrics.sleepingBodies = optimizerMetrics.sleepingBodies;
            this.physicsMetrics.physicsUpdateTime = optimizerMetrics.lastUpdateTime;

            // Calculate optimization level (0-3 scale to 0-100%)
            this.physicsMetrics.optimizationLevel = this.calculateOptimizationLevel(optimizerMetrics);
        }

        // Collect collision optimizer metrics
        if (this.collisionOptimizer) {
            const collisionMetrics = this.collisionOptimizer.getMetrics();

            this.physicsMetrics.broadPhaseChecks = collisionMetrics.totalChecks;
            this.physicsMetrics.cachedCollisions = collisionMetrics.cacheHits;
            this.physicsMetrics.collisionPairs = collisionMetrics.activePairs;

            if (collisionMetrics.spatial) {
                this.physicsMetrics.spatialGridCells = collisionMetrics.spatial.occupiedCells;
            }
        }

        // Calculate physics load
        this.physicsMetrics.physicsLoad = this.calculatePhysicsLoad();

        // Detect bottlenecks
        this.detectBottlenecks();

        // Generate recommendations
        this.generateRecommendations();

        // Add physics metrics to general metrics
        if (generalMetrics) {
            generalMetrics.physics = { ...this.physicsMetrics };
        }

        const updateTime = performance.now() - startTime;
        this.physicsMetrics.monitoringOverhead = updateTime;
    }

    /**
     * Calculate optimization level percentage
     */
    calculateOptimizationLevel(optimizerMetrics) {
        if (!optimizerMetrics.settings) {
            return 0;
        }

        const { settings } = optimizerMetrics;

        // Calculate how much we've deviated from base settings
        const freqRatio = settings.currentUpdateFrequency / settings.baseUpdateFrequency;
        const accuracyRatio = settings.currentCollisionAccuracy / settings.baseCollisionAccuracy;
        const iterRatio = settings.currentSolverIterations / settings.baseSolverIterations;

        // Average the ratios and convert to optimization level (lower = more optimized)
        const avgRatio = (freqRatio + accuracyRatio + iterRatio) / 3;
        return Math.round((1 - avgRatio) * 100);
    }

    /**
     * Calculate overall physics load percentage
     */
    calculatePhysicsLoad() {
        let load = 0;

        // Factor in update time
        if (this.physicsMetrics.physicsUpdateTime > 0) {
            const timeLoad = Math.min(100,
                (this.physicsMetrics.physicsUpdateTime / this.physicsThresholds.updateTime.critical) * 100
            );
            load += timeLoad * 0.4; // 40% weight
        }

        // Factor in body count
        if (this.physicsMetrics.totalBodies > 0) {
            const bodyLoad = Math.min(100,
                (this.physicsMetrics.totalBodies / this.physicsThresholds.bodyCount.critical) * 100
            );
            load += bodyLoad * 0.3; // 30% weight
        }

        // Factor in collision pairs
        if (this.physicsMetrics.collisionPairs > 0) {
            const collisionLoad = Math.min(100,
                (this.physicsMetrics.collisionPairs / this.physicsThresholds.collisionPairs.critical) * 100
            );
            load += collisionLoad * 0.3; // 30% weight
        }

        return Math.round(Math.min(100, load));
    }

    /**
     * Detect physics bottlenecks
     */
    detectBottlenecks() {
        let bottleneck = 'none';

        // Check update time bottleneck
        if (this.physicsMetrics.physicsUpdateTime > this.physicsThresholds.updateTime.warning) {
            bottleneck = 'integration';
        }

        // Check collision bottleneck
        if (this.physicsMetrics.broadPhaseChecks > this.physicsThresholds.collisionPairs.warning * 10) {
            bottleneck = 'collision';
        }

        // Check body count bottleneck
        if (this.physicsMetrics.totalBodies > this.physicsThresholds.bodyCount.warning) {
            if (bottleneck === 'none') {
                bottleneck = 'bodies';
            }
        }

        // Update bottleneck history
        this.bottleneckHistory.push(bottleneck);
        if (this.bottleneckHistory.length > this.bottleneckHistorySize) {
            this.bottleneckHistory.shift();
        }

        // Determine persistent bottleneck
        this.physicsMetrics.bottleneckType = this.getMostFrequentBottleneck();
    }

    /**
     * Get the most frequent bottleneck from history
     */
    getMostFrequentBottleneck() {
        if (this.bottleneckHistory.length === 0) {
            return 'none';
        }

        const counts = {};
        this.bottleneckHistory.forEach(bottleneck => {
            counts[bottleneck] = (counts[bottleneck] || 0) + 1;
        });

        let maxCount = 0;
        let mostFrequent = 'none';

        for (const [bottleneck, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                mostFrequent = bottleneck;
            }
        }

        // Only consider it a bottleneck if it occurs frequently enough
        const threshold = this.bottleneckHistorySize * 0.3; // 30% of the time
        return maxCount >= threshold ? mostFrequent : 'none';
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations() {
        const currentTime = performance.now();

        // Throttle recommendations
        if (currentTime - this.lastRecommendationTime < this.recommendationCooldown) {
            return;
        }

        const recommendations = [];

        // High physics load recommendations
        if (this.physicsMetrics.physicsLoad > 80) {
            recommendations.push({
                type: 'critical',
                message: 'Physics load is very high',
                action: 'Consider reducing physics quality or body count'
            });
        }

        // Bottleneck-specific recommendations
        switch (this.physicsMetrics.bottleneckType) {
            case 'collision':
                recommendations.push({
                    type: 'warning',
                    message: 'Collision detection is the primary bottleneck',
                    action: 'Enable spatial partitioning or reduce collision accuracy'
                });
                break;

            case 'integration':
                recommendations.push({
                    type: 'warning',
                    message: 'Physics integration is slow',
                    action: 'Reduce physics update frequency or solver iterations'
                });
                break;

            case 'bodies':
                recommendations.push({
                    type: 'warning',
                    message: 'Too many physics bodies active',
                    action: 'Enable body sleeping or reduce active body count'
                });
                break;
        }

        // Low optimization recommendations
        if (this.physicsMetrics.optimizationLevel < 20 && this.physicsMetrics.physicsLoad > 60) {
            recommendations.push({
                type: 'info',
                message: 'Physics optimization is not active',
                action: 'Enable automatic physics optimization'
            });
        }

        // Spatial partitioning recommendations
        if (!this.collisionOptimizer && this.physicsMetrics.totalBodies > 50) {
            recommendations.push({
                type: 'info',
                message: 'Spatial partitioning not enabled',
                action: 'Enable spatial partitioning for better collision performance'
            });
        }

        this.physicsMetrics.recommendedActions = recommendations;

        if (recommendations.length > 0) {
            this.lastRecommendationTime = currentTime;
        }
    }

    /**
     * Get physics performance report
     */
    getPhysicsReport() {
        return {
            metrics: { ...this.physicsMetrics },
            thresholds: { ...this.physicsThresholds },
            bottleneckHistory: [...this.bottleneckHistory],
            summary: this.generatePhysicsSummary()
        };
    }

    /**
     * Generate physics performance summary
     */
    generatePhysicsSummary() {
        const summary = {
            overallHealth: 'good',
            primaryConcerns: [],
            strengths: [],
            keyMetrics: {
                physicsLoad: this.physicsMetrics.physicsLoad,
                activeBodies: this.physicsMetrics.activeBodies,
                updateTime: this.physicsMetrics.physicsUpdateTime,
                optimizationLevel: this.physicsMetrics.optimizationLevel
            }
        };

        // Determine overall health
        if (this.physicsMetrics.physicsLoad > 80) {
            summary.overallHealth = 'critical';
            summary.primaryConcerns.push('Very high physics load');
        } else if (this.physicsMetrics.physicsLoad > 60) {
            summary.overallHealth = 'warning';
            summary.primaryConcerns.push('High physics load');
        } else if (this.physicsMetrics.physicsLoad > 40) {
            summary.overallHealth = 'fair';
        }

        // Check for specific issues
        if (this.physicsMetrics.physicsUpdateTime > this.physicsThresholds.updateTime.warning) {
            summary.primaryConcerns.push('Slow physics updates');
        }

        if (this.physicsMetrics.totalBodies > this.physicsThresholds.bodyCount.warning) {
            summary.primaryConcerns.push('High body count');
        }

        if (this.physicsMetrics.bottleneckType !== 'none') {
            summary.primaryConcerns.push(`${this.physicsMetrics.bottleneckType} bottleneck detected`);
        }

        // Identify strengths
        if (this.physicsMetrics.optimizationLevel > 50) {
            summary.strengths.push('Active physics optimization');
        }

        if (this.collisionOptimizer && this.physicsMetrics.cachedCollisions > 0) {
            summary.strengths.push('Collision caching active');
        }

        if (this.physicsMetrics.sleepingBodies > this.physicsMetrics.activeBodies) {
            summary.strengths.push('Good body sleep management');
        }

        return summary;
    }

    /**
     * Get physics metrics for external monitoring
     */
    getCurrentPhysicsMetrics() {
        return { ...this.physicsMetrics };
    }

    /**
     * Set physics performance thresholds
     */
    setPhysicsThresholds(thresholds) {
        this.physicsThresholds = { ...this.physicsThresholds, ...thresholds };
        this.setupPhysicsThresholds();
    }

    /**
     * Reset physics metrics
     */
    resetPhysicsMetrics() {
        this.physicsMetrics = {
            physicsUpdateTime: 0,
            collisionDetectionTime: 0,
            constraintSolvingTime: 0,
            integrationTime: 0,
            totalBodies: 0,
            activeBodies: 0,
            sleepingBodies: 0,
            staticBodies: 0,
            collisionPairs: 0,
            activeCollisions: 0,
            broadPhaseChecks: 0,
            narrowPhaseChecks: 0,
            optimizationLevel: 0,
            spatialGridCells: 0,
            cachedCollisions: 0,
            physicsLoad: 0,
            bottleneckType: 'none',
            recommendedActions: []
        };

        this.bottleneckHistory = [];
    }

    /**
     * Export physics performance data
     */
    exportPhysicsData(format = 'json') {
        const data = {
            timestamp: Date.now(),
            metrics: this.physicsMetrics,
            thresholds: this.physicsThresholds,
            bottleneckHistory: this.bottleneckHistory,
            report: this.getPhysicsReport()
        };

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);

            case 'csv':
                return this.convertToCSV(data);

            default:
                return data;
        }
    }

    /**
     * Convert physics data to CSV format
     */
    convertToCSV(data) {
        const headers = [
            'timestamp', 'physicsLoad', 'activeBodies', 'sleepingBodies',
            'physicsUpdateTime', 'collisionPairs', 'optimizationLevel',
            'bottleneckType', 'recommendationCount'
        ];

        const values = [
            data.timestamp,
            data.metrics.physicsLoad,
            data.metrics.activeBodies,
            data.metrics.sleepingBodies,
            data.metrics.physicsUpdateTime,
            data.metrics.collisionPairs,
            data.metrics.optimizationLevel,
            data.metrics.bottleneckType,
            data.metrics.recommendedActions.length
        ];

        return `${headers.join(',')}\n${values.join(',')}`;
    }

    /**
     * Dispose of the physics performance monitor
     */
    dispose() {
        // Clean up references
        this.performanceMonitor = null;
        this.physicsOptimizer = null;
        this.collisionOptimizer = null;

        // Clear data
        this.physicsMetrics = null;
        this.bottleneckHistory = [];

        console.log('PhysicsPerformanceMonitor: Disposed');
    }
}

/**
 * Physics Performance Dashboard
 * Provides real-time visualization of physics performance metrics
 */
export class PhysicsPerformanceDashboard {
    constructor(physicsPerformanceMonitor, container = null) {
        this.monitor = physicsPerformanceMonitor;
        this.container = container;

        // Dashboard state
        this.isVisible = false;
        this.updateInterval = null;
        this.updateFrequency = 2; // Hz

        // UI elements
        this.dashboardElement = null;
        this.metricsElements = {};

        // Chart data (simplified for this implementation)
        this.chartData = {
            physicsLoad: [],
            updateTime: [],
            bodyCount: [],
            maxDataPoints: 60
        };

        this.initialize();
    }

    /**
     * Initialize the dashboard
     */
    initialize() {
        if (!this.monitor) {
            console.warn('PhysicsPerformanceDashboard: No monitor provided');
            return;
        }

        this.createDashboardUI();
        console.log('PhysicsPerformanceDashboard: Initialized');
    }

    /**
     * Create dashboard UI elements
     */
    createDashboardUI() {
        // Create main dashboard container
        this.dashboardElement = document.createElement('div');
        this.dashboardElement.id = 'physics-performance-dashboard';
        this.dashboardElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
        `;

        // Add to container or body
        if (this.container) {
            this.container.appendChild(this.dashboardElement);
        } else {
            document.body.appendChild(this.dashboardElement);
        }

        // Create metrics display
        this.createMetricsDisplay();
    }

    /**
     * Create metrics display elements
     */
    createMetricsDisplay() {
        const metricsHTML = `
            <h3 style="margin: 0 0 10px 0; color: #4CAF50;">Physics Performance</h3>
            <div id="physics-load">Physics Load: <span>0%</span></div>
            <div id="active-bodies">Active Bodies: <span>0</span></div>
            <div id="sleeping-bodies">Sleeping Bodies: <span>0</span></div>
            <div id="update-time">Update Time: <span>0.0ms</span></div>
            <div id="collision-pairs">Collision Pairs: <span>0</span></div>
            <div id="optimization-level">Optimization: <span>0%</span></div>
            <div id="bottleneck">Bottleneck: <span>none</span></div>
            <div id="recommendations" style="margin-top: 10px;">
                <strong>Recommendations:</strong>
                <div id="recommendation-list"></div>
            </div>
        `;

        this.dashboardElement.innerHTML = metricsHTML;

        // Store references to metric elements
        this.metricsElements = {
            physicsLoad: this.dashboardElement.querySelector('#physics-load span'),
            activeBodies: this.dashboardElement.querySelector('#active-bodies span'),
            sleepingBodies: this.dashboardElement.querySelector('#sleeping-bodies span'),
            updateTime: this.dashboardElement.querySelector('#update-time span'),
            collisionPairs: this.dashboardElement.querySelector('#collision-pairs span'),
            optimizationLevel: this.dashboardElement.querySelector('#optimization-level span'),
            bottleneck: this.dashboardElement.querySelector('#bottleneck span'),
            recommendationList: this.dashboardElement.querySelector('#recommendation-list')
        };
    }

    /**
     * Show the dashboard
     */
    show() {
        if (this.isVisible) {
            return;
        }

        this.isVisible = true;
        this.dashboardElement.style.display = 'block';

        // Start update loop
        const intervalMs = 1000 / this.updateFrequency;
        this.updateInterval = setInterval(() => {
            this.updateDisplay();
        }, intervalMs);

        console.log('PhysicsPerformanceDashboard: Shown');
    }

    /**
     * Hide the dashboard
     */
    hide() {
        if (!this.isVisible) {
            return;
        }

        this.isVisible = false;
        this.dashboardElement.style.display = 'none';

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        console.log('PhysicsPerformanceDashboard: Hidden');
    }

    /**
     * Toggle dashboard visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Update dashboard display
     */
    updateDisplay() {
        if (!this.monitor || !this.isVisible) {
            return;
        }

        const metrics = this.monitor.getCurrentPhysicsMetrics();

        // Update metric displays
        this.metricsElements.physicsLoad.textContent = `${metrics.physicsLoad}%`;
        this.metricsElements.physicsLoad.style.color = this.getLoadColor(metrics.physicsLoad);

        this.metricsElements.activeBodies.textContent = metrics.activeBodies;
        this.metricsElements.sleepingBodies.textContent = metrics.sleepingBodies;
        this.metricsElements.updateTime.textContent = `${metrics.physicsUpdateTime.toFixed(1)}ms`;
        this.metricsElements.collisionPairs.textContent = metrics.collisionPairs;
        this.metricsElements.optimizationLevel.textContent = `${metrics.optimizationLevel}%`;
        this.metricsElements.bottleneck.textContent = metrics.bottleneckType;
        this.metricsElements.bottleneck.style.color = metrics.bottleneckType === 'none' ? '#4CAF50' : '#FF9800';

        // Update recommendations
        this.updateRecommendations(metrics.recommendedActions);

        // Update chart data
        this.updateChartData(metrics);
    }

    /**
     * Get color for load percentage
     */
    getLoadColor(load) {
        if (load < 40) return '#4CAF50'; // Green
        if (load < 70) return '#FF9800'; // Orange
        return '#F44336'; // Red
    }

    /**
     * Update recommendations display
     */
    updateRecommendations(recommendations) {
        const listElement = this.metricsElements.recommendationList;

        if (recommendations.length === 0) {
            listElement.innerHTML = '<div style="color: #4CAF50;">No issues detected</div>';
            return;
        }

        const recommendationHTML = recommendations.map(rec => {
            const color = rec.type === 'critical' ? '#F44336'
                : rec.type === 'warning' ? '#FF9800' : '#2196F3';

            return `<div style="color: ${color}; margin: 2px 0;">
                ${rec.message}: ${rec.action}
            </div>`;
        }).join('');

        listElement.innerHTML = recommendationHTML;
    }

    /**
     * Update chart data (simplified implementation)
     */
    updateChartData(metrics) {
        // Add new data points
        this.chartData.physicsLoad.push(metrics.physicsLoad);
        this.chartData.updateTime.push(metrics.physicsUpdateTime);
        this.chartData.bodyCount.push(metrics.activeBodies);

        // Maintain max data points
        Object.keys(this.chartData).forEach(key => {
            if (Array.isArray(this.chartData[key])) {
                while (this.chartData[key].length > this.chartData.maxDataPoints) {
                    this.chartData[key].shift();
                }
            }
        });
    }

    /**
     * Dispose of the dashboard
     */
    dispose() {
        this.hide();

        if (this.dashboardElement && this.dashboardElement.parentNode) {
            this.dashboardElement.parentNode.removeChild(this.dashboardElement);
        }

        this.monitor = null;
        this.container = null;
        this.dashboardElement = null;
        this.metricsElements = {};
        this.chartData = null;

        console.log('PhysicsPerformanceDashboard: Disposed');
    }
}
