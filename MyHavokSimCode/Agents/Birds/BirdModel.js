export class BirdModel {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.wingLeft = null;
        this.wingRight = null;
        this.tail = null;
    }

    create(position) {
        // Create bird container
        this.mesh = new BABYLON.TransformNode('bird', this.scene);
        this.mesh.position = position;

        // Create body
        const body = BABYLON.MeshBuilder.CreateCapsule('birdBody', {
            radius: 0.2,
            height: 0.8,
            tessellation: 8
        }, this.scene);
        body.parent = this.mesh;
        body.rotation.z = Math.PI / 2;

        // Create wings
        this.wingLeft = this.createWing('wingLeft', -0.2);
        this.wingRight = this.createWing('wingRight', 0.2);

        // Create tail
        this.tail = BABYLON.MeshBuilder.CreateBox('tail', {
            width: 0.3,
            height: 0.05,
            depth: 0.2
        }, this.scene);
        this.tail.parent = this.mesh;
        this.tail.position.z = -0.4;
        this.tail.position.y = 0;

        // Create materials
        const bodyMaterial = new BABYLON.StandardMaterial('birdMat', this.scene);
        bodyMaterial.diffuseColor = new BABYLON.Color3(
            0.6 + Math.random() * 0.2,
            0.6 + Math.random() * 0.2,
            0.6 + Math.random() * 0.2
        );

        const wingMaterial = new BABYLON.StandardMaterial('wingMat', this.scene);
        wingMaterial.diffuseColor = bodyMaterial.diffuseColor.scale(0.8);

        // Apply materials
        body.material = bodyMaterial;
        this.wingLeft.material = wingMaterial;
        this.wingRight.material = wingMaterial;
        this.tail.material = wingMaterial;

        return this.mesh;
    }

    createWing(name, yOffset) {
        const wing = BABYLON.MeshBuilder.CreateBox(name, {
            width: 0.8,
            height: 0.05,
            depth: 0.3
        }, this.scene);
        wing.parent = this.mesh;
        wing.position = new BABYLON.Vector3(0, yOffset, 0);
        return wing;
    }

    animate(deltaTime, speed) {
        if (!this.mesh) return;

        // Wing flapping animation
        const flapSpeed = 15 + speed * 20; // Flap faster when moving faster
        const flapAmount = 0.5 + speed * 0.5; // Flap wider when moving faster

        if (this.wingLeft && this.wingRight) {
            const wingAngle = Math.sin(deltaTime * flapSpeed) * flapAmount;
            this.wingLeft.rotation.x = wingAngle;
            this.wingRight.rotation.x = -wingAngle;
        }

        // Tail movement
        if (this.tail) {
            this.tail.rotation.y = Math.sin(deltaTime * 5) * 0.1;
        }
    }

    setColor(color) {
        if (!this.mesh) return;

        const bodyMaterial = this.mesh.getChildMeshes()[0].material;
        bodyMaterial.diffuseColor = color;

        const wingMaterial = this.wingLeft.material;
        wingMaterial.diffuseColor = color.scale(0.8);
    }

    dispose() {
        if (this.mesh) {
            this.mesh.getChildMeshes().forEach(mesh => {
                if (mesh.material) {
                    mesh.material.dispose();
                }
                mesh.dispose();
            });
            this.mesh.dispose();
        }
    }
}
