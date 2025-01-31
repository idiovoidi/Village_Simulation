export class LeoScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = this.createScene();
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

      // Create the physics demo
      this.createPhysicsDemo();

      // Start the render loop
      this.engine.runRenderLoop(() => {
        this.scene.render();
      });

      // Show debug layer
      this.scene.debugLayer.show({ overlay: true });

    } catch (error) {
      console.error("Error initializing physics:", error);
    }
  }

  createPhysicsDemo() {
    // Create a ground box
    const ground = BABYLON.MeshBuilder.CreateBox("ground", {
      width: 20,
      height: 2,
      depth: 20
    }, this.scene);
    
    // Move ground down so its top surface is at y=0
    ground.position.y = -1;

    // Create material for ground
    const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    ground.material = groundMaterial;
    
    // Add physics to ground
    const groundAggregate = new BABYLON.PhysicsAggregate(
      ground,
      BABYLON.PhysicsShapeType.BOX,
      { mass: 0, restitution: 0.7, friction: 0.8 },
      this.scene
    );

    // Create falling boxes
    for (let i = 0; i < 10; i++) {
      // Create box mesh
      const box = BABYLON.MeshBuilder.CreateBox(`box${i}`, {
        size: 1
      }, this.scene);
      
      // Create material for box
      const boxMaterial = new BABYLON.StandardMaterial(`boxMat${i}`, this.scene);
      boxMaterial.diffuseColor = new BABYLON.Color3(
        Math.random(),
        Math.random(),
        Math.random()
      );
      box.material = boxMaterial;

      // Position box
      box.position = new BABYLON.Vector3(
        Math.random() * 10 - 5,  // Random X between -5 and 5
        10 + i * 2,             // Start height
        Math.random() * 10 - 5   // Random Z between -5 and 5
      );

      // Add physics to box
      const boxAggregate = new BABYLON.PhysicsAggregate(
        box,
        BABYLON.PhysicsShapeType.BOX,
        { mass: 1, restitution: 0.7, friction: 0.5 },
        this.scene
      );
    }
  }
}