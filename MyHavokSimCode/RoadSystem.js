export class RoadSystem {
    constructor(scene) {
        if (!scene) {
            throw new Error("Scene is required for RoadSystem");
        }
        this.scene = scene;
        this.roadMesh = null;
        this.cars = [];
        this.roadWidth = 8;
        this.bowlRadius = 100;
        this.roadHeight = 4; // Increased height above terrain
        this.init();
    }

    init() {
        this.createContourRoad();
        this.createCars(5);
        this.scene.registerBeforeRender(() => this.updateCars());
    }

    createContourRoad() {
        const points = [];
        const segments = 128; // More segments for smoother road
        
        // Create a more natural winding path
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            
            // Vary the radius to create a more natural path
            const baseRadius = this.bowlRadius * 0.75; // Base radius at 75% of bowl
            const radiusVariation = Math.sin(angle * 2) * 10 + Math.cos(angle * 3) * 5;
            const radius = baseRadius + radiusVariation;
            
            // Add some meandering to the path
            const x = Math.cos(angle) * radius + Math.sin(angle * 3) * 5;
            const z = Math.sin(angle) * radius + Math.cos(angle * 3) * 5;
            
            // Get base terrain height and add smooth elevation changes
            const baseHeight = this.getTerrainHeight(x, z);
            const elevationChange = Math.sin(angle * 4) * 2;
            const y = baseHeight + this.roadHeight + elevationChange;
            
            points.push(new BABYLON.Vector3(x, y, z));
        }

        // Smooth out the points to avoid sharp turns
        const smoothedPoints = this.smoothPoints(points, 3);

        // Create the road mesh
        this.roadMesh = BABYLON.MeshBuilder.CreateRibbon("road", {
            pathArray: [smoothedPoints],
            closePath: true,
            width: this.roadWidth,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);

        // Create road material
        const roadMaterial = new BABYLON.StandardMaterial("roadMat", this.scene);
        roadMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        roadMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        this.roadMesh.material = roadMaterial;

        this.roadPoints = smoothedPoints;
        this.createRoadMarkings(smoothedPoints);
    }

    smoothPoints(points, iterations) {
        for (let iter = 0; iter < iterations; iter++) {
            const smoothed = [];
            for (let i = 0; i < points.length; i++) {
                const prev = points[(i - 1 + points.length) % points.length];
                const curr = points[i];
                const next = points[(i + 1) % points.length];
                
                // Average position with neighbors
                smoothed.push(new BABYLON.Vector3(
                    (prev.x + curr.x + next.x) / 3,
                    (prev.y + curr.y + next.y) / 3,
                    (prev.z + curr.z + next.z) / 3
                ));
            }
            points = smoothed;
        }
        return points;
    }

    getTerrainHeight(x, z) {
        const distFromCenter = Math.sqrt(x * x + z * z);
        const bowlDepth = 25;
        
        // Smoother bowl shape
        let height = -Math.pow(distFromCenter / this.bowlRadius, 1.2) * bowlDepth;
        
        // Add gentle terrain variation
        height += Math.sin(x/30) * Math.cos(z/30) * 3;
        height += Math.sin((x + z)/40) * 2;
        
        return height;
    }

    createRoadMarkings(points) {
        for (let i = 0; i < points.length - 1; i += 2) {
            const marking = BABYLON.MeshBuilder.CreateBox("marking", {
                width: 0.3,
                height: 0.05,
                depth: 2
            }, this.scene);

            marking.position = points[i].clone();
            marking.position.y += 0.1;

            // Orient marking to face next point
            const direction = points[i + 1].subtract(points[i]);
            marking.rotation.y = Math.atan2(direction.x, direction.z);

            const markingMaterial = new BABYLON.StandardMaterial("markingMat", this.scene);
            markingMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
            markingMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            marking.material = markingMaterial;
        }
    }

    createCars(count) {
        for (let i = 0; i < count; i++) {
            const carMesh = BABYLON.MeshBuilder.CreateBox("car", {
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
            carMesh.material = carMaterial;

            this.cars.push({
                mesh: carMesh,
                progress: Math.random(),
                speed: 0.001 + Math.random() * 0.001
            });
        }
    }

    updateCars() {
        this.cars.forEach(car => {
            car.progress += car.speed;
            if (car.progress >= 1) car.progress -= 1;

            // Find current position on road
            const index = Math.floor(car.progress * (this.roadPoints.length - 1));
            const nextIndex = (index + 1) % this.roadPoints.length;
            const t = car.progress * (this.roadPoints.length - 1) - index;

            // Interpolate position
            const position = BABYLON.Vector3.Lerp(
                this.roadPoints[index],
                this.roadPoints[nextIndex],
                t
            );
            position.y += 1; // Lift slightly above road

            car.mesh.position = position;

            // Orient car to face direction of travel
            const direction = this.roadPoints[nextIndex].subtract(this.roadPoints[index]);
            car.mesh.rotation.y = Math.atan2(direction.x, direction.z);

            // Tilt car to match road slope
            const normal = BABYLON.Vector3.Cross(direction, BABYLON.Axis.Y);
            normal.normalize();
            const up = BABYLON.Vector3.Cross(direction, normal);
            up.normalize();
            
            const slope = Math.atan2(direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z));
            car.mesh.rotation.x = slope;
        });
    }
} 