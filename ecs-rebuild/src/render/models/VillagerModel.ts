/**
 * VillagerModel
 *
 * Procedural mesh generator for villager characters.
 * Creates humanoid figures with customizable appearance.
 *
 * @module render/models
 */

import type { Scene, TransformNode, Mesh, Material, Color3 } from 'babylonjs';
import { AnimationHelper } from '../animation/AnimationHelper';

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

    // Create materials
    const skinTone = config?.skinTone ?? this.generateSkinTone();
    const clothingColor = config?.clothingColor ?? this.generateRandomColor();

    const bodyMaterial = new BABYLON.StandardMaterial(`${name}_material`, this.scene);
    bodyMaterial.diffuseColor = skinTone;
    bodyMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

    const clothingMaterial = new BABYLON.StandardMaterial(`${name}_clothing`, this.scene);
    clothingMaterial.diffuseColor = clothingColor;

    // Apply materials
    head.material = bodyMaterial;
    torso.material = clothingMaterial;
    limbs.leftArm.material = clothingMaterial;
    limbs.rightArm.material = clothingMaterial;
    limbs.leftLeg.material = clothingMaterial;
    limbs.rightLeg.material = clothingMaterial;

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

    // Eye material
    const eyeMaterial = new BABYLON.StandardMaterial(`${name}_eyeMaterial`, this.scene);
    eyeMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    leftEye.material = eyeMaterial;
    rightEye.material = eyeMaterial;

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

    // Mouth material
    const mouthMaterial = new BABYLON.StandardMaterial(`${name}_mouthMaterial`, this.scene);
    mouthMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.1, 0.1);
    mouth.material = mouthMaterial;
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

  /**
   * Generates a random skin tone
   */
  private generateSkinTone(): Color3 {
    const BABYLON = (window as any).BABYLON;
    return new BABYLON.Color3(
      0.8 + Math.random() * 0.2,
      0.6 + Math.random() * 0.2,
      0.4 + Math.random() * 0.2
    );
  }

  /**
   * Generates a random clothing color from a curated palette
   */
  private generateRandomColor(): Color3 {
    const BABYLON = (window as any).BABYLON;
    const colors = [
      new BABYLON.Color3(0.8, 0.2, 0.2), // Red
      new BABYLON.Color3(0.2, 0.6, 0.8), // Blue
      new BABYLON.Color3(0.2, 0.8, 0.2), // Green
      new BABYLON.Color3(0.8, 0.8, 0.2), // Yellow
      new BABYLON.Color3(0.8, 0.4, 0.8), // Purple
      new BABYLON.Color3(0.4, 0.8, 0.8), // Cyan
      new BABYLON.Color3(0.8, 0.6, 0.2)  // Orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
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
