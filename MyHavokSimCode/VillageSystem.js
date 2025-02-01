import { BowlCreator } from './BowlCreator.js';
import { AssetManager } from '../assets/AssetManager.js';

export class VillageSystem {
    constructor(scene) {
        this.scene = scene;
        this.houses = [];
        this.decorations = [];
        this.villageRadius = 60; // Village radius
        this.centerOffset = new BABYLON.Vector3(0, 0, 0); // Village center position
        this.houseCount = 15; // Number of houses to create
        this.init();
    }

    init() {
        this.createVillageCenter();
        this.createHouses();
        this.addDecorations();
    }

    createVillageCenter() {
        // Create central plaza
        const plaza = BABYLON.MeshBuilder.CreateDisc("plaza", {
            radius: 16,
            tessellation: 64
        }, this.scene);
        
        plaza.position = this.centerOffset.clone();
        plaza.position.y = BowlCreator.getTerrainHeight(this.centerOffset.x, this.centerOffset.z) + 0.65;
        plaza.rotation.x = Math.PI / 2;

        // Plaza material
        const plazaMaterial = new BABYLON.StandardMaterial("plazaMat", this.scene);
        plazaMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        plazaMaterial.bumpTexture = AssetManager.getTexture('ROCK_NORMAL', this.scene);
        plaza.material = plazaMaterial;

        // Add central fountain
        this.createFountain(this.centerOffset);
    }

    createFountain(position) {
        const fountainBase = BABYLON.MeshBuilder.CreateCylinder("fountainBase", {
            height: 1,
            diameter: 8,
            tessellation: 32
        }, this.scene);
        
        fountainBase.position = position.clone();
        fountainBase.position.y = BowlCreator.getTerrainHeight(position.x, position.z) + 0.5;

        const fountainPillar = BABYLON.MeshBuilder.CreateCylinder("fountainPillar", {
            height: 3,
            diameter: 2,
            tessellation: 16
        }, this.scene);
        
        fountainPillar.position = fountainBase.position.clone();
        fountainPillar.position.y += 2;

        const fountainTop = BABYLON.MeshBuilder.CreateCylinder("fountainTop", {
            height: 1,
            diameter: 4,
            tessellation: 32
        }, this.scene);
        
        fountainTop.position = fountainPillar.position.clone();
        fountainTop.position.y += 1.5;

        // Fountain material
        const fountainMaterial = new BABYLON.StandardMaterial("fountainMat", this.scene);
        fountainMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        fountainMaterial.bumpTexture = AssetManager.getTexture('ROCK_NORMAL', this.scene);
        
        fountainBase.material = fountainMaterial;
        fountainPillar.material = fountainMaterial;
        fountainTop.material = fountainMaterial;

        // Add water particle system
        this.createWaterEffect(fountainTop.position);
    }

    createWaterEffect(position) {
        const fountain = BABYLON.ParticleSystem.Parse(this.getFountainParticleConfig(), this.scene, "");
        fountain.emitter = new BABYLON.Vector3(position.x, position.y - 0.5, position.z);
        fountain.start();
    }

    getFountainParticleConfig() {
        return {
            "name": "fountain",
            "capacity": 2000,
            "emitter": [0, 0, 0],
            "particleEmitterType": {
                "type": "ConeParticleEmitter",
                "radius": 1,
                "angle": 0.5
            },
            "textureName": "null",
            "color1": [0.7, 0.8, 1.0, 1.0],
            "color2": [0.2, 0.5, 1.0, 1.0],
            "colorDead": [0, 0, 0.2, 0.0],
            "emitRate": 100,
            "minEmitBox": [0, 0, 0],
            "maxEmitBox": [0, 0, 0],
            "minLifeTime": 0.5,
            "maxLifeTime": 2.0,
            "minSize": 0.1,
            "maxSize": 0.3,
            "direction1": [0, 4, 0],
            "direction2": [0, 8, 0],
            "gravity": [0, -9.81, 0],
            "blendMode": 0
        };
    }

    createHouses() {
        for (let i = 0; i < this.houseCount; i++) {
            const angle = (i / this.houseCount) * Math.PI * 2;
            const radius = this.villageRadius * (0.5 + Math.random() * 0.5); // Vary distance from center
            const rotationOffset = (Math.random() * 0.4 - 0.2); // Random rotation

            const x = Math.cos(angle) * radius + this.centerOffset.x;
            const z = Math.sin(angle) * radius + this.centerOffset.z;
            const y = BowlCreator.getTerrainHeight(x, z);

            this.createHouse(x, y + 0.2, z, angle + Math.PI + rotationOffset); // Face towards center
        }
    }

    createHouse(x, y, z, angle) {
        // Random house properties
        const width = 4 + Math.random() * 2;
        const height = 4 + Math.random() * 2;
        const depth = 5 + Math.random() * 2;
        const roofHeight = 2 + Math.random();

        // Create house container
        const house = new BABYLON.TransformNode("house", this.scene);
        house.position = new BABYLON.Vector3(x, y, z);
        house.rotation.y = angle;

        // Create foundation (thicker base)
        const foundation = BABYLON.MeshBuilder.CreateBox("foundation", {
            width: width * 1.2,
            height: 1,
            depth: depth * 1.2
        }, this.scene);
        foundation.parent = house;
        foundation.position.y = 0.5;

        // Create main building
        const building = BABYLON.MeshBuilder.CreateBox("building", {
            width: width,
            height: height,
            depth: depth
        }, this.scene);
        building.parent = house;
        building.position.y = height / 2 + 1;

        // Create door
        const doorHeight = height * 0.7;
        const doorWidth = 1.2;
        const door = BABYLON.MeshBuilder.CreatePlane("door", {
            height: doorHeight,
            width: doorWidth
        }, this.scene);
        door.parent = house;
        door.position.y = doorHeight / 2 + 1;
        door.position.z = depth / 2 + 0.01; // Slightly in front of the wall
        
        // Create door frame
        const doorFrame = BABYLON.MeshBuilder.CreateBox("doorFrame", {
            height: doorHeight + 0.2,
            width: doorWidth + 0.2,
            depth: 0.1
        }, this.scene);
        doorFrame.parent = house;
        doorFrame.position.y = doorHeight / 2 + 1;
        doorFrame.position.z = depth / 2;

        // Create windows
        const windowSize = 1;
        const windowHeight = height * 0.6;
        const windows = [];
        
        // Front windows (on either side of door)
        for (let i = -1; i <= 1; i += 2) {
            const frontWindow = BABYLON.MeshBuilder.CreatePlane("windowFront", {
                height: windowSize,
                width: windowSize
            }, this.scene);
            frontWindow.parent = house;
            frontWindow.position.y = windowHeight;
            frontWindow.position.x = i * (width / 3);
            frontWindow.position.z = depth / 2 + 0.01;
            windows.push(frontWindow);

            // Window frame
            const windowFrame = BABYLON.MeshBuilder.CreateBox("windowFrame", {
                height: windowSize + 0.2,
                width: windowSize + 0.2,
                depth: 0.1
            }, this.scene);
            windowFrame.parent = house;
            windowFrame.position.y = windowHeight;
            windowFrame.position.x = i * (width / 3);
            windowFrame.position.z = depth / 2;
            windows.push(windowFrame);
        }

        // Side windows
        for (let side = -1; side <= 1; side += 2) {
            for (let pos = -1; pos <= 1; pos += 2) {
                const sideWindow = BABYLON.MeshBuilder.CreatePlane("windowSide", {
                    height: windowSize,
                    width: windowSize
                }, this.scene);
                sideWindow.parent = house;
                sideWindow.position.y = windowHeight;
                sideWindow.position.x = width / 2 * side + 0.01 * side;
                sideWindow.position.z = pos * (depth / 3);
                sideWindow.rotation.y = Math.PI / 2;
                windows.push(sideWindow);

                // Window frame
                const windowFrame = BABYLON.MeshBuilder.CreateBox("windowFrame", {
                    height: windowSize + 0.2,
                    width: windowSize + 0.2,
                    depth: 0.1
                }, this.scene);
                windowFrame.parent = house;
                windowFrame.position.y = windowHeight;
                windowFrame.position.x = width / 2 * side;
                windowFrame.position.z = pos * (depth / 3);
                windowFrame.rotation.y = Math.PI / 2;
                windows.push(windowFrame);
            }
        }

        // Create roof
        const roof = BABYLON.MeshBuilder.CreateCylinder("roof", {
            height: roofHeight,
            diameter: Math.sqrt(width * width + depth * depth),
            tessellation: 4
        }, this.scene);
        roof.parent = house;
        roof.position.y = height + roofHeight / 2 + 1;
        roof.rotation.y = Math.PI / 4;

        // Create chimney
        const chimneyHeight = 2;
        const chimney = BABYLON.MeshBuilder.CreateBox("chimney", {
            width: 0.6,
            height: chimneyHeight,
            depth: 0.6
        }, this.scene);
        chimney.parent = house;
        chimney.position.x = width * 0.3;
        chimney.position.y = height + roofHeight + 1;
        chimney.position.z = depth * 0.3;

        // Materials
        const foundationMat = new BABYLON.StandardMaterial("foundationMat", this.scene);
        foundationMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        foundation.material = foundationMat;

        const buildingMat = new BABYLON.StandardMaterial("buildingMat", this.scene);
        buildingMat.diffuseColor = new BABYLON.Color3(
            0.8 + Math.random() * 0.2,
            0.7 + Math.random() * 0.2,
            0.6 + Math.random() * 0.2
        );

        const roofMat = new BABYLON.StandardMaterial("roofMat", this.scene);
        roofMat.diffuseColor = new BABYLON.Color3(
            0.4 + Math.random() * 0.2,
            0.2 + Math.random() * 0.2,
            0.1 + Math.random() * 0.1
        );

        const chimneyMat = new BABYLON.StandardMaterial("chimneyMat", this.scene);
        chimneyMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        // Door material
        const doorMat = new BABYLON.StandardMaterial("doorMat", this.scene);
        doorMat.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        door.material = doorMat;

        // Door frame material
        const doorFrameMat = new BABYLON.StandardMaterial("doorFrameMat", this.scene);
        doorFrameMat.diffuseColor = new BABYLON.Color3(0.35, 0.15, 0.05);
        doorFrame.material = doorFrameMat;

        // Window material
        const windowMat = new BABYLON.StandardMaterial("windowMat", this.scene);
        windowMat.diffuseColor = new BABYLON.Color3(0.7, 0.8, 1.0);
        windowMat.alpha = 0.5;
        windowMat.specularColor = new BABYLON.Color3(1, 1, 1);
        windowMat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Window frame material
        const windowFrameMat = new BABYLON.StandardMaterial("windowFrameMat", this.scene);
        windowFrameMat.diffuseColor = new BABYLON.Color3(0.35, 0.15, 0.05);

        // Apply materials
        building.material = buildingMat;
        roof.material = roofMat;
        chimney.material = chimneyMat;
        windows.forEach(window => {
            if (window.name.includes("Frame")) {
                window.material = windowFrameMat;
            } else {
                window.material = windowMat;
            }
        });

        // Add fire particle system to chimney
        this.createChimneyFire(chimney.getAbsolutePosition());

        this.houses.push(house);
        this.addHouseDecorations(house, width, depth);
    }

    createChimneyFire(position) {
        // Create particle system for fire
        const fireSystem = new BABYLON.ParticleSystem("fire", 100, this.scene);
        
        // Texture
        fireSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=");

        // Set emitter
        fireSystem.emitter = new BABYLON.Vector3(position.x, position.y + 0.3, position.z);
        fireSystem.minEmitBox = new BABYLON.Vector3(-0.2, 0, -0.2);
        fireSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0, 0.2);

        // Particle behavior
        fireSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
        fireSystem.color2 = new BABYLON.Color4(1, 0.3, 0, 1.0);
        fireSystem.colorDead = new BABYLON.Color4(0.5, 0, 0, 0.0);

        fireSystem.minSize = 0.3;
        fireSystem.maxSize = 0.6;
        fireSystem.minLifeTime = 0.5;
        fireSystem.maxLifeTime = 1.0;
        fireSystem.emitRate = 50;

        // Emission direction
        fireSystem.direction1 = new BABYLON.Vector3(-0.2, 1, -0.2);
        fireSystem.direction2 = new BABYLON.Vector3(0.2, 1, 0.2);

        // Speed and gravity
        fireSystem.minEmitPower = 1;
        fireSystem.maxEmitPower = 2;
        fireSystem.updateSpeed = 0.01;

        // Start the particle system
        fireSystem.start();

        // Create smoke particles above the fire
        const smokeSystem = new BABYLON.ParticleSystem("smoke", 50, this.scene);
        smokeSystem.particleTexture = fireSystem.particleTexture;
        smokeSystem.emitter = new BABYLON.Vector3(position.x, position.y + 1, position.z);
        
        // Smoke properties
        smokeSystem.color1 = new BABYLON.Color4(0.3, 0.3, 0.3, 0.3);
        smokeSystem.color2 = new BABYLON.Color4(0.2, 0.2, 0.2, 0.2);
        smokeSystem.colorDead = new BABYLON.Color4(0.1, 0.1, 0.1, 0);
        
        smokeSystem.minSize = 0.5;
        smokeSystem.maxSize = 1.0;
        smokeSystem.minLifeTime = 2.0;
        smokeSystem.maxLifeTime = 4.0;
        smokeSystem.emitRate = 20;
        
        smokeSystem.direction1 = new BABYLON.Vector3(-0.4, 2, -0.4);
        smokeSystem.direction2 = new BABYLON.Vector3(0.4, 4, 0.4);
        
        smokeSystem.minEmitPower = 0.5;
        smokeSystem.maxEmitPower = 1.5;
        smokeSystem.updateSpeed = 0.01;
        
        smokeSystem.start();
    }

    addHouseDecorations(house, width, depth) {
        // Add some random decorations around the house
        const decorationCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < decorationCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = width + Math.random() * 2;
            
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create either a bush or a barrel
            if (Math.random() > 0.5) {
                this.createBush(house, x, z);
            } else {
                this.createBarrel(house, x, z);
            }
        }
    }

    createBush(parent, x, z) {
        const bush = BABYLON.MeshBuilder.CreateSphere("bush", {
            diameter: 1 + Math.random() * 0.5,
            segments: 8
        }, this.scene);
        
        bush.parent = parent;
        bush.position.x = x;
        bush.position.z = z;
        bush.position.y = 0.5;

        const bushMat = new BABYLON.StandardMaterial("bushMat", this.scene);
        bushMat.diffuseColor = new BABYLON.Color3(0.2, 0.4 + Math.random() * 0.2, 0.1);
        bush.material = bushMat;

        this.decorations.push(bush);
    }

    createBarrel(parent, x, z) {
        const barrel = BABYLON.MeshBuilder.CreateCylinder("barrel", {
            height: 1.2,
            diameter: 0.8,
            tessellation: 12
        }, this.scene);
        
        barrel.parent = parent;
        barrel.position.x = x;
        barrel.position.z = z;
        barrel.position.y = 0.6;

        const barrelMat = new BABYLON.StandardMaterial("barrelMat", this.scene);
        barrelMat.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        barrel.material = barrelMat;

        this.decorations.push(barrel);
    }

    addDecorations() {
        // Add trees and rocks around the village
        const decorationCount = 30;
        
        for (let i = 0; i < decorationCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = this.villageRadius * (1.2 + Math.random() * 0.3); // Outside village
            
            const x = Math.cos(angle) * radius + this.centerOffset.x;
            const z = Math.sin(angle) * radius + this.centerOffset.z;
            const y = BowlCreator.getTerrainHeight(x, z);

            if (Math.random() > 0.7) {
                this.createRock(x, y, z);
            } else {
                this.createTree(x, y, z);
            }
        }
    }

    createTree(x, y, z) {
        const height = 4 + Math.random() * 3;
        
        // Create trunk
        const trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {
            height: height,
            diameter: 0.5,
            tessellation: 8
        }, this.scene);
        
        trunk.position = new BABYLON.Vector3(x, y + height/2, z);

        // Create foliage
        const foliage = BABYLON.MeshBuilder.CreateSphere("foliage", {
            diameter: 3 + Math.random(),
            segments: 8
        }, this.scene);
        
        foliage.position = trunk.position.clone();
        foliage.position.y += height/2;
        foliage.scaling.y = 1.2;

        // Materials
        const trunkMat = new BABYLON.StandardMaterial("trunkMat", this.scene);
        trunkMat.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2);
        trunk.material = trunkMat;

        const foliageMat = new BABYLON.StandardMaterial("foliageMat", this.scene);
        foliageMat.diffuseColor = new BABYLON.Color3(0.2, 0.4 + Math.random() * 0.2, 0.1);
        foliage.material = foliageMat;

        this.decorations.push(trunk, foliage);
    }

    createRock(x, y, z) {
        const rock = BABYLON.MeshBuilder.CreateBox("rock", {
            size: 1 + Math.random()
        }, this.scene);
        
        rock.position = new BABYLON.Vector3(x, y + 0.5, z);
        rock.rotation = new BABYLON.Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rock.scaling = new BABYLON.Vector3(
            1 + Math.random() * 0.5,
            0.7 + Math.random() * 0.3,
            1 + Math.random() * 0.5
        );

        const rockMat = new BABYLON.StandardMaterial("rockMat", this.scene);
        rockMat.diffuseColor = new BABYLON.Color3(0.4 + Math.random() * 0.2, 0.4 + Math.random() * 0.2, 0.4 + Math.random() * 0.2);
        rockMat.bumpTexture = AssetManager.getTexture('ROCK_NORMAL', this.scene);
        rock.material = rockMat;

        this.decorations.push(rock);
    }
} 