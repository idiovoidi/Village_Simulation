export class RoadSystem {
    constructor(scene) {
        if (!scene) {
            throw new Error("Scene is required for RoadSystem");
        }
        this.scene = scene;
        this.roadMesh = null;
        this.cars = [];
        this.roadRadius = 120;    // Radius to center of road
        this.roadHeight = 15;     // Height above ground
        this.roadWidth = 8;       // Width of the road
        this.init();
    }

    init() {
        this.createElevatedRoad();
        this.createCars(3);
        this.scene.registerBeforeRender(() => this.updateCars());
    }

    createElevatedRoad() {
        // Create a torus for the elevated road
        this.roadMesh = BABYLON.MeshBuilder.CreateTorus("road", {
            diameter: this.roadRadius * 2,
            thickness: this.roadWidth,
            tessellation: 64,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);

        // Rotate to be horizontal
        this.roadMesh.rotation.x = Math.PI / 2;
        
        // Position above ground
        this.roadMesh.position.y = this.roadHeight;

        // Create road material
        const roadMaterial = new BABYLON.StandardMaterial("roadMat", this.scene);
        roadMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        roadMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        this.roadMesh.material = roadMaterial;

        // Add road markings
        this.createRoadMarkings();
    }

    createRoadMarkings() {
        const segments = 64; // More segments for smoother markings
        const markingLength = 3;   // Length of each marking
        const markingGap = 5;      // Gap between markings
        const totalSpacing = markingLength + markingGap;

        // Calculate total circumference and number of markings
        const circumference = this.roadRadius * Math.PI * 2;
        const markingsCount = Math.floor(circumference / totalSpacing);

        for (let i = 0; i < markingsCount; i++) {
            const angle = (i / markingsCount) * Math.PI * 2;
            
            // Calculate position on the road
            const x = Math.cos(angle) * this.roadRadius;
            const z = Math.sin(angle) * this.roadRadius;

            const marking = BABYLON.MeshBuilder.CreateBox("marking", {
                width: 0.3,        // Thin marking
                height: 0.05,      // Very thin height
                depth: markingLength
            }, this.scene);

            // Position marking on the road surface
            marking.position = new BABYLON.Vector3(x, this.roadHeight + 0.03, z);
            marking.rotation.y = angle + Math.PI / 2;

            // White material for markings
            const markingMaterial = new BABYLON.StandardMaterial("markingMat", this.scene);
            markingMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
            markingMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Make markings glow slightly
            markingMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
            marking.material = markingMaterial;
        }
    }

    createCars(count) {
        for (let i = 0; i < count; i++) {
            const carBody = BABYLON.MeshBuilder.CreateBox("car", {
                width: 2,
                height: 1.5,
                depth: 4
            }, this.scene);

            const carMaterial = new BABYLON.StandardMaterial("carMat", this.scene);
            carMaterial.diffuseColor = new BABYLON.Color3(
                Math.random(),
                Math.random(),
                Math.random()
            );
            carBody.material = carMaterial;

            this.cars.push({
                mesh: carBody,
                angle: (i / count) * Math.PI * 2,
                speed: 0.002 + Math.random() * 0.002
            });
        }
    }

    updateCars() {
        this.cars.forEach(car => {
            car.angle += car.speed;
            if (car.angle > Math.PI * 2) {
                car.angle -= Math.PI * 2;
            }

            // Calculate position on elevated road
            const x = Math.cos(car.angle) * this.roadRadius;
            const z = Math.sin(car.angle) * this.roadRadius;

            // Position slightly above road surface
            car.mesh.position = new BABYLON.Vector3(x, this.roadHeight + 0.8, z);
            car.mesh.rotation.y = car.angle + Math.PI / 2;
        });
    }
} 