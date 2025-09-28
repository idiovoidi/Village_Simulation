/**
 * CPU profiling component for performance monitoring
 * Measures render time, update time, and function execution performance
 */

export class CPUProfiler {
    constructor() {
        // Profiling state
        this.isProfiling = false;
        this.profiles = new Map(); // Function name -> profile data
        this.activeTimers = new Map(); // Timer ID -> start time
        
        // Performance metrics
        this.renderTimes = [];
        this.updateTimes = [];
        this.maxHistorySize = 100;
        
        // Frame timing
        this.frameStartTime = 0;
        this.lastFrameTime = 0;
        this.renderStartTime = 0;
        this.updateStartTime = 0;
        
        // Statistics
        this.totalFrames = 0;
        this.totalRenderTime = 0;
        this.totalUpdateTime = 0;
        
        // Timer ID counter
        this.timerIdCounter = 0;
    }

    /**
     * Start CPU profiling
     */
    start() {
        if (this.isProfiling) {
            console.warn('CPU profiling is already active');
            return;
        }

        console.log('Starting CPU profiling...');
        this.isProfiling = true;
        
        // Reset statistics
        this.profiles.clear();
        this.activeTimers.clear();
        this.renderTimes = [];
        this.updateTimes = [];
        this.totalFrames = 0;
        this.totalRenderTime = 0;
        this.totalUpdateTime = 0;
        
        this.frameStartTime = performance.now();
    }

    /**
     * Stop CPU profiling
     */
    stop() {
        if (!this.isProfiling) {
            return;
        }

        console.log('Stopping CPU profiling...');
        this.isProfiling = false;
        
        // Clear any active timers
        this.activeTimers.clear();
    }

    /**
     * Start timing a function or operation
     */
    startTimer(name) {
        if (!this.isProfiling) {
            return null;
        }

        const timerId = `${name}_${this.timerIdCounter++}`;
        const startTime = performance.now();
        
        this.activeTimers.set(timerId, {
            name,
            startTime,
            stackTrace: this.captureStackTrace()
        });
        
        return timerId;
    }

    /**
     * End timing for a function or operation
     */
    endTimer(timerId) {
        if (!this.isProfiling || !timerId || !this.activeTimers.has(timerId)) {
            return null;
        }

        const endTime = performance.now();
        const timerData = this.activeTimers.get(timerId);
        const duration = endTime - timerData.startTime;
        
        // Remove from active timers
        this.activeTimers.delete(timerId);
        
        // Update profile data
        this.updateProfile(timerData.name, duration, timerData.stackTrace);
        
        return {
            name: timerData.name,
            duration,
            startTime: timerData.startTime,
            endTime
        };
    }

    /**
     * Time a function execution
     */
    timeFunction(name, fn, ...args) {
        if (!this.isProfiling) {
            return fn(...args);
        }

        const timerId = this.startTimer(name);
        try {
            const result = fn(...args);
            
            // Handle async functions
            if (result && typeof result.then === 'function') {
                return result.finally(() => {
                    this.endTimer(timerId);
                });
            }
            
            this.endTimer(timerId);
            return result;
        } catch (error) {
            this.endTimer(timerId);
            throw error;
        }
    }

    /**
     * Time an async function execution
     */
    async timeAsyncFunction(name, fn, ...args) {
        if (!this.isProfiling) {
            return await fn(...args);
        }

        const timerId = this.startTimer(name);
        try {
            const result = await fn(...args);
            this.endTimer(timerId);
            return result;
        } catch (error) {
            this.endTimer(timerId);
            throw error;
        }
    }

    /**
     * Mark the start of a render frame
     */
    startRenderFrame() {
        if (!this.isProfiling) {
            return;
        }

        this.renderStartTime = performance.now();
    }

    /**
     * Mark the end of a render frame
     */
    endRenderFrame() {
        if (!this.isProfiling || this.renderStartTime === 0) {
            return;
        }

        const renderTime = performance.now() - this.renderStartTime;
        this.renderTimes.push(renderTime);
        this.totalRenderTime += renderTime;
        
        // Maintain history size
        if (this.renderTimes.length > this.maxHistorySize) {
            const removed = this.renderTimes.shift();
            this.totalRenderTime -= removed;
        }
        
        this.renderStartTime = 0;
    }

    /**
     * Mark the start of an update cycle
     */
    startUpdateCycle() {
        if (!this.isProfiling) {
            return;
        }

        this.updateStartTime = performance.now();
    }

    /**
     * Mark the end of an update cycle
     */
    endUpdateCycle() {
        if (!this.isProfiling || this.updateStartTime === 0) {
            return;
        }

        const updateTime = performance.now() - this.updateStartTime;
        this.updateTimes.push(updateTime);
        this.totalUpdateTime += updateTime;
        
        // Maintain history size
        if (this.updateTimes.length > this.maxHistorySize) {
            const removed = this.updateTimes.shift();
            this.totalUpdateTime -= removed;
        }
        
        this.updateStartTime = 0;
    }

    /**
     * Mark the end of a complete frame (render + update)
     */
    endFrame() {
        if (!this.isProfiling) {
            return;
        }

        const currentTime = performance.now();
        const frameTime = currentTime - this.frameStartTime;
        
        this.totalFrames++;
        this.lastFrameTime = frameTime;
        this.frameStartTime = currentTime;
    }

    /**
     * Update profile data for a function
     */
    updateProfile(name, duration, stackTrace) {
        if (!this.profiles.has(name)) {
            this.profiles.set(name, {
                name,
                callCount: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                averageTime: 0,
                lastCallTime: 0,
                stackTraces: []
            });
        }

        const profile = this.profiles.get(name);
        profile.callCount++;
        profile.totalTime += duration;
        profile.minTime = Math.min(profile.minTime, duration);
        profile.maxTime = Math.max(profile.maxTime, duration);
        profile.averageTime = profile.totalTime / profile.callCount;
        profile.lastCallTime = duration;
        
        // Store unique stack traces (limited to prevent memory issues)
        if (stackTrace && profile.stackTraces.length < 5) {
            const traceExists = profile.stackTraces.some(trace => trace === stackTrace);
            if (!traceExists) {
                profile.stackTraces.push(stackTrace);
            }
        }
    }

    /**
     * Get current CPU metrics
     */
    getCurrentMetrics() {
        const currentTime = performance.now();
        
        return {
            isProfiling: this.isProfiling,
            totalFrames: this.totalFrames,
            lastFrameTime: Math.round(this.lastFrameTime * 100) / 100,
            render: {
                averageTime: this.renderTimes.length > 0 ? 
                    Math.round((this.totalRenderTime / this.renderTimes.length) * 100) / 100 : 0,
                lastTime: this.renderTimes.length > 0 ? 
                    Math.round(this.renderTimes[this.renderTimes.length - 1] * 100) / 100 : 0,
                minTime: this.renderTimes.length > 0 ? 
                    Math.round(Math.min(...this.renderTimes) * 100) / 100 : 0,
                maxTime: this.renderTimes.length > 0 ? 
                    Math.round(Math.max(...this.renderTimes) * 100) / 100 : 0,
                sampleCount: this.renderTimes.length
            },
            update: {
                averageTime: this.updateTimes.length > 0 ? 
                    Math.round((this.totalUpdateTime / this.updateTimes.length) * 100) / 100 : 0,
                lastTime: this.updateTimes.length > 0 ? 
                    Math.round(this.updateTimes[this.updateTimes.length - 1] * 100) / 100 : 0,
                minTime: this.updateTimes.length > 0 ? 
                    Math.round(Math.min(...this.updateTimes) * 100) / 100 : 0,
                maxTime: this.updateTimes.length > 0 ? 
                    Math.round(Math.max(...this.updateTimes) * 100) / 100 : 0,
                sampleCount: this.updateTimes.length
            },
            activeTimers: this.activeTimers.size,
            profiledFunctions: this.profiles.size
        };
    }

    /**
     * Get profile data for all functions
     */
    getProfileData() {
        const profiles = [];
        
        for (const [name, profile] of this.profiles) {
            profiles.push({
                ...profile,
                minTime: Math.round(profile.minTime * 100) / 100,
                maxTime: Math.round(profile.maxTime * 100) / 100,
                averageTime: Math.round(profile.averageTime * 100) / 100,
                totalTime: Math.round(profile.totalTime * 100) / 100,
                lastCallTime: Math.round(profile.lastCallTime * 100) / 100
            });
        }
        
        // Sort by total time (most expensive first)
        return profiles.sort((a, b) => b.totalTime - a.totalTime);
    }

    /**
     * Get profile data for a specific function
     */
    getFunctionProfile(name) {
        const profile = this.profiles.get(name);
        if (!profile) {
            return null;
        }

        return {
            ...profile,
            minTime: Math.round(profile.minTime * 100) / 100,
            maxTime: Math.round(profile.maxTime * 100) / 100,
            averageTime: Math.round(profile.averageTime * 100) / 100,
            totalTime: Math.round(profile.totalTime * 100) / 100,
            lastCallTime: Math.round(profile.lastCallTime * 100) / 100
        };
    }

    /**
     * Get the most expensive functions
     */
    getTopFunctions(count = 10) {
        return this.getProfileData().slice(0, count);
    }

    /**
     * Get functions with the most calls
     */
    getMostCalledFunctions(count = 10) {
        return this.getProfileData()
            .sort((a, b) => b.callCount - a.callCount)
            .slice(0, count);
    }

    /**
     * Get performance bottlenecks
     */
    getBottlenecks(thresholdMs = 10) {
        return this.getProfileData().filter(profile => 
            profile.averageTime > thresholdMs || profile.maxTime > thresholdMs * 2
        );
    }

    /**
     * Capture stack trace for debugging
     */
    captureStackTrace() {
        try {
            throw new Error();
        } catch (e) {
            return e.stack ? e.stack.split('\n').slice(2, 7).join('\n') : 'Stack trace not available';
        }
    }

    /**
     * Clear all profile data
     */
    clearProfiles() {
        this.profiles.clear();
        this.renderTimes = [];
        this.updateTimes = [];
        this.totalFrames = 0;
        this.totalRenderTime = 0;
        this.totalUpdateTime = 0;
    }

    /**
     * Get CPU utilization estimate
     */
    getCPUUtilization() {
        if (this.renderTimes.length === 0 && this.updateTimes.length === 0) {
            return {
                render: 0,
                update: 0,
                total: 0,
                idle: 100
            };
        }

        const avgRenderTime = this.renderTimes.length > 0 ? 
            this.totalRenderTime / this.renderTimes.length : 0;
        const avgUpdateTime = this.updateTimes.length > 0 ? 
            this.totalUpdateTime / this.updateTimes.length : 0;
        
        // Assume 60 FPS target (16.67ms per frame)
        const targetFrameTime = 1000 / 60;
        const totalActiveTime = avgRenderTime + avgUpdateTime;
        
        const renderUtilization = (avgRenderTime / targetFrameTime) * 100;
        const updateUtilization = (avgUpdateTime / targetFrameTime) * 100;
        const totalUtilization = (totalActiveTime / targetFrameTime) * 100;
        const idleTime = Math.max(0, 100 - totalUtilization);
        
        return {
            render: Math.round(Math.min(100, renderUtilization) * 100) / 100,
            update: Math.round(Math.min(100, updateUtilization) * 100) / 100,
            total: Math.round(Math.min(100, totalUtilization) * 100) / 100,
            idle: Math.round(idleTime * 100) / 100
        };
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const metrics = this.getCurrentMetrics();
        const profiles = this.getProfileData();
        const bottlenecks = this.getBottlenecks();
        const utilization = this.getCPUUtilization();
        
        return {
            summary: {
                totalFrames: metrics.totalFrames,
                averageFrameTime: metrics.lastFrameTime,
                profiledFunctions: metrics.profiledFunctions,
                activeTimers: metrics.activeTimers
            },
            performance: {
                render: metrics.render,
                update: metrics.update,
                utilization
            },
            topFunctions: profiles.slice(0, 10),
            bottlenecks,
            recommendations: this.generateRecommendations(bottlenecks, utilization)
        };
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations(bottlenecks, utilization) {
        const recommendations = [];
        
        if (utilization.total > 80) {
            recommendations.push('High CPU utilization detected. Consider optimizing render or update loops.');
        }
        
        if (utilization.render > 50) {
            recommendations.push('High render time. Consider reducing mesh complexity or draw calls.');
        }
        
        if (utilization.update > 30) {
            recommendations.push('High update time. Consider optimizing agent behaviors or physics calculations.');
        }
        
        if (bottlenecks.length > 0) {
            const worstBottleneck = bottlenecks[0];
            recommendations.push(`Function "${worstBottleneck.name}" is a performance bottleneck (avg: ${worstBottleneck.averageTime}ms).`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Performance looks good! No major issues detected.');
        }
        
        return recommendations;
    }

    /**
     * Dispose of the CPU profiler
     */
    dispose() {
        this.stop();
        this.clearProfiles();
        this.activeTimers.clear();
    }
}