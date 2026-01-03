# Spatial Partitioning Pattern

## Purpose

The Spatial Partitioning pattern divides the simulation world into discrete cells to enable efficient queries for nearby entities. Instead of checking every entity against every other entity (O(n²)), spatial partitioning reduces query complexity by only checking entities within relevant cells.

Spatial partitioning is critical for:
- Collision detection broad-phase filtering
- Agent perception (finding nearby targets)
- Group behavior calculations (finding neighbors)
- Frustum culling optimization
- Performance scaling with large entity counts

#[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]

## Boundaries

**In Scope:**
- Grid cell structure and management
- Object insertion, removal, and update
- Region queries (find objects in area)
- Collision candidate queries
- Cell-based neighbor finding

**Out of Scope:**
- Actual collision detection (handled by physics system)
- Agent behavior logic (handled by agent system)
- Rendering decisions (handled by render system)
- Physics simulation (handled by physics system)

## Responsibilities

- Divide world space into uniform grid cells
- Track which cells each object occupies
- Provide efficient region queries
- Return collision candidates for broad-phase filtering
- Update object positions as they move
- Maintain cell occupancy statistics
- Support dynamic world bounds

## Cell Structure

### Grid Organization

The spatial grid divides the world into uniform cubic cells:

```
┌─────────────────────────────────────────────────────────┐
│ World Bounds: (minX, minY, minZ) to (maxX, maxY, maxZ)  │
│                                                         │
│ Grid Dimensions:                                        │
│   width  = ceil((maxX - minX) / cellSize)              │
│   height = ceil((maxY - minY) / cellSize)              │
│   depth  = ceil((maxZ - minZ) / cellSize)              │
│                                                         │
│ Cell Key: "x,y,z" string for Map storage               │
└─────────────────────────────────────────────────────────┘
```

### Cell Contents

Each cell maintains:

| Component | Type | Purpose |
|-----------|------|---------|
| `objectIds` | Set<string> | Objects currently in this cell |

### Object Tracking

Each tracked object maintains:

| Component | Type | Purpose |
|-----------|------|---------|
| `position` | Vector3 | Current world position |
| `bounds` | AABB | Axis-aligned bounding box |
| `cells` | string[] | List of cell keys object occupies |

## Lifecycle

### 1. Grid Creation

```
┌─────────────────────────────────────────────────────────┐
│ 1. Define world bounds (min/max corners)                │
│ 2. Choose cell size based on typical object size        │
│ 3. Calculate grid dimensions                            │
│ 4. Initialize empty cell Map                            │
│ 5. Initialize empty object tracking Map                 │
└─────────────────────────────────────────────────────────┘
```

### 2. Object Insertion

```
┌─────────────────────────────────────────────────────────┐
│ 1. Calculate object's bounding box                      │
│ 2. Determine all cells the bounds intersect             │
│ 3. For each intersected cell:                           │
│    a. Create cell if it doesn't exist                   │
│    b. Add object ID to cell's object set                │
│ 4. Store object data (position, bounds, cells)          │
└─────────────────────────────────────────────────────────┘
```

### 3. Object Update (Movement)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Calculate new bounding box                           │
│ 2. Determine new cell list                              │
│ 3. If cells changed:                                    │
│    a. Remove object from old cells                      │
│    b. Add object to new cells                           │
│    c. Clean up empty cells                              │
│ 4. Update stored position and bounds                    │
└─────────────────────────────────────────────────────────┘
```

### 4. Object Removal

```
┌─────────────────────────────────────────────────────────┐
│ 1. Get object's current cell list                       │
│ 2. Remove object ID from each cell                      │
│ 3. Clean up empty cells                                 │
│ 4. Remove object from tracking Map                      │
└─────────────────────────────────────────────────────────┘
```

## Query Semantics

### Region Query

Find all objects within a bounding box:

```
┌─────────────────────────────────────────────────────────┐
│ Input: Query bounds (min, max)                          │
│                                                         │
│ 1. Calculate all cells the query bounds intersect       │
│ 2. Collect all object IDs from those cells              │
│ 3. Return unique set of object IDs                      │
│                                                         │
│ Output: Set of object IDs (may include false positives) │
└─────────────────────────────────────────────────────────┘
```

### Collision Candidates Query

Find potential collision partners for an object:

```
┌─────────────────────────────────────────────────────────┐
│ Input: Object ID                                        │
│                                                         │
│ 1. Get object's current cell list                       │
│ 2. For each cell, collect all other object IDs          │
│ 3. Return unique set (excluding query object)           │
│                                                         │
│ Output: Set of candidate object IDs                     │
└─────────────────────────────────────────────────────────┘
```

### Neighbor Query

Find objects within radius of a point:

```
┌─────────────────────────────────────────────────────────┐
│ Input: Center position, radius                          │
│                                                         │
│ 1. Calculate bounding box from center ± radius          │
│ 2. Perform region query with bounding box               │
│ 3. Filter results by actual distance (optional)         │
│                                                         │
│ Output: Set of object IDs within radius                 │
└─────────────────────────────────────────────────────────┘
```

## Query Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     REGION QUERY FLOW                             │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Convert query bounds to grid coordinates                       │
│    minCoords = floor((bounds.min - worldMin) / cellSize)         │
│    maxCoords = floor((bounds.max - worldMin) / cellSize)         │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Iterate all cells in coordinate range                          │
│    for x in [minCoords.x, maxCoords.x]                           │
│      for y in [minCoords.y, maxCoords.y]                         │
│        for z in [minCoords.z, maxCoords.z]                       │
│          collect objects from cell(x,y,z)                        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Return unique object set                                       │
│    (Duplicates removed since objects span multiple cells)        │
└──────────────────────────────────────────────────────────────────┘
```

## Cell Size Selection

Cell size significantly impacts performance:

| Cell Size | Pros | Cons |
|-----------|------|------|
| Too Small | Precise queries | Many cells, memory overhead, objects span many cells |
| Too Large | Few cells, low memory | Many objects per cell, poor filtering |
| Optimal | Good balance | Requires tuning |

**Guidelines:**
- Cell size SHOULD be 2-4x the typical object size
- Cell size SHOULD result in 1-10 objects per occupied cell on average
- Cell size MAY be adjusted based on object density

**Default Configuration:**
- Cell size: 10 units
- World bounds: -100 to +100 on X/Z, -10 to +50 on Y

## Semantics (Normative Guarantees)

### Query Correctness
- Region queries MUST return all objects whose bounds intersect the query region
- Region queries MAY return objects outside the query region (false positives allowed)
- Region queries MUST NOT miss objects within the query region (no false negatives)

### Update Consistency
- After object update, queries MUST reflect the new position
- Object removal MUST remove from all occupied cells
- Empty cells SHOULD be cleaned up to reduce memory

### Cell Occupancy
- Objects MUST be present in all cells their bounds intersect
- Objects MUST NOT be present in cells their bounds don't intersect
- Cell membership MUST be updated when object bounds change

### Performance Expectations
- Query performance SHOULD be better than linear scan
- Implementations SHOULD target O(k) where k is number of relevant cells
- Worst case (all objects in one cell) degrades to O(n)

## Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `cellSize` | 10 | Size of each grid cell in world units |
| `bounds.min` | (-100, -10, -100) | Minimum world corner |
| `bounds.max` | (100, 50, 100) | Maximum world corner |
| `updateFrequency` | 10 Hz | How often to update object positions |

## Correctness Properties

### From Requirements 11.1 (Spatial Partitioning)
*For any* region query, all objects whose bounds intersect the query region MUST be included in the results.

This property ensures no false negatives in spatial queries, which is critical for:
- Collision detection (missing collisions would break physics)
- Agent perception (missing targets would break AI)
- Group behavior (missing neighbors would break flocking)

#[[file:docs/Code_Tech_Docs/correctness-properties.md]]

## Observability

### Metrics to Track
- Total cells in grid
- Occupied cells count
- Objects per cell (average, max)
- Query count and timing
- Update count and timing
- Memory usage estimate

### Events to Log
- Grid creation with dimensions
- Significant occupancy changes
- Query performance warnings
- Cell cleanup operations

### Debug Information
- Grid dimensions
- Cell size
- Object count
- Occupancy distribution
- Query statistics

## Integration with Other Systems

### Physics System
- Provides collision candidates for broad-phase
- Reduces narrow-phase collision checks
- Updated before physics step

### Agent System
- Provides neighbor queries for perception
- Supports group behavior calculations
- Updated after agent movement

### Performance System
- Provides frustum culling candidates
- Supports LOD distance calculations
- Monitored for performance metrics

## Example Usage

### Adding an Object
```
// Calculate bounds from mesh
const bounds = {
    min: { x: pos.x - 1, y: pos.y - 1, z: pos.z - 1 },
    max: { x: pos.x + 1, y: pos.y + 1, z: pos.z + 1 }
};

// Add to spatial grid
spatialGrid.addObject(objectId, position, bounds);
```

### Querying Nearby Objects
```
// Find objects within 20 units
const queryBounds = {
    min: { x: center.x - 20, y: center.y - 20, z: center.z - 20 },
    max: { x: center.x + 20, y: center.y + 20, z: center.z + 20 }
};

const nearbyObjects = spatialGrid.getObjectsInRegion(queryBounds);
```

### Getting Collision Candidates
```
// Get potential collision partners
const candidates = spatialGrid.getCollisionCandidates(objectId);

// Perform narrow-phase collision detection only on candidates
for (const candidateId of candidates) {
    if (narrowPhaseCollision(objectId, candidateId)) {
        handleCollision(objectId, candidateId);
    }
}
```

## Cross-References

- #[[file:docs/Code_Tech_Docs/subsystems/physics-system.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/performance-system.md]]
- #[[file:docs/Code_Tech_Docs/patterns/group-behavior.md]]
