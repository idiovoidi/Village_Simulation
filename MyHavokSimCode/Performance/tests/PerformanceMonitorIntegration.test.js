/**
 * Integration tests for PerformanceMonitor with data storage and threshold monitoring
 * Validates that all components work together correctly
 */

import { PerformanceMonitor } from '../PerformanceMonitor.js';

/**
 * Test suite for PerformanceMonitor integration
 */
export class PerformanceMonitorIntegrationTests {
    constructor() {
        this.testResults = [];
    }

    /**
     * Run all integration tests
     */
    async runAllTests() {
        console.log('Starting PerformanceMonitor Integration tests...');
        
        await this.testDataStorageIntegration();
        await this.testThresholdMonitoringIntegration();
        await this.testPerformanceReporting();
        await this.testAlertCallbacks();
        
        this.printTestResults();
        return this.testResults;
    }

    /**
     * Test data storage integration
     */
    async testDataStorageIntegration() {
        const testName = 'Data Storage Integration';
        
        try {
            // Create mock engine and scene
            const mockEngine = { 
                getGlInfo: () => ({ 
                    version: 'WebGL 2.0',
                    renderer: 'Test Renderer',
                    vendor: 'Test Vendor',
                    maxTextureSize: 4096,
                    maxVertexAttribs: 16
                }),
                drawCalls: 0
            };
            const mockScene = { 
                meshes: [1, 2, 3], 
                materials: [1], 
                textures: [1, 2], 
                lights: [1], 
                cameras: [1],
                getEngine: () => mockEngine
            };
            
            const monitor = new PerformanceMonitor(mockEngine, mockScene);
            
            // Start monitoring
            monitor.startMonitoring();
            
            // Wait a bit for some metrics to be collected
            await this.sleep(100);
            
            // Stop monitoring
            monitor.stopMonitoring();
            
            // Test historical data retrieval
            const endTime = Date.now();
            const startTime = endTime - 10000; // Last 10 seconds
            const historicalData = monitor.getHistoricalData(startTime, endTime);
            
            this.assert(Array.isArray(historicalData), 'Historical data is an array');
            
            // Test aggregated data
            const aggregatedData = monitor.getAggregatedData(startTime, endTime, '1s');
            this.assert(Array.isArray(aggregatedData), 'Aggregated data is an array');
            
            // Test statistics
            const stats = monitor.getPerformanceStatistics(startTime, endTime);
            this.assert(typeof stats === 'object', 'Statistics returned as object');
            
            // Test storage info
            const storageInfo = monitor.getStorageInfo();
            this.assert(typeof storageInfo.metricsCount === 'number', 'Storage info includes metrics count');
            
            monitor.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test threshold monitoring integration
     */
    async testThresholdMonitoringIntegration() {
        const testName = 'Threshold Monitoring Integration';
        
        try {
            const mockEngine = { 
                getGlInfo: () => ({ 
                    version: 'WebGL 2.0',
                    renderer: 'Test Renderer',
                    vendor: 'Test Vendor',
                    maxTextureSize: 4096,
                    maxVertexAttribs: 16
                }),
                drawCalls: 0
            };
            const mockScene = { 
                meshes: [], 
                materials: [], 
                textures: [], 
                lights: [], 
                cameras: [],
                getEngine: () => mockEngine
            };
            
            const monitor = new PerformanceMonitor(mockEngine, mockScene);
            
            // Set custom thresholds
            monitor.setThresholds('frameRate', {
                warning: { min: 50, max: Infinity },
                critical: { min: 20, max: Infinity }
            });
            
            // Get thresholds to verify they were set
            const thresholds = monitor.getThresholds('frameRate');
            this.assert(thresholds.warning.min === 50, 'Custom threshold set correctly');
            
            // Start monitoring
            monitor.startMonitoring();
            
            // Simulate low frame rate by directly calling collectMetrics with mock data
            const mockMetrics = {
                timestamp: Date.now(),
                frameRate: { current: 25 }, // Below warning threshold
                memory: { usagePercentage: 50 },
                cpu: { utilization: 30 },
                scene: { meshCount: 10 },
                system: { webglVersion: 'WebGL 2.0' }
            };
            
            // Manually store metrics and check thresholds
            monitor.dataStore.store(mockMetrics);
            const alerts = monitor.thresholdMonitor.checkMetrics(mockMetrics);
            
            this.assert(alerts.length > 0, 'Alert generated for low frame rate');
            this.assert(alerts[0].severity === 'warning', 'Correct alert severity');
            
            // Test alert history
            const alertHistory = monitor.getAlertHistory();
            this.assert(Array.isArray(alertHistory), 'Alert history is an array');
            
            // Test active alerts
            const activeAlerts = monitor.getActiveAlerts();
            this.assert(Array.isArray(activeAlerts), 'Active alerts is an array');
            
            // Test alert statistics
            const alertStats = monitor.getAlertStatistics();
            this.assert(typeof alertStats.totalAlerts === 'number', 'Alert statistics include total count');
            
            monitor.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test performance reporting
     */
    async testPerformanceReporting() {
        const testName = 'Performance Reporting';
        
        try {
            const mockEngine = { 
                getGlInfo: () => ({ 
                    version: 'WebGL 2.0',
                    renderer: 'Test Renderer',
                    vendor: 'Test Vendor',
                    maxTextureSize: 4096,
                    maxVertexAttribs: 16
                }),
                drawCalls: 0
            };
            const mockScene = { 
                meshes: [], 
                materials: [], 
                textures: [], 
                lights: [], 
                cameras: [],
                getEngine: () => mockEngine
            };
            
            const monitor = new PerformanceMonitor(mockEngine, mockScene);
            
            // Add some test data
            const testMetrics = [
                { timestamp: Date.now() - 3000, frameRate: { current: 60 }, memory: { usagePercentage: 45 } },
                { timestamp: Date.now() - 2000, frameRate: { current: 58 }, memory: { usagePercentage: 47 } },
                { timestamp: Date.now() - 1000, frameRate: { current: 62 }, memory: { usagePercentage: 46 } }
            ];
            
            testMetrics.forEach(metrics => {
                monitor.dataStore.store(metrics);
            });
            
            // Generate performance report
            const report = monitor.generatePerformanceReport(5000); // Last 5 seconds
            
            this.assert(typeof report === 'object', 'Report is an object');
            this.assert(report.timeRange !== undefined, 'Report includes time range');
            this.assert(report.performance !== undefined, 'Report includes performance data');
            this.assert(report.alerts !== undefined, 'Report includes alert data');
            this.assert(report.storage !== undefined, 'Report includes storage info');
            this.assert(report.summary !== undefined, 'Report includes summary');
            
            // Test summary content
            this.assert(typeof report.summary.overallHealth === 'string', 'Summary includes health assessment');
            this.assert(typeof report.summary.keyMetrics === 'object', 'Summary includes key metrics');
            this.assert(Array.isArray(report.summary.issues), 'Summary includes issues array');
            this.assert(Array.isArray(report.summary.recommendations), 'Summary includes recommendations array');
            
            monitor.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test alert callbacks
     */
    async testAlertCallbacks() {
        const testName = 'Alert Callbacks';
        
        try {
            const mockEngine = { 
                getGlInfo: () => ({ 
                    version: 'WebGL 2.0',
                    renderer: 'Test Renderer',
                    vendor: 'Test Vendor',
                    maxTextureSize: 4096,
                    maxVertexAttribs: 16
                }),
                drawCalls: 0
            };
            const mockScene = { 
                meshes: [], 
                materials: [], 
                textures: [], 
                lights: [], 
                cameras: [],
                getEngine: () => mockEngine
            };
            
            const monitor = new PerformanceMonitor(mockEngine, mockScene);
            
            let alertReceived = false;
            let receivedAlert = null;
            
            // Register alert callback
            const callbackId = monitor.onAlert((alert) => {
                alertReceived = true;
                receivedAlert = alert;
            }, { severities: ['warning', 'critical'] });
            
            this.assert(typeof callbackId === 'string', 'Callback ID returned');
            
            // Set low threshold to trigger alert
            monitor.setThresholds('frameRate', {
                warning: { min: 50, max: Infinity }
            });
            
            // Start monitoring to trigger the normal flow
            monitor.startMonitoring();
            
            // Mock the frame rate tracker to return low FPS
            monitor.frameRateTracker.getCurrentMetrics = () => ({ current: 30, average: 30, min: 30, max: 30 });
            
            // Trigger metrics collection manually
            const metrics = monitor.collectMetrics();
            
            // Wait a bit for callbacks to be processed
            await this.sleep(50);
            
            monitor.stopMonitoring();
            
            this.assert(alertReceived, 'Alert callback was triggered');
            this.assert(receivedAlert !== null, 'Alert data received');
            this.assert(receivedAlert.severity === 'warning', 'Correct alert severity received');
            
            // Test callback removal
            const removed = monitor.removeAlertCallback(callbackId);
            this.assert(removed, 'Callback removed successfully');
            
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
     * Sleep utility for async testing
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
        
        console.log('\n=== PerformanceMonitor Integration Test Results ===');
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
export async function runPerformanceMonitorIntegrationTests() {
    const testSuite = new PerformanceMonitorIntegrationTests();
    return await testSuite.runAllTests();
}