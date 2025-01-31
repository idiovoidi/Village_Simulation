export class BowlCreator {
    constructor(scene) {
        this.scene = scene;
    }

    createBowl(bowlRadius = 20, bowlDepth = 5, segments = 36) {
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
                const y = -Math.pow(distFromCenter / bowlRadius, 2) * bowlDepth;
                
                positions.push(x, y, z);
                
                // Calculate normal for this vertex
                const nx = x / bowlRadius;
                const nz = z / bowlRadius;
                const ny = 1;
                const normal = new BABYLON.Vector3(nx, ny, nz).normalize();
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
        
        const bowlMaterial = new BABYLON.StandardMaterial("bowlMat", this.scene);
        bowlMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        bowlMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        bowlMaterial.backFaceCulling = false;
        bowl_mesh.material = bowlMaterial;

        // Add physics to bowl
        new BABYLON.PhysicsAggregate(
            bowl_mesh,
            BABYLON.PhysicsShapeType.MESH,
            { mass: 0, restitution: 0.5, friction: 0.8 },
            this.scene
        );

        this.createWalls(bowlRadius, bowlDepth, bowlMaterial);
        
        return bowl_mesh;
    }

    createWalls(bowlRadius, bowlDepth, bowlMaterial) {
        const wallHeight = 10;
        const wallThickness = 1;
        
        for (let i = 0; i < 4; i++) {
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
                { mass: 0, restitution: 0.5, friction: 0.8 },
                this.scene
            );
        }
    }
} 