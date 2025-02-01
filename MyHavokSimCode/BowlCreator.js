export class BowlCreator {
    constructor(scene) {
        this.scene = scene;
    }

    createBowl(bowlRadius = 100, bowlDepth = 25, segments = 96) {
        return new Promise((resolve) => {
            // Create custom ground mesh
            const ground = new BABYLON.Mesh("bowl", this.scene);
            const vertexData = new BABYLON.VertexData();
            
            // Generate mesh data
            const {positions, indices, uvs, normals} = this.generateTerrainData(bowlRadius, bowlDepth, segments);
            
            // Apply vertex data to mesh
            vertexData.positions = positions;
            vertexData.indices = indices;
            vertexData.uvs = uvs;
            vertexData.normals = normals;
            vertexData.applyToMesh(ground);

            // Create materials
            const multimat = new BABYLON.MultiMaterial("multi", this.scene);
            
            // Rock material for mountains
            const rockMaterial = new BABYLON.StandardMaterial("rock", this.scene);
            rockMaterial.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/rock.png", this.scene);
            rockMaterial.bumpTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/rockn.png", this.scene);
            rockMaterial.diffuseTexture.uScale = rockMaterial.diffuseTexture.vScale = 20;
            rockMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            rockMaterial.backFaceCulling = false;
            
            // Grass material for flatter areas
            const grassMaterial = new BABYLON.StandardMaterial("grass", this.scene);
            grassMaterial.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/grass.png", this.scene);
            grassMaterial.diffuseTexture.uScale = grassMaterial.diffuseTexture.vScale = 20;
            grassMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            grassMaterial.backFaceCulling = false;

            multimat.subMaterials.push(rockMaterial);
            multimat.subMaterials.push(grassMaterial);

            ground.material = multimat;

            // Add physics
            new BABYLON.PhysicsAggregate(
                ground,
                BABYLON.PhysicsShapeType.MESH,
                { mass: 0, restitution: 0.7, friction: 1.0 },
                this.scene
            );

            this.createWalls(bowlRadius, bowlDepth, rockMaterial);
            
            resolve(ground);
        });
    }

    generateTerrainData(bowlRadius, bowlDepth, segments) {
        const positions = [];
        const indices = [];
        const uvs = [];
        const normals = [];
        
        // Generate vertices
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                const x = ((i / segments) * 2 - 1) * bowlRadius;
                const z = ((j / segments) * 2 - 1) * bowlRadius;
                
                const distFromCenter = Math.sqrt(x * x + z * z);
                const normalizedDist = distFromCenter / bowlRadius;
                
                // Calculate height
                let y = -Math.pow(normalizedDist, 2) * bowlDepth;
                
                // Add mountains near edges
                if (normalizedDist > 0.7) {
                    const mountainFactor = (normalizedDist - 0.7) / 0.3;
                    const mountainHeight = 20;
                    const angle = Math.atan2(z, x);
                    
                    const mountainNoise = 
                        Math.sin(angle * 4) * 0.5 +
                        Math.sin(angle * 7 + 1.3) * 0.3 +
                        Math.sin(angle * 13 + 2.4) * 0.2;
                    
                    y += mountainHeight * mountainFactor * (0.7 + 0.3 * mountainNoise);
                }
                
                // Flatten center
                if (normalizedDist < 0.3) {
                    const flatFactor = 1 - (normalizedDist / 0.3);
                    y *= (1 - Math.pow(flatFactor, 2));
                }
                
                // Add gentle hills
                if (normalizedDist < 0.6) {
                    const hillNoise = 
                        Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2 +
                        Math.sin((x + z) * 0.05) * Math.cos((x - z) * 0.05);
                    y += hillNoise * (1 - normalizedDist);
                }
                
                positions.push(x, y, z);
                
                // UV coordinates
                uvs.push(i / segments, j / segments);
                
                // Placeholder normal (will be computed later)
                normals.push(0, 1, 0);
            }
        }
        
        // Generate indices
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const baseIdx = i * (segments + 1) + j;
                indices.push(
                    baseIdx, baseIdx + 1, baseIdx + segments + 1,
                    baseIdx + 1, baseIdx + segments + 2, baseIdx + segments + 1
                );
            }
        }
        
        // Compute proper normals
        BABYLON.VertexData.ComputeNormals(positions, indices, normals);
        
        return {positions, indices, uvs, normals};
    }

    createWalls(bowlRadius, bowlDepth, material) {
        const wallHeight = 30;
        const wallThickness = 8;
        
        for (let i = 0; i < 4; i++) {
            const wall = BABYLON.MeshBuilder.CreateBox(`wall${i}`, {
                width: i % 2 === 0 ? bowlRadius * 2 + wallThickness : wallThickness,
                height: wallHeight,
                depth: i % 2 === 0 ? wallThickness : bowlRadius * 2 + wallThickness
            }, this.scene);
            
            wall.position = new BABYLON.Vector3(
                i === 1 ? bowlRadius + wallThickness/2 : i === 3 ? -(bowlRadius + wallThickness/2) : 0,
                wallHeight/2 - bowlDepth,
                i === 0 ? bowlRadius + wallThickness/2 : i === 2 ? -(bowlRadius + wallThickness/2) : 0
            );
            
            wall.material = material;
            wall.visibility = 0.3;
            
            new BABYLON.PhysicsAggregate(
                wall,
                BABYLON.PhysicsShapeType.BOX,
                { mass: 0, restitution: 0.5, friction: 1.0 },
                this.scene
            );
        }
    }
} 