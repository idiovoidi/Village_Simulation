/**
 * CityLayoutManager.js
 * Manages realistic city layout with proper zoning, collision detection, and logical placement
 */

import { BowlCreator } from './BowlCreator.js';

export class CityLayoutManager {
    constructor(scene) {
        this.scene = scene;
        this.cityCenter = new BABYLON.Vector3(0, 0, 0);
        this.cityRadius = 80;

        // Define city zones with realistic urban planning
        this.zones = {
            plaza: { center: this.cityCenter, radius: 16, priority: 1 },
            residential: { rings: [], priority: 3 },
            commercial: { areas: [], priority: 2 },
            parks: { areas: [], priority: 4 },
            gardens: { areas: [], priority: 5 },
            roads: { paths: [], priority: 1 }
        };

        // Collision detection grid for preventing overlaps
        this.occupancyGrid = new Map();
        this.gridSize = 2; // 2x2 meter grid cells

        // Track all placed objects for collision detection
        this.placedObjects = [];

        this.initializeCityZones();
    }

    /**
     * Initialize city zones with realistic urban planning
     */
    initializeCityZones() {
        // Define residential rings around the city center
        this.zones.residential.rings = [
            { center: this.cityCenter, innerRadius: 25, outerRadius: 45, density: 0.7 },
            { center: this.cityCenter, innerRadius: 45, outerRadius: 65, density: 0.5 },
            { center: this.cityCenter, innerRadius: 65, outerRadius: 80, density: 0.3 }
        ];

        // Define commercial areas (market districts)
        this.zones.commercial.areas = [
            {
                center: new BABYLON.Vector3(20, 0, 15),
                radius: 12,
                type: 'market'
            },
            {
                center: new BABYLON.Vector3(-18, 0, 20),
                radius: 8,
                type: 'shops'
            }
        ];

        // Define park areas (larger green spaces)
        this.zones.parks.areas = [
            {
                center: new BABYLON.Vector3(-25, 0, -25),
                radius: 15,
                type: 'community_park'
            },
            {
                center: new BABYLON.Vector3(30, 0, -20),
                radius: 10,
                type: 'memorial_garden'
            }
        ];

        // Define garden areas (smaller decorative spaces)
        this.zones.gardens.areas = [
            // Corner gardens at plaza entrances
            { center: new BABYLON.Vector3(22, 0, 0), radius: 6, type: 'entrance_garden' },
            { center: new BABYLON.Vector3(-22, 0, 0), radius: 6, type: 'entrance_garden' },
            { center: new BABYLON.Vector3(0, 0, 22), radius: 6, type: 'entrance_garden' },
            { center: new BABYLON.Vector3(0, 0, -22), radius: 6, type: 'entrance_garden' },

            // Residential pocket gardens
            { center: new BABYLON.Vector3(35, 0, 35), radius: 4, type: 'pocket_garden' },
            { center: new BABYLON.Vector3(-35, 0, 35), radius: 4, type: 'pocket_garden' },
            { center: new BABYLON.Vector3(35, 0, -35), radius: 4, type: 'pocket_garden' },
            { center: new BABYLON.Vector3(-35, 0, -35), radius: 4, type: 'pocket_garden' }
        ];

        // Define main roads connecting different areas
        this.zones.roads.paths = [
            // Main cross roads through plaza
            {
                start: new BABYLON.Vector3(-80, 0, 0),
                end: new BABYLON.Vector3(80, 0, 0),
                width: 6,
                type: 'main_road'
            },
            {
                start: new BABYLON.Vector3(0, 0, -80),
                end: new BABYLON.Vector3(0, 0, 80),
                width: 6,
                type: 'main_road'
            },

            // Circular road around residential area
            {
                center: this.cityCenter,
                radius: 50,
                width: 4,
                type: 'ring_road'
            }
        ];
    }

    /**
     * Check if a position is available for placement
     * @param {BABYLON.Vector3} position - Position to check
     * @param {number} radius - Radius of object to place
     * @param {string} type - Type of object being placed
     * @returns {boolean} - Whether position is available
     */
    isPositionAvailable(position, radius, type = 'default') {
        // Check against plaza (highest priority)
        const distToPlaza = BABYLON.Vector3.Distance(position, this.zones.plaza.center);
        if (distToPlaza < this.zones.plaza.radius + radius + 2) {
            return false; // Too close to plaza
        }

        // Check against existing objects
        for (const obj of this.placedObjects) {
            const distance = BABYLON.Vector3.Distance(position, obj.position);
            const minDistance = obj.radius + radius + this.getMinSeparation(obj.type, type);

            if (distance < minDistance) {
                return false; // Too close to existing object
            }
        }

        // Check occupancy grid
        let isAvailable = true;
        this._forEachGridCell(position, radius, key => {
            if (!isAvailable) return;
            if (this.occupancyGrid.has(key)) {
                const existing = this.occupancyGrid.get(key);
                if (existing.type !== type || this.getMinSeparation(existing.type, type) > 0) {
                    isAvailable = false;
                }
            }
        });

        return isAvailable;
    }

    /**
     * Helper: Iterate over grid cells within radius of a position
     * @param {BABYLON.Vector3} position - Center position
     * @param {number} radius - Radius to iterate
     * @param {Function} callback - Called for each grid key
     * @private
     */
    _forEachGridCell(position, radius, callback) {
        const gridX = Math.floor(position.x / this.gridSize);
        const gridZ = Math.floor(position.z / this.gridSize);
        const gridRadius = Math.ceil(radius / this.gridSize);

        for (let x = gridX - gridRadius; x <= gridX + gridRadius; x++) {
            for (let z = gridZ - gridRadius; z <= gridZ + gridRadius; z++) {
                callback(`${x},${z}`);
            }
        }
    }

    /**
     * Helper: Generate position from polar coordinates with terrain height
     * @param {BABYLON.Vector3} center - Center point
     * @param {number} angle - Angle in radians
     * @param {number} radius - Distance from center
     * @returns {BABYLON.Vector3} - Position with terrain height
     * @private
     */
    _generatePositionFromPolar(center, angle, radius) {
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius;
        const y = BowlCreator.getTerrainHeight(x, z);
        return new BABYLON.Vector3(x, y, z);
    }

    /**
     * Get minimum separation distance between different object types
     * @param {string} type1 - First object type
     * @param {string} type2 - Second object type
     * @returns {number} - Minimum separation in meters
     */
    getMinSeparation(type1, type2) {
        const separationRules = {
            'house': { 'house': 8, 'garden': 3, 'tree': 4, 'default': 2 },
            'garden': { 'house': 3, 'garden': 5, 'tree': 2, 'fountain': 8, 'default': 1 },
            'tree': { 'house': 4, 'garden': 2, 'tree': 6, 'default': 3 },
            'fountain': { 'garden': 8, 'house': 10, 'default': 5 },
            'default': { 'default': 1 }
        };

        return separationRules[type1]?.[type2] || separationRules[type1]?.['default'] || 1;
    }

    /**
     * Reserve a position in the occupancy grid
     * @param {BABYLON.Vector3} position - Position to reserve
     * @param {number} radius - Radius of object
     * @param {string} type - Type of object
     */
    reservePosition(position, radius, type) {
        this._forEachGridCell(position, radius, key => {
            this.occupancyGrid.set(key, { type, position, radius });
        });

        this.placedObjects.push({ position: position.clone(), radius, type });
    }

    /**
     * Get valid positions for a specific zone type
     * @param {string} zoneType - Type of zone ('residential', 'commercial', 'parks', 'gardens')
     * @param {number} objectRadius - Radius of object to place
     * @param {string} objectType - Type of object being placed
     * @returns {Array} - Array of valid positions
     */
    getValidPositionsForZone(zoneType, objectRadius, objectType) {
        const validPositions = [];
        const zone = this.zones[zoneType];

        if (!zone) return validPositions;

        switch (zoneType) {
            case 'residential':
                for (const ring of zone.rings) {
                    const positions = this.generateRingPositions(ring, objectRadius, objectType);
                    validPositions.push(...positions);
                }
                break;

            case 'commercial':
            case 'parks':
            case 'gardens':
                for (const area of zone.areas) {
                    const positions = this.generateAreaPositions(area, objectRadius, objectType);
                    validPositions.push(...positions);
                }
                break;
        }

        return validPositions;
    }

    /**
     * Generate positions within a ring (for residential areas)
     * @param {Object} ring - Ring definition
     * @param {number} objectRadius - Radius of object to place
     * @param {string} objectType - Type of object
     * @returns {Array} - Array of valid positions
     */
    generateRingPositions(ring, objectRadius, objectType) {
        const positions = [];
        const attempts = Math.floor(ring.density * 50); // Number of placement attempts

        for (let i = 0; i < attempts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = ring.innerRadius + Math.random() * (ring.outerRadius - ring.innerRadius);

            const position = this._generatePositionFromPolar(ring.center, angle, radius);

            if (this.isPositionAvailable(position, objectRadius, objectType)) {
                positions.push(position);
            }
        }

        return positions;
    }

    /**
     * Generate positions within an area (for parks, gardens, commercial)
     * @param {Object} area - Area definition
     * @param {number} objectRadius - Radius of object to place
     * @param {string} objectType - Type of object
     * @returns {Array} - Array of valid positions
     */
    generateAreaPositions(area, objectRadius, objectType) {
        const positions = [];
        const density = area.type === 'entrance_garden' ? 0.8 : 0.6;
        const attempts = Math.floor(density * 20);

        for (let i = 0; i < attempts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * (area.radius - objectRadius);

            const position = this._generatePositionFromPolar(area.center, angle, radius);

            if (this.isPositionAvailable(position, objectRadius, objectType)) {
                positions.push(position);
            }
        }

        return positions;
    }

    /**
     * Place houses with proper urban planning
     * @param {Function} createHouseCallback - Callback function to create house
     * @returns {Array} - Array of placed house positions
     */
    placeHouses(createHouseCallback) {
        const housePositions = [];
        const houseRadius = 4; // Average house radius

        const validPositions = this.getValidPositionsForZone('residential', houseRadius, 'house');

        // Limit number of houses to prevent overcrowding
        const maxHouses = Math.min(15, validPositions.length);

        for (let i = 0; i < maxHouses; i++) {
            const position = validPositions[i];

            // Calculate rotation to face nearest road or plaza
            const rotation = this.calculateOptimalRotation(position);

            // Create house using callback
            const house = createHouseCallback(position, rotation);

            // Reserve position
            this.reservePosition(position, houseRadius, 'house');
            housePositions.push({ position, house, rotation });
        }

        return housePositions;
    }

    /**
     * Place gardens with proper spacing and realistic locations
     * @param {Function} createGardenCallback - Callback function to create garden
     * @returns {Array} - Array of placed garden positions
     */
    placeGardens(createGardenCallback) {
        const gardenPositions = [];
        const gardenRadius = 3;

        const validPositions = this.getValidPositionsForZone('gardens', gardenRadius, 'garden');

        for (const position of validPositions) {
            // Create garden using callback
            const garden = createGardenCallback(position);

            // Reserve position
            this.reservePosition(position, gardenRadius, 'garden');
            gardenPositions.push({ position, garden });
        }

        return gardenPositions;
    }

    /**
     * Place trees and vegetation with natural distribution
     * @param {Function} createTreeCallback - Callback function to create tree
     * @returns {Array} - Array of placed tree positions
     */
    placeTrees(createTreeCallback) {
        const treePositions = [];
        const treeRadius = 2;

        // Place trees in parks
        const parkPositions = this.getValidPositionsForZone('parks', treeRadius, 'tree');

        // Place trees along roads (street trees)
        const streetTreePositions = this.generateStreetTreePositions(treeRadius);

        // Place trees in residential areas (yard trees)
        const residentialTreePositions = this.generateResidentialTreePositions(treeRadius);

        const allPositions = [...parkPositions, ...streetTreePositions, ...residentialTreePositions];

        for (const position of allPositions) {
            // Create tree using callback
            const tree = createTreeCallback(position);

            // Reserve position
            this.reservePosition(position, treeRadius, 'tree');
            treePositions.push({ position, tree });
        }

        return treePositions;
    }

    /**
     * Generate street tree positions along roads
     * @param {number} treeRadius - Radius of trees
     * @returns {Array} - Array of street tree positions
     */
    generateStreetTreePositions(treeRadius) {
        const positions = [];
        const spacing = 12; // Distance between street trees

        for (const road of this.zones.roads.paths) {
            if (road.type === 'ring_road') {
                // Place trees along circular road
                const circumference = 2 * Math.PI * road.radius;
                const treeCount = Math.floor(circumference / spacing);

                for (let i = 0; i < treeCount; i++) {
                    const angle = (i / treeCount) * Math.PI * 2;
                    const offset = road.width / 2 + 3; // Offset from road edge

                    // Trees on both sides of the road
                    for (const side of [-1, 1]) {
                        const radius = road.radius + (offset * side);
                        const position = this._generatePositionFromPolar(road.center, angle, radius);

                        if (this.isPositionAvailable(position, treeRadius, 'tree')) {
                            positions.push(position);
                        }
                    }
                }
            }
        }

        return positions;
    }

    /**
     * Generate residential tree positions (yard trees)
     * @param {number} treeRadius - Radius of trees
     * @returns {Array} - Array of residential tree positions
     */
    generateResidentialTreePositions(treeRadius) {
        const positions = [];

        // Place trees near houses but not too close
        for (const obj of this.placedObjects) {
            if (obj.type === 'house') {
                // Try to place 1-2 trees per house
                const treeCount = Math.floor(Math.random() * 2) + 1;

                for (let i = 0; i < treeCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 8 + Math.random() * 4; // 8-12 meters from house

                    const position = this._generatePositionFromPolar(obj.position, angle, distance);

                    if (this.isPositionAvailable(position, treeRadius, 'tree')) {
                        positions.push(position);
                    }
                }
            }
        }

        return positions;
    }

    /**
     * Calculate optimal rotation for a building to face roads or plaza
     * @param {BABYLON.Vector3} position - Building position
     * @returns {number} - Optimal rotation in radians
     */
    calculateOptimalRotation(position) {
        // Default: face toward plaza
        const toPlaza = this.zones.plaza.center.subtract(position);
        return Math.atan2(toPlaza.x, toPlaza.z);
    }

    /**
     * Get debug information about city layout
     * @returns {Object} - Debug information
     */
    getDebugInfo() {
        return {
            totalObjects: this.placedObjects.length,
            occupiedGridCells: this.occupancyGrid.size,
            zones: Object.keys(this.zones).map(key => ({
                name: key,
                areas: this.zones[key].areas?.length || this.zones[key].rings?.length || 1
            }))
        };
    }

    /**
     * Clear all placed objects and reset the layout
     */
    reset() {
        this.placedObjects = [];
        this.occupancyGrid.clear();
    }

    /**
     * Dispose of the city layout manager
     */
    dispose() {
        this.reset();
    }
}
