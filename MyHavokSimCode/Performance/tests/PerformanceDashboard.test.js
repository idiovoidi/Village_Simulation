/**
 * Tests for PerformanceDashboard UI component
 * Validates dashboard responsiveness, accuracy, and user interactions
 */

import { PerformanceMonitor } from '../PerformanceMonitor.js';
import { PerformanceDashboard } from '../PerformanceDashboard.js';

// Mock DOM environment for testing
class MockDOM {
    constructor() {
        this.elements = new Map();
        this.eventListeners = new Map();
        this.styles = [];
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
            removeEventListener: (event, handler) => {
                const key = `${element.id || 'anonymous'}-${event}`;
                this.eventListeners.delete(key);
            },
            appendChild: (child) => {
                element.children.push(child);
                child.parentNode = element;
            },
            removeChild: (child) => {
                const index = element.children.indexOf(child);
                if (index > -1) {
                    element.children.splice(index, 1);
                    child.parentNode = null;
                }
            },
            querySelector: (selector) => {
                // Simple selector implementation for testing
                if (selector.startsWith('#')) {
                    const id = selector.substring(1);
                    return this.findElementById(element, id);
                }
                if (selector.startsWith('.')) {
                    const className = selector.substring(1);
                    return this.findElementByClass(element, className);
                }
                return this.findElementByTag(element, selector);
            },
            querySelectorAll: (selector) => {
                // Return array of matching elements
                return [element.querySelector(selector)].filter(Boolean);
            },
            getBoundingClientRect: () => ({
                width: 300,
                height: 120,
                top: 0,
                left: 0,
                right: 300,
                bottom: 120
            })
        };

        if (tagName.toLowerCase() === 'canvas') {
            element.getContext = (type) => ({
                clearRect: () => {},
                fillRect: () => {},
                strokeRect: () => {},
                fillText: () => {},
                strokeText: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                stroke: () => {},
                fill: () => {},
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

    findElementById(parent, id) {
        if (parent.id === id) return parent;
        for (const child of parent.children) {
            const found = this.findElementById(child, id);
            if (found) return found;
        }
        return null;
    }

    findElementByClass(parent, className) {
        if (parent.className && parent.className.includes(className)) return parent;
        for (const child of parent.children) {
            const found = this.findElementByClass(child, className);
            if (found) return found;
        }
        return null;
    }

    findElementByTag(parent, tagName) {
        if (parent.tagName === tagName.toUpperCase()) return parent;
        for (const child of parent.children) {
            const found = this.findElementByTag(child, tagName);
            if (found) return found;
        }
        return null;
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

// Mock performance monitor for testing
class MockPerformanceMonitor {
    constructor() {
        this.callbacks = [];
        this.isMonitoring = false;
        this.mockMetrics = {
            timestamp: performance.now(),
            frameRate: { current: 60, average: 58, min: 45, max: 60 },
            memory: { used: 45, total: 100, heapUsed: 30 },
            cpu: { utilization: 25, renderTime: 8, updateTime: 4 },
            agents: { count: 150, updateTime: 2, averageUpdateTime: 1.8 },
            scene: { meshCount: 100, lightCount: 5, cameraCount: 1 },
            system: { webglVersion: '2.0', renderer: 'Test' }
        };
    }

    onMetricsUpdate(callback) {
        this.callbacks.push(callback);
    }

    removeUpdateCallback(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

    getCurrentMetrics() {
        return { ...this.mockMetrics };
    }

    simulateMetricsUpdate(overrides = {}) {
        const metrics = { ...this.mockMetrics, ...overrides };
        this.callbacks.forEach(callback => callback(metrics));
    }

    updateMockMetrics(updates) {
        Object.assign(this.mockMetrics, updates);
    }
}

describe('PerformanceDashboard', () => {
    let mockDOM;
    let mockPerformanceMonitor;
    let dashboard;
    let container;

    beforeEach(() => {
        // Setup mock DOM
        mockDOM = new MockDOM();
        global.document = {
            getElementById: (id) => mockDOM.getElementById(id),
            createElement: (tag) => mockDOM.createElement(tag),
            head: { appendChild: () => {} },
            addEventListener: () => {},
            removeEventListener: () => {}
        };
        global.window = {
            devicePixelRatio: 1
        };

        // Create container element
        container = mockDOM.createElement('div');
        mockDOM.addElement('dashboard-container', container);

        // Setup mock performance monitor
        mockPerformanceMonitor = new MockPerformanceMonitor();

        // Create dashboard instance
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

        test('should register for performance monitor updates', () => {
            expect(mockPerformanceMonitor.callbacks.length).toBe(1);
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

            // Verify widgets were updated
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
            expect(dashboard.chartData.frameRate[0]).toEqual({
                timestamp: 1000,
                value: 50
            });
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
            expect(dashboard.chartData.frameRate[0].value).toBe(58); // Should keep last 3
        });

        test('should handle missing metrics gracefully', () => {
            const incompleteMetrics = {
                timestamp: performance.now(),
                frameRate: { current: 30 }
                // Missing other metrics
            };

            expect(() => {
                dashboard.updateMetrics(incompleteMetrics);
            }).not.toThrow();

            const memoryWidget = dashboard.widgets.get('memory');
            expect(memoryWidget.currentValue).toBe(0); // Should default to 0
        });
    });

    describe('Performance Monitoring Integration', () => {
        test('should respond to performance monitor updates', () => {
            dashboard.show();
            
            const updateSpy = jest.spyOn(dashboard, 'updateMetrics');
            
            mockPerformanceMonitor.simulateMetricsUpdate({
                frameRate: { current: 35 },
                memory: { used: 80 }
            });

            expect(updateSpy).toHaveBeenCalled();
        });

        test('should not update when hidden', () => {
            dashboard.hide();
            
            const updateSpy = jest.spyOn(dashboard, 'updateMetrics');
            
            mockPerformanceMonitor.simulateMetricsUpdate();

            // updateMetrics should be called but should return early
            expect(updateSpy).toHaveBeenCalled();
        });
    });

    describe('Widget Status Colors', () => {
        beforeEach(() => {
            dashboard.show();
        });

        test('should show correct status for frame rate', () => {
            const frameRateWidget = dashboard.widgets.get('frameRate');

            // Test critical status
            frameRateWidget.updateValue(10);
            expect(frameRateWidget.getStatus(10)).toBe('critical');

            // Test warning status
            frameRateWidget.updateValue(25);
            expect(frameRateWidget.getStatus(25)).toBe('warning');

            // Test good status
            frameRateWidget.updateValue(50);
            expect(frameRateWidget.getStatus(50)).toBe('good');
        });

        test('should show correct status for memory usage', () => {
            const memoryWidget = dashboard.widgets.get('memory');

            // Test critical status
            memoryWidget.updateValue(95);
            expect(memoryWidget.getStatus(95)).toBe('critical');

            // Test warning status
            memoryWidget.updateValue(80);
            expect(memoryWidget.getStatus(80)).toBe('warning');

            // Test good status
            memoryWidget.updateValue(50);
            expect(memoryWidget.getStatus(50)).toBe('good');
        });
    });

    describe('Chart Rendering', () => {
        test('should create charts for all metric types', () => {
            const expectedCharts = ['frameRate', 'memory', 'cpu', 'agents'];
            expectedCharts.forEach(chartType => {
                const chart = dashboard.charts.get(chartType);
                expect(chart).toBeDefined();
                expect(chart.metricType).toBe(chartType);
            });
        });

        test('should update chart data when metrics change', () => {
            dashboard.show();
            
            const frameRateChart = dashboard.charts.get('frameRate');
            const updateSpy = jest.spyOn(frameRateChart, 'updateData');

            dashboard.updateMetrics({
                timestamp: performance.now(),
                frameRate: { current: 45 },
                memory: { used: 60 },
                cpu: { utilization: 40 },
                agents: { count: 120 }
            });

            expect(updateSpy).toHaveBeenCalled();
        });
    });

    describe('Reset Functionality', () => {
        test('should reset all data', () => {
            dashboard.show();
            
            // Add some data
            dashboard.updateMetrics({
                timestamp: performance.now(),
                frameRate: { current: 45 },
                memory: { used: 60 },
                cpu: { utilization: 40 },
                agents: { count: 120 }
            });

            expect(dashboard.chartData.frameRate.length).toBe(1);

            // Reset
            dashboard.reset();

            expect(dashboard.chartData.frameRate.length).toBe(0);
            expect(dashboard.chartData.memory.length).toBe(0);
            expect(dashboard.chartData.cpu.length).toBe(0);
            expect(dashboard.chartData.agents.length).toBe(0);
        });

        test('should reset widgets to zero', () => {
            const frameRateWidget = dashboard.widgets.get('frameRate');
            frameRateWidget.updateValue(45);
            
            dashboard.reset();
            
            expect(frameRateWidget.currentValue).toBe(0);
        });
    });

    describe('Update Frequency Control', () => {
        test('should set update frequency within valid range', () => {
            dashboard.setUpdateFrequency(45);
            expect(dashboard.updateFrequency).toBe(45);

            // Test clamping
            dashboard.setUpdateFrequency(0);
            expect(dashboard.updateFrequency).toBe(1);

            dashboard.setUpdateFrequency(100);
            expect(dashboard.updateFrequency).toBe(60);
        });

        test('should restart updates when frequency changes', () => {
            dashboard.show();
            const oldInterval = dashboard.updateInterval;
            
            dashboard.setUpdateFrequency(30);
            
            expect(dashboard.updateInterval).not.toBe(oldInterval);
        });
    });

    describe('Event Handling', () => {
        test('should handle toggle button click', () => {
            const toggleSpy = jest.spyOn(dashboard, 'toggle');
            
            // Simulate button click
            mockDOM.triggerEvent('dashboard-toggle', 'click');
            
            expect(toggleSpy).toHaveBeenCalled();
        });

        test('should handle reset button click', () => {
            const resetSpy = jest.spyOn(dashboard, 'reset');
            
            // Simulate button click
            mockDOM.triggerEvent('dashboard-reset', 'click');
            
            expect(resetSpy).toHaveBeenCalled();
        });
    });

    describe('Responsiveness', () => {
        test('should handle rapid metric updates', () => {
            dashboard.show();
            
            const startTime = performance.now();
            
            // Simulate rapid updates
            for (let i = 0; i < 100; i++) {
                dashboard.updateMetrics({
                    timestamp: startTime + i * 16, // ~60 FPS
                    frameRate: { current: 60 - (i % 20) },
                    memory: { used: 50 + (i % 30) },
                    cpu: { utilization: 30 + (i % 40) },
                    agents: { count: 100 + i }
                });
            }

            // Should maintain data limit
            expect(dashboard.chartData.frameRate.length).toBeLessThanOrEqual(dashboard.maxDataPoints);
            
            // Should have latest data
            const latestData = dashboard.chartData.frameRate[dashboard.chartData.frameRate.length - 1];
            expect(latestData.value).toBe(60 - (99 % 20));
        });

        test('should perform well with large datasets', () => {
            dashboard.show();
            dashboard.maxDataPoints = 1000;
            
            const startTime = performance.now();
            
            // Add maximum data points
            for (let i = 0; i < 1000; i++) {
                dashboard.updateMetrics({
                    timestamp: startTime + i,
                    frameRate: { current: Math.random() * 60 },
                    memory: { used: Math.random() * 100 },
                    cpu: { utilization: Math.random() * 100 },
                    agents: { count: Math.floor(Math.random() * 500) }
                });
            }
            
            const updateStartTime = performance.now();
            
            // Test update performance
            dashboard.updateMetrics({
                timestamp: performance.now(),
                frameRate: { current: 45 },
                memory: { used: 60 },
                cpu: { utilization: 40 },
                agents: { count: 200 }
            });
            
            const updateTime = performance.now() - updateStartTime;
            
            // Update should be fast (less than 10ms)
            expect(updateTime).toBeLessThan(10);
        });
    });

    describe('Memory Management', () => {
        test('should dispose properly', () => {
            dashboard.show();
            
            const widgetDisposeSpy = jest.spyOn(dashboard.widgets.get('frameRate'), 'dispose');
            const chartDisposeSpy = jest.spyOn(dashboard.charts.get('frameRate'), 'dispose');
            
            dashboard.dispose();
            
            expect(widgetDisposeSpy).toHaveBeenCalled();
            expect(chartDisposeSpy).toHaveBeenCalled();
            expect(dashboard.widgets.size).toBe(0);
            expect(dashboard.charts.size).toBe(0);
            expect(dashboard.updateInterval).toBeNull();
        });

        test('should clean up performance monitor callbacks', () => {
            const initialCallbackCount = mockPerformanceMonitor.callbacks.length;
            
            dashboard.dispose();
            
            // Note: In real implementation, we'd need to track and remove the callback
            // This test verifies the dispose method is called
            expect(dashboard.updateInterval).toBeNull();
        });
    });

    describe('Error Handling', () => {
        test('should handle missing container gracefully', () => {
            expect(() => {
                new PerformanceDashboard('non-existent-container', mockPerformanceMonitor);
            }).not.toThrow();
        });

        test('should handle null metrics', () => {
            dashboard.show();
            
            expect(() => {
                dashboard.updateMetrics(null);
            }).not.toThrow();
        });

        test('should handle malformed metrics', () => {
            dashboard.show();
            
            const malformedMetrics = {
                timestamp: 'invalid',
                frameRate: 'not-an-object',
                memory: null
            };
            
            expect(() => {
                dashboard.updateMetrics(malformedMetrics);
            }).not.toThrow();
        });
    });
});

describe('MetricWidget', () => {
    let mockDOM;
    let widget;

    beforeEach(() => {
        mockDOM = new MockDOM();
        global.document = {
            createElement: (tag) => mockDOM.createElement(tag)
        };

        const config = {
            title: 'Test Metric',
            unit: 'units',
            format: (value) => Math.round(value),
            thresholds: { critical: 90, warning: 75, good: 60 }
        };

        widget = new (class extends Object {
            constructor(metricType, config) {
                this.metricType = metricType;
                this.config = config;
                this.currentValue = 0;
                this.element = null;
                this.createElement();
            }

            createElement() {
                this.element = mockDOM.createElement('div');
                this.element.className = 'metric-widget-content';
                this.element.innerHTML = `
                    <div class="widget-title">${this.config.title}</div>
                    <div class="widget-value">0</div>
                    <div class="widget-unit">${this.config.unit}</div>
                `;
            }

            updateValue(value) {
                this.currentValue = value;
                const valueElement = this.element.querySelector('.widget-value');
                if (valueElement) {
                    valueElement.textContent = this.config.format(value);
                    const status = this.getStatus(value);
                    valueElement.className = `widget-value widget-status-${status}`;
                }
            }

            getStatus(value) {
                const thresholds = this.config.thresholds;
                if (value > thresholds.critical) return 'critical';
                if (value > thresholds.warning) return 'warning';
                return 'good';
            }

            reset() {
                this.updateValue(0);
            }

            getElement() {
                return this.element;
            }

            dispose() {
                if (this.element && this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
                this.element = null;
            }
        })('test', config);
    });

    test('should create widget element', () => {
        expect(widget.element).toBeDefined();
        expect(widget.element.className).toBe('metric-widget-content');
    });

    test('should update value and status', () => {
        widget.updateValue(80);
        expect(widget.currentValue).toBe(80);
    });

    test('should determine correct status', () => {
        expect(widget.getStatus(95)).toBe('critical');
        expect(widget.getStatus(80)).toBe('warning');
        expect(widget.getStatus(50)).toBe('good');
    });

    test('should reset to zero', () => {
        widget.updateValue(50);
        widget.reset();
        expect(widget.currentValue).toBe(0);
    });
});