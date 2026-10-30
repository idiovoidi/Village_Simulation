/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AtmosphereManager
 *
 * Owns everything that makes the world feel like a place instead of a scene:
 * procedural sky dome (gradient, sun, moon, stars, clouds), fog, the shadow
 * generator and the post-processing pipeline. Driven once per frame with the
 * sun state computed by LightingManager.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface SkyState {
  /** Unit vector pointing from the world towards the sun. */
  sunDir: { x: number; y: number; z: number };
  /** Sun elevation, -1 (nadir) .. 1 (zenith). */
  elevation: number;
  zenith: RGB;
  horizon: RGB;
  sunColor: RGB;
  cloudColor: RGB;
  /** 0 = full daylight, 1 = deep night. */
  night: number;
}

export interface AtmosphereMood {
  /** Zombie-level style blood sky. */
  redSky: boolean;
  /** Thick fog. */
  heavyFog: boolean;
  cloudCover: number;
}

const SKY_VERTEX = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

const SKY_FRAGMENT = `
precision highp float;
varying vec3 vDir;
uniform vec3 sunDir;
uniform vec3 moonDir;
uniform vec3 zenithColor;
uniform vec3 horizonColor;
uniform vec3 sunColor;
uniform vec3 cloudColor;
uniform float night;
uniform float time;
uniform float cloudCover;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float hash31(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  float up = d.y;

  // Base gradient: horizon haze fading into the zenith colour.
  float t = pow(clamp(up, 0.0, 1.0), 0.45);
  vec3 col = mix(horizonColor, zenithColor, t);
  // Below the horizon blend to a muted haze so mountains don't float.
  col = mix(col, horizonColor * 0.55, smoothstep(0.0, -0.25, up));

  // Sun: tight disc + soft halo + wide scatter.
  float sd = max(dot(d, sunDir), 0.0);
  float sunDisc = smoothstep(0.9994, 0.9998, sd);
  col += sunColor * (sunDisc * 4.0 + pow(sd, 64.0) * 0.55 + pow(sd, 6.0) * 0.22);

  // Moon.
  float md = dot(d, moonDir);
  float moonDisc = smoothstep(0.9990, 0.9993, md);
  col += vec3(0.82, 0.88, 1.0) * moonDisc * night * 1.3;
  col += vec3(0.25, 0.3, 0.45) * pow(max(md, 0.0), 40.0) * night * 0.5;

  // Stars: hashed cells over the sphere, twinkling.
  if (night > 0.02 && up > -0.05) {
    vec3 sp = d * 160.0;
    vec3 cell = floor(sp);
    float r = hash31(cell);
    float star = step(0.9965, r);
    float tw = 0.6 + 0.4 * sin(time * 2.0 + r * 80.0);
    vec3 local = fract(sp) - 0.5;
    float falloff = smoothstep(0.5, 0.0, length(local));
    col += vec3(0.9, 0.93, 1.0) * star * tw * falloff * night * smoothstep(0.0, 0.2, up);
  }

  // Clouds: projected fbm layer, lit from the sun side.
  if (up > 0.01) {
    vec2 p = d.xz / (up + 0.22) * 1.6 + vec2(time * 0.012, time * 0.006);
    float base = fbm(p);
    float c = smoothstep(1.0 - cloudCover, 1.0 - cloudCover + 0.28, base);
    float lit = fbm(p + sunDir.xz * 0.12);
    float shade = clamp(0.55 + (base - lit) * 2.2, 0.35, 1.15);
    vec3 cc = cloudColor * shade;
    float fade = smoothstep(0.01, 0.16, up);
    col = mix(col, cc, c * fade * 0.92);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

interface SkyKey {
  elev: number;
  zenith: RGB;
  horizon: RGB;
  sun: RGB;
  cloud: RGB;
}

const SKY_KEYS: SkyKey[] = [
  {
    elev: -0.3,
    zenith: { r: 0.012, g: 0.02, b: 0.065 },
    horizon: { r: 0.035, g: 0.055, b: 0.13 },
    sun: { r: 0.3, g: 0.3, b: 0.4 },
    cloud: { r: 0.09, g: 0.11, b: 0.2 },
  },
  {
    elev: -0.08,
    zenith: { r: 0.05, g: 0.07, b: 0.2 },
    horizon: { r: 0.3, g: 0.2, b: 0.3 },
    sun: { r: 1.0, g: 0.45, b: 0.2 },
    cloud: { r: 0.35, g: 0.25, b: 0.35 },
  },
  {
    elev: 0.02,
    zenith: { r: 0.17, g: 0.25, b: 0.52 },
    horizon: { r: 1.0, g: 0.5, b: 0.28 },
    sun: { r: 1.0, g: 0.55, b: 0.25 },
    cloud: { r: 1.0, g: 0.62, b: 0.45 },
  },
  {
    elev: 0.16,
    zenith: { r: 0.24, g: 0.45, b: 0.82 },
    horizon: { r: 0.98, g: 0.8, b: 0.6 },
    sun: { r: 1.0, g: 0.8, b: 0.5 },
    cloud: { r: 1.0, g: 0.88, b: 0.78 },
  },
  {
    elev: 0.55,
    zenith: { r: 0.14, g: 0.4, b: 0.88 },
    horizon: { r: 0.62, g: 0.8, b: 0.96 },
    sun: { r: 1.0, g: 0.95, b: 0.82 },
    cloud: { r: 1.0, g: 1.0, b: 1.0 },
  },
  {
    elev: 1.0,
    zenith: { r: 0.1, g: 0.34, b: 0.85 },
    horizon: { r: 0.58, g: 0.78, b: 0.95 },
    sun: { r: 1.0, g: 0.96, b: 0.85 },
    cloud: { r: 1.0, g: 1.0, b: 1.0 },
  },
];

/** Interpolated sky palette for a given sun elevation. */
export function sampleSky(elevation: number): Omit<SkyState, 'sunDir' | 'elevation' | 'night'> {
  const e = Math.min(SKY_KEYS[SKY_KEYS.length - 1].elev, Math.max(SKY_KEYS[0].elev, elevation));
  let i = 0;
  while (i < SKY_KEYS.length - 2 && e > SKY_KEYS[i + 1].elev) i++;
  const a = SKY_KEYS[i];
  const b = SKY_KEYS[i + 1];
  const t = (e - a.elev) / (b.elev - a.elev);
  return {
    zenith: lerpRGB(a.zenith, b.zenith, t),
    horizon: lerpRGB(a.horizon, b.horizon, t),
    sunColor: lerpRGB(a.sun, b.sun, t),
    cloudColor: lerpRGB(a.cloud, b.cloud, t),
  };
}

/**
 * Procedural sky, fog, shadows and post-processing.
 */
export class AtmosphereManager {
  private scene: any;
  private skyMesh: any = null;
  private skyMaterial: any = null;
  private pipeline: any = null;
  private shadowGenerator: any = null;
  private elapsed = 0;
  private mood: AtmosphereMood = { redSky: false, heavyFog: false, cloudCover: 0.5 };
  private baseFogDensity = 0.0022;
  private meshObserver: any = null;
  private shadowCasterPattern = /^(house|tree|villager|zombie|dog|well|bird|boat|dinosaur|prop)_/;

  constructor(scene: any) {
    this.scene = scene;
  }

  initialize(): void {
    const B = (window as any).BABYLON;

    B.Effect.ShadersStore['villageSkyVertexShader'] = SKY_VERTEX;
    B.Effect.ShadersStore['villageSkyFragmentShader'] = SKY_FRAGMENT;

    this.skyMaterial = new B.ShaderMaterial(
      'skyMaterial',
      this.scene,
      { vertex: 'villageSky', fragment: 'villageSky' },
      {
        attributes: ['position'],
        uniforms: [
          'worldViewProjection',
          'sunDir',
          'moonDir',
          'zenithColor',
          'horizonColor',
          'sunColor',
          'cloudColor',
          'night',
          'time',
          'cloudCover',
        ],
      }
    );
    this.skyMaterial.backFaceCulling = false;
    this.skyMaterial.disableDepthWrite = true;
    this.skyMaterial.fogEnabled = false;

    this.skyMesh = B.MeshBuilder.CreateSphere(
      'skyDome',
      { diameter: 2000, segments: 24, sideOrientation: B.Mesh.BACKSIDE },
      this.scene
    );
    this.skyMesh.material = this.skyMaterial;
    this.skyMesh.infiniteDistance = true;
    this.skyMesh.isPickable = false;
    this.skyMesh.renderingGroupId = 0;
    this.skyMesh.applyFog = false;

    this.scene.fogMode = B.Scene.FOGMODE_EXP2;
    this.scene.fogDensity = this.baseFogDensity;
    this.scene.clearColor = new B.Color4(0.6, 0.78, 0.95, 1);

    this.setupShadows();
  }

  /** Called once a camera exists; adds FXAA, bloom, tone mapping, vignette. */
  attachPipeline(camera: any): void {
    const B = (window as any).BABYLON;
    if (this.pipeline || !B.DefaultRenderingPipeline) return;

    const pipeline = new B.DefaultRenderingPipeline('defaultPipeline', true, this.scene, [camera]);
    pipeline.samples = 4;
    pipeline.fxaaEnabled = true;

    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.85;
    pipeline.bloomWeight = 0.28;
    pipeline.bloomKernel = 48;
    pipeline.bloomScale = 0.5;

    pipeline.imageProcessingEnabled = true;
    const ip = pipeline.imageProcessing;
    ip.toneMappingEnabled = true;
    ip.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
    ip.exposure = 1.05;
    ip.contrast = 1.1;
    ip.vignetteEnabled = true;
    ip.vignetteWeight = 2.2;
    ip.vignetteStretch = 0.4;
    ip.vignetteColor = new B.Color4(0, 0, 0, 0);

    this.pipeline = pipeline;
  }

  private setupShadows(): void {
    // Shadow generator is created lazily once the sun exists (see attachSun).
  }

  /** Binds the directional light so its shadows can be generated. */
  attachSun(light: any): void {
    const B = (window as any).BABYLON;
    if (this.shadowGenerator) return;

    light.shadowMinZ = 1;
    light.shadowMaxZ = 600;
    const sg = new B.ShadowGenerator(2048, light);
    sg.usePercentageCloserFiltering = true;
    sg.filteringQuality = B.ShadowGenerator.QUALITY_MEDIUM;
    sg.bias = 0.0006;
    sg.normalBias = 0.02;
    sg.darkness = 0.0;
    sg.transparencyShadow = false;
    this.shadowGenerator = sg;

    // Anything that looks like a prop casts shadows, whenever it appears.
    this.scene.meshes.forEach((m: any) => this.maybeCast(m));
    this.meshObserver = this.scene.onNewMeshAddedObservable.add((m: any) => this.maybeCast(m));
  }

  private maybeCast(mesh: any): void {
    if (!this.shadowGenerator || !mesh?.name) return;
    if (this.shadowCasterPattern.test(mesh.name)) {
      this.shadowGenerator.addShadowCaster(mesh);
      mesh.receiveShadows = true;
    }
  }

  setMood(mood: Partial<AtmosphereMood>): void {
    this.mood = { ...this.mood, ...mood };
    this.baseFogDensity = this.mood.heavyFog ? 0.0075 : 0.0022;
  }

  getShadowGenerator(): any {
    return this.shadowGenerator;
  }

  tick(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
  }

  /** Pushes the current sky palette into the shader, fog and clear colour. */
  update(state: SkyState): void {
    if (!this.skyMaterial) return;
    const B = (window as any).BABYLON;

    let { zenith, horizon, cloudColor } = state;
    const sunColor = state.sunColor;

    if (this.mood.redSky) {
      const day = 1 - state.night;
      zenith = lerpRGB(zenith, { r: 0.28 * day + 0.03, g: 0.03, b: 0.05 }, 0.75);
      horizon = lerpRGB(horizon, { r: 0.75 * day + 0.06, g: 0.16 * day + 0.02, b: 0.08 }, 0.7);
      cloudColor = lerpRGB(cloudColor, { r: 0.5 * day + 0.05, g: 0.1, b: 0.1 }, 0.7);
    }

    const sm = this.skyMaterial;
    sm.setVector3('sunDir', new B.Vector3(state.sunDir.x, state.sunDir.y, state.sunDir.z));
    sm.setVector3('moonDir', new B.Vector3(-state.sunDir.x, -state.sunDir.y, -state.sunDir.z));
    sm.setColor3('zenithColor', new B.Color3(zenith.r, zenith.g, zenith.b));
    sm.setColor3('horizonColor', new B.Color3(horizon.r, horizon.g, horizon.b));
    sm.setColor3('sunColor', new B.Color3(sunColor.r, sunColor.g, sunColor.b));
    sm.setColor3('cloudColor', new B.Color3(cloudColor.r, cloudColor.g, cloudColor.b));
    sm.setFloat('night', state.night);
    sm.setFloat('time', this.elapsed);
    sm.setFloat('cloudCover', this.mood.heavyFog ? 0.78 : this.mood.cloudCover);

    // Fog tracks the horizon so distant terrain melts into the sky.
    const fog = lerpRGB(horizon, zenith, 0.12);
    this.scene.fogColor = new B.Color3(fog.r, fog.g, fog.b);
    this.scene.fogDensity = this.baseFogDensity * (1 + state.night * 0.6);
    this.scene.clearColor = new B.Color4(horizon.r, horizon.g, horizon.b, 1);

    // Exposure eases down at night so bloom/tonemap don't blow out the moon.
    if (this.pipeline) {
      this.pipeline.imageProcessing.exposure = lerp(1.05, 1.9, state.night);
      this.pipeline.bloomWeight = lerp(0.25, 0.4, state.night);
    }

    if (this.shadowGenerator) {
      // Shadows soften and fade as the sun drops near the horizon.
      const strength = smoothstep(0.0, 0.18, Math.abs(state.elevation) * (state.elevation > 0 ? 1 : 0.6));
      this.shadowGenerator.darkness = 1 - Math.min(1, strength) * 0.78;
    }
  }

  dispose(): void {
    if (this.meshObserver) {
      this.scene.onNewMeshAddedObservable.remove(this.meshObserver);
      this.meshObserver = null;
    }
    this.pipeline?.dispose();
    this.pipeline = null;
    this.shadowGenerator?.dispose();
    this.shadowGenerator = null;
    this.skyMesh?.dispose();
    this.skyMaterial?.dispose();
    this.skyMesh = null;
    this.skyMaterial = null;
  }
}
