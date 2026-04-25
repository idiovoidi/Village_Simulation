/**
 * FishModel
 *
 * Procedural mesh generator for fish characters.
 * Creates aquatic creatures with animated tails.
 *
 * @module render/models
 */

export interface FishParts {
  root: any;
  body: any;
  tail: any;
}

export interface FishConfig {
  color?: { r: number; g: number; b: number };
  scale?: number;
  alpha?: number;
}

/**
 * Creates procedural fish meshes
 */
export class FishModel {
  private scene: any;

  constructor(scene: any) {
    this.scene = scene;
  }

  /**
   * Creates a fish mesh at the specified position
   */
  create(position: { x: number; y: number; z: number }, config?: FishConfig): FishParts {
    const BABYLON = (window as any).BABYLON;
    const scale = config?.scale ?? 1;
    const alpha = config?.alpha ?? 0.8;

    // Create main body
    const body = BABYLON.MeshBuilder.CreateBox(
      'fishBody',
      { width: 0.5 * scale, height: 0.3 * scale, depth: 1 * scale },
      this.scene
    );
    body.position = new BABYLON.Vector3(position.x, position.y, position.z);

    // Create tail
    const tail = BABYLON.MeshBuilder.CreateBox(
      'fishTail',
      { width: 0.4 * scale, height: 0.2 * scale, depth: 0.3 * scale },
      this.scene
    );
    tail.parent = body;
    tail.position.z = -0.6 * scale;

    // Create material
    const color = config?.color ?? { r: 0.4, g: 0.8, b: 1.0 };
    const fishMaterial = new BABYLON.StandardMaterial('fishMat', this.scene);
    fishMaterial.diffuseColor = new BABYLON.Color3(color.r, color.g, color.b);
    fishMaterial.alpha = alpha;

    // Apply material
    body.material = fishMaterial;
    tail.material = fishMaterial;

    return {
      root: body,
      body,
      tail
    };
  }

  /**
   * Animates the fish swimming
   */
  animate(parts: FishParts, deltaTime: number, speed: number): void {
    if (!parts.tail) return;

    // Tail wagging animation
    const wagSpeed = 5 + speed * 10;
    parts.tail.rotation.y = Math.sin(deltaTime * wagSpeed) * 0.5;
  }

  /**
   * Disposes the fish mesh
   */
  dispose(parts: FishParts): void {
    if (parts.root) {
      parts.root.dispose();
    }
  }
}

/**
 * Factory function for creating FishModel instances
 */
export function createFishModel(scene: any): FishModel {
  return new FishModel(scene);
}
