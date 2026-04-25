/**
 * BirdModel
 *
 * Procedural mesh generator for bird characters.
 * Creates animated birds with flapping wings.
 *
 * @module render/models
 */

export interface BirdParts {
  root: any; // TransformNode
  body: any; // Mesh
  wingLeft: any; // Mesh
  wingRight: any; // Mesh
  tail: any; // Mesh
}

export interface BirdConfig {
  color?: { r: number; g: number; b: number };
  scale?: number;
}

/**
 * Creates procedural bird meshes
 */
export class BirdModel {
  private scene: any;

  constructor(scene: any) {
    this.scene = scene;
  }

  /**
   * Creates a bird mesh at the specified position
   */
  create(position: { x: number; y: number; z: number }, config?: BirdConfig): BirdParts {
    const BABYLON = (window as any).BABYLON;
    const scale = config?.scale ?? 1;

    // Create root node
    const root = new BABYLON.TransformNode('bird', this.scene);
    root.position = new BABYLON.Vector3(position.x, position.y, position.z);
    root.scaling = new BABYLON.Vector3(scale, scale, scale);

    // Create body
    const body = BABYLON.MeshBuilder.CreateCapsule(
      'birdBody',
      { radius: 0.2, height: 0.8, tessellation: 8 },
      this.scene
    );
    body.parent = root;
    body.rotation.z = Math.PI / 2;

    // Create wings
    const wingLeft = this.createWing('wingLeft', -0.2);
    const wingRight = this.createWing('wingRight', 0.2);

    // Create tail
    const tail = BABYLON.MeshBuilder.CreateBox(
      'tail',
      { width: 0.3, height: 0.05, depth: 0.2 },
      this.scene
    );
    tail.parent = root;
    tail.position.z = -0.4;
    tail.position.y = 0;

    // Create materials
    const color = config?.color ?? {
      r: 0.6 + Math.random() * 0.2,
      g: 0.6 + Math.random() * 0.2,
      b: 0.6 + Math.random() * 0.2
    };

    const bodyMaterial = new BABYLON.StandardMaterial('birdMat', this.scene);
    bodyMaterial.diffuseColor = new BABYLON.Color3(color.r, color.g, color.b);

    const wingMaterial = new BABYLON.StandardMaterial('wingMat', this.scene);
    wingMaterial.diffuseColor = new BABYLON.Color3(
      color.r * 0.8,
      color.g * 0.8,
      color.b * 0.8
    );

    // Apply materials
    body.material = bodyMaterial;
    wingLeft.material = wingMaterial;
    wingRight.material = wingMaterial;
    tail.material = wingMaterial;

    return {
      root,
      body,
      wingLeft,
      wingRight,
      tail
    };
  }

  /**
   * Creates a wing mesh
   */
  private createWing(name: string, yOffset: number): any {
    const BABYLON = (window as any).BABYLON;
    const wing = BABYLON.MeshBuilder.CreateBox(
      name,
      { width: 0.8, height: 0.05, depth: 0.3 },
      this.scene
    );
    wing.parent = this.scene.meshes.find((m: any) => m.name === 'bird');
    wing.position = new BABYLON.Vector3(0, yOffset, 0);
    return wing;
  }

  /**
   * Animates the bird wings
   */
  animate(parts: BirdParts, deltaTime: number, speed: number): void {
    if (!parts.root) return;

    const flapSpeed = 15 + speed * 20;
    const flapAmount = 0.5 + speed * 0.5;

    // Wing flapping
    if (parts.wingLeft && parts.wingRight) {
      const wingAngle = Math.sin(deltaTime * flapSpeed) * flapAmount;
      parts.wingLeft.rotation.x = wingAngle;
      parts.wingRight.rotation.x = -wingAngle;
    }

    // Tail movement
    if (parts.tail) {
      parts.tail.rotation.y = Math.sin(deltaTime * 5) * 0.1;
    }
  }

  /**
   * Sets the bird color
   */
  setColor(parts: BirdParts, color: { r: number; g: number; b: number }): void {
    if (!parts.root) return;

    const BABYLON = (window as any).BABYLON;
    const childMeshes = parts.root.getChildMeshes?.() ?? [];
    if (childMeshes.length > 0 && childMeshes[0].material) {
      childMeshes[0].material.diffuseColor = new BABYLON.Color3(color.r, color.g, color.b);
    }
  }

  /**
   * Disposes the bird mesh
   */
  dispose(parts: BirdParts): void {
    if (parts.root) {
      const childMeshes = parts.root.getChildMeshes?.() ?? [];
      childMeshes.forEach((mesh: any) => {
        if (mesh.material) {
          mesh.material.dispose();
        }
        mesh.dispose();
      });
      parts.root.dispose();
    }
  }
}

/**
 * Factory function for creating BirdModel instances
 */
export function createBirdModel(scene: any): BirdModel {
  return new BirdModel(scene);
}
