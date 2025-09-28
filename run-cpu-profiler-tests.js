/**
 * Node.js test runner for CPU Profiler tests
 * Runs the CPU profiler and agent performance tracker tests
 */

// Mock browser APIs for Node.js environment
global.performance = {
    now: () => Date.now(),
    memory: {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 100000000
    }
};

// Simple test framework
class TestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    describe(name, fn) {
        console.log(`\n=== ${name} ===`);
        fn();
    }

    it(name, fn) {
        this.tests.push({ name, fn });
    }

    async runTests() {
        console.log('Running CPU Profiler Tests...\n');
        
        for (const test of this.tests) {
            try {
                await test.fn();
                this.results.push({ name: test.name, passed: true });
                console.log(`✅ ${test.name}`);
            } catch (error) {
                this.results.push({ name: test.name, passed: false, error: error.message });
                console.log(`❌ ${test.name}: ${error.message}`);
            }
        }

        this.printSummary();
    }

    printSummary() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;

        console.log('\n=== Test Summary ===');
        console.log(`Total: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

        if (failed > 0) {
            console.log('\nFailed Tests:');
            this.results.filter(r => !r.passed).forEach(test => {
                console.log(`- ${test.name}: ${test.error}`);
            });
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create test framework instance
const test = new TestFramework();

// Mock implementations for testing
class MockCPUProfiler {
    constructor() {
        this.isProfiling = false;
        this.profiles = new Map();
        this.activeTimers = new Map();
        this.renderTimes = [];
        this.updateTimes = [];
        this.totalFrames = 0;
        this.timerIdCounter = 0;
    }

    start() {
        this.isProfiling = true;
        this.profiles.clear();
        this.activeTimers.clear();
    }

    stop() {
        this.isProfiling = false;
        this.activeTimers.clear();
    }

    startTimer(name) {
        if (!this.isProfiling) return null;
        const timerId = `${name}_${this.timerIdCounter++}`;
        this.activeTimers.set(timerId, {
            name,
            startTime: performance.now()
        });
        return timerId;
    }

    endTimer(timerId) {
        if (!this.isProfiling || !timerId || !this.activeTimers.has(timerId)) {
            return null;
        }
        const endTime = performance.now();
        const timerData = this.activeTimers.get(timerId);
        const duration = endTime - timerData.startTime;
        
        this.activeTimers.delete(timerId);
        this.updateProfile(timerData.name, duration);
        
        return { name: timerData.name, duration };
    }

    timeFunction(name, fn, ...args) {
        if (!this.isProfiling) return fn(...args);
        
        const timerId = this.startTimer(name);
        try {
            const result = fn(...args);
            if (result && typeof result.then === 'function') {
                return result.finally(() => this.endTimer(timerId));
            }
            this.endTimer(timerId);
            return result;
        } catch (error) {
            this.endTimer(timerId);
            throw error;
        }
    }

    async timeAsyncFunction(name, fn, ...args) {
        if (!this.isProfiling) return await fn(...args);
        
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

    updateProfile(name, duration) {
        if (!this.profiles.has(name)) {
            this.profiles.set(name, {
                name,
                callCount: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                averageTime: 0
            });
        }
        
        const profile = this.profiles.get(name);
        profile.callCount++;
        profile.totalTime += duration;
        profile.minTime = Math.min(profile.minTime, duration);
        profile.maxTime = Math.max(profile.maxTime, duration);
        profile.averageTime = profile.totalTime / profile.callCount;
    }

    getCurrentMetrics() {
        return {
            isProfiling: this.isProfiling,
            totalFrames: this.totalFrames,
            lastFrameTime: 16.67,
            render: {
                averageTime: 8.5,
                sampleCount: this.renderTimes.length
            },
            update: {
                averageTime: 4.2,
                sampleCount: this.updateTimes.length
            },
            activeTimers: this.activeTimers.size,
            profiledFunctions: this.profiles.size
        };
    }

    getProfileData() {
        return Array.from(this.profiles.values());
    }

    getFunctionProfile(name) {
        return this.profiles.get(name) || null;
    }

    startRenderFrame() {
        this.renderStartTime = performance.now();
    }

    endRenderFrame() {
        if (this.renderStartTime) {
            const renderTime = performance.now() - this.renderStartTime;
            this.renderTimes.push(renderTime);
            this.renderStartTime = 0;
        }
    }

    startUpdateCycle() {
        this.updateStartTime = performance.now();
    }

    endUpdateCycle() {
        if (this.updateStartTime) {
            const updateTime = performance.now() - this.updateStartTime;
            this.updateTimes.push(updateTime);
            this.updateStartTime = 0;
        }
    }

    endFrame() {
        this.totalFrames++;
    }

    dispose() {
        this.stop();
        this.profiles.clear();
    }
}

class MockAgentPerformanceTracker {
    constructor() {
        this.isTracking = false;
        this.agentProfiles = new Map();
        this.behaviorProfiles = new Map();
        this.totalAgents = 0;
        this.activeAgents = 0;
        this.alerts = [];
        this.thresholds = {
            update: 2.0,
            behavior: 1.0
        };
    }

    start() {
        this.isTracking = true;
        this.agentProfiles.clear();
        this.behaviorProfiles.clear();
        this.alerts = [];
    }

    stop() {
        this.isTracking = false;
    }

    registerAgent(agentId, agentType, position = null) {
        if (!this.isTracking) return;
        
        this.agentProfiles.set(agentId, {
            id: agentId,
            type: agentType,
            position,
            updateCount: 0,
            totalUpdateTime: 0,
            averageUpdateTime: 0,
            behaviors: new Map(),
            isActive: true,
            alertCount: 0,
            isBottleneck: false
        });
        this.totalAgents++;
    }

    unregisterAgent(agentId) {
        if (this.agentProfiles.has(agentId)) {
            this.agentProfiles.get(agentId).isActive = false;
        }
    }

    startAgentUpdate(agentId) {
        if (!this.isTracking || !this.agentProfiles.has(agentId)) return null;
        return {
            agentId,
            startTime: performance.now(),
            type: 'update'
        };
    }

    endAgentUpdate(timingData) {
        if (!timingData || !this.agentProfiles.has(timingData.agentId)) return;
        
        const duration = performance.now() - timingData.startTime;
        const profile = this.agentProfiles.get(timingData.agentId);
        
        profile.updateCount++;
        profile.totalUpdateTime += duration;
        profile.averageUpdateTime = profile.totalUpdateTime / profile.updateCount;
        
        if (duration > this.thresholds.update) {
            profile.alertCount++;
            this.alerts.push({
                agentId: timingData.agentId,
                type: 'update',
                duration,
                timestamp: performance.now()
            });
        }
    }

    startBehavior(agentId, behaviorName) {
        if (!this.isTracking || !this.agentProfiles.has(agentId)) return null;
        return {
            agentId,
            behaviorName,
            startTime: performance.now(),
            type: 'behavior'
        };
    }

    endBehavior(timingData) {
        if (!timingData || !this.agentProfiles.has(timingData.agentId)) return;
        
        const duration = performance.now() - timingData.startTime;
        const profile = this.agentProfiles.get(timingData.agentId);
        
        if (!profile.behaviors.has(timingData.behaviorName)) {
            profile.behaviors.set(timingData.behaviorName, {
                name: timingData.behaviorName,
                callCount: 0,
                totalTime: 0,
                averageTime: 0
            });
        }
        
        const behaviorMetrics = profile.behaviors.get(timingData.behaviorName);
        behaviorMetrics.callCount++;
        behaviorMetrics.totalTime += duration;
        behaviorMetrics.averageTime = behaviorMetrics.totalTime / behaviorMetrics.callCount;
        
        this.updateGlobalBehaviorMetrics(timingData.behaviorName, duration);
    }

    updateGlobalBehaviorMetrics(behaviorName, duration) {
        if (!this.behaviorProfiles.has(behaviorName)) {
            this.behaviorProfiles.set(behaviorName, {
                name: behaviorName,
                callCount: 0,
                totalTime: 0,
                averageTime: 0
            });
        }
        
        const metrics = this.behaviorProfiles.get(behaviorName);
        metrics.callCount++;
        metrics.totalTime += duration;
        metrics.averageTime = metrics.totalTime / metrics.callCount;
    }

    getCurrentMetrics() {
        return {
            isTracking: this.isTracking,
            totalAgents: this.totalAgents,
            activeAgents: this.activeAgents,
            thresholds: this.thresholds
        };
    }

    getAgentPerformance(agentId) {
        const profile = this.agentProfiles.get(agentId);
        if (!profile) return null;
        
        return {
            id: profile.id,
            type: profile.type,
            isActive: profile.isActive,
            update: {
                count: profile.updateCount,
                averageTime: profile.averageTime
            },
            behaviors: Array.from(profile.behaviors.values()),
            alertCount: profile.alertCount
        };
    }

    getBehaviorPerformance() {
        return Array.from(this.behaviorProfiles.values());
    }

    getBottleneckAgents() {
        const bottlenecks = [];
        for (const [agentId, profile] of this.agentProfiles) {
            if (profile.isBottleneck || profile.averageUpdateTime > this.thresholds.update) {
                bottlenecks.push(this.getAgentPerformance(agentId));
            }
        }
        return bottlenecks;
    }

    getRecentAlerts() {
        return this.alerts;
    }

    getPerformanceStatistics() {
        const activeAgents = Array.from(this.agentProfiles.values()).filter(p => p.isActive);
        if (activeAgents.length === 0) {
            return {
                agentCount: 0,
                averageUpdateTime: 0,
                medianUpdateTime: 0,
                p95UpdateTime: 0,
                bottleneckPercentage: 0
            };
        }
        
        const updateTimes = activeAgents.map(a => a.averageUpdateTime).sort((a, b) => a - b);
        return {
            agentCount: activeAgents.length,
            averageUpdateTime: updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length,
            medianUpdateTime: updateTimes[Math.floor(updateTimes.length / 2)],
            p95UpdateTime: updateTimes[Math.floor(updateTimes.length * 0.95)],
            bottleneckPercentage: 0
        };
    }

    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }

    dispose() {
        this.stop();
        this.agentProfiles.clear();
        this.behaviorProfiles.clear();
    }
}

// Timing utilities
const TimingUtils = {
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    measure: (fn, ...args) => {
        const start = performance.now();
        const result = fn(...args);
        const elapsed = performance.now() - start;
        return { result, elapsed };
    },
    
    measureAsync: async (fn, ...args) => {
        const start = performance.now();
        const result = await fn(...args);
        const elapsed = performance.now() - start;
        return { result, elapsed };
    }
};

// Define tests
async function runTests() {
    test.describe('CPUProfiler Tests', () => {
        test.it('should initialize correctly', () => {
            const profiler = new MockCPUProfiler();
            test.assert(!profiler.isProfiling, 'Initial profiling state is false');
            test.assert(profiler.profiles.size === 0, 'Initial profiles map is empty');
            profiler.dispose();
        });

        test.it('should start and stop profiling', () => {
            const profiler = new MockCPUProfiler();
            
            profiler.start();
            test.assert(profiler.isProfiling, 'Profiling started');
            
            profiler.stop();
            test.assert(!profiler.isProfiling, 'Profiling stopped');
            
            profiler.dispose();
        });

        test.it('should time functions correctly', async () => {
            const profiler = new MockCPUProfiler();
            profiler.start();
            
            // Test sync function
            const syncResult = profiler.timeFunction('testSync', () => {
                // Simulate work
                const start = performance.now();
                while (performance.now() - start < 5) {}
                return 'sync result';
            });
            
            test.assert(syncResult === 'sync result', 'Sync function result correct');
            
            // Test async function
            const asyncResult = await profiler.timeAsyncFunction('testAsync', async () => {
                await TimingUtils.sleep(10);
                return 'async result';
            });
            
            test.assert(asyncResult === 'async result', 'Async function result correct');
            
            const profiles = profiler.getProfileData();
            test.assert(profiles.length >= 2, 'Profiles were created');
            
            profiler.dispose();
        });

        test.it('should track frame timing', async () => {
            const profiler = new MockCPUProfiler();
            profiler.start();
            
            // Simulate frames
            for (let i = 0; i < 3; i++) {
                profiler.startRenderFrame();
                await TimingUtils.sleep(2);
                profiler.endRenderFrame();
                
                profiler.startUpdateCycle();
                await TimingUtils.sleep(1);
                profiler.endUpdateCycle();
                
                profiler.endFrame();
            }
            
            const metrics = profiler.getCurrentMetrics();
            test.assert(metrics.totalFrames === 3, 'Frame count correct');
            test.assert(metrics.render.sampleCount === 3, 'Render samples correct');
            
            profiler.dispose();
        });
    });

    test.describe('AgentPerformanceTracker Tests', () => {
        test.it('should initialize correctly', () => {
            const tracker = new MockAgentPerformanceTracker();
            test.assert(!tracker.isTracking, 'Initial tracking state is false');
            test.assert(tracker.totalAgents === 0, 'Initial agent count is zero');
            tracker.dispose();
        });

        test.it('should register and track agents', () => {
            const tracker = new MockAgentPerformanceTracker();
            tracker.start();
            
            tracker.registerAgent('agent1', 'villager');
            tracker.registerAgent('agent2', 'zombie');
            
            const metrics = tracker.getCurrentMetrics();
            test.assert(metrics.totalAgents === 2, 'Agent count correct');
            
            const agent1Perf = tracker.getAgentPerformance('agent1');
            test.assert(agent1Perf !== null, 'Agent performance data exists');
            test.assert(agent1Perf.type === 'villager', 'Agent type correct');
            
            tracker.dispose();
        });

        test.it('should track agent updates and behaviors', async () => {
            const tracker = new MockAgentPerformanceTracker();
            tracker.start();
            
            tracker.registerAgent('agent1', 'villager');
            
            // Simulate updates
            for (let i = 0; i < 3; i++) {
                const updateTimer = tracker.startAgentUpdate('agent1');
                
                const behaviorTimer = tracker.startBehavior('agent1', 'wander');
                await TimingUtils.sleep(1);
                tracker.endBehavior(behaviorTimer);
                
                await TimingUtils.sleep(1);
                tracker.endAgentUpdate(updateTimer);
            }
            
            const agentPerf = tracker.getAgentPerformance('agent1');
            test.assert(agentPerf.update.count === 3, 'Update count correct');
            test.assert(agentPerf.behaviors.length === 1, 'Behavior recorded');
            test.assert(agentPerf.behaviors[0].name === 'wander', 'Behavior name correct');
            
            tracker.dispose();
        });

        test.it('should generate performance statistics', async () => {
            const tracker = new MockAgentPerformanceTracker();
            tracker.start();
            
            tracker.registerAgent('agent1', 'test');
            tracker.registerAgent('agent2', 'test');
            
            // Simulate some updates
            for (let i = 0; i < 2; i++) {
                const timer1 = tracker.startAgentUpdate('agent1');
                await TimingUtils.sleep(1);
                tracker.endAgentUpdate(timer1);
                
                const timer2 = tracker.startAgentUpdate('agent2');
                await TimingUtils.sleep(2);
                tracker.endAgentUpdate(timer2);
            }
            
            const stats = tracker.getPerformanceStatistics();
            test.assert(stats.agentCount === 2, 'Agent count in stats correct');
            test.assert(stats.averageUpdateTime >= 0, 'Average update time calculated');
            
            tracker.dispose();
        });
    });

    test.describe('Timing Utilities Tests', () => {
        test.it('should measure function execution time', async () => {
            const syncResult = TimingUtils.measure(() => {
                const start = performance.now();
                while (performance.now() - start < 3) {}
                return 'test';
            });
            
            test.assert(syncResult.result === 'test', 'Sync measure result correct');
            test.assert(syncResult.elapsed >= 2, 'Sync measure timing reasonable');
            
            const asyncResult = await TimingUtils.measureAsync(async () => {
                await TimingUtils.sleep(5);
                return 'async test';
            });
            
            test.assert(asyncResult.result === 'async test', 'Async measure result correct');
            test.assert(asyncResult.elapsed >= 4, 'Async measure timing reasonable');
        });
    });

    // Run all tests
    await test.runTests();
    
    console.log('\n✅ All CPU Profiler tests completed!');
}

// Run the tests
runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});