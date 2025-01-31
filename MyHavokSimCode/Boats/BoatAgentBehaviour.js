export class BoatAgentBehaviour {
    constructor(boat, waterLevel, safeRadius) {
        this.boat = boat;
        this.waterLevel = waterLevel;
        this.safeRadius = 40;  // Reduced safe radius
        this.currentSpeed = 0;
        
        // Simplified parameters
        this.params = {
            speed: 0.02,           // Constant, slower speed
            turnSpeed: 0.005,      // Slower turning
            waveHeight: 0.08,      // Reduced wave effect
            tiltAmount: 0.03,      // Reduced tilting
            minDistToOthers: 8     // Collision avoidance distance
        };
    }

    update(deltaTime, otherBoats) {
        // Get steering direction
        const steering = this.getSteeringDirection(otherBoats);
        
        // Apply movement
        this.moveBoat(steering, deltaTime);
        
        // Update boat visuals
        this.updateBoatVisuals(deltaTime);
    }

    getSteeringDirection(otherBoats) {
        let direction = new BABYLON.Vector3(0, 0, 0);
        const pos = this.boat.mesh.position;

        // Check if too far from center
        const distFromCenter = new BABYLON.Vector3(pos.x, 0, pos.z).length();
        if (distFromCenter > this.safeRadius) {
            // Steer back towards center
            direction = new BABYLON.Vector3(-pos.x, 0, -pos.z).normalize();
        } else {
            // Normal wandering behavior
            if (!this.boat.targetPoint || 
                BABYLON.Vector3.Distance(pos, this.boat.targetPoint) < 5) {
                this.boat.targetPoint = this.getNewTarget();
            }
            direction = this.boat.targetPoint.subtract(pos).normalize();
        }

        // Avoid other boats
        otherBoats.forEach(other => {
            if (other.mesh !== this.boat.mesh) {
                const dist = BABYLON.Vector3.Distance(pos, other.mesh.position);
                if (dist < this.params.minDistToOthers) {
                    const avoidDir = pos.subtract(other.mesh.position).normalize();
                    direction.addInPlace(avoidDir.scale(1.5));
                }
            }
        });

        return direction.normalize();
    }

    moveBoat(direction, deltaTime) {
        // Calculate target angle
        const targetAngle = Math.atan2(direction.x, direction.z);
        let currentAngle = this.boat.mesh.rotation.y;

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

    updateBoatVisuals(deltaTime) {
        const pos = this.boat.mesh.position;
        const time = performance.now() * 0.001;

        // Simple wave motion
        this.boat.mesh.position.y = this.waterLevel + 0.5 + 
            Math.sin(time + pos.x * 0.1) * this.params.waveHeight;

        // Simple tilting
        this.boat.mesh.rotation.z = Math.sin(time + pos.x * 0.1) * this.params.tiltAmount;
        this.boat.mesh.rotation.x = Math.cos(time + pos.z * 0.1) * this.params.tiltAmount;

        // Update sail
        this.boat.parts.sail.rotation.y = 
            Math.sin(this.boat.mesh.rotation.y + time * 0.5) * 0.3;
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