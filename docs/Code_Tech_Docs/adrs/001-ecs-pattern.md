# ADR-001: ECS Pattern Selection

## Status

Accepted

## Context

The 3D Village Simulation requires a flexible architecture to manage diverse game entities (villagers, zombies, fish, birds, dogs, boats) with varying combinations of behaviors, visual representations, and physical properties. The system needs to:

- Support entities with different combinations of capabilities (some swim, some fly, some walk)
- Allow runtime modification of entity capabilities
- Enable efficient querying of entities by their capabilities
- Support adding new entity types without modifying existing code
- Maintain performance with hundreds of concurrent agents

Traditional object-oriented inheritance hierarchies become problematic when entities need to share behaviors across unrelated types (e.g., both fish and boats need water navigation, but share little else).

## Options Considered

### Option 1: Deep Inheritance Hierarchy

Create a class hierarchy where shared behaviors are placed in common ancestors:

```
Entity
├── GroundEntity
│   ├── Villager
│   ├── Zombie
│   └── Dog
├── WaterEntity
│   ├── Fish
│   └── Boat
└── AirEntity
    └── Bird
```

**Pros:**
- Familiar OOP pattern
- IDE support for method discovery
- Clear "is-a" relationships

**Cons:**
- Diamond inheritance problems (what if an entity needs both ground and water?)
- Rigid structure makes adding cross-cutting behaviors difficult
- Changes to base classes ripple through entire hierarchy
- Difficult to add/remove capabilities at runtime

### Option 2: Entity-Component-System (ECS)

Compose entities from reusable data components, with systems processing entities based on component composition:

- **Entities**: Unique identifiers with no inherent data
- **Components**: Pure data attached to entities (Position, Velocity, Health, SwimCapability)
- **Systems**: Logic that processes entities with specific component combinations

**Pros:**
- Maximum flexibility in entity composition
- Easy to add new behaviors without modifying existing code
- Efficient batch processing of similar entities
- Runtime modification of entity capabilities
- Cache-friendly data layout potential

**Cons:**
- Less intuitive than OOP for simple cases
- Requires discipline to keep components as pure data
- Debugging can be harder (behavior spread across systems)
- Learning curve for developers unfamiliar with pattern

### Option 3: Hybrid Composition with Mixins

Use composition with mixin-style behavior injection:

```javascript
class Entity {
  constructor() {
    this.behaviors = [];
  }
  addBehavior(behavior) { ... }
}
```

**Pros:**
- More flexible than inheritance
- Familiar to JavaScript developers
- Easier debugging than pure ECS

**Cons:**
- Less structured than ECS
- No standard query mechanism
- Behavior ordering can be unclear
- Performance overhead from dynamic dispatch

## Decision

We will use the **Entity-Component-System (ECS)** pattern for the simulation architecture.

## Rationale

1. **Flexibility for diverse agents**: The simulation has 6+ agent types with overlapping but distinct capabilities. ECS allows any combination without inheritance constraints.

2. **Query efficiency**: Systems can efficiently query "all entities with Position and SwimCapability" without iterating through unrelated entities.

3. **Runtime modification**: Agents may gain or lose capabilities during simulation (e.g., a villager becoming infected becomes a zombie). ECS handles this naturally.

4. **Separation of concerns**: Visual representation (Model), decision-making (Behavior), and instance data (Agent) map cleanly to component/system separation.

5. **Performance potential**: Batch processing of similar components enables optimization opportunities (though not the primary driver).

6. **Industry standard**: ECS is well-established in game development with extensive documentation and community knowledge.

## Consequences

### Positive

- New agent types can be added by composing existing components
- Cross-cutting behaviors (like "affected by day/night cycle") can be added to any entity
- Systems can be tested in isolation with mock components
- Clear boundaries between data (components) and logic (systems)

### Negative

- Developers must learn ECS concepts if unfamiliar
- Simple behaviors require more boilerplate than inheritance
- Debugging requires understanding which systems process which components
- Must enforce discipline to keep components as pure data

### Risks

- Over-engineering simple behaviors into too many small components
- Performance issues if structural changes (add/remove components) happen too frequently
- Mitigation: Queue structural changes and apply at sync points (end of system update)

## Cross-References

- #[[file:docs/Code_Tech_Docs/core-systems/ecs-pattern.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]
- Correctness Properties: 1, 2, 3
