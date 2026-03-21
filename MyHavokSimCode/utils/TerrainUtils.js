/**
 * Terrain and Position Utilities
 * Shared helper methods for terrain validation and position finding
 */

export class TerrainUtils {
    /**
     * Check if terrain slope at position is acceptable
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @param {number} threshold - Maximum allowed height difference
     * @param {Function} getTerrainHeight - Function to get terrain height at position
     * @returns {boolean} - True if slope is acceptable
     */
    static isTerrainSlopeAcceptable(x, z, threshold, getTerrainHeight) {
        const sampleDistance = 0.5;
        const centerHeight = getTerrainHeight(x, z);

        // Sample heights in a cross pattern
        const samples = [
            getTerrainHeight(x + sampleDistance, z),
            getTerrainHeight(x - sampleDistance, z),
            getTerrainHeight(x, z + sampleDistance),
            getTerrainHeight(x, z - sampleDistance)
        ];

        // Check max slope difference
        for (const height of samples) {
            if (Math.abs(height - centerHeight) > threshold) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check for obstacles at position using raycast
     * @param {BABYLON.Scene} scene - Babylon scene
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate (ground level)
     * @param {number} z - Z coordinate
     * @param {string} [terrainId='terrain'] - ID of terrain mesh to ignore
     * @returns {boolean} - True if no obstacles found
     */
    static hasObstacles(scene, x, y, z, terrainId = 'terrain') {
        const rayStart = new BABYLON.Vector3(x, y + 5, z);
        const rayEnd = new BABYLON.Vector3(x, y - 1, z);
        const ray = new BABYLON.Ray(rayStart, rayEnd.subtract(rayStart).normalize(), 6);

        const hit = scene.pickWithRay(ray);
        return hit.hit && hit.pickedMesh && hit.pickedMesh.id !== terrainId;
    }

    /**
     * Find position with maximum minimum distance to existing points
     * @param {Array} existingPoints - Array of existing positions (objects with .position or Vector3)
     * @param {number} searchRadius - Radius to search within
     * @param {Function} getTerrainHeight - Function to get terrain height
     * @param {Object} [options={}] - Additional options
     * @param {number} [options.gridSize=20] - Grid resolution for search
     * @param {number} [options.minRadius=0] - Minimum radius from center
     * @param {Function} [options.isValidPosition] - Optional validation function
     * @returns {BABYLON.Vector3|null} - Best position or null
     */
    static findLeastCrowdedPosition(existingPoints, searchRadius, getTerrainHeight, options = {}) {
        const { gridSize = 20, minRadius = 0, isValidPosition = null } = options;

        let bestPosition = null;
        let maxMinDistance = 0;
        const stepSize = searchRadius * 2 / gridSize;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const x = -searchRadius + i * stepSize;
                const z = -searchRadius + j * stepSize;

                // Check if position is within allowed radius range
                const distanceFromCenter = Math.sqrt(x * x + z * z);
                if (distanceFromCenter < minRadius || distanceFromCenter > searchRadius) {
                    continue;
                }

                // Skip if custom validation fails
                if (isValidPosition && !isValidPosition(x, z)) {
                    continue;
                }

                const position = new BABYLON.Vector3(
                    x,
                    getTerrainHeight(x, z),
                    z
                );

                let minDistance = Infinity;
                for (const point of existingPoints) {
                    const pointPos = point.position || point;
                    const distance = BABYLON.Vector3.Distance(position, pointPos);
                    minDistance = Math.min(minDistance, distance);
                }

                if (minDistance > maxMinDistance) {
                    maxMinDistance = minDistance;
                    bestPosition = position;
                }
            }
        }

        return bestPosition;
    }

    /**
     * Validate spawn position with distance check
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @param {Array} existingPoints - Existing positions to check against
     * @param {number} minDistance - Minimum required distance
     * @returns {boolean} - True if position is valid
     */
    static isValidSpawnPosition(x, y, z, existingPoints, minDistance) {
        const position = new BABYLON.Vector3(x, y, z);
        for (const point of existingPoints) {
            const pointPos = point.position || point;
            const distance = BABYLON.Vector3.Distance(position, pointPos);
            if (distance < minDistance) {
                return false;
            }
        }
        return true;
    }
}
