/**
 * Memory monitoring component for performance tracking
 * Monitors heap memory usage and GPU memory when available
 */

export class MemoryMonitor {
    constructor() {
        // Memory tracking state
        this.isMonitoring = false;
        this.memoryHistory = [];
        this.maxHistorySize = 100; // Keep last 100 measurements
        
        // Current memory metrics
        this.currentMemory = {
            used: 0,
            total: 0,
            heapUsed: 0,
            heapTotal: 0,
            external: 0,
            arrayBuffers: 0
        };
        
        // GPU memory tracking (when available)
        this.gpuMemory = {
            used: 0,
            total: 0,
            available: false
        };
        
        // Monitoring interval
        this.monitoringInterval = null;
        this.updateInterval = 1000; // Update every second
        
        // Check for memory API availability
        this.hasMemoryAPI = this.checkMemoryAPISupport();
        this.hasGPUMemoryAPI = this.checkGPUMemorySupport();
    }

    /**
     * Check if the browser supports the Memory API
     */
    checkMemoryAPISupport() {
        return 'memory' in performance && 
               typeof performance.memory === 'object' &&
               'usedJSHeapSize' in performance.memory;
    }

    /**
     * Check if GPU memory information is available
     */
    checkGPUMemorySupport() {
        // Check for WebGL memory info extension
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const ext = gl.getExtension('WEBGL_debug_renderer_info');
                return ext !== null;
            }
        } catch (error) {
            // Ignore errors
        }
        return false;
    }

    /**
     * Start memory monitoring
     */
    start() {
        if (this.isMonitoring) {
            return;
        }

        console.log('Starting memory monitoring...');
        this.isMonitoring = true;
        
        // Clear history
        this.memoryHistory = [];
        
        // Start periodic monitoring
        this.monitoringInterval = setInterval(() => {
            this.updateMemoryMetrics();
        }, this.updateInterval);
        
        // Take initial measurement
        this.updateMemoryMetrics();
    }

    /**
     * Stop memory monitoring
     */
    stop() {
        if (!this.isMonitoring) {
            return;
        }

        console.log('Stopping memory monitoring...');
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Update memory metrics
     */
    updateMemoryMetrics() {
        if (!this.isMonitoring) {
            return;
        }

        const timestamp = performance.now();
        
        // Update heap memory information
        this.updateHeapMemory();
        
        // Update GPU memory information if available
        this.updateGPUMemory();
        
        // Create memory snapshot
        const memorySnapshot = {
            timestamp,
            ...this.currentMemory,
            gpu: { ...this.gpuMemory }
        };
        
        // Add to history
        this.memoryHistory.push(memorySnapshot);
        
        // Maintain history size
        if (this.memoryHistory.length > this.maxHistorySize) {
            this.memoryHistory.shift();
        }
    }

    /**
     * Update heap memory metrics
     */
    updateHeapMemory() {
        if (this.hasMemoryAPI) {
            const memory = performance.memory;
            
            this.currentMemory = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                heapUsed: memory.usedJSHeapSize,
                heapTotal: memory.totalJSHeapSize,
                external: memory.totalJSHeapSize - memory.usedJSHeapSize,
                arrayBuffers: 0 // Not directly available in standard API
            };
        } else {
            // Fallback: estimate memory usage
            this.currentMemory = {
                used: 0,
                total: 0,
                heapUsed: 0,
                heapTotal: 0,
                external: 0,
                arrayBuffers: 0
            };
        }
    }

    /**
     * Update GPU memory metrics (when available)
     */
    updateGPUMemory() {
        if (this.hasGPUMemoryAPI) {
            try {
                // This is a simplified approach - actual GPU memory tracking
                // would require more sophisticated WebGL queries
                this.gpuMemory = {
                    used: 0, // Would need WebGL extension to get actual values
                    total: 0,
                    available: true
                };
            } catch (error) {
                this.gpuMemory.available = false;
            }
        } else {
            this.gpuMemory.available = false;
        }
    }

    /**
     * Get current memory metrics
     */
    getCurrentMetrics() {
        // Ensure we have recent data
        if (this.isMonitoring) {
            this.updateMemoryMetrics();
        }
        
        return {
            used: this.formatBytes(this.currentMemory.used),
            total: this.formatBytes(this.currentMemory.total),
            heapUsed: this.formatBytes(this.currentMemory.heapUsed),
            heapTotal: this.formatBytes(this.currentMemory.heapTotal),
            usagePercentage: this.currentMemory.total > 0 ? 
                Math.round((this.currentMemory.used / this.currentMemory.total) * 100) : 0,
            gpu: {
                ...this.gpuMemory,
                used: this.formatBytes(this.gpuMemory.used),
                total: this.formatBytes(this.gpuMemory.total)
            },
            trend: this.getMemoryTrend(),
            hasMemoryAPI: this.hasMemoryAPI
        };
    }

    /**
     * Get memory usage trend
     */
    getMemoryTrend(sampleCount = 10) {
        if (this.memoryHistory.length < sampleCount) {
            return 'insufficient_data';
        }
        
        const recent = this.memoryHistory.slice(-sampleCount);
        const firstHalf = recent.slice(0, sampleCount / 2);
        const secondHalf = recent.slice(sampleCount / 2);
        
        const firstAvg = firstHalf.reduce((sum, sample) => sum + sample.used, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, sample) => sum + sample.used, 0) / secondHalf.length;
        
        const difference = secondAvg - firstAvg;
        const threshold = 1024 * 1024; // 1MB threshold
        
        if (Math.abs(difference) < threshold) {
            return 'stable';
        } else if (difference > 0) {
            return 'increasing';
        } else {
            return 'decreasing';
        }
    }

    /**
     * Get memory statistics
     */
    getMemoryStatistics(timeRangeMs = 60000) {
        const cutoffTime = performance.now() - timeRangeMs;
        const recentSamples = this.memoryHistory.filter(sample => sample.timestamp >= cutoffTime);
        
        if (recentSamples.length === 0) {
            return {
                sampleCount: 0,
                averageUsage: 0,
                minUsage: 0,
                maxUsage: 0,
                memoryGrowth: 0,
                isStable: false
            };
        }
        
        const usageValues = recentSamples.map(sample => sample.used);
        const average = usageValues.reduce((a, b) => a + b, 0) / usageValues.length;
        const min = Math.min(...usageValues);
        const max = Math.max(...usageValues);
        
        // Calculate memory growth rate
        const firstSample = recentSamples[0];
        const lastSample = recentSamples[recentSamples.length - 1];
        const timeDiff = lastSample.timestamp - firstSample.timestamp;
        const memoryGrowth = timeDiff > 0 ? 
            (lastSample.used - firstSample.used) / (timeDiff / 1000) : 0; // bytes per second
        
        // Check stability (low variance)
        const variance = usageValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / usageValues.length;
        const stdDev = Math.sqrt(variance);
        const isStable = stdDev < (average * 0.1); // Stable if std dev < 10% of average
        
        return {
            sampleCount: recentSamples.length,
            averageUsage: this.formatBytes(average),
            minUsage: this.formatBytes(min),
            maxUsage: this.formatBytes(max),
            memoryGrowth: this.formatBytes(Math.abs(memoryGrowth)) + '/s',
            memoryGrowthDirection: memoryGrowth > 0 ? 'increasing' : memoryGrowth < 0 ? 'decreasing' : 'stable',
            isStable,
            variance: this.formatBytes(variance)
        };
    }

    /**
     * Detect potential memory leaks
     */
    detectMemoryLeak(thresholdGrowthRate = 1024 * 1024) { // 1MB/s default threshold
        const stats = this.getMemoryStatistics(300000); // Check last 5 minutes
        
        if (stats.sampleCount < 10) {
            return {
                detected: false,
                reason: 'insufficient_data'
            };
        }
        
        // Parse growth rate
        const growthMatch = stats.memoryGrowth.match(/^([\d.]+)\s*([KMGT]?B)/);
        if (!growthMatch) {
            return {
                detected: false,
                reason: 'invalid_growth_data'
            };
        }
        
        const growthValue = parseFloat(growthMatch[1]);
        const growthUnit = growthMatch[2];
        
        // Convert to bytes
        let growthBytes = growthValue;
        switch (growthUnit) {
            case 'KB': growthBytes *= 1024; break;
            case 'MB': growthBytes *= 1024 * 1024; break;
            case 'GB': growthBytes *= 1024 * 1024 * 1024; break;
        }
        
        const isLeaking = stats.memoryGrowthDirection === 'increasing' && 
                         growthBytes > thresholdGrowthRate;
        
        return {
            detected: isLeaking,
            growthRate: stats.memoryGrowth,
            threshold: this.formatBytes(thresholdGrowthRate) + '/s',
            recommendation: isLeaking ? 
                'Memory usage is growing rapidly. Check for object retention and dispose of unused resources.' :
                'Memory usage appears normal.'
        };
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get memory history
     */
    getMemoryHistory(count = null) {
        if (count === null) {
            return [...this.memoryHistory];
        }
        
        return this.memoryHistory.slice(-count);
    }

    /**
     * Clear memory history
     */
    clearHistory() {
        this.memoryHistory = [];
    }

    /**
     * Set monitoring update interval
     */
    setUpdateInterval(intervalMs) {
        this.updateInterval = Math.max(500, intervalMs); // Minimum 500ms
        
        if (this.isMonitoring) {
            // Restart with new interval
            this.stop();
            this.start();
        }
    }

    /**
     * Dispose of the memory monitor
     */
    dispose() {
        this.stop();
        this.memoryHistory = [];
    }
}