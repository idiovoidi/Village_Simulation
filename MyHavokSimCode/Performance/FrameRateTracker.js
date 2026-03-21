/**
 * Frame rate tracking component for performance monitoring
 * Provides accurate FPS measurement using Babylon.js engine statistics
 */

export class FrameRateTracker {
    constructor(engine) {
        this.engine = engine;

        // Frame rate tracking
        this.isTracking = false;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.frameTimeHistory = [];
        this.maxHistorySize = 60; // Keep 60 frame times for smoothing

        // Current metrics
        this.currentFPS = 0;
        this.averageFPS = 0;
        this.minFPS = Infinity;
        this.maxFPS = 0;

        // Frame time statistics
        this.frameTime = 0;
        this.averageFrameTime = 0;

        // Tracking interval
        this.trackingInterval = null;
        this.updateInterval = 100; // Update every 100ms
    }

    /**
     * Start frame rate tracking
     */
    start() {
        if (this.isTracking) {
            return;
        }

        console.log('Starting frame rate tracking...');
        this.isTracking = true;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;

        // Reset statistics
        this.minFPS = Infinity;
        this.maxFPS = 0;
        this.frameTimeHistory = [];

        // Start periodic updates
        this.trackingInterval = setInterval(() => {
            this.updateMetrics();
        }, this.updateInterval);
    }

    /**
     * Stop frame rate tracking
     */
    stop() {
        if (!this.isTracking) {
            return;
        }

        console.log('Stopping frame rate tracking...');
        this.isTracking = false;

        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }
    }

    /**
     * Update frame rate metrics
     */
    updateMetrics() {
        if (!this.isTracking || !this.engine) {
            return;
        }

        const currentTime = performance.now();

        // Calculate frame time and FPS using engine statistics
        if (this.engine.getFps) {
            // Use Babylon.js built-in FPS calculation if available
            this.currentFPS = this.engine.getFps();
        } else {
            // Fallback to manual calculation
            const deltaTime = currentTime - this.lastFrameTime;
            if (deltaTime > 0) {
                this.currentFPS = 1000 / deltaTime;
            }
        }

        // Calculate frame time
        this.frameTime = this.currentFPS > 0 ? 1000 / this.currentFPS : 0;

        // Update frame time history
        this.frameTimeHistory.push(this.frameTime);
        if (this.frameTimeHistory.length > this.maxHistorySize) {
            this.frameTimeHistory.shift();
        }

        // Calculate average frame time and FPS
        if (this.frameTimeHistory.length > 0) {
            this.averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
            this.averageFPS = this.averageFrameTime > 0 ? 1000 / this.averageFrameTime : 0;
        }

        // Update min/max FPS
        if (this.currentFPS > 0) {
            this.minFPS = Math.min(this.minFPS, this.currentFPS);
            this.maxFPS = Math.max(this.maxFPS, this.currentFPS);
        }

        this.lastFrameTime = currentTime;
        this.frameCount++;
    }

    /**
     * Get current frame rate metrics
     */
    getCurrentMetrics() {
        // Ensure we have recent data
        this.updateMetrics();

        return {
            current: Math.round(this.currentFPS * 100) / 100,
            average: Math.round(this.averageFPS * 100) / 100,
            min: this.minFPS === Infinity ? 0 : Math.round(this.minFPS * 100) / 100,
            max: Math.round(this.maxFPS * 100) / 100,
            frameTime: Math.round(this.frameTime * 100) / 100,
            averageFrameTime: Math.round(this.averageFrameTime * 100) / 100,
            frameCount: this.frameCount,
            isStable: this.isFrameRateStable()
        };
    }

    /**
     * Check if frame rate is stable (low variance)
     */
    isFrameRateStable(threshold = 5) {
        if (this.frameTimeHistory.length < 10) {
            return false;
        }

        const recent = this.frameTimeHistory.slice(-10);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const variance = recent.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / recent.length;
        const stdDev = Math.sqrt(variance);

        // Consider stable if standard deviation is less than threshold
        return stdDev < threshold;
    }

    /**
     * Get frame rate statistics over a time period
     */
    getStatistics(sampleCount = null) {
        const samples = sampleCount ? this.frameTimeHistory.slice(-sampleCount) : this.frameTimeHistory;

        if (samples.length === 0) {
            return {
                sampleCount: 0,
                averageFrameTime: 0,
                averageFPS: 0,
                minFrameTime: 0,
                maxFrameTime: 0,
                variance: 0,
                standardDeviation: 0
            };
        }

        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        const min = Math.min(...samples);
        const max = Math.max(...samples);
        const variance = samples.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / samples.length;
        const stdDev = Math.sqrt(variance);

        return {
            sampleCount: samples.length,
            averageFrameTime: Math.round(avg * 100) / 100,
            averageFPS: avg > 0 ? Math.round((1000 / avg) * 100) / 100 : 0,
            minFrameTime: Math.round(min * 100) / 100,
            maxFrameTime: Math.round(max * 100) / 100,
            variance: Math.round(variance * 100) / 100,
            standardDeviation: Math.round(stdDev * 100) / 100
        };
    }

    /**
     * Reset frame rate statistics
     */
    reset() {
        this.frameCount = 0;
        this.minFPS = Infinity;
        this.maxFPS = 0;
        this.frameTimeHistory = [];
        this.lastFrameTime = performance.now();
    }

    /**
     * Set the update interval for metrics calculation
     */
    setUpdateInterval(intervalMs) {
        this.updateInterval = Math.max(50, intervalMs); // Minimum 50ms

        if (this.isTracking) {
            // Restart with new interval
            this.stop();
            this.start();
        }
    }

    /**
     * Get frame rate trend (improving, declining, stable)
     */
    getFrameRateTrend(sampleCount = 20) {
        if (this.frameTimeHistory.length < sampleCount) {
            return 'insufficient_data';
        }

        const recent = this.frameTimeHistory.slice(-sampleCount);
        const firstHalf = recent.slice(0, sampleCount / 2);
        const secondHalf = recent.slice(sampleCount / 2);

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        const difference = firstAvg - secondAvg;
        const threshold = 2; // 2ms threshold

        if (Math.abs(difference) < threshold) {
            return 'stable';
        } else if (difference > 0) {
            return 'improving'; // Frame time decreased = FPS improved
        } else {
            return 'declining'; // Frame time increased = FPS declined
        }
    }

    /**
     * Dispose of the frame rate tracker
     */
    dispose() {
        this.stop();
        this.frameTimeHistory = [];
        this.engine = null;
    }
}
