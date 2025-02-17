import { BowlCreator } from '../../BowlCreator.js';
import { WorldClock } from '../../UI/WorldClock.js';
import { DayNightCycle } from '../../Environment/DayNightCycle.js';
import { VillagerModel } from './VillagerModel.js';
import { VillagerAgent } from './VillagerAgent.js';

export class VillagerBehaviour {
    constructor(scene) {
        this.scene = scene;
        this.villagers = [];
        this.timeScale = 1200; // 1 real second = 20 game minutes
        this.gameTime = 8 * 60; // Start at 8:00 AM
        this.villagerModel = new VillagerModel(scene);
        this.villagerAgent = new VillagerAgent(scene);
        
        // Initialize time-related systems
        this.worldClock = new WorldClock(this.scene);
        this.dayNightCycle = new DayNightCycle(this.scene);
        
        // Define states
        this.STATES = {
            IDLE: 'idle',
            MOVING: 'moving',
            WANDERING: 'wandering'
        };
        
        // Initialize update loop
        this.scene.onBeforeRenderObservable.add(() => {
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            this.updateVillagers(deltaTime);
        });
    }

    initialize(count = 10) {
        // Create villagers in a circle around the center
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 20 + Math.random() * 10;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = BowlCreator.getTerrainHeight(x, z) + 2;

            const villager = this.villagerModel.createVillager(new BABYLON.Vector3(x, y, z));
            this.addVillager(villager);
        }
    }

    addVillager(villager) {
        if (!villager.mesh || !villager.mesh.physicsImpostor) {
            console.warn('Villager added without proper physics setup');
            return null;
        }

        villager.id = this.villagers.length;
        villager.state = this.STATES.IDLE;
        villager.speed = 0.05;
        villager.destination = null;
        
        // Add movement update observer
        this.addMovementObserver(villager);
        
        this.villagers.push(villager);
        this.startWandering(villager);
        
        return villager;
    }

    addMovementObserver(villager) {
        // Add walking animation and position correction
        let walkTime = 0;
        villager.updateObserver = this.scene.onBeforeRenderObservable.add(() => {
            if (!villager.mesh || !villager.mesh.physicsImpostor) return;

            // Force upright orientation
            const uprightQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
                villager.mesh.rotation.y,
                0,
                0
            );
            villager.mesh.rotationQuaternion = uprightQuaternion;

            // Ensure proper ground contact
            const groundHeight = BowlCreator.getTerrainHeight(villager.mesh.position.x, villager.mesh.position.z);
            if (groundHeight !== null) {
                const targetHeight = groundHeight + 0.9;
                
                // Add walking bounce when moving
                if (villager.state === this.STATES.MOVING) {
                    walkTime += this.scene.getEngine().getDeltaTime() * 0.001;
                    const bounce = Math.sin(walkTime * 10) * 0.1;
                    villager.mesh.position.y = targetHeight + bounce;
                } else {
                    villager.mesh.position.y = targetHeight;
                }

                // Zero out vertical velocity
                const velocity = villager.mesh.physicsImpostor.getLinearVelocity();
                villager.mesh.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(velocity.x, 0, velocity.z));
            }
        });
    }

    startWandering(villager) {
        if (villager.state !== this.STATES.MOVING) {
            // Set a random destination within a reasonable radius
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 20;
            const x = villager.mesh.position.x + Math.cos(angle) * radius;
            const z = villager.mesh.position.z + Math.sin(angle) * radius;
            const y = BowlCreator.getTerrainHeight(x, z);
            
            villager.destination = new BABYLON.Vector3(x, y, z);
            villager.state = this.STATES.MOVING;
        }
    }

    updateVillagers(deltaTime) {
        this.villagers.forEach(villager => {
            this.updateVillagerMovement(villager, deltaTime);
            
            // Update game time
            this.gameTime += deltaTime * this.timeScale / 60;
            if (this.gameTime >= 24 * 60) {
                this.gameTime = 0;
            }
        });

        // Update UI and environment
        this.worldClock.updateTime(this.gameTime);
        this.dayNightCycle.update(this.gameTime);
    }

    updateVillagerMovement(villager, deltaTime) {
        if (!villager.mesh || !villager.mesh.physicsImpostor) return;

        if (villager.state === this.STATES.MOVING) {
            if (!villager.destination) {
                villager.state = this.STATES.IDLE;
                setTimeout(() => this.startWandering(villager), 2000 + Math.random() * 3000);
                return;
            }

            const direction = villager.destination.subtract(villager.mesh.position);
            const distance = direction.length();

            if (distance < 0.1) {
                villager.destination = null;
                villager.state = this.STATES.IDLE;
                setTimeout(() => this.startWandering(villager), 2000 + Math.random() * 3000);
                return;
            }

            direction.normalize();
            const moveStep = direction.scale(villager.speed * deltaTime * 60);
            const newPosition = villager.mesh.position.add(moveStep);

            const groundHeight = BowlCreator.getTerrainHeight(newPosition.x, newPosition.z);
            if (groundHeight !== null) {
                newPosition.y = groundHeight + 0.9;
                villager.mesh.position = newPosition;

                // Update rotation to face movement direction
                const targetRotation = Math.atan2(direction.x, direction.z);
                const currentRotation = villager.mesh.rotation.y;
                const rotationDiff = BABYLON.Scalar.WrapAngle(targetRotation - currentRotation);
                villager.mesh.rotation.y += rotationDiff * 0.1;

                // Update physics velocity for movement
                villager.mesh.physicsImpostor.setLinearVelocity(moveStep.scale(1/deltaTime));
                villager.mesh.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
            }
        } else {
            // When not moving, ensure no velocity
            villager.mesh.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
            villager.mesh.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
        }
    }

    dispose() {
        this.worldClock.dispose();
        this.dayNightCycle.dispose();
        this.villagers.forEach(villager => {
            if (villager.updateObserver) {
                this.scene.onBeforeRenderObservable.remove(villager.updateObserver);
            }
        });
        this.villagers = [];
        this.villagerModel.dispose();
    }
} 