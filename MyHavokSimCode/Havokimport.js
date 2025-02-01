import { VortexBall } from './VortexBall.js';
import { BowlCreator } from './BowlCreator.js';
import { BehavioralSim } from './BehavioralSim.js';
import { WaterSimulation } from './WaterSimulation.js';
import { BoatAgent } from './Boats/BoatAgent.js';
import { RoadSystem } from './RoadSystem.js';
import { HouseSystem } from './HouseSystem.js';
import { FishBehaviour } from './Fish/FishBehaviour.js';
import { BirdBehaviour } from './Agents/Birds/BirdBehaviour.js';
import { CloudSystem } from './CloudSystem.js';
import { ZombieBehaviour } from './Agents/Zombies/ZombieBehaviour.js';
import { MoonSystem } from './MoonSystem.js';
import { VillageSystem } from './VillageSystem.js';

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

      // Create bowl first and wait for it to be ready
      const bowlCreator = new BowlCreator(this.scene);
      await bowlCreator.createBowl();

      // Initialize other systems after bowl is created
      console.log("Creating RoadSystem");
      this.roadSystem = new RoadSystem(this.scene);
      
      // Create vortex ball
      this.vortexBall = new VortexBall(this.scene);

      // Initialize WaterSimulation
      this.waterSim = new WaterSimulation(this.scene);
      const waterInitSuccess = this.waterSim.initialize();
      // In your init() method after clouds:
      this.moonSystem = new MoonSystem(this.scene); 
      
      if (waterInitSuccess) {
        // Initialize fish after water is created
        this.fishSystem = new FishBehaviour(this.scene, this.waterSim.waterMesh);
        this.fishSystem.initialize(20); // Create 20 fish

        // Initialize boats after fish
        this.boatAgent = new BoatAgent(this.scene, this.waterSim.waterMesh.position.y);
        this.boatAgent.initialize();
      }

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

      // Initialize HouseSystem
      this.houseSystem = new HouseSystem(this.scene);

      // Initialize BirdBehaviour
      this.birdSystem = new BirdBehaviour(this.scene);
      this.birdSystem.initialize(15); // Create 15 birds

      // Initialize CloudSystem
      this.cloudSystem = new CloudSystem(this.scene);

      // Initialize VillageSystem
      this.villageSystem = new VillageSystem(this.scene);

      // Initialize ZombieBehaviour
      this.zombieSystem = new ZombieBehaviour(this.scene);

    } catch (error) {
      console.error("Error initializing physics:", error);
    }
  }
}