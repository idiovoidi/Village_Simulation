import { AssetManager } from '../assets/AssetManager.js';

export class BowlCreator {
    constructor(scene) {
        this.scene = scene;
        this.bowlRadius = 100;
        this.bowlDepth = 25;
        this.minSegments = 32;  // Minimum segments for flat areas
        this.maxSegments = 96;  // Maximum segments for detailed areas

        // Optimize wheel event handling
        this.initializeEventHandling();
    }

    initializeEventHandling() {
        // Get the canvas element from the scene
        const canvas = this.scene.getEngine().getRenderingCanvas();
        
        // Remove any existing wheel listeners
        canvas.removeEventListener('wheel', this.handleWheel, { passive: true });
        
        // Add passive wheel event listener
        this.handleWheel = (event) => {
            // Handle zoom here if needed
            if (this.scene.activeCamera) {
                const camera = this.scene.activeCamera;
                const delta = event.deltaY * 0.01;
                if (camera.radius !== undefined) {
                    camera.radius += delta; // For ArcRotateCamera
                } else if (camera.position) {
                    const direction = camera.getDirection(BABYLON.Vector3.Forward());
                    camera.position.addInPlace(direction.scale(delta));
                }
            }
        };
        
        canvas.addEventListener('wheel', this.handleWheel, { passive: true });
        
        // Cleanup on scene dispose
        this.scene.onDisposeObservable.add(() => {
            canvas.removeEventListener('wheel', this.handleWheel, { passive: true });
        });
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
            
            const {positions, indices, uvs, normals, colors} = this.generateAdaptiveTerrainData(bowlRadius, bowlDepth, maxSegments);
            
            vertexData.positions = positions;
            vertexData.indices = indices;
            vertexData.uvs = uvs;
            vertexData.normals = normals;
            vertexData.colors = colors;
            vertexData.applyToMesh(ground);

            // Create terrain material
            const terrainMaterial = this.createTerrainMaterial();
            ground.material = terrainMaterial;

            // Add physics
            new BABYLON.PhysicsAggregate(
                ground,
                BABYLON.PhysicsShapeType.MESH,
                { mass: 0, restitution: 0.7, friction: 1.0 },
                this.scene
            );

            this.createWalls(bowlRadius, bowlDepth, terrainMaterial);
            
            resolve(ground);
        });
    }

    createTerrainMaterial() {
        // Create main material
        const terrainMaterial = new BABYLON.StandardMaterial("terrainMat", this.scene);
        
        // Get textures from AssetManager
        const grassTexture = AssetManager.getTexture('GRASS', this.scene);
        const rockTexture = AssetManager.getTexture('ROCK', this.scene);
        const rockNormalMap = AssetManager.getTexture('ROCK_NORMAL', this.scene);

        // Configure grass texture
        if (grassTexture) {
            grassTexture.uScale = grassTexture.vScale = 50;
            terrainMaterial.diffuseTexture = grassTexture;
        }

        // Configure rock texture
        if (rockTexture) {
            rockTexture.uScale = rockTexture.vScale = 50;
            terrainMaterial.ambientTexture = rockTexture; // Use rock as detail texture
        }

        // Configure normal map
        if (rockNormalMap) {
            rockNormalMap.uScale = rockNormalMap.vScale = 50;
            terrainMaterial.bumpTexture = rockNormalMap;
            terrainMaterial.invertNormalMapX = true;
            terrainMaterial.invertNormalMapY = true;
        }

        // Material properties
        terrainMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        terrainMaterial.specularPower = 64;
        terrainMaterial.useVertexColors = true;
        terrainMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
        terrainMaterial.ambientColor = new BABYLON.Color3(1, 1, 1);

        return terrainMaterial;
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
        // Calculate blend factors based on height and distance
        const heightFactor = (y + bowlDepth) / (bowlDepth * 2); // Normalize height to 0-1
        const slopeFactor = Math.abs(y) / bowlDepth; // Steepness factor
        
        // Calculate biomes with smoother transitions
        const meadowFactor = Math.max(0, Math.min(1, 
            (0.4 - distFromCenter) / 0.1 * (1 - slopeFactor)
        ));
        
        const hillFactor = Math.max(0, Math.min(1,
            distFromCenter < 0.4 ? 0 :
            distFromCenter > 0.7 ? 0 :
            ((distFromCenter - 0.4) / 0.3) * (1 - Math.abs(heightFactor - 0.5))
        ));
        
        const mountainFactor = Math.max(0, Math.min(1,
            (distFromCenter - 0.6) / 0.2 * slopeFactor
        ));

        // Define more natural earth-tone color palettes
        const meadowColor = {
            r: 0.4,
            g: 0.6,
            b: 0.3
        };

        const hillColor = {
            r: 0.45,
            g: 0.5,
            b: 0.35
        };

        const mountainColor = {
            r: 0.5,
            g: 0.45,
            b: 0.4
        };

        // Blend colors with proper weighting
        const r = (meadowColor.r * meadowFactor +
                  hillColor.r * hillFactor +
                  mountainColor.r * mountainFactor);
        
        const g = (meadowColor.g * meadowFactor +
                  hillColor.g * hillFactor +
                  mountainColor.g * mountainFactor);
        
        const b = (meadowColor.b * meadowFactor +
                  hillColor.b * hillFactor +
                  mountainColor.b * mountainFactor);

        // Push colors with proper clamping
        colors.push(
            Math.max(0.2, Math.min(0.8, r)), // More conservative clamping
            Math.max(0.2, Math.min(0.8, g)),
            Math.max(0.2, Math.min(0.8, b))
        );
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