/**
 * Enhanced State Machine System
 * Provides hierarchical state management with context awareness and state history
 */

export class EnhancedStateMachine {
    constructor(agent, stateDefinitions = {}) {
        this.agent = agent;
        this.stateDefinitions = stateDefinitions;

        // Current state management
        this.currentState = null;
        this.previousState = null;
        this.stateStack = []; // For hierarchical states

        // State history for learning and debugging
        this.stateHistory = [];
        this.maxHistorySize = 50;

        // Context and environmental awareness
        this.globalContext = {};
        this.localContext = {};

        // Timing and transition management
        this.stateStartTime = 0;
        this.lastTransitionTime = 0;
        this.transitionCooldown = 0.1; // Minimum time between transitions

        // Performance tracking
        this.transitionCount = 0;
        this.statePerformance = new Map();

        // Event system for state changes
        this.stateChangeCallbacks = new Map();
    }

    /**
     * Initialize the state machine with a starting state
     * @param {string} initialState - The initial state name
     * @param {Object} context - Initial context data
     */
    initialize(initialState, context = {}) {
        this.globalContext = { ...context };
        this.transitionTo(initialState, { isInitial: true });
    }

    /**
     * Transition to a new state with validation and context
     * @param {string} newState - Target state name
     * @param {Object} transitionContext - Context for this transition
     * @returns {boolean} - Success of transition
     */
    transitionTo(newState, transitionContext = {}) {
        // Validate transition timing
        const now = performance.now();
        if (now - this.lastTransitionTime < this.transitionCooldown * 1000) {
            return false;
        }

        // Validate state exists
        if (!this.stateDefinitions[newState] && !transitionContext.isInitial) {
            console.warn(`State '${newState}' not defined in state machine`);
            return false;
        }

        // Check if transition is allowed
        if (!this.canTransitionTo(newState, transitionContext)) {
            return false;
        }

        // Store previous state
        const oldState = this.currentState;
        this.previousState = oldState;

        // Exit current state
        if (oldState && this.stateDefinitions[oldState]?.onExit) {
            try {
                this.stateDefinitions[oldState].onExit(this.agent, this.localContext);
            } catch (error) {
                console.error(`Error exiting state '${oldState}':`, error);
            }
        }

        // Update state
        this.currentState = newState;
        this.stateStartTime = now;
        this.lastTransitionTime = now;
        this.transitionCount++;

        // Update state history
        this.addToHistory(oldState, newState, transitionContext);

        // Enter new state
        if (this.stateDefinitions[newState]?.onEnter) {
            try {
                this.stateDefinitions[newState].onEnter(this.agent, this.localContext);
            } catch (error) {
                console.error(`Error entering state '${newState}':`, error);
            }
        }

        // Trigger callbacks
        this.triggerStateChangeCallbacks(oldState, newState, transitionContext);

        return true;
    }

    /**
     * Push a state onto the stack (hierarchical states)
     * @param {string} newState - State to push
     * @param {Object} context - Context for the push
     */
    pushState(newState, context = {}) {
        if (this.currentState) {
            this.stateStack.push({
                state: this.currentState,
                context: { ...this.localContext },
                timestamp: performance.now()
            });
        }

        this.transitionTo(newState, { ...context, isPush: true });
    }

    /**
     * Pop the previous state from the stack
     * @param {Object} context - Context for the pop
     * @returns {boolean} - Success of pop operation
     */
    popState(context = {}) {
        if (this.stateStack.length === 0) {
            return false;
        }

        const previousStateInfo = this.stateStack.pop();
        this.localContext = previousStateInfo.context;

        return this.transitionTo(previousStateInfo.state, { ...context, isPop: true });
    }

    /**
     * Update the state machine (called each frame)
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        if (!this.currentState) return;

        const stateDefinition = this.stateDefinitions[this.currentState];
        if (!stateDefinition) return;

        // Update local context with timing information
        this.localContext.deltaTime = deltaTime;
        this.localContext.timeInState = (performance.now() - this.stateStartTime) / 1000;

        // Execute state update
        if (stateDefinition.onUpdate) {
            try {
                const startTime = performance.now();
                stateDefinition.onUpdate(this.agent, this.localContext, this.globalContext);

                // Track performance
                const executionTime = performance.now() - startTime;
                this.updatePerformanceMetrics(this.currentState, executionTime);
            } catch (error) {
                console.error(`Error updating state '${this.currentState}':`, error);
            }
        }

        // Check for automatic transitions
        this.checkAutomaticTransitions();
    }

    /**
     * Check if transition to a state is allowed
     * @param {string} targetState - Target state name
     * @param {Object} context - Transition context
     * @returns {boolean} - Whether transition is allowed
     */
    canTransitionTo(targetState, context = {}) {
        const currentStateDefinition = this.stateDefinitions[this.currentState];
        const targetStateDefinition = this.stateDefinitions[targetState];

        // Check current state allows exit
        if (currentStateDefinition?.canExit) {
            if (!currentStateDefinition.canExit(this.agent, this.localContext, targetState)) {
                return false;
            }
        }

        // Check target state allows entry
        if (targetStateDefinition?.canEnter) {
            if (!targetStateDefinition.canEnter(this.agent, this.globalContext, this.currentState)) {
                return false;
            }
        }

        // Check allowed transitions
        if (currentStateDefinition?.allowedTransitions) {
            if (!currentStateDefinition.allowedTransitions.includes(targetState)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Add state transition to history
     * @param {string} fromState - Previous state
     * @param {string} toState - New state
     * @param {Object} context - Transition context
     */
    addToHistory(fromState, toState, context) {
        const historyEntry = {
            fromState,
            toState,
            timestamp: performance.now(),
            context: { ...context },
            timeInPreviousState: fromState ? (performance.now() - this.stateStartTime) / 1000 : 0
        };

        this.stateHistory.push(historyEntry);

        // Maintain history size limit
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }
    }

    /**
     * Check for automatic state transitions based on conditions
     */
    checkAutomaticTransitions() {
        const stateDefinition = this.stateDefinitions[this.currentState];
        if (!stateDefinition?.autoTransitions) return;

        for (const transition of stateDefinition.autoTransitions) {
            if (transition.condition(this.agent, this.localContext, this.globalContext)) {
                if (this.transitionTo(transition.targetState, { isAutomatic: true })) {
                    break; // Only execute first valid transition
                }
            }
        }
    }

    /**
     * Update performance metrics for a state
     * @param {string} stateName - Name of the state
     * @param {number} executionTime - Time taken to execute
     */
    updatePerformanceMetrics(stateName, executionTime) {
        if (!this.statePerformance.has(stateName)) {
            this.statePerformance.set(stateName, {
                totalTime: 0,
                callCount: 0,
                averageTime: 0,
                maxTime: 0
            });
        }

        const metrics = this.statePerformance.get(stateName);
        metrics.totalTime += executionTime;
        metrics.callCount++;
        metrics.averageTime = metrics.totalTime / metrics.callCount;
        metrics.maxTime = Math.max(metrics.maxTime, executionTime);
    }

    /**
     * Register callback for state changes
     * @param {string} eventType - Type of event ('enter', 'exit', 'transition')
     * @param {Function} callback - Callback function
     */
    onStateChange(eventType, callback) {
        if (!this.stateChangeCallbacks.has(eventType)) {
            this.stateChangeCallbacks.set(eventType, []);
        }
        this.stateChangeCallbacks.get(eventType).push(callback);
    }

    /**
     * Trigger state change callbacks
     * @param {string} fromState - Previous state
     * @param {string} toState - New state
     * @param {Object} context - Transition context
     */
    triggerStateChangeCallbacks(fromState, toState, context) {
        // Trigger exit callbacks
        if (fromState && this.stateChangeCallbacks.has('exit')) {
            this.stateChangeCallbacks.get('exit').forEach(callback => {
                try {
                    callback(fromState, this.agent, context);
                } catch (error) {
                    console.error('Error in exit callback:', error);
                }
            });
        }

        // Trigger enter callbacks
        if (this.stateChangeCallbacks.has('enter')) {
            this.stateChangeCallbacks.get('enter').forEach(callback => {
                try {
                    callback(toState, this.agent, context);
                } catch (error) {
                    console.error('Error in enter callback:', error);
                }
            });
        }

        // Trigger transition callbacks
        if (this.stateChangeCallbacks.has('transition')) {
            this.stateChangeCallbacks.get('transition').forEach(callback => {
                try {
                    callback(fromState, toState, this.agent, context);
                } catch (error) {
                    console.error('Error in transition callback:', error);
                }
            });
        }
    }

    /**
     * Get current state information
     * @returns {Object} - Current state info
     */
    getCurrentStateInfo() {
        return {
            state: this.currentState,
            timeInState: (performance.now() - this.stateStartTime) / 1000,
            previousState: this.previousState,
            stackDepth: this.stateStack.length,
            transitionCount: this.transitionCount
        };
    }

    /**
     * Get state history for analysis
     * @param {number} limit - Maximum number of entries to return
     * @returns {Array} - State history entries
     */
    getStateHistory(limit = 10) {
        return this.stateHistory.slice(-limit);
    }

    /**
     * Get performance metrics for all states
     * @returns {Object} - Performance metrics by state
     */
    getPerformanceMetrics() {
        const metrics = {};
        for (const [stateName, data] of this.statePerformance) {
            metrics[stateName] = { ...data };
        }
        return metrics;
    }

    /**
     * Update global context
     * @param {Object} newContext - New context data
     */
    updateGlobalContext(newContext) {
        this.globalContext = { ...this.globalContext, ...newContext };
    }

    /**
     * Update local context
     * @param {Object} newContext - New context data
     */
    updateLocalContext(newContext) {
        this.localContext = { ...this.localContext, ...newContext };
    }

    /**
     * Reset the state machine
     */
    reset() {
        this.currentState = null;
        this.previousState = null;
        this.stateStack = [];
        this.stateHistory = [];
        this.globalContext = {};
        this.localContext = {};
        this.transitionCount = 0;
        this.statePerformance.clear();
    }

    /**
     * Dispose of the state machine
     */
    dispose() {
        this.reset();
        this.stateChangeCallbacks.clear();
        this.stateDefinitions = {};
        this.agent = null;
    }
}

/**
 * State Definition Builder - Helper class for creating state definitions
 */
export class StateDefinitionBuilder {
    constructor(stateName) {
        this.stateName = stateName;
        this.definition = {};
    }

    onEnter(callback) {
        this.definition.onEnter = callback;
        return this;
    }

    onUpdate(callback) {
        this.definition.onUpdate = callback;
        return this;
    }

    onExit(callback) {
        this.definition.onExit = callback;
        return this;
    }

    canEnter(callback) {
        this.definition.canEnter = callback;
        return this;
    }

    canExit(callback) {
        this.definition.canExit = callback;
        return this;
    }

    allowTransitions(states) {
        this.definition.allowedTransitions = Array.isArray(states) ? states : [states];
        return this;
    }

    autoTransition(condition, targetState) {
        if (!this.definition.autoTransitions) {
            this.definition.autoTransitions = [];
        }
        this.definition.autoTransitions.push({ condition, targetState });
        return this;
    }

    build() {
        return { [this.stateName]: this.definition };
    }
}
