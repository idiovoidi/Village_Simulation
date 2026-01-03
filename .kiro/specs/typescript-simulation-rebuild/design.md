# Design Document: Simulation Documentation (Part 1)

## Overview

This design outlines the documentation structure and content needed to enable rebuilding the 3D Village Simulation. Part 1 creates comprehensive documentation across three domains (Art, Design, Tech). Part 2 (a separate spec) will implement the engine using this documentation.

**C4 Stopping Point**: Part 1 documents architecture to the Component level. Code-level examples and implementation details are deferred to Part 2.

#[[file:docs/Design_Docs/simulation-overview.md]]
#[[file:docs/Code_Tech_Docs/architecture-overview.md]]

## Documentation Architecture

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
- Entities are unique identifiers with no inherent data
- Components are pure data attached to exactly one entity
- Systems process entities matching their component requirements
- Queries return consistent results within a single frame
- Component changes take effect before next query

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
- Handlers execute synchronously in registration order
- Each handler receives event data exactly once per emission
- Handler errors are caught and logged; remaining handlers still execute
- Unsubscribed handlers do not receive subsequent events

**Correctness Properties**: 4

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
- Physics updates occur at fixed timestep regardless of frame rate
- Multiple physics updates may occur per frame if needed to catch up
- Render updates occur once per frame
- Interpolation factor provided for visual smoothing

**Correctness Properties**: 5

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
- Current state is always defined and valid
- Transitions only occur between states with defined transition rules
- Entry action executes after transition, before first update in new state
- Exit action executes before transition, after last update in old state

**Correctness Properties**: 13

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
- All three layers initialized before first agent update
- Model position synchronized with agent position each frame
- Behavior updates before model updates
- Agent disposal cleans up all three layers

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
- Forces calculated from neighbors within perception radius
- Forces weighted by configurable coefficients
- Combined force added to individual steering

#[[file:docs/Code_Tech_Docs/patterns/group-behavior.md]]

## Environment System Abstractions

### Day/Night Cycle

**Effects on simulation**:
- Sun position and lighting color/intensity
- Ambient light levels
- Villager schedule (sleep at night)
- Zombie activity (more active at night)

**Semantics (Normative Guarantees)**:
- Time progresses at configurable rate (game hours per real second)
- Lighting values interpolate smoothly between time-of-day keyframes
- Agent behaviors query current time to determine schedule

#[[file:docs/Design_Docs/environment-systems/day-night-cycle.md]]

### Procedural Generation

**Village generation rules**:
- Buildings placed on valid terrain (flat, not water)
- No overlapping structures
- Roads connect buildings
- Seed-based for reproducibility

**Semantics (Normative Guarantees)**:
- Same seed produces identical layout
- Generated layout passes validation (no overlaps, all connected)

#[[file:docs/Design_Docs/environment-systems/procedural-generation.md]]

### Level System

**Level lifecycle**:
1. Load: Parse config, initialize systems, spawn agents
2. Run: Normal simulation
3. Unload: Despawn agents, dispose systems, cleanup
4. Transition: Unload current → Load next

**Semantics (Normative Guarantees)**:
- Only configured systems active after load
- Previous level fully disposed before new level initializes
- Agent populations match configuration

#[[file:docs/Code_Tech_Docs/subsystems/level-system.md]]

## Performance Abstractions

### Spatial Partitioning

**Purpose**: Efficient queries for nearby entities.

**Semantics (Normative Guarantees)**:
- Query results are correct (no false negatives)
- Query performance better than linear scan

### Behavior Throttling

**Purpose**: Reduce CPU for distant agents.

**Semantics (Normative Guarantees)**:
- Agents beyond threshold distance update less frequently
- Throttling does not affect correctness, only precision

### Quality Scaling

**Purpose**: Maintain frame rate on varying hardware.

**Semantics (Normative Guarantees)**:
- Quality reduces when frame rate below threshold for configured duration
- Quality increases when frame rate above threshold for configured duration
- Hysteresis prevents oscillation

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

Properties categorized by system:

### ECS Properties
1. Entities with components returned by matching queries
2. Destroyed entities not returned by queries
3. Component changes reflected in subsequent queries

### Event Properties
4. All handlers receive emitted events exactly once

### Game Loop Properties
5. Physics updates at fixed timestep regardless of frame rate

### Agent Properties
6. State transitions only between defined transitions
7. Agents always have valid current state
8. Group forces include cohesion, separation, alignment
9. All agent layers initialized before first update

### Level Properties
10. Only configured systems active after load
11. Previous level disposed before new level initializes
12. Agent populations match configuration

### Environment Properties
13. Lighting matches expected values for game time
14. Same seed produces identical procedural generation
15. Terrain height queries return valid values in bounds

### Performance Properties
16. Objects outside frustum not rendered
17. Quality adjusts when frame rate crosses thresholds

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
| Orphan modules | Madge | Reported (warning) |

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
