/**
 * FieldModel — simple ground patch for market / crop fields.
 */

export interface FieldParts {
  root: unknown;
}

export class FieldModel {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scene: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private meshes: any[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scene: any) {
    this.scene = scene;
  }

  create(position: { x: number; y: number; z: number }): FieldParts {
    const BABYLON = (window as any).BABYLON;
    const name = `field_${this.meshes.length}`;

    const root = new BABYLON.TransformNode(name, this.scene);
    root.position = new BABYLON.Vector3(position.x, position.y, position.z);

    const patch = BABYLON.MeshBuilder.CreateGround(
      `${name}_patch`,
      { width: 8, height: 8 },
      this.scene
    );
    patch.parent = root;
    patch.position.y = 0.05;

    const mat = new BABYLON.StandardMaterial(`${name}_mat`, this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.45, 0.35, 0.2);
    patch.material = mat;

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