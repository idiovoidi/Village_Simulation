export class ZombieModel {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.arms = { left: null, right: null };
        this.legs = { left: null, right: null };
        this.bloodStains = [];
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

        // Create zombie material
        const zombieMaterial = new BABYLON.StandardMaterial("zombieMat", this.scene);
        zombieMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.4);
        zombieMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        zombieMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);

        // Create face material
        const faceMaterial = new BABYLON.StandardMaterial("faceMat", this.scene);
        faceMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.5, 0.5);
        faceMaterial.emissiveColor = new BABYLON.Color3(0.1, 0, 0);

        // Add blood drips
        const bloodDripMaterial = new BABYLON.StandardMaterial("bloodDripMat", this.scene);
        bloodDripMaterial.diffuseColor = new BABYLON.Color3(0.7, 0, 0);
        bloodDripMaterial.alpha = 0.9;
        bloodDripMaterial.emissiveColor = new BABYLON.Color3(0.2, 0, 0);

        // Create blood drips
        for (let i = 0; i < 3; i++) {
            const drip = BABYLON.MeshBuilder.CreateBox("bloodDrip", {
                height: 0.1 + Math.random() * 0.3,
                width: 0.05,
                depth: 0.05
            }, this.scene);
            drip.parent = head;
            drip.position.y = -0.2 - i * 0.2;
            drip.position.z = 0.4;
            drip.material = bloodDripMaterial;
            this.bloodStains.push(drip);
        }

        // Apply materials
        torso.material = zombieMaterial;
        head.material = faceMaterial;
        neck.material = zombieMaterial;

        return this.mesh;
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

        // Apply zombie material
        const zombieMaterial = new BABYLON.StandardMaterial(`${side}ArmMat`, this.scene);
        zombieMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.4);
        zombieMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        upperArm.material = zombieMaterial;
        elbow.material = zombieMaterial;
        forearm.material = zombieMaterial;
        hand.material = zombieMaterial;

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

        // Apply zombie material
        const zombieMaterial = new BABYLON.StandardMaterial(`${side}LegMat`, this.scene);
        zombieMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.4);
        zombieMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        upperLeg.material = zombieMaterial;
        knee.material = zombieMaterial;
        lowerLeg.material = zombieMaterial;
        foot.material = zombieMaterial;

        return legContainer;
    }

    animate(deltaTime, speed) {
        if (!this.mesh) return;

        // Slower base shambling, more dramatic lurge
        const angle = deltaTime * (speed > 1 ? 6 : 2);
        
        // More pronounced forward lean during lurge
        this.mesh.rotation.x = speed > 1 ? 0.4 : 0.2;
        
        // Arms behavior
        if (this.arms.left && this.arms.right) {
            if (speed > 1) {
                // Aggressive lurging pose
                this.arms.left.rotation.x = 1.2;
                this.arms.right.rotation.x = 1.2;
                this.arms.left.rotation.z = -1.0;
                this.arms.right.rotation.z = 1.0;
                
                // Violent arm swaying during lurge
                const lurgeArmSway = Math.sin(angle * 2) * 0.6;
                this.arms.left.rotation.x += lurgeArmSway;
                this.arms.right.rotation.x -= lurgeArmSway;
            } else {
                // Normal shambling pose
                this.arms.left.rotation.x = 0.8;
                this.arms.right.rotation.x = 0.8;
                this.arms.left.rotation.z = -0.8;
                this.arms.right.rotation.z = 0.8;
                
                const armSway = Math.sin(angle) * 0.2;
                this.arms.left.rotation.x += armSway;
                this.arms.right.rotation.x -= armSway;
            }
        }

        // More dramatic leg movement during lurge
        if (this.legs.left && this.legs.right) {
            const legAngle = speed > 1 ? 
                Math.sin(angle) * 0.7 : // Bigger steps when lurging
                Math.sin(angle) * 0.3;  // Normal shuffling
            
            this.legs.left.rotation.x = -legAngle;
            this.legs.right.rotation.x = legAngle;
        }

        // More intense body sway during lurge
        const bodySway = Math.sin(angle * 0.5) * (speed > 1 ? 0.2 : 0.1);
        this.mesh.rotation.z = bodySway;

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