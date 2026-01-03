# Entity-Component-System (ECS) Pattern

## Purpose

The Entity-Component-System pattern provides a data-oriented approach to composing game objects from reusable data (components) and behavior (systems). This pattern enables flexible entity composition, efficient queries, and clear separation between data and logic.

## Boundaries

**In Scope:**
- Entity creation, destruction, and lifecycle management
- Component attachment, detachment, and storage
- Entity queries by component composition
- Structural change management (command buffer)
- System registration and update coordination

**Out of Scope:**
- Rendering logic (handled by Render System)
- Physics simulation (handled by Physics System)
- AI behavior (handled by Agent System)
- Specific component implementations (defined per-system)

## Responsibilities

- Create and destroy entities with unique identifiers
- Attach and detach components to/from entities
- Store component data efficiently for cache-friendly access
- Provide query interface for entities matching component requirements
- Queue structural changes during iteration (command buffer)
- Apply queued changes at sync points
- Notify systems of entity/component changes via events

## Core Concepts

### Entity

An entity is a unique identifier with no inherent data. Entities serve as keys that associate related components.

```
Entity = UniqueID
```

Entities have no behavior or data of their own. All data is stored in components; all behavior is implemented in systems.

### Component

A component is a pure data container attached to exactly one entity. Components define what an entity "has" or "is."

```
Component = { entityId, ...data }
```

Example component types:
- Position: { x, y, z }
- Velocity: { vx, vy, vz }
- Health: { current, max }
- AgentType: { type: "villager" | "zombie" | ... }

### System

A system processes entities that match specific component requirements. Systems define behavior by operating on component data.

```
System = {
  requiredComponents: [ComponentType...],
  update(entities, deltaTime): void
}
```

Systems query the ECS world for entities with their required components and process each matching entity.

### Query

A query retrieves entities matching a component composition. Queries are the primary way systems access entities.

```
Query = {
  include: [ComponentType...],  // Entity MUST have all
  exclude: [ComponentType...]   // Entity MUST NOT have any (optional)
}
```

## Lifecycle

### 1. World Initialization
```
1. Create ECS World instance
2. Register component types
3. Register systems with component requirements
4. World ready for entity creation
```

### 2. Entity Lifecycle
```
1. Entity created → assigned unique ID
2. Components attached → entity matches new queries
3. Per-frame: systems process matching entities
4. Components detached → entity no longer matches queries
5. Entity destroyed → all components removed, ID invalidated
```

### 3. Per-Frame Update
```
1. For each registered system (in order):
   a. Query matching entities
   b. Process each entity
   c. Queue structural changes (if any)
   d. Apply queued changes (sync point)
2. Frame complete
```

### 4. World Disposal
```
1. Destroy all entities
2. Clear all component storage
3. Unregister all systems
4. Release world resources
```

## Structural Changes and Command Buffer

### The Problem

Modifying entity structure (creating/destroying entities, adding/removing components) during iteration can invalidate iterators and cause undefined behavior.

### The Solution: Command Buffer

Structural changes are queued in a command buffer during iteration and applied at sync points.

```
During System Update:
┌─────────────────────────────────────────────────────────┐
│  Query Results (stable)                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                       │
│  │ E1  │ │ E2  │ │ E3  │ │ E4  │  ← Iteration safe     │
│  └─────┘ └─────┘ └─────┘ └─────┘                       │
│                                                          │
│  Command Buffer (accumulating)                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │ CreateEntity(E5)                                  │   │
│  │ DestroyEntity(E2)                                 │   │
│  │ AddComponent(E1, Velocity)                        │   │
│  │ RemoveComponent(E3, Health)                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

At Sync Point:
┌─────────────────────────────────────────────────────────┐
│  Apply all queued commands                               │
│  ┌─────┐         ┌─────┐ ┌─────┐ ┌─────┐               │
│  │ E1* │         │ E3* │ │ E4  │ │ E5  │  ← Updated    │
│  └─────┘         └─────┘ └─────┘ └─────┘               │
│  (* = modified components)                               │
└─────────────────────────────────────────────────────────┘
```

### Sync Point Rules

Sync points occur at the end of each system update:

1. System begins update
2. System queries entities (snapshot)
3. System iterates and processes entities
4. System queues structural changes
5. System update ends
6. **Sync Point**: Apply all queued changes
7. Next system begins with updated state

## Semantics (Normative Guarantees)

### Entity Guarantees

- Entities MUST be unique identifiers with no inherent data
- Entity IDs MUST NOT be reused within a single world instance
- Destroyed entities MUST be excluded from all subsequent queries

### Component Guarantees

- Components MUST be pure data attached to exactly one entity
- Component data MUST be accessible only through the owning entity
- Component types MUST be registered before use

### System Guarantees

- Systems MUST process entities matching their component requirements
- Systems MUST NOT directly modify entity structure during iteration
- Systems MUST queue structural changes via command buffer

### Query Guarantees

- Entity iteration over a query MUST be stable for the duration of that system update
- No mid-iteration invalidation is permitted
- Queries after a sync point MUST reflect all queued changes

### Structural Change Guarantees

- Structural changes (entity creation/destruction, component add/remove) MUST be queued during iteration
- Queued changes MUST be applied at the end of the current system update (sync point)
- Changes MUST be applied in queue order
- Failed changes MUST be logged and skipped; remaining changes MUST still apply

## Correctness Properties

### Property 1: Entity-Component Query Inclusion
*For any* entity with components C₁...Cₙ, querying for entities with components C₁...Cₙ MUST return that entity.

**Validates: Requirements 4.1**

### Property 2: Destroyed Entity Exclusion
*For any* destroyed entity, subsequent queries MUST NOT return that entity.

**Validates: Requirements 4.1**

### Property 3: Component Change Visibility
*For any* component added or removed, subsequent queries (after sync point) MUST reflect that change.

**Validates: Requirements 4.1**

## Observability

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Entity count | Total active entities | > 10,000 |
| Component count per type | Components of each type | Varies by type |
| Query time | Duration of query execution | > 1ms |
| Sync point duration | Time to apply queued changes | > 2ms |
| Command buffer size | Queued changes per frame | > 1,000 |

### Events to Log

| Event | Level | Data |
|-------|-------|------|
| Entity created | Debug | entityId |
| Entity destroyed | Debug | entityId |
| Component added | Debug | entityId, componentType |
| Component removed | Debug | entityId, componentType |
| Sync point applied | Trace | changeCount, duration |
| Query executed | Trace | componentTypes, resultCount, duration |

## Cross-References

- #[[file:docs/Code_Tech_Docs/architecture-overview.md]]
- #[[file:docs/Code_Tech_Docs/core-systems/update-ordering.md]]
- #[[file:docs/Code_Tech_Docs/adrs/001-ecs-pattern.md]]
- #[[file:docs/Code_Tech_Docs/correctness-properties.md]]
