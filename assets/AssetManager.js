export class AssetManager {
    static TexturePaths = {
        // Road textures
        ROAD_DIFFUSE: './assets/textures/road_diffuse.png',
        ROAD_NORMAL: './assets/textures/road_normal.png',
        ROCK: './assets/textures/rock.png',
        ROCK_NORMAL: './assets/textures/rockn.png',
        GRASS: './assets/textures/grass.png',
        GRASS_NORMAL: './assets/textures/grassn.png',

        // House textures
        HOUSE_BRICK: './assets/textures/brick.png',
        HOUSE_BRICK_NORMAL: './assets/textures/brick_normal.png',
        ROOF_TILES: './assets/textures/roof_tiles.png',
        DOOR_WOOD: './assets/textures/door_wood.png',
        WINDOW_GLASS: './assets/textures/window_glass.png'
    };

    static async preloadTextures(scene) {
        const texturePromises = Object.values(this.TexturePaths).map(path => {
            return new Promise((resolve, reject) => {
                const texture = new BABYLON.Texture(path, scene, false, false, BABYLON.Texture.BILINEAR_SAMPLINGMODE, 
                    () => resolve(texture),
                    (err) => {
                        console.warn(`Failed to load texture: ${path}`, err);
                        resolve(null); // Resolve with null instead of rejecting to handle missing textures gracefully
                    }
                );
            });
        });

        try {
            await Promise.all(texturePromises);
            console.log("All textures preloaded successfully");
        } catch (error) {
            console.error("Error preloading textures:", error);
        }
    }

    static getTexture(textureName, scene) {
        const path = this.TexturePaths[textureName];
        if (!path) {
            console.warn(`Texture path not found for: ${textureName}`);
            return null;
        }
        return new BABYLON.Texture(path, scene);
    }
} 