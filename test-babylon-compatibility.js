/**
 * Basic compatibility test for Babylon.js 8.29.0 upgrade
 * Tests core functionality to ensure the upgrade was successful
 */

// Test basic Babylon.js functionality
function testBabylonBasics() {
    console.log("Testing Babylon.js basic functionality...");
    
    // Create a test canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    try {
        // Test engine creation
        const engine = new BABYLON.Engine(canvas, true);
        console.log("✓ Engine created successfully");
        
        // Test scene creation
        const scene = new BABYLON.Scene(engine);
        console.log("✓ Scene created successfully");
        
        // Test camera creation
        const camera = new BABYLON.ArcRotateCamera(
            "testCamera",
            Math.PI / 4,
            Math.PI / 4,
            10,
            BABYLON.Vector3.Zero(),
            scene
        );
        console.log("✓ Camera created successfully");
        
        // Test light creation
        const light = new BABYLON.HemisphericLight(
            "testLight",
            new BABYLON.Vector3(0, 1, 0),
            scene
        );
        console.log("✓ Light created successfully");
        
        // Test mesh creation
        const box = BABYLON.MeshBuilder.CreateBox("testBox", {size: 2}, scene);
        console.log("✓ Mesh created successfully");
        
        // Test material creation
        const material = new BABYLON.StandardMaterial("testMaterial", scene);
        material.diffuseColor = new BABYLON.Color3(1, 0, 0);
        box.material = material;
        console.log("✓ Material created and applied successfully");
        
        // Test physics engine availability (without initializing)
        if (typeof BABYLON.HavokPlugin !== 'undefined') {
            console.log("✓ HavokPlugin available (modern API)");
        } else if (typeof BABYLON.PhysicsEnginePlugin !== 'undefined') {
            console.log("✓ PhysicsEnginePlugin available (legacy API)");
        } else {
            console.log("⚠ No Havok Physics API detected");
        }
        
        // Test GUI availability
        if (typeof BABYLON.GUI !== 'undefined') {
            console.log("✓ Babylon.js GUI available");
        } else {
            console.log("⚠ Babylon.js GUI not available");
        }
        
        // Test loaders availability
        if (typeof BABYLON.SceneLoader !== 'undefined') {
            console.log("✓ Babylon.js SceneLoader available");
        } else {
            console.log("⚠ Babylon.js SceneLoader not available");
        }
        
        // Test materials library availability
        if (typeof BABYLON.WaterMaterial !== 'undefined') {
            console.log("✓ Babylon.js Materials Library available");
        } else {
            console.log("⚠ Babylon.js Materials Library not available");
        }
        
        // Clean up
        engine.dispose();
        console.log("✓ Engine disposed successfully");
        
        return true;
    } catch (error) {
        console.error("✗ Error during Babylon.js testing:", error);
        return false;
    }
}

// Test scene initialization similar to the main application
async function testSceneInitialization() {
    console.log("Testing scene initialization...");
    
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    try {
        const engine = new BABYLON.Engine(canvas, true);
        const scene = new BABYLON.Scene(engine);
        
        // Test camera setup similar to LeoScene
        const camera = new BABYLON.ArcRotateCamera(
            "Camera",
            Math.PI / 1.5,
            Math.PI / 4,
            50,
            new BABYLON.Vector3(0, 0, 0),
            scene
        );
        camera.lowerRadiusLimit = 10;
        camera.upperRadiusLimit = 100;
        console.log("✓ Camera setup successful");
        
        // Test lighting setup
        const light = new BABYLON.HemisphericLight(
            "light",
            new BABYLON.Vector3(0, 1, 0),
            scene
        );
        console.log("✓ Lighting setup successful");
        
        // Test scene ready state
        scene.executeWhenReady(() => {
            console.log("✓ Scene ready callback executed");
        });
        
        // Test render loop
        let renderCount = 0;
        const renderLoop = () => {
            scene.render();
            renderCount++;
            if (renderCount >= 5) {
                engine.stopRenderLoop();
                console.log("✓ Render loop executed successfully");
                engine.dispose();
            }
        };
        
        engine.runRenderLoop(renderLoop);
        
        return true;
    } catch (error) {
        console.error("✗ Error during scene initialization testing:", error);
        return false;
    }
}

// Run tests when page loads
window.addEventListener('DOMContentLoaded', async () => {
    console.log("=== Babylon.js 8.29.0 Compatibility Test ===");
    
    // Check if Babylon.js is loaded
    if (typeof BABYLON === 'undefined') {
        console.error("✗ Babylon.js not loaded");
        return;
    }
    
    console.log(`✓ Babylon.js version: ${BABYLON.Engine.Version}`);
    
    // Run basic tests
    const basicTestResult = testBabylonBasics();
    
    if (basicTestResult) {
        console.log("✓ All basic tests passed");
        
        // Run scene initialization test
        await testSceneInitialization();
        
        console.log("=== Compatibility Test Complete ===");
    } else {
        console.log("✗ Basic tests failed");
    }
});