/**
 * New Village Engine - Main entry point for the 3D Village Simulation
 * Uses the new Entity-Component-System architecture with composition over inheritance
 */

import { 
  SimulationError, 
  catchErrors, 
  handleAsyncErrors, 
  logMethod, 
  measurePerformance, 
  validateArgs 
} from './core/ErrorHandling.js';
import { SimulationSetup } from './core/SimulationSetup.js';

export class VillageEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = null;
    this.scene = null;
    this.simulation = null;
    this.camera = null;
    this.light = null;
    this.initialized = false;
    this.lastTime = 0;
  }
  
  /**
   * Initialize the engine and scene
   */
  initialize() {
    console.log("Initializing VillageEngine...");
    
    // Create Babylon.js engine
    this.engine = this.createEngine();
    
    // Create scene
    this.scene = this.createScene();
    
    // Set up camera
    this.camera = this.createCamera();
    
    // Set up lighting
    this.light = this.createLighting();
    
    // Initialize simulation
    this.simulation = new SimulationSetup(this.canvas, this.scene);
    return this.simulation.initialize()
      .then(() => {
        // Start render loop
        this.startRenderLoop();
        
        // Handle window resize
        window.addEventListener('resize', () => this.engine.resize());
        
        this.initialized = true;
        console.log("VillageEngine initialization complete");
        
        return this;
      })
      .catch(error => {
        if (error instanceof SimulationError) {
          throw error;
        } else {
          throw new SimulationError(`Error in initialize: ${error.message}`);
        }
      });
  }
  
  /**
   * Create Babylon.js engine
   * @returns {BABYLON.Engine} Babylon.js engine
   */
  createEngine() {
    try {
      // Enable performance monitoring in engine options
      const engineOptions = {
        deterministicLockstep: true,
        lockstepMaxSteps: 4,
        useHighPrecisionMatrix: true,
        performanceMonitoringEnabled: true,
        adaptToDeviceRatio: true
      };
      
      const engine = new BABYLON.Engine(this.canvas, true, engineOptions);
      
      // Enable hardware scaling
      engine.setHardwareScalingLevel(1.0);
      
      return engine;
    } catch (error) {
      throw new SimulationError(`Failed to create engine: ${error.message}`);
    }
  }
  
  /**
   * Create Babylon.js scene
   * @returns {BABYLON.Scene} Babylon.js scene
   */
  createScene() {
    try {
      const scene = new BABYLON.Scene(this.engine);
      
      // Enable performance optimization flags
      scene.skipPointerMovePicking = true;
      scene.autoClear = false; // Manually clear between frames
      scene.autoClearDepthAndStencil = false;
      scene.blockMaterialDirtyMechanism = true;
      
      // Optimize meshes
      scene.useGeometryIdsMap = true;
      scene.useMaterialMeshMap = true;
      scene.useClonedMeshMap = true;
      
      // Set up environment
      scene.clearColor = new BABYLON.Color3(0.5, 0.8, 1.0);
      
      // Add FPS counter and performance metrics
      this.addPerformanceMetrics(scene);
      
      return scene;
    } catch (error) {
      throw new SimulationError(`Failed to create scene: ${error.message}`);
    }
  }
  
  /**
   * Create camera
   * @returns {BABYLON.Camera} Camera
   */
  createCamera() {
    try {
      const camera = new BABYLON.ArcRotateCamera(
        "Camera",
        Math.PI / 1.5,
        Math.PI / 4,
        50,
        new BABYLON.Vector3(0, 0, 0),
        this.scene
      );
      
      camera.attachControl(this.canvas, true);
      camera.lowerRadiusLimit = 10;
      camera.upperRadiusLimit = 100;
      camera.wheelPrecision = 10;
      camera.pinchPrecision = 50;
      
      return camera;
    } catch (error) {
      throw new SimulationError(`Failed to create camera: ${error.message}`);
    }
  }
  
  /**
   * Create lighting
   * @returns {BABYLON.Light} Main light
   */
  createLighting() {
    try {
      // Hemispheric light for ambient lighting
      const hemiLight = new BABYLON.HemisphericLight(
        "hemiLight",
        new BABYLON.Vector3(0, 1, 0),
        this.scene
      );
      hemiLight.intensity = 0.5;
      hemiLight.diffuse = new BABYLON.Color3(1, 1, 1);
      hemiLight.groundColor = new BABYLON.Color3(0.2, 0.2, 0.3);
      
      // Directional light for shadows
      const dirLight = new BABYLON.DirectionalLight(
        "dirLight",
        new BABYLON.Vector3(-0.5, -1, -0.5),
        this.scene
      );
      dirLight.intensity = 0.7;
      dirLight.diffuse = new BABYLON.Color3(1, 0.9, 0.8);
      
      // Set up shadows
      const shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight);
      shadowGenerator.useBlurExponentialShadowMap = true;
      shadowGenerator.blurKernel = 32;
      
      // Store shadow generator for later use
      this.shadowGenerator = shadowGenerator;
      
      return dirLight;
    } catch (error) {
      throw new SimulationError(`Failed to create lighting: ${error.message}`);
    }
  }
  
  /**
   * Add performance metrics display
   * @param {BABYLON.Scene} scene - Babylon.js scene
   */
  addPerformanceMetrics(scene) {
    try {
      // Create performance monitor GUI
      const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("performanceUI");
      
      const fpsText = new BABYLON.GUI.TextBlock();
      fpsText.text = "FPS: 0";
      fpsText.color = "white";
      fpsText.fontSize = 16;
      fpsText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      fpsText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
      fpsText.top = "10px";
      fpsText.left = "10px";
      advancedTexture.addControl(fpsText);
      
      const drawCallsText = new BABYLON.GUI.TextBlock();
      drawCallsText.text = "Draw Calls: 0";
      drawCallsText.color = "white";
      drawCallsText.fontSize = 16;
      drawCallsText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      drawCallsText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
      drawCallsText.top = "30px";
      drawCallsText.left = "10px";
      advancedTexture.addControl(drawCallsText);
      
      // Update metrics every frame
      scene.onBeforeRenderObservable.add(() => {
        fpsText.text = `FPS: ${Math.round(this.engine.getFps())}`;
        drawCallsText.text = `Draw Calls: ${scene.getActiveMeshes().length}`;
      });
    } catch (error) {
      throw new SimulationError(`Failed to add performance metrics: ${error.message}`);
    }
  }
  
  /**
   * Start the render loop
   */
  startRenderLoop() {
    try {
      this.lastTime = performance.now();
      
      // Run the render loop
      this.engine.runRenderLoop(() => this.update());
    } catch (error) {
      throw new SimulationError(`Failed to start render loop: ${error.message}`);
    }
  }
  
  /**
   * Update method called each frame
   */
  update() {
    try {
      // Calculate delta time
      const currentTime = performance.now();
      const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
      this.lastTime = currentTime;
      
      // Update simulation
      if (this.simulation) {
        this.simulation.update(deltaTime);
      }
      
      // Render scene
      this.scene.render();
    } catch (error) {
      console.error(`Error in update: ${error.message}`);
      // Don't throw here to avoid breaking the render loop
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (!this.initialized) return;
    
    try {
      console.log("Disposing VillageEngine...");
      
      // Stop render loop
      this.engine.stopRenderLoop();
      
      // Dispose simulation
      if (this.simulation) {
        this.simulation.dispose();
        this.simulation = null;
      }
      
      // Dispose scene
      if (this.scene) {
        this.scene.dispose();
        this.scene = null;
      }
      
      // Dispose engine
      if (this.engine) {
        this.engine.dispose();
        this.engine = null;
      }
      
      this.initialized = false;
    } catch (error) {
      throw new SimulationError(`Failed to dispose engine: ${error.message}`);
    }
  }
}

// Apply decorators programmatically (compatible with standard JavaScript)
// This technique works without requiring experimental decorator syntax
VillageEngine.prototype.initialize = handleAsyncErrors(SimulationError)(
  VillageEngine.prototype,
  'initialize',
  Object.getOwnPropertyDescriptor(VillageEngine.prototype, 'initialize')
).value;

VillageEngine.prototype.createEngine = catchErrors(SimulationError)(
  VillageEngine.prototype,
  'createEngine',
  Object.getOwnPropertyDescriptor(VillageEngine.prototype, 'createEngine')
).value;

VillageEngine.prototype.createScene = catchErrors(SimulationError)(
  VillageEngine.prototype,
  'createScene',
  Object.getOwnPropertyDescriptor(VillageEngine.prototype, 'createScene')
).value;

VillageEngine.prototype.createCamera = catchErrors(SimulationError)(
  VillageEngine.prototype,
  'createCamera',
  Object.getOwnPropertyDescriptor(VillageEngine.prototype, 'createCamera')
).value;

VillageEngine.prototype.createLighting = catchErrors(SimulationError)(
  VillageEngine.prototype,
  'createLighting',
  Object.getOwnPropertyDescriptor(VillageEngine.prototype, 'createLighting')
).value;

VillageEngine.prototype.startRenderLoop = catchErrors(SimulationError)(
  VillageEngine.prototype,
  'startRenderLoop',
  Object.getOwnPropertyDescriptor(VillageEngine.prototype, 'startRenderLoop')
).value;

VillageEngine.prototype.update = logMethod('debug')(
  VillageEngine.prototype,
  'update',
  Object.getOwnPropertyDescriptor(VillageEngine.prototype, 'update')
).value;

VillageEngine.prototype.update = measurePerformance(
  VillageEngine.prototype,
  'update',
  Object.getOwnPropertyDescriptor(VillageEngine.prototype, 'update')
).value;

VillageEngine.prototype.dispose = catchErrors(SimulationError)(
  VillageEngine.prototype,
  'dispose',
  Object.getOwnPropertyDescriptor(VillageEngine.prototype, 'dispose')
).value; 