// Type declarations for Babylon.js loaded via CDN
// BABYLON is available globally at runtime

// Declare BABYLON namespace with exported types
namespace BABYLON {
    export type Scene = any;
    export type Engine = any;
    export type Vector3 = any;
    export type Vector2 = any;
    export type Color3 = any;
    export type Color4 = any;
    export type Mesh = any;
    export type TransformNode = any;
    export type Node = any;
    export type Camera = any;
    export type ArcRotateCamera = any;
    export type FreeCamera = any;
    export type UniversalCamera = any;
    export type Light = any;
    export type HemisphericLight = any;
    export type DirectionalLight = any;
    export type PointLight = any;
    export type Material = any;
    export type StandardMaterial = any;
    export type Texture = any;
    export type Animation = any;
    export type AnimationGroup = any;
    export type Matrix = any;
    export type Quaternion = any;
    export type BoundingInfo = any;
    export type BoundingBox = any;
    export type BoundingSphere = any;
    export type Observable<T> = any;
    export type Observer<T> = any;
    export type EventState = any;
    export type ActionManager = any;
    export type Action = any;
    export type ExecuteCodeAction = any;
    export type Condition = any;
    export type ActionEvent = any;
    export type PhysicsAggregate = any;
    export type ParticleSystem = any;
    export type RecastJSPlugin = any;
    
    export namespace GUI {
        export type AdvancedDynamicTexture = any;
        export type Control = any;
        export type Container = any;
        export type Rectangle = any;
        export type Ellipse = any;
        export type StackPanel = any;
        export type TextBlock = any;
        export type Button = any;
        export type Image = any;
        export type Slider = any;
    }
}

// Declare the runtime value
declare const BABYLON: any;
declare const HavokPhysics: any;

// Extend Window interface
interface Window {
    BABYLON: any;
    HavokPhysics: any;
    BowlCreator: {
        getTerrainHeight: (x: number, z: number) => number;
    };
}
