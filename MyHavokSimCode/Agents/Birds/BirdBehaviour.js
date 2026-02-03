import { BirdModel } from './BirdModel.js';
import { BowlCreator } from '../../BowlCreator.js';

export class BirdBehaviour {
    constructor(scene) {
        this.scene = scene;
        this.birds = [];
        this.flockCenter = new BABYLON.Vector3(0, 30, 0); // Center point high in the sky
        this.flockRadius = 40;
        this.minHeight = 20;
        this.maxHeight = 40;
        this.neighborhoodRadius = 15;
    }

    initialize(count = 15) {
        for (let i = 0; i < count; i++) {
            const position = this.getRandomPosition();
            const bird = new BirdModel(this.scene);
            bird.create(position);

            this.birds.push({
                model: bird,
                velocity: new BABYLON.Vector3(
                    Math.random() - 0.5,
                    (Math.random() - 0.5) * 0.5, // Less vertical variation
                    Math.random() - 0.5
                ).normalize().scale(0.2),
                target: position.clone(),
                speed: 0.2 + Math.random() * 0.1
            });
        }

        // PERFORMANCE FIX: Disabled duplicate render loop
        // Updates are handled by BirdBehaviour.update() called from main loop
        // this.scene.registerBeforeRender(() => {
        //     const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
        //     this.updateBirds(deltaTime);
        // });
    }

    /**
     * Update method called by main loop
     * Wrapper for updateBirds to maintain consistent API
     */
    update(deltaTime) {
        this.updateBirds(deltaTime);
    }

    updateBirds(deltaTime) {
        // Occasionally update flock center
        if (Math.random() < 0.001) {
            this.updateFlockCenter();
        }

        this.birds.forEach(bird => {
            // Calculate flocking forces
            const separation = this.getSeparation(bird);
            const alignment = this.getAlignment(bird);
            const cohesion = this.getCohesion(bird);
            const boundaryForce = this.getBoundaryForce(bird);

            // Combine forces
            const direction = new BABYLON.Vector3(0, 0, 0);
            separation.scaleInPlace(0.4);  // Strong separation
            alignment.scaleInPlace(0.3);   // Moderate alignment
            cohesion.scaleInPlace(0.2);    // Gentle cohesion
            boundaryForce.scaleInPlace(0.5); // Strong boundary force

            direction.addInPlace(separation);
            direction.addInPlace(alignment);
            direction.addInPlace(cohesion);
            direction.addInPlace(boundaryForce);

            // Update velocity
            bird.velocity.addInPlace(direction.scale(deltaTime));
            
            // Maintain speed limits
            const speed = bird.velocity.length();
            if (speed > bird.speed) {
                bird.velocity.scaleInPlace(bird.speed / speed);
            }

            // Update position
            bird.model.mesh.position.addInPlace(bird.velocity);

            // Update rotation to face direction of movement
            if (bird.velocity.length() > 0.01) {
                const desiredRotation = Math.atan2(bird.velocity.x, bird.velocity.z);
                bird.model.mesh.rotation.y = desiredRotation;
                
                // Bank the bird based on turning
                const bankAmount = this.clamp(
                    bird.velocity.cross(new BABYLON.Vector3(0, 1, 0)).length() * 2,
                    -1,
                    1
                );
                bird.model.mesh.rotation.z = bankAmount * 0.3;
            }

            // Animate bird model
            bird.model.animate(deltaTime, bird.velocity.length());
        });
    }

    getSeparation(bird) {
        const separation = new BABYLON.Vector3(0, 0, 0);
        let count = 0;

        this.birds.forEach(other => {
            if (other === bird) return;

            const distance = BABYLON.Vector3.Distance(
                bird.model.mesh.position,
                other.model.mesh.position
            );

            if (distance < this.neighborhoodRadius * 0.5) {
                const away = bird.model.mesh.position
                    .subtract(other.model.mesh.position)
                    .normalize()
                    .scale(1 / Math.max(distance, 0.1));
                separation.addInPlace(away);
                count++;
            }
        });

        if (count > 0) {
            separation.scaleInPlace(1 / count);
        }
        return separation;
    }

    getAlignment(bird) {
        const alignment = new BABYLON.Vector3(0, 0, 0);
        let count = 0;

        this.birds.forEach(other => {
            if (other === bird) return;

            const distance = BABYLON.Vector3.Distance(
                bird.model.mesh.position,
                other.model.mesh.position
            );

            if (distance < this.neighborhoodRadius) {
                alignment.addInPlace(other.velocity);
                count++;
            }
        });

        if (count > 0) {
            alignment.scaleInPlace(1 / count);
            alignment.normalize();
        }
        return alignment;
    }

    getCohesion(bird) {
        const center = new BABYLON.Vector3(0, 0, 0);
        let count = 0;

        this.birds.forEach(other => {
            if (other === bird) return;

            const distance = BABYLON.Vector3.Distance(
                bird.model.mesh.position,
                other.model.mesh.position
            );

            if (distance < this.neighborhoodRadius) {
                center.addInPlace(other.model.mesh.position);
                count++;
            }
        });

        if (count > 0) {
            center.scaleInPlace(1 / count);
            return center.subtract(bird.model.mesh.position).normalize();
        }
        return center;
    }

    getBoundaryForce(bird) {
        const force = new BABYLON.Vector3(0, 0, 0);
        const pos = bird.model.mesh.position;

        // Keep within height limits
        if (pos.y < this.minHeight) {
            force.y += 1;
        } else if (pos.y > this.maxHeight) {
            force.y -= 1;
        }

        // Keep within radius of flock center
        const toCenter = this.flockCenter.subtract(pos);
        const distance = toCenter.length();
        if (distance > this.flockRadius) {
            force.addInPlace(toCenter.normalize());
        }

        return force;
    }

    updateFlockCenter() {
        const angle = Math.random() * Math.PI * 2;
        const radius = 20;
        this.flockCenter = new BABYLON.Vector3(
            Math.cos(angle) * radius,
            30 + Math.random() * 10,
            Math.sin(angle) * radius
        );
    }

    getRandomPosition() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.flockRadius;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const baseHeight = BowlCreator.getTerrainHeight(x, z);
        const y = baseHeight + 20 + Math.random() * 20; // Birds fly high above terrain

        return new BABYLON.Vector3(x, y, z);
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}
