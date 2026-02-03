/**
 * Main entry point for the TypeScript ECS Village Simulation
 *
 * This file initializes the application and starts the simulation.
 */

import { GameManager } from './managers/GameManager';
import { Logger } from './utils/Logger';

const logger = new Logger();

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', async () => {
  logger.info('Main', 'DOM loaded, initializing simulation...');

  try {
    // Get canvas element
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    // Hide loading screen after initialization
    const loadingElement = document.getElementById('loading');

    // Create and initialize game manager
    const gameManager = new GameManager(canvas);
    
    logger.info('Main', 'Initializing game systems...');
    await gameManager.initialize();
    
    logger.info('Main', 'Starting simulation...');
    gameManager.start();

    // Hide loading screen
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }

    logger.info('Main', 'Simulation started successfully!');

    // Handle window resize
    window.addEventListener('resize', () => {
      gameManager.getRenderer().getEngine()?.resize();
    });

    // Expose game manager for debugging
    (window as any).gameManager = gameManager;
    logger.info('Main', 'Game manager available at window.gameManager');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Main', 'Failed to initialize simulation', errorMessage);
    
    // Show error to user
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.innerHTML = `
        <h2>Error Loading Simulation</h2>
        <p style="color: #ff6b6b;">${errorMessage}</p>
        <p>Check the console for more details (F12)</p>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
          Reload
        </button>
      `;
    }
  }
});
