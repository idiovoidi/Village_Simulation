/**
 * ColorHelpers
 *
 * Utility functions for color generation and manipulation.
 * Used for procedural materials and visual variety.
 *
 * @module utils
 */

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Generates a random skin tone
 */
export function generateSkinTone(): ColorRGB {
  return {
    r: 0.8 + Math.random() * 0.2,
    g: 0.6 + Math.random() * 0.2,
    b: 0.4 + Math.random() * 0.2
  };
}

/**
 * Generates a random color from a curated palette
 */
export function generateRandomClothingColor(): ColorRGB {
  const colors: ColorRGB[] = [
    { r: 0.8, g: 0.2, b: 0.2 }, // Red
    { r: 0.2, g: 0.6, b: 0.8 }, // Blue
    { r: 0.2, g: 0.8, b: 0.2 }, // Green
    { r: 0.8, g: 0.8, b: 0.2 }, // Yellow
    { r: 0.8, g: 0.4, b: 0.8 }, // Purple
    { r: 0.4, g: 0.8, b: 0.8 }, // Cyan
    { r: 0.8, g: 0.6, b: 0.2 }  // Orange
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Generates a random natural color (greens, browns, etc.)
 */
export function generateNaturalColor(): ColorRGB {
  const colors: ColorRGB[] = [
    { r: 0.2, g: 0.6, b: 0.2 }, // Forest green
    { r: 0.4, g: 0.5, b: 0.2 }, // Olive
    { r: 0.5, g: 0.4, b: 0.2 }, // Brown
    { r: 0.3, g: 0.5, b: 0.3 }, // Sage
    { r: 0.6, g: 0.5, b: 0.3 }  // Tan
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Scales a color by a factor
 */
export function scaleColor(color: ColorRGB, factor: number): ColorRGB {
  return {
    r: Math.min(1, color.r * factor),
    g: Math.min(1, color.g * factor),
    b: Math.min(1, color.b * factor)
  };
}

/**
 * Interpolates between two colors
 */
export function lerpColor(a: ColorRGB, b: ColorRGB, t: number): ColorRGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  };
}

/**
 * Converts a hex color string to RGB
 */
export function hexToRgb(hex: string): ColorRGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  };
}
