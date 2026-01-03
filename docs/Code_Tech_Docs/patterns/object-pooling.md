# Object Pooling Pattern

## Purpose

The Object Pooling pattern manages reusable object instances to reduce memory allocation overhead and garbage collection pressure. Instead of creating and destroying objects frequently, pools maintain a collection of pre-allocated objects that can be acquired, used, and returned for reuse.

Object pooling is critical for:
- Physics bodies that spawn/despawn frequently
- Agents that enter/leave the simulation
- Particles and visual effects
- Temporary calculation objects (vectors, matrices)
- Animation groups

#[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]

## Boundaries

**In Scope:**
- Pool creation and configuration
- Object acquisition (get from pool)
- Object release (return to pool)
- Pool size management
- Object reset/cleanup on release
- Memory pressure response

**Out of Scope:**
- Object-specific behavior (handled by consuming systems)
- Rendering or visual state (handled by render system)
- Physics simulation (handled by physics system)
- Agent decision-making (handled by agent system)

## Responsibilities

- Pre-allocate objects to avoid runtime allocation
- Track available and in-use objects
- Provide acquire/release interface for consumers
- Reset object state when returned to pool
- Grow pool when demand exceeds capacity (up to max size)
- Shrink pool under memory pressure
- Dispose objects when pool is destroyed
- Track pool utilization statistics

## Pool Structure

Each object pool maintains:

| Component | Purpose |
|-----------|---------|
| `available` | Array of objects ready for use |
| `inUse` | Set of objects currently acquired |
| `config.initialSize` | Number of objects pre-allocated |
| `config.maxSize` | Maximum pool capacity |
| `config.factory` | Function to create new objects |
| `config.reset` | Function to reset object state |
| `config.dispose` | Function to clean up object |
| `stats` | Hit/miss/created/disposed counts |

## Lifecycle

### 1. Pool Creation

```
┌─────────────────────────────────────────────────────────┐
│ 1. Define pool configuration                            │
│    - initialSize: starting capacity                     │
│    - maxSize: maximum capacity                          │
│    - factory: object creation function                  │
│    - reset: state reset function                        │
│    - dispose: cleanup function                          │
│ 2. Pre-allocate initialSize objects using factory       │
│ 3. Add all objects to available array                   │
│ 4. Register pool in pool registry                       │
└─────────────────────────────────────────────────────────┘
```

### 2. Object Acquisition (Get)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Check if available array has objects                 │
│    └─ If yes: Pop object, record hit                    │
│    └─ If no: Check if under maxSize                     │
│        └─ If yes: Create new object, record miss        │
│        └─ If no: Return null (pool exhausted)           │
│ 2. Reset object state using reset function              │
│ 3. Add object to inUse set                              │
│ 4. Return object to caller                              │
└─────────────────────────────────────────────────────────┘
```

### 3. Object Release (Return)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Verify object is tracked in inUse set                │
│    └─ If not: Log warning, return false                 │
│ 2. Remove object from inUse set                         │
│ 3. Reset object state using reset function              │
│ 4. Add object to available array                        │
│ 5. Return true (success)                                │
└─────────────────────────────────────────────────────────┘
```

### 4. Pool Disposal

```
┌─────────────────────────────────────────────────────────┐
│ 1. Dispose all objects in available array               │
│ 2. Dispose all objects in inUse set                     │
│ 3. Clear available array                                │
│ 4. Clear inUse set                                      │
│ 5. Remove pool from registry                            │
└─────────────────────────────────────────────────────────┘
```

## Acquire/Release Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        ACQUIRE FLOW                               │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ Pool has available objects?                                       │
│   ├─ YES: Pop from available → Reset → Add to inUse → Return     │
│   └─ NO: Pool under maxSize?                                      │
│           ├─ YES: Create new → Reset → Add to inUse → Return     │
│           └─ NO: Return null (exhausted)                          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        RELEASE FLOW                               │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ Object in inUse set?                                              │
│   ├─ YES: Remove from inUse → Reset → Push to available          │
│   └─ NO: Log warning → Return false                               │
└──────────────────────────────────────────────────────────────────┘
```

## Default Pool Types

| Pool Type | Initial Size | Max Size | Use Case |
|-----------|-------------|----------|----------|
| `particles` | 50 | 200 | Particle system objects |
| `tempMeshes` | 20 | 100 | Temporary mesh instances |
| `vector3` | 100 | 500 | Vector3 calculations |
| `matrix` | 50 | 200 | Matrix calculations |
| `animationGroups` | 10 | 50 | Animation instances |

## Agent Pooling

Agent pooling follows the same pattern but with additional considerations:

### Agent Pool Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ SPAWN (Acquire):                                        │
│ 1. Get agent from pool                                  │
│ 2. Initialize Model layer (mesh, materials)             │
│ 3. Initialize Behavior layer (state machine)            │
│ 4. Initialize Agent layer (identity, data)              │
│ 5. Position agent in world                              │
│ 6. Enable physics body                                  │
│ 7. Register with agent system                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ DESPAWN (Release):                                      │
│ 1. Unregister from agent system                         │
│ 2. Disable physics body                                 │
│ 3. Reset state machine to initial state                 │
│ 4. Clear agent data                                     │
│ 5. Hide mesh (setEnabled(false))                        │
│ 6. Return to pool                                       │
└─────────────────────────────────────────────────────────┘
```

### Agent Reset Requirements

When an agent is returned to the pool, the reset function MUST:
- Reset state machine to initial state
- Clear all agent-specific data
- Reset position to origin
- Disable mesh visibility
- Disable physics body
- Clear event subscriptions
- Reset animation state

## Physics Body Pooling

Physics bodies require special handling due to Havok integration:

### Physics Body Pool Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ ACQUIRE:                                                │
│ 1. Get body from pool                                   │
│ 2. Set body type (static/dynamic/kinematic)             │
│ 3. Configure collision groups                           │
│ 4. Set initial position/rotation                        │
│ 5. Enable body in physics world                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ RELEASE:                                                │
│ 1. Disable body in physics world                        │
│ 2. Reset velocity to zero                               │
│ 3. Reset angular velocity to zero                       │
│ 4. Clear collision callbacks                            │
│ 5. Return to pool                                       │
└─────────────────────────────────────────────────────────┘
```

## Semantics (Normative Guarantees)

### Acquisition Guarantees
- Acquired objects MUST be in a clean, reset state
- Acquired objects MUST be tracked in the inUse set
- Pool MUST NOT return the same object to multiple callers simultaneously
- Pool MUST return null when exhausted (not throw)

### Release Guarantees
- Released objects MUST be reset before becoming available
- Released objects MUST be removed from inUse tracking
- Releasing an untracked object MUST log a warning and return false
- Double-release MUST be detected and handled gracefully

### Lifecycle Guarantees
- Pool disposal MUST dispose all objects (available and in-use)
- Objects MUST NOT be used after pool disposal
- Factory function MUST be called only when pool needs to grow
- Reset function MUST be called on every acquire and release

### Memory Pressure Response
- Pool MUST support shrinking under memory pressure
- Shrinking MUST dispose excess objects properly
- Pool MUST NOT shrink below minimum viable size
- Emergency cleanup MUST be more aggressive than normal cleanup

## Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `initialSize` | 10 | Objects pre-allocated at creation |
| `maxSize` | 100 | Maximum pool capacity |
| `cleanupInterval` | 30000ms | Time between cleanup cycles |
| `memoryPressureThreshold` | 0.8 | Memory usage triggering aggressive cleanup |
| `aggressiveCleanupThreshold` | 0.9 | Memory usage triggering emergency cleanup |

## Correctness Properties

Properties related to object pooling are validated through the physics and agent system properties:

### From Requirements 6.5 (Physics Body Pooling)
*For any* physics body acquired from the pool, the body MUST be in a valid, reset state with zero velocity.

### From Requirements 7.4 (Agent Pooling)
*For any* agent acquired from the pool, all three layers (Model, Behavior, Agent) MUST be properly initialized before the first update.

#[[file:docs/Code_Tech_Docs/correctness-properties.md]]

## Observability

### Metrics to Track
- Pool hit rate (available / total requests)
- Pool miss rate (created / total requests)
- Current utilization (inUse / maxSize)
- Objects created vs disposed
- Memory reclaimed during cleanup

### Events to Log
- Pool creation with configuration
- Pool exhaustion (max size reached)
- Memory pressure triggered
- Cleanup cycles with results
- Untracked release attempts

### Debug Information
- Available count per pool
- In-use count per pool
- Hit/miss statistics
- Memory pressure state
- Last cleanup timestamp

## Memory Pressure Response

### Normal Operation (< 80% memory)
- Standard cleanup interval (30s)
- Normal pool sizes maintained
- Objects cleaned up after 60s unused

### Memory Pressure (80-90% memory)
- Aggressive cleanup triggered
- Pool sizes reduced to 50%
- Objects cleaned up after 30s unused

### Critical Memory (> 90% memory)
- Emergency cleanup triggered
- Pool sizes reduced to 20%
- All unreferenced objects disposed immediately
- Garbage collection forced if available

## Example Pool Configuration

```javascript
// Particle pool configuration
{
    initialSize: 50,
    maxSize: 200,
    factory: () => ({
        position: new Vector3(),
        velocity: new Vector3(),
        life: 1.0,
        maxLife: 1.0,
        size: 1.0,
        color: new Color4(1, 1, 1, 1),
        active: false
    }),
    reset: (particle) => {
        particle.position.setAll(0);
        particle.velocity.setAll(0);
        particle.life = 1.0;
        particle.size = 1.0;
        particle.active = false;
    },
    dispose: (particle) => {
        // Particles don't need special disposal
    }
}
```

## Cross-References

- #[[file:docs/Code_Tech_Docs/subsystems/physics-system.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]
- #[[file:docs/Code_Tech_Docs/patterns/error-handling.md]]
