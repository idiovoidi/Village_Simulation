# Architecture Overview

## Purpose

This document provides a high-level view of the 3D Village Simulation architecture, describing the system context, major containers, and the adapter boundary rule that governs external dependencies.

## Boundaries

This document covers:
- System context and external interactions
- Container-level architecture
- Adapter boundary rules for external dependencies
- High-level data flow

This document does NOT cover:
- Implementation details (deferred to Part 2)
- Individual system internals (see subsystem documentation)
- Code-level examples

## C4 Context Diagram (Level 1)

The Context diagram shows the simulation system and its external interactions:

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

### External Actors

| Actor | Description | Interaction |
|-------|-------------|-------------|
| User | Human observer/player | Views simulation, selects levels, observes agent behaviors |
| Babylon.js | 3D rendering engine | Provides WebGL/WebGPU rendering, scene management, materials |
| Havok Physics | Physics simulation engine | Provides rigid body dynamics, collision detection, triggers |
| Browser APIs | Web platform services | Provides canvas, input events, timing, storage |

## C4 Container Diagram (Level 2)

The Container diagram shows major containers within the simulation:

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

### Container Responsibilities

| Container | Responsibility | Key Interfaces |
|-----------|---------------|----------------|
| ECS World | Entity lifecycle, component storage, queries | createEntity, addComponent, query |
| Event Bus | Decoupled system communication | emit, subscribe, unsubscribe |
| Game Loop | Timing coordination, update scheduling | start, stop, tick |
| Dependency Container | Service registration and resolution | register, resolve |
| Render System | Visual output coordination | render, updateLOD |
| Physics System | Physical simulation coordination | step, createBody, raycast |
| Agent System | AI behavior coordination | spawn, despawn, update |
| Environment System | World state management | updateTime, queryTerrain |
| Level System | Scenario configuration | load, unload, transition |
| Performance System | Optimization and monitoring | monitor, scale, cull |
| UI System | User interface elements | show, hide, update |
| Babylon.js Adapter | Rendering backend abstraction | (internal) |
| Havok Adapter | Physics backend abstraction | (internal) |

## Adapter Boundary Rule

### Semantics (Normative Guarantees)

The adapter boundary rule is a fundamental architectural constraint:

- Core Engine MUST NOT depend directly on Babylon.js or Havok APIs
- Core Engine MUST depend only on adapter-facing abstractions
- Adapters MUST implement defined interfaces without leaking backend details
- Adapters MUST handle backend-specific error translation
- Adapters MUST manage backend lifecycle (initialization, disposal)

### Rationale

This boundary enables:
1. **Testability**: Core logic can be tested without GPU/physics runtime
2. **Substitutability**: Backends can be replaced without core changes
3. **Isolation**: Backend bugs/crashes are contained within adapters
4. **Portability**: Future migration to different engines is possible

### Adapter Interface Pattern

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Core System   │────▶│    Adapter      │────▶│    Backend      │
│                 │     │   Interface     │     │   (Babylon/     │
│  (Pure Logic)   │     │  (Abstraction)  │     │    Havok)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ Depends on            │ Implements            │ Uses
        ▼                       ▼                       ▼
   Abstractions only      Defined contracts      Concrete APIs
```

## Data Flow

### Per-Frame Data Flow

```
Input Events ──▶ Core Engine ──▶ Systems ──▶ Adapters ──▶ Backends
                     │              │
                     ▼              ▼
                Event Bus      ECS World
                     │              │
                     └──────┬───────┘
                            ▼
                    State Changes
```

### System Communication

Systems communicate through two mechanisms:

1. **Event Bus**: Decoupled, broadcast communication
   - Used for: state changes, notifications, cross-system coordination
   - Example: "agent_spawned", "level_loaded", "time_changed"

2. **ECS Queries**: Direct data access
   - Used for: reading component data, iterating entities
   - Example: query all entities with Position and Velocity components

## Cross-References

- #[[file:docs/Code_Tech_Docs/core-systems/ecs-pattern.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/event-system.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/game-loop.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/dependency-injection.md]]
- #[[file:docs/Code_Tech_Docs/adrs/003-modular-monolith.md]]

## Correctness Properties

This architecture supports the following correctness properties:

- Property 1-3: ECS query correctness → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-1]]
- Property 4-5: Event delivery guarantees → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-4]]
- Property 6: Game loop timing → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-6]]

## Observability

Architecture-level observability:

| Metric | Description | Purpose |
|--------|-------------|---------|
| System update times | Duration of each system's update | Performance profiling |
| Event throughput | Events emitted per frame | Communication overhead |
| Entity count | Total active entities | Memory/performance scaling |
| Adapter call counts | Calls to backend adapters | Backend utilization |
