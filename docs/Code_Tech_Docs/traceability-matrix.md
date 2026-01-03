# Traceability Matrix

This document maps documentation pages to normative guarantees, correctness properties, and architecture decision records. Every implementation requirement MUST be traceable to at least one documentation page.

## How to Use This Matrix

1. **Doc Page**: The documentation file path relative to `docs/`
2. **Normative Guarantees**: RFC 2119 statements that implementations MUST follow
3. **Correctness Properties**: Property numbers from `correctness-properties.md` that the doc validates
4. **ADRs**: Architecture Decision Records that inform the documented decisions

## Core Systems

| Doc Page | Normative Guarantees | Correctness Properties | ADRs |
|----------|---------------------|----------------------|------|
| Code_Tech_Docs/core-systems/ecs-pattern.md | Entity uniqueness, Component attachment, Query stability, Sync point semantics | 1, 2, 3 | ADR-001 |
| Code_Tech_Docs/core-systems/event-system.md | Handler ordering, Delivery guarantee, Error isolation, Re-entrancy rules | 4, 5 | ADR-002 |
| Code_Tech_Docs/core-systems/game-loop.md | Fixed timestep, Accumulator clamp, Max substeps, Interpolation | 6 | - |
| Code_Tech_Docs/core-systems/dependency-injection.md | Registration, Resolution, Scoping rules | - | ADR-003 |

## Subsystems

| Doc Page | Normative Guarantees | Correctness Properties | ADRs |
|----------|---------------------|----------------------|------|
| Code_Tech_Docs/subsystems/render-system.md | Backend initialization, LOD switching, Instancing, Shadow quality | 18 | - |
| Code_Tech_Docs/subsystems/physics-system.md | Body types, Collision groups, Trigger semantics, Buoyancy, Pooling | - | - |
| Code_Tech_Docs/subsystems/agent-system.md | Three-layer composition, Initialization order, Pooling, Throttling | 9, 10, 11 | ADR-004 |
| Code_Tech_Docs/subsystems/environment-system.md | Terrain queries, Bounds validation | 15, 16, 17 | - |
| Code_Tech_Docs/subsystems/level-system.md | System activation, Resource cleanup, Population matching | 12, 13, 14 | - |
| Code_Tech_Docs/subsystems/performance-system.md | Spatial queries, Frustum culling, Quality scaling, Memory monitoring | 18, 19 | - |

## Patterns

| Doc Page | Normative Guarantees | Correctness Properties | ADRs |
|----------|---------------------|----------------------|------|
| Code_Tech_Docs/patterns/state-machine.md | State validity, Transition rules, Entry/exit actions | 7, 8 | ADR-004 |
| Code_Tech_Docs/patterns/object-pooling.md | Pool lifecycle, Acquire/release semantics | - | - |
| Code_Tech_Docs/patterns/spatial-partitioning.md | Query correctness (no false negatives) | - | - |
| Code_Tech_Docs/patterns/group-behavior.md | Force calculation, Weighting, Steering integration | 9 | - |
| Code_Tech_Docs/patterns/error-handling.md | Error categories, Severity handling, Recovery strategies | - | - |


## Design Documents - Agent Behaviors

| Doc Page | Normative Guarantees | Correctness Properties | ADRs |
|----------|---------------------|----------------------|------|
| Design_Docs/agent-behaviors/villager-mechanics.md | State transitions, Schedule rules, Social network, Threat response | 7, 8, 10, 11 | ADR-004 |
| Design_Docs/agent-behaviors/zombie-mechanics.md | Awareness, Pursuit, Lurge mechanics, Group influence | 7, 8, 9, 10, 11 | ADR-004 |
| Design_Docs/agent-behaviors/wildlife-mechanics.md | Fish shoaling, Bird flocking, Dog territory, Boat navigation | 7, 8, 9, 10, 11 | ADR-004 |

## Design Documents - Environment Systems

| Doc Page | Normative Guarantees | Correctness Properties | ADRs |
|----------|---------------------|----------------------|------|
| Design_Docs/environment-systems/day-night-cycle.md | Time progression, Lighting interpolation, Schedule queries | 15 | - |
| Design_Docs/environment-systems/procedural-generation.md | Seed determinism, Layout validation | 16 | - |
| Design_Docs/environment-systems/water-system.md | Wave behavior, Navigation constraints, Buoyancy integration | 17 | - |

## Design Documents - Level Design

| Doc Page | Normative Guarantees | Correctness Properties | ADRs |
|----------|---------------------|----------------------|------|
| Design_Docs/level-design/level-types.md | Active systems, Agent populations | 12, 14 | - |
| Design_Docs/level-design/level-configurations.md | Configuration schema, Lifecycle | 12, 13, 14 | - |

## Art Documents

| Doc Page | Normative Guarantees | Correctness Properties | ADRs |
|----------|---------------------|----------------------|------|
| Art_Docs/visual-style-guide.md | Overall aesthetic, Color palette, Mood | - | - |
| Art_Docs/agent-visuals/villager-models.md | Model specifications, Animation requirements | - | - |
| Art_Docs/agent-visuals/zombie-sprites.md | Visual specifications | - | - |
| Art_Docs/agent-visuals/wildlife-models.md | Model specifications for fish, bird, dog, boat | - | - |
| Art_Docs/environment-art/terrain-textures.md | Texture specifications | - | - |
| Art_Docs/environment-art/water-effects.md | Water visual effects | - | - |
| Art_Docs/environment-art/lighting-moods.md | Lighting specifications | 15 | - |
| Art_Docs/ui-assets.md | UI visual specifications | - | - |

## Architecture Decision Records

| Doc Page | Normative Guarantees | Correctness Properties | ADRs |
|----------|---------------------|----------------------|------|
| Code_Tech_Docs/adrs/001-ecs-pattern.md | ECS pattern selection rationale | 1, 2, 3 | ADR-001 |
| Code_Tech_Docs/adrs/002-event-bus-semantics.md | Event bus semantics rationale | 4, 5 | ADR-002 |
| Code_Tech_Docs/adrs/003-modular-monolith.md | Architecture boundary rationale | - | ADR-003 |
| Code_Tech_Docs/adrs/004-state-machine-approach.md | State machine approach rationale | 7, 8 | ADR-004 |

## Testing and Quality

| Doc Page | Normative Guarantees | Correctness Properties | ADRs |
|----------|---------------------|----------------------|------|
| Code_Tech_Docs/correctness-properties.md | All 19 property definitions | 1-19 | - |
| Code_Tech_Docs/testing-strategy.md | Test categories, Quality gates, Coverage thresholds | - | - |

## Requirements Coverage Summary

| Requirement | Primary Doc Pages |
|-------------|------------------|
| Req 1: Documentation Structure | All README.md files, glossary.md |
| Req 2: Documentation Traceability | traceability-matrix.md |
| Req 3: Terminology Control | glossary.md |
| Req 4: Core Architecture | core-systems/*.md, architecture-overview.md |
| Req 5: Rendering System | subsystems/render-system.md |
| Req 6: Physics System | subsystems/physics-system.md |
| Req 7: Agent System | subsystems/agent-system.md, patterns/state-machine.md |
| Req 8: Agent Behavior | agent-behaviors/*.md |
| Req 9: Environment System | environment-systems/*.md, subsystems/environment-system.md |
| Req 10: Level System | level-design/*.md, subsystems/level-system.md |
| Req 11: Performance System | subsystems/performance-system.md, patterns/spatial-partitioning.md |
| Req 12: Error Handling | patterns/error-handling.md |
| Req 13: Testing Strategy | testing-strategy.md |
| Req 14: Architecture Decisions | adrs/*.md |
| Req 15: Correctness Properties | correctness-properties.md |
| Req 16: Art Documentation | Art_Docs/*.md |
| Req 17: Documentation Completeness | All documents |

## Cross-References

- #[[file:docs/Code_Tech_Docs/glossary.md]]
- #[[file:docs/Code_Tech_Docs/correctness-properties.md]]
- #[[file:docs/Code_Tech_Docs/architecture-overview.md]]
