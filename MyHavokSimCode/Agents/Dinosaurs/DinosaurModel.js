import { BowlCreator } from '../../BowlCreator.js';

export class DinosaurModel {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.physics = null;
        this.speed = 0.2; // Faster than dogs
        this.isRunning = false;
        this.targetPosition = null;
        this.scale = 3; // Much larger than other agents
    }

    create(position) {
        // Create main body
        const body = BABYLON.MeshBuilder.CreateBox("dinoBody", {
            width: 1.2 * this.scale,
            height: 1.5 * this.scale,
            depth: 2.5 * this.scale
        }, this.scene);
        body.position = position;

        // Create head
        const head = BABYLON.MeshBuilder.CreateBox("dinoHead", {
            width: 0.8 * this.scale,
            height: 0.8 * this.scale,
            depth: 1.2 * this.scale
        }, this.scene);
        head.parent = body;
        head.position.z = 1.5 * this.scale;
        head.position.y = 0.4 * this.scale;
        this.head = head;

        // Create jaw (lower part of head)
        const jaw = BABYLON.MeshBuilder.CreateBox("dinoJaw", {
            width: 0.7 * this.scale,
            height: 0.4 * this.scale,
            depth: 1.0 * this.scale
        }, this.scene);
        jaw.parent = head;
        jaw.position.y = -0.4 * this.scale;
        jaw.position.z = -0.1 * this.scale;
        this.jaw = jaw;

        // Create legs
        const legPositions = [
            { x: -0.4, z: 0.6 },  // Front Left
            { x: 0.4, z: 0.6 },   // Front Right
            { x: -0.4, z: -0.8 }, // Back Left
            { x: 0.4, z: -0.8 }   // Back Right
        ];

        this.legs = [];
        legPositions.forEach((pos, index) => {
            const leg = BABYLON.MeshBuilder.CreateBox("dinoLeg" + index, {
                width: 0.3 * this.scale,
                height: 1.2 * this.scale,
                depth: 0.3 * this.scale
            }, this.scene);
            leg.parent = body;
            leg.position.x = pos.x * this.scale;
            leg.position.z = pos.z * this.scale;
            leg.position.y = -1.35 * this.scale;
            this.legs.push(leg);
        });

        // Create tail
        const tail = BABYLON.MeshBuilder.CreateBox("dinoTail", {
            width: 0.5 * this.scale,
            height: 0.5 * this.scale,
            depth: 2.0 * this.scale
        }, this.scene);
        tail.parent = body;
        tail.position.z = -2.0 * this.scale;
        tail.position.y = 0;
        this.tail = tail;

        // Materials
        const bodyMaterial = new BABYLON.StandardMaterial("dinoBodyMat", this.scene);
        bodyMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.2); // Green color
        
        const darkMaterial = new BABYLON.StandardMaterial("dinoDarkMat", this.scene);
        darkMaterial.diffuseColor = new BABYLON.Color3(0.15, 0.4, 0.15); // Darker green

        // Apply materials
        body.material = bodyMaterial;
        head.material = bodyMaterial;
        jaw.material = darkMaterial;
        tail.material = bodyMaterial;
        this.legs.forEach(leg => leg.material = darkMaterial);

        // Add physics
        this.physics = new BABYLON.PhysicsAggregate(
            body,
            BABYLON.PhysicsShapeType.BOX,
            { mass: 5, restitution: 0.2, friction: 0.8 },
            this.scene
        );

        this.mesh = body;
        return body;
    }

    startWalking() {
        if (!this.isRunning) {
            this.isRunning = true;
            
            // Animate legs
            this.legs.forEach((leg, index) => {
                const phase = (index % 2) * Math.PI;
                const animation = new BABYLON.Animation(
                    "dinoLegWalk" + index,
                    "rotation.x",
                    30,
                    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
                );

                const keys = [];
                for (let frame = 0; frame <= 30; frame++) {
                    const angle = (frame / 30) * Math.PI * 2 + phase;
                    keys.push({
                        frame: frame,
                        value: Math.sin(angle) * 0.4 // Larger leg movement
                    });
                }
                animation.setKeys(keys);
                leg.animations = [animation];
                this.scene.beginAnimation(leg, 0, 30, true);
            });

            // Tail swaying animation
            const tailAnimation = new BABYLON.Animation(
                "dinoTailSway",
                "rotation.y",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );

            const tailKeys = [];
            tailKeys.push({ frame: 0, value: -Math.PI / 8 });
            tailKeys.push({ frame: 15, value: Math.PI / 8 });
            tailKeys.push({ frame: 30, value: -Math.PI / 8 });
            tailAnimation.setKeys(tailKeys);
            this.tail.animations = [tailAnimation];
            this.scene.beginAnimation(this.tail, 0, 30, true);

            // Head bobbing animation
            const headAnimation = new BABYLON.Animation(
                "dinoHeadBob",
                "rotation.x",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );

            const headKeys = [];
            headKeys.push({ frame: 0, value: -0.1 });
            headKeys.push({ frame: 15, value: 0.1 });
            headKeys.push({ frame: 30, value: -0.1 });
            headAnimation.setKeys(headKeys);
            this.head.animations = [headAnimation];
            this.scene.beginAnimation(this.head, 0, 30, true);
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
            this.tail.rotation.y = 0;
            this.scene.stopAnimation(this.head);
            this.head.rotation.x = 0;
        }
    }

    getPosition() {
        return this.mesh ? this.mesh.position : null;
    }

    setPosition(position) {
        if (this.mesh) {
            this.mesh.position = position;
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