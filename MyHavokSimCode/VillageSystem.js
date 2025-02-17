import { BowlCreator } from './BowlCreator.js';
import { AssetManager } from '../assets/AssetManager.js';
import { VillageDecorations } from './Village/VillageDecorations.js';
import { MarketSystem } from './Village/MarketSystem.js';
import { HouseModel } from './3D_Models/Houses/HouseModel.js';

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
        this.init();
    }

    init() {
        // Set village center for decorations first
        this.decorations.setVillageCenter(this.centerOffset);
        
        // Create other village elements
        this.createMarketDistrict();
        this.createHouses();
        this.addOuterDecorations();
    }

    createMarketDistrict() {
        // Create market district to the east of the village center
        const marketCenter = this.centerOffset.clone();
        marketCenter.x += this.villageRadius * 0.4; // Position market district east of center
        marketCenter.z += this.villageRadius * 0.2; // Slightly to the south
        
        this.marketSystem.createMarketDistrict(marketCenter);
    }

    createHouses() {
        for (let i = 0; i < this.houseCount; i++) {
            const angle = (i / this.houseCount) * Math.PI * 2;
            const radius = this.villageRadius * (0.5 + Math.random() * 0.5); // Vary distance from center
            const rotationOffset = (Math.random() * 0.4 - 0.2); // Random rotation

            const x = Math.cos(angle) * radius + this.centerOffset.x;
            const z = Math.sin(angle) * radius + this.centerOffset.z;
            const y = BowlCreator.getTerrainHeight(x, z);

            // Create house with random variant
            const variants = ['basic', 'small', 'large'];
            const variant = variants[Math.floor(Math.random() * variants.length)];
            
            const position = new BABYLON.Vector3(x, y + 0.2, z);
            const rotation = angle + Math.PI + rotationOffset; // Face towards center
            const house = this.houseModel.createHouse(position, rotation, variant);
            
            this.houses.push(house);
            this.addHouseDecorations(house, variant);
        }
    }

    addHouseDecorations(house, variant) {
        // Add some random decorations around the house
        const decorationCount = Math.floor(Math.random() * 3) + 1;
        const houseWidth = variant === 'large' ? 7 : variant === 'small' ? 3.5 : 5;
        
        for (let i = 0; i < decorationCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = houseWidth + Math.random() * 2;
            
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create either a bush or a barrel
            if (Math.random() > 0.5) {
                this.decorations.createBush(house, x, z);
            } else {
                this.decorations.createBarrel(house, x, z);
            }
        }
    }

    addOuterDecorations() {
        // Add trees and rocks around the village
        const decorationCount = 30;
        
        for (let i = 0; i < decorationCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = this.villageRadius * (1.2 + Math.random() * 0.3); // Outside village
            
            const x = Math.cos(angle) * radius + this.centerOffset.x;
            const z = Math.sin(angle) * radius + this.centerOffset.z;
            const y = BowlCreator.getTerrainHeight(x, z);

            if (Math.random() > 0.7) {
                this.decorations.createRock(x, y, z);
            } else {
                this.decorations.createTree(x, y, z);
            }
        }
    }

    dispose() {
        this.decorations.dispose();
        this.marketSystem.dispose();
        this.houseModel.dispose();
        this.houses = [];
    }
} 