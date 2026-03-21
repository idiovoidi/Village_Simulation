/**
 * Unit Tests for Enhanced State Machine
 * Tests state transitions, hierarchical states, and edge cases
 */

import { EnhancedStateMachine, StateDefinitionBuilder } from '../EnhancedStateMachine.js';

// Mock agent for testing
class MockAgent {
    constructor() {
        this.id = 'test-agent';
        this.position = { x: 0, y: 0, z: 0 };
        this.health = 100;
    }
}

// Test suite
export class EnhancedStateMachineTests {
    constructor() {
        this.testResults = [];
        this.mockAgent = new MockAgent();
    }

    /**
     * Run all tests
     */
    runAllTests() {
        console.log('Running Enhanced State Machine Tests...');

        this.testBasicStateTransitions();
        this.testHierarchicalStates();
        this.testStateHistory();
        this.testContextManagement();
        this.testTransitionValidation();
        this.testAutomaticTransitions();
        this.testPerformanceTracking();
        this.testStateCallbacks();
        this.testEdgeCases();

        this.printResults();
        return this.testResults;
    }

    /**
     * Test basic state transitions
     */
    testBasicStateTransitions() {
        const testName = 'Basic State Transitions';
        try {
            const stateDefinitions = {
                idle: new StateDefinitionBuilder('idle')
                    .onEnter((agent, context) => context.enteredIdle = true)
                    .onExit((agent, context) => context.exitedIdle = true)
                    .allowTransitions(['moving', 'attacking'])
                    .build().idle,

                moving: new StateDefinitionBuilder('moving')
                    .onEnter((agent, context) => context.enteredMoving = true)
                    .allowTransitions(['idle', 'attacking'])
                    .build().moving,

                attacking: new StateDefinitionBuilder('attacking')
                    .onEnter((agent, context) => context.enteredAttacking = true)
                    .allowTransitions(['idle'])
                    .build().attacking
            };

            const stateMachine = new EnhancedStateMachine(this.mockAgent, stateDefinitions);
            stateMachine.initialize('idle');

            // Test initial state
            this.assert(stateMachine.currentState === 'idle', 'Initial state should be idle');
            this.assert(stateMachine.localContext.enteredIdle === true, 'Should have entered idle state');

            // Test valid transition
            const success = stateMachine.transitionTo('moving');
            this.assert(success === true, 'Valid transition should succeed');
            this.assert(stateMachine.currentState === 'moving', 'Current state should be moving');
            this.assert(stateMachine.previousState === 'idle', 'Previous state should be idle');
            this.assert(stateMachine.localContext.exitedIdle === true, 'Should have exited idle state');
            this.assert(stateMachine.localContext.enteredMoving === true, 'Should have entered moving state');

            // Test invalid transition (not in allowed transitions)
            const invalidSuccess = stateMachine.transitionTo('nonexistent');
            this.assert(invalidSuccess === false, 'Invalid transition should fail');
            this.assert(stateMachine.currentState === 'moving', 'State should remain unchanged after invalid transition');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test hierarchical state management
     */
    testHierarchicalStates() {
        const testName = 'Hierarchical States';
        try {
            const stateDefinitions = {
                idle: new StateDefinitionBuilder('idle').build().idle,
                combat: new StateDefinitionBuilder('combat').build().combat,
                special_attack: new StateDefinitionBuilder('special_attack').build().special_attack
            };

            const stateMachine = new EnhancedStateMachine(this.mockAgent, stateDefinitions);
            stateMachine.initialize('idle');

            // Test push state
            stateMachine.pushState('combat');
            this.assert(stateMachine.currentState === 'combat', 'Should be in combat state after push');
            this.assert(stateMachine.stateStack.length === 1, 'State stack should have one entry');

            // Push another state
            stateMachine.pushState('special_attack');
            this.assert(stateMachine.currentState === 'special_attack', 'Should be in special_attack state');
            this.assert(stateMachine.stateStack.length === 2, 'State stack should have two entries');

            // Test pop state
            const popSuccess = stateMachine.popState();
            this.assert(popSuccess === true, 'Pop should succeed');
            this.assert(stateMachine.currentState === 'combat', 'Should return to combat state');
            this.assert(stateMachine.stateStack.length === 1, 'State stack should have one entry');

            // Pop again
            stateMachine.popState();
            this.assert(stateMachine.currentState === 'idle', 'Should return to idle state');
            this.assert(stateMachine.stateStack.length === 0, 'State stack should be empty');

            // Test pop when stack is empty
            const emptyPopSuccess = stateMachine.popState();
            this.assert(emptyPopSuccess === false, 'Pop should fail when stack is empty');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test state history tracking
     */
    testStateHistory() {
        const testName = 'State History Tracking';
        try {
            const stateDefinitions = {
                idle: new StateDefinitionBuilder('idle').build().idle,
                moving: new StateDefinitionBuilder('moving').build().moving,
                attacking: new StateDefinitionBuilder('attacking').build().attacking
            };

            const stateMachine = new EnhancedStateMachine(this.mockAgent, stateDefinitions);
            stateMachine.initialize('idle');

            // Make several transitions
            stateMachine.transitionTo('moving');
            stateMachine.transitionTo('attacking');
            stateMachine.transitionTo('idle');

            const history = stateMachine.getStateHistory();
            this.assert(history.length === 4, 'History should contain 4 entries (including initial)');

            // Check history entries
            this.assert(history[0].toState === 'idle', 'First entry should be initial idle state');
            this.assert(history[1].fromState === 'idle' && history[1].toState === 'moving', 'Second entry should be idle to moving');
            this.assert(history[2].fromState === 'moving' && history[2].toState === 'attacking', 'Third entry should be moving to attacking');
            this.assert(history[3].fromState === 'attacking' && history[3].toState === 'idle', 'Fourth entry should be attacking to idle');

            // Test history limit
            stateMachine.maxHistorySize = 2;
            stateMachine.transitionTo('moving');
            stateMachine.transitionTo('attacking');

            const limitedHistory = stateMachine.getStateHistory();
            this.assert(limitedHistory.length === 2, 'History should be limited to max size');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test context management
     */
    testContextManagement() {
        const testName = 'Context Management';
        try {
            const stateDefinitions = {
                idle: new StateDefinitionBuilder('idle')
                    .onEnter((agent, localContext, globalContext) => {
                        localContext.idleEntered = true;
                        localContext.globalValue = globalContext.testValue;
                    })
                    .build().idle
            };

            const stateMachine = new EnhancedStateMachine(this.mockAgent, stateDefinitions);

            // Test initial context
            const initialContext = { testValue: 42, initialFlag: true };
            stateMachine.initialize('idle', initialContext);

            this.assert(stateMachine.globalContext.testValue === 42, 'Global context should be set');
            this.assert(stateMachine.localContext.idleEntered === true, 'Local context should be updated by state');
            this.assert(stateMachine.localContext.globalValue === 42, 'Local context should access global context');

            // Test context updates
            stateMachine.updateGlobalContext({ newGlobalValue: 'test' });
            this.assert(stateMachine.globalContext.newGlobalValue === 'test', 'Global context should be updated');
            this.assert(stateMachine.globalContext.testValue === 42, 'Existing global context should be preserved');

            stateMachine.updateLocalContext({ newLocalValue: 'local' });
            this.assert(stateMachine.localContext.newLocalValue === 'local', 'Local context should be updated');
            this.assert(stateMachine.localContext.idleEntered === true, 'Existing local context should be preserved');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test transition validation
     */
    testTransitionValidation() {
        const testName = 'Transition Validation';
        try {
            const stateDefinitions = {
                locked: new StateDefinitionBuilder('locked')
                    .canExit((agent, context, targetState) => context.hasKey === true)
                    .allowTransitions(['unlocked'])
                    .build().locked,

                unlocked: new StateDefinitionBuilder('unlocked')
                    .canEnter((agent, globalContext, fromState) => globalContext.allowUnlock === true)
                    .build().unlocked
            };

            const stateMachine = new EnhancedStateMachine(this.mockAgent, stateDefinitions);
            stateMachine.initialize('locked');

            // Test failed transition due to canExit
            let success = stateMachine.transitionTo('unlocked');
            this.assert(success === false, 'Transition should fail when canExit returns false');
            this.assert(stateMachine.currentState === 'locked', 'Should remain in locked state');

            // Allow exit but not entry
            stateMachine.updateLocalContext({ hasKey: true });
            success = stateMachine.transitionTo('unlocked');
            this.assert(success === false, 'Transition should fail when canEnter returns false');

            // Allow both exit and entry
            stateMachine.updateGlobalContext({ allowUnlock: true });
            success = stateMachine.transitionTo('unlocked');
            this.assert(success === true, 'Transition should succeed when both conditions are met');
            this.assert(stateMachine.currentState === 'unlocked', 'Should be in unlocked state');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test automatic transitions
     */
    testAutomaticTransitions() {
        const testName = 'Automatic Transitions';
        try {
            const stateDefinitions = {
                patrol: new StateDefinitionBuilder('patrol')
                    .autoTransition(
                        (agent, localContext, globalContext) => globalContext.enemyDetected === true,
                        'combat'
                    )
                    .autoTransition(
                        (agent, localContext, globalContext) => agent.health < 20,
                        'retreat'
                    )
                    .build().patrol,

                combat: new StateDefinitionBuilder('combat').build().combat,
                retreat: new StateDefinitionBuilder('retreat').build().retreat
            };

            const stateMachine = new EnhancedStateMachine(this.mockAgent, stateDefinitions);
            stateMachine.initialize('patrol');

            // Test automatic transition
            stateMachine.updateGlobalContext({ enemyDetected: true });
            stateMachine.update(0.016); // Simulate frame update

            this.assert(stateMachine.currentState === 'combat', 'Should automatically transition to combat');

            // Test priority of automatic transitions (health check should trigger first)
            stateMachine.transitionTo('patrol');
            this.mockAgent.health = 15;
            stateMachine.updateGlobalContext({ enemyDetected: true });
            stateMachine.update(0.016);

            this.assert(stateMachine.currentState === 'retreat', 'Should transition to retreat due to low health');

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
            const stateDefinitions = {
                test_state: new StateDefinitionBuilder('test_state')
                    .onUpdate((agent, localContext) => {
                        // Simulate some work
                        for (let i = 0; i < 1000; i++) {
                            Math.random();
                        }
                    })
                    .build().test_state
            };

            const stateMachine = new EnhancedStateMachine(this.mockAgent, stateDefinitions);
            stateMachine.initialize('test_state');

            // Run several updates
            for (let i = 0; i < 5; i++) {
                stateMachine.update(0.016);
            }

            const metrics = stateMachine.getPerformanceMetrics();
            this.assert(metrics.test_state !== undefined, 'Performance metrics should exist for test_state');
            this.assert(metrics.test_state.callCount === 5, 'Call count should be 5');
            this.assert(metrics.test_state.averageTime > 0, 'Average time should be greater than 0');
            this.assert(metrics.test_state.maxTime >= metrics.test_state.averageTime, 'Max time should be >= average time');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test state change callbacks
     */
    testStateCallbacks() {
        const testName = 'State Change Callbacks';
        try {
            const stateDefinitions = {
                idle: new StateDefinitionBuilder('idle').build().idle,
                moving: new StateDefinitionBuilder('moving').build().moving
            };

            const stateMachine = new EnhancedStateMachine(this.mockAgent, stateDefinitions);

            let enterCallbackFired = false;
            let exitCallbackFired = false;
            let transitionCallbackFired = false;

            stateMachine.onStateChange('enter', (state, agent, context) => {
                enterCallbackFired = true;
                this.assert(state === 'moving', 'Enter callback should receive correct state');
            });

            stateMachine.onStateChange('exit', (state, agent, context) => {
                exitCallbackFired = true;
                this.assert(state === 'idle', 'Exit callback should receive correct state');
            });

            stateMachine.onStateChange('transition', (fromState, toState, agent, context) => {
                transitionCallbackFired = true;
                this.assert(fromState === 'idle' && toState === 'moving', 'Transition callback should receive correct states');
            });

            stateMachine.initialize('idle');
            stateMachine.transitionTo('moving');

            this.assert(enterCallbackFired === true, 'Enter callback should have fired');
            this.assert(exitCallbackFired === true, 'Exit callback should have fired');
            this.assert(transitionCallbackFired === true, 'Transition callback should have fired');

            this.recordTest(testName, true);
        } catch (error) {
            this.recordTest(testName, false, error.message);
        }
    }

    /**
     * Test edge cases and error handling
     */
    testEdgeCases() {
        const testName = 'Edge Cases and Error Handling';
        try {
            const stateDefinitions = {
                error_state: new StateDefinitionBuilder('error_state')
                    .onEnter(() => { throw new Error('Test error'); })
                    .onUpdate(() => { throw new Error('Update error'); })
                    .onExit(() => { throw new Error('Exit error'); })
                    .build().error_state,

                normal_state: new StateDefinitionBuilder('normal_state').build().normal_state
            };

            const stateMachine = new EnhancedStateMachine(this.mockAgent, stateDefinitions);

            // Test error in onEnter (should not prevent state change)
            stateMachine.initialize('error_state');
            this.assert(stateMachine.currentState === 'error_state', 'Should be in error_state despite onEnter error');

            // Test error in onUpdate (should not crash)
            stateMachine.update(0.016);
            this.assert(stateMachine.currentState === 'error_state', 'Should remain in error_state after update error');

            // Test error in onExit (should not prevent transition)
            stateMachine.transitionTo('normal_state');
            this.assert(stateMachine.currentState === 'normal_state', 'Should transition despite onExit error');

            // Test transition cooldown
            const success1 = stateMachine.transitionTo('error_state');
            const success2 = stateMachine.transitionTo('normal_state'); // Immediate transition
            this.assert(success1 === true, 'First transition should succeed');
            this.assert(success2 === false, 'Second immediate transition should fail due to cooldown');

            // Test reset functionality
            stateMachine.reset();
            this.assert(stateMachine.currentState === null, 'Current state should be null after reset');
            this.assert(stateMachine.stateHistory.length === 0, 'State history should be empty after reset');
            this.assert(stateMachine.transitionCount === 0, 'Transition count should be 0 after reset');

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

// Export for use in other test files
export { MockAgent };
