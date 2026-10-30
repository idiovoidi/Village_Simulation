/**
 * Ambient typings for Babylon.js / Havok loaded from CDN.
 * Runtime objects come from window globals; this keeps TypeScript happy without bundling babylonjs.
 */

declare module 'babylonjs' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BABYLON: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Scene = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type TransformNode = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Mesh = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Material = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Color3 = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Vector3 = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type StandardMaterial = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type VertexData = any;
  // Allow `typeof import('babylonjs')` namespace access used across the codebase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Mesh: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const MeshBuilder: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const VertexData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const StandardMaterial: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Color3: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const GUI: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _default: any;
  export default _default;
}

declare const BABYLON: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

declare const HavokPhysics: (() => Promise<unknown>) | undefined;

interface Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BABYLON: any;
  HavokPhysics?: () => Promise<unknown>;
}
