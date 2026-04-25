/**
 * Main Entry Point for ECS Rebuild
 *
 * This is the main entry point for the TypeScript-refactored village simulation.
 * It initializes the Babylon.js scene, Havok Physics, and all ECS systems.
 *
 * Ported from MyHavokSimCode/Havokimport.js
 */

import { GameManager } from './managers/GameManager.js';

console.log('📦 main.ts loaded');

// Get canvas element
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Canvas element not found');
}

console.log('✓ Canvas found');

// Create and initialize the game manager
const gameManager = new GameManager(canvas);

console.log('✓ GameManager created');

// Initialize and start the simulation
async function startSimulation() {
  try {
    console.log('%c🎮 Starting 3D Village Simulation (ECS Rebuild)', 'background: #2196F3; color: white; font-size: 16px; padding: 10px;');
    console.log('📍 Calling gameManager.initialize()...');

    await gameManager.initialize();

    console.log('✓ gameManager.initialize() completed');

    // Start the game loop
    console.log('📍 Calling gameManager.start()...');
    gameManager.start();
    console.log('✓ gameManager.start() completed');

    // Hide loading screen
    const loading = document.getElementById('loadingScreen');
    if (loading) {
      loading.style.display = 'none';
    }

    console.log('%c✅ Simulation started successfully!', 'color: #4CAF50; font-size: 14px;');
  } catch (error) {
    console.error('%c❌ Failed to start simulation:', 'color: #F44336; font-size: 14px;', error);

    // Show error screen
    const loadingScreen = document.getElementById('loadingScreen');
    const errorScreen = document.getElementById('errorScreen');
    const errorMessage = document.getElementById('errorMessage');

    if (loadingScreen) loadingScreen.style.display = 'none';
    if (errorScreen) errorScreen.style.display = 'flex';
    if (errorMessage) {
      errorMessage.innerHTML = `<p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
                               <p><strong>Stack:</strong></p>
                               <pre>${error instanceof Error ? error.stack || 'No stack trace available' : 'No stack trace available'}</pre>`;
    }
  }
}

// Wait for DOM to be ready
console.log('📍 DOM readyState:', document.readyState);
if (document.readyState === 'loading') {
  console.log('📍 Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', startSimulation);
} else {
  console.log('📍 DOM already ready, starting simulation...');
  startSimulation();
}

// Export for debugging
export { gameManager };