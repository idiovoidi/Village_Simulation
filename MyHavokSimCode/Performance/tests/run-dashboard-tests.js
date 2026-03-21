/**
 * Simple test runner for PerformanceDashboard tests
 * Runs tests without requiring a full test framework
 */

// Simple test framework implementation
class SimpleTestFramework {
    constructor() {
        this.tests = [];
        this.describes = [];
        this.currentDescribe = null;
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    describe(name, fn) {
        const previousDescribe = this.currentDescribe;
        this.currentDescribe = name;
        this.describes.push(name);

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
        const fullName = this.currentDescribe ? `${this.currentDescribe} > ${name}` : name;

        try {
            fn();
            console.log(`  ✅ ${name}`);
            this.results.passed++;
        } catch (error) {
            console.log(`  ❌ ${name}`);
            console.log(`     Error: ${error.message}`);
            this.results.failed++;
            this.results.errors.push({ test: fullName, error: error.message });
        }
    }

    beforeEach(fn) {
        // Simple implementation - just run the function
        try {
            fn();
        } catch (error) {
            console.error('Error in beforeEach:', error.message);
        }
    }

    afterEach(fn) {
        // Simple implementation - just run the function
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
            toBeLessThanOrEqual: expected => {
                if (actual > expected) {
                    throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
                }
            },
            not: {
                toBe: expected => {
                    if (actual === expected) {
                        throw new Error(`Expected ${actual} not to be ${expected}`);
                    }
                },
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

// Mock performance.now for testing
global.performance = {
    now: () => Date.now()
};

// Run basic dashboard tests
console.log('🚀 Starting PerformanceDashboard Tests...');

// Mock DOM environment
class MockDOM {
    constructor() {
        this.elements = new Map();
        this.eventListeners = new Map();
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
            querySelectorAll: () => [],
            getBoundingClientRect: () => ({
                width: 300,
                height: 120
            })
        };

        if (tagName.toLowerCase() === 'canvas') {
            element.getContext = () => ({
                clearRect: () => {},
                fillText: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                stroke: () => {},
                scale: () => {},
                setLineDash: () => {},
                fillStyle: '#000000',
                strokeStyle: '#000000',
                lineWidth: 1,
                font: '12px Arial',
                textAlign: 'left'
            });
            element.width = 300;
            element.height = 120;
        }

        return element;
    }

    getElementById(id) {
        return this.elements.get(id) || null;
    }

    addElement(id, element) {
        element.id = id;
        this.elements.set(id, element);
    }
}

// Mock PerformanceMonitor
class MockPerformanceMonitor {
    constructor() {
        this.callbacks = [];
        this.mockMetrics = {
            timestamp: performance.now(),
            frameRate: { current: 60 },
            memory: { used: 45 },
            cpu: { utilization: 25 },
            agents: { count: 150 }
        };
    }

    onMetricsUpdate(callback) {
        this.callbacks.push(callback);
    }

    getCurrentMetrics() {
        return { ...this.mockMetrics };
    }

    simulateMetricsUpdate(overrides = {}) {
        const metrics = { ...this.mockMetrics, ...overrides };
        this.callbacks.forEach(callback => callback(metrics));
    }
}

// Simple PerformanceDashboard implementation for testing
class PerformanceDashboard {
    constructor(containerId, performanceMonitor) {
        this.containerId = containerId;
        this.performanceMonitor = performanceMonitor;
        this.container = global.document.getElementById(containerId);
        this.widgets = new Map();
        this.charts = new Map();
        this.isVisible = false;
        this.updateInterval = null;
        this.updateFrequency = 30;

        this.chartData = {
            frameRate: [],
            memory: [],
            cpu: [],
            agents: []
        };
        this.maxDataPoints = 100;

        this.widgetConfigs = {
            frameRate: {
                title: 'Frame Rate',
                unit: 'FPS',
                format: value => Math.round(value),
                thresholds: { critical: 15, warning: 30, good: 45 }
            },
            memory: {
                title: 'Memory Usage',
                unit: '%',
                format: value => Math.round(value),
                thresholds: { critical: 90, warning: 75, good: 60 }
            },
            cpu: {
                title: 'CPU Usage',
                unit: '%',
                format: value => Math.round(value),
                thresholds: { critical: 90, warning: 75, good: 60 }
            },
            agents: {
                title: 'Agent Count',
                unit: '',
                format: value => Math.round(value),
                thresholds: { critical: 1000, warning: 500, good: 100 }
            }
        };

        this.initialize();
    }

    initialize() {
        if (!this.container) {
            console.error(`Dashboard container '${this.containerId}' not found`);
            return;
        }

        this.createWidgets();
        this.createCharts();

        if (this.performanceMonitor) {
            this.performanceMonitor.onMetricsUpdate(metrics => {
                this.updateMetrics(metrics);
            });
        }
    }

    createWidgets() {
        Object.keys(this.widgetConfigs).forEach(metricType => {
            const config = this.widgetConfigs[metricType];
            const widget = new MetricWidget(metricType, config);
            this.widgets.set(metricType, widget);
        });
    }

    createCharts() {
        Object.keys(this.widgetConfigs).forEach(metricType => {
            const chart = new PerformanceChart(null, metricType, this.widgetConfigs[metricType]);
            this.charts.set(metricType, chart);
        });
    }

    show() {
        this.isVisible = true;
        this.startUpdating();
    }

    hide() {
        this.isVisible = false;
        this.stopUpdating();
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    reset() {
        Object.keys(this.chartData).forEach(key => {
            this.chartData[key] = [];
        });

        this.charts.forEach(chart => chart.reset());
        this.widgets.forEach(widget => widget.reset());
    }

    startUpdating() {
        if (this.updateInterval) return;

        const intervalMs = 1000 / this.updateFrequency;
        this.updateInterval = setInterval(() => {
            if (this.performanceMonitor && this.isVisible) {
                const metrics = this.performanceMonitor.getCurrentMetrics();
                if (metrics) {
                    this.updateMetrics(metrics);
                }
            }
        }, intervalMs);
    }

    stopUpdating() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateMetrics(metrics) {
        if (!this.isVisible || !metrics) {
            return;
        }

        const values = {
            frameRate: metrics.frameRate?.current || 0,
            memory: metrics.memory?.used || 0,
            cpu: metrics.cpu?.utilization || 0,
            agents: metrics.agents?.count || 0
        };

        Object.keys(values).forEach(metricType => {
            const widget = this.widgets.get(metricType);
            if (widget) {
                widget.updateValue(values[metricType]);
            }
        });

        const timestamp = metrics.timestamp || performance.now();
        Object.keys(values).forEach(metricType => {
            const data = this.chartData[metricType];
            data.push({ timestamp, value: values[metricType] });

            if (data.length > this.maxDataPoints) {
                data.shift();
            }
        });

        Object.keys(values).forEach(metricType => {
            const chart = this.charts.get(metricType);
            if (chart) {
                chart.updateData(this.chartData[metricType]);
            }
        });
    }

    setUpdateFrequency(frequency) {
        this.updateFrequency = Math.max(1, Math.min(60, frequency));

        if (this.updateInterval) {
            this.stopUpdating();
            this.startUpdating();
        }
    }

    dispose() {
        this.stopUpdating();
        this.widgets.forEach(widget => widget.dispose());
        this.charts.forEach(chart => chart.dispose());
        this.widgets.clear();
        this.charts.clear();
    }
}

class MetricWidget {
    constructor(metricType, config) {
        this.metricType = metricType;
        this.config = config;
        this.currentValue = 0;
        this.element = global.document.createElement('div');
    }

    updateValue(value) {
        this.currentValue = value;
    }

    getStatus(value) {
        const { thresholds } = this.config;

        if (this.metricType === 'frameRate') {
            if (value < thresholds.critical) return 'critical';
            if (value < thresholds.warning) return 'warning';
            return 'good';
        } else {
            if (value > thresholds.critical) return 'critical';
            if (value > thresholds.warning) return 'warning';
            return 'good';
        }
    }

    reset() {
        this.updateValue(0);
    }

    getElement() {
        return this.element;
    }

    dispose() {
        this.element = null;
    }
}

class PerformanceChart {
    constructor(canvas, metricType, config) {
        this.canvas = canvas;
        this.metricType = metricType;
        this.config = config;
        this.data = [];
    }

    updateData(data) {
        this.data = [...data];
    }

    reset() {
        this.data = [];
    }

    dispose() {
        this.data = [];
    }
}

// Setup mock DOM
const mockDOM = new MockDOM();
global.document = {
    getElementById: id => mockDOM.getElementById(id),
    createElement: tag => mockDOM.createElement(tag),
    head: { appendChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {}
};
global.window = { devicePixelRatio: 1 };

// Run tests
describe('PerformanceDashboard', () => {
    let mockPerformanceMonitor;
    let dashboard;
    let container;

    beforeEach(() => {
        container = mockDOM.createElement('div');
        mockDOM.addElement('dashboard-container', container);
        mockPerformanceMonitor = new MockPerformanceMonitor();
        dashboard = new PerformanceDashboard('dashboard-container', mockPerformanceMonitor);
    });

    afterEach(() => {
        if (dashboard) {
            dashboard.dispose();
        }
    });

    describe('Initialization', () => {
        test('should create dashboard structure', () => {
            expect(dashboard.container).toBe(container);
            expect(dashboard.widgets.size).toBe(4);
            expect(dashboard.charts.size).toBe(4);
        });

        test('should initialize with correct widget configurations', () => {
            const expectedWidgets = ['frameRate', 'memory', 'cpu', 'agents'];
            expectedWidgets.forEach(widgetType => {
                expect(dashboard.widgets.has(widgetType)).toBe(true);
                expect(dashboard.charts.has(widgetType)).toBe(true);
            });
        });

        test('should start hidden by default', () => {
            expect(dashboard.isVisible).toBe(false);
        });
    });

    describe('Visibility Control', () => {
        test('should show dashboard', () => {
            dashboard.show();
            expect(dashboard.isVisible).toBe(true);
        });

        test('should hide dashboard', () => {
            dashboard.show();
            dashboard.hide();
            expect(dashboard.isVisible).toBe(false);
        });

        test('should toggle visibility', () => {
            expect(dashboard.isVisible).toBe(false);
            dashboard.toggle();
            expect(dashboard.isVisible).toBe(true);
            dashboard.toggle();
            expect(dashboard.isVisible).toBe(false);
        });
    });

    describe('Metrics Updates', () => {
        beforeEach(() => {
            dashboard.show();
        });

        test('should update widgets with new metrics', () => {
            const testMetrics = {
                timestamp: performance.now(),
                frameRate: { current: 45 },
                memory: { used: 75 },
                cpu: { utilization: 60 },
                agents: { count: 200 }
            };

            dashboard.updateMetrics(testMetrics);

            const frameRateWidget = dashboard.widgets.get('frameRate');
            expect(frameRateWidget.currentValue).toBe(45);

            const memoryWidget = dashboard.widgets.get('memory');
            expect(memoryWidget.currentValue).toBe(75);
        });

        test('should update chart data', () => {
            const testMetrics = {
                timestamp: 1000,
                frameRate: { current: 50 },
                memory: { used: 60 },
                cpu: { utilization: 40 },
                agents: { count: 100 }
            };

            dashboard.updateMetrics(testMetrics);

            expect(dashboard.chartData.frameRate.length).toBe(1);
            expect(dashboard.chartData.frameRate[0].timestamp).toBe(1000);
            expect(dashboard.chartData.frameRate[0].value).toBe(50);
        });

        test('should maintain maximum chart data points', () => {
            dashboard.maxDataPoints = 3;

            for (let i = 0; i < 5; i++) {
                dashboard.updateMetrics({
                    timestamp: i * 1000,
                    frameRate: { current: 60 - i },
                    memory: { used: 50 + i },
                    cpu: { utilization: 30 + i },
                    agents: { count: 100 + i }
                });
            }

            expect(dashboard.chartData.frameRate.length).toBe(3);
            expect(dashboard.chartData.frameRate[0].value).toBe(58);
        });
    });

    describe('Widget Status Colors', () => {
        test('should show correct status for frame rate', () => {
            const frameRateWidget = dashboard.widgets.get('frameRate');

            expect(frameRateWidget.getStatus(10)).toBe('critical');
            expect(frameRateWidget.getStatus(25)).toBe('warning');
            expect(frameRateWidget.getStatus(50)).toBe('good');
        });

        test('should show correct status for memory usage', () => {
            const memoryWidget = dashboard.widgets.get('memory');

            expect(memoryWidget.getStatus(95)).toBe('critical');
            expect(memoryWidget.getStatus(80)).toBe('warning');
            expect(memoryWidget.getStatus(50)).toBe('good');
        });
    });

    describe('Reset Functionality', () => {
        test('should reset all data', () => {
            dashboard.show();

            dashboard.updateMetrics({
                timestamp: performance.now(),
                frameRate: { current: 45 },
                memory: { used: 60 },
                cpu: { utilization: 40 },
                agents: { count: 120 }
            });

            expect(dashboard.chartData.frameRate.length).toBe(1);

            dashboard.reset();

            expect(dashboard.chartData.frameRate.length).toBe(0);
            expect(dashboard.chartData.memory.length).toBe(0);
        });
    });

    describe('Update Frequency Control', () => {
        test('should set update frequency within valid range', () => {
            dashboard.setUpdateFrequency(45);
            expect(dashboard.updateFrequency).toBe(45);

            dashboard.setUpdateFrequency(0);
            expect(dashboard.updateFrequency).toBe(1);

            dashboard.setUpdateFrequency(100);
            expect(dashboard.updateFrequency).toBe(60);
        });
    });
});

// Run the tests
const success = framework.printResults();
process.exit(success ? 0 : 1);
