// Global type declarations for libraries loaded via CDN
// These are loaded in index.html and available globally

/// <reference types="@babylonjs/core" />
/// <reference types="@babylonjs/gui" />

declare global {
    // Declare BABYLON as available globally with full types
    const BABYLON: typeof import('@babylonjs/core') & {
        GUI: typeof import('@babylonjs/gui');
    };
    
    const HavokPhysics: any;
    
    interface Window {
        BABYLON: typeof import('@babylonjs/core') & {
            GUI: typeof import('@babylonjs/gui');
        };
        HavokPhysics: any;
        BowlCreator: {
            getTerrainHeight: (x: number, z: number) => number;
        };
    }
}

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

export {};
