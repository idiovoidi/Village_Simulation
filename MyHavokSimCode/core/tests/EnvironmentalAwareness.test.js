/**
 * Unit Tests for Environmental Awareness System
 * Tests spatial queries, threat detection, and safe zone management
 */

import { EnvironmentalAwareness } from '../EnvironmentalAwareness.js';
import { MockAgent } from './EnhancedStateMachine.test.js';

// Mock scene for testing
class MockScene {
    constructor() {
        this.onBeforeRenderObservable = {
            add: (callback) => {
                this.updateCallback = callback;
            },
            clear: () => {
                this.updateCallback = null;
            }
        };
        
        this.engine = {
            getDeltaTime: () => 16 // 16ms = ~60fps
        };
        
        this.pickWithRay = (ray, predicate) => {
            // Mock ray casting - return no hit by default
            return { hit: false };
        };
    }
    
    simulateUpdate() {
        if (this.updateCallback) {
            this.updateCallback();
        }
    }
}

// Mock agent with position and threat level
class MockEnvironmentalAgent extends MockAgent {
    constructor(x = 0, y = 0, z = 0, threatLevel = 0) {
        super();
        this.mesh = {
            position: new BABYLON.Vector3(x, y, z)
        };
        this.threatLevel = threatLevel;
        this.agentType = 'test';
    }
}

// Mock BABYLON.Vector3 and Ray for testing
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
            
            normalize() {
                const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
                if (length === 0) return new BABYLON.Vector3(0, 0, 0);
                return new BABYLON.Vector3(this.x / length, this.y / length, this.z / length);
            }
            
            static Distance(v1, v2) {
                const dx = v1.x - v2.x;
                const dy = v1.y - v2.y;
                const dz = v1.z - v2.z;
                return Math.sqrt(dx * dx + dy * dy + dz * dz);
            }
            
            static Dot(v1, v2) {
                return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
            }
        },
        
        Ray: class {
            constructor(origin, direction, length) {
                this.origin = origin;
                this.direction = direction;
                this.length = length;
            }
        }
    };
}

export class EnvironmentalAwarenessTests {
    constructor() {
        this.testResults = [];
        this.mockScene = new MockScene();
    }
    
    /**
     * Run all tests
     */
    runAllTests() {
        console.log('Running Environmental Awareness System Tests...');
        
        this.testAgentRegistration();
        this.testSpatialQueries();
        this.testThreatAssessment();
        this.testSafeZoneManagement();
        this.testLineOfSight();
        this.testEnvironmentalFactors();
        this.testThreatDecay();
        this.testCaching();
        this.testEscapeRoutes();
        
        this.printResults();
        return this.testResults;
    }
    
    /**
     * Test agent registration and unregistration
     */
    testAgentRegistration() {
        const testName = 'Agent Registration';
        try {
            const envSystem = new EnvironmentalAwareness(this.mockScene);
            envSystem.initialize();
            
            const agent1 = new MockEnvironmentalAgent(0, 0, 0, 0.5);
            const agent2 = new MockEnvironmentalAgent(10, 0, 0, 0.8);
            
            // Register agents
            const id1 = envSystem.registerAgent(agent1);
            const id2 = envSystem.registerAgent(agent2);
            
            this.assert(id1 !== null, 'Agent 1 should receive an environmental ID');
            this.assert(id2 !== null, 'Agent 2 should receive an environmental ID');
            this.assert(agent1.environmentalId === id1, 'Agent 1 should have correct environmental ID');
            this.assert(agent2.environmentalId === id2, 'Agent 2 should have correct environmental ID');
            
            // Test unregistration
            envSystem.unregisterAgent(agent1);
            
            // Agent should no longer be found in spatial queries
            const nearbyAgents = envSystem.getAgentsInRange(new BABYLON.Vector3(0, 0, 0), 50);
            this.assert(!nearbyAgents.includes(agent1), 'Unregistered agent should not appear in spatial queries');
            this.assert(nearbyAgents.includes(agent2), 'Registered agent should still appear in spatial queries');
            
            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }
    
    /**
     * Test spatial queries and filtering
     */
    testSpatialQueries() {
        const testName = 'Spatial Queries';
        try {
            const envSystem = new EnvironmentalAwareness(this.mockScene);
            envSystem.initialize();
            
            // Create agents at different positions and threat levels
            const agents = [
                new MockEnvironmentalAgent(0, 0, 0, 0.2),   // Close, low threat
                new MockEnvironmentalAgent(25, 0, 0, 0.8),  // Medium distance, high threat
                new MockEnvironmentalAgent(75, 0, 0, 0.5),  // Far, medium threat
                new MockEnvironmentalAgent(10, 0, 0, 0.1)   // Close, very low threat
            ];
            
            agents.forEach(agent => envSystem.registerAgent(agent));
            
            // Test basic range query
            const nearbyAgents = envSystem.getAgentsInRange(new BABYLON.Vector3(0, 0, 0), 30);
            this.assert(nearbyAgents.length === 2, 'Should find 2 agents within range of 30');
            
            // Test threat level filtering
            const highThreatAgents = envSystem.getAgentsInRange(
                new BABYLON.Vector3(0, 0, 0), 
                50, 
                { minThreatLevel: 0.5 }
            );
            this.assert(highThreatAgents.length === 1, 'Should find 1 agent with threat level >= 0.5');
            this.assert(highThreatAgents[0].threatLevel === 0.8, 'Should find the agent with 0.8 threat level');
            
            // Test agent exclusion
            const excludedQuery = envSystem.getAgentsInRange(
                new BABYLON.Vector3(0, 0, 0), 
                30, 
                { excludeAgent: agents[0] }
            );
            this.assert(excludedQuery.length === 1, 'Should find 1 agent when excluding one');
            this.assert(!excludedQuery.includes(agents[0]), 'Excluded agent should not be in results');
            
            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }
    
    /**
     * Test threat assessment functionality
     */
    testThreatAssessment() {
        const testName = 'Threat Assessment';
        try {
            const envSystem = new EnvironmentalAwareness(this.mockScene);
            envSystem.initialize();
            
            // Create threatening agents
            const threatAgent1 = new MockEnvironmentalAgent(10, 0, 0, 0.8);
            const threatAgent2 = new MockEnvironmentalAgent(15, 0, 0, 0.6);
            const safeAgent = new MockEnvironmentalAgent(50, 0, 0, 0.1);
            
            envSystem.registerAgent(threatAgent1);
            envSystem.registerAgent(threatAgent2);
            envSystem.registerAgent(safeAgent);
            
            // Add a threat source
            const threatId = envSystem.addThreat(new BABYLON.Vector3(5, 0, 0), 0.7, 20);
            this.assert(threatId !== null, 'Should return threat ID when adding threat');
            
            // Assess threat at a position near the threats
            const assessment = envSystem.assessThreat(new BABYLON.Vector3(0, 0, 0));
            
            this.assert(assessment.overallThreat > 0, 'Should detect overall threat');
            this.assert(assessment.threats.length >= 2, 'Should detect multiple threatening agents');
            this.assert(assessment.safetyScore < 1.0, 'Safety score should be reduced due to threats');
            this.assert(assessment.recommendedAction !== 'none', 'Should recommend an action due to threats');
            
            // Test threat at a safe location
            const safeAssessment = envSystem.assessThreat(new BABYLON.Vector3(100, 0, 100));
            this.assert(safeAssessment.overallThreat < assessment.overallThreat, 'Distant location should have lower threat');
            this.assert(safeAssessment.safetyScore > assessment.safetyScore, 'Distant location should have higher safety score');
            
            // Remove threat and test again
            envSystem.removeThreat(threatId);
            const postRemovalAssessment = envSystem.assessThreat(new BABYLON.Vector3(0, 0, 0));
            this.assert(postRemovalAssessment.overallThreat < assessment.overallThreat, 'Threat should be reduced after removal');
            
            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }
    
    /**
     * Test safe zone management
     */
    testSafeZoneManagement() {
        const testName = 'Safe Zone Management';
        try {
            const envSystem = new EnvironmentalAwareness(this.mockScene);
            envSystem.initialize();
            
            // Add safe zones
            const safeZone1 = envSystem.addSafeZone(new BABYLON.Vector3(50, 0, 0), 10, { type: 'shelter' });
            const safeZone2 = envSystem.addSafeZone(new BABYLON.Vector3(100, 0, 0), 15, { type: 'bunker', capacity: 5 });
            
            this.assert(safeZone1 !== null, 'Should return safe zone ID');
            this.assert(safeZone2 !== null, 'Should return safe zone ID');
            
            // Test finding nearest safe zone
            const nearest = envSystem.findNearestSafeZone(new BABYLON.Vector3(0, 0, 0));
            this.assert(nearest !== null, 'Should find a nearest safe zone');
            this.assert(nearest.id === safeZone1, 'Should find the closer safe zone');
            this.assert(nearest.distance > 0, 'Should calculate distance to safe zone');
            
            // Test type filtering
            const bunkerZone = envSystem.findNearestSafeZone(new BABYLON.Vector3(0, 0, 0), { type: 'bunker' });
            this.assert(bunkerZone !== null, 'Should find bunker type safe zone');
            this.assert(bunkerZone.id === safeZone2, 'Should find the bunker safe zone');
            
            // Test position checking
            const insideSafeZone = envSystem.isInSafeZone(new BABYLON.Vector3(52, 0, 0));
            this.assert(insideSafeZone !== null, 'Should detect position inside safe zone');
            this.assert(insideSafeZone.id === safeZone1, 'Should identify correct safe zone');
            
            const outsideSafeZone = envSystem.isInSafeZone(new BABYLON.Vector3(0, 0, 0));
            this.assert(outsideSafeZone === null, 'Should detect position outside safe zones');
            
            // Test safe zone removal
            envSystem.removeSafeZone(safeZone1);
            const afterRemoval = envSystem.findNearestSafeZone(new BABYLON.Vector3(0, 0, 0));
            this.assert(afterRemoval.id === safeZone2, 'Should find remaining safe zone after removal');
            
            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }
    
    /**
     * Test line of sight calculations
     */
    testLineOfSight() {
        const testName = 'Line of Sight';
        try {
            const envSystem = new EnvironmentalAwareness(this.mockScene);
            envSystem.initialize();
            
            const from = new BABYLON.Vector3(0, 0, 0);
            const to = new BABYLON.Vector3(10, 0, 0);
            
            // Test clear line of sight
            const clearSight = envSystem.checkLineOfSight(from, to);
            this.assert(clearSight.hasLineOfSight === true, 'Should have clear line of sight');
            this.assert(clearSight.distance === 10, 'Should calculate correct distance');
            
            // Test with reduced visibility
            envSystem.updateEnvironmentalFactors({ visibility: 0.2 });
            const reducedSight = envSystem.checkLineOfSight(from, to, { minVisibility: 0.5 });
            this.assert(reducedSight.hasLineOfSight === false, 'Should not have line of sight with low visibility');
            
            // Test visibility factor calculation
            const visibilityFactor = envSystem.getVisibilityFactor(from, to);
            this.assert(visibilityFactor < 1.0, 'Visibility factor should be reduced');
            
            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }
    
    /**
     * Test environmental factors
     */
    testEnvironmentalFactors() {
        const testName = 'Environmental Factors';
        try {
            const envSystem = new EnvironmentalAwareness(this.mockScene);
            envSystem.initialize();
            
            // Test initial environmental factors
            const initialFactors = envSystem.environmentalFactors;
            this.assert(initialFactors.visibility === 1.0, 'Initial visibility should be 1.0');
            this.assert(initialFactors.timeOfDay === 12.0, 'Initial time should be 12.0');
            
            // Test updating environmental factors
            envSystem.updateEnvironmentalFactors({
                visibility: 0.5,
                weather: 'fog',
                timeOfDay: 2.0 // Night time
            });
            
            this.assert(envSystem.environmentalFactors.visibility === 0.5, 'Visibility should be updated');
            this.assert(envSystem.environmentalFactors.weather === 'fog', 'Weather should be updated');
            this.assert(envSystem.environmentalFactors.timeOfDay === 2.0, 'Time should be updated');
            
            // Test environmental threat calculation
            const envThreat = envSystem.calculateEnvironmentalThreat(new BABYLON.Vector3(0, 0, 0));
            this.assert(envThreat > 0, 'Environmental threat should be greater than 0 with poor conditions');
            
            // Test with good conditions
            envSystem.updateEnvironmentalFactors({
                visibility: 1.0,
                weather: 'clear',
                timeOfDay: 12.0
            });
            
            const goodEnvThreat = envSystem.calculateEnvironmentalThreat(new BABYLON.Vector3(0, 0, 0));
            this.assert(goodEnvThreat < envThreat, 'Environmental threat should be lower with good conditions');
            
            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }
    
    /**
     * Test threat decay over time
     */
    testThreatDecay() {
        const testName = 'Threat Decay';
        try {
            const envSystem = new EnvironmentalAwareness(this.mockScene);
            envSystem.initialize();
            
            // Add a threat with duration
            const threatId = envSystem.addThreat(new BABYLON.Vector3(0, 0, 0), 1.0, 10, 2.0); // 2 second duration
            
            // Initial threat assessment
            const initialAssessment = envSystem.assessThreat(new BABYLON.Vector3(0, 0, 0));
            const initialThreat = initialAssessment.overallThreat;
            
            // Simulate time passing
            envSystem.update(1.0); // 1 second
            
            const midAssessment = envSystem.assessThreat(new BABYLON.Vector3(0, 0, 0));
            this.assert(midAssessment.overallThreat < initialThreat, 'Threat should decay over time');
            
            // Simulate more time passing (beyond duration)
            envSystem.update(2.0); // Another 2 seconds (total 3 seconds)
            
            const finalAssessment = envSystem.assessThreat(new BABYLON.Vector3(0, 0, 0));
            this.assert(finalAssessment.overallThreat < midAssessment.overallThreat, 'Threat should continue to decay');
            
            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }
    
    /**
     * Test query caching
     */
    testCaching() {
        const testName = 'Query Caching';
        try {
            const envSystem = new EnvironmentalAwareness(this.mockScene);
            envSystem.initialize();
            
            const agent = new MockEnvironmentalAgent(10, 0, 0, 0.5);
            envSystem.registerAgent(agent);
            
            const position = new BABYLON.Vector3(0, 0, 0);
            
            // First query (should miss cache)
            const result1 = envSystem.getAgentsInRange(position, 50);
            const stats1 = envSystem.getStatistics();
            
            // Second identical query (should hit cache)
            const result2 = envSystem.getAgentsInRange(position, 50);
            const stats2 = envSystem.getStatistics();
            
            this.assert(result1.length === result2.length, 'Cached result should match original');
            this.assert(stats2.cacheHits > stats1.cacheHits, 'Cache hits should increase');
            this.assert(stats2.cacheHitRate > 0, 'Cache hit rate should be greater than 0');
            
            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }
    
    /**
     * Test escape route calculation
     */
    testEscapeRoutes() {
        const testName = 'Escape Route Calculation';
        try {
            const envSystem = new EnvironmentalAwareness(this.mockScene);
            envSystem.initialize();
            
            // Create threatening agents
            const threat1 = new MockEnvironmentalAgent(10, 0, 0, 0.8);
            const threat2 = new MockEnvironmentalAgent(0, 0, 10, 0.6);
            
            envSystem.registerAgent(threat1);
            envSystem.registerAgent(threat2);
            
            // Add a safe zone
            envSystem.addSafeZone(new BABYLON.Vector3(-20, 0, 0), 10);
            
            // Assess threat and get escape routes
            const assessment = envSystem.assessThreat(new BABYLON.Vector3(0, 0, 0));
            
            this.assert(assessment.escapeRoutes.length > 0, 'Should calculate escape routes');
            this.assert(assessment.escapeRoutes[0].safetyScore >= 0, 'Escape routes should have safety scores');
            
            // Routes should be sorted by safety score
            for (let i = 1; i < assessment.escapeRoutes.length; i++) {
                this.assert(
                    assessment.escapeRoutes[i].safetyScore <= assessment.escapeRoutes[i-1].safetyScore,
                    'Escape routes should be sorted by safety score'
                );
            }
            
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