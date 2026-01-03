# Correctness Properties

## Purpose

This document defines the formal correctness properties that the 3D Village Simulation MUST satisfy. Each property is a normative guarantee that Part 2 implementation MUST uphold. Properties are expressed as universal statements ("for any") that can be verified through property-based testing.

## Property Categories

Properties are organized by system:
- **ECS Properties** (1-3): Entity-Component-System invariants
- **Event Properties** (4-5): Event bus delivery guarantees
- **Game Loop Properties** (6): Timing and update consistency
- **State Machine Properties** (7-8): Agent state validity
- **Agent Properties** (9-11): Agent behavior correctness
- **Level Properties** (12-14): Level lifecycle guarantees
- **Environment Properties** (15-17): Environmental system consistency
- **Performance Properties** (18-19): Optimization correctness

## Property Definitions

### ECS Properties

#### Property 1: Entity-Component Query Inclusion

**Formal Statement**: For any entity E with components C₁, C₂, ..., Cₙ attached, querying for entities with components C₁, C₂, ..., Cₙ MUST return entity E in the result set.

**Type**: Functional

**Validates**: Requirements 4.1

**Rationale**: Ensures the ECS query system correctly identifies entities based on their component composition. Without this guarantee, systems could miss entities they should process.

**Verification Approach**: Generate random entities with random component sets, then verify queries return expected entities.

#[[file:docs/Code_Tech_Docs/core-systems/ecs-pattern.md]]

---

#### Property 2: Destroyed Entity Exclusion

**Formal Statement**: For any entity E that has been destroyed, all subsequent queries MUST NOT return entity E in their result sets.

**Type**: Functional

**Validates**: Requirements 4.1

**Rationale**: Prevents systems from operating on invalid entities, which could cause crashes or undefined behavior.

**Verification Approach**: Create entities, destroy some, verify destroyed entities never appear in query results.

#[[file:docs/Code_Tech_Docs/core-systems/ecs-pattern.md]]

---

#### Property 3: Component Change Visibility

**Formal Statement**: For any component C added to or removed from entity E, all queries executed after the next sync point MUST reflect that change.

**Type**: Functional

**Validates**: Requirements 4.1

**Rationale**: Ensures component modifications are visible to systems in a predictable manner, maintaining consistency across the simulation.

**Verification Approach**: Add/remove components, advance past sync point, verify queries reflect changes.

#[[file:docs/Code_Tech_Docs/core-systems/ecs-pattern.md]]

---

### Event Properties

#### Property 4: Handler Delivery

**Formal Statement**: For any event E emitted to the event bus, all handlers H₁, H₂, ..., Hₙ registered for event type T(E) MUST receive the event data exactly once.

**Type**: Functional

**Validates**: Requirements 4.2

**Rationale**: Guarantees reliable event delivery, ensuring no handler misses events and no handler receives duplicates.

**Verification Approach**: Register multiple handlers, emit events, verify each handler receives each event exactly once.

#[[file:docs/Code_Tech_Docs/core-systems/event-system.md]]

---

#### Property 5: Handler Error Isolation

**Formal Statement**: For any handler H that throws an error during event processing, all remaining handlers H₁, H₂, ..., Hₙ in the handler chain MUST still execute.

**Type**: Functional

**Validates**: Requirements 4.2

**Rationale**: Prevents a single faulty handler from breaking the entire event system, improving system resilience.

**Verification Approach**: Register handlers where some throw errors, verify all non-throwing handlers still execute.

#[[file:docs/Code_Tech_Docs/core-systems/event-system.md]]

---

### Game Loop Properties

#### Property 6: Fixed Timestep Consistency

**Formal Statement**: For any sequence of frames F₁, F₂, ..., Fₙ with varying durations, physics updates MUST occur at the configured fixed timestep interval, regardless of frame rate.

**Type**: Functional

**Validates**: Requirements 4.3

**Rationale**: Ensures deterministic physics simulation independent of rendering performance, critical for consistent gameplay.

**Verification Approach**: Simulate frames with varying durations, verify physics updates occur at fixed intervals.

#[[file:docs/Code_Tech_Docs/core-systems/game-loop.md]]

---

### State Machine Properties

#### Property 7: Transition Validity

**Formal Statement**: For any state machine SM with current state S, transitions MUST only occur to states S' where a transition rule (S → S') is explicitly defined.

**Type**: Functional

**Validates**: Requirements 7.2

**Rationale**: Prevents agents from entering undefined states, ensuring predictable behavior.

**Verification Approach**: Attempt transitions to all states, verify only defined transitions succeed.

#[[file:docs/Code_Tech_Docs/patterns/state-machine.md]]

---

#### Property 8: State Validity

**Formal Statement**: For any state machine SM at any point in time, the current state S MUST be a valid, defined state within SM's state set.

**Type**: Functional

**Validates**: Requirements 7.2

**Rationale**: Ensures state machines never enter an undefined or null state, maintaining agent coherence.

**Verification Approach**: After any operation on state machine, verify current state is in the defined state set.

#[[file:docs/Code_Tech_Docs/patterns/state-machine.md]]

---

### Agent Properties

#### Property 9: Group Force Composition

**Formal Statement**: For any agent A that is a member of a group G, the steering force applied to A MUST include cohesion, separation, and alignment force components calculated from neighbors within perception radius.

**Type**: Functional

**Validates**: Requirements 7.3

**Rationale**: Ensures group behaviors (flocking, shoaling, herding) work correctly by applying all three fundamental forces.

**Verification Approach**: Create agent groups, verify steering forces contain all three components with correct calculations.

#[[file:docs/Code_Tech_Docs/patterns/group-behavior.md]]

---

#### Property 10: Agent Initialization Order

**Formal Statement**: For any agent A, all three layers (Model, Behavior, Agent) MUST be fully initialized before the first update cycle processes agent A.

**Type**: Functional

**Validates**: Requirements 7.1

**Rationale**: Prevents null reference errors and ensures agents are fully operational before simulation begins.

**Verification Approach**: Create agents, verify all three layers are initialized before first update.

#[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]

---

#### Property 11: Agent Error Recovery

**Formal Statement**: For any error E that occurs during agent A's update cycle, agent A MUST remain in a valid state (valid current state, valid position, valid component references).

**Type**: Functional

**Validates**: Requirements 7.1, 12.3

**Rationale**: Ensures simulation continues gracefully even when individual agents encounter errors.

**Verification Approach**: Inject errors during agent updates, verify agent state remains valid.

#[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]

---

### Level Properties

#### Property 12: System Activation

**Formal Statement**: For any level L with configuration C specifying active systems S₁, S₂, ..., Sₙ, after level load completes, only systems S₁, S₂, ..., Sₙ MUST be active.

**Type**: Functional

**Validates**: Requirements 10.4

**Rationale**: Ensures levels only run the systems they need, preventing resource waste and unexpected behavior.

**Verification Approach**: Load levels with different configurations, verify only specified systems are active.

#[[file:docs/Code_Tech_Docs/subsystems/level-system.md]]

---

#### Property 13: Resource Cleanup

**Formal Statement**: For any level transition from level L₁ to level L₂, all resources R₁, R₂, ..., Rₙ associated with L₁ MUST be disposed before L₂ initialization begins.

**Type**: Functional

**Validates**: Requirements 10.3

**Rationale**: Prevents memory leaks and resource conflicts between levels.

**Verification Approach**: Track resources during level transitions, verify all previous resources disposed before new level initializes.

#[[file:docs/Code_Tech_Docs/subsystems/level-system.md]]

---

#### Property 14: Population Matching

**Formal Statement**: For any loaded level L with configuration C specifying agent populations P₁, P₂, ..., Pₙ, the actual spawned agent counts MUST match the configured populations.

**Type**: Functional

**Validates**: Requirements 10.1, 10.5

**Rationale**: Ensures levels spawn the correct number of each agent type as designed.

**Verification Approach**: Load levels, count spawned agents by type, verify counts match configuration.

#[[file:docs/Code_Tech_Docs/subsystems/level-system.md]]

---

### Environment Properties

#### Property 15: Lighting Consistency

**Formal Statement**: For any game time value T, the lighting parameters (sun position, color, intensity, ambient) MUST match the expected interpolated values for time T based on defined keyframes.

**Type**: Functional

**Validates**: Requirements 9.1

**Rationale**: Ensures smooth, predictable day/night cycle transitions.

**Verification Approach**: Sample lighting at various times, verify values match expected interpolation.

#[[file:docs/Design_Docs/environment-systems/day-night-cycle.md]]

---

#### Property 16: Procedural Determinism

**Formal Statement**: For any seed value S, procedural generation MUST produce identical results R across multiple executions.

**Type**: Functional

**Validates**: Requirements 9.4

**Rationale**: Enables reproducible level generation for testing and consistent user experience.

**Verification Approach**: Generate with same seed multiple times, verify identical results.

#[[file:docs/Design_Docs/environment-systems/procedural-generation.md]]

---

#### Property 17: Terrain Query Validity

**Formal Statement**: For any position P within terrain bounds B, height queries MUST return a valid numeric value representing the terrain height at P.

**Type**: Functional

**Validates**: Requirements 9.6

**Rationale**: Ensures agents can reliably query terrain for navigation and positioning.

**Verification Approach**: Query heights at random valid positions, verify all return valid numbers.

#[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]]

---

### Performance Properties

#### Property 18: Frustum Culling

**Formal Statement**: For any renderable object O that is completely outside the view frustum F, object O MUST NOT be submitted for rendering.

**Type**: Performance

**Validates**: Requirements 11.2

**Rationale**: Reduces GPU workload by not rendering invisible objects.

**Verification Approach**: Position objects outside frustum, verify they are not in render submission list.

#[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]

---

#### Property 19: Quality Adjustment

**Formal Statement**: For any frame rate R below threshold T for duration D (configurable), quality settings MUST be reduced by at least one level.

**Type**: Performance

**Validates**: Requirements 11.3

**Rationale**: Maintains playable frame rates on varying hardware by automatically reducing quality.

**Verification Approach**: Simulate low frame rates for configured duration, verify quality reduction occurs.

#[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]

---

## Property Summary Table

| # | Property Name | Category | Type | Requirements |
|---|--------------|----------|------|--------------|
| 1 | Entity-Component Query Inclusion | ECS | Functional | 4.1 |
| 2 | Destroyed Entity Exclusion | ECS | Functional | 4.1 |
| 3 | Component Change Visibility | ECS | Functional | 4.1 |
| 4 | Handler Delivery | Event | Functional | 4.2 |
| 5 | Handler Error Isolation | Event | Functional | 4.2 |
| 6 | Fixed Timestep Consistency | Game Loop | Functional | 4.3 |
| 7 | Transition Validity | State Machine | Functional | 7.2 |
| 8 | State Validity | State Machine | Functional | 7.2 |
| 9 | Group Force Composition | Agent | Functional | 7.3 |
| 10 | Agent Initialization Order | Agent | Functional | 7.1 |
| 11 | Agent Error Recovery | Agent | Functional | 7.1, 12.3 |
| 12 | System Activation | Level | Functional | 10.4 |
| 13 | Resource Cleanup | Level | Functional | 10.3 |
| 14 | Population Matching | Level | Functional | 10.1, 10.5 |
| 15 | Lighting Consistency | Environment | Functional | 9.1 |
| 16 | Procedural Determinism | Environment | Functional | 9.4 |
| 17 | Terrain Query Validity | Environment | Functional | 9.6 |
| 18 | Frustum Culling | Performance | Performance | 11.2 |
| 19 | Quality Adjustment | Performance | Performance | 11.3 |

## Cross-References

- #[[file:docs/Code_Tech_Docs/testing-strategy.md]]
- #[[file:docs/Code_Tech_Docs/traceability-matrix.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/ecs-pattern.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/event-system.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/game-loop.md]]
- #[[file:docs/Code_Tech_Docs/patterns/state-machine.md]]
- #[[file:docs/Code_Tech_Docs/patterns/group-behavior.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/level-system.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]
