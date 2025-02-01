export class MoonSystem {
    constructor(scene) {
        this.scene = scene;
        this.moon = null;
        this.height = 120;
        this.radius = 15;
        this.init();
    }

    init() {
        // Create main moon sphere
        this.moon = BABYLON.MeshBuilder.CreateSphere("moon", {
            diameter: this.radius * 2,
            segments: 32
        }, this.scene);

        // Position moon in sky
        this.moon.position = new BABYLON.Vector3(
            this.radius * 2,
            this.height,
            -this.radius * 2
        );

        // Create glowing material for moon
        const moonMaterial = new BABYLON.StandardMaterial("moonMat", this.scene);
        moonMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.7);
        moonMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.8);
        moonMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        this.moon.material = moonMaterial;

        // Add glow effect
        const gl = new BABYLON.GlowLayer("moonGlow", this.scene);
        gl.intensity = 0.5;

        // Create face features
        this.createFaceFeatures();

        // Start update loop
        this.scene.registerBeforeRender(() => this.update());
    }

    createFaceFeatures() {
        // Create evil eyes
        const eyeMaterial = new BABYLON.StandardMaterial("eyeMat", this.scene);
        eyeMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
        eyeMaterial.diffuseColor = new BABYLON.Color3(0.2, 0, 0);

        const leftEye = BABYLON.MeshBuilder.CreateSphere("leftEye", {
            diameter: this.radius * 0.2,
            segments: 16
        }, this.scene);
        leftEye.parent = this.moon;
        leftEye.position = new BABYLON.Vector3(-this.radius * 0.3, this.radius * 0.2, -this.radius);
        leftEye.material = eyeMaterial;

        const rightEye = BABYLON.MeshBuilder.CreateSphere("rightEye", {
            diameter: this.radius * 0.2,
            segments: 16
        }, this.scene);
        rightEye.parent = this.moon;
        rightEye.position = new BABYLON.Vector3(this.radius * 0.3, this.radius * 0.2, -this.radius);
        rightEye.material = eyeMaterial;

        // Create sinister mouth
        const points = [];
        const mouthWidth = this.radius * 0.8;
        const segments = 20;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = (t - 0.5) * mouthWidth;
            const y = Math.sin(t * Math.PI) * -this.radius * 0.2;
            points.push(new BABYLON.Vector3(x, y - this.radius * 0.2, -this.radius));
        }

        const mouth = BABYLON.MeshBuilder.CreateLines("mouth", {
            points: points,
            updatable: true
        }, this.scene);
        mouth.parent = this.moon;
        mouth.color = new BABYLON.Color3(0.2, 0, 0);
    }

    update() {
        // Slowly rotate to face scene
        this.moon.rotation.y += 0.0001;

        // Make eyes glow periodically
        const time = performance.now() * 0.001;
        const intensity = 0.5 + Math.sin(time) * 0.2;
        this.moon.getChildMeshes().forEach(mesh => {
            if (mesh.name.includes("Eye")) {
                mesh.material.emissiveColor = new BABYLON.Color3(intensity, 0, 0);
            }
        });
    }
} 