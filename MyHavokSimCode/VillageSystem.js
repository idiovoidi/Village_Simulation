import { BowlCreator } from './BowlCreator.js';
import { AssetManager } from '../assets/AssetManager.js';
import { VillageDecorations } from './Village/VillageDecorations.js';
import { MarketSystem } from './Village/MarketSystem.js';
import { HouseModel } from './3D_Models/Houses/HouseModel.js';
import { CityLayoutManager } from './CityLayoutManager.js';
import { RoadNetworkSystem } from './RoadNetworkSystem.js';

export class VillageSystem {
    constructor(scene) {
        this.scene = scene;
        this.houses = [];
        this.villageRadius = 60; // Village radius
        this.centerOffset = new BABYLON.Vector3(0, 0, 0); // Village center position
        this.houseCount = 15; // Number of houses to create
        this.decorations = new VillageDecorations(scene);
        this.marketSystem = new MarketSystem(scene);
        this.houseModel = new HouseModel(scene);

        // Initialize city layout manager for proper urban planning
        this.cityLayout = new CityLayoutManager(scene);

        // Initialize road network system
        this.roadNetwork = new RoadNetworkSystem(scene);

        this.init();
    }

    init() {
        // Set village center for decorations first (plaza and fountain)
        this.decorations.setVillageCenter(this.centerOffset);

        // Reserve plaza area in city layout
        this.cityLayout.reservePosition(this.centerOffset, 16, 'plaza');

        // Create city elements using proper urban planning
        this.createStructuredCity();
    }

    createStructuredCity() {
        // Create houses with proper spacing and urban planning
        const housePositions = this.createHousesWithLayout();

        // Create road network connecting all houses and important locations
        this.createRoadNetwork(housePositions);

        // Create gardens in designated areas (not randomly)
        this.createStructuredGardens();

        // Create market district in designated commercial zone
        this.createMarketDistrict();

        // Add trees and vegetation with natural distribution
        this.addStructuredVegetation();

        // Add decorative elements in appropriate locations
        this.addStructuredDecorations();
    }

    createMarketDistrict() {
        // Create market district to the east of the village center
        const marketCenter = this.centerOffset.clone();
        marketCenter.x += this.villageRadius * 0.4; // Position market district east of center
        marketCenter.z += this.villageRadius * 0.2; // Slightly to the south

        this.marketSystem.createMarketDistrict(marketCenter);
    }

    createHousesWithLayout() {
        // Use city layout manager to place houses properly
        const housePositions = this.cityLayout.placeHouses((position, rotation) => {
            // Create house with random variant
            const variants = ['basic', 'small', 'large'];
            const variant = variants[Math.floor(Math.random() * variants.length)];

            const adjustedPosition = position.clone();
            adjustedPosition.y += 0.2; // Slight elevation above ground

            const house = this.houseModel.createHouse(adjustedPosition, rotation, variant);
            this.houses.push(house);

            // Add appropriate decorations around the house
            this.addStructuredHouseDecorations(house, variant, position);

            return house;
        });

        console.log(`Placed ${housePositions.length} houses with proper urban planning`);
        return housePositions; // Return positions for road network generation
    }

    /**
     * Create road network connecting houses and important locations
     * @param {Array} housePositions - Array of house position data
     */
    createRoadNetwork(housePositions) {
        // Get commercial areas from market system
        const commercialAreas = [];
        if (this.marketSystem && this.marketSystem.marketCenter) {
            commercialAreas.push({
                center: this.marketSystem.marketCenter,
                radius: 12,
                type: 'market'
            });
        }

        // Generate the road network
        this.roadNetwork.generateRoadNetwork(
            housePositions,
            this.centerOffset, // Plaza center
            commercialAreas
        );

        console.log('Road network created:', this.roadNetwork.getDebugInfo());
    }

    createStructuredGardens() {
        // Use city layout manager to place gardens in designated areas
        const gardenPositions = this.cityLayout.placeGardens(position => this.decorations.createStructuredGarden(position));

        console.log(`Created ${gardenPositions.length} structured gardens`);
    }

    addStructuredHouseDecorations(house, variant, housePosition) {
        // Add decorations with proper spacing and collision detection
        const decorationCount = Math.floor(Math.random() * 2) + 1;
        const houseWidth = variant === 'large' ? 7 : variant === 'small' ? 3.5 : 5;
        const minDistance = houseWidth / 2 + 1; // Minimum distance from house center
        const maxDistance = houseWidth / 2 + 3; // Maximum distance from house center

        for (let i = 0; i < decorationCount; i++) {
            let attempts = 0;
            let placed = false;

            while (attempts < 10 && !placed) {
                const angle = Math.random() * Math.PI * 2;
                const distance = minDistance + Math.random() * (maxDistance - minDistance);

                const decorationX = housePosition.x + Math.cos(angle) * distance;
                const decorationZ = housePosition.z + Math.sin(angle) * distance;
                const decorationY = BowlCreator.getTerrainHeight(decorationX, decorationZ);
                const decorationPos = new BABYLON.Vector3(decorationX, decorationY, decorationZ);

                // Check if position is available (not too close to other objects)
                if (this.cityLayout.isPositionAvailable(decorationPos, 0.5, 'decoration')) {
                    const relativeX = decorationX - housePosition.x;
                    const relativeZ = decorationZ - housePosition.z;

                    // Create either a bush or a barrel with proper spacing
                    if (Math.random() > 0.5) {
                        this.decorations.createBush(house, relativeX, relativeZ);
                    } else {
                        this.decorations.createBarrel(house, relativeX, relativeZ);
                    }

                    // Reserve the position
                    this.cityLayout.reservePosition(decorationPos, 0.5, 'decoration');
                    placed = true;
                }
                attempts++;
            }
        }
    }

    addStructuredVegetation() {
        // Use city layout manager to place trees with proper distribution
        const treePositions = this.cityLayout.placeTrees(position => this.decorations.createTree(position.x, position.y, position.z));

        console.log(`Placed ${treePositions.length} trees with natural distribution`);
    }

    addStructuredDecorations() {
        // Add rocks and other decorations in appropriate locations
        const decorationCount = 15; // Reduced from 30 to prevent overcrowding
        let placedDecorations = 0;

        for (let i = 0; i < decorationCount * 2 && placedDecorations < decorationCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = this.villageRadius * (1.1 + Math.random() * 0.4); // Outside main village area

            const x = Math.cos(angle) * radius + this.centerOffset.x;
            const z = Math.sin(angle) * radius + this.centerOffset.z;
            const y = BowlCreator.getTerrainHeight(x, z);
            const position = new BABYLON.Vector3(x, y, z);

            // Check if position is available
            if (this.cityLayout.isPositionAvailable(position, 1, 'decoration')) {
                if (Math.random() > 0.7) {
                    this.decorations.createRock(x, y, z);
                } else {
                    this.decorations.createTree(x, y, z);
                }

                // Reserve the position
                this.cityLayout.reservePosition(position, 1, 'decoration');
                placedDecorations++;
            }
        }

        console.log(`Placed ${placedDecorations} decorative elements`);
    }

    dispose() {
        this.decorations.dispose();
        this.marketSystem.dispose();
        this.houseModel.dispose();
        this.cityLayout.dispose();
        this.roadNetwork.dispose();
        this.houses = [];
    }

    /**
     * Get debug information about the city layout
     * @returns {Object} Debug information
     */
    getLayoutDebugInfo() {
        return {
            cityLayout: this.cityLayout.getDebugInfo(),
            roadNetwork: this.roadNetwork.getDebugInfo()
        };
    }
}
