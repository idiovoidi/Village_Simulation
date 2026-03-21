export class BasicAgent {
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
    }

    createAgent(name, position) {
        // Create root mesh for the agent
        const root = new BABYLON.TransformNode(name, this.scene);
        this.meshes.push(root);

        // Create body parts with better proportions
        const torso = BABYLON.MeshBuilder.CreateCapsule(
            `${name}_torso`,
            { radius: 0.4, height: 1.2, tessellation: 16 },
            this.scene
        );
        this.meshes.push(torso);
        torso.parent = root;
        torso.position.y = 1.6;

        // Create head
        const head = BABYLON.MeshBuilder.CreateSphere(
            `${name}_head`,
            { diameter: 0.5, segments: 16 },
            this.scene
        );
        this.meshes.push(head);
        head.parent = torso;
        head.position.y = 0.8;

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
        Object.values(limbs).forEach(limb => {
            this.meshes.push(limb);
            limb.material = clothingMaterial;
        });

        // Add physics
        const aggregate = new BABYLON.PhysicsAggregate(
            root,
            BABYLON.PhysicsShapeType.CAPSULE,
            { mass: 1, friction: 0.5, restitution: 0.3 },
            this.scene
        );

        // Set position if provided
        if (position) {
            root.position = position;
        }

        return {
            mesh: root,
            parts: {
                torso,
                head,
                ...limbs
            },
            physics: aggregate,
            currentTarget: null,
            speed: 0.5 + Math.random() * 0.5,
            state: 'seeking',
            waitTime: 0,
            flockingParams: {
                separationWeight: 1.0,
                alignmentWeight: 0.7,
                cohesionWeight: 0.5,
                separationRadius: 5,
                alignmentRadius: 10,
                cohesionRadius: 15
            }
        };
    }

    createLimb(name, limbName, dimensions) {
        const limb = BABYLON.MeshBuilder.CreateCapsule(
            `${name}_${limbName}`,
            { radius: dimensions.radius, height: dimensions.height, tessellation: 16 },
            this.scene
        );
        this.meshes.push(limb);
        return limb;
    }

    dispose() {
        if (this.mesh) {
            if (this.physics) {
                this.physics.dispose();
            }
            this.mesh.dispose();
        }
    }
}
