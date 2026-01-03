# Design Document: TypeScript Simulation Documentation

## Overview

This design outlines the documentation structure and core abstractions needed to rebuild the 3D Village Simulation. The goal is to create comprehensive documentation across three domains (Art, Design, Tech) that captures the logic, patterns, and relationships of the existing system—enabling a future implementation spec to rebuild it from scratch.

#[[file:docs/Design_Docs/simulation-overview.md]]
#[[file:docs/Code_Tech_Docs/architecture-overview.md]]

## Documentation Architecture

### Three-Domain Structure

Documentation is separated by concern to allow independent evolution:

| Domain | Purpose | Audience | Changes When |
|--------|---------|----------|--------------|
| Art Docs | Visual intent, assets, style guides | Artists, UI designers | Art direction changes |
| Design Docs | Gameplay goals, behaviors, rules | Designers, product owners | Game mechanics change |
| Tech Docs | Architecture, patterns, APIs | Developers | Implementation changes |

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
│   │   ├── weather-system.md
│   │   └── procedural-generation.md
│   ├── level-design/
│   │   ├── level-types.md
│   │   └── level-configurations.md
│   └── game-rules.md
└── Code_Tech_Docs/
    ├── architecture-overview.md
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
    └── testing-strategy.md
```

### Livelink Cross-References

Documents reference related content across domains using livelinks:

- `#[[file:docs/Art_Docs/zombie-sprites.md]]` - Visual assets
- `#[[file:docs/Design_Docs/zombie-mechanics.md]]` - Behavior rules
- `#[[file:docs/Code_Tech_Docs/agent-system.md]]` - Implementation patterns

## Core Abstractions

### Entity-Component-System (ECS)

The simulation uses ECS to compose game objects from reusable parts:

**Entity**: A unique identifier with no data or behavior of its own.

**Component**: Pure data attached to entities (position, health, velocity, etc.).

**System**: Logic that operates on entities with specific component combinations.

**World**: Container managing entities, components, and systems.

Key relationships:
- Entities have zero or more components
- Systems query the world for entities matching component requirements
- Systems process matching entities each frame
- Components are added/removed dynamically

#[[file:docs/Code_Tech_Docs/ecs-pattern.md]]

### Event Bus

Decoupled communication between systems:

- Systems emit events without knowing subscribers
- Systems subscribe to events without knowing emitters
- Events are typed with associated data payloads
- Handlers execute synchronously in registration order
- Handler errors are isolated (don't break other handlers)

Event categories:
- Physics events (collision start/end, trigger enter/exit)
- Agent events (state change, spawn, despawn)
- Level events (load, unload, transition)
- Time events (hour change, day change)
- Performance events (threshold warnings)

#[[file:docs/Code_Tech_Docs/event-system.md]]

### Game Loop

Fixed timestep for physics, variable for rendering:

- Physics updates at consistent intervals (e.g., 60Hz)
- Accumulated time handles frame rate variations
- Render updates as fast as possible
- Interpolation smooths visual updates between physics steps

#[[file:docs/Code_Tech_Docs/game-loop.md]]

### State Machine

Agent behaviors modeled as finite state machines:

- States define behavior during that state
- Transitions define conditions to change states
- Entry/exit actions handle state setup/cleanup
- Only valid transitions are allowed
- Current state is always defined

#[[file:docs/Code_Tech_Docs/state-machine.md]]

## Agent System Abstractions

### Three-Layer Composition

Agents are composed of three layers:

**Model Layer**: Visual representation
- 3D mesh and materials
- Animations and animation blending
- Position/rotation synchronization with logic

**Behavior Layer**: Decision making
- State machine for behavior states
- Perception (what the agent knows about the world)
- Group behaviors (flocking, herding)

**Agent Layer**: Instance management
- Unique identity and data
- Lifecycle (spawn, update, despawn)
- Component coordination

#[[file:docs/Code_Tech_Docs/agent-system.md]]

### Agent Types

| Agent | Movement Domain | Group Behavior | Key States |
|-------|-----------------|----------------|------------|
| Villager | Ground (navmesh) | Social network | Idle, Working, Socializing, Sleeping, Fleeing, Sheltering |
| Zombie | Ground (navmesh) | Horde cohesion | Wandering, Suspicious, Pursuing, Lurging |
| Fish | Water (3D volume) | Shoaling | Swimming, Feeding, Fleeing |
| Bird | Air (3D volume) | Flocking | Flying, Circling, Perching, Migrating |
| Dog | Ground (navmesh) | Pack behavior | Patrolling, Alert, Chasing |
| Boat | Water (surface) | None | Docked, Sailing, Arriving |

#[[file:docs/Design_Docs/agent-behaviors/villager-mechanics.md]]
#[[file:docs/Design_Docs/agent-behaviors/zombie-mechanics.md]]
#[[file:docs/Design_Docs/agent-behaviors/wildlife-mechanics.md]]

### Group Behaviors

Flocking/shoaling/herding use three forces:

**Cohesion**: Steer toward average position of neighbors
**Separation**: Steer away from nearby neighbors to avoid crowding
**Alignment**: Steer toward average heading of neighbors

Forces are weighted and combined with individual goals.

#[[file:docs/Code_Tech_Docs/patterns/flocking-behavior.md]]

## Environment System Abstractions

### Day/Night Cycle

Time progression affects:
- Sun position and lighting color/intensity
- Ambient light levels
- Agent behavior schedules (villagers sleep at night)
- Zombie activity levels (more active at night)

Time is measured in game hours, with configurable real-time to game-time ratio.

#[[file:docs/Design_Docs/environment-systems/day-night-cycle.md]]

### Procedural Generation

Village generation follows rules:
- Place buildings on valid terrain (flat, not water)
- Connect buildings with roads
- Ensure no overlapping structures
- Seed-based for reproducibility

Road network generation:
- Connect key locations (buildings, village center)
- Follow terrain contours
- Integrate with navigation mesh

#[[file:docs/Design_Docs/environment-systems/procedural-generation.md]]

### Water Simulation

Water affects gameplay:
- Fish and boats navigate within/on water
- Ground agents avoid water (except at bridges)
- Buoyancy applies to physics bodies in water
- Visual waves and reflections

#[[file:docs/Code_Tech_Docs/subsystems/water-system.md]]

## Level System Abstractions

### Level Configuration

Levels are defined declaratively:
- Which systems are active
- Agent populations and spawn areas
- Environmental settings (time, weather)
- Terrain parameters

Level types: Village, Rural, Coastal, Wilderness

#[[file:docs/Design_Docs/level-design/level-types.md]]

### Level Lifecycle

1. **Load**: Parse config, initialize required systems, spawn agents
2. **Run**: Normal simulation loop
3. **Unload**: Despawn agents, dispose systems, cleanup resources
4. **Transition**: Unload current, load next

Resources from previous level must be fully disposed before new level initializes.

#[[file:docs/Code_Tech_Docs/subsystems/level-system.md]]

## Performance Abstractions

### Spatial Partitioning

Efficient queries for nearby entities:
- Divide world into cells/regions
- Entities register in cells based on position
- Queries check only relevant cells
- Update registrations when entities move

#[[file:docs/Code_Tech_Docs/patterns/spatial-partitioning.md]]

### Level of Detail (LOD)

Reduce detail for distant objects:
- Multiple mesh versions at different detail levels
- Switch based on camera distance
- Thresholds configurable per object type

### Behavior Throttling

Reduce update frequency for distant agents:
- Full updates for nearby agents
- Reduced frequency for distant agents
- Skip updates for very distant agents
- Distance thresholds configurable

### Quality Scaling

Dynamic quality adjustment based on performance:
- Monitor frame rate
- Reduce quality when below threshold
- Increase quality when above threshold
- Hysteresis prevents oscillation

#[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]

## Error Handling Abstractions

### Error Categories

Errors classified by source:
- Physics errors
- Render errors
- Agent errors
- Level errors
- System errors

### Error Severity

- **Critical**: Cannot continue, must halt or return to safe state
- **Error**: Significant problem, log and attempt recovery
- **Warning**: Potential issue, log and continue
- **Info**: Informational, log only

### Recovery Strategies

- Agent errors: Reset agent to default state
- Level load errors: Return to level selection
- Render context lost: Attempt restoration, fail if unsuccessful
- Memory threshold: Trigger cleanup routines

#[[file:docs/Code_Tech_Docs/patterns/error-handling.md]]

## Correctness Properties

Properties that must hold true for correct system behavior:

### ECS Properties
1. Entities with components are returned by queries for those components
2. Destroyed entities are not returned by any query
3. Component changes are reflected in subsequent queries

### Event Properties
4. All registered handlers receive emitted events exactly once
5. Handler errors don't prevent other handlers from executing

### Agent Properties
6. State transitions only occur between states with defined transitions
7. Agents always have a valid current state
8. Group behavior forces include cohesion, separation, and alignment

### Level Properties
9. Only configured systems are active after level load
10. Previous level resources are disposed before new level initializes
11. Agent populations match level configuration

### Environment Properties
12. Lighting matches expected values for current game time
13. Procedural generation with same seed produces identical results
14. Terrain height queries return valid values within bounds

### Performance Properties
15. Objects outside view frustum are not rendered
16. Quality adjusts when frame rate crosses thresholds

## Testing Strategy

### Test Categories

**Unit Tests**: Individual functions and classes in isolation

**Integration Tests**: System interactions and data flow

**Property Tests**: Invariants that hold across many inputs (using fast-check)

**Smoke Tests**: Application boots and runs without errors

### Smoke Test Requirements

Node smoke test:
- Import core modules
- Construct dependency container
- Register systems with mocks
- Run 10 update ticks
- Complete without errors

Browser smoke test:
- Create canvas element
- Initialize engine
- Create scene
- Verify no console errors

Level smoke tests (one per level type):
- Load minimal level config
- Run 10 update ticks
- Verify level loaded correctly

### Code Quality Gates

**Circular Dependencies**: Build fails if Madge detects cycles in src/

**Orphan Modules**: Report files not imported by any other file

**Coverage Thresholds**: 70% minimum for statements, branches, functions, lines

#[[file:docs/Code_Tech_Docs/testing-strategy.md]]

## Documentation Deliverables

### Art Docs Deliverables
- [ ] Visual style guide
- [ ] Villager model specifications
- [ ] Zombie visual specifications
- [ ] Wildlife model specifications
- [ ] Terrain texture guide
- [ ] Water effect specifications
- [ ] Lighting mood guide
- [ ] UI asset specifications

### Design Docs Deliverables
- [ ] Simulation overview
- [ ] Villager behavior rules
- [ ] Zombie behavior rules
- [ ] Wildlife behavior rules
- [ ] Day/night cycle rules
- [ ] Procedural generation rules
- [ ] Level type definitions
- [ ] Level configuration schema

### Tech Docs Deliverables
- [ ] Architecture overview
- [ ] ECS pattern documentation
- [ ] Event system documentation
- [ ] Game loop documentation
- [ ] State machine documentation
- [ ] Render system documentation
- [ ] Physics system documentation
- [ ] Agent system documentation
- [ ] Environment system documentation
- [ ] Level system documentation
- [ ] Performance system documentation
- [ ] Object pooling pattern
- [ ] Spatial partitioning pattern
- [ ] Error handling pattern
- [ ] Testing strategy documentation
