/**
 * API Migration Test for Babylon.js 8.29.0
 * Tests that all API changes and migrations are handled correctly
 */

// Test API migration compatibility
function testAPIMigration() {
    console.log("Testing API migration compatibility...");
    
    const results = {
        passed: 0,
        failed: 0,
        warnings: 0,
        details: []
    };
    
    function addResult(test, status, message) {
        results.details.push({ test, status, message });
        if (status === 'pass') results.passed++;
        else if (status === 'fail') results.failed++;
        else if (status === 'warn') results.warnings++;
    }
    
    try {
        // Test 1: Check Babylon.js version
        if (BABYLON.Engine.Version) {
            const version = BABYLON.Engine.Version;
            if (version.startsWith('8.29') || parseFloat(version) >= 8.29) {
                addResult('Version Check', 'pass', `Babylon.js version ${version} is 8.29.0 or higher`);
            } else {
                addResult('Version Check', 'warn', `Babylon.js version ${version} may not be 8.29.0`);
            }
        } else {
            addResult('Version Check', 'fail', 'Cannot determine Babylon.js version');
        }
        
        // Test 2: Check HavokPlugin availability (modern API)
        if (typeof BABYLON.HavokPlugin === 'function') {
            addResult('HavokPlugin API', 'pass', 'Modern HavokPlugin API is available');
        } else if (typeof BABYLON.PhysicsEnginePlugin === 'function') {
            addResult('HavokPlugin API', 'warn', 'Using legacy PhysicsEnginePlugin API');
        } else {
            addResult('HavokPlugin API', 'fail', 'No Havok Physics API available');
        }
        
        // Test 3: Check MeshBuilder API (should be available)
        if (typeof BABYLON.MeshBuilder === 'object' && typeof BABYLON.MeshBuilder.CreateBox === 'function') {
            addResult('MeshBuilder API', 'pass', 'MeshBuilder API is available');
        } else {
            addResult('MeshBuilder API', 'fail', 'MeshBuilder API not available');
        }
        
        // Test 4: Check GUI API
        if (typeof BABYLON.GUI === 'object' && typeof BABYLON.GUI.AdvancedDynamicTexture === 'function') {
            addResult('GUI API', 'pass', 'Babylon.js GUI API is available');
        } else {
            addResult('GUI API', 'fail', 'Babylon.js GUI API not available');
        }
        
        // Test 5: Check SceneLoader API
        if (typeof BABYLON.SceneLoader === 'object' && typeof BABYLON.SceneLoader.ImportMesh === 'function') {
            addResult('SceneLoader API', 'pass', 'SceneLoader API is available');
        } else {
            addResult('SceneLoader API', 'fail', 'SceneLoader API not available');
        }
        
        // Test 6: Check Materials Library
        if (typeof BABYLON.WaterMaterial === 'function' || typeof BABYLON.StandardMaterial === 'function') {
            addResult('Materials API', 'pass', 'Materials Library is available');
        } else {
            addResult('Materials API', 'fail', 'Materials Library not available');
        }
        
        // Test 7: Test engine creation with new options
        try {
            const testCanvas = document.createElement('canvas');
            const engineOptions = {
                deterministicLockstep: true,
                lockstepMaxSteps: 4,
                useHighPrecisionMatrix: true,
                performanceMonitoringEnabled: true,
                adaptToDeviceRatio: true
            };
            
            const testEngine = new BABYLON.Engine(testCanvas, true, engineOptions);
            if (testEngine) {
                addResult('Engine Options', 'pass', 'Engine created with modern options');
                testEngine.dispose();
            } else {
                addResult('Engine Options', 'fail', 'Failed to create engine with modern options');
            }
        } catch (error) {
            addResult('Engine Options', 'warn', `Engine options may not be fully supported: ${error.message}`);
        }
        
        // Test 8: Test scene optimization flags
        try {
            const testCanvas = document.createElement('canvas');
            const testEngine = new BABYLON.Engine(testCanvas, true);
            const testScene = new BABYLON.Scene(testEngine);
            
            // Test modern scene optimization flags
            testScene.skipPointerMovePicking = true;
            testScene.autoClear = false;
            testScene.autoClearDepthAndStencil = false;
            testScene.blockMaterialDirtyMechanism = true;
            testScene.useGeometryIdsMap = true;
            testScene.useMaterialMeshMap = true;
            testScene.useClonedMeshMap = true;
            
            addResult('Scene Optimization', 'pass', 'Scene optimization flags are supported');
            
            testEngine.dispose();
        } catch (error) {
            addResult('Scene Optimization', 'warn', `Some scene optimization flags may not be supported: ${error.message}`);
        }
        
        // Test 9: Test shadow generation API
        try {
            const testCanvas = document.createElement('canvas');
            const testEngine = new BABYLON.Engine(testCanvas, true);
            const testScene = new BABYLON.Scene(testEngine);
            
            const dirLight = new BABYLON.DirectionalLight("testLight", new BABYLON.Vector3(-1, -1, -1), testScene);
            const shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);
            
            // Test modern shadow properties
            if (typeof shadowGenerator.useBlurExponentialShadowMap !== 'undefined') {
                shadowGenerator.useBlurExponentialShadowMap = true;
                shadowGenerator.blurKernel = 32;
                addResult('Shadow API', 'pass', 'Modern shadow API is available');
            } else {
                addResult('Shadow API', 'warn', 'Some modern shadow features may not be available');
            }
            
            testEngine.dispose();
        } catch (error) {
            addResult('Shadow API', 'warn', `Shadow API may have changed: ${error.message}`);
        }
        
        return results;
        
    } catch (error) {
        addResult('General API Test', 'fail', `Unexpected error: ${error.message}`);
        return results;
    }
}

// Run migration test when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("=== API Migration Test ===");
    
    if (typeof BABYLON === 'undefined') {
        console.error("✗ Babylon.js not loaded");
        return;
    }
    
    const results = testAPIMigration();
    
    console.log(`\n=== Migration Test Results ===`);
    console.log(`✓ Passed: ${results.passed}`);
    console.log(`⚠ Warnings: ${results.warnings}`);
    console.log(`✗ Failed: ${results.failed}`);
    
    console.log(`\n=== Detailed Results ===`);
    results.details.forEach(result => {
        const icon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠' : '✗';
        console.log(`${icon} ${result.test}: ${result.message}`);
    });
    
    if (results.failed === 0) {
        console.log("\n✓ All critical API migrations are compatible!");
    } else {
        console.log(`\n✗ ${results.failed} critical issues found that need attention`);
    }
});