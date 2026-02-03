/**
 * CameraManager
 * 
 * Manages camera creation and controls for the simulation.
 * Provides arc rotate camera with mouse and keyboard controls.
 */

/**
 * CameraManager handles camera setup and input controls.
 * Supports mouse rotation, WASD keyboard movement, zoom, pan, and touch input.
 */
export class CameraManager {
  private scene: any; // Babylon.Scene
  private canvas: HTMLCanvasElement;
  private camera: any; // Babylon.ArcRotateCamera
  private keyboardEnabled: boolean;
  private keyStates: Map<string, boolean>;
  private moveSpeed: number;

  /**
   * Creates a new CameraManager.
   * 
   * @param scene - The Babylon.js scene
   * @param canvas - The HTML canvas element
   */
  constructor(scene: any, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.canvas = canvas;
    this.camera = null;
    this.keyboardEnabled = true;
    this.keyStates = new Map();
    this.moveSpeed = 0.5;
  }

  /**
   * Initializes the camera with default settings.
   * Creates an arc rotate camera positioned above the scene.
   * 
   * @param target - The target position for the camera to look at (default: origin)
   * @param radius - The distance from the target (default: 50)
   * @param alpha - The horizontal rotation in radians (default: -Math.PI / 2)
   * @param beta - The vertical rotation in radians (default: Math.PI / 3)
   */
  initialize(
    target: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    radius: number = 50,
    alpha: number = -Math.PI / 2,
    beta: number = Math.PI / 3
  ): void {
    const BABYLON = (window as any).BABYLON;

    // Create arc rotate camera
    this.camera = new BABYLON.ArcRotateCamera(
      'camera',
      alpha,
      beta,
      radius,
      new BABYLON.Vector3(target.x, target.y, target.z),
      this.scene
    );

    // Attach controls to canvas
    this.camera.attachControl(this.canvas, true);

    // Configure camera behavior
    this.configureCameraControls();

    // Set up keyboard controls
    this.setupKeyboardControls();

    // Set up touch controls (automatically handled by Babylon.js)
    this.setupTouchControls();
  }

  /**
   * Configures camera control settings.
   */
  private configureCameraControls(): void {
    // Mouse wheel zoom
    this.camera.wheelPrecision = 50;
    this.camera.wheelDeltaPercentage = 0.01;

    // Panning
    this.camera.panningSensibility = 50;

    // Rotation
    this.camera.angularSensibilityX = 1000;
    this.camera.angularSensibilityY = 1000;

    // Limits
    this.camera.lowerRadiusLimit = 10;
    this.camera.upperRadiusLimit = 200;
    this.camera.lowerBetaLimit = 0.1;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.1;

    // Inertia for smooth movement
    this.camera.inertia = 0.9;
    this.camera.panningInertia = 0.9;

    // Enable collision detection (optional)
    this.camera.checkCollisions = false;
  }

  /**
   * Sets up WASD keyboard controls for camera movement.
   */
  private setupKeyboardControls(): void {
    // Track key states
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      this.keyStates.set(event.key.toLowerCase(), true);
    });

    window.addEventListener('keyup', (event: KeyboardEvent) => {
      this.keyStates.set(event.key.toLowerCase(), false);
    });

    // Update camera position based on key states
    this.scene.onBeforeRenderObservable.add(() => {
      if (!this.keyboardEnabled) {
        return;
      }

      const BABYLON = (window as any).BABYLON;
      const forward = this.camera.getForwardRay().direction;
      const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up());

      let movement = BABYLON.Vector3.Zero();

      // WASD movement
      if (this.keyStates.get('w')) {
        movement.addInPlace(forward.scale(this.moveSpeed));
      }
      if (this.keyStates.get('s')) {
        movement.addInPlace(forward.scale(-this.moveSpeed));
      }
      if (this.keyStates.get('a')) {
        movement.addInPlace(right.scale(-this.moveSpeed));
      }
      if (this.keyStates.get('d')) {
        movement.addInPlace(right.scale(this.moveSpeed));
      }

      // Apply movement to camera target
      if (movement.length() > 0) {
        this.camera.target.addInPlace(movement);
      }
    });
  }

  /**
   * Sets up touch controls for mobile devices.
   * Touch controls are automatically handled by Babylon.js ArcRotateCamera.
   */
  private setupTouchControls(): void {
    // Enable multi-touch
    this.camera.inputs.attached.pointers.multiTouchPanning = true;
    this.camera.inputs.attached.pointers.multiTouchPanAndZoom = true;

    // Configure touch sensitivity
    this.camera.pinchPrecision = 50;
    this.camera.pinchDeltaPercentage = 0.01;
  }

  /**
   * Gets the camera instance.
   * 
   * @returns The Babylon.js camera
   */
  getCamera(): any {
    return this.camera;
  }

  /**
   * Sets the camera target position.
   * 
   * @param target - The new target position
   */
  setTarget(target: { x: number; y: number; z: number }): void {
    if (this.camera) {
      const BABYLON = (window as any).BABYLON;
      this.camera.target = new BABYLON.Vector3(target.x, target.y, target.z);
    }
  }

  /**
   * Sets the camera radius (distance from target).
   * 
   * @param radius - The new radius
   */
  setRadius(radius: number): void {
    if (this.camera) {
      this.camera.radius = radius;
    }
  }

  /**
   * Sets the camera rotation angles.
   * 
   * @param alpha - The horizontal rotation in radians
   * @param beta - The vertical rotation in radians
   */
  setRotation(alpha: number, beta: number): void {
    if (this.camera) {
      this.camera.alpha = alpha;
      this.camera.beta = beta;
    }
  }

  /**
   * Enables or disables keyboard controls.
   * 
   * @param enabled - Whether keyboard controls should be enabled
   */
  setKeyboardEnabled(enabled: boolean): void {
    this.keyboardEnabled = enabled;
  }

  /**
   * Sets the keyboard movement speed.
   * 
   * @param speed - The movement speed (units per frame)
   */
  setMoveSpeed(speed: number): void {
    this.moveSpeed = speed;
  }

  /**
   * Focuses the camera on a specific position.
   * Smoothly animates the camera to look at the target.
   * 
   * @param target - The position to focus on
   * @param duration - Animation duration in milliseconds (default: 1000)
   */
  focusOn(target: { x: number; y: number; z: number }, duration: number = 1000): void {
    if (!this.camera) {
      return;
    }

    const BABYLON = (window as any).BABYLON;
    const targetVector = new BABYLON.Vector3(target.x, target.y, target.z);

    // Animate camera target
    BABYLON.Animation.CreateAndStartAnimation(
      'cameraFocus',
      this.camera,
      'target',
      60,
      (duration / 1000) * 60,
      this.camera.target,
      targetVector,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
  }

  /**
   * Disposes of the camera and cleans up event listeners.
   */
  dispose(): void {
    if (this.camera) {
      this.camera.dispose();
      this.camera = null;
    }

    this.keyStates.clear();
  }
}
