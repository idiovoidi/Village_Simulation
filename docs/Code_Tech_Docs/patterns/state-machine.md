# State Machine Pattern

## Purpose

The State Machine pattern models agent behaviors as discrete states with explicit transitions. Each agent type (villager, zombie, fish, bird, dog, boat) uses a finite state machine (FSM) to manage decision-making, providing predictable, debuggable, and efficient behavior control.

State machines enable:
- Clear visualization of agent behavior through state diagrams
- Predictable, observable behaviors for the simulation
- Efficient O(1) state checks for hundreds of agents
- Easy debugging ("what state is this agent in?")

#[[file:docs/Code_Tech_Docs/adrs/004-state-machine-approach.md]]

## Boundaries

**In Scope:**
- State lifecycle management (enter, update, exit)
- Transition validation and execution
- Entry/exit action execution
- State history tracking
- Hierarchical state support (push/pop)

**Out of Scope:**
- State-specific behavior implementation (handled by agent systems)
- Rendering or visual feedback (handled by model layer)
- Physics interactions (handled by physics system)
- Group coordination (handled by group behavior pattern)

## Responsibilities

- Track current state for each agent
- Validate transition requests against defined rules
- Execute entry actions when entering a state
- Execute exit actions when leaving a state
- Execute update logic for the current state each frame
- Maintain state history for debugging and analysis
- Support hierarchical states via state stack
- Provide state query interface for external systems

## Lifecycle

### 1. Initialization

```
┌─────────────────────────────────────────────────────────┐
│ 1. Create state machine with state definitions          │
│ 2. Register entry/exit/update callbacks for each state  │
│ 3. Define allowed transitions between states            │
│ 4. Initialize with starting state                       │
│ 5. Execute entry action for initial state               │
└─────────────────────────────────────────────────────────┘
```

### 2. Active Operation (Per Frame)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Update local context (deltaTime, timeInState)        │
│ 2. Execute current state's update callback              │
│ 3. Check automatic transition conditions                │
│ 4. If transition triggered:                             │
│    a. Execute exit action for current state             │
│    b. Update current state reference                    │
│    c. Execute entry action for new state                │
│    d. Record transition in history                      │
└─────────────────────────────────────────────────────────┘
```

### 3. Cleanup/Disposal

```
┌─────────────────────────────────────────────────────────┐
│ 1. Execute exit action for current state                │
│ 2. Clear state history                                  │
│ 3. Clear state stack                                    │
│ 4. Clear callbacks and definitions                      │
│ 5. Release agent reference                              │
└─────────────────────────────────────────────────────────┘
```

## State Definition Structure

Each state is defined with the following optional components:

| Component | Purpose | When Called |
|-----------|---------|-------------|
| `onEnter` | Setup when entering state | After transition, before first update |
| `onUpdate` | Per-frame behavior logic | Each frame while in state |
| `onExit` | Cleanup when leaving state | Before transition to new state |
| `canEnter` | Guard condition for entry | Before transition is allowed |
| `canExit` | Guard condition for exit | Before transition is allowed |
| `allowedTransitions` | List of valid target states | Checked during transition validation |
| `autoTransitions` | Condition-based automatic transitions | Checked after each update |

## Transition Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     Transition Request                            │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Validate timing (cooldown elapsed?)                           │
│    └─ If no: Reject transition                                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Validate target state exists                                  │
│    └─ If no: Log warning, reject transition                      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Check canExit on current state                                │
│    └─ If false: Reject transition                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Check canEnter on target state                                │
│    └─ If false: Reject transition                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Check allowedTransitions list                                 │
│    └─ If target not in list: Reject transition                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. Execute onExit for current state                              │
│ 7. Update current state reference                                │
│ 8. Execute onEnter for new state                                 │
│ 9. Record in history, trigger callbacks                          │
└──────────────────────────────────────────────────────────────────┘
```

## Hierarchical States (Push/Pop)

For complex behaviors requiring temporary state interruption:

```
┌─────────────────────────────────────────────────────────┐
│ Push State:                                             │
│ 1. Save current state and context to stack              │
│ 2. Transition to new state                              │
│                                                         │
│ Pop State:                                              │
│ 1. Restore previous state and context from stack        │
│ 2. Transition back to restored state                    │
└─────────────────────────────────────────────────────────┘
```

**Use Case Example**: A villager in "Working" state receives a threat alert:
1. Push "Fleeing" state onto stack
2. Execute fleeing behavior
3. When safe, pop stack to return to "Working"

## Semantics (Normative Guarantees)

### State Validity
- Current state MUST always be defined and valid
- State machine MUST NOT enter an undefined state
- After initialization, current state MUST NOT be null

### Transition Validity
- Transitions MUST only occur between states with defined transition rules
- If `allowedTransitions` is defined, target MUST be in the list
- Transition requests to undefined states MUST be rejected with warning

### Entry/Exit Action Ordering
- Exit action MUST execute before transition, after last update in old state
- Entry action MUST execute after transition, before first update in new state
- Entry/exit actions MUST NOT be skipped during valid transitions

### Error Isolation
- Errors in entry/exit/update callbacks MUST be caught and logged
- Errors MUST NOT prevent state machine from continuing operation
- Agent MUST remain in a valid state after any error

### Timing Guarantees
- Transition cooldown MUST be respected (default: 100ms)
- `timeInState` MUST accurately reflect time since state entry
- State history timestamps MUST be monotonically increasing

## Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `transitionCooldown` | 0.1s | Minimum time between transitions |
| `maxHistorySize` | 50 | Maximum state history entries retained |

## Correctness Properties

### Property 7: Transition Validity
*For any* state machine, transitions MUST only occur between states with defined transition rules.

**Validates: Requirements 7.2**

### Property 8: State Validity
*For any* state machine, the current state MUST always be a valid, defined state.

**Validates: Requirements 7.2**

#[[file:docs/Code_Tech_Docs/correctness-properties.md#property-7]]
#[[file:docs/Code_Tech_Docs/correctness-properties.md#property-8]]

## Observability

### Metrics to Track
- Transition count per agent
- Time spent in each state
- Average/max update execution time per state
- State stack depth (for hierarchical states)

### Events to Log
- State transitions (from → to, with context)
- Rejected transitions (reason)
- Entry/exit action errors
- Automatic transition triggers

### Debug Information
- Current state name
- Time in current state
- Previous state
- Recent state history
- Performance metrics by state

## Example State Definitions

### Zombie States
```
States: Wandering, Suspicious, Pursuing, Lurging

Wandering:
  allowedTransitions: [Suspicious, Pursuing]
  autoTransitions:
    - condition: hearSound → Suspicious
    - condition: seeTarget → Pursuing

Suspicious:
  allowedTransitions: [Wandering, Pursuing]
  autoTransitions:
    - condition: investigationComplete → Wandering
    - condition: confirmTarget → Pursuing

Pursuing:
  allowedTransitions: [Wandering, Lurging]
  autoTransitions:
    - condition: loseTarget → Wandering
    - condition: inAttackRange → Lurging

Lurging:
  allowedTransitions: [Pursuing, Wandering]
  autoTransitions:
    - condition: attackComplete → Pursuing
```

### Villager States
```
States: Idle, Working, Socializing, Sleeping, Fleeing, Sheltering

Idle:
  allowedTransitions: [Working, Socializing, Sleeping, Fleeing]
  
Working:
  allowedTransitions: [Idle, Socializing, Fleeing]
  
Socializing:
  allowedTransitions: [Idle, Working, Fleeing]
  
Sleeping:
  allowedTransitions: [Idle, Fleeing]
  
Fleeing:
  allowedTransitions: [Sheltering, Idle]
  
Sheltering:
  allowedTransitions: [Idle, Fleeing]
```

## Cross-References

- #[[file:docs/Code_Tech_Docs/adrs/004-state-machine-approach.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]
- #[[file:docs/Design_Docs/agent-behaviors/villager-mechanics.md]]
- #[[file:docs/Design_Docs/agent-behaviors/zombie-mechanics.md]]
- #[[file:docs/Design_Docs/agent-behaviors/wildlife-mechanics.md]]
