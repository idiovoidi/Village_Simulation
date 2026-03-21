/**
 * Unit Tests for Zombie Pathfinding Component
 * Tests A* pathfinding, crowd avoidance, and navigation grid functionality
 */

import { ZombiePathfinding } from '../ZombiePathfinding.js';
import { MockAgent } from '../../../core/tests/EnhancedStateMachine.test.js';

// Mock zombie agent
class MockZombie extends MockAgent {
    constructor(x = 0, y = 0, z = 0) {
        super();
        this.mesh = {
            position: new BABYLON.Vector3(x, y, z)
        };
        this.scene = new MockScene();
        this.currentGroup = null;
        this.velocity = new BABYLON.Vector3(0, 0, 0);
    }
}

// Mock scene
class MockScene {
    constructor() {
        this.meshes = [];
    }
}

// Mock environmental awareness system
class MockEnvironmentalAwareness {
    constructor() {
        this.agents = [];
        this.threatMap = {
            getThreatLevel: () => 0
        };
    }

    getAgentsInRange(position, range, options = {}) {
        return this.agents.filter(agent => {
            if (options.excludeAgent && agent === options.excludeAgent) {
                return false;
            }

            if (options.agentType && agent.agentType !== options.agentType) {
                return false;
            }

            const distance = BABYLON.Vector3.Distance(position, agent.mesh.position);
            return distance <= range;
        });
    }
}

// Mock BABYLON.Vector3 for testing
if (typeof BABYLON === 'undefined') {
    global.BABYLON = {
        Vector3: class {
            constructor(x = 0, y = 0, z = 0) {
                this.x = x;
                this.y = y;
                this.z = z;
            }

            clone() {
                return new BABYLON.Vector3(this.x, this.y, this.z);
            }

            subtract(other) {
                return new BABYLON.Vector3(
                    this.x - other.x,
                    this.y - other.y,
                    this.z - other.z
                );
            }

            add(other) {
                return new BABYLON.Vector3(
                    this.x + other.x,
                    this.y + other.y,
                    this.z + other.z
                );
            }

            addInPlace(other) {
                this.x += other.x;
                this.y += other.y;
                this.z += other.z;
                return this;
            }

            normalize() {
                const length = this.length();
                if (length === 0) return new BABYLON.Vector3(0, 0, 0);
                return new BABYLON.Vector3(this.x / length, this.y / length, this.z / length);
            }

            scale(factor) {
                return new BABYLON.Vector3(this.x * factor, this.y * factor, this.z * factor);
            }

            scaleInPlace(factor) {
                this.x *= factor;
                this.y *= factor;
                this.z *= factor;
                return this;
            }

            length() {
                return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
            }

            static Distance(v1, v2) {
                const dx = v1.x - v2.x;
                const dy = v1.y - v2.y;
                const dz = v1.z - v2.z;
                return Math.sqrt(dx * dx + dy * dy + dz * dz);
            }

            static Lerp(start, end, t) {
                return new BABYLON.Vector3(
                    start.x + (end.x - start.x) * t,
                    start.y + (end.y - start.y) * t,
                    start.z + (end.z - start.z) * t
                );
            }
        }
    };
}

export class ZombiePathfindingTests {
    constructor() {
        this.testResults = [];
    }

    /**
     * Run all tests
     */
    runAllTests() {
        console.log('Running Zombie Pathfinding Tests...');

        this.testInitialization();
        this.testNavigationGrid();
        this.testBasicPathfinding();
        this.testObstacleAvoidance();
        this.testCrowdAvoidance();
        this.testPathSmoothing();
        this.testCaching();
        this.testDynamicReplanning();
        this.testPerformanceOptimization();

        this.printResults();
        return this.testResults;
    }

    /**
     * Test initialization of pathfinding system
     */
    testInitialization() {
        const testName = 'Initialization';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const pathfinding = new ZombiePathfinding(zombie);

            // Test basic initialization
            this.assert(pathfinding.zombie === zombie, 'Should store zombie reference');
            this.assert(pathfinding.currentPath.length === 0, 'Should start with empty path');
            this.assert(pathfinding.destination === null, 'Should start with no destination');
            this.assert(pathfinding.isPathfinding === false, 'Should not be pathfinding initially');

            // Test with systems
            const envSystem = new MockEnvironmentalAwareness();
            pathfinding.initialize({ environmental: envSystem });

            this.assert(pathfinding.environmentalAwareness === envSystem, 'Should store environmental system');
            this.assert(pathfinding.navigationGrid !== null, 'Should create navigation grid');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test navigation grid functionality
     */
    testNavigationGrid() {
        const testName = 'Navigation Grid';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const pathfinding = new ZombiePathfinding(zombie, { gridSize: 2 });
            pathfinding.initialize();

            const grid = pathfinding.navigationGrid;

            // Test coordinate conversion
            const worldPos = new BABYLON.Vector3(10, 0, 20);
            const gridPos = grid.worldToGrid(worldPos);
            const backToWorld = grid.gridToWorld(gridPos.x, gridPos.z);

            this.assert(typeof gridPos.x === 'number', 'Should convert to grid coordinates');
            this.assert(typeof gridPos.z === 'number', 'Should convert to grid coordinates');
            this.assert(Math.abs(backToWorld.x - worldPos.x) < 2, 'Should convert back to world coordinates');
            this.assert(Math.abs(backToWorld.z - worldPos.z) < 2, 'Should convert back to world coordinates');

            // Test walkability
            this.assert(grid.isWalkable(gridPos.x, gridPos.z) === true, 'Should be walkable by default');

            // Test obstacle marking
            const obstacleMin = new BABYLON.Vector3(8, 0, 18);
            const obstacleMax = new BABYLON.Vector3(12, 0, 22);
            grid.markObstacleArea(obstacleMin, obstacleMax);

            this.assert(grid.isWalkable(gridPos.x, gridPos.z) === false, 'Should not be walkable after marking as obstacle');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test basic pathfinding functionality
     */
    testBasicPathfinding() {
        const testName = 'Basic Pathfinding';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const pathfinding = new ZombiePathfinding(zombie, { gridSize: 2, maxSearchNodes: 100 });
            pathfinding.initialize();

            // Test simple pathfinding
            const destination = new BABYLON.Vector3(10, 0, 10);

            return pathfinding.findPath(destination).then(path => {
                this.assert(Array.isArray(path), 'Should return path array');
                this.assert(path.length > 0, 'Should find a path');
                this.assert(pathfinding.currentPath === path, 'Should store current path');
                this.assert(pathfinding.destination !== null, 'Should store destination');

                // Test path progression
                const nextPos = pathfinding.getNextPosition();
                this.assert(nextPos !== null, 'Should have next position');
                this.assert(nextPos instanceof BABYLON.Vector3, 'Next position should be Vector3');

                this.recordTest(testName, true);
            }).catch(error => {
                this.recordTest(testName, false, error.message);
            });
        } catch (error) {
            this.recordTest(testName, false, error.message);
            return Promise.resolve();
        }
    }

    /**
     * Test obstacle avoidance
     */
    testObstacleAvoidance() {
        const testName = 'Obstacle Avoidance';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const pathfinding = new ZombiePathfinding(zombie, { gridSize: 2 });
            pathfinding.initialize();

            // Add obstacle between start and destination
            const obstacleMin = new BABYLON.Vector3(4, 0, -2);
            const obstacleMax = new BABYLON.Vector3(6, 0, 2);
            pathfinding.navigationGrid.markObstacleArea(obstacleMin, obstacleMax);

            const destination = new BABYLON.Vector3(10, 0, 0);

            return pathfinding.findPath(destination).then(path => {
                this.assert(path.length > 2, 'Should find path around obstacle');

                // Check that path doesn't go through obstacle
                let pathThroughObstacle = false;
                for (const point of path) {
                    if (point.x >= 4 && point.x <= 6 && point.z >= -2 && point.z <= 2) {
                        pathThroughObstacle = true;
                        break;
                    }
                }

                this.assert(!pathThroughObstacle, 'Path should avoid obstacle');

                this.recordTest(testName, true);
            }).catch(error => {
                this.recordTest(testName, false, error.message);
            });
        } catch (error) {
            this.recordTest(testName, false, error.message);
            return Promise.resolve();
        }
    }

    /**
     * Test crowd avoidance functionality
     */
    testCrowdAvoidance() {
        const testName = 'Crowd Avoidance';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const pathfinding = new ZombiePathfinding(zombie);
            const envSystem = new MockEnvironmentalAwareness();

            pathfinding.initialize({ environmental: envSystem });

            // Add nearby zombies
            const neighbor1 = new MockZombie(2, 0, 0);
            const neighbor2 = new MockZombie(-2, 0, 0);
            neighbor1.agentType = 'zombie';
            neighbor2.agentType = 'zombie';

            envSystem.agents.push(neighbor1, neighbor2);

            // Update crowd avoidance
            pathfinding.updateCrowdAvoidance();

            this.assert(pathfinding.crowdAvoidance.neighbors.length === 2, 'Should detect 2 neighbors');

            // Test separation force calculation
            const separationForce = pathfinding.calculateSeparationForce();
            this.assert(separationForce instanceof BABYLON.Vector3, 'Should calculate separation force');
            this.assert(separationForce.length() > 0, 'Separation force should have magnitude');

            // Test movement direction with crowd avoidance
            pathfinding.currentPath = [new BABYLON.Vector3(0, 0, 10)];
            pathfinding.currentPathIndex = 0;

            const direction = pathfinding.getMovementDirection();
            this.assert(direction instanceof BABYLON.Vector3, 'Should return movement direction');
            this.assert(direction.length() > 0, 'Movement direction should have magnitude');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test path smoothing
     */
    testPathSmoothing() {
        const testName = 'Path Smoothing';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const pathfinding = new ZombiePathfinding(zombie, { smoothingIterations: 2 });
            pathfinding.initialize();

            // Create a zigzag path
            const rawPath = [
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(2, 0, 0),
                new BABYLON.Vector3(2, 0, 2),
                new BABYLON.Vector3(4, 0, 2),
                new BABYLON.Vector3(4, 0, 4),
                new BABYLON.Vector3(6, 0, 4)
            ];

            const smoothedPath = pathfinding.smoothPath(rawPath);

            this.assert(Array.isArray(smoothedPath), 'Should return smoothed path array');
            this.assert(smoothedPath.length <= rawPath.length, 'Smoothed path should have same or fewer points');
            this.assert(smoothedPath[0].x === rawPath[0].x, 'Should preserve start point');
            this.assert(smoothedPath[smoothedPath.length - 1].x === rawPath[rawPath.length - 1].x, 'Should preserve end point');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test path caching
     */
    testCaching() {
        const testName = 'Path Caching';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const pathfinding = new ZombiePathfinding(zombie, { cacheTimeout: 1000 });
            pathfinding.initialize();

            const start = new BABYLON.Vector3(0, 0, 0);
            const destination = new BABYLON.Vector3(10, 0, 10);

            // Test cache key generation
            const cacheKey = pathfinding.getCacheKey(start, destination);
            this.assert(typeof cacheKey === 'string', 'Should generate cache key');

            // Test caching
            const testPath = [start, destination];
            pathfinding.cacheResult(cacheKey, testPath);

            const cachedPath = pathfinding.getFromCache(cacheKey);
            this.assert(cachedPath !== null, 'Should retrieve cached path');
            this.assert(cachedPath.length === testPath.length, 'Cached path should match original');

            // Test cache expiration
            const originalNow = performance.now;
            performance.now = () => originalNow() + 2000; // 2 seconds later

            const expiredPath = pathfinding.getFromCache(cacheKey);
            this.assert(expiredPath === null, 'Expired cache should return null');

            performance.now = originalNow; // Restore

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test dynamic replanning
     */
    testDynamicReplanning() {
        const testName = 'Dynamic Replanning';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const pathfinding = new ZombiePathfinding(zombie, {
                dynamicReplanning: true,
                pathUpdateInterval: 100
            });
            pathfinding.initialize();

            // Set up initial path
            pathfinding.currentPath = [
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(5, 0, 0),
                new BABYLON.Vector3(10, 0, 0)
            ];
            pathfinding.currentPathIndex = 0;
            pathfinding.destination = new BABYLON.Vector3(10, 0, 0);

            // Test path validity checking
            pathfinding.checkPathValidity();

            // Test line of sight checking
            const hasLOS = pathfinding.hasLineOfSight(
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(10, 0, 0)
            );
            this.assert(typeof hasLOS === 'boolean', 'Should check line of sight');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test performance optimization features
     */
    testPerformanceOptimization() {
        const testName = 'Performance Optimization';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const pathfinding = new ZombiePathfinding(zombie, { maxSearchNodes: 50 });
            pathfinding.initialize();

            // Test statistics tracking
            const stats = pathfinding.getStatistics();

            this.assert(typeof stats.pathsCalculated === 'number', 'Should track paths calculated');
            this.assert(typeof stats.pathsSuccessful === 'number', 'Should track successful paths');
            this.assert(typeof stats.pathsFailed === 'number', 'Should track failed paths');
            this.assert(typeof stats.cacheHitRate === 'number', 'Should track cache hit rate');
            this.assert(typeof stats.currentPathLength === 'number', 'Should track current path length');

            // Test cache cleanup
            pathfinding.pathCache.set('test', { path: [], timestamp: 0 }); // Old entry
            pathfinding.cleanupCache();

            this.assert(!pathfinding.pathCache.has('test'), 'Should clean up expired cache entries');

            // Test fallback path creation
            const fallbackPath = pathfinding.createFallbackPath(new BABYLON.Vector3(10, 0, 10));
            this.assert(Array.isArray(fallbackPath), 'Should create fallback path');
            this.assert(fallbackPath.length > 0, 'Fallback path should have points');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Helper method to assert conditions
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    /**
     * Record test result
     */
    recordTest(testName, passed, error = null) {
        this.testResults.push({
            name: testName,
            passed,
            error
        });

        if (passed) {
            console.log(`✓ ${testName}`);
        } else {
            console.error(`✗ ${testName}: ${error}`);
        }
    }

    /**
     * Print test results summary
     */
    printResults() {
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;

        console.log(`\nTest Results: ${passed}/${total} tests passed`);

        if (passed === total) {
            console.log('All tests passed! ✓');
        } else {
            console.log('Some tests failed. Check the output above for details.');
        }
    }
}
