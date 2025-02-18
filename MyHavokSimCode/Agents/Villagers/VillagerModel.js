export class VillagerModel {
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
    }

    createVillager(position) {
        const name = `villager_${this.meshes.length}`;
        
        // Create root mesh for the villager
        const root = new BABYLON.TransformNode(name, this.scene);
        root.position = position;

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

        // Create limbs
        const limbs = {
            leftArm: this.createLimb(name, "leftArm", { radius: 0.15, height: 0.8 }),
            rightArm: this.createLimb(name, "rightArm", { radius: 0.15, height: 0.8 }),
            leftLeg: this.createLimb(name, "leftLeg", { radius: 0.2, height: 1 }),
            rightLeg: this.createLimb(name, "rightLeg", { radius: 0.2, height: 1 })
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

        // Create materials with better colors
        const bodyMaterial = new BABYLON.StandardMaterial(`${name}_material`, this.scene);
        const skinTone = new BABYLON.Color3(
            0.8 + Math.random() * 0.2,
            0.6 + Math.random() * 0.2,
            0.4 + Math.random() * 0.2
        );
        
        const clothingColor = new BABYLON.Color3(
            Math.random(),
            Math.random(),
            Math.random()
        );

        bodyMaterial.diffuseColor = skinTone;
        bodyMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        const clothingMaterial = new BABYLON.StandardMaterial(`${name}_clothing`, this.scene);
        clothingMaterial.diffuseColor = clothingColor;

        // Apply materials
        head.material = bodyMaterial;
        torso.material = clothingMaterial;
        Object.values(limbs).forEach(limb => limb.material = clothingMaterial);

        // Add physics
        this.physics = new BABYLON.PhysicsAggregate(
            root,
            BABYLON.PhysicsShapeType.CAPSULE,
            { mass: 1, restitution: 0.2, friction: 0.8 },
            this.scene
        );

        // Store mesh reference
        this.meshes.push(root);

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

    createLimb(name, limbName, dimensions) {
        return BABYLON.MeshBuilder.CreateCapsule(
            `${name}_${limbName}`,
            { radius: dimensions.radius, height: dimensions.height, tessellation: 16 },
            this.scene
        );
    }

    dispose() {
        this.meshes.forEach(mesh => {
            if (mesh && mesh.dispose) {
                mesh.dispose();
            }
        });
        this.meshes = [];
    }
} 