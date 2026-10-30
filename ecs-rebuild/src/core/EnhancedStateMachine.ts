/**
 * Enhanced State Machine System
 * Provides hierarchical state management with context awareness and state history
 */

export interface StateDefinition {
  onEnter?: (agent: unknown, context: StateContext) => void;
  onUpdate?: (agent: unknown, localContext: StateContext, globalContext: StateContext) => void;
  onExit?: (agent: unknown, context: StateContext) => void;
  canEnter?: (agent: unknown, context: StateContext, fromState: string | null) => boolean;
  canExit?: (agent: unknown, context: StateContext, targetState: string) => boolean;
  allowedTransitions?: string[];
  autoTransitions?: AutoTransition[];
}

export interface StateContext {
  deltaTime?: number;
  timeInState?: number;
  [key: string]: unknown;
}

export interface AutoTransition {
  condition: (agent: unknown, localContext: StateContext, globalContext: StateContext) => boolean;
  targetState: string;
}

export interface StateHistoryEntry {
  fromState: string | null;
  toState: string;
  timestamp: number;
  context: StateContext;
  timeInPreviousState: number;
}

export interface StatePerformanceMetrics {
  totalTime: number;
  callCount: number;
  averageTime: number;
  maxTime: number;
}

export interface StateChangeCallback {
  (state: string, agent: unknown, context: StateContext): void;
}

export interface TransitionCallback {
  (fromState: string | null, toState: string, agent: unknown, context: StateContext): void;
}

export class EnhancedStateMachine {
  private agent: unknown;
  private stateDefinitions: Map<string, StateDefinition>;

  // Current state management
  private _currentState: string | null = null;
  private previousState: string | null = null;
  private stateStack: Array<{ state: string; context: StateContext; timestamp: number }> = [];

  // State history for learning and debugging
  private stateHistory: StateHistoryEntry[] = [];
  private readonly maxHistorySize = 50;

  // Context and environmental awareness
  private globalContext: StateContext = {};
  private localContext: StateContext = {};

  // Timing and transition management
  private stateStartTime = 0;
  private lastTransitionTime = 0;
  private readonly transitionCooldown = 0.1; // Minimum time between transitions

  // Performance tracking
  private transitionCount = 0;
  private statePerformance = new Map<string, StatePerformanceMetrics>();

  // Event system for state changes
  private stateChangeCallbacks = new Map<string, Set<StateChangeCallback | TransitionCallback>>();

  constructor(agent: unknown, stateDefinitions: Record<string, StateDefinition> = {}) {
    this.agent = agent;
    this.stateDefinitions = new Map(Object.entries(stateDefinitions));
  }

  get currentState(): string | null {
    return this._currentState;
  }

  /**
   * Initialize the state machine with a starting state
   * @param initialState - The initial state name
   * @param context - Initial context data
   */
  initialize(initialState: string, context: StateContext = {}): void {
    this.globalContext = { ...context };
    this.transitionTo(initialState, { isInitial: true });
  }

  /**
   * Transition to a new state with validation and context
   * @param newState - Target state name
   * @param transitionContext - Context for this transition
   * @returns Success of transition
   */
  transitionTo(newState: string, transitionContext: StateContext = {}): boolean {
    // Validate transition timing
    const now = performance.now();
    if (now - this.lastTransitionTime < this.transitionCooldown * 1000) {
      return false;
    }

    // Validate state exists
    if (!this.stateDefinitions.has(newState) && !transitionContext.isInitial) {
      console.warn(`State '${newState}' not defined in state machine`);
      return false;
    }

    // Check if transition is allowed
    if (!this.canTransitionTo(newState, transitionContext)) {
      return false;
    }

    // Store previous state
    const oldState = this._currentState;
    this.previousState = oldState;

    // Exit current state
    const oldStateDef = this.stateDefinitions.get(oldState ?? '');
    if (oldState && oldStateDef?.onExit) {
      try {
        oldStateDef.onExit(this.agent, this.localContext);
      } catch (error) {
        console.error(`Error exiting state '${oldState}':`, error);
      }
    }

    // Update state
    this._currentState = newState;
    this.stateStartTime = now;
    this.lastTransitionTime = now;
    this.transitionCount++;

    // Update state history
    this.addToHistory(oldState, newState, transitionContext);

    // Enter new state
    const newStateDef = this.stateDefinitions.get(newState);
    if (newStateDef?.onEnter) {
      try {
        newStateDef.onEnter(this.agent, this.localContext);
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
   * @param newState - State to push
   * @param context - Context for the push
   */
  pushState(newState: string, context: StateContext = {}): void {
    if (this._currentState) {
      this.stateStack.push({
        state: this._currentState,
        context: { ...this.localContext },
        timestamp: performance.now(),
      });
    }

    this.transitionTo(newState, { ...context, isPush: true });
  }

  /**
   * Pop the previous state from the stack
   * @param context - Context for the pop
   * @returns Success of pop operation
   */
  popState(context: StateContext = {}): boolean {
    if (this.stateStack.length === 0) {
      return false;
    }

    const previousStateInfo = this.stateStack.pop();
    if (!previousStateInfo) return false;

    this.localContext = previousStateInfo.context;

    return this.transitionTo(previousStateInfo.state, { ...context, isPop: true });
  }

  /**
   * Update the state machine (called each frame)
   * @param deltaTime - Time since last update
   */
  update(deltaTime: number): void {
    if (!this._currentState) return;

    const stateDefinition = this.stateDefinitions.get(this._currentState);
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
        this.updatePerformanceMetrics(this._currentState, executionTime);
      } catch (error) {
        console.error(`Error updating state '${this._currentState}':`, error);
      }
    }

    // Check for automatic transitions
    this.checkAutomaticTransitions();
  }

  /**
   * Check if transition to a state is allowed
   * @param targetState - Target state name
   * @param context - Transition context
   * @returns Whether transition is allowed
   */
  canTransitionTo(targetState: string, _context: StateContext = {}): boolean {
    const currentStateDefinition = this.stateDefinitions.get(this._currentState ?? '');
    const targetStateDefinition = this.stateDefinitions.get(targetState);

    // Check current state allows exit
    if (currentStateDefinition?.canExit) {
      if (!currentStateDefinition.canExit(this.agent, this.localContext, targetState)) {
        return false;
      }
    }

    // Check target state allows entry
    if (targetStateDefinition?.canEnter) {
      if (!targetStateDefinition.canEnter(this.agent, this.globalContext, this._currentState)) {
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
   * @param fromState - Previous state
   * @param toState - New state
   * @param context - Transition context
   */
  private addToHistory(fromState: string | null, toState: string, context: StateContext): void {
    const historyEntry: StateHistoryEntry = {
      fromState,
      toState,
      timestamp: performance.now(),
      context: { ...context },
      timeInPreviousState: fromState ? (performance.now() - this.stateStartTime) / 1000 : 0,
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
  private checkAutomaticTransitions(): void {
    const stateDefinition = this.stateDefinitions.get(this._currentState ?? '');
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
   * @param stateName - Name of the state
   * @param executionTime - Time taken to execute
   */
  private updatePerformanceMetrics(stateName: string, executionTime: number): void {
    if (!this.statePerformance.has(stateName)) {
      this.statePerformance.set(stateName, {
        totalTime: 0,
        callCount: 0,
        averageTime: 0,
        maxTime: 0,
      });
    }

    const metrics = this.statePerformance.get(stateName);
    if (!metrics) return;

    metrics.totalTime += executionTime;
    metrics.callCount++;
    metrics.averageTime = metrics.totalTime / metrics.callCount;
    metrics.maxTime = Math.max(metrics.maxTime, executionTime);
  }

  /**
   * Register callback for state changes
   * @param eventType - Type of event ('enter', 'exit', 'transition')
   * @param callback - Callback function
   */
  onStateChange(eventType: string, callback: StateChangeCallback | TransitionCallback): void {
    if (!this.stateChangeCallbacks.has(eventType)) {
      this.stateChangeCallbacks.set(eventType, new Set());
    }
    this.stateChangeCallbacks.get(eventType)?.add(callback);
  }

  /**
   * Trigger state change callbacks
   * @param fromState - Previous state
   * @param toState - New state
   * @param context - Transition context
   */
  private triggerStateChangeCallbacks(
    fromState: string | null,
    toState: string,
    context: StateContext
  ): void {
    // Trigger exit callbacks
    if (fromState && this.stateChangeCallbacks.has('exit')) {
      this.stateChangeCallbacks.get('exit')?.forEach((callback) => {
        try {
          (callback as StateChangeCallback)(fromState, this.agent, context);
        } catch (error) {
          console.error('Error in exit callback:', error);
        }
      });
    }

    // Trigger enter callbacks
    if (this.stateChangeCallbacks.has('enter')) {
      this.stateChangeCallbacks.get('enter')?.forEach((callback) => {
        try {
          (callback as StateChangeCallback)(toState, this.agent, context);
        } catch (error) {
          console.error('Error in enter callback:', error);
        }
      });
    }

    // Trigger transition callbacks
    if (this.stateChangeCallbacks.has('transition')) {
      this.stateChangeCallbacks.get('transition')?.forEach((callback) => {
        try {
          (callback as TransitionCallback)(fromState, toState, this.agent, context);
        } catch (error) {
          console.error('Error in transition callback:', error);
        }
      });
    }
  }

  /**
   * Get current state information
   */
  getCurrentStateInfo(): {
    state: string | null;
    timeInState: number;
    previousState: string | null;
    stackDepth: number;
    transitionCount: number;
  } {
    return {
      state: this._currentState,
      timeInState: (performance.now() - this.stateStartTime) / 1000,
      previousState: this.previousState,
      stackDepth: this.stateStack.length,
      transitionCount: this.transitionCount,
    };
  }

  /**
   * Get state history for analysis
   * @param limit - Maximum number of entries to return
   */
  getStateHistory(limit = 10): StateHistoryEntry[] {
    return this.stateHistory.slice(-limit);
  }

  /**
   * Get performance metrics for all states
   */
  getPerformanceMetrics(): Record<string, StatePerformanceMetrics> {
    const metrics: Record<string, StatePerformanceMetrics> = {};
    for (const [stateName, data] of this.statePerformance) {
      metrics[stateName] = { ...data };
    }
    return metrics;
  }

  /**
   * Update global context
   * @param newContext - New context data
   */
  updateGlobalContext(newContext: StateContext): void {
    this.globalContext = { ...this.globalContext, ...newContext };
  }

  /**
   * Update local context
   * @param newContext - New context data
   */
  updateLocalContext(newContext: StateContext): void {
    this.localContext = { ...this.localContext, ...newContext };
  }

  /**
   * Reset the state machine
   */
  reset(): void {
    this._currentState = null;
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
  dispose(): void {
    this.reset();
    this.stateChangeCallbacks.clear();
    this.stateDefinitions.clear();
    this.agent = null;
  }
}

/**
 * State Definition Builder - Helper class for creating state definitions
 */
export class StateDefinitionBuilder {
  private stateName: string;
  private definition: StateDefinition = {};

  constructor(stateName: string) {
    this.stateName = stateName;
  }

  onEnter(callback: StateDefinition['onEnter']): this {
    this.definition.onEnter = callback;
    return this;
  }

  onUpdate(callback: StateDefinition['onUpdate']): this {
    this.definition.onUpdate = callback;
    return this;
  }

  onExit(callback: StateDefinition['onExit']): this {
    this.definition.onExit = callback;
    return this;
  }

  canEnter(callback: StateDefinition['canEnter']): this {
    this.definition.canEnter = callback;
    return this;
  }

  canExit(callback: StateDefinition['canExit']): this {
    this.definition.canExit = callback;
    return this;
  }

  allowTransitions(states: string | string[]): this {
    this.definition.allowedTransitions = Array.isArray(states) ? states : [states];
    return this;
  }

  autoTransition(
    condition: (agent: unknown, localContext: StateContext, globalContext: StateContext) => boolean,
    targetState: string
  ): this {
    if (!this.definition.autoTransitions) {
      this.definition.autoTransitions = [];
    }
    this.definition.autoTransitions.push({ condition, targetState });
    return this;
  }

  build(): Record<string, StateDefinition> {
    return { [this.stateName]: this.definition };
  }
}