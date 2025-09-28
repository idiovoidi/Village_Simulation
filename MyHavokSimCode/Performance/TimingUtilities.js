/**
 * Timing utilities for performance measurement
 * Provides decorators and helper functions for measuring execution times
 */

/**
 * High-precision timer class for accurate measurements
 */
export class PrecisionTimer {
    constructor() {
        this.startTime = 0;
        this.endTime = 0;
        this.isRunning = false;
    }

    /**
     * Start the timer
     */
    start() {
        this.startTime = performance.now();
        this.isRunning = true;
        return this;
    }

    /**
     * Stop the timer and return elapsed time
     */
    stop() {
        if (!this.isRunning) {
            throw new Error('Timer is not running');
        }
        
        this.endTime = performance.now();
        this.isRunning = false;
        return this.getElapsed();
    }

    /**
     * Get elapsed time without stopping the timer
     */
    getElapsed() {
        const end = this.isRunning ? performance.now() : this.endTime;
        return end - this.startTime;
    }

    /**
     * Reset the timer
     */
    reset() {
        this.startTime = 0;
        this.endTime = 0;
        this.isRunning = false;
        return this;
    }

    /**
     * Restart the timer (reset and start)
     */
    restart() {
        return this.reset().start();
    }
}

/**
 * Function timing decorator
 */
export function timed(name, profiler = null) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = function(...args) {
            const timerName = name || `${target.constructor.name}.${propertyKey}`;
            
            if (profiler && profiler.timeFunction) {
                // Use provided profiler
                return profiler.timeFunction(timerName, originalMethod.bind(this), ...args);
            } else {
                // Fallback timing
                const timer = new PrecisionTimer().start();
                try {
                    const result = originalMethod.apply(this, args);
                    
                    // Handle async functions
                    if (result && typeof result.then === 'function') {
                        return result.finally(() => {
                            const elapsed = timer.stop();
                            console.log(`${timerName}: ${elapsed.toFixed(2)}ms`);
                        });
                    }
                    
                    const elapsed = timer.stop();
                    console.log(`${timerName}: ${elapsed.toFixed(2)}ms`);
                    return result;
                } catch (error) {
                    timer.stop();
                    throw error;
                }
            }
        };
        
        return descriptor;
    };
}

/**
 * Async function timing decorator
 */
export function timedAsync(name, profiler = null) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function(...args) {
            const timerName = name || `${target.constructor.name}.${propertyKey}`;
            
            if (profiler && profiler.timeAsyncFunction) {
                return await profiler.timeAsyncFunction(timerName, originalMethod.bind(this), ...args);
            } else {
                const timer = new PrecisionTimer().start();
                try {
                    const result = await originalMethod.apply(this, args);
                    const elapsed = timer.stop();
                    console.log(`${timerName}: ${elapsed.toFixed(2)}ms`);
                    return result;
                } catch (error) {
                    timer.stop();
                    throw error;
                }
            }
        };
        
        return descriptor;
    };
}

/**
 * Batch timing utility for measuring multiple operations
 */
export class BatchTimer {
    constructor() {
        this.timings = new Map();
        this.activeTimers = new Map();
    }

    /**
     * Start timing an operation
     */
    start(name) {
        if (this.activeTimers.has(name)) {
            console.warn(`Timer "${name}" is already running`);
            return;
        }
        
        this.activeTimers.set(name, performance.now());
    }

    /**
     * End timing an operation
     */
    end(name) {
        if (!this.activeTimers.has(name)) {
            console.warn(`Timer "${name}" was not started`);
            return 0;
        }
        
        const startTime = this.activeTimers.get(name);
        const elapsed = performance.now() - startTime;
        
        this.activeTimers.delete(name);
        
        // Store timing
        if (!this.timings.has(name)) {
            this.timings.set(name, []);
        }
        this.timings.get(name).push(elapsed);
        
        return elapsed;
    }

    /**
     * Get statistics for a specific operation
     */
    getStats(name) {
        const times = this.timings.get(name);
        if (!times || times.length === 0) {
            return null;
        }
        
        const sorted = [...times].sort((a, b) => a - b);
        const sum = times.reduce((a, b) => a + b, 0);
        
        return {
            name,
            count: times.length,
            total: Math.round(sum * 100) / 100,
            average: Math.round((sum / times.length) * 100) / 100,
            min: Math.round(sorted[0] * 100) / 100,
            max: Math.round(sorted[sorted.length - 1] * 100) / 100,
            median: Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100,
            p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100
        };
    }

    /**
     * Get all timing statistics
     */
    getAllStats() {
        const stats = [];
        for (const name of this.timings.keys()) {
            stats.push(this.getStats(name));
        }
        return stats.sort((a, b) => b.average - a.average);
    }

    /**
     * Clear all timings
     */
    clear() {
        this.timings.clear();
        this.activeTimers.clear();
    }

    /**
     * Generate timing report
     */
    generateReport() {
        const stats = this.getAllStats();
        
        return {
            totalOperations: stats.length,
            totalMeasurements: stats.reduce((sum, stat) => sum + stat.count, 0),
            operations: stats,
            summary: {
                slowestOperation: stats.length > 0 ? stats[0] : null,
                fastestOperation: stats.length > 0 ? stats[stats.length - 1] : null,
                totalTime: stats.reduce((sum, stat) => sum + stat.total, 0)
            }
        };
    }
}

/**
 * Performance benchmark utility
 */
export class PerformanceBenchmark {
    constructor(name) {
        this.name = name;
        this.iterations = 0;
        this.totalTime = 0;
        this.times = [];
        this.maxIterations = 1000;
    }

    /**
     * Run a benchmark
     */
    async run(fn, iterations = 100) {
        this.iterations = Math.min(iterations, this.maxIterations);
        this.times = [];
        this.totalTime = 0;
        
        console.log(`Running benchmark "${this.name}" with ${this.iterations} iterations...`);
        
        for (let i = 0; i < this.iterations; i++) {
            const timer = new PrecisionTimer().start();
            
            try {
                const result = fn();
                
                // Handle async functions
                if (result && typeof result.then === 'function') {
                    await result;
                }
                
                const elapsed = timer.stop();
                this.times.push(elapsed);
                this.totalTime += elapsed;
                
            } catch (error) {
                timer.stop();
                console.error(`Benchmark iteration ${i} failed:`, error);
                throw error;
            }
        }
        
        return this.getResults();
    }

    /**
     * Get benchmark results
     */
    getResults() {
        if (this.times.length === 0) {
            return null;
        }
        
        const sorted = [...this.times].sort((a, b) => a - b);
        const average = this.totalTime / this.times.length;
        
        return {
            name: this.name,
            iterations: this.iterations,
            totalTime: Math.round(this.totalTime * 100) / 100,
            averageTime: Math.round(average * 100) / 100,
            minTime: Math.round(sorted[0] * 100) / 100,
            maxTime: Math.round(sorted[sorted.length - 1] * 100) / 100,
            medianTime: Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100,
            p95Time: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
            p99Time: Math.round(sorted[Math.floor(sorted.length * 0.99)] * 100) / 100,
            standardDeviation: this.calculateStandardDeviation(this.times, average),
            operationsPerSecond: Math.round(1000 / average)
        };
    }

    /**
     * Calculate standard deviation
     */
    calculateStandardDeviation(values, mean) {
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.round(Math.sqrt(variance) * 100) / 100;
    }
}

/**
 * Frame rate measurement utility
 */
export class FrameRateMeasurer {
    constructor() {
        this.frameCount = 0;
        this.startTime = 0;
        this.lastFrameTime = 0;
        this.frameTimes = [];
        this.isRunning = false;
        this.maxSamples = 60;
    }

    /**
     * Start measuring frame rate
     */
    start() {
        this.frameCount = 0;
        this.startTime = performance.now();
        this.lastFrameTime = this.startTime;
        this.frameTimes = [];
        this.isRunning = true;
    }

    /**
     * Record a frame
     */
    recordFrame() {
        if (!this.isRunning) {
            return;
        }
        
        const currentTime = performance.now();
        const frameTime = currentTime - this.lastFrameTime;
        
        this.frameCount++;
        this.frameTimes.push(frameTime);
        
        // Maintain sample size
        if (this.frameTimes.length > this.maxSamples) {
            this.frameTimes.shift();
        }
        
        this.lastFrameTime = currentTime;
    }

    /**
     * Get current frame rate statistics
     */
    getStats() {
        if (!this.isRunning || this.frameTimes.length === 0) {
            return {
                fps: 0,
                averageFrameTime: 0,
                minFrameTime: 0,
                maxFrameTime: 0,
                frameCount: this.frameCount
            };
        }
        
        const averageFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        const fps = 1000 / averageFrameTime;
        
        return {
            fps: Math.round(fps * 100) / 100,
            averageFrameTime: Math.round(averageFrameTime * 100) / 100,
            minFrameTime: Math.round(Math.min(...this.frameTimes) * 100) / 100,
            maxFrameTime: Math.round(Math.max(...this.frameTimes) * 100) / 100,
            frameCount: this.frameCount,
            totalTime: Math.round((performance.now() - this.startTime) * 100) / 100
        };
    }

    /**
     * Stop measuring
     */
    stop() {
        this.isRunning = false;
        return this.getStats();
    }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
    constructor() {
        this.snapshots = [];
        this.maxSnapshots = 100;
        this.hasMemoryAPI = 'memory' in performance;
    }

    /**
     * Take a memory snapshot
     */
    snapshot(label = null) {
        const timestamp = performance.now();
        
        if (this.hasMemoryAPI) {
            const memory = performance.memory;
            const snapshot = {
                timestamp,
                label,
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit
            };
            
            this.snapshots.push(snapshot);
            
            // Maintain snapshot limit
            if (this.snapshots.length > this.maxSnapshots) {
                this.snapshots.shift();
            }
            
            return snapshot;
        } else {
            return {
                timestamp,
                label,
                used: 0,
                total: 0,
                limit: 0,
                error: 'Memory API not available'
            };
        }
    }

    /**
     * Get memory usage difference between two snapshots
     */
    getDifference(snapshot1, snapshot2) {
        if (!snapshot1 || !snapshot2) {
            return null;
        }
        
        return {
            timeDiff: snapshot2.timestamp - snapshot1.timestamp,
            usedDiff: snapshot2.used - snapshot1.used,
            totalDiff: snapshot2.total - snapshot1.total,
            usedDiffFormatted: this.formatBytes(snapshot2.used - snapshot1.used),
            totalDiffFormatted: this.formatBytes(snapshot2.total - snapshot1.total)
        };
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get all snapshots
     */
    getSnapshots() {
        return [...this.snapshots];
    }

    /**
     * Clear all snapshots
     */
    clear() {
        this.snapshots = [];
    }
}

/**
 * Utility functions
 */
export const TimingUtils = {
    /**
     * Measure execution time of a function
     */
    measure(fn, ...args) {
        const timer = new PrecisionTimer().start();
        const result = fn(...args);
        const elapsed = timer.stop();
        
        return {
            result,
            elapsed,
            elapsedFormatted: `${elapsed.toFixed(2)}ms`
        };
    },

    /**
     * Measure execution time of an async function
     */
    async measureAsync(fn, ...args) {
        const timer = new PrecisionTimer().start();
        const result = await fn(...args);
        const elapsed = timer.stop();
        
        return {
            result,
            elapsed,
            elapsedFormatted: `${elapsed.toFixed(2)}ms`
        };
    },

    /**
     * Create a throttled version of a function
     */
    throttle(fn, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = performance.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return fn.apply(this, args);
            }
        };
    },

    /**
     * Create a debounced version of a function
     */
    debounce(fn, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * Sleep for a specified duration
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};