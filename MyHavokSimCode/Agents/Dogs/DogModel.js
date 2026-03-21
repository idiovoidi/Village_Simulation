import { BowlCreator } from '../../BowlCreator.js';

export class DogModel {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.physics = null;
        this.speed = 0.15;
        this.isRunning = false;
        this.targetPosition = null;
    }

    create(position) {
        // Create dog body
        const body = BABYLON.MeshBuilder.CreateBox('dogBody', {
            width: 0.8,
            height: 0.6,
            depth: 1.2
        }, this.scene);
        body.position = position;

        // Create head
        const head = BABYLON.MeshBuilder.CreateBox('dogHead', {
            width: 0.4,
            height: 0.4,
            depth: 0.4
        }, this.scene);
        head.parent = body;
        head.position.z = 0.7;
        head.position.y = 0.2;

        // Create snout
        const snout = BABYLON.MeshBuilder.CreateBox('dogSnout', {
            width: 0.25,
            height: 0.25,
            depth: 0.3
        }, this.scene);
        snout.parent = head;
        snout.position.z = 0.3;
        snout.position.y = -0.05;

        // Create ears
        [-1, 1].forEach(side => {
            const ear = BABYLON.MeshBuilder.CreateBox('dogEar', {
                width: 0.15,
                height: 0.3,
                depth: 0.1
            }, this.scene);
            ear.parent = head;
            ear.position.x = side * 0.2;
            ear.position.y = 0.2;
            ear.rotation.z = side * Math.PI / 6;
        });

        // Create legs
        const legPositions = [
            { x: -0.3, z: 0.4 },  // Front Left
            { x: 0.3, z: 0.4 },   // Front Right
            { x: -0.3, z: -0.4 }, // Back Left
            { x: 0.3, z: -0.4 }   // Back Right
        ];

        this.legs = [];
        legPositions.forEach((pos, index) => {
            const leg = BABYLON.MeshBuilder.CreateBox(`dogLeg${index}`, {
                width: 0.15,
                height: 0.6,
                depth: 0.15
            }, this.scene);
            leg.parent = body;
            leg.position.x = pos.x;
            leg.position.z = pos.z;
            leg.position.y = -0.6;
            this.legs.push(leg);
        });

        // Create tail
        const tail = BABYLON.MeshBuilder.CreateCylinder('dogTail', {
            height: 0.6,
            diameter: 0.1,
            tessellation: 8
        }, this.scene);
        tail.parent = body;
        tail.position.z = -0.6;
        tail.position.y = 0.1;
        tail.rotation.x = Math.PI / 4;
        this.tail = tail;

        // Materials
        const bodyMaterial = new BABYLON.StandardMaterial('dogBodyMat', this.scene);
        const randomColor = Math.random();
        if (randomColor < 0.3) {
            // Brown
            bodyMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2);
        } else if (randomColor < 0.6) {
            // Black
            bodyMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        } else {
            // Golden
            bodyMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.2);
        }

        const darkMaterial = new BABYLON.StandardMaterial('dogDarkMat', this.scene);
        darkMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Apply materials
        body.material = bodyMaterial;
        head.material = bodyMaterial;
        snout.material = darkMaterial;
        tail.material = bodyMaterial;

        // Add physics
        this.physics = new BABYLON.PhysicsAggregate(
            body,
            BABYLON.PhysicsShapeType.BOX,
            { mass: 1, restitution: 0.2, friction: 0.8 },
            this.scene
        );

        this.mesh = body;
        return body;
    }

    getPosition() {
        return this.mesh ? this.mesh.position : null;
    }

    setPosition(position) {
        if (this.mesh) {
            this.mesh.position = position;
        }
    }

    startWalking() {
        if (!this.isRunning) {
            this.isRunning = true;
            // Animate legs while walking
            this.legs.forEach((leg, index) => {
                const phase = (index % 2) * Math.PI;
                const animation = new BABYLON.Animation(
                    `legWalk${index}`,
                    'rotation.x',
                    30,
                    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
                );

                const keys = [];
                for (let frame = 0; frame <= 30; frame++) {
                    const angle = (frame / 30) * Math.PI * 2 + phase;
                    keys.push({
                        frame,
                        value: Math.sin(angle) * 0.3
                    });
                }
                animation.setKeys(keys);
                leg.animations = [animation];
                this.scene.beginAnimation(leg, 0, 30, true);
            });

            // Wag tail while walking
            const tailAnimation = new BABYLON.Animation(
                'tailWag',
                'rotation.z',
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );

            const tailKeys = [];
            tailKeys.push({ frame: 0, value: -Math.PI / 4 });
            tailKeys.push({ frame: 15, value: Math.PI / 4 });
            tailKeys.push({ frame: 30, value: -Math.PI / 4 });
            tailAnimation.setKeys(tailKeys);
            this.tail.animations = [tailAnimation];
            this.scene.beginAnimation(this.tail, 0, 30, true);
        }
    }

    stopWalking() {
        if (this.isRunning) {
            this.isRunning = false;
            // Stop all animations
            this.legs.forEach(leg => {
                this.scene.stopAnimation(leg);
                leg.rotation.x = 0;
            });
            this.scene.stopAnimation(this.tail);
            this.tail.rotation.x = Math.PI / 4;
            this.tail.rotation.z = 0;
        }
    }

    dispose() {
        if (this.physics) {
            this.physics.dispose();
        }
        if (this.mesh) {
            this.mesh.dispose();
        }
    }
}
