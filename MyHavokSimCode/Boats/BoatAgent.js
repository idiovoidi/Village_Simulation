import { BoatAgentBehaviour } from './BoatAgentBehaviour.js';

export class BoatAgent {
    constructor(scene, waterLevel = -8) {
        if (!scene) {
            throw new Error("Scene is required for BoatAgent");
        }
        this.scene = scene;
        this.waterLevel = waterLevel;
        this.boats = [];
    }

    initialize() {
        try {
            this.createBoats(3); // Reduced number of boats
            this.scene.registerBeforeRender(() => {
                const deltaTime = this.scene.getEngine().getDeltaTime();
                this.updateBoats(deltaTime);
            });
        } catch (error) {
            console.error("Error initializing BoatAgent:", error);
        }
    }

    createBoat(position) {
        // Create simplified boat mesh
        const hull = BABYLON.MeshBuilder.CreateBox("hull", {
            width: 1.5,
            height: 0.6,
            depth: 3
        }, this.scene);

        const mast = BABYLON.MeshBuilder.CreateCylinder("mast", {
            diameter: 0.1,
            height: 3
        }, this.scene);
        mast.position.y = 1.5;

        const sail = BABYLON.MeshBuilder.CreatePlane("sail", {
            width: 1.5,
            height: 2
        }, this.scene);
        sail.position.y = 1;

        // Materials
        const hullMat = new BABYLON.StandardMaterial("hullMat", this.scene);
        hullMat.diffuseColor = new BABYLON.Color3(
            0.6 + Math.random() * 0.2,
            0.4 + Math.random() * 0.2,
            0.2 + Math.random() * 0.1
        );

        const sailMat = new BABYLON.StandardMaterial("sailMat", this.scene);
        sailMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        sailMat.backFaceCulling = false;

        hull.material = hullMat;
        mast.material = hullMat;
        sail.material = sailMat;

        // Create boat container
        const boat = new BABYLON.TransformNode("boat", this.scene);
        hull.parent = boat;
        mast.parent = boat;
        sail.parent = boat;

        boat.position = position;

        return {
            mesh: boat,
            parts: { hull, mast, sail },
            targetPoint: null
        };
    }

    createBoats(count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 15 + Math.random() * 10;
            const position = new BABYLON.Vector3(
                Math.cos(angle) * radius,
                this.waterLevel + 0.5,
                Math.sin(angle) * radius
            );
            const boat = this.createBoat(position);
            this.boats.push(boat);
        }
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