/**
 * TreeModel
 *
 * Simple procedural tree mesh for the village vertical slice.
 */

export interface TreeParts {
  root: unknown;
  trunk: unknown;
  canopy: unknown;
}

/**
 * Creates procedural tree meshes
 */
export class TreeModel {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scene: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private meshes: any[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scene: any) {
    this.scene = scene;
  }

  create(position: { x: number; y: number; z: number }): TreeParts {
    const BABYLON = (window as any).BABYLON;
    const name = `tree_${this.meshes.length}`;

    const root = new BABYLON.TransformNode(name, this.scene);
    root.position = new BABYLON.Vector3(position.x, position.y, position.z);

    const trunk = BABYLON.MeshBuilder.CreateCylinder(
      `${name}_trunk`,
      { diameter: 0.5, height: 2.5, tessellation: 8 },
      this.scene
    );
    trunk.parent = root;
    trunk.position.y = 1.25;

    const trunkMat = new BABYLON.StandardMaterial(`${name}_trunkMat`, this.scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.4, 0.25, 0.1);
    trunk.material = trunkMat;

    const canopy = BABYLON.MeshBuilder.CreateSphere(
      `${name}_canopy`,
      { diameter: 3, segments: 8 },
      this.scene
    );
    canopy.parent = root;
    canopy.position.y = 3.2;

    const canopyMat = new BABYLON.StandardMaterial(`${name}_canopyMat`, this.scene);
    canopyMat.diffuseColor = new BABYLON.Color3(0.2, 0.55, 0.2);
    canopy.material = canopyMat;

    this.meshes.push(root);
    return { root, trunk, canopy };
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      if (mesh?.dispose) mesh.dispose();
    }
    this.meshes = [];
  }
}
