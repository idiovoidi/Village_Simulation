export class BoatAgent {
    constructor(scene, waterLevel = -5) {
        this.scene = scene;
        this.waterLevel = waterLevel;
        this.boats = [];
        this.init();
    }

    init() {
        this.createBoats(5); // Create 5 boats
        this.scene.registerBeforeRender(() => this.updateBoats());
    }

    createBoat(position) {
        // Create boat hull
        const hull = BABYLON.MeshBuilder.CreateBox("hull", {
            width: 3,
            height: 1,
            depth: 6
        }, this.scene);

        // Create boat bow (front)
        const bow = BABYLON.MeshBuilder.CreateCylinder("bow", {
            diameter: 1,
            height: 3,
            tessellation: 8,
        }, this.scene);
        bow.rotation.x = Math.PI / 2;
        bow.position.z = 3;
        bow.scaling.y = 2;

        // Create mast
        const mast = BABYLON.MeshBuilder.CreateCylinder("mast", {
            diameter: 0.2,
            height: 6
        }, this.scene);
        mast.position.y = 3;

        // Create sail
        const sail = BABYLON.MeshBuilder.CreatePlane("sail", {
            width: 3,
            height: 4
        }, this.scene);
        sail.position.y = 2;
        sail.rotation.x = Math.PI / 16;

        // Create materials
        const hullMaterial = new BABYLON.StandardMaterial("hullMat", this.scene);
        hullMaterial.diffuseColor = new BABYLON.Color3(
            0.6 + Math.random() * 0.2,
            0.4 + Math.random() * 0.2,
            0.2 + Math.random() * 0.1
        );

        const sailMaterial = new BABYLON.StandardMaterial("sailMat", this.scene);
        sailMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        sailMaterial.backFaceCulling = false;

        // Apply materials
        hull.material = hullMaterial;
        bow.material = hullMaterial;
        mast.material = hullMaterial;
        sail.material = sailMaterial;

        // Create boat container
        const boat = new BABYLON.TransformNode("boat", this.scene);
        hull.parent = boat;
        bow.parent = boat;
        mast.parent = boat;
        sail.parent = boat;

        // Position boat
        boat.position = position;

        // Add physics
        const aggregate = new BABYLON.PhysicsAggregate(
            boat,
            BABYLON.PhysicsShapeType.BOX,
            { mass: 10, friction: 0.1, restitution: 0.3 },
            this.scene
        );

        // Add boat properties
        return {
            mesh: boat,
            parts: { hull, bow, mast, sail },
            physics: aggregate,
            targetPoint: null,
            speed: 0.2 + Math.random() * 0.3,
            rotationSpeed: 0.02,
            state: 'sailing',
            sailAngle: 0
        };
    }

    createBoats(count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 30 + Math.random() * 20;
            const position = new BABYLON.Vector3(
                Math.cos(angle) * radius,
                this.waterLevel + 1,
                Math.sin(angle) * radius
            );
            const boat = this.createBoat(position);
            this.boats.push(boat);
        }
    }

    updateBoats() {
        this.boats.forEach(boat => {
            // Get new target if needed
            if (!boat.targetPoint || BABYLON.Vector3.Distance(boat.mesh.position, boat.targetPoint) < 5) {
                boat.targetPoint = this.getNewTargetPoint();
            }

            // Calculate direction to target
            const direction = boat.targetPoint.subtract(boat.mesh.position);
            const distance = direction.length();
            direction.normalize();

            // Calculate target rotation
            const targetAngle = Math.atan2(direction.x, direction.z);
            let currentRotation = boat.mesh.rotation.y;
            
            // Smoothly rotate towards target
            const rotationDiff = targetAngle - currentRotation;
            let rotationStep = boat.rotationSpeed;
            
            if (Math.abs(rotationDiff) > Math.PI) {
                if (rotationDiff > 0) {
                    currentRotation += Math.PI * 2;
                } else {
                    currentRotation -= Math.PI * 2;
                }
            }
            
            if (currentRotation < targetAngle) {
                boat.mesh.rotation.y += rotationStep;
            } else {
                boat.mesh.rotation.y -= rotationStep;
            }

            // Move boat
            const forward = new BABYLON.Vector3(
                Math.sin(boat.mesh.rotation.y),
                0,
                Math.cos(boat.mesh.rotation.y)
            );
            
            const movement = forward.scale(boat.speed);
            boat.mesh.position.addInPlace(movement);

            // Update sail angle based on movement
            const windAngle = Math.atan2(movement.x, movement.z);
            boat.parts.sail.rotation.y = Math.sin(windAngle) * 0.5;

            // Keep boat at water level
            boat.mesh.position.y = this.waterLevel + 
                Math.sin(this.scene.getEngine().getDeltaTime() * 0.001 + boat.mesh.position.x * 0.1) * 0.2;

            // Add slight roll based on movement
            boat.mesh.rotation.z = Math.sin(this.scene.getEngine().getDeltaTime() * 0.002) * 0.1;
        });
    }

    getNewTargetPoint() {
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 40;
        return new BABYLON.Vector3(
            Math.cos(angle) * radius,
            this.waterLevel,
            Math.sin(angle) * radius
        );
    }
} 