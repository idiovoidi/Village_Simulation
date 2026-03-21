import { BowlCreator } from '../BowlCreator.js';

export class RockSystem {
    constructor(scene) {
        this.scene = scene;
        this.rocks = [];

        // LOD parameters
        this.LOD_LEVELS = {
            HIGH: { distance: 0, segments: 32, bumpDetails: 1.0 },
            MEDIUM: { distance: 50, segments: 16, bumpDetails: 0.5 },
            LOW: { distance: 100, segments: 8, bumpDetails: 0.2 },
            VERY_LOW: { distance: 200, segments: 4, bumpDetails: 0 }
        };

        // Instance mesh arrays for LOD
        this.rockInstances = new Map();

        // Rock generation parameters
        this.rockTypes = {
            BOULDER: { minSize: 2, maxSize: 4, frequency: 0.2 },
            MEDIUM: { minSize: 0.8, maxSize: 1.5, frequency: 0.5 },
            SMALL: { minSize: 0.3, maxSize: 0.7, frequency: 0.3 }
        };

        // Rock materials cache
        this.materials = new Map();
        this.lodMaterials = new Map();

        // Spawn parameters
        this.spawnAttempts = 10;  // Maximum attempts to find a safe position
        this.minSpawnDistance = 2; // Minimum distance between rocks
        this.safeSpawnRadius = 50; // Initial safe spawn radius
        this.fallbackZones = [
            { radius: 50, attempts: 10 },
            { radius: 75, attempts: 5 },
            { radius: 100, attempts: 3 }
        ];

        // Initialize systems
        this.initializeRockMaterials();
        this.initializeLODMeshes();
        this.setupLODSystem();
    }

    initializeRockMaterials() {
        // Create materials for each LOD level
        Object.keys(this.LOD_LEVELS).forEach(level => {
            const lodMaterials = new Map();

            // Create base material for this LOD level
            const baseMaterial = new BABYLON.StandardMaterial(`rock${level}BaseMat`, this.scene);
            baseMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            baseMaterial.specularPower = 64;

            // Only add complex textures for higher LOD levels
            if (this.LOD_LEVELS[level].bumpDetails > 0) {
                const noiseTexture = new BABYLON.NoiseProceduralTexture(`rock${level}Noise`,
                    256 * this.LOD_LEVELS[level].bumpDetails, this.scene);
                noiseTexture.octaves = Math.max(1, Math.floor(4 * this.LOD_LEVELS[level].bumpDetails));
                baseMaterial.bumpTexture = noiseTexture;
                baseMaterial.bumpTexture.level = this.LOD_LEVELS[level].bumpDetails;
            }

            // Create material variations for this LOD level
            const variations = [
                { name: 'granite', color: new BABYLON.Color3(0.6, 0.6, 0.6) },
                { name: 'basalt', color: new BABYLON.Color3(0.3, 0.3, 0.3) },
                { name: 'sandstone', color: new BABYLON.Color3(0.76, 0.69, 0.57) },
                { name: 'limestone', color: new BABYLON.Color3(0.8, 0.77, 0.71) }
            ];

            variations.forEach(variation => {
                const material = baseMaterial.clone(`rock${level}${variation.name}Mat`);
                material.diffuseColor = variation.color;
                lodMaterials.set(variation.name, material);
            });

            this.lodMaterials.set(level, lodMaterials);
        });
    }

    initializeLODMeshes() {
        // Create template meshes for each LOD level
        Object.entries(this.LOD_LEVELS).forEach(([level, params]) => {
            const meshes = {
                polyhedron: this.createLODPolyhedronRock(1, params.segments),
                custom: this.createLODCustomRock(1, params.segments),
                boulder: this.createLODBoulderRock(1, params.segments)
            };
            this.rockInstances.set(level, meshes);
        });
    }

    setupLODSystem() {
        // Create LOD update observer
        this.scene.onBeforeRenderObservable.add(() => {
            const camera = this.scene.activeCamera;
            if (!camera) return;

            this.rocks.forEach(rock => {
                const distance = BABYLON.Vector3.Distance(camera.position, rock.position);
                this.updateRockLOD(rock, distance);
            });
        });
    }

    createLODPolyhedronRock(size, segments) {
        return BABYLON.MeshBuilder.CreatePolyhedron('rockTemplate', {
            type: 0,
            size,
            segments
        }, this.scene);
    }

    createLODCustomRock(size, segments) {
        const points = [];
        const actualSegments = Math.max(4, segments);

        for (let i = 0; i < actualSegments; i++) {
            const angle = (i / actualSegments) * Math.PI * 2;
            points.push(new BABYLON.Vector3(
                Math.cos(angle) * size,
                (Math.random() - 0.5) * size,
                Math.sin(angle) * size
            ));
        }

        return BABYLON.MeshBuilder.CreateLathe('rockTemplate', {
            shape: points,
            segments: actualSegments,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);
    }

    createLODBoulderRock(size, segments) {
        return BABYLON.MeshBuilder.CreateSphere('rockTemplate', {
            diameter: size * 2,
            segments
        }, this.scene);
    }

    updateRockLOD(rock, distance) {
        if (!rock.lodLevel) {
            rock.lodLevel = 'HIGH';
            return;
        }

        // Determine appropriate LOD level based on distance
        let newLevel = 'HIGH';
        for (const [level, params] of Object.entries(this.LOD_LEVELS)) {
            if (distance >= params.distance) {
                newLevel = level;
            }
        }

        // Only update if LOD level has changed
        if (newLevel !== rock.lodLevel) {
            this.switchRockLOD(rock, newLevel);
            rock.lodLevel = newLevel;
        }
    }

    switchRockLOD(rock, newLevel) {
        // Store original properties
        const position = rock.position.clone();
        const rotation = rock.rotation.clone();
        const scaling = rock.scaling.clone();

        // Get appropriate template mesh for new LOD level
        const templates = this.rockInstances.get(newLevel);
        const templateMesh = templates[rock.rockType || 'boulder'];

        // Create instance of appropriate LOD mesh
        const newInstance = templateMesh.createInstance(`rock_${newLevel}_${Date.now()}`);
        newInstance.position = position;
        newInstance.rotation = rotation;
        newInstance.scaling = scaling;

        // Apply appropriate LOD material
        const lodMaterials = this.lodMaterials.get(newLevel);
        newInstance.material = lodMaterials.get(rock.materialType || 'granite');

        // Transfer properties
        newInstance.lodLevel = newLevel;
        newInstance.rockType = rock.rockType;
        newInstance.materialType = rock.materialType;

        // Replace old mesh in rocks array
        const index = this.rocks.indexOf(rock);
        if (index !== -1) {
            this.rocks[index] = newInstance;
        }

        // Dispose old mesh
        rock.dispose();
    }

    createRock(x, z, type) {
        const { minSize, maxSize } = this.rockTypes[type];
        const size = minSize + Math.random() * (maxSize - minSize);

        // Create high detail rock initially
        const rock = this.createRockMesh(size);
        rock.position = new BABYLON.Vector3(x, BowlCreator.getTerrainHeight(x, z), z);
        rock.rotation = new BABYLON.Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        // Store rock type and material type for LOD switching
        const materialType = ['granite', 'basalt', 'sandstone', 'limestone'][
            Math.floor(Math.random() * 4)
        ];
        rock.materialType = materialType;
        rock.rockType = type.toLowerCase();

        // Apply initial high LOD material
        const highLODMaterials = this.lodMaterials.get('HIGH');
        rock.material = highLODMaterials.get(materialType);

        // Add physics
        new BABYLON.PhysicsAggregate(
            rock,
            BABYLON.PhysicsShapeType.MESH,
            { mass: 0, restitution: 0.2, friction: 0.8 },
            this.scene
        );

        this.rocks.push(rock);
        return rock;
    }

    createRockMesh(size) {
        // Randomly choose between different rock shapes
        const shapes = [
            () => this.createPolyhedronRock(size),
            () => this.createCustomRock(size),
            () => this.createBoulderRock(size)
        ];

        return shapes[Math.floor(Math.random() * shapes.length)]();
    }

    createPolyhedronRock(size) {
        return BABYLON.MeshBuilder.CreatePolyhedron('rock', {
            type: Math.floor(Math.random() * 4),
            size
        }, this.scene);
    }

    createCustomRock(size) {
        // Create custom rock shape using vertices
        const points = [];
        const segments = 8 + Math.floor(Math.random() * 5);

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const radius = size * (0.7 + Math.random() * 0.3);
            points.push(new BABYLON.Vector3(
                Math.cos(angle) * radius,
                (Math.random() - 0.5) * size,
                Math.sin(angle) * radius
            ));
        }

        return BABYLON.MeshBuilder.CreateLathe('rock', {
            shape: points,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);
    }

    createBoulderRock(size) {
        // Create a more natural boulder shape using spheres
        const mainSphere = BABYLON.MeshBuilder.CreateSphere('rockBase', {
            diameter: size * 2,
            segments: 8
        }, this.scene);

        // Add random bumps to create more natural shape
        const bumpCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < bumpCount; i++) {
            const bumpSize = size * (0.3 + Math.random() * 0.4);
            const bump = BABYLON.MeshBuilder.CreateSphere('rockBump', {
                diameter: bumpSize,
                segments: 8
            }, this.scene);

            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() - 0.5) * Math.PI;
            const distance = size * 0.7;

            bump.position = new BABYLON.Vector3(
                Math.cos(angle) * Math.cos(elevation) * distance,
                Math.sin(elevation) * distance,
                Math.sin(angle) * Math.cos(elevation) * distance
            );

            bump.parent = mainSphere;
        }

        // Merge all sub-meshes into one
        const merged = BABYLON.Mesh.MergeMeshes(
            [mainSphere, ...mainSphere.getChildMeshes()],
            true
        );

        return merged;
    }

    createRockCluster(centerX, centerZ, count = 5, radius = 5) {
        const cluster = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const x = centerX + Math.cos(angle) * distance;
            const z = centerZ + Math.sin(angle) * distance;

            const rock = this.createRock(x, z, 'MEDIUM');
            cluster.push(rock);
        }
        return cluster;
    }

    generateRocks(count = 50, radius = 100) {
        const spawnedRocks = [];
        let failedAttempts = 0;

        while (spawnedRocks.length < count && failedAttempts < this.spawnAttempts * 2) {
            const position = this.findSafeSpawnPosition(radius, spawnedRocks);

            if (position) {
                const rockType = this.determineRockType();
                const rock = this.createRock(position.x, position.z, rockType);
                spawnedRocks.push(rock);
                failedAttempts = 0;  // Reset failed attempts on success
            } else {
                failedAttempts++;
                console.warn(`Failed to find safe spawn position. Attempt ${failedAttempts}`);

                if (failedAttempts >= this.spawnAttempts) {
                    // Try fallback spawn logic
                    const fallbackPosition = this.findFallbackSpawnPosition(spawnedRocks);
                    if (fallbackPosition) {
                        const rockType = this.determineRockType();
                        const rock = this.createRock(fallbackPosition.x, fallbackPosition.z, rockType);
                        spawnedRocks.push(rock);
                        failedAttempts = 0;  // Reset failed attempts on fallback success
                    }
                }
            }
        }

        if (spawnedRocks.length < count) {
            console.warn(`Could only spawn ${spawnedRocks.length}/${count} rocks safely`);
        }

        return spawnedRocks;
    }

    findSafeSpawnPosition(radius, existingRocks) {
        for (let i = 0; i < this.spawnAttempts; i++) {
            // Generate random position within radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;

            if (this.isPositionSafe(x, z, existingRocks)) {
                return new BABYLON.Vector3(x, 0, z);
            }
        }
        return null;
    }

    findFallbackSpawnPosition(existingRocks) {
        // Try increasingly larger zones with fewer attempts
        for (const zone of this.fallbackZones) {
            for (let i = 0; i < zone.attempts; i++) {
                // Try spiral pattern for more systematic coverage
                const angle = i * (Math.PI * 2 / zone.attempts);
                const distance = (i / zone.attempts) * zone.radius;
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;

                if (this.isPositionSafe(x, z, existingRocks, true)) {
                    return new BABYLON.Vector3(x, 0, z);
                }
            }
        }

        // Last resort: Find least crowded position
        return this.findLeastCrowdedPosition(existingRocks);
    }

    isPositionSafe(x, z, existingRocks, isFailback = false) {
        // Check terrain height and slope
        const y = BowlCreator.getTerrainHeight(x, z);
        if (y === undefined || y === null) return false;

        // Check slope by sampling nearby points
        const slopeThreshold = isFailback ? 0.8 : 0.5; // More permissive for fallback
        if (!this.isTerrainSlopeAcceptable(x, z, slopeThreshold)) {
            return false;
        }

        // Check distance from other rocks
        const minDistance = isFailback ? this.minSpawnDistance * 0.75 : this.minSpawnDistance;
        for (const rock of existingRocks) {
            const distance = BABYLON.Vector3.Distance(
                new BABYLON.Vector3(x, y, z),
                rock.position
            );
            if (distance < minDistance) {
                return false;
            }
        }

        // Check for obstacles using raycast
        const rayStart = new BABYLON.Vector3(x, y + 5, z);
        const rayEnd = new BABYLON.Vector3(x, y - 1, z);
        const ray = new BABYLON.Ray(rayStart, rayEnd.subtract(rayStart).normalize(), 6);

        const hit = this.scene.pickWithRay(ray);
        if (hit.hit && hit.pickedMesh && hit.pickedMesh.id !== 'terrain') {
            return false;
        }

        return true;
    }

    isTerrainSlopeAcceptable(x, z, threshold) {
        const sampleDistance = 0.5;
        const centerHeight = BowlCreator.getTerrainHeight(x, z);

        // Sample heights in a cross pattern
        const samples = [
            BowlCreator.getTerrainHeight(x + sampleDistance, z),
            BowlCreator.getTerrainHeight(x - sampleDistance, z),
            BowlCreator.getTerrainHeight(x, z + sampleDistance),
            BowlCreator.getTerrainHeight(x, z - sampleDistance)
        ];

        // Check max slope difference
        for (const height of samples) {
            if (Math.abs(height - centerHeight) > threshold) {
                return false;
            }
        }

        return true;
    }

    findLeastCrowdedPosition(existingRocks) {
        let bestPosition = null;
        let maxMinDistance = 0;

        // Grid search for position with maximum minimum distance to other rocks
        const gridSize = 20;
        const stepSize = this.safeSpawnRadius * 2 / gridSize;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const x = -this.safeSpawnRadius + i * stepSize;
                const z = -this.safeSpawnRadius + j * stepSize;

                // Skip if terrain is not suitable
                if (!this.isTerrainSlopeAcceptable(x, z, 1.0)) {
                    continue;
                }

                let minDistance = Infinity;
                for (const rock of existingRocks) {
                    const distance = BABYLON.Vector3.Distance(
                        new BABYLON.Vector3(x, BowlCreator.getTerrainHeight(x, z), z),
                        rock.position
                    );
                    minDistance = Math.min(minDistance, distance);
                }

                if (minDistance > maxMinDistance) {
                    maxMinDistance = minDistance;
                    bestPosition = new BABYLON.Vector3(x, 0, z);
                }
            }
        }

        return bestPosition;
    }

    dispose() {
        // Dispose all rocks
        this.rocks.forEach(rock => {
            if (rock && rock.dispose) {
                rock.dispose();
            }
        });
        this.rocks = [];

        // Dispose LOD template meshes
        this.rockInstances.forEach(templates => {
            Object.values(templates).forEach(mesh => {
                if (mesh && mesh.dispose) {
                    mesh.dispose();
                }
            });
        });
        this.rockInstances.clear();

        // Dispose all LOD materials
        this.lodMaterials.forEach(materials => {
            materials.forEach(material => {
                if (material.dispose) {
                    material.dispose();
                }
            });
        });
        this.lodMaterials.clear();
    }
}
