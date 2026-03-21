export class BloodDecalManager {
    constructor(scene) {
        this.scene = scene;
        this.decals = [];
        this.maxDecals = 50;

        // Create a reusable material for the decals
        this.decalMaterial = new BABYLON.StandardMaterial('bloodDecalMaterial', this.scene);
        this.decalMaterial.diffuseTexture = new BABYLON.Texture('https://www.babylonjs-playground.com/textures/impact.png', this.scene);
        this.decalMaterial.diffuseTexture.hasAlpha = true;
        this.decalMaterial.zOffset = -2;
    }

    createBloodDecal(position) {
        if (this.decals.length >= this.maxDecals) {
            // Remove the oldest decal
            const oldestDecal = this.decals.shift();
            oldestDecal.dispose();
        }

        const decalSize = new BABYLON.Vector3(2, 2, 2);
        const decal = BABYLON.MeshBuilder.CreateDecal('bloodDecal', this.scene.getMeshByName('ground'), {
            position,
            normal: new BABYLON.Vector3(0, 1, 0),
            size: decalSize
        });

        decal.material = this.decalMaterial;
        this.decals.push(decal);
    }

    dispose() {
        this.decals.forEach(decal => decal.dispose());
        this.decals = [];
        if (this.decalMaterial) {
            this.decalMaterial.dispose();
        }
    }
}
