export class HouseSystem {
    constructor(scene) {
        this.scene = scene;
        this.houses = [];
        this.houseCount = 12;  // Number of houses to create
        this.roadRadius = 85;  // Match road radius
        this.houseRadius = 90; // Slightly outside the road
        this.init();
    }

    init() {
        this.createHouses();
    }

    createHouses() {
        for (let i = 0; i < this.houseCount; i++) {
            const angle = (i / this.houseCount) * Math.PI * 2;
            // Add some randomness to placement
            const radius = this.houseRadius + (Math.random() * 5 - 2.5);
            const rotationOffset = (Math.random() * 0.2 - 0.1); // Slight random rotation

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = this.getTerrainHeight(x, z);

            this.createHouse(x, y, z, angle + rotationOffset);
        }
    }

    createHouse(x, y, z, angle) {
        // Random house properties
        const width = 4 + Math.random() * 2;
        const height = 5 + Math.random() * 2;
        const depth = 6 + Math.random() * 2;
        const roofHeight = 2 + Math.random();

        // Create house container
        const house = new BABYLON.TransformNode("house", this.scene);
        house.position = new BABYLON.Vector3(x, y, z);
        house.rotation.y = angle + Math.PI / 2; // Face perpendicular to road

        // Create main building
        const building = BABYLON.MeshBuilder.CreateBox("building", {
            width: width,
            height: height,
            depth: depth
        }, this.scene);
        building.parent = house;
        building.position.y = height / 2;

        // Create roof (pyramid)
        const roof = BABYLON.MeshBuilder.CreateCylinder("roof", {
            height: roofHeight,
            diameter: Math.sqrt(width * width + depth * depth),
            tessellation: 4
        }, this.scene);
        roof.parent = house;
        roof.position.y = height + roofHeight / 2;
        roof.rotation.y = Math.PI / 4;

        // Create door
        const door = BABYLON.MeshBuilder.CreatePlane("door", {
            width: 1.2,
            height: 2
        }, this.scene);
        door.parent = house;
        door.position.y = 1;
        door.position.z = depth / 2 + 0.01;

        // Create windows
        this.createWindows(house, width, height, depth);

        // Materials
        const buildingMat = new BABYLON.StandardMaterial("buildingMat", this.scene);
        buildingMat.diffuseColor = new BABYLON.Color3(
            0.7 + Math.random() * 0.3,
            0.7 + Math.random() * 0.3,
            0.7 + Math.random() * 0.3
        );

        const roofMat = new BABYLON.StandardMaterial("roofMat", this.scene);
        roofMat.diffuseColor = new BABYLON.Color3(
            0.4 + Math.random() * 0.2,
            0.2 + Math.random() * 0.2,
            0.1 + Math.random() * 0.1
        );

        const doorMat = new BABYLON.StandardMaterial("doorMat", this.scene);
        doorMat.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);

        building.material = buildingMat;
        roof.material = roofMat;
        door.material = doorMat;

        // Add to houses array
        this.houses.push(house);

        // Add chimney
        if (Math.random() > 0.5) {
            this.addChimney(house, width, height, depth, roofHeight);
        }

        // Add front yard elements
        this.addYardElements(house, width, depth);
    }

    createWindows(house, width, height, depth) {
        const windowMat = new BABYLON.StandardMaterial("windowMat", this.scene);
        windowMat.diffuseColor = new BABYLON.Color3(0.7, 0.8, 1);
        windowMat.alpha = 0.5;

        // Front windows
        const windowPositions = [
            { x: -width/4, y: height * 0.7, z: depth/2 + 0.01 },
            { x: width/4, y: height * 0.7, z: depth/2 + 0.01 },
            { x: -width/4, y: height * 0.3, z: depth/2 + 0.01 },
            { x: width/4, y: height * 0.3, z: depth/2 + 0.01 }
        ];

        windowPositions.forEach(pos => {
            const window = BABYLON.MeshBuilder.CreatePlane("window", {
                width: 1,
                height: 1
            }, this.scene);
            window.parent = house;
            window.position = new BABYLON.Vector3(pos.x, pos.y, pos.z);
            window.material = windowMat;
        });
    }

    addChimney(house, width, height, depth, roofHeight) {
        const chimney = BABYLON.MeshBuilder.CreateBox("chimney", {
            width: 0.6,
            height: 2,
            depth: 0.6
        }, this.scene);
        chimney.parent = house;
        chimney.position = new BABYLON.Vector3(
            width/4,
            height + roofHeight + 0.5,
            depth/4
        );

        const chimneyMat = new BABYLON.StandardMaterial("chimneyMat", this.scene);
        chimneyMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        chimney.material = chimneyMat;
    }

    addYardElements(house, width, depth) {
        // Add a small fence or bushes
        const yardDepth = 3;
        const fenceWidth = width * 1.5;
        
        for (let x = -fenceWidth/2; x <= fenceWidth/2; x += 1) {
            if (Math.random() > 0.3) {
                const bush = BABYLON.MeshBuilder.CreateSphere("bush", {
                    diameter: 0.8 + Math.random() * 0.4
                }, this.scene);
                bush.parent = house;
                bush.position = new BABYLON.Vector3(x, 0.4, depth/2 + yardDepth);
                
                const bushMat = new BABYLON.StandardMaterial("bushMat", this.scene);
                bushMat.diffuseColor = new BABYLON.Color3(0.2, 0.4 + Math.random() * 0.2, 0.1);
                bush.material = bushMat;
            }
        }
    }

    getTerrainHeight(x, z) {
        const bowlRadius = 100;
        const bowlDepth = 25;
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        let height = -Math.pow(distFromCenter / bowlRadius, 0.8) * bowlDepth;
        height += Math.sin(x/20) * Math.cos(z/20) * 3;
        
        return height;
    }
} 