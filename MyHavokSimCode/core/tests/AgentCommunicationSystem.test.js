/**
 * Unit Tests for Agent Communication System
 * Tests message passing, group coordination, and proximity-based communication
 */

import { AgentCommunicationSystem, AgentMessage } from '../AgentCommunicationSystem.js';
import { MockAgent } from './EnhancedStateMachine.test.js';

// Mock scene for testing
class MockScene {
    constructor() {
        this.onBeforeRenderObservable = {
            add: callback => {
                this.updateCallback = callback;
            },
            clear: () => {
                this.updateCallback = null;
            }
        };

        this.engine = {
            getDeltaTime: () => 16 // 16ms = ~60fps
        };
    }

    simulateUpdate() {
        if (this.updateCallback) {
            this.updateCallback();
        }
    }
}

// Mock agent with position for spatial testing
class MockAgentWithPosition extends MockAgent {
    constructor(x = 0, y = 0, z = 0) {
        super();
        this.mesh = {
            position: new BABYLON.Vector3(x, y, z)
        };
        this.receivedMessages = [];
    }

    onMessageReceived(message) {
        this.receivedMessages.push(message);
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

            static Distance(v1, v2) {
                const dx = v1.x - v2.x;
                const dy = v1.y - v2.y;
                const dz = v1.z - v2.z;
                return Math.sqrt(dx * dx + dy * dy + dz * dz);
            }
        }
    };
}

export class AgentCommunicationSystemTests {
    constructor() {
        this.testResults = [];
        this.mockScene = new MockScene();
    }

    /**
     * Run all tests
     */
    runAllTests() {
        console.log('Running Agent Communication System Tests...');

        this.testBasicMessagePassing();
        this.testSubscriptionSystem();
        this.testProximityBasedCommunication();
        this.testGroupCommunication();
        this.testMessagePriority();
        this.testSpatialGrid();
        this.testMessageExpiration();
        this.testPerformanceMetrics();
        this.testErrorHandling();

        this.printResults();
        return this.testResults;
    }

    /**
     * Test basic message passing between agents
     */
    testBasicMessagePassing() {
        const testName = 'Basic Message Passing';
        try {
            const commSystem = new AgentCommunicationSystem(this.mockScene);
            commSystem.initialize();

            const sender = new MockAgentWithPosition(0, 0, 0);
            const receiver = new MockAgentWithPosition(10, 0, 0);

            // Register agents
            commSystem.registerAgent(sender);
            commSystem.registerAgent(receiver);

            // Subscribe receiver to message type
            commSystem.subscribe(receiver, 'test_message');

            // Send message
            const messageId = commSystem.sendMessage(sender, 'test_message', { data: 'hello' });
            this.assert(messageId !== null, 'Message ID should be returned');

            // Process messages
            commSystem.update(0.016);

            // Check if message was received
            this.assert(receiver.receivedMessages.length === 1, 'Receiver should have received one message');
            this.assert(receiver.receivedMessages[0].type === 'test_message', 'Message type should match');
            this.assert(receiver.receivedMessages[0].content.data === 'hello', 'Message content should match');
            this.assert(receiver.receivedMessages[0].sender === sender, 'Message sender should match');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test subscription system
     */
    testSubscriptionSystem() {
        const testName = 'Subscription System';
        try {
            const commSystem = new AgentCommunicationSystem(this.mockScene);
            commSystem.initialize();

            const agent1 = new MockAgentWithPosition(0, 0, 0);
            const agent2 = new MockAgentWithPosition(5, 0, 0);
            const agent3 = new MockAgentWithPosition(10, 0, 0);

            commSystem.registerAgent(agent1);
            commSystem.registerAgent(agent2);
            commSystem.registerAgent(agent3);

            // Subscribe agents to different message types
            commSystem.subscribe(agent1, 'type_a');
            commSystem.subscribe(agent2, 'type_a');
            commSystem.subscribe(agent2, 'type_b');
            commSystem.subscribe(agent3, 'type_b');

            // Send different message types
            commSystem.sendMessage(agent1, 'type_a', { data: 'message_a' });
            commSystem.sendMessage(agent1, 'type_b', { data: 'message_b' });

            commSystem.update(0.016);

            // Check subscriptions worked correctly
            this.assert(agent1.receivedMessages.length === 0, 'Agent1 should not receive its own messages');
            this.assert(agent2.receivedMessages.length === 2, 'Agent2 should receive both message types');
            this.assert(agent3.receivedMessages.length === 1, 'Agent3 should receive only type_b');
            this.assert(agent3.receivedMessages[0].content.data === 'message_b', 'Agent3 should receive correct message');

            // Test unsubscribe
            commSystem.unsubscribe(agent2, 'type_a');
            agent2.receivedMessages = []; // Clear previous messages

            commSystem.sendMessage(agent1, 'type_a', { data: 'message_a2' });
            commSystem.update(0.016);

            this.assert(agent2.receivedMessages.length === 0, 'Agent2 should not receive type_a after unsubscribing');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test proximity-based communication
     */
    testProximityBasedCommunication() {
        const testName = 'Proximity-Based Communication';
        try {
            const commSystem = new AgentCommunicationSystem(this.mockScene);
            commSystem.initialize();

            const sender = new MockAgentWithPosition(0, 0, 0);
            const nearAgent = new MockAgentWithPosition(25, 0, 0); // Within default range (50)
            const farAgent = new MockAgentWithPosition(75, 0, 0); // Outside default range

            commSystem.registerAgent(sender);
            commSystem.registerAgent(nearAgent);
            commSystem.registerAgent(farAgent);

            commSystem.subscribe(nearAgent, 'proximity_test');
            commSystem.subscribe(farAgent, 'proximity_test');

            // Send message with default range
            commSystem.sendMessage(sender, 'proximity_test', { data: 'near_message' });
            commSystem.update(0.016);

            this.assert(nearAgent.receivedMessages.length === 1, 'Near agent should receive message');
            this.assert(farAgent.receivedMessages.length === 0, 'Far agent should not receive message');

            // Test custom range
            nearAgent.receivedMessages = [];
            commSystem.sendMessage(sender, 'proximity_test', { data: 'far_message' }, { range: 100 });
            commSystem.update(0.016);

            this.assert(nearAgent.receivedMessages.length === 1, 'Near agent should receive message with extended range');
            this.assert(farAgent.receivedMessages.length === 1, 'Far agent should receive message with extended range');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test group communication
     */
    testGroupCommunication() {
        const testName = 'Group Communication';
        try {
            const commSystem = new AgentCommunicationSystem(this.mockScene);
            commSystem.initialize();

            const leader = new MockAgentWithPosition(0, 0, 0);
            const member1 = new MockAgentWithPosition(10, 0, 0);
            const member2 = new MockAgentWithPosition(20, 0, 0);
            const outsider = new MockAgentWithPosition(30, 0, 0);

            commSystem.registerAgent(leader);
            commSystem.registerAgent(member1);
            commSystem.registerAgent(member2);
            commSystem.registerAgent(outsider);

            // Subscribe all to group messages
            commSystem.subscribe(leader, 'group_formation');
            commSystem.subscribe(member1, 'group_formation');
            commSystem.subscribe(member2, 'group_formation');
            commSystem.subscribe(outsider, 'group_formation');

            // Create a group
            commSystem.joinGroup(leader, 'squad_alpha');
            commSystem.joinGroup(member1, 'squad_alpha');
            commSystem.joinGroup(member2, 'squad_alpha');

            // Process group formation messages
            commSystem.update(0.016);

            // Check group membership
            const groupMembers = commSystem.getGroupMembers('squad_alpha');
            this.assert(groupMembers.size === 3, 'Group should have 3 members');
            this.assert(groupMembers.has(leader), 'Group should contain leader');
            this.assert(groupMembers.has(member1), 'Group should contain member1');
            this.assert(groupMembers.has(member2), 'Group should contain member2');
            this.assert(!groupMembers.has(outsider), 'Group should not contain outsider');

            // Clear previous messages
            [leader, member1, member2, outsider].forEach(agent => agent.receivedMessages = []);

            // Send message to group
            commSystem.sendToGroup(leader, 'squad_alpha', 'group_formation', { order: 'attack' });

            this.assert(leader.receivedMessages.length === 0, 'Leader should not receive its own group message');
            this.assert(member1.receivedMessages.length === 1, 'Member1 should receive group message');
            this.assert(member2.receivedMessages.length === 1, 'Member2 should receive group message');
            this.assert(outsider.receivedMessages.length === 0, 'Outsider should not receive group message');

            // Test leaving group
            commSystem.leaveGroup(member1, 'squad_alpha');
            const updatedGroupMembers = commSystem.getGroupMembers('squad_alpha');
            this.assert(updatedGroupMembers.size === 2, 'Group should have 2 members after one leaves');
            this.assert(!updatedGroupMembers.has(member1), 'Member1 should no longer be in group');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test message priority system
     */
    testMessagePriority() {
        const testName = 'Message Priority System';
        try {
            const commSystem = new AgentCommunicationSystem(this.mockScene);
            commSystem.initialize();

            const sender = new MockAgentWithPosition(0, 0, 0);
            const receiver = new MockAgentWithPosition(10, 0, 0);

            commSystem.registerAgent(sender);
            commSystem.registerAgent(receiver);
            commSystem.subscribe(receiver, 'priority_test');

            // Send messages with different priorities
            commSystem.sendMessage(sender, 'priority_test', { data: 'low' }, { priority: 1 });
            commSystem.sendMessage(sender, 'priority_test', { data: 'high' }, { priority: 10 });
            commSystem.sendMessage(sender, 'priority_test', { data: 'medium' }, { priority: 5 });

            commSystem.update(0.016);

            // Check that messages were received in priority order
            this.assert(receiver.receivedMessages.length === 3, 'Should receive all 3 messages');
            this.assert(receiver.receivedMessages[0].content.data === 'high', 'First message should be highest priority');
            this.assert(receiver.receivedMessages[1].content.data === 'medium', 'Second message should be medium priority');
            this.assert(receiver.receivedMessages[2].content.data === 'low', 'Third message should be lowest priority');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test spatial grid functionality
     */
    testSpatialGrid() {
        const testName = 'Spatial Grid Functionality';
        try {
            const commSystem = new AgentCommunicationSystem(this.mockScene);
            commSystem.initialize();

            // Create agents in different spatial locations
            const agents = [];
            for (let i = 0; i < 10; i++) {
                const agent = new MockAgentWithPosition(i * 20, 0, 0); // Spread agents 20 units apart
                agents.push(agent);
                commSystem.registerAgent(agent);
                commSystem.subscribe(agent, 'spatial_test');
            }

            // Send message from first agent with limited range
            commSystem.sendMessage(agents[0], 'spatial_test', { data: 'test' }, { range: 30 });
            commSystem.update(0.016);

            // Only agents within range should receive the message
            let receivedCount = 0;
            agents.forEach(agent => {
                receivedCount += agent.receivedMessages.length;
            });

            // Agent 0 (sender) doesn't receive its own message
            // Agent 1 (20 units away) should receive it
            // Agent 2 (40 units away) should not receive it
            this.assert(receivedCount === 1, 'Only one agent should receive the message within range');
            this.assert(agents[1].receivedMessages.length === 1, 'Agent at position 20 should receive message');
            this.assert(agents[2].receivedMessages.length === 0, 'Agent at position 40 should not receive message');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test message expiration
     */
    testMessageExpiration() {
        const testName = 'Message Expiration';
        try {
            const commSystem = new AgentCommunicationSystem(this.mockScene);
            commSystem.initialize();

            const sender = new MockAgentWithPosition(0, 0, 0);
            const receiver = new MockAgentWithPosition(10, 0, 0);

            commSystem.registerAgent(sender);
            commSystem.registerAgent(receiver);
            commSystem.subscribe(receiver, 'expiration_test');

            // Send a message
            commSystem.sendMessage(sender, 'expiration_test', { data: 'test' });

            // Simulate time passing beyond TTL
            const originalNow = performance.now;
            performance.now = () => originalNow() + 6000; // 6 seconds later (TTL is 5 seconds)

            commSystem.update(0.016);

            // Restore original performance.now
            performance.now = originalNow;

            // Message should have expired and not been delivered
            this.assert(receiver.receivedMessages.length === 0, 'Expired message should not be delivered');

            // Check that expired messages are cleaned up
            const stats = commSystem.getStatistics();
            this.assert(stats.messagesDropped > 0, 'Expired messages should be counted as dropped');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test performance metrics
     */
    testPerformanceMetrics() {
        const testName = 'Performance Metrics';
        try {
            const commSystem = new AgentCommunicationSystem(this.mockScene);
            commSystem.initialize();

            const sender = new MockAgentWithPosition(0, 0, 0);
            const receiver = new MockAgentWithPosition(10, 0, 0);

            commSystem.registerAgent(sender);
            commSystem.registerAgent(receiver);
            commSystem.subscribe(receiver, 'metrics_test');

            // Send multiple messages
            for (let i = 0; i < 5; i++) {
                commSystem.sendMessage(sender, 'metrics_test', { data: `message_${i}` });
            }

            commSystem.update(0.016);

            const stats = commSystem.getStatistics();

            this.assert(stats.messagesSent === 5, 'Should track sent messages correctly');
            this.assert(stats.messagesReceived === 5, 'Should track received messages correctly');
            this.assert(stats.activeAgents === 2, 'Should track active agents correctly');
            this.assert(stats.averageDeliveryTime >= 0, 'Should track delivery time');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test error handling
     */
    testErrorHandling() {
        const testName = 'Error Handling';
        try {
            const commSystem = new AgentCommunicationSystem(this.mockScene);
            commSystem.initialize();

            const sender = new MockAgentWithPosition(0, 0, 0);
            const faultyReceiver = new MockAgentWithPosition(10, 0, 0);

            // Create a receiver that throws errors
            faultyReceiver.onMessageReceived = () => {
                throw new Error('Receiver error');
            };

            commSystem.registerAgent(sender);
            commSystem.registerAgent(faultyReceiver);
            commSystem.subscribe(faultyReceiver, 'error_test');

            // Send message to faulty receiver
            commSystem.sendMessage(sender, 'error_test', { data: 'test' });

            // Should not throw error during processing
            let errorThrown = false;
            try {
                commSystem.update(0.016);
            } catch (error) {
                errorThrown = true;
            }

            this.assert(!errorThrown, 'Communication system should handle receiver errors gracefully');

            // Test sending message from unregistered agent
            const unregisteredAgent = new MockAgentWithPosition(20, 0, 0);
            const messageId = commSystem.sendMessage(unregisteredAgent, 'error_test', { data: 'test' });

            this.assert(messageId === null, 'Should return null when sending from unregistered agent');

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
