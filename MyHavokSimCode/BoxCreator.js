export class BoxCreator {
    constructor(scene) {
        this.scene = scene;
        this.boxes = [];
    }

    createBoxes(count = 20, bowlRadius = 20) {
        for (let i = 0; i < count; i++) {
            const box = BABYLON.MeshBuilder.CreateBox(`box${i}`, {
                size: 1
            }, this.scene);
            
            const boxMaterial = new BABYLON.StandardMaterial(`boxMat${i}`, this.scene);
            boxMaterial.diffuseColor = new BABYLON.Color3(
                Math.random(),
                Math.random(),
                Math.random()
            );
            box.material = boxMaterial;

            box.position = new BABYLON.Vector3(
                Math.random() * bowlRadius - bowlRadius/2,
                20 + i * 2,
                Math.random() * bowlRadius - bowlRadius/2
            );

            box.physicsAggregate = new BABYLON.PhysicsAggregate(
                box,
                BABYLON.PhysicsShapeType.BOX,
                { mass: 1, restitution: 0.7, friction: 0.5 },
                this.scene
            );

            this.boxes.push(box);
        }
        
        return this.boxes;
    }
} 