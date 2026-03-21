export class BoatAgentBehaviour {
    constructor(boat, waterLevel) {
        this.boat = boat;
        this.waterLevel = waterLevel;
        this.safeRadius = 30;  // Reduced safe radius
        this.currentSpeed = 0;
        this.minWaterDepth = 3; // Increased minimum water depth
        this.terrainCheckDistance = 8; // Increased terrain check distance

        this.params = {
            speed: 0.03,           // Slightly faster speed
            turnSpeed: 0.01,       // Increased turn speed
            waveHeight: 0.1,       // Increased wave effect
            tiltAmount: 0.05,      // Increased tilt
            minDistToOthers: 10,   // Increased minimum distance
            avoidanceStrength: 2.0 // Increased avoidance strength
        };
    }

    update(deltaTime, _otherBoats) {
        // Get steering direction with terrain awareness
        const steering = this.getSteeringDirection(_otherBoats);

        // Only move if we're in safe water
        if (this.isInSafeWater()) {
            this.moveBoat(steering, deltaTime);
        } else {
            // If in shallow water, reverse course
            this.reverseFromDanger();
        }

        this.updateBoatVisuals(deltaTime);
    }

    getSteeringDirection(_otherBoats) {
        const direction = new BABYLON.Vector3(0, 0, 0);
        const pos = this.boat.mesh.position;

        // Get forward direction
        const forward = new BABYLON.Vector3(
            Math.sin(this.boat.mesh.rotation.y),
            0,
            Math.cos(this.boat.mesh.rotation.y)
        );

        // Check terrain ahead
        const terrainAvoidance = this.getTerrainAvoidanceVector(forward);
        if (terrainAvoidance) {
            direction.addInPlace(terrainAvoidance.scale(this.params.avoidanceStrength));
        }

        // Normal navigation logic
        if (this.isInSafeWater()) {
            const distFromCenter = new BABYLON.Vector3(pos.x, 0, pos.z).length();
            if (distFromCenter > this.safeRadius) {
                direction.addInPlace(new BABYLON.Vector3(-pos.x, 0, -pos.z).normalize());
            } else {
                if (!this.boat.targetPoint
                    || BABYLON.Vector3.Distance(pos, this.boat.targetPoint) < 5) {
                    this.boat.targetPoint = this.getNewTarget();
                }
                direction.addInPlace(this.boat.targetPoint.subtract(pos).normalize());
            }
        }

        return direction.normalize();
    }

    getTerrainAvoidanceVector(forward) {
        const pos = this.boat.mesh.position;
        const checkPoints = [
            { direction: forward, weight: 1.0 },
            { direction: this.rotateVector(forward, Math.PI / 4), weight: 0.7 },
            { direction: this.rotateVector(forward, -Math.PI / 4), weight: 0.7 }
        ];

        const avoidanceVector = new BABYLON.Vector3(0, 0, 0);

        checkPoints.forEach(point => {
            const checkPos = pos.add(point.direction.scale(this.terrainCheckDistance));
            const waterDepth = this.getWaterDepth(checkPos);

            if (waterDepth < this.minWaterDepth) {
                // Add avoidance force away from shallow water
                const avoidDir = pos.subtract(checkPos).normalize();
                avoidanceVector.addInPlace(avoidDir.scale(point.weight * (this.minWaterDepth - waterDepth)));
            }
        });

        return avoidanceVector.length() > 0 ? avoidanceVector.normalize() : null;
    }

    rotateVector(vector, angle) {
        const x = vector.x * Math.cos(angle) - vector.z * Math.sin(angle);
        const z = vector.x * Math.sin(angle) + vector.z * Math.cos(angle);
        return new BABYLON.Vector3(x, 0, z);
    }

    getWaterDepth(position) {
        const terrainHeight = this.getTerrainHeight(position.x, position.z);
        return this.waterLevel - terrainHeight;
    }

    isInSafeWater() {
        return this.getWaterDepth(this.boat.mesh.position) >= this.minWaterDepth;
    }

    reverseFromDanger() {
        const forward = new BABYLON.Vector3(
            Math.sin(this.boat.mesh.rotation.y),
            0,
            Math.cos(this.boat.mesh.rotation.y)
        );

        // Move backwards
        this.boat.mesh.position.subtractInPlace(forward.scale(this.params.speed));

        // Turn towards deeper water
        const deepWaterDir = this.findDeepWaterDirection();
        if (deepWaterDir) {
            const targetAngle = Math.atan2(deepWaterDir.x, deepWaterDir.z);
            this.boat.mesh.rotation.y
                += (targetAngle - this.boat.mesh.rotation.y) * this.params.turnSpeed * 2;
        }
    }

    findDeepWaterDirection() {
        const pos = this.boat.mesh.position;
        let deepestDirection = null;
        let maxDepth = -Infinity;

        // Check in 8 directions
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const checkDir = new BABYLON.Vector3(
                Math.sin(angle),
                0,
                Math.cos(angle)
            );
            const checkPos = pos.add(checkDir.scale(this.terrainCheckDistance));
            const depth = this.getWaterDepth(checkPos);

            if (depth > maxDepth) {
                maxDepth = depth;
                deepestDirection = checkDir;
            }
        }

        return deepestDirection;
    }

    getTerrainHeight(x, z) {
        const bowlRadius = 100;
        const bowlDepth = 25;
        const distFromCenter = Math.sqrt(x * x + z * z);

        let height = -Math.pow(distFromCenter / bowlRadius, 1.2) * bowlDepth;
        height += Math.sin(x / 20) * Math.cos(z / 20) * 2;

        return height;
    }

    moveBoat(direction, deltaTime) {
        // Calculate target angle
        const targetAngle = Math.atan2(direction.x, direction.z);
        const currentAngle = this.boat.mesh.rotation.y;

        // Smooth rotation
        let angleDiff = targetAngle - currentAngle;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Apply rotation
        this.boat.mesh.rotation.y += angleDiff * this.params.turnSpeed * deltaTime;

        // Move forward
        const forward = new BABYLON.Vector3(
            Math.sin(this.boat.mesh.rotation.y),
            0,
            Math.cos(this.boat.mesh.rotation.y)
        );

        this.boat.mesh.position.addInPlace(
            forward.scale(this.params.speed * deltaTime)
        );
    }

    updateBoatVisuals(_deltaTime) {
        const pos = this.boat.mesh.position;
        const time = performance.now() * 0.001;

        // More pronounced wave motion
        this.boat.mesh.position.y = this.waterLevel + 0.5
            + Math.sin(time + pos.x * 0.2) * this.params.waveHeight;

        // More dramatic tilting
        this.boat.mesh.rotation.z = Math.sin(time + pos.x * 0.2) * this.params.tiltAmount;
        this.boat.mesh.rotation.x = Math.cos(time + pos.z * 0.2) * this.params.tiltAmount;

        // Animate sail
        if (this.boat.parts.sail) {
            this.boat.parts.sail.rotation.y
                = Math.PI / 2 + Math.sin(time * 0.5) * 0.2;
        }
    }

    getNewTarget() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.safeRadius * 0.8;
        return new BABYLON.Vector3(
            Math.cos(angle) * radius,
            this.waterLevel,
            Math.sin(angle) * radius
        );
    }
}
