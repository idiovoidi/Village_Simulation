export class ZombieModel {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.arms = { left: null, right: null };
        this.legs = { left: null, right: null };
        this.bloodStains = [];
        this.animationGroups = {};
    }

    create(position) {
        // Create zombie container
        this.mesh = new BABYLON.TransformNode("zombie", this.scene);
        this.mesh.position = position;

        // Create torso
        const torso = BABYLON.MeshBuilder.CreateCapsule("zombieTorso", {
            radius: 0.5,
            height: 1.5,
            tessellation: 16
        }, this.scene);
        torso.parent = this.mesh;
        torso.position.y = 1.5;

        // Create head
        const head = BABYLON.MeshBuilder.CreateSphere("zombieHead", {
            diameter: 0.8,
            segments: 16
        }, this.scene);
        head.parent = this.mesh;
        head.position.y = 2.5;
        head.position.z = 0.1;

        // Create neck
        const neck = BABYLON.MeshBuilder.CreateCylinder("zombieNeck", {
            height: 0.3,
            diameter: 0.3,
            tessellation: 16
        }, this.scene);
        neck.parent = this.mesh;
        neck.position.y = 2.2;

        // Create arms with proper joints
        this.arms.left = this.createArm("left", -0.6);
        this.arms.right = this.createArm("right", 0.6);

        // Create legs with proper joints
        this.legs.left = this.createLeg("left", -0.3);
        this.legs.right = this.createLeg("right", 0.3);

        // Create animations now that arms/legs are created
        this.createAnimations(head);

        // Create zombie material for skin
        const zombieSkinMaterial = new BABYLON.StandardMaterial("zombieSkinMat", this.scene);
        zombieSkinMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.6, 0.4); // Sickly green-gray
        zombieSkinMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Create tattered clothing material
        const clothingMaterial = new BABYLON.StandardMaterial("zombieClothingMat", this.scene);
        clothingMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.1); // Drab brown

        // Apply clothing material to torso
        torso.material = clothingMaterial;

        // Add tattered patches to torso
        for (let i = 0; i < 5; i++) {
            const patch = BABYLON.MeshBuilder.CreateBox("patch", {
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
        const eyeMaterial = new BABYLON.StandardMaterial("zombieEyeMat", this.scene);
        eyeMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.1, 0.1); // Faint red glow

        // Create eyes
        const leftEye = BABYLON.MeshBuilder.CreateSphere("leftEye", { diameter: 0.1 }, this.scene);
        leftEye.parent = head;
        leftEye.position = new BABYLON.Vector3(-0.2, 0.1, 0.35);
        leftEye.material = eyeMaterial;

        const rightEye = BABYLON.MeshBuilder.CreateSphere("rightEye", { diameter: 0.1 }, this.scene);
        rightEye.parent = head;
        rightEye.position = new BABYLON.Vector3(0.2, 0.1, 0.35);
        rightEye.material = eyeMaterial;
        
        // Apply materials
        head.material = zombieSkinMaterial;
        neck.material = zombieSkinMaterial;
        this.arms.left.getChildMeshes().forEach(m => m.material = zombieSkinMaterial);
        this.arms.right.getChildMeshes().forEach(m => m.material = zombieSkinMaterial);
        this.legs.left.getChildMeshes().forEach(m => m.material = zombieSkinMaterial);
        this.legs.right.getChildMeshes().forEach(m => m.material = zombieSkinMaterial);

        // Apply animations
        this.mesh.animationGroups = this.animationGroups;

        return this.mesh;
    }

    createAnimations(head) {
        // Attack animation (right arm swipe)
        const attackAnimation = new BABYLON.Animation("attackAnimation", "rotation.x", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const attackKeys = [];
        attackKeys.push({ frame: 0, value: 0 });
        attackKeys.push({ frame: 10, value: -Math.PI / 2 });
        attackKeys.push({ frame: 20, value: 0 });
        attackAnimation.setKeys(attackKeys);

        const attackGroup = new BABYLON.AnimationGroup("attack");
        attackGroup.addTargetedAnimation(attackAnimation, this.arms.right);
        this.animationGroups.attack = attackGroup;

        // Suspicious animation (head turning)
        const suspiciousAnimation = new BABYLON.Animation("suspiciousAnimation", "rotation.y", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
        const suspiciousKeys = [];
        suspiciousKeys.push({ frame: 0, value: 0 });
        suspiciousKeys.push({ frame: 20, value: -Math.PI / 8 });
        suspiciousKeys.push({ frame: 60, value: Math.PI / 8 });
        suspiciousKeys.push({ frame: 100, value: 0 });
        suspiciousAnimation.setKeys(suspiciousKeys);

        const suspiciousGroup = new BABYLON.AnimationGroup("suspicious");
        suspiciousGroup.addTargetedAnimation(suspiciousAnimation, head);
        this.animationGroups.suspicious = suspiciousGroup;
    }

    createArm(side, offset) {
        const armContainer = new BABYLON.TransformNode(`zombie${side}Arm`, this.scene);
        armContainer.parent = this.mesh;
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

        // No need to set material here, it's handled in create()
        return armContainer;
    }

    createLeg(side, offset) {
        const legContainer = new BABYLON.TransformNode(`zombie${side}Leg`, this.scene);
        legContainer.parent = this.mesh;
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

        // No need to set material here, it's handled in create()
        return legContainer;
    }

    animate(deltaTime, speed, state = 'idle') {
        if (!this.mesh) return;

        const angle = deltaTime * (speed > 1 ? 6 : 2);

        // Stop all animations before playing a new one
        for (const group of Object.values(this.animationGroups)) {
            group.stop();
        }

        switch (state) {
            case 'attacking':
                this.animationGroups.attack.play(false);
                break;
            case 'suspicious':
                this.animationGroups.suspicious.play(true);
                break;
            case 'pursuing':
            case 'idle':
            default:
                // Slower base shambling, more dramatic lurge
                this.arms.left.rotation.x = Math.sin(angle) * 0.5;
                this.arms.right.rotation.x = -Math.sin(angle) * 0.5;
                this.legs.left.rotation.x = -Math.sin(angle) * 0.5;
                this.legs.right.rotation.x = Math.sin(angle) * 0.5;
                break;
        }

        // More pronounced forward lean during lurge
        this.mesh.rotation.x = speed > 1 ? 0.4 : 0.2;
        
        // More intense body sway during lurge
        this.mesh.rotation.y += Math.sin(angle * 0.5) * 0.01 * speed;

        // More dramatic head movement during lurge
        const head = this.mesh.getChildMeshes().find(mesh => mesh.name === "zombieHead");
        if (head) {
            if (speed > 1) {
                head.rotation.z = Math.sin(angle * 0.7) * 0.2;
                head.rotation.y = Math.sin(angle * 0.5) * 0.3;
                head.rotation.x = 0.3 + Math.sin(angle * 0.3) * 0.2;
            } else {
                head.rotation.z = Math.sin(angle * 0.7) * 0.1;
                head.rotation.y = Math.sin(angle * 0.5) * 0.2;
                head.rotation.x = 0.2 + Math.sin(angle * 0.3) * 0.1;
            }
        }

        // Animate blood drips slower for creepier effect
        this.bloodStains.forEach((drip, index) => {
            drip.position.y -= Math.sin(deltaTime + index) * 0.0005;
            drip.scaling.y = 1 + Math.sin(deltaTime * 1.5 + index) * 0.05;
        });
    }

    dispose() {
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
    
    static getTerrainHeight(x, z) {
        // Simplified height calculation as fallback
        const distFromCenter = Math.sqrt(x * x + z * z);
        const radius = 100; // Default radius
        const bowlDepth = 25; // Default depth
        let height = -Math.pow(distFromCenter / radius, 1.2) * bowlDepth;
        
        // Add some variation
        height += Math.sin(x/20) * Math.cos(z/20) * 2;
        
        return Math.max(-20, Math.min(0, height)); // Clamp between -20 and 0
    }
}