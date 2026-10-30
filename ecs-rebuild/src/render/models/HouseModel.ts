/**
 * HouseModel
 *
 * Simple procedural house mesh for the village vertical slice.
 */

export interface HouseParts {
  root: unknown;
  body: unknown;
  roof: unknown;
}

/**
 * Creates procedural house meshes
 */
export class HouseModel {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scene: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private meshes: any[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scene: any) {
    this.scene = scene;
  }

  create(position: { x: number; y: number; z: number }): HouseParts {
    const BABYLON = (window as any).BABYLON;
    const name = `house_${this.meshes.length}`;

    const root = new BABYLON.TransformNode(name, this.scene);
    root.position = new BABYLON.Vector3(position.x, position.y, position.z);

    const body = BABYLON.MeshBuilder.CreateBox(
      `${name}_body`,
      { width: 4, height: 3, depth: 4 },
      this.scene
    );
    body.parent = root;
    body.position.y = 1.5;

    const bodyMat = new BABYLON.StandardMaterial(`${name}_bodyMat`, this.scene);
    bodyMat.diffuseColor = new BABYLON.Color3(0.76, 0.65, 0.5);
    body.material = bodyMat;

    const roof = BABYLON.MeshBuilder.CreateCylinder(
      `${name}_roof`,
      { diameter: 5.5, height: 2, tessellation: 4 },
      this.scene
    );
    roof.parent = root;
    roof.position.y = 3.5;
    roof.rotation.y = Math.PI / 4;

    const roofMat = new BABYLON.StandardMaterial(`${name}_roofMat`, this.scene);
    roofMat.diffuseColor = new BABYLON.Color3(0.55, 0.25, 0.2);
    roof.material = roofMat;

    this.meshes.push(root);
    return { root, body, roof };
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      if (mesh?.dispose) mesh.dispose();
    }
    this.meshes = [];
  }
}
