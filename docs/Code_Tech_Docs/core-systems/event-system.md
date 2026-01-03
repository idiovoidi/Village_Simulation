# Event System

## Purpose

The Event System provides decoupled communication between systems through a publish-subscribe pattern. Systems can emit events without knowing which other systems will handle them, and subscribe to events without knowing which systems emit them.

## Boundaries

**In Scope:**
- Event registration and subscription management
- Event emission and handler invocation
- Handler ordering and execution
- Error isolation between handlers
- Re-entrancy management

**Out of Scope:**
- Event persistence or replay
- Network event distribution
- Event transformation or filtering
- Specific event type definitions (defined per-system)

## Responsibilities

- Register event handlers for specific event types
- Emit events to all registered handlers
- Manage handler lifecycle (subscribe/unsubscribe)
- Execute handlers in registration order
- Isolate handler errors to prevent cascade failures
- Manage re-entrant event emission

## Core Concepts

### Event

An event is a named message with associated data. Events represent something that happened in the simulation.

```
Event = {
  type: string,      // Event identifier
  data: object       // Event payload (immutable by contract)
}
```

Example events:
- `{ type: "agent_spawned", data: { entityId, agentType, position } }`
- `{ type: "level_loaded", data: { levelId, config } }`
- `{ type: "time_changed", data: { hour, minute, isNight } }`

### Handler

A handler is a function that processes events of a specific type.

```
Handler = (eventData: object) => void
```

Handlers receive only the event data, not the event type (which they already know from subscription).

### Subscription

A subscription links a handler to an event type. Subscriptions can be removed to stop receiving events.

```
Subscription = {
  eventType: string,
  handler: Handler,
  unsubscribe: () => void
}
```

## Lifecycle

### 1. Event Bus Initialization
```
1. Create Event Bus instance
2. Initialize handler registry (empty)
3. Event Bus ready for subscriptions
```

### 2. Subscription Lifecycle
```
1. System subscribes to event type
2. Handler added to registry for that type
3. Handler receives events when emitted
4. System unsubscribes (or is disposed)
5. Handler removed from registry
```

### 3. Event Emission
```
1. System emits event with type and data
2. Event Bus retrieves handlers for type
3. Each handler invoked in registration order
4. Errors caught and logged per handler
5. Emission complete
```

### 4. Event Bus Disposal
```
1. Clear all subscriptions
2. Release handler registry
3. Event Bus disposed
```

## Handler Ordering

Handlers execute in the order they were registered:

```
Registration Order:
1. SystemA subscribes to "player_moved"
2. SystemB subscribes to "player_moved"
3. SystemC subscribes to "player_moved"

Execution Order (when "player_moved" emitted):
1. SystemA handler executes
2. SystemB handler executes
3. SystemC handler executes
```

This deterministic ordering enables systems to depend on processing order when necessary.

## Error Isolation

Handler errors are isolated to prevent cascade failures:

```
Event Emission with Error:
┌─────────────────────────────────────────────────────────┐
│  emit("player_moved", data)                              │
│                                                          │
│  Handler A: ✓ Success                                    │
│  Handler B: ✗ Throws Error → Caught, Logged             │
│  Handler C: ✓ Success (still executes)                  │
│  Handler D: ✓ Success (still executes)                  │
│                                                          │
│  Result: Event delivered to all handlers                 │
│          Error logged for Handler B                      │
└─────────────────────────────────────────────────────────┘
```

## Re-Entrancy

Handlers may emit events during handling, creating nested event processing:

```
Re-Entrant Emission:
┌─────────────────────────────────────────────────────────┐
│  emit("event_A")                                         │
│  │                                                       │
│  ├─▶ Handler 1 for A                                    │
│  │   │                                                   │
│  │   └─▶ emit("event_B")  ← Nested emission             │
│  │       │                                               │
│  │       ├─▶ Handler 1 for B                            │
│  │       └─▶ Handler 2 for B                            │
│  │       │                                               │
│  │       └─▶ (B complete)                               │
│  │                                                       │
│  ├─▶ Handler 2 for A  ← Continues after B complete      │
│  └─▶ Handler 3 for A                                    │
│                                                          │
│  (A complete)                                            │
└─────────────────────────────────────────────────────────┘
```

### Depth Limiting

Re-entrancy depth is bounded to prevent infinite recursion:

```
Depth Limit Exceeded:
┌─────────────────────────────────────────────────────────┐
│  emit("event_A")           Depth: 1                      │
│  └─▶ emit("event_B")       Depth: 2                      │
│      └─▶ emit("event_C")   Depth: 3                      │
│          └─▶ ...                                         │
│              └─▶ emit()    Depth: 11 → ERROR!           │
│                  │                                       │
│                  └─▶ Nested emit aborted                │
│                      Error logged                        │
│                      Outer handlers continue             │
└─────────────────────────────────────────────────────────┘
```

## Event Data Immutability

Event data immutability is a contract, not enforced at runtime:

```
Immutability Contract:
┌─────────────────────────────────────────────────────────┐
│  const data = { x: 10, y: 20 };                          │
│  emit("position_changed", data);                         │
│                                                          │
│  Handler A: reads data.x → 10 ✓                         │
│  Handler B: data.x = 99;  ← CONTRACT VIOLATION!         │
│  Handler C: reads data.x → 99 (corrupted)               │
│                                                          │
│  Mutating event data is an implementation error.         │
│  Later handlers may observe modified state.              │
└─────────────────────────────────────────────────────────┘
```

Implementations SHOULD use Object.freeze() or similar mechanisms to detect violations during development.

## Semantics (Normative Guarantees)

### Handler Execution Guarantees

- Handlers MUST execute synchronously in registration order
- Each handler MUST receive event data exactly once per emission
- Handler errors MUST be caught and logged
- Remaining handlers MUST still execute after a handler error

### Subscription Guarantees

- Unsubscribed handlers MUST NOT receive subsequent events
- Subscriptions made during event handling MUST NOT receive the current event
- Unsubscriptions made during event handling MUST take effect after current handler completes

### Re-Entrancy Guarantees

- Handlers MAY emit events during handling
- Nested events MUST be processed immediately (depth-first)
- Nested events MUST complete before outer handler continues
- Re-entrancy depth MUST be bounded (implementations SHOULD limit to 10 levels)
- When max depth is exceeded:
  - The nested emit MUST be aborted
  - An error of category "system" with severity "error" MUST be logged
  - Outer handlers MUST continue execution

### Data Guarantees

- Event data immutability is a contract, not enforced
- Mutating event data MAY cause later handlers to observe modified state
- Mutation is considered an implementation error

## Correctness Properties

### Property 4: Handler Delivery
*For any* event emitted, all registered handlers for that event type MUST receive the event data exactly once.

**Validates: Requirements 4.2**

### Property 5: Handler Error Isolation
*For any* handler that throws an error, remaining handlers MUST still execute.

**Validates: Requirements 4.2**

## Observability

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Events per frame | Total events emitted | > 1,000 |
| Handlers per event | Average handlers invoked | > 20 |
| Handler duration | Time per handler execution | > 1ms |
| Re-entrancy depth | Maximum nesting depth reached | > 5 |
| Handler errors | Errors caught per frame | > 0 |

### Events to Log

| Event | Level | Data |
|-------|-------|------|
| Event emitted | Trace | eventType, handlerCount |
| Handler error | Error | eventType, handlerName, error |
| Depth limit exceeded | Error | eventType, depth |
| Subscription added | Debug | eventType, handlerName |
| Subscription removed | Debug | eventType, handlerName |

## Cross-References

- #[[file:docs/Code_Tech_Docs/architecture-overview.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/update-ordering.md]]
- #[[file:docs/Code_Tech_Docs/adrs/002-event-bus-semantics.md]]
- #[[file:docs/Code_Tech_Docs/correctness-properties.md]]
