/**
 * Performance tests for CPUProfiler and AgentPerformanceTracker
 * Validates profiler accuracy and functionality
 */

import { CPUProfiler } from '../CPUProfiler.js';
import { AgentPerformanceTracker } from '../AgentPerformanceTracker.js';
import { PrecisionTimer, PerformanceBenchmark, TimingUtils } from '../TimingUtilities.js';

/**
 * Test suite for CPU profiling components
 */
export class CPUProfilerTests {
    constructor() {
        this.testResults = [];
    }

    /**
     * Run all CPU profiler tests
     */
    async runAllTests() {
        console.log('Starting CPU Profiler tests...');
        
        // CPUProfiler tests
        await this.testCPUProfilerBasics();
        await this.testFunctionTiming();
        await this.testFrameTiming();
        await this.testProfileAccuracy();
        await this.testPerformanceOverhead();
        
        // AgentPerformanceTracker tests
        await this.testAgentTrackerBasics();
        await this.testAgentRegistration();
        await this.testBehaviorTracking();
        await this.testThresholdAlerts();
        await this.testPerformanceStatistics();
        
        // Timing utilities tests
        await this.testTimingUtilities();
        await this.testPrecisionTimer();
        await this.testPerformanceBenchmark();
        
        this.printTestResults();
        return this.testResults;
    }

    /**
     * Test CPUProfiler basic functionality
     */
    async testCPUProfilerBasics() {
        const testName = 'CPUProfiler Basics';
        
        try {
            const profiler = new CPUProfiler();
            
            // Test initial state
            this.assert(!profiler.isProfiling, 'Initial profiling state is false');
            this.assert(profiler.profiles.size === 0, 'Initial profiles map is empty');
            
            // Test start/stop
            profiler.start();
            this.assert(profiler.isProfiling, 'Profiling started');
            
            profiler.stop();
            this.assert(!profiler.isProfiling, 'Profiling stopped');
            
            // Test metrics
            const metrics = profiler.getCurrentMetrics();
            this.assert(typeof metrics === 'object', 'Metrics is object');
            this.assert(typeof metrics.isProfiling === 'boolean', 'Has profiling state');
            this.assert(typeof metrics.totalFrames === 'number', 'Has frame count');
            
            profiler.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test function timing accuracy
     */
    async testFunctionTiming() {
        const testName = 'Function Timing Accuracy';
        
        try {
            const profiler = new CPUProfiler();
            profiler.start();
            
            // Test synchronous function timing
            const syncResult = profiler.timeFunction('testSync', () => {
                // Simulate work
                const start = performance.now();
                while (performance.now() - start < 10) {
                    // Busy wait for ~10ms
                }
                return 'sync result';
            });
            
            this.assert(syncResult === 'sync result', 'Sync function result correct');
            
            // Test async function timing
            const asyncResult = await profiler.timeAsyncFunction('testAsync', async () => {
                await TimingUtils.sleep(20);
                return 'async result';
            });
            
            this.assert(asyncResult === 'async result', 'Async function result correct');
            
            // Check profiles were created
            const profiles = profiler.getProfileData();
            this.assert(profiles.length >= 2, 'Profiles were created');
            
            const syncProfile = profiler.getFunctionProfile('testSync');
            const asyncProfile = profiler.getFunctionProfile('testAsync');
            
            this.assert(syncProfile !== null, 'Sync profile exists');
            this.assert(asyncProfile !== null, 'Async profile exists');
            this.assert(syncProfile.callCount === 1, 'Sync call count correct');
            this.assert(asyncProfile.callCount === 1, 'Async call count correct');
            
            // Timing should be approximately correct (within reasonable margin)
            this.assert(syncProfile.averageTime >= 8 && syncProfile.averageTime <= 15, 
                       `Sync timing reasonable: ${syncProfile.averageTime}ms`);
            this.assert(asyncProfile.averageTime >= 18 && asyncProfile.averageTime <= 25, 
                       `Async timing reasonable: ${asyncProfile.averageTime}ms`);
            
            profiler.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test frame timing functionality
     */
    async testFrameTiming() {
        const testName = 'Frame Timing';
        
        try {
            const profiler = new CPUProfiler();
            profiler.start();
            
            // Simulate render frames
            for (let i = 0; i < 5; i++) {
                profiler.startRenderFrame();
                await TimingUtils.sleep(5); // Simulate render work
                profiler.endRenderFrame();
                
                profiler.startUpdateCycle();
                await TimingUtils.sleep(3); // Simulate update work
                profiler.endUpdateCycle();
                
                profiler.endFrame();
            }
            
            const metrics = profiler.getCurrentMetrics();
            
            this.assert(metrics.totalFrames === 5, 'Frame count correct');
            this.assert(metrics.render.sampleCount === 5, 'Render sample count correct');
            this.assert(metrics.update.sampleCount === 5, 'Update sample count correct');
            this.assert(metrics.render.averageTime > 0, 'Render time recorded');
            this.assert(metrics.update.averageTime > 0, 'Update time recorded');
            
            profiler.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test profile accuracy with known workloads
     */
    async testProfileAccuracy() {
        const testName = 'Profile Accuracy';
        
        try {
            const profiler = new CPUProfiler();
            profiler.start();
            
            // Test multiple calls to same function
            for (let i = 0; i < 10; i++) {
                profiler.timeFunction('repeatedFunction', () => {
                    const start = performance.now();
                    while (performance.now() - start < 2) {
                        // Busy wait for ~2ms
                    }
                });
            }
            
            const profile = profiler.getFunctionProfile('repeatedFunction');
            
            this.assert(profile.callCount === 10, 'Call count accurate');
            this.assert(profile.averageTime >= 1.5 && profile.averageTime <= 3, 
                       `Average time reasonable: ${profile.averageTime}ms`);
            this.assert(profile.minTime <= profile.averageTime, 'Min time <= average');
            this.assert(profile.maxTime >= profile.averageTime, 'Max time >= average');
            this.assert(profile.totalTime >= profile.averageTime * 9, 'Total time reasonable');
            
            profiler.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test performance overhead of profiling
     */
    async testPerformanceOverhead() {
        const testName = 'Performance Overhead';
        
        try {
            const iterations = 1000;
            
            // Measure without profiling
            const timer1 = new PrecisionTimer().start();
            for (let i = 0; i < iterations; i++) {
                Math.random(); // Simple operation
            }
            const timeWithoutProfiling = timer1.stop();
            
            // Measure with profiling
            const profiler = new CPUProfiler();
            profiler.start();
            
            const timer2 = new PrecisionTimer().start();
            for (let i = 0; i < iterations; i++) {
                profiler.timeFunction('mathRandom', () => Math.random());
            }
            const timeWithProfiling = timer2.stop();
            
            const overhead = timeWithProfiling - timeWithoutProfiling;
            const overheadPercentage = (overhead / timeWithoutProfiling) * 100;
            
            console.log(`Profiling overhead: ${overhead.toFixed(2)}ms (${overheadPercentage.toFixed(1)}%)`);
            
            // Overhead should be reasonable (less than 200% for this test)
            this.assert(overheadPercentage < 200, `Overhead acceptable: ${overheadPercentage.toFixed(1)}%`);
            
            profiler.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test AgentPerformanceTracker basics
     */
    async testAgentTrackerBasics() {
        const testName = 'AgentPerformanceTracker Basics';
        
        try {
            const tracker = new AgentPerformanceTracker();
            
            // Test initial state
            this.assert(!tracker.isTracking, 'Initial tracking state is false');
            this.assert(tracker.totalAgents === 0, 'Initial agent count is zero');
            
            // Test start/stop
            tracker.start();
            this.assert(tracker.isTracking, 'Tracking started');
            
            tracker.stop();
            this.assert(!tracker.isTracking, 'Tracking stopped');
            
            // Test metrics
            const metrics = tracker.getCurrentMetrics();
            this.assert(typeof metrics === 'object', 'Metrics is object');
            this.assert(typeof metrics.totalAgents === 'number', 'Has agent count');
            
            tracker.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test agent registration and tracking
     */
    async testAgentRegistration() {
        const testName = 'Agent Registration';
        
        try {
            const tracker = new AgentPerformanceTracker();
            tracker.start();
            
            // Register agents
            tracker.registerAgent('agent1', 'villager', { x: 0, y: 0, z: 0 });
            tracker.registerAgent('agent2', 'zombie', { x: 10, y: 0, z: 10 });
            
            const metrics = tracker.getCurrentMetrics();
            this.assert(metrics.totalAgents === 2, 'Agent count correct');
            
            // Test agent performance data
            const agent1Perf = tracker.getAgentPerformance('agent1');
            this.assert(agent1Perf !== null, 'Agent1 performance data exists');
            this.assert(agent1Perf.type === 'villager', 'Agent1 type correct');
            this.assert(agent1Perf.isActive === true, 'Agent1 is active');
            
            // Test unregistration
            tracker.unregisterAgent('agent1');
            const agent1PerfAfter = tracker.getAgentPerformance('agent1');
            this.assert(agent1PerfAfter.isActive === false, 'Agent1 marked inactive');
            
            tracker.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test behavior tracking
     */
    async testBehaviorTracking() {
        const testName = 'Behavior Tracking';
        
        try {
            const tracker = new AgentPerformanceTracker();
            tracker.start();
            
            tracker.registerAgent('agent1', 'villager');
            
            // Simulate agent updates and behaviors
            for (let i = 0; i < 5; i++) {
                const updateTimer = tracker.startAgentUpdate('agent1');
                
                // Simulate behavior execution
                const behaviorTimer = tracker.startBehavior('agent1', 'wander');
                await TimingUtils.sleep(2); // Simulate behavior work
                tracker.endBehavior(behaviorTimer);
                
                await TimingUtils.sleep(1); // Additional update work
                tracker.endAgentUpdate(updateTimer);
            }
            
            const agentPerf = tracker.getAgentPerformance('agent1');
            
            this.assert(agentPerf.update.count === 5, 'Update count correct');
            this.assert(agentPerf.update.averageTime > 0, 'Average update time recorded');
            this.assert(agentPerf.behaviors.length === 1, 'Behavior recorded');
            this.assert(agentPerf.behaviors[0].name === 'wander', 'Behavior name correct');
            this.assert(agentPerf.behaviors[0].callCount === 5, 'Behavior call count correct');
            
            // Test behavior performance summary
            const behaviorPerf = tracker.getBehaviorPerformance();
            this.assert(behaviorPerf.length === 1, 'Global behavior count correct');
            this.assert(behaviorPerf[0].name === 'wander', 'Global behavior name correct');
            
            tracker.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test threshold alerts
     */
    async testThresholdAlerts() {
        const testName = 'Threshold Alerts';
        
        try {
            const tracker = new AgentPerformanceTracker();
            tracker.setThresholds({ update: 1.0, behavior: 0.5 }); // Low thresholds for testing
            tracker.start();
            
            tracker.registerAgent('slowAgent', 'villager');
            
            // Simulate slow operations that should trigger alerts
            for (let i = 0; i < 3; i++) {
                const updateTimer = tracker.startAgentUpdate('slowAgent');
                await TimingUtils.sleep(5); // Slow update (> 1ms threshold)
                tracker.endAgentUpdate(updateTimer);
                
                const behaviorTimer = tracker.startBehavior('slowAgent', 'slowBehavior');
                await TimingUtils.sleep(3); // Slow behavior (> 0.5ms threshold)
                tracker.endBehavior(behaviorTimer);
            }
            
            const alerts = tracker.getRecentAlerts();
            this.assert(alerts.length > 0, 'Alerts were generated');
            
            const agentPerf = tracker.getAgentPerformance('slowAgent');
            this.assert(agentPerf.alertCount > 0, 'Agent has alerts');
            
            const bottlenecks = tracker.getBottleneckAgents();
            this.assert(bottlenecks.length > 0, 'Bottleneck detected');
            
            tracker.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test performance statistics
     */
    async testPerformanceStatistics() {
        const testName = 'Performance Statistics';
        
        try {
            const tracker = new AgentPerformanceTracker();
            tracker.start();
            
            // Register multiple agents with different performance characteristics
            const agents = ['fast1', 'fast2', 'medium1', 'slow1'];
            const delays = [1, 1, 3, 8]; // Different update times
            
            for (let i = 0; i < agents.length; i++) {
                tracker.registerAgent(agents[i], 'test');
                
                // Simulate updates
                for (let j = 0; j < 5; j++) {
                    const timer = tracker.startAgentUpdate(agents[i]);
                    await TimingUtils.sleep(delays[i]);
                    tracker.endAgentUpdate(timer);
                }
            }
            
            const stats = tracker.getPerformanceStatistics();
            
            this.assert(stats.agentCount === 4, 'Agent count in stats correct');
            this.assert(stats.averageUpdateTime > 0, 'Average update time calculated');
            this.assert(stats.medianUpdateTime > 0, 'Median update time calculated');
            this.assert(stats.p95UpdateTime >= stats.medianUpdateTime, 'P95 >= median');
            this.assert(typeof stats.bottleneckPercentage === 'number', 'Bottleneck percentage calculated');
            
            const report = tracker.generateReport();
            this.assert(typeof report === 'object', 'Report generated');
            this.assert(Array.isArray(report.recommendations), 'Recommendations provided');
            
            tracker.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test timing utilities
     */
    async testTimingUtilities() {
        const testName = 'Timing Utilities';
        
        try {
            // Test measure function
            const syncResult = TimingUtils.measure(() => {
                const start = performance.now();
                while (performance.now() - start < 5) {
                    // Busy wait
                }
                return 'test result';
            });
            
            this.assert(syncResult.result === 'test result', 'Sync measure result correct');
            this.assert(syncResult.elapsed >= 4 && syncResult.elapsed <= 8, 
                       `Sync measure timing reasonable: ${syncResult.elapsed}ms`);
            
            // Test async measure function
            const asyncResult = await TimingUtils.measureAsync(async () => {
                await TimingUtils.sleep(10);
                return 'async result';
            });
            
            this.assert(asyncResult.result === 'async result', 'Async measure result correct');
            this.assert(asyncResult.elapsed >= 8 && asyncResult.elapsed <= 15, 
                       `Async measure timing reasonable: ${asyncResult.elapsed}ms`);
            
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test PrecisionTimer
     */
    async testPrecisionTimer() {
        const testName = 'PrecisionTimer';
        
        try {
            const timer = new PrecisionTimer();
            
            // Test basic timing
            timer.start();
            this.assert(timer.isRunning, 'Timer is running');
            
            await TimingUtils.sleep(10);
            const elapsed = timer.stop();
            
            this.assert(!timer.isRunning, 'Timer stopped');
            this.assert(elapsed >= 8 && elapsed <= 15, `Timer accuracy: ${elapsed}ms`);
            
            // Test restart
            timer.restart();
            this.assert(timer.isRunning, 'Timer restarted');
            
            await TimingUtils.sleep(5);
            const elapsed2 = timer.getElapsed();
            this.assert(elapsed2 >= 3 && elapsed2 <= 8, `Elapsed time reasonable: ${elapsed2}ms`);
            
            timer.stop();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test PerformanceBenchmark
     */
    async testPerformanceBenchmark() {
        const testName = 'PerformanceBenchmark';
        
        try {
            const benchmark = new PerformanceBenchmark('Math.random test');
            
            const results = await benchmark.run(() => {
                return Math.random();
            }, 50); // 50 iterations
            
            this.assert(results.name === 'Math.random test', 'Benchmark name correct');
            this.assert(results.iterations === 50, 'Iteration count correct');
            this.assert(results.averageTime > 0, 'Average time calculated');
            this.assert(results.minTime <= results.averageTime, 'Min <= average');
            this.assert(results.maxTime >= results.averageTime, 'Max >= average');
            this.assert(results.operationsPerSecond > 0, 'Ops/sec calculated');
            
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Utility method for assertions
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    /**
     * Record test result
     */
    recordTestResult(testName, passed, error = null) {
        this.testResults.push({
            name: testName,
            passed,
            error,
            timestamp: new Date().toISOString()
        });
        
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status}: ${testName}${error ? ` - ${error}` : ''}`);
    }

    /**
     * Print test summary
     */
    printTestResults() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log('\n=== CPU Profiler Test Results ===');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\nFailed Tests:');
            this.testResults.filter(r => !r.passed).forEach(test => {
                console.log(`- ${test.name}: ${test.error}`);
            });
        }
    }
}

// Export test runner function
export async function runCPUProfilerTests() {
    const testSuite = new CPUProfilerTests();
    return await testSuite.runAllTests();
}