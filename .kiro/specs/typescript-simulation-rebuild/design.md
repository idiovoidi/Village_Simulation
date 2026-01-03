# Design Document: Simulation Documentation (Part 1)

## Overview

This design outlines the documentation structure and content needed to enable rebuilding the 3D Village Simulation. Part 1 creates comprehensive documentation across three domains (Art, Design, Tech). Part 2 (a separate spec) will implement the engine using this documentation.

**C4 Stopping Point**: Part 1 documents architecture to the Component level. Code-level examples and implementation details are deferred to Part 2.

#[[file:docs/Design_Docs/simulation-overview.md]]
#[[file:docs/Code_Tech_Docs/architecture-overview.md]]

## Documentation Architecture

### Normative vs Informative Convention

Throughout this documentation:
- **Normative statements** use RFC 2119 keywords (MUST, SHALL, SHOULD, MAY, MUST NOT, SHALL NOT, SHOULD NOT) and appear only in "Semantics (Normative Guarantees)" sections. These are binding requirements for Part 2 implementation.
- **Informative statements** describe concepts, provide context, or suggest approaches. These guide understanding but are not binding.

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL are to be interpreted as described in RFC 2119 and BCP 14.

### Three-Domain Structure

| Domain | Purpose | Audience | Changes When |
|--------|---------|----------|--------------|
| Art Docs | Visual intent, assets, style guides | Artists, UI designers | Art direction changes |
| Design Docs | Gameplay goals, behaviors, rules | Designers, product owners | Game mechanics change |
| Tech Docs | Architecture, patterns, specifications | Developers | Architecture changes |

### Directory Structure

```
docs/
├── Art_Docs/
│   ├── visual-style-guide.md
│   ├── agent-visuals/
│   │   ├── villager-models.md
│   │   ├── zombie-sprites.md
│   │   └── wildlife-models.md
│   ├── environment-art/
│   │   ├── terrain-textures.md
│   │   ├── water-effects.md
│   │   └── lighting-moods.md
│   └── ui-assets.md
├── Design_Docs/
│   ├── simulation-overview.md
│   ├── agent-behaviors/
│   │   ├── villager-mechanics.md
│   │   ├── zombie-mechanics.md
│   │   └── wildlife-mechanics.md
│   ├── environment-systems/
│   │   ├── day-night-cycle.md
│   │   ├── procedural-generation.md
│   │   └── water-system.md
│   └── level-design/
│       ├── level-types.md
│       └── level-configurations.md
└── Code_Tech_Docs/
    ├── architecture-overview.md
    ├── glossary.md
    ├── traceability-matrix.md
    ├── adrs/
    │   ├── 001-ecs-pattern.md
    │   ├── 002-event-bus-semantics.md
    │   ├── 003-modular-monolith.md
    │   └── 004-state-machine-approach.md
    ├── core-systems/
    │   ├── ecs-pattern.md
    │   ├── event-system.md
    │   ├── game-loop.md
    │   └── dependency-injection.md
    ├── subsystems/
    │   ├── render-system.md
    │   ├── physics-system.md
    │   ├── agent-system.md
    │   ├── environment-system.md
    │   ├── level-system.md
    │   └── performance-system.md
    ├── patterns/
    │   ├── state-machine.md
    │   ├── object-pooling.md
    │   ├── spatial-partitioning.md
    │   └── error-handling.md
    ├── correctness-properties.md
    └── testing-strategy.md
```

### Documentation Page Template

Each technical documentation page follows this structure:

```markdown
# [System/Pattern Name]

## Purpose
What this system/pattern does and why it exists.

## Boundaries
What is in scope and out of scope for this system.

## Responsibilities
- Responsibility 1
- Responsibility 2

## Lifecycle
1. Initialization
2. Active operation
3. Cleanup/disposal

## Semantics (Normative Guarantees)
Precise behavioral guarantees that implementations MUST follow:
- Guarantee 1
- Guarantee 2

## Correctness Properties
Links to properties this system must satisfy:
- Property N: [description] → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-n]]

## Observability
What to log and measure:
- Metrics to track
- Events to log

## Cross-References
- #[[file:related-doc.md]]
```

## C4 Architecture Diagrams

### Context Diagram (Level 1)

Shows the simulation system and its external interactions:

```
┌─────────────────────────────────────────────────────────────┐
│                         User                                 │
│                    (Observer/Player)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │ Views simulation
                      │ Selects levels
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              3D Village Simulation                           │
│                                                              │
│  Renders 3D village with AI agents, environmental systems,  │
│  and physics interactions for observation-focused gameplay   │
└─────────────────────┬───────────────────────────────────────┘
                      │ Uses
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Dependencies                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Babylon.js  │  │   Havok     │  │   Browser   │         │
│  │ (Rendering) │  │  (Physics)  │  │    APIs     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Container Diagram (Level 2)

Shows major containers within the simulation:

```
┌─────────────────────────────────────────────────────────────────┐
│                    3D Village Simulation                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     Core Engine                            │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │  │
│  │  │   ECS   │ │  Event  │ │  Game   │ │   Dependency    │  │  │
│  │  │  World  │ │   Bus   │ │  Loop   │ │   Container     │  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │   Render    │ │   Physics   │ │    Agent    │                │
│  │   System    │ │   System    │ │   System    │                │
│  └──────┬──────┘ └──────┬──────┘ └─────────────┘                │
│         │               │                                        │
│         ▼               ▼                                        │
│  ┌─────────────┐ ┌─────────────┐                                │
│  │ Babylon.js  │ │   Havok     │                                │
│  │  Adapter    │ │  Adapter    │                                │
│  └─────────────┘ └─────────────┘                                │
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ Environment │ │    Level    │ │ Performance │                │
│  │   System    │ │   System    │ │   System    │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                  │
│  ┌─────────────┐                                                │
│  │     UI      │                                                │
│  │   System    │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

**Container Responsibilities:**

| Container | Responsibility |
|-----------|---------------|
| Core Engine | Coordinates all systems, manages entity lifecycle |
| Render System | Visual output via Babylon.js adapter |
| Physics System | Physical simulation via Havok adapter |
| Agent System | AI behaviors for all agent types |
| Environment System | Day/night, water, clouds, terrain |
| Level System | Level loading, configuration, transitions |
| Performance System | Optimization, monitoring, quality scaling |
| UI System | User interface elements |

**Adapter Boundary (Normative)**:
Core Engine MUST NOT depend directly on Babylon.js or Havok APIs. Core Engine MUST depend only on adapter-facing abstractions. This enables testing core logic without GPU/physics runtime and allows future backend substitution.

## Core System Abstractions

### Entity-Component-System (ECS)

**Purpose**: Compose game objects from reusable data and behavior.

**Boundaries**: Manages entities and components. Does not handle rendering, physics, or AI directly—those are separate systems that query the ECS.

**Responsibilities**:
- Create and destroy entities
- Attach and detach components
- Query entities by component composition
- Notify systems of entity/component changes

**Lifecycle**:
1. World created
2. Systems registered
3. Entities created with components
4. Per-frame: systems query and process entities
5. Entities destroyed, components detached
6. World disposed

**Semantics (Normative Guarantees)**:
- Entities MUST be unique identifiers with no inherent data
- Components MUST be pure data attached to exactly one entity
- Systems MUST process entities matching their component requirements
- Structural changes (entity creation/destruction, component add/remove) MUST be applied at defined sync points (start of frame or end of system update), not mid-iteration
- Queries within a single frame after sync point MUST return consistent results

**Correctness Properties**: 1, 2, 3

#[[file:docs/Code_Tech_Docs/core-systems/ecs-pattern.md]]

### Event Bus

**Purpose**: Decouple communication between systems.

**Boundaries**: Handles event emission and subscription. Does not process events or manage event persistence.

**Responsibilities**:
- Register event handlers
- Emit events to handlers
- Manage handler lifecycle (subscribe/unsubscribe)

**Lifecycle**:
1. Event bus created
2. Systems subscribe to events
3. Events emitted during simulation
4. Systems unsubscribe on disposal
5. Event bus disposed

**Semantics (Normative Guarantees)**:
- Handlers MUST execute synchronously in registration order
- Each handler MUST receive event data exactly once per emission
- Handler errors MUST be caught and logged; remaining handlers MUST still execute
- Unsubscribed handlers MUST NOT receive subsequent events
- Re-entrancy: Handlers MAY emit events during handling; nested events MUST be processed immediately (depth-first), completing before the outer handler continues
- Re-entrancy depth MUST be bounded; implementations SHOULD limit to 10 levels and MUST throw an error if exceeded
- Event data MUST NOT be mutated by handlers; mutating event data MAY cause later handlers to observe modified state and is considered an implementation error

**Correctness Properties**: 4, 5

#[[file:docs/Code_Tech_Docs/core-systems/event-system.md]]

### Game Loop

**Purpose**: Coordinate simulation updates and rendering.

**Boundaries**: Manages timing and update scheduling. Does not implement system logic.

**Responsibilities**:
- Track elapsed time
- Trigger physics updates at fixed intervals
- Trigger render updates each frame
- Provide interpolation factor for smooth rendering

**Lifecycle**:
1. Loop initialized with timestep configuration
2. Loop started
3. Per-frame: accumulate time, run fixed updates, render
4. Loop stopped
5. Loop disposed

**Semantics (Normative Guarantees)**:
- Physics updates MUST occur at fixed timestep regardless of frame rate
- Multiple physics updates MAY occur per frame if needed to catch up
- Accumulated time MUST be clamped to a maximum (e.g., 250ms) to prevent "spiral of death" when frames take too long
- Maximum substeps per frame SHOULD be limited (e.g., 5) to bound worst-case frame time
- Render updates MUST occur once per frame
- Interpolation factor MUST be provided for visual smoothing

**Correctness Properties**: 6

#[[file:docs/Code_Tech_Docs/core-systems/game-loop.md]]

### State Machine

**Purpose**: Model agent behaviors as discrete states with transitions.

**Boundaries**: Manages state and transitions. Does not implement state-specific behavior.

**Responsibilities**:
- Track current state
- Validate transition requests
- Execute entry/exit actions
- Provide state query interface

**Lifecycle**:
1. State machine created with initial state
2. States and transitions defined
3. Per-update: evaluate transitions, execute current state
4. State machine disposed

**Semantics (Normative Guarantees)**:
- Current state MUST always be defined and valid
- Transitions MUST only occur between states with defined transition rules
- Entry action MUST execute after transition, before first update in new state
- Exit action MUST execute before transition, after last update in old state

**Correctness Properties**: 7, 8

#[[file:docs/Code_Tech_Docs/patterns/state-machine.md]]

## Agent System Abstractions

### Three-Layer Composition

Agents are composed of three layers with distinct responsibilities:

| Layer | Responsibility | Contains |
|-------|---------------|----------|
| Model | Visual representation | Mesh, materials, animations |
| Behavior | Decision making | State machine, perception, group behavior |
| Agent | Instance management | Identity, data, lifecycle coordination |

**Semantics (Normative Guarantees)**:
- All three layers MUST be initialized before first agent update
- Model position MUST be synchronized with agent position each frame
- Behavior MUST update before model updates
- Agent disposal MUST clean up all three layers

**Correctness Properties**: 10, 11

#[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]

### Agent Types Summary

| Agent | Domain | Group Behavior | States |
|-------|--------|----------------|--------|
| Villager | Ground | Social network | Idle, Working, Socializing, Sleeping, Fleeing, Sheltering |
| Zombie | Ground | Horde cohesion | Wandering, Suspicious, Pursuing, Lurging |
| Fish | Water volume | Shoaling | Swimming, Feeding, Fleeing |
| Bird | Air volume | Flocking | Flying, Circling, Perching, Migrating |
| Dog | Ground | Pack | Patrolling, Alert, Chasing |
| Boat | Water surface | None | Docked, Sailing, Arriving |

Each agent type requires a complete state diagram in Design Docs.

#[[file:docs/Design_Docs/agent-behaviors/villager-mechanics.md]]
#[[file:docs/Design_Docs/agent-behaviors/zombie-mechanics.md]]
#[[file:docs/Design_Docs/agent-behaviors/wildlife-mechanics.md]]

### Group Behavior Forces

Three forces combine for flocking/shoaling/herding:

| Force | Direction | Purpose |
|-------|-----------|---------|
| Cohesion | Toward group center | Keep group together |
| Separation | Away from neighbors | Prevent crowding |
| Alignment | Match group heading | Coordinate movement |

**Semantics (Normative Guarantees)**:
- Forces MUST be calculated from neighbors within perception radius
- Forces MUST be weighted by configurable coefficients
- Combined force MUST be added to individual steering

**Correctness Properties**: 9

#[[file:docs/Code_Tech_Docs/patterns/group-behavior.md]]

## Environment System Abstractions

### Day/Night Cycle

**Effects on simulation**:
- Sun position and lighting color/intensity
- Ambient light levels
- Villager schedule (sleep at night)
- Zombie activity (more active at night)

**Semantics (Normative Guarantees)**:
- Time MUST progress at configurable rate (game hours per real second)
- Lighting values MUST interpolate smoothly between time-of-day keyframes
- Agent behaviors MUST be able to query current time to determine schedule

**Correctness Properties**: 15

#[[file:docs/Design_Docs/environment-systems/day-night-cycle.md]]

### Procedural Generation

**Village generation rules**:
- Buildings placed on valid terrain (flat, not water)
- No overlapping structures
- Roads connect buildings
- Seed-based for reproducibility

**Semantics (Normative Guarantees)**:
- Same seed MUST produce identical layout
- Generated layout MUST pass validation (no overlaps, all connected)

**Correctness Properties**: 16

#[[file:docs/Design_Docs/environment-systems/procedural-generation.md]]

### Level System

**Level lifecycle**:
1. Load: Parse config, initialize systems, spawn agents
2. Run: Normal simulation
3. Unload: Despawn agents, dispose systems, cleanup
4. Transition: Unload current → Load next

**Semantics (Normative Guarantees)**:
- Only configured systems MUST be active after load
- Previous level MUST be fully disposed before new level initializes
- Agent populations MUST match configuration

**Correctness Properties**: 12, 13, 14

#[[file:docs/Code_Tech_Docs/subsystems/level-system.md]]

## Performance Abstractions

### Spatial Partitioning

**Purpose**: Efficient queries for nearby entities.

**Semantics (Normative Guarantees)**:
- Query results MUST be correct (no false negatives within query bounds)

**Observability Notes**:
- Query performance SHOULD be better than linear scan; implementations SHOULD target O(log n) or O(1) average case

### Behavior Throttling

**Purpose**: Reduce CPU for distant agents.

**Semantics (Normative Guarantees)**:
- Agents beyond threshold distance MUST update less frequently
- Throttling MUST NOT affect state machine invariants (valid states, valid transitions)
- Throttling MUST NOT prevent event delivery to throttled agents
- Throttling MAY reduce position integration smoothness for distant agents

### Quality Scaling

**Purpose**: Maintain frame rate on varying hardware.

**Semantics (Normative Guarantees)**:
- Quality MUST reduce when frame rate below threshold for configured duration
- Quality MUST increase when frame rate above threshold for configured duration
- Hysteresis MUST prevent oscillation

**Correctness Properties**: 18, 19

#[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]

## Error Handling Abstractions

### Error Categories and Severity

| Category | Examples | Typical Severity |
|----------|----------|------------------|
| Physics | Body creation failure, collision error | Error/Critical |
| Render | Context lost, shader compile failure | Critical |
| Agent | State machine error, pathfinding failure | Error |
| Level | Load failure, config parse error | Critical |
| System | Initialization failure, update error | Error/Critical |

### Severity Handling

| Severity | Action |
|----------|--------|
| Critical | Log, halt or return to safe state |
| Error | Log, attempt recovery |
| Warning | Log, continue |
| Info | Log only |

#[[file:docs/Code_Tech_Docs/patterns/error-handling.md]]

## Architecture Decision Records

### ADR Template

Each ADR follows this structure:

```markdown
# ADR-NNN: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
What situation prompted this decision?

## Options Considered
1. Option A - description
2. Option B - description
3. Option C - description

## Decision
Which option was chosen?

## Rationale
Why was this option chosen over alternatives?

## Consequences
What are the implications of this decision?
- Positive consequences
- Negative consequences
- Risks
```

### Required ADRs

| ADR | Topic | Key Decision |
|-----|-------|--------------|
| 001 | ECS Pattern | Why ECS over inheritance hierarchy |
| 002 | Event Bus Semantics | Sync vs async, error isolation |
| 003 | Modular Monolith | Why not microservices or pure monolith |
| 004 | State Machine Approach | Why FSM over behavior trees |

#[[file:docs/Code_Tech_Docs/adrs/]]

## Correctness Properties

Properties categorized by system. Each property is a normative guarantee that Part 2 implementation MUST satisfy.

### ECS Properties
1. **Entity-Component Query Inclusion**: For any entity with components C₁...Cₙ, querying for entities with components C₁...Cₙ MUST return that entity.
2. **Destroyed Entity Exclusion**: For any destroyed entity, subsequent queries MUST NOT return that entity.
3. **Component Change Visibility**: For any component added or removed, subsequent queries MUST reflect that change.

### Event Properties
4. **Handler Delivery**: For any event emitted, all registered handlers for that event type MUST receive the event data exactly once.
5. **Handler Error Isolation**: For any handler that throws an error, remaining handlers MUST still execute.

### Game Loop Properties
6. **Fixed Timestep Consistency**: For any sequence of frames, physics updates MUST occur at the configured fixed timestep regardless of frame rate.

### State Machine Properties
7. **Transition Validity**: For any state machine, transitions MUST only occur between states with defined transition rules.
8. **State Validity**: For any state machine, the current state MUST always be a valid, defined state.

### Agent Properties
9. **Group Force Composition**: For any agent in a group, the steering force MUST include cohesion, separation, and alignment components.
10. **Agent Initialization Order**: For any agent, all three layers (Model, Behavior, Agent) MUST be initialized before the first update.
11. **Agent Error Recovery**: For any error during agent update, the agent MUST remain in a valid state.

### Level Properties
12. **System Activation**: For any level load, only systems specified in the configuration MUST be active.
13. **Resource Cleanup**: For any level transition, previous level resources MUST be disposed before new level initializes.
14. **Population Matching**: For any loaded level, agent populations MUST match the level configuration.

### Environment Properties
15. **Lighting Consistency**: For any game time value, lighting MUST match the expected values for that time of day.
16. **Procedural Determinism**: For any seed value, procedural generation MUST produce identical results.
17. **Terrain Query Validity**: For any position within terrain bounds, height queries MUST return a valid value.

### Performance Properties
18. **Frustum Culling**: For any object outside the view frustum, that object MUST NOT be submitted for rendering.
19. **Quality Adjustment**: For any frame rate below threshold for the configured duration, quality MUST be reduced.

#[[file:docs/Code_Tech_Docs/correctness-properties.md]]

## Testing Strategy Documentation

### Test Categories

| Category | Purpose | Scope |
|----------|---------|-------|
| Unit | Individual functions/classes | Isolated |
| Integration | System interactions | Multiple systems |
| Property | Invariants across inputs | Randomized |
| Smoke | Boot verification | Full application |

### Quality Gates

| Gate | Tool | Threshold |
|------|------|-----------|
| Circular dependencies | Madge | Zero allowed |
| Code coverage | Vitest/v8 | 70% minimum |
| Orphan modules | Madge | Reported (warning only) |

**Orphan Module Exceptions**: The following are expected orphans and SHOULD NOT be flagged as issues:
- Application entrypoints (index.ts, main.ts)
- Test files and test utilities
- Type declaration files (.d.ts)
- Configuration files

### Smoke Test Requirements

**Node smoke**: Import modules, construct container, run 10 ticks with mocks

**Browser smoke**: Create canvas, init engine, verify no errors

**Level smoke**: Load each level type, run 10 ticks

#[[file:docs/Code_Tech_Docs/testing-strategy.md]]

## Documentation Deliverables

### Art Docs
- [ ] Visual style guide
- [ ] Villager model specifications
- [ ] Zombie visual specifications
- [ ] Wildlife model specifications (fish, bird, dog, boat)
- [ ] Terrain texture guide
- [ ] Water effect specifications
- [ ] Lighting mood guide
- [ ] UI asset specifications

### Design Docs
- [ ] Simulation overview
- [ ] Villager state diagram and behavior rules
- [ ] Zombie state diagram and behavior rules
- [ ] Fish behavior rules
- [ ] Bird behavior rules
- [ ] Dog behavior rules
- [ ] Boat behavior rules
- [ ] Day/night cycle rules
- [ ] Procedural generation rules
- [ ] Level type definitions (Village, Rural, Coastal, Wilderness)
- [ ] Level configuration examples

### Tech Docs
- [ ] Architecture overview
- [ ] Glossary
- [ ] Traceability matrix
- [ ] ADR-001: ECS Pattern
- [ ] ADR-002: Event Bus Semantics
- [ ] ADR-003: Modular Monolith
- [ ] ADR-004: State Machine Approach
- [ ] ECS pattern documentation
- [ ] Event system documentation
- [ ] Game loop documentation
- [ ] Dependency injection documentation
- [ ] Render system documentation
- [ ] Physics system documentation
- [ ] Agent system documentation
- [ ] Environment system documentation
- [ ] Level system documentation
- [ ] Performance system documentation
- [ ] State machine pattern
- [ ] Object pooling pattern
- [ ] Spatial partitioning pattern
- [ ] Error handling pattern
- [ ] Correctness properties
- [ ] Testing strategy
