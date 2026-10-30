/**
 * MaterialHelpers
 *
 * Utility functions for creating and configuring Babylon.js materials.
 * Extracted from BasicAgent.js and used across all model generators.
 *
 * @module utils
 */

import type { ColorRGB } from './ColorHelpers.ts';

export interface MaterialOptions {
  name: string;
  diffuseColor: ColorRGB;
  specularColor?: ColorRGB;
  emissiveColor?: ColorRGB;
  alpha?: number;
  backFaceCulling?: boolean;
}

/**
 * Creates a StandardMaterial with the given options
 */
export function createStandardMaterial(scene: any, options: MaterialOptions): any {
  const BABYLON = (window as any).BABYLON;
  const material = new BABYLON.StandardMaterial(options.name, scene);

  material.diffuseColor = new BABYLON.Color3(options.diffuseColor.r, options.diffuseColor.g, options.diffuseColor.b);

  if (options.specularColor) {
    material.specularColor = new BABYLON.Color3(options.specularColor.r, options.specularColor.g, options.specularColor.b);
  } else {
    material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
  }

  if (options.emissiveColor) {
    material.emissiveColor = new BABYLON.Color3(options.emissiveColor.r, options.emissiveColor.g, options.emissiveColor.b);
  }

  if (options.alpha !== undefined) {
    material.alpha = options.alpha;
  }

  if (options.backFaceCulling !== undefined) {
    material.backFaceCulling = options.backFaceCulling;
  }

  return material;
}

/**
 * Creates a simple colored material (diffuse only)
 */
export function createSimpleMaterial(scene: any, name: string, color: ColorRGB): any {
  return createStandardMaterial(scene, {
    name,
    diffuseColor: color,
    specularColor: { r: 0.1, g: 0.1, b: 0.1 }
  });
}

/**
 * Creates a wood-toned material for hulls and structures
 */
export function createWoodMaterial(scene: any, name: string): any {
  return createStandardMaterial(scene, {
    name,
    diffuseColor: {
      r: 0.8 + Math.random() * 0.2,
      g: 0.4 + Math.random() * 0.2,
      b: 0.2 + Math.random() * 0.1
    },
    specularColor: { r: 0.2, g: 0.2, b: 0.2 }
  });
}

/**
 * Creates a fabric/sail material
 */
export function createFabricMaterial(scene: any, name: string, color?: ColorRGB): any {
  return createStandardMaterial(scene, {
    name,
    diffuseColor: color ?? { r: 1, g: 1, b: 1 },
    specularColor: { r: 0.1, g: 0.1, b: 0.1 },
    backFaceCulling: false
  });
}
