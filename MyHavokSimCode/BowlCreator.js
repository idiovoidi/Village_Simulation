export class BowlCreator {
    constructor(scene) {
        this.scene = scene;
        this.bowlRadius = 100;
        this.bowlDepth = 25;
        this.minSegments = 32;  // Minimum segments for flat areas
        this.maxSegments = 96;  // Maximum segments for detailed areas
    }

    // Add this static method to get terrain height at any point
    static getTerrainHeight(x, z) {
        const bowlRadius = 100;
        const bowlDepth = 25;
        
        const distFromCenter = Math.sqrt(x * x + z * z);
        const normalizedDist = distFromCenter / bowlRadius;
        
        // Much flatter base shape
        let y = -Math.pow(normalizedDist, 3) * bowlDepth;
        
        // Create a very flat central meadow
        if (normalizedDist < 0.4) {
            // Almost completely flat center with very subtle undulation
            const meadowNoise = 
                Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5 + // Very gentle rolling
                Math.sin((x + z) * 0.03) * Math.cos((x - z) * 0.03) * 0.3; // Subtle variation
            
            y = -2 + meadowNoise; // Slight depression to hold water
            
            // Smooth transition to surrounding terrain
            if (normalizedDist > 0.3) {
                const transitionFactor = (normalizedDist - 0.3) / 0.1;
                y = y * (1 - transitionFactor) + (-5 * transitionFactor);
            }
        }
        // Rolling hills in the middle region
        else if (normalizedDist < 0.7) {
            const hillFactor = (normalizedDist - 0.4) / 0.3;
            const hillNoise = 
                Math.sin(x * 0.08) * Math.cos(z * 0.08) * 4 +
                Math.sin((x + z) * 0.05) * Math.cos((x - z) * 0.05) * 3;
            
            y = -5 + hillNoise * hillFactor;
        }
        // Mountains at the edges
        else {
            const mountainFactor = (normalizedDist - 0.7) / 0.3;
            const mountainHeight = 25;
            const angle = Math.atan2(z, x);
            
            // Create more natural-looking mountain ranges
            const mountainNoise = 
                Math.sin(angle * 3) * 0.6 +
                Math.sin(angle * 5 + 1.5) * 0.3 +
                Math.sin(angle * 8 + 2.4) * 0.2;
            
            const ridgeNoise = 
                Math.sin(x * 0.1 + z * 0.1) * 0.5 +
                Math.cos(x * 0.15 - z * 0.15) * 0.3;
            
            y += mountainHeight * mountainFactor * (0.8 + 0.4 * (mountainNoise + ridgeNoise));
        }
        
        return y;
    }

    createBowl(bowlRadius = 100, bowlDepth = 25, maxSegments = 96) {
        return new Promise((resolve) => {
            const ground = new BABYLON.Mesh("bowl", this.scene);
            const vertexData = new BABYLON.VertexData();
            
            // Use adaptive tessellation
            const {positions, indices, uvs, normals, colors} = this.generateAdaptiveTerrainData(bowlRadius, bowlDepth, maxSegments);
            
            // Apply vertex data to mesh
            vertexData.positions = positions;
            vertexData.indices = indices;
            vertexData.uvs = uvs;
            vertexData.normals = normals;
            vertexData.colors = colors;
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

    generateAdaptiveTerrainData(bowlRadius, bowlDepth, maxSegments) {
        const positions = [];
        const indices = [];
        const uvs = [];
        const normals = [];
        const colors = [];
        
        // Calculate adaptive grid size based on terrain features
        const gridSizes = this.calculateAdaptiveGrid(bowlRadius, maxSegments);
        
        // Generate vertices using adaptive grid
        let vertexIndex = 0;
        const vertexMap = new Map(); // Store vertex indices for connecting different resolution areas
        
        for (let i = 0; i < gridSizes.length; i++) {
            for (let j = 0; j < gridSizes[i].length; j++) {
                const gridSize = gridSizes[i][j];
                const x = ((i / (gridSizes.length - 1)) * 2 - 1) * bowlRadius;
                const z = ((j / (gridSizes[i].length - 1)) * 2 - 1) * bowlRadius;
                
                // Skip vertices that are too close to existing ones
                const key = `${Math.round(x)},${Math.round(z)}`;
                if (vertexMap.has(key)) continue;
                
                const y = BowlCreator.getTerrainHeight(x, z);
                positions.push(x, y, z);
                vertexMap.set(key, vertexIndex++);
                
                // Calculate colors based on terrain type
                const distFromCenter = Math.sqrt(x * x + z * z) / bowlRadius;
                this.addTerrainColor(colors, distFromCenter, y, bowlDepth);
                
                uvs.push(i / (gridSizes.length - 1), j / (gridSizes[i].length - 1));
                normals.push(0, 1, 0);
            }
        }
        
        // Generate indices with proper vertex connections
        this.generateAdaptiveIndices(indices, gridSizes, vertexMap, bowlRadius);
        
        // Compute proper normals
        BABYLON.VertexData.ComputeNormals(positions, indices, normals);
        
        return {positions, indices, uvs, normals, colors};
    }

    calculateAdaptiveGrid(bowlRadius, maxSegments) {
        const gridSizes = [];
        const baseSize = this.minSegments;
        
        for (let i = 0; i <= maxSegments; i++) {
            const row = [];
            for (let j = 0; j <= maxSegments; j++) {
                const x = ((i / maxSegments) * 2 - 1) * bowlRadius;
                const z = ((j / maxSegments) * 2 - 1) * bowlRadius;
                
                const distFromCenter = Math.sqrt(x * x + z * z) / bowlRadius;
                
                // Use more vertices in mountain areas and fewer in flat areas
                if (distFromCenter > 0.7) {
                    row.push(maxSegments); // High detail for mountains
                } else if (distFromCenter > 0.4) {
                    row.push(Math.floor(baseSize * 1.5)); // Medium detail for hills
                } else {
                    row.push(baseSize); // Low detail for flat meadow
                }
            }
            gridSizes.push(row);
        }
        
        return gridSizes;
    }

    addTerrainColor(colors, distFromCenter, y, bowlDepth) {
        // Meadow colors (greens)
        if (distFromCenter < 0.4) {
            colors.push(
                0.2 + Math.random() * 0.1, // R
                0.6 + Math.random() * 0.2, // G
                0.1 + Math.random() * 0.1  // B
            );
        }
        // Hills colors (mix of greens and browns)
        else if (distFromCenter < 0.7) {
            const hillNoise = Math.random() * 0.2;
            colors.push(
                0.3 + hillNoise, // R
                0.5 + hillNoise, // G
                0.1 + hillNoise  // B
            );
        }
        // Mountain colors (greys and browns)
        else {
            const rockNoise = Math.random() * 0.2;
            colors.push(
                0.4 + rockNoise, // R
                0.35 + rockNoise, // G
                0.3 + rockNoise  // B
            );
        }
    }

    generateAdaptiveIndices(indices, gridSizes, vertexMap, bowlRadius) {
        for (let i = 0; i < gridSizes.length - 1; i++) {
            for (let j = 0; j < gridSizes[i].length - 1; j++) {
                const x1 = ((i / (gridSizes.length - 1)) * 2 - 1) * bowlRadius;
                const z1 = ((j / (gridSizes[i].length - 1)) * 2 - 1) * bowlRadius;
                const x2 = (((i + 1) / (gridSizes.length - 1)) * 2 - 1) * bowlRadius;
                const z2 = (((j + 1) / (gridSizes[i].length - 1)) * 2 - 1) * bowlRadius;
                
                const v1 = vertexMap.get(`${Math.round(x1)},${Math.round(z1)}`);
                const v2 = vertexMap.get(`${Math.round(x2)},${Math.round(z1)}`);
                const v3 = vertexMap.get(`${Math.round(x1)},${Math.round(z2)}`);
                const v4 = vertexMap.get(`${Math.round(x2)},${Math.round(z2)}`);
                
                if (v1 !== undefined && v2 !== undefined && v3 !== undefined) {
                    indices.push(v1, v2, v3);
                }
                if (v2 !== undefined && v4 !== undefined && v3 !== undefined) {
                    indices.push(v2, v4, v3);
                }
            }
        }
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