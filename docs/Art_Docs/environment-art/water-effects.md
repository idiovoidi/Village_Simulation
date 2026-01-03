# Water Effect Specifications

## Purpose

This document defines the visual specifications for water simulation, including material properties, wave animation, and rendering effects.

## Water Geometry

### Surface Mesh

| Property | Value | Notes |
|----------|-------|-------|
| Type | Ground mesh | Flat plane with vertex animation |
| Width | 600 units | Matches terrain scale |
| Height | 600 units | Matches terrain scale |
| Subdivisions | 150 | High detail for wave animation |
| Base Position Y | -10 units | Below terrain center |

## Water Material

### Material Properties

| Property | Value | Notes |
|----------|-------|-------|
| Type | StandardMaterial | |
| Alpha | 0.4 | Semi-transparent |
| Diffuse Color | (0.1, 0.3, 0.5) | Deep blue |
| Specular Color | (0.2, 0.2, 0.2) | Subtle reflections |
| Emissive Color | (0.1, 0.2, 0.3) | Slight glow |
| Back Face Culling | true | Performance optimization |

### Fresnel Effect

| Property | Value |
|----------|-------|
| Bias | 0.1 |
| Power | 1 |
| Left Color | White (1, 1, 1) |
| Right Color | Black (0, 0, 0) |

The Fresnel effect creates realistic water surface appearance where edges appear more reflective than the center.


## Wave Animation

### Wave Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Primary Wave Frequency | 0.02 | Wavelength factor |
| Secondary Wave Frequency | 0.02 | Cross-wave factor |
| Tertiary Wave Frequency | 0.015 | Diagonal wave factor |
| Primary Amplitude | 0.8 | Wave height |
| Secondary Amplitude | 0.8 | Cross-wave height |
| Tertiary Amplitude | 0.5 | Diagonal wave height |

### Wave Formula

```
height = baseY + 
    sin(x × 0.02 + time) × 0.8 +
    cos(z × 0.02 + time × 0.5) × 0.8 +
    sin((x + z) × 0.015 + time × 0.7) × 0.5
```

### Vertex Animation

The water surface uses per-frame vertex position updates:

1. Get current vertex positions
2. Calculate new Y position using wave formula
3. Recompute normals for proper lighting
4. Update mesh vertex data

### Normal Recalculation

Normals are recomputed each frame using `VertexData.ComputeNormals()` to ensure proper lighting on the animated surface.

## Water Height Query

### API

```javascript
getWaterHeight(x, z) → number
```

Returns the current water surface height at the given world coordinates, accounting for wave animation.

### Usage

- Fish agents query water height for swimming depth
- Boat agents query water height for surface following
- Physics system uses for buoyancy calculations

## Visual Effects

### Transparency

| Depth | Alpha | Notes |
|-------|-------|-------|
| Surface | 0.4 | Base transparency |
| Shallow | 0.4-0.6 | Slightly more opaque |
| Deep | 0.3-0.4 | More transparent |

### Color Variation

Water color can be adjusted based on:
- Time of day (darker at night)
- Weather conditions (grayer in overcast)
- Depth (darker in deep areas)

## Performance Considerations

### Optimization Techniques

| Technique | Implementation |
|-----------|----------------|
| Subdivision LOD | 150 subdivisions balances quality/performance |
| Vertex Animation | GPU-friendly animation approach |
| Single Material | Reduces draw calls |
| Back Face Culling | Reduces rendered triangles |

### Update Frequency

Water animation updates every frame via `registerBeforeRender` callback.

## Cross-References

- #[[file:docs/Art_Docs/visual-style-guide.md]]
- #[[file:docs/Design_Docs/environment-systems/water-system.md]]
- #[[file:docs/Code_Tech_Docs/subsystems/environment-system.md]]
