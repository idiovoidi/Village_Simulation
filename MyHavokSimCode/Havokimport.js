import { VortexBall } from './VortexBall.js';
import { BowlCreator } from './BowlCreator.js';
import { BoxCreator } from './BoxCreator.js';
import { BehavioralSim } from './BehavioralSim.js';
import { WaterSimulation } from './WaterSimulation.js';
import { BoatAgent } from './Boats/BoatAgent.js';

export class LeoScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = this.createScene();
    this.boxes = []; // Store references to boxes
    this.init();
  }

  createScene() {
    const scene = new BABYLON.Scene(this.engine);
    return scene;
  }

  async init() {
    // Set up camera
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

    // Add lighting
    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );

    try {
      // Initialize Havok physics
      const havokInstance = await HavokPhysics();
      const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
      
      // Enable physics in the scene
      this.scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), havokPlugin);

      // Create bowl and boxes
      const bowlCreator = new BowlCreator(this.scene);
      bowlCreator.createBowl();

      const boxCreator = new BoxCreator(this.scene);
      this.boxes = boxCreator.createBoxes();
      
      // Create vortex ball
      this.vortexBall = new VortexBall(this.scene);

      // Register before render to update physics
      this.scene.registerBeforeRender(() => {
        this.vortexBall.applyVortexForce(this.boxes);
      });

      // Start the render loop
      this.engine.runRenderLoop(() => {
        this.scene.render();
      });

      // Show debug layer
      this.scene.debugLayer.show({ overlay: true });

      // Initialize BehavioralSim
      this.behavioralSim = new BehavioralSim(this.scene);

      // Initialize WaterSimulation
      this.waterSim = new WaterSimulation(this.scene);

      // Initialize BoatAgent
      this.boatAgent = new BoatAgent(this.scene, this.waterSim.waterMesh.position.y);

    } catch (error) {
      console.error("Error initializing physics:", error);
    }
  }
}