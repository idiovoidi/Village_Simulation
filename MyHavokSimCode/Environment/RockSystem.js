import { BowlCreator } from '../BowlCreator.js';

export class RockSystem {
    constructor(scene) {
        this.scene = scene;
        this.rocks = [];
        
        // Rock generation parameters
        this.rockTypes = {
            BOULDER: { minSize: 2, maxSize: 4, frequency: 0.2 },
            MEDIUM: { minSize: 0.8, maxSize: 1.5, frequency: 0.5 },
            SMALL: { minSize: 0.3, maxSize: 0.7, frequency: 0.3 }
        };

        // Rock materials cache
        this.materials = new Map();
        
        // Initialize rock textures
        this.initializeRockMaterials();
    }

    initializeRockMaterials() {
        // Create base rock material
        const baseMaterial = new BABYLON.StandardMaterial("rockBaseMat", this.scene);
        baseMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        baseMaterial.specularPower = 64;
        baseMaterial.bumpTexture = new BABYLON.NoiseProceduralTexture("rockNoise", 256, this.scene);
        baseMaterial.bumpTexture.octaves = 4;
        this.materials.set('base', baseMaterial);

        // Create variations of rock materials
        const variations = [
            { name: 'granite', color: new BABYLON.Color3(0.6, 0.6, 0.6) },
            { name: 'basalt', color: new BABYLON.Color3(0.3, 0.3, 0.3) },
            { name: 'sandstone', color: new BABYLON.Color3(0.76, 0.69, 0.57) },
            { name: 'limestone', color: new BABYLON.Color3(0.8, 0.77, 0.71) }
        ];

        variations.forEach(variation => {
            const material = baseMaterial.clone(`rock${variation.name}Mat`);
            material.diffuseColor = variation.color;
            this.materials.set(variation.name, material);
        });
    }

    generateRocks(count = 50, radius = 100) {
        for (let i = 0; i < count; i++) {
            // Determine rock type based on frequency
            const rockType = this.determineRockType();
            
            // Generate random position within radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create rock at position
            this.createRock(x, z, rockType);
        }
    }

    determineRockType() {
        const rand = Math.random();
        if (rand < this.rockTypes.BOULDER.frequency) return 'BOULDER';
        if (rand < this.rockTypes.BOULDER.frequency + this.rockTypes.MEDIUM.frequency) return 'MEDIUM';
        return 'SMALL';
    }

    createRock(x, z, type) {
        // Get size range for rock type
        const { minSize, maxSize } = this.rockTypes[type];
        const size = minSize + Math.random() * (maxSize - minSize);

        // Create rock mesh with random geometry
        const rock = this.createRockMesh(size);
        
        // Position rock and align with terrain
        const y = BowlCreator.getTerrainHeight(x, z);
        rock.position = new BABYLON.Vector3(x, y, z);

        // Random rotation
        rock.rotation = new BABYLON.Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        // Apply random material
        const materialTypes = ['granite', 'basalt', 'sandstone', 'limestone'];
        const material = this.materials.get(materialTypes[Math.floor(Math.random() * materialTypes.length)]);
        rock.material = material;

        // Add physics
        new BABYLON.PhysicsAggregate(
            rock,
            BABYLON.PhysicsShapeType.MESH,
            { mass: 0, restitution: 0.2, friction: 0.8 },
            this.scene
        );

        // Add to rocks array
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
        return BABYLON.MeshBuilder.CreatePolyhedron("rock", {
            type: Math.floor(Math.random() * 4),
            size: size
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

        return BABYLON.MeshBuilder.CreateLathe("rock", {
            shape: points,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);
    }

    createBoulderRock(size) {
        // Create a more natural boulder shape using spheres
        const mainSphere = BABYLON.MeshBuilder.CreateSphere("rockBase", {
            diameter: size * 2,
            segments: 8
        }, this.scene);

        // Add random bumps to create more natural shape
        const bumpCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < bumpCount; i++) {
            const bumpSize = size * (0.3 + Math.random() * 0.4);
            const bump = BABYLON.MeshBuilder.CreateSphere("rockBump", {
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

    dispose() {
        // Dispose of all rocks
        this.rocks.forEach(rock => {
            if (rock && rock.dispose) {
                rock.dispose();
            }
        });
        this.rocks = [];

        // Dispose of materials
        this.materials.forEach(material => {
            if (material.dispose) {
                material.dispose();
            }
        });
        this.materials.clear();
    }
} 