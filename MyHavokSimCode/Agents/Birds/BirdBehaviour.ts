import { BirdModel } from './BirdModel.js';
import { BowlCreator } from '../../BowlCreator.js';
import { BirdBehaviourConfig as Config } from './BirdBehaviourConfig.js';

interface Bird {
    model: BirdModel;
    velocity: BABYLON.Vector3;
    target: BABYLON.Vector3;
    speed: number;
}

export class BirdBehaviour {
    private scene: BABYLON.Scene;
    private birds: Bird[] = [];
    private flockCenter: BABYLON.Vector3;
    private readonly flockRadius: number = Config.FLOCK_RADIUS;
    private readonly minHeight: number = Config.MIN_HEIGHT;
    private readonly maxHeight: number = Config.MAX_HEIGHT;
    private readonly neighborhoodRadius: number = Config.NEIGHBORHOOD_RADIUS;

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.flockCenter = new BABYLON.Vector3(0, Config.FLOCK_CENTER_HEIGHT, 0);
    }

    initialize(count: number = 15): void {
        for (let i = 0; i < count; i++) {
            const position = this.getRandomPosition();
            const bird = new BirdModel(this.scene);
            bird.create(position);

            this.birds.push({
                model: bird,
                velocity: this.createInitialVelocity(),
                target: position.clone(),
                speed: Config.BASE_SPEED + Math.random() * Config.SPEED_VARIATION
            });
        }
    }

    update(deltaTime: number): void {
        this.updateBirds(deltaTime);
    }

    private createInitialVelocity(): BABYLON.Vector3 {
        return new BABYLON.Vector3(
            Math.random() - 0.5,
            (Math.random() - 0.5) * Config.VERTICAL_VARIATION_MULTIPLIER,
            Math.random() - 0.5
        ).normalize().scale(Config.BASE_SPEED);
    }

    private updateBirds(deltaTime: number): void {
        if (Math.random() < Config.FLOCK_CENTER_UPDATE_CHANCE) {
            this.updateFlockCenter();
        }

        this.birds.forEach(bird => {
            this.updateBirdPosition(bird, deltaTime);
            this.updateBirdRotation(bird);
            bird.model.animate(deltaTime, bird.velocity.length());
        });
    }

    private updateBirdPosition(bird: Bird, deltaTime: number): void {
        const forces = this.calculateFlockingForces(bird);
        const combinedForce = this.combineForces(forces);

        bird.velocity.addInPlace(combinedForce.scale(deltaTime));
        this.limitSpeed(bird);
        bird.model.mesh.position.addInPlace(bird.velocity);
    }

    private calculateFlockingForces(bird: Bird) {
        return {
            separation: this.getSeparation(bird),
            alignment: this.getAlignment(bird),
            cohesion: this.getCohesion(bird),
            boundary: this.getBoundaryForce(bird)
        };
    }

    private combineForces(forces: {
        separation: BABYLON.Vector3;
        alignment: BABYLON.Vector3;
        cohesion: BABYLON.Vector3;
        boundary: BABYLON.Vector3;
    }): BABYLON.Vector3 {
        const combined = new BABYLON.Vector3(0, 0, 0);

        forces.separation.scaleInPlace(Config.SEPARATION_WEIGHT);
        forces.alignment.scaleInPlace(Config.ALIGNMENT_WEIGHT);
        forces.cohesion.scaleInPlace(Config.COHESION_WEIGHT);
        forces.boundary.scaleInPlace(Config.BOUNDARY_WEIGHT);

        combined.addInPlace(forces.separation);
        combined.addInPlace(forces.alignment);
        combined.addInPlace(forces.cohesion);
        combined.addInPlace(forces.boundary);

        return combined;
    }

    private limitSpeed(bird: Bird): void {
        const speed = bird.velocity.length();
        if (speed > bird.speed) {
            bird.velocity.scaleInPlace(bird.speed / speed);
        }
    }

    private updateBirdRotation(bird: Bird): void {
        if (bird.velocity.length() < Config.MIN_VELOCITY_FOR_ROTATION) return;

        const desiredRotation = Math.atan2(bird.velocity.x, bird.velocity.z);
        bird.model.mesh.rotation.y = desiredRotation;

        const bankAmount = this.calculateBankAmount(bird);
        bird.model.mesh.rotation.z = bankAmount * Config.BANK_AMOUNT;
    }

    private calculateBankAmount(bird: Bird): number {
        const crossProduct = bird.velocity.cross(BABYLON.Vector3.Up()).length();
        return this.clamp(crossProduct * Config.BANK_MULTIPLIER, -1, 1);
    }

    private getSeparation(bird: Bird): BABYLON.Vector3 {
        return this.calculateNeighborForce(
            bird,
            this.neighborhoodRadius * Config.SEPARATION_DISTANCE_MULTIPLIER,
            (distance, other) => bird.model.mesh.position
                .subtract(other.model.mesh.position)
                .normalize()
                .scale(1 / Math.max(distance, Config.MIN_DISTANCE_DIVISOR))
        );
    }

    private getAlignment(bird: Bird): BABYLON.Vector3 {
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

    private getCohesion(bird: Bird): BABYLON.Vector3 {
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

    private calculateNeighborForce(
        bird: Bird,
        radius: number,
        forceCalculator: (distance: number, other: Bird) => BABYLON.Vector3
    ): BABYLON.Vector3 {
        const force = new BABYLON.Vector3(0, 0, 0);
        let count = 0;

        this.birds.forEach(other => {
            if (other === bird) return;

            const distance = BABYLON.Vector3.Distance(
                bird.model.mesh.position,
                other.model.mesh.position
            );

            if (distance < radius) {
                force.addInPlace(forceCalculator(distance, other));
                count++;
            }
        });

        if (count > 0) {
            force.scaleInPlace(1 / count);
        }
        return force;
    }

    private getBoundaryForce(bird: Bird): BABYLON.Vector3 {
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

    private updateFlockCenter(): void {
        const angle = Math.random() * Math.PI * 2;
        this.flockCenter = new BABYLON.Vector3(
            Math.cos(angle) * Config.FLOCK_CENTER_RADIUS,
            Config.FLOCK_CENTER_HEIGHT + Math.random() * Config.FLOCK_CENTER_HEIGHT_VARIATION,
            Math.sin(angle) * Config.FLOCK_CENTER_RADIUS
        );
    }

    private getRandomPosition(): BABYLON.Vector3 {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.flockRadius;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const baseHeight = BowlCreator.getTerrainHeight(x, z);
        const y = baseHeight + Config.SPAWN_HEIGHT_ABOVE_TERRAIN
                  + Math.random() * Config.SPAWN_HEIGHT_VARIATION;

        return new BABYLON.Vector3(x, y, z);
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }
}
