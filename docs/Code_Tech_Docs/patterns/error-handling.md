# Error Handling Pattern

## Purpose

The Error Handling pattern provides a structured approach to detecting, categorizing, logging, and recovering from errors across all simulation systems. It ensures the simulation remains stable and provides meaningful feedback when issues occur.

Error handling enables:
- Graceful degradation when systems fail
- Meaningful error messages for debugging
- Automatic recovery from recoverable errors
- Safe mode operation when critical failures occur
- Performance monitoring and throttling

#[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]

## Boundaries

**In Scope:**
- Error categorization and severity classification
- Error logging with context
- Recovery strategy selection and execution
- Safe mode activation and deactivation
- Fallback configuration management

**Out of Scope:**
- System-specific error detection (handled by each system)
- User interface error display (handled by UI system)
- Network error handling (not applicable to this simulation)
- Persistence of error logs (handled by external logging)

## Responsibilities

- Categorize errors by system and severity
- Log errors with appropriate context and stack traces
- Select and execute recovery strategies
- Manage safe mode activation/deactivation
- Apply fallback configurations when systems fail
- Track error history for pattern detection
- Notify registered callbacks of error events

## Error Categories

### Category Hierarchy

```
SimulationError (base)
├── SystemError
│   ├── FatalSystemError
│   ├── DependencyError
│   └── ServiceError
├── EntityError
│   └── ComponentError
├── PhysicsError
│   └── CollisionError
├── AIError
│   ├── PathfindingError
│   └── BehaviorError
├── EnvironmentError
│   ├── WeatherError
│   ├── TerrainError
│   └── WaterError
└── AgentError
    ├── NavigationError
    ├── CollisionError
    ├── AnimationError
    └── ResourceError
```

### Category Descriptions

| Category | Examples | Typical Source |
|----------|----------|----------------|
| Physics | Body creation failure, collision error, constraint violation | Havok integration |
| Render | Context lost, shader compile failure, texture load error | Babylon.js integration |
| Agent | State machine error, pathfinding failure, behavior error | Agent system |
| Level | Load failure, config parse error, resource missing | Level system |
| System | Initialization failure, update error, dependency missing | Core systems |
| Environment | Terrain query failure, weather update error | Environment system |

## Severity Levels

### Severity Classification

| Severity | Description | Examples |
|----------|-------------|----------|
| Critical | System cannot continue, requires halt or safe mode | GPU crash, out of memory, system freeze |
| Error | Significant issue, requires recovery action | Physics body creation failed, level load failed |
| Warning | Potential issue, continue with caution | Performance degradation, resource not found |
| Info | Informational, no action required | Configuration change, state transition |

### Severity Handling Rules

```
┌─────────────────────────────────────────────────────────┐
│ CRITICAL:                                               │
│ 1. Log error with full context and stack trace          │
│ 2. Activate safe mode immediately                       │
│ 3. Disable affected systems                             │
│ 4. Notify user of critical failure                      │
│ 5. Attempt graceful shutdown if unrecoverable           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ERROR:                                                  │
│ 1. Log error with context                               │
│ 2. Apply system-specific fallback                       │
│ 3. Attempt recovery strategy                            │
│ 4. Continue operation if recovery succeeds              │
│ 5. Escalate to critical if recovery fails               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ WARNING:                                                │
│ 1. Log warning with context                             │
│ 2. Apply partial fallback if needed                     │
│ 3. Continue normal operation                            │
│ 4. Monitor for escalation                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ INFO:                                                   │
│ 1. Log information                                      │
│ 2. Continue normal operation                            │
└─────────────────────────────────────────────────────────┘
```

## Recovery Strategies

### Strategy Selection

| Error Type | Primary Strategy | Fallback Strategy |
|------------|-----------------|-------------------|
| Initialization Failure | Retry with fallback config | Disable system |
| Runtime Error | Apply system fallback | Reduce quality |
| Memory Error | Aggressive cleanup | Reduce quality + cleanup |
| GPU Error | Disable GPU optimizations | Safe mode |
| Performance Crash | Safe mode | Halt |
| System Overload | Reduce all quality levels | Safe mode |

### Recovery Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     ERROR DETECTED                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Categorize error (system, severity)                           │
│ 2. Log error with context                                        │
│ 3. Add to error history                                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Check if action required:                                      │
│    - Critical severity?                                           │
│    - Error frequency threshold exceeded?                          │
│    - Consecutive error threshold exceeded?                        │
│    - System already failing?                                      │
└──────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ ACTION REQUIRED         │     │ NO ACTION REQUIRED      │
│                         │     │                         │
│ 5. Select recovery      │     │ 5. Log for analysis     │
│    strategy             │     │ 6. Continue operation   │
│ 6. Execute strategy     │     │                         │
│ 7. Verify recovery      │     │                         │
└─────────────────────────┘     └─────────────────────────┘
```

## Safe Mode

### Safe Mode Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| Quality Level | 25 | Minimal visual quality |
| Max Active Agents | 10 | Reduce AI load |
| Disable Effects | true | Reduce GPU load |
| Disable Physics Optimization | true | Use basic physics |
| Disable Rendering Optimization | true | Use basic rendering |
| Log All Operations | true | Enhanced debugging |

### Safe Mode Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ ACTIVATION:                                             │
│ 1. Store current state for restoration                  │
│ 2. Stop all optimization systems                        │
│ 3. Apply minimal quality settings                       │
│ 4. Disable dynamic adjustments                          │
│ 5. Set timeout for automatic exit attempt               │
│ 6. Notify callbacks                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ OPERATION:                                              │
│ - Run with minimal features                             │
│ - Log all operations for debugging                      │
│ - Monitor for error subsidence                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ EXIT ATTEMPT:                                           │
│ 1. Check if recent errors have subsided                 │
│ 2. If errors persist, extend safe mode                  │
│ 3. If clear, restore conservative settings              │
│ 4. Re-enable optimization with conservative level       │
│ 5. Clear failed systems list                            │
│ 6. Notify callbacks                                     │
└─────────────────────────────────────────────────────────┘
```

## Fallback Configurations

### System-Specific Fallbacks

| System | Fallback Action | Effect |
|--------|-----------------|--------|
| Adaptive Quality | Set to 50%, disable dynamic | Stable quality |
| Rendering | Disable instancing, limit draw calls | Reduced visual quality |
| AI Processing | Limit agents, reduce frequency | Fewer active agents |
| Physics | Reduce accuracy, limit bodies | Simplified physics |
| Memory | Aggressive cleanup, reduce cache | Lower memory usage |

## Semantics (Normative Guarantees)

### Error Logging
- All errors MUST be logged with category, severity, message, and timestamp
- Critical and error severity MUST include stack trace
- Context data MUST be included when available
- Error history MUST be maintained (capped at max size)

### Recovery Execution
- Recovery strategies MUST be attempted before escalation
- Failed recovery MUST escalate to next severity level
- Safe mode MUST be activated for critical errors
- Systems MUST remain in valid state after recovery

### Error Isolation
- Errors in one system MUST NOT crash other systems
- Error handlers MUST catch and log their own errors
- Callback errors MUST NOT prevent other callbacks from executing
- Agent errors MUST NOT prevent other agents from updating

### Safe Mode Guarantees
- Safe mode MUST provide basic functionality
- Safe mode MUST automatically attempt exit after timeout
- Safe mode exit MUST verify error subsidence
- Safe mode MUST be re-enterable if errors recur

## Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxErrorsPerMinute` | 10 | Threshold for action trigger |
| `maxConsecutiveErrors` | 5 | Consecutive errors before action |
| `safeModeTimeout` | 30000ms | Time before safe mode exit attempt |
| `maxErrorHistorySize` | 100 | Maximum error records retained |

## Correctness Properties

Error handling supports the following correctness properties:

### Property 11: Agent Error Recovery
*For any* error during agent update, the agent MUST remain in a valid state.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

This property ensures that:
- Agent state machine remains valid after errors
- Agent can continue operation after recovery
- Other agents are not affected by one agent's error

#[[file:docs/Code_Tech_Docs/correctness-properties.md#property-11]]

## Observability

### Metrics to Track
- Error count by category and severity
- Recovery success/failure rate
- Safe mode activation count and duration
- Error frequency over time
- Fallback activation count

### Events to Log
- All errors with full context
- Recovery strategy execution and result
- Safe mode activation/deactivation
- Fallback configuration changes
- Error threshold breaches

### Debug Information
- Current error handler status
- Failed systems list
- Recent error history
- Active fallback configurations
- Safe mode state

## Decorator Pattern

Error handling uses decorators for cross-cutting concerns:

### Available Decorators

| Decorator | Purpose | Usage |
|-----------|---------|-------|
| `catchErrors` | Wrap method with error catching | Methods that may throw |
| `handleAsyncErrors` | Wrap async method with error catching | Async methods |
| `logMethod` | Log method entry/exit | Debugging |
| `validateArgs` | Validate method arguments | Input validation |
| `retry` | Retry method on failure | Transient failures |
| `throttle` | Limit method call frequency | Performance |
| `measurePerformance` | Track method execution time | Performance monitoring |

### Decorator Application

```javascript
// Apply error handling to agent behavior
const wrappedMethod = handleAgentError(originalMethod);

// Apply performance measurement
const measuredMethod = measurePerformance(originalMethod);

// Apply throttling
const throttledMethod = throttle(100, originalMethod);
```

## Example Error Handling

### Agent Error Recovery
```javascript
function handleAgentError(originalMethod) {
    return function(...args) {
        try {
            return originalMethod.apply(this, args);
        } catch (error) {
            console.error(`Error in agent behavior:`, error);
            
            // Recover by setting to idle state
            if (this.setState) {
                this.setState('idle');
            }
            
            return null;
        }
    };
}
```

### System Fallback Application
```javascript
function applySystemFallback(errorRecord) {
    const failedSystem = identifyFailedSystem(errorRecord);
    
    if (failedSystem) {
        failedSystems.add(failedSystem);
        
        switch (failedSystem) {
            case 'rendering':
                disableInstancing();
                limitDrawCalls(100);
                break;
            case 'aiProcessing':
                limitAgentCount(20);
                reduceUpdateFrequency(0.5);
                break;
            case 'physics':
                reducePhysicsAccuracy();
                limitPhysicsBodies(50);
                break;
        }
    }
}
```

## Cross-References

- #[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]
- #[[file:docs/Code_Tech_Docs/patterns/state-machine.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/event-system.md]]
