export class BloodDecalManager {
    constructor(scene) {
        this.scene = scene;
        this.decals = [];
        this.maxDecals = 50; // Limit decals for performance
        this.decalSize = new BABYLON.Vector3(1, 1, 1);
        this.decalMaterial = this.createDecalMaterial();
    }

    createDecalMaterial() {
        const material = new BABYLON.StandardMaterial("bloodDecalMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.5, 0, 0);
        material.emissiveColor = new BABYLON.Color3(0.2, 0, 0);
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        material.alpha = 0.9;
        material.backFaceCulling = false;
        material.freeze();
        return material;
    }

    addBloodDecal(position, normal) {
        // Create a decal mesh
        const decal = BABYLON.MeshBuilder.CreateDecal("bloodDecal", this.scene.meshes[0], {
            position: position,
            normal: normal,
            size: this.decalSize,
            angle: Math.random() * Math.PI * 2
        });

        // Apply random scaling and rotation for variety
        const scale = 0.5 + Math.random() * 0.5;
        decal.scaling = new BABYLON.Vector3(scale, scale, scale);
        decal.rotation.z = Math.random() * Math.PI * 2;

        // Apply material
        decal.material = this.decalMaterial;

        // Add to decals array
        this.decals.push({
            mesh: decal,
            creationTime: Date.now()
        });

        // Remove oldest decal if we exceed the limit
        if (this.decals.length > this.maxDecals) {
            const oldest = this.decals.shift();
            oldest.mesh.dispose();
        }

        // Fade out effect
        const fadeOutTime = 10000; // 10 seconds
        const fadeInterval = setInterval(() => {
            const age = Date.now() - decal.creationTime;
            if (age > fadeOutTime) {
                clearInterval(fadeInterval);
                if (decal && decal.material) {
                    decal.dispose();
                    this.decals = this.decals.filter(d => d.mesh !== decal);
                }
            } else {
                const alpha = 1 - (age / fadeOutTime);
                if (decal && decal.material) {
                    decal.material.alpha = alpha * 0.9;
                }
            }
        }, 100);
    }

    addBloodSplatter(position, direction, intensity = 1) {
        const decalCount = Math.floor(3 + Math.random() * 3 * intensity);
        
        for (let i = 0; i < decalCount; i++) {
            // Create random offset from center
            const offset = new BABYLON.Vector3(
                (Math.random() - 0.5) * 2 * intensity,
                (Math.random() - 0.5) * 2 * intensity,
                (Math.random() - 0.5) * 2 * intensity
            );
            
            // Add some spread to the direction
            const spreadDirection = direction.add(new BABYLON.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            )).normalize();

            const decalPos = position.add(offset);
            this.addBloodDecal(decalPos, spreadDirection);
        }
    }

    dispose() {
        this.decals.forEach(decal => {
            if (decal.mesh) {
                decal.mesh.dispose();
            }
        });
        this.decals = [];
        if (this.decalMaterial) {
            this.decalMaterial.dispose();
        }
    }
} 