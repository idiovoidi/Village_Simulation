import { ErrorDecorator } from '../../utils/Decorators.js';

export class VillagerModel {
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
        this.animations = {};

        // Initialize animations
        this.createAnimations();
    }

    createVillager(position) {
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

        // Adjust rotations for more natural posture
        limbs.leftArm.rotation.z = Math.PI / 8;
        limbs.rightArm.rotation.z = -Math.PI / 8;

        // Create materials with better colors
        const bodyMaterial = new BABYLON.StandardMaterial(`${name}_material`, this.scene);
        const skinTone = new BABYLON.Color3(
            0.8 + Math.random() * 0.2,
            0.6 + Math.random() * 0.2,
            0.4 + Math.random() * 0.2
        );

        // Randomize clothing colors for variety
        const clothingHue = Math.random();
        const clothingColor = this.generateRandomColor();

        bodyMaterial.diffuseColor = skinTone;
        bodyMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        const clothingMaterial = new BABYLON.StandardMaterial(`${name}_clothing`, this.scene);
        clothingMaterial.diffuseColor = clothingColor;

        // Apply materials
        head.material = bodyMaterial;
        torso.material = clothingMaterial;
        Object.values(limbs).forEach(limb => limb.material = clothingMaterial);

        // Store mesh references
        this.meshes.push(root);

        // Apply animations to the model
        this.applyAnimations(root, limbs);

        // Return villager object
        return {
            mesh: root,
            parts: {
                torso,
                head,
                ...limbs
            }
        };
    }

    addFacialFeatures(head, name) {
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

    createLimb(name, limbName, dimensions) {
        return BABYLON.MeshBuilder.CreateCapsule(
            `${name}_${limbName}`,
            { radius: dimensions.radius, height: dimensions.height, tessellation: 16 },
            this.scene
        );
    }

    createAnimations() {
        // Define idle animation - subtle swaying
        const idleAnimation = new BABYLON.Animation(
            'idleAnimation',
            'rotation.y',
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
            'walkAnimArm',
            'rotation.x',
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
        walkAnimRightArm.name = 'walkAnimRightArm';

        const walkKeysRightArm = [];
        walkKeysRightArm.push({ frame: 0, value: 0.5 });
        walkKeysRightArm.push({ frame: 15, value: -0.5 });
        walkKeysRightArm.push({ frame: 30, value: 0.5 });

        walkAnimRightArm.setKeys(walkKeysRightArm);
        this.animations.walkRightArm = walkAnimRightArm;

        // Define leg animations
        const walkAnimLeg = new BABYLON.Animation(
            'walkAnimLeg',
            'rotation.x',
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
        walkAnimRightLeg.name = 'walkAnimRightLeg';

        const walkKeysRightLeg = [];
        walkKeysRightLeg.push({ frame: 0, value: -0.3 });
        walkKeysRightLeg.push({ frame: 15, value: 0.5 });
        walkKeysRightLeg.push({ frame: 30, value: -0.3 });

        walkAnimRightLeg.setKeys(walkKeysRightLeg);
        this.animations.walkRightLeg = walkAnimRightLeg;

        // Create working animation (arm movement)
        const workAnimation = new BABYLON.Animation(
            'workAnimation',
            'rotation.x',
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
            'greetAnimation',
            'rotation.z',
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

    applyAnimations(root, limbs) {
        // Store animation groups for later control
        root.animationGroups = {};

        // Create animation groups for each state

        // Idle animation group
        const idleGroup = new BABYLON.AnimationGroup('idle');
        idleGroup.addTargetedAnimation(this.animations.idle.clone(), root);
        idleGroup.normalize(0, 60);
        root.animationGroups.idle = idleGroup;

        // Walking animation group
        const walkGroup = new BABYLON.AnimationGroup('walk');
        walkGroup.addTargetedAnimation(this.animations.walkLeftArm.clone(), limbs.leftArm);
        walkGroup.addTargetedAnimation(this.animations.walkRightArm.clone(), limbs.rightArm);
        walkGroup.addTargetedAnimation(this.animations.walkLeftLeg.clone(), limbs.leftLeg);
        walkGroup.addTargetedAnimation(this.animations.walkRightLeg.clone(), limbs.rightLeg);
        walkGroup.normalize(0, 30);
        root.animationGroups.walk = walkGroup;

        // Working animation group (right arm only)
        const workGroup = new BABYLON.AnimationGroup('work');
        workGroup.addTargetedAnimation(this.animations.work.clone(), limbs.rightArm);
        workGroup.normalize(0, 30);
        root.animationGroups.work = workGroup;

        // Greeting animation group (right arm only)
        const greetGroup = new BABYLON.AnimationGroup('greet');
        greetGroup.addTargetedAnimation(this.animations.greet.clone(), limbs.rightArm);
        greetGroup.normalize(0, 30);
        root.animationGroups.greet = greetGroup;
    }

    playAnimation(villager, animationName, loop = true, speedRatio = 1) {
        if (!villager.mesh || !villager.mesh.animationGroups) {
            console.warn('Villager has no animation groups');
            return;
        }

        // Stop all current animations
        Object.values(villager.mesh.animationGroups).forEach(group => {
            group.stop();
        });

        // Play requested animation
        const group = villager.mesh.animationGroups[animationName];
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

    generateRandomColor() {
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

    dispose() {
        this.meshes.forEach(mesh => {
            if (mesh && mesh.dispose) {
                // Stop and dispose animations first if they exist
                if (mesh.animationGroups) {
                    Object.values(mesh.animationGroups).forEach(group => {
                        group.dispose();
                    });
                }

                mesh.dispose();
            }
        });
        this.meshes = [];
    }
}
