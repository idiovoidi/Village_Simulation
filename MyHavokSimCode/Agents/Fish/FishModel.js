export class FishModel {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.tailMesh = null;
    }

    create(position) {
        // Create main fish body
        this.mesh = BABYLON.MeshBuilder.CreateBox('fishBody', {
            width: 0.5,
            height: 0.3,
            depth: 1
        }, this.scene);

        // Position the fish
        this.mesh.position = position;

        // Create tail
        this.tailMesh = BABYLON.MeshBuilder.CreateBox('fishTail', {
            width: 0.4,
            height: 0.2,
            depth: 0.3
        }, this.scene);
        this.tailMesh.parent = this.mesh;
        this.tailMesh.position.z = -0.6; // Attach to back of fish

        // Create material
        const fishMaterial = new BABYLON.StandardMaterial('fishMat', this.scene);
        fishMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.8, 1.0);
        fishMaterial.alpha = 0.8;

        // Apply material
        this.mesh.material = fishMaterial;
        this.tailMesh.material = fishMaterial;

        return this.mesh;
    }

    animate(deltaTime) {
        if (this.tailMesh) {
            // Simple tail wagging
            this.tailMesh.rotation.y = Math.sin(deltaTime * 5) * 0.5;
        }
    }
}
