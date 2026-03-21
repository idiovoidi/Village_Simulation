// Using global BABYLON object from CDN
// Type definitions for Babylon.js are available via @babylonjs/core types

/**
 * NavMeshHelper - Utility class for navigation mesh operations
 * Handles pathfinding, point validation, and navigation-related calculations
 */
export class NavMeshHelper {
    private navMesh: BABYLON.Mesh | null;
    private pathfindingPlugin: BABYLON.RecastJSPlugin | null;

    /**
     * Create a new NavMeshHelper
     * @param navMesh - The navigation mesh to use for pathfinding
     */
    constructor(navMesh: BABYLON.Mesh | null) {
        this.navMesh = navMesh;
        this.pathfindingPlugin = null;

        // Initialize the navigation plugin if we have a valid navmesh
        if (navMesh) {
            try {
                // Initialize the pathfinding plugin
                this.pathfindingPlugin = new BABYLON.RecastJSPlugin();
                this.pathfindingPlugin.createNavMesh([navMesh], {
                    cs: 0.2,
                    ch: 0.2,
                    walkableSlopeAngle: 35,
                    walkableHeight: 1,
                    walkableRadius: 1,
                    walkableClimb: 1,
                    maxEdgeLen: 12,
                    maxSimplificationError: 1.3,
                    minRegionArea: 8,
                    mergeRegionArea: 20,
                    maxVertsPerPoly: 6,
                    detailSampleDist: 6,
                    detailSampleMaxError: 1
                });

                console.log('NavMesh successfully initialized');
            } catch (error) {
                console.error('Failed to initialize NavMesh:', error);
                this.pathfindingPlugin = null;
            }
        }
    }

    /**
     * Find a path between two points on the navmesh
     * @param start - The starting position
     * @param end - The target position
     * @returns Array of waypoints forming the path, or empty array if no path found
     */
    findPath(start: BABYLON.Vector3, end: BABYLON.Vector3): BABYLON.Vector3[] {
        if (!this.pathfindingPlugin) return [];

        try {
            // Make sure the start and end points are on the navmesh
            const navStart = this.getClosestPoint(start);
            const navEnd = this.getClosestPoint(end);

            if (!navStart || !navEnd) return [];

            // Compute the path
            const path = this.pathfindingPlugin.computePath(navStart, navEnd);

            if (path && path.length > 0) {
                // Convert to Vector3 array and return
                return path.map(point => new BABYLON.Vector3(point.x, point.y, point.z));
            }
        } catch (error) {
            console.error('Error finding path:', error);
        }

        return [];
    }

    /**
     * Get the closest point on the navmesh to the given position
     * @param position - The position to find the closest point to
     * @returns The closest point on the navmesh, or null if not found
     */
    getClosestPoint(position: BABYLON.Vector3): BABYLON.Vector3 | null {
        if (!this.pathfindingPlugin) return null;

        try {
            // Find the closest point on the navmesh
            const result = this.pathfindingPlugin.getClosestPoint(position);

            if (result) {
                return new BABYLON.Vector3(result.x, result.y, result.z);
            }
        } catch (error) {
            console.error('Error getting closest point:', error);
        }

        return null;
    }

    /**
     * Check if a point is on the navmesh
     * @param position - The position to check
     * @returns True if the point is on the navmesh
     */
    isPointOnNavMesh(position: BABYLON.Vector3): boolean {
        if (!this.pathfindingPlugin) return false;

        const closestPoint = this.getClosestPoint(position);
        if (!closestPoint) return false;

        // If the closest point is very close to the original position, it's on the navmesh
        const distanceSquared = BABYLON.Vector3.DistanceSquared(position, closestPoint);
        return distanceSquared < 0.1; // Threshold for "close enough"
    }

    /**
     * Find a random accessible point on the navmesh within a radius
     * @param center - The center position
     * @param radius - The radius to search within
     * @param maxAttempts - Maximum number of attempts to find a valid point
     * @returns A random point on the navmesh, or null if none found
     */
    getRandomPointInRadius(
        center: BABYLON.Vector3,
        radius: number,
        maxAttempts: number = 10
    ): BABYLON.Vector3 | null {
        if (!this.pathfindingPlugin) return null;

        for (let i = 0; i < maxAttempts; i++) {
            // Generate a random point within the radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const x = center.x + Math.cos(angle) * distance;
            const z = center.z + Math.sin(angle) * distance;

            // Try to find this point on the navmesh
            const point = new BABYLON.Vector3(x, center.y, z);
            const navPoint = this.getClosestPoint(point);

            if (navPoint) {
                // Make sure this point is within the original radius
                const actualDistance = BABYLON.Vector3.Distance(center, navPoint);
                if (actualDistance <= radius) {
                    return navPoint;
                }
            }
        }

        return null;
    }

    /**
     * Get the nearest valid destination point for a target that might be off the navmesh
     * @param currentPosition - The current position
     * @param targetPosition - The desired target position
     * @returns The nearest valid destination on the navmesh
     */
    getNearestValidDestination(
        currentPosition: BABYLON.Vector3,
        targetPosition: BABYLON.Vector3
    ): BABYLON.Vector3 {
        // First check if target is directly on navmesh
        const onMeshTarget = this.getClosestPoint(targetPosition);
        if (onMeshTarget && BABYLON.Vector3.DistanceSquared(targetPosition, onMeshTarget) < 0.1) {
            return onMeshTarget;
        }

        // If not, we need to find a path to get as close as possible
        // Start by checking if there's a straight line path
        const path = this.findPath(currentPosition, targetPosition);
        if (path && path.length > 0) {
            // Return the last point in the path
            return path[path.length - 1];
        }

        // If no path, get the closest point on navmesh to target
        return onMeshTarget || currentPosition;
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.navMesh = null;
        this.pathfindingPlugin = null;
    }
}
