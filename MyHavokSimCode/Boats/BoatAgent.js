export class BoatAgent {
    constructor(scene, waterLevel = -8) {
        if (!scene) {
            throw new Error("Scene is required for BoatAgent");
        }
        this.scene = scene;
        this.waterLevel = waterLevel;
        this.boats = [];
        this.bowlRadius = 100;  // Match the bowl size
        this.safeRadius = 60;   // Keep boats within safe area
    }

    // Separate initialization from constructor
    initialize() {
        try {
            this.createBoats(5); // Create 5 boats
            this.scene.registerBeforeRender(() => this.updateBoats());
        } catch (error) {
            console.error("Error initializing BoatAgent:", error);
        }
    }

    createBoat(position) {
        // Create boat hull (make it smaller)
        const hull = BABYLON.MeshBuilder.CreateBox("hull", {
            width: 2,      // Reduced from 3
            height: 0.8,   // Reduced from 1
            depth: 4       // Reduced from 6
        }, this.scene);

        // Create boat bow (front)
        const bow = BABYLON.MeshBuilder.CreateCylinder("bow", {
            diameter: 0.8,  // Reduced from 1
            height: 2,     // Reduced from 3
            tessellation: 8,
        }, this.scene);
        bow.rotation.x = Math.PI / 2;
        bow.position.z = 2;
        bow.scaling.y = 2;

        // Create mast
        const mast = BABYLON.MeshBuilder.CreateCylinder("mast", {
            diameter: 0.15,
            height: 4      // Reduced from 6
        }, this.scene);
        mast.position.y = 2;

        // Create sail
        const sail = BABYLON.MeshBuilder.CreatePlane("sail", {
            width: 2,     // Reduced from 3
            height: 3     // Reduced from 4
        }, this.scene);
        sail.position.y = 1.5;
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

        // Create boat container and set up hierarchy
        const boat = new BABYLON.TransformNode("boat", this.scene);
        hull.parent = boat;
        bow.parent = boat;
        mast.parent = boat;
        sail.parent = boat;

        // Position boat at water level
        boat.position = position;

        // Add physics with adjusted properties
        const aggregate = new BABYLON.PhysicsAggregate(
            boat,
            BABYLON.PhysicsShapeType.BOX,
            { mass: 5, friction: 0.1, restitution: 0.3 }, // Reduced mass
            this.scene
        );

        return {
            mesh: boat,
            parts: { hull, bow, mast, sail },
            physics: aggregate,
            targetPoint: null,
            speed: 0.1 + Math.random() * 0.2,  // Reduced speed
            rotationSpeed: 0.015,
            state: 'sailing',
            sailAngle: 0
        };
    }

    createBoats(count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 20 + Math.random() * 15; // Reduced radius
            const position = new BABYLON.Vector3(
                Math.cos(angle) * radius,
                this.waterLevel + 0.5, // Adjusted height above water
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
            direction.normalize();

            // Check if too close to edge
            const distFromCenter = new BABYLON.Vector3(
                boat.mesh.position.x,
                0,
                boat.mesh.position.z
            ).length();

            if (distFromCenter > this.safeRadius) {
                // Steer back towards center
                const toCenter = new BABYLON.Vector3(0, this.waterLevel, 0)
                    .subtract(boat.mesh.position)
                    .normalize();
                direction.addInPlace(toCenter).normalize();
            }

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

            // Keep boat at water level with wave motion
            const time = this.scene.getEngine().getDeltaTime() * 0.001;
            boat.mesh.position.y = this.waterLevel + 0.5 + 
                Math.sin(time * 2 + boat.mesh.position.x * 0.1) * 0.15 +
                Math.cos(time * 1.5 + boat.mesh.position.z * 0.1) * 0.15;

            // Add realistic roll and pitch based on waves
            boat.mesh.rotation.z = Math.sin(time * 2 + boat.mesh.position.x * 0.2) * 0.08;
            boat.mesh.rotation.x = Math.cos(time * 1.5 + boat.mesh.position.z * 0.2) * 0.08;
        });
    }

    getNewTargetPoint() {
        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * 25; // Reduced radius
        return new BABYLON.Vector3(
            Math.cos(angle) * radius,
            this.waterLevel,
            Math.sin(angle) * radius
        );
    }
} 