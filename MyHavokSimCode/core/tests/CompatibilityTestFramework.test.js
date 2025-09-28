/**
 * Unit tests for CompatibilityTestFramework
 * Tests the automated test suite functionality
 */

// Mock Babylon.js modules
const mockBabylon = {
    Engine: jest.fn().mockImplementation(() => ({
        dispose: jest.fn(),
        getGlInfo: jest.fn(() => ({ drawCalls: 100 }))
    })),
    Scene: jest.fn().mockImplementation(() => ({
        render: jest.fn(),
        dispose: jest.fn(),
        meshes: [],
        enablePhysics: jest.fn()
    })),
    FreeCamera: jest.fn().mockImplementation(() => ({
        position: { x: 0, y: 5, z: -10 },
        setTarget: jest.fn()
    })),
    HemisphericLight: jest.fn().mockImplementation(() => ({
        intensity: 1
    })),
    DirectionalLight: jest.fn().mockImplementation(() => ({})),
    MeshBuilder: {
        CreateBox: jest.fn(() => ({
            position: { x: 0, y: 0, z: 0 },
            dispose: jest.fn()
        })),
        CreateSphere: jest.fn(() => ({
            position: { x: 0, y: 0, z: 0 },
            material: null,
            dispose: jest.fn()
        })),
        CreateCapsule: jest.fn(() => ({
            position: { x: 0, y: 0, z: 0, clone: () => ({ x: 0, y: 0, z: 0 }), equals: () => false },
            dispose: jest.fn()
        }))
    },
    Vector3: jest.fn().mockImplementation((x, y, z) => ({ x, y, z })),
    StandardMaterial: jest.fn().mockImplementation(() => ({
        diffuseColor: null
    })),
    Color3: jest.fn().mockImplementation((r, g, b) => ({ r, g, b })),
    Animation: jest.fn().mockImplementation(() => ({
        setKeys: jest.fn(),
        getKeys: jest.fn(() => [{ frame: 0, value: 0 }])
    })),
    Texture: jest.fn().mockImplementation(() => ({
        url: 'test-url'
    })),
    ShadowGenerator: jest.fn().mockImplementation(() => ({
        getShadowMap: jest.fn(() => ({}))
    })),
    PassPostProcess: jest.fn().mockImplementation(() => ({
        name: 'testPass',
        dispose: jest.fn()
    })),
    RenderTargetTexture: jest.fn().mockImplementation(() => ({
        getSize: jest.fn(() => ({ width: 512, height: 512 })),
        dispose: jest.fn()
    })),
    CannonJSPlugin: jest.fn()
};

// Add static properties
mockBabylon.Vector3.Zero = jest.fn(() => ({ x: 0, y: 0, z: 0 }));
mockBabylon.Animation.ANIMATIONTYPE_FLOAT = 0;
mockBabylon.Animation.ANIMATIONLOOPMODE_CYCLE = 1;
mockBabylon.Texture.BILINEAR_SAMPLINGMODE = 2;

// Mock the Babylon.js import
jest.mock('@babylonjs/core', () => mockBabylon);

// Mock DOM elements
Object.defineProperty(document, 'createElement', {
    value: jest.fn(() => ({
        width: 0,
        height: 0,
        style: {},
        parentNode: {
            removeChild: jest.fn()
        }
    }))
});

Object.defineProperty(document, 'body', {
    value: {
        appendChild: jest.fn()
    }
});

// Mock performance API
Object.defineProperty(global, 'performance', {
    value: {
        now: jest.fn(() => Date.now()),
        memory: {
            usedJSHeapSize: 1024 * 1024 * 50 // 50MB
        }
    }
});

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const { CompatibilityTestFramework } = require('../CompatibilityTestFramework.js');

describe('CompatibilityTestFramework', () => {
    let framework;
    
    beforeEach(() => {
        framework = new CompatibilityTestFramework();
        jest.clearAllMocks();
        
        // Reset performance.now to return incrementing values
        let timeCounter = 0;
        performance.now.mockImplementation(() => {
            timeCounter += 16; // Simulate 60fps
            return timeCounter;
        });
    });

    describe('Constructor', () => {
        test('should initialize with default values', () => {
            expect(framework.testResults).toEqual([]);
            expect(framework.performanceBaseline).toBeNull();
            expect(framework.testTimeout).toBe(30000);
        });
    });

    describe('runAllTests', () => {
        test('should run all test cases and return results', async () => {
            // Mock individual test methods to return success
            framework.testSceneLoading = jest.fn().mockResolvedValue({ sceneCreated: true });
            framework.testBasicFunctionality = jest.fn().mockResolvedValue({ physicsEngine: true });
            framework.testAgentBehaviors = jest.fn().mockResolvedValue({ basicAgentCreation: true });
            framework.capturePerformanceBaseline = jest.fn().mockResolvedValue({ frameRate: 60 });
            framework.testMemoryUsage = jest.fn().mockResolvedValue({ memoryLeak: false });
            framework.testRenderingPipeline = jest.fn().mockResolvedValue({ basicRendering: true });
            framework.cleanup = jest.fn().mockResolvedValue();

            const results = await framework.runAllTests();

            expect(results.total).toBe(6);
            expect(results.passed).toBe(6);
            expect(results.failed).toBe(0);
            expect(results.details).toHaveLength(6);
            expect(framework.cleanup).toHaveBeenCalled();
        });

        test('should handle test failures gracefully', async () => {
            framework.testSceneLoading = jest.fn().mockRejectedValue(new Error('Scene loading failed'));
            framework.testBasicFunctionality = jest.fn().mockResolvedValue({ physicsEngine: true });
            framework.testAgentBehaviors = jest.fn().mockResolvedValue({ basicAgentCreation: true });
            framework.capturePerformanceBaseline = jest.fn().mockResolvedValue({ frameRate: 60 });
            framework.testMemoryUsage = jest.fn().mockResolvedValue({ memoryLeak: false });
            framework.testRenderingPipeline = jest.fn().mockResolvedValue({ basicRendering: true });
            framework.cleanup = jest.fn().mockResolvedValue();

            const results = await framework.runAllTests();

            expect(results.passed).toBe(5);
            expect(results.failed).toBe(1);
            expect(results.details[0].status).toBe('FAILED');
            expect(results.details[0].error).toBe('Scene loading failed');
        });

        test('should handle test timeouts', async () => {
            framework.testTimeout = 100; // Short timeout for testing
            framework.testSceneLoading = jest.fn(() => new Promise(resolve => setTimeout(resolve, 200)));
            framework.cleanup = jest.fn().mockResolvedValue();

            const results = await framework.runAllTests();

            expect(results.failed).toBeGreaterThan(0);
            const failedTest = results.details.find(d => d.status === 'FAILED');
            expect(failedTest.error).toContain('timed out');
        });
    });

    describe('testSceneLoading', () => {
        test('should successfully test scene loading', async () => {
            const result = await framework.testSceneLoading();

            expect(result.sceneCreated).toBe(true);
            expect(result.cameraCreated).toBe(true);
            expect(result.lightCreated).toBe(true);
            expect(result.meshCreated).toBe(true);
            expect(result.renderSuccessful).toBe(true);
            
            expect(mockBabylon.Engine).toHaveBeenCalled();
            expect(mockBabylon.Scene).toHaveBeenCalled();
            expect(mockBabylon.FreeCamera).toHaveBeenCalled();
        });

        test('should handle scene creation failure', async () => {
            mockBabylon.Scene.mockImplementationOnce(() => null);

            await expect(framework.testSceneLoading()).rejects.toThrow('Failed to create Babylon.js scene');
        });
    });

    describe('testBasicFunctionality', () => {
        beforeEach(async () => {
            await framework.testSceneLoading(); // Initialize test scene
        });

        test('should test basic functionality components', async () => {
            const result = await framework.testBasicFunctionality();

            expect(result).toHaveProperty('physicsEngine');
            expect(result).toHaveProperty('materialSystem');
            expect(result).toHaveProperty('animationSystem');
            expect(result).toHaveProperty('assetLoading');
        });

        test('should handle missing test scene', async () => {
            framework.testScene = null;

            await expect(framework.testBasicFunctionality()).rejects.toThrow('Test scene not initialized');
        });
    });

    describe('testAgentBehaviors', () => {
        beforeEach(async () => {
            await framework.testSceneLoading();
        });

        test('should test agent behavior systems', async () => {
            const result = await framework.testAgentBehaviors();

            expect(result).toHaveProperty('basicAgentCreation');
            expect(result).toHaveProperty('agentMovement');
            expect(result).toHaveProperty('agentStateManagement');
            expect(result).toHaveProperty('navigationSystem');
        });
    });

    describe('capturePerformanceBaseline', () => {
        beforeEach(async () => {
            await framework.testSceneLoading();
        });

        test('should capture performance metrics', async () => {
            const result = await framework.capturePerformanceBaseline();

            expect(result).toHaveProperty('frameRate');
            expect(result).toHaveProperty('renderTime');
            expect(result).toHaveProperty('memoryUsage');
            expect(result).toHaveProperty('meshCount');
            expect(result).toHaveProperty('timestamp');
            
            expect(typeof result.frameRate).toBe('number');
            expect(typeof result.renderTime).toBe('number');
        });
    });

    describe('testMemoryUsage', () => {
        test('should test memory usage and detect leaks', async () => {
            await framework.testSceneLoading();
            
            const result = await framework.testMemoryUsage();

            expect(result).toHaveProperty('initialMemory');
            expect(result).toHaveProperty('peakMemory');
            expect(result).toHaveProperty('finalMemory');
            expect(result).toHaveProperty('memoryLeak');
            expect(typeof result.memoryLeak).toBe('boolean');
        });

        test('should handle missing memory API', async () => {
            const originalMemory = performance.memory;
            delete performance.memory;

            await framework.testSceneLoading();
            const result = await framework.testMemoryUsage();

            expect(result.note).toBe('Memory API not available');
            
            performance.memory = originalMemory;
        });
    });

    describe('compareWithBaseline', () => {
        test('should compare performance with baseline', () => {
            const baseline = {
                frameRate: 60,
                renderTime: 16,
                memoryUsage: 1024 * 1024 * 50
            };

            const currentResults = {
                performanceBaseline: {
                    frameRate: 65,
                    renderTime: 15,
                    memoryUsage: 1024 * 1024 * 52
                }
            };

            const comparison = framework.compareWithBaseline(currentResults, baseline);

            expect(comparison.frameRateChange).toBeCloseTo(8.33, 1);
            expect(comparison.renderTimeChange).toBeCloseTo(-6.25, 1);
            expect(comparison.overall).toBe('improved');
        });

        test('should handle missing baseline', () => {
            const comparison = framework.compareWithBaseline({}, null);
            expect(comparison.comparison).toBe('No baseline available for comparison');
        });
    });

    describe('saveResults and loadPreviousResults', () => {
        test('should save results to localStorage', () => {
            const testResults = { passed: 5, failed: 1 };
            
            framework.saveResults(testResults);

            expect(localStorageMock.setItem).toHaveBeenCalled();
            const [key, value] = localStorageMock.setItem.mock.calls[0];
            expect(key).toMatch(/^compatibility-test-\d+$/);
            expect(JSON.parse(value)).toEqual(testResults);
        });

        test('should load previous results from localStorage', () => {
            localStorageMock.length = 2;
            localStorageMock.key
                .mockReturnValueOnce('compatibility-test-1234567890')
                .mockReturnValueOnce('other-key');
            localStorageMock.getItem.mockReturnValue(JSON.stringify({ passed: 6, failed: 0 }));

            const results = framework.loadPreviousResults();

            expect(results).toHaveLength(1);
            expect(results[0].key).toBe('compatibility-test-1234567890');
            expect(results[0].data.passed).toBe(6);
        });
    });

    describe('cleanup', () => {
        test('should clean up test resources', async () => {
            await framework.testSceneLoading();
            
            const disposeSpy = jest.spyOn(framework.testScene, 'dispose');
            const engineDisposeSpy = jest.spyOn(framework.testEngine, 'dispose');

            await framework.cleanup();

            expect(disposeSpy).toHaveBeenCalled();
            expect(engineDisposeSpy).toHaveBeenCalled();
            expect(framework.testScene).toBeNull();
            expect(framework.testEngine).toBeNull();
        });

        test('should handle cleanup errors gracefully', async () => {
            framework.testScene = { dispose: jest.fn(() => { throw new Error('Dispose failed'); }) };
            
            // Should not throw
            await expect(framework.cleanup()).resolves.toBeUndefined();
        });
    });
});

// Test configuration for Jest
module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapping: {
        '^@babylonjs/core$': '<rootDir>/__mocks__/@babylonjs/core.js'
    }
};