export class LeoScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.scene = this.createScene();
    this.setupScene();
  }

  createScene() {
    const scene = new BABYLON.Scene(this.engine);
    return scene;
  }

  async setupScene() {
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

    // Initialize physics
    await this.initializePhysics();

    // Create demo objects
    this.createPhysicsDemo();

    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // Show debug layer
    this.scene.debugLayer.show({ overlay: true });
  }

  async initializePhysics() {
    const havokInstance = await HavokPhysics();
    const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
    const gravity = new BABYLON.Vector3(0, -9.81, 0);
    this.scene.enablePhysics(gravity, havokPlugin);
  }

  createPhysicsDemo() {
    // Create ground
    const ground = BABYLON.MeshBuilder.CreateGround("ground", {
      width: 100,
      height: 100
    }, this.scene);
    
    // Add physics to ground (static)
    new BABYLON.PhysicsAggregate(ground, 1, {
      mass: 0,
      restitution: 0.5
    }, this.scene);

    // Create some falling boxes
    for (let i = 0; i < 10; i++) {
      const box = BABYLON.MeshBuilder.CreateBox(`box${i}`, {
        size: 2
      }, this.scene);
      
      box.position = new BABYLON.Vector3(
        Math.random() * 20 - 10,  // Random X position
        20 + i * 2,               // Staggered height
        Math.random() * 20 - 10   // Random Z position
      );

      // Add physics to box (dynamic)
      new BABYLON.PhysicsAggregate(box, 2, {
        mass: 1,
        restitution: 0.5
      }, this.scene);
    }
  }
}