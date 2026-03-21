import { FishModel } from './FishModel.js';

interface Fish {
    model: FishModel;
    velocity: BABYLON.Vector3;
    target: BABYLON.Vector3;
    speed: number;
    timeSinceLastTarget: number;
}

export class FishBehaviour {
    private scene: BABYLON.Scene;
    private waterMesh: BABYLON.Mesh;
    private fishes: Fish[] = [];
    private schoolCenter: BABYLON.Vector3;
    private schoolRadius: number = 30;
    private minDepth: number = -15;
    private maxDepth: number = -2;

    constructor(scene: BABYLON.Scene, waterMesh: BABYLON.Mesh) {
        this.scene = scene;
        this.waterMesh = waterMesh;
        this.schoolCenter = new BABYLON.Vector3(0, -5, 0);
    }

    initialize(count: number = 20): void {
        for (let i = 0; i < count; i++) {
            const position = this.getRandomPosition();
            const fish = new FishModel(this.scene);
            fish.create(position);

            this.fishes.push({
                model: fish,
                velocity: new BABYLON.Vector3(0, 0, 0),
                target: position.clone(),
                speed: 0.05 + Math.random() * 0.05,
                timeSinceLastTarget: 0
            });
        }

        // PERFORMANCE FIX: Disabled duplicate render loop
        // Updates are handled by FishBehaviour.update() called from main loop
        // this.scene.registerBeforeRender(() => {
        //     const deltaTime = this.scene.getEngine().getDeltaTime() * 0.001;
        //     this.updateFishes(deltaTime);
        // });
    }

    updateFishes(deltaTime: number): void {
        // Update school center occasionally
        if (Math.random() < 0.001) {
            this.updateSchoolCenter();
        }

        this.fishes.forEach(fish => {
            // Update target periodically
            fish.timeSinceLastTarget += deltaTime;
            if (fish.timeSinceLastTarget > 3 + Math.random() * 2) {
                fish.target = this.getNewTarget(fish);
                fish.timeSinceLastTarget = 0;
            }

            // Calculate steering
            const direction = fish.target.subtract(fish.model.mesh.position);
            direction.normalize();

            // Apply flocking behavior
            const separation = this.getSeparation(fish);
            const alignment = this.getAlignment(fish);
            const cohesion = this.getCohesion(fish);

            // Combine forces
            direction.scaleInPlace(0.5);
            separation.scaleInPlace(0.3);
            alignment.scaleInPlace(0.1);
            cohesion.scaleInPlace(0.1);

            // Update velocity
            fish.velocity.addInPlace(direction);
            fish.velocity.addInPlace(separation);
            fish.velocity.addInPlace(alignment);
            fish.velocity.addInPlace(cohesion);
            fish.velocity.normalize().scaleInPlace(fish.speed);

            // Update position
            fish.model.mesh.position.addInPlace(fish.velocity);

            // Update rotation to face movement direction
            const targetRotation = Math.atan2(fish.velocity.z, fish.velocity.x) - Math.PI / 2;
            fish.model.mesh.rotation.y = targetRotation;

            // Animate fish model
            fish.model.animate(deltaTime);
        });
    }

    private getNewTarget(_fish: Fish): BABYLON.Vector3 {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.schoolRadius;
        const height = this.minDepth + Math.random() * (this.maxDepth - this.minDepth);

        return new BABYLON.Vector3(
            this.schoolCenter.x + Math.cos(angle) * radius,
            height,
            this.schoolCenter.z + Math.sin(angle) * radius
        );
    }

    private updateSchoolCenter(): void {
        const angle = Math.random() * Math.PI * 2;
        const radius = 20;
        this.schoolCenter = new BABYLON.Vector3(
            Math.cos(angle) * radius,
            -5,
            Math.sin(angle) * radius
        );
    }

    private getRandomPosition(): BABYLON.Vector3 {
        return this.getNewTarget({
            model: { mesh: { position: BABYLON.Vector3.Zero() } } as FishModel,
            velocity: BABYLON.Vector3.Zero(),
            target: BABYLON.Vector3.Zero(),
            speed: 0,
            timeSinceLastTarget: 0
        });
    }

    private getSeparation(fish: Fish): BABYLON.Vector3 {
        const separation = new BABYLON.Vector3(0, 0, 0);
        let count = 0;

        this.fishes.forEach(other => {
            if (other === fish) return;

            const distance = BABYLON.Vector3.Distance(
                fish.model.mesh.position,
                other.model.mesh.position
            );

            if (distance < 3) {
                const away = fish.model.mesh.position
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

    private getAlignment(fish: Fish): BABYLON.Vector3 {
        const alignment = new BABYLON.Vector3(0, 0, 0);
        let count = 0;

        this.fishes.forEach(other => {
            if (other === fish) return;

            const distance = BABYLON.Vector3.Distance(
                fish.model.mesh.position,
                other.model.mesh.position
            );

            if (distance < 5) {
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

    private getCohesion(fish: Fish): BABYLON.Vector3 {
        const center = new BABYLON.Vector3(0, 0, 0);
        let count = 0;

        this.fishes.forEach(other => {
            if (other === fish) return;

            const distance = BABYLON.Vector3.Distance(
                fish.model.mesh.position,
                other.model.mesh.position
            );

            if (distance < 10) {
                center.addInPlace(other.model.mesh.position);
                count++;
            }
        });

        if (count > 0) {
            center.scaleInPlace(1 / count);
            return center.subtract(fish.model.mesh.position).normalize();
        }
        return center;
    }
}
