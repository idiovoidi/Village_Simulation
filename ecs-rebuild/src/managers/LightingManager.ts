/**
 * LightingManager
 * 
 * Manages scene lighting including directional sun light and ambient lighting.
 * Supports dynamic lighting for day/night cycle.
 */

/**
 * LightingManager handles creation and management of scene lights.
 * Provides directional light for sun and hemispheric light for ambient lighting.
 */
export class LightingManager {
  private scene: any; // Babylon.Scene
  private directionalLight: any; // Babylon.DirectionalLight (sun)
  private hemisphericLight: any; // Babylon.HemisphericLight (ambient)
  private sunIntensity: number;
  private ambientIntensity: number;

  /**
   * Creates a new LightingManager.
   * 
   * @param scene - The Babylon.js scene
   */
  constructor(scene: any) {
    this.scene = scene;
    this.directionalLight = null;
    this.hemisphericLight = null;
    this.sunIntensity = 1.0;
    this.ambientIntensity = 0.5;
  }

  /**
   * Initializes the lighting system with default lights.
   * Creates a directional light for the sun and a hemispheric light for ambient lighting.
   */
  initialize(): void {
    const BABYLON = (window as any).BABYLON;

    // Create directional light (sun)
    this.directionalLight = new BABYLON.DirectionalLight(
      'sunLight',
      new BABYLON.Vector3(-1, -2, -1), // Direction from top-right
      this.scene
    );
    this.directionalLight.intensity = this.sunIntensity;
    this.directionalLight.diffuse = new BABYLON.Color3(1, 0.95, 0.8); // Warm sunlight
    this.directionalLight.specular = new BABYLON.Color3(1, 1, 0.9);

    // Enable shadows (optional, can be configured later)
    // Shadow generator will be created by systems that need it

    // Create hemispheric light (ambient)
    this.hemisphericLight = new BABYLON.HemisphericLight(
      'ambientLight',
      new BABYLON.Vector3(0, 1, 0), // Direction from above
      this.scene
    );
    this.hemisphericLight.intensity = this.ambientIntensity;
    this.hemisphericLight.diffuse = new BABYLON.Color3(0.8, 0.85, 1.0); // Cool ambient
    this.hemisphericLight.specular = new BABYLON.Color3(0, 0, 0); // No specular from ambient
    this.hemisphericLight.groundColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Dark ground reflection
  }

  /**
   * Updates lighting based on time of day.
   * Adjusts light intensity and color to simulate day/night cycle.
   * 
   * @param timeOfDay - Time of day in hours (0-24)
   */
  updateForTimeOfDay(timeOfDay: number): void {
    if (!this.directionalLight || !this.hemisphericLight) {
      return;
    }

    const BABYLON = (window as any).BABYLON;

    // Normalize time to 0-1 range
    const normalizedTime = (timeOfDay % 24) / 24;

    // Calculate sun position based on time
    // Sun rises at 6:00 (0.25), peaks at 12:00 (0.5), sets at 18:00 (0.75)
    const sunAngle = (normalizedTime - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);

    // Update sun direction
    const sunDirection = new BABYLON.Vector3(
      Math.cos(sunAngle),
      sunHeight,
      Math.sin(sunAngle) * 0.5
    );
    this.directionalLight.direction = sunDirection.normalize();

    // Calculate light intensity based on sun height
    let sunIntensity: number;
    let ambientIntensity: number;
    let sunColor: any;
    let ambientColor: any;

    if (sunHeight > 0) {
      // Daytime
      sunIntensity = Math.max(0.3, sunHeight) * this.sunIntensity;
      ambientIntensity = Math.max(0.4, sunHeight * 0.8) * this.ambientIntensity;

      // Sunrise/sunset colors (when sun is low)
      if (sunHeight < 0.3) {
        const sunsetFactor = sunHeight / 0.3;
        sunColor = new BABYLON.Color3(
          1,
          0.6 + sunsetFactor * 0.35,
          0.3 + sunsetFactor * 0.5
        );
        ambientColor = new BABYLON.Color3(
          0.6 + sunsetFactor * 0.2,
          0.5 + sunsetFactor * 0.35,
          0.7 + sunsetFactor * 0.3
        );
      } else {
        // Normal daylight
        sunColor = new BABYLON.Color3(1, 0.95, 0.8);
        ambientColor = new BABYLON.Color3(0.8, 0.85, 1.0);
      }
    } else {
      // Nighttime
      sunIntensity = 0;
      ambientIntensity = 0.15 * this.ambientIntensity; // Dim ambient at night

      sunColor = new BABYLON.Color3(0.3, 0.3, 0.5); // Moonlight
      ambientColor = new BABYLON.Color3(0.1, 0.1, 0.2); // Dark blue night
    }

    // Apply lighting changes
    this.directionalLight.intensity = sunIntensity;
    this.directionalLight.diffuse = sunColor;

    this.hemisphericLight.intensity = ambientIntensity;
    this.hemisphericLight.diffuse = ambientColor;
  }

  /**
   * Sets the sun light intensity.
   * 
   * @param intensity - The intensity value (0-1)
   */
  setSunIntensity(intensity: number): void {
    this.sunIntensity = Math.max(0, Math.min(1, intensity));
    if (this.directionalLight) {
      this.directionalLight.intensity = this.sunIntensity;
    }
  }

  /**
   * Sets the ambient light intensity.
   * 
   * @param intensity - The intensity value (0-1)
   */
  setAmbientIntensity(intensity: number): void {
    this.ambientIntensity = Math.max(0, Math.min(1, intensity));
    if (this.hemisphericLight) {
      this.hemisphericLight.intensity = this.ambientIntensity;
    }
  }

  /**
   * Gets the directional light (sun).
   * 
   * @returns The directional light
   */
  getDirectionalLight(): any {
    return this.directionalLight;
  }

  /**
   * Gets the hemispheric light (ambient).
   * 
   * @returns The hemispheric light
   */
  getHemisphericLight(): any {
    return this.hemisphericLight;
  }

  /**
   * Enables or disables shadows for the directional light.
   * 
   * @param enabled - Whether shadows should be enabled
   * @param shadowMapSize - Size of the shadow map (default: 1024)
   * @returns The shadow generator if enabled, null otherwise
   */
  setShadowsEnabled(enabled: boolean, shadowMapSize: number = 1024): any {
    if (!this.directionalLight) {
      return null;
    }

    const BABYLON = (window as any).BABYLON;

    if (enabled) {
      const shadowGenerator = new BABYLON.ShadowGenerator(shadowMapSize, this.directionalLight);
      shadowGenerator.useBlurExponentialShadowMap = true;
      shadowGenerator.blurKernel = 32;
      return shadowGenerator;
    }

    return null;
  }

  /**
   * Disposes of all lights and cleans up resources.
   */
  dispose(): void {
    if (this.directionalLight) {
      this.directionalLight.dispose();
      this.directionalLight = null;
    }

    if (this.hemisphericLight) {
      this.hemisphericLight.dispose();
      this.hemisphericLight = null;
    }
  }
}
