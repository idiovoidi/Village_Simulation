import { ZombieModel } from './ZombieModel.js';
import { BowlCreator } from '../../BowlCreator.js';

export class ZombieBehaviour {
    constructor(scene) {
        this.scene = scene;
        this.zombies = [];
        this.wanderRadius = 80;
        this.minHeight = -20;
        this.maxHeight = 0;
        this.groupCohesion = 15; // Distance zombies try to maintain in group
        this.maxSpeed = 0.05;  // Slower base speed
        this.minSpeed = 0.02;  // Even slower minimum
        this.lurgeChance = 0.02; // Increased chance to lurch
        this.lurgeDuration = 1.0; // Longer lurge duration
        this.lurgeSpeedMultiplier = 4.0; // More dramatic speed increase
        this.init();
    }

    init() {
        this.createZombies(10);
        this.scene.registerBeforeRender(() => {
            const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
            this.updateZombies(deltaTime);
        });
    }

    createZombies(count) {
        // Create zombies in groups
        const groupCount = Math.ceil(count / 3);
        for (let g = 0; g < groupCount; g++) {
            const groupPos = this.getRandomPosition();
            
            // Create 2-3 zombies per group
            const groupSize = Math.min(count - g * 3, 2 + Math.floor(Math.random() * 2));
            for (let i = 0; i < groupSize; i++) {
                const offset = new BABYLON.Vector3(
                    (Math.random() - 0.5) * 5,
                    0,
                    (Math.random() - 0.5) * 5
                );
                const position = groupPos.add(offset);
                position.y = this.getTerrainHeight(position.x, position.z);

                const zombie = new ZombieModel(this.scene);
                zombie.create(position);

                this.zombies.push({
                    model: zombie,
                    velocity: new BABYLON.Vector3(0, 0, 0),
                    target: position.clone(),
                    speed: this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed),
                    timeSinceLastTarget: 0,
                    groupId: g,
                    isLurging: false,
                    lurgeTimer: 0,
                    swayOffset: Math.random() * Math.PI * 2 // Random sway phase
                });
            }
        }
    }

    updateZombies(deltaTime) {
        this.zombies.forEach(zombie => {
            // Update target periodically or when close to current target
            const distToTarget = BABYLON.Vector3.Distance(
                zombie.model.mesh.position,
                zombie.target
            );

            zombie.timeSinceLastTarget += deltaTime;
            if (distToTarget < 1 || zombie.timeSinceLastTarget > 5 + Math.random() * 2) {
                this.updateZombieTarget(zombie);
                zombie.timeSinceLastTarget = 0;
            }

            // Check for lurge with increased randomness
            if (!zombie.isLurging && Math.random() < this.lurgeChance * 
                (BABYLON.Vector3.Distance(zombie.model.mesh.position, this.scene.activeCamera.position) < 30 ? 2 : 1)) {
                zombie.isLurging = true;
                zombie.lurgeTimer = this.lurgeDuration;
                zombie.speed = this.maxSpeed * this.lurgeSpeedMultiplier;
                zombie.lurgeDirection = zombie.model.mesh.position.subtract(this.scene.activeCamera.position).normalize();
            }

            // Update lurge state with more dramatic deceleration
            if (zombie.isLurging) {
                zombie.lurgeTimer -= deltaTime;
                if (zombie.lurgeTimer <= 0) {
                    zombie.isLurging = false;
                    zombie.speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);
                } else {
                    // Maintain direction during lurge
                    const direction = zombie.lurgeDirection.scale(-1); // Move towards target
                    zombie.model.mesh.position.addInPlace(direction.scale(zombie.speed));
                    zombie.model.mesh.rotation.y = Math.atan2(direction.x, direction.z);
                    zombie.model.animate(deltaTime, 2);
                    return; // Skip normal movement during lurge
                }
            }

            // Calculate movement direction
            const direction = this.calculateZombieDirection(zombie);
            
            if (direction.length() > 0.1) {
                direction.normalize();
                direction.scaleInPlace(zombie.speed);

                // Apply terrain height and move
                const nextPos = zombie.model.mesh.position.add(direction);
                nextPos.y = this.getTerrainHeight(nextPos.x, nextPos.z);
                
                // Smooth height transition
                const currentHeight = zombie.model.mesh.position.y;
                nextPos.y = currentHeight + (nextPos.y - currentHeight) * 0.1;

                // Update position and rotation
                zombie.model.mesh.position = nextPos;
                
                // Shambling rotation - add wobble to the direction
                const wobble = Math.sin(Date.now() * 0.003 + zombie.swayOffset) * 0.3;
                const targetRotation = Math.atan2(direction.x, direction.z) + wobble;
                
                // Smooth rotation
                const currentRotation = zombie.model.mesh.rotation.y;
                zombie.model.mesh.rotation.y = currentRotation + 
                    (targetRotation - currentRotation) * 0.1;
            }

            // Animate zombie with current state
            zombie.model.animate(deltaTime, zombie.isLurging ? 2 : 1);
        });
    }

    calculateZombieDirection(zombie) {
        const direction = new BABYLON.Vector3(0, 0, 0);

        // Add camera-aware behavior
        const toCamera = this.scene.activeCamera.position.subtract(zombie.model.mesh.position);
        const distanceToCamera = toCamera.length();
        
        if (distanceToCamera < 40) { // Increased awareness range
            // More aggressive pursuit of camera
            direction.addInPlace(toCamera.normalize().scale(1.5));
        } else {
            // Normal wandering behavior
            const toTarget = zombie.target.subtract(zombie.model.mesh.position);
            direction.addInPlace(toTarget.normalize());
        }

        // Group behavior becomes more aggressive when near camera
        const groupMates = this.zombies.filter(z => 
            z.groupId === zombie.groupId && z !== zombie
        );
        
        if (groupMates.length > 0) {
            const groupCenter = BABYLON.Vector3.Zero();
            groupMates.forEach(mate => {
                groupCenter.addInPlace(mate.model.mesh.position);
            });
            groupCenter.scaleInPlace(1 / groupMates.length);

            const toGroup = groupCenter.subtract(zombie.model.mesh.position);
            const groupDist = toGroup.length();

            if (groupDist > this.groupCohesion) {
                const groupWeight = distanceToCamera < 40 ? 0.8 : 0.5; // Tighter groups when pursuing
                direction.addInPlace(toGroup.normalize().scale(groupWeight));
            }
        }

        return direction;
    }

    updateZombieTarget(zombie) {
        // Either pick a random position or follow a group mate
        if (Math.random() < 0.3 && this.zombies.length > 1) {
            // Follow random group mate
            const groupMates = this.zombies.filter(z => 
                z.groupId === zombie.groupId && z !== zombie
            );
            if (groupMates.length > 0) {
                const mate = groupMates[Math.floor(Math.random() * groupMates.length)];
                zombie.target = mate.target.clone();
                return;
            }
        }

        // Random position within radius
        zombie.target = this.getRandomPosition();
    }

    getRandomPosition() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.wanderRadius;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = BowlCreator.getTerrainHeight(x, z) + 2; // Add offset to ensure above ground

        return new BABYLON.Vector3(x, y, z);
    }

    getTerrainHeight(x, z) {
        const distFromCenter = Math.sqrt(x * x + z * z);
        const bowlDepth = 25;
        
        // Bowl shape with some variation
        let height = -Math.pow(distFromCenter / this.wanderRadius, 1.2) * bowlDepth;
        height += Math.sin(x/20) * Math.cos(z/20) * 2;
        
        return Math.max(this.minHeight, Math.min(this.maxHeight, height));
    }
} 