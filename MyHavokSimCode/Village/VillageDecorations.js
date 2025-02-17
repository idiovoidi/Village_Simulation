import { BowlCreator } from '../BowlCreator.js';
import { AssetManager } from '../../assets/AssetManager.js';

export class VillageDecorations {
    constructor(scene) {
        this.scene = scene;
        this.decorations = [];
        this.villageCenter = null;
        this.debug = false;
        this.plazaRadius = 16;  // Half of the 32 diameter from VillageSystem
    }

    setVillageCenter(centerPosition) {
        this.villageCenter = centerPosition;
        
        // Create the central plaza and its features
        this.createCentralPlaza();
        this.createFountain();
        this.createPlazaDecorations();
        
        if (this.debug) {
            const marker = BABYLON.MeshBuilder.CreateSphere("centerMarker", {
                diameter: 1
            }, this.scene);
            marker.position = centerPosition;
            marker.material = new BABYLON.StandardMaterial("markerMat", this.scene);
            marker.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
            this.decorations.push(marker);
        }
    }

    createCentralPlaza() {
        // Create central plaza
        const plaza = BABYLON.MeshBuilder.CreateCylinder("plaza", {
            height: 0.9,
            diameter: this.plazaRadius * 2,
            tessellation: 64
        }, this.scene);
        
        plaza.position = this.villageCenter.clone();
        plaza.position.y = BowlCreator.getTerrainHeight(this.villageCenter.x, this.villageCenter.z);

        // Plaza material
        const plazaMaterial = new BABYLON.StandardMaterial("plazaMat", this.scene);
        plazaMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        plazaMaterial.bumpTexture = AssetManager.getTexture('ROCK_NORMAL', this.scene);
        plaza.material = plazaMaterial;

        this.decorations.push(plaza);
    }

    createPlazaDecorations() {
        if (!this.villageCenter) return;

        // Add benches around the fountain
        const benchCount = 8;
        const benchRadius = this.plazaRadius * 0.625; // 10 units when plaza radius is 16

        for (let i = 0; i < benchCount; i++) {
            const angle = (i / benchCount) * Math.PI * 2;
            const x = Math.cos(angle) * benchRadius;
            const z = Math.sin(angle) * benchRadius;
            this.createBench(x, z, angle, this.villageCenter);
        }

        // Add flower beds
        const flowerBedCount = 6;
        const flowerRadius = this.plazaRadius * 0.8125; // 13 units when plaza radius is 16

        for (let i = 0; i < flowerBedCount; i++) {
            const angle = (i / flowerBedCount) * Math.PI * 2;
            const x = Math.cos(angle) * flowerRadius;
            const z = Math.sin(angle) * flowerRadius;
            this.createFlowerBed(x, z, this.villageCenter);
        }
    }

    createFountain() {
        if (!this.villageCenter) return;

        // Create water basin
        const basin = BABYLON.MeshBuilder.CreateCylinder("fountainBasin", {
            height: 1,
            diameter: 12,
            tessellation: 32
        }, this.scene);
        
        basin.position = this.villageCenter.clone();
        basin.position.y = BowlCreator.getTerrainHeight(this.villageCenter.x, this.villageCenter.z) + 0.5;

        // Create decorative rim
        const rim = BABYLON.MeshBuilder.CreateTorus("fountainRim", {
            diameter: 12,
            thickness: 1.3,
            tessellation: 32
        }, this.scene);
        rim.position = basin.position.clone();
        rim.position.y += 0.4;

        // Create central pillar
        const centralPillar = BABYLON.MeshBuilder.CreateCylinder("fountainPillar", {
            height: 4,
            diameter: 2,
            tessellation: 16
        }, this.scene);
        centralPillar.position = basin.position.clone();
        centralPillar.position.y += 2;

        // Create decorative tiers
        const tiers = [];
        const tierCount = 3;
        for (let i = 0; i < tierCount; i++) {
            const tier = BABYLON.MeshBuilder.CreateCylinder("fountainTier" + i, {
                height: 0.4,
                diameter: 6 - (i * 1.5),
                tessellation: 32
            }, this.scene);
            tier.position = centralPillar.position.clone();
            tier.position.y += i * 1.2;
            tiers.push(tier);
        }

        // Create top ornament
        const topOrnament = BABYLON.MeshBuilder.CreateSphere("fountainTop", {
            diameter: 1.2,
            segments: 16
        }, this.scene);
        topOrnament.position = centralPillar.position.clone();
        topOrnament.position.y += 2.5;

        // Materials
        const stoneMaterial = new BABYLON.StandardMaterial("fountainStoneMat", this.scene);
        stoneMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        stoneMaterial.bumpTexture = AssetManager.getTexture('ROCK_NORMAL', this.scene);
        stoneMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

        const waterMaterial = new BABYLON.StandardMaterial("fountainWaterMat", this.scene);
        waterMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.8);
        waterMaterial.alpha = 0.8;
        waterMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        waterMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.3);

        // Apply materials
        basin.material = waterMaterial;
        rim.material = stoneMaterial;
        centralPillar.material = stoneMaterial;
        topOrnament.material = stoneMaterial;
        tiers.forEach(tier => tier.material = stoneMaterial);

        // Add water effects
        tiers.forEach((tier, index) => {
            const emitterPosition = tier.position.clone();
            emitterPosition.y += 0.2;
            this.createWaterEffect(emitterPosition, 6 - (index * 1.5));
        });

        this.createWaterEffect(topOrnament.position, 8);

        // Add to decorations array
        this.decorations.push(basin, rim, centralPillar, topOrnament, ...tiers);
    }

    createWaterEffect(position, scale) {
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

    createBench(x, z, rotation, centerOffset) {
        const benchPosition = centerOffset.clone();
        benchPosition.x += x;
        benchPosition.z += z;
        benchPosition.y = BowlCreator.getTerrainHeight(benchPosition.x, benchPosition.z) + 0.8;

        // Calculate direction to face village center if available
        let benchRotation = rotation;
        if (this.villageCenter) {
            // Create vector from bench to center
            const toCenter = new BABYLON.Vector3(
                this.villageCenter.x - benchPosition.x,
                0,
                this.villageCenter.z - benchPosition.z
            );
            
            // Calculate angle and adjust so bench faces inward
            benchRotation = Math.atan2(toCenter.z, toCenter.x) - Math.PI/2;

            if (this.debug) {
                // Draw debug line from bench to center
                const line = BABYLON.MeshBuilder.CreateLines("debugLine", {
                    points: [
                        benchPosition,
                        this.villageCenter
                    ]
                }, this.scene);
                line.color = new BABYLON.Color3(0, 1, 0);
                this.decorations.push(line);

                console.log(`Bench at (${x}, ${z}): Original rotation: ${rotation}, New rotation: ${benchRotation}`);
            }
        }

        // Create bench seat
        const seat = BABYLON.MeshBuilder.CreateBox("benchSeat", {
            width: 2,
            height: 0.1,
            depth: 0.6
        }, this.scene);
        seat.position = benchPosition.clone();
        seat.rotation.y = benchRotation;

        // Create bench back (facing inward)
        const back = BABYLON.MeshBuilder.CreateBox("benchBack", {
            width: 2,
            height: 0.6,
            depth: 0.1
        }, this.scene);
        back.position = benchPosition.clone();
        back.position.y += 0.35;
        back.position.z += 0.25 * Math.cos(benchRotation); // Changed minus to plus to face inward
        back.position.x -= 0.25 * Math.sin(benchRotation); // Changed plus to minus to face inward
        back.rotation.y = benchRotation;

        // Create bench legs
        [-0.8, 0.8].forEach(offset => {
            const leg = BABYLON.MeshBuilder.CreateBox("benchLeg", {
                width: 0.1,
                height: 0.5,
                depth: 0.6
            }, this.scene);
            leg.position = benchPosition.clone();
            leg.position.y -= 0.2;
            leg.position.x += Math.cos(benchRotation) * offset;
            leg.position.z += Math.sin(benchRotation) * offset;
            leg.rotation.y = benchRotation;

            // Bench material
            const benchMaterial = new BABYLON.StandardMaterial("benchMat", this.scene);
            benchMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
            leg.material = benchMaterial;
        });

        // Bench material
        const benchMaterial = new BABYLON.StandardMaterial("benchMat", this.scene);
        benchMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        seat.material = benchMaterial;
        back.material = benchMaterial;

        this.decorations.push(seat, back);
    }

    createFlowerBed(x, z, centerOffset) {
        const position = centerOffset.clone();
        position.x += x;
        position.z += z;
        position.y = BowlCreator.getTerrainHeight(position.x, position.z) + 0.7;

        // Create flower bed border
        const border = BABYLON.MeshBuilder.CreateTorus("flowerBed", {
            diameter: 2,
            thickness: 0.3,
            tessellation: 16
        }, this.scene);
        border.position = position;
        border.rotation.x = Math.PI / 2;

        // Create soil
        const soil = BABYLON.MeshBuilder.CreateDisc("soil", {
            radius: 0.85,
            tessellation: 16
        }, this.scene);
        soil.position = position.clone();
        soil.position.y += 0.05;
        soil.rotation.x = Math.PI / 2;

        // Add flowers
        const flowerCount = 8;
        for (let i = 0; i < flowerCount; i++) {
            const angle = (i / flowerCount) * Math.PI * 2;
            const radius = 0.5;
            const flowerX = position.x + Math.cos(angle) * radius;
            const flowerZ = position.z + Math.sin(angle) * radius;
            this.createFlower(flowerX, position.y + 0.15, flowerZ);
        }

        // Materials
        const borderMaterial = new BABYLON.StandardMaterial("borderMat", this.scene);
        borderMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        border.material = borderMaterial;

        const soilMaterial = new BABYLON.StandardMaterial("soilMat", this.scene);
        soilMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.1, 0);
        soil.material = soilMaterial;

        this.decorations.push(border, soil);
    }

    createFlower(x, y, z) {
        // Create stem
        const stem = BABYLON.MeshBuilder.CreateCylinder("flowerStem", {
            height: 0.4,
            diameter: 0.05,
            tessellation: 8
        }, this.scene);
        stem.position = new BABYLON.Vector3(x, y + 0.25, z);

        // Create flower head
        const flowerHead = BABYLON.MeshBuilder.CreateSphere("flowerHead", {
            diameter: 0.2,
            segments: 8
        }, this.scene);
        flowerHead.position = stem.position.clone();
        flowerHead.position.y += 0.2;
        flowerHead.scaling.y = 0.5;

        // Materials
        const stemMaterial = new BABYLON.StandardMaterial("stemMat", this.scene);
        stemMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.1);
        stem.material = stemMaterial;

        const flowerMaterial = new BABYLON.StandardMaterial("flowerMat", this.scene);
        // Random flower color
        const colors = [
            new BABYLON.Color3(1, 0.2, 0.2),   // Red
            new BABYLON.Color3(1, 1, 0.2),     // Yellow
            new BABYLON.Color3(0.6, 0.2, 1),   // Purple
            new BABYLON.Color3(1, 0.6, 0.8)    // Pink
        ];
        flowerMaterial.diffuseColor = colors[Math.floor(Math.random() * colors.length)];
        flowerMaterial.emissiveColor = flowerMaterial.diffuseColor.scale(0.3);
        flowerHead.material = flowerMaterial;

        this.decorations.push(stem, flowerHead);
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

    dispose() {
        this.decorations.forEach(decoration => {
            if (decoration && decoration.dispose) {
                decoration.dispose();
            }
        });
        this.decorations = [];
    }
} 