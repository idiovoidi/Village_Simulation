/**
 * Unit Tests for Zombie Intelligence Component
 * Tests target prioritization, memory systems, and adaptive behavior
 */

import { ZombieIntelligence } from '../ZombieIntelligence.js';
import { MockAgent } from '../../../core/tests/EnhancedStateMachine.test.js';

// Mock zombie agent
class MockZombie extends MockAgent {
    constructor(x = 0, y = 0, z = 0) {
        super();
        this.mesh = {
            position: new BABYLON.Vector3(x, y, z)
        };
        this.detectionRange = 40;
        this.scene = new MockScene();
        this.receivedMessages = [];
        this.currentStrategy = null;
    }
}

// Mock target agent
class MockTarget extends MockAgent {
    constructor(x = 0, y = 0, z = 0, health = 100) {
        super();
        this.mesh = {
            position: new BABYLON.Vector3(x, y, z)
        };
        this.health = health;
        this.threatLevel = 0.5;
        this.agentType = 'villager';
    }
}

// Mock scene
class MockScene {
    constructor() {
        this.onBeforeRenderObservable = {
            add: () => {},
            clear: () => {}
        };
    }
}

// Mock communication system
class MockCommunicationSystem {
    constructor() {
        this.registeredAgents = new Set();
        this.subscriptions = new Map();
        this.sentMessages = [];
    }

    registerAgent(agent) {
        this.registeredAgents.add(agent);
        return `comm_${agent.id}`;
    }

    unregisterAgent(agent) {
        this.registeredAgents.delete(agent);
    }

    subscribe(agent, messageType) {
        if (!this.subscriptions.has(agent)) {
            this.subscriptions.set(agent, new Set());
        }
        this.subscriptions.get(agent).add(messageType);
    }

    sendMessage(sender, messageType, content, options = {}) {
        this.sentMessages.push({
            sender,
            messageType,
            content,
            options,
            timestamp: performance.now()
        });
        return `msg_${this.sentMessages.length}`;
    }
}

// Mock environmental awareness system
class MockEnvironmentalAwareness {
    constructor() {
        this.registeredAgents = new Set();
        this.agents = [];
    }

    registerAgent(agent) {
        this.registeredAgents.add(agent);
        this.agents.push(agent);
        return `env_${agent.id}`;
    }

    unregisterAgent(agent) {
        this.registeredAgents.delete(agent);
        this.agents = this.agents.filter(a => a !== agent);
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

    checkLineOfSight(from, to, options = {}) {
        return {
            hasLineOfSight: true,
            distance: BABYLON.Vector3.Distance(from, to),
            effectiveVisibility: 1.0
        };
    }

    assessThreat(position, options = {}) {
        return {
            overallThreat: 0.3,
            threats: [],
            safetyScore: 0.7,
            recommendedAction: 'caution'
        };
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

            normalize() {
                const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
                if (length === 0) return new BABYLON.Vector3(0, 0, 0);
                return new BABYLON.Vector3(this.x / length, this.y / length, this.z / length);
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
        }
    };
}

export class ZombieIntelligenceTests {
    constructor() {
        this.testResults = [];
    }

    /**
     * Run all tests
     */
    runAllTests() {
        console.log('Running Zombie Intelligence Tests...');

        this.testInitialization();
        this.testTargetDetection();
        this.testTargetPrioritization();
        this.testMemorySystem();
        this.testStateMachine();
        this.testAdaptiveBehavior();
        this.testCommunicationIntegration();
        this.testEnvironmentalIntegration();
        this.testPerformanceTracking();

        this.printResults();
        return this.testResults;
    }

    /**
     * Test initialization of zombie intelligence
     */
    testInitialization() {
        const testName = 'Initialization';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const intelligence = new ZombieIntelligence(zombie);

            // Test basic initialization
            this.assert(intelligence.zombie === zombie, 'Should store zombie reference');
            this.assert(intelligence.memory.targets instanceof Map, 'Should initialize target memory');
            this.assert(intelligence.targetTracker.currentTarget === null, 'Should start with no target');
            this.assert(intelligence.stateMachine !== null, 'Should create state machine');

            // Test with systems
            const commSystem = new MockCommunicationSystem();
            const envSystem = new MockEnvironmentalAwareness();

            intelligence.initialize({
                communication: commSystem,
                environmental: envSystem
            });

            this.assert(intelligence.communicationSystem === commSystem, 'Should store communication system');
            this.assert(intelligence.environmentalAwareness === envSystem, 'Should store environmental system');
            this.assert(commSystem.registeredAgents.has(zombie), 'Should register with communication system');
            this.assert(envSystem.registeredAgents.has(zombie), 'Should register with environmental system');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test target detection functionality
     */
    testTargetDetection() {
        const testName = 'Target Detection';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const intelligence = new ZombieIntelligence(zombie);
            const envSystem = new MockEnvironmentalAwareness();

            intelligence.initialize({ environmental: envSystem });

            // Add targets to environment
            const target1 = new MockTarget(10, 0, 0, 100);
            const target2 = new MockTarget(30, 0, 0, 50);
            const invalidTarget = new MockZombie(20, 0, 0); // Another zombie (invalid target)

            envSystem.agents.push(target1, target2, invalidTarget);

            // Test target detection
            const potentialTargets = intelligence.findPotentialTargets();

            this.assert(potentialTargets.length === 2, 'Should find 2 valid targets');
            this.assert(potentialTargets.includes(target1), 'Should include target1');
            this.assert(potentialTargets.includes(target2), 'Should include target2');
            this.assert(!potentialTargets.includes(invalidTarget), 'Should exclude invalid target');

            // Test target validation
            this.assert(intelligence.isValidTarget(target1) === true, 'Should validate living target');
            this.assert(intelligence.isValidTarget(invalidTarget) === false, 'Should reject zombie target');

            // Test dead target
            target1.health = 0;
            this.assert(intelligence.isValidTarget(target1) === false, 'Should reject dead target');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test target prioritization system
     */
    testTargetPrioritization() {
        const testName = 'Target Prioritization';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const intelligence = new ZombieIntelligence(zombie);
            const envSystem = new MockEnvironmentalAwareness();

            intelligence.initialize({ environmental: envSystem });

            // Create targets with different characteristics
            const closeTarget = new MockTarget(5, 0, 0, 100);   // Close, healthy
            const weakTarget = new MockTarget(15, 0, 0, 20);    // Far, weak
            const threatTarget = new MockTarget(12, 0, 0, 100); // Medium distance, high threat
            threatTarget.threatLevel = 0.9;

            const targets = [closeTarget, weakTarget, threatTarget];

            // Test priority calculation
            const closePriority = intelligence.calculateTargetPriority(closeTarget);
            const weakPriority = intelligence.calculateTargetPriority(weakTarget);
            const threatPriority = intelligence.calculateTargetPriority(threatTarget);

            this.assert(closePriority > 0, 'Close target should have positive priority');
            this.assert(weakPriority > 0, 'Weak target should have positive priority');
            this.assert(threatPriority > 0, 'Threat target should have positive priority');

            // Test prioritization
            const prioritized = intelligence.prioritizeTargets(targets);

            this.assert(prioritized.length === 3, 'Should return all targets');
            this.assert(prioritized[0] === closeTarget, 'Closest target should have highest priority');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test memory system functionality
     */
    testMemorySystem() {
        const testName = 'Memory System';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const intelligence = new ZombieIntelligence(zombie, {
                memoryDuration: 1000, // 1 second for testing
                maxMemoryEntries: 3
            });

            const target1 = new MockTarget(10, 0, 0);
            const target2 = new MockTarget(20, 0, 0);

            // Test adding to memory
            intelligence.addToTargetMemory(target1);
            intelligence.addToTargetMemory(target2);

            this.assert(intelligence.memory.targets.size === 2, 'Should store 2 targets in memory');

            const memoryEntry1 = intelligence.memory.targets.get(target1.id);
            this.assert(memoryEntry1 !== undefined, 'Should have memory entry for target1');
            this.assert(memoryEntry1.encounters === 1, 'Should track encounter count');
            this.assert(memoryEntry1.target === target1, 'Should store target reference');

            // Test memory update
            intelligence.addToTargetMemory(target1); // Add same target again
            const updatedEntry = intelligence.memory.targets.get(target1.id);
            this.assert(updatedEntry.encounters === 2, 'Should increment encounter count');

            // Test memory decay
            const originalNow = performance.now;
            performance.now = () => originalNow() + 2000; // 2 seconds later

            intelligence.processMemoryDecay(0.016);

            performance.now = originalNow; // Restore

            this.assert(intelligence.memory.targets.size === 0, 'Should decay old memories');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test state machine functionality
     */
    testStateMachine() {
        const testName = 'State Machine';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const intelligence = new ZombieIntelligence(zombie);
            const envSystem = new MockEnvironmentalAwareness();

            intelligence.initialize({ environmental: envSystem });

            // Test initial state
            this.assert(intelligence.stateMachine.currentState === 'analyzing', 'Should start in analyzing state');

            // Add a target to trigger state transition
            const target = new MockTarget(10, 0, 0);
            envSystem.agents.push(target);

            // Update intelligence to trigger analysis
            intelligence.update(0.016);

            // The state machine should process the analysis
            const stateInfo = intelligence.stateMachine.getCurrentStateInfo();
            this.assert(stateInfo.state !== null, 'Should have a current state');
            this.assert(stateInfo.transitionCount >= 0, 'Should track transitions');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test adaptive behavior system
     */
    testAdaptiveBehavior() {
        const testName = 'Adaptive Behavior';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const intelligence = new ZombieIntelligence(zombie, {
                learningEnabled: true,
                adaptationRate: 0.5
            });

            intelligence.initialize();

            // Test initial adaptation values
            const initialAggression = intelligence.config.aggressionLevel;
            const initialPersistence = intelligence.config.persistenceLevel;

            // Record some successes
            intelligence.recordSuccess('target_reached');
            intelligence.recordSuccess('target_reached');
            intelligence.recordSuccess('target_reached');

            this.assert(intelligence.memory.successes === 3, 'Should track successes');
            this.assert(intelligence.adaptation.successRate > 0, 'Should calculate success rate');

            // Process adaptation
            intelligence.processAdaptation(1.0); // 1 second

            // High success rate should increase aggression
            this.assert(
                intelligence.config.aggressionLevel >= initialAggression,
                'High success rate should maintain or increase aggression'
            );

            // Record some failures
            intelligence.recordFailure('target_lost');
            intelligence.recordFailure('target_lost');
            intelligence.recordFailure('target_lost');
            intelligence.recordFailure('target_lost');

            intelligence.processAdaptation(1.0);

            // Multiple recent failures should reduce persistence
            this.assert(
                intelligence.config.persistenceLevel < initialPersistence,
                'Multiple failures should reduce persistence'
            );

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test communication system integration
     */
    testCommunicationIntegration() {
        const testName = 'Communication Integration';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const intelligence = new ZombieIntelligence(zombie);
            const commSystem = new MockCommunicationSystem();

            intelligence.initialize({ communication: commSystem });

            // Test message subscription
            const subscriptions = commSystem.subscriptions.get(zombie);
            this.assert(subscriptions.has('target_spotted'), 'Should subscribe to target_spotted');
            this.assert(subscriptions.has('target_lost'), 'Should subscribe to target_lost');
            this.assert(subscriptions.has('group_formation'), 'Should subscribe to group_formation');

            // Test message sending
            const target = new MockTarget(10, 0, 0);
            intelligence.broadcastTargetAcquisition(target);

            this.assert(commSystem.sentMessages.length === 1, 'Should send target acquisition message');

            const sentMessage = commSystem.sentMessages[0];
            this.assert(sentMessage.messageType === 'target_acquired', 'Should send correct message type');
            this.assert(sentMessage.content.target === target, 'Should include target in message');

            // Test message handling
            zombie.receivedMessages = [{
                type: 'target_spotted',
                content: { target },
                sender: { id: 'other_zombie' }
            }];

            intelligence.processMessages();

            this.assert(zombie.receivedMessages.length === 0, 'Should process and clear messages');
            this.assert(intelligence.memory.targets.has(target.id), 'Should add spotted target to memory');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test environmental awareness integration
     */
    testEnvironmentalIntegration() {
        const testName = 'Environmental Integration';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const intelligence = new ZombieIntelligence(zombie);
            const envSystem = new MockEnvironmentalAwareness();

            intelligence.initialize({ environmental: envSystem });

            // Test target finding through environmental system
            const target = new MockTarget(15, 0, 0);
            envSystem.agents.push(target);

            const foundTargets = intelligence.findPotentialTargets();
            this.assert(foundTargets.length === 1, 'Should find target through environmental system');
            this.assert(foundTargets[0] === target, 'Should find correct target');

            // Test pursuit strategy calculation
            intelligence.setTarget(target);
            const strategy = intelligence.calculatePursuitStrategy(target);

            this.assert(strategy !== null, 'Should calculate pursuit strategy');
            this.assert(strategy.approach !== undefined, 'Should define approach strategy');
            this.assert(strategy.speed !== undefined, 'Should define speed strategy');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test performance tracking
     */
    testPerformanceTracking() {
        const testName = 'Performance Tracking';
        try {
            const zombie = new MockZombie(0, 0, 0);
            const intelligence = new ZombieIntelligence(zombie);

            intelligence.initialize();

            // Run several updates to generate performance data
            for (let i = 0; i < 5; i++) {
                intelligence.update(0.016);
            }

            const stats = intelligence.getStatistics();

            this.assert(stats.memoryEntries >= 0, 'Should track memory entries');
            this.assert(stats.successRate >= 0, 'Should track success rate');
            this.assert(stats.currentState !== null, 'Should track current state');
            this.assert(stats.performance !== undefined, 'Should include performance metrics');

            // Test performance metrics
            const { performance } = stats;
            this.assert(performance.memoryUsage >= 0, 'Should track memory usage');
            this.assert(performance.adaptationScore >= 0, 'Should track adaptation score');

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
