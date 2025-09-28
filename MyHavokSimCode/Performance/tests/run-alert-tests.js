/**
 * Simple test runner for AlertSystem
 * Tests alert functionality without requiring ES modules
 */

// Simple test framework
class SimpleTestFramework {
    constructor() {
        this.results = { passed: 0, failed: 0, errors: [] };
        this.currentDescribe = null;
    }

    describe(name, fn) {
        const previousDescribe = this.currentDescribe;
        this.currentDescribe = name;
        console.log(`\n📋 ${name}`);
        
        try {
            fn();
        } catch (error) {
            console.error(`❌ Error in describe block "${name}":`, error.message);
            this.results.errors.push({ describe: name, error: error.message });
        }
        
        this.currentDescribe = previousDescribe;
    }

    test(name, fn) {
        try {
            fn();
            console.log(`  ✅ ${name}`);
            this.results.passed++;
        } catch (error) {
            console.log(`  ❌ ${name}`);
            console.log(`     Error: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({ 
                test: this.currentDescribe ? `${this.currentDescribe} > ${name}` : name, 
                error: error.message 
            });
        }
    }

    beforeEach(fn) {
        try {
            fn();
        } catch (error) {
            console.error('Error in beforeEach:', error.message);
        }
    }

    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${actual} to be ${expected}`);
                }
            },
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
                }
            },
            toBeDefined: () => {
                if (actual === undefined) {
                    throw new Error(`Expected ${actual} to be defined`);
                }
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected ${actual} to be truthy`);
                }
            },
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected ${actual} to be falsy`);
                }
            },
            toBeGreaterThan: (expected) => {
                if (actual <= expected) {
                    throw new Error(`Expected ${actual} to be greater than ${expected}`);
                }
            },
            toBeLessThan: (expected) => {
                if (actual >= expected) {
                    throw new Error(`Expected ${actual} to be less than ${expected}`);
                }
            },
            toContain: (expected) => {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            },
            toHaveLength: (expected) => {
                if (actual.length !== expected) {
                    throw new Error(`Expected length ${actual.length} to be ${expected}`);
                }
            },
            not: {
                toThrow: () => {
                    let threw = false;
                    try {
                        if (typeof actual === 'function') {
                            actual();
                        }
                    } catch (e) {
                        threw = true;
                    }
                    if (threw) {
                        throw new Error('Expected function not to throw');
                    }
                }
            }
        };
    }

    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 Test Results');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📊 Total: ${this.results.passed + this.results.failed}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n🔍 Error Details:');
            this.results.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.test || error.describe}: ${error.error}`);
            });
        }
        
        const success = this.results.failed === 0;
        console.log(`\n${success ? '🎉 All tests passed!' : '💥 Some tests failed!'}`);
        return success;
    }
}

// Setup global test functions
const framework = new SimpleTestFramework();
global.describe = framework.describe.bind(framework);
global.test = framework.test.bind(framework);
global.beforeEach = framework.beforeEach.bind(framework);
global.expect = framework.expect.bind(framework);

// Mock DOM environment
class MockDOM {
    constructor() {
        this.elements = new Map();
        this.body = { appendChild: () => {} };
        this.head = { appendChild: () => {} };
    }

    createElement(tagName) {
        return {
            tagName: tagName.toUpperCase(),
            id: '',
            className: '',
            innerHTML: '',
            style: {},
            children: [],
            dataset: {},
            addEventListener: () => {},
            appendChild: () => {},
            removeChild: () => {},
            querySelector: () => null,
            querySelectorAll: () => [],
            remove: () => {}
        };
    }

    getElementById(id) {
        return this.elements.get(id) || null;
    }

    addElement(id, element) {
        element.id = id;
        this.elements.set(id, element);
    }
}

// Simple AlertSystem implementation for testing
class AlertSystem {
    constructor(options = {}) {
        this.options = {
            thresholds: {
                frameRate: {
                    critical: { min: 15, max: Infinity, message: 'Critical frame rate drop detected' },
                    warning: { min: 30, max: Infinity, message: 'Frame rate below optimal level' },
                    info: { min: 45, max: Infinity, message: 'Frame rate could be improved' }
                },
                memory: {
                    critical: { min: 0, max: 90, message: 'Critical memory usage detected' },
                    warning: { min: 0, max: 75, message: 'High memory usage detected' },
                    info: { min: 0, max: 60, message: 'Memory usage elevated' }
                },
                cpu: {
                    critical: { min: 0, max: 90, message: 'Critical CPU usage detected' },
                    warning: { min: 0, max: 75, message: 'High CPU usage detected' },
                    info: { min: 0, max: 60, message: 'CPU usage elevated' }
                },
                agents: {
                    critical: { min: 0, max: 1000, message: 'Too many agents active' },
                    warning: { min: 0, max: 500, message: 'High agent count detected' },
                    info: { min: 0, max: 250, message: 'Agent count elevated' }
                }
            },
            alertConfig: {
                cooldownPeriod: 30000,
                maxAlertsPerMinute: 10,
                enableVisualAlerts: true,
                enableAudioAlerts: true,
                enableConsoleAlerts: true,
                persistAlerts: true
            },
            ...options
        };
        
        this.activeAlerts = new Map();
        this.alertHistory = [];
        this.alertCounts = new Map();
        this.callbacks = [];
        this.isEnabled = true;
        this.alertContainer = null;
        
        this.initialize();
    }

    initialize() {
        this.createAlertContainer();
    }

    createAlertContainer() {
        if (!this.options.alertConfig.enableVisualAlerts) return;
        
        this.alertContainer = global.document.createElement('div');
        this.alertContainer.id = 'performance-alerts-container';
        global.document.body.appendChild(this.alertContainer);
    }

    checkMetrics(metrics) {
        if (!this.isEnabled || !metrics) return [];
        
        const alerts = [];
        const timestamp = Date.now();
        
        Object.keys(this.options.thresholds).forEach(metricType => {
            const metricValue = this.extractMetricValue(metrics, metricType);
            if (metricValue === null || metricValue === undefined) return;
            
            const thresholds = this.options.thresholds[metricType];
            const alert = this.evaluateThreshold(metricType, metricValue, thresholds, timestamp);
            
            if (alert) {
                alerts.push(alert);
            }
        });
        
        alerts.forEach(alert => {
            this.processAlert(alert);
        });
        
        return alerts;
    }

    extractMetricValue(metrics, metricType) {
        switch (metricType) {
            case 'frameRate': return metrics.frameRate?.current;
            case 'memory': return metrics.memory?.used;
            case 'cpu': return metrics.cpu?.utilization;
            case 'agents': return metrics.agents?.count;
            default: return null;
        }
    }

    evaluateThreshold(metricType, value, thresholds, timestamp) {
        const severityLevels = ['critical', 'warning', 'info'];
        
        for (const severity of severityLevels) {
            const threshold = thresholds[severity];
            if (!threshold) continue;
            
            const isViolated = this.isThresholdViolated(value, threshold, metricType);
            
            if (isViolated) {
                const alertId = `${metricType}-${severity}`;
                
                if (this.isInCooldown(alertId)) return null;
                if (this.isRateLimited()) return null;
                
                return {
                    id: alertId,
                    metricType,
                    severity,
                    value,
                    threshold,
                    message: threshold.message || `${metricType} ${severity} threshold exceeded`,
                    timestamp,
                    details: this.generateAlertDetails(metricType, value, threshold)
                };
            }
        }
        
        return null;
    }

    isThresholdViolated(value, threshold, metricType) {
        if (metricType === 'frameRate') {
            return value < threshold.min;
        } else {
            return value > threshold.max;
        }
    }

    isInCooldown(alertId) {
        const lastAlert = this.activeAlerts.get(alertId);
        if (!lastAlert) return false;
        
        const timeSinceLastAlert = Date.now() - lastAlert.timestamp;
        return timeSinceLastAlert < this.options.alertConfig.cooldownPeriod;
    }

    isRateLimited() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        let alertCount = 0;
        for (const [timestamp, count] of this.alertCounts.entries()) {
            if (timestamp > oneMinuteAgo) {
                alertCount += count;
            }
        }
        
        return alertCount >= this.options.alertConfig.maxAlertsPerMinute;
    }

    generateAlertDetails(metricType, value, threshold) {
        const details = {
            currentValue: value,
            threshold: threshold,
            metricType: metricType
        };
        
        switch (metricType) {
            case 'frameRate':
                details.unit = 'FPS';
                details.recommendation = 'Optimize rendering performance';
                break;
            case 'memory':
                details.unit = '%';
                details.recommendation = 'Check for memory leaks';
                break;
            case 'cpu':
                details.unit = '%';
                details.recommendation = 'Optimize update loops';
                break;
            case 'agents':
                details.unit = 'count';
                details.recommendation = 'Reduce agent count';
                break;
        }
        
        return details;
    }

    processAlert(alert) {
        this.activeAlerts.set(alert.id, alert);
        
        if (this.options.alertConfig.persistAlerts) {
            this.alertHistory.push({ ...alert });
            
            if (this.alertHistory.length > 1000) {
                this.alertHistory.shift();
            }
        }
        
        const minute = Math.floor(Date.now() / 60000) * 60000;
        this.alertCounts.set(minute, (t