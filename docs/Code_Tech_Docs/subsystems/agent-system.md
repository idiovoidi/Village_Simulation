# Agent System

## Purpose

The Agent System manages AI-controlled entities in the simulation, providing a structured approach to agent composition, behavior execution, and lifecycle management. It implements a three-layer architecture separating visual representation, decision-making, and instance management.

## Boundaries

**In Scope:**
- Three-layer agent composition (Model, Behavior, Agent)
- Agent pooling and lifecycle management
- Behavior throttling based on camera distance
- State machine integration
- Group behavior coordination

**Out of Scope:**
- Physics simulation (see #[[file:docs/Code_Tech_Docs/subsystems/physics-system.md]])
- Rendering (see #[[file:docs/Code_Tech_Docs/subsystems/render-system.md]])
- Specific agent behaviors (see #[[file:docs/Design_Docs/agent-behaviors/]])

## Responsibilities

- Create and manage agent instances
- Coordinate three-layer composition
- Execute behavior updates
- Apply behavior throttling
- Manage agent pools
- Synchronize model positions with agent state
- Coordinate group behaviors

## Lifecycle

1. **Initialization**
   - Register agent types with factory
   - Initialize agent pools per type
   - Set up throttling configuration

2. **Active Operation**
   - Spawn agents from pool
   - Update behaviors (respecting throttling)
   - Synchronize model positions
   - Process group behaviors
   - Handle agent events

3. **Cleanup/Disposal**
   - Despawn agents to pool
   - Dispose non-pooled agents
   - Clean up all three layers
   - Release pool resources

## Semantics (Normative Guarantees)

### Three-Layer Composition

Every agent MUST be composed of three distinct layers:

| Layer | Responsibility | Contains |
|-------|---------------|----------|
| Model | Visual representation | Mesh, materials, animations, LOD |
| Behavior | Decision making | State machine, perception, group behavior |
| Agent | Instance management | Identity, data, lifecycle coordination |

**Layer Interaction Rules:**

- Agent layer MUST coordinate Model and Behavior layers
- Behavior layer MUST NOT directly modify Model layer
- Model layer MUST NOT access Behavior layer
- Agent layer MUST expose data to both Model and Behavior

**Initialization Order:**

1. Agent layer created with identity and initial data
2. Model layer created and attached to Agent
3. Behavior layer created and attached to Agent
4. All three layers MUST be initialized before first update

### State Machine Integration

- Each agent type MUST define a state machine for behavior
- State machines MUST follow the State Machine pattern
  → #[[file:docs/Code_Tech_Docs/patterns/state-machine.md]]
- State transitions MUST be validated before execution
- Invalid transitions MUST be logged and rejected

### Agent Pooling

- Agent pools MUST be created per agent type
- Spawning MUST acquire from pool when available
- Despawning MUST return to pool, not destroy
- Pool exhaustion MUST create new agents (grow pool)
- Pooled agents MUST be reset to initial state on acquire

**Pool Configuration per Agent Type:**

| Agent Type | Initial Size | Max Size | Reset Behavior |
|------------|-------------|----------|----------------|
| Villager | 20 | 100 | Reset state, position, health |
| Zombie | 30 | 150 | Reset state, position, target |
| Fish | 50 | 200 | Reset state, position, school |
| Bird | 40 | 150 | Reset state, position, flock |
| Dog | 10 | 50 | Reset state, position, territory |
| Boat | 5 | 20 | Reset state, position, route |

### Behavior Throttling

Agents beyond certain distances from the camera MUST have reduced update frequency:

| Distance Range | Update Frequency | Behavior Detail |
|---------------|------------------|-----------------|
| 0 - 30 units | Every frame | Full behavior |
| 30 - 60 units | Every 2 frames | Full behavior |
| 60 - 100 units | Every 4 frames | Simplified behavior |
| 100+ units | Every 8 frames | Minimal behavior |

**Throttling Rules:**

- Throttling MUST NOT affect state machine invariants
- Throttled agents MUST still receive events
- Throttled agents MUST maintain valid states
- Position interpolation MAY be reduced for distant agents
- Throttling distance MUST be configurable per agent type

### Group Behavior

Agents supporting group behavior MUST implement three forces:

| Force | Direction | Purpose |
|-------|-----------|---------|
| Cohesion | Toward group center | Keep group together |
| Separation | Away from neighbors | Prevent crowding |
| Alignment | Match group heading | Coordinate movement |

**Group Behavior Rules:**

- Forces MUST be calculated from neighbors within perception radius
- Forces MUST be weighted by configurable coefficients
- Combined force MUST be added to individual steering
- Group membership MUST be queryable

**Default Force Weights:**

| Agent Type | Cohesion | Separation | Alignment |
|------------|----------|------------|-----------|
| Fish | 1.0 | 1.5 | 1.0 |
| Bird | 0.8 | 1.2 | 1.5 |
| Zombie | 0.5 | 0.8 | 0.3 |

## Configuration Parameters

```
agentConfig:
  pooling:
    enabled: true
    pools:
      villager: { initial: 20, max: 100 }
      zombie: { initial: 30, max: 150 }
      fish: { initial: 50, max: 200 }
      bird: { initial: 40, max: 150 }
      dog: { initial: 10, max: 50 }
      boat: { initial: 5, max: 20 }
      
  throttling:
    enabled: true
    distances: [30, 60, 100]
    frequencies: [1, 2, 4, 8]  # frames between updates
    
  groupBehavior:
    perceptionRadius: 10
    maxNeighbors: 10
    weights:
      cohesion: 1.0
      separation: 1.5
      alignment: 1.0
```

## Correctness Properties

- **Property 9: Group Force Composition** - For any agent in a group, the steering force MUST include cohesion, separation, and alignment components.
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-9]]

- **Property 10: Agent Initialization Order** - For any agent, all three layers (Model, Behavior, Agent) MUST be initialized before the first update.
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-10]]

- **Property 11: Agent Error Recovery** - For any error during agent update, the agent MUST remain in a valid state.
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-11]]

## Observability

### Metrics to Track

- Active agent count by type
- Pool utilization by type
- Throttled agent count by distance band
- Group behavior calculations per frame
- State transitions per frame
- Average behavior update time

### Events to Log

- Agent spawn/despawn
- State transitions
- Pool exhaustion (warning)
- Behavior errors
- Group formation/dissolution

## Cross-References

- #[[file:docs/Code_Tech_Docs/patterns/state-machine.md]] - State machine pattern
- #[[file:docs/Code_Tech_Docs/patterns/object-pooling.md]] - Pooling pattern
- #[[file:docs/Code_Tech_Docs/patterns/group-behavior.md]] - Group behavior pattern
- #[[file:docs/Design_Docs/agent-behaviors/villager-mechanics.md]] - Villager behavior design
- #[[file:docs/Design_Docs/agent-behaviors/zombie-mechanics.md]] - Zombie behavior design
- #[[file:docs/Design_Docs/agent-behaviors/wildlife-mechanics.md]] - Wildlife behavior design
