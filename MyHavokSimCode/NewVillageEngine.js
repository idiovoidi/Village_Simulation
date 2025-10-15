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
import { PerformanceOptimizer } from './Performance/PerformanceOptimizer.js';

export class VillageEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = null;
    this.scene = null;
    this.simulation = null;
    this.camera = null;
    this.light = null;
    this.performanceOptimizer = null;
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
        // Initialize performance optimizer
        return this.initializePerformanceOptimizer();
      })
      .then(() => {
        // Integrate simulation with performance optimizer
        if (this.performanceOptimizer && this.simulation) {
          this.simulation.setPerformanceOptimizer(this.performanceOptimizer);
        }
        
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
   * Initialize performance optimizer
   */
  async initializePerformanceOptimizer() {
    try {
      console.log("Initializing PerformanceOptimizer...");
      
      // Get the performance monitor from the simulation if available
      const performanceMonitor = this.simulation?.performanceMonitor || null;
      
      // Collect all available systems for the optimizer
      const systems = {
        performanceMonitor: performanceMonitor,
        villageEngine: this,
        simulation: this.simulation,
        // Add agent systems if available
        agentSystems: this.simulation?.agentSystems || null,
        // Add physics engine if available
        physicsEngine: this.simulation?.physicsEngine || null,
        // Add other systems as they become available
        behavioralSim: this.simulation?.behavioralSim || null,
        villageSystem: this.simulation?.villageSystem || null
      };
      
      // Create performance optimizer with all available systems
      this.performanceOptimizer = new PerformanceOptimizer(this.engine, this.scene, systems);
      
      // Set up optimization event handlers
      this.setupOptimizationEventHandlers();
      
      // Initialize the optimizer
      await this.performanceOptimizer.initialize();
      
      // Configure optimization settings based on detected hardware
      this.configureOptimizationSettings();
      
      // Start optimization by default
      this.performanceOptimizer.startOptimization();
      
      console.log("PerformanceOptimizer initialization complete");
      
    } catch (error) {
      console.error("Failed to initialize PerformanceOptimizer:", error);
      // Don't throw here - performance optimization is not critical for basic functionality
      // The simulation should still work without it
      this.performanceOptimizer = null;
    }
  }
  
  /**
   * Set up optimization event handlers
   */
  setupOptimizationEventHandlers() {
    if (!this.performanceOptimizer) return;
    
    // Handle optimization events
    this.performanceOptimizer.onOptimization((event, data) => {
      switch (event) {
        case 'started':
          console.log('Performance optimization started');
          break;
        case 'stopped':
          console.log('Performance optimization stopped');
          break;
        case 'optimization_triggered':
          console.log(`Optimization triggered: ${data.reason}`, data.data);
          this.handleOptimizationTriggered(data.reason, data.data);
          break;
        case 'level_changed':
          console.log(`Optimization level changed to: ${data.level}`);
          break;
        case 'target_fps_changed':
          console.log(`Target FPS changed to: ${data.fps}`);
          break;
        case 'adaptive_quality_changed':
          console.log(`Adaptive quality ${data.enabled ? 'enabled' : 'disabled'}`);
          break;
      }
    });
    
    // Handle performance alerts
    this.performanceOptimizer.onAlert((alert) => {
      console.warn('Performance alert:', alert);
      this.handlePerformanceAlert(alert);
    });
  }
  
  /**
   * Configure optimization settings based on hardware and preferences
   */
  configureOptimizationSettings() {
    if (!this.performanceOptimizer) return;
    
    try {
      // Set target FPS based on display refresh rate or default to 60
      const refreshRate = screen.refreshRate || 60;
      const targetFPS = Math.min(refreshRate, 60); // Cap at 60 for stability
      this.performanceOptimizer.setTargetFPS(targetFPS);
      
      // Enable adaptive quality by default
      this.performanceOptimizer.enableAdaptiveQuality(true);
      
      // Set optimization level based on hardware capabilities
      // This could be enhanced with actual hardware detection
      const optimizationLevel = this.detectOptimizationLevel();
      this.performanceOptimizer.setOptimizationLevel(optimizationLevel);
      
      console.log(`Optimization configured: ${targetFPS} FPS target, ${optimizationLevel} level`);
      
    } catch (error) {
      console.error('Failed to configure optimization settings:', error);
    }
  }
  
  /**
   * Detect appropriate optimization level based on hardware
   */
  detectOptimizationLevel() {
    try {
      // Basic hardware detection - this could be enhanced
      const canvas = this.engine.getRenderingCanvas();
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) {
        return 'conservative'; // No WebGL support
      }
      
      // Check for high-end GPU indicators
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      
      // Simple heuristics - could be improved with more sophisticated detection
      if (renderer.includes('RTX') || renderer.includes('RX 6') || renderer.includes('RX 7')) {
        return 'balanced'; // High-end GPU
      } else if (renderer.includes('GTX') || renderer.includes('RX 5')) {
        return 'balanced'; // Mid-range GPU
      } else {
        return 'conservative'; // Assume lower-end hardware
      }
      
    } catch (error) {
      console.warn('Hardware detection failed, using conservative optimization:', error);
      return 'conservative';
    }
  }
  
  /**
   * Handle optimization triggered events
   */
  handleOptimizationTriggered(reason, data) {
    // This method can be extended to handle specific optimization scenarios
    switch (reason) {
      case 'low_fps':
        console.log(`Low FPS detected: ${data.avgFPS} (target: ${data.targetFPS})`);
        // Could trigger additional engine-level optimizations here
        break;
      case 'high_memory':
        console.log(`High memory usage detected: ${data.avgMemory}%`);
        // Could trigger garbage collection or resource cleanup
        if (this.scene) {
          this.scene.cleanCachedEffects();
        }
        break;
      case 'critical_alert':
        console.warn('Critical performance alert - taking emergency measures');
        // Could disable non-essential systems
        break;
    }
  }
  
  /**
   * Handle performance alerts
   */
  handlePerformanceAlert(alert) {
    // Log the alert and potentially take action
    if (alert.severity === 'critical') {
      console.error('Critical performance issue detected:', alert);
      // Could trigger emergency optimization measures
    } else if (alert.severity === 'warning') {
      console.warn('Performance warning:', alert);
    }
  }
  
  /**
   * Get performance optimizer instance
   * @returns {PerformanceOptimizer|null} Performance optimizer instance
   */
  getPerformanceOptimizer() {
    return this.performanceOptimizer;
  }
  
  /**
   * Enable or disable performance optimization
   * @param {boolean} enabled - Whether to enable optimization
   */
  setOptimizationEnabled(enabled) {
    if (!this.performanceOptimizer) {
      console.warn('PerformanceOptimizer not available');
      return;
    }
    
    if (enabled) {
      this.performanceOptimizer.startOptimization();
    } else {
      this.performanceOptimizer.stopOptimization();
    }
  }
  
  /**
   * Set optimization level
   * @param {string} level - Optimization level ('conservative', 'balanced', 'aggressive')
   */
  setOptimizationLevel(level) {
    if (!this.performanceOptimizer) {
      console.warn('PerformanceOptimizer not available');
      return;
    }
    
    try {
      this.performanceOptimizer.setOptimizationLevel(level);
    } catch (error) {
      console.error('Failed to set optimization level:', error);
    }
  }
  
  /**
   * Set target FPS
   * @param {number} fps - Target FPS
   */
  setTargetFPS(fps) {
    if (!this.performanceOptimizer) {
      console.warn('PerformanceOptimizer not available');
      return;
    }
    
    try {
      this.performanceOptimizer.setTargetFPS(fps);
    } catch (error) {
      console.error('Failed to set target FPS:', error);
    }
  }
  
  /**
   * Get optimization status
   * @returns {Object|null} Optimization status
   */
  getOptimizationStatus() {
    if (!this.performanceOptimizer) {
      return null;
    }
    
    return this.performanceOptimizer.getOptimizationStatus();
  }
  
  /**
   * Show optimization settings UI
   */
  showOptimizationSettings() {
    if (!this.performanceOptimizer) {
      console.warn('PerformanceOptimizer not available');
      return;
    }
    
    this.performanceOptimizer.showSettings();
  }
  
  /**
   * Hide optimization settings UI
   */
  hideOptimizationSettings() {
    if (!this.performanceOptimizer) {
      return;
    }
    
    this.performanceOptimizer.hideSettings();
  }
  
  /**
   * Toggle optimization settings UI
   */
  toggleOptimizationSettings() {
    if (!this.performanceOptimizer) {
      console.warn('PerformanceOptimizer not available');
      return;
    }
    
    this.performanceOptimizer.toggleSettings();
  }
  
  /**
   * Get optimization configuration
   * @returns {OptimizationConfig|null} Configuration instance
   */
  getOptimizationConfig() {
    if (!this.performanceOptimizer) {
      return null;
    }
    
    return this.performanceOptimizer.getOptimizationConfig();
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
      
      // Update performance optimizer
      if (this.performanceOptimizer) {
        this.performanceOptimizer.updateOptimizations(deltaTime);
      }
      
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
      
      // Dispose performance optimizer first (it may need access to other systems)
      if (this.performanceOptimizer) {
        console.log("Disposing PerformanceOptimizer...");
        this.performanceOptimizer.dispose();
        this.performanceOptimizer = null;
      }
      
      // Dispose simulation
      if (this.simulation) {
        this.simulation.dispose();
        this.simulation = null;
      }
      
      // Dispose shadow generator
      if (this.shadowGenerator) {
        this.shadowGenerator.dispose();
        this.shadowGenerator = null;
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
      
      // Clean up references
      this.camera = null;
      this.light = null;
      this.canvas = null;
      
      this.initialized = false;
      console.log("VillageEngine disposal complete");
      
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