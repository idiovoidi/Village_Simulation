# Procedural Generation

## Overview

The procedural generation system creates village layouts, road networks, and environmental decorations using deterministic algorithms. Given the same seed value, the system produces identical results, enabling reproducible world generation and testing.

## Village Layout System

### City Zones

The village is organized into distinct zones with specific purposes:

| Zone | Priority | Purpose | Radius/Area |
|------|----------|---------|-------------|
| Plaza | 1 | Central gathering area | 16m radius |
| Roads | 1 | Transportation network | Variable |
| Commercial | 2 | Market and shops | 8-12m radius |
| Residential | 3 | Housing areas | Ring-based |
| Parks | 4 | Green spaces | 10-15m radius |
| Gardens | 5 | Decorative areas | 4-6m radius |

### Zone Layout

```
                    North
                      │
         ┌───────────┼───────────┐
         │    Residential Ring 3  │
         │  ┌───────┼───────┐    │
         │  │  Residential 2 │    │
         │  │  ┌────┼────┐  │    │
         │  │  │ Res. 1  │  │    │
West ────┼──┼──┼─ PLAZA ─┼──┼────┼──── East
         │  │  │         │  │    │
         │  │  └────┬────┘  │    │
         │  │       │       │    │
         │  └───────┴───────┘    │
         │                       │
         └───────────────────────┘
                    │
                  South
```

### Residential Rings

Houses are placed in concentric rings around the plaza:

| Ring | Inner Radius | Outer Radius | Density | Max Houses |
|------|--------------|--------------|---------|------------|
| 1 | 25m | 45m | 0.7 | 8 |
| 2 | 45m | 65m | 0.5 | 5 |
| 3 | 65m | 80m | 0.3 | 2 |

**Density** determines the probability of successful placement attempts.

## Building Placement Rules

### House Placement Algorithm

```
1. For each residential ring:
   a. Generate random position within ring bounds
   b. Check terrain validity (not water, not too steep)
   c. Check collision with existing structures
   d. Check minimum separation distances
   e. If valid, place house and reserve position
   f. Calculate optimal rotation (face plaza or road)
```

### Separation Rules

Minimum distances between object types:

| Object 1 | Object 2 | Min Distance |
|----------|----------|--------------|
| House | House | 8m |
| House | Garden | 3m |
| House | Tree | 4m |
| House | Fountain | 10m |
| Garden | Garden | 5m |
| Garden | Tree | 2m |
| Garden | Fountain | 8m |
| Tree | Tree | 6m |

### Collision Detection

The system uses a grid-based occupancy map:

```
Grid Configuration:
- Cell size: 2m × 2m
- Coverage: Full village area
- Storage: HashMap<"x,z", OccupancyData>

Collision Check:
1. Calculate grid cells covered by object
2. Check each cell for existing occupancy
3. Verify separation rules with nearby objects
4. Return true if position is available
```

### Building Rotation

Buildings are rotated to face logical directions:

```
Rotation Calculation:
1. Calculate vector from building to plaza center
2. Compute angle: atan2(toPlaza.x, toPlaza.z)
3. Apply rotation to building mesh
```

## Road Network Generation

### Road Types

| Type | Width | Purpose | Priority |
|------|-------|---------|----------|
| Main Road | 4m | Cardinal directions from plaza | 1 |
| Ring Road | 4m | Circular around residential | 2 |
| Secondary | 3m | Neighborhood connections | 3 |
| Residential | 2.5m | House access | 4 |
| Driveway | 1.5m | Individual house access | 5 |

### Main Roads

Four main roads extend from the plaza to the village edges:

```
Main Road Layout:
- East Main Road: Plaza → +X direction
- West Main Road: Plaza → -X direction
- North Main Road: Plaza → +Z direction
- South Main Road: Plaza → -Z direction

Parameters:
- Start: 20m from plaza center
- Length: 80m total
- Width: 4m with sidewalks
```

### Ring Road

A circular road surrounds the residential area:

```
Ring Road Configuration:
- Center: Village center (0, 0)
- Radius: 45m
- Segments: 32 (for smooth curve)
- Width: 4m
```

### Residential Road Algorithm

```
1. Group houses by proximity (25m threshold)
2. For each neighborhood:
   a. Calculate neighborhood center
   b. Connect center to ring road
   c. Create star pattern from center to houses
   d. Add cross streets between nearby houses
3. Connect isolated houses to nearest road
```

### Road Connectivity Rules

1. All houses MUST be reachable from the plaza
2. No dead-end roads longer than 20m without turnaround
3. Cross streets connect houses within 8-20m of each other
4. Clear path check prevents roads through buildings

### Minimum Spanning Tree

For efficient road networks, houses are connected using MST:

```
MST Algorithm:
1. Start with first house in connected set
2. While unconnected houses remain:
   a. Find shortest edge from connected to unconnected
   b. Add edge to connections
   c. Add house to connected set
3. Return connection list
```

## Seed Determinism

### Random Number Generation

All procedural generation uses seeded random number generators:

```
Seed Usage:
- Village layout seed
- Road network seed
- Decoration placement seed
- Tree distribution seed

Same seed → Identical output
```

### Determinism Guarantees

1. Same seed MUST produce identical village layout
2. Same seed MUST produce identical road network
3. Same seed MUST produce identical decoration placement
4. Order of operations MUST be consistent

### Seed Configuration

```yaml
proceduralGeneration:
  masterSeed: 12345
  subSeeds:
    village: derived from masterSeed
    roads: derived from masterSeed + 1
    decorations: derived from masterSeed + 2
    vegetation: derived from masterSeed + 3
```

## Decoration Placement

### Garden Placement

Gardens are placed in designated areas:

| Type | Location | Radius | Count |
|------|----------|--------|-------|
| Entrance Garden | Plaza entrances | 6m | 4 |
| Pocket Garden | Residential corners | 4m | 4 |
| Community Park | Designated areas | 10-15m | 2 |

### Tree Distribution

Trees follow natural distribution patterns:

```
Tree Placement Zones:
1. Parks: High density, clustered
2. Street trees: Along roads, 12m spacing
3. Yard trees: 1-2 per house, 8-12m from house
4. Perimeter: Sparse, natural distribution
```

### House Decorations

Each house receives 1-2 decorations:

```
Decoration Types:
- Bushes: 50% probability
- Barrels: 50% probability

Placement:
- Distance from house: 1-3m beyond house edge
- Collision checked before placement
- Maximum 10 placement attempts
```

## Terrain Integration

### Height Queries

All placed objects query terrain height:

```
Position Adjustment:
1. Generate XZ position
2. Query terrain height at (x, z)
3. Set Y = terrainHeight + offset
4. Offset varies by object type
```

### Terrain Constraints

| Constraint | Threshold | Action |
|------------|-----------|--------|
| Water | Y < waterLevel | Reject placement |
| Steep slope | Normal.Y < 0.7 | Reject placement |
| Out of bounds | Outside terrain | Reject placement |

## Commercial Areas

### Market District

```
Market Configuration:
- Location: East of plaza center
- Offset: 40% of village radius
- Radius: 12m
- Contains: Market stalls, vendor areas
```

### Shop Areas

```
Shop Configuration:
- Location: Northwest of plaza
- Radius: 8m
- Contains: Small commercial buildings
```

## Validation Rules

### Layout Validation

After generation, the layout is validated:

1. **Connectivity**: All buildings reachable from plaza
2. **No Overlaps**: No building intersections
3. **Separation**: All minimum distances respected
4. **Bounds**: All objects within village radius

### Road Network Validation

1. **Connectivity**: All roads form connected graph
2. **No Orphans**: No isolated road segments
3. **Intersection Quality**: Proper intersection handling

## Configuration Parameters

```yaml
villageGeneration:
  villageRadius: 80
  centerOffset: [0, 0, 0]
  houseCount: 15
  
  zones:
    plaza:
      radius: 16
    residential:
      rings:
        - { inner: 25, outer: 45, density: 0.7 }
        - { inner: 45, outer: 65, density: 0.5 }
        - { inner: 65, outer: 80, density: 0.3 }
    commercial:
      - { offset: [20, 0, 15], radius: 12, type: "market" }
      - { offset: [-18, 0, 20], radius: 8, type: "shops" }
      
  roads:
    mainRoadWidth: 4
    ringRoadRadius: 45
    residentialWidth: 2.5
    
  decorations:
    treesPerHouse: 1.5
    gardenCount: 8
    rockCount: 15
```

## Debug Information

The system provides debug output:

```
Debug Output:
- Total objects placed
- Occupied grid cells
- Zone statistics
- Road network info:
  - Total roads
  - Roads by type
  - Intersection count
  - Total segments
```

## Normative Guarantees

1. Same seed MUST produce identical layout
2. Generated layout MUST pass validation (no overlaps, all connected)
3. All buildings MUST be accessible via road network
4. Placement MUST respect separation rules
5. Terrain constraints MUST be enforced

## Cross-References

- #[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]] - Environment system
- #[[file:docs/Code_Tech_Docs/subsystems/level-system.md]] - Level configuration
- #[[file:docs/Design_Docs/level-design/level-configurations.md]] - Level-specific generation
