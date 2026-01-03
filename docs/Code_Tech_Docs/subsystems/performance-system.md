# Performance System

## Purpose

The Performance System monitors and optimizes simulation performance through spatial partitioning, view frustum culling, quality scaling, and memory monitoring. It ensures the simulation maintains acceptable frame rates across varying hardware capabilities.

## Boundaries

**In Scope:**
- Spatial partitioning for efficient queries
- View frustum culling
- Dynamic quality scaling
- Memory monitoring and cleanup
- Behavior throttling coordination
- Performance metrics collection

**Out of Scope:**
- Rendering implementation (see #[[file:docs/Code_Tech_Docs/subsystems/render-system.md]])
- Physics optimization (see #[[file:docs/Code_Tech_Docs/subsystems/physics-system.md]])
- Agent behavior logic (see #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]])

## Responsibilities

- Maintain spatial partitioning structure
- Perform frustum culling each frame
- Monitor frame rate and adjust quality
- Track memory usage and trigger cleanup
- Coordinate behavior throttling
- Collect and report performance metrics

## Lifecycle

1. **Initialization**
   - Create spatial partitioning structure
   - Initialize quality settings
   - Set up memory monitoring
   - Configure throttling thresholds

2. **Active Operation**
   - Update spatial partitioning
   - Perform frustum culling
   - Monitor frame rate
   - Adjust quality as needed
   - Track memory usage
   - Coordinate throttling

3. **Cleanup/Disposal**
   - Dispose spatial structure
   - Clear monitoring data
   - Release resources

## Semantics (Normative Guarantees)

### Spatial Partitioning

The Performance System MUST provide efficient spatial queries through partitioning:

**Cell Structure:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| cellSize | 20 units | Size of each partition cell |
| gridWidth | 10 cells | Number of cells in X direction |
| gridDepth | 10 cells | Number of cells in Z direction |

**Query Interface:**

```
queryRadius(position: Vector3, radius: number): Entity[]
  Returns: All entities within radius of position
  
queryBounds(bounds: BoundingBox): Entity[]
  Returns: All entities intersecting bounds
  
queryCell(cellX: number, cellZ: number): Entity[]
  Returns: All entities in specified cell
  
getNearestEntities(position: Vector3, count: number): Entity[]
  Returns: N nearest entities to position
```

**Partitioning Rules:**

- Entities MUST be assigned to cells based on position
- Entities spanning multiple cells MUST be in all overlapping cells
- Cell assignment MUST update when entity moves
- Query results MUST be correct (no false negatives)
- Query performance SHOULD be O(1) for cell queries, O(k) for radius queries where k is result count

### View Frustum Culling

- Objects outside the view frustum MUST NOT be submitted for rendering
- Frustum MUST be updated each frame from camera
- Culling MUST use bounding volumes (sphere or box)
- Culling MUST support hierarchical culling for grouped objects

**Culling Levels:**

| Level | Granularity | Use Case |
|-------|-------------|----------|
| Coarse | Spatial cells | Skip entire regions |
| Medium | Entity groups | Skip agent groups |
| Fine | Individual entities | Per-object culling |

**Culling Rules:**

- Coarse culling MUST occur before medium culling
- Medium culling MUST occur before fine culling
- Culled objects MUST NOT have their render components updated
- Culling state MUST be queryable per entity

### Quality Scaling

The Performance System MUST dynamically adjust quality based on frame rate:

**Quality Levels:**

| Level | Target FPS | LOD Bias | Shadow Quality | Particle Count |
|-------|------------|----------|----------------|----------------|
| Ultra | 60+ | 0 | Ultra | 100% |
| High | 45-60 | 1 | High | 75% |
| Medium | 30-45 | 2 | Medium | 50% |
| Low | 20-30 | 3 | Low | 25% |
| Minimum | <20 | 4 | Off | 10% |

**Scaling Rules:**

- Quality MUST reduce when frame rate below threshold for configured duration
- Quality MUST increase when frame rate above threshold for configured duration
- Hysteresis MUST prevent oscillation (different thresholds for up/down)
- Quality changes MUST be gradual (one level at a time)
- Minimum quality level MUST be configurable

**Hysteresis Configuration:**

| Transition | Frame Rate Threshold | Duration |
|------------|---------------------|----------|
| Decrease | Below target - 5 FPS | 2 seconds |
| Increase | Above target + 10 FPS | 5 seconds |

### Memory Monitoring

- Memory usage MUST be tracked periodically
- Cleanup MUST trigger when usage exceeds threshold
- Cleanup MUST prioritize disposable resources (cached textures, pooled objects)
- Critical memory threshold MUST trigger aggressive cleanup

**Memory Thresholds:**

| Threshold | Usage | Action |
|-----------|-------|--------|
| Normal | < 70% | No action |
| Warning | 70-85% | Log warning, reduce caches |
| Critical | 85-95% | Aggressive cleanup, reduce quality |
| Emergency | > 95% | Force garbage collection, minimum quality |

**Cleanup Priorities:**

1. Unused texture cache entries
2. Expired pool objects
3. LOD mesh variants
4. Audio buffers
5. Particle system caches

### Behavior Throttling Coordination

The Performance System coordinates with Agent System for throttling:

- Throttling distances MUST be provided to Agent System
- Throttling MUST be adjustable based on current quality level
- More aggressive throttling at lower quality levels

**Throttling by Quality Level:**

| Quality | Near Distance | Far Distance | Max Update Skip |
|---------|--------------|--------------|-----------------|
| Ultra | 40 | 120 | 4 frames |
| High | 35 | 100 | 6 frames |
| Medium | 30 | 80 | 8 frames |
| Low | 25 | 60 | 12 frames |
| Minimum | 20 | 40 | 16 frames |

## Configuration Parameters

```
performanceConfig:
  spatialPartitioning:
    enabled: true
    cellSize: 20
    gridWidth: 10
    gridDepth: 10
    
  culling:
    enabled: true
    coarseCulling: true
    hierarchicalCulling: true
    
  qualityScaling:
    enabled: true
    targetFPS: 60
    minQuality: "low"
    decreaseThreshold: 55      # FPS below this triggers decrease
    increaseThreshold: 70      # FPS above this triggers increase
    decreaseDuration: 2.0      # Seconds before decreasing
    increaseDuration: 5.0      # Seconds before increasing
    
  memory:
    enabled: true
    warningThreshold: 0.70
    criticalThreshold: 0.85
    emergencyThreshold: 0.95
    checkInterval: 5000        # ms between checks
    
  throttling:
    enabled: true
    nearDistance: 30
    farDistance: 100
    maxSkipFrames: 8
```

## Performance Metrics

### Frame Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| FPS | Frames per second | 60 |
| Frame Time | Time per frame | < 16.67ms |
| Update Time | Simulation update time | < 8ms |
| Render Time | Render time | < 8ms |

### System Metrics

| Metric | Description |
|--------|-------------|
| Culled Objects | Objects skipped by frustum culling |
| Visible Objects | Objects submitted for rendering |
| Spatial Queries | Queries per frame |
| Quality Level | Current quality setting |
| Memory Usage | Current memory consumption |

## Correctness Properties

- **Property 18: Frustum Culling** - For any object outside the view frustum, that object MUST NOT be submitted for rendering.
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-18]]

- **Property 19: Quality Adjustment** - For any frame rate below threshold for the configured duration, quality MUST be reduced.
  → #[[file:docs/Code_Tech_Docs/correctness-properties.md#property-19]]

## Observability

### Metrics to Track

- Frame rate (current, average, min, max)
- Frame time breakdown (update, render, idle)
- Culling statistics (culled count, visible count)
- Quality level and transitions
- Memory usage and cleanup events
- Spatial query performance
- Throttled agent count

### Events to Log

- Quality level changes
- Memory threshold crossings
- Cleanup operations
- Performance warnings (sustained low FPS)
- Spatial structure rebuilds

## Cross-References

- #[[file:docs/Code_Tech_Docs/patterns/spatial-partitioning.md]] - Spatial partitioning pattern
- #[[file:docs/Code_Tech_Docs/subsystems/render-system.md]] - LOD and shadow integration
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]] - Behavior throttling
- #[[file:docs/Code_Tech_Docs/core-systems/game-loop.md]] - Frame timing
