import { AssetManager } from '../assets/AssetManager.js';

export class BowlCreator {
    constructor(scene) {
        this.scene = scene;
        this.bowlRadius = 300;    // Increased from 200
        this.bowlDepth = 50;      // Increased from 40
        this.minSegments = 64;    // Keep same detail level
        this.maxSegments = 128;   // Keep same detail level
        this.wallOffset = 50;     // Add offset for walls beyond bowl radius

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
        const bowlRadius = 300;    // Match constructor value
        const bowlDepth = 50;      // Match constructor value
        
        const distFromCenter = Math.sqrt(x * x + z * z);
        const normalizedDist = distFromCenter / bowlRadius;
        
        // Flatter, more gradual base shape
        let y = -Math.pow(normalizedDist, 2.5) * bowlDepth; // Changed from cubic to power of 2.5 for more gradual slope
        
        // Create a very flat central meadow (larger area)
        if (normalizedDist < 0.5) { // Increased from 0.4
            // Almost completely flat center with very subtle undulation
            const meadowNoise = 
                Math.sin(x * 0.015) * Math.cos(z * 0.015) * 1.2 + // Even gentler rolling
                Math.sin((x + z) * 0.01) * Math.cos((x - z) * 0.01) * 0.8; // More subtle variation
            
            y = -3 + meadowNoise; // Keep same water depression
            
            // Smoother transition to surrounding terrain
            if (normalizedDist > 0.4) { // Adjusted transition zone
                const transitionFactor = (normalizedDist - 0.4) / 0.1;
                y = y * (1 - transitionFactor) + (-8 * transitionFactor);
            }
        }
        // Rolling hills in the middle region (wider area)
        else if (normalizedDist < 0.8) { // Increased from 0.7
            const hillFactor = (normalizedDist - 0.5) / 0.3;
            const hillNoise = 
                Math.sin(x * 0.02) * Math.cos(z * 0.02) * 10 + // Larger, gentler hills
                Math.sin((x + z) * 0.015) * Math.cos((x - z) * 0.015) * 8;
            
            y = -8 + hillNoise * hillFactor;
        }
        // Mountains at the edges (more gradual rise)
        else {
            const mountainFactor = (normalizedDist - 0.8) / 0.2;
            const mountainHeight = 50; // Increased height
            const angle = Math.atan2(z, x);
            
            // Create more natural-looking mountain ranges
            const mountainNoise = 
                Math.sin(angle * 2) * 0.7 + // Reduced frequency for wider ranges
                Math.sin(angle * 3 + 1.5) * 0.4 +
                Math.sin(angle * 5 + 2.4) * 0.3;
            
            const ridgeNoise = 
                Math.sin(x * 0.03 + z * 0.03) * 0.6 + // Gentler ridges
                Math.cos(x * 0.045 - z * 0.045) * 0.4;
            
            y += mountainHeight * mountainFactor * (0.8 + 0.4 * (mountainNoise + ridgeNoise));
        }
        
        return y;
    }

    createBowl(bowlRadius = 200, bowlDepth = 40, maxSegments = 128) {
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
        const wallHeight = 40; // Increased wall height
        const wallThickness = 10; // Increased thickness
        const wallRadius = bowlRadius + this.wallOffset; // Place walls further out
        
        for (let i = 0; i < 4; i++) {
            const wall = BABYLON.MeshBuilder.CreateBox(`wall${i}`, {
                width: i % 2 === 0 ? wallRadius * 2 + wallThickness : wallThickness,
                height: wallHeight,
                depth: i % 2 === 0 ? wallThickness : wallRadius * 2 + wallThickness
            }, this.scene);
            
            wall.position = new BABYLON.Vector3(
                i === 1 ? wallRadius + wallThickness/2 : i === 3 ? -(wallRadius + wallThickness/2) : 0,
                wallHeight/2 - bowlDepth/2, // Adjusted height position
                i === 0 ? wallRadius + wallThickness/2 : i === 2 ? -(wallRadius + wallThickness/2) : 0
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