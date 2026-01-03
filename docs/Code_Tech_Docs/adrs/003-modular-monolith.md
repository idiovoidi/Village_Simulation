# ADR-003: Modular Monolith Architecture

## Status

Accepted

## Context

The 3D Village Simulation is a complex application with multiple subsystems:
- Rendering (Babylon.js integration)
- Physics (Havok integration)
- Agent AI (villagers, zombies, wildlife)
- Environment (day/night, water, clouds)
- Level management
- Performance optimization
- UI

We need to decide how to structure these subsystems:
- How tightly coupled should they be?
- Should they be deployable independently?
- How do we manage dependencies between them?
- How do we enable testing in isolation?

## Options Considered

### Option 1: Pure Monolith

All code in a single codebase with no formal module boundaries:

```
src/
├── agents/
├── rendering/
├── physics/
└── ... (all mixed together)
```

**Pros:**
- Simplest to start
- No module boundary overhead
- Easy refactoring across boundaries
- Single deployment unit

**Cons:**
- Tends toward spaghetti as codebase grows
- Hard to test subsystems in isolation
- Circular dependencies creep in
- Changes ripple unpredictably
- Difficult to understand system boundaries

### Option 2: Microservices

Each subsystem as an independent service communicating via network:

```
[Render Service] <--HTTP/WS--> [Physics Service]
       ↑                              ↑
       └──────── [Agent Service] ─────┘
```

**Pros:**
- Strong isolation
- Independent deployment
- Technology flexibility per service
- Clear boundaries

**Cons:**
- Massive overhead for a browser game
- Network latency between systems (unacceptable for 60fps)
- Complex deployment and orchestration
- Debugging across service boundaries is hard
- Overkill for single-user application

### Option 3: Modular Monolith

Single deployable unit with well-defined internal module boundaries:

```
src/
├── core/           # Shared kernel (ECS, events, DI)
├── render/         # Rendering module (depends on core)
├── physics/        # Physics module (depends on core)
├── agents/         # Agent module (depends on core, physics)
├── environment/    # Environment module (depends on core, render)
├── levels/         # Level module (depends on core, agents, environment)
└── adapters/       # External integrations (Babylon, Havok)
```

**Pros:**
- Clear boundaries without network overhead
- Modules can be tested in isolation
- Circular dependencies detectable and preventable
- Single deployment (appropriate for browser app)
- Refactoring within modules is safe
- Dependencies are explicit and documented

**Cons:**
- Requires discipline to maintain boundaries
- More upfront design than pure monolith
- Tooling needed to enforce boundaries (Madge)

## Decision

We will use a **Modular Monolith** architecture with the following structure:

### Module Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  (Level loading, game modes, UI)                        │
├─────────────────────────────────────────────────────────┤
│                    Domain Layer                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
│  │ Agents  │ │ Environ │ │ Levels  │ │ Performance │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └──────┬──────┘   │
├───────┼───────────┼───────────┼─────────────┼──────────┤
│       │     Infrastructure Layer            │           │
│  ┌────┴────┐ ┌────┴────┐                   │           │
│  │ Render  │ │ Physics │                   │           │
│  │ Adapter │ │ Adapter │                   │           │
│  └────┬────┘ └────┬────┘                   │           │
├───────┼───────────┼────────────────────────┼──────────┤
│                    Core Layer                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
│  │   ECS   │ │  Event  │ │   DI    │ │  Game Loop  │   │
│  │  World  │ │   Bus   │ │Container│ │             │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Dependency Rules

1. **Core Layer**: No dependencies on other layers
2. **Infrastructure Layer**: Depends only on Core
3. **Domain Layer**: Depends on Core and Infrastructure abstractions (not implementations)
4. **Application Layer**: Can depend on all layers

### Adapter Boundary Rule

Core and Domain layers MUST NOT depend directly on Babylon.js or Havok APIs. They depend on adapter-facing abstractions. This enables:
- Testing core logic without GPU/physics runtime
- Future backend substitution
- Clear separation of "what" from "how"

## Rationale

1. **Browser Context**: Microservices make no sense for a single-user browser application. The network overhead alone would kill performance.

2. **Testability**: Modular boundaries enable testing agents without rendering, physics without agents, etc. Pure monolith makes this difficult.

3. **Maintainability**: Clear boundaries prevent the "big ball of mud" that pure monoliths become. Changes are localized.

4. **Appropriate Complexity**: More structure than a pure monolith, but without microservices overhead. Right-sized for the problem.

5. **Tooling Support**: Madge can detect circular dependencies and generate dependency graphs, enforcing boundaries automatically.

6. **Adapter Pattern**: Isolating external dependencies (Babylon, Havok) behind adapters future-proofs the architecture and enables testing.

## Consequences

### Positive

- Clear system boundaries documented and enforced
- Modules testable in isolation
- Circular dependencies prevented by tooling
- External dependencies isolated behind adapters
- Single deployment appropriate for browser
- Easier onboarding (clear module responsibilities)

### Negative

- More upfront design required
- Must maintain boundary discipline
- Some cross-cutting concerns need careful handling
- Slightly more boilerplate than pure monolith

### Risks

- **Boundary erosion**: Mitigated by Madge CI checks for circular dependencies
- **Over-modularization**: Mitigated by keeping module count reasonable (< 10 top-level)
- **Adapter overhead**: Mitigated by keeping adapter interfaces thin

### Quality Gates

- **Madge**: Zero circular dependencies allowed
- **Orphan detection**: Modules must be connected to dependency graph
- **Dependency graph artifact**: Generated on main branch for review

## Cross-References

- #[[file:docs/Code_Tech_Docs/architecture-overview.md]]
- #[[file:docs/Code_Tech_Docs/testing-strategy.md]]
- ADR-001: ECS Pattern (core module design)
- ADR-002: Event Bus (cross-module communication)
