interface HouseDimensions {
    width: number;
    height: number;
    depth: number;
    roofHeight: number;
    doorWidth: number;
    doorHeight: number;
    windowSize: number;
}

type HouseVariant = 'basic' | 'small' | 'large';

export class HouseModel {
    private scene: BABYLON.Scene;
    private meshes: (BABYLON.TransformNode | BABYLON.Mesh)[] = [];
    private particleSystems: BABYLON.ParticleSystem[] = [];

    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
    }

    createHouse(position: BABYLON.Vector3, rotation: number, variant: HouseVariant = 'basic'): BABYLON.TransformNode {
        // House dimensions based on variant
        const dimensions = this.getHouseDimensions(variant);

        // Create house container
        const house = new BABYLON.TransformNode('house', this.scene);
        house.position = position;
        house.rotation.y = rotation;

        // Create house components
        this.createFoundation(house, dimensions);
        this.createMainBuilding(house, dimensions);
        this.createDoor(house, dimensions);
        this.createWindows(house, dimensions);
        this.createRoof(house, dimensions);
        this.createChimney(house, dimensions);

        this.meshes.push(house);
        return house;
    }

    private getHouseDimensions(variant: HouseVariant): HouseDimensions {
        const baseWidth = 5;
        const baseHeight = 4;
        const baseDepth = 6;

        switch (variant) {
            case 'small':
                return {
                    width: baseWidth * 0.7,
                    height: baseHeight * 0.8,
                    depth: baseDepth * 0.7,
                    roofHeight: 1.5,
                    doorWidth: 1,
                    doorHeight: baseHeight * 0.7 * 0.8,
                    windowSize: 0.8
                };
            case 'large':
                return {
                    width: baseWidth * 1.4,
                    height: baseHeight * 1.2,
                    depth: baseDepth * 1.4,
                    roofHeight: 3,
                    doorWidth: 1.4,
                    doorHeight: baseHeight * 0.7 * 1.2,
                    windowSize: 1.2
                };
            default: // 'basic'
                return {
                    width: baseWidth,
                    height: baseHeight,
                    depth: baseDepth,
                    roofHeight: 2,
                    doorWidth: 1.2,
                    doorHeight: baseHeight * 0.7,
                    windowSize: 1
                };
        }
    }

    private createFoundation(house: BABYLON.TransformNode, dimensions: HouseDimensions): void {
        const foundation = BABYLON.MeshBuilder.CreateBox('foundation', {
            width: dimensions.width * 1.2,
            height: 1,
            depth: dimensions.depth * 1.2
        }, this.scene);

        foundation.parent = house;
        foundation.position.y = 0.5;

        const foundationMat = new BABYLON.StandardMaterial('foundationMat', this.scene);
        foundationMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        foundation.material = foundationMat;

        this.meshes.push(foundation);
    }

    private createMainBuilding(house: BABYLON.TransformNode, dimensions: HouseDimensions): void {
        const building = BABYLON.MeshBuilder.CreateBox('building', {
            width: dimensions.width,
            height: dimensions.height,
            depth: dimensions.depth
        }, this.scene);

        building.parent = house;
        building.position.y = dimensions.height / 2 + 1;

        const buildingMat = new BABYLON.StandardMaterial('buildingMat', this.scene);
        buildingMat.diffuseColor = new BABYLON.Color3(
            0.8 + Math.random() * 0.2,
            0.7 + Math.random() * 0.2,
            0.6 + Math.random() * 0.2
        );
        building.material = buildingMat;

        this.meshes.push(building);
    }

    private createDoor(house: BABYLON.TransformNode, dimensions: HouseDimensions): void {
        // Door
        const door = BABYLON.MeshBuilder.CreatePlane('door', {
            height: dimensions.doorHeight,
            width: dimensions.doorWidth
        }, this.scene);

        door.parent = house;
        door.position.y = dimensions.doorHeight / 2 + 1;
        door.position.z = dimensions.depth / 2 + 0.01;

        // Door frame
        const doorFrame = BABYLON.MeshBuilder.CreateBox('doorFrame', {
            height: dimensions.doorHeight + 0.2,
            width: dimensions.doorWidth + 0.2,
            depth: 0.1
        }, this.scene);

        doorFrame.parent = house;
        doorFrame.position.y = dimensions.doorHeight / 2 + 1;
        doorFrame.position.z = dimensions.depth / 2;

        // Materials
        const doorMat = new BABYLON.StandardMaterial('doorMat', this.scene);
        doorMat.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        door.material = doorMat;

        const doorFrameMat = new BABYLON.StandardMaterial('doorFrameMat', this.scene);
        doorFrameMat.diffuseColor = new BABYLON.Color3(0.35, 0.15, 0.05);
        doorFrame.material = doorFrameMat;

        this.meshes.push(door, doorFrame);
    }

    private createWindows(house: BABYLON.TransformNode, dimensions: HouseDimensions): void {
        const windowHeight = dimensions.height * 0.6;
        const windows: BABYLON.Mesh[] = [];

        // Front windows
        for (let i = -1; i <= 1; i += 2) {
            const frontWindow = BABYLON.MeshBuilder.CreatePlane('windowFront', {
                height: dimensions.windowSize,
                width: dimensions.windowSize
            }, this.scene);
            frontWindow.parent = house;
            frontWindow.position.y = windowHeight;
            frontWindow.position.x = i * (dimensions.width / 3);
            frontWindow.position.z = dimensions.depth / 2 + 0.01;
            windows.push(frontWindow);

            // Window frame
            const windowFrame = BABYLON.MeshBuilder.CreateBox('windowFrame', {
                height: dimensions.windowSize + 0.2,
                width: dimensions.windowSize + 0.2,
                depth: 0.1
            }, this.scene);
            windowFrame.parent = house;
            windowFrame.position.y = windowHeight;
            windowFrame.position.x = i * (dimensions.width / 3);
            windowFrame.position.z = dimensions.depth / 2;
            windows.push(windowFrame);
        }

        // Side windows
        for (let side = -1; side <= 1; side += 2) {
            for (let pos = -1; pos <= 1; pos += 2) {
                const sideWindow = BABYLON.MeshBuilder.CreatePlane('windowSide', {
                    height: dimensions.windowSize,
                    width: dimensions.windowSize
                }, this.scene);
                sideWindow.parent = house;
                sideWindow.position.y = windowHeight;
                sideWindow.position.x = dimensions.width / 2 * side + 0.01 * side;
                sideWindow.position.z = pos * (dimensions.depth / 3);
                sideWindow.rotation.y = Math.PI / 2;
                windows.push(sideWindow);

                // Window frame
                const windowFrame = BABYLON.MeshBuilder.CreateBox('windowFrame', {
                    height: dimensions.windowSize + 0.2,
                    width: dimensions.windowSize + 0.2,
                    depth: 0.1
                }, this.scene);
                windowFrame.parent = house;
                windowFrame.position.y = windowHeight;
                windowFrame.position.x = dimensions.width / 2 * side;
                windowFrame.position.z = pos * (dimensions.depth / 3);
                windowFrame.rotation.y = Math.PI / 2;
                windows.push(windowFrame);
            }
        }

        // Window materials
        const windowMat = new BABYLON.StandardMaterial('windowMat', this.scene);
        windowMat.diffuseColor = new BABYLON.Color3(0.3, 0.4, 1.0);
        windowMat.alpha = 0.7;
        windowMat.specularColor = new BABYLON.Color3(0.2, 0.3, 1.0);
        windowMat.specularPower = 32;
        windowMat.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.5);
        windowMat.ambientColor = new BABYLON.Color3(0.4, 0.6, 1.0);
        windowMat.backFaceCulling = false;

        const windowFrameMat = new BABYLON.StandardMaterial('windowFrameMat', this.scene);
        windowFrameMat.diffuseColor = new BABYLON.Color3(0.35, 0.15, 0.05);
        windowFrameMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        windows.forEach(window => {
            if (window.name.includes('Frame')) {
                window.material = windowFrameMat;
            } else {
                window.material = windowMat;
            }
        });

        this.meshes.push(...windows);
    }

    private createRoof(house: BABYLON.TransformNode, dimensions: HouseDimensions): void {
        const roof = BABYLON.MeshBuilder.CreateCylinder('roof', {
            height: dimensions.roofHeight,
            diameter: Math.sqrt(dimensions.width * dimensions.width + dimensions.depth * dimensions.depth),
            tessellation: 4
        }, this.scene);

        roof.parent = house;
        roof.position.y = dimensions.height + dimensions.roofHeight / 2 + 1;
        roof.rotation.y = Math.PI / 4;

        const roofMat = new BABYLON.StandardMaterial('roofMat', this.scene);
        roofMat.diffuseColor = new BABYLON.Color3(
            0.4 + Math.random() * 0.2,
            0.2 + Math.random() * 0.2,
            0.1 + Math.random() * 0.1
        );
        roof.material = roofMat;

        this.meshes.push(roof);
    }

    private createChimney(house: BABYLON.TransformNode, dimensions: HouseDimensions): void {
        const chimneyHeight = dimensions.roofHeight;
        const chimney = BABYLON.MeshBuilder.CreateBox('chimney', {
            width: 0.6,
            height: chimneyHeight,
            depth: 0.6
        }, this.scene);

        chimney.parent = house;
        chimney.position.x = dimensions.width * 0.3;
        chimney.position.y = dimensions.height + dimensions.roofHeight + 1;
        chimney.position.z = dimensions.depth * 0.3;

        const chimneyMat = new BABYLON.StandardMaterial('chimneyMat', this.scene);
        chimneyMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        chimney.material = chimneyMat;

        this.meshes.push(chimney);
        this.createChimneyEffects(chimney.getAbsolutePosition());
    }

    private createChimneyEffects(position: BABYLON.Vector3): void {
        // Fire particles
        const fireSystem = new BABYLON.ParticleSystem('fire', 100, this.scene);
        fireSystem.particleTexture = new BABYLON.Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', this.scene);

        fireSystem.emitter = new BABYLON.Vector3(position.x, position.y + 0.3, position.z);
        fireSystem.minEmitBox = new BABYLON.Vector3(-0.2, 0, -0.2);
        fireSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0, 0.2);

        fireSystem.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
        fireSystem.color2 = new BABYLON.Color4(1, 0.3, 0, 1.0);
        fireSystem.colorDead = new BABYLON.Color4(0.5, 0, 0, 0.0);

        fireSystem.minSize = 0.3;
        fireSystem.maxSize = 0.6;
        fireSystem.minLifeTime = 0.5;
        fireSystem.maxLifeTime = 1.0;
        fireSystem.emitRate = 50;

        fireSystem.direction1 = new BABYLON.Vector3(-0.2, 1, -0.2);
        fireSystem.direction2 = new BABYLON.Vector3(0.2, 1, 0.2);

        fireSystem.minEmitPower = 1;
        fireSystem.maxEmitPower = 2;
        fireSystem.updateSpeed = 0.01;

        fireSystem.start();
        this.particleSystems.push(fireSystem);

        // Smoke particles
        const smokeSystem = new BABYLON.ParticleSystem('smoke', 50, this.scene);
        smokeSystem.particleTexture = fireSystem.particleTexture;
        smokeSystem.emitter = new BABYLON.Vector3(position.x, position.y + 1, position.z);

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
        this.particleSystems.push(smokeSystem);
    }

    dispose(): void {
        this.meshes.forEach(mesh => {
            if (mesh && mesh.dispose) {
                mesh.dispose();
            }
        });
        this.meshes = [];

        this.particleSystems.forEach(system => {
            if (system && system.dispose) {
                system.dispose();
            }
        });
        this.particleSystems = [];
    }
}
