/**
 * DogModel
 *
 * Procedural mesh generator for dog characters.
 * Creates quadruped meshes with animated legs and tail.
 *
 * @module render/models
 */

export interface DogParts {
  root: any;
  body: any;
  head: any;
  snout: any;
  legs: any[];
  tail: any;
}

export interface DogConfig {
  color?: 'brown' | 'black' | 'golden';
  scale?: number;
}

/**
 * Creates procedural dog meshes
 */
export class DogModel {
  private scene: any;

  constructor(scene: any) {
    this.scene = scene;
  }

  /**
   * Creates a dog mesh at the specified position
   */
  create(position: { x: number; y: number; z: number }, config?: DogConfig): DogParts {
    const BABYLON = (window as any).BABYLON;
    const scale = config?.scale ?? 1;

    // Create body
    const body = BABYLON.MeshBuilder.CreateBox(
      'dogBody',
      { width: 0.8 * scale, height: 0.6 * scale, depth: 1.2 * scale },
      this.scene
    );
    body.position = new BABYLON.Vector3(position.x, position.y + 0.6 * scale, position.z);

    // Create head
    const head = BABYLON.MeshBuilder.CreateBox(
      'dogHead',
      { width: 0.4 * scale, height: 0.4 * scale, depth: 0.4 * scale },
      this.scene
    );
    head.parent = body;
    head.position.z = 0.7 * scale;
    head.position.y = 0.2 * scale;

    // Create snout
    const snout = BABYLON.MeshBuilder.CreateBox(
      'dogSnout',
      { width: 0.25 * scale, height: 0.25 * scale, depth: 0.3 * scale },
      this.scene
    );
    snout.parent = head;
    snout.position.z = 0.3 * scale;
    snout.position.y = -0.05 * scale;

    // Create ears
    [-1, 1].forEach(side => {
      const ear = BABYLON.MeshBuilder.CreateBox(
        'dogEar',
        { width: 0.15 * scale, height: 0.3 * scale, depth: 0.1 * scale },
        this.scene
      );
      ear.parent = head;
      ear.position.x = side * 0.2 * scale;
      ear.position.y = 0.2 * scale;
      ear.rotation.z = side * Math.PI / 6;
    });

    // Create legs
    const legPositions = [
      { x: -0.3, z: 0.4 },  // Front Left
      { x: 0.3, z: 0.4 },   // Front Right
      { x: -0.3, z: -0.4 }, // Back Left
      { x: 0.3, z: -0.4 }   // Back Right
    ];

    const legs: any[] = [];
    legPositions.forEach((pos) => {
      const leg = BABYLON.MeshBuilder.CreateBox(
        'dogLeg',
        { width: 0.15 * scale, height: 0.6 * scale, depth: 0.15 * scale },
        this.scene
      );
      leg.parent = body;
      leg.position.x = pos.x * scale;
      leg.position.z = pos.z * scale;
      leg.position.y = -0.6 * scale;
      legs.push(leg);
    });

    // Create tail
    const tail = BABYLON.MeshBuilder.CreateCylinder(
      'dogTail',
      { height: 0.6 * scale, diameter: 0.1 * scale, tessellation: 8 },
      this.scene
    );
    tail.parent = body;
    tail.position.z = -0.6 * scale;
    tail.position.y = 0.1 * scale;
    tail.rotation.x = Math.PI / 4;

    // Materials
    const color = config?.color ?? this.getRandomColor();
    const bodyMaterial = new BABYLON.StandardMaterial('dogBodyMat', this.scene);
    bodyMaterial.diffuseColor = this.getColorValue(color);

    const darkMaterial = new BABYLON.StandardMaterial('dogDarkMat', this.scene);
    darkMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    // Apply materials
    body.material = bodyMaterial;
    head.material = bodyMaterial;
    snout.material = darkMaterial;
    tail.material = bodyMaterial;
    legs.forEach(leg => leg.material = bodyMaterial);

    return {
      root: body,
      body,
      head,
      snout,
      legs,
      tail
    };
  }

  /**
   * Gets a random color type
   */
  private getRandomColor(): 'brown' | 'black' | 'golden' {
    const colors: ('brown' | 'black' | 'golden')[] = ['brown', 'black', 'golden'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Gets the Color3 value for a color type
   */
  private getColorValue(color: 'brown' | 'black' | 'golden'): any {
    const BABYLON = (window as any).BABYLON;
    switch (color) {
      case 'brown':
        return new BABYLON.Color3(0.6, 0.4, 0.2);
      case 'black':
        return new BABYLON.Color3(0.1, 0.1, 0.1);
      case 'golden':
        return new BABYLON.Color3(0.8, 0.6, 0.2);
      default:
        return new BABYLON.Color3(0.6, 0.4, 0.2);
    }
  }

  /**
   * Animates the dog walking
   */
  animateWalk(parts: DogParts, deltaTime: number, isWalking: boolean): void {
    if (!isWalking || !parts.legs.length) return;

    const speed = 10;

    parts.legs.forEach((leg, index) => {
      const phase = (index % 2) * Math.PI;
      const angle = deltaTime * speed + phase;
      leg.rotation.x = Math.sin(angle) * 0.3;
    });

    // Wag tail
    if (parts.tail) {
      parts.tail.rotation.z = Math.sin(deltaTime * 15) * 0.3;
    }
  }

  /**
   * Disposes the dog mesh
   */
  dispose(parts: DogParts): void {
    if (parts.root) {
      parts.root.dispose();
    }
  }
}

/**
 * Factory function for creating DogModel instances
 */
export function createDogModel(scene: any): DogModel {
  return new DogModel(scene);
}
