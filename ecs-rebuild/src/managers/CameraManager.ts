/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CameraManager
 *
 * Arc-rotate RTS-style camera. WASD/arrow keys pan across the ground plane
 * (speed scales with zoom and frame time), Q/E orbit, Shift boosts. The orbit
 * target rides the terrain, stays inside the bowl, and can follow an entity.
 */

type Vec3 = { x: number; y: number; z: number };

export class CameraManager {
  private scene: any;
  private canvas: HTMLCanvasElement;
  private camera: any = null;
  private keyboardEnabled = true;
  private keyStates = new Map<string, boolean>();
  private moveSpeed = 1;
  private heightAt: ((x: number, z: number) => number) | null = null;
  private boundsRadius = 110;
  private followFn: (() => Vec3 | null) | null = null;
  private desiredTarget: any = null;
  private lastApplied: any = null;
  private renderObserver: any = null;
  private onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private onBlur: (() => void) | null = null;

  constructor(scene: any, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.canvas = canvas;
  }

  initialize(
    target: Vec3 = { x: 0, y: 0, z: 0 },
    radius = 50,
    alpha = -Math.PI / 2,
    beta = Math.PI / 3
  ): void {
    const B = (window as any).BABYLON;

    this.camera = new B.ArcRotateCamera(
      'camera',
      alpha,
      beta,
      radius,
      new B.Vector3(target.x, target.y, target.z),
      this.scene
    );
    this.camera.minZ = 0.3;
    this.camera.maxZ = 3000;
    this.camera.fov = 0.9;
    this.desiredTarget = this.camera.target.clone();
    this.lastApplied = this.camera.target.clone();

    this.camera.attachControl(this.canvas, true);
    this.configureCameraControls();
    this.setupKeyboardControls();
    this.setupTouchControls();
  }

  private configureCameraControls(): void {
    const c = this.camera;
    c.wheelPrecision = 12;
    c.wheelDeltaPercentage = 0.02;
    c.panningSensibility = 40;
    c.angularSensibilityX = 700;
    c.angularSensibilityY = 700;
    c.lowerRadiusLimit = 6;
    c.upperRadiusLimit = 220;
    c.lowerBetaLimit = 0.15;
    c.upperBetaLimit = Math.PI / 2 - 0.06;
    c.inertia = 0.88;
    c.panningInertia = 0.85;
    c.useNaturalPinchZoom = true;
    c.checkCollisions = false;
  }

  /** Provide terrain height so the camera target hugs the ground. */
  setHeightProvider(fn: (x: number, z: number) => number, boundsRadius?: number): void {
    this.heightAt = fn;
    if (boundsRadius) this.boundsRadius = boundsRadius;
  }

  private setupKeyboardControls(): void {
    const B = (window as any).BABYLON;

    this.onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      this.keyStates.set(e.key.toLowerCase(), true);
    };
    this.onKeyUp = (e: KeyboardEvent) => this.keyStates.set(e.key.toLowerCase(), false);
    this.onBlur = () => this.keyStates.clear();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      if (!this.camera) return;
      const dt = Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.1);
      const down = (k: string) => this.keyboardEnabled && this.keyStates.get(k);

      // Pan on the ground plane, relative to where the camera is looking.
      const ax = this.camera.alpha;
      const fwd = new B.Vector3(-Math.cos(ax), 0, -Math.sin(ax));
      const right = new B.Vector3(-fwd.z, 0, fwd.x).scale(-1);
      const speed =
        this.moveSpeed * (0.6 + this.camera.radius * 0.3) * (down('shift') ? 2.5 : 1) * dt;

      let moved = false;
      const move = new B.Vector3(0, 0, 0);
      if (down('w') || down('arrowup')) move.addInPlace(fwd);
      if (down('s') || down('arrowdown')) move.subtractInPlace(fwd);
      if (down('d') || down('arrowright')) move.addInPlace(right);
      if (down('a') || down('arrowleft')) move.subtractInPlace(right);
      if (move.lengthSquared() > 0) {
        move.normalize().scaleInPlace(speed);
        this.desiredTarget.addInPlace(move);
        this.followFn = null;
        moved = true;
      }

      // Orbit & zoom from the keyboard.
      if (down('q')) this.camera.alpha += 1.6 * dt;
      if (down('e')) this.camera.alpha -= 1.6 * dt;
      if (down('r')) this.camera.radius = Math.max(this.camera.lowerRadiusLimit, this.camera.radius - 40 * dt);
      if (down('f')) this.camera.radius = Math.min(this.camera.upperRadiusLimit, this.camera.radius + 40 * dt);

      // Mouse/touch panning moves camera.target directly; adopt it.
      if (B.Vector3.DistanceSquared(this.camera.target, this.lastApplied) > 1e-8) {
        this.desiredTarget.copyFrom(this.camera.target);
        this.followFn = null;
      }

      if (this.followFn) {
        const p = this.followFn();
        if (p) this.desiredTarget.set(p.x, p.y, p.z);
        else this.followFn = null;
      }

      this.constrainTarget();
      this.camera.target.copyFrom(
        B.Vector3.Lerp(this.camera.target, this.desiredTarget, this.followFn ? 0.12 : moved ? 1 : 0.14)
      );
      this.lastApplied.copyFrom(this.camera.target);
    });
  }

  private constrainTarget(): void {
    const t = this.desiredTarget;
    const d = Math.hypot(t.x, t.z);
    if (d > this.boundsRadius) {
      t.x *= this.boundsRadius / d;
      t.z *= this.boundsRadius / d;
    }
    if (this.heightAt) t.y = Math.max(this.heightAt(t.x, t.z), -1);
  }

  private setupTouchControls(): void {
    const pointers = this.camera.inputs.attached.pointers;
    if (pointers) {
      pointers.multiTouchPanning = true;
      pointers.multiTouchPanAndZoom = true;
    }
    this.camera.pinchPrecision = 30;
    this.camera.pinchDeltaPercentage = 0.015;
  }

  getCamera(): any {
    return this.camera;
  }

  setTarget(target: Vec3): void {
    if (!this.camera) return;
    const B = (window as any).BABYLON;
    this.desiredTarget = new B.Vector3(target.x, target.y, target.z);
    this.camera.target = this.desiredTarget.clone();
    this.lastApplied.copyFrom(this.camera.target);
  }

  setRadius(radius: number): void {
    if (this.camera) this.camera.radius = radius;
  }

  setRotation(alpha: number, beta: number): void {
    if (this.camera) {
      this.camera.alpha = alpha;
      this.camera.beta = beta;
    }
  }

  setKeyboardEnabled(enabled: boolean): void {
    this.keyboardEnabled = enabled;
  }

  setMoveSpeed(speed: number): void {
    this.moveSpeed = speed;
  }

  /** Ease the camera to a point and optionally zoom in. */
  focusOn(target: Vec3, _durationMs = 1000, radius?: number): void {
    if (!this.camera) return;
    this.followFn = null;
    this.desiredTarget.set(target.x, target.y, target.z);
    if (radius !== undefined) this.camera.radius = radius;
  }

  /** Keep the camera centred on a moving position until the user pans away. */
  follow(getPosition: () => Vec3 | null, radius = 22): void {
    this.followFn = getPosition;
    this.camera.radius = Math.min(this.camera.radius, radius);
  }

  stopFollowing(): void {
    this.followFn = null;
  }

  isFollowing(): boolean {
    return this.followFn !== null;
  }

  dispose(): void {
    if (this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }
    if (this.onKeyDown) window.removeEventListener('keydown', this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener('keyup', this.onKeyUp);
    if (this.onBlur) window.removeEventListener('blur', this.onBlur);
    this.camera?.dispose();
    this.camera = null;
    this.keyStates.clear();
  }
}
