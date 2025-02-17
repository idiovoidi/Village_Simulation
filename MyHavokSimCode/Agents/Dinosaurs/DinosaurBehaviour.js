import { DinosaurModel } from './DinosaurModel.js';
import { BowlCreator } from '../../BowlCreator.js';

export class DinosaurBehaviour {
    constructor(scene) {
        this.scene = scene;
        this.dinosaurs = [];
        this.wanderRadius = 50; // Larger wander radius than dogs
        this.centerPoint = new BABYLON.Vector3(0, 0, 0);
    }

    initialize(count = 1) { // Default to 1 dinosaur
        for (let i = 0; i < count; i++) {
            this.createDinosaur();
        }

        // Register the update loop
        this.scene.onBeforeRenderObservable.add(() => {
            this.update();
        });
    }

    createDinosaur() {
        // Create random position within village area
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.wanderRadius;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = BowlCreator.getTerrainHeight(x, z) + 2; // Higher off ground

        const position = new BABYLON.Vector3(x, y, z);
        
        const dinosaur = new DinosaurModel(this.scene);
        dinosaur.create(position);
        
        // Add behavior properties
        dinosaur.wanderAngle = Math.random() * Math.PI * 2;
        dinosaur.wanderRadius = 10 + Math.random() * 20; // Larger individual wander radius
        dinosaur.restTimer = 0;
        dinosaur.isResting = false;
        dinosaur.targetPosition = null;
        dinosaur.lastRoarTime = 0;
        dinosaur.roarInterval = 5000 + Math.random() * 5000; // Roar every 5-10 seconds
        
        this.dinosaurs.push(dinosaur);
    }

    update() {
        this.dinosaurs.forEach(dino => {
            if (!dino.mesh || !dino.physics) return;

            const currentTime = performance.now();
            
            // Handle roaring
            if (currentTime - dino.lastRoarTime > dino.roarInterval) {
                this.roar(dino);
                dino.lastRoarTime = currentTime;
            }

            if (dino.isResting) {
                dino.restTimer -= this.scene.getEngine().getDeltaTime() / 1000;
                if (dino.restTimer <= 0) {
                    dino.isResting = false;
                    this.setNewWanderTarget(dino);
                }
                return;
            }

            if (!dino.targetPosition) {
                this.setNewWanderTarget(dino);
                return;
            }

            // Move towards target using physics
            const currentPos = dino.getPosition();
            const direction = dino.targetPosition.subtract(currentPos);
            const distance = direction.length();

            // If we've reached the target
            if (distance < 1.0) { // Larger stopping distance for dinosaur
                dino.stopWalking();
                dino.isResting = true;
                dino.restTimer = 1 + Math.random() * 2; // Rest for 1-3 seconds
                dino.targetPosition = null;
                // Stop any movement
                dino.physics.body.setLinearVelocity(BABYLON.Vector3.Zero());
                return;
            }

            // Calculate desired velocity
            direction.normalize();
            const targetY = BowlCreator.getTerrainHeight(currentPos.x, currentPos.z) + 2;
            const heightDiff = targetY - currentPos.y;
            
            // Create movement force - stronger than dogs due to size
            const force = new BABYLON.Vector3(
                direction.x * dino.speed * 100,
                heightDiff * 20, // Stronger vertical force
                direction.z * dino.speed * 100
            );
            
            // Apply force for movement
            dino.physics.body.applyForce(force, currentPos);

            // Keep dinosaur upright
            const rotation = dino.mesh.rotationQuaternion || 
                           BABYLON.Quaternion.FromEulerAngles(dino.mesh.rotation.x, dino.mesh.rotation.y, dino.mesh.rotation.z);
            const upright = BABYLON.Quaternion.Identity();
            BABYLON.Quaternion.SlerpToRef(rotation, upright, 0.1, rotation);
            dino.mesh.rotationQuaternion = rotation;

            // Update rotation to face movement direction
            const velocity = dino.physics.body.getLinearVelocity();
            if (velocity.length() > 0.1) {
                const targetRotation = Math.atan2(velocity.x, velocity.z);
                dino.mesh.rotation.y = targetRotation;
            }

            // Ensure walking animation is playing if moving
            if (velocity.length() > 0.1) {
                dino.startWalking();
            } else {
                dino.stopWalking();
            }
        });
    }

    roar(dino) {
        // Visual feedback for roar - make the dinosaur's head move
        const roarAnimation = new BABYLON.Animation(
            "dinoRoar",
            "rotation.x",
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE
        );

        const roarKeys = [];
        roarKeys.push({ frame: 0, value: 0 });
        roarKeys.push({ frame: 10, value: -Math.PI / 6 });
        roarKeys.push({ frame: 20, value: 0 });
        roarAnimation.setKeys(roarKeys);

        // Animate the jaw
        const jawAnimation = new BABYLON.Animation(
            "jawRoar",
            "rotation.x",
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE
        );

        const jawKeys = [];
        jawKeys.push({ frame: 0, value: 0 });
        jawKeys.push({ frame: 10, value: Math.PI / 4 });
        jawKeys.push({ frame: 20, value: 0 });
        jawAnimation.setKeys(jawKeys);

        dino.head.animations = [roarAnimation];
        dino.jaw.animations = [jawAnimation];
        
        this.scene.beginAnimation(dino.head, 0, 20, false);
        this.scene.beginAnimation(dino.jaw, 0, 20, false);
    }

    setNewWanderTarget(dino) {
        const currentPos = dino.getPosition();
        
        // Update wander angle with some randomness
        dino.wanderAngle += (Math.random() - 0.5) * Math.PI / 2;
        
        // Calculate new target position
        const targetX = currentPos.x + Math.cos(dino.wanderAngle) * dino.wanderRadius;
        const targetZ = currentPos.z + Math.sin(dino.wanderAngle) * dino.wanderRadius;
        
        // Keep within bounds
        const distanceFromCenter = Math.sqrt(targetX * targetX + targetZ * targetZ);
        if (distanceFromCenter > this.wanderRadius) {
            // If too far, head back toward center
            dino.wanderAngle = Math.atan2(-currentPos.z, -currentPos.x);
            const newTargetX = currentPos.x + Math.cos(dino.wanderAngle) * dino.wanderRadius;
            const newTargetZ = currentPos.z + Math.sin(dino.wanderAngle) * dino.wanderRadius;
            const targetY = BowlCreator.getTerrainHeight(newTargetX, newTargetZ) + 2;
            dino.targetPosition = new BABYLON.Vector3(newTargetX, targetY, newTargetZ);
        } else {
            // Set new target
            const targetY = BowlCreator.getTerrainHeight(targetX, targetZ) + 2;
            dino.targetPosition = new BABYLON.Vector3(targetX, targetY, targetZ);
        }
    }

    dispose() {
        this.dinosaurs.forEach(dino => {
            if (dino && dino.dispose) {
                dino.dispose();
            }
        });
        this.dinosaurs = [];
    }
} 