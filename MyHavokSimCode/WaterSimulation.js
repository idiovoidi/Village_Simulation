export class WaterSimulation {
    constructor(scene) {
        if (!scene) {
            throw new Error("Scene is required for WaterSimulation");
        }
        this.scene = scene;
        this.waterMesh = null;
        this.time = 0;
    }

    initialize() {
        // Create custom water material
        const waterMaterial = new BABYLON.StandardMaterial("waterMat", this.scene);
        
        // Set transparency
        waterMaterial.alpha = 0.4;
        
        // Water color and properties
        waterMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.5);
        waterMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        waterMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.3);
        
        // Add fresnel effect for realistic water surface
        waterMaterial.fresnelParameters = new BABYLON.FresnelParameters();
        waterMaterial.fresnelParameters.bias = 0.1;
        waterMaterial.fresnelParameters.power = 1;
        waterMaterial.fresnelParameters.leftColor = BABYLON.Color3.White();
        waterMaterial.fresnelParameters.rightColor = BABYLON.Color3.Black();

        // Enable backface culling for better transparency
        waterMaterial.backFaceCulling = true;
        
        try {
            // Create water surface
            this.waterMesh = BABYLON.MeshBuilder.CreateGround(
                "waterSurface",
                {
                    width: 180,
                    height: 180,
                    subdivisions: 50
                },
                this.scene
            );

            // Position water
            this.waterMesh.position.y = -8;

            // Apply material
            this.waterMesh.material = waterMaterial;

            // Add wave animation
            this.scene.registerBeforeRender(() => {
                this.time += this.scene.getEngine().getDeltaTime() * 0.001;
                this.updateWaterWaves();
            });

            return true;
        } catch (error) {
            console.error("Error initializing water:", error);
            return false;
        }
    }

    updateWaterWaves() {
        const positions = this.waterMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const normals = [];
        
        // Update vertices for wave motion
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            
            // Create gentle waves using multiple sine waves
            positions[i + 1] = this.waterMesh.position.y + 
                Math.sin(x * 0.1 + this.time) * 0.3 +
                Math.cos(z * 0.1 + this.time * 0.8) * 0.3 +
                Math.sin((x + z) * 0.1 + this.time * 1.2) * 0.2;
        }

        // Compute normals for proper lighting
        BABYLON.VertexData.ComputeNormals(
            positions, 
            this.waterMesh.getIndices(), 
            normals
        );

        // Update mesh
        this.waterMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        this.waterMesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    }

    getWaterHeight(x, z) {
        // Get current water height at position (for other objects to use)
        const time = this.time;
        return this.waterMesh.position.y + 
            Math.sin(x * 0.1 + time) * 0.3 +
            Math.cos(z * 0.1 + time * 0.8) * 0.3 +
            Math.sin((x + z) * 0.1 + time * 1.2) * 0.2;
    }
} 