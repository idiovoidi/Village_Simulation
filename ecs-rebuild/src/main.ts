/**
 * Entry point: boots the ECS village simulation into #renderCanvas.
 * Babylon.js and Havok are loaded from the CDN by index.html.
 */

import { GameManager } from './managers/GameManager.ts';

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element #renderCanvas not found');

const gameManager = new GameManager(canvas);

function showError(error: unknown): void {
  console.error('Failed to start simulation:', error);
  document.getElementById('loadingScreen')?.classList.add('hidden');
  const screen = document.getElementById('errorScreen');
  const message = document.getElementById('errorMessage');
  if (screen) screen.style.display = 'flex';
  if (message) {
    // textContent, never innerHTML: error text can contain arbitrary markup.
    message.replaceChildren();
    const p = document.createElement('p');
    p.textContent = error instanceof Error ? error.message : 'Unknown error';
    const pre = document.createElement('pre');
    pre.textContent = error instanceof Error ? (error.stack ?? '') : '';
    message.append(p, pre);
  }
}

async function startSimulation(): Promise<void> {
  try {
    await gameManager.initialize();
    gameManager.start();
  } catch (error) {
    showError(error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void startSimulation());
} else {
  void startSimulation();
}

// Debug hook for the browser console and automated screenshots.
(window as unknown as { __village: GameManager }).__village = gameManager;

export { gameManager };
