export class LevelMaps {
    static VILLAGE_MAP = {
        groundColor: "#7CAE7A",  // Green grass
        waterColor: "#4A90E2",   // Blue water
        roads: [
            { type: "circle", radius: 15, color: "#8B7355" },  // Main plaza
            { type: "path", points: [[0, 0], [30, 0]], color: "#8B7355" },  // Main road
            { type: "path", points: [[0, 0], [0, 30]], color: "#8B7355" },  // Cross road
        ],
        buildings: [
            { x: 20, z: 5, size: 3, color: "#CD853F" },
            { x: 5, z: 20, size: 3, color: "#CD853F" },
            { x: -20, z: 5, size: 3, color: "#CD853F" },
            { x: -5, z: -20, size: 3, color: "#CD853F" },
        ],
        trees: [
            { x: 25, z: 25 }, { x: -25, z: 25 }, { x: 25, z: -25 }, { x: -25, z: -25 },
            { x: 15, z: 15 }, { x: -15, z: 15 }, { x: 15, z: -15 }, { x: -15, z: -15 }
        ]
    };

    static ZOMBIE_MAP = {
        groundColor: "#4A4A4A",  // Dark ground
        waterColor: "#2C3E50",   // Dark water
        roads: [
            { type: "circle", radius: 15, color: "#2C2C2C" },  // Main plaza
            { type: "path", points: [[0, 0], [30, 0]], color: "#2C2C2C" },
            { type: "path", points: [[0, 0], [0, 30]], color: "#2C2C2C" },
        ],
        buildings: [
            { x: 20, z: 5, size: 3, color: "#696969" },
            { x: 5, z: 20, size: 3, color: "#696969" },
            { x: -20, z: 5, size: 3, color: "#696969" },
            { x: -5, z: -20, size: 3, color: "#696969" },
        ],
        trees: [
            { x: 25, z: 25 }, { x: -25, z: 25 }, { x: 25, z: -25 }, { x: -25, z: -25 }
        ]
    };

    static NATURE_MAP = {
        groundColor: "#90EE90",  // Light green
        waterColor: "#87CEEB",   // Sky blue
        roads: [],  // No roads in nature reserve
        buildings: [],  // No buildings in nature reserve
        trees: [
            { x: 0, z: 0 }, { x: 10, z: 10 }, { x: -10, z: 10 }, { x: 10, z: -10 }, { x: -10, z: -10 },
            { x: 20, z: 0 }, { x: 0, z: 20 }, { x: -20, z: 0 }, { x: 0, z: -20 },
            { x: 25, z: 25 }, { x: -25, z: 25 }, { x: 25, z: -25 }, { x: -25, z: -25 }
        ]
    };

    static createMapPreview(scene, mapData, size = 200) {
        const container = new BABYLON.GUI.Rectangle("mapPreview");
        container.width = size + "px";
        container.height = size + "px";
        container.thickness = 2;
        container.color = "white";
        container.cornerRadius = 10;
        container.background = mapData.groundColor;

        // Create water
        if (mapData.waterColor) {
            const water = new BABYLON.GUI.Ellipse();
            water.width = "80%";
            water.height = "80%";
            water.background = mapData.waterColor;
            water.thickness = 0;
            container.addControl(water);
        }

        // Draw roads
        mapData.roads.forEach(road => {
            if (road.type === "circle") {
                const circle = new BABYLON.GUI.Ellipse();
                circle.width = (road.radius * 2) + "px";
                circle.height = (road.radius * 2) + "px";
                circle.background = road.color;
                circle.thickness = 0;
                container.addControl(circle);
            } else if (road.type === "path") {
                // Convert path points to preview coordinates
                const scale = size / 100;
                road.points.forEach((point, i) => {
                    if (i < road.points.length - 1) {
                        const line = new BABYLON.GUI.Line();
                        line.x1 = point[0] * scale + (size / 2);
                        line.y1 = point[1] * scale + (size / 2);
                        line.x2 = road.points[i + 1][0] * scale + (size / 2);
                        line.y2 = road.points[i + 1][1] * scale + (size / 2);
                        line.color = road.color;
                        line.thickness = 4;
                        container.addControl(line);
                    }
                });
            }
        });

        // Draw buildings
        mapData.buildings.forEach(building => {
            const scale = size / 100;
            const house = new BABYLON.GUI.Rectangle();
            house.width = (building.size * scale) + "px";
            house.height = (building.size * scale) + "px";
            house.background = building.color;
            house.thickness = 0;
            house.left = (building.x * scale) + "px";
            house.top = (building.z * scale) + "px";
            container.addControl(house);
        });

        // Draw trees
        mapData.trees.forEach(tree => {
            const scale = size / 100;
            const treeIcon = new BABYLON.GUI.Ellipse();
            treeIcon.width = "6px";
            treeIcon.height = "6px";
            treeIcon.background = "#228B22";
            treeIcon.thickness = 0;
            treeIcon.left = (tree.x * scale) + "px";
            treeIcon.top = (tree.z * scale) + "px";
            container.addControl(treeIcon);
        });

        return container;
    }
} 