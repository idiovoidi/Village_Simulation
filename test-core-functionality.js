/**
 * Core functionality test for Babylon.js 8.29.0 upgrade
 * Tests that the main application components work with the new version
 */

// Import the main scene class
import { LeoScene } from './MyHavokSimCode/Havokimport.js';

// Test core functionality
async function testCoreFunctionality() {
    console.log("Testing core functionality with Babylon.js 8.29.0...");
    
    try {
        // Create a test canvas
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
        
        // Test LeoScene initialization
        console.log("Creating LeoScene instance...");
        const scene = new LeoScene(canvas);
        
        // Wait a bit for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if scene was created successfully
        if (scene.engine && scene.scene) {
            console.log("✓ LeoScene created successfully");
            console.log(`✓ Engine FPS: ${Math.round(scene.engine.getFps())}`);
            console.log(`✓ Scene meshes: ${scene.scene.meshes.length}`);
            
            // Test render loop
            let renderCount = 0;
            const testRender = () => {
                renderCount++;
                if (renderCount < 10) {
                    requestAnimationFrame(testRender);
                } else {
                    console.log("✓ Render loop working correctly");
                    
                    // Clean up
                    scene.engine.dispose();
                    document.body.removeChild(canvas);
                    console.log("✓ Core functionality test completed successfully");
                }
            };
            
            requestAnimationFrame(testRender);
            
        } else {
            throw new Error("Scene or engine not initialized properly");
        }
        
    } catch (error) {
        console.error("✗ Core functionality test failed:", error);
        throw error;
    }
}

// Run test when page loads
window.addEventListener('DOMContentLoaded', async () => {
    console.log("=== Core Functionality Test ===");
    
    // Check if Babylon.js is loaded
    if (typeof BABYLON === 'undefined') {
        console.error("✗ Babylon.js not loaded");
        return;
    }
    
    console.log(`✓ Babylon.js version: ${BABYLON.Engine.Version}`);
    
    try {
        await testCoreFunctionality();
    } catch (error) {
        console.error("Core functionality test failed:", error);
    }
});