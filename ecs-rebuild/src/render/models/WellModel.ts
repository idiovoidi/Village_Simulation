/**
 * WellModel — simple procedural well for village decorations.
 */

export interface WellParts {
  root: unknown;
}

export class WellModel {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scene: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private meshes: any[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scene: any) {
    this.scene = scene;
  }

  create(position: { x: number; y: number; z: number }): WellParts {
    const BABYLON = (window as any).BABYLON;
    const name = `well_${this.meshes.length}`;

    const root = new BABYLON.TransformNode(name, this.scene);
    root.position = new BABYLON.Vector3(position.x, position.y, position.z);

    const base = BABYLON.MeshBuilder.CreateCylinder(
      `${name}_base`,
      { diameter: 2, height: 1.2, tessellation: 16 },
      this.scene
    );
    base.parent = root;
    base.position.y = 0.6;

    const mat = new BABYLON.StandardMaterial(`${name}_mat`, this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.55, 0.55, 0.55);
    base.material = mat;

    this.meshes.push(root);
    return { root };
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      if (mesh?.dispose) mesh.dispose();
    }
    this.meshes = [];
  }
}
