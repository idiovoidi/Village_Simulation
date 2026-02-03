/**
 * BabylonRenderer
 * 
 * Manages Babylon.js engine and scene initialization.
 * Handles the render loop and window resize events.
 */

/**
 * BabylonRenderer manages the Babylon.js rendering engine and scene.
 * It initializes the engine, creates the scene, and manages the render loop.
 */
export class BabylonRenderer {
  private canvas: HTMLCanvasElement;
  private engine: any; // Babylon.Engine
  private scene: any; // Babylon.Scene
  private isRunning: boolean;

  /**
   * Creates a new BabylonRenderer.
   * 
   * @param canvas - The HTML canvas element to render to
   */
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = null;
    this.scene = null;
    this.isRunning = false;
  }

  /**
   * Initializes the Babylon.js engine and scene.
   * Loads Babylon.js from CDN if not already loaded.
   * 
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    // Wait for Babylon.js to be loaded from CDN
    await this.waitForBabylon();

    // Create engine with WebGL/WebGPU context
    const BABYLON = (window as any).BABYLON;
    
    // Try WebGPU first, fall back to WebGL
    try {
      const webGPUSupported = await BABYLON.WebGPUEngine.IsSupportedAsync;
      if (webGPUSupported) {
        this.engine = new BABYLON.WebGPUEngine(this.canvas);
        await this.engine.initAsync();
      } else {
        this.engine = new BABYLON.Engine(this.canvas, true, {
          preserveDrawingBuffer: true,
          stencil: true
        });
      }
    } catch (error) {
      // Fall back to WebGL
      this.engine = new BABYLON.Engine(this.canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true
      });
    }

    // Create scene
    this.scene = new BABYLON.Scene(this.engine);

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));

    // Enable physics (will be initialized by PhysicsSystem)
    // Scene is ready for physics plugin attachment
  }

  /**
   * Waits for Babylon.js to be loaded from CDN.
   * 
   * @returns Promise that resolves when Babylon.js is available
   */
  private async waitForBabylon(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkBabylon = () => {
        if ((window as any).BABYLON) {
          resolve();
        } else {
          setTimeout(checkBabylon, 100);
        }
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!(window as any).BABYLON) {
          reject(new Error('Babylon.js failed to load from CDN'));
        }
      }, 10000);

      checkBabylon();
    });
  }

  /**
   * Starts the render loop.
   * The render loop calls the provided callback before each frame render.
   * 
   * @param callback - Optional callback to execute before each render
   */
  startRenderLoop(callback?: () => void): void {
    if (!this.engine || !this.scene) {
      throw new Error('BabylonRenderer not initialized. Call initialize() first.');
    }

    this.isRunning = true;

    this.engine.runRenderLoop(() => {
      if (callback) {
        callback();
      }
      this.scene.render();
    });
  }

  /**
   * Stops the render loop.
   */
  stopRenderLoop(): void {
    if (this.engine) {
      this.engine.stopRenderLoop();
      this.isRunning = false;
    }
  }

  /**
   * Handles window resize events.
   * Resizes the engine to match the new canvas size.
   */
  private handleResize(): void {
    if (this.engine) {
      this.engine.resize();
    }
  }

  /**
   * Gets the Babylon.js scene.
   * 
   * @returns The Babylon.js scene
   */
  getScene(): any {
    return this.scene;
  }

  /**
   * Gets the Babylon.js engine.
   * 
   * @returns The Babylon.js engine
   */
  getEngine(): any {
    return this.engine;
  }

  /**
   * Gets the canvas element.
   * 
   * @returns The HTML canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Checks if the render loop is running.
   * 
   * @returns true if the render loop is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Disposes of the renderer and cleans up resources.
   */
  dispose(): void {
    this.stopRenderLoop();

    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }

    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }

    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
