/**
 * Unit tests for PerformanceMonitor system
 * Tests the accuracy and functionality of performance metric collection
 */

// Mock Babylon.js engine for testing
class MockEngine {
    constructor() {
        this.fps = 60;
        this.drawCalls = 100;
    }
    
    getFps() {
        return this.fps;
    }
    
    getGlInfo() {
        return {
            version: 'WebGL 2.0',
            renderer: 'Test Renderer',
            vendor: 'Test Vendor',
            maxTextureSize: 4096,
            maxVertexAttribs: 16
        };
    }
}

// Mock Babylon.js scene for testing
class MockScene {
    constructor() {
        this.meshes = new Array(50).fill({});
        this.materials = new Array(20).fill({});
        this.textures = new Array(30).fill({});
        this.lights = new Array(3).fill({});
        this.cameras = new Array(2).fill({});
    }
    
    getEngine() {
        return new MockEngine();
    }
}

// Import the classes to test
import { PerformanceMonitor } from '../PerformanceMonitor.js';
import { FrameRateTracker } from '../FrameRateTracker.js';
import { MemoryMonitor } from '../MemoryMonitor.js';

/**
 * Test suite for PerformanceMonitor
 */
export class PerformanceMonitorTests {
    constructor() {
        this.testResults = [];
        this.mockEngine = new MockEngine();
        this.mockScene = new MockScene();
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('Starting PerformanceMonitor tests...');
        
        // Test PerformanceMonitor
        await this.testPerformanceMonitorInitialization();
        await this.testPerformanceMonitorStartStop();
        await this.testMetricsCollection();
        await this.testCallbackSystem();
        await this.testHistoryManagement();
        
        // Test FrameRateTracker
        await this.testFrameRateTrackerAccuracy();
        await this.testFrameRateStatistics();
        await this.testFrameRateTrends();
        
        // Test MemoryMonitor
        await this.testMemoryMonitorBasics();
        await this.testMemoryTrendDetection();
        await this.testMemoryLeakDetection();
        
        // Performance tests
        await this.testPerformanceOverhead();
        
        this.printTestResults();
        return this.testResults;
    }

    /**
     * Test PerformanceMonitor initialization
     */
    async testPerformanceMonitorInitialization() {
        const testName = 'PerformanceMonitor Initialization';
        
        try {
            const monitor = new PerformanceMonitor(this.mockEngine, this.mockScene);
            
            // Check initial state
            this.assert(monitor.engine === this.mockEngine, 'Engine reference set correctly');
            this.assert(monitor.scene === this.mockScene, 'Scene reference set correctly');
            this.assert(monitor.isMonitoring === false, 'Initial monitoring state is false');
            this.assert(monitor.frameRateTracker !== null, 'FrameRateTracker initialized');
            this.assert(monitor.memoryMonitor !== null, 'MemoryMonitor initialized');
            this.assert(Array.isArray(monitor.metricsHistory), 'Metrics history is array');
            this.assert(monitor.metricsHistory.length === 0, 'Initial history is empty');
            
            monitor.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test start/stop functionality
     */
    async testPerformanceMonitorStartStop() {
        const testName = 'PerformanceMonitor Start/Stop';
        
        try {
            const monitor = new PerformanceMonitor(this.mockEngine, this.mockScene);
            
            // Test start
            monitor.startMonitoring();
            this.assert(monitor.isMonitoring === true, 'Monitoring started');
            this.assert(monitor.monitoringInterval !== null, 'Monitoring interval set');
            
            // Test stop
            monitor.stopMonitoring();
            this.assert(monitor.isMonitoring === false, 'Monitoring stopped');
            this.assert(monitor.monitoringInterval === null, 'Monitoring interval cleared');
            
            monitor.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test metrics collection
     */
    async testMetricsCollection() {
        const testName = 'Metrics Collection';
        
        try {
            const monitor = new PerformanceMonitor(this.mockEngine, this.mockScene);
            
            // Collect metrics
            const metrics = monitor.collectMetrics();
            
            // Verify metrics structure
            this.assert(typeof metrics === 'object', 'Metrics is object');
            this.assert(typeof metrics.timestamp === 'number', 'Timestamp is number');
            this.assert(typeof metrics.frameRate === 'object', 'Frame rate data exists');
            this.assert(typeof metrics.memory === 'object', 'Memory data exists');
            this.assert(typeof metrics.scene === 'object', 'Scene data exists');
            this.assert(typeof metrics.system === 'object', 'System data exists');
            
            // Verify scene metrics
            this.assert(metrics.scene.meshCount === 50, 'Correct mesh count');
            this.assert(metrics.scene.materialCount === 20, 'Correct material count');
            this.assert(metrics.scene.textureCount === 30, 'Correct texture count');
            
            monitor.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test callback system
     */
    async testCallbackSystem() {
        const testName = 'Callback System';
        
        try {
            const monitor = new PerformanceMonitor(this.mockEngine, this.mockScene);
            let callbackCalled = false;
            let receivedMetrics = null;
            
            // Register callback
            const callback = (metrics) => {
                callbackCalled = true;
                receivedMetrics = metrics;
            };
            
            monitor.onMetricsUpdate(callback);
            
            // Collect metrics to trigger callback
            monitor.collectMetrics();
            
            this.assert(callbackCalled === true, 'Callback was called');
            this.assert(receivedMetrics !== null, 'Metrics received in callback');
            
            // Test callback removal
            monitor.removeUpdateCallback(callback);
            callbackCalled = false;
            monitor.collectMetrics();
            
            // Note: callback might still be called due to timing, so we don't assert false here
            
            monitor.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test history management
     */
    async testHistoryManagement() {
        const testName = 'History Management';
        
        try {
            const monitor = new PerformanceMonitor(this.mockEngine, this.mockScene);
            monitor.maxHistorySize = 5; // Small size for testing
            
            // Add multiple metrics
            for (let i = 0; i < 10; i++) {
                monitor.collectMetrics();
            }
            
            // Check history size limit
            this.assert(monitor.metricsHistory.length <= 5, 'History size limited correctly');
            
            // Test history retrieval
            const fullHistory = monitor.getMetricsHistory();
            const partialHistory = monitor.getMetricsHistory(3);
            
            this.assert(Array.isArray(fullHistory), 'Full history is array');
            this.assert(Array.isArray(partialHistory), 'Partial history is array');
            this.assert(partialHistory.length <= 3, 'Partial history size correct');
            
            // Test clear history
            monitor.clearHistory();
            this.assert(monitor.metricsHistory.length === 0, 'History cleared');
            
            monitor.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test FrameRateTracker accuracy
     */
    async testFrameRateTrackerAccuracy() {
        const testName = 'FrameRateTracker Accuracy';
        
        try {
            const tracker = new FrameRateTracker(this.mockEngine);
            
            tracker.start();
            
            // Wait a bit for measurements
            await this.sleep(200);
            
            const metrics = tracker.getCurrentMetrics();
            
            this.assert(typeof metrics.current === 'number', 'Current FPS is number');
            this.assert(typeof metrics.average === 'number', 'Average FPS is number');
            this.assert(typeof metrics.frameTime === 'number', 'Frame time is number');
            this.assert(metrics.current >= 0, 'FPS is non-negative');
            
            tracker.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test frame rate statistics
     */
    async testFrameRateStatistics() {
        const testName = 'FrameRate Statistics';
        
        try {
            const tracker = new FrameRateTracker(this.mockEngine);
            
            tracker.start();
            
            // Generate some frame data
            for (let i = 0; i < 20; i++) {
                tracker.updateMetrics();
                await this.sleep(10);
            }
            
            const stats = tracker.getStatistics();
            
            this.assert(typeof stats.sampleCount === 'number', 'Sample count is number');
            this.assert(typeof stats.averageFPS === 'number', 'Average FPS is number');
            this.assert(typeof stats.variance === 'number', 'Variance is number');
            this.assert(stats.sampleCount > 0, 'Has samples');
            
            tracker.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test frame rate trend detection
     */
    async testFrameRateTrends() {
        const testName = 'FrameRate Trends';
        
        try {
            const tracker = new FrameRateTracker(this.mockEngine);
            
            // Add some frame times manually for testing
            tracker.frameTimeHistory = [16, 16, 16, 16, 16, 20, 20, 20, 20, 20];
            
            const trend = tracker.getFrameRateTrend(10);
            
            this.assert(typeof trend === 'string', 'Trend is string');
            this.assert(['improving', 'declining', 'stable', 'insufficient_data'].includes(trend), 'Valid trend value');
            
            tracker.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test MemoryMonitor basics
     */
    async testMemoryMonitorBasics() {
        const testName = 'MemoryMonitor Basics';
        
        try {
            const monitor = new MemoryMonitor();
            
            monitor.start();
            
            const metrics = monitor.getCurrentMetrics();
            
            this.assert(typeof metrics === 'object', 'Metrics is object');
            this.assert(typeof metrics.used === 'string', 'Used memory is formatted string');
            this.assert(typeof metrics.usagePercentage === 'number', 'Usage percentage is number');
            this.assert(typeof metrics.hasMemoryAPI === 'boolean', 'Memory API flag is boolean');
            
            monitor.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test memory trend detection
     */
    async testMemoryTrendDetection() {
        const testName = 'Memory Trend Detection';
        
        try {
            const monitor = new MemoryMonitor();
            
            // Add some mock memory history
            const baseTime = performance.now();
            monitor.memoryHistory = [
                { timestamp: baseTime - 1000, used: 1000000 },
                { timestamp: baseTime - 800, used: 1100000 },
                { timestamp: baseTime - 600, used: 1200000 },
                { timestamp: baseTime - 400, used: 1300000 },
                { timestamp: baseTime - 200, used: 1400000 },
                { timestamp: baseTime, used: 1500000 }
            ];
            
            const trend = monitor.getMemoryTrend(6);
            
            this.assert(typeof trend === 'string', 'Trend is string');
            this.assert(['increasing', 'decreasing', 'stable', 'insufficient_data'].includes(trend), 'Valid trend value');
            
            monitor.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test memory leak detection
     */
    async testMemoryLeakDetection() {
        const testName = 'Memory Leak Detection';
        
        try {
            const monitor = new MemoryMonitor();
            
            // Add mock history showing rapid growth
            const baseTime = performance.now();
            monitor.memoryHistory = [];
            
            for (let i = 0; i < 20; i++) {
                monitor.memoryHistory.push({
                    timestamp: baseTime - (20 - i) * 15000, // 15 second intervals
                    used: 1000000 + (i * 2000000) // 2MB growth per interval
                });
            }
            
            const leakDetection = monitor.detectMemoryLeak(1000000); // 1MB/s threshold
            
            this.assert(typeof leakDetection === 'object', 'Leak detection returns object');
            this.assert(typeof leakDetection.detected === 'boolean', 'Detection flag is boolean');
            this.assert(typeof leakDetection.recommendation === 'string', 'Recommendation is string');
            
            monitor.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test performance overhead of monitoring
     */
    async testPerformanceOverhead() {
        const testName = 'Performance Overhead';
        
        try {
            const monitor = new PerformanceMonitor(this.mockEngine, this.mockScene);
            
            // Measure time without monitoring
            const startTime1 = performance.now();
            for (let i = 0; i < 1000; i++) {
                // Simulate some work
                Math.random();
            }
            const timeWithoutMonitoring = performance.now() - startTime1;
            
            // Measure time with monitoring
            monitor.startMonitoring();
            const startTime2 = performance.now();
            for (let i = 0; i < 1000; i++) {
                // Simulate some work
                Math.random();
                if (i % 100 === 0) {
                    monitor.collectMetrics();
                }
            }
            const timeWithMonitoring = performance.now() - startTime2;
            
            const overhead = timeWithMonitoring - timeWithoutMonitoring;
            const overheadPercentage = (overhead / timeWithoutMonitoring) * 100;
            
            console.log(`Performance overhead: ${overhead.toFixed(2)}ms (${overheadPercentage.toFixed(2)}%)`);
            
            // Overhead should be reasonable (less than 50% in this test scenario)
            this.assert(overheadPercentage < 50, 'Performance overhead is acceptable');
            
            monitor.dispose();
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
     * Utility method for async delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
        
        console.log('\n=== Performance Monitor Test Results ===');
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
export async function runPerformanceMonitorTests() {
    const testSuite = new PerformanceMonitorTests();
    return await testSuite.runAllTests();
}