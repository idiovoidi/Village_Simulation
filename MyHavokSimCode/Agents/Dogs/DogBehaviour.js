import { DogModel } from './DogModel.js';
import { BowlCreator } from '../../BowlCreator.js';

export class DogBehaviour {
    constructor(scene) {
        this.scene = scene;
        this.dogs = [];
        this.wanderRadius = 30;
        this.centerPoint = new BABYLON.Vector3(0, 0, 0);
    }

    initialize(count = 3) {
        for (let i = 0; i < count; i++) {
            this.createDog();
        }

        // PERFORMANCE FIX: Disabled duplicate render loop
        // Updates are handled by DogBehaviour.update() called from main loop
        // this.scene.onBeforeRenderObservable.add(() => {
        //     this.update();
        // });
    }

    createDog() {
        // Create random position within village area
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.wanderRadius;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = BowlCreator.getTerrainHeight(x, z) + 1;

        const position = new BABYLON.Vector3(x, y, z);
        
        const dog = new DogModel(this.scene);
        dog.create(position);
        
        // Add behavior properties
        dog.wanderAngle = Math.random() * Math.PI * 2;
        dog.wanderRadius = 5 + Math.random() * 10;
        dog.restTimer = 0;
        dog.isResting = false;
        dog.targetPosition = null;
        
        this.dogs.push(dog);
    }

    update() {
        this.dogs.forEach(dog => {
            if (!dog.mesh || !dog.physics) return;

            if (dog.isResting) {
                dog.restTimer -= this.scene.getEngine().getDeltaTime() / 1000;
                if (dog.restTimer <= 0) {
                    dog.isResting = false;
                    this.setNewWanderTarget(dog);
                }
                return;
            }

            if (!dog.targetPosition) {
                this.setNewWanderTarget(dog);
                return;
            }

            // Move towards target using physics
            const currentPos = dog.getPosition();
            const direction = dog.targetPosition.subtract(currentPos);
            const distance = direction.length();

            // If we've reached the target
            if (distance < 0.5) {
                dog.stopWalking();
                dog.isResting = true;
                dog.restTimer = 2 + Math.random() * 3; // Rest for 2-5 seconds
                dog.targetPosition = null;
                // Stop any movement
                dog.physics.body.setLinearVelocity(BABYLON.Vector3.Zero());
                return;
            }

            // Calculate desired velocity
            direction.normalize();
            const targetY = BowlCreator.getTerrainHeight(currentPos.x, currentPos.z) + 1;
            const heightDiff = targetY - currentPos.y;
            
            // Create movement force
            const force = new BABYLON.Vector3(
                direction.x * dog.speed * 40,
                heightDiff * 10, // Vertical force to follow terrain
                direction.z * dog.speed * 40
            );
            
            // Apply force for movement
            dog.physics.body.applyForce(force, currentPos);

            // Keep dog upright
            const rotation = dog.mesh.rotationQuaternion || 
                           BABYLON.Quaternion.FromEulerAngles(dog.mesh.rotation.x, dog.mesh.rotation.y, dog.mesh.rotation.z);
            const upright = BABYLON.Quaternion.Identity();
            BABYLON.Quaternion.SlerpToRef(rotation, upright, 0.1, rotation);
            dog.mesh.rotationQuaternion = rotation;

            // Update rotation to face movement direction
            const velocity = dog.physics.body.getLinearVelocity();
            if (velocity.length() > 0.1) {
                const targetRotation = Math.atan2(velocity.x, velocity.z);
                dog.mesh.rotation.y = targetRotation;
            }

            // Ensure walking animation is playing if moving
            if (velocity.length() > 0.1) {
                dog.startWalking();
            } else {
                dog.stopWalking();
            }
        });
    }

    setNewWanderTarget(dog) {
        const currentPos = dog.getPosition();
        
        // Update wander angle with some randomness
        dog.wanderAngle += (Math.random() - 0.5) * Math.PI / 2;
        
        // Calculate new target position
        const targetX = currentPos.x + Math.cos(dog.wanderAngle) * dog.wanderRadius;
        const targetZ = currentPos.z + Math.sin(dog.wanderAngle) * dog.wanderRadius;
        
        // Keep within bounds
        const distanceFromCenter = Math.sqrt(targetX * targetX + targetZ * targetZ);
        if (distanceFromCenter > this.wanderRadius) {
            // If too far, head back toward center
            dog.wanderAngle = Math.atan2(-currentPos.z, -currentPos.x);
            const newTargetX = currentPos.x + Math.cos(dog.wanderAngle) * dog.wanderRadius;
            const newTargetZ = currentPos.z + Math.sin(dog.wanderAngle) * dog.wanderRadius;
            const targetY = BowlCreator.getTerrainHeight(newTargetX, newTargetZ) + 1;
            dog.targetPosition = new BABYLON.Vector3(newTargetX, targetY, newTargetZ);
        } else {
            // Set new target
            const targetY = BowlCreator.getTerrainHeight(targetX, targetZ) + 1;
            dog.targetPosition = new BABYLON.Vector3(targetX, targetY, targetZ);
        }
    }

    dispose() {
        this.dogs.forEach(dog => {
            if (dog && dog.dispose) {
                dog.dispose();
            }
        });
        this.dogs = [];
    }
} 