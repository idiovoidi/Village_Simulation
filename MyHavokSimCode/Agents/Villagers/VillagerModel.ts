interface VillagerParts {
    torso: BABYLON.Mesh;
    head: BABYLON.Mesh;
    leftArm: BABYLON.Mesh;
    rightArm: BABYLON.Mesh;
    leftLeg: BABYLON.Mesh;
    rightLeg: BABYLON.Mesh;
}

interface VillagerObject {
    mesh: BABYLON.TransformNode;
    parts: VillagerParts;
}

interface VillagerAnimations {
    idle: BABYLON.Animation;
    walkLeftArm: BABYLON.Animation;
    walkRightArm: BABYLON.Animation;
    walkLeftLeg: BABYLON.Animation;
    walkRightLeg: BABYLON.Animation;
    work: BABYLON.Animation;
    greet: BABYLON.Animation;
}

interface VillagerAnimationGroups {
    idle: BABYLON.AnimationGroup;
    walk: BABYLON.AnimationGroup;
    work: BABYLON.AnimationGroup;
    greet: BABYLON.AnimationGroup;
}

export class VillagerModel {
    private scene: BABYLON.Scene;
    private meshes: BABYLON.TransformNode[] = [];
    private animations: Partial<VillagerAnimations> = {};

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        
        // Initialize animations
        this.createAnimations();
    }

    createVillager(position?: BABYLON.Vector3): VillagerObject {
        const name = `villager_${this.meshes.length}`;
        
        // Create root mesh for the villager
        const root = new BABYLON.TransformNode(name, this.scene);
        root.position = position || BABYLON.Vector3.Zero();

        // Create body parts with better proportions
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

        // Add facial features for more personality
        this.addFacialFeatures(head, name);

        // Create limbs
        const leftArm = this.createLimb(name, "leftArm", { radius: 0.15, height: 0.8 });
        const rightArm = this.createLimb(name, "rightArm", { radius: 0.15, height: 0.8 });
        const leftLeg = this.createLimb(name, "leftLeg", { radius: 0.2, height: 1 });
        const rightLeg = this.createLimb(name, "rightLeg", { radius: 0.2, height: 1 });

        const limbs: VillagerParts = {
            torso,
            head,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg
        };

        // Position limbs
        leftArm.parent = torso;
        rightArm.parent = torso;
        leftLeg.parent = torso;
        rightLeg.parent = torso;

        leftArm.position = new BABYLON.Vector3(-0.5, 0.3, 0);
        rightArm.position = new BABYLON.Vector3(0.5, 0.3, 0);
        leftLeg.position = new BABYLON.Vector3(-0.3, -0.8, 0);
        rightLeg.position = new BABYLON.Vector3(0.3, -0.8, 0);

        // Adjust rotations for more natural posture
        leftArm.rotation.z = Math.PI / 8;
        rightArm.rotation.z = -Math.PI / 8;

        // Create materials with better colors
        const bodyMaterial = new BABYLON.StandardMaterial(`${name}_material`, this.scene);
        const skinTone = new BABYLON.Color3(
            0.8 + Math.random() * 0.2,
            0.6 + Math.random() * 0.2,
            0.4 + Math.random() * 0.2
        );
        
        // Randomize clothing colors for variety
        const clothingColor = this.generateRandomColor();

        bodyMaterial.diffuseColor = skinTone;
        bodyMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        const clothingMaterial = new BABYLON.StandardMaterial(`${name}_clothing`, this.scene);
        clothingMaterial.diffuseColor = clothingColor;

        // Apply materials
        head.material = bodyMaterial;
        torso.material = clothingMaterial;
        leftArm.material = clothingMaterial;
        rightArm.material = clothingMaterial;
        leftLeg.material = clothingMaterial;
        rightLeg.material = clothingMaterial;

        // Store mesh references
        this.meshes.push(root);

        // Apply animations to the model
        this.applyAnimations(root, limbs);

        // Return villager object
        return {
            mesh: root,
            parts: limbs
        };
    }

    private addFacialFeatures(head: BABYLON.Mesh, name: string): void {
        // Create eyes
        const eyeSize = 0.06;
        const eyeY = 0.05;
        const eyeZ = 0.2;
        
        const leftEye = BABYLON.MeshBuilder.CreateSphere(`${name}_leftEye`, { diameter: eyeSize * 2 }, this.scene);
        leftEye.parent = head;
        leftEye.position = new BABYLON.Vector3(-0.1, eyeY, eyeZ);
        
        const rightEye = BABYLON.MeshBuilder.CreateSphere(`${name}_rightEye`, { diameter: eyeSize * 2 }, this.scene);
        rightEye.parent = head;
        rightEye.position = new BABYLON.Vector3(0.1, eyeY, eyeZ);
        
        // Eye materials
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

    private createLimb(name: string, limbName: string, dimensions: { radius: number; height: number }): BABYLON.Mesh {
        return BABYLON.MeshBuilder.CreateCapsule(
            `${name}_${limbName}`,
            { radius: dimensions.radius, height: dimensions.height, tessellation: 16 },
            this.scene
        );
    }

    private createAnimations(): void {
        // Define idle animation - subtle swaying
        const idleAnimation = new BABYLON.Animation(
            "idleAnimation",
            "rotation.y",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const idleKeys = [];
        idleKeys.push({ frame: 0, value: -0.05 });
        idleKeys.push({ frame: 30, value: 0.05 });
        idleKeys.push({ frame: 60, value: -0.05 });
        
        idleAnimation.setKeys(idleKeys);
        this.animations.idle = idleAnimation;
        
        // Define walking animation for arms and legs
        const walkAnimArm = new BABYLON.Animation(
            "walkAnimArm",
            "rotation.x",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const walkKeysLeftArm = [];
        walkKeysLeftArm.push({ frame: 0, value: -0.5 });
        walkKeysLeftArm.push({ frame: 15, value: 0.5 });
        walkKeysLeftArm.push({ frame: 30, value: -0.5 });
        
        walkAnimArm.setKeys(walkKeysLeftArm);
        this.animations.walkLeftArm = walkAnimArm;
        
        // Create opposite animation for right arm
        const walkAnimRightArm = walkAnimArm.clone();
        walkAnimRightArm.name = "walkAnimRightArm";
        
        const walkKeysRightArm = [];
        walkKeysRightArm.push({ frame: 0, value: 0.5 });
        walkKeysRightArm.push({ frame: 15, value: -0.5 });
        walkKeysRightArm.push({ frame: 30, value: 0.5 });
        
        walkAnimRightArm.setKeys(walkKeysRightArm);
        this.animations.walkRightArm = walkAnimRightArm;
        
        // Define leg animations
        const walkAnimLeg = new BABYLON.Animation(
            "walkAnimLeg",
            "rotation.x",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const walkKeysLeftLeg = [];
        walkKeysLeftLeg.push({ frame: 0, value: 0.5 });
        walkKeysLeftLeg.push({ frame: 15, value: -0.3 });
        walkKeysLeftLeg.push({ frame: 30, value: 0.5 });
        
        walkAnimLeg.setKeys(walkKeysLeftLeg);
        this.animations.walkLeftLeg = walkAnimLeg;
        
        // Create opposite animation for right leg
        const walkAnimRightLeg = walkAnimLeg.clone();
        walkAnimRightLeg.name = "walkAnimRightLeg";
        
        const walkKeysRightLeg = [];
        walkKeysRightLeg.push({ frame: 0, value: -0.3 });
        walkKeysRightLeg.push({ frame: 15, value: 0.5 });
        walkKeysRightLeg.push({ frame: 30, value: -0.3 });
        
        walkAnimRightLeg.setKeys(walkKeysRightLeg);
        this.animations.walkRightLeg = walkAnimRightLeg;
        
        // Create working animation (arm movement)
        const workAnimation = new BABYLON.Animation(
            "workAnimation",
            "rotation.x",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const workKeys = [];
        workKeys.push({ frame: 0, value: -0.2 });
        workKeys.push({ frame: 10, value: -0.8 });
        workKeys.push({ frame: 20, value: -0.2 });
        workKeys.push({ frame: 30, value: -0.2 });
        
        workAnimation.setKeys(workKeys);
        this.animations.work = workAnimation;
        
        // Create greeting animation (arm wave)
        const greetAnimation = new BABYLON.Animation(
            "greetAnimation",
            "rotation.z",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const greetKeys = [];
        greetKeys.push({ frame: 0, value: 0 });
        greetKeys.push({ frame: 5, value: -0.5 });
        greetKeys.push({ frame: 10, value: 0 });
        greetKeys.push({ frame: 15, value: -0.5 });
        greetKeys.push({ frame: 20, value: 0 });
        greetKeys.push({ frame: 30, value: 0 });
        
        greetAnimation.setKeys(greetKeys);
        this.animations.greet = greetAnimation;
    }

    private applyAnimations(root: BABYLON.TransformNode, limbs: VillagerParts): void {
        // Store animation groups for later control
        const animationGroups: Partial<VillagerAnimationGroups> = {};
        
        // Create animation groups for each state
        
        // Idle animation group
        const idleGroup = new BABYLON.AnimationGroup("idle", this.scene);
        if (this.animations.idle) {
            idleGroup.addTargetedAnimation(this.animations.idle.clone(), root);
        }
        idleGroup.normalize(0, 60);
        animationGroups.idle = idleGroup;
        
        // Walking animation group
        const walkGroup = new BABYLON.AnimationGroup("walk", this.scene);
        if (this.animations.walkLeftArm) {
            walkGroup.addTargetedAnimation(this.animations.walkLeftArm.clone(), limbs.leftArm);
        }
        if (this.animations.walkRightArm) {
            walkGroup.addTargetedAnimation(this.animations.walkRightArm.clone(), limbs.rightArm);
        }
        if (this.animations.walkLeftLeg) {
            walkGroup.addTargetedAnimation(this.animations.walkLeftLeg.clone(), limbs.leftLeg);
        }
        if (this.animations.walkRightLeg) {
            walkGroup.addTargetedAnimation(this.animations.walkRightLeg.clone(), limbs.rightLeg);
        }
        walkGroup.normalize(0, 30);
        animationGroups.walk = walkGroup;
        
        // Working animation group (right arm only)
        const workGroup = new BABYLON.AnimationGroup("work", this.scene);
        if (this.animations.work) {
            workGroup.addTargetedAnimation(this.animations.work.clone(), limbs.rightArm);
        }
        workGroup.normalize(0, 30);
        animationGroups.work = workGroup;
        
        // Greeting animation group (right arm only)
        const greetGroup = new BABYLON.AnimationGroup("greet", this.scene);
        if (this.animations.greet) {
            greetGroup.addTargetedAnimation(this.animations.greet.clone(), limbs.rightArm);
        }
        greetGroup.normalize(0, 30);
        animationGroups.greet = greetGroup;
        
        // Store on root node
        (root as any).animationGroups = animationGroups;
    }

    playAnimation(villager: VillagerObject, animationName: keyof VillagerAnimationGroups, loop: boolean = true, speedRatio: number = 1): void {
        const animationGroups = (villager.mesh as any).animationGroups as Partial<VillagerAnimationGroups> | undefined;
        
        if (!villager.mesh || !animationGroups) {
            console.warn('Villager has no animation groups');
            return;
        }
        
        // Stop all current animations
        Object.values(animationGroups).forEach(group => {
            group?.stop();
        });
        
        // Play requested animation
        const group = animationGroups[animationName];
        if (group) {
            group.speedRatio = speedRatio;
            if (loop) {
                group.play(true);
            } else {
                group.play(false);
            }
        } else {
            console.warn(`Animation ${animationName} not found`);
        }
    }

    private generateRandomColor(): BABYLON.Color3 {
        // Generate a nicer set of colors than pure random
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

    dispose(): void {
        this.meshes.forEach(mesh => {
            if (mesh && mesh.dispose) {
                // Stop and dispose animations first if they exist
                const animationGroups = (mesh as any).animationGroups as Partial<VillagerAnimationGroups> | undefined;
                if (animationGroups) {
                    Object.values(animationGroups).forEach(group => {
                        group?.dispose();
                    });
                }
                
                mesh.dispose();
            }
        });
        this.meshes = [];
    }
}
