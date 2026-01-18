// Minimal ambient declarations for global libraries used in the project
// Keep these loose initially; we can refine types incrementally.

declare const BABYLON: any;

declare const HavokPhysics: any;

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}
