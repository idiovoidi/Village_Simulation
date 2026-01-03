# 3D Village Simulation - TypeScript Implementation (Part 2)

## Deliverable

Create a Kiro spec in `.kiro/specs/village-sim-typescript-engine/` consisting of:
- `requirements.md` - User stories + EARS-pattern acceptance criteria
- `design.md` - Component-level architecture with correctness properties
- `tasks.md` - Dependency-ordered implementation plan with test tasks

## Workflow Rules

1. **Staged approval**: Draft `requirements.md` first and ask for approval before proceeding to `design.md`, then `tasks.md`
2. **Source of truth**: Use ONLY the Part 1 documentation files below. If any detail is missing or ambiguous, record it as `TODO: [question]` in the spec—do not invent mechanics
3. **Traceability**: Every requirement and task MUST reference the relevant `#[[file:...]]` doc page, correctness property number, or ADR
4. **Normative guarantees**: RFC 2119 uppercase keywords (MUST, SHALL, etc.) in Part 1 docs are binding requirements for Part 2
5. **Technology stack**: TypeScript, Babylon.js (rendering), Havok Physics, Vitest + fast-check (testing)

## Part 1 Documentation (Read in Order)

### 1. Architecture Foundation
- `#[[file:docs/Code_Tech_Docs/architecture-overview.md]]` - C4 diagrams, adapter boundary rules
- `#[[file:docs/Code_Tech_Docs/glossary.md]]` - Canonical terminology (use consistently)
- `#[[file:docs/Code_Tech_Docs/traceability-matrix.md]]` - Requirements-to-docs mapping

### 2. Core Systems (implement first)
- `#[[file:docs/Code_Tech_Docs/core-systems/ecs-pattern.md]]` - Entity-Component-System
- `#[[file:docs/Code_Tech_Docs/core-systems/event-system.md]]` - Event bus, handler ordering, error isolation
- `#[[file:docs/Code_Tech_Docs/core-systems/game-loop.md]]` - Fixed timestep physics, variable rendering
- `#[[file:docs/Code_Tech_Docs/core-systems/dependency-injection.md]]` - DI container
- `#[[file:docs/Code_Tech_Docs/core-systems/update-ordering.md]]` - Canonical phase order

### 3. Subsystems (implement after core)
- `#[[file:docs/Code_Tech_Docs/subsystems/render-system.md]]` - Babylon.js adapter, LOD, instancing, shadows
- `#[[file:docs/Code_Tech_Docs/subsystems/physics-system.md]]` - Havok adapter, collision groups, triggers, buoyancy
- `#[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]` - Three-layer composition (Model/Behavior/Agent)
- `#[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]]` - Terrain, day/night, water
- `#[[file:docs/Code_Tech_Docs/subsystems/level-system.md]]` - Level lifecycle, configuration schema
- `#[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]` - Spatial partitioning, culling, quality scaling

### 4. Patterns
- `#[[file:docs/Code_Tech_Docs/patterns/state-machine.md]]` - Agent state machines
- `#[[file:docs/Code_Tech_Docs/patterns/object-pooling.md]]` - Physics body and agent pooling
- `#[[file:docs/Code_Tech_Docs/patterns/group-behavior.md]]` - Flocking/shoaling forces
- `#[[file:docs/Code_Tech_Docs/patterns/spatial-partitioning.md]]` - Efficient neighbor queries
- `#[[file:docs/Code_Tech_Docs/patterns/error-handling.md]]` - Error categories and recovery

### 5. Agent Behaviors
- `#[[file:docs/Design_Docs/agent-behaviors/villager-mechanics.md]]` - State diagram, schedule, social network
- `#[[file:docs/Design_Docs/agent-behaviors/zombie-mechanics.md]]` - Awareness, pursuit, lurge, groups
- `#[[file:docs/Design_Docs/agent-behaviors/wildlife-mechanics.md]]` - Fish, bird, dog, boat

### 6. Environment & Levels
- `#[[file:docs/Design_Docs/environment-systems/day-night-cycle.md]]` - Time, lighting keyframes
- `#[[file:docs/Design_Docs/environment-systems/procedural-generation.md]]` - Village/road generation
- `#[[file:docs/Design_Docs/environment-systems/water-system.md]]` - Waves, navigation
- `#[[file:docs/Design_Docs/level-design/level-types.md]]` - Village, Rural, Coastal, Wilderness
- `#[[file:docs/Design_Docs/level-design/level-configurations.md]]` - Complete YAML configs

### 7. Quality & Testing
- `#[[file:docs/Code_Tech_Docs/correctness-properties.md]]` - 19 properties (implement as PBT tests)
- `#[[file:docs/Code_Tech_Docs/testing-strategy.md]]` - Vitest, fast-check, 70% coverage minimum

### 8. Architecture Decisions
- `#[[file:docs/Code_Tech_Docs/adrs/001-ecs-pattern.md]]`
- `#[[file:docs/Code_Tech_Docs/adrs/002-event-bus-semantics.md]]`
- `#[[file:docs/Code_Tech_Docs/adrs/003-modular-monolith.md]]`
- `#[[file:docs/Code_Tech_Docs/adrs/004-state-machine-approach.md]]`

### 9. Art Specifications
- `#[[file:docs/Art_Docs/visual-style-guide.md]]` - Colors, lighting, materials
- `#[[file:docs/Art_Docs/agent-visuals/villager-models.md]]`
- `#[[file:docs/Art_Docs/agent-visuals/zombie-sprites.md]]`
- `#[[file:docs/Art_Docs/agent-visuals/wildlife-models.md]]`
- `#[[file:docs/Art_Docs/environment-art/terrain-textures.md]]`
- `#[[file:docs/Art_Docs/ui-assets.md]]`

## Key Implementation Constraints

1. **Adapter boundary**: Core engine MUST NOT depend directly on Babylon.js or Havok—only adapter interfaces
2. **Three-layer agents**: Every agent has Model (visual), Behavior (state machine), Agent (instance) layers
3. **Fixed timestep**: Physics at 60Hz, rendering variable, with interpolation
4. **Property tests**: All 19 correctness properties become property-based tests (fast-check)
5. **Quality gates**: Zero circular dependencies (Madge), 70% coverage minimum

## Task

Begin by reading `architecture-overview.md` and `glossary.md`, then draft `requirements.md` for Part 2. Ask for approval before continuing.
