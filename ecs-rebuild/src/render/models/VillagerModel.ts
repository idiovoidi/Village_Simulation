/**
 * VillagerModel
 *
 * Procedural mesh generator for villager characters.
 * Creates humanoid figures with customizable appearance.
 *
 * @module render/models
 */

import type { Scene, TransformNode, Mesh, Color3 } from 'babylonjs';

export interface VillagerParts {
  root: TransformNode;
  torso: Mesh;
  head: Mesh;
  leftArm: Mesh;
  rightArm: Mesh;
  leftLeg: Mesh;
  rightLeg: Mesh;
}

export interface VillagerConfig {
  skinTone?: Color3;
  clothingColor?: Color3;
  height?: number;
}

const SKIN_TONES: Array<[number, number, number]> = [
  [0.96, 0.78, 0.64],
  [0.85, 0.64, 0.48],
  [0.66, 0.46, 0.33],
  [0.45, 0.31, 0.22],
];
const SHIRTS: Array<[number, number, number]> = [
  [0.74, 0.22, 0.2],
  [0.22, 0.45, 0.7],
  [0.3, 0.6, 0.3],
  [0.85, 0.72, 0.28],
  [0.6, 0.35, 0.65],
  [0.9, 0.9, 0.85],
  [0.82, 0.5, 0.2],
];
const HAIR: Array<[number, number, number]> = [
  [0.12, 0.09, 0.07],
  [0.35, 0.22, 0.12],
  [0.7, 0.55, 0.25],
  [0.55, 0.55, 0.55],
];

/**
 * Creates procedural villager meshes
 */
export class VillagerModel {
  private scene: Scene;
  private meshes: TransformNode[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Creates a villager mesh at the specified position
   */
  createVillager(position?: { x: number; y: number; z: number }, config?: VillagerConfig): VillagerParts {
    const BABYLON = (window as any).BABYLON;
    const name = `villager_${this.meshes.length}`;
    const pos = position ?? { x: 0, y: 0, z: 0 };

    // Create root node
    const root = new BABYLON.TransformNode(name, this.scene);
    root.position = new BABYLON.Vector3(pos.x, pos.y, pos.z);

    // Create torso
    const torso = BABYLON.MeshBuilder.CreateCapsule(
      `${name}_torso`,
      { radius: 0.4, height: 1.2, tessellation: 16 },
      this.scene
    );
    torso.parent = root;
    torso.position.y = 1.6;

    // Create head
    const head = BABYLON.MeshBuilder.CreateSphere(
      `${name}_head`,
      { diameter: 0.5, segments: 16 },
      this.scene
    );
    head.parent = torso;
    head.position.y = 0.8;

    // Add facial features
    this.addFacialFeatures(head, name);

    // Create limbs
    const limbs = {
      leftArm: this.createLimb(name, 'leftArm', { radius: 0.15, height: 0.8 }),
      rightArm: this.createLimb(name, 'rightArm', { radius: 0.15, height: 0.8 }),
      leftLeg: this.createLimb(name, 'leftLeg', { radius: 0.2, height: 1 }),
      rightLeg: this.createLimb(name, 'rightLeg', { radius: 0.2, height: 1 })
    };

    // Position limbs
    limbs.leftArm.parent = torso;
    limbs.rightArm.parent = torso;
    limbs.leftLeg.parent = torso;
    limbs.rightLeg.parent = torso;

    limbs.leftArm.position = new BABYLON.Vector3(-0.5, 0.3, 0);
    limbs.rightArm.position = new BABYLON.Vector3(0.5, 0.3, 0);
    limbs.leftLeg.position = new BABYLON.Vector3(-0.3, -0.8, 0);
    limbs.rightLeg.position = new BABYLON.Vector3(0.3, -0.8, 0);

    // Adjust rotations for natural posture
    limbs.leftArm.rotation.z = Math.PI / 8;
    limbs.rightArm.rotation.z = -Math.PI / 8;

    // Materials come from a small shared palette so hundreds of villagers batch well.
    const skinIdx = Math.floor(Math.random() * SKIN_TONES.length);
    const shirtIdx = Math.floor(Math.random() * SHIRTS.length);
    const hairIdx = Math.floor(Math.random() * HAIR.length);
    const skinMaterial = config?.skinTone
      ? this.makeMaterial(`${name}_skin`, config.skinTone)
      : this.sharedMaterial(`villager_skin_${skinIdx}`, SKIN_TONES[skinIdx]);
    const clothingMaterial = config?.clothingColor
      ? this.makeMaterial(`${name}_clothing`, config.clothingColor)
      : this.sharedMaterial(`villager_shirt_${shirtIdx}`, SHIRTS[shirtIdx]);
    const pantsMaterial = this.sharedMaterial('villager_pants', [0.28, 0.26, 0.3]);
    const hairMaterial = this.sharedMaterial(`villager_hair_${hairIdx}`, HAIR[hairIdx]);
    const eyeMaterial = this.sharedMaterial('villager_eye', [0.08, 0.08, 0.1]);

    head.material = skinMaterial;
    torso.material = clothingMaterial;
    limbs.leftArm.material = clothingMaterial;
    limbs.rightArm.material = clothingMaterial;
    limbs.leftLeg.material = pantsMaterial;
    limbs.rightLeg.material = pantsMaterial;
    head.getChildMeshes().forEach((m: any) => {
      m.material = m.name.endsWith('mouth') ? skinMaterial : eyeMaterial;
    });

    // Hair cap
    const hair = BABYLON.MeshBuilder.CreateSphere(
      `${name}_hair`,
      { diameter: 0.56, segments: 8, slice: 0.55 },
      this.scene
    );
    hair.parent = head;
    hair.position.y = 0.06;
    hair.rotation.x = -0.15;
    hair.material = hairMaterial;

    // Store reference
    this.meshes.push(root);

    return {
      root,
      torso,
      head,
      leftArm: limbs.leftArm,
      rightArm: limbs.rightArm,
      leftLeg: limbs.leftLeg,
      rightLeg: limbs.rightLeg
    };
  }

  /**
   * Adds facial features to the head
   */
  private addFacialFeatures(head: Mesh, name: string): void {
    const BABYLON = (window as any).BABYLON;
    const eyeSize = 0.06;
    const eyeY = 0.05;
    const eyeZ = 0.2;

    // Create eyes
    const leftEye = BABYLON.MeshBuilder.CreateSphere(
      `${name}_leftEye`,
      { diameter: eyeSize * 2 },
      this.scene
    );
    leftEye.parent = head;
    leftEye.position = new BABYLON.Vector3(-0.1, eyeY, eyeZ);

    const rightEye = BABYLON.MeshBuilder.CreateSphere(
      `${name}_rightEye`,
      { diameter: eyeSize * 2 },
      this.scene
    );
    rightEye.parent = head;
    rightEye.position = new BABYLON.Vector3(0.1, eyeY, eyeZ);

    // Create mouth
    const mouth = BABYLON.MeshBuilder.CreateCylinder(
      `${name}_mouth`,
      { height: 0.01, diameter: 0.15, tessellation: 24 },
      this.scene
    );
    mouth.parent = head;
    mouth.position = new BABYLON.Vector3(0, -0.1, eyeZ);
    mouth.rotation.x = Math.PI / 2;
    mouth.scaling.x = 2;
    mouth.scaling.y = 0.5;
  }

  /**
   * Creates a limb mesh
   */
  private createLimb(
    name: string,
    limbName: string,
    dimensions: { radius: number; height: number }
  ): Mesh {
    const BABYLON = (window as any).BABYLON;
    return BABYLON.MeshBuilder.CreateCapsule(
      `${name}_${limbName}`,
      { radius: dimensions.radius, height: dimensions.height, tessellation: 16 },
      this.scene
    );
  }

  private sharedMaterial(key: string, color: [number, number, number]): any {
    const existing = this.scene.getMaterialByName(key);
    if (existing) return existing;
    return this.makeMaterial(key, new (window as any).BABYLON.Color3(color[0], color[1], color[2]));
  }

  private makeMaterial(key: string, color: Color3): any {
    const BABYLON = (window as any).BABYLON;
    const mat = new BABYLON.StandardMaterial(key, this.scene);
    mat.diffuseColor = color;
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    return mat;
  }

  /**
   * Disposes all created meshes
   */
  dispose(): void {
    this.meshes.forEach(mesh => {
      if (mesh && mesh.dispose) {
        mesh.dispose();
      }
    });
    this.meshes = [];
  }
}

/**
 * Factory function for creating VillagerModel instances
 */
export function createVillagerModel(scene: Scene): VillagerModel {
  return new VillagerModel(scene);
}
