# Group Behavior Pattern

## Purpose

The Group Behavior pattern implements emergent collective movement through three fundamental steering forces: cohesion, separation, and alignment. These forces combine to create realistic flocking (birds), shoaling (fish), herding (zombies), and pack behavior (dogs) without explicit coordination.

Group behavior enables:
- Natural-looking collective movement
- Emergent patterns from simple rules
- Scalable behavior for many agents
- Configurable group dynamics per agent type

#[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]

## Boundaries

**In Scope:**
- Three core steering forces (cohesion, separation, alignment)
- Neighbor perception and filtering
- Force weighting and combination
- Group center and velocity calculation

**Out of Scope:**
- Individual agent decision-making (handled by state machine)
- Pathfinding and obstacle avoidance (handled by navigation)
- Physics integration (handled by physics system)
- Visual representation (handled by model layer)

## Responsibilities

- Calculate cohesion force toward group center
- Calculate separation force away from nearby neighbors
- Calculate alignment force to match group heading
- Find neighbors within perception radius
- Weight and combine forces into steering vector
- Provide group statistics (center, velocity, size)

## The Three Forces

### Force Overview

| Force | Direction | Purpose | Effect |
|-------|-----------|---------|--------|
| Cohesion | Toward group center | Keep group together | Agents move toward average position |
| Separation | Away from neighbors | Prevent crowding | Agents maintain personal space |
| Alignment | Match group heading | Coordinate movement | Agents move in same direction |

### Force Diagram

```
                    Alignment
                       ↑
                       │
                       │ (match group velocity)
                       │
    Separation ←───── Agent ─────→ Cohesion
    (away from         │           (toward group
     neighbors)        │            center)
                       │
                       ▼
                Combined Steering Force
```

## Force Calculations

### Cohesion Force

Steers agent toward the average position of neighbors:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Find all neighbors within cohesion radius            │
│ 2. Calculate average position (group center)            │
│ 3. Create vector from agent to group center             │
│ 4. Normalize and scale by cohesion weight               │
│                                                         │
│ Formula:                                                │
│   groupCenter = sum(neighbor.position) / neighborCount  │
│   cohesionForce = (groupCenter - agent.position)        │
│                   .normalize() * cohesionWeight         │
└─────────────────────────────────────────────────────────┘
```

### Separation Force

Steers agent away from nearby neighbors to prevent crowding:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Find all neighbors within separation radius          │
│ 2. For each neighbor:                                   │
│    a. Calculate vector from neighbor to agent           │
│    b. Scale inversely by distance (closer = stronger)   │
│    c. Accumulate into separation vector                 │
│ 3. Average and scale by separation weight               │
│                                                         │
│ Formula:                                                │
│   For each neighbor:                                    │
│     diff = agent.position - neighbor.position           │
│     separationForce += diff.normalize() / distance      │
│   separationForce = (separationForce / count)           │
│                     * separationWeight                  │
└─────────────────────────────────────────────────────────┘
```

### Alignment Force

Steers agent to match the average velocity of neighbors:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Find all neighbors within alignment radius           │
│ 2. Calculate average velocity (group velocity)          │
│ 3. Create vector from agent velocity to group velocity  │
│ 4. Scale by alignment weight                            │
│                                                         │
│ Formula:                                                │
│   groupVelocity = sum(neighbor.velocity) / neighborCount│
│   alignmentForce = (groupVelocity - agent.velocity)     │
│                    * alignmentWeight                    │
└─────────────────────────────────────────────────────────┘
```

## Force Combination

Forces are combined with configurable weights:

```
┌─────────────────────────────────────────────────────────┐
│ steeringForce = cohesionForce * cohesionWeight          │
│               + separationForce * separationWeight      │
│               + alignmentForce * alignmentWeight        │
│                                                         │
│ // Clamp to maximum steering force                      │
│ if (steeringForce.length() > maxSteeringForce) {        │
│     steeringForce = steeringForce.normalize()           │
│                     * maxSteeringForce                  │
│ }                                                       │
│                                                         │
│ // Apply to agent velocity                              │
│ agent.velocity += steeringForce                         │
│ agent.velocity = clamp(agent.velocity, maxSpeed)        │
└─────────────────────────────────────────────────────────┘
```

## Neighbor Finding

Efficient neighbor finding is critical for performance:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Use spatial partitioning to find candidates          │
│ 2. Filter by perception radius                          │
│ 3. Optionally filter by field of view                   │
│ 4. Limit to maximum neighbor count                      │
│                                                         │
│ Optimization:                                           │
│ - Use spatial grid for O(1) neighbor lookup             │
│ - Cache neighbor lists between frames                   │
│ - Limit neighbor count for distant agents               │
└─────────────────────────────────────────────────────────┘
```

#[[file:docs/Code_Tech_Docs/patterns/spatial-partitioning.md]]

## Agent Type Configurations

### Fish (Shoaling)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Cohesion Weight | 0.1 | Gentle pull toward school |
| Separation Weight | 0.3 | Strong avoidance of collision |
| Alignment Weight | 0.1 | Moderate direction matching |
| Perception Radius | 10 | Medium awareness range |
| Separation Radius | 3 | Close-range avoidance |

### Bird (Flocking)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Cohesion Weight | 0.15 | Moderate flock cohesion |
| Separation Weight | 0.25 | Collision avoidance |
| Alignment Weight | 0.2 | Strong direction matching |
| Perception Radius | 15 | Wide awareness for flying |
| Separation Radius | 4 | Wingspan consideration |

### Zombie (Horde)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Cohesion Weight | 0.05 | Loose grouping |
| Separation Weight | 0.2 | Basic collision avoidance |
| Alignment Weight | 0.05 | Minimal coordination |
| Perception Radius | 20 | Wide awareness for threats |
| Separation Radius | 2 | Close-packed hordes |

### Dog (Pack)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Cohesion Weight | 0.2 | Strong pack cohesion |
| Separation Weight | 0.15 | Moderate spacing |
| Alignment Weight | 0.15 | Coordinated movement |
| Perception Radius | 12 | Pack awareness |
| Separation Radius | 3 | Comfortable spacing |

## Lifecycle

### 1. Initialization

```
┌─────────────────────────────────────────────────────────┐
│ 1. Configure force weights for agent type               │
│ 2. Set perception and separation radii                  │
│ 3. Initialize neighbor cache                            │
│ 4. Register with spatial partitioning system            │
└─────────────────────────────────────────────────────────┘
```

### 2. Per-Frame Update

```
┌─────────────────────────────────────────────────────────┐
│ 1. Find neighbors within perception radius              │
│ 2. Calculate cohesion force                             │
│ 3. Calculate separation force                           │
│ 4. Calculate alignment force                            │
│ 5. Combine forces with weights                          │
│ 6. Apply steering force to agent velocity               │
│ 7. Update agent position                                │
└─────────────────────────────────────────────────────────┘
```

### 3. Cleanup

```
┌─────────────────────────────────────────────────────────┐
│ 1. Clear neighbor cache                                 │
│ 2. Unregister from spatial partitioning                 │
│ 3. Release force calculation resources                  │
└─────────────────────────────────────────────────────────┘
```

## Semantics (Normative Guarantees)

### Force Calculation
- Forces MUST be calculated from neighbors within perception radius
- Forces MUST be weighted by configurable coefficients
- Combined force MUST be added to individual steering
- Combined force MUST be clamped to maximum steering force

### Neighbor Finding
- Neighbor queries MUST use spatial partitioning for efficiency
- Neighbor count MAY be limited for performance
- Neighbor list MAY be cached between frames for throttled agents

### Force Application
- Steering force MUST be applied after all three forces are calculated
- Velocity MUST be clamped to maximum speed after force application
- Position update MUST occur after velocity update

## Correctness Properties

### Property 9: Group Force Composition
*For any* agent in a group, the steering force MUST include cohesion, separation, and alignment components.

**Validates: Requirements 7.3**

This property ensures that:
- All three forces contribute to group behavior
- No force is accidentally omitted
- Force weights can be zero but forces must be calculated

#[[file:docs/Code_Tech_Docs/correctness-properties.md#property-9]]

## Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `cohesionWeight` | 0.1 | Strength of cohesion force |
| `separationWeight` | 0.3 | Strength of separation force |
| `alignmentWeight` | 0.1 | Strength of alignment force |
| `perceptionRadius` | 10 | Range for neighbor detection |
| `separationRadius` | 3 | Range for separation force |
| `maxNeighbors` | 12 | Maximum neighbors to consider |
| `maxSteeringForce` | 1.0 | Maximum combined force magnitude |
| `maxSpeed` | 0.1 | Maximum agent velocity |

## Observability

### Metrics to Track
- Average group size
- Group center position
- Average group velocity
- Force magnitudes per agent
- Neighbor count distribution

### Events to Log
- Group formation/dissolution
- Unusual force magnitudes
- Neighbor finding performance
- Configuration changes

### Debug Information
- Individual force vectors
- Neighbor list per agent
- Group center and velocity
- Force weights in use

## Performance Optimization

### Shared Computation
- Calculate group center once per frame, share across agents
- Calculate group velocity once per frame, share across agents
- Use spatial grid for efficient neighbor queries

### Caching
- Cache neighbor lists for throttled agents
- Cache force calculations for distant agents
- Use frame-based cache invalidation

### Complexity Scaling
- Reduce neighbor count at lower quality settings
- Increase update interval for distant groups
- Skip alignment calculation at lowest quality

## Example Implementation

### Force Calculation
```javascript
// Calculate separation force
getSeparation(agent, neighbors) {
    const separation = new Vector3(0, 0, 0);
    let count = 0;

    for (const neighbor of neighbors) {
        const distance = Vector3.Distance(
            agent.position,
            neighbor.position
        );

        if (distance < this.separationRadius && distance > 0) {
            const away = agent.position
                .subtract(neighbor.position)
                .normalize()
                .scale(1 / distance);
            separation.addInPlace(away);
            count++;
        }
    }

    if (count > 0) {
        separation.scaleInPlace(1 / count);
    }
    return separation;
}
```

### Force Combination
```javascript
// Combine all forces
updateAgent(agent, deltaTime) {
    const neighbors = this.findNeighbors(agent);
    
    const separation = this.getSeparation(agent, neighbors);
    const alignment = this.getAlignment(agent, neighbors);
    const cohesion = this.getCohesion(agent, neighbors);
    
    // Weight and combine
    const steering = new Vector3(0, 0, 0);
    steering.addInPlace(separation.scale(this.separationWeight));
    steering.addInPlace(alignment.scale(this.alignmentWeight));
    steering.addInPlace(cohesion.scale(this.cohesionWeight));
    
    // Apply to velocity
    agent.velocity.addInPlace(steering);
    agent.velocity = clampMagnitude(agent.velocity, this.maxSpeed);
    
    // Update position
    agent.position.addInPlace(agent.velocity.scale(deltaTime));
}
```

## Cross-References

- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]
- #[[file:docs/Code_Tech_Docs/patterns/spatial-partitioning.md]]
- #[[file:docs/Code_Tech_Docs/patterns/state-machine.md]]
- #[[file:docs/Design_Docs/agent-behaviors/wildlife-mechanics.md]]
