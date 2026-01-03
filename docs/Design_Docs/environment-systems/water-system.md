# Water System

## Overview

The water system simulates realistic water surfaces with wave motion, provides height queries for navigation and physics, and integrates with the buoyancy system for floating objects. Water bodies define navigation constraints for aquatic and surface-bound agents.

## Water Surface

### Mesh Configuration

| Property | Value | Description |
|----------|-------|-------------|
| Width | 600m | Water surface extent (X) |
| Height | 600m | Water surface extent (Z) |
| Subdivisions | 150 | Mesh resolution |
| Base Y Position | -10 | Default water level |

### Material Properties

```
Water Material:
- Alpha: 0.4 (semi-transparent)
- Diffuse Color: (0.1, 0.3, 0.5) - Deep blue
- Specular Color: (0.2, 0.2, 0.2) - Subtle reflections
- Emissive Color: (0.1, 0.2, 0.3) - Slight glow
- Back Face Culling: Enabled
```

### Fresnel Effect

The water surface uses Fresnel parameters for realistic appearance:

| Parameter | Value | Effect |
|-----------|-------|--------|
| Bias | 0.1 | Base reflectivity |
| Power | 1.0 | Falloff rate |
| Left Color | White | Grazing angle color |
| Right Color | Black | Direct view color |

## Wave Simulation

### Wave Formula

Water height at position (x, z) and time t:

```
height(x, z, t) = baseHeight 
    + sin(x * 0.02 + t) * 0.8
    + cos(z * 0.02 + t * 0.5) * 0.8
    + sin((x + z) * 0.015 + t * 0.7) * 0.5
```

### Wave Components

| Component | Frequency | Amplitude | Speed | Direction |
|-----------|-----------|-----------|-------|-----------|
| Primary | 0.02 | 0.8 | 1.0 | X-axis |
| Secondary | 0.02 | 0.8 | 0.5 | Z-axis |
| Tertiary | 0.015 | 0.5 | 0.7 | Diagonal |

### Wave Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| amplitude | 0.8 | 0.1-2.0 | Wave height |
| frequency | 0.02 | 0.01-0.1 | Spatial frequency |
| speed | 1.0 | 0.1-3.0 | Temporal speed |
| wavelength | ~314m | - | Derived from frequency |

### Vertex Animation

Each frame, the water mesh vertices are updated:

```
Update Loop:
1. Increment time by deltaTime
2. For each vertex (x, y, z):
   a. Calculate new Y using wave formula
   b. Update position buffer
3. Recompute normals for lighting
4. Update mesh buffers
```

## Navigation Constraints

### Water Zones

Water defines navigation domains for different agent types:

| Agent Type | Water Interaction | Constraint |
|------------|-------------------|------------|
| Fish | Volume navigation | Must stay submerged |
| Boat | Surface navigation | Must stay on surface |
| Bird | Avoidance | Cannot land on water |
| Villager | Avoidance | Cannot enter water |
| Zombie | Avoidance | Cannot enter water |
| Dog | Avoidance | Cannot enter water |

### Navigation Boundaries

```
Water Bounds:
- Min X: -300
- Max X: +300
- Min Z: -300
- Max Z: +300
- Surface Y: Variable (wave-dependent)
- Floor Y: -50 (for fish depth limit)
```

### Fish Navigation Volume

Fish navigate within a 3D volume:

```
Fish Volume:
- Horizontal: Within water bounds
- Vertical Min: Water floor (-50)
- Vertical Max: Water surface - 0.5m
- Shoaling depth: -5 to -15m preferred
```

### Boat Navigation Surface

Boats navigate on the water surface:

```
Boat Constraints:
- Y Position: Water surface height at (x, z)
- Rotation: Aligned to surface normal
- Speed: Affected by wave direction
- Docking: Specific shore positions
```

## Height Query Interface

### getWaterHeight(x, z)

Returns the current water surface height at position (x, z):

```
Input: x (number), z (number)
Output: Y-coordinate of water surface

Implementation:
1. Get current simulation time
2. Apply wave formula at (x, z, time)
3. Return calculated height
```

### Usage Examples

```javascript
// Check if position is underwater
const waterY = waterSim.getWaterHeight(pos.x, pos.z);
const isUnderwater = pos.y < waterY;

// Get submerged depth
const depth = waterY - pos.y;
const isSubmerged = depth > 0;

// Boat surface following
boat.position.y = waterSim.getWaterHeight(boat.position.x, boat.position.z);
```

## Buoyancy Integration

### Buoyancy Force Calculation

Objects in water experience buoyancy based on submerged volume:

```
Buoyancy Formula:
F_buoyancy = ρ_water * V_submerged * g

Where:
- ρ_water = Water density (1000 kg/m³)
- V_submerged = Submerged volume
- g = Gravity (9.81 m/s²)
```

### Submerged Depth Query

```
getSubmergedDepth(position):
  waterHeight = getWaterHeight(position.x, position.z)
  if position.y >= waterHeight:
    return 0  // Not submerged
  return waterHeight - position.y  // Depth below surface
```

### Buoyancy Application

| Object Type | Buoyancy Behavior |
|-------------|-------------------|
| Boat | Float on surface, follow waves |
| Debris | Partial submersion, drift |
| Fish | Neutral buoyancy, free movement |

### Physics Integration

The physics system queries water for buoyancy:

```
Physics Update:
1. For each buoyant body:
   a. Query water height at body position
   b. Calculate submerged depth
   c. Apply upward buoyancy force
   d. Apply drag force (water resistance)
```

## Visual Effects

### Surface Rendering

| Effect | Implementation | Performance |
|--------|----------------|-------------|
| Transparency | Alpha blending | Low |
| Reflections | Fresnel approximation | Low |
| Waves | Vertex displacement | Medium |
| Normals | Per-frame recalculation | Medium |

### Lighting Interaction

Water interacts with the day/night cycle:

| Time | Water Appearance |
|------|------------------|
| Day | Bright blue, strong reflections |
| Dusk | Orange/pink tints, soft reflections |
| Night | Dark blue, moonlight reflections |

## Configuration Parameters

```yaml
waterSystem:
  enabled: true
  
  surface:
    width: 600
    height: 600
    subdivisions: 150
    baseHeight: -10
    
  material:
    alpha: 0.4
    diffuseColor: [0.1, 0.3, 0.5]
    specularColor: [0.2, 0.2, 0.2]
    emissiveColor: [0.1, 0.2, 0.3]
    
  waves:
    enabled: true
    primaryAmplitude: 0.8
    primaryFrequency: 0.02
    secondaryAmplitude: 0.8
    secondaryFrequency: 0.02
    tertiaryAmplitude: 0.5
    tertiaryFrequency: 0.015
    
  navigation:
    fishMinDepth: -50
    fishMaxDepth: -0.5
    boatDraftDepth: 0.3
    
  buoyancy:
    waterDensity: 1000
    dragCoefficient: 0.5
```

## Performance Considerations

### Vertex Update Optimization

| Technique | Benefit |
|-----------|---------|
| Typed arrays | Fast buffer updates |
| Batch normal calculation | Reduced overhead |
| LOD for distant water | Fewer vertices |

### Query Optimization

Water height queries are O(1) - direct formula evaluation without mesh lookup.

## State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Water System States                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    ┌──────────────┐                                         │
│    │ Uninitialized│                                         │
│    └──────┬───────┘                                         │
│           │ initialize()                                     │
│           ▼                                                  │
│    ┌──────────────┐                                         │
│    │    Active    │◄────────────────────┐                   │
│    │              │                      │                   │
│    │  - Update    │    resume()         │                   │
│    │    waves     │                      │                   │
│    │  - Handle    │                      │                   │
│    │    queries   │                      │                   │
│    └──────┬───────┘                      │                   │
│           │ pause()                      │                   │
│           ▼                              │                   │
│    ┌──────────────┐                      │                   │
│    │    Paused    │──────────────────────┘                   │
│    │              │                                          │
│    │  - Queries   │                                          │
│    │    still     │                                          │
│    │    work      │                                          │
│    └──────┬───────┘                                          │
│           │ dispose()                                        │
│           ▼                                                  │
│    ┌──────────────┐                                         │
│    │   Disposed   │                                         │
│    └──────────────┘                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Normative Guarantees

1. Water surface height MUST be queryable at any XZ position within bounds
2. Wave simulation MUST produce smooth, continuous motion
3. Height queries MUST return consistent values for same (x, z, t)
4. Buoyancy queries MUST return accurate submerged depth
5. Navigation constraints MUST be enforced for all agent types
6. Water bounds MUST be defined per level configuration

## Cross-References

- #[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]] - Environment system
- #[[file:docs/Code_Tech_Docs/subsystems/physics-system.md]] - Buoyancy physics
- #[[file:docs/Design_Docs/agent-behaviors/wildlife-mechanics.md]] - Fish and boat navigation
- #[[file:docs/Code_Tech_Docs/subsystems/agent-system.md]] - Agent navigation
