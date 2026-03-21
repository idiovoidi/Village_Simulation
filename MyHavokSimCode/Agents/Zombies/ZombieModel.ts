interface ZombieArms {
    left: BABYLON.TransformNode | null;
    right: BABYLON.TransformNode | null;
}

interface ZombieLegs {
    left: BABYLON.TransformNode | null;
    right: BABYLON.TransformNode | null;
}

interface ZombieAnimationGroups {
    attack?: BABYLON.AnimationGroup;
    suspicious?: BABYLON.AnimationGroup;
}

interface ZombieAnimationState {
    time: number;
    twitchTimer: number;
    nextTwitch: number;
    dragOffset: number;
    limbPhases: {
        leftArm: number;
        rightArm: number;
        leftLeg: number;
        rightLeg: number;
    };
}

type ZombieState = 'idle' | 'attacking' | 'suspicious' | 'pursuing';

export class ZombieModel {
    private scene: BABYLON.Scene;
    private mesh: BABYLON.TransformNode | null = null;
    private arms: ZombieArms = { left: null, right: null };
    private legs: ZombieLegs = { left: null, right: null };
    private bloodStains: BABYLON.Mesh[] = [];
    private animationGroups: ZombieAnimationGroups = {};
    private animState: ZombieAnimationState;
    private _baseY: number = 0;

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.animState = {
            time: Math.random() * 100,
            twitchTimer: 0,
            nextTwitch: Math.random() * 3 + 2,
            dragOffset: Math.random() * 0.5,
            limbPhases: {
                leftArm: Math.random() * Math.PI,
                rightArm: Math.random() * Math.PI,
                leftLeg: Math.random() * Math.PI,
                rightLeg: Math.random() * Math.PI
            }
        };
    }

    create(position: BABYLON.Vector3): BABYLON.TransformNode {
        // Create zombie container
        this.mesh = new BABYLON.TransformNode('zombie', this.scene);
        this.mesh.position = position;

        // Create torso
        const torso = BABYLON.MeshBuilder.CreateCapsule('zombieTorso', {
            radius: 0.5,
            height: 1.5,
            tessellation: 16
        }, this.scene);
        torso.parent = this.mesh;
        torso.position.y = 1.5;

        // Create head
        const head = BABYLON.MeshBuilder.CreateSphere('zombieHead', {
            diameter: 0.8,
            segments: 16
        }, this.scene);
        head.parent = this.mesh;
        head.position.y = 2.5;
        head.position.z = 0.1;

        // Create neck
        const neck = BABYLON.MeshBuilder.CreateCylinder('zombieNeck', {
            height: 0.3,
            diameter: 0.3,
            tessellation: 16
        }, this.scene);
        neck.parent = this.mesh;
        neck.position.y = 2.2;

        // Create arms with proper joints
        this.arms.left = this.createArm('left', -0.6);
        this.arms.right = this.createArm('right', 0.6);

        // Create legs with proper joints
        this.legs.left = this.createLeg('left', -0.3);
        this.legs.right = this.createLeg('right', 0.3);

        // Create animations now that arms/legs are created
        this.createAnimations(head);

        // Create zombie material for skin
        const zombieSkinMaterial = new BABYLON.StandardMaterial('zombieSkinMat', this.scene);
        zombieSkinMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.6, 0.4); // Sickly green-gray
        zombieSkinMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Create tattered clothing material
        const clothingMaterial = new BABYLON.StandardMaterial('zombieClothingMat', this.scene);
        clothingMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.1); // Drab brown

        // Apply clothing material to torso
        torso.material = clothingMaterial;

        // Add tattered patches to torso
        for (let i = 0; i < 5; i++) {
            const patch = BABYLON.MeshBuilder.CreateBox('patch', {
                height: 0.4,
                width: 0.4,
                depth: 0.1
            }, this.scene);
            patch.parent = torso;
            patch.position = new BABYLON.Vector3(
                (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 1.5,
                0.5
            );
            patch.rotation.y = Math.random() * Math.PI;
            patch.material = clothingMaterial;
        }

        // Create glowing eyes material
        const eyeMaterial = new BABYLON.StandardMaterial('zombieEyeMat', this.scene);
        eyeMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.1, 0.1); // Faint red glow

        // Create eyes
        const leftEye = BABYLON.MeshBuilder.CreateSphere('leftEye', { diameter: 0.1 }, this.scene);
        leftEye.parent = head;
        leftEye.position = new BABYLON.Vector3(-0.2, 0.1, 0.35);
        leftEye.material = eyeMaterial;

        const rightEye = BABYLON.MeshBuilder.CreateSphere('rightEye', { diameter: 0.1 }, this.scene);
        rightEye.parent = head;
        rightEye.position = new BABYLON.Vector3(0.2, 0.1, 0.35);
        rightEye.material = eyeMaterial;

        // Apply materials
        head.material = zombieSkinMaterial;
        neck.material = zombieSkinMaterial;
        this.arms.left?.getChildMeshes().forEach(m => (m as BABYLON.Mesh).material = zombieSkinMaterial);
        this.arms.right?.getChildMeshes().forEach(m => (m as BABYLON.Mesh).material = zombieSkinMaterial);
        this.legs.left?.getChildMeshes().forEach(m => (m as BABYLON.Mesh).material = zombieSkinMaterial);
        this.legs.right?.getChildMeshes().forEach(m => (m as BABYLON.Mesh).material = zombieSkinMaterial);

        // Apply animations
        (this.mesh as any).animationGroups = this.animationGroups;

        return this.mesh;
    }

    private createAnimations(head: BABYLON.Mesh): void {
        // Attack animation (right arm swipe)
        const attackAnimation = new BABYLON.Animation(
            'attackAnimation',
            'rotation.x',
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        const attackKeys = [];
        attackKeys.push({ frame: 0, value: 0 });
        attackKeys.push({ frame: 10, value: -Math.PI / 2 });
        attackKeys.push({ frame: 20, value: 0 });
        attackAnimation.setKeys(attackKeys);

        const attackGroup = new BABYLON.AnimationGroup('attack', this.scene);
        if (this.arms.right) {
            attackGroup.addTargetedAnimation(attackAnimation, this.arms.right);
        }
        this.animationGroups.attack = attackGroup;

        // Suspicious animation (head turning)
        const suspiciousAnimation = new BABYLON.Animation(
            'suspiciousAnimation',
            'rotation.y',
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        const suspiciousKeys = [];
        suspiciousKeys.push({ frame: 0, value: 0 });
        suspiciousKeys.push({ frame: 20, value: -Math.PI / 8 });
        suspiciousKeys.push({ frame: 60, value: Math.PI / 8 });
        suspiciousKeys.push({ frame: 100, value: 0 });
        suspiciousAnimation.setKeys(suspiciousKeys);

        const suspiciousGroup = new BABYLON.AnimationGroup('suspicious', this.scene);
        suspiciousGroup.addTargetedAnimation(suspiciousAnimation, head);
        this.animationGroups.suspicious = suspiciousGroup;
    }

    private createArm(side: string, offset: number): BABYLON.TransformNode {
        const armContainer = new BABYLON.TransformNode(`zombie${side}Arm`, this.scene);
        if (this.mesh) {
            armContainer.parent = this.mesh;
        }
        armContainer.position = new BABYLON.Vector3(offset, 2, 0);

        // Upper arm
        const upperArm = BABYLON.MeshBuilder.CreateCapsule(`${side}UpperArm`, {
            radius: 0.15,
            height: 0.8,
            tessellation: 16
        }, this.scene);
        upperArm.parent = armContainer;
        upperArm.position.y = -0.4;

        // Elbow joint
        const elbow = BABYLON.MeshBuilder.CreateSphere(`${side}Elbow`, {
            diameter: 0.25,
            segments: 16
        }, this.scene);
        elbow.parent = armContainer;
        elbow.position.y = -0.8;

        // Forearm
        const forearm = BABYLON.MeshBuilder.CreateCapsule(`${side}Forearm`, {
            radius: 0.12,
            height: 0.7,
            tessellation: 16
        }, this.scene);
        forearm.parent = armContainer;
        forearm.position.y = -1.2;

        // Hand
        const hand = BABYLON.MeshBuilder.CreateSphere(`${side}Hand`, {
            diameter: 0.25,
            segments: 16
        }, this.scene);
        hand.parent = armContainer;
        hand.position.y = -1.6;
        hand.scaling = new BABYLON.Vector3(1, 0.7, 0.5);

        return armContainer;
    }

    private createLeg(side: string, offset: number): BABYLON.TransformNode {
        const legContainer = new BABYLON.TransformNode(`zombie${side}Leg`, this.scene);
        if (this.mesh) {
            legContainer.parent = this.mesh;
        }
        legContainer.position = new BABYLON.Vector3(offset, 0.8, 0);

        // Upper leg
        const upperLeg = BABYLON.MeshBuilder.CreateCapsule(`${side}UpperLeg`, {
            radius: 0.2,
            height: 1,
            tessellation: 16
        }, this.scene);
        upperLeg.parent = legContainer;
        upperLeg.position.y = -0.5;

        // Knee joint
        const knee = BABYLON.MeshBuilder.CreateSphere(`${side}Knee`, {
            diameter: 0.35,
            segments: 16
        }, this.scene);
        knee.parent = legContainer;
        knee.position.y = -1;

        // Lower leg
        const lowerLeg = BABYLON.MeshBuilder.CreateCapsule(`${side}LowerLeg`, {
            radius: 0.15,
            height: 1,
            tessellation: 16
        }, this.scene);
        lowerLeg.parent = legContainer;
        lowerLeg.position.y = -1.5;

        // Foot
        const foot = BABYLON.MeshBuilder.CreateBox(`${side}Foot`, {
            height: 0.2,
            width: 0.3,
            depth: 0.6
        }, this.scene);
        foot.parent = legContainer;
        foot.position.y = -2;
        foot.position.z = 0.1;

        return legContainer;
    }

    animate(deltaTime: number, speed: number, state: ZombieState = 'idle'): void {
        if (!this.mesh) return;

        // Accumulate time for animation (keep it continuous)
        this.animState.time += deltaTime;

        // Update twitch timer
        this.animState.twitchTimer += deltaTime;
        if (this.animState.twitchTimer >= this.animState.nextTwitch) {
            this.animState.twitchTimer = 0;
            this.animState.nextTwitch = Math.random() * 4 + 2; // Random twitch every 2-6 seconds
        }

        // Calculate twitch intensity (brief spike when timer is near 0)
        const twitchIntensity = this.animState.twitchTimer < 0.2
            ? Math.sin(this.animState.twitchTimer * Math.PI * 5) * 0.3
            : 0;

        // Stop all animations before playing a new one
        for (const group of Object.values(this.animationGroups)) {
            group?.stop();
        }

        // Animation parameters based on state and speed
        const isMoving = speed > 0.5; // Actually walking, not just standing idle
        const isLurching = speed > 1.5;
        const baseSpeed = isLurching ? 10 : (state === 'pursuing' ? 6 : 3);

        switch (state) {
            case 'attacking':
                this.animationGroups.attack?.play(false);
                break;
            case 'suspicious':
                this.animationGroups.suspicious?.play(true);
                break;
            case 'pursuing':
            case 'idle':
            default:
                if (isMoving) {
                    // SHAMBLING GAIT - irregular, uncoordinated zombie movement

                    // Leg movements with staggered timing and different frequencies
                    // Left leg: slower, more deliberate
                    const leftLegCycle = Math.sin(this.animState.time * baseSpeed * 0.8 + this.animState.limbPhases.leftLeg);
                    // Right leg: slightly faster, creates shamble
                    const rightLegCycle = Math.sin(this.animState.time * baseSpeed * 1.1 + this.animState.limbPhases.rightLeg + 0.5);

                    // Add irregularity with secondary sine waves
                    const leftLegIrregular = Math.sin(this.animState.time * baseSpeed * 0.3) * 0.5;
                    const rightLegIrregular = Math.cos(this.animState.time * baseSpeed * 0.4) * 0.5;

                    // Apply leg rotations with drag and irregularity - INCREASED amplitude for visibility
                    if (this.legs.left) {
                        this.legs.left.rotation.x = (leftLegCycle + leftLegIrregular) * 0.9 + twitchIntensity * 0.3;
                        // Slight outward splay for zombie stance
                        this.legs.left.rotation.z = -0.08 + Math.sin(this.animState.time * 0.5) * 0.03;
                    }
                    if (this.legs.right) {
                        this.legs.right.rotation.x = (rightLegCycle + rightLegIrregular) * 0.9 + twitchIntensity * 0.3;
                        this.legs.right.rotation.z = 0.08 - Math.sin(this.animState.time * 0.5) * 0.03;
                    }

                    // DRAGGING ARMS - zombies don't swing arms, they drag them
                    // Arms hang down with slight sway and occasional twitch
                    const armSwaySpeed = baseSpeed * 0.4;
                    const leftArmSway = Math.sin(this.animState.time * armSwaySpeed + this.animState.limbPhases.leftArm);
                    const rightArmSway = Math.sin(this.animState.time * armSwaySpeed * 0.9 + this.animState.limbPhases.rightArm + Math.PI * 0.3);

                    // Arms hang down (positive X rotation) with irregular movement
                    if (this.arms.left) {
                        // Base hanging position + slight sway
                        this.arms.left.rotation.x = 0.8 + leftArmSway * 0.3 + twitchIntensity;
                        // Outward angle for dragging posture
                        this.arms.left.rotation.z = 0.15 + Math.sin(this.animState.time * 0.3) * 0.05;
                    }
                    if (this.arms.right) {
                        this.arms.right.rotation.x = 0.9 + rightArmSway * 0.3 + twitchIntensity * 0.8;
                        this.arms.right.rotation.z = -0.15 - Math.sin(this.animState.time * 0.35) * 0.05;
                    }

                    // BODY BOBBING - vertical movement matching gait
                    // Get current terrain Y (set by movement code before animate() called)
                    const terrainY = this.mesh.position.y;
                    
                    const bobFrequency = baseSpeed * 0.4;
                    const bobAmplitude = isLurching ? 0.15 : 0.08;
                    const bobOffset = Math.sin(this.animState.time * bobFrequency) * bobAmplitude;
                    const shambleBob = Math.cos(this.animState.time * bobFrequency * 2.3) * (bobAmplitude * 0.5);
                    
                    // Apply bob as offset to terrain height (reset each frame from movement)
                    this.mesh.position.y = terrainY + bobOffset + shambleBob + Math.abs(twitchIntensity * 0.05);

                } else {
                    // IDLE STANCE - minimal movement, arms hang
                    if (this.arms.left) {
                        this.arms.left.rotation.x = 0.7 + Math.sin(this.animState.time * 0.5) * 0.05 + twitchIntensity * 0.5;
                        this.arms.left.rotation.z = 0.1;
                    }
                    if (this.arms.right) {
                        this.arms.right.rotation.x = 0.75 + Math.cos(this.animState.time * 0.4) * 0.05 + twitchIntensity * 0.5;
                        this.arms.right.rotation.z = -0.1;
                    }
                    if (this.legs.left) {
                        this.legs.left.rotation.x = twitchIntensity * 0.3;
                        this.legs.left.rotation.z = -0.05;
                    }
                    if (this.legs.right) {
                        this.legs.right.rotation.x = twitchIntensity * 0.3;
                        this.legs.right.rotation.z = 0.05;
                    }
                }
                break;
        }

        // FORWARD LEAN - only when moving, more pronounced during pursuit
        if (isMoving) {
            const targetLean = state === 'pursuing' ? 0.35 : (isLurching ? 0.4 : 0.25);
            this.mesh.rotation.x = targetLean + twitchIntensity * 0.1;
        } else {
            // Standing upright when idle
            this.mesh.rotation.x = 0.1 + twitchIntensity * 0.05;
        }

        // BODY SWAY - irregular side-to-side movement (only when moving)
        if (isMoving) {
            const swaySpeed = isLurching ? 3 : 1.5;
            const swayAmount = isLurching ? 0.03 : 0.015;
            const primarySway = Math.sin(this.animState.time * swaySpeed * 0.7) * swayAmount;
            const secondarySway = Math.cos(this.animState.time * swaySpeed * 1.3 + 1) * (swayAmount * 0.5);
            // Use base rotation.y from movement, not cumulative
            this.mesh.rotation.y = this.mesh.rotation.y + primarySway + secondarySway + twitchIntensity * 0.05;
        }

        // HEAD MOVEMENT - independent, searching motion
        const head = this.mesh.getChildMeshes().find((mesh: BABYLON.Mesh) => mesh.name === 'zombieHead') as BABYLON.Mesh | undefined;
        if (head) {
            // Head bob and tilt with more variation during movement
            const headSpeed = isLurching ? 4 : 2;
            const headTiltBase = isLurching ? 0.25 : 0.15;

            // Vertical bob
            head.rotation.x = headTiltBase + Math.sin(this.animState.time * headSpeed * 0.6) * 0.15 + twitchIntensity * 0.3;

            // Horizontal searching motion
            head.rotation.y = Math.sin(this.animState.time * headSpeed * 0.4) * 0.25 +
                             Math.cos(this.animState.time * headSpeed * 0.25) * 0.15 +
                             twitchIntensity * 0.2;

            // Slight head tilt (z-axis) for instability
            head.rotation.z = Math.sin(this.animState.time * headSpeed * 0.35) * 0.1 +
                             twitchIntensity * 0.15;
        }

        // Animate blood drips slower for creepier effect
        this.bloodStains.forEach((drip, index) => {
            drip.position.y -= Math.sin(this.animState.time + index) * 0.0005;
            drip.scaling.y = 1 + Math.sin(this.animState.time * 1.5 + index) * 0.05;
        });
    }

    dispose(): void {
        if (this.mesh) {
            this.mesh.dispose();
        }

        // Clean up all child meshes
        this.arms.left?.dispose();
        this.arms.right?.dispose();
        this.legs.left?.dispose();
        this.legs.right?.dispose();

        // Clean up any blood stain meshes
        this.bloodStains.forEach(stain => {
            stain.dispose();
        });
    }

    static getTerrainHeight(x: number, z: number): number {
        // Simplified height calculation as fallback
        const distFromCenter = Math.sqrt(x * x + z * z);
        const radius = 100; // Default radius
        const bowlDepth = 25; // Default depth
        let height = -Math.pow(distFromCenter / radius, 1.2) * bowlDepth;

        // Add some variation
        height += Math.sin(x / 20) * Math.cos(z / 20) * 2;

        return Math.max(-20, Math.min(0, height)); // Clamp between -20 and 0
    }
}
