/**
 * RoadNetworkSystem.js
 * Creates a visual road network connecting houses and important locations
 */

import { BowlCreator } from './BowlCreator.js';
import { AssetManager } from '../assets/AssetManager.js';

export class RoadNetworkSystem {
    constructor(scene) {
        this.scene = scene;
        this.roads = [];
        this.roadSegments = [];
        this.intersections = [];
        this.roadWidth = 3; // Width of roads in meters
        this.roadMaterial = null;
        
        // Road network configuration
        this.config = {
            mainRoadWidth: 4,
            secondaryRoadWidth: 3,
            residentialRoadWidth: 2.5,
            intersectionRadius: 4,
            curveSegments: 8, // For smooth curves
            roadHeight: 0.05, // Slight elevation above terrain
            sidewalkWidth: 0.5,
            sidewalkHeight: 0.1
        };
        
        this.createRoadMaterial();
    }
    
    /**
     * Create road material with realistic appearance
     */
    createRoadMaterial() {
        this.roadMaterial = new BABYLON.StandardMaterial("roadMaterial", this.scene);
        this.roadMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Dark gray
        this.roadMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Low specular
        this.roadMaterial.specularPower = 16;
        
        // Try to use road texture if available
        const roadTexture = AssetManager.getTexture('ROAD', this.scene);
        if (roadTexture) {
            roadTexture.uScale = 2;
            roadTexture.vScale = 10;
            this.roadMaterial.diffuseTexture = roadTexture;
        }
        
        // Create sidewalk material
        this.sidewalkMaterial = new BABYLON.StandardMaterial("sidewalkMaterial", this.scene);
        this.sidewalkMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4); // Light gray
        this.sidewalkMaterial.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        this.sidewalkMaterial.specularPower = 32;
    }
    
    /**
     * Generate road network connecting houses and important locations
     * @param {Array} housePositions - Array of house positions
     * @param {BABYLON.Vector3} plazaCenter - Center of the plaza
     * @param {Array} commercialAreas - Array of commercial area positions
     */
    generateRoadNetwork(housePositions, plazaCenter, commercialAreas = []) {
        console.log(`Generating road network for ${housePositions.length} houses`);
        
        // Clear existing roads
        this.clearRoads();
        
        // Create main roads from plaza to cardinal directions
        this.createMainRoads(plazaCenter);
        
        // Create ring road around residential area
        this.createRingRoad(plazaCenter, 45);
        
        // Create residential roads connecting houses
        this.createResidentialRoads(housePositions, plazaCenter);
        
        // Connect commercial areas
        this.connectCommercialAreas(commercialAreas, plazaCenter);
        
        // Create intersections at road crossings
        this.createIntersections();
        
        // Add road markings and details
        this.addRoadDetails();
        
        console.log(`Created ${this.roadSegments.length} road segments and ${this.intersections.length} intersections`);
    }
    
    /**
     * Create main roads from plaza center to cardinal directions
     * @param {BABYLON.Vector3} plazaCenter - Center of the plaza
     */
    createMainRoads(plazaCenter) {
        const mainRoadLength = 80;
        const directions = [
            { x: 1, z: 0, name: 'East Main Road' },
            { x: -1, z: 0, name: 'West Main Road' },
            { x: 0, z: 1, name: 'North Main Road' },
            { x: 0, z: -1, name: 'South Main Road' }
        ];
        
        directions.forEach(dir => {
            const startPos = new BABYLON.Vector3(
                plazaCenter.x + dir.x * 20, // Start outside plaza
                plazaCenter.y,
                plazaCenter.z + dir.z * 20
            );
            
            const endPos = new BABYLON.Vector3(
                plazaCenter.x + dir.x * mainRoadLength,
                plazaCenter.y,
                plazaCenter.z + dir.z * mainRoadLength
            );
            
            this.createStraightRoad(startPos, endPos, this.config.mainRoadWidth, 'main', dir.name);
        });
    }
    
    /**
     * Create ring road around residential area
     * @param {BABYLON.Vector3} center - Center of the ring
     * @param {number} radius - Radius of the ring road
     */
    createRingRoad(center, radius) {
        const segments = 32; // Number of segments for smooth circle
        const points = [];
        
        // Generate circle points
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = center.x + Math.cos(angle) * radius;
            const z = center.z + Math.sin(angle) * radius;
            const y = BowlCreator.getTerrainHeight(x, z);
            
            points.push(new BABYLON.Vector3(x, y, z));
        }
        
        // Create road segments between points
        for (let i = 0; i < points.length - 1; i++) {
            this.createStraightRoad(
                points[i], 
                points[i + 1], 
                this.config.secondaryRoadWidth, 
                'ring', 
                `Ring Road Segment ${i}`
            );
        }
    }
    
    /**
     * Create residential roads connecting houses
     * @param {Array} housePositions - Array of house positions
     * @param {BABYLON.Vector3} plazaCenter - Center of the plaza
     */
    createResidentialRoads(housePositions, plazaCenter) {
        // Group houses by proximity to create neighborhood clusters
        const neighborhoods = this.groupHousesByProximity(housePositions, 25);
        
        neighborhoods.forEach((houses, index) => {
            this.createNeighborhoodRoads(houses, plazaCenter, index);
        });
        
        // Connect isolated houses to nearest road
        this.connectIsolatedHouses(housePositions);
    }
    
    /**
     * Group houses by proximity to create neighborhoods
     * @param {Array} housePositions - Array of house positions
     * @param {number} maxDistance - Maximum distance for grouping
     * @returns {Array} - Array of house groups
     */
    groupHousesByProximity(housePositions, maxDistance) {
        const neighborhoods = [];
        const processed = new Set();
        
        housePositions.forEach((house, index) => {
            if (processed.has(index)) return;
            
            const neighborhood = [house];
            processed.add(index);
            
            // Find nearby houses
            housePositions.forEach((otherHouse, otherIndex) => {
                if (processed.has(otherIndex)) return;
                
                const distance = BABYLON.Vector3.Distance(house.position, otherHouse.position);
                if (distance <= maxDistance) {
                    neighborhood.push(otherHouse);
                    processed.add(otherIndex);
                }
            });
            
            neighborhoods.push(neighborhood);
        });
        
        return neighborhoods;
    }
    
    /**
     * Create roads within a neighborhood
     * @param {Array} houses - Houses in the neighborhood
     * @param {BABYLON.Vector3} plazaCenter - Center of the plaza
     * @param {number} neighborhoodIndex - Index of the neighborhood
     */
    createNeighborhoodRoads(houses, plazaCenter, neighborhoodIndex) {
        if (houses.length < 2) return;
        
        // Find neighborhood center
        const neighborhoodCenter = this.calculateCenterPoint(houses.map(h => h.position));
        
        // Create main neighborhood road connecting to ring road
        const ringRoadConnection = this.findNearestRingRoadPoint(neighborhoodCenter);
        if (ringRoadConnection) {
            this.createStraightRoad(
                neighborhoodCenter,
                ringRoadConnection,
                this.config.secondaryRoadWidth,
                'neighborhood_main',
                `Neighborhood ${neighborhoodIndex} Main Road`
            );
        }
        
        // Create residential streets connecting houses
        this.createResidentialStreets(houses, neighborhoodCenter);
    }
    
    /**
     * Create residential streets connecting houses within a neighborhood
     * @param {Array} houses - Houses to connect
     * @param {BABYLON.Vector3} center - Neighborhood center
     */
    createResidentialStreets(houses, center) {
        // Create a simple star pattern from center to houses
        houses.forEach((house, index) => {
            // Create road from neighborhood center towards house
            const direction = house.position.subtract(center).normalize();
            const roadEnd = center.add(direction.scale(
                BABYLON.Vector3.Distance(center, house.position) * 0.8
            ));
            
            this.createStraightRoad(
                center,
                roadEnd,
                this.config.residentialRoadWidth,
                'residential',
                `Residential Street ${index}`
            );
            
            // Create short driveway to house
            this.createDriveway(roadEnd, house.position);
        });
        
        // Connect nearby houses with cross streets
        this.createCrossStreets(houses);
    }
    
    /**
     * Create cross streets between nearby houses
     * @param {Array} houses - Houses to potentially connect
     */
    createCrossStreets(houses) {
        for (let i = 0; i < houses.length; i++) {
            for (let j = i + 1; j < houses.length; j++) {
                const distance = BABYLON.Vector3.Distance(houses[i].position, houses[j].position);
                
                // Create cross street if houses are reasonably close
                if (distance < 20 && distance > 8) {
                    // Check if there's a clear path (no other houses in between)
                    if (this.isClearPath(houses[i].position, houses[j].position, houses)) {
                        this.createStraightRoad(
                            houses[i].position,
                            houses[j].position,
                            this.config.residentialRoadWidth,
                            'cross_street',
                            `Cross Street ${i}-${j}`
                        );
                    }
                }
            }
        }
    }
    
    /**
     * Create a driveway connecting house to road
     * @param {BABYLON.Vector3} roadPoint - Point on the road
     * @param {BABYLON.Vector3} housePosition - Position of the house
     */
    createDriveway(roadPoint, housePosition) {
        const distance = BABYLON.Vector3.Distance(roadPoint, housePosition);
        
        // Only create driveway if house is not too close to road
        if (distance > 3) {
            this.createStraightRoad(
                roadPoint,
                housePosition,
                1.5, // Narrow driveway
                'driveway',
                'Driveway'
            );
        }
    }
    
    /**
     * Check if there's a clear path between two points
     * @param {BABYLON.Vector3} start - Start position
     * @param {BABYLON.Vector3} end - End position
     * @param {Array} obstacles - Array of obstacle positions
     * @returns {boolean} - Whether path is clear
     */
    isClearPath(start, end, obstacles) {
        const direction = end.subtract(start);
        const distance = direction.length();
        direction.normalize();
        
        // Check points along the path
        const checkPoints = Math.floor(distance / 2);
        for (let i = 1; i < checkPoints; i++) {
            const checkPoint = start.add(direction.scale(i * 2));
            
            // Check if any obstacle is too close to this point
            for (const obstacle of obstacles) {
                if (obstacle.position !== start && obstacle.position !== end) {
                    const obstacleDistance = BABYLON.Vector3.Distance(checkPoint, obstacle.position);
                    if (obstacleDistance < 4) { // Too close to house
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    /**
     * Connect isolated houses to the nearest road
     * @param {Array} housePositions - All house positions
     */
    connectIsolatedHouses(housePositions) {
        housePositions.forEach(house => {
            // Check if house is already connected (has nearby road)
            const nearestRoad = this.findNearestRoadPoint(house.position);
            const distance = nearestRoad ? BABYLON.Vector3.Distance(house.position, nearestRoad) : Infinity;
            
            // If house is too far from any road, connect it
            if (distance > 8) {
                const connectionPoint = this.findBestConnectionPoint(house.position);
                if (connectionPoint) {
                    this.createStraightRoad(
                        house.position,
                        connectionPoint,
                        this.config.residentialRoadWidth,
                        'connection',
                        'House Connection'
                    );
                }
            }
        });
    }
    
    /**
     * Connect commercial areas to the road network
     * @param {Array} commercialAreas - Array of commercial area positions
     * @param {BABYLON.Vector3} plazaCenter - Center of the plaza
     */
    connectCommercialAreas(commercialAreas, plazaCenter) {
        commercialAreas.forEach((area, index) => {
            // Connect to nearest main road
            const nearestMainRoad = this.findNearestMainRoadPoint(area.center);
            if (nearestMainRoad) {
                this.createStraightRoad(
                    area.center,
                    nearestMainRoad,
                    this.config.secondaryRoadWidth,
                    'commercial',
                    `Commercial Access ${index}`
                );
            }
        });
    }
    
    /**
     * Create a straight road between two points
     * @param {BABYLON.Vector3} start - Start position
     * @param {BABYLON.Vector3} end - End position
     * @param {number} width - Width of the road
     * @param {string} type - Type of road
     * @param {string} name - Name of the road
     */
    createStraightRoad(start, end, width, type, name) {
        const distance = BABYLON.Vector3.Distance(start, end);
        if (distance < 1) return; // Too short to create road
        
        // Calculate road direction and position
        const direction = end.subtract(start).normalize();
        const center = BABYLON.Vector3.Lerp(start, end, 0.5);
        center.y = (start.y + end.y) / 2 + this.config.roadHeight;
        
        // Create road mesh
        const road = BABYLON.MeshBuilder.CreateBox(`road_${name}`, {
            width: width,
            height: 0.1,
            depth: distance
        }, this.scene);
        
        road.position = center;
        
        // Calculate rotation to align with direction
        const angle = Math.atan2(direction.x, direction.z);
        road.rotation.y = angle;
        
        // Apply road material
        road.material = this.roadMaterial;
        road.receiveShadows = true;
        
        // Create sidewalks for main and secondary roads
        if (type === 'main' || type === 'secondary') {
            this.createSidewalks(center, direction, distance, width, angle);
        }
        
        // Store road information
        const roadInfo = {
            mesh: road,
            start: start.clone(),
            end: end.clone(),
            center: center.clone(),
            width: width,
            type: type,
            name: name,
            direction: direction.clone()
        };
        
        this.roads.push(roadInfo);
        this.roadSegments.push(road);
    }
    
    /**
     * Create sidewalks along a road
     * @param {BABYLON.Vector3} center - Center of the road
     * @param {BABYLON.Vector3} direction - Direction of the road
     * @param {number} length - Length of the road
     * @param {number} roadWidth - Width of the road
     * @param {number} angle - Rotation angle of the road
     */
    createSidewalks(center, direction, length, roadWidth, angle) {
        const sidewalkOffset = (roadWidth + this.config.sidewalkWidth) / 2;
        const perpendicular = new BABYLON.Vector3(-direction.z, 0, direction.x);
        
        // Create sidewalks on both sides
        [-1, 1].forEach(side => {
            const sidewalkCenter = center.add(perpendicular.scale(sidewalkOffset * side));
            sidewalkCenter.y += this.config.sidewalkHeight;
            
            const sidewalk = BABYLON.MeshBuilder.CreateBox(`sidewalk_${center.x}_${center.z}_${side}`, {
                width: this.config.sidewalkWidth,
                height: this.config.sidewalkHeight,
                depth: length
            }, this.scene);
            
            sidewalk.position = sidewalkCenter;
            sidewalk.rotation.y = angle;
            sidewalk.material = this.sidewalkMaterial;
            sidewalk.receiveShadows = true;
            
            this.roadSegments.push(sidewalk);
        });
    }
    
    /**
     * Create intersections at road crossings
     */
    createIntersections() {
        const intersectionPoints = this.findIntersectionPoints();
        
        intersectionPoints.forEach((point, index) => {
            const intersection = BABYLON.MeshBuilder.CreateCylinder(`intersection_${index}`, {
                height: 0.12,
                diameter: this.config.intersectionRadius * 2,
                tessellation: 16
            }, this.scene);
            
            intersection.position = point;
            intersection.position.y += this.config.roadHeight + 0.01;
            intersection.material = this.roadMaterial;
            intersection.receiveShadows = true;
            
            this.intersections.push(intersection);
        });
    }
    
    /**
     * Find intersection points where roads cross
     * @returns {Array} - Array of intersection points
     */
    findIntersectionPoints() {
        const intersections = [];
        const tolerance = 5; // Distance tolerance for intersection detection
        
        // Check all road combinations for intersections
        for (let i = 0; i < this.roads.length; i++) {
            for (let j = i + 1; j < this.roads.length; j++) {
                const road1 = this.roads[i];
                const road2 = this.roads[j];
                
                // Skip if roads are too similar (parallel or same)
                if (this.areRoadsParallel(road1, road2)) continue;
                
                // Find intersection point
                const intersection = this.findRoadIntersection(road1, road2, tolerance);
                if (intersection) {
                    intersections.push(intersection);
                }
            }
        }
        
        return intersections;
    }
    
    /**
     * Check if two roads are parallel
     * @param {Object} road1 - First road
     * @param {Object} road2 - Second road
     * @returns {boolean} - Whether roads are parallel
     */
    areRoadsParallel(road1, road2) {
        const dot = BABYLON.Vector3.Dot(road1.direction, road2.direction);
        return Math.abs(dot) > 0.9; // Nearly parallel
    }
    
    /**
     * Find intersection point between two roads
     * @param {Object} road1 - First road
     * @param {Object} road2 - Second road
     * @param {number} tolerance - Distance tolerance
     * @returns {BABYLON.Vector3|null} - Intersection point or null
     */
    findRoadIntersection(road1, road2, tolerance) {
        // Simplified intersection detection - check if road centers are close
        const distance = BABYLON.Vector3.Distance(road1.center, road2.center);
        
        if (distance < tolerance) {
            // Return average position as intersection
            return BABYLON.Vector3.Lerp(road1.center, road2.center, 0.5);
        }
        
        return null;
    }
    
    /**
     * Add road markings and details
     */
    addRoadDetails() {
        // Add road markings to main roads
        this.roads.forEach(road => {
            if (road.type === 'main' || road.type === 'secondary') {
                this.addRoadMarkings(road);
            }
        });
    }
    
    /**
     * Add road markings to a road
     * @param {Object} road - Road to add markings to
     */
    addRoadMarkings(road) {
        const markingCount = Math.floor(BABYLON.Vector3.Distance(road.start, road.end) / 4);
        
        for (let i = 0; i < markingCount; i++) {
            const t = (i + 0.5) / markingCount;
            const position = BABYLON.Vector3.Lerp(road.start, road.end, t);
            position.y += this.config.roadHeight + 0.01;
            
            const marking = BABYLON.MeshBuilder.CreateBox(`marking_${road.name}_${i}`, {
                width: 0.2,
                height: 0.01,
                depth: 1
            }, this.scene);
            
            marking.position = position;
            marking.rotation.y = Math.atan2(road.direction.x, road.direction.z);
            
            const markingMaterial = new BABYLON.StandardMaterial(`markingMat_${i}`, this.scene);
            markingMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0.8); // Yellow-white
            markingMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.05);
            marking.material = markingMaterial;
            
            this.roadSegments.push(marking);
        }
    }
    
    /**
     * Helper methods for finding nearest points
     */
    
    calculateCenterPoint(positions) {
        const sum = positions.reduce((acc, pos) => acc.add(pos), BABYLON.Vector3.Zero());
        return sum.scale(1 / positions.length);
    }
    
    findNearestRingRoadPoint(position) {
        // Find nearest point on the ring road (simplified)
        const ringCenter = new BABYLON.Vector3(0, 0, 0);
        const ringRadius = 45;
        
        const direction = position.subtract(ringCenter).normalize();
        const ringPoint = ringCenter.add(direction.scale(ringRadius));
        ringPoint.y = BowlCreator.getTerrainHeight(ringPoint.x, ringPoint.z);
        
        return ringPoint;
    }
    
    findNearestRoadPoint(position) {
        let nearest = null;
        let minDistance = Infinity;
        
        this.roads.forEach(road => {
            const distance = BABYLON.Vector3.Distance(position, road.center);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = road.center;
            }
        });
        
        return nearest;
    }
    
    findNearestMainRoadPoint(position) {
        let nearest = null;
        let minDistance = Infinity;
        
        this.roads.forEach(road => {
            if (road.type === 'main') {
                const distance = BABYLON.Vector3.Distance(position, road.center);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = road.center;
                }
            }
        });
        
        return nearest;
    }
    
    findBestConnectionPoint(position) {
        // Find the best point to connect an isolated house
        return this.findNearestRoadPoint(position) || this.findNearestRingRoadPoint(position);
    }
    
    /**
     * Clear all existing roads
     */
    clearRoads() {
        this.roadSegments.forEach(segment => {
            if (segment && segment.dispose) {
                segment.dispose();
            }
        });
        
        this.intersections.forEach(intersection => {
            if (intersection && intersection.dispose) {
                intersection.dispose();
            }
        });
        
        this.roads = [];
        this.roadSegments = [];
        this.intersections = [];
    }
    
    /**
     * Get debug information about the road network
     * @returns {Object} - Debug information
     */
    getDebugInfo() {
        return {
            totalRoads: this.roads.length,
            roadTypes: this.roads.reduce((acc, road) => {
                acc[road.type] = (acc[road.type] || 0) + 1;
                return acc;
            }, {}),
            totalIntersections: this.intersections.length,
            totalRoadSegments: this.roadSegments.length
        };
    }
    
    /**
     * Dispose of the road network system
     */
    dispose() {
        this.clearRoads();
        
        if (this.roadMaterial) {
            this.roadMaterial.dispose();
        }
        
        if (this.sidewalkMaterial) {
            this.sidewalkMaterial.dispose();
        }
    }
}