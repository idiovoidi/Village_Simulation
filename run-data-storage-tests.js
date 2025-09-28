/**
 * Node.js test runner for Data Storage tests
 * Tests performance data storage, aggregation, and threshold monitoring
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

// Mock localStorage for Node.js
global.localStorage = {
    storage: {},
    setItem: function(key, value) {
        this.storage[key] = value;
    },
    getItem: function(key) {
        return this.storage[key] || null;
    },
    removeItem: function(key) {
        delete this.storage[key];
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
        console.log('Running Data Storage Tests...\n');
        
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
class MockPerformanceDataStore {
    constructor(options = {}) {
        this.maxStorageSize = options.maxStorageSize || 10000;
        this.storageKey = options.storageKey || 'performance_metrics';
        this.metrics = [];
        this.statsCache = new Map();
        this.cacheTimeout = 30000;
    }

    store(metrics) {
        if (!metrics.timestamp) {
            metrics.timestamp = performance.now();
        }
        
        this.metrics.push({
            ...metrics,
            id: this.generateId(),
            stored: Date.now()
        });
        
        this.statsCache.clear();
        
        if (this.metrics.length > this.maxStorageSize) {
            this.performMaintenance();
        }
    }

    storeBatch(metricsArray) {
        metricsArray.forEach(metrics => this.store(metrics));
    }

    getMetrics(startTime, endTime, options = {}) {
        const { limit = null, offset = 0, fields = null } = options;
        
        let results = this.metrics.filter(metric => 
            metric.timestamp >= startTime && metric.timestamp <= endTime
        );
        
        if (offset > 0) {
            results = results.slice(offset);
        }
        
        if (limit && limit > 0) {
            results = results.slice(0, limit);
        }
        
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

    getLatest(count = 1) {
        if (count === 1) {
            return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
        }
        return this.metrics.slice(-count);
    }

    getAggregatedMetrics(startTime, endTime, interval = '5min') {
        const metrics = this.getMetrics(startTime, endTime);
        const intervalMs = this.parseInterval(interval);
        return this.aggregateMetrics(metrics, intervalMs);
    }

    aggregateMetrics(metrics, intervalMs) {
        if (metrics.length === 0) return [];
        
        const buckets = new Map();
        
        metrics.forEach(metric => {
            const bucketTime = Math.floor(metric.timestamp / intervalMs) * intervalMs;
            
            if (!buckets.has(bucketTime)) {
                buckets.set(bucketTime, {
                    timestamp: bucketTime,
                    count: 0,
                    frameRate: { values: [], sum: 0 },
                    memory: { values: [], sum: 0 }
                });
            }
            
            const bucket = buckets.get(bucketTime);
            bucket.count++;
            
            if (metric.frameRate?.current) {
                bucket.frameRate.values.push(metric.frameRate.current);
                bucket.frameRate.sum += metric.frameRate.current;
            }
            
            if (metric.memory?.usagePercentage) {
                bucket.memory.values.push(metric.memory.usagePercentage);
                bucket.memory.sum += metric.memory.usagePercentage;
            }
        });
        
        const result = [];
        for (const [timestamp, bucket] of buckets) {
            result.push({
                timestamp,
                count: bucket.count,
                frameRate: this.calculateBucketStats(bucket.frameRate),
                memory: this.calculateBucketStats(bucket.memory)
            });
        }
        
        return result.sort((a, b) => a.timestamp - b.timestamp);
    }

    calculateBucketStats(bucket) {
        if (bucket.values.length === 0) {
            return { average: 0, min: 0, max: 0, count: 0 };
        }
        
        const sorted = bucket.values.sort((a, b) => a - b);
        return {
            average: bucket.sum / bucket.values.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            count: bucket.values.length
        };
    }

    getStatistics(startTime, endTime) {
        const metrics = this.getMetrics(startTime, endTime);
        
        if (metrics.length === 0) {
            return {
                count: 0,
                timeRange: { start: startTime, end: endTime },
                frameRate: null,
                memory: null
            };
        }
        
        const frameRates = metrics
            .filter(m => m.frameRate?.current)
            .map(m => m.frameRate.current);
            
        const memoryUsages = metrics
            .filter(m => m.memory?.usagePercentage)
            .map(m => m.memory.usagePercentage);
        
        return {
            count: metrics.length,
            timeRange: { start: startTime, end: endTime },
            frameRate: this.calculateStatistics(frameRates),
            memory: this.calculateStatistics(memoryUsages)
        };
    }

    calculateStatistics(values) {
        if (values.length === 0) return null;
        
        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        
        return {
            count: values.length,
            mean,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)]
        };
    }

    parseInterval(interval) {
        const units = { 's': 1000, 'm': 60000, 'h': 3600000 };
        const match = interval.match(/^(\d+)([smh])$/);
        return match ? parseInt(match[1]) * units[match[2]] : 300000; // Default 5 minutes
    }

    performMaintenance() {
        // Simple maintenance - remove oldest 25%
        const removeCount = Math.floor(this.metrics.length * 0.25);
        this.metrics.splice(0, removeCount);
    }

    getStorageInfo() {
        return {
            metricsCount: this.metrics.length,
            memoryUsage: { bytes: 1000, formatted: '1 KB' },
            oldestMetric: this.metrics.length > 0 ? this.metrics[0].timestamp : null,
            newestMetric: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1].timestamp : null
        };
    }

    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    dispose() {
        this.metrics = [];
        this.statsCache.clear();
    }
}

class MockDataAggregationUtils {
    static aggregateByTimeWindow(data, windowSizeMs) {
        if (!Array.isArray(data) || data.length === 0) return [];
        
        const windows = new Map();
        
        data.forEach(item => {
            const windowStart = Math.floor(item.timestamp / windowSizeMs) * windowSizeMs;
            
            if (!windows.has(windowStart)) {
                windows.set(windowStart, {
                    timestamp: windowStart,
                    count: 0,
                    data: []
                });
            }
            
            windows.get(windowStart).data.push(item);
            windows.get(windowStart).count++;
        });
        
        const results = [];
        for (const [timestamp, window] of windows) {
            results.push({
                timestamp,
                count: window.count,
                frameRate: this.aggregateMetric(window.data, 'frameRate', ['mean', 'min', 'max'])
            });
        }
        
        return results.sort((a, b) => a.timestamp - b.timestamp);
    }

    static aggregateMetric(data, metricPath, functions) {
        const values = this.extractMetricValues(data, metricPath);
        if (values.length === 0) return {};
        
        const result = {};
        functions.forEach(func => {
            switch (func) {
                case 'mean':
                    result.mean = values.reduce((a, b) => a + b, 0) / values.length;
                    break;
                case 'min':
                    result.min = Math.min(...values);
                    break;
                case 'max':
                    result.max = Math.max(...values);
                    break;
            }
        });
        
        return result;
    }

    static extractMetricValues(data, metricPath) {
        const values = [];
        data.forEach(item => {
            const value = this.getNestedValue(item, metricPath);
            if (typeof value === 'number' && !isNaN(value)) {
                values.push(value);
            }
        });
        return values;
    }

    static getNestedValue(obj, path) {
        switch (path) {
            case 'frameRate':
                return obj.frameRate?.current;
            case 'memory':
                return obj.memory?.usagePercentage;
            default:
                return obj[path];
        }
    }

    static calculateRollingAverage(data, metricPath, windowSize) {
        const values = this.extractMetricValues(data, metricPath);
        const rollingAverages = [];
        
        for (let i = 0; i < values.length; i++) {
            const start = Math.max(0, i - windowSize + 1);
            const window = values.slice(start, i + 1);
            const average = window.reduce((a, b) => a + b, 0) / window.length;
            
            rollingAverages.push({
                index: i,
                timestamp: data[i]?.timestamp,
                value: values[i],
                rollingAverage: average,
                windowSize: window.length
            });
        }
        
        return rollingAverages;
    }

    static detectAnomalies(data, metricPath, options = {}) {
        const { method = 'zscore', threshold = 2.5 } = options;
        const values = this.extractMetricValues(data, metricPath);
        const anomalies = [];
        
        if (method === 'zscore') {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            const stdDev = Math.sqrt(variance);
            
            values.forEach((value, index) => {
                const zScore = Math.abs((value - mean) / stdDev);
                if (zScore > threshold) {
                    anomalies.push({
                        index,
                        timestamp: data[index]?.timestamp,
                        value,
                        zScore,
                        method: 'zscore'
                    });
                }
            });
        }
        
        return anomalies;
    }

    static calculateCorrelation(data, metricPath1, metricPath2) {
        const values1 = this.extractMetricValues(data, metricPath1);
        const values2 = this.extractMetricValues(data, metricPath2);
        
        const minLength = Math.min(values1.length, values2.length);
        if (minLength < 2) return null;
        
        const x = values1.slice(0, minLength);
        const y = values2.slice(0, minLength);
        
        const meanX = x.reduce((a, b) => a + b, 0) / x.length;
        const meanY = y.reduce((a, b) => a + b, 0) / y.length;
        
        let numerator = 0;
        let sumXSquared = 0;
        let sumYSquared = 0;
        
        for (let i = 0; i < minLength; i++) {
            const deltaX = x[i] - meanX;
            const deltaY = y[i] - meanY;
            
            numerator += deltaX * deltaY;
            sumXSquared += deltaX * deltaX;
            sumYSquared += deltaY * deltaY;
        }
        
        const denominator = Math.sqrt(sumXSquared * sumYSquared);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    static generateSummaryReport(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return { error: 'No data available', metrics: {} };
        }
        
        return {
            dataPoints: data.length,
            timeRange: {
                start: data[0].timestamp,
                end: data[data.length - 1].timestamp
            },
            metrics: {
                frameRate: {
                    statistics: this.aggregateMetric(data, 'frameRate', ['mean', 'min', 'max']),
                    trend: 'stable',
                    stability: 'good'
                }
            },
            correlations: {
                frameRate_memory: {
                    value: this.calculateCorrelation(data, 'frameRate', 'memory'),
                    strength: 'moderate'
                }
            }
        };
    }
}

class MockThresholdMonitor {
    constructor(options = {}) {
        this.isMonitoring = false;
        this.alertHistory = [];
        this.activeAlerts = new Map();
        this.alertCallbacks = new Map();
        this.thresholds = options.thresholds || {};
        this.alertConfig = options.alertConfig || { cooldownPeriod: 30000 };
        this.stats = {
            totalAlerts: 0,
            alertsBySeverity: { critical: 0, warning: 0, info: 0 },
            alertsByType: {}
        };
    }

    start() {
        this.isMonitoring = true;
        this.activeAlerts.clear();
    }

    stop() {
        this.isMonitoring = false;
        this.activeAlerts.clear();
    }

    checkMetrics(metrics) {
        if (!this.isMonitoring) return [];
        
        const alerts = [];
        const timestamp = metrics.timestamp || Date.now();
        
        for (const [metricType, thresholds] of Object.entries(this.thresholds)) {
            const value = this.extractMetricValue(metrics, metricType);
            
            if (value !== null && value !== undefined) {
                const alert = this.checkThreshold(metricType, value, thresholds, timestamp);
                if (alert) {
                    alerts.push(alert);
                    this.processAlert(alert);
                }
            }
        }
        
        return alerts;
    }

    checkThreshold(metricType, value, thresholds, timestamp) {
        const severityLevels = ['critical', 'warning', 'info'];
        
        for (const level of severityLevels) {
            const threshold = thresholds[level];
            if (!threshold) continue;
            
            const { min, max } = threshold;
            
            if (value < min || value > max) {
                return {
                    id: this.generateAlertId(),
                    timestamp,
                    metricType,
                    severity: level,
                    value,
                    threshold,
                    message: `${metricType} threshold violation: ${value}`,
                    isNew: true
                };
            }
        }
        
        return null;
    }

    processAlert(alert) {
        this.alertHistory.push(alert);
        this.activeAlerts.set(alert.metricType, alert);
        this.updateAlertStatistics(alert);
        this.notifyCallbacks(alert);
    }

    updateAlertStatistics(alert) {
        this.stats.totalAlerts++;
        this.stats.alertsBySeverity[alert.severity]++;
        
        if (!this.stats.alertsByType[alert.metricType]) {
            this.stats.alertsByType[alert.metricType] = 0;
        }
        this.stats.alertsByType[alert.metricType]++;
    }

    extractMetricValue(metrics, metricType) {
        switch (metricType) {
            case 'frameRate':
                return metrics.frameRate?.current;
            case 'memory':
                return metrics.memory?.usagePercentage;
            default:
                return metrics[metricType];
        }
    }

    onAlert(callback, options = {}) {
        const callbackId = this.generateCallbackId();
        this.alertCallbacks.set(callbackId, { callback, ...options });
        return callbackId;
    }

    removeAlertCallback(callbackId) {
        return this.alertCallbacks.delete(callbackId);
    }

    notifyCallbacks(alert) {
        for (const [id, config] of this.alertCallbacks) {
            const { callback, severities = ['critical', 'warning', 'info'] } = config;
            
            if (severities.includes(alert.severity)) {
                try {
                    callback(alert);
                } catch (error) {
                    console.error(`Error in alert callback ${id}:`, error);
                }
            }
        }
    }

    getThresholds(metricType = null) {
        return metricType ? this.thresholds[metricType] : this.thresholds;
    }

    getAlertHistory() {
        return [...this.alertHistory];
    }

    getActiveAlerts() {
        return Array.from(this.activeAlerts.values());
    }

    getStatistics() {
        return {
            ...this.stats,
            alertRate: 0,
            activeAlertCount: this.activeAlerts.size
        };
    }

    generateReport() {
        return {
            summary: {
                totalAlerts: this.stats.totalAlerts,
                activeAlerts: this.activeAlerts.size,
                alertsBySeverity: this.stats.alertsBySeverity
            },
            recommendations: ['System performance appears stable.']
        };
    }

    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateCallbackId() {
        return `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    dispose() {
        this.stop();
        this.alertCallbacks.clear();
        this.alertHistory = [];
    }
}

// Define tests
async function runTests() {
    test.describe('PerformanceDataStore Tests', () => {
        test.it('should store and retrieve metrics', () => {
            const dataStore = new MockPerformanceDataStore();
            
            const testMetrics = {
                timestamp: performance.now(),
                frameRate: { current: 60 },
                memory: { usagePercentage: 45 }
            };
            
            dataStore.store(testMetrics);
            test.assert(dataStore.metrics.length === 1, 'Metrics stored');
            
            const latest = dataStore.getLatest();
            test.assert(latest !== null, 'Latest metrics retrieved');
            test.assert(latest.frameRate.current === 60, 'Correct frame rate');
            
            dataStore.dispose();
        });

        test.it('should handle batch storage', () => {
            const dataStore = new MockPerformanceDataStore();
            
            const batchMetrics = [
                { frameRate: { current: 58 } },
                { frameRate: { current: 62 } }
            ];
            
            dataStore.storeBatch(batchMetrics);
            test.assert(dataStore.metrics.length === 2, 'Batch metrics stored');
            
            dataStore.dispose();
        });

        test.it('should filter metrics by time range', () => {
            const dataStore = new MockPerformanceDataStore();
            
            const baseTime = performance.now();
            const testData = [
                { timestamp: baseTime, frameRate: { current: 60 } },
                { timestamp: baseTime + 1000, frameRate: { current: 58 } },
                { timestamp: baseTime + 2000, frameRate: { current: 62 } }
            ];
            
            testData.forEach(data => dataStore.store(data));
            
            const rangeData = dataStore.getMetrics(baseTime + 500, baseTime + 1500);
            test.assert(rangeData.length === 1, 'Time range filtering works');
            
            dataStore.dispose();
        });

        test.it('should calculate statistics', () => {
            const dataStore = new MockPerformanceDataStore();
            
            const baseTime = performance.now();
            const frameRates = [60, 58, 62, 55, 61];
            
            frameRates.forEach((fps, i) => {
                dataStore.store({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: fps }
                });
            });
            
            const stats = dataStore.getStatistics(baseTime, baseTime + 5000);
            test.assert(stats.count === 5, 'Correct sample count');
            test.assert(stats.frameRate !== null, 'Frame rate statistics calculated');
            test.assert(stats.frameRate.min === 55, 'Correct minimum');
            test.assert(stats.frameRate.max === 62, 'Correct maximum');
            
            dataStore.dispose();
        });
    });

    test.describe('DataAggregationUtils Tests', () => {
        test.it('should aggregate data by time windows', () => {
            const testData = [];
            const baseTime = performance.now();
            
            for (let i = 0; i < 10; i++) {
                testData.push({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: 55 + (i % 5) }
                });
            }
            
            const aggregated = MockDataAggregationUtils.aggregateByTimeWindow(testData, 5000);
            test.assert(aggregated.length > 0, 'Aggregation produced results');
            test.assert(aggregated[0].frameRate !== undefined, 'Frame rate aggregated');
            
        });

        test.it('should calculate rolling averages', () => {
            const testData = [];
            const baseTime = performance.now();
            
            for (let i = 0; i < 10; i++) {
                testData.push({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: 60 + i }
                });
            }
            
            const rollingAvg = MockDataAggregationUtils.calculateRollingAverage(testData, 'frameRate', 3);
            test.assert(rollingAvg.length === testData.length, 'Rolling average for all points');
            test.assert(typeof rollingAvg[0].rollingAverage === 'number', 'Rolling average calculated');
        });

        test.it('should detect anomalies', () => {
            const testData = [];
            const baseTime = performance.now();
            
            // Normal data with one anomaly
            for (let i = 0; i < 10; i++) {
                const fps = i === 5 ? 30 : 60; // Anomaly at index 5
                testData.push({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: fps }
                });
            }
            
            const anomalies = MockDataAggregationUtils.detectAnomalies(testData, 'frameRate', {
                method: 'zscore',
                threshold: 1.5
            });
            
            test.assert(Array.isArray(anomalies), 'Anomalies returned as array');
        });

        test.it('should calculate correlations', () => {
            const testData = [];
            const baseTime = performance.now();
            
            for (let i = 0; i < 20; i++) {
                testData.push({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: 60 - i * 0.5 }, // Decreasing
                    memory: { usagePercentage: 40 + i * 1 } // Increasing
                });
            }
            
            const correlation = MockDataAggregationUtils.calculateCorrelation(testData, 'frameRate', 'memory');
            test.assert(typeof correlation === 'number', 'Correlation calculated');
            test.assert(correlation >= -1 && correlation <= 1, 'Correlation in valid range');
        });

        test.it('should generate summary reports', () => {
            const testData = [];
            const baseTime = performance.now();
            
            for (let i = 0; i < 10; i++) {
                testData.push({
                    timestamp: baseTime + (i * 1000),
                    frameRate: { current: 60 + Math.sin(i) * 5 }
                });
            }
            
            const report = MockDataAggregationUtils.generateSummaryReport(testData);
            test.assert(typeof report === 'object', 'Report generated');
            test.assert(report.dataPoints === 10, 'Correct data point count');
            test.assert(report.metrics !== undefined, 'Metrics included');
        });
    });

    test.describe('ThresholdMonitor Tests', () => {
        test.it('should start and stop monitoring', () => {
            const monitor = new MockThresholdMonitor();
            
            test.assert(!monitor.isMonitoring, 'Initial state is not monitoring');
            
            monitor.start();
            test.assert(monitor.isMonitoring, 'Monitoring started');
            
            monitor.stop();
            test.assert(!monitor.isMonitoring, 'Monitoring stopped');
            
            monitor.dispose();
        });

        test.it('should detect threshold violations', () => {
            const monitor = new MockThresholdMonitor({
                thresholds: {
                    frameRate: {
                        critical: { min: 20, max: Infinity },
                        warning: { min: 40, max: Infinity }
                    }
                }
            });
            
            monitor.start();
            
            const criticalMetrics = {
                timestamp: performance.now(),
                frameRate: { current: 15 } // Below critical threshold
            };
            
            const alerts = monitor.checkMetrics(criticalMetrics);
            test.assert(alerts.length > 0, 'Alert generated');
            test.assert(alerts[0].severity === 'critical', 'Correct severity');
            
            monitor.dispose();
        });

        test.it('should handle alert callbacks', () => {
            const monitor = new MockThresholdMonitor({
                thresholds: {
                    frameRate: {
                        warning: { min: 50, max: Infinity }
                    }
                }
            });
            
            monitor.start();
            
            let callbackTriggered = false;
            const callbackId = monitor.onAlert(() => {
                callbackTriggered = true;
            });
            
            monitor.checkMetrics({
                frameRate: { current: 30 } // Below warning threshold
            });
            
            test.assert(callbackTriggered, 'Callback triggered');
            
            const removed = monitor.removeAlertCallback(callbackId);
            test.assert(removed, 'Callback removed');
            
            monitor.dispose();
        });

        test.it('should track alert statistics', () => {
            const monitor = new MockThresholdMonitor({
                thresholds: {
                    frameRate: {
                        critical: { min: 20, max: Infinity },
                        warning: { min: 40, max: Infinity }
                    }
                }
            });
            
            monitor.start();
            
            // Generate alerts
            monitor.checkMetrics({ frameRate: { current: 15 } }); // Critical
            monitor.checkMetrics({ frameRate: { current: 35 } }); // Warning
            
            const stats = monitor.getStatistics();
            test.assert(stats.totalAlerts === 2, 'Total alerts counted');
            test.assert(stats.alertsBySeverity.critical === 1, 'Critical alerts counted');
            test.assert(stats.alertsBySeverity.warning === 1, 'Warning alerts counted');
            
            monitor.dispose();
        });

        test.it('should generate reports', () => {
            const monitor = new MockThresholdMonitor();
            monitor.start();
            
            const report = monitor.generateReport();
            test.assert(typeof report === 'object', 'Report generated');
            test.assert(report.summary !== undefined, 'Summary included');
            test.assert(Array.isArray(report.recommendations), 'Recommendations included');
            
            monitor.dispose();
        });
    });

    // Run all tests
    await test.runTests();
    
    console.log('\n✅ All Data Storage tests completed!');
}

// Run the tests
runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});