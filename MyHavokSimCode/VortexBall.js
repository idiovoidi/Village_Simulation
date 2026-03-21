export class VortexBall {
    constructor(scene) {
        this.scene = scene;
        this.isAttracting = false;
        this.createVortexBall();
        this.setupControls();
    }

    createVortexBall() {
        // Create the vortex sphere
        this.mesh = BABYLON.MeshBuilder.CreateSphere('vortexBall', {
            diameter: 2
        }, this.scene);

        // Create glowing material for the vortex
        this.material = new BABYLON.StandardMaterial('vortexMat', this.scene);
        this.material.emissiveColor = new BABYLON.Color3(0.5, 0, 0.5);
        this.material.alpha = 0.7;
        this.mesh.material = this.material;

        // Add physics to vortex ball
        this.physicsAggregate = new BABYLON.PhysicsAggregate(
            this.mesh,
            BABYLON.PhysicsShapeType.SPHERE,
            { mass: 2, restitution: 0.7, friction: 0.5 },
            this.scene
        );

        // Create glow layer
        const gl = new BABYLON.GlowLayer('glow', this.scene);
        gl.intensity = 0.5;

        this.createParticleSystem();
    }

    createParticleSystem() {
        const particleSystem = new BABYLON.ParticleSystem('vortexParticles', 2000, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture('https://www.babylonjs-playground.com/textures/flare.png');
        particleSystem.emitter = this.mesh;
        particleSystem.minEmitBox = new BABYLON.Vector3(-1, -1, -1);
        particleSystem.maxEmitBox = new BABYLON.Vector3(1, 1, 1);
        particleSystem.color1 = new BABYLON.Color4(0.7, 0.2, 0.7, 1.0);
        particleSystem.color2 = new BABYLON.Color4(0.2, 0.2, 1.0, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 1.5;
        particleSystem.emitRate = 500;
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);
        particleSystem.start();
    }

    setupControls() {
        this.scene.onKeyboardObservable.add(kbInfo => {
            const speed = 10;
            switch (kbInfo.type) {
                case BABYLON.KeyboardEventTypes.KEYDOWN:
                    switch (kbInfo.event.key) {
                        case 'ArrowUp':
                            this.physicsAggregate.body.setLinearVelocity(new BABYLON.Vector3(0, 0, -speed));
                            break;
                        case 'ArrowDown':
                            this.physicsAggregate.body.setLinearVelocity(new BABYLON.Vector3(0, 0, speed));
                            break;
                        case 'ArrowLeft':
                            this.physicsAggregate.body.setLinearVelocity(new BABYLON.Vector3(-speed, 0, 0));
                            break;
                        case 'ArrowRight':
                            this.physicsAggregate.body.setLinearVelocity(new BABYLON.Vector3(speed, 0, 0));
                            break;
                        case ' ': // Spacebar
                            this.isAttracting = !this.isAttracting;
                            this.material.emissiveColor = this.isAttracting
                                ? new BABYLON.Color3(0, 0.5, 0)
                                : new BABYLON.Color3(0.5, 0, 0);
                            break;
                    }
                    break;
            }
        });
    }

    applyVortexForce(boxes) {
        if (!boxes.length) return;

        const vortexPosition = this.mesh.position;
        const force = this.isAttracting ? 500 : -300; // Increased force values
        const maxDistance = 20;

        boxes.forEach(box => {
            if (!box.physicsAggregate || !box.physicsAggregate.body) return;

            const boxPosition = box.position;
            const direction = vortexPosition.subtract(boxPosition);
            const distance = direction.length();

            if (distance < maxDistance && distance > 0.1) {
                const normalizedDir = direction.normalize();
                const strength = Math.pow(1 - distance / maxDistance, 2) * force; // Quadratic falloff
                const forceVector = normalizedDir.scale(strength);

                box.physicsAggregate.body.applyForce(
                    forceVector,
                    box.getAbsolutePosition()
                );
            }
        });
    }
}
