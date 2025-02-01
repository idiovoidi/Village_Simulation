import { BowlCreator } from './BowlCreator.js';
import { AssetManager } from '../assets/AssetManager.js';

export class RoadSystem {
    constructor(scene) {
        if (!scene) {
            throw new Error("Scene is required for RoadSystem");
        }
        this.scene = scene;
        this.roads = [];         // Array to store all road segments
        this.roadWidth = 4;      // Width of the roads
        this.roadHeight = 0.2;   // Height of the roads
        this.junctions = [];     // Array to store road junctions
    }

    createRoadNetwork(houses) {
        // Clear any existing roads and junctions
        this.clearRoads();
        
        // Create a minimum spanning tree of connections
        const connections = this.createMinimumSpanningTree(houses);

        // Create road segments for each connection
        connections.forEach(([house1, house2]) => {
            const road = this.createRoadSegment(
                house1.position,
                house2.position
            );
            this.roads.push(road);
        });

        // Create road intersections
        this.createJunctions();
    }

    clearRoads() {
        // Dispose of existing roads and junctions
        [...this.roads, ...this.junctions].forEach(mesh => {
            if (mesh && mesh.dispose) {
                mesh.dispose();
            }
        });
        this.roads = [];
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

    createRoadSegment(start, end) {
        // Calculate road properties
        const distance = BABYLON.Vector3.Distance(start, end);
        const direction = end.subtract(start).normalize();
        const midPoint = start.add(end.subtract(start).scale(0.5));
        
        // Create road mesh
        const road = BABYLON.MeshBuilder.CreateBox("road", {
            width: distance,
            height: this.roadHeight,
            depth: this.roadWidth
        }, this.scene);

        // Position and rotate road
        road.position = midPoint;
        
        // Calculate rotation to align road between points
        const angle = Math.atan2(direction.z, direction.x);
        road.rotation.y = angle;

        // Get terrain heights and adjust road height
        const y1 = BowlCreator.getTerrainHeight(start.x, start.z);
        const y2 = BowlCreator.getTerrainHeight(end.x, end.z);
        road.position.y = (y1 + y2) / 2 + this.roadHeight;

        // Create and apply road material
        const roadMaterial = this.createRoadMaterial(distance);
        road.material = roadMaterial;

        // Add road markings
        this.addRoadMarkings(road, distance);

        // Add physics
        new BABYLON.PhysicsAggregate(
            road,
            BABYLON.PhysicsShapeType.BOX,
            { mass: 0, restitution: 0.3, friction: 1.0 },
            this.scene
        );

        return road;
    }

    createRoadMaterial(distance) {
        const material = new BABYLON.StandardMaterial("roadMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Lighter gray
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        
        // Use road textures from AssetManager
        material.diffuseTexture = AssetManager.getTexture('ROAD_DIFFUSE', this.scene);
        material.bumpTexture = AssetManager.getTexture('ROAD_NORMAL', this.scene);
        
        if (material.diffuseTexture) {
            material.diffuseTexture.uScale = 2;
            material.diffuseTexture.vScale = distance / this.roadWidth;
        }
        
        if (material.bumpTexture) {
            material.bumpTexture.uScale = 2;
            material.bumpTexture.vScale = distance / this.roadWidth;
        }
        
        return material;
    }

    addRoadMarkings(road, length) {
        const markingLength = 1;
        const markingGap = 2;
        const markingsCount = Math.floor(length / (markingLength + markingGap));
        
        for (let i = 0; i < markingsCount; i++) {
            const marking = BABYLON.MeshBuilder.CreateBox("marking", {
                width: markingLength,
                height: 0.05,
                depth: 0.2
            }, this.scene);

            const offset = (i * (markingLength + markingGap)) - (length / 2);
            marking.parent = road;
            marking.position.x = offset;
            marking.position.y = 0.05;

            const markingMaterial = new BABYLON.StandardMaterial("markingMat", this.scene);
            markingMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
            markingMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            marking.material = markingMaterial;
        }
    }

    createJunctions() {
        for (let i = 0; i < this.roads.length; i++) {
            for (let j = i + 1; j < this.roads.length; j++) {
                const road1 = this.roads[i];
                const road2 = this.roads[j];
                
                const bounds1 = road1.getBoundingInfo().boundingBox;
                const bounds2 = road2.getBoundingInfo().boundingBox;
                
                if (bounds1.intersectsBox(bounds2)) {
                    const center = bounds1.centerWorld.add(bounds2.centerWorld).scale(0.5);
                    const radius = Math.max(road1.scaling.z, road2.scaling.z) * 1.5;
                    
                    const junction = BABYLON.MeshBuilder.CreateCylinder("junction", {
                        height: this.roadHeight,
                        diameter: radius * 2
                    }, this.scene);
                    
                    junction.position = center;
                    junction.material = road1.material;
                    
                    // Add physics to junction
                    new BABYLON.PhysicsAggregate(
                        junction,
                        BABYLON.PhysicsShapeType.CYLINDER,
                        { mass: 0, restitution: 0.3, friction: 1.0 },
                        this.scene
                    );
                    
                    this.junctions.push(junction);
                }
            }
        }
    }
} 