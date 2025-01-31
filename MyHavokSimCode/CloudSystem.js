export class CloudSystem {
    constructor(scene) {
        this.scene = scene;
        this.clouds = [];
        this.cloudCount = 15;
        this.minHeight = 50;
        this.maxHeight = 70;
        this.boundaryRadius = 150;
        this.init();
    }

    init() {
        this.createClouds();
        this.scene.registerBeforeRender(() => this.updateClouds());
    }

    createClouds() {
        for (let i = 0; i < this.cloudCount; i++) {
            const cloud = this.createCloudMesh();
            
            // Random starting position
            cloud.position = this.getRandomPosition();
            
            // Random scale for variety
            const scale = 0.8 + Math.random() * 0.4;
            cloud.scaling = new BABYLON.Vector3(scale, scale * 0.6, scale);
            
            // Random rotation
            cloud.rotation.y = Math.random() * Math.PI * 2;

            // Add movement properties
            this.clouds.push({
                mesh: cloud,
                speed: 0.02 + Math.random() * 0.02,
                direction: new BABYLON.Vector3(
                    Math.random() - 0.5,
                    0,
                    Math.random() - 0.5
                ).normalize()
            });
        }
    }

    createCloudMesh() {
        // Create cloud from multiple spheres
        const cloud = new BABYLON.TransformNode("cloud", this.scene);
        const segments = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < segments; i++) {
            const sphere = BABYLON.MeshBuilder.CreateSphere(`cloudPart${i}`, {
                diameter: 10 + Math.random() * 5,
                segments: 8
            }, this.scene);

            // Position each sphere slightly offset
            sphere.position.x = i * 5 - (segments * 2.5);
            sphere.position.y = Math.random() * 2;
            sphere.position.z = Math.random() * 4 - 2;

            // Scale spheres randomly
            const scaleY = 0.6 + Math.random() * 0.2;
            sphere.scaling = new BABYLON.Vector3(1, scaleY, 1);

            // Parent to cloud
            sphere.parent = cloud;

            // Create cloud material
            const cloudMaterial = new BABYLON.StandardMaterial("cloudMat", this.scene);
            cloudMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
            cloudMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
            cloudMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            cloudMaterial.alpha = 0.8;
            sphere.material = cloudMaterial;
        }

        return cloud;
    }

    getRandomPosition() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.boundaryRadius;
        const height = this.minHeight + Math.random() * (this.maxHeight - this.minHeight);

        return new BABYLON.Vector3(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
    }

    updateClouds() {
        this.clouds.forEach(cloud => {
            // Move cloud
            cloud.mesh.position.addInPlace(cloud.direction.scale(cloud.speed));

            // Check boundaries and wrap around if needed
            const pos = cloud.mesh.position;
            const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

            if (dist > this.boundaryRadius) {
                // Reset to opposite side
                const angle = Math.atan2(pos.z, pos.x);
                cloud.mesh.position.x = -Math.cos(angle) * this.boundaryRadius * 0.9;
                cloud.mesh.position.z = -Math.sin(angle) * this.boundaryRadius * 0.9;
            }

            // Gentle rotation
            cloud.mesh.rotation.y += 0.001;
        });
    }

    setWeather(cloudiness) {
        // 0 = clear, 1 = overcast
        this.clouds.forEach(cloud => {
            const material = cloud.mesh.getChildMeshes()[0].material;
            material.alpha = 0.4 + cloudiness * 0.4;
        });
    }
} 