export class BowlCreator {
    constructor(scene) {
        this.scene = scene;
    }

    createBowl(bowlRadius = 100, bowlDepth = 25, segments = 96) {
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
                
                // Base bowl shape with gentler slope
                let y = this.smoothBowlShape(distFromCenter, bowlRadius, bowlDepth);
                
                // Add landscape features
                y += this.getLandscapeHeight(x, z, bowlRadius);
                
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
        // Gentler bowl curve
        const t = Math.min(1, Math.pow(distance / radius, 0.8));
        const smoothStep = t * t * (3 - 2 * t);
        return -depth * smoothStep;
    }

    getGradient(distance, radius, depth) {
        // Calculate gradient for normal vectors
        const t = Math.min(1, distance / radius);
        return (6 * t * (1 - t) * depth) / radius;
    }

    getLandscapeHeight(x, z, bowlRadius) {
        let height = 0;
        
        // Central valley system
        const valleyWidth = bowlRadius * 0.6;
        height += this.createValley(x, z, valleyWidth) * 8;
        
        // Multiple plateaus
        height += this.createPlateau(x, z, bowlRadius * 0.3, -5, 0.3);
        height += this.createPlateau(x - bowlRadius * 0.4, z + bowlRadius * 0.4, bowlRadius * 0.2, -3, 0.6);
        height += this.createPlateau(x + bowlRadius * 0.4, z - bowlRadius * 0.4, bowlRadius * 0.15, -4, 0.4);
        
        // Rolling hills
        height += this.createHills(x, z, bowlRadius);
        
        // Ridges
        height += this.createRidges(x, z, bowlRadius);
        
        // Smooth transition at edges
        const edgeFade = 1 - Math.pow(Math.sqrt(x*x + z*z) / bowlRadius, 6);
        return height * Math.max(0, edgeFade);
    }

    createValley(x, z, width) {
        // Create a winding valley system
        const noise = Math.sin(x/20) * 5 + Math.cos(z/15) * 3;
        const modifiedX = x + noise;
        const modifiedZ = z + noise;
        
        const dist = Math.sqrt(modifiedX * modifiedX + modifiedZ * modifiedZ);
        return Math.sin(dist / 15) * Math.exp(-Math.pow(dist / width, 2));
    }

    createPlateau(x, z, radius, height, sharpness) {
        // Create smooth plateaus
        const dist = Math.sqrt(x * x + z * z);
        return height * (1 / (1 + Math.pow(dist / radius, 1/sharpness)));
    }

    createHills(x, z, bowlRadius) {
        // Create rolling hills using noise-like functions
        const scale = bowlRadius * 0.1;
        let hills = 0;
        
        hills += Math.sin(x/scale) * Math.cos(z/scale) * 2;
        hills += Math.sin((x + z)/scale) * Math.cos((x - z)/scale) * 1.5;
        hills += Math.sin(x/(scale*2)) * Math.cos(z/(scale*1.5)) * 3;
        
        return hills;
    }

    createRidges(x, z, bowlRadius) {
        // Create ridge lines
        const angle = Math.atan2(z, x);
        const dist = Math.sqrt(x * x + z * z);
        
        let ridges = Math.sin(angle * 4) * Math.exp(-Math.pow(dist / (bowlRadius * 0.7), 2)) * 5;
        ridges += Math.sin(angle * 6 + dist/20) * Math.exp(-Math.pow(dist / (bowlRadius * 0.5), 2)) * 3;
        
        return ridges;
    }

    createWalls(bowlRadius, bowlDepth, bowlMaterial) {
        const wallHeight = 30; // Even taller walls
        const wallThickness = 8; // Thicker walls
        
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
        }
    }
} 