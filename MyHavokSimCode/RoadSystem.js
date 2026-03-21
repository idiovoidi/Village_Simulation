import { BowlCreator } from './BowlCreator.js';
import { AssetManager } from '../assets/AssetManager.js';

export class RoadSystem {
    constructor(scene) {
        if (!scene) {
            throw new Error('Scene is required for RoadSystem');
        }
        this.scene = scene;
        this.paths = [];        // Array to store all path segments
        this.pathWidth = 2;     // Width of the dirt paths
        this.pathHeight = 0.1;  // Height of the paths
        this.junctions = [];    // Array to store path junctions

        // Path generation parameters
        this.curvePoints = 8;   // Number of points to create curved paths
        this.maxOffset = 3;     // Maximum random offset for curve points
        this.groundLayer = null; // Ground layer for path imprints
    }

    createRoadNetwork(houses) {
        // Clear any existing paths and junctions
        this.clearRoads();

        // Create a minimum spanning tree of connections
        const connections = this.createMinimumSpanningTree(houses);

        // Create curved paths for each connection
        connections.forEach(([house1, house2]) => {
            this.createCurvedPath(house1.position, house2.position);
        });

        // Create path intersections
        this.createJunctions();
    }

    createCurvedPath(start, end) {
        // Generate control points for the curve
        const points = this.generateCurvePoints(start, end);

        // Create a catmull-rom spline through the points
        const catmullRom = BABYLON.Curve3.CreateCatmullRomSpline(
            points,
            60,
            false
        );

        // Get the path points
        const pathPoints = catmullRom.getPoints();

        // Create the path using ribbon
        const path = BABYLON.MeshBuilder.CreateRibbon('path', {
            pathArray: [pathPoints],
            closePath: false,
            closeArray: false,
            width: this.pathWidth,
            updatable: true
        }, this.scene);

        // Create and apply dirt path material
        const pathMaterial = this.createDirtPathMaterial();
        path.material = pathMaterial;

        // Conform path to terrain
        this.conformToTerrain(path, pathPoints);

        // Add some scattered rocks and grass along the path
        this.addPathDecorations(pathPoints);

        this.paths.push(path);
        return path;
    }

    generateCurvePoints(start, end) {
        const points = [];
        const direction = end.subtract(start);
        const distance = direction.length();
        const normalized = direction.normalize();

        // Create perpendicular vector for offset
        const perp = new BABYLON.Vector3(
            -normalized.z,
            0,
            normalized.x
        );

        // Generate points with random offsets
        for (let i = 0; i < this.curvePoints; i++) {
            const progress = i / (this.curvePoints - 1);
            const basePoint = start.add(direction.scale(progress));

            // Add random offset perpendicular to path direction
            // Reduce offset at start and end points
            const offsetScale = Math.sin(progress * Math.PI);
            const offset = (Math.random() - 0.5) * this.maxOffset * offsetScale;

            const point = basePoint.add(perp.scale(offset));
            point.y = BowlCreator.getTerrainHeight(point.x, point.z) + this.pathHeight;

            points.push(point);
        }

        return points;
    }

    createDirtPathMaterial() {
        const material = new BABYLON.StandardMaterial('dirtPathMat', this.scene);

        // Set base colors for dirt
        material.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2);
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.specularPower = 32;

        // Add noise texture for natural variation
        const noiseTexture = new BABYLON.NoiseProceduralTexture('noiseTexture', 256, this.scene);
        noiseTexture.octaves = 3;
        noiseTexture.persistence = 0.8;
        noiseTexture.animationSpeedFactor = 0;

        // Blend noise with base color
        material.diffuseTexture = noiseTexture;
        material.bumpTexture = noiseTexture;
        material.bumpTexture.level = 0.4;

        // Make edges slightly transparent for better blending
        material.useAlphaFromDiffuseTexture = true;
        material.diffuseTexture.uScale = material.diffuseTexture.vScale = 5;

        return material;
    }

    conformToTerrain(path, points) {
        // Create vertex data from the path
        const positions = path.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const indices = path.getIndices();

        // Adjust each vertex to terrain height
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            positions[i + 1] = BowlCreator.getTerrainHeight(x, z) + this.pathHeight;
        }

        // Update the path mesh
        path.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    }

    addPathDecorations(points) {
        const decorationCount = Math.floor(points.length / 3);

        for (let i = 0; i < decorationCount; i++) {
            const randomPoint = points[Math.floor(Math.random() * points.length)];
            const offset = new BABYLON.Vector3(
                (Math.random() - 0.5) * this.pathWidth,
                0,
                (Math.random() - 0.5) * this.pathWidth
            );

            // Random chance to add rock or grass
            if (Math.random() < 0.3) {
                this.addRock(randomPoint.add(offset));
            } else {
                this.addGrassTuft(randomPoint.add(offset));
            }
        }
    }

    addRock(position) {
        const size = 0.2 + Math.random() * 0.3;
        const rock = BABYLON.MeshBuilder.CreatePolyhedron('rock', {
            type: Math.floor(Math.random() * 4), // Random rock shape
            size
        }, this.scene);

        rock.position = position;
        rock.rotation = new BABYLON.Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        const rockMaterial = new BABYLON.StandardMaterial('rockMat', this.scene);
        rockMaterial.diffuseColor = new BABYLON.Color3(
            0.4 + Math.random() * 0.2,
            0.4 + Math.random() * 0.2,
            0.4 + Math.random() * 0.2
        );
        rock.material = rockMaterial;
    }

    addGrassTuft(position) {
        const height = 0.2 + Math.random() * 0.3;
        const grass = BABYLON.MeshBuilder.CreateBox('grass', {
            height,
            width: 0.1,
            depth: 0.1
        }, this.scene);

        grass.position = position;
        grass.rotation.y = Math.random() * Math.PI;

        const grassMaterial = new BABYLON.StandardMaterial('grassMat', this.scene);
        grassMaterial.diffuseColor = new BABYLON.Color3(
            0.2 + Math.random() * 0.2,
            0.5 + Math.random() * 0.3,
            0.1 + Math.random() * 0.1
        );
        grass.material = grassMaterial;
    }

    createJunctions() {
        for (let i = 0; i < this.paths.length; i++) {
            for (let j = i + 1; j < this.paths.length; j++) {
                const path1 = this.paths[i];
                const path2 = this.paths[j];

                const bounds1 = path1.getBoundingInfo().boundingBox;
                const bounds2 = path2.getBoundingInfo().boundingBox;

                if (bounds1.intersectsBox(bounds2)) {
                    const center = bounds1.centerWorld.add(bounds2.centerWorld).scale(0.5);
                    const radius = this.pathWidth * 1.5;

                    // Create a flattened area at the junction
                    this.createJunctionArea(center, radius);
                }
            }
        }
    }

    createJunctionArea(center, radius) {
        // Create a flattened circular area
        const junction = BABYLON.MeshBuilder.CreateDisc('junction', {
            radius,
            tessellation: 32
        }, this.scene);

        junction.position = new BABYLON.Vector3(
            center.x,
            BowlCreator.getTerrainHeight(center.x, center.z) + this.pathHeight,
            center.z
        );
        junction.rotation.x = Math.PI / 2;

        // Use the same material as paths
        junction.material = this.createDirtPathMaterial();

        this.junctions.push(junction);
    }

    clearRoads() {
        [...this.paths, ...this.junctions].forEach(mesh => {
            if (mesh && mesh.dispose) {
                mesh.dispose();
            }
        });
        this.paths = [];
        this.junctions = [];
    }

    createMinimumSpanningTree(houses) {
        const connections = [];
        const connected = new Set([0]);

        while (connected.size < houses.length) {
            let minDist = Infinity;
            let bestConnection = null;

            connected.forEach(connectedIdx => {
                for (let i = 0; i < houses.length; i++) {
                    if (connected.has(i)) continue;

                    const dist = BABYLON.Vector3.Distance(
                        houses[connectedIdx].position,
                        houses[i].position
                    );

                    if (dist < minDist) {
                        minDist = dist;
                        bestConnection = [houses[connectedIdx], houses[i], i];
                    }
                }
            });

            if (bestConnection) {
                connections.push([bestConnection[0], bestConnection[1]]);
                connected.add(bestConnection[2]);
            }
        }

        return connections;
    }
}
