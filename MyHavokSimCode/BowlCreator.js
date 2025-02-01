export class BowlCreator {
    constructor(scene) {
        this.scene = scene;
    }

    createBowl(bowlRadius = 100, bowlDepth = 25, segments = 96) {
        return new Promise((resolve) => {
            // Create ground from height map
            const ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap("bowl", 
                "https://assets.babylonjs.com/textures/heightMap.png", {
                width: bowlRadius * 2,
                height: bowlRadius * 2,
                subdivisions: segments,
                minHeight: -bowlDepth,
                maxHeight: 0,
                onReady: (mesh) => {
                    // Modify vertices after height map is loaded
                    this.modifyVertices(mesh, bowlRadius, bowlDepth);

                    // Create materials
                    const multimat = new BABYLON.MultiMaterial("multi", this.scene);
                    
                    // Rock material for mountains
                    const rockMaterial = new BABYLON.StandardMaterial("rock", this.scene);
                    rockMaterial.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/rock.png", this.scene);
                    rockMaterial.bumpTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/rockn.png", this.scene);
                    rockMaterial.diffuseTexture.uScale = rockMaterial.diffuseTexture.vScale = 20;
                    
                    // Grass material for flatter areas
                    const grassMaterial = new BABYLON.StandardMaterial("grass", this.scene);
                    grassMaterial.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/grass.png", this.scene);
                    grassMaterial.diffuseTexture.uScale = grassMaterial.diffuseTexture.vScale = 20;

                    multimat.subMaterials.push(rockMaterial);
                    multimat.subMaterials.push(grassMaterial);

                    mesh.material = multimat;

                    // Add physics after mesh is ready
                    new BABYLON.PhysicsAggregate(
                        mesh,
                        BABYLON.PhysicsShapeType.MESH,
                        { mass: 0, restitution: 0.7, friction: 1.0 },
                        this.scene
                    );

                    this.createWalls(bowlRadius, bowlDepth, rockMaterial);
                    
                    resolve(mesh);
                }
            }, this.scene);
        });
    }

    modifyVertices(mesh, bowlRadius, bowlDepth) {
        const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const indices = mesh.getIndices();
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            
            // Calculate distance from center
            const distFromCenter = Math.sqrt(x * x + z * z);
            const normalizedDist = distFromCenter / bowlRadius;
            
            // Base bowl shape
            let y = -Math.pow(normalizedDist, 2) * bowlDepth;
            
            // Add mountains near the edges
            if (normalizedDist > 0.7) {
                const mountainFactor = (normalizedDist - 0.7) / 0.3;
                const mountainHeight = 20;
                const angle = Math.atan2(z, x);
                
                // Create mountain ranges
                const mountainNoise = 
                    Math.sin(angle * 4) * 0.5 +
                    Math.sin(angle * 7 + 1.3) * 0.3 +
                    Math.sin(angle * 13 + 2.4) * 0.2;
                
                y += mountainHeight * mountainFactor * (0.7 + 0.3 * mountainNoise);
            }
            
            // Flatten the center area
            if (normalizedDist < 0.3) {
                const flatFactor = 1 - (normalizedDist / 0.3);
                y *= (1 - Math.pow(flatFactor, 2));
            }
            
            // Add some gentle hills in the middle
            if (normalizedDist < 0.6) {
                const hillNoise = 
                    Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2 +
                    Math.sin((x + z) * 0.05) * Math.cos((x - z) * 0.05);
                y += hillNoise * (1 - normalizedDist);
            }
            
            positions[i + 1] = y;
        }
        
        // Update the mesh with new positions
        mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        
        // Recompute normals
        BABYLON.VertexData.ComputeNormals(positions, indices, mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind));
        
        // Create submesh regions based on height
        this.createTerrainSubMeshes(mesh, positions, indices);
    }

    createTerrainSubMeshes(mesh, positions, indices) {
        const mountainIndices = [];
        const grassIndices = [];
        
        // Separate indices based on vertex height
        for (let i = 0; i < indices.length; i += 3) {
            const height1 = positions[indices[i] * 3 + 1];
            const height2 = positions[indices[i + 1] * 3 + 1];
            const height3 = positions[indices[i + 2] * 3 + 1];
            const avgHeight = (height1 + height2 + height3) / 3;
            
            if (avgHeight > -5) {
                mountainIndices.push(indices[i], indices[i + 1], indices[i + 2]);
            } else {
                grassIndices.push(indices[i], indices[i + 1], indices[i + 2]);
            }
        }
        
        // Create submeshes
        new BABYLON.SubMesh(0, 0, positions.length / 3, mountainIndices[0], mountainIndices.length, mesh);
        new BABYLON.SubMesh(1, 0, positions.length / 3, grassIndices[0], grassIndices.length, mesh);
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