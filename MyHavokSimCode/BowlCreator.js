export class BowlCreator {
    constructor(scene) {
        this.scene = scene;
    }

    createBowl(bowlRadius = 50, bowlDepth = 15, segments = 64) {
        const positions = [];
        const indices = [];
        const uvs = [];
        const normals = [];
        
        // Create vertices for bowl shape
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                const x = ((i / segments) * 2 - 1) * bowlRadius;
                const z = ((j / segments) * 2 - 1) * bowlRadius;
                const distFromCenter = Math.sqrt(x * x + z * z);
                
                // Smooth bowl shape with cubic interpolation
                let y = this.smoothBowlShape(distFromCenter, bowlRadius, bowlDepth);
                
                // Add large-scale terrain features
                y += this.getTerrainHeight(x, z, bowlRadius);
                
                positions.push(x, y, z);
                
                // Calculate smooth normals
                const gradient = this.getGradient(distFromCenter, bowlRadius, bowlDepth);
                const normal = new BABYLON.Vector3(x * gradient, 1, z * gradient).normalize();
                normals.push(normal.x, normal.y, normal.z);
                
                uvs.push(i / segments, j / segments);
            }
        }
        
        // Create indices for triangles
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const baseIdx = i * (segments + 1) + j;
                indices.push(
                    baseIdx, baseIdx + 1, baseIdx + segments + 1,
                    baseIdx + 1, baseIdx + segments + 2, baseIdx + segments + 1
                );
            }
        }
        
        const bowl_mesh = new BABYLON.Mesh("bowl", this.scene);
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.uvs = uvs;
        vertexData.normals = normals;
        vertexData.applyToMesh(bowl_mesh);
        
        // Create material with better visual feedback
        const bowlMaterial = new BABYLON.StandardMaterial("bowlMat", this.scene);
        bowlMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        bowlMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        bowlMaterial.backFaceCulling = false;
        bowlMaterial.wireframe = false;
        bowl_mesh.material = bowlMaterial;

        // Add physics to bowl
        new BABYLON.PhysicsAggregate(
            bowl_mesh,
            BABYLON.PhysicsShapeType.MESH,
            { mass: 0, restitution: 0.7, friction: 1.0 },
            this.scene
        );

        this.createWalls(bowlRadius, bowlDepth, bowlMaterial);
        
        return bowl_mesh;
    }

    smoothBowlShape(distance, radius, depth) {
        // Cubic interpolation for smoother bowl shape
        const t = Math.min(1, distance / radius);
        const smoothStep = t * t * (3 - 2 * t);
        return -depth * smoothStep;
    }

    getGradient(distance, radius, depth) {
        // Calculate gradient for normal vectors
        const t = Math.min(1, distance / radius);
        return (6 * t * (1 - t) * depth) / radius;
    }

    getTerrainHeight(x, z, bowlRadius) {
        // Simplified terrain with larger, smoother features
        let height = 0;
        
        // Large central platform
        const platformRadius = bowlRadius * 0.2;
        const platformHeight = -2;
        if (Math.sqrt(x*x + z*z) < platformRadius) {
            height += platformHeight;
        }
        
        // Four smooth ramps at cardinal directions
        const rampWidth = bowlRadius * 0.4;
        const rampHeight = 4;
        
        // North-South ramps
        height += this.smoothRamp(x, z, 0, bowlRadius * 0.5, rampWidth, rampHeight);
        height += this.smoothRamp(x, z, 0, -bowlRadius * 0.5, rampWidth, rampHeight);
        
        // East-West ramps
        height += this.smoothRamp(z, x, 0, bowlRadius * 0.5, rampWidth, rampHeight);
        height += this.smoothRamp(z, x, 0, -bowlRadius * 0.5, rampWidth, rampHeight);
        
        // Smooth transition at edges
        const edgeFade = 1 - Math.pow(Math.sqrt(x*x + z*z) / bowlRadius, 8);
        return height * Math.max(0, edgeFade);
    }

    smoothRamp(x, z, centerX, centerZ, width, height) {
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
        const t = Math.max(0, 1 - dist / width);
        return height * Math.pow(t, 2);
    }

    createWalls(bowlRadius, bowlDepth, bowlMaterial) {
        const wallHeight = 20; // Taller walls
        const wallThickness = 5; // Thicker walls
        
        for (let i = 0; i < 4; i++) {
            // Main wall
            const wall = BABYLON.MeshBuilder.CreateBox(`wall${i}`, {
                width: i % 2 === 0 ? bowlRadius * 2 + wallThickness : wallThickness,
                height: wallHeight,
                depth: i % 2 === 0 ? wallThickness : bowlRadius * 2 + wallThickness
            }, this.scene);
            
            wall.position = new BABYLON.Vector3(
                i === 1 ? bowlRadius + wallThickness/2 : i === 3 ? -(bowlRadius + wallThickness/2) : 0,
                wallHeight/2 - bowlDepth,
                i === 0 ? bowlRadius + wallThickness/2 : i === 2 ? -(bowlRadius + wallThickness/2) : 0
            );
            
            wall.material = bowlMaterial;
            wall.visibility = 0.3;
            
            new BABYLON.PhysicsAggregate(
                wall,
                BABYLON.PhysicsShapeType.BOX,
                { mass: 0, restitution: 0.5, friction: 1.0 },
                this.scene
            );

            // Create quarter-pipe transitions at walls
            this.createQuarterPipe(i, bowlRadius, bowlDepth, wallThickness, bowlMaterial);
        }
    }

    createQuarterPipe(wallIndex, bowlRadius, bowlDepth, wallThickness, material) {
        const segments = 12;
        const radius = 8;
        const width = wallIndex % 2 === 0 ? bowlRadius * 2 : radius * 2;
        
        // Create curved quarter-pipe mesh
        const pipe = BABYLON.MeshBuilder.CreateTube(
            `quarterPipe${wallIndex}`,
            {
                path: this.createQuarterCirclePath(radius, segments),
                radius: 5,
                sideOrientation: BABYLON.Mesh.DOUBLESIDE
            },
            this.scene
        );

        // Position the quarter-pipe
        pipe.position = new BABYLON.Vector3(
            wallIndex === 1 ? bowlRadius : wallIndex === 3 ? -bowlRadius : 0,
            -bowlDepth,
            wallIndex === 0 ? bowlRadius : wallIndex === 2 ? -bowlRadius : 0
        );

        // Rotate based on wall position
        pipe.rotation.y = (wallIndex * Math.PI / 2);

        pipe.material = material;

        new BABYLON.PhysicsAggregate(
            pipe,
            BABYLON.PhysicsShapeType.MESH,
            { mass: 0, restitution: 0.7, friction: 1.0 },
            this.scene
        );
    }

    createQuarterCirclePath(radius, segments) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI / 2;
            points.push(new BABYLON.Vector3(
                radius * Math.cos(angle),
                radius * Math.sin(angle),
                0
            ));
        }
        return points;
    }
} 