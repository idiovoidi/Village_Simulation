/**
 * Rendering Components
 * 
 * Components for visual representation, 3D models, animations, and rendering properties.
 * Used by the Babylon.js rendering system.
 */

import type { Component } from '../core/Component';

/**
 * 3D model component.
 * References a mesh in the Babylon.js scene.
 */
export interface ModelComponent extends Component {
  readonly type: 'Model';
  meshId: string; // Identifier for the mesh type
  meshInstance: unknown; // Babylon.js mesh reference (typed as unknown for ECS purity)
  lodLevel: number; // Current level of detail (0 = highest quality)
  visible: boolean;
}

/**
 * Animation state component.
 * Controls animation playback for animated entities.
 */
export interface AnimationStateComponent extends Component {
  readonly type: 'AnimationState';
  currentAnimation: string;
  animationSpeed: number;
  looping: boolean;
  blendTime: number; // Time to blend between animations
  weight: number; // Animation weight for blending
}

/**
 * Visual properties component.
 * Controls appearance and rendering behavior.
 */
export interface VisualComponent extends Component {
  readonly type: 'Visual';
  color: {
    r: number;
    g: number;
    b: number;
  };
  opacity: number; // 0-1
  emissive: boolean;
  castShadows: boolean;
  receiveShadows: boolean;
  renderingGroupId: number; // Babylon.js rendering group
}

/**
 * Factory functions for creating rendering components with default values.
 */

export function createModelComponent(
  meshId: string,
  lodLevel = 0,
  visible = true
): ModelComponent {
  return {
    type: 'Model',
    meshId,
    meshInstance: null,
    lodLevel,
    visible
  };
}

export function createAnimationStateComponent(
  currentAnimation = 'idle',
  animationSpeed = 1.0,
  looping = true
): AnimationStateComponent {
  return {
    type: 'AnimationState',
    currentAnimation,
    animationSpeed,
    looping,
    blendTime: 0.2,
    weight: 1.0
  };
}

export function createVisualComponent(
  color: { r: number; g: number; b: number } = { r: 1, g: 1, b: 1 },
  opacity = 1.0
): VisualComponent {
  return {
    type: 'Visual',
    color,
    opacity,
    emissive: false,
    castShadows: true,
    receiveShadows: true,
    renderingGroupId: 0
  };
}

/**
 * Helper function to set animation.
 */
export function setAnimation(
  component: AnimationStateComponent,
  animationName: string,
  speed = 1.0,
  looping = true
): void {
  component.currentAnimation = animationName;
  component.animationSpeed = speed;
  component.looping = looping;
}

/**
 * Helper function to set color.
 */
export function setColor(
  component: VisualComponent,
  r: number,
  g: number,
  b: number
): void {
  component.color.r = r;
  component.color.g = g;
  component.color.b = b;
}
