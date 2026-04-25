/**
 * DinosaurModel
 *
 * Procedural mesh generator for dinosaur characters.
 * Creates large reptilian creatures with articulated limbs.
 *
 * @module render/models
 */

export interface DinosaurParts {
  root: any;
  body: any;
  head: any;
  jaw: any;
  legs: any[];
  tail: any;
}

export interface DinosaurConfig {
  scale?: number;
  color?: { r: number; g: number; b: number };
}

/**
 * Creates procedural dinosaur meshes
 */
export class DinosaurModel {
  private scene: any;

  constructor(scene: any) {
    this.scene = scene;
  }

  /**
   * Creates a dinosaur mesh at the specified position
   */
  create(position: { x: number; y: number; z: number }, config?: DinosaurConfig): DinosaurParts {
    const BABYLON = (window as any).BABYLON;
    const scale = config?.scale ?? 3;

    // Create main body
    const body = BABYLON.MeshBuilder.CreateBox(
      'dinoBody',
      { width: 1.2 * scale, height: 1.5 * scale, depth: 2.5 * scale },
      this.scene
    );
    body.position = new BABYLON.Vector3(position.x, position.y + 1.5 * scale, position.z);

    // Create head
    const head = BABYLON.MeshBuilder.CreateBox(
      'dinoHead',
      { width: 0.8 * scale, height: 0.8 * scale, depth: 1.2 * scale },
      this.scene
    );
    head.parent = body;
    head.position.z = 1.5 * scale;
    head.position.y = 0.4 * scale;

    // Create jaw
    const jaw = BABYLON.MeshBuilder.CreateBox(
      'dinoJaw',
      { width: 0.7 * scale, height: 0.4 * scale, depth: 1.0 * scale },
      this.scene
    );
    jaw.parent = head;
    jaw.position.y = -0.4 * scale;
    jaw.position.z = -0.1 * scale;

    // Create legs
    const legPositions = [
      { x: -0.4, z: 0.6 },  // Front Left
      { x: 0.4, z: 0.6 },   // Front Right
      { x: -0.4, z: -0.8 }, // Back Left
      { x: 0.4, z: -0.8 }   // Back Right
    ];

    const legs: any[] = [];
    legPositions.forEach((pos) => {
      const leg = BABYLON.MeshBuilder.CreateBox(
        'dinoLeg',
        { width: 0.3 * scale, height: 1.2 * scale, depth: 0.3 * scale },
        this.scene
      );
      leg.parent = body;
      leg.position.x = pos.x * scale;
      leg.position.z = pos.z * scale;
      leg.position.y = -1.35 * scale;
      legs.push(leg);
    });

    // Create tail
    const tail = BABYLON.MeshBuilder.CreateBox(
      'dinoTail',
      { width: 0.5 * scale, height: 0.5 * scale, depth: 2.0 * scale },
      this.scene
    );
    tail.parent = body;
    tail.position.z = -2.0 * scale;
    tail.position.y = 0;

    // Materials
    const color = config?.color ?? { r: 0.2, g: 0.5, b: 0.2 };
    const bodyMaterial = new BABYLON.StandardMaterial('dinoBodyMat', this.scene);
    bodyMaterial.diffuseColor = new BABYLON.Color3(color.r, color.g, color.b);

    const darkMaterial = new BABYLON.StandardMaterial('dinoDarkMat', this.scene);
    darkMaterial.diffuseColor = new BABYLON.Color3(
      color.r * 0.75,
      color.g * 0.75,
      color.b * 0.75
    );

    // Apply materials
    body.material = bodyMaterial;
    head.material = bodyMaterial;
    jaw.material = darkMaterial;
    tail.material = bodyMaterial;
    legs.forEach(leg => leg.material = darkMaterial);

    return {
      root: body,
      body,
      head,
      jaw,
      legs,
      tail
    };
  }

  /**
   * Animates the dinosaur walking
   */
  animateWalk(parts: DinosaurParts, deltaTime: number, speed: number): void {
    if (!parts.legs.length) return;

    const animSpeed = 6 * speed;

    // Animate legs
    parts.legs.forEach((leg, index) => {
      const phase = (index % 2) * Math.PI;
      const angle = deltaTime * animSpeed + phase;
      leg.rotation.x = Math.sin(angle) * 0.4;
    });

    // Tail swaying
    if (parts.tail) {
      parts.tail.rotation.y = Math.sin(deltaTime * 3) * 0.2;
    }

    // Head bobbing
    if (parts.head) {
      parts.head.rotation.x = Math.sin(deltaTime * animSpeed * 0.5) * 0.1;
    }
  }

  /**
   * Opens/closes the jaw
   */
  setJawOpen(parts: DinosaurParts, openAmount: number): void {
    if (parts.jaw) {
      parts.jaw.rotation.x = openAmount * 0.5;
    }
  }

  /**
   * Disposes the dinosaur mesh
   */
  dispose(parts: DinosaurParts): void {
    if (parts.root) {
      parts.root.dispose();
    }
  }
}

/**
 * Factory function for creating DinosaurModel instances
 */
export function createDinosaurModel(scene: any): DinosaurModel {
  return new DinosaurModel(scene);
}
