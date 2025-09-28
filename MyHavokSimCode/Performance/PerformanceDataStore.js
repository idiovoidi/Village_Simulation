/**
 * Performance data storage and management system
 * Handles storage, retrieval, and analysis of historical performance metrics
 */

export class PerformanceDataStore {
    constructor(options = {}) {
        // Configuration
        this.maxStorageSize = options.maxStorageSize || 10000; // Maximum number of data points
        this.compressionThreshold = options.compressionThreshold || 5000; // When to start compressing old data
        this.retentionPeriod = options.retentionPeriod || 24 * 60 * 60 * 1000; // 24 hours in ms
        this.storageKey = options.storageKey || 'performance_metrics';
        
        // Data storage
        this.metrics = [];
        this.aggregatedData = new Map(); // Time period -> aggregated metrics
        this.indices = new Map(); // For fast lookups
        
        // Compression settings
        this.compressionIntervals = [
            { period: 60 * 1000, label: '1min' },      // 1 minute intervals
            { period: 5 * 60 * 1000, label: '5min' },  // 5 minute intervals
            { period: 15 * 60 * 1000, label: '15min' }, // 15 minute intervals
            { period: 60 * 60 * 1000, label: '1hour' }  // 1 hour intervals
        ];
        
        // Statistics cache
        this.statsCache = new Map();
        this.cacheTimeout = 30 * 1000; // 30 seconds
        
        // Initialize storage
        this.loadFromStorage();
        
        // Set up periodic maintenance
        this.maintenanceInterval = setInterval(() => {
            this.performMaintenance();
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Store performance metrics
     */
    store(metrics) {
        if (!metrics || typeof metrics !== 'object') {
            throw new Error('Invalid metrics data');
        }

        // Add timestamp if not present
        if (!metrics.timestamp) {
            metrics.timestamp = performance.now();
        }

        // Add to main storage
        this.metrics.push({
            ...metrics,
            id: this.generateId(),
            stored: Date.now()
        });

        // Update indices for fast lookups
        this.updateIndices(metrics);

        // Clear stats cache
        this.statsCache.clear();

        // Check if maintenance is needed
        if (this.metrics.length > this.maxStorageSize) {
            this.performMaintenance();
        }

        // Persist to storage
        this.saveToStorage();
    }

    /**
     * Store multiple metrics at once
     */
    storeBatch(metricsArray) {
        if (!Array.isArray(metricsArray)) {
            throw new Error('Metrics must be an array');
        }

        metricsArray.forEach(metrics => {
            this.store(metrics);
        });
    }

    /**
     * Retrieve metrics within a time range
     */
    getMetrics(startTime, endTime, options = {}) {
        const {
            limit = null,
            offset = 0,
            compressed = false,
            fields = null
        } = options;

        let results;

        if (compressed) {
            results = this.getCompressedMetrics(startTime, endTime);
        } else {
            results = this.metrics.filter(metric => 
                metric.timestamp >= startTime && metric.timestamp <= endTime
            );
        }

        // Apply offset and limit
        if (offset > 0) {
            results = results.slice(offset);
        }
        
        if (limit && limit > 0) {
            results = results.slice(0, limit);
        }

        // Filter fields if specified
        if (fields && Array.isArray(fields)) {
            results = results.map(metric => {
                const filtered = { timestamp: metric.timestamp };
                fields.forEach(field => {
                    if (metric[field] !== undefined) {
                        filtered[field] = metric[field];
                    }
                });
                return filtered;
            });
        }

        return results;
    }

    /**
     * Get the latest metrics
     */
    getLatest(count = 1) {
        if (count === 1) {
            return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
        }
        
        return this.metrics.slice(-count);
    }

    /**
     * Get metrics for a specific time period with aggregation
     */
    getAggregatedMetrics(startTime, endTime, interval = '5min') {
        const cacheKey = `agg_${startTime}_${endTime}_${interval}`;
        
        // Check cache
        if (this.statsCache.has(cacheKey)) {
            const cached = this.statsCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const metrics = this.getMetrics(startTime, endTime);
        const intervalMs = this.parseInterval(interval);
        const aggregated = this.aggregateMetrics(metrics, intervalMs);
        
        // Cache result
        this.statsCache.set(cacheKey, {
            data: aggregated,
            timestamp: Date.now()
        });
        
        return aggregated;
    }

    /**
     * Aggregate metrics by time intervals
     */
    aggregateMetrics(metrics, intervalMs) {
        if (metrics.length === 0) {
            return [];
        }

        const buckets = new Map();
        
        metrics.forEach(metric => {
            const bucketTime = Math.floor(metric.timestamp / intervalMs) * intervalMs;
            
            if (!buckets.has(bucketTime)) {
                buckets.set(bucketTime, {
                    timestamp: bucketTime,
                    count: 0,
                    frameRate: { values: [], sum: 0 },
                    memory: { values: [], sum: 0 },
                    cpu: { values: [], sum: 0 },
                    agents: { values: [], sum: 0 }
                });
            }
            
            const bucket = buckets.get(bucketTime);
            bucket.count++;
            
            // Aggregate frame rate
            if (metric.frameRate && typeof metric.frameRate.current === 'number') {
                bucket.frameRate.values.push(metric.frameRate.current);
                bucket.frameRate.sum += metric.frameRate.current;
            }
            
            // Aggregate memory usage
            if (metric.memory && typeof metric.memory.usagePercentage === 'number') {
                bucket.memory.values.push(metric.memory.usagePercentage);
                bucket.memory.sum += metric.memory.usagePercentage;
            }
            
            // Aggregate CPU utilization (if available)
            if (metric.cpu && typeof metric.cpu.utilization === 'number') {
                bucket.cpu.values.push(metric.cpu.utilization);
                bucket.cpu.sum += metric.cpu.utilization;
            }
            
            // Aggregate agent count
            if (metric.scene && typeof metric.scene.meshCount === 'number') {
                bucket.agents.values.push(metric.scene.meshCount);
                bucket.agents.sum += metric.scene.meshCount;
            }
        });
        
        // Calculate statistics for each bucket
        const result = [];
        for (const [timestamp, bucket] of buckets) {
            result.push({
                timestamp,
                count: bucket.count,
                frameRate: this.calculateBucketStats(bucket.frameRate),
                memory: this.calculateBucketStats(bucket.memory),
                cpu: this.calculateBucketStats(bucket.cpu),
                agents: this.calculateBucketStats(bucket.agents)
            });
        }
        
        return result.sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Calculate statistics for a data bucket
     */
    calculateBucketStats(bucket) {
        if (bucket.values.length === 0) {
            return {
                average: 0,
                min: 0,
                max: 0,
                count: 0
            };
        }
        
        const sorted = bucket.values.sort((a, b) => a - b);
        
        return {
            average: Math.round((bucket.sum / bucket.values.length) * 100) / 100,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
            count: bucket.values.length
        };
    }

    /**
     * Get performance statistics for a time range
     */
    getStatistics(startTime, endTime) {
        const cacheKey = `stats_${startTime}_${endTime}`;
        
        // Check cache
        if (this.statsCache.has(cacheKey)) {
            const cached = this.statsCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const metrics = this.getMetrics(startTime, endTime);
        
        if (metrics.length === 0) {
            return {
                count: 0,
                timeRange: { start: startTime, end: endTime },
                frameRate: null,
                memory: null,
                performance: null
            };
        }

        // Extract values for analysis
        const frameRates = metrics
            .filter(m => m.frameRate && typeof m.frameRate.current === 'number')
            .map(m => m.frameRate.current);
            
        const memoryUsages = metrics
            .filter(m => m.memory && typeof m.memory.usagePercentage === 'number')
            .map(m => m.memory.usagePercentage);

        const statistics = {
            count: metrics.length,
            timeRange: { 
                start: startTime, 
                end: endTime,
                duration: endTime - startTime
            },
            frameRate: this.calculateStatistics(frameRates, 'FPS'),
            memory: this.calculateStatistics(memoryUsages, '%'),
            performance: this.analyzePerformanceTrends(metrics)
        };
        
        // Cache result
        this.statsCache.set(cacheKey, {
            data: statistics,
            timestamp: Date.now()
        });
        
        return statistics;
    }

    /**
     * Calculate comprehensive statistics for a dataset
     */
    calculateStatistics(values, unit = '') {
        if (values.length === 0) {
            return null;
        }

        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        
        // Calculate variance and standard deviation
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            count: values.length,
            mean: Math.round(mean * 100) / 100,
            median: sorted[Math.floor(sorted.length / 2)],
            min: sorted[0],
            max: sorted[sorted.length - 1],
            p25: sorted[Math.floor(sorted.length * 0.25)],
            p75: sorted[Math.floor(sorted.length * 0.75)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
            standardDeviation: Math.round(stdDev * 100) / 100,
            variance: Math.round(variance * 100) / 100,
            unit
        };
    }

    /**
     * Analyze performance trends
     */
    analyzePerformanceTrends(metrics) {
        if (metrics.length < 10) {
            return {
                trend: 'insufficient_data',
                stability: 'unknown',
                issues: []
            };
        }

        const frameRates = metrics
            .filter(m => m.frameRate && typeof m.frameRate.current === 'number')
            .map(m => m.frameRate.current);

        const memoryUsages = metrics
            .filter(m => m.memory && typeof m.memory.usagePercentage === 'number')
            .map(m => m.memory.usagePercentage);

        const issues = [];
        
        // Analyze frame rate trend
        const frameRateTrend = this.calculateTrend(frameRates);
        const memoryTrend = this.calculateTrend(memoryUsages);
        
        // Check for performance issues
        if (frameRates.length > 0) {
            const avgFPS = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
            if (avgFPS < 30) {
                issues.push('Low frame rate detected (< 30 FPS)');
            }
            
            const fpsVariance = this.calculateVariance(frameRates);
            if (fpsVariance > 100) {
                issues.push('High frame rate variance detected');
            }
        }
        
        if (memoryUsages.length > 0) {
            const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
            if (avgMemory > 80) {
                issues.push('High memory usage detected (> 80%)');
            }
            
            if (memoryTrend === 'increasing') {
                issues.push('Memory usage is trending upward');
            }
        }

        return {
            frameRateTrend,
            memoryTrend,
            stability: this.assessStability(frameRates, memoryUsages),
            issues
        };
    }

    /**
     * Calculate trend direction for a dataset
     */
    calculateTrend(values) {
        if (values.length < 5) {
            return 'insufficient_data';
        }

        const midpoint = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, midpoint);
        const secondHalf = values.slice(midpoint);
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        const difference = secondAvg - firstAvg;
        const threshold = Math.abs(firstAvg) * 0.05; // 5% threshold
        
        if (Math.abs(difference) < threshold) {
            return 'stable';
        } else if (difference > 0) {
            return 'increasing';
        } else {
            return 'decreasing';
        }
    }

    /**
     * Calculate variance for a dataset
     */
    calculateVariance(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }

    /**
     * Assess overall performance stability
     */
    assessStability(frameRates, memoryUsages) {
        let stabilityScore = 0;
        let factors = 0;
        
        if (frameRates.length > 0) {
            const fpsVariance = this.calculateVariance(frameRates);
            const fpsStability = Math.max(0, 100 - fpsVariance);
            stabilityScore += fpsStability;
            factors++;
        }
        
        if (memoryUsages.length > 0) {
            const memoryVariance = this.calculateVariance(memoryUsages);
            const memoryStability = Math.max(0, 100 - memoryVariance);
            stabilityScore += memoryStability;
            factors++;
        }
        
        if (factors === 0) {
            return 'unknown';
        }
        
        const avgStability = stabilityScore / factors;
        
        if (avgStability >= 80) {
            return 'excellent';
        } else if (avgStability >= 60) {
            return 'good';
        } else if (avgStability >= 40) {
            return 'fair';
        } else {
            return 'poor';
        }
    }

    /**
     * Set up performance threshold monitoring
     */
    setThresholds(thresholds) {
        this.thresholds = {
            frameRate: { min: 30, max: Infinity },
            memory: { min: 0, max: 80 },
            cpu: { min: 0, max: 80 },
            ...thresholds
        };
    }

    /**
     * Check if current metrics exceed thresholds
     */
    checkThresholds(metrics) {
        if (!this.thresholds) {
            return [];
        }

        const alerts = [];
        
        // Check frame rate
        if (metrics.frameRate && metrics.frameRate.current < this.thresholds.frameRate.min) {
            alerts.push({
                type: 'frameRate',
                severity: 'warning',
                message: `Frame rate below threshold: ${metrics.frameRate.current} < ${this.thresholds.frameRate.min}`,
                value: metrics.frameRate.current,
                threshold: this.thresholds.frameRate.min,
                timestamp: metrics.timestamp
            });
        }
        
        // Check memory usage
        if (metrics.memory && metrics.memory.usagePercentage > this.thresholds.memory.max) {
            alerts.push({
                type: 'memory',
                severity: 'warning',
                message: `Memory usage above threshold: ${metrics.memory.usagePercentage}% > ${this.thresholds.memory.max}%`,
                value: metrics.memory.usagePercentage,
                threshold: this.thresholds.memory.max,
                timestamp: metrics.timestamp
            });
        }
        
        return alerts;
    }

    /**
     * Perform data maintenance (compression, cleanup)
     */
    performMaintenance() {
        const now = Date.now();
        
        // Remove old data beyond retention period
        const cutoffTime = now - this.retentionPeriod;
        this.metrics = this.metrics.filter(metric => metric.stored > cutoffTime);
        
        // Compress old data if needed
        if (this.metrics.length > this.compressionThreshold) {
            this.compressOldData();
        }
        
        // Clear old cache entries
        for (const [key, cached] of this.statsCache) {
            if (now - cached.timestamp > this.cacheTimeout * 2) {
                this.statsCache.delete(key);
            }
        }
        
        // Update storage
        this.saveToStorage();
        
        console.log(`Performance data maintenance completed. Metrics: ${this.metrics.length}, Cache entries: ${this.statsCache.size}`);
    }

    /**
     * Compress old data to save space
     */
    compressOldData() {
        // Implementation would compress older data points into aggregated summaries
        // For now, we'll just remove the oldest 25% of data when over threshold
        const removeCount = Math.floor(this.metrics.length * 0.25);
        this.metrics.splice(0, removeCount);
    }

    /**
     * Generate unique ID for metrics
     */
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update indices for fast lookups
     */
    updateIndices(metrics) {
        // Simple timestamp-based indexing
        const timeKey = Math.floor(metrics.timestamp / 60000) * 60000; // 1-minute buckets
        
        if (!this.indices.has(timeKey)) {
            this.indices.set(timeKey, []);
        }
        
        this.indices.get(timeKey).push(this.metrics.length - 1);
    }

    /**
     * Parse interval string to milliseconds
     */
    parseInterval(interval) {
        const units = {
            's': 1000,
            'sec': 1000,
            'm': 60 * 1000,
            'min': 60 * 1000,
            'h': 60 * 60 * 1000,
            'hour': 60 * 60 * 1000
        };
        
        const match = interval.match(/^(\d+)(s|sec|m|min|h|hour)$/);
        if (match) {
            return parseInt(match[1]) * units[match[2]];
        }
        
        // Default to 5 minutes
        return 5 * 60 * 1000;
    }

    /**
     * Save data to persistent storage (localStorage)
     */
    saveToStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                const data = {
                    metrics: this.metrics.slice(-1000), // Save only last 1000 entries
                    timestamp: Date.now()
                };
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            }
        } catch (error) {
            console.warn('Failed to save performance data to storage:', error);
        }
    }

    /**
     * Load data from persistent storage
     */
    loadFromStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    const data = JSON.parse(stored);
                    if (data.metrics && Array.isArray(data.metrics)) {
                        this.metrics = data.metrics;
                        console.log(`Loaded ${this.metrics.length} performance metrics from storage`);
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load performance data from storage:', error);
        }
    }

    /**
     * Export data for analysis
     */
    exportData(format = 'json', startTime = null, endTime = null) {
        const data = startTime && endTime ? 
            this.getMetrics(startTime, endTime) : 
            this.metrics;
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
            
            case 'csv':
                return this.convertToCSV(data);
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        if (data.length === 0) {
            return '';
        }
        
        const headers = ['timestamp', 'frameRate', 'memoryUsage', 'meshCount'];
        const rows = [headers.join(',')];
        
        data.forEach(metric => {
            const row = [
                metric.timestamp,
                metric.frameRate ? metric.frameRate.current : '',
                metric.memory ? metric.memory.usagePercentage : '',
                metric.scene ? metric.scene.meshCount : ''
            ];
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }

    /**
     * Clear all stored data
     */
    clear() {
        this.metrics = [];
        this.aggregatedData.clear();
        this.indices.clear();
        this.statsCache.clear();
        
        // Clear persistent storage
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(this.storageKey);
            }
        } catch (error) {
            console.warn('Failed to clear storage:', error);
        }
    }

    /**
     * Get storage information
     */
    getStorageInfo() {
        return {
            metricsCount: this.metrics.length,
            aggregatedDataCount: this.aggregatedData.size,
            indicesCount: this.indices.size,
            cacheSize: this.statsCache.size,
            memoryUsage: this.estimateMemoryUsage(),
            oldestMetric: this.metrics.length > 0 ? this.metrics[0].timestamp : null,
            newestMetric: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1].timestamp : null
        };
    }

    /**
     * Estimate memory usage
     */
    estimateMemoryUsage() {
        const jsonString = JSON.stringify(this.metrics);
        return {
            bytes: jsonString.length * 2, // Rough estimate (UTF-16)
            formatted: this.formatBytes(jsonString.length * 2)
        };
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Dispose of the data store
     */
    dispose() {
        if (this.maintenanceInterval) {
            clearInterval(this.maintenanceInterval);
            this.maintenanceInterval = null;
        }
        
        this.saveToStorage();
        this.clear();
    }
}