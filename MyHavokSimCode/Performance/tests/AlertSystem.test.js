/**
 * Tests for AlertSystem
 * Validates alert triggering, notification delivery, and threshold management
 */

import { AlertSystem } from '../AlertSystem.js';

// Mock DOM environment for testing
class MockDOM {
    constructor() {
        this.elements = new Map();
        this.eventListeners = new Map();
        this.body = {
            appendChild: element => {
                this.elements.set(element.id, element);
            }
        };
        this.head = {
            appendChild: () => {}
        };
    }

    createElement(tagName) {
        const element = {
            tagName: tagName.toUpperCase(),
            id: '',
            className: '',
            innerHTML: '',
            textContent: '',
            style: {},
            children: [],
            parentNode: null,
            dataset: {},
            addEventListener: (event, handler) => {
                const key = `${element.id || 'anonymous'}-${event}`;
                this.eventListeners.set(key, handler);
            },
            removeEventListener: () => {},
            appendChild: child => {
                element.children.push(child);
                child.parentNode = element;
            },
            removeChild: child => {
                const index = element.children.indexOf(child);
                if (index > -1) {
                    element.children.splice(index, 1);
                    child.parentNode = null;
                }
            },
            querySelector: selector => element.children[0] || null,
            querySelectorAll: selector => element.children.filter(child =>
                selector.includes(child.className)
                    || selector.includes(child.tagName.toLowerCase())
            ),
            remove() {
                if (this.parentNode) {
                    this.parentNode.removeChild(this);
                }
            }
        };

        return element;
    }

    getElementById(id) {
        return this.elements.get(id) || null;
    }

    addElement(id, element) {
        element.id = id;
        this.elements.set(id, element);
    }

    triggerEvent(elementId, eventType, eventData = {}) {
        const key = `${elementId}-${eventType}`;
        const handler = this.eventListeners.get(key);
        if (handler) {
            handler(eventData);
        }
    }
}

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

    afterEach(fn) {
        try {
            fn();
        } catch (error) {
            console.error('Error in afterEach:', error.message);
        }
    }

    expect(actual) {
        return {
            toBe: expected => {
                if (actual !== expected) {
                    throw new Error(`Expected ${actual} to be ${expected}`);
                }
            },
            toEqual: expected => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
                }
            },
            toBeDefined: () => {
                if (actual === undefined) {
                    throw new Error(`Expected ${actual} to be defined`);
                }
            },
            toBeNull: () => {
                if (actual !== null) {
                    throw new Error(`Expected ${actual} to be null`);
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
            toHaveBeenCalled: () => {
                if (!actual.called) {
                    throw new Error('Expected function to have been called');
                }
            },
            toBeLessThan: expected => {
                if (actual >= expected) {
                    throw new Error(`Expected ${actual} to be less than ${expected}`);
                }
            },
            toBeGreaterThan: expected => {
                if (actual <= expected) {
                    throw new Error(`Expected ${actual} to be greater than ${expected}`);
                }
            },
            toContain: expected => {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            },
            toHaveLength: expected => {
                if (actual.length !== expected) {
                    throw new Error(`Expected length ${actual.length} to be ${expected}`);
                }
            }
        };
    }

    jest = {
        spyOn: (obj, method) => {
            const original = obj[method];
            const spy = function (...args) {
                spy.called = true;
                spy.callCount = (spy.callCount || 0) + 1;
                spy.lastArgs = args;
                return original ? original.apply(obj, args) : undefined;
            };
            spy.called = false;
            spy.callCount = 0;
            obj[method] = spy;
            return spy;
        }
    };

    printResults() {
        console.log(`\n${'='.repeat(50)}`);
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
global.afterEach = framework.afterEach.bind(framework);
global.expect = framework.expect.bind(framework);
global.jest = framework.jest;

// Mock globals
global.performance = { now: () => Date.now() };
global.console = {
    log: () => {},
    warn: () => {},
    error: () => {},
    info: () => {}
};

// Run tests
console.log('🚀 Starting AlertSystem Tests...');

// Setup mock DOM
const mockDOM = new MockDOM();
global.document = {
    getElementById: id => mockDOM.getElementById(id),
    createElement: tag => mockDOM.createElement(tag),
    body: mockDOM.body,
    head: mockDOM.head,
    addEventListener: () => {}
};

global.window = {
    AudioContext: class MockAudioContext {
        constructor() {
            this.destination = {};
        }

        createBufferSource() {
            return {
                buffer: null,
                connect: () => {},
                start: () => {}
            };
        }

        decodeAudioData(buffer) {
            return Promise.resolve(new ArrayBuffer(1024));
        }

        close() {
            return Promise.resolve();
        }
    },
    fetch: url => Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
    })
};

describe('AlertSystem', () => {
    let alertSystem;

    beforeEach(() => {
        // Reset DOM
        mockDOM.elements.clear();
        mockDOM.eventListeners.clear();

        // Create new alert system
        alertSystem = new AlertSystem({
            alertConfig: {
                enableVisualAlerts: true,
                enableAudioAlerts: false, // Disable for testing
                enableConsoleAlerts: false,
                cooldownPeriod: 1000, // 1 second for testing
                maxAlertsPerMinute: 5
            }
        });
    });

    afterEach(() => {
        if (alertSystem) {
            alertSystem.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize with default options', () => {
            expect(alertSystem.isEnabled).toBe(true);
            expect(alertSystem.activeAlerts).toBeDefined();
            expect(alertSystem.alertHistory).toBeDefined();
            expect(alertSystem.callbacks).toBeDefined();
        });

        test('should create alert container', () => {
            expect(alertSystem.alertContainer).toBeDefined();
            expect(alertSystem.alertContainer.id).toBe('performance-alerts-container');
        });

        test('should setup default thresholds', () => {
            const thresholds = alertSystem.getThresholds();
            expect(thresholds.frameRate).toBeDefined();
            expect(thresholds.memory).toBeDefined();
            expect(thresholds.cpu).toBeDefined();
            expect(thresholds.agents).toBeDefined();
        });
    });

    describe('Threshold Evaluation', () => {
        test('should detect frame rate critical alert', () => {
            const metrics = {
                frameRate: { current: 10 }, // Below critical threshold of 15
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            const alerts = alertSystem.checkMetrics(metrics);
            expect(alerts.length).toBeGreaterThan(0);

            const frameRateAlert = alerts.find(alert => alert.metricType === 'frameRate');
            expect(frameRateAlert).toBeDefined();
            expect(frameRateAlert.severity).toBe('critical');
        });

        test('should detect memory warning alert', () => {
            const metrics = {
                frameRate: { current: 60 },
                memory: { used: 80 }, // Above warning threshold of 75
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            const alerts = alertSystem.checkMetrics(metrics);
            const memoryAlert = alerts.find(alert => alert.metricType === 'memory');
            expect(memoryAlert).toBeDefined();
            expect(memoryAlert.severity).toBe('warning');
        });

        test('should detect CPU critical alert', () => {
            const metrics = {
                frameRate: { current: 60 },
                memory: { used: 50 },
                cpu: { utilization: 95 }, // Above critical threshold of 90
                agents: { count: 100 }
            };

            const alerts = alertSystem.checkMetrics(metrics);
            const cpuAlert = alerts.find(alert => alert.metricType === 'cpu');
            expect(cpuAlert).toBeDefined();
            expect(cpuAlert.severity).toBe('critical');
        });

        test('should detect agent count warning', () => {
            const metrics = {
                frameRate: { current: 60 },
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 600 } // Above warning threshold of 500
            };

            const alerts = alertSystem.checkMetrics(metrics);
            const agentAlert = alerts.find(alert => alert.metricType === 'agents');
            expect(agentAlert).toBeDefined();
            expect(agentAlert.severity).toBe('warning');
        });

        test('should not generate alerts for normal metrics', () => {
            const metrics = {
                frameRate: { current: 60 },
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            const alerts = alertSystem.checkMetrics(metrics);
            expect(alerts.length).toBe(0);
        });
    });

    describe('Alert Processing', () => {
        test('should add alerts to history', () => {
            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            const initialHistoryLength = alertSystem.alertHistory.length;
            alertSystem.checkMetrics(metrics);

            expect(alertSystem.alertHistory.length).toBeGreaterThan(initialHistoryLength);
        });

        test('should track active alerts', () => {
            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 95 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            alertSystem.checkMetrics(metrics);

            expect(alertSystem.activeAlerts.size).toBeGreaterThan(0);
        });

        test('should respect cooldown period', () => {
            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            // First alert
            const alerts1 = alertSystem.checkMetrics(metrics);
            expect(alerts1.length).toBeGreaterThan(0);

            // Immediate second check should be in cooldown
            const alerts2 = alertSystem.checkMetrics(metrics);
            expect(alerts2.length).toBe(0);
        });

        test('should enforce rate limiting', () => {
            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            // Generate multiple alerts quickly
            let totalAlerts = 0;
            for (let i = 0; i < 10; i++) {
                // Use different metric values to avoid cooldown
                const testMetrics = {
                    ...metrics,
                    frameRate: { current: 10 - i }
                };

                const alerts = alertSystem.checkMetrics(testMetrics);
                totalAlerts += alerts.length;
            }

            // Should be limited by maxAlertsPerMinute (5)
            expect(totalAlerts).toBeLessThan(10);
        });
    });

    describe('Threshold Management', () => {
        test('should set custom thresholds', () => {
            const customThresholds = {
                critical: { min: 10, max: Infinity, message: 'Custom critical' },
                warning: { min: 20, max: Infinity, message: 'Custom warning' }
            };

            alertSystem.setThresholds('frameRate', customThresholds);

            const thresholds = alertSystem.getThresholds('frameRate');
            expect(thresholds.critical.min).toBe(10);
            expect(thresholds.warning.min).toBe(20);
        });

        test('should get thresholds for specific metric', () => {
            const frameRateThresholds = alertSystem.getThresholds('frameRate');
            expect(frameRateThresholds.critical).toBeDefined();
            expect(frameRateThresholds.warning).toBeDefined();
        });

        test('should get all thresholds', () => {
            const allThresholds = alertSystem.getThresholds();
            expect(allThresholds.frameRate).toBeDefined();
            expect(allThresholds.memory).toBeDefined();
            expect(allThresholds.cpu).toBeDefined();
            expect(allThresholds.agents).toBeDefined();
        });
    });

    describe('Callback System', () => {
        test('should register alert callbacks', () => {
            const callback = () => {};
            const callbackId = alertSystem.onAlert(callback);

            expect(callbackId).toBeDefined();
            expect(alertSystem.callbacks.length).toBe(1);
        });

        test('should remove alert callbacks', () => {
            const callback = () => {};
            const callbackId = alertSystem.onAlert(callback);

            const removed = alertSystem.removeCallback(callbackId);
            expect(removed).toBe(true);
            expect(alertSystem.callbacks.length).toBe(0);
        });

        test('should notify callbacks on alert', () => {
            let callbackCalled = false;
            let receivedAlert = null;

            const callback = alert => {
                callbackCalled = true;
                receivedAlert = alert;
            };

            alertSystem.onAlert(callback);

            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            alertSystem.checkMetrics(metrics);

            expect(callbackCalled).toBe(true);
            expect(receivedAlert).toBeDefined();
            expect(receivedAlert.metricType).toBe('frameRate');
        });

        test('should filter callbacks by severity', () => {
            let criticalCallbackCalled = false;
            let warningCallbackCalled = false;

            alertSystem.onAlert(() => { criticalCallbackCalled = true; }, { severity: 'critical' });
            alertSystem.onAlert(() => { warningCallbackCalled = true; }, { severity: 'warning' });

            const metrics = {
                frameRate: { current: 10 }, // Critical
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            alertSystem.checkMetrics(metrics);

            expect(criticalCallbackCalled).toBe(true);
            expect(warningCallbackCalled).toBe(false);
        });
    });

    describe('Alert History', () => {
        test('should retrieve alert history', () => {
            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 95 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            alertSystem.checkMetrics(metrics);

            const history = alertSystem.getAlertHistory();
            expect(history.length).toBeGreaterThan(0);
        });

        test('should filter history by severity', () => {
            const metrics = {
                frameRate: { current: 10 }, // Critical
                memory: { used: 80 }, // Warning
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            alertSystem.checkMetrics(metrics);

            const criticalHistory = alertSystem.getAlertHistory({ severity: 'critical' });
            const warningHistory = alertSystem.getAlertHistory({ severity: 'warning' });

            expect(criticalHistory.length).toBeGreaterThan(0);
            expect(warningHistory.length).toBeGreaterThan(0);

            criticalHistory.forEach(alert => {
                expect(alert.severity).toBe('critical');
            });
        });

        test('should filter history by metric type', () => {
            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 95 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            alertSystem.checkMetrics(metrics);

            const frameRateHistory = alertSystem.getAlertHistory({ metricType: 'frameRate' });

            frameRateHistory.forEach(alert => {
                expect(alert.metricType).toBe('frameRate');
            });
        });

        test('should clear alert history', () => {
            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            alertSystem.checkMetrics(metrics);
            expect(alertSystem.alertHistory.length).toBeGreaterThan(0);

            alertSystem.clearHistory();
            expect(alertSystem.alertHistory.length).toBe(0);
            expect(alertSystem.activeAlerts.size).toBe(0);
        });
    });

    describe('Statistics', () => {
        test('should generate alert statistics', () => {
            const metrics = {
                frameRate: { current: 10 }, // Critical
                memory: { used: 80 }, // Warning
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            alertSystem.checkMetrics(metrics);

            const stats = alertSystem.getStatistics();
            expect(stats.total).toBeGreaterThan(0);
            expect(stats.bySeverity).toBeDefined();
            expect(stats.byMetricType).toBeDefined();
        });

        test('should track statistics by severity', () => {
            const metrics = {
                frameRate: { current: 10 }, // Critical
                memory: { used: 80 }, // Warning
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            alertSystem.checkMetrics(metrics);

            const stats = alertSystem.getStatistics();
            expect(stats.bySeverity.critical).toBeGreaterThan(0);
            expect(stats.bySeverity.warning).toBeGreaterThan(0);
        });
    });

    describe('Enable/Disable', () => {
        test('should toggle alert system', () => {
            expect(alertSystem.isEnabled).toBe(true);

            alertSystem.toggle();
            expect(alertSystem.isEnabled).toBe(false);

            alertSystem.toggle();
            expect(alertSystem.isEnabled).toBe(true);
        });

        test('should not generate alerts when disabled', () => {
            alertSystem.disable();

            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 95 },
                cpu: { utilization: 95 },
                agents: { count: 1000 }
            };

            const alerts = alertSystem.checkMetrics(metrics);
            expect(alerts.length).toBe(0);
        });

        test('should enable alert system', () => {
            alertSystem.disable();
            expect(alertSystem.isEnabled).toBe(false);

            alertSystem.enable();
            expect(alertSystem.isEnabled).toBe(true);
        });
    });

    describe('Data Export', () => {
        test('should export alerts as JSON', () => {
            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            alertSystem.checkMetrics(metrics);

            const jsonExport = alertSystem.exportAlerts('json');
            expect(jsonExport).toBeDefined();

            const data = JSON.parse(jsonExport);
            expect(data.alerts).toBeDefined();
            expect(data.statistics).toBeDefined();
            expect(data.thresholds).toBeDefined();
        });

        test('should export alerts as CSV', () => {
            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            alertSystem.checkMetrics(metrics);

            const csvExport = alertSystem.exportAlerts('csv');
            expect(csvExport).toBeDefined();
            expect(csvExport).toContain('Timestamp,Severity,Metric Type,Value,Message');
        });
    });

    describe('Error Handling', () => {
        test('should handle null metrics gracefully', () => {
            expect(() => {
                alertSystem.checkMetrics(null);
            }).not.toThrow();

            const alerts = alertSystem.checkMetrics(null);
            expect(alerts.length).toBe(0);
        });

        test('should handle malformed metrics', () => {
            const malformedMetrics = {
                frameRate: 'invalid',
                memory: null,
                cpu: undefined
            };

            expect(() => {
                alertSystem.checkMetrics(malformedMetrics);
            }).not.toThrow();
        });

        test('should handle callback errors gracefully', () => {
            const errorCallback = () => {
                throw new Error('Callback error');
            };

            alertSystem.onAlert(errorCallback);

            const metrics = {
                frameRate: { current: 10 },
                memory: { used: 50 },
                cpu: { utilization: 30 },
                agents: { count: 100 }
            };

            expect(() => {
                alertSystem.checkMetrics(metrics);
            }).not.toThrow();
        });
    });
});

// Run the tests
const success = framework.printResults();
process.exit(success ? 0 : 1);
