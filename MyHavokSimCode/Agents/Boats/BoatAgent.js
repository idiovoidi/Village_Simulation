import { BoatAgentBehaviour } from './BoatAgentBehaviour.js';

export class BoatAgent {
    constructor(scene, waterLevel = -8) {
        if (!scene) {
            throw new Error('Scene is required for BoatAgent');
        }
        this.scene = scene;
        this.waterLevel = waterLevel;
        this.boats = [];
        this.safeSpawnRadius = 20; // Reduced spawn radius for safer spawning
    }

    initialize() {
        try {
            this.createBoats(3);
            this.scene.registerBeforeRender(() => {
                const deltaTime = this.scene.getEngine().getDeltaTime();
                this.updateBoats(deltaTime);
            });
        } catch (error) {
            console.error('Error initializing BoatAgent:', error);
        }
    }

    createBoats(count) {
        for (let i = 0; i < count; i++) {
            // Spawn boats in a circle pattern with guaranteed safe positions
            const angle = (i / count) * Math.PI * 2;
            const radius = 15; // Fixed initial radius for guaranteed deep water
            const position = new BABYLON.Vector3(
                Math.cos(angle) * radius,
                this.waterLevel + 0.5,
                Math.sin(angle) * radius
            );

            const boat = this.createBoat(position);
            this.boats.push(boat);
        }
    }

    createBoat(position) {
        // Create boat container
        const boat = new BABYLON.TransformNode('boat', this.scene);

        // Create hull (slightly larger and more visible)
        const hull = BABYLON.MeshBuilder.CreateBox('hull', {
            width: 2,
            height: 1,
            depth: 4
        }, this.scene);
        hull.parent = boat;
        hull.position.y = 0.5; // Raise hull slightly

        // Create mast
        const mast = BABYLON.MeshBuilder.CreateCylinder('mast', {
            diameter: 0.2,
            height: 4
        }, this.scene);
        mast.parent = boat;
        mast.position.y = 2.5;

        // Create sail (larger)
        const sail = BABYLON.MeshBuilder.CreatePlane('sail', {
            width: 2,
            height: 3
        }, this.scene);
        sail.parent = boat;
        sail.position.y = 2;
        sail.rotation.y = Math.PI / 2;

        // Create materials with more visible colors
        const hullMat = new BABYLON.StandardMaterial('hullMat', this.scene);
        hullMat.diffuseColor = new BABYLON.Color3(
            0.8 + Math.random() * 0.2, // More vibrant wood color
            0.4 + Math.random() * 0.2,
            0.2 + Math.random() * 0.1
        );
        hullMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

        const sailMat = new BABYLON.StandardMaterial('sailMat', this.scene);
        sailMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        sailMat.backFaceCulling = false;
        sailMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        hull.material = hullMat;
        mast.material = hullMat;
        sail.material = sailMat;

        boat.position = position;

        return {
            mesh: boat,
            parts: { hull, mast, sail },
            targetPoint: null
        };
    }

    getTerrainHeight(x, z) {
        const bowlRadius = 100;
        const bowlDepth = 25;
        const distFromCenter = Math.sqrt(x * x + z * z);

        let height = -Math.pow(distFromCenter / bowlRadius, 1.2) * bowlDepth;
        height += Math.sin(x / 20) * Math.cos(z / 20) * 2;

        return height;
    }

    updateBoats(deltaTime) {
        this.boats.forEach(boat => {
            if (!boat.behavior) {
                boat.behavior = new BoatAgentBehaviour(boat, this.waterLevel);
            }
            boat.behavior.update(deltaTime, this.boats);
        });
    }
}
