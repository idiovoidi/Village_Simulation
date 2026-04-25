/**
 * BoatModel
 *
 * Procedural mesh generator for boat/ship meshes.
 * Creates sailing vessels with hull, mast, and sail.
 *
 * @module render/models
 */

export interface BoatParts {
  root: any;
  hull: any;
  mast: any;
  sail: any;
}

export interface BoatConfig {
  color?: { r: number; g: number; b: number };
  scale?: number;
  hasSail?: boolean;
}

/**
 * Creates procedural boat meshes
 */
export class BoatModel {
  private scene: any;

  constructor(scene: any) {
    this.scene = scene;
  }

  /**
   * Creates a boat mesh at the specified position
   */
  create(position: { x: number; y: number; z: number }, config?: BoatConfig): BoatParts {
    const BABYLON = (window as any).BABYLON;
    const scale = config?.scale ?? 1;
    const hasSail = config?.hasSail ?? true;

    // Create boat container
    const boat = new BABYLON.TransformNode('boat', this.scene);
    boat.position = new BABYLON.Vector3(position.x, position.y, position.z);

    // Create hull
    const hull = BABYLON.MeshBuilder.CreateBox(
      'hull',
      { width: 2 * scale, height: 1 * scale, depth: 4 * scale },
      this.scene
    );
    hull.parent = boat;
    hull.position.y = 0.5 * scale;

    // Create materials
    const color = config?.color ?? { r: 0.8, g: 0.5, b: 0.3 };
    const hullMat = new BABYLON.StandardMaterial('hullMat', this.scene);
    hullMat.diffuseColor = new BABYLON.Color3(color.r, color.g, color.b);
    hullMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    hull.material = hullMat;

    let mast = null;
    let sail = null;

    if (hasSail) {
      // Create mast
      mast = BABYLON.MeshBuilder.CreateCylinder(
        'mast',
        { diameter: 0.2 * scale, height: 4 * scale },
        this.scene
      );
      mast.parent = boat;
      mast.position.y = 2.5 * scale;
      mast.material = hullMat;

      // Create sail
      sail = BABYLON.MeshBuilder.CreatePlane(
        'sail',
        { width: 2 * scale, height: 3 * scale },
        this.scene
      );
      sail.parent = boat;
      sail.position.y = 2 * scale;
      sail.rotation.y = Math.PI / 2;

      const sailMat = new BABYLON.StandardMaterial('sailMat', this.scene);
      sailMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
      sailMat.backFaceCulling = false;
      sailMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      sail.material = sailMat;
    }

    return {
      root: boat,
      hull,
      mast,
      sail
    };
  }

  /**
   * Animates the boat rocking on water
   */
  animateRocking(parts: BoatParts, deltaTime: number, intensity: number): void {
    if (!parts.root) return;

    // Gentle rocking motion
    parts.root.rotation.z = Math.sin(deltaTime * 2) * 0.05 * intensity;
    parts.root.rotation.x = Math.sin(deltaTime * 1.5) * 0.03 * intensity;

    // Sail fluttering
    if (parts.sail) {
      parts.sail.rotation.z = Math.sin(deltaTime * 5) * 0.1 * intensity;
    }
  }

  /**
   * Disposes the boat mesh
   */
  dispose(parts: BoatParts): void {
    if (parts.root) {
      parts.root.dispose();
    }
  }
}

/**
 * Factory function for creating BoatModel instances
 */
export function createBoatModel(scene: any): BoatModel {
  return new BoatModel(scene);
}
