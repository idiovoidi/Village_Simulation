import { BowlCreator } from '../../BowlCreator.js';

export class DogModel {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.speed = 0.05;
        this.isRunning = false;
        this.targetPosition = null;
    }

    create(position) {
        // Create dog body
        const body = BABYLON.MeshBuilder.CreateBox("dogBody", {
            width: 0.8,
            height: 0.6,
            depth: 1.2
        }, this.scene);
        body.position = position;

        // Create head
        const head = BABYLON.MeshBuilder.CreateBox("dogHead", {
            width: 0.4,
            height: 0.4,
            depth: 0.4
        }, this.scene);
        head.parent = body;
        head.position.z = 0.7;
        head.position.y = 0.2;

        // Create snout
        const snout = BABYLON.MeshBuilder.CreateBox("dogSnout", {
            width: 0.25,
            height: 0.25,
            depth: 0.3
        }, this.scene);
        snout.parent = head;
        snout.position.z = 0.3;
        snout.position.y = -0.05;

        // Create ears
        [-1, 1].forEach(side => {
            const ear = BABYLON.MeshBuilder.CreateBox("dogEar", {
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

        legPositions.forEach((pos, index) => {
            const leg = BABYLON.MeshBuilder.CreateBox("dogLeg" + index, {
                width: 0.15,
                height: 0.6,
                depth: 0.15
            }, this.scene);
            leg.parent = body;
            leg.position.x = pos.x;
            leg.position.z = pos.z;
            leg.position.y = -0.6;
        });

        // Create tail
        const tail = BABYLON.MeshBuilder.CreateCylinder("dogTail", {
            height: 0.6,
            diameter: 0.1,
            tessellation: 8
        }, this.scene);
        tail.parent = body;
        tail.position.z = -0.6;
        tail.position.y = 0.1;
        tail.rotation.x = Math.PI / 4;

        // Materials
        const bodyMaterial = new BABYLON.StandardMaterial("dogBodyMat", this.scene);
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

        const darkMaterial = new BABYLON.StandardMaterial("dogDarkMat", this.scene);
        darkMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Apply materials
        body.material = bodyMaterial;
        head.material = bodyMaterial;
        snout.material = darkMaterial;
        tail.material = bodyMaterial;
        
        // Create animations
        this.createAnimations(body, tail, legPositions);

        // Add physics
        const bodyAggregate = new BABYLON.PhysicsAggregate(
            body,
            BABYLON.PhysicsShapeType.BOX,
            { mass: 1, restitution: 0.1, friction: 0.9 },
            this.scene
        );

        this.mesh = body;
        return body;
    }

    createAnimations(body, tail, legPositions) {
        // Tail wagging animation
        const tailAnimation = new BABYLON.Animation(
            "tailWag",
            "rotation.z",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const tailKeys = [];
        tailKeys.push({ frame: 0, value: -Math.PI / 4 });
        tailKeys.push({ frame: 15, value: Math.PI / 4 });
        tailKeys.push({ frame: 30, value: -Math.PI / 4 });
        tailAnimation.setKeys(tailKeys);

        tail.animations = [tailAnimation];
        this.scene.beginAnimation(tail, 0, 30, true);

        // Walking animation for legs
        body.getChildMeshes().forEach((mesh, index) => {
            if (mesh.name.startsWith("dogLeg")) {
                const legAnimation = new BABYLON.Animation(
                    "legWalk" + index,
                    "position.y",
                    30,
                    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
                );

                const legKeys = [];
                const baseY = -0.6;
                const phase = (index % 2) * Math.PI; // Alternate legs
                
                for (let frame = 0; frame <= 30; frame++) {
                    const angle = (frame / 30) * Math.PI * 2 + phase;
                    const value = baseY + Math.abs(Math.sin(angle)) * 0.2;
                    legKeys.push({ frame: frame, value: value });
                }

                legAnimation.setKeys(legKeys);
                mesh.animations = [legAnimation];
            }
        });
    }

    startWalking() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.mesh.getChildMeshes().forEach(mesh => {
                if (mesh.name.startsWith("dogLeg")) {
                    this.scene.beginAnimation(mesh, 0, 30, true);
                }
            });
        }
    }

    stopWalking() {
        if (this.isRunning) {
            this.isRunning = false;
            this.mesh.getChildMeshes().forEach(mesh => {
                if (mesh.name.startsWith("dogLeg")) {
                    this.scene.stopAnimation(mesh);
                }
            });
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
        if (this.mesh) {
            this.mesh.dispose();
        }
    }
} 