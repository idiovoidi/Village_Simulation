export class WaterSimulation {
    constructor(scene) {
        if (!scene) {
            throw new Error("Scene is required for WaterSimulation");
        }
        this.scene = scene;
        this.smoothingRadius = 1.0; // Radius for SPH calculations
        this.restDensity = 1.0;   // Target density for fluid
        this.stiffness = 50;      // Pressure constant
        this.viscosity = 0.5;     // Fluid thickness
        this.surfaceTension = 0.05;
    }

    initialize() {
        try {
            // Create water material with custom shader
            const shaderMaterial = new BABYLON.ShaderMaterial(
                "waterShader",
                this.scene,
                {
                    vertex: "water",
                    fragment: "water",
                },
                {
                    attributes: ["position", "normal", "uv"],
                    uniforms: [
                        "world", "worldView", "worldViewProjection", 
                        "view", "projection", "time", "cameraPosition"
                    ]
                }
            );

            // Define shader code
            BABYLON.Effect.ShadersStore["waterVertexShader"] = `
                precision highp float;
                attribute vec3 position;
                attribute vec2 uv;
                attribute vec3 normal;
                
                uniform mat4 world;
                uniform mat4 worldViewProjection;
                uniform float time;
                
                varying vec2 vUV;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying float vWaveHeight;
                
                void main() {
                    vec3 p = position;
                    float waveHeight = 0.0;
                    
                    // Add multiple wave patterns
                    waveHeight += sin(p.x * 0.2 + time) * 0.5;
                    waveHeight += cos(p.z * 0.3 + time * 1.2) * 0.3;
                    waveHeight += sin((p.x + p.z) * 0.5 + time * 0.8) * 0.4;
                    
                    p.y += waveHeight;
                    
                    vWaveHeight = waveHeight;
                    vUV = uv;
                    vPosition = (world * vec4(p, 1.0)).xyz;
                    vNormal = (world * vec4(normal, 0.0)).xyz;
                    
                    gl_Position = worldViewProjection * vec4(p, 1.0);
                }
            `;

            BABYLON.Effect.ShadersStore["waterFragmentShader"] = `
                precision highp float;
                
                varying vec2 vUV;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying float vWaveHeight;
                
                uniform vec3 cameraPosition;
                
                void main() {
                    vec3 waterColor = vec3(0.2, 0.4, 0.8);
                    vec3 deepColor = vec3(0.1, 0.2, 0.3);
                    
                    // Depth-based color mixing
                    float depth = smoothstep(-5.0, 0.0, vPosition.y);
                    vec3 color = mix(deepColor, waterColor, depth);
                    
                    // Add wave highlights
                    float highlight = smoothstep(0.3, 1.0, vWaveHeight);
                    color = mix(color, vec3(1.0), highlight * 0.2);
                    
                    // Add fresnel effect
                    vec3 viewDir = normalize(cameraPosition - vPosition);
                    vec3 normal = normalize(vNormal);
                    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
                    color = mix(color, vec3(1.0), fresnel * 0.5);
                    
                    gl_FragColor = vec4(color, 0.9);
                }
            `;

            // Create water mesh
            this.waterMesh = BABYLON.MeshBuilder.CreateGround(
                "waterVolume",
                {
                    width: 180,
                    height: 180,
                    subdivisions: 100
                },
                this.scene
            );

            // Apply shader material
            this.waterMesh.material = shaderMaterial;
            this.waterMesh.position.y = -8; // Adjust initial water level

            // Add physics
            new BABYLON.PhysicsAggregate(
                this.waterMesh,
                BABYLON.PhysicsShapeType.BOX,
                { mass: 0, friction: 0.1, restitution: 0.8 },
                this.scene
            );

            // Time variable for animation
            this.time = 0;

            // Register render loop
            this.scene.registerBeforeRender(() => {
                this.time += this.scene.getEngine().getDeltaTime() / 1000;
                shaderMaterial.setFloat("time", this.time);
                shaderMaterial.setVector3("cameraPosition", this.scene.activeCamera.position);
                
                // Update water surface to follow bowl shape
                this.updateWaterSurface();
            });

            return true;
        } catch (error) {
            console.error("Error initializing WaterSimulation:", error);
            return false;
        }
    }

    updateWaterSurface() {
        const positions = this.waterMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const normals = [];
        
        // Update vertices to follow bowl shape
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            const bowlHeight = this.getTerrainHeight(x, z);
            positions[i + 1] = Math.max(bowlHeight, -5); // Keep water above bowl surface
        }

        // Recalculate normals
        BABYLON.VertexData.ComputeNormals(positions, this.waterMesh.getIndices(), normals);

        // Update mesh
        this.waterMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        this.waterMesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    }

    getTerrainHeight(x, z) {
        const bowlRadius = 100;
        const bowlDepth = 25;
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        let height = -Math.pow(distFromCenter / bowlRadius, 0.8) * bowlDepth;
        height += Math.sin(x/20) * Math.cos(z/20) * 3;
        
        return height;
    }
} 