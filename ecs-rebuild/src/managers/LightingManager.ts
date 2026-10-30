/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * LightingManager
 *
 * Owns the sun/moon directional light and the hemispheric fill light, and
 * turns hour-of-day into a sun state (direction, elevation, colour) that the
 * AtmosphereManager renders as sky, fog and shadows.
 */

import { sampleSky, type AtmosphereManager, type SkyState } from './AtmosphereManager.ts';

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Names of shared materials that glow after dark (see render/models/Materials). */
const NIGHT_GLOW_MATERIALS = ['house_window'];

export class LightingManager {
  private scene: any;
  private atmosphere: AtmosphereManager | null;
  private sunLight: any = null;
  private fillLight: any = null;
  private sunIntensity = 1;
  private ambientIntensity = 1;
  private lastState: SkyState | null = null;

  constructor(scene: any, atmosphere: AtmosphereManager | null = null) {
    this.scene = scene;
    this.atmosphere = atmosphere;
  }

  initialize(): void {
    const B = (window as any).BABYLON;

    this.sunLight = new B.DirectionalLight('sunLight', new B.Vector3(-0.4, -1, -0.3), this.scene);
    this.sunLight.intensity = 1.6;
    this.sunLight.specular = new B.Color3(1, 0.95, 0.85);

    this.fillLight = new B.HemisphericLight('ambientLight', new B.Vector3(0, 1, 0), this.scene);
    this.fillLight.intensity = 0.55;
    this.fillLight.specular = new B.Color3(0, 0, 0);

    this.atmosphere?.attachSun(this.sunLight);
    this.updateForTimeOfDay(8);
  }

  /**
   * @param timeOfDay hour 0-24 (fractional)
   */
  updateForTimeOfDay(timeOfDay: number): void {
    if (!this.sunLight || !this.fillLight) return;
    const B = (window as any).BABYLON;

    const t = (((timeOfDay % 24) + 24) % 24) / 24;
    // Sun rises at 06:00 (angle 0), peaks at 12:00, sets at 18:00.
    const angle = (t - 0.25) * Math.PI * 2;
    const elevation = Math.sin(angle);
    // Slight southern tilt so shadows never collapse straight down at noon.
    const sunPos = new B.Vector3(Math.cos(angle), elevation, 0.38).normalize();
    const night = 1 - smoothstep(-0.18, 0.08, elevation);

    const sky = sampleSky(elevation);
    const state: SkyState = {
      sunDir: { x: sunPos.x, y: sunPos.y, z: sunPos.z },
      elevation,
      night,
      ...sky,
    };
    this.lastState = state;

    // Light travels from the body towards the ground: negate its position.
    const sunUp = elevation > -0.04;
    const body = sunUp ? sunPos : sunPos.scale(-1);
    this.sunLight.direction = body.scale(-1);

    if (sunUp) {
      const strength = smoothstep(-0.04, 0.28, elevation);
      this.sunLight.intensity = (0.3 + 1.1 * strength) * this.sunIntensity;
      this.sunLight.diffuse = new B.Color3(state.sunColor.r, state.sunColor.g, state.sunColor.b);
    } else {
      // Moonlight takes over: dim, cool and soft.
      const moon = smoothstep(-0.04, -0.3, elevation);
      this.sunLight.intensity = 0.15 + 1.35 * moon;
      this.sunLight.diffuse = new B.Color3(0.55, 0.65, 1.0);
    }

    // Fill light: sky-tinted white by day, a cool blue wash at night so shapes stay readable.
    const fillDay = 1 - night;
    const tint = 0.45;
    const mixc = (zc: number, hc: number, white: number) =>
      (0.5 * zc + 0.5 * hc) * tint + white * (1 - tint);
    const day = {
      r: mixc(state.zenith.r, state.horizon.r, 0.95),
      g: mixc(state.zenith.g, state.horizon.g, 0.97),
      b: mixc(state.zenith.b, state.horizon.b, 1.0),
    };
    const moonWash = { r: 0.3, g: 0.4, b: 0.68 };
    this.fillLight.diffuse = new B.Color3(
      day.r * fillDay + moonWash.r * night,
      day.g * fillDay + moonWash.g * night,
      day.b * fillDay + moonWash.b * night
    );
    this.fillLight.intensity = (0.9 * fillDay + 0.85 * night) * this.ambientIntensity;
    this.fillLight.groundColor = new B.Color3(
      0.38 * fillDay + 0.07 * night,
      0.44 * fillDay + 0.09 * night,
      0.26 * fillDay + 0.16 * night
    );

    // Lit windows after dusk.
    for (const name of NIGHT_GLOW_MATERIALS) {
      const mat = this.scene.getMaterialByName(name);
      if (mat) {
        const glow = smoothstep(0.1, 0.55, night);
        mat.emissiveColor = new B.Color3(1.0 * glow, 0.72 * glow, 0.32 * glow);
      }
    }

    this.atmosphere?.update(state);
  }

  getSkyState(): SkyState | null {
    return this.lastState;
  }

  /** True while the sun is below the horizon. */
  isNight(): boolean {
    return (this.lastState?.night ?? 0) > 0.5;
  }

  setSunIntensity(intensity: number): void {
    this.sunIntensity = Math.max(0, Math.min(2, intensity));
  }

  setAmbientIntensity(intensity: number): void {
    this.ambientIntensity = Math.max(0, Math.min(2, intensity));
  }

  getDirectionalLight(): any {
    return this.sunLight;
  }

  getHemisphericLight(): any {
    return this.fillLight;
  }

  getShadowGenerator(): any {
    return this.atmosphere?.getShadowGenerator() ?? null;
  }

  dispose(): void {
    this.sunLight?.dispose();
    this.fillLight?.dispose();
    this.sunLight = null;
    this.fillLight = null;
  }
}
