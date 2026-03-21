import { BowlCreator } from '../BowlCreator.js';
import { AssetManager } from '../../assets/AssetManager.js';

export class MarketSystem {
    constructor(scene) {
        this.scene = scene;
        this.stalls = [];
        this.merchants = new Map();
        this.marketRadius = 25; // Market district radius
        this.stallCount = 8;    // Number of market stalls

        // Market configuration
        this.config = {
            stallSpacing: 8,      // Distance between stalls
            pathWidth: 4,         // Width of market paths
            centerRadius: 10,     // Radius of central marketplace
            roofHeight: 3,        // Height of stall roofs
            marketOffset: 40,     // Distance from village center
            marketRotation: Math.PI / 6, // Rotation of entire market (30 degrees)
            plazaTiers: 3,        // Number of plaza tiers
            plazaStepHeight: 0.15, // Height of each plaza step
            stallTypes: [
                { type: 'FOOD', color: new BABYLON.Color3(0.8, 0.4, 0.3) },
                { type: 'CRAFTS', color: new BABYLON.Color3(0.6, 0.4, 0.8) },
                { type: 'TOOLS', color: new BABYLON.Color3(0.4, 0.6, 0.8) },
                { type: 'CLOTHING', color: new BABYLON.Color3(0.3, 0.8, 0.4) }
            ]
        };
    }

    createMarketDistrict(centerPosition) {
        // Apply market offset and rotation to create the actual market center
        const marketCenter = new BABYLON.Vector3(
            centerPosition.x + Math.cos(this.config.marketRotation) * this.config.marketOffset,
            centerPosition.y,
            centerPosition.z + Math.sin(this.config.marketRotation) * this.config.marketOffset
        );

        // Calculate direction vector from market to village center
        const directionToVillage = centerPosition.subtract(marketCenter).normalize();
        this.villageDirection = Math.atan2(directionToVillage.z, directionToVillage.x);

        // Create central marketplace
        this.createCentralPlaza(marketCenter);

        // Create market stalls in a circular arrangement, oriented towards village
        this.createMarketStalls(marketCenter);

        // Add decorative elements
        this.addMarketDecorations(marketCenter);

        // Create pathways between stalls
        this.createMarketPaths(marketCenter);
    }

    createCentralPlaza(center) {
        // Create tiered plaza effect
        for (let i = 0; i < this.config.plazaTiers; i++) {
            const tierRadius = this.config.centerRadius * (1 - i * 0.15);
            const plaza = BABYLON.MeshBuilder.CreateDisc(`marketPlaza_${i}`, {
                radius: tierRadius,
                tessellation: 64
            }, this.scene);

            plaza.position = center.clone();
            plaza.position.y = BowlCreator.getTerrainHeight(center.x, center.z) + 0.05 + (i * this.config.plazaStepHeight);
            plaza.rotation.x = Math.PI / 2;

            // Create plaza material with slight variation per tier
            const plazaMaterial = new BABYLON.StandardMaterial(`plazaMat_${i}`, this.scene);
            plazaMaterial.diffuseColor = new BABYLON.Color3(
                0.7 - (i * 0.05),
                0.7 - (i * 0.05),
                0.6 - (i * 0.05)
            );
            plazaMaterial.bumpTexture = AssetManager.getTexture('ROCK_NORMAL', this.scene);
            plazaMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            plaza.material = plazaMaterial;

            // Add decorative rim for each tier
            if (i < this.config.plazaTiers - 1) {
                const rim = BABYLON.MeshBuilder.CreateTorus(`plazaRim_${i}`, {
                    diameter: tierRadius * 2,
                    thickness: 0.3,
                    tessellation: 64
                }, this.scene);

                rim.position = center.clone();
                rim.position.y = plaza.position.y + (this.config.plazaStepHeight / 2);
                rim.rotation.x = Math.PI / 2;

                const rimMaterial = new BABYLON.StandardMaterial(`rimMat_${i}`, this.scene);
                rimMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.5);
                rimMaterial.bumpTexture = AssetManager.getTexture('ROCK_NORMAL', this.scene);
                rim.material = rimMaterial;
            }
        }

        // Create main entrance path facing village
        this.createPlazaEntrance(center);

        // Add central feature (fountain or statue)
        this.createCentralFeature(center);
    }

    createPlazaEntrance(center) {
        // Create wider entrance path facing the village
        const entranceWidth = this.config.pathWidth * 1.5;
        const entranceLength = this.config.centerRadius * 1.2;

        const entrance = BABYLON.MeshBuilder.CreateBox('plazaEntrance', {
            width: entranceWidth,
            height: 0.1,
            depth: entranceLength
        }, this.scene);

        entrance.position = center.clone();
        entrance.position.x += Math.cos(this.villageDirection) * (this.config.centerRadius - entranceLength / 2);
        entrance.position.z += Math.sin(this.villageDirection) * (this.config.centerRadius - entranceLength / 2);
        entrance.position.y = BowlCreator.getTerrainHeight(entrance.position.x, entrance.position.z) + 0.02;
        entrance.rotation.y = this.villageDirection;

        // Create entrance material
        const entranceMaterial = new BABYLON.StandardMaterial('entranceMat', this.scene);
        entranceMaterial.diffuseColor = new BABYLON.Color3(0.65, 0.65, 0.55);
        entranceMaterial.bumpTexture = AssetManager.getTexture('ROCK_NORMAL', this.scene);
        entrance.material = entranceMaterial;

        // Add decorative pillars at entrance
        this.createEntrancePillars(center, entranceWidth);
    }

    createEntrancePillars(center, entranceWidth) {
        const pillarPositions = [
            { x: entranceWidth / 2 + 0.5, z: this.config.centerRadius },
            { x: -(entranceWidth / 2 + 0.5), z: this.config.centerRadius }
        ];

        pillarPositions.forEach((pos, index) => {
            const pillar = BABYLON.MeshBuilder.CreateCylinder(`entrancePillar_${index}`, {
                height: 4,
                diameter: 1,
                tessellation: 12
            }, this.scene);

            const rotatedPos = {
                x: center.x + (pos.x * Math.cos(this.villageDirection) - pos.z * Math.sin(this.villageDirection)),
                z: center.z + (pos.x * Math.sin(this.villageDirection) + pos.z * Math.cos(this.villageDirection))
            };

            pillar.position = new BABYLON.Vector3(
                rotatedPos.x,
                BowlCreator.getTerrainHeight(rotatedPos.x, rotatedPos.z) + 2,
                rotatedPos.z
            );

            // Add pillar cap
            const pillarCap = BABYLON.MeshBuilder.CreateCylinder(`pillarCap_${index}`, {
                height: 0.5,
                diameter: 1.3,
                tessellation: 12
            }, this.scene);
            pillarCap.position = pillar.position.clone();
            pillarCap.position.y += 2;

            const pillarMaterial = new BABYLON.StandardMaterial(`pillarMat_${index}`, this.scene);
            pillarMaterial.diffuseColor = new BABYLON.Color3(0.75, 0.75, 0.65);
            pillarMaterial.bumpTexture = AssetManager.getTexture('ROCK_NORMAL', this.scene);
            pillar.material = pillarMaterial;
            pillarCap.material = pillarMaterial;
        });
    }

    createCentralFeature(center) {
        // Create a decorative well
        const wellBase = BABYLON.MeshBuilder.CreateCylinder('wellBase', {
            height: 1,
            diameter: 4,
            tessellation: 32
        }, this.scene);

        wellBase.position = center.clone();
        wellBase.position.y = BowlCreator.getTerrainHeight(center.x, center.z) + 0.5;

        // Create well walls
        const wellWall = BABYLON.MeshBuilder.CreateCylinder('wellWall', {
            height: 1.2,
            diameter: 3,
            thickness: 0.4,
            tessellation: 32
        }, this.scene);

        wellWall.position = center.clone();
        wellWall.position.y = BowlCreator.getTerrainHeight(center.x, center.z) + 1.1;

        // Create well roof
        const wellRoof = BABYLON.MeshBuilder.CreateCylinder('wellRoof', {
            height: 1.5,
            diameterTop: 0.5,
            diameterBottom: 4,
            tessellation: 8
        }, this.scene);

        wellRoof.position = center.clone();
        wellRoof.position.y = BowlCreator.getTerrainHeight(center.x, center.z) + 2.4;

        // Apply materials
        const stoneMaterial = new BABYLON.StandardMaterial('wellStoneMat', this.scene);
        stoneMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        stoneMaterial.bumpTexture = AssetManager.getTexture('ROCK_NORMAL', this.scene);

        const roofMaterial = new BABYLON.StandardMaterial('wellRoofMat', this.scene);
        roofMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);

        wellBase.material = stoneMaterial;
        wellWall.material = stoneMaterial;
        wellRoof.material = roofMaterial;
    }

    createMarketStalls(center) {
        for (let i = 0; i < this.stallCount; i++) {
            const angle = (i / this.stallCount) * Math.PI * 2;
            const radius = this.config.centerRadius + this.config.stallSpacing;

            const x = center.x + Math.cos(angle) * radius;
            const z = center.z + Math.sin(angle) * radius;
            const y = BowlCreator.getTerrainHeight(x, z);

            const stallType = this.config.stallTypes[i % this.config.stallTypes.length];
            this.createStall(new BABYLON.Vector3(x, y, z), angle, stallType);
        }
    }

    createStall(position, angle, stallType) {
        // Create stall base
        const base = BABYLON.MeshBuilder.CreateBox('stallBase', {
            width: 4,
            height: 0.2,
            depth: 3
        }, this.scene);
        base.position = position.clone();
        base.position.y += 0.1;
        base.rotation.y = angle;

        // Create counter
        const counter = BABYLON.MeshBuilder.CreateBox('stallCounter', {
            width: 4,
            height: 1,
            depth: 0.4
        }, this.scene);
        counter.position = position.clone();
        counter.position.y += 0.6;
        counter.position.z += Math.sin(angle) * 1;
        counter.position.x += Math.cos(angle) * 1;
        counter.rotation.y = angle;

        // Create roof
        const roof = BABYLON.MeshBuilder.CreateCylinder('stallRoof', {
            height: 0.2,
            diameter: 5,
            tessellation: 8
        }, this.scene);
        roof.position = position.clone();
        roof.position.y += this.config.roofHeight;
        roof.rotation.y = angle + Math.PI / 8;

        // Create support poles
        [-1.8, 1.8].forEach(offset => {
            const pole = BABYLON.MeshBuilder.CreateCylinder('stallPole', {
                height: this.config.roofHeight,
                diameter: 0.2,
                tessellation: 8
            }, this.scene);
            pole.position = position.clone();
            pole.position.y += this.config.roofHeight / 2;
            pole.position.x += Math.cos(angle) * offset;
            pole.position.z += Math.sin(angle) * offset;
        });

        // Create display items based on stall type
        this.createDisplayItems(position, angle, stallType);

        // Create materials
        const baseMaterial = new BABYLON.StandardMaterial('stallBaseMat', this.scene);
        baseMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2);

        const counterMaterial = new BABYLON.StandardMaterial('stallCounterMat', this.scene);
        counterMaterial.diffuseColor = stallType.color;

        const roofMaterial = new BABYLON.StandardMaterial('stallRoofMat', this.scene);
        roofMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.1);

        base.material = baseMaterial;
        counter.material = counterMaterial;
        roof.material = roofMaterial;

        // Store stall reference
        this.stalls.push({
            type: stallType.type,
            position,
            meshes: [base, counter, roof],
            inventory: this.generateInventory(stallType.type)
        });
    }

    createDisplayItems(position, angle, stallType) {
        const displayItems = this.getDisplayItems(stallType.type);
        const counterOffset = 1.2;

        displayItems.forEach((item, index) => {
            const offsetX = (index - 1) * 0.8;
            const itemMesh = BABYLON.MeshBuilder.CreateBox(
                `display_${stallType.type}_${index}`,
                item.dimensions,
                this.scene
            );

            itemMesh.position = position.clone();
            itemMesh.position.y += 1.2;
            itemMesh.position.x += Math.cos(angle) * (counterOffset + offsetX);
            itemMesh.position.z += Math.sin(angle) * (counterOffset + offsetX);
            itemMesh.rotation.y = angle;

            const itemMaterial = new BABYLON.StandardMaterial(`itemMat_${index}`, this.scene);
            itemMaterial.diffuseColor = item.color;
            itemMesh.material = itemMaterial;
        });
    }

    getDisplayItems(stallType) {
        switch (stallType) {
            case 'FOOD':
                return [
                    { dimensions: { height: 0.3, width: 0.3, depth: 0.3 }, color: new BABYLON.Color3(0.8, 0.2, 0.2) }, // Apple
                    { dimensions: { height: 0.4, width: 0.3, depth: 0.3 }, color: new BABYLON.Color3(0.8, 0.8, 0.2) }, // Bread
                    { dimensions: { height: 0.3, width: 0.4, depth: 0.3 }, color: new BABYLON.Color3(0.4, 0.8, 0.2) }  // Vegetable
                ];
            case 'CRAFTS':
                return [
                    { dimensions: { height: 0.4, width: 0.4, depth: 0.4 }, color: new BABYLON.Color3(0.6, 0.3, 0.1) }, // Pottery
                    { dimensions: { height: 0.3, width: 0.5, depth: 0.3 }, color: new BABYLON.Color3(0.8, 0.6, 0.4) }, // Basket
                    { dimensions: { height: 0.5, width: 0.3, depth: 0.3 }, color: new BABYLON.Color3(0.7, 0.5, 0.3) }  // Woodcraft
                ];
            case 'TOOLS':
                return [
                    { dimensions: { height: 0.6, width: 0.2, depth: 0.2 }, color: new BABYLON.Color3(0.6, 0.6, 0.6) }, // Hammer
                    { dimensions: { height: 0.8, width: 0.2, depth: 0.2 }, color: new BABYLON.Color3(0.5, 0.5, 0.5) }, // Shovel
                    { dimensions: { height: 0.4, width: 0.4, depth: 0.2 }, color: new BABYLON.Color3(0.4, 0.4, 0.4) }  // Tools
                ];
            case 'CLOTHING':
                return [
                    { dimensions: { height: 0.5, width: 0.4, depth: 0.2 }, color: new BABYLON.Color3(0.8, 0.3, 0.3) }, // Red Cloth
                    { dimensions: { height: 0.4, width: 0.4, depth: 0.2 }, color: new BABYLON.Color3(0.3, 0.5, 0.8) }, // Blue Cloth
                    { dimensions: { height: 0.3, width: 0.5, depth: 0.2 }, color: new BABYLON.Color3(0.3, 0.8, 0.3) }  // Green Cloth
                ];
            default:
                return [];
        }
    }

    createMarketPaths(center) {
        // Create circular path around central plaza
        const circularPath = BABYLON.MeshBuilder.CreateTorus('marketPath', {
            diameter: (this.config.centerRadius + this.config.stallSpacing) * 2,
            thickness: this.config.pathWidth,
            tessellation: 64
        }, this.scene);

        circularPath.position = center.clone();
        circularPath.position.y = BowlCreator.getTerrainHeight(center.x, center.z) + 0.02;
        circularPath.rotation.x = Math.PI / 2;

        // Create radial paths
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const pathLength = this.marketRadius - this.config.centerRadius;

            const path = BABYLON.MeshBuilder.CreateBox('radialPath', {
                width: this.config.pathWidth,
                height: 0.1,
                depth: pathLength
            }, this.scene);

            path.position = center.clone();
            path.position.x += Math.cos(angle) * pathLength / 2;
            path.position.z += Math.sin(angle) * pathLength / 2;
            path.position.y = BowlCreator.getTerrainHeight(path.position.x, path.position.z) + 0.02;
            path.rotation.y = angle;
        }

        // Create path material
        const pathMaterial = new BABYLON.StandardMaterial('pathMat', this.scene);
        pathMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.5);
        pathMaterial.bumpTexture = AssetManager.getTexture('ROCK_NORMAL', this.scene);

        circularPath.material = pathMaterial;
    }

    addMarketDecorations(center) {
        // Add banners
        for (let i = 0; i < this.stallCount; i++) {
            const angle = (i / this.stallCount) * Math.PI * 2;
            const radius = this.config.centerRadius + this.config.stallSpacing / 2;

            const x = center.x + Math.cos(angle) * radius;
            const z = center.z + Math.sin(angle) * radius;
            const y = BowlCreator.getTerrainHeight(x, z);

            this.createBanner(new BABYLON.Vector3(x, y, z), angle);
        }

        // Add ambient props (crates, barrels, etc.)
        this.addAmbientProps(center);
    }

    createBanner(position, angle) {
        // Create banner pole
        const pole = BABYLON.MeshBuilder.CreateCylinder('bannerPole', {
            height: 4,
            diameter: 0.1,
            tessellation: 8
        }, this.scene);

        pole.position = position.clone();
        pole.position.y += 2;

        // Create banner cloth
        const banner = BABYLON.MeshBuilder.CreatePlane('bannerCloth', {
            width: 1,
            height: 2
        }, this.scene);

        banner.position = position.clone();
        banner.position.y += 3;
        banner.rotation.y = angle;

        // Create banner material with random color
        const bannerMaterial = new BABYLON.StandardMaterial('bannerMat', this.scene);
        bannerMaterial.diffuseColor = new BABYLON.Color3(
            0.5 + Math.random() * 0.5,
            0.5 + Math.random() * 0.5,
            0.5 + Math.random() * 0.5
        );
        banner.material = bannerMaterial;
    }

    addAmbientProps(center) {
        const props = [
            { type: 'barrel', count: 6 },
            { type: 'crate', count: 8 },
            { type: 'sack', count: 10 }
        ];

        props.forEach(prop => {
            for (let i = 0; i < prop.count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = this.config.centerRadius + Math.random() * this.marketRadius;

                const x = center.x + Math.cos(angle) * radius;
                const z = center.z + Math.sin(angle) * radius;
                const y = BowlCreator.getTerrainHeight(x, z);

                this.createProp(prop.type, new BABYLON.Vector3(x, y, z));
            }
        });
    }

    createProp(type, position) {
        let prop;
        switch (type) {
            case 'barrel':
                prop = BABYLON.MeshBuilder.CreateCylinder('barrel', {
                    height: 1.2,
                    diameter: 0.8,
                    tessellation: 12
                }, this.scene);
                break;
            case 'crate':
                prop = BABYLON.MeshBuilder.CreateBox('crate', {
                    size: 0.8
                }, this.scene);
                break;
            case 'sack':
                prop = BABYLON.MeshBuilder.CreateSphere('sack', {
                    diameter: 0.6,
                    segments: 8
                }, this.scene);
                prop.scaling.y = 0.5;
                break;
        }

        if (prop) {
            prop.position = position.clone();
            prop.position.y += 0.4;
            prop.rotation.y = Math.random() * Math.PI * 2;

            const propMaterial = new BABYLON.StandardMaterial(`${type}Mat`, this.scene);
            switch (type) {
                case 'barrel':
                    propMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
                    break;
                case 'crate':
                    propMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2);
                    break;
                case 'sack':
                    propMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.5);
                    break;
            }
            prop.material = propMaterial;
        }
    }

    generateInventory(stallType) {
        const inventory = {
            items: [],
            gold: 100 + Math.random() * 100
        };

        const itemTypes = this.getItemTypes(stallType);
        itemTypes.forEach(item => {
            inventory.items.push({
                name: item.name,
                quantity: Math.floor(5 + Math.random() * 10),
                price: item.basePrice * (0.8 + Math.random() * 0.4)
            });
        });

        return inventory;
    }

    getItemTypes(stallType) {
        switch (stallType) {
            case 'FOOD':
                return [
                    { name: 'Bread', basePrice: 2 },
                    { name: 'Fruit', basePrice: 1 },
                    { name: 'Meat', basePrice: 5 },
                    { name: 'Vegetables', basePrice: 1 }
                ];
            case 'CRAFTS':
                return [
                    { name: 'Pottery', basePrice: 8 },
                    { name: 'Basket', basePrice: 4 },
                    { name: 'Woodcraft', basePrice: 6 },
                    { name: 'Jewelry', basePrice: 15 }
                ];
            case 'TOOLS':
                return [
                    { name: 'Hammer', basePrice: 10 },
                    { name: 'Axe', basePrice: 12 },
                    { name: 'Shovel', basePrice: 8 },
                    { name: 'Saw', basePrice: 9 }
                ];
            case 'CLOTHING':
                return [
                    { name: 'Shirt', basePrice: 6 },
                    { name: 'Pants', basePrice: 7 },
                    { name: 'Hat', basePrice: 4 },
                    { name: 'Boots', basePrice: 8 }
                ];
            default:
                return [];
        }
    }

    dispose() {
        this.stalls.forEach(stall => {
            stall.meshes.forEach(mesh => {
                if (mesh && mesh.dispose) {
                    mesh.dispose();
                }
            });
        });
        this.stalls = [];
        this.merchants.clear();
    }
}
