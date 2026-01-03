# ADR-002: Event Bus Semantics

## Status

Accepted

## Context

The simulation requires decoupled communication between systems. For example:
- When a zombie detects a villager, the alert system needs to know
- When day transitions to night, multiple systems need to adjust behavior
- When a physics collision occurs, game logic needs to respond

Key questions that must be answered:
1. Should event delivery be synchronous or asynchronous?
2. How should handler errors be isolated?
3. What happens when a handler emits another event (re-entrancy)?
4. In what order should handlers execute?

## Options Considered

### Option 1: Asynchronous Event Queue

Events are queued and processed in a dedicated phase:

```javascript
eventBus.emit('zombieAlert', data); // Queues event
// Later, during event processing phase:
eventBus.processQueue(); // All handlers run
```

**Pros:**
- Predictable timing (all events processed at known point)
- No re-entrancy concerns
- Can batch and prioritize events
- Easier to debug (clear processing phase)

**Cons:**
- Delayed response (event not handled until queue processed)
- State may change between emit and handling
- More complex implementation
- Harder to reason about cause-and-effect

### Option 2: Synchronous Immediate Delivery

Events are delivered immediately when emitted:

```javascript
eventBus.emit('zombieAlert', data); // Handlers run NOW
// Code after emit sees results of all handlers
```

**Pros:**
- Immediate response
- Simpler mental model (emit = handle)
- State is consistent at emit time
- Easier cause-and-effect reasoning

**Cons:**
- Re-entrancy possible (handler emits event)
- Stack depth concerns
- Handler errors can disrupt emitter
- Order dependencies can be subtle

### Option 3: Hybrid (Sync with Deferred Option)

Default synchronous, with option to defer:

```javascript
eventBus.emit('zombieAlert', data); // Immediate
eventBus.emitDeferred('cleanup', data); // Queued
```

**Pros:**
- Flexibility for different use cases
- Immediate when needed, deferred when safer

**Cons:**
- Two mental models to maintain
- API complexity
- Inconsistent behavior patterns

## Decision

We will use **Synchronous Immediate Delivery** with the following constraints:

1. **Handler Order**: Handlers execute in registration order
2. **Error Isolation**: Handler errors are caught and logged; remaining handlers still execute
3. **Re-entrancy**: Allowed with depth limit (default 10 levels)
4. **Immutability Contract**: Event data should not be mutated by handlers (contract, not enforced)

## Rationale

1. **Simplicity**: Synchronous delivery is easier to reason about. When you emit an event, you know handlers have run by the time emit() returns.

2. **Immediate Response**: Game simulations often need immediate reactions. A zombie detecting a villager should trigger alert behavior in the same frame.

3. **State Consistency**: At emit time, the world state is known. Deferred processing means state may have changed, requiring defensive coding.

4. **Error Isolation**: By catching handler errors, one buggy handler doesn't break the entire event chain. This is critical for robustness.

5. **Bounded Re-entrancy**: Allowing re-entrancy (with limits) enables natural patterns like "on damage, emit death if health <= 0". The depth limit prevents infinite loops.

6. **Registration Order**: Deterministic ordering makes debugging easier and allows intentional ordering when needed.

## Consequences

### Positive

- Simple mental model: emit = immediate handling
- Handlers can rely on consistent world state
- Error in one handler doesn't break others
- Natural support for cascading events (with limits)
- Deterministic, reproducible behavior

### Negative

- Re-entrancy requires careful design to avoid deep stacks
- Handler order matters (implicit dependencies possible)
- Long handler chains can delay the emitter
- Immutability is a contract, not enforced (mutation bugs possible)

### Risks

- **Infinite loops**: Mitigated by depth limit with error on exceed
- **Performance**: Long handler chains block. Mitigated by keeping handlers fast.
- **Order dependencies**: Mitigated by documentation and avoiding implicit ordering assumptions.

### Error Handling Specifics

When a handler throws:
1. Error is caught
2. Error is logged with handler identity and event type
3. Remaining handlers continue execution
4. Emit() completes normally (does not throw)

When re-entrancy depth exceeded:
1. Nested emit is aborted
2. Error logged (category: "system", severity: "error")
3. Outer handlers continue
4. Original emit completes

## Cross-References

- #[[file:docs/Code_Tech_Docs/core-systems/event-system.md]]
- #[[file:docs/Code_Tech_Docs/patterns/error-handling.md]]
- Correctness Properties: 4, 5
