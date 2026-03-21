/**
 * Camera Utilities
 * Shared camera setup and configuration
 */

export class CameraUtils {
    /**
     * Default camera configuration
     */
    static DEFAULT_CONFIG = {
        alpha: Math.PI / 1.5,
        beta: Math.PI / 4,
        radius: 50,
        target: new BABYLON.Vector3(0, 0, 0),
        lowerRadiusLimit: 10,
        upperRadiusLimit: 100,
        wheelPrecision: 10,
        pinchPrecision: 50
    };

    /**
     * Create a standard ArcRotateCamera with default settings
     * @param {BABYLON.Scene} scene - Babylon scene
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} [options={}] - Override options
     * @returns {BABYLON.ArcRotateCamera} - Configured camera
     */
    static createDefaultCamera(scene, canvas, options = {}) {
        const config = { ...this.DEFAULT_CONFIG, ...options };

        const camera = new BABYLON.ArcRotateCamera(
            'Camera',
            config.alpha,
            config.beta,
            config.radius,
            config.target,
            scene
        );

        camera.attachControl(canvas, true);
        camera.lowerRadiusLimit = config.lowerRadiusLimit;
        camera.upperRadiusLimit = config.upperRadiusLimit;

        if (config.wheelPrecision !== undefined) {
            camera.wheelPrecision = config.wheelPrecision;
        }
        if (config.pinchPrecision !== undefined) {
            camera.pinchPrecision = config.pinchPrecision;
        }

        return camera;
    }
}
