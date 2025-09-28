/**
 * Tests for performance data storage and management components
 * Validates data storage, retrieval, aggregation, and threshold monitoring
 */

import { PerformanceDataStore } from '../PerformanceDataStore.js';
import { DataAggregationUtils } from '../DataAggregationUtils.js';
import { ThresholdMonitor } from '../ThresholdMonitor.js';

/**
 * Test suite for data storage and management
 */
export class DataStorageTests {
    constructor() {
        this.testResults = [];
    }

    /**
     * Run all data storage tests
     */
    async runAllTests() {
        console.log('Starting Data Storage tests...');
        
        // PerformanceDataStore tests
        await this.testDataStoreBasics();
        await this.testDataStoreRetrieval();
        await this.testDataStoreAggregation();
        await this.testDataStoreStatistics();
        await this.testDataStoreMaintenance();
        
        // DataAggregationUtils tests
        await this.testAggregationUtils();
        await this.testAnomalyDetection();
        await this.testCorrelationAnalysis();
        await this.testSummaryReports();
        
        // ThresholdMonitor tests
        await this.testThresholdMonitorBasics();
        await this.testThresholdAlerts();
        await this.testAlertCallbacks();
        await this.testAlertStatistics();
        
        this.printTestResults();
        return this.testResults;
    }

    /**
     * Test PerformanceDataStore basic functionality
     */
    async testDataStoreBasics() {
        const testName = 'PerformanceDataStore Basics';
        
        try {
            const dataStore = new PerformanceDataStore({
                maxStorageSize: 100,
                storageKey: 'test_performance'
            });
            
            // Test initial state
            this.assert(dataStore.metrics.length === 0, 'Initial metrics array is empty');
            
            // Test storing metrics
            const testMetrics = {
                timestamp: performance.now(),
                frameRate: { current: 60 },
                memory: { usagePercentage: 45 },
                scene: { meshCount: 100 }
            };
            
            dataStore.store(testMetrics);
            this.assert(dataStore.metrics.length === 1, 'Metrics stored successfully');
            
            // Test batch storage
            const batchMetrics = [
                { timestamp: performance.now() + 1000, frameRate: { current: 58 } },
                { timestamp: performance.now() + 2000, frameRate: { current: 62 } }
            ];
            
            dataStore.storeBatch(batchMetrics);
            this.assert(dataStore.metrics.length === 3, 'Batch metrics stored successfully');
            
            // Test latest retrieval
            const latest = dataStore.getLatest();
            this.assert(latest !== null, 'Latest metrics retrieved');
            this.assert(latest.frameRate.current === 62, 'Latest metrics correct');
            
            dataStore.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test data retrieval with filters
     */
    async testDataStoreRetrieval() {
        const testName = 'DataStore Retrieval';
        
        try {
            const dataStore = new PerformanceDataStore();
            
            // Store test data with different timestamps
            const baseTime = performance.now();
            const testData = [
                { timestamp: baseTime, frameRate: { current: 60 } },
                { timestamp: baseTime + 1000, frameRate: { current: 58 } },
                { timestamp: baseTime + 2000, frameRate: { current: 62 } },
                { timestamp: baseTime + 3000, frameRate: { current: 55 } },
                { timestamp: baseTime + 4000, frameRate: { current: 61 } }
            ];
            
            testData.forEach(data => dataStore.store(data));
            
            // Test time range retrieval
            const rangeData = dataStore.getMetrics(baseTime + 1000, baseTime + 3000);
            this.assert(rangeData.length === 3, 'Time range retrieval correct');
            
            // Test limit and offset
            const limitedData = dataStore.getMetrics(baseTime, baseTime + 5000, { limit: 2, offset: 1 });
            this.assert(limitedData.length === 2, 'Limit applied correctly');
            
            // Test field filtering
            const filteredData = dataStore.getMetrics(baseTime, baseTime + 5000, { 
                fields: ['timestamp', 'frameRate'] 
            });
            this.assert(filteredData[0].frameRate !== undefined, 'Field filtering includes specified fields');
            this.assert(filteredData[0].memory === undefined, 'Field filtering excludes unspecified fields');
            
            dataStore.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test data aggregation
     */
    async testDataStoreAggregation() {
        const testName = 'DataStore Aggregation';
        
        try {
            const dataStore = new PerformanceDataStore();
            
            // Store test data
            const baseTime = performance.now();
            for (let i = 0; i < 10; i++) {
                dataStore.store({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: 55 + (i % 5) },
                    memory: { usagePercentage: 40 + (i % 3) * 5 }
                });
            }
            
            // Test aggregated metrics
            const aggregated = dataStore.getAggregatedMetrics(baseTime, baseTime + 10000, '2s');
            this.assert(aggregated.length > 0, 'Aggregated data generated');
            this.assert(aggregated[0].frameRate !== undefined, 'Frame rate aggregated');
            this.assert(aggregated[0].memory !== undefined, 'Memory aggregated');
            
            dataStore.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test statistics calculation
     */
    async testDataStoreStatistics() {
        const testName = 'DataStore Statistics';
        
        try {
            const dataStore = new PerformanceDataStore();
            
            // Store test data with known values
            const baseTime = performance.now();
            const frameRates = [60, 58, 62, 55, 61, 59, 63, 57, 60, 58];
            
            frameRates.forEach((fps, i) => {
                dataStore.store({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: fps },
                    memory: { usagePercentage: 50 }
                });
            });
            
            // Test statistics
            const stats = dataStore.getStatistics(baseTime, baseTime + 10000);
            
            this.assert(stats.count === 10, 'Correct sample count');
            this.assert(stats.frameRate !== null, 'Frame rate statistics calculated');
            this.assert(typeof stats.frameRate.mean === 'number', 'Mean calculated');
            this.assert(typeof stats.frameRate.min === 'number', 'Min calculated');
            this.assert(typeof stats.frameRate.max === 'number', 'Max calculated');
            this.assert(stats.frameRate.min === 55, 'Correct minimum value');
            this.assert(stats.frameRate.max === 63, 'Correct maximum value');
            
            dataStore.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test data maintenance
     */
    async testDataStoreMaintenance() {
        const testName = 'DataStore Maintenance';
        
        try {
            const dataStore = new PerformanceDataStore({
                maxStorageSize: 5,
                retentionPeriod: 1000 // 1 second for testing
            });
            
            // Store more data than max size
            for (let i = 0; i < 10; i++) {
                dataStore.store({
                    timestamp: performance.now() + (i * 100),
                    frameRate: { current: 60 }
                });
            }
            
            // Trigger maintenance
            dataStore.performMaintenance();
            
            // Should have limited the data
            this.assert(dataStore.metrics.length <= dataStore.maxStorageSize, 'Data size limited by maintenance');
            
            // Test storage info
            const info = dataStore.getStorageInfo();
            this.assert(typeof info.metricsCount === 'number', 'Storage info provides metrics count');
            this.assert(typeof info.memoryUsage === 'object', 'Storage info provides memory usage');
            
            dataStore.dispose();
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test DataAggregationUtils
     */
    async testAggregationUtils() {
        const testName = 'DataAggregationUtils';
        
        try {
            // Create test data
            const testData = [];
            const baseTime = performance.now();
            
            for (let i = 0; i < 20; i++) {
                testData.push({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: 55 + (i % 10) },
                    memory: { usagePercentage: 40 + (i % 5) * 2 }
                });
            }
            
            // Test time window aggregation
            const windowSize = 5000; // 5 seconds
            const aggregated = DataAggregationUtils.aggregateByTimeWindow(testData, windowSize);
            
            this.assert(aggregated.length > 0, 'Time window aggregation produced results');
            this.assert(aggregated[0].frameRate !== undefined, 'Frame rate aggregated');
            this.assert(aggregated[0].frameRate.mean !== undefined, 'Mean calculated');
            
            // Test rolling average
            const rollingAvg = DataAggregationUtils.calculateRollingAverage(testData, 'frameRate', 5);
            this.assert(rollingAvg.length === testData.length, 'Rolling average for all data points');
            this.assert(typeof rollingAvg[0].rollingAverage === 'number', 'Rolling average calculated');
            
            // Test correlation
            const correlation = DataAggregationUtils.calculateCorrelation(testData, 'frameRate', 'memory');
            this.assert(typeof correlation === 'number', 'Correlation calculated');
            this.assert(correlation >= -1 && correlation <= 1, 'Correlation in valid range');
            
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test anomaly detection
     */
    async testAnomalyDetection() {
        const testName = 'Anomaly Detection';
        
        try {
            // Create test data with known anomalies
            const testData = [];
            const baseTime = performance.now();
            
            for (let i = 0; i < 20; i++) {
                let fps = 60; // Normal value
                if (i === 10) fps = 30; // Anomaly
                if (i === 15) fps = 90; // Anomaly
                
                testData.push({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: fps }
                });
            }
            
            // Test Z-score anomaly detection
            const zscoreAnomalies = DataAggregationUtils.detectAnomalies(testData, 'frameRate', {
                method: 'zscore',
                threshold: 1.5
            });
            
            this.assert(zscoreAnomalies.length > 0, 'Z-score anomalies detected');
            this.assert(zscoreAnomalies[0].method === 'zscore', 'Correct detection method');
            
            // Test IQR anomaly detection
            const iqrAnomalies = DataAggregationUtils.detectAnomalies(testData, 'frameRate', {
                method: 'iqr'
            });
            
            this.assert(Array.isArray(iqrAnomalies), 'IQR anomalies returned as array');
            
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test correlation analysis
     */
    async testCorrelationAnalysis() {
        const testName = 'Correlation Analysis';
        
        try {
            // Create test data with known correlation
            const testData = [];
            const baseTime = performance.now();
            
            for (let i = 0; i < 50; i++) {
                const fps = 60 - i * 0.2; // Decreasing frame rate
                const memory = 40 + i * 0.5; // Increasing memory usage (negative correlation)
                
                testData.push({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: fps },
                    memory: { usagePercentage: memory }
                });
            }
            
            // Test correlation calculation
            const correlation = DataAggregationUtils.calculateCorrelation(testData, 'frameRate', 'memory');
            
            this.assert(typeof correlation === 'number', 'Correlation is a number');
            this.assert(correlation < -0.5, 'Strong negative correlation detected'); // Should be negative
            
            // Test summary report
            const report = DataAggregationUtils.generateSummaryReport(testData);
            
            this.assert(typeof report === 'object', 'Summary report generated');
            this.assert(report.dataPoints === testData.length, 'Correct data point count');
            this.assert(report.metrics.frameRate !== undefined, 'Frame rate metrics included');
            this.assert(report.correlations !== undefined, 'Correlations calculated');
            
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test summary reports
     */
    async testSummaryReports() {
        const testName = 'Summary Reports';
        
        try {
            // Create comprehensive test data
            const testData = [];
            const baseTime = performance.now();
            
            for (let i = 0; i < 30; i++) {
                testData.push({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: 58 + Math.sin(i * 0.1) * 5 }, // Oscillating
                    memory: { usagePercentage: 45 + i * 0.5 }, // Gradually increasing
                    scene: { meshCount: 100 + i * 2 }
                });
            }
            
            // Generate summary report
            const report = DataAggregationUtils.generateSummaryReport(testData);
            
            // Validate report structure
            this.assert(report.dataPoints === 30, 'Correct data point count');
            this.assert(report.timeRange !== undefined, 'Time range included');
            this.assert(report.metrics !== undefined, 'Metrics analysis included');
            this.assert(report.correlations !== undefined, 'Correlations included');
            
            // Validate metrics analysis
            this.assert(report.metrics.frameRate !== undefined, 'Frame rate analysis');
            this.assert(report.metrics.memory !== undefined, 'Memory analysis');
            this.assert(report.metrics.frameRate.trend !== undefined, 'Trend analysis');
            this.assert(report.metrics.frameRate.stability !== undefined, 'Stability analysis');
            
            this.recordTestResult(testName, true);
        } catch (error) {
            this.recordTestResult(testName, false, error.message);
        }
    }

    /**
     * Test ThresholdMonitor basics
     */
    async testThresholdMonitorBasics() {
        const testName = 'ThresholdMonitor Basics';
        
        try {
            const monitor = new ThresholdMonitor({
                thresholds: {
                    frameRate: {
                        critical: { min: 20, max: Infinity },
                        warning: { min: 40, max: Infinity }
                    }
                }
            });
            
            // Test initial state
            this.assert(!monitor.isMonitoring, 'Initial monitoring state is false');
            this.assert(monitor.alertHistory.length === 0, 'Initial alert history is empty');
            
            // Test start/stop
            monitor.start();
            this.assert(monitor.isMonitoring, 'Monitoring started');
            
            monitor.stop();
            this.assert(!monitor.isMonitoring, 'Monitoring stopped');
            
            // Test threshold configuration
            const thresholds = monitor.getThresholds('frameRate');
            this.assert(thresholds !== null, 'Thresholds retrieved');
            this.assert(thresholds.critical.min === 20, 'Threshold value correct');
            
            monitor.dispose();
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
            const monitor = new ThresholdMonitor({
                thresholds: {
                    frameRate: {
                        critical: { min: 20, max: Infinity },
                        warning: { min: 40, max: Infinity }
                    },
                    memory: {
                        warning: { min: 0, max: 70 }
                    }
                },
                alertConfig: {
                    cooldownPeriod: 100 // Short cooldown for testing
                }
            });
            
            monitor.start();
            
            // Test critical alert
            const criticalMetrics = {
                timestamp: performance.now(),
                frameRate: { current: 15 }, // Below critical threshold
                memory: { usagePercentage: 50 }
            };
            
            const criticalAlerts = monitor.checkMetrics(criticalMetrics);
            this.assert(criticalAlerts.length > 0, 'Critical alert generated');
            this.assert(criticalAlerts[0].severity === 'critical', 'Correct severity level');
            
            // Test warning alert
            const warningMetrics = {
                timestamp: performance.now() + 1000,
                frameRate: { current: 35 }, // Below warning threshold
                memory: { usagePercentage: 80 } // Above memory threshold
            };
            
            const warningAlerts = monitor.checkMetrics(warningMetrics);
            this.assert(warningAlerts.length > 0, 'Warning alerts generated');
            
            // Test alert history
            const history = monitor.getAlertHistory();
            this.assert(history.length > 0, 'Alert history populated');
            
            // Test active alerts
            const activeAlerts = monitor.getActiveAlerts();
            this.assert(activeAlerts.length > 0, 'Active alerts tracked');
            
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
            const monitor = new ThresholdMonitor({
                thresholds: {
                    frameRate: {
                        warning: { min: 50, max: Infinity }
                    }
                }
            });
            
            monitor.start();
            
            let callbackTriggered = false;
            let receivedAlert = null;
            
            // Register callback
            const callbackId = monitor.onAlert((alert) => {
                callbackTriggered = true;
                receivedAlert = alert;
            }, { severities: ['warning'] });
            
            this.assert(typeof callbackId === 'string', 'Callback ID returned');
            
            // Trigger alert
            const alertMetrics = {
                timestamp: performance.now(),
                frameRate: { current: 30 } // Below warning threshold
            };
            
            monitor.checkMetrics(alertMetrics);
            
            this.assert(callbackTriggered, 'Callback was triggered');
            this.assert(receivedAlert !== null, 'Alert received in callback');
            this.assert(receivedAlert.severity === 'warning', 'Correct alert severity');
            
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
     * Test alert statistics and reporting
     */
    async testAlertStatistics() {
        const testName = 'Alert Statistics';
        
        try {
            const monitor = new ThresholdMonitor({
                thresholds: {
                    frameRate: {
                        critical: { min: 20, max: Infinity },
                        warning: { min: 40, max: Infinity }
                    }
                }
            });
            
            monitor.start();
            
            // Generate multiple alerts
            const alertScenarios = [
                { frameRate: { current: 15 } }, // Critical
                { frameRate: { current: 35 } }, // Warning
                { frameRate: { current: 10 } }, // Critical
            ];
            
            alertScenarios.forEach((metrics, i) => {
                metrics.timestamp = performance.now() + (i * 200);
                monitor.checkMetrics(metrics);
            });
            
            // Test statistics
            const stats = monitor.getStatistics();
            this.assert(stats.totalAlerts > 0, 'Total alerts counted');
            this.assert(stats.alertsBySeverity.critical > 0, 'Critical alerts counted');
            this.assert(stats.alertsBySeverity.warning > 0, 'Warning alerts counted');
            this.assert(typeof stats.alertRate === 'number', 'Alert rate calculated');
            
            // Test report generation
            const report = monitor.generateReport(60000); // 1 minute
            this.assert(typeof report === 'object', 'Report generated');
            this.assert(report.summary !== undefined, 'Report summary included');
            this.assert(Array.isArray(report.recommendations), 'Recommendations included');
            
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
        
        console.log('\n=== Data Storage Test Results ===');
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
export async function runDataStorageTests() {
    const testSuite = new DataStorageTests();
    return await testSuite.runAllTests();
}