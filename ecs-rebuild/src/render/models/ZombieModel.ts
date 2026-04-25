/**
 * ZombieModel
 *
 * Procedural mesh generator for zombie characters.
 * Creates undead humanoids with articulated joints and glowing eyes.
 *
 * @module render/models
 */

export interface ZombieParts {
  root: any;
  torso: any;
  head: any;
  neck: any;
  leftArm: any;
  rightArm: any;
  leftLeg: any;
  rightLeg: any;
}

export interface ZombieConfig {
  skinTone?: { r: number; g: number; b: number };
  clothingColor?: { r: number; g: number; b: number };
  hasGlowingEyes?: boolean;
}

/**
 * Creates procedural zombie meshes
 */
export class ZombieModel {
  private scene: any;

  constructor(scene: any) {
    this.scene = scene;
  }

  /**
   * Creates a zombie mesh at the specified position
   */
  create(position: { x: number; y: number; z: number }, config?: ZombieConfig): ZombieParts {
    const BABYLON = (window as any).BABYLON;

    // Create root container
    const root = new BABYLON.TransformNode('zombie', this.scene);
    root.position = new BABYLON.Vector3(position.x, position.y, position.z);

    // Create torso
    const torso = BABYLON.MeshBuilder.CreateCapsule(
      'zombieTorso',
      { radius: 0.5, height: 1.5, tessellation: 16 },
      this.scene
    );
    torso.parent = root;
    torso.position.y = 1.5;

    // Create head
    const head = BABYLON.MeshBuilder.CreateSphere(
      'zombieHead',
      { diameter: 0.8, segments: 16 },
      this.scene
    );
    head.parent = root;
    head.position.y = 2.5;
    head.position.z = 0.1;

    // Create neck
    const neck = BABYLON.MeshBuilder.CreateCylinder(
      'zombieNeck',
      { height: 0.3, diameter: 0.3, tessellation: 16 },
      this.scene
    );
    neck.parent = root;
    neck.position.y = 2.2;

    // Create arms
    const leftArm = this.createLimb('leftArm', -0.6, 1.8);
    const rightArm = this.createLimb('rightArm', 0.6, 1.8);

    // Create legs
    const leftLeg = this.createLimb('leftLeg', -0.3, 2);
    const rightLeg = this.createLimb('rightLeg', 0.3, 2);

    // Materials
    const skinTone = config?.skinTone ?? { r: 0.5, g: 0.6, b: 0.4 };
    const clothingColor = config?.clothingColor ?? { r: 0.3, g: 0.2, b: 0.1 };

    const skinMaterial = new BABYLON.StandardMaterial('zombieSkinMat', this.scene);
    skinMaterial.diffuseColor = new BABYLON.Color3(skinTone.r, skinTone.g, skinTone.b);
    skinMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    const clothingMaterial = new BABYLON.StandardMaterial('zombieClothingMat', this.scene);
    clothingMaterial.diffuseColor = new BABYLON.Color3(clothingColor.r, clothingColor.g, clothingColor.b);

    // Apply materials
    torso.material = clothingMaterial;
    head.material = skinMaterial;
    neck.material = skinMaterial;
    leftArm.material = skinMaterial;
    rightArm.material = skinMaterial;
    leftLeg.material = skinMaterial;
    rightLeg.material = skinMaterial;

    // Add glowing eyes if enabled
    if (config?.hasGlowingEyes ?? true) {
      this.addEyes(head);
    }

    return {
      root,
      torso,
      head,
      neck,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg
    };
  }

  /**
   * Creates a limb (arm or leg)
   */
  private createLimb(name: string, xOffset: number, height: number): any {
    const BABYLON = (window as any).BABYLON;

    const limb = BABYLON.MeshBuilder.CreateCapsule(
      `zombie${name}`,
      { radius: 0.15, height, tessellation: 16 },
      this.scene
    );
    limb.parent = this.scene.getTransformNodeByName('zombie');
    limb.position.x = xOffset;
    limb.position.y = name.includes('Arm') ? 2 : 1;

    return limb;
  }

  /**
   * Adds glowing eyes to the head
   */
  private addEyes(head: any): void {
    const BABYLON = (window as any).BABYLON;

    const eyeMaterial = new BABYLON.StandardMaterial('zombieEyeMat', this.scene);
    eyeMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.1, 0.1);

    // Left eye
    const leftEye = BABYLON.MeshBuilder.CreateSphere(
      'leftEye',
      { diameter: 0.1 },
      this.scene
    );
    leftEye.parent = head;
    leftEye.position = new BABYLON.Vector3(-0.2, 0.1, 0.35);
    leftEye.material = eyeMaterial;

    // Right eye
    const rightEye = BABYLON.MeshBuilder.CreateSphere(
      'rightEye',
      { diameter: 0.1 },
      this.scene
    );
    rightEye.parent = head;
    rightEye.position = new BABYLON.Vector3(0.2, 0.1, 0.35);
    rightEye.material = eyeMaterial;
  }

  /**
   * Animates the zombie shambling
   */
  animateShamble(parts: ZombieParts, deltaTime: number, speed: number): void {
    if (!parts.root) return;

    const angle = deltaTime * (speed > 1 ? 6 : 2);

    // Arm swinging
    parts.leftArm.rotation.x = Math.sin(angle) * 0.5;
    parts.rightArm.rotation.x = -Math.sin(angle) * 0.5;

    // Leg movement
    parts.leftLeg.rotation.x = -Math.sin(angle) * 0.5;
    parts.rightLeg.rotation.x = Math.sin(angle) * 0.5;

    // Forward lean
    parts.root.rotation.x = speed > 1 ? 0.4 : 0.2;

    // Body sway
    parts.root.rotation.y += Math.sin(angle * 0.5) * 0.01 * speed;

    // Head movement
    if (parts.head) {
      parts.head.rotation.z = Math.sin(angle * 0.7) * 0.1;
      parts.head.rotation.y = Math.sin(angle * 0.5) * 0.2;
      parts.head.rotation.x = 0.2 + Math.sin(angle * 0.3) * 0.1;
    }
  }

  /**
   * Disposes the zombie mesh
   */
  dispose(parts: ZombieParts): void {
    if (parts.root) {
      parts.root.dispose();
    }
  }
}

/**
 * Factory function for creating ZombieModel instances
 */
export function createZombieModel(scene: any): ZombieModel {
  return new ZombieModel(scene);
}
