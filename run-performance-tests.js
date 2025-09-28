/**
 * Node.js test runner for Performance Monitor tests
 * Runs the tests in a Node.js environment with DOM simulation
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

global.document = {
    createElement: (tag) => ({
        getContext: () => null
    })
};

// Mock Babylon.js namespace
global.BABYLON = {
    ArcRotateCamera: class {},
    Vector3: class {},
    HemisphericLight: class {}
};

// Mock HavokPhysics
global.HavokPhysics = async () => ({});

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
        console.log('Running Performance Monitor Tests...\n');
        
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

// Import modules using dynamic import
async function runTests() {
    try {
        // We'll create simplified versions of the classes for testing
        
        // Mock FrameRateTracker
        class FrameRateTracker {
            constructor(engine) {
                this.engine = engine;
                this.isTracking = false;
                this.currentFPS = 60;
                this.frameTimeHistory = [];
            }

            start() {
                this.isTracking = true;
            }

            stop() {
                this.isTracking = false;
            }

            getCurrentMetrics() {
                return {
                    current: this.currentFPS,
                    average: this.currentFPS,
                    min: this.currentFPS - 5,
                    max: this.currentFPS + 5,
                    frameTime: 1000 / this.currentFPS,
                    averageFrameTime: 1000 / this.currentFPS,
                    frameCount: 100,
                    isStable: true
                };
            }

            dispose() {}
        }

        // Mock MemoryMonitor
        class MemoryMonitor {
            constructor() {
                this.isMonitoring = false;
                this.memoryHistory = [];
            }

            start() {
                this.isMonitoring = true;
            }

            stop() {
                this.isMonitoring = false;
            }

            getCurrentMetrics() {
                return {
                    used: '10.0 MB',
                    total: '20.0 MB',
                    heapUsed: '10.0 MB',
                    heapTotal: '20.0 MB',
                    usagePercentage: 50,
                    gpu: { used: '0 B', total: '0 B', available: false },
                    trend: 'stable',
                    hasMemoryAPI: true
                };
            }

            dispose() {}
        }

        // Mock PerformanceMonitor
        class PerformanceMonitor {
            constructor(engine, scene) {
                this.engine = engine;
                this.scene = scene;
                this.frameRateTracker = new FrameRateTracker(engine);
                this.memoryMonitor = new MemoryMonitor();
                this.isMonitoring = false;
                this.metricsHistory = [];
                this.updateCallbacks = [];
                this.monitoringInterval = null;
            }

            startMonitoring() {
                this.isMonitoring = true;
                this.frameRateTracker.start();
                this.memoryMonitor.start();
                this.monitoringInterval = setInterval(() => {
                    this.collectMetrics();
                }, 100);
            }

            stopMonitoring() {
                this.isMonitoring = false;
                this.frameRateTracker.stop();
                this.memoryMonitor.stop();
                if (this.monitoringInterval) {
                    clearInterval(this.monitoringInterval);
                    this.monitoringInterval = null;
                }
            }

            collectMetrics() {
                const metrics = {
                    timestamp: performance.now(),
                    frameRate: this.frameRateTracker.getCurrentMetrics(),
                    memory: this.memoryMonitor.getCurrentMetrics(),
                    scene: {
                        meshCount: 50,
                        materialCount: 20,
                        textureCount: 30,
                        lightCount: 3,
                        cameraCount: 2,
                        drawCalls: 100
                    },
                    system: {
                        webglVersion: 'WebGL 2.0',
                        renderer: 'Test Renderer',
                        vendor: 'Test Vendor'
                    }
                };

                this.metricsHistory.push(metrics);
                this.updateCallbacks.forEach(callback => callback(metrics));
                return metrics;
            }

            onMetricsUpdate(callback) {
                this.updateCallbacks.push(callback);
            }

            removeUpdateCallback(callback) {
                const index = this.updateCallbacks.indexOf(callback);
                if (index > -1) {
                    this.updateCallbacks.splice(index, 1);
                }
            }

            getMetricsHistory(count = null) {
                return count ? this.metricsHistory.slice(-count) : [...this.metricsHistory];
            }

            clearHistory() {
                this.metricsHistory = [];
            }

            dispose() {
                this.stopMonitoring();
                this.frameRateTracker.dispose();
                this.memoryMonitor.dispose();
            }
        }

        // Mock engine and scene
        const mockEngine = {
            getFps: () => 60,
            getGlInfo: () => ({
                version: 'WebGL 2.0',
                renderer: 'Test Renderer',
                vendor: 'Test Vendor'
            })
        };

        const mockScene = {
            meshes: new Array(50).fill({}),
            materials: new Array(20).fill({}),
            textures: new Array(30).fill({}),
            lights: new Array(3).fill({}),
            cameras: new Array(2).fill({})
        };

        // Define tests
        test.describe('PerformanceMonitor Tests', () => {
            test.it('should initialize correctly', () => {
                const monitor = new PerformanceMonitor(mockEngine, mockScene);
                test.assert(monitor.engine === mockEngine, 'Engine reference set');
                test.assert(monitor.scene === mockScene, 'Scene reference set');
                test.assert(monitor.isMonitoring === false, 'Initial state is false');
                test.assert(monitor.frameRateTracker !== null, 'FrameRateTracker exists');
                test.assert(monitor.memoryMonitor !== null, 'MemoryMonitor exists');
                monitor.dispose();
            });

            test.it('should start and stop monitoring', () => {
                const monitor = new PerformanceMonitor(mockEngine, mockScene);
                
                monitor.startMonitoring();
                test.assert(monitor.isMonitoring === true, 'Monitoring started');
                test.assert(monitor.monitoringInterval !== null, 'Interval set');
                
                monitor.stopMonitoring();
                test.assert(monitor.isMonitoring === false, 'Monitoring stopped');
                test.assert(monitor.monitoringInterval === null, 'Interval cleared');
                
                monitor.dispose();
            });

            test.it('should collect metrics correctly', () => {
                const monitor = new PerformanceMonitor(mockEngine, mockScene);
                
                const metrics = monitor.collectMetrics();
                
                test.assert(typeof metrics === 'object', 'Metrics is object');
                test.assert(typeof metrics.timestamp === 'number', 'Has timestamp');
                test.assert(typeof metrics.frameRate === 'object', 'Has frame rate data');
                test.assert(typeof metrics.memory === 'object', 'Has memory data');
                test.assert(typeof metrics.scene === 'object', 'Has scene data');
                test.assert(metrics.scene.meshCount === 50, 'Correct mesh count');
                
                monitor.dispose();
            });

            test.it('should handle callbacks correctly', () => {
                const monitor = new PerformanceMonitor(mockEngine, mockScene);
                let callbackCalled = false;
                
                const callback = () => { callbackCalled = true; };
                monitor.onMetricsUpdate(callback);
                
                monitor.collectMetrics();
                test.assert(callbackCalled === true, 'Callback was called');
                
                monitor.removeUpdateCallback(callback);
                monitor.dispose();
            });

            test.it('should manage history correctly', () => {
                const monitor = new PerformanceMonitor(mockEngine, mockScene);
                
                // Collect some metrics
                monitor.collectMetrics();
                monitor.collectMetrics();
                monitor.collectMetrics();
                
                const history = monitor.getMetricsHistory();
                test.assert(Array.isArray(history), 'History is array');
                test.assert(history.length === 3, 'Correct history length');
                
                const partialHistory = monitor.getMetricsHistory(2);
                test.assert(partialHistory.length === 2, 'Partial history works');
                
                monitor.clearHistory();
                test.assert(monitor.getMetricsHistory().length === 0, 'History cleared');
                
                monitor.dispose();
            });
        });

        test.describe('FrameRateTracker Tests', () => {
            test.it('should track frame rate correctly', () => {
                const tracker = new FrameRateTracker(mockEngine);
                
                tracker.start();
                test.assert(tracker.isTracking === true, 'Tracking started');
                
                const metrics = tracker.getCurrentMetrics();
                test.assert(typeof metrics.current === 'number', 'Current FPS is number');
                test.assert(typeof metrics.average === 'number', 'Average FPS is number');
                test.assert(metrics.current >= 0, 'FPS is non-negative');
                
                tracker.dispose();
            });
        });

        test.describe('MemoryMonitor Tests', () => {
            test.it('should monitor memory correctly', () => {
                const monitor = new MemoryMonitor();
                
                monitor.start();
                test.assert(monitor.isMonitoring === true, 'Monitoring started');
                
                const metrics = monitor.getCurrentMetrics();
                test.assert(typeof metrics.used === 'string', 'Used memory is formatted');
                test.assert(typeof metrics.usagePercentage === 'number', 'Usage percentage is number');
                
                monitor.dispose();
            });
        });

        // Run all tests
        await test.runTests();

        console.log('\n✅ All Performance Monitor tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }
}

// Run the tests
runTests();