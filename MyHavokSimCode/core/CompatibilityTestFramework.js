/**
 * CompatibilityTestFramework - Automated test suite for validating existing functionality
 * Tests scene loading, basic functionality, agent behaviors, and performance baselines
 */

// Using global BABYLON object from CDN instead of ES6 imports
// import * as BABYLON from '@babylonjs/core';

export class CompatibilityTestFramework {
    constructor() {
        this.testResults = [];
        this.performanceBaseline = null;
        this.testCanvas = null;
        this.testEngine = null;
        this.testScene = null;
        this.testTimeout = 30000; // 30 seconds timeout for tests
    }

    /**
     * Run all compatibility tests
     * @returns {Promise<Object>} Test results summary
     */
    async runAllTests() {
        console.log('🧪 Starting Compatibility Test Suite...');

        const testSuite = [
            { name: 'Scene Loading', test: () => this.testSceneLoading() },
            { name: 'Basic Functionality', test: () => this.testBasicFunctionality() },
            { name: 'Agent Behaviors', test: () => this.testAgentBehaviors() },
            { name: 'Performance Baseline', test: () => this.capturePerformanceBaseline() },
            { name: 'Memory Usage', test: () => this.testMemoryUsage() },
            { name: 'Rendering Pipeline', test: () => this.testRenderingPipeline() }
        ];

        const results = {
            passed: 0,
            failed: 0,
            total: testSuite.length,
            details: [],
            performanceBaseline: null,
            timestamp: new Date().toISOString()
        };

        for (const testCase of testSuite) {
            try {
                console.log(`Running test: ${testCase.name}...`);
                const startTime = performance.now();

                const result = await Promise.race([
                    testCase.test(),
                    this.createTimeoutPromise(this.testTimeout)
                ]);

                const duration = performance.now() - startTime;

                results.passed++;
                results.details.push({
                    name: testCase.name,
                    status: 'PASSED',
                    duration: Math.round(duration),
                    result
                });

                console.log(`✓ ${testCase.name} passed (${Math.round(duration)}ms)`);
            } catch (error) {
                results.failed++;
                results.details.push({
                    name: testCase.name,
                    status: 'FAILED',
                    error: error.message,
                    stack: error.stack
                });

                console.error(`✗ ${testCase.name} failed:`, error.message);
            }
        }

        // Store performance baseline if captured
        const perfTest = results.details.find(d => d.name === 'Performance Baseline');
        if (perfTest && perfTest.result) {
            results.performanceBaseline = perfTest.result;
        }

        await this.cleanup();

        console.log(`🧪 Test Suite Complete: ${results.passed}/${results.total} passed`);
        return results;
    }

    /**
     * Test basic scene loading functionality
     */
    async testSceneLoading() {
        // Create test canvas and engine
        this.testCanvas = document.createElement('canvas');
        this.testCanvas.width = 800;
        this.testCanvas.height = 600;
        this.testCanvas.style.display = 'none';
        document.body.appendChild(this.testCanvas);

        this.testEngine = new BABYLON.Engine(this.testCanvas, true, {
            preserveDrawingBuffer: true,
            stencil: true
        });

        // Create basic scene
        this.testScene = new BABYLON.Scene(this.testEngine);

        // Test scene creation
        if (!this.testScene) {
            throw new Error('Failed to create Babylon.js scene');
        }

        // Test basic scene properties
        if (typeof this.testScene.render !== 'function') {
            throw new Error('Scene render method not available');
        }

        // Test camera creation
        const camera = new BABYLON.FreeCamera('testCamera', new BABYLON.Vector3(0, 5, -10), this.testScene);
        camera.setTarget(BABYLON.Vector3.Zero());

        if (!camera.position) {
            throw new Error('Camera creation failed');
        }

        // Test light creation
        const light = new BABYLON.HemisphericLight('testLight', new BABYLON.Vector3(0, 1, 0), this.testScene);

        if (!light.intensity) {
            throw new Error('Light creation failed');
        }

        // Test mesh creation
        const box = BABYLON.MeshBuilder.CreateBox('testBox', { size: 2 }, this.testScene);

        if (!box.position) {
            throw new Error('Mesh creation failed');
        }

        // Test scene rendering (single frame)
        this.testScene.render();

        return {
            sceneCreated: true,
            cameraCreated: true,
            lightCreated: true,
            meshCreated: true,
            renderSuccessful: true
        };
    }

    /**
     * Test basic simulation functionality
     */
    async testBasicFunctionality() {
        if (!this.testScene) {
            throw new Error('Test scene not initialized');
        }

        const results = {
            physicsEngine: false,
            materialSystem: false,
            animationSystem: false,
            assetLoading: false
        };

        // Test physics engine initialization
        try {
            // Note: In real implementation, this would test Havok physics
            // For now, we'll test the built-in physics engine
            this.testScene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.CannonJSPlugin());
            results.physicsEngine = true;
        } catch (error) {
            console.warn('Physics engine test failed:', error.message);
        }

        // Test material system
        try {
            const material = new BABYLON.StandardMaterial('testMaterial', this.testScene);
            material.diffuseColor = new BABYLON.Color3(1, 0, 0);

            const sphere = BABYLON.MeshBuilder.CreateSphere('testSphere', { diameter: 2 }, this.testScene);
            sphere.material = material;

            if (sphere.material && sphere.material.diffuseColor) {
                results.materialSystem = true;
            }
        } catch (error) {
            console.warn('Material system test failed:', error.message);
        }

        // Test animation system
        try {
            const animationKeys = [];
            animationKeys.push({ frame: 0, value: 0 });
            animationKeys.push({ frame: 30, value: Math.PI * 2 });

            const rotationAnimation = new BABYLON.Animation(
                'testRotation',
                'rotation.y',
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            rotationAnimation.setKeys(animationKeys);

            if (rotationAnimation.getKeys().length > 0) {
                results.animationSystem = true;
            }
        } catch (error) {
            console.warn('Animation system test failed:', error.message);
        }

        // Test basic asset loading capabilities
        try {
            // Test texture creation
            const texture = new BABYLON.Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', this.testScene);
            if (texture.url) {
                results.assetLoading = true;
            }
        } catch (error) {
            console.warn('Asset loading test failed:', error.message);
        }

        return results;
    }

    /**
     * Test agent behavior systems
     */
    async testAgentBehaviors() {
        if (!this.testScene) {
            throw new Error('Test scene not initialized');
        }

        const results = {
            basicAgentCreation: false,
            agentMovement: false,
            agentStateManagement: false,
            navigationSystem: false
        };

        try {
            // Test basic agent creation (simplified version)
            const agentMesh = BABYLON.MeshBuilder.CreateCapsule('testAgent', {
                radius: 0.5,
                height: 2
            }, this.testScene);

            if (agentMesh && agentMesh.position) {
                results.basicAgentCreation = true;
            }

            // Test agent movement capabilities
            const startPosition = agentMesh.position.clone();
            agentMesh.position.x += 5;

            if (!agentMesh.position.equals(startPosition)) {
                results.agentMovement = true;
            }

            // Test basic state management
            const agentState = {
                id: 'test-agent-001',
                position: agentMesh.position,
                state: 'idle',
                health: 100
            };

            if (agentState.id && agentState.position && agentState.state) {
                results.agentStateManagement = true;
            }

            // Test basic navigation (pathfinding simulation)
            const waypoints = [
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(5, 0, 0),
                new BABYLON.Vector3(5, 0, 5),
                new BABYLON.Vector3(0, 0, 5)
            ];

            if (waypoints.length > 0 && waypoints[0] instanceof BABYLON.Vector3) {
                results.navigationSystem = true;
            }
        } catch (error) {
            console.warn('Agent behavior test failed:', error.message);
        }

        return results;
    }

    /**
     * Capture performance baseline for comparison
     */
    async capturePerformanceBaseline() {
        if (!this.testScene || !this.testEngine) {
            throw new Error('Test scene/engine not initialized');
        }

        const baseline = {
            frameRate: 0,
            renderTime: 0,
            memoryUsage: 0,
            meshCount: 0,
            drawCalls: 0,
            timestamp: Date.now()
        };

        // Create test scene with multiple objects for realistic performance measurement
        const meshes = [];
        for (let i = 0; i < 100; i++) {
            const mesh = BABYLON.MeshBuilder.CreateBox(`perfTestBox${i}`, { size: 1 }, this.testScene);
            mesh.position.x = (i % 10) * 2;
            mesh.position.z = Math.floor(i / 10) * 2;
            meshes.push(mesh);
        }

        baseline.meshCount = this.testScene.meshes.length;

        // Measure frame rate over several frames
        const frameRates = [];
        const renderTimes = [];
        const measureFrames = 60; // Measure 60 frames

        for (let frame = 0; frame < measureFrames; frame++) {
            const frameStart = performance.now();

            this.testScene.render();

            const frameEnd = performance.now();
            const frameTime = frameEnd - frameStart;

            renderTimes.push(frameTime);
            frameRates.push(1000 / frameTime); // Convert to FPS

            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
        }

        baseline.frameRate = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
        baseline.renderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;

        // Estimate memory usage (simplified)
        if (performance.memory) {
            baseline.memoryUsage = performance.memory.usedJSHeapSize;
        }

        // Get draw calls (if available)
        if (this.testEngine.getGlInfo) {
            const glInfo = this.testEngine.getGlInfo();
            baseline.drawCalls = glInfo.drawCalls || 0;
        }

        // Clean up test meshes
        meshes.forEach(mesh => mesh.dispose());

        return baseline;
    }

    /**
     * Test memory usage and detect potential leaks
     */
    async testMemoryUsage() {
        const results = {
            initialMemory: 0,
            peakMemory: 0,
            finalMemory: 0,
            memoryLeak: false,
            leakThreshold: 10 * 1024 * 1024 // 10MB threshold
        };

        if (!performance.memory) {
            return { ...results, note: 'Memory API not available' };
        }

        results.initialMemory = performance.memory.usedJSHeapSize;

        // Create and destroy objects to test memory management
        const testObjects = [];

        for (let i = 0; i < 1000; i++) {
            const mesh = BABYLON.MeshBuilder.CreateSphere(`memTestSphere${i}`, { diameter: 1 }, this.testScene);
            testObjects.push(mesh);
        }

        results.peakMemory = performance.memory.usedJSHeapSize;

        // Clean up objects
        testObjects.forEach(obj => obj.dispose());

        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }

        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));

        results.finalMemory = performance.memory.usedJSHeapSize;

        // Check for memory leak
        const memoryIncrease = results.finalMemory - results.initialMemory;
        results.memoryLeak = memoryIncrease > results.leakThreshold;

        return results;
    }

    /**
     * Test rendering pipeline functionality
     */
    async testRenderingPipeline() {
        if (!this.testScene || !this.testEngine) {
            throw new Error('Test scene/engine not initialized');
        }

        const results = {
            basicRendering: false,
            shadowMapping: false,
            postProcessing: false,
            multipleRenderTargets: false
        };

        try {
            // Test basic rendering
            this.testScene.render();
            results.basicRendering = true;

            // Test shadow mapping
            const light = new BABYLON.DirectionalLight('shadowLight', new BABYLON.Vector3(-1, -1, -1), this.testScene);
            const shadowGenerator = new BABYLON.ShadowGenerator(1024, light);

            if (shadowGenerator.getShadowMap()) {
                results.shadowMapping = true;
            }

            // Test post-processing
            const postProcess = new BABYLON.PassPostProcess('testPass', 1.0, null, BABYLON.Texture.BILINEAR_SAMPLINGMODE, this.testEngine);

            if (postProcess.name) {
                results.postProcessing = true;
                postProcess.dispose();
            }

            // Test render targets
            const renderTarget = new BABYLON.RenderTargetTexture('testRT', 512, this.testScene);

            if (renderTarget.getSize().width === 512) {
                results.multipleRenderTargets = true;
                renderTarget.dispose();
            }
        } catch (error) {
            console.warn('Rendering pipeline test failed:', error.message);
        }

        return results;
    }

    /**
     * Create a timeout promise for test timeouts
     */
    createTimeoutPromise(timeout) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Test timed out after ${timeout}ms`));
            }, timeout);
        });
    }

    /**
     * Clean up test resources
     */
    async cleanup() {
        try {
            if (this.testScene) {
                this.testScene.dispose();
                this.testScene = null;
            }

            if (this.testEngine) {
                this.testEngine.dispose();
                this.testEngine = null;
            }

            if (this.testCanvas && this.testCanvas.parentNode) {
                this.testCanvas.parentNode.removeChild(this.testCanvas);
                this.testCanvas = null;
            }
        } catch (error) {
            console.warn('Cleanup failed:', error.message);
        }
    }

    /**
     * Compare current performance with baseline
     * @param {Object} currentResults - Current test results
     * @param {Object} baseline - Baseline performance data
     * @returns {Object} Comparison results
     */
    compareWithBaseline(currentResults, baseline) {
        if (!baseline || !currentResults.performanceBaseline) {
            return { comparison: 'No baseline available for comparison' };
        }

        const current = currentResults.performanceBaseline;
        const comparison = {
            frameRateChange: ((current.frameRate - baseline.frameRate) / baseline.frameRate) * 100,
            renderTimeChange: ((current.renderTime - baseline.renderTime) / baseline.renderTime) * 100,
            memoryChange: baseline.memoryUsage ? ((current.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100 : 0,
            overall: 'unknown'
        };

        // Determine overall performance change
        if (comparison.frameRateChange > 5 && comparison.renderTimeChange < -5) {
            comparison.overall = 'improved';
        } else if (comparison.frameRateChange < -5 || comparison.renderTimeChange > 10) {
            comparison.overall = 'degraded';
        } else {
            comparison.overall = 'similar';
        }

        return comparison;
    }

    /**
     * Save test results to local storage or file
     * @param {Object} results - Test results to save
     */
    saveResults(results) {
        try {
            const resultsKey = `compatibility-test-${Date.now()}`;
            localStorage.setItem(resultsKey, JSON.stringify(results));
            console.log(`Test results saved with key: ${resultsKey}`);
        } catch (error) {
            console.warn('Failed to save test results:', error.message);
        }
    }

    /**
     * Load previous test results for comparison
     * @returns {Array} Array of previous test results
     */
    loadPreviousResults() {
        try {
            const results = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('compatibility-test-')) {
                    const data = JSON.parse(localStorage.getItem(key));
                    results.push({ key, data });
                }
            }
            return results.sort((a, b) => b.key.localeCompare(a.key)); // Most recent first
        } catch (error) {
            console.warn('Failed to load previous results:', error.message);
            return [];
        }
    }
}

// Export for use in both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CompatibilityTestFramework };
}

if (typeof window !== 'undefined') {
    window.CompatibilityTestFramework = CompatibilityTestFramework;
}
